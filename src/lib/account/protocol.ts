/*
 * The synced account's protocol, version 1 (docs/sync-protocol.md; share and compare plan,
 * feature 4): the numbers both sides agree on (sizes, buckets, limits, lifetimes), the operations'
 * names, the error codes and the shapes of what is sent and answered. Shared by the server
 * (src/lib/account/*.server.ts) and the device side (keys.ts, and the private space's sync, loaded
 * only when the reader syncs). No imports, so it costs nothing to load.
 */

export const PROTOCOL_VERSION = 1;
/** Every operation is POST <API_BASE><operation>, on Ulune's own address. */
export const API_BASE = "/api/account/v1/";
/** The daily clean-up, called by Vercel's scheduler (GET, with the cron secret). */
export const CLEANUP_PATH = "/api/account/cleanup";
/** The labels of the protocol's cryptography begin so (section 3). */
export const LABEL = "ulune/account/v1";

/** Account, device, way-in and record ids: 16 bytes. */
export const ID_BYTES = 16;
/** A sealed record's exact sizes (section 3.3): iv, padded plaintext and tag together. */
export const BUCKETS = [8192, 16384, 32768, 65536, 131072, 262144] as const;
/** What AES-GCM adds to a plaintext here: a 12-byte iv and a 16-byte tag. */
export const SEAL_OVERHEAD = 28;
/** A sealed device name: always 128 bytes, from a name padded to 100 (section 3.4). */
export const DEVICE_NAME_BYTES = 128;
export const DEVICE_NAME_PLAIN = 100;
export const SIZES = {
  authKey: 32,
  lookup: 16,
  salt: 16,
  /** An ECDH P-256 public key, uncompressed. */
  epk: 65,
  /** A device key's signature, IEEE P1363. */
  signature: 64,
  wrap: { min: 40, max: 256 },
  linkSealed: { min: 64, max: 2048 },
  /** WebAuthn's own limit for a credential id. */
  credentialId: 1023,
} as const;

/** The passphrase's Argon2id settings a server accepts: at least the space's own (m 19 456 KiB, t 2, p 1). */
export const ARGON_RANGE = { m: [19_456, 262_144], t: [2, 16], p: [1, 8] } as const;
/** What a device uses (lib/space/crypto.ts, ARGON), and what the server answers for an account it does not know. */
export const ARGON_DEFAULT = { m: 19_456, t: 2, p: 1 } as const;

export const LIMITS = {
  records: 2000,
  bytes: 16 * 1024 * 1024,
  tombstones: 5000,
  batchPuts: 64,
  batchBytes: 640 * 1024,
  pageRecords: 200,
  pageDefault: 100,
  pageBytes: 640 * 1024,
  body: 64 * 1024,
  putBody: 1024 * 1024,
  passkeys: 10,
  devices: 30,
  newAccountsPerDay: 1000,
} as const;

/** Lifetimes, in seconds. */
export const TTL = { session: 3600, fresh: 300, challenge: 300, create: 900, link: 600 } as const;
/** How long the server keeps what is kept for a while, in days. */
export const KEEP_DAYS = { tombstones: 90, spent: 2, links: 1, inactive: 730 } as const;

export const OPERATIONS = [
  "account/begin",
  "account/create",
  "account/status",
  "account/delete",
  "passkey/begin",
  "passkey/finish",
  "passphrase/params",
  "passphrase/sign-in",
  "recovery/sign-in",
  "session/begin",
  "session/renew",
  "ways/list",
  "ways/begin",
  "ways/add",
  "ways/remove",
  "devices/list",
  "devices/rename",
  "devices/remove",
  "records/put",
  "records/changes",
  "link/open",
  "link/join",
  "link/state",
  "link/give",
  "link/take",
  "link/close",
] as const;
export type Operation = (typeof OPERATIONS)[number];

/** Every error: its status. The body is exactly {"error": code} (section 11). */
export const ERRORS = {
  "bad-request": 400,
  denied: 401,
  "fresh-sign-in": 403,
  "cross-site": 403,
  "not-found": 404,
  method: 405,
  conflict: 409,
  "last-way-in": 409,
  limit: 409,
  gone: 410,
  "too-large": 413,
  "slow-down": 429,
  unavailable: 503,
  quota: 507,
} as const;
export type ErrorCode = keyof typeof ERRORS;

export type WayKind = "passkey" | "passphrase" | "recovery";

/** Whole days since 1 January 1970 (UTC): the only dates the server keeps. */
export function dayOf(ms: number): number {
  return Math.floor(ms / 86_400_000);
}

/** The smallest bucket that holds `plain` bytes of plaintext (format byte included) and a padding byte; null when none does. */
export function bucketFor(plain: number): number | null {
  for (const size of BUCKETS) if (plain + 1 + SEAL_OVERHEAD <= size) return size;
  return null;
}

export function isBucket(size: number): boolean {
  return (BUCKETS as readonly number[]).includes(size);
}

/* ---------------------------------------------------------------- shapes (base64url strings) */

export type DeviceIn = { key: string };
export type PasskeyIn = { credential: { id: string; clientDataJSON: string; attestationObject: string }; wrap: string };
export type PassphraseIn = { salt: string; m: number; t: number; p: number; authKey: string; wrap: string };
export type RecoveryIn = { lookup: string; authKey: string; wrap: string };
export type AssertionIn = { id: string; clientDataJSON: string; authenticatorData: string; signature: string; userHandle?: string };

export type SignInAnswer = {
  account: string;
  device: string;
  token: string;
  ttl: number;
  freshFor: number;
  way: { id: string; kind: WayKind; wrap: string };
};
export type CreateAnswer = { account: string; device: string; token: string; ttl: number; freshFor: number; ways: { id: string; kind: WayKind }[] };
export type BeginAnswer = { challenge: string; rpId: string; ttl: number };
export type StatusAnswer = {
  account: string;
  created: number;
  seen: number;
  latest: number;
  usage: { bytes: number; records: number };
  quota: { bytes: number; records: number };
};
export type WayRowOut = { id: string; kind: WayKind; created: number; used: number | null; credential?: string };
export type DeviceRowOut = { id: string; name: string | null; created: number; seen: number; current: boolean };
export type PutIn = { rid: string; base: number; blob: string } | { rid: string; base: number; deleted: true };
export type RecordOut = { rid: string; version: number; blob?: string; deleted?: true };
export type PutAnswer = { applied: { rid: string; version: number }[]; conflicts: RecordOut[] };
export type ChangesAnswer = { changes: RecordOut[]; cursor: number; more: boolean; reset?: true };
export type LinkState = { state: "open" | "joined" | "given"; giver?: string; taker?: string };
export type TakeAnswer = { account: string; device: string; sealed: string; token: string; ttl: number };
