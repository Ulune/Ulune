/*
 * Ulune's own QR code encoder (share plan, idea B1): the share link as a
 * code someone next to you scans, so nobody types or reads birth data aloud.
 * No dependency: byte mode (UTF-8) and, for the standard's worked example,
 * numeric mode; the four error-correction levels, every version from 1 to
 * 40, Reed–Solomon over GF(256), the eight masks scored by the standard's
 * four penalty rules (ISO/IEC 18004, as in Project Nayuki's reference
 * implementation). The share sheet asks for level M, which a link of one or
 * two charts fits around versions 7 to 12, and draws it as one SVG path
 * (qrPath), always dark on light, with a quiet zone of four modules.
 * scripts/qr.test.mjs checks it against the standard's worked example and
 * against codes made by an independent encoder.
 */

export type QrEcl = "L" | "M" | "Q" | "H";

export type Qr = {
  version: number;
  size: number;
  ecl: QrEcl;
  mask: number;
  /** size × size, row by row: 1 for a dark module. */
  modules: Uint8Array;
};

const ECL_INDEX: Record<QrEcl, number> = { L: 0, M: 1, Q: 2, H: 3 };
/** The two bits the format information gives each level. */
const ECL_BITS: Record<QrEcl, number> = { L: 1, M: 0, Q: 3, H: 2 };

/* The standard's table 9, by level then version (index 0 unused). */
const ECC_PER_BLOCK = [
  [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
];
const BLOCKS = [
  [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
];

/** Modules left for data and error correction once the function patterns are drawn. */
function rawModules(ver: number): number {
  let n = (16 * ver + 128) * ver + 64;
  if (ver >= 2) {
    const align = Math.floor(ver / 7) + 2;
    n -= (25 * align - 10) * align - 55;
    if (ver >= 7) n -= 36;
  }
  return n;
}

export function dataCodewords(ver: number, ecl: QrEcl): number {
  const e = ECL_INDEX[ecl];
  return Math.floor(rawModules(ver) / 8) - ECC_PER_BLOCK[e][ver] * BLOCKS[e][ver];
}

/** How a version and level split their codewords: the blocks, each block's error-correction codewords, every codeword. */
export function qrBlocks(ver: number, ecl: QrEcl): { blocks: number; ecc: number; total: number } {
  const e = ECL_INDEX[ecl];
  return { blocks: BLOCKS[e][ver], ecc: ECC_PER_BLOCK[e][ver], total: Math.floor(rawModules(ver) / 8) };
}

/* ---------------------------------------------------- Reed–Solomon over GF(256), x^8 + x^4 + x^3 + x^2 + 1 */

function gfMul(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
}

function rsDivisor(degree: number): Uint8Array {
  const out = new Uint8Array(degree);
  out[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      out[j] = gfMul(out[j], root);
      if (j + 1 < degree) out[j] ^= out[j + 1];
    }
    root = gfMul(root, 0x02);
  }
  return out;
}

/** The `degree` error-correction codewords of a block of data codewords. */
export function rsRemainder(data: ArrayLike<number>, degree: number): Uint8Array {
  const divisor = rsDivisor(degree);
  const out = new Uint8Array(degree);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ out[0];
    out.copyWithin(0, 1);
    out[degree - 1] = 0;
    for (let j = 0; j < degree; j++) out[j] ^= gfMul(divisor[j], factor);
  }
  return out;
}

/* ---------------------------------------------------- the data's bits */

class Bits {
  readonly bits: number[] = [];
  put(value: number, length: number): void {
    for (let i = length - 1; i >= 0; i--) this.bits.push((value >>> i) & 1);
  }
}

type Segment = { mode: "byte" | "numeric"; count: number; write: (b: Bits) => void };

function byteSegment(bytes: Uint8Array): Segment {
  return { mode: "byte", count: bytes.length, write: (b) => bytes.forEach((x) => b.put(x, 8)) };
}

function numericSegment(digits: string): Segment {
  if (!/^\d*$/.test(digits)) throw new Error("qr-numeric");
  return {
    mode: "numeric",
    count: digits.length,
    write: (b) => {
      for (let i = 0; i < digits.length; i += 3) {
        const chunk = digits.slice(i, i + 3);
        b.put(Number(chunk), chunk.length * 3 + 1);
      }
    },
  };
}

