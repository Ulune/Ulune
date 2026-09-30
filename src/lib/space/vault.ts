import {
  ARGON,
  MIN_PASSPHRASE,
  b64u,
  fromB64u,
  itemAad,
  newDataKey,
  newRecoveryCode,
  newSpaceSeed,
  normalizePassphrase,
  open,
  parseRecoveryCode,
  passkeyKek,
  passphraseKek,
  randomBytes,
  recoveryKek,
  seal,
  unwrapDataKey,
  wrapAad,
  wrapDataKey,
  type Sealed,
  type SpaceSeed,
} from "./crypto";
import type { LockMode, PasskeyWrap, PassphraseWrap, RecoveryWrap, SpaceMeta, SpaceStore, Wrap } from "./store";

/*
 * The private space: records sealed with one data key, the key stored only
 * wrapped by each way in (lib/space/crypto.ts), kept by a SpaceStore
 * (lib/space/store.ts). A Vault is the space opened: it holds the data key,
 * non-extractable, in memory until it is locked.
 *
 * Changing the passphrase, adding or removing a passkey and making a new
 * recovery code only rewrap the data key, never the records, and each asks
 * for a way in again (someone who finds the space open cannot take it over).
 */

/** The secret given does not open this space. */
export class WrongSecret extends Error {
  constructor() {
    super("wrong-secret");
    this.name = "WrongSecret";
  }
}

/** The space is not open (locked, or erased). */
export class SpaceLocked extends Error {
  constructor() {
    super("space-locked");
    this.name = "SpaceLocked";
  }
}

/** A passkey's PRF secret for this space, and which credential gave it. */
export type PasskeySecret = { credId: string; prf: Uint8Array };

/** A way in, given again to unlock or to confirm a change. */
export type WayIn =
  | { passphrase: string }
  | { recovery: string }
  | { passkey: PasskeySecret };

export { newSpaceSeed, type SpaceSeed };

const CHECK_KEY = "sys/check";

function sealedToJson(s: Sealed): { iv: string; ct: string } {
  return { iv: b64u(s.iv), ct: b64u(s.ct) };
}

function sealedFromJson(w: { iv: string; ct: string }): Sealed {
  return { iv: fromB64u(w.iv), ct: fromB64u(w.ct) };
}

async function passphraseWrap(dataKey: CryptoKey, spaceId: string, passphrase: string): Promise<PassphraseWrap> {
  if (normalizePassphrase(passphrase).length < MIN_PASSPHRASE) throw new Error("passphrase-too-short");
  const id = b64u(randomBytes(8));
  const salt = randomBytes(16);
  const kek = await passphraseKek(passphrase, salt, ARGON);
  const sealed = await wrapDataKey(dataKey, kek, wrapAad(spaceId, "passphrase", id));
  return { kind: "passphrase", id, salt: b64u(salt), ...ARGON, ...sealedToJson(sealed) };
}

async function recoveryWrap(dataKey: CryptoKey, spaceId: string, code: string): Promise<RecoveryWrap> {
  const id = b64u(randomBytes(8));
  const sealed = await wrapDataKey(dataKey, await recoveryKek(code, spaceId), wrapAad(spaceId, "recovery", id));
  return { kind: "recovery", id, ...sealedToJson(sealed) };
}

async function passkeyWrap(
  dataKey: CryptoKey,
  spaceId: string,
  secret: PasskeySecret & { prfSalt: string },
): Promise<PasskeyWrap> {
  const id = b64u(randomBytes(8));
  const kek = await passkeyKek(secret.prf, spaceId, secret.credId);
  const sealed = await wrapDataKey(dataKey, kek, wrapAad(spaceId, "passkey", id));
  return {
    kind: "passkey",
    id,
    credId: secret.credId,
    prfSalt: secret.prfSalt,
    added: Date.now(),
    ...sealedToJson(sealed),
  };
}

