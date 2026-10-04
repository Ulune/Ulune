import type { MessageKey } from "@/lib/i18n/messages";

/** Locked 5-page Look IA (Type + Ink merged, 2026-09-18). */
export const LOOK_PAGES = [
  "profiles",
  "type",
  "elements",
  "aspects",
  "planets",
] as const;

export type LookPage = (typeof LOOK_PAGES)[number];

/** Legacy URL / storage ids → current page. */
const LOOK_PAGE_REMAP: Record<string, LookPage> = {
  ink: "type",
  typeInk: "type",
  palette: "elements",
};

export const LOOK_PAGE_LABEL: Record<LookPage, MessageKey> = {
  profiles: "lookPageProfiles",
  type: "lookPageTypeInk",
  elements: "lookPageElements",
  aspects: "lookPageAspects",
  planets: "lookPagePlanets",
};

export const LOOK_PAGE_TEACH: Record<LookPage, MessageKey> = {
  profiles: "lookTeachProfiles",
  type: "lookTeachTypeInk",
  elements: "lookTeachElements",
  aspects: "lookTeachAspects",
  planets: "lookTeachPlanets",
};

/** LookPanel exclusive page (profiles handled outside). */
export type LookPanelPage = "type" | "elements" | "aspects" | "planets";

export function lookPanelPage(page: LookPage): LookPanelPage | null {
  if (page === "profiles") return null;
  return page;
}

const KEY = "ulune.look.page";

export function isLookPage(value: unknown): value is LookPage {
  return typeof value === "string" && (LOOK_PAGES as readonly string[]).includes(value);
}

export function coerceLookPage(value: unknown): LookPage | undefined {
  if (typeof value !== "string") return undefined;
  if (isLookPage(value)) return value;
  return LOOK_PAGE_REMAP[value];
}

export function loadLookPage(): LookPage {
  // A first visit opens on the look itself (review 3 Oct, C13): Profiles is empty until one is saved.
  if (typeof window === "undefined") return "type";
  try {
    const raw = window.localStorage.getItem(KEY);
    const page = coerceLookPage(raw);
    if (page) return page;
  } catch {
    /* ignore */
  }
  return "type";
}

export function saveLookPage(page: LookPage) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, page);
  } catch {
    /* quota */
  }
}
