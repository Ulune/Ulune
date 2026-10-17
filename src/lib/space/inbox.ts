/*
 * The private space's inbox (share plan, feature 1). A chart shared with the
 * reader while their space is locked opens at once, in the tab's memory, and
 * is kept for the space, sealed so that only the space can open it: it joins
 * the space at the next unlock, after a reload or days later, by itself and
 * with a note (S2).
 *
 * A locked space cannot be written to (its key is not on the page), and a
 * chart kept in the clear would break the rule that nothing personal is. So
 * each space has a second key pair (ECDH on P-256, the browser's WebCrypto):
 *   - the private half sealed inside the space, as the record inbox/key; it
 *     is made with the space, or at the first unlock of a space made before;
 *   - the public half beside the space's description (store.ts), where a
 *     locked page can read it. It is not secret.
 * A chart is sealed to the public half: an ephemeral ECDH key, HKDF-SHA-256,
 * AES-256-GCM, with the space's id and the entry's random name bound in, and
 * stored under that name. At unlock the entries are opened with the private
 * half, the charts joined to the space as a backup's are (by id or by birth,
 * never twice, never over a chart already kept), and the inbox emptied. An
 * entry that does not open (altered, or sealed for another space) is dropped
 * unread. Nothing readable is stored at any point.
 *
 * A space whose public key is not there yet (made before this, and not
 * unlocked since) keeps nothing: the chart stays in the tab's memory, and the
 * page says to unlock the space to keep it.
 */
import type { SavedChart, StoredRow } from "@/lib/chart/library";
import { importWithRetry } from "@/lib/lazy-retry";
import { toast } from "@/lib/toast";
import { SPACE_VERSION, b64u, fromB64u, randomBytes, utf8 } from "./crypto";
import { CHART_RECORD, INBOX_KEY_RECORD, LIBRARY_RECORD, type LibraryRecord } from "./records";
import { INBOX_PREFIX, idbStore, type InboxSealed, type SpaceStore } from "./store";
import type { Vault } from "./vault";

/** At most this many charts wait for a locked space; past it, the page asks to unlock first. */
export const INBOX_MAX = 50;

const CURVE = { name: "ECDH", namedCurve: "P-256" } as const;

/** The record inside the space: the key pair, the public half as SPKI and the private half as PKCS #8 (base64url). */
export type InboxKeyRecord = { v: 1; pub: string; priv: string };

function entryAad(spaceId: string, name: string): Uint8Array<ArrayBuffer> {
  return utf8(`ulune/space/v${SPACE_VERSION}/inbox/${spaceId}/${name}`);
}

/** The entry's AES-256-GCM key: HKDF-SHA-256 over the ECDH secret, salted with the ephemeral key, for this space. */
async function entryKey(secret: ArrayBuffer, epk: Uint8Array<ArrayBuffer>, spaceId: string, use: KeyUsage): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", secret, "HKDF", false, ["deriveKey"]);
  return await crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: epk, info: utf8(`ulune/space/v${SPACE_VERSION}/inbox/${spaceId}`) },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    [use],
  );
}

/** A value sealed for the space whose inbox public key (SPKI) this is. */
export async function sealForInbox(spki: Uint8Array, spaceId: string, name: string, value: unknown): Promise<InboxSealed> {
  const pub = await crypto.subtle.importKey("spki", new Uint8Array(spki), CURVE, false, []);
  const eph = await crypto.subtle.generateKey(CURVE, true, ["deriveBits"]);
  const epk = new Uint8Array(await crypto.subtle.exportKey("raw", eph.publicKey));
  const secret = await crypto.subtle.deriveBits({ name: "ECDH", public: pub }, eph.privateKey, 256);
  const key = await entryKey(secret, epk, spaceId, "encrypt");
  const iv = randomBytes(12);
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: entryAad(spaceId, name) }, key, utf8(JSON.stringify(value))),
  );
  return { epk, iv, ct };
}

/** An entry opened with the inbox's private key; throws if it was altered, renamed, or sealed for another space. */
export async function openInboxEntry(priv: CryptoKey, spaceId: string, name: string, sealed: InboxSealed): Promise<unknown> {
  const epk = await crypto.subtle.importKey("raw", sealed.epk, CURVE, false, []);
  const secret = await crypto.subtle.deriveBits({ name: "ECDH", public: epk }, priv, 256);
  const key = await entryKey(secret, sealed.epk, spaceId, "decrypt");
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: sealed.iv, additionalData: entryAad(spaceId, name) }, key, sealed.ct);
  return JSON.parse(new TextDecoder().decode(plain));
}

async function privateKeyOf(pkcs8: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  return await crypto.subtle.importKey("pkcs8", pkcs8, CURVE, false, ["deriveBits"]);
}

/**
 * The inbox's private key, from the open space; made (and its public half
 * put beside the space) when the space has none yet or its record does not
 * open. The record is written before the public half, so no chart is ever
 * sealed to a key the space does not hold.
 */
