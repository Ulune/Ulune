import { argon2idAsync } from "@noble/hashes/argon2.js";

/*
 * The private space's cryptography (lib/space/vault.ts), all of it in the
 * browser, with the browser's own AES-GCM and HKDF and @noble's Argon2id.
 *
 *   - One random 256-bit data key encrypts every record (AES-256-GCM, a fresh
 *     12-byte nonce each time, the record's name bound in as associated data,
 *     so a record moved under another name is refused).
 *   - The data key is stored only wrapped, once per way in: by a key stretched
 *     from the passphrase with Argon2id, by one derived from the recovery code,
 *     and by one derived from a passkey's PRF secret (HKDF-SHA-256).
 *   - Unwrapped, it is a non-extractable CryptoKey: page code can use it but
 *     never read it out.
 */

const enc = new TextEncoder();
const dec = new TextDecoder();

export const SPACE_VERSION = 1;

/** OWASP's second Argon2id setting: 19 MiB, two passes, one lane. */
export const ARGON = { m: 19_456, t: 2, p: 1 } as const;
export type ArgonParams = { m: number; t: number; p: number };

/** A passphrase shorter than this is refused. */
export const MIN_PASSPHRASE = 12;

export function randomBytes(n: number): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(new ArrayBuffer(n));
  crypto.getRandomValues(out);
  return out;
}

/** A copy backed by its own ArrayBuffer, as WebCrypto's typings want. */
function own(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(new ArrayBuffer(bytes.byteLength));
  out.set(bytes);
  return out;
}

export function b64u(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromB64u(text: string): Uint8Array<ArrayBuffer> {
  const b64 = text.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "===".slice((b64.length + 3) % 4));
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

/** Ids a new space needs before it exists (a passkey is made with them). */
export type SpaceSeed = { id: string; passkeyUser: string };

export function newSpaceSeed(): SpaceSeed {
  return { id: b64u(randomBytes(16)), passkeyUser: b64u(randomBytes(16)) };
}

export function utf8(text: string): Uint8Array<ArrayBuffer> {
  return own(enc.encode(text));
}

/** The passphrase as typed, minus spaces at either end, in one Unicode form. */
export function normalizePassphrase(text: string): string {
  return text.normalize("NFKC").trim();
}

/** Something sealed: a nonce and the ciphertext with its tag. */
export type Sealed = { iv: Uint8Array<ArrayBuffer>; ct: Uint8Array<ArrayBuffer> };

export function wrapAad(spaceId: string, kind: string, wrapId: string): Uint8Array<ArrayBuffer> {
  return utf8(`ulune/space/v${SPACE_VERSION}/wrap/${spaceId}/${kind}/${wrapId}`);
}

export function itemAad(spaceId: string, key: string): Uint8Array<ArrayBuffer> {
  return utf8(`ulune/space/v${SPACE_VERSION}/item/${spaceId}/${key}`);
}

const DATA_KEY = { name: "AES-GCM", length: 256 } as const;
const DATA_USES: KeyUsage[] = ["encrypt", "decrypt"];
const WRAP_USES: KeyUsage[] = ["wrapKey", "unwrapKey"];

/** A new data key, extractable once: only so it can be wrapped for each way in. */
export async function newDataKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(DATA_KEY, true, DATA_USES);
}

/** The passphrase's key-encryption key: Argon2id, then AES-GCM for wrapping. */
export async function passphraseKek(passphrase: string, salt: Uint8Array, params: ArgonParams): Promise<CryptoKey> {
  const raw = await argon2idAsync(utf8(normalizePassphrase(passphrase)), salt, {
    m: params.m,
    t: params.t,
    p: params.p,
    dkLen: 32,
  });
  const bytes = own(raw);
  raw.fill(0);
  try {
    return await crypto.subtle.importKey("raw", bytes, "AES-GCM", false, WRAP_USES);
  } finally {
    bytes.fill(0);
  }
}

/** A key-encryption key from a high-entropy secret (recovery code, passkey PRF): HKDF-SHA-256. */
export async function secretKek(secret: Uint8Array, spaceId: string, info: string): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", own(secret), "HKDF", false, ["deriveKey"]);
  return await crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: utf8(spaceId), info: utf8(info) },
    base,
    DATA_KEY,
    false,
    WRAP_USES,
  );
}

export async function wrapDataKey(dataKey: CryptoKey, kek: CryptoKey, aad: Uint8Array<ArrayBuffer>): Promise<Sealed> {
  const iv = randomBytes(12);
  const ct = new Uint8Array(
    await crypto.subtle.wrapKey("raw", dataKey, kek, { name: "AES-GCM", iv, additionalData: aad }),
  );
  return { iv, ct };
}

/**
 * The data key back from one of its wraps; throws if the key-encryption key
 * is not the one it was wrapped with (a wrong passphrase or code).
 */
export async function unwrapDataKey(
  wrapped: Sealed,
  kek: CryptoKey,
  aad: Uint8Array<ArrayBuffer>,
  extractable = false,
): Promise<CryptoKey> {
  return await crypto.subtle.unwrapKey(
    "raw",
    wrapped.ct,
    kek,
    { name: "AES-GCM", iv: wrapped.iv, additionalData: aad },
    DATA_KEY,
    extractable,
    DATA_USES,
  );
}

export async function seal(dataKey: CryptoKey, aad: Uint8Array<ArrayBuffer>, value: unknown): Promise<Sealed> {
  const iv = randomBytes(12);
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: aad }, dataKey, utf8(JSON.stringify(value))),
  );
  return { iv, ct };
}

/** The record's value; throws if it was altered, moved, or sealed with another key. */
export async function open<T = unknown>(dataKey: CryptoKey, aad: Uint8Array<ArrayBuffer>, sealed: Sealed): Promise<T> {
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: sealed.iv, additionalData: aad },
    dataKey,
    sealed.ct,
  );
  return JSON.parse(dec.decode(plain)) as T;
}

/*
 * The recovery code: 25 symbols of Crockford's base32 (0-9, A-Z without I, L,
 * O, U), 125 random bits, shown in five groups of five. Reading it back
 * forgives case, spaces, dashes, and O/I/L typed for 0/1.
 */
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const RECOVERY_LENGTH = 25;

export function newRecoveryCode(): string {
  const bytes = randomBytes(RECOVERY_LENGTH);
  let out = "";
  for (let i = 0; i < RECOVERY_LENGTH; i += 1) out += CROCKFORD[bytes[i] & 31];
  bytes.fill(0);
  return out;
}

/** The code as shown: five groups of five. */
export function formatRecoveryCode(code: string): string {
  return (code.match(/.{1,5}/g) ?? []).join("-");
}

/** The 25 symbols of a typed code, or null if it cannot be one. */
export function parseRecoveryCode(typed: string): string | null {
  const s = typed
    .toUpperCase()
    .replace(/[\s\-_.]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
  if (s.length !== RECOVERY_LENGTH) return null;
  for (const ch of s) if (!CROCKFORD.includes(ch)) return null;
  return s;
}

export async function recoveryKek(code: string, spaceId: string): Promise<CryptoKey> {
  return await secretKek(utf8(code), spaceId, `ulune/space/v${SPACE_VERSION}/recovery`);
}

export async function passkeyKek(prfOutput: Uint8Array, spaceId: string, credId: string): Promise<CryptoKey> {
  return await secretKek(prfOutput, spaceId, `ulune/space/v${SPACE_VERSION}/passkey/${credId}`);
}
