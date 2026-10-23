/*
 * Bytes for the synced account's protocol (docs/sync-protocol.md, section 2; share and compare
 * plan, feature 4): base64url without padding, read strictly (a text that is not the canonical
 * encoding of its bytes is refused, so one value has one spelling), hex for the database, UTF-8.
 * Shared by the server and the device side; no imports.
 */

const B64U = /^[A-Za-z0-9_-]*$/;

/** A copy backed by its own ArrayBuffer, as WebCrypto's typings want. */
export function own(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(new ArrayBuffer(bytes.byteLength));
  out.set(bytes);
  return out;
}

export function randomBytes(n: number): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(new ArrayBuffer(n));
  // getRandomValues fills at most 65 536 bytes at a time.
  for (let at = 0; at < n; at += 65_536) crypto.getRandomValues(out.subarray(at, Math.min(n, at + 65_536)));
  return out;
}

export function utf8(text: string): Uint8Array<ArrayBuffer> {
  return own(new TextEncoder().encode(text));
}

export function concat(...parts: readonly Uint8Array[]): Uint8Array<ArrayBuffer> {
  let size = 0;
  for (const p of parts) size += p.byteLength;
  const out = new Uint8Array(new ArrayBuffer(size));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.byteLength;
  }
  return out;
}

/** Equal bytes (not in constant time: for what is public). */
export function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  for (let i = 0; i < a.byteLength; i += 1) if (a[i] !== b[i]) return false;
  return true;
}

export function b64u(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.byteLength; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** The bytes of a base64url text (no padding), or null when it is not the canonical encoding of any. */
export function fromB64u(text: string): Uint8Array<ArrayBuffer> | null {
  if (typeof text !== "string" || !B64U.test(text) || text.length % 4 === 1) return null;
  let bin: string;
  try {
    const b64 = text.replace(/-/g, "+").replace(/_/g, "/");
    bin = atob(b64 + "===".slice((b64.length + 3) % 4));
  } catch {
    return null;
  }
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  // Spare bits in the last character make other spellings of the same bytes: only one is accepted.
  return b64u(out) === text ? out : null;
}

const HEX = "0123456789abcdef";

export function hex(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.byteLength; i += 1) out += HEX[bytes[i] >> 4] + HEX[bytes[i] & 15];
  return out;
}

/** The bytes of a hex text (either case), or null. */
export function fromHex(text: string): Uint8Array<ArrayBuffer> | null {
  if (typeof text !== "string" || text.length % 2 || !/^[0-9a-fA-F]*$/.test(text)) return null;
  const out = new Uint8Array(new ArrayBuffer(text.length / 2));
  for (let i = 0; i < out.length; i += 1) out[i] = parseInt(text.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/** An unsigned 32-bit number, big-endian. */
export function u32(n: number): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(new ArrayBuffer(4));
  new DataView(out.buffer).setUint32(0, n >>> 0, false);
  return out;
}

export function readU32(bytes: Uint8Array, at: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(at, false);
}
