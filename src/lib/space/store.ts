import type { Sealed } from "./crypto";

/*
 * Where the private space lives: the browser's own database (IndexedDB), one
 * database for Ulune with three stores:
 *   - meta:   the space's description (its id, when it locks, and the data
 *             key wrapped once per way in); nothing personal is in it;
 *   - items:  one sealed record per chart, partner, AI key or setting;
 *   - device: the data key itself, only while "stay unlocked on this device"
 *             is chosen (a non-extractable CryptoKey: the browser keeps it,
 *             page code cannot read it out).
 * A memory store with the same shape serves the tests.
 */

export type LockMode = "close" | "idle" | "stay";

export type PassphraseWrap = {
  kind: "passphrase";
  id: string;
  salt: string;
  m: number;
  t: number;
  p: number;
  iv: string;
  ct: string;
};
export type RecoveryWrap = { kind: "recovery"; id: string; iv: string; ct: string };
export type PasskeyWrap = {
  kind: "passkey";
  id: string;
  /** The credential's id (base64url), asked for by name when unlocking. */
  credId: string;
  /** The PRF input the passkey hashes into its secret (base64url). */
  prfSalt: string;
  /** When it was added, to tell passkeys apart in the list. */
  added: number;
  iv: string;
  ct: string;
};
export type Wrap = PassphraseWrap | RecoveryWrap | PasskeyWrap;

export type SpaceMeta = {
  v: 1;
  id: string;
  created: number;
  lock: LockMode;
  /** The user id passkeys were made with (base64url, random): one per space. */
  passkeyUser: string;
  wraps: Wrap[];
};

export interface SpaceStore {
  getMeta(): Promise<SpaceMeta | null>;
  putMeta(meta: SpaceMeta): Promise<void>;
  getItem(key: string): Promise<Sealed | null>;
  /** Several writes and deletes, all or nothing. */
  writeItems(puts: readonly (readonly [string, Sealed])[], deletes?: readonly string[]): Promise<void>;
  listItems(prefix?: string): Promise<[string, Sealed][]>;
  getDeviceKey(): Promise<CryptoKey | null>;
  putDeviceKey(key: CryptoKey | null): Promise<void>;
  /** A whole space at once (a restored backup), replacing what is there. */
  replaceAll(meta: SpaceMeta, items: readonly (readonly [string, Sealed])[]): Promise<void>;
  /** Everything gone: meta, items, device key. */
  erase(): Promise<void>;
}

export const DB_NAME = "ulune-space";
const DB_VERSION = 1;
const META = "meta";
const ITEMS = "items";
const DEVICE = "device";
const META_KEY = "space";
const DEVICE_KEY = "stay";

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error ?? new Error("idb request failed"));
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error("idb transaction aborted"));
    tx.onerror = () => reject(tx.error ?? new Error("idb transaction failed"));
  });
}

/** Open databases by name: the space's, or a throwaway one (the Safari self-test). */
const opening = new Map<string, Promise<IDBDatabase>>();

function openDb(name: string): Promise<IDBDatabase> {
  const open = opening.get(name);
  if (open) return open;
  const next = new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open(name, DB_VERSION);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META);
      if (!db.objectStoreNames.contains(ITEMS)) db.createObjectStore(ITEMS);
      if (!db.objectStoreNames.contains(DEVICE)) db.createObjectStore(DEVICE);
    };
    r.onsuccess = () => {
      const db = r.result;
      // Another tab erasing the space asks this one to let go.
      db.onversionchange = () => {
        db.close();
        opening.delete(name);
      };
      resolve(db);
    };
    r.onerror = () => {
      opening.delete(name);
      reject(r.error ?? new Error("idb open failed"));
    };
    r.onblocked = () => {
      /* another tab holds an older version: it closes on versionchange */
    };
  });
  opening.set(name, next);
  return next;
}

function asSealed(value: unknown): Sealed | null {
  if (!value || typeof value !== "object") return null;
  const v = value as { iv?: unknown; ct?: unknown };
  if (!(v.iv instanceof Uint8Array) || !(v.ct instanceof Uint8Array)) return null;
  return { iv: v.iv as Uint8Array<ArrayBuffer>, ct: v.ct as Uint8Array<ArrayBuffer> };
}

/** Whether this browser can keep a private space at all. */
export function spaceSupported(): boolean {
  return (
    typeof indexedDB !== "undefined" &&
    typeof crypto !== "undefined" &&
    typeof crypto.subtle !== "undefined" &&
    typeof window !== "undefined" &&
    window.isSecureContext !== false
  );
}

