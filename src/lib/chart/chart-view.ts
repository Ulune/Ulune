import { cloneAspectFilter, type AspectFilter } from "./aspect-filter";
import {
  ANGLE_BODIES,
  ASTEROID_BODIES,
  BODY_GROUPS,
  CLASSIC_BODIES,
  MAJOR_ASPECT_IDS,
  ORB_MAX,
  POINT_BODIES,
} from "./constants";
import type { FoldState } from "./folds";
import {
  cloneOverlays,
  OVERLAY_IDS,
  type OverlayFilter,
  type OverlayId,
} from "./overlay-filter";
import {
  ASPECT_IDS,
  MIDPOINT_IDS,
  STAR_IDS,
  type AspectId,
  type BodyId,
} from "./types";

export type ReadingDepth = "brief" | "standard" | "full";
export type NamedPresetId = "minimal" | "classic" | "advanced" | "all" | "clear";
export type PresetId = NamedPresetId | "custom";
export type AspectLayer = "natal" | "outer" | "both" | "cross";

export const ASPECT_LAYERS: AspectLayer[] = ["natal", "outer", "both", "cross"];

export function isAspectLayer(v: unknown): v is AspectLayer {
  return v === "natal" || v === "outer" || v === "both" || v === "cross";
}

export function layerShowsNatal(layer: AspectLayer): boolean {
  return layer === "natal" || layer === "both";
}
export function layerShowsOuter(layer: AspectLayer): boolean {
  return layer === "outer" || layer === "both";
}
export function layerShowsCross(layer: AspectLayer): boolean {
  return layer === "cross";
}

export type ChartView = {
  bodies: BodyId[];
  stars: string[];
  midpoints: string[];
  aspects: AspectId[];
  maxOrb: number;
  toAngles: boolean;
  toNodes: boolean;
  toPoints: boolean;
  toLuminaries: boolean;
  toAsteroids: boolean;
  toPlanets: boolean;
  overlays: OverlayId[];
  readingDepth: ReadingDepth;
  folds: Partial<FoldState>;
};

export type StoredChartView = {
  presetId: PresetId;
  custom: ChartView | null;
  live: ChartView;
  configs: string[];
  aspectLayer: AspectLayer;
};

const KEY = "ulune.chart.view.v1";
const OLD_BODIES = "ulune.wheel.bodies";
const OLD_ASPECTS = "ulune.wheel.aspects";
const OLD_OVERLAYS = "ulune.wheel.overlays.v1";
const OLD_STARS = "ulune.wheel.stars";
const OLD_MIDS = "ulune.wheel.midpoints";

const ALL_BODIES: BodyId[] = BODY_GROUPS.flatMap((g) => g.bodies);

const FOLDS_QUIET: Partial<FoldState> = {
  mixer: false,
  look: false,
  click: true,
  summary: false,
  strip: false,
  compose: false,
};

const FOLDS_ADVANCED: Partial<FoldState> = {
  mixer: true,
  click: true,
  summary: true,
  strip: true,
  compose: false,
};

const FOLDS_ALL: Partial<FoldState> = {
  mixer: true,
  click: true,
  summary: true,
  strip: true,
  compose: true,
};

function view(
  partial: Omit<ChartView, "folds"> & { folds: Partial<FoldState> },
): ChartView {
  return {
    bodies: [...partial.bodies],
    stars: [...partial.stars],
    midpoints: [...partial.midpoints],
    aspects: [...partial.aspects],
    maxOrb: partial.maxOrb,
    toAngles: partial.toAngles,
    toNodes: partial.toNodes,
    toPoints: partial.toPoints,
    toLuminaries: partial.toLuminaries,
    toAsteroids: partial.toAsteroids,
    toPlanets: partial.toPlanets,
    overlays: [...partial.overlays],
    readingDepth: partial.readingDepth,
    folds: { ...partial.folds },
  };
}

