import { argon2idAsync } from "@noble/hashes/argon2.js";
import { normalizePassphrase } from "@/lib/space/crypto";
import { b64u, concat, fromB64u, own, randomBytes, utf8 } from "./encoding";
import { ARGON_DEFAULT, DEVICE_NAME_BYTES, DEVICE_NAME_PLAIN, LABEL, SEAL_OVERHEAD, bucketFor, type WayKind } from "./protocol";

/*
 * The synced account's cryptography on the device (docs/sync-protocol.md, section 3; share and
 * compare plan, feature 4), with the browser's WebCrypto and @noble's Argon2id, the same as the
 * private space's (lib/space/crypto.ts). The server never runs any of it: it receives only what
 * this makes (record names hashed, records sealed and padded, wrapped keys, authentication keys,
 * public keys, signatures). Loaded only when the reader syncs; the tests use it as the device.
 *
 *   - The space's data key K gives two keys per account: the name key (HMAC) hashes record names,
 *     the record key (AES-256-GCM) seals records and device names.
 *   - Each way in gives a key-encryption key that wraps K, and an authentication key that the
 *     server can check but that opens nothing.
 *   - Each device has an ECDSA P-256 key of its own; a device link adds an ephemeral ECDH key.
 */

type Bytes = Uint8Array<ArrayBuffer>;
const AES = { name: "AES-GCM", length: 256 } as const;
const P256_ECDH = { name: "ECDH", namedCurve: "P-256" } as const;
const P256_ECDSA = { name: "ECDSA", namedCurve: "P-256" } as const;
const FORMAT_JSON = 1;
const FORMAT_DEFLATE = 2;
/** A record's JSON may not grow beyond this when it is decompressed. */
const MAX_INFLATED = 8 * 1024 * 1024;

async function hkdfBase(ikm: Uint8Array): Promise<CryptoKey> {
  return await crypto.subtle.importKey("raw", own(ikm), "HKDF", false, ["deriveBits", "deriveKey"]);
}

/** HKDF-SHA-256: `n` bytes. */
export async function hkdfBytes(ikm: Uint8Array, salt: Uint8Array, info: Uint8Array, n: number): Promise<Bytes> {
  const bits = await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt: own(salt), info: own(info) }, await hkdfBase(ikm), n * 8);
  return new Uint8Array(bits);
}

/** HKDF-SHA-256: an AES-256-GCM key, not extractable. */
async function hkdfAes(ikm: Uint8Array, salt: Uint8Array, info: Uint8Array): Promise<CryptoKey> {
  return await crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: own(salt), info: own(info) },
    await hkdfBase(ikm),
    AES,
    false,
    ["encrypt", "decrypt"],
  );
}

function idBytes(id: string): Bytes {
  const bytes = fromB64u(id);
  if (!bytes || bytes.byteLength !== 16) throw new Error("bad-id");
  return bytes;
}

async function seal(key: CryptoKey, aad: Uint8Array, plain: Uint8Array): Promise<Bytes> {
  const iv = randomBytes(12);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: own(aad) }, key, own(plain)));
  return concat(iv, ct);
}

/** Throws when the tag fails (a wrong key, or bytes altered or moved). */
async function unseal(key: CryptoKey, aad: Uint8Array, sealed: Uint8Array): Promise<Bytes> {
  if (sealed.byteLength < SEAL_OVERHEAD) throw new Error("sealed-too-short");
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: own(sealed.subarray(0, 12)), additionalData: own(aad) },
    key,
    own(sealed.subarray(12)),
  );
  return new Uint8Array(plain);
}

/** The fixed PRF input every account passkey is asked with (section 3.5): SHA-256 of "ulune/account/v1/prf". */
export async function prfSalt(): Promise<Bytes> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", utf8(`${LABEL}/prf`)));
}

/* ------------------------------------------------------------ records */

export type SyncKeys = { account: string; nameKey: CryptoKey; recordKey: CryptoKey };

