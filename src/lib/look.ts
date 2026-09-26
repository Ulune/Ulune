import { forgetBootLook, rememberBootLook } from "@/lib/boot";
import type { Theme } from "@/lib/theme";
import { CLASSIC_BODIES, ELEMENT_COLOR, SIGN_META } from "@/lib/chart/constants";
import {
  DEFAULT_GLYPH_FAMILY,
  GLYPH_FONT_STACK,
  glyphFontStack,
  isGlyphFamily,
  type GlyphFamily,
} from "@/lib/chart/glyphs";
import type { BodyId, ElementId, PlanetId, SignId } from "@/lib/chart/types";

export type Oklch = { h: number; c: number; l: number };

export type ElementKey = ElementId;
export type AspectKey = "conj" | "hard" | "soft" | "minor";
export type ClassicPlanet = (typeof CLASSIC_BODIES)[number];
export type TypePairing = "classic" | "editorial" | "clean";
export type StrokeWeight = "thin" | "regular" | "heavy";

export type LookState = {
  elements: Record<ElementKey, Oklch>;
  aspects: Record<AspectKey, Oklch>;
  outerAspects: Record<AspectKey, Oklch>;
  planets: Partial<Record<ClassicPlanet, Oklch>>;
  pairing: TypePairing;
  glyphFamily: GlyphFamily;
  textScale: number;
  stroke: StrokeWeight;
};

export type HueChipId =
  | "ruby"
  | "coral"
  | "amber"
  | "gold"
  | "leaf"
  | "teal"
  | "sky"
  | "indigo"
  | "violet"
  | "rose"
  | "stone"
  | "silver";

export const HUE_CHIPS: { id: HueChipId; h: number; c: number }[] = [
  { id: "ruby", h: 22, c: 0.18 },
  { id: "coral", h: 40, c: 0.16 },
  { id: "amber", h: 70, c: 0.14 },
  { id: "gold", h: 95, c: 0.13 },
  { id: "leaf", h: 148, c: 0.14 },
  { id: "teal", h: 185, c: 0.12 },
  { id: "sky", h: 245, c: 0.13 },
  { id: "indigo", h: 275, c: 0.12 },
  { id: "violet", h: 305, c: 0.14 },
  { id: "rose", h: 350, c: 0.16 },
  { id: "stone", h: 75, c: 0.04 },
  { id: "silver", h: 270, c: 0.018 },
];

export const ELEMENT_KEYS: ElementKey[] = ["fire", "earth", "air", "water"];
export const ASPECT_KEYS: AspectKey[] = ["conj", "hard", "soft", "minor"];
export const CLASSIC_PLANETS = CLASSIC_BODIES as ClassicPlanet[];

/** The font pairings; every face ships with the app (styles.css, "Fonts"). */
export const PAIRING_FONTS: Record<TypePairing, { display: string; sans: string }> = {
  classic: {
    display: '"Fraunces", "Times New Roman", serif',
    sans: '"Familjen Grotesk", "Segoe UI", system-ui, sans-serif',
  },
  editorial: {
    display: '"Source Serif 4", "Times New Roman", serif',
    sans: '"Source Sans 3", "Segoe UI", system-ui, sans-serif',
  },
  clean: {
    display: '"IBM Plex Serif", "Times New Roman", serif',
    sans: '"IBM Plex Sans", "Segoe UI", system-ui, sans-serif',
  },
};

export const STROKE_SCALE: Record<StrokeWeight, number> = {
  thin: 0.75,
  regular: 1,
  heavy: 1.45,
};

const KEY = "ulune.look.v1";
const C_MIN = 0.01;
const C_MAX = 0.22;
const L_MIN = 0.36;
const L_MAX = 0.86;
const TEXT_MIN = 0.9;
const TEXT_MAX = 1.15;

export const DEFAULT_LOOK: LookState = {
  elements: {
    fire: { h: 22, c: 0.2, l: 0.58 },
    earth: { h: 148, c: 0.17, l: 0.6 },
    air: { h: 87, c: 0.16, l: 0.81 },
    water: { h: 245, c: 0.17, l: 0.56 },
  },
  aspects: {
    conj: { h: 95, c: 0.15, l: 0.8 },
    hard: { h: 22, c: 0.2, l: 0.62 },
    soft: { h: 245, c: 0.16, l: 0.64 },
    minor: { h: 148, c: 0.16, l: 0.64 },
  },
  outerAspects: {
    conj: { h: 85, c: 0.16, l: 0.76 },
    hard: { h: 350, c: 0.18, l: 0.68 },
    soft: { h: 305, c: 0.16, l: 0.62 },
    minor: { h: 185, c: 0.14, l: 0.62 },
  },
  planets: {},
  pairing: "classic",
  glyphFamily: DEFAULT_GLYPH_FAMILY,
  textScale: 1,
  stroke: "regular",
};