function countBits(mode: Segment["mode"], ver: number): number {
  const band = ver <= 9 ? 0 : ver <= 26 ? 1 : 2;
  return mode === "byte" ? [8, 16, 16][band] : [10, 12, 14][band];
}

function segmentBits(seg: Segment, ver: number): number {
  const payload = seg.mode === "byte" ? seg.count * 8 : Math.floor(seg.count / 3) * 10 + [0, 4, 7][seg.count % 3];
  return 4 + countBits(seg.mode, ver) + payload;
}

/** The data codewords for a segment at a version and level: mode, count, data, terminator, padding. */
function dataFor(seg: Segment, ver: number, ecl: QrEcl): Uint8Array {
  const capacity = dataCodewords(ver, ecl) * 8;
  const b = new Bits();
  b.put(seg.mode === "byte" ? 4 : 1, 4);
  b.put(seg.count, countBits(seg.mode, ver));
  seg.write(b);
  b.put(0, Math.min(4, capacity - b.bits.length));
  b.put(0, (8 - (b.bits.length % 8)) % 8);
  for (let pad = 0xec; b.bits.length < capacity; pad ^= 0xec ^ 0x11) b.put(pad, 8);
  const out = new Uint8Array(b.bits.length / 8);
  b.bits.forEach((bit, i) => (out[i >>> 3] |= bit << (7 - (i & 7))));
  return out;
}

/** Error correction added block by block, then the blocks interleaved (the standard's 7.6). */
function withCorrection(data: Uint8Array, ver: number, ecl: QrEcl): Uint8Array {
  const e = ECL_INDEX[ecl];
  const blocks = BLOCKS[e][ver];
  const eccLen = ECC_PER_BLOCK[e][ver];
  const raw = Math.floor(rawModules(ver) / 8);
  const shortBlocks = blocks - (raw % blocks);
  const shortLen = Math.floor(raw / blocks);
  const parts: { data: Uint8Array; ecc: Uint8Array }[] = [];
  for (let i = 0, at = 0; i < blocks; i++) {
    const len = shortLen - eccLen + (i < shortBlocks ? 0 : 1);
    const block = data.subarray(at, at + len);
    at += len;
    parts.push({ data: block, ecc: rsRemainder(block, eccLen) });
  }
  const out: number[] = [];
  const longest = shortLen - eccLen + 1;
  for (let i = 0; i < longest; i++) for (const p of parts) if (i < p.data.length) out.push(p.data[i]);
  for (let i = 0; i < eccLen; i++) for (const p of parts) out.push(p.ecc[i]);
  return Uint8Array.from(out);
}

/* ---------------------------------------------------- the symbol */

function alignmentPositions(ver: number, size: number): number[] {
  if (ver === 1) return [];
  const n = Math.floor(ver / 7) + 2;
  const step = Math.floor((ver * 8 + n * 3 + 5) / (n * 4 - 4)) * 2;
  const out = [6];
  for (let pos = size - 7; out.length < n; pos -= step) out.splice(1, 0, pos);
  return out;
}

class Matrix {
  readonly ver: number;
  readonly size: number;
  readonly dark: Uint8Array;
  readonly fixed: Uint8Array;

  constructor(ver: number) {
    this.ver = ver;
    this.size = ver * 4 + 17;
    this.dark = new Uint8Array(this.size * this.size);
    this.fixed = new Uint8Array(this.size * this.size);
    this.drawPatterns();
  }

  /** x is the column, y the row. */
  set(x: number, y: number, dark: boolean, fixed = true): void {
    this.dark[y * this.size + x] = dark ? 1 : 0;
    if (fixed) this.fixed[y * this.size + x] = 1;
  }