export async function inboxKeyFor(vault: Vault, store: SpaceStore): Promise<CryptoKey> {
  const kept = await vault.get<InboxKeyRecord>(INBOX_KEY_RECORD).catch(() => null);
  if (kept && kept.v === 1 && typeof kept.pub === "string" && typeof kept.priv === "string") {
    try {
      const priv = await privateKeyOf(fromB64u(kept.priv));
      const here = await store.getInboxKey();
      // A backup restored here brings the record, not the public half: it is put back.
      if (!here || b64u(here) !== kept.pub) await store.putInboxKey(fromB64u(kept.pub));
      return priv;
    } catch {
      /* not a key: a new pair below */
    }
  }
  const pair = await crypto.subtle.generateKey(CURVE, true, ["deriveBits"]);
  const spki = new Uint8Array(await crypto.subtle.exportKey("spki", pair.publicKey));
  const pkcs8 = new Uint8Array(await crypto.subtle.exportKey("pkcs8", pair.privateKey));
  try {
    const record: InboxKeyRecord = { v: 1, pub: b64u(spki), priv: b64u(pkcs8) };
    await vault.put(INBOX_KEY_RECORD, record);
    await store.putInboxKey(spki);
    return await privateKeyOf(pkcs8);
  } finally {
    pkcs8.fill(0);
  }
}

/** What an opened entry must be to join the space: a chart as the space keeps one. */
function rowOf(value: unknown): StoredRow | null {
  const v = value as Partial<StoredRow> | null;
  if (!v || typeof v !== "object") return null;
  if (typeof v.id !== "string" || !v.id || v.id.length > 80) return null;
  if (!v.input || typeof v.input !== "object" || typeof v.input.date !== "string") return null;
  if (!v.chart || typeof v.chart !== "object") return null;
  if (v.sharedAt !== undefined && !Number.isFinite(v.sharedAt)) return null;
  return v as StoredRow;
}

/**
 * A chart shared while the space is locked, sealed into its inbox. "no-key":
 * the space has no inbox yet (not unlocked since this came); "full": the
 * inbox already holds INBOX_MAX charts. Either way nothing is written.
 */
export async function keepWhileLocked(row: StoredRow, store: SpaceStore = idbStore()): Promise<"sealed" | "no-key" | "full"> {
  const meta = await store.getMeta();
  const spki = await store.getInboxKey();
  if (!meta?.id || !spki) return "no-key";
  if ((await store.listInbox()).length >= INBOX_MAX) return "full";
  const name = `${INBOX_PREFIX}${b64u(randomBytes(12))}`;
  await store.putInbox(name, await sealForInbox(spki, meta.id, name, row));
  return "sealed";
}

/**
 * The charts of `rows` the open space lacks (by id or by birth, the newest
 * first), sealed into it at the top of its order; returns how many joined.
 * A chart already kept is never written over.
 */
export async function joinRows(vault: Vault, rows: readonly StoredRow[]): Promise<number> {
  const { fromStoredRow, unseenRows } = await importWithRetry(() => import("@/lib/chart/library"));
  const kept = (await vault.list<StoredRow>(CHART_RECORD)).rows;
  const held = kept.map(([, row]) => fromStoredRow(row)).filter((row): row is SavedChart => row !== null);
  const stored = new Map(rows.map((row) => [row.id, row]));
  const candidates = rows
    .map((row) => fromStoredRow(row))
    .filter((row): row is SavedChart => row !== null)
    .sort((a, b) => b.savedAt - a.savedAt);
  const joining = unseenRows(candidates, held);
  if (!joining.length) return 0;
  const library = await vault.get<LibraryRecord>(LIBRARY_RECORD).catch(() => null);
  const order = library?.order?.length ? library.order : [...held].sort((a, b) => b.savedAt - a.savedAt).map((row) => row.id);
  const ids = new Set(joining.map((row) => row.id));
  const next: LibraryRecord = { order: [...ids, ...order.filter((id) => !ids.has(id))], activeId: library?.activeId ?? null };
  await vault.write([...joining.map((row) => [CHART_RECORD + row.id, stored.get(row.id)] as const), [LIBRARY_RECORD, next]]);
  return joining.length;
}

/**
 * At unlock (lib/space/runtime.ts): the inbox's key made if need be, its
 * charts joined to the space, the inbox emptied. Returns how many joined.
 * The entries are dropped only once their charts are written.
 */
export async function joinInbox(vault: Vault, store: SpaceStore): Promise<number> {
  const priv = await inboxKeyFor(vault, store);
  const entries = await store.listInbox();
  if (!entries.length) return 0;
  const rows: StoredRow[] = [];
  for (const [name, sealed] of entries) {
    try {
      const row = rowOf(await openInboxEntry(priv, vault.meta.id, name, sealed));
      if (row) rows.push(row);
    } catch {
      /* altered, or sealed for another space: dropped unread */
    }
  }
  const added = rows.length ? await joinRows(vault, rows) : 0;
  await store.dropInbox(entries.map(([name]) => name));
  return added;
}

/** "1 chart shared with you was added", in the page's language. */
export async function sayJoined(count: number): Promise<void> {
  if (count < 1) return;
  const { shareWords } = await importWithRetry(() => import("@/lib/i18n/catalog/share-words"));
  const fr = document.documentElement.lang === "fr";
  const pair = count === 1 ? shareWords.shareAddedOne : shareWords.shareAddedMany;
  toast(pair[fr ? 1 : 0].replace("{count}", String(count)), "ok", 6000);
}
