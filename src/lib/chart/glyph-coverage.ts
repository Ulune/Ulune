/**
 * Real coverage test for the active Look face.
 *
 * A pairing “has” a mark only if a loaded @font-face unicode-range covers the
 * codepoint *and* a canvas ink sample is not empty / not the .notdef box.
 * Google Fonts latin subsets fail the range check for ♇ ☊ ⚳, so those ids
 * paint SVG. Digits 1–12 pass, so house numbers follow Classic / Editorial /
 * Clean. Never consult a hard-coded always-SVG list here.
 */

const GENERIC = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-sans-serif",
  "ui-serif",
  "ui-monospace",
  "ui-rounded",
  "emoji",
  "math",
  "fangsong",
]);

const SAMPLE = 64;
const NOTDEF_PROBE = "\uFFFE";
const cache = new Map<string, boolean>();

/** First named family in a CSS stack (the Look sans). */
export function primaryLookFace(stack: string): string {
  for (const part of stack.split(",")) {
    const name = part.trim().replace(/^["']|["']$/g, "");
    if (!name) continue;
    if (GENERIC.has(name.toLowerCase())) continue;
    return name;
  }
  return "sans-serif";
}

export function codepointInUnicodeRange(range: string, cp: number): boolean {
  const raw = range.trim();
  if (!raw) return true;
  for (const token of raw.split(",")) {
    const t = token.trim().toUpperCase();
    const m = /^U\+([0-9A-F]+)(?:-([0-9A-F]+))?$/.exec(t);
    if (!m) continue;
    const a = Number.parseInt(m[1], 16);
    const b = m[2] ? Number.parseInt(m[2], 16) : a;
    if (cp >= a && cp <= b) return true;
  }
  return false;
}

type Ink = { ink: number; w: number; h: number };

function inkOf(face: string, ch: string): Ink {
  const canvas = document.createElement("canvas");
  canvas.width = SAMPLE;
  canvas.height = SAMPLE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { ink: 0, w: 0, h: 0 };
  ctx.clearRect(0, 0, SAMPLE, SAMPLE);
  ctx.font = `${Math.round(SAMPLE * 0.72)}px "${face}"`;
  ctx.fillStyle = "#000";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(ch, SAMPLE / 2, SAMPLE / 2);
  const { data } = ctx.getImageData(0, 0, SAMPLE, SAMPLE);
  let ink = 0;
  let minX = SAMPLE;
  let minY = SAMPLE;
  let maxX = 0;
  let maxY = 0;
  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    if (data[i + 3] < 16) continue;
    ink += 1;
    const x = p % SAMPLE;
    const y = (p / SAMPLE) | 0;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  if (!ink) return { ink: 0, w: 0, h: 0 };
  return { ink, w: maxX - minX, h: maxY - minY };
}

function isEmptyOrNotdef(face: string, ch: string): boolean {
  const mark = inkOf(face, ch);
  if (mark.ink < 12) return true;
  const missing = inkOf(face, NOTDEF_PROBE);
  if (missing.ink < 12) return false;
  const inkRatio = Math.abs(mark.ink - missing.ink) / Math.max(missing.ink, 1);
  return inkRatio < 0.14 && Math.abs(mark.w - missing.w) < 4 && Math.abs(mark.h - missing.h) < 4;
}

function loadedFaces(face: string): FontFace[] {
  if (typeof document === "undefined" || !document.fonts) return [];
  const want = face.toLowerCase();
  const out: FontFace[] = [];
  document.fonts.forEach((f) => {
    if (f.family.replace(/["']/g, "").toLowerCase() !== want) return;
    if (f.status !== "loaded") return;
    out.push(f);
  });
  return out;
}

function faceCoversCodepoint(face: string, ch: string): boolean {
  const cp = ch.codePointAt(0);
  if (cp === undefined) return false;
  const faces = loadedFaces(face);
  if (faces.length) {
    const covered = faces.some((f) =>
      codepointInUnicodeRange(f.unicodeRange || "U+0-10FFFF", cp),
    );
    // Latin webfont slices omit ♇ ☊ ⚳ even when canvas would fall back to Noto.
    if (!covered) return false;
  }
  try {
    if (document.fonts.check && !document.fonts.check(`64px "${face}"`, ch)) return false;
  } catch {
    /* ignore */
  }
  return !isEmptyOrNotdef(face, ch);
}

/** True when every codepoint of `text` inks in `face` (not tofu / .notdef). */
export function lookHasGlyph(face: string, text: string): boolean {
  if (typeof document === "undefined") return false;
  const chars = [...text.replace(/\uFE0E/g, "")];
  if (!chars.length) return false;
  const key = `${face}\0${chars.join("")}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const ok = chars.every((ch) => faceCoversCodepoint(face, ch));
  cache.set(key, ok);
  return ok;
}

export function clearGlyphCoverageCache() {
  cache.clear();
}