/** First V1 gold air — khaki / brown-gray olive. Saved Looks still on this mix upgrade. */
const MUDDY_V1_AIR_NIGHT: Oklch = { h: 95, c: 0.14, l: 0.78 };

/** Last-pass lemon gold (hue 95). Saved Looks still on this mix upgrade to lamp-gold. */
const LEMON_V1_AIR_NIGHT: Oklch = { h: 95, c: 0.16, l: 0.81 };

/** Pre-V1 factory (production `94a2611`). Saved Looks still holding these
 *  swatches must upgrade to DEFAULT_LOOK — air was silver, not gold. */
export const LEGACY_FACTORY_NIGHT: Pick<LookState, "elements" | "aspects"> = {
  elements: {
    fire: { h: 22, c: 0.18, l: 0.63 },
    earth: { h: 148, c: 0.14, l: 0.7 },
    air: { h: 270, c: 0.018, l: 0.82 },
    water: { h: 255, c: 0.145, l: 0.62 },
  },
  aspects: {
    conj: { h: 95, c: 0.12, l: 0.81 },
    hard: { h: 32, c: 0.155, l: 0.62 },
    soft: { h: 262, c: 0.11, l: 0.65 },
    minor: { h: 155, c: 0.075, l: 0.67 },
  },
};

export const DEFAULT_LOOK_DAY: Pick<LookState, "elements" | "aspects" | "outerAspects"> = {
  elements: {
    fire: { h: 22, c: 0.21, l: 0.7 },
    earth: { h: 148, c: 0.18, l: 0.68 },
    air: { h: 87, c: 0.18, l: 0.83 },
    water: { h: 245, c: 0.18, l: 0.68 },
  },
  aspects: {
    conj: { h: 95, c: 0.16, l: 0.78 },
    hard: { h: 22, c: 0.21, l: 0.7 },
    soft: { h: 245, c: 0.17, l: 0.7 },
    minor: { h: 148, c: 0.17, l: 0.7 },
  },
  outerAspects: {
    conj: { h: 85, c: 0.16, l: 0.76 },
    hard: { h: 350, c: 0.18, l: 0.72 },
    soft: { h: 305, c: 0.16, l: 0.68 },
    minor: { h: 185, c: 0.14, l: 0.68 },
  },
};

const ELEMENT_VAR: Record<ElementKey, string> = {
  fire: "--el-fire",
  earth: "--el-earth",
  air: "--el-air",
  water: "--el-water",
};

const ASPECT_VAR: Record<AspectKey, string> = {
  conj: "--aspect-conj",
  hard: "--aspect-hard",
  soft: "--aspect-soft",
  minor: "--aspect-minor",
};

const OUTER_ASPECT_VAR: Record<AspectKey, string> = {
  conj: "--aspect-outer-conj",
  hard: "--aspect-outer-hard",
  soft: "--aspect-outer-soft",
  minor: "--aspect-outer-minor",
};

export function clampChroma(n: number): number {
  return Math.min(C_MAX, Math.max(C_MIN, n));
}

export function clampLightness(n: number): number {
  return Math.min(L_MAX, Math.max(L_MIN, n));
}

export function clampHue(n: number): number {
  const h = n % 360;
  return h < 0 ? h + 360 : h;
}

export function clampTextScale(n: number): number {
  const stepped = Math.round(n * 100) / 100;
  return Math.min(TEXT_MAX, Math.max(TEXT_MIN, stepped));
}

export function cloneLook(look: LookState): LookState {
  return {
    elements: { ...look.elements },
    aspects: { ...look.aspects },
    outerAspects: { ...(look.outerAspects ?? DEFAULT_LOOK.outerAspects) },
    planets: { ...look.planets },
    pairing: look.pairing,
    glyphFamily: look.glyphFamily,
    textScale: look.textScale,
    stroke: look.stroke,
  };
}

