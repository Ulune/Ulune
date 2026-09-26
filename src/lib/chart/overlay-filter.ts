import type { ConfigType } from "./types";

const KEY = "ulune.wheel.overlays.v1";
const STAR_KEY = "ulune.wheel.stars";
const MP_KEY = "ulune.wheel.midpoints";

export const OVERLAY_IDS = [
  "applyingSeparating",
  "stationary",
  "fast",
  "angularity",
  "chartRuler",
  "sect",
  "dignity",
  "combust",
  "vocMoon",
  "oob",
  "anaretic",
  "receptions",
  "configurations",
  "unaspected",
  "stelliums",
  "hemisphere",
  "quadrant",
] as const;

export type OverlayId = (typeof OVERLAY_IDS)[number];

export type OverlayFilter = {
  on: Set<OverlayId>;
  configs: Set<string>;
};

export const DEFAULT_OVERLAYS: OverlayId[] = ["applyingSeparating"];

export function overlayOn(filter: OverlayFilter, id: OverlayId): boolean {
  return filter.on.has(id);
}

export function cloneOverlays(filter: OverlayFilter): OverlayFilter {
  return { on: new Set(filter.on), configs: new Set(filter.configs) };
}

export function defaultOverlays(): OverlayFilter {
  return { on: new Set(DEFAULT_OVERLAYS), configs: new Set() };
}

function isOverlayId(id: unknown): id is OverlayId {
  return typeof id === "string" && (OVERLAY_IDS as readonly string[]).includes(id);
}

export function loadOverlays(): OverlayFilter {
  if (typeof window === "undefined") return defaultOverlays();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return defaultOverlays();
    const parsed = JSON.parse(raw) as { on?: unknown; configs?: unknown };
    const on = Array.isArray(parsed.on)
      ? new Set(parsed.on.filter(isOverlayId))
      : new Set(DEFAULT_OVERLAYS);
    const configs = Array.isArray(parsed.configs)
      ? new Set(parsed.configs.filter((x): x is string => typeof x === "string"))
      : new Set<string>();
    return { on, configs };
  } catch {
    return defaultOverlays();
  }
}

export function saveOverlays(filter: OverlayFilter) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ on: [...filter.on], configs: [...filter.configs] }),
    );
  } catch {
    /* quota */
  }
}

export function loadStarVisible(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STAR_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? new Set(parsed.filter((x) => typeof x === "string")) : new Set();
  } catch {
    return new Set();
  }
}

export function saveStarVisible(ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STAR_KEY, JSON.stringify([...ids]));
  } catch {
    /* quota */
  }
}

export function loadMidpointVisible(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(MP_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? new Set(parsed.filter((x) => typeof x === "string")) : new Set();
  } catch {
    return new Set();
  }
}

export function saveMidpointVisible(ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MP_KEY, JSON.stringify([...ids]));
  } catch {
    /* quota */
  }
}

export const CONFIG_LABEL: Record<ConfigType, { en: string; fr: string }> = {
  tsquare: { en: "T-square", fr: "T-carré" },
  grandTrine: { en: "Grand trine", fr: "Grand trigone" },
  grandCross: { en: "Grand cross", fr: "Grand carré" },
  yod: { en: "Yod", fr: "Yod" },
  kite: { en: "Kite", fr: "Cerf-volant" },
  mysticRectangle: { en: "Mystic rectangle", fr: "Rectangle mystique" },
};