export const NAMED_PRESETS: Record<NamedPresetId, ChartView> = {
  minimal: view({
    bodies: ["sun", "moon", "ascendant"],
    stars: [],
    midpoints: [],
    aspects: ["conjunction", "opposition", "square", "trine"],
    maxOrb: 3,
    toAngles: true,
    toNodes: true,
    toPoints: true,
    toLuminaries: true,
    toAsteroids: true,
    toPlanets: true,
    overlays: [],
    readingDepth: "brief",
    folds: FOLDS_QUIET,
  }),
  classic: view({
    bodies: [...CLASSIC_BODIES, ...ANGLE_BODIES],
    stars: [],
    midpoints: [],
    aspects: [...MAJOR_ASPECT_IDS],
    maxOrb: 5,
    toAngles: true,
    toNodes: true,
    toPoints: true,
    toLuminaries: true,
    toAsteroids: true,
    toPlanets: true,
    overlays: [],
    readingDepth: "standard",
    folds: FOLDS_QUIET,
  }),
  advanced: view({
    bodies: [
      ...CLASSIC_BODIES,
      ...ANGLE_BODIES,
      "chiron",
      "northnode",
      "southnode",
      "lilith",
      "vertex",
      "fortune",
    ],
    stars: [],
    midpoints: [],
    aspects: [...ASPECT_IDS],
    maxOrb: 6,
    toAngles: true,
    toNodes: true,
    toPoints: true,
    toLuminaries: true,
    toAsteroids: true,
    toPlanets: true,
    overlays: [
      "applyingSeparating",
      "dignity",
      "angularity",
      "chartRuler",
      "receptions",
      "configurations",
    ],
    readingDepth: "full",
    folds: FOLDS_ADVANCED,
  }),
  all: view({
    bodies: [...ALL_BODIES],
    stars: [...STAR_IDS],
    midpoints: [...MIDPOINT_IDS],
    aspects: [...ASPECT_IDS],
    maxOrb: ORB_MAX,
    toAngles: true,
    toNodes: true,
    toPoints: true,
    toLuminaries: true,
    toAsteroids: true,
    toPlanets: true,
    overlays: [...OVERLAY_IDS],
    readingDepth: "full",
    folds: FOLDS_ALL,
  }),
  clear: view({
    bodies: [],
    stars: [],
    midpoints: [],
    aspects: [],
    maxOrb: 5,
    toAngles: true,
    toNodes: true,
    toPoints: true,
    toLuminaries: true,
    toAsteroids: true,
    toPlanets: true,
    overlays: [],
    readingDepth: "standard",
    folds: FOLDS_QUIET,
  }),
};

export const PRESET_ORDER: NamedPresetId[] = [
  "minimal",
  "classic",
  "advanced",
  "all",
  "clear",
];

export function cloneChartView(v: ChartView): ChartView {
  return view(v);
}

function sorted(ids: string[]): string[] {
  return [...ids].sort();
}

function canonical(v: ChartView) {
  return {
    bodies: sorted(v.bodies),
    stars: sorted(v.stars),
    midpoints: sorted(v.midpoints),
    aspects: sorted(v.aspects),
    maxOrb: v.maxOrb,
    toAngles: v.toAngles,
    toNodes: v.toNodes,
    toPoints: v.toPoints,
    toLuminaries: v.toLuminaries,
    toAsteroids: v.toAsteroids,
    toPlanets: v.toPlanets,
    overlays: sorted(v.overlays),
    readingDepth: v.readingDepth,
  };
}

export function sameChartView(a: ChartView, b: ChartView): boolean {
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
}

export function matchNamedPreset(live: ChartView): NamedPresetId | null {
  for (const id of PRESET_ORDER) {
    if (sameChartView(live, NAMED_PRESETS[id])) return id;
  }
  return null;
}

export function highlightPreset(live: ChartView, savedCustom: ChartView | null): PresetId {
  return matchNamedPreset(live) ?? (savedCustom && sameChartView(live, savedCustom) ? "custom" : "custom");
}

export function isDirty(live: ChartView, savedCustom: ChartView | null): boolean {
  if (matchNamedPreset(live)) return false;
  if (!savedCustom) return true;
  return !sameChartView(live, savedCustom);
}

export function classicView(): ChartView {
  return cloneChartView(NAMED_PRESETS.classic);
}

export function emptyStoredView(): StoredChartView {
  return {
    presetId: "classic",
    custom: null,
    live: classicView(),
    configs: [],
    aspectLayer: "both",
  };
}