export function defaultLook(): LookState {
  return cloneLook(DEFAULT_LOOK);
}

export function oklchCss(color: Oklch): string {
  const h = clampHue(color.h).toFixed(1);
  const c = clampChroma(color.c).toFixed(3);
  const l = clampLightness(color.l).toFixed(3);
  return `oklch(${l} ${c} ${h})`;
}

export function sameOklch(a: Oklch, b: Oklch): boolean {
  return (
    clampHue(a.h) === clampHue(b.h) &&
    clampChroma(a.c) === clampChroma(b.c) &&
    clampLightness(a.l) === clampLightness(b.l)
  );
}

export function lookHasLegacyFactoryTokens(look: Pick<LookState, "elements" | "aspects">): boolean {
  for (const key of ELEMENT_KEYS) {
    if (sameOklch(look.elements[key], LEGACY_FACTORY_NIGHT.elements[key])) return true;
  }
  for (const key of ASPECT_KEYS) {
    if (sameOklch(look.aspects[key], LEGACY_FACTORY_NIGHT.aspects[key])) return true;
  }
  return false;
}

/** Replace any swatch that is still the pre-V1 factory with V1 jewels. Custom mixes stay. */
export function upgradeLegacyFactoryTokens(look: LookState): LookState {
  const next = cloneLook(look);
  for (const key of ELEMENT_KEYS) {
    if (sameOklch(next.elements[key], LEGACY_FACTORY_NIGHT.elements[key])) {
      next.elements[key] = { ...DEFAULT_LOOK.elements[key] };
    }
  }
  for (const key of ASPECT_KEYS) {
    if (sameOklch(next.aspects[key], LEGACY_FACTORY_NIGHT.aspects[key])) {
      next.aspects[key] = { ...DEFAULT_LOOK.aspects[key] };
    }
  }
  if (
    sameOklch(next.elements.air, MUDDY_V1_AIR_NIGHT) ||
    sameOklch(next.elements.air, LEMON_V1_AIR_NIGHT)
  ) {
    next.elements.air = { ...DEFAULT_LOOK.elements.air };
  }
  return next;
}

function lookPayloadsFromRaw(raw: unknown): unknown[] {
  if (!raw || typeof raw !== "object") return [];
  const o = raw as Record<string, unknown>;
  const out: unknown[] = [];
  if (o.elements) out.push(o);
  if (o.live) out.push(o.live);
  if (Array.isArray(o.profiles)) {
    for (const row of o.profiles) {
      if (!row || typeof row !== "object") continue;
      const look = (row as Record<string, unknown>).look;
      if (look) out.push(look);
    }
  }
  return out;
}

