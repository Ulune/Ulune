/**
 * The chart's colours on a wide-gamut screen (iPhones, recent Macs, many
 * phones): the palette is chosen inside sRGB, the colours every screen can
 * show, and on a Display P3 screen sRGB colours look flat beside the
 * system's own, which use the whole screen. There each colour keeps its
 * lightness and hue and takes most of the extra saturation the screen has
 * at that lightness and hue, in proportion to how saturated it already is:
 * a grey stays grey, the element colours grow as vivid as the screen allows.
 * Pure: the wheel's Look (look.ts applyLook) and its tests.
 */

export type Lch = { l: number; c: number; h: number };
export type Gamut = "srgb" | "p3";

/** How much of the room P3 adds beyond sRGB a colour takes (the edge of P3 is garish). */
export const WIDEN_SHARE = 0.85;

function linearSrgb(l: number, c: number, h: number): [number, number, number] {
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
}

function linearP3([r, g, b]: [number, number, number]): [number, number, number] {
  // linear sRGB → XYZ (D65) → linear Display P3.
  const x = 0.4123908 * r + 0.3575843 * g + 0.1804808 * b;
  const y = 0.212639 * r + 0.7151687 * g + 0.0721923 * b;
  const z = 0.0193308 * r + 0.1191948 * g + 0.9505322 * b;
  return [
    2.4934969 * x - 0.9313836 * y - 0.4027108 * z,
    -0.829489 * x + 1.7626641 * y + 0.0236247 * z,
    0.0358458 * x - 0.0761724 * y + 0.9568845 * z,
  ];
}

const EPS = 1e-4;

export function inGamut(color: Lch, gamut: Gamut): boolean {
  const s = linearSrgb(color.l, color.c, color.h);
  const v = gamut === "srgb" ? s : linearP3(s);
  return v.every((x) => x >= -EPS && x <= 1 + EPS);
}

/** The most chroma a lightness and hue can have inside a gamut. */
export function maxChroma(l: number, h: number, gamut: Gamut): number {
  let lo = 0;
  let hi = 0.5;
  for (let i = 0; i < 24; i += 1) {
    const mid = (lo + hi) / 2;
    if (inGamut({ l, c: mid, h }, gamut)) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** A colour for a P3 screen: the same lightness and hue, saturated in proportion into P3's extra room. */
export function widen(color: Lch, share = WIDEN_SHARE): Lch {
  const s = maxChroma(color.l, color.h, "srgb");
  const p = maxChroma(color.l, color.h, "p3");
  if (s <= 0 || p <= s) return color;
  const ratio = Math.min(1, color.c / s);
  const c = Math.min(p, Math.max(color.c, s * ratio + (p - s) * ratio * share));
  return { l: color.l, c, h: color.h };
}

export function lchCss(color: Lch): string {
  const h = (((color.h % 360) + 360) % 360).toFixed(1);
  return `oklch(${color.l.toFixed(3)} ${color.c.toFixed(3)} ${h})`;
}

/** Whether this screen shows Display P3 (false on the server and on sRGB screens). */
export function wideScreen(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(color-gamut: p3)").matches;
}