  private drawPatterns(): void {
    const n = this.size;
    for (let i = 0; i < n; i++) {
      this.set(6, i, i % 2 === 0);
      this.set(i, 6, i % 2 === 0);
    }
    for (const [cx, cy] of [
      [3, 3],
      [n - 4, 3],
      [3, n - 4],
    ]) {
      for (let dy = -4; dy <= 4; dy++) {
        for (let dx = -4; dx <= 4; dx++) {
          const x = cx + dx;
          const y = cy + dy;
          if (x < 0 || y < 0 || x >= n || y >= n) continue;
          const d = Math.max(Math.abs(dx), Math.abs(dy));
          this.set(x, y, d !== 2 && d !== 4);
        }
      }
    }
    const pos = alignmentPositions(this.ver, n);
    const last = pos.length - 1;
    for (let i = 0; i <= last; i++) {
      for (let j = 0; j <= last; j++) {
        // Not over the three finder patterns.
        if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) continue;
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) this.set(pos[i] + dx, pos[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      }
    }
    // Reserve the format areas now (drawn for real once the mask is chosen).
    this.drawFormat(0, "M");
    this.drawVersion();
  }

  drawFormat(mask: number, ecl: QrEcl): void {
    const n = this.size;
    const bits = formatBits(ecl, mask);
    const bit = (i: number) => ((bits >>> i) & 1) === 1;
    for (let i = 0; i <= 5; i++) this.set(8, i, bit(i));
    this.set(8, 7, bit(6));
    this.set(8, 8, bit(7));
    this.set(7, 8, bit(8));
    for (let i = 9; i < 15; i++) this.set(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) this.set(n - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) this.set(8, n - 15 + i, bit(i));
    this.set(8, n - 8, true);
  }

  private drawVersion(): void {
    if (this.ver < 7) return;
    const bits = versionBits(this.ver);
    for (let i = 0; i < 18; i++) {
      const dark = ((bits >>> i) & 1) === 1;
      const a = this.size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      this.set(a, b, dark);
      this.set(b, a, dark);
    }
  }

  /** The codewords in the standard's zigzag, right to left in two-module columns. */
  placeData(codewords: Uint8Array): void {
    const n = this.size;
    let i = 0;
    for (let right = n - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < n; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          const upward = ((right + 1) & 2) === 0;
          const y = upward ? n - 1 - vert : vert;
          if (this.fixed[y * n + x]) continue;
          const dark = i < codewords.length * 8 && ((codewords[i >>> 3] >>> (7 - (i & 7))) & 1) === 1;
          this.set(x, y, dark, false);
          i++;
        }
      }
    }
  }

  applyMask(mask: number): void {
    const n = this.size;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (this.fixed[y * n + x]) continue;
        if (maskHits(mask, x, y)) this.dark[y * n + x] ^= 1;
      }
    }
  }
}

export function formatBits(ecl: QrEcl, mask: number): number {
  const data = (ECL_BITS[ecl] << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  return ((data << 10) | rem) ^ 0x5412;
}

export function versionBits(ver: number): number {
  let rem = ver;
  for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
  return (ver << 12) | rem;
}

export function maskHits(mask: number, x: number, y: number): boolean {
  switch (mask) {
    case 0:
      return (x + y) % 2 === 0;
    case 1:
      return y % 2 === 0;
    case 2:
      return x % 3 === 0;
    case 3:
      return (x + y) % 3 === 0;
    case 4:
      return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
    case 5:
      return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6:
      return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    default:
      return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
  }
}

/* ---------------------------------------------------- the masks' penalties (the standard's 7.8.3) */

const N1 = 3;
const N2 = 3;
const N3 = 40;
const N4 = 10;

/** A run of `len` modules of one colour ended: the run history slides (the first run is padded with light, as the quiet zone is). */
function pushRun(len: number, history: number[], size: number): void {
  if (history[0] === 0) len += size;
  history.pop();
  history.unshift(len);
}

/** Finder-like patterns (1:1:3:1:1 with four light modules on a side) in the history. */
function finderLike(history: number[]): number {
  const n = history[1];
  const core = n > 0 && history[2] === n && history[3] === n * 3 && history[4] === n && history[5] === n;
  return (core && history[0] >= n * 4 && history[6] >= n ? 1 : 0) + (core && history[6] >= n * 4 && history[0] >= n ? 1 : 0);
}

function lineEnd(runColor: number, runLen: number, history: number[], size: number): number {
  if (runColor) {
    pushRun(runLen, history, size);
    runLen = 0;
  }
  runLen += size;
  pushRun(runLen, history, size);
  return finderLike(history);
}

export function penalty(dark: Uint8Array, size: number): number {
  let score = 0;
  for (const rows of [true, false]) {
    for (let a = 0; a < size; a++) {
      let color = 0;
      let run = 0;
      const history = [0, 0, 0, 0, 0, 0, 0];
      for (let b = 0; b < size; b++) {
        const v = rows ? dark[a * size + b] : dark[b * size + a];
        if (v === color) {
          run++;
          if (run === 5) score += N1;
          else if (run > 5) score++;
        } else {
          pushRun(run, history, size);
          if (!color) score += finderLike(history) * N3;
          color = v;
          run = 1;
        }
      }
      score += lineEnd(color, run, history, size) * N3;
    }
  }
  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const c = dark[y * size + x];
      if (c === dark[y * size + x + 1] && c === dark[(y + 1) * size + x] && c === dark[(y + 1) * size + x + 1]) score += N2;
    }
  }
  let darkCount = 0;
  for (const v of dark) darkCount += v;
  const total = size * size;
  score += (Math.ceil(Math.abs(darkCount * 20 - total * 10) / total) - 1) * N4;
  return score;
}

