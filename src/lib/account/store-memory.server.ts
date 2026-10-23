import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fromHex, hex } from "./encoding";
import type {
  AccountRow,
  AccountStore,
  Bytes,
  ChangesResult,
  CleanupResult,
  DeviceRow,
  LinkRow,
  PutResult,
  RecordRow,
  WayRow,
} from "./store.server";

/*
 * The synced account's store in memory (store.server.ts; docs/sync-protocol.md; share and compare
 * plan, feature 4): the tests' store, and `npm run dev`'s, kept in a file there (.data/, which git
 * ignores) so accounts outlive a restart. Every method runs without waiting in between, so each is
 * atomic. It behaves as the SQL store does, step for step (scripts/account-store.test.mjs runs both).
 */

type State = {
  accounts: Map<string, AccountRow>;
  /** By account, then way id. */
  ways: Map<string, Map<string, WayRow>>;
  devices: Map<string, Map<string, DeviceRow>>;
  records: Map<string, Map<string, RecordRow>>;
  spent: Map<string, number>;
  links: Map<string, LinkRow>;
};

const k = (bytes: Bytes) => hex(bytes);

/** A deep copy, bytes included: nothing handed out can change what is kept. */
function copy<T>(value: T): T {
  if (value instanceof Uint8Array) return new Uint8Array(value) as T;
  if (Array.isArray(value)) return value.map(copy) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value)) out[key] = copy(v);
    return out as T;
  }
  return value;
}

function emptyState(): State {
  return { accounts: new Map(), ways: new Map(), devices: new Map(), records: new Map(), spent: new Map(), links: new Map() };
}

/* The file: JSON, bytes as "hex:…" strings (no other string the store keeps begins so). */
function toJson(state: State): string {
  const plain = {
    v: 1,
    accounts: [...state.accounts.values()],
    ways: [...state.ways.values()].flatMap((m) => [...m.values()]),
    devices: [...state.devices.values()].flatMap((m) => [...m.values()]),
    records: [...state.records.entries()].map(([account, rows]) => [account, [...rows.values()]]),
    spent: [...state.spent.entries()],
    links: [...state.links.values()],
  };
  return JSON.stringify(plain, (_key, value) => (value instanceof Uint8Array ? `hex:${hex(value)}` : value));
}

function fromJson(text: string): State {
  const raw = JSON.parse(text, (_key, value) => (typeof value === "string" && value.startsWith("hex:") ? fromHex(value.slice(4)) : value)) as {
    accounts: AccountRow[];
    ways: WayRow[];
    devices: DeviceRow[];
    records: [string, RecordRow[]][];
    spent: [string, number][];
    links: LinkRow[];
  };
  const state = emptyState();
  for (const a of raw.accounts) state.accounts.set(k(a.id), a);
  for (const w of raw.ways) {
    if (!state.ways.has(k(w.account))) state.ways.set(k(w.account), new Map());
    state.ways.get(k(w.account))!.set(k(w.id), w);
  }
  for (const d of raw.devices) {
    if (!state.devices.has(k(d.account))) state.devices.set(k(d.account), new Map());
    state.devices.get(k(d.account))!.set(k(d.id), d);
  }
  for (const [account, rows] of raw.records) state.records.set(account, new Map(rows.map((r) => [k(r.rid), r])));
  for (const [nonce, day] of raw.spent) state.spent.set(nonce, day);
  for (const l of raw.links) state.links.set(k(l.id), l);
  return state;
}

export type MemoryStore = AccountStore & {
  /** Every row of every table, as kept (the "stolen database" test reads it). */
  dump(): {
    accounts: AccountRow[];
    ways: WayRow[];
    devices: DeviceRow[];
    records: (RecordRow & { account: Bytes })[];
    spent: { nonce: Bytes; day: number }[];
    links: LinkRow[];
  };
  /** Wait for the file to be written (development only). */
  flush(): Promise<void>;
};