/** The account's name key and record key, from the space's data key (32 raw bytes) and the account id. */
export async function syncKeys(dataKey: Uint8Array, account: string): Promise<SyncKeys> {
  const salt = idBytes(account);
  const nameRaw = await hkdfBytes(dataKey, salt, utf8(`${LABEL}/name-key`), 32);
  try {
    const nameKey = await crypto.subtle.importKey("raw", nameRaw, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const recordKey = await hkdfAes(dataKey, salt, utf8(`${LABEL}/record-key`));
    return { account, nameKey, recordKey };
  } finally {
    nameRaw.fill(0);
  }
}

/** A record's name as the server sees it: the first 16 bytes of its HMAC under the name key. */
export async function recordId(keys: SyncKeys, name: string): Promise<string> {
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", keys.nameKey, utf8(name)));
  return b64u(mac.subarray(0, 16));
}

/** What a sealed record holds: its real name, when the device wrote it (ms), its value. */
export type Envelope<T = unknown> = { n: string; t: number; v: T };

function recordAad(account: string, rid: string): Bytes {
  return utf8(`${LABEL}/record/${account}/${rid}`);
}

/** `plain` followed by 0x80 and zeros, `size` bytes in all. */
export function padTo(plain: Uint8Array, size: number): Bytes {
  if (plain.byteLength + 1 > size) throw new Error("too-big");
  const out = new Uint8Array(new ArrayBuffer(size));
  out.set(plain);
  out[plain.byteLength] = 0x80;
  return out;
}

/** The bytes before the padding; throws when there is none. */
export function unpad(padded: Uint8Array): Bytes {
  let end = padded.byteLength - 1;
  while (end >= 0 && padded[end] === 0) end -= 1;
  if (end < 0 || padded[end] !== 0x80) throw new Error("bad-padding");
  return own(padded.subarray(0, end));
}

async function deflate(bytes: Uint8Array): Promise<Bytes> {
  const stream = new Blob([own(bytes)]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function inflate(bytes: Uint8Array): Promise<Bytes> {
  const reader = new Blob([own(bytes)]).stream().pipeThrough(new DecompressionStream("deflate-raw")).getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_INFLATED) {
      await reader.cancel().catch(() => {});
      throw new Error("too-big");
    }
    parts.push(value);
  }
  return concat(...parts);
}

/**
 * A record sealed for the server (section 3.3): the envelope as JSON (compressed where the browser
 * can), a format byte, padding to a bucket, AES-256-GCM under the record key with the account and
 * the rid bound in. Its length is exactly a bucket's.
 */
export async function sealRecord(keys: SyncKeys, rid: string, envelope: Envelope, options: { compress?: boolean } = {}): Promise<Bytes> {
  const json = utf8(JSON.stringify(envelope));
  const compress = (options.compress ?? true) && typeof CompressionStream !== "undefined";
  const body = compress ? await deflate(json) : json;
  const plain = concat(new Uint8Array([compress ? FORMAT_DEFLATE : FORMAT_JSON]), body);
  const size = bucketFor(plain.byteLength);
  if (!size) throw new Error("record-too-big");
  return await seal(keys.recordKey, recordAad(keys.account, rid), padTo(plain, size - SEAL_OVERHEAD));
}

/** A blob opened; throws when it does not open, or holds another record than its rid says. */
export async function openRecord<T = unknown>(keys: SyncKeys, rid: string, blob: Uint8Array): Promise<Envelope<T>> {
  const plain = unpad(await unseal(keys.recordKey, recordAad(keys.account, rid), blob));
  const format = plain[0];
  const body = format === FORMAT_DEFLATE ? await inflate(plain.subarray(1)) : format === FORMAT_JSON ? plain.subarray(1) : null;
  if (!body) throw new Error("bad-format");
  const envelope = JSON.parse(new TextDecoder().decode(body)) as Envelope<T>;
  if (!envelope || typeof envelope.n !== "string" || typeof envelope.t !== "number") throw new Error("bad-envelope");
  if ((await recordId(keys, envelope.n)) !== rid) throw new Error("wrong-record");
  return envelope;
}

/* ------------------------------------------------------------ device names */

function deviceNameAad(account: string, device: string): Bytes {
  return utf8(`${LABEL}/device-name/${account}/${device}`);
}

/** At most 99 bytes of UTF-8, cut between characters. */
function nameBytes(name: string): Bytes {
  let out = utf8(name);
  if (out.byteLength < DEVICE_NAME_PLAIN) return out;
  let text = "";
  for (const ch of name) {
    if (utf8(text + ch).byteLength >= DEVICE_NAME_PLAIN) break;
    text += ch;
  }
  out = utf8(text);
  return out;
}

/** A device's name sealed with the record key: always 128 bytes (section 3.4). */
export async function sealDeviceName(keys: SyncKeys, device: string, name: string): Promise<Bytes> {
  const sealed = await seal(keys.recordKey, deviceNameAad(keys.account, device), padTo(nameBytes(name), DEVICE_NAME_PLAIN));
  if (sealed.byteLength !== DEVICE_NAME_BYTES) throw new Error("bad-name-size");
  return sealed;
}

export async function openDeviceName(keys: SyncKeys, device: string, sealed: Uint8Array): Promise<string> {
  return new TextDecoder().decode(unpad(await unseal(keys.recordKey, deviceNameAad(keys.account, device), sealed)));
}

/* ------------------------------------------------------------ ways in */

/** The associated data a way in's wrap is sealed with (section 3.5). */
export function wrapAad(account: string, kind: WayKind, credentialId?: string): Bytes {
  return utf8(`${LABEL}/wrap/${account}/${kind}${kind === "passkey" ? `/${credentialId}` : ""}`);
}

/** The data key (32 raw bytes) sealed under a way in's key-encryption key: 60 bytes. */
export async function wrapDataKey(dataKey: Uint8Array, kek: CryptoKey, aad: Uint8Array): Promise<Bytes> {
  if (dataKey.byteLength !== 32) throw new Error("bad-data-key");
  return await seal(kek, aad, dataKey);
}

/** The data key back from a wrap; throws when this kek did not make it. */
export async function unwrapDataKey(wrap: Uint8Array, kek: CryptoKey, aad: Uint8Array): Promise<Bytes> {
  const key = await unseal(kek, aad, wrap);
  if (key.byteLength !== 32) throw new Error("bad-data-key");
  return key;
}

export type ArgonSettings = { m: number; t: number; p: number };

/**
 * The passphrase's two keys for an account (sections 3.5 and 3.6): Argon2id with the account's salt
 * and settings, then HKDF with the account id: the authentication key the server checks, and the
 * key-encryption key the server never sees.
 */
export async function passphraseSecrets(
  passphrase: string,
  account: string,
  salt: Uint8Array,
  settings: ArgonSettings = ARGON_DEFAULT,
): Promise<{ authKey: Bytes; kek: CryptoKey }> {
  const master = await argon2idAsync(utf8(normalizePassphrase(passphrase)), own(salt), { ...settings, dkLen: 32 });
  try {
    const accountBytes = idBytes(account);
    return {
      authKey: await hkdfBytes(master, accountBytes, utf8(`${LABEL}/passphrase/auth`), 32),
      kek: await hkdfAes(master, accountBytes, utf8(`${LABEL}/passphrase/wrap`)),
    };
  } finally {
    master.fill(0);
  }
}

/** The recovery code's lookup (finds the account) and authentication key: from the code alone. */
export async function recoverySecrets(code: string): Promise<{ lookup: Bytes; authKey: Bytes }> {
  const ikm = utf8(code);
  const none = new Uint8Array(0);
  return {
    lookup: await hkdfBytes(ikm, none, utf8(`${LABEL}/recovery/lookup`), 16),
    authKey: await hkdfBytes(ikm, none, utf8(`${LABEL}/recovery/auth`), 32),
  };
}

export async function recoveryKek(code: string, account: string): Promise<CryptoKey> {
  return await hkdfAes(utf8(code), idBytes(account), utf8(`${LABEL}/recovery/wrap`));
}

/** A passkey's key-encryption key, from its PRF output for the fixed salt. */
export async function passkeyKek(prf: Uint8Array, account: string, credentialId: string): Promise<CryptoKey> {
  return await hkdfAes(prf, idBytes(account), utf8(`${LABEL}/passkey/wrap/${credentialId}`));
}

/* ------------------------------------------------------------ device keys */

/** A device's own key pair (section 3.7): the private half cannot be read out of the browser. */
export async function newDeviceKey(): Promise<{ privateKey: CryptoKey; publicKey: Bytes }> {
  const pair = (await crypto.subtle.generateKey(P256_ECDSA, false, ["sign", "verify"])) as CryptoKeyPair;
  return { privateKey: pair.privateKey, publicKey: new Uint8Array(await crypto.subtle.exportKey("spki", pair.publicKey)) };
}

/** What a device key signs: a context, a zero byte, the token. */
export function deviceMessage(context: "renew" | "link-take", token: string): Bytes {
  const bytes = fromB64u(token);
  if (!bytes) throw new Error("bad-token");
  return concat(utf8(`${LABEL}/${context}`), new Uint8Array([0]), bytes);
}

/** A device key's signature (IEEE P1363, 64 bytes, base64url) over a challenge or a link. */
export async function signWithDevice(privateKey: CryptoKey, context: "renew" | "link-take", token: string): Promise<string> {
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, privateKey, deviceMessage(context, token));
  return b64u(new Uint8Array(sig));
}

