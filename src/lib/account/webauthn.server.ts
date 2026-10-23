import { decodeCbor, readCbor, type Cbor, type CborMap } from "./cbor.server";
import { b64u, concat, fromB64u, own, sameBytes, utf8 } from "./encoding";
import { SIZES } from "./protocol";

/*
 * Passkeys checked on the server with WebCrypto alone (docs/sync-protocol.md, section 4.2; share
 * and compare plan, feature 4): a registration's attestation (format "none" only, see the protocol
 * for why), the credential's public key (COSE) kept as SPKI, and an assertion's signature (ES256,
 * RS256, EdDSA), with the origin, the RP id, the flags and the counter. The challenge is the
 * caller's: this returns its bytes, and the caller checks it is one it signed and spends it.
 */

/** COSE algorithms accepted: ES256 (P-256), EdDSA (Ed25519), RS256 (RSA 2048 to 4096 bits). */
export type CoseAlg = -7 | -8 | -257;
export const COSE_ALGS: readonly CoseAlg[] = [-7, -8, -257];

/** Why a passkey was refused (the client only ever hears "denied"). */
export class WebAuthnError extends Error {
  constructor(why: string) {
    super(`webauthn: ${why}`);
    this.name = "WebAuthnError";
  }
}

const FLAG_UP = 0x01;
const FLAG_UV = 0x04;
const FLAG_BE = 0x08;
const FLAG_BS = 0x10;
const FLAG_AT = 0x40;
const FLAG_ED = 0x80;

type Bytes = Uint8Array<ArrayBuffer>;

/** clientDataJSON read and checked: its type, its origin (one of Ulune's) and not from a frame of another site. */
export function readClientData(bytes: Uint8Array, type: "webauthn.create" | "webauthn.get", origins: readonly string[]): { challenge: Bytes; origin: string } {
  let data: { type?: unknown; challenge?: unknown; origin?: unknown; crossOrigin?: unknown; topOrigin?: unknown };
  try {
    data = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new WebAuthnError("client data is not JSON");
  }
  if (!data || typeof data !== "object") throw new WebAuthnError("client data");
  if (data.type !== type) throw new WebAuthnError("type");
  if (typeof data.origin !== "string" || !origins.includes(data.origin)) throw new WebAuthnError("origin");
  if (data.crossOrigin === true || data.topOrigin !== undefined) throw new WebAuthnError("cross-origin");
  const challenge = typeof data.challenge === "string" ? fromB64u(data.challenge) : null;
  if (!challenge || challenge.byteLength < 16) throw new WebAuthnError("challenge");
  return { challenge, origin: data.origin };
}

export type AuthData = {
  rpIdHash: Bytes;
  flags: number;
  counter: number;
  credentialId?: Bytes;
  cose?: CborMap;
};

/** The authenticator data's parts; nothing may be left over. */
export function readAuthData(bytes: Uint8Array): AuthData {
  if (bytes.byteLength < 37) throw new WebAuthnError("authenticator data too short");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out: AuthData = { rpIdHash: own(bytes.subarray(0, 32)), flags: bytes[32], counter: view.getUint32(33, false) };
  let at = 37;
  try {
    if (out.flags & FLAG_AT) {
      if (bytes.byteLength < at + 18) throw new WebAuthnError("attested data too short");
      const idLength = view.getUint16(at + 16, false);
      at += 18;
      if (idLength < 1 || idLength > SIZES.credentialId || at + idLength > bytes.byteLength) throw new WebAuthnError("credential id");
      out.credentialId = own(bytes.subarray(at, at + idLength));
      at += idLength;
      const key = readCbor(bytes, at);
      if (!(key.value instanceof Map)) throw new WebAuthnError("public key");
      out.cose = key.value;
      at = key.end;
    }
    if (out.flags & FLAG_ED) {
      const ext = readCbor(bytes, at);
      if (!(ext.value instanceof Map)) throw new WebAuthnError("extensions");
      at = ext.end;
    }
  } catch (err) {
    if (err instanceof WebAuthnError) throw err;
    throw new WebAuthnError("authenticator data");
  }
  if (at !== bytes.byteLength) throw new WebAuthnError("trailing bytes");
  return out;
}

async function sha256(bytes: Uint8Array): Promise<Bytes> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", own(bytes)));
}