/**
 * The Argon2 settings a passphrase wrap may ask for: well above Ulune's own
 * (ARGON), well below what would freeze or crash a tab. A wrap asking for
 * more is not tried, and a backup holding one is refused.
 */
const ARGON_LIMITS = { m: [8, 262_144], t: [1, 16], p: [1, 8] } as const;

function argonFits(w: { m?: unknown; t?: unknown; p?: unknown }): boolean {
  const within = (v: unknown, [lo, hi]: readonly [number, number]) => Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi;
  return within(w.m, ARGON_LIMITS.m) && within(w.t, ARGON_LIMITS.t) && within(w.p, ARGON_LIMITS.p);
}

/** A wrap read from a file: the fields its kind needs, of the right types. Unknown kinds are left for newer versions. */
function wrapFits(w: unknown): "ok" | "bad" | "unknown" {
  if (!w || typeof w !== "object") return "bad";
  const x = w as Record<string, unknown>;
  if (typeof x.id !== "string" || typeof x.iv !== "string" || typeof x.ct !== "string") return "bad";
  if (x.kind === "passphrase") return typeof x.salt === "string" && argonFits(x) ? "ok" : "bad";
  if (x.kind === "recovery") return "ok";
  if (x.kind === "passkey") return typeof x.credId === "string" && typeof x.prfSalt === "string" ? "ok" : "bad";
  return "unknown";
}

/** The data key from the first wrap this way in opens, or WrongSecret. */
async function unwrapWith(meta: SpaceMeta, way: WayIn, extractable: boolean): Promise<CryptoKey> {
  const tries: { wrap: Wrap; kek: () => Promise<CryptoKey> }[] = [];
  if ("passphrase" in way) {
    for (const wrap of meta.wraps) {
      if (wrap.kind !== "passphrase" || !argonFits(wrap)) continue;
      tries.push({
        wrap,
        kek: () => passphraseKek(way.passphrase, fromB64u(wrap.salt), { m: wrap.m, t: wrap.t, p: wrap.p }),
      });
    }
  } else if ("recovery" in way) {
    const code = parseRecoveryCode(way.recovery);
    if (!code) throw new WrongSecret();
    for (const wrap of meta.wraps) {
      if (wrap.kind === "recovery") tries.push({ wrap, kek: () => recoveryKek(code, meta.id) });
    }
  } else {
    for (const wrap of meta.wraps) {
      if (wrap.kind === "passkey" && wrap.credId === way.passkey.credId) {
        tries.push({ wrap, kek: () => passkeyKek(way.passkey.prf, meta.id, wrap.credId) });
      }
    }
  }
  for (const t of tries) {
    try {
      return await unwrapDataKey(sealedFromJson(t.wrap), await t.kek(), wrapAad(meta.id, t.wrap.kind, t.wrap.id), extractable);
    } catch {
      /* not this one */
    }
  }
  throw new WrongSecret();
}