export function rawLookHasLegacyFactory(raw: unknown): boolean {
  for (const payload of lookPayloadsFromRaw(raw)) {
    if (!payload || typeof payload !== "object") continue;
    const o = payload as Record<string, unknown>;
    const els = o.elements;
    if (els && typeof els === "object") {
      const rec = els as Record<string, unknown>;
      for (const key of ELEMENT_KEYS) {
        if (!rec[key]) continue;
        if (sameOklch(parseOklch(rec[key], DEFAULT_LOOK.elements[key]), LEGACY_FACTORY_NIGHT.elements[key])) {
          return true;
        }
      }
    }
    const asp = o.aspects;
    if (asp && typeof asp === "object") {
      const rec = asp as Record<string, unknown>;
      for (const key of ASPECT_KEYS) {
        if (!rec[key]) continue;
        if (sameOklch(parseOklch(rec[key], DEFAULT_LOOK.aspects[key]), LEGACY_FACTORY_NIGHT.aspects[key])) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * `factoryDay` must be computed from THIS `color`. When non-null, `color`
 * is discarded — only valid because the caller proved sameOklch to factory night.
 */
export function resolveSwatch(color: Oklch, theme: Theme, factoryDay: Oklch | null = null): Oklch {
  const night = {
    h: clampHue(color.h),
    c: clampChroma(color.c),
    l: clampLightness(color.l),
  };
  if (theme !== "light") return night;
  if (factoryDay) {
    return {
      h: clampHue(factoryDay.h),
      c: clampChroma(factoryDay.c),
      l: clampLightness(factoryDay.l),
    };
  }
  return dayRecipe(night);
}

export function factoryDayFor<K extends string>(
  color: Oklch,
  nightMap: Record<K, Oklch>,
  dayMap: Record<K, Oklch>,
  key: K,
): Oklch | null {
  return sameOklch(color, nightMap[key]) ? dayMap[key] : null;
}

export function resolveElement(look: LookState, el: ElementKey, theme: Theme): Oklch {
  const stored = look.elements[el];
  return resolveSwatch(
    stored,
    theme,
    factoryDayFor(stored, DEFAULT_LOOK.elements, DEFAULT_LOOK_DAY.elements, el),
  );
}

function dayRecipe(night: Oklch): Oklch {
  if (night.c < 0.04) {
    return { h: night.h, c: clampChroma(Math.max(night.c, 0.02)), l: 0.62 };
  }
  const t = Math.min(1, Math.max(0, (night.l - 0.52) / (0.82 - 0.52)));
  const l = clampLightness(0.64 + t * (0.82 - 0.64));
  const c = clampChroma(night.c * 0.98);
  return { h: night.h, c, l };
}

export function compartmentInk(
  _look: LookState,
  _el: ElementKey,
  _theme: Theme,
): "var(--wheel-sign-ink)" {
  return "var(--wheel-sign-ink)";
}

export function nearestHueChip(color: Oklch): HueChipId {
  if (color.c < 0.035) {
    return color.h > 200 && color.h < 320 ? "silver" : "stone";
  }
  let best: HueChipId = "ruby";
  let dist = 360;
  for (const chip of HUE_CHIPS) {
    if (chip.c < 0.05) continue;
    const d = hueDist(color.h, chip.h);
    if (d < dist) {
      dist = d;
      best = chip.id;
    }
  }
  return best;
}

function hueDist(a: number, b: number): number {
  const d = Math.abs(clampHue(a) - clampHue(b)) % 360;
  return Math.min(d, 360 - d);
}

export function applyHueChip(color: Oklch, chip: (typeof HUE_CHIPS)[number]): Oklch {
  const nextC = chip.c < 0.05 ? chip.c : Math.max(color.c, chip.c * 0.7);
  return { h: chip.h, c: clampChroma(nextC), l: color.l };
}

export function isClassicPlanet(id: string): id is ClassicPlanet {
  return (CLASSIC_BODIES as string[]).includes(id);
}

/** Which classic planets carry their own colour; only presence matters here (the colour itself is a CSS variable). */
export type PlanetPaints = Partial<Record<ClassicPlanet, unknown>>;

export function planetPaint(id: string, sign: SignId, planets: PlanetPaints): string {
  if (isClassicPlanet(id) && planets[id]) return `var(--planet-${id})`;
  return ELEMENT_COLOR[SIGN_META[sign].element];
}

export function mixerPlanetPaint(
  id: BodyId,
  on: boolean,
  planets: PlanetPaints,
  essential: Partial<Record<PlanetId, ElementId>>,
): string {
  if (!on) return "var(--color-fg-subtle)";
  if (isClassicPlanet(id) && planets[id]) return `var(--planet-${id})`;
  const el = essential[id as PlanetId];
  return el ? ELEMENT_COLOR[el] : "var(--color-fg)";
}

function parseOklch(raw: unknown, fallback: Oklch): Oklch {
  if (!raw || typeof raw !== "object") return { ...fallback };
  const o = raw as Record<string, unknown>;
  const h = typeof o.h === "number" && Number.isFinite(o.h) ? clampHue(o.h) : fallback.h;
  const c = typeof o.c === "number" && Number.isFinite(o.c) ? clampChroma(o.c) : fallback.c;
  const l = typeof o.l === "number" && Number.isFinite(o.l) ? clampLightness(o.l) : fallback.l;
  return { h, c, l };
}

export function parseLook(raw: unknown): LookState | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const next = defaultLook();
  if (o.elements && typeof o.elements === "object") {
    const els = o.elements as Record<string, unknown>;
    for (const key of ELEMENT_KEYS) {
      if (els[key]) next.elements[key] = parseOklch(els[key], next.elements[key]);
    }
  }
  if (o.aspects && typeof o.aspects === "object") {
    const asp = o.aspects as Record<string, unknown>;
    for (const key of ASPECT_KEYS) {
      if (asp[key]) next.aspects[key] = parseOklch(asp[key], next.aspects[key]);
    }
  }
  if (o.outerAspects && typeof o.outerAspects === "object") {
    const outer = o.outerAspects as Record<string, unknown>;
    for (const key of ASPECT_KEYS) {
      if (outer[key]) next.outerAspects[key] = parseOklch(outer[key], next.outerAspects[key]);
    }
  }
  if (o.planets && typeof o.planets === "object") {
    const pls = o.planets as Record<string, unknown>;
    for (const id of CLASSIC_PLANETS) {
      if (pls[id]) next.planets[id] = parseOklch(pls[id], DEFAULT_LOOK.elements.fire);
    }
  }
  if (o.pairing === "classic" || o.pairing === "editorial" || o.pairing === "clean") {
    next.pairing = o.pairing;
  }
  if (isGlyphFamily(o.glyphFamily)) {
    next.glyphFamily = o.glyphFamily;
  }
  if (typeof o.textScale === "number" && Number.isFinite(o.textScale)) {
    next.textScale = clampTextScale(o.textScale);
  }
  if (o.stroke === "thin" || o.stroke === "regular" || o.stroke === "heavy") {
    next.stroke = o.stroke;
  }
  return upgradeLegacyFactoryTokens(next);
}

export function sameLook(a: LookState, b: LookState): boolean {
  return JSON.stringify(cloneLook(a)) === JSON.stringify(cloneLook(b));
}

export const LOOK_LIBRARY_KEY = "ulune.look.library.v1";
export const DEFAULT_LOOK_ID = "default";
export const MAX_LOOK_PROFILES = 8;

export type LookProfile = {
  id: string;
  name: string;
  look: LookState;
};

export type LookLibrary = {
  live: LookState;
  activeId: string;
  profiles: LookProfile[];
};

export function emptyLookLibrary(): LookLibrary {
  return { live: defaultLook(), activeId: DEFAULT_LOOK_ID, profiles: [] };
}

export function cloneLookLibrary(lib: LookLibrary): LookLibrary {
  return {
    live: cloneLook(lib.live),
    activeId: lib.activeId,
    profiles: lib.profiles.map((p) => ({ id: p.id, name: p.name, look: cloneLook(p.look) })),
  };
}

function newProfileId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `lp_${crypto.randomUUID()}`;
  }
  return `lp_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function nextLookProfileName(profiles: LookProfile[], label: (n: number) => string): string {
  const taken = new Set(profiles.map((p) => p.name));
  for (let n = 1; n <= MAX_LOOK_PROFILES + 4; n += 1) {
    const name = label(n);
    if (!taken.has(name)) return name;
  }
  return label(profiles.length + 1);
}

export function createLookProfile(name: string, look: LookState): LookProfile {
  const trimmed = name.trim().slice(0, 24) || "Look";
  return { id: newProfileId(), name: trimmed, look: cloneLook(look) };
}

export function parseLookLibrary(raw: unknown): LookLibrary | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.elements && typeof o.elements === "object") {
    const live = parseLook(raw);
    if (!live) return null;
    return { live, activeId: DEFAULT_LOOK_ID, profiles: [] };
  }
  const live = parseLook(o.live) ?? defaultLook();
  const profiles: LookProfile[] = [];
  if (Array.isArray(o.profiles)) {
    for (const row of o.profiles) {
      if (!row || typeof row !== "object") continue;
      const p = row as Record<string, unknown>;
      const look = parseLook(p.look);
      if (!look) continue;
      const id = typeof p.id === "string" && p.id ? p.id : newProfileId();
      const name = typeof p.name === "string" && p.name.trim() ? p.name.trim().slice(0, 24) : "Look";
      profiles.push({ id, name, look });
      if (profiles.length >= MAX_LOOK_PROFILES) break;
    }
  }
  const activeId =
    typeof o.activeId === "string" &&
    (o.activeId === DEFAULT_LOOK_ID || profiles.some((p) => p.id === o.activeId))
      ? o.activeId
      : DEFAULT_LOOK_ID;
  return { live, activeId, profiles };
}

export function loadLookLibrary(): LookLibrary {
  if (typeof window === "undefined") return emptyLookLibrary();
  try {
    const libRaw = window.localStorage.getItem(LOOK_LIBRARY_KEY);
    if (libRaw) return parseLookLibrary(JSON.parse(libRaw) as unknown) ?? emptyLookLibrary();
    const liveRaw = window.localStorage.getItem(KEY);
    if (!liveRaw) return emptyLookLibrary();
    return parseLookLibrary(JSON.parse(liveRaw) as unknown) ?? emptyLookLibrary();
  } catch {
    return emptyLookLibrary();
  }
}

export function saveLookLibrary(lib: LookLibrary) {
  if (typeof window === "undefined") return;
  try {
    const cloned = cloneLookLibrary(lib);
    window.localStorage.setItem(LOOK_LIBRARY_KEY, JSON.stringify(cloned));
    window.localStorage.setItem(KEY, JSON.stringify(cloned.live));
  } catch {
    /* quota */
  }
}

export function loadLook(): LookState {
  return loadLookLibrary().live;
}

export function saveLook(look: LookState) {
  const lib = loadLookLibrary();
  lib.live = cloneLook(look);
  saveLookLibrary(lib);
}

export function applyLook(root: HTMLElement, look: LookState, theme: Theme) {
  // Every property set here is also written down (below), so the next visit's
  // boot script paints this Look from the first frame (src/lib/boot.ts).
  const set: [string, string][] = [];
  const put = (prop: string, value: string) => {
    root.style.setProperty(prop, value);
    set.push([prop, value]);
  };
  for (const key of ELEMENT_KEYS) {
    const stored = look.elements[key];
    const day = factoryDayFor(stored, DEFAULT_LOOK.elements, DEFAULT_LOOK_DAY.elements, key);
    put(ELEMENT_VAR[key], oklchCss(resolveSwatch(stored, theme, day)));
  }
  for (const key of ASPECT_KEYS) {
    const stored = look.aspects[key];
    const day = factoryDayFor(stored, DEFAULT_LOOK.aspects, DEFAULT_LOOK_DAY.aspects, key);
    put(ASPECT_VAR[key], oklchCss(resolveSwatch(stored, theme, day)));
  }
  const outer = look.outerAspects ?? DEFAULT_LOOK.outerAspects;
  for (const key of ASPECT_KEYS) {
    const stored = outer[key] ?? DEFAULT_LOOK.outerAspects[key];
    const day = factoryDayFor(stored, DEFAULT_LOOK.outerAspects, DEFAULT_LOOK_DAY.outerAspects, key);
    put(OUTER_ASPECT_VAR[key], oklchCss(resolveSwatch(stored, theme, day)));
  }
  for (const id of CLASSIC_PLANETS) {
    const varName = `--planet-${id}`;
    const swatch = look.planets[id];
    if (swatch) put(varName, oklchCss(resolveSwatch(swatch, theme)));
    else root.style.removeProperty(varName);
  }
  const fonts = PAIRING_FONTS[look.pairing];
  put("--font-display", fonts.display);
  put("--font-sans", fonts.sans);
  const glyphStack =
    look.glyphFamily && look.glyphFamily !== "noto"
      ? GLYPH_FONT_STACK[look.glyphFamily]
      : glyphFontStack(fonts.sans);
  put("--font-glyphs", glyphStack);
  put("font-size", `${Math.round(look.textScale * 100)}%`);
  put("--wheel-stroke", String(STROKE_SCALE[look.stroke]));
  if (typeof document !== "undefined" && root === document.documentElement) {
    rememberBootLook(theme, {
      css: set.map(([prop, value]) => `${prop}:${value}`).join(";"),
      glyph: look.glyphFamily ?? DEFAULT_GLYPH_FAMILY,
    });
  }
}

export function clearLook(root: HTMLElement) {
  for (const key of ELEMENT_KEYS) root.style.removeProperty(ELEMENT_VAR[key]);
  for (const key of ASPECT_KEYS) root.style.removeProperty(ASPECT_VAR[key]);
  for (const key of ASPECT_KEYS) root.style.removeProperty(OUTER_ASPECT_VAR[key]);
  for (const id of CLASSIC_PLANETS) root.style.removeProperty(`--planet-${id}`);
  root.style.removeProperty("--font-display");
  root.style.removeProperty("--font-sans");
  root.style.removeProperty("--font-glyphs");
  root.style.fontSize = "";
  root.style.removeProperty("--wheel-stroke");
  if (typeof document !== "undefined" && root === document.documentElement) forgetBootLook();
}