/** The space in IndexedDB; `name` other than the space's only for the self-test's throwaway space. */
export function idbStore(name: string = DB_NAME): SpaceStore {
  return {
    async getMeta() {
      const db = await openDb(name);
      const meta = await req(db.transaction(META).objectStore(META).get(META_KEY));
      return (meta as SpaceMeta | undefined) ?? null;
    },
    async putMeta(meta) {
      const db = await openDb(name);
      const tx = db.transaction(META, "readwrite");
      tx.objectStore(META).put(meta, META_KEY);
      await done(tx);
    },
    async getItem(key) {
      const db = await openDb(name);
      return asSealed(await req(db.transaction(ITEMS).objectStore(ITEMS).get(key)));
    },
    async writeItems(puts, deletes = []) {
      if (!puts.length && !deletes.length) return;
      const db = await openDb(name);
      const tx = db.transaction(ITEMS, "readwrite");
      const store = tx.objectStore(ITEMS);
      for (const key of deletes) store.delete(key);
      for (const [key, sealed] of puts) store.put({ iv: sealed.iv, ct: sealed.ct }, key);
      await done(tx);
    },
    async listItems(prefix = "") {
      const db = await openDb(name);
      const store = db.transaction(ITEMS).objectStore(ITEMS);
      const range = prefix ? IDBKeyRange.bound(prefix, `${prefix}￿`) : undefined;
      const [keys, values] = await Promise.all([req(store.getAllKeys(range)), req(store.getAll(range))]);
      const out: [string, Sealed][] = [];
      keys.forEach((key, i) => {
        const sealed = asSealed(values[i]);
        if (typeof key === "string" && sealed) out.push([key, sealed]);
      });
      return out;
    },
    async getDeviceKey() {
      const db = await openDb(name);
      const row = await req(db.transaction(DEVICE).objectStore(DEVICE).get(DEVICE_KEY));
      return row instanceof CryptoKey ? row : null;
    },
    async putDeviceKey(key) {
      const db = await openDb(name);
      const tx = db.transaction(DEVICE, "readwrite");
      if (key) tx.objectStore(DEVICE).put(key, DEVICE_KEY);
      else tx.objectStore(DEVICE).delete(DEVICE_KEY);
      await done(tx);
    },
    async replaceAll(meta, items) {
      const db = await openDb(name);
      const tx = db.transaction([META, ITEMS, DEVICE], "readwrite");
      tx.objectStore(ITEMS).clear();
      tx.objectStore(DEVICE).clear();
      tx.objectStore(META).put(meta, META_KEY);
      for (const [key, sealed] of items) tx.objectStore(ITEMS).put({ iv: sealed.iv, ct: sealed.ct }, key);
      await done(tx);
    },
    async erase() {
      const db = await openDb(name);
      const tx = db.transaction([META, ITEMS, DEVICE], "readwrite");
      tx.objectStore(META).clear();
      tx.objectStore(ITEMS).clear();
      tx.objectStore(DEVICE).clear();
      await done(tx);
      // Then the database itself, so nothing of it is left on the disk.
      db.close();
      opening.delete(name);
      await new Promise<void>((resolve) => {
        const r = indexedDB.deleteDatabase(name);
        r.onsuccess = () => resolve();
        r.onerror = () => resolve();
        r.onblocked = () => resolve();
      });
    },
  };
}

/** The same store in memory (tests, and browsers that refuse IndexedDB). */
export function memoryStore(): SpaceStore & { dump(): { meta: SpaceMeta | null; items: Map<string, Sealed>; device: CryptoKey | null } } {
  let meta: SpaceMeta | null = null;
  let device: CryptoKey | null = null;
  const items = new Map<string, Sealed>();
  const copy = (s: Sealed): Sealed => ({ iv: new Uint8Array(s.iv), ct: new Uint8Array(s.ct) });
  return {
    async getMeta() {
      return meta ? (JSON.parse(JSON.stringify(meta)) as SpaceMeta) : null;
    },
    async putMeta(next) {
      meta = JSON.parse(JSON.stringify(next)) as SpaceMeta;
    },
    async getItem(key) {
      const hit = items.get(key);
      return hit ? copy(hit) : null;
    },
    async writeItems(puts, deletes = []) {
      for (const key of deletes) items.delete(key);
      for (const [key, sealed] of puts) items.set(key, copy(sealed));
    },
    async listItems(prefix = "") {
      return [...items.entries()].filter(([key]) => key.startsWith(prefix)).map(([key, s]) => [key, copy(s)]);
    },
    async getDeviceKey() {
      return device;
    },
    async putDeviceKey(key) {
      device = key;
    },
    async replaceAll(nextMeta, nextItems) {
      meta = JSON.parse(JSON.stringify(nextMeta)) as SpaceMeta;
      device = null;
      items.clear();
      for (const [key, sealed] of nextItems) items.set(key, copy(sealed));
    },
    async erase() {
      meta = null;
      device = null;
      items.clear();
    },
    dump() {
      return { meta, items, device };
    },
  };
}