/* ------------------------------------------------------------ device links */

/** An ephemeral ECDH key for one device link; `epk` is its public half, 65 bytes uncompressed. */
export async function newLinkKey(): Promise<{ privateKey: CryptoKey; epk: Bytes }> {
  const pair = (await crypto.subtle.generateKey(P256_ECDH, false, ["deriveBits"])) as CryptoKeyPair;
  return { privateKey: pair.privateKey, epk: new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey)) };
}

/** The link's id: the 16-byte nonce inside its token (bytes 2 to 17). */
export function linkIdOf(link: string): Bytes {
  const bytes = fromB64u(link);
  if (!bytes || bytes.byteLength < 18) throw new Error("bad-link");
  return own(bytes.subarray(2, 18));
}

/** What the QR code carries: the link and the opener's epk, as one base64url text (section 8). */
export function linkQr(link: string, epk: Uint8Array): string {
  const bytes = fromB64u(link);
  if (!bytes) throw new Error("bad-link");
  return b64u(concat(bytes, epk));
}

/** The link and the opener's epk back from a QR code's text; null when it is not one. */
export function readLinkQr(text: string): { link: string; epk: Bytes } | null {
  const bytes = fromB64u(text);
  if (!bytes || bytes.byteLength <= 65) return null;
  const epk = own(bytes.subarray(bytes.byteLength - 65));
  if (epk[0] !== 4) return null;
  return { link: b64u(bytes.subarray(0, bytes.byteLength - 65)), epk };
}