function bytesAt(map: CborMap, key: number, size?: number): Bytes {
  const v = map.get(key);
  if (!(v instanceof Uint8Array) || (size !== undefined && v.byteLength !== size)) throw new WebAuthnError(`cose ${key}`);
  return own(v);
}

/** A COSE public key as SPKI, with its algorithm; anything but ES256, EdDSA and RS256 is refused. */
export async function coseToSpki(cose: CborMap): Promise<{ spki: Bytes; alg: CoseAlg }> {
  const kty = cose.get(1);
  const alg = cose.get(3) as Cbor;
  try {
    if (kty === 2 && alg === -7) {
      if (cose.get(-1) !== 1) throw new WebAuthnError("curve");
      const jwk = { kty: "EC", crv: "P-256", x: b64u(bytesAt(cose, -2, 32)), y: b64u(bytesAt(cose, -3, 32)), ext: true };
      const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, true, ["verify"]);
      return { spki: new Uint8Array(await crypto.subtle.exportKey("spki", key)), alg: -7 };
    }
    if (kty === 1 && alg === -8) {
      if (cose.get(-1) !== 6) throw new WebAuthnError("curve");
      const jwk = { kty: "OKP", crv: "Ed25519", x: b64u(bytesAt(cose, -2, 32)), ext: true };
      const key = await crypto.subtle.importKey("jwk", jwk, { name: "Ed25519" }, true, ["verify"]);
      return { spki: new Uint8Array(await crypto.subtle.exportKey("spki", key)), alg: -8 };
    }
    if (kty === 3 && alg === -257) {
      const n = bytesAt(cose, -1);
      const e = bytesAt(cose, -2);
      const bits = (n.byteLength - (n[0] === 0 ? 1 : 0)) * 8;
      if (bits < 2048 || bits > 4096 || e.byteLength > 8) throw new WebAuthnError("rsa size");
      const jwk = { kty: "RSA", n: b64u(n[0] === 0 ? n.subarray(1) : n), e: b64u(e), ext: true };
      const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, true, ["verify"]);
      return { spki: new Uint8Array(await crypto.subtle.exportKey("spki", key)), alg: -257 };
    }
  } catch (err) {
    if (err instanceof WebAuthnError) throw err;
    throw new WebAuthnError("public key does not import");
  }
  throw new WebAuthnError("algorithm");
}

