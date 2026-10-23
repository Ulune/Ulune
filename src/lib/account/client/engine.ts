import { b64u, fromB64u, utf8 } from "../encoding";
import { openRecord, recordId, sealRecord, type Envelope, type SyncKeys } from "../keys";
import { LIMITS, type ChangesAnswer, type PutAnswer, type PutIn, type RecordOut } from "../protocol";
import type { AccountSession } from "./api";
import type { KeyBytes } from "./keyring";
import { adopt, agrees, canonical, keepsBase, kindOf, merge, same, syncs } from "./merge";

/*
 * The synced account's engine (share and compare plan, feature 4; docs/sync-protocol.md, section
 * 6): one round of sync between this device's private space and the account's sealed copy. It
 * knows the space only through `Local` (lib/account/client/space-local.ts gives it the space; the
 * tests give it a map), so the same code runs in the browser and in scripts/account-client.test.mjs.
 *
 * A round, under the page's lock (one tab at a time): the changes since the cursor are read and
 * applied (a record this device did not change since they last agreed takes the server's copy; one
 * it changed meanwhile is merged, merge.ts), then what changed here is sealed and sent, each record
 * with the version it was based on (compare-and-set); a conflict brings back the server's copy,
 * merged in turn and sent again. A cursor older than the account's purge mark lists everything
 * again ("reset"), and a record this device holds from an earlier sync that is not listed any more
 * was deleted elsewhere.
 *
 * How this device knows what changed here: each record's fingerprint as last synced (the space
 * seals every write with a new nonce, so a write changes it), and a hash of its content (a record
 * written again unchanged is not sent again). When a record changed: the time its write was seen,
 * so the later of two changes wins; never earlier than the copy it replaces (a device whose clock
 * is behind still writes after what it saw).
 */

/** What this device knows of a record: the version it last saw, its fingerprint and content hash then, its write time. */
export type Known = { v: number; fp: string; h: string; t: number };

/** The engine's state, kept sealed in the space (sync/account), never synced. */
export type SyncState = {
  v: 1;
  account: string;
  device: string;
  /** The last version read. */
  cursor: number;
  known: Record<string, Known>;
  /** The lists' values as last synced, for three-way merges. */
  bases: Record<string, unknown>;
  /** Changes made here and not sent yet: when each was seen (ms). */
  pending: Record<string, number>;
  /** This device's name as last sent (sealed on the server), when it named itself. */
  name?: string;
  /** The account's name key and record key, as bytes (keyring.ts): sealed with the rest, so a space that opens by itself still syncs. */
  keys?: KeyBytes;
};

export function newSyncState(account: string, device: string, keys?: KeyBytes): SyncState {
  return { v: 1, account, device, cursor: 0, known: {}, bases: {}, pending: {}, ...(keys ? { keys } : {}) };
}

/** The space as the engine sees it. */
export interface Local {
  /** Every record here that syncs: its name and fingerprint. */
  snapshot(): Promise<Map<string, string>>;
  /** A record's value; null when it is not here. */
  read(name: string): Promise<unknown>;
  /** Records written (a null value deletes); their fingerprints after (null when deleted). */
  write(changes: readonly (readonly [string, unknown])[]): Promise<Map<string, string | null>>;
  loadState(): Promise<SyncState | null>;
  saveState(state: SyncState): Promise<void>;
}

export type RoundResult = { pulled: number; sent: number; changed: string[]; tooBig: string[] };

const BATCH_BYTES = LIMITS.batchBytes;

/** A content hash: the first 12 bytes of SHA-256 over the value as canonical JSON. */
export async function contentHash(value: unknown): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", utf8(canonical(value))));
  return b64u(digest.subarray(0, 12));
}

type Pending = { name: string; deleted: boolean; value: unknown; fp: string | null; h: string; t: number; rid: string; blob?: string };

export class SyncEngine {
  private readonly session: AccountSession;
  private readonly keys: SyncKeys;
  private readonly local: Local;
  private readonly now: () => number;
  private readonly rids = new Map<string, string>();
  private readonly names = new Map<string, string>();
  /** Writes seen since the last round (name → when), joined to the state's pending at the next. */
  private readonly seen = new Map<string, number>();

  constructor(opts: { session: AccountSession; keys: SyncKeys; local: Local; now?: () => number }) {
    this.session = opts.session;
    this.keys = opts.keys;
    this.local = opts.local;
    this.now = opts.now ?? (() => Date.now());
  }