function isBodyId(id: unknown): id is BodyId {
  return typeof id === "string" && ALL_BODIES.includes(id as BodyId);
}

function isAspectId(id: unknown): id is AspectId {
  return typeof id === "string" && (ASPECT_IDS as readonly string[]).includes(id);
}

function isOverlayId(id: unknown): id is OverlayId {
  return typeof id === "string" && (OVERLAY_IDS as readonly string[]).includes(id);
}

function isReadingDepth(id: unknown): id is ReadingDepth {
  return id === "brief" || id === "standard" || id === "full";
}

function parseView(raw: unknown): ChartView | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const bodies = Array.isArray(o.bodies) ? o.bodies.filter(isBodyId) : null;
  const aspects = Array.isArray(o.aspects) ? o.aspects.filter(isAspectId) : null;
  const overlays = Array.isArray(o.overlays) ? o.overlays.filter(isOverlayId) : null;
  if (!bodies || !aspects || !overlays) return null;
  const maxOrb = typeof o.maxOrb === "number" && Number.isFinite(o.maxOrb) ? o.maxOrb : 5;
  const toAngles = typeof o.toAngles === "boolean" ? o.toAngles : true;
  const toNodes = typeof o.toNodes === "boolean" ? o.toNodes : true;
  const toPoints = typeof o.toPoints === "boolean" ? o.toPoints : true;
  const toLuminaries = typeof o.toLuminaries === "boolean" ? o.toLuminaries : true;
  const toAsteroids = typeof o.toAsteroids === "boolean" ? o.toAsteroids : true;
  const toPlanets = typeof o.toPlanets === "boolean" ? o.toPlanets : true;
  return view({
    bodies,
    stars: Array.isArray(o.stars) ? o.stars.filter((x): x is string => typeof x === "string") : [],
    midpoints: Array.isArray(o.midpoints)
      ? o.midpoints.filter((x): x is string => typeof x === "string")
      : [],
    aspects,
    maxOrb,
    toAngles,
    toNodes,
    toPoints,
    toLuminaries,
    toAsteroids,
    toPlanets,
    overlays,
    readingDepth: isReadingDepth(o.readingDepth) ? o.readingDepth : "standard",
    folds:
      o.folds && typeof o.folds === "object"
        ? (o.folds as Partial<FoldState>)
        : FOLDS_QUIET,
  });
}

function parseStored(raw: unknown): StoredChartView | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const live = parseView(o.live);
  if (!live) return null;
  const presetId: PresetId =
    o.presetId === "custom" ||
    (typeof o.presetId === "string" && o.presetId in NAMED_PRESETS)
      ? (o.presetId as PresetId)
      : (matchNamedPreset(live) ?? "custom");
  const custom = parseView(o.custom);
  const configs = Array.isArray(o.configs)
    ? o.configs.filter((x): x is string => typeof x === "string")
    : [];
  const rawLayer = o.aspectLayer === "all" ? "both" : o.aspectLayer;
  const aspectLayer: AspectLayer = isAspectLayer(rawLayer) ? rawLayer : "both";
  return { presetId, custom, live, configs, aspectLayer };
}