async function nonExtractable(dataKey: CryptoKey): Promise<CryptoKey> {
  if (!dataKey.extractable) return dataKey;
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", dataKey));
  try {
    return await crypto.subtle.importKey("raw", raw, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  } finally {
    raw.fill(0);
  }
}

/** A backup file: the space as stored, sealed; unreadable without a way in. */
export type SpaceBackup = {
  app: "ulune";
  type: "private-space";
  v: 1;
  exported: string;
  meta: Omit<SpaceMeta, "lock">;
  items: [string, { iv: string; ct: string }][];
};

export class Vault {
  private key: CryptoKey | null;
  private metaNow: SpaceMeta;
  private readonly store: SpaceStore;

  private constructor(store: SpaceStore, meta: SpaceMeta, key: CryptoKey) {
    this.store = store;
    this.metaNow = meta;
    this.key = key;
  }

  get meta(): SpaceMeta {
    return this.metaNow;
  }

  get isOpen(): boolean {
    return this.key !== null;
  }

  /**
   * A new space with a passphrase, a passkey or both, and a recovery code
   * (returned once: it is kept nowhere in the clear).
   */
  static async create(
    store: SpaceStore,
    first: { passphrase?: string; passkey?: PasskeySecret & { prfSalt: string } },
    seed: SpaceSeed = newSpaceSeed(),
    lock: LockMode = "close",
  ): Promise<{ vault: Vault; recoveryCode: string }> {
    if (!first.passphrase && !first.passkey) throw new Error("no-way-in");
    // One space per browser: a new one never replaces one that exists.
    if (await Vault.find(store)) throw new Error("space-exists");
    const dataKey = await newDataKey();
    const recoveryCode = newRecoveryCode();
    const wraps: Wrap[] = [];
    if (first.passphrase) wraps.push(await passphraseWrap(dataKey, seed.id, first.passphrase));
    if (first.passkey) wraps.push(await passkeyWrap(dataKey, seed.id, first.passkey));
    wraps.push(await recoveryWrap(dataKey, seed.id, recoveryCode));
    const meta: SpaceMeta = { v: 1, id: seed.id, created: Date.now(), lock, passkeyUser: seed.passkeyUser, wraps };
    const key = await nonExtractable(dataKey);
    const check = await seal(key, itemAad(meta.id, CHECK_KEY), { space: meta.id });
    await store.replaceAll(meta, [[CHECK_KEY, check]]);
    const vault = new Vault(store, meta, key);
    if (lock === "stay") await store.putDeviceKey(key);
    return { vault, recoveryCode };
  }

  /** The space's description, or null when this browser holds none. */
  static async find(store: SpaceStore): Promise<SpaceMeta | null> {
    const meta = await store.getMeta();
    return meta && meta.v === 1 && Array.isArray(meta.wraps) && meta.wraps.length ? meta : null;
  }

  static async unlock(store: SpaceStore, way: WayIn): Promise<Vault> {
    const meta = await Vault.find(store);
    if (!meta) throw new SpaceLocked();
    const key = await unwrapWith(meta, way, false);
    const vault = new Vault(store, meta, key);
    // The wrap already proved the secret; a lost check record is made again.
    await vault.verify(false);
    return vault;
  }

  /** "Stay unlocked on this device": the key the browser keeps, if it is still this space's. */
  static async unlockOnDevice(store: SpaceStore): Promise<Vault | null> {
    const meta = await Vault.find(store);
    if (!meta || meta.lock !== "stay") return null;
    const key = await store.getDeviceKey();
    if (!key) return null;
    const vault = new Vault(store, meta, key);
    try {
      await vault.verify(true);
    } catch {
      await store.putDeviceKey(null);
      return null;
    }
    return vault;
  }

  /**
   * The data key opens this space's check record, or the space is not this
   * key's. `strict`: a missing record fails too (the key kept on the device
   * has nothing else to prove it); otherwise it is written again.
   */
  private async verify(strict: boolean): Promise<void> {
    const sealed = await this.store.getItem(CHECK_KEY);
    if (!sealed) {
      if (strict) {
        this.key = null;
        throw new WrongSecret();
      }
      const check = await seal(this.need(), itemAad(this.metaNow.id, CHECK_KEY), { space: this.metaNow.id });
      await this.store.writeItems([[CHECK_KEY, check]]);
      return;
    }
    try {
      const value = await open<{ space?: string }>(this.need(), itemAad(this.metaNow.id, CHECK_KEY), sealed);
      if (value.space !== this.metaNow.id) throw new WrongSecret();
    } catch {
      this.key = null;
      throw new WrongSecret();
    }
  }

  private need(): CryptoKey {
    if (!this.key) throw new SpaceLocked();
    return this.key;
  }

  /** Forget the key: nothing can be read until a way in is given again. */
  lock(): void {
    this.key = null;
  }

  async get<T>(key: string): Promise<T | null> {
    const sealed = await this.store.getItem(key);
    if (!sealed) return null;
    return await open<T>(this.need(), itemAad(this.metaNow.id, key), sealed);
  }

  /** Every record under a prefix; one that fails to open is skipped and reported. */
  async list<T>(prefix: string): Promise<{ rows: [string, T][]; unreadable: string[] }> {
    const rows: [string, T][] = [];
    const unreadable: string[] = [];
    for (const [key, sealed] of await this.store.listItems(prefix)) {
      try {
        rows.push([key, await open<T>(this.need(), itemAad(this.metaNow.id, key), sealed)]);
      } catch (err) {
        if (err instanceof SpaceLocked) throw err;
        unreadable.push(key);
      }
    }
    return { rows, unreadable };
  }

  /** Several records written and removed at once. */
  async write(puts: readonly (readonly [string, unknown])[], deletes: readonly string[] = []): Promise<void> {
    const key = this.need();
    const sealed: [string, Sealed][] = [];
    for (const [name, value] of puts) {
      if (name === CHECK_KEY) continue;
      sealed.push([name, await seal(key, itemAad(this.metaNow.id, name), value)]);
    }
    await this.store.writeItems(
      sealed,
      deletes.filter((name) => name !== CHECK_KEY),
    );
  }

  async put(key: string, value: unknown): Promise<void> {
    await this.write([[key, value]]);
  }

  async remove(...keys: string[]): Promise<void> {
    await this.write([], keys);
  }

  async setLockMode(lock: LockMode): Promise<void> {
    const key = this.need();
    const meta = { ...this.metaNow, lock };
    await this.store.putMeta(meta);
    await this.store.putDeviceKey(lock === "stay" ? key : null);
    this.metaNow = meta;
  }

  /** Check a way in without changing anything (asked before a change to the ways in). */
  async confirm(way: WayIn): Promise<void> {
    this.need();
    await unwrapWith(this.metaNow, way, false);
  }

  private async rewrap(way: WayIn, change: (dataKey: CryptoKey, wraps: Wrap[]) => Promise<Wrap[]>): Promise<void> {
    this.need();
    const dataKey = await unwrapWith(this.metaNow, way, true);
    const wraps = await change(dataKey, [...this.metaNow.wraps]);
    if (!wraps.some((w) => w.kind === "recovery")) throw new Error("no-recovery");
    if (!wraps.some((w) => w.kind !== "recovery")) throw new Error("no-way-in");
    const meta = { ...this.metaNow, wraps };
    await this.store.putMeta(meta);
    this.metaNow = meta;
  }

  /** A new passphrase (or a first one), in place of any before. */
  async setPassphrase(way: WayIn, next: string): Promise<void> {
    await this.rewrap(way, async (dataKey, wraps) => [
      await passphraseWrap(dataKey, this.metaNow.id, next),
      ...wraps.filter((w) => w.kind !== "passphrase"),
    ]);
  }

  /** Remove the passphrase, when a passkey remains to open the space. */
  async removePassphrase(way: WayIn): Promise<void> {
    await this.rewrap(way, async (_dataKey, wraps) => wraps.filter((w) => w.kind !== "passphrase"));
  }

  async addPasskey(way: WayIn, secret: PasskeySecret & { prfSalt: string }): Promise<void> {
    await this.rewrap(way, async (dataKey, wraps) => [
      ...wraps.filter((w) => !(w.kind === "passkey" && w.credId === secret.credId)),
      await passkeyWrap(dataKey, this.metaNow.id, secret),
    ]);
  }

  async removePasskey(way: WayIn, credId: string): Promise<void> {
    await this.rewrap(way, async (_dataKey, wraps) =>
      wraps.filter((w) => !(w.kind === "passkey" && w.credId === credId)),
    );
  }

  /** A new recovery code; the old one stops working. Returned once. */
  async newRecoveryCode(way: WayIn): Promise<string> {
    const code = newRecoveryCode();
    await this.rewrap(way, async (dataKey, wraps) => [
      ...wraps.filter((w) => w.kind !== "recovery"),
      await recoveryWrap(dataKey, this.metaNow.id, code),
    ]);
    return code;
  }

  /**
   * A fingerprint of the records under a prefix as sealed now (each write
   * seals afresh, with a new nonce), and how many there are: a change to any
   * of them changes it. Nothing is opened to make it.
   */
  async mark(prefix: string): Promise<{ mark: string; count: number }> {
    this.need();
    const items = await this.store.listItems(prefix);
    const text = items
      .map(([key, sealed]) => `${key}\n${b64u(sealed.iv)}`)
      .sort()
      .join("\n");
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
    return { mark: b64u(digest), count: items.length };
  }

  /** The whole space, sealed as stored, for a file the reader keeps. */
  async backup(): Promise<SpaceBackup> {
    this.need();
    const items = await this.store.listItems("");
    const { lock: _lock, ...meta } = this.metaNow;
    void _lock;
    return {
      app: "ulune",
      type: "private-space",
      v: 1,
      exported: new Date().toISOString(),
      meta,
      items: items.map(([key, sealed]) => [key, sealedToJson(sealed)]),
    };
  }

  /** Erase the space from this browser: records, key, description. */
  async erase(): Promise<void> {
    this.key = null;
    await this.store.erase();
  }
}

/** A backup file's contents, checked for shape; null if it is not one. */
export function parseBackup(text: string): SpaceBackup | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  const b = raw as Partial<SpaceBackup> | null;
  if (!b || b.app !== "ulune" || b.type !== "private-space" || b.v !== 1) return null;
  const m = b.meta as Partial<SpaceMeta> | undefined;
  if (!m || m.v !== 1 || typeof m.id !== "string" || !Array.isArray(m.wraps) || !m.wraps.length) return null;
  const wraps = m.wraps.map(wrapFits);
  if (wraps.includes("bad") || !wraps.includes("ok")) return null;
  if (!Array.isArray(b.items)) return null;
  for (const row of b.items) {
    if (!Array.isArray(row) || typeof row[0] !== "string" || typeof row[1]?.iv !== "string" || typeof row[1]?.ct !== "string") {
      return null;
    }
  }
  if (!b.items.some((row) => row[0] === CHECK_KEY)) return null;
  return b as SpaceBackup;
}