  /** Records written here (the space's watcher): their times, for the next round. */
  noteWrites(names: readonly string[]): void {
    const at = this.now();
    for (const name of names) if (syncs(name) && !this.seen.has(name)) this.seen.set(name, at);
  }

  async rid(name: string): Promise<string> {
    let rid = this.rids.get(name);
    if (!rid) {
      rid = await recordId(this.keys, name);
      this.rids.set(name, rid);
      this.names.set(rid, name);
    }
    return rid;
  }

  private remember(name: string, rid: string): void {
    this.rids.set(name, rid);
    this.names.set(rid, name);
  }

  /** One round: read what changed, apply it, send what changed here. */
  async round(): Promise<RoundResult> {
    const st = await this.local.loadState();
    if (!st) throw new Error("not-synced");
    for (const [name, at] of this.seen) if (!(name in st.pending)) st.pending[name] = at;
    this.seen.clear();
    for (const name of Object.keys(st.known)) await this.rid(name);
    const changed = new Set<string>();
    const pulled = await this.pull(st, changed);
    if (pulled) await this.local.saveState(st);
    let sent = 0;
    const tooBig: string[] = [];
    for (let pass = 0; pass < 4; pass += 1) {
      const out = await this.push(st, changed, tooBig);
      sent += out.sent;
      if (!out.again) break;
    }
    // Writes seen that turned out to be the same as what is synced: nothing pending for them.
    const snap = await this.local.snapshot();
    for (const name of Object.keys(st.pending)) if (st.known[name] && st.known[name]!.fp === snap.get(name)) delete st.pending[name];
    await this.local.saveState(st);
    return { pulled, sent, changed: [...changed], tooBig };
  }

  /* ------------------------------------------------------------ reading */

  private async pull(st: SyncState, changed: Set<string>): Promise<number> {
    let count = 0;
    let listing = false;
    const listed = new Set<string>();
    for (let page = 0; page < 10_000; page += 1) {
      const answer = await this.session.call<ChangesAnswer>("records/changes", { cursor: st.cursor, limit: 100 });
      if (answer.reset) {
        // Deletions this device has not seen may be gone: everything is listed again.
        st.cursor = 0;
        listing = true;
        listed.clear();
        continue;
      }
      const snap = await this.local.snapshot();
      for (const change of answer.changes) {
        const name = await this.applyChange(st, change, snap, changed, listing ? listed : null);
        if (name) count += 1;
      }
      st.cursor = answer.cursor;
      if (!answer.more) break;
    }
    if (listing) count += await this.afterListing(st, listed, changed);
    return count;
  }

  /** A record changed on the server: applied here (or kept, or merged). Its name, or null when there was nothing to do. */
  private async applyChange(st: SyncState, change: RecordOut, snap: Map<string, string>, changed: Set<string>, listed: Set<string> | null): Promise<string | null> {
    const knownName = this.names.get(change.rid) ?? null;
    if (knownName) listed?.add(knownName);
    if (knownName && (st.known[knownName]?.v ?? 0) >= change.version) return null;
    if (change.deleted || !change.blob) {
      if (!knownName) return null;
      await this.remoteDeleted(st, knownName, change.version, snap, changed);
      return knownName;
    }
    const blob = fromB64u(change.blob);
    let envelope: Envelope;
    try {
      if (!blob) throw new Error("bad-blob");
      envelope = await openRecord(this.keys, change.rid, blob);
    } catch {
      // Not this account's, or damaged: never applied.
      return null;
    }
    const name = envelope.n;
    if (!syncs(name)) return null;
    this.remember(name, change.rid);
    listed?.add(name);
    if ((st.known[name]?.v ?? 0) >= change.version) return null;
    await this.remoteValue(st, name, change.version, envelope, snap, changed);
    return name;
  }