export function memoryStore(options: { file?: string } = {}): MemoryStore {
  let state = emptyState();
  if (options.file && existsSync(options.file)) {
    try {
      state = fromJson(readFileSync(options.file, "utf8"));
    } catch {
      state = emptyState();
    }
  }
  let saving: ReturnType<typeof setTimeout> | null = null;
  let saved: Promise<void> = Promise.resolve();
  const changed = () => {
    if (!options.file || saving) return;
    saving = setTimeout(() => {
      saving = null;
      saved = new Promise((resolve) => {
        try {
          mkdirSync(dirname(options.file!), { recursive: true });
          const tmp = `${options.file}.tmp`;
          writeFileSync(tmp, toJson(state), { mode: 0o600 });
          renameSync(tmp, options.file!);
        } catch {
          /* development only: the next change tries again */
        }
        resolve();
      });
    }, 50);
  };

  const waysOf = (account: Bytes) => state.ways.get(k(account)) ?? new Map<string, WayRow>();
  const devicesOf = (account: Bytes) => state.devices.get(k(account)) ?? new Map<string, DeviceRow>();
  const recordsOf = (account: Bytes) => {
    let rows = state.records.get(k(account));
    if (!rows) {
      rows = new Map();
      state.records.set(k(account), rows);
    }
    return rows;
  };
  /** A credential id or lookup already used (`replacing`: the account's own way of that kind is about to go, as in SQL). */
  const lookupTaken = (kind: string, lookup: Bytes | null, replacing?: Bytes) => {
    if (!lookup) return false;
    for (const [account, ways] of state.ways) {
      if (replacing && account === k(replacing)) continue;
      for (const w of ways.values()) if (w.kind === kind && w.lookup && k(w.lookup) === k(lookup)) return true;
    }
    return false;
  };
  const evict = (account: Bytes, keep: Bytes, max: number) => {
    const devices = devicesOf(account);
    const others = [...devices.values()]
      .filter((d) => k(d.id) !== k(keep))
      .sort((a, b) => a.seenDay - b.seenDay || a.createdDay - b.createdDay || (k(a.id) < k(b.id) ? -1 : 1));
    while (devices.size > max && others.length) devices.delete(k(others.shift()!.id));
  };
  const insertDevice = (device: DeviceRow, max: number) => {
    if (!state.devices.has(k(device.account))) state.devices.set(k(device.account), new Map());
    state.devices.get(k(device.account))!.set(k(device.id), copy(device));
    evict(device.account, device.id, max);
  };
  const removeAccount = (key: string) => {
    state.accounts.delete(key);
    state.ways.delete(key);
    state.devices.delete(key);
    state.records.delete(key);
    for (const [id, link] of state.links) if (link.account && k(link.account) === key) state.links.delete(id);
  };

  const store: MemoryStore = {
    async accountsCreatedOn(day) {
      let n = 0;
      for (const a of state.accounts.values()) if (a.createdDay === day) n += 1;
      return n;
    },

    async createAccount(account, ways, device) {
      if (state.accounts.has(k(account.id))) return "taken";
      const seen = new Set<string>();
      for (const w of ways) {
        if (!w.lookup) continue;
        const key = `${w.kind}:${k(w.lookup)}`;
        if (seen.has(key) || lookupTaken(w.kind, w.lookup)) return "taken";
        seen.add(key);
      }
      state.accounts.set(k(account.id), {
        id: copy(account.id),
        createdDay: account.day,
        seenDay: account.day,
        seq: 0,
        floor: 0,
        bytes: 0,
        records: 0,
        quotaBytes: account.quotaBytes,
        quotaRecords: account.quotaRecords,
      });
      state.ways.set(k(account.id), new Map(ways.map((w) => [k(w.id), copy(w)])));
      state.devices.set(k(account.id), new Map([[k(device.id), copy(device)]]));
      changed();
      return "ok";
    },

    async getAccount(id) {
      const a = state.accounts.get(k(id));
      return a ? copy(a) : null;
    },

    async deleteAccount(id) {
      if (!state.accounts.has(k(id))) return false;
      removeAccount(k(id));
      changed();
      return true;
    },

    async touch(account, device, day) {
      const d = devicesOf(account).get(k(device));
      const a = state.accounts.get(k(account));
      if (!d || !a) return false;
      if (d.seenDay < day || a.seenDay < day) {
        d.seenDay = Math.max(d.seenDay, day);
        a.seenDay = Math.max(a.seenDay, day);
        changed();
      }
      return true;
    },

    async findWay(kind, lookup) {
      for (const ways of state.ways.values()) {
        for (const w of ways.values()) if (w.kind === kind && w.lookup && k(w.lookup) === k(lookup)) return copy(w);
      }
      return null;
    },

    async listWays(account) {
      return [...waysOf(account).values()].sort((a, b) => a.createdDay - b.createdDay || (k(a.id) < k(b.id) ? -1 : 1)).map(copy);
    },

    async addWay(way, maxPasskeys) {
      if (!state.accounts.has(k(way.account))) return "missing";
      const ways = waysOf(way.account);
      if (way.kind === "passkey" && [...ways.values()].filter((w) => w.kind === "passkey").length >= maxPasskeys) return "limit";
      if (lookupTaken(way.kind, way.lookup, way.kind === "passkey" ? undefined : way.account)) return "taken";
      if (way.kind !== "passkey") for (const [id, w] of ways) if (w.kind === way.kind) ways.delete(id);
      ways.set(k(way.id), copy(way));
      state.ways.set(k(way.account), ways);
      changed();
      return "ok";
    },

    async removeWay(account, id) {
      const ways = waysOf(account);
      const way = ways.get(k(id));
      if (!way) return "missing";
      const others = [...ways.values()].filter((w) => k(w.id) !== k(id) && w.kind !== "recovery");
      if (way.kind === "recovery" || !others.length) return "last";
      ways.delete(k(id));
      changed();
      return "ok";
    },

    async usedWay(account, id, day, counter) {
      const way = waysOf(account).get(k(id));
      if (!way) return false;
      if (counter !== undefined) {
        const stored = way.counter ?? 0;
        if (!((counter === 0 && stored === 0) || counter > stored)) return false;
        way.counter = counter;
      }
      way.usedDay = Math.max(way.usedDay ?? 0, day);
      changed();
      return true;
    },

    async spendNonce(nonce, day) {
      if (state.spent.has(k(nonce))) return false;
      state.spent.set(k(nonce), day);
      changed();
      return true;
    },

    async addDevice(device, max) {
      if (!state.accounts.has(k(device.account))) return;
      insertDevice(device, max);
      changed();
    },

    async getDevice(account, id) {
      const d = devicesOf(account).get(k(id));
      return d ? copy(d) : null;
    },

    async listDevices(account) {
      return [...devicesOf(account).values()].sort((a, b) => a.createdDay - b.createdDay || (k(a.id) < k(b.id) ? -1 : 1)).map(copy);
    },

    async renameDevice(account, id, name) {
      const d = devicesOf(account).get(k(id));
      if (!d) return false;
      d.name = copy(name);
      changed();
      return true;
    },

    async removeDevice(account, id) {
      const removed = devicesOf(account).delete(k(id));
      if (removed) changed();
      return removed;
    },

    async putRecords(account, puts, day, maxTombstones): Promise<PutResult | "quota" | "missing"> {
      const a = state.accounts.get(k(account));
      if (!a) return "missing";
      const rows = recordsOf(account);
      const next = new Map(rows);
      const applied: PutResult["applied"] = [];
      puts.forEach((put, i) => {
        const current = next.get(k(put.rid))?.version ?? 0;
        if (current !== put.base) return;
        const version = a.seq + i + 1;
        next.set(k(put.rid), { rid: copy(put.rid), version, deleted: put.blob === null, blob: put.blob ? copy(put.blob) : null, changedDay: day });
        applied.push({ rid: copy(put.rid), version });
      });
      let bytes = 0;
      let live = 0;
      for (const r of next.values()) {
        if (r.deleted) continue;
        bytes += r.blob?.byteLength ?? 0;
        live += 1;
      }
      if (bytes > a.quotaBytes || live > a.quotaRecords) return "quota";
      const seqBefore = a.seq;
      a.seq += puts.length;
      a.bytes = bytes;
      a.records = live;
      state.records.set(k(account), next);
      // Beyond the newest tombstones kept, the oldest go, and the purge mark moves up.
      const tombs = [...next.values()].filter((r) => r.deleted).sort((x, y) => y.version - x.version);
      for (const gone of tombs.slice(maxTombstones)) {
        next.delete(k(gone.rid));
        a.floor = Math.max(a.floor, gone.version);
      }
      const done = new Set(applied.map((x) => k(x.rid)));
      const conflicts = puts
        .filter((put) => !done.has(k(put.rid)))
        .map((put) => {
          const r = next.get(k(put.rid));
          return r && r.version <= seqBefore
            ? { rid: copy(put.rid), version: r.version, deleted: r.deleted, blob: r.blob ? copy(r.blob) : null }
            : { rid: copy(put.rid), version: 0, deleted: false, blob: null };
        });
      changed();
      return { applied, conflicts };
    },

    async changes(account, cursor, limit, maxBytes): Promise<ChangesResult | null> {
      const a = state.accounts.get(k(account));
      if (!a) return null;
      if (cursor > 0 && cursor < a.floor) return { rows: [], more: true, reset: true };
      const inner = [...recordsOf(account).values()]
        .filter((r) => r.version > cursor && (cursor > 0 || !r.deleted))
        .sort((x, y) => x.version - y.version)
        .slice(0, limit + 1);
      const rows: ChangesResult["rows"] = [];
      let running = 0;
      for (const r of inner) {
        const size = r.blob?.byteLength ?? 0;
        const fits = running < maxBytes;
        running += size;
        if (!fits || rows.length >= limit) break;
        rows.push({ rid: copy(r.rid), version: r.version, deleted: r.deleted, blob: r.blob ? copy(r.blob) : null });
      }
      return { rows, more: rows.length < inner.length, reset: false };
    },

    async openLink(link) {
      state.links.set(k(link.id), copy(link));
      changed();
    },

    async getLink(id) {
      const l = state.links.get(k(id));
      return l ? copy(l) : null;
    },

    async joinLink(id, side) {
      const l = state.links.get(k(id));
      if (!l) return null;
      if ("giverEpk" in side) {
        if (l.opener !== "taker" || l.giverEpk || !state.accounts.has(k(side.account))) return null;
        l.giverEpk = copy(side.giverEpk);
        l.account = copy(side.account);
      } else {
        if (l.opener !== "giver" || l.takerEpk) return null;
        l.takerEpk = copy(side.takerEpk);
        l.takerKey = copy(side.takerKey);
      }
      changed();
      return copy(l);
    },

    async giveLink(id, account, sealed, device, maxDevices) {
      const l = state.links.get(k(id));
      if (!l || !l.account || k(l.account) !== k(account) || l.sealed || !l.giverEpk || !l.takerEpk || !l.takerKey) return false;
      if (!state.accounts.has(k(account))) return false;
      l.sealed = copy(sealed);
      l.device = copy(device.id);
      insertDevice({ ...device, account, publicKey: l.takerKey, name: null }, maxDevices);
      changed();
      return true;
    },

    async takeLink(id) {
      const l = state.links.get(k(id));
      if (!l || !l.sealed) return null;
      state.links.delete(k(id));
      changed();
      return copy(l);
    },

    async closeLink(id) {
      if (state.links.delete(k(id))) changed();
    },

    async cleanup(today, keep): Promise<CleanupResult> {
      const out: CleanupResult = { accounts: 0, tombstones: 0, spent: 0, links: 0 };
      for (const [key, a] of [...state.accounts]) {
        if (a.seenDay < today - keep.inactive) {
          removeAccount(key);
          out.accounts += 1;
        }
      }
      for (const [key, rows] of state.records) {
        const a = state.accounts.get(key);
        if (!a) continue;
        for (const [rid, r] of [...rows]) {
          if (r.deleted && r.changedDay < today - keep.tombstones) {
            rows.delete(rid);
            a.floor = Math.max(a.floor, r.version);
            out.tombstones += 1;
          }
        }
      }
      for (const [nonce, day] of [...state.spent]) {
        if (day < today - keep.spent) {
          state.spent.delete(nonce);
          out.spent += 1;
        }
      }
      for (const [id, l] of [...state.links]) {
        if (l.day < today - keep.links) {
          state.links.delete(id);
          out.links += 1;
        }
      }
      changed();
      return out;
    },

    dump() {
      return copy({
        accounts: [...state.accounts.values()],
        ways: [...state.ways.values()].flatMap((m) => [...m.values()]),
        devices: [...state.devices.values()].flatMap((m) => [...m.values()]),
        records: [...state.records.entries()].flatMap(([account, rows]) => [...rows.values()].map((r) => ({ ...r, account: fromHex(account)! }))),
        spent: [...state.spent.entries()].map(([nonce, day]) => ({ nonce: fromHex(nonce)!, day })),
        links: [...state.links.values()],
      });
    },

    async flush() {
      if (saving) {
        clearTimeout(saving);
        saving = null;
        changed();
        await new Promise((r) => setTimeout(r, 60));
      }
      await saved;
    },
  };
  return store;
}