/**
 * A backup opened with one of its ways in: its records, read. Used to add a
 * backup's charts to the space already open here.
 */
export async function openBackup(backup: SpaceBackup, way: WayIn): Promise<Map<string, unknown>> {
  const meta: SpaceMeta = { ...backup.meta, lock: "close" };
  const key = await unwrapWith(meta, way, false);
  const out = new Map<string, unknown>();
  for (const [name, sealed] of backup.items) {
    try {
      out.set(name, await open(key, itemAad(meta.id, name), sealedFromJson(sealed)));
    } catch {
      /* a record that does not open is left out */
    }
  }
  const check = out.get(CHECK_KEY) as { space?: string } | undefined;
  if (check?.space !== meta.id) throw new WrongSecret();
  out.delete(CHECK_KEY);
  return out;
}

/** Make a backup this browser's space (there is none here): it opens with the backup's ways in. */
/**
 * WrongSecret unless this way in opens the backup. Checked on the file itself,
 * before anything of it is written here: a wrong passphrase answers as fast
 * for a large backup as for a small one.
 */
export async function checkBackupWay(backup: SpaceBackup, way: WayIn): Promise<void> {
  await unwrapWith({ ...backup.meta, lock: "close" }, way, false);
}

export async function adoptBackup(store: SpaceStore, backup: SpaceBackup): Promise<void> {
  const meta: SpaceMeta = { ...backup.meta, lock: "close" };
  await store.replaceAll(
    meta,
    backup.items.map(([name, sealed]) => [name, sealedFromJson(sealed)] as const),
  );
}
