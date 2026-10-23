/*
 * A small, strict CBOR reader (RFC 8949) for what WebAuthn sends the server: the attestation object
 * and the credential's public key (COSE). Only what those use: unsigned and negative integers, byte
 * and text strings, arrays and maps of definite length, false, true and null. Indefinite lengths,
 * tags, floats and anything deeper than 8 levels are refused, so no input can make it work long.
 * Part of the synced account's server (docs/sync-protocol.md, section 4.2; share and compare plan,
 * feature 4).
 */

export type Cbor = number | Uint8Array | string | boolean | null | Cbor[] | CborMap;
/** Maps keep their keys' kinds apart (COSE uses 1 and -1; the attestation object uses text). */
export type CborMap = Map<number | string, Cbor>;

export class CborError extends Error {
  constructor(why: string) {
    super(`cbor: ${why}`);
    this.name = "CborError";
  }
}

const MAX_DEPTH = 8;
const MAX_ITEMS = 1024;

/** One CBOR item at `start`; returns it and where it ends. */
export function readCbor(bytes: Uint8Array, start = 0): { value: Cbor; end: number } {
  let at = start;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  const need = (n: number) => {
    if (at + n > bytes.byteLength) throw new CborError("truncated");
  };

  const length = (info: number): number => {
    if (info < 24) return info;
    if (info === 24) {
      need(1);
      return bytes[at++];
    }
    if (info === 25) {
      need(2);
      const v = view.getUint16(at);
      at += 2;
      return v;
    }
    if (info === 26) {
      need(4);
      const v = view.getUint32(at);
      at += 4;
      return v;
    }
    if (info === 27) {
      need(8);
      const v = view.getBigUint64(at);
      at += 8;
      if (v > BigInt(Number.MAX_SAFE_INTEGER)) throw new CborError("too large");
      return Number(v);
    }
    throw new CborError("indefinite or reserved length");
  };

  const item = (depth: number): Cbor => {
    if (depth > MAX_DEPTH) throw new CborError("too deep");
    need(1);
    const head = bytes[at++];
    const major = head >> 5;
    const info = head & 31;
    switch (major) {
      case 0:
        return length(info);
      case 1:
        return -1 - length(info);
      case 2: {
        const n = length(info);
        need(n);
        const out = bytes.slice(at, at + n);
        at += n;
        return out;
      }
      case 3: {
        const n = length(info);
        need(n);
        const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(at, at + n));
        at += n;
        return text;
      }
      case 4: {
        const n = length(info);
        if (n > MAX_ITEMS) throw new CborError("too many items");
        const out: Cbor[] = [];
        for (let i = 0; i < n; i += 1) out.push(item(depth + 1));
        return out;
      }
      case 5: {
        const n = length(info);
        if (n > MAX_ITEMS) throw new CborError("too many items");
        const out: CborMap = new Map();
        for (let i = 0; i < n; i += 1) {
          const key = item(depth + 1);
          if (typeof key !== "number" && typeof key !== "string") throw new CborError("map key");
          if (out.has(key)) throw new CborError("repeated key");
          out.set(key, item(depth + 1));
        }
        return out;
      }
      case 7:
        if (info === 20) return false;
        if (info === 21) return true;
        if (info === 22) return null;
        throw new CborError("unsupported simple value");
      default:
        throw new CborError("tags are not accepted");
    }
  };

  const value = item(0);
  return { value, end: at };
}

/** A whole buffer that is exactly one CBOR item. */
export function decodeCbor(bytes: Uint8Array): Cbor {
  const { value, end } = readCbor(bytes, 0);
  if (end !== bytes.byteLength) throw new CborError("trailing bytes");
  return value;
}
