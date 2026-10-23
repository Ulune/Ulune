import { createHmac, hkdfSync, randomBytes as nodeRandom, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { b64u, concat, fromB64u, randomBytes, readU32, u32 } from "./encoding";
import { TTL } from "./protocol";

/*
 * The synced account's server secrets and tokens (docs/sync-protocol.md, sections 3.6 and 4.5;
 * share and compare plan, feature 4). One secret from the environment (ACCOUNT_SESSION_SECRET)
 * gives, through HKDF, the key that signs every token and the key that makes up stand-in salts.
 * A token is `0x01 ‖ purpose ‖ body ‖ tag`, the tag the first 16 bytes of HMAC-SHA-256: sessions
 * (bound to an account and a device), challenges (a nonce, an expiry, what they are bound to) and
 * device links. Nothing about a token is stored: the expiry is inside it, and a challenge's nonce
 * is written only when it is spent. Comparisons of secrets are in constant time.
 */

export const TOKEN_VERSION = 1;
export const PURPOSE = { session: 1, create: 2, signIn: 3, register: 4, renew: 5, link: 6 } as const;
type Purpose = (typeof PURPOSE)[keyof typeof PURPOSE];
const TAG = 16;

/** scrypt's settings for the authentication keys' hashes: 32 MiB, about a tenth of a second (section 3.6). */
export const SCRYPT = { N: 32_768, r: 8, p: 1, keylen: 32, maxmem: 64 * 1024 * 1024 } as const;

export type Secrets = { token: Buffer; standIn: Buffer };

/** The server's keys from its secret (at least 32 bytes). */
export function deriveSecrets(secret: Uint8Array): Secrets {
  if (secret.byteLength < 32) throw new Error("account secret too short");
  const salt = Buffer.from("ulune/account/v1/server", "utf8");
  return {
    token: Buffer.from(hkdfSync("sha256", secret, salt, Buffer.from("token", "utf8"), 32)),
    standIn: Buffer.from(hkdfSync("sha256", secret, salt, Buffer.from("stand-in", "utf8"), 32)),
  };
}

function tag(secrets: Secrets, head: Uint8Array): Buffer {
  return createHmac("sha256", secrets.token).update(head).digest().subarray(0, TAG);
}

/** Equal secrets, compared in constant time (lengths are public). */
export function sameSecret(a: Uint8Array, b: Uint8Array): boolean {
  return a.byteLength === b.byteLength && timingSafeEqual(a, b);
}

function issue(secrets: Secrets, purpose: Purpose, body: Uint8Array): string {
  const head = concat(new Uint8Array([TOKEN_VERSION, purpose]), body);
  return b64u(concat(head, tag(secrets, head)));
}

/** A token's body, when it is this purpose's, of this length, and its tag is right; otherwise null. */
function read(secrets: Secrets, purpose: Purpose, token: string | Uint8Array, bodyLength: number): Uint8Array | null {
  const bytes = typeof token === "string" ? fromB64u(token) : token;
  if (!bytes || bytes.byteLength !== 2 + bodyLength + TAG) return null;
  if (bytes[0] !== TOKEN_VERSION || bytes[1] !== purpose) return null;
  const head = bytes.subarray(0, 2 + bodyLength);
  if (!sameSecret(tag(secrets, head), bytes.subarray(2 + bodyLength))) return null;
  return bytes.subarray(2, 2 + bodyLength);
}

const seconds = (ms: number) => Math.floor(ms / 1000);

/* ------------------------------------------------------------ sessions */

export type Session = { account: Uint8Array; device: Uint8Array; expires: number; freshUntil: number };

/** A session token for one device of one account: an hour, fresh for five minutes when a way in made it. */
export function issueSession(secrets: Secrets, account: Uint8Array, device: Uint8Array, now: number, fresh: boolean): string {
  const at = seconds(now);
  return issue(secrets, PURPOSE.session, concat(account, device, u32(at + TTL.session), u32(fresh ? at + TTL.fresh : 0)));
}

/** The session a token holds, when it is genuine and unexpired. */
export function readSession(secrets: Secrets, token: string, now: number): Session | null {
  const body = read(secrets, PURPOSE.session, token, 40);
  if (!body) return null;
  const expires = readU32(body, 32);
  if (expires <= seconds(now)) return null;
  return { account: body.slice(0, 16), device: body.slice(16, 32), expires, freshUntil: readU32(body, 36) };
}

export function isFresh(session: Session, now: number): boolean {
  return session.freshUntil > seconds(now);
}

/* ------------------------------------------------------------ challenges and links */

/** A challenge: a fresh nonce, an expiry, and what it is bound to (an account, a device). */
export function issueChallenge(secrets: Secrets, purpose: Purpose, now: number, ttl: number, bound: readonly Uint8Array[] = []): { token: string; nonce: Uint8Array } {
  const nonce = randomBytes(16);
  return { token: issue(secrets, purpose, concat(nonce, u32(seconds(now) + ttl), ...bound)), nonce };
}

/** A challenge's nonce and what it is bound to, when it is genuine, this purpose's and unexpired. */
export function readChallenge(
  secrets: Secrets,
  purpose: Purpose,
  token: string | Uint8Array,
  now: number,
  boundLength = 0,
): { nonce: Uint8Array; bound: Uint8Array } | null {
  const body = read(secrets, purpose, token, 20 + boundLength);
  if (!body) return null;
  if (readU32(body, 16) <= seconds(now)) return null;
  return { nonce: body.slice(0, 16), bound: body.slice(20) };
}

/* ------------------------------------------------------------ stand-ins and hashes */

/** Bytes the server makes up, the same each time for the same input: a stand-in salt for an account it does not know. */
export function standIn(secrets: Secrets, label: string, input: Uint8Array, length = 16): Uint8Array {
  return createHmac("sha256", secrets.standIn).update(label).update(input).digest().subarray(0, length);
}

/** scrypt of an authentication key, as stored (section 3.6). */
export function scryptHash(authKey: Uint8Array, salt: Uint8Array): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(authKey, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p, maxmem: SCRYPT.maxmem }, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

/* ------------------------------------------------------------ addresses */

/** A key this instance makes when it starts: addresses are counted under its hash, never as they are. */
const ADDRESS_KEY = nodeRandom(32);

export function addressKey(address: string): string {
  return createHmac("sha256", ADDRESS_KEY).update(address).digest("base64url").slice(0, 22);
}
