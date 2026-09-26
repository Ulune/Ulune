/**
 * Where to put a short text so its ink — not its em box — is centred on a
 * point: a glyph from a font (Astronomicon, StarFont, a Look's own face) or a
 * house number. An em box centres the letter's cell, and a font draws its
 * marks anywhere in that cell (a digit sits on the baseline, ☽ leans left),
 * so a mark centred by its box sits off-centre in a disc.
 *
 * Measured with the page's own fonts on a canvas (the same outlines the SVG
 * text is drawn with), once per font and text, again whenever fonts finish
 * loading. Before the fonts are in, and on the server, there is no answer
 * (null): the caller centres the em box as before.
 */
import { useSyncExternalStore } from "react";
import { codepointInUnicodeRange } from "./glyph-coverage";

export type TextInk = {
  /** Where the anchor goes (text-anchor middle, alphabetic baseline), per px of font size, from the point the ink centres on. */
  dx: number;
  dy: number;
};

/** Measuring size (px): large, so the metrics are exact to a hundredth of a unit. */
const SIZE = 100;
const cache = new Map<string, TextInk | null>();
/** Fonts asked for and not in yet (measured once they are). */
const pending = new Set<string>();
const listeners = new Set<() => void>();
let version = 0;
let started = false;
let ctx: CanvasRenderingContext2D | null = null;
/** The first family of every stack measured (lower case, unquoted): only their loads matter. */
const measured = new Set<string>();
/** The page's faces per stack, weight and text (the face list only changes when fonts are added). */
const facesCache = new Map<string, FontFace[]>();

function familyKey(family: string): string {
  return family.split(",")[0].trim().replace(/^["']|["']$/g, "").toLowerCase();
}

function bump() {
  cache.clear();
  facesCache.clear();
  version += 1;
  for (const fn of listeners) fn();
}

/** A font finished loading: measure again only when it is one of the measured families. */
function onLoadingDone(e: Event) {
  const faces = (e as Event & { fontfaces?: readonly FontFace[] }).fontfaces;
  if (!faces || faces.some((f) => measured.has(familyKey(f.family)))) bump();
}

function start() {
  if (started || typeof document === "undefined" || !document.fonts) return;
  started = true;
  void document.fonts.ready.then(bump);
  document.fonts.addEventListener?.("loadingdone", onLoadingDone);
}

/**
 * Listening starts after the first frame is painted: asking for
 * `document.fonts.ready` resolves the page's styles, and doing it while the
 * first chart mounted cost a forced restyle of the whole page (~140 ms on a
 * phone profile). Until then the marks are centred by their em box, as before
 * the fonts are in.
 */
function startSoon() {
  if (started || typeof window === "undefined") return;
  window.requestAnimationFrame(() => window.setTimeout(start, 0));
}

function subscribe(fn: () => void) {
  startSoon();
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

const getVersion = () => version;
const getServerVersion = () => 0;

/** Re-render when fonts come in (0 until they are: centre by the em box meanwhile). */
export function useTextInkVersion(): number {
  return useSyncExternalStore(subscribe, getVersion, getServerVersion);
}

/**
 * The ink offset of `text` set in `family` at `weight`, per px of font size;
 * null before the page's fonts are ready (or where it cannot be measured).
 */
export function textInk(family: string, weight: number | string, text: string): TextInk | null {
  if (version === 0 || typeof document === "undefined") return null;
  measured.add(familyKey(family));
  const key = `${weight}|${family}|${text}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const font = `${weight} ${SIZE}px ${family}`;
  // A face not in yet would be measured in its fallback: load it and answer
  // once it is in. (Its own status, not FontFaceSet.check(), which answers
  // too early in some browsers; and a load settles even where no
  // "loadingdone" event ever comes.) A face that failed to load is settled
  // too: the text is drawn in its fallback, so that is what is measured —
  // asking it again would fail at once, re-render every glyph and ask again,
  // forever (a font blocked or cut off froze the page).
  const waiting = facesFor(family, weight, text).filter((f) => f.status === "unloaded" || f.status === "loading");
  if (waiting.length) {
    if (!pending.has(font)) {
      pending.add(font);
      void Promise.allSettled(waiting.map((f) => f.load())).then(() => {
        pending.delete(font);
        bump();
      });
    }
    return null;
  }
  ctx ??= document.createElement("canvas").getContext("2d");
  if (!ctx) return null;
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const m = ctx.measureText(text);
  const l = m.actualBoundingBoxLeft;
  const r = m.actualBoundingBoxRight;
  const a = m.actualBoundingBoxAscent;
  const d = m.actualBoundingBoxDescent;
  const ink = [l, r, a, d].every(Number.isFinite) && l + r > 0 && a + d > 0 ? { dx: (l - r) / 2 / SIZE, dy: (a - d) / 2 / SIZE } : null;
  cache.set(key, ink);
  return ink;
}

/** A face's weight descriptor ("400", "bold", "100 900") holds `weight`. */
function weightHolds(desc: string, weight: number | string): boolean {
  const num = (v: string) => (v === "normal" ? 400 : v === "bold" ? 700 : Number(v));
  const w = num(String(weight));
  const [lo, hi = lo] = desc.trim().split(/\s+/).map(num);
  if (![w, lo, hi].every(Number.isFinite)) return true;
  return w >= lo && w <= hi;
}

/** The page's faces a text would be set in: the stack's first family, at that weight, covering its characters. */
function facesFor(family: string, weight: number | string, text: string): FontFace[] {
  if (!document.fonts) return [];
  const cacheKey = `${weight}|${family}|${text}`;
  const known = facesCache.get(cacheKey);
  if (known) return known;
  const first = familyKey(family);
  const cps = [...text.replace(/\uFE0E/g, "")].map((ch) => ch.codePointAt(0) ?? 0);
  const out: FontFace[] = [];
  document.fonts.forEach((f) => {
    if (f.family.replace(/["']/g, "").toLowerCase() !== first) return;
    if (!weightHolds(f.weight, weight)) return;
    if (!cps.some((cp) => codepointInUnicodeRange(f.unicodeRange || "U+0-10FFFF", cp))) return;
    out.push(f);
  });
  facesCache.set(cacheKey, out);
  return out;
}

/** The value of a CSS custom property on the page (a font stack), or `fallback`. */
export function cssVar(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}