function migrateLegacy(): StoredChartView | null {
  if (typeof window === "undefined") return null;
  try {
    const bodiesRaw = window.localStorage.getItem(OLD_BODIES);
    const aspectsRaw = window.localStorage.getItem(OLD_ASPECTS);
    const overlaysRaw = window.localStorage.getItem(OLD_OVERLAYS);
    const starsRaw = window.localStorage.getItem(OLD_STARS);
    const midsRaw = window.localStorage.getItem(OLD_MIDS);
    if (!bodiesRaw && !aspectsRaw && !overlaysRaw) return null;

    let bodies = [...NAMED_PRESETS.classic.bodies];
    if (bodiesRaw) {
      const parsed = JSON.parse(bodiesRaw) as unknown;
      if (Array.isArray(parsed) && parsed.length) bodies = parsed.filter(isBodyId);
    }

    let aspects = [...NAMED_PRESETS.classic.aspects];
    let maxOrb = 5;
    if (aspectsRaw) {
      const parsed = JSON.parse(aspectsRaw) as { types?: unknown; maxOrb?: unknown; toAngles?: unknown; toNodes?: unknown; toPoints?: unknown };
      if (Array.isArray(parsed.types)) aspects = parsed.types.filter(isAspectId);
      if (typeof parsed.maxOrb === "number") maxOrb = parsed.maxOrb;
    }

    let overlays: OverlayId[] = [];
    if (overlaysRaw) {
      const parsed = JSON.parse(overlaysRaw) as { on?: unknown };
      if (Array.isArray(parsed.on)) overlays = parsed.on.filter(isOverlayId);
    }

    let stars: string[] = [];
    if (starsRaw) {
      const parsed = JSON.parse(starsRaw) as unknown;
      if (Array.isArray(parsed)) stars = parsed.filter((x): x is string => typeof x === "string");
    }

    let midpoints: string[] = [];
    if (midsRaw) {
      const parsed = JSON.parse(midsRaw) as unknown;
      if (Array.isArray(parsed)) midpoints = parsed.filter((x): x is string => typeof x === "string");
    }

    const live = view({
      bodies,
      stars,
      midpoints,
      aspects,
      maxOrb,
      toAngles: true,
      toNodes: true,
      toPoints: true,
      toLuminaries: true,
      toAsteroids: true,
      toPlanets: true,
      overlays,
      readingDepth: "standard",
      folds: FOLDS_QUIET,
    });
    const named = matchNamedPreset(live);
    return {
      presetId: named ?? "custom",
      custom: named ? null : cloneChartView(live),
      live,
      configs: [],
      aspectLayer: "both",
    };
  } catch {
    return null;
  }
}

export function loadChartViewState(): StoredChartView {
  if (typeof window === "undefined") return emptyStoredView();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = parseStored(JSON.parse(raw) as unknown);
      if (parsed) return parsed;
    }
    const legacy = migrateLegacy();
    if (legacy) {
      saveChartViewState(legacy);
      return legacy;
    }
  } catch {
    /* ignore */
  }
  return emptyStoredView();
}

export function saveChartViewState(state: StoredChartView) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* quota */
  }
}

export function parseStoredChartView(raw: unknown): StoredChartView | null {
  return parseStored(raw);
}

export function viewToAspectFilter(v: ChartView): AspectFilter {
  return cloneAspectFilter({
    types: new Set(v.aspects),
    maxOrb: v.maxOrb,
    toAngles: v.toAngles,
    toNodes: v.toNodes,
    toPoints: v.toPoints,
    toLuminaries: v.toLuminaries,
    toAsteroids: v.toAsteroids,
    toPlanets: v.toPlanets,
  });
}

export function viewToOverlays(v: ChartView, configs: Iterable<string> = []): OverlayFilter {
  const on = new Set(v.overlays);
  return cloneOverlays({
    on,
    configs: on.has("configurations") ? new Set(configs) : new Set(),
  });
}

export function partsToView(
  visible: Set<BodyId>,
  aspects: AspectFilter,
  overlays: OverlayFilter,
  stars: Set<string>,
  mids: Set<string>,
  readingDepth: ReadingDepth,
  folds: Partial<FoldState> = FOLDS_QUIET,
): ChartView {
  return view({
    bodies: [...visible],
    stars: [...stars],
    midpoints: [...mids],
    aspects: [...aspects.types],
    maxOrb: aspects.maxOrb,
    toAngles: aspects.toAngles,
    toNodes: aspects.toNodes,
    toPoints: aspects.toPoints,
    toLuminaries: aspects.toLuminaries,
    toAsteroids: aspects.toAsteroids,
    toPlanets: aspects.toPlanets,
    overlays: [...overlays.on],
    readingDepth,
    folds,
  });
}

export const MIXER_SECTIONS = [
  "angles",
  "points",
  "asteroids",
  "stars",
  "midpoints",
  "aspects",
  "overlays",
] as const;

export type MixerSectionId = (typeof MIXER_SECTIONS)[number];

export function mixerSectionsOpen(preset: PresetId): boolean {
  return preset === "advanced" || preset === "all";
}

export const SECTION_BODIES: Record<"planets" | "points" | "asteroids" | "angles", BodyId[]> = {
  planets: CLASSIC_BODIES,
  points: POINT_BODIES,
  asteroids: ASTEROID_BODIES,
  angles: ANGLE_BODIES,
};
