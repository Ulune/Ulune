import type { WayKind } from "./protocol";

/*
 * Where the synced account's server keeps what it keeps (docs/sync-protocol.md, section 13; share
 * and compare plan, feature 4): one interface, two stores. In production, Neon's Postgres over its
 * HTTPS SQL endpoint (store-sql.server.ts, neon.server.ts, db/migrations); in development and the
 * tests, memory, kept in a file for `npm run dev` (store-memory.server.ts). The service
 * (service.server.ts) runs the same against both; scripts/account-store.test.mjs holds the two to
 * the same behaviour, the SQL one against a real Postgres when there is one.
 *
 * Each method is one atomic step. Days are whole days since 1970; nothing finer is ever passed in.
 */

export type Bytes = Uint8Array;

export type AccountRow = {
  id: Bytes;
  createdDay: number;
  seenDay: number;
  /** The last version handed out. */
  seq: number;
  /** Tombstones at or below this version may have been purged. */
  floor: number;
  bytes: number;
  records: number;
  quotaBytes: number;
  quotaRecords: number;
};

export type WayRow = {
  account: Bytes;
  id: Bytes;
  kind: WayKind;
  /** A passkey's credential id, or a recovery code's lookup; null for a passphrase. */
  lookup: Bytes | null;
  /** Passkey: its public key (SPKI), COSE algorithm and signature counter. */
  publicKey: Bytes | null;
  alg: number | null;
  counter: number | null;
  /** Passphrase: the device's Argon2id salt and settings. */
  clientSalt: Bytes | null;
  argonM: number | null;
  argonT: number | null;
  argonP: number | null;
  /** Passphrase and recovery code: the server's salt and scrypt(authKey). */
  serverSalt: Bytes | null;
  authHash: Bytes | null;
  /** The data key, wrapped on a device for this way in. */
  wrap: Bytes;
  createdDay: number;
  usedDay: number | null;
};

export type DeviceRow = {
  account: Bytes;
  id: Bytes;
  /** The device key's public half (SPKI, ECDSA P-256). */
  publicKey: Bytes;
  /** Sealed on a device: 128 bytes, or none yet. */
  name: Bytes | null;
  createdDay: number;
  seenDay: number;
};

export type RecordRow = { rid: Bytes; version: number; deleted: boolean; blob: Bytes | null; changedDay: number };

/** A write: `blob` null deletes (a tombstone). Applied only when the record's version is `base`. */
export type PutRow = { rid: Bytes; base: number; blob: Bytes | null };

export type PutResult = {
  applied: { rid: Bytes; version: number }[];
  /** The puts not applied: the record as it is (version 0 and no blob when there is none). */
  conflicts: { rid: Bytes; version: number; deleted: boolean; blob: Bytes | null }[];
};

export type ChangesResult = {
  rows: { rid: Bytes; version: number; deleted: boolean; blob: Bytes | null }[];
  more: boolean;
  reset: boolean;
};

export type LinkRow = {
  /** The 16-byte nonce inside the link token. */
  id: Bytes;
  day: number;
  opener: "giver" | "taker";
  /** The giver's account, once a giver opened or joined. */
  account: Bytes | null;
  giverEpk: Bytes | null;
  takerEpk: Bytes | null;
  /** The new device's key (SPKI). */
  takerKey: Bytes | null;
  sealed: Bytes | null;
  /** The new device's id, once given. */
  device: Bytes | null;
};

export type CleanupResult = { accounts: number; tombstones: number; spent: number; links: number };

/** The store could not answer (the database is unreachable or failed): the service says 503. */
export class StoreUnavailable extends Error {
  constructor(why: string) {
    super(`account store unavailable: ${why}`);
    this.name = "StoreUnavailable";
  }
}

export interface AccountStore {
  /** How many accounts were created on `day` (the server's daily cap on new accounts). */
  accountsCreatedOn(day: number): Promise<number>;
  /** A new account with its first ways in and its first device; "taken" when its id, or a passkey's credential id or a recovery lookup, is already used. */
  createAccount(account: { id: Bytes; day: number; quotaBytes: number; quotaRecords: number }, ways: readonly WayRow[], device: DeviceRow): Promise<"ok" | "taken">;
  getAccount(id: Bytes): Promise<AccountRow | null>;
  /** The account and everything in it, at once. */
  deleteAccount(id: Bytes): Promise<boolean>;
  /** Whether this device belongs to this account; the account's and the device's last-seen days moved to `day`. */
  touch(account: Bytes, device: Bytes, day: number): Promise<boolean>;

  findWay(kind: "passkey" | "recovery", lookup: Bytes): Promise<WayRow | null>;
  listWays(account: Bytes): Promise<WayRow[]>;
  /** A passkey is added (at most `maxPasskeys`); a passphrase or a recovery code replaces the one there. */
  addWay(way: WayRow, maxPasskeys: number): Promise<"ok" | "limit" | "taken" | "missing">;
  /** Never the recovery code, nor the last passkey or passphrase ("last"). */
  removeWay(account: Bytes, id: Bytes): Promise<"ok" | "missing" | "last">;
  /** A way in was used today; for a passkey, its counter moves to `counter` only if it may (section 4.2): false otherwise. */
  usedWay(account: Bytes, id: Bytes, day: number, counter?: number): Promise<boolean>;
  /** Spend a challenge's nonce: false when it was spent already. */
  spendNonce(nonce: Bytes, day: number): Promise<boolean>;

  /** A device joins; beyond `max`, the one seen longest ago leaves. */
  addDevice(device: DeviceRow, max: number): Promise<void>;
  getDevice(account: Bytes, id: Bytes): Promise<DeviceRow | null>;
  listDevices(account: Bytes): Promise<DeviceRow[]>;
  renameDevice(account: Bytes, id: Bytes, name: Bytes): Promise<boolean>;
  removeDevice(account: Bytes, id: Bytes): Promise<boolean>;

  /** A batch of writes, each applied if its base is the record's version, all of them or (over quota) none. */
  putRecords(account: Bytes, puts: readonly PutRow[], day: number, maxTombstones: number): Promise<PutResult | "quota" | "missing">;
  /** Records written after `cursor`, in version order, at most `limit` and about `maxBytes` of blobs; null for no account. */
  changes(account: Bytes, cursor: number, limit: number, maxBytes: number): Promise<ChangesResult | null>;

  openLink(link: LinkRow): Promise<void>;
  getLink(id: Bytes): Promise<LinkRow | null>;
  /** The other side joins, once: the row as it is then, or null when it was joined already (or is gone). */
  joinLink(id: Bytes, side: { giverEpk: Bytes; account: Bytes } | { takerEpk: Bytes; takerKey: Bytes }): Promise<LinkRow | null>;
  /** The giver hands over: the taker's device joins `account` (beyond `maxDevices`, the one seen longest ago leaves). False when the link is not joined, already given, or another account's. */
  giveLink(id: Bytes, account: Bytes, sealed: Bytes, device: DeviceRow, maxDevices: number): Promise<boolean>;
  /** A given link, deleted and returned, once. */
  takeLink(id: Bytes): Promise<LinkRow | null>;
  closeLink(id: Bytes): Promise<void>;

  /** The daily clean-up (section 9): accounts unseen since before `inactiveBefore`, tombstones, spent nonces and links older than their days. */
  cleanup(today: number, keep: { inactive: number; tombstones: number; spent: number; links: number }): Promise<CleanupResult>;
}