  /** The server's value for a record, here: adopted, or merged with this device's change. */
  private async remoteValue(st: SyncState, name: string, version: number, envelope: Envelope, snap: Map<string, string>, changed: Set<string>): Promise<void> {
    const known = st.known[name];
    const fp = snap.get(name) ?? null;
    const dirty = known ? fp !== known.fp : fp !== null;
    // An older copy than this device last had (a server rolling a record back): ours is sent again.
    if (known && envelope.t < known.t) {
      st.known[name] = { ...known, v: version, fp: "" };
      return;
    }
    const kind = kindOf(name);
    const mine = fp === null ? null : await this.local.read(name);
    const next = dirty
      ? merge(name, { value: mine, t: st.pending[name] ?? this.now() }, { value: envelope.v, t: envelope.t }, st.bases[name] ?? null, name in st.bases)
      : adopt(name, mine, envelope.v);
    let fpAfter = fp;
    if (!same(next, mine)) {
      const written = await this.local.write([[name, next]]);
      fpAfter = written.get(name) ?? null;
      changed.add(name);
    }
    const settled = agrees(name, next, envelope.v);
    st.known[name] = { v: version, fp: settled ? (fpAfter ?? "") : "", h: settled ? await contentHash(next) : "", t: envelope.t };
    if (settled) delete st.pending[name];
    else st.pending[name] = Math.max(this.now(), envelope.t + 1);
    if (keepsBase(kind)) st.bases[name] = envelope.v;
    // A record whose value is gone here and on the server: nothing left to know.
    if (next === null && settled) this.forget(st, name);
  }

  /** A record deleted on the server: deleted here, unless it changed here meanwhile (a change beats a deletion). */
  private async remoteDeleted(st: SyncState, name: string, version: number, snap: Map<string, string>, changed: Set<string>): Promise<void> {
    const known = st.known[name];
    const fp = snap.get(name) ?? null;
    const dirty = known ? fp !== known.fp : fp !== null;
    if (!dirty || fp === null) {
      if (fp !== null) {
        await this.local.write([[name, null]]);
        changed.add(name);
      }
      this.forget(st, name);
      return;
    }
    const kind = kindOf(name);
    if (kind === "record") {
      // Changed here: kept, and sent again over the deletion.
      st.known[name] = { v: version, fp: "", h: "", t: known?.t ?? 0 };
      return;
    }
    // A list emptied elsewhere and changed here: what this device added stays.
    const mine = await this.local.read(name);
    const next = merge(name, { value: mine, t: st.pending[name] ?? this.now() }, { value: null, t: 0 }, st.bases[name] ?? null, name in st.bases);
    if (!same(next, mine)) {
      await this.local.write([[name, next]]);
      changed.add(name);
    }
    if (next === null) {
      this.forget(st, name);
      return;
    }
    // The server has none now: what stays here goes as new over the deletion.
    st.known[name] = { v: version, fp: "", h: "", t: known?.t ?? 0 };
    st.bases[name] = null;
  }

  /** After everything was listed again: what this device synced before and the listing lacks was deleted elsewhere. */
  private async afterListing(st: SyncState, listed: Set<string>, changed: Set<string>): Promise<number> {
    const snap = await this.local.snapshot();
    let count = 0;
    for (const name of Object.keys(st.known)) {
      if (listed.has(name)) continue;
      const known = st.known[name]!;
      const fp = snap.get(name) ?? null;
      if (fp === null || fp === known.fp) {
        if (fp !== null) {
          await this.local.write([[name, null]]);
          changed.add(name);
        }
        this.forget(st, name);
        count += 1;
      } else {
        // Changed here: the server has none now, so it goes as new.
        st.known[name] = { ...known, v: 0, fp: "" };
      }
    }
    return count;
  }

  private forget(st: SyncState, name: string): void {
    delete st.known[name];
    delete st.bases[name];
    delete st.pending[name];
  }

  /* ------------------------------------------------------------ sending */