async function verifyKey(spki: Uint8Array, alg: CoseAlg): Promise<CryptoKey> {
  if (alg === -7) return await crypto.subtle.importKey("spki", own(spki), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  if (alg === -8) return await crypto.subtle.importKey("spki", own(spki), { name: "Ed25519" }, false, ["verify"]);
  return await crypto.subtle.importKey("spki", own(spki), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
}

/** An ECDSA signature in DER (as WebAuthn sends ES256) as r ‖ s, 32 bytes each (as WebCrypto checks it). */
export function derToP1363(der: Uint8Array): Bytes {
  const fail = () => {
    throw new WebAuthnError("signature encoding");
  };
  if (der.byteLength < 8 || der[0] !== 0x30 || der[1] !== der.byteLength - 2 || der[1] > 0x7f) fail();
  const out = new Uint8Array(new ArrayBuffer(64));
  let at = 2;
  for (let part = 0; part < 2; part += 1) {
    if (der[at] !== 0x02) fail();
    const len = der[at + 1];
    if (len < 1 || len > 33 || at + 2 + len > der.byteLength) fail();
    let value = der.subarray(at + 2, at + 2 + len);
    if (value[0] & 0x80) fail();
    while (value.byteLength > 1 && value[0] === 0) value = value.subarray(1);
    if (value.byteLength > 32) fail();
    out.set(value, part * 32 + 32 - value.byteLength);
    at += 2 + len;
  }
  if (at !== der.byteLength) fail();
  return out;
}

/** A passkey's signature over `data`, by its stored key. */
export async function verifyPasskeySignature(spki: Uint8Array, alg: CoseAlg, data: Uint8Array, signature: Uint8Array): Promise<boolean> {
  let key: CryptoKey;
  try {
    key = await verifyKey(spki, alg);
  } catch {
    return false;
  }
  try {
    if (alg === -7) return await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, derToP1363(signature), own(data));
    if (alg === -8) return await crypto.subtle.verify({ name: "Ed25519" }, key, own(signature), own(data));
    return await crypto.subtle.verify({ name: "RSASSA-PKCS1-v1_5" }, key, own(signature), own(data));
  } catch {
    return false;
  }
}

/** The RP id a page at `origin` uses: its host name. */
export function rpIdOf(origin: string): string {
  return new URL(origin).hostname;
}

export type Registration = {
  challenge: Bytes;
  origin: string;
  credentialId: Bytes;
  publicKey: Bytes;
  alg: CoseAlg;
  counter: number;
  /** The authenticator says the passkey may be synced (BE) and is (BS): for the reader's list, never required. */
  backedUp: boolean;
};

/**
 * A new passkey checked (section 4.2): client data (webauthn.create, an origin of Ulune's), the
 * attestation object (format "none", an empty statement), the authenticator data (RP id, user
 * present and verified, an attested credential, nothing left over) and its public key.
 */
export async function verifyRegistration(input: {
  clientDataJSON: Uint8Array;
  attestationObject: Uint8Array;
  origins: readonly string[];
}): Promise<Registration> {
  const { challenge, origin } = readClientData(input.clientDataJSON, "webauthn.create", input.origins);
  let att: Cbor;
  try {
    att = decodeCbor(input.attestationObject);
  } catch {
    throw new WebAuthnError("attestation object");
  }
  if (!(att instanceof Map)) throw new WebAuthnError("attestation object");
  // Format "none" only, with an empty statement: no make, model or certificate is asked for or kept.
  if (att.get("fmt") !== "none") throw new WebAuthnError("attestation format");
  const stmt = att.get("attStmt");
  if (!(stmt instanceof Map) || stmt.size !== 0) throw new WebAuthnError("attestation statement");
  const raw = att.get("authData");
  if (!(raw instanceof Uint8Array)) throw new WebAuthnError("authenticator data");
  const data = readAuthData(raw);
  if (!sameBytes(data.rpIdHash, await sha256(utf8(rpIdOf(origin))))) throw new WebAuthnError("rp id");
  if (!(data.flags & FLAG_UP) || !(data.flags & FLAG_UV)) throw new WebAuthnError("user not verified");
  if (!(data.flags & FLAG_AT) || !data.credentialId || !data.cose) throw new WebAuthnError("no credential");
  const { spki, alg } = await coseToSpki(data.cose);
  return {
    challenge,
    origin,
    credentialId: data.credentialId,
    publicKey: spki,
    alg,
    counter: data.counter,
    backedUp: Boolean(data.flags & FLAG_BE && data.flags & FLAG_BS),
  };
}

/**
 * A sign-in checked (section 4.2): client data (webauthn.get, an origin of Ulune's), the
 * authenticator data (RP id, user present and verified, no attested credential), the signature over
 * authenticatorData ‖ SHA-256(clientDataJSON), and the counter (if either the stored or the new one is
 * not zero, the new one must be greater).
 */
export async function verifyAssertion(input: {
  clientDataJSON: Uint8Array;
  authenticatorData: Uint8Array;
  signature: Uint8Array;
  origins: readonly string[];
  publicKey: Uint8Array;
  alg: CoseAlg;
  storedCounter: number;
}): Promise<{ challenge: Bytes; origin: string; counter: number }> {
  const { challenge, origin } = readClientData(input.clientDataJSON, "webauthn.get", input.origins);
  const data = readAuthData(input.authenticatorData);
  if (data.flags & FLAG_AT) throw new WebAuthnError("attested data in an assertion");
  if (!sameBytes(data.rpIdHash, await sha256(utf8(rpIdOf(origin))))) throw new WebAuthnError("rp id");
  if (!(data.flags & FLAG_UP) || !(data.flags & FLAG_UV)) throw new WebAuthnError("user not verified");
  const signed = concat(input.authenticatorData, await sha256(input.clientDataJSON));
  if (!(await verifyPasskeySignature(input.publicKey, input.alg, signed, input.signature))) throw new WebAuthnError("signature");
  if ((input.storedCounter > 0 || data.counter > 0) && data.counter <= input.storedCounter) throw new WebAuthnError("counter");
  return { challenge, origin, counter: data.counter };
}