/**
 * The six-digit code both screens show, and the key the data key is sealed with (section 8), from
 * this side's private key and the other side's epk. `giverEpk` and `takerEpk` as each side knows them:
 * if the server put its own key in between, the two sides' codes differ.
 */
export async function linkSecrets(
  privateKey: CryptoKey,
  peerEpk: Uint8Array,
  link: string,
  giverEpk: Uint8Array,
  takerEpk: Uint8Array,
): Promise<{ code: string; key: CryptoKey }> {
  const peer = await crypto.subtle.importKey("raw", own(peerEpk), P256_ECDH, false, []);
  const z = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: peer }, privateKey, 256));
  try {
    const salt = linkIdOf(link);
    const transcript = concat(giverEpk, takerEpk);
    const four = await hkdfBytes(z, salt, concat(utf8(`${LABEL}/link/code`), transcript), 4);
    const n = new DataView(four.buffer).getUint32(0, false) % 1_000_000;
    const digits = String(n).padStart(6, "0");
    const key = await hkdfAes(z, salt, concat(utf8(`${LABEL}/link/key`), transcript));
    return { code: `${digits.slice(0, 3)} ${digits.slice(3)}`, key };
  } finally {
    z.fill(0);
  }
}

function linkAad(link: string): Bytes {
  return utf8(`${LABEL}/link/${b64u(linkIdOf(link))}`);
}

/** What the giver sends: the account and the data key, sealed for the taker. */
export type LinkPayload = { v: 1; account: string; key: string };

export async function sealLinkPayload(key: CryptoKey, link: string, payload: LinkPayload): Promise<Bytes> {
  return await seal(key, linkAad(link), utf8(JSON.stringify(payload)));
}

export async function openLinkPayload(key: CryptoKey, link: string, sealed: Uint8Array): Promise<LinkPayload> {
  const value = JSON.parse(new TextDecoder().decode(await unseal(key, linkAad(link), sealed))) as LinkPayload;
  if (!value || value.v !== 1 || typeof value.account !== "string" || typeof value.key !== "string") throw new Error("bad-payload");
  return value;
}