  private async push(st: SyncState, changed: Set<string>, tooBig: string[]): Promise<{ sent: number; again: boolean }> {
    const snap = await this.local.snapshot();
    const out: Pending[] = [];
    for (const [name, fp] of snap) {
      const known = st.known[name];
      if (known && known.fp === fp) continue;
      if (tooBig.includes(name)) continue;
      const value = await this.local.read(name);
      if (value === null) continue;
      const h = await contentHash(value);
      // Written again as it was, or changed only in what belongs to this device (the chart open): nothing to send.
      if (known && known.fp !== "" && (known.h === h || (name in st.bases && agrees(name, value, st.bases[name])))) {
        known.fp = fp;
        delete st.pending[name];
        continue;
      }
      const t = Math.max(st.pending[name] ?? this.now(), (known?.t ?? 0) + 1);
      const rid = await this.rid(name);
      let blob: string;
      try {
        blob = b64u(await sealRecord(this.keys, rid, { n: name, t, v: value }));
      } catch (err) {
        // Past the largest size the server keeps (256 KiB sealed): it stays on this device.
        if (err instanceof Error && err.message === "record-too-big") {
          tooBig.push(name);
          continue;
        }
        throw err;
      }
      out.push({ name, deleted: false, value, fp, h, t, rid, blob });
    }
    for (const name of Object.keys(st.known)) {
      if (snap.has(name)) continue;
      const known = st.known[name]!;
      if (known.v === 0) {
        this.forget(st, name);
        continue;
      }
      out.push({ name, deleted: true, value: null, fp: null, h: "", t: Math.max(this.now(), known.t + 1), rid: await this.rid(name) });
    }
    if (!out.length) return { sent: 0, again: false };
    let sent = 0;
    let again = false;
    for (const batch of batches(out)) {
      const puts: PutIn[] = batch.map((p) => {
        const base = st.known[p.name]?.v ?? 0;
        return p.deleted ? { rid: p.rid, base, deleted: true } : { rid: p.rid, base, blob: p.blob! };
      });
      const answer = await this.session.call<PutAnswer>("records/put", { puts });
      const byRid = new Map(batch.map((p) => [p.rid, p]));
      for (const a of answer.applied) {
        const p = byRid.get(a.rid);
        if (!p) continue;
        sent += 1;
        if (p.deleted) {
          // Gone here and there: once the server has the deletion, nothing more to know.
          this.forget(st, p.name);
          continue;
        }
        st.known[p.name] = { v: a.version, fp: p.fp ?? "", h: p.h, t: p.t };
        if (keepsBase(kindOf(p.name))) st.bases[p.name] = p.value;
        delete st.pending[p.name];
      }
      if (answer.conflicts.length) {
        again = true;
        const snapNow = await this.local.snapshot();
        for (const c of answer.conflicts) {
          const p = byRid.get(c.rid);
          if (p) await this.conflict(st, p, c, snapNow, changed);
        }
      }
      await this.local.saveState(st);
    }
    return { sent, again };
  }

  /** A put the server refused (the record moved on since its base): the server's copy merged in. */
  private async conflict(st: SyncState, p: Pending, c: RecordOut, snap: Map<string, string>, changed: Set<string>): Promise<void> {
    if (c.blob) {
      const blob = fromB64u(c.blob);
      let envelope: Envelope | null = null;
      try {
        if (blob) envelope = await openRecord(this.keys, c.rid, blob);
      } catch {
        envelope = null;
      }
      if (!envelope || envelope.n !== p.name) {
        // A copy that does not open: ours goes over it.
        const known = st.known[p.name];
        st.known[p.name] = { v: c.version, fp: "", h: "", t: known?.t ?? p.t };
        return;
      }
      // Our own earlier attempt arrived (a batch lost on the way back).
      if (!p.deleted && envelope.t === p.t && same(envelope.v, p.value)) {
        st.known[p.name] = { v: c.version, fp: p.fp ?? "", h: p.h, t: p.t };
        if (keepsBase(kindOf(p.name))) st.bases[p.name] = p.value;
        delete st.pending[p.name];
        return;
      }
      await this.remoteValue(st, p.name, c.version, envelope, snap, changed);
      return;
    }
    if (c.deleted) {
      if (p.deleted) {
        this.forget(st, p.name);
        return;
      }
      await this.remoteDeleted(st, p.name, c.version, snap, changed);
      return;
    }
    // The server holds no such record (never written, or purged): a deletion is done, a value goes as new.
    if (p.deleted) {
      this.forget(st, p.name);
      return;
    }
    const known = st.known[p.name];
    st.known[p.name] = { v: 0, fp: "", h: "", t: known?.t ?? p.t };
  }
}

/** Puts in batches the server takes: 64 records and 640 KiB of blobs at most. */
function batches(list: Pending[]): Pending[][] {
  const out: Pending[][] = [];
  let batch: Pending[] = [];
  let bytes = 0;
  for (const p of list) {
    const size = p.blob ? Math.ceil((p.blob.length * 3) / 4) : 0;
    if (batch.length && (batch.length >= LIMITS.batchPuts || bytes + size > BATCH_BYTES)) {
      out.push(batch);
      batch = [];
      bytes = 0;
    }
    batch.push(p);
    bytes += size;
  }
  if (batch.length) out.push(batch);
  return out;
}
