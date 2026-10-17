/*
 * Bytes for the share link (share plan, feature 1): base64url both ways,
 * strictly (a character outside the alphabet, or a length no encoding gives,
 * is refused rather than guessed at), and a reader and a writer for the
 * link's packed fields. Its own small file so the share sheet and the /s
 * page carry none of the private space's code (lib/space/crypto.ts brings
 * Argon2 with it).
 */

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const INDEX = new Map([...B64].map((c, i) => [c, i]));

export function toB64u(bytes: Uint8Array): string {
  let out = "";
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += B64[n >> 18] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + B64[n & 63];
  }
  const rest = bytes.length - i;
  if (rest === 1) {
    const n = bytes[i] << 16;
    out += B64[n >> 18] + B64[(n >> 12) & 63];
  } else if (rest === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out += B64[n >> 18] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63];
  }
  return out;
}

/** The bytes of a base64url text without padding, or null when it is not one (a stray character, a length no encoding gives, stray low bits). */
export function fromB64u(text: string): Uint8Array<ArrayBuffer> | null {
  if (text.length % 4 === 1) return null;
  const out = new Uint8Array(new ArrayBuffer(Math.floor((text.length * 3) / 4)));
  let acc = 0;
  let bits = 0;
  let o = 0;
  for (const c of text) {
    const v = INDEX.get(c);
    if (v === undefined) return null;
    acc = (acc << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = (acc >> bits) & 0xff;
      acc &= (1 << bits) - 1;
    }
  }
  // What is left over must be the zero bits an encoder pads with.
  if (acc !== 0) return null;
  return out;
}

const enc = new TextEncoder();

export function utf8(text: string): Uint8Array<ArrayBuffer> {
  const bytes = enc.encode(text);
  const out = new Uint8Array(new ArrayBuffer(bytes.length));
  out.set(bytes);
  return out;
}

/** UTF-8 read strictly: a malformed sequence throws. */
export function fromUtf8(bytes: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

/** A malformed or out-of-range link; `reason` says which check refused it (tests and the /s page read it). */
export class ShareLinkError extends Error {
  readonly reason: string;
  constructor(reason: string) {
    super(`share-link:${reason}`);
    this.name = "ShareLinkError";
    this.reason = reason;
  }
}

export class ByteWriter {
  private buf: number[] = [];

  u8(v: number): void {
    this.buf.push(v & 0xff);
  }

  u16(v: number): void {
    this.buf.push((v >>> 8) & 0xff, v & 0xff);
  }

  i32(v: number): void {
    const u = v >>> 0;
    this.buf.push(u >>> 24, (u >>> 16) & 0xff, (u >>> 8) & 0xff, u & 0xff);
  }

  bytes(b: Uint8Array): void {
    for (const x of b) this.buf.push(x);
  }

  /** A short text: its UTF-8 length in one byte, then its bytes (at most 255). */
  text(s: string): void {
    const b = utf8(s);
    if (b.length > 255) throw new ShareLinkError("text-long");
    this.u8(b.length);
    this.bytes(b);
  }

  done(): Uint8Array<ArrayBuffer> {
    const out = new Uint8Array(new ArrayBuffer(this.buf.length));
    out.set(this.buf);
    return out;
  }
}

export class ByteReader {
  private at = 0;
  private readonly b: Uint8Array;

  constructor(bytes: Uint8Array) {
    this.b = bytes;
  }

  private need(n: number): void {
    if (this.at + n > this.b.length) throw new ShareLinkError("short");
  }

  u8(): number {
    this.need(1);
    return this.b[this.at++];
  }

  u16(): number {
    this.need(2);
    const v = (this.b[this.at] << 8) | this.b[this.at + 1];
    this.at += 2;
    return v;
  }

  i32(): number {
    this.need(4);
    const v = (this.b[this.at] << 24) | (this.b[this.at + 1] << 16) | (this.b[this.at + 2] << 8) | this.b[this.at + 3];
    this.at += 4;
    return v | 0;
  }

  bytes(n: number): Uint8Array {
    this.need(n);
    const out = this.b.subarray(this.at, this.at + n);
    this.at += n;
    return out;
  }

  text(): string {
    const n = this.u8();
    try {
      return fromUtf8(this.bytes(n));
    } catch (err) {
      if (err instanceof ShareLinkError) throw err;
      throw new ShareLinkError("utf8");
    }
  }

  /** Every byte was read: a link with bytes to spare is refused. */
  end(): void {
    if (this.at !== this.b.length) throw new ShareLinkError("trailing");
  }
}