/* ---------------------------------------------------- encoding */

function encodeSegment(seg: Segment, opts: { ecl?: QrEcl; mask?: number; minVersion?: number }): Qr {
  const levels: QrEcl[] = opts.ecl ? [opts.ecl] : ["M", "L"];
  for (const ecl of levels) {
    for (let ver = Math.max(1, opts.minVersion ?? 1); ver <= 40; ver++) {
      if (seg.mode === "byte" && seg.count >= 1 << countBits("byte", ver)) continue;
      if (segmentBits(seg, ver) > dataCodewords(ver, ecl) * 8) continue;
      const codewords = withCorrection(dataFor(seg, ver, ecl), ver, ecl);
      const sym = new Matrix(ver);
      sym.placeData(codewords);
      let mask = opts.mask ?? -1;
      if (mask < 0) {
        let best = Infinity;
        for (let m = 0; m < 8; m++) {
          sym.applyMask(m);
          sym.drawFormat(m, ecl);
          const p = penalty(sym.dark, sym.size);
          if (p < best) {
            best = p;
            mask = m;
          }
          sym.applyMask(m);
        }
      }
      sym.applyMask(mask);
      sym.drawFormat(mask, ecl);
      return { version: ver, size: sym.size, ecl, mask, modules: sym.dark };
    }
  }
  throw new Error("qr-too-long");
}

/** The QR code of a text (byte mode, UTF-8), at level M by default (L when M cannot hold it), the smallest version that fits. */
export function encodeQr(text: string, opts: { ecl?: QrEcl; mask?: number; minVersion?: number } = {}): Qr {
  return encodeSegment(byteSegment(new TextEncoder().encode(text)), opts);
}

/** Digits in numeric mode (the standard's worked example, "01234567" at 1-M). */
export function encodeQrNumeric(digits: string, opts: { ecl?: QrEcl; mask?: number; minVersion?: number } = {}): Qr {
  return encodeSegment(numericSegment(digits), opts);
}

/**
 * The dark modules as one SVG path, a quiet zone of `border` modules around
 * them (viewBox 0 0 size+2·border): each row's runs of dark modules as
 * rectangles, so a version 10 code is a few hundred short commands.
 */
export function qrPath(qr: Qr, border = 4): string {
  const parts: string[] = [];
  for (let y = 0; y < qr.size; y++) {
    let x = 0;
    while (x < qr.size) {
      if (!qr.modules[y * qr.size + x]) {
        x++;
        continue;
      }
      const start = x;
      while (x < qr.size && qr.modules[y * qr.size + x]) x++;
      parts.push(`M${start + border} ${y + border}h${x - start}v1h-${x - start}z`);
    }
  }
  return parts.join("");
}
