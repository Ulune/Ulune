import { SECTION_BODIES } from "@/lib/chart/chart-view";
import { OVERLAY_IDS } from "@/lib/chart/overlay-filter";
import { ASPECT_IDS, MIDPOINT_IDS, STAR_IDS } from "@/lib/chart/types";
import type { MessageKey } from "@/lib/i18n/messages";

/** Locked 4-page Bodies IA (2026-09-19). */
export const BODIES_PAGES = [
  "planets",
  "aspects",
  "angles",
  "marks",
] as const;

export type BodiesPage = (typeof BODIES_PAGES)[number];

/** Legacy URL / storage ids → current page. */
const BODIES_PAGE_REMAP: Record<string, BodiesPage> = {
  presets: "planets",
  points: "planets",
  asteroids: "planets",
  stars: "marks",
  midpoints: "marks",
  overlays: "aspects",
};

export const BODIES_PAGE_LABEL: Record<BodiesPage, MessageKey> = {
  planets: "bodiesPagePlanets",
  aspects: "bodiesPageAspects",
  angles: "bodiesPageAngles",
  marks: "bodiesPageMarks",
};


/** Focus PlanetStrip — Planets + Points only (Angles has house system instead). */
export const BODIES_STRIP_PAGES: ReadonlySet<BodiesPage> = new Set(["planets"]);

/** BodyMixer exclusive page. */
export type BodiesMixerPage = "planets" | "angles" | "marks" | "aspects";

export function bodiesMixerPage(page: BodiesPage): BodiesMixerPage {
  return page;
}

const KEY = "ulune.bodies.page";

export function isBodiesPage(value: unknown): value is BodiesPage {
  if (typeof value !== "string") return false;
  if ((BODIES_PAGES as readonly string[]).includes(value)) return true;
  return value in BODIES_PAGE_REMAP;
}

export function coerceBodiesPage(value: unknown): BodiesPage | undefined {
  if (typeof value !== "string") return undefined;
  if ((BODIES_PAGES as readonly string[]).includes(value)) return value as BodiesPage;
  return BODIES_PAGE_REMAP[value];
}

export function loadBodiesPage(): BodiesPage {
  if (typeof window === "undefined") return "planets";
  try {
    const raw = window.localStorage.getItem(KEY);
    const page = coerceBodiesPage(raw);
    if (page) return page;
  } catch {
    /* ignore */
  }
  return "planets";
}

export function saveBodiesPage(page: BodiesPage) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, page);
  } catch {
    /* quota */
  }
}

export type BodiesBadge = { on: number; total: number };

export function bodiesPageBadge(
  page: BodiesPage,
  opts: {
    visible: Set<string>;
    starVisible: Set<string>;
    midpointVisible: Set<string>;
    aspectTypes: Set<string>;
    overlayOn: Set<string>;
  },
): BodiesBadge | null {
  if (page === "planets") {
    const ids = [...SECTION_BODIES.planets, ...SECTION_BODIES.asteroids, ...SECTION_BODIES.points];
    return { on: ids.filter((id) => opts.visible.has(id)).length, total: ids.length };
  }
  if (page === "angles") {
    const ids = SECTION_BODIES.angles;
    return { on: ids.filter((id) => opts.visible.has(id)).length, total: ids.length };
  }
  if (page === "marks") {
    const total = STAR_IDS.length + MIDPOINT_IDS.length;
    const on =
      STAR_IDS.filter((id) => opts.starVisible.has(id)).length +
      MIDPOINT_IDS.filter((id) => opts.midpointVisible.has(id)).length;
    return { on, total };
  }
  if (page === "aspects") {
    const total = ASPECT_IDS.length + OVERLAY_IDS.length;
    const on =
      ASPECT_IDS.filter((id) => opts.aspectTypes.has(id)).length +
      OVERLAY_IDS.filter((id) => opts.overlayOn.has(id)).length;
    return { on, total };
  }
  return null;
}
