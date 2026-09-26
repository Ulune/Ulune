import type { MessageKey } from "@/lib/i18n/messages";

/** Locked 5-page Numerology IA (Form + Sol, 2026-09-18). */
export const NUMEROLOGY_PAGES = [
  "overview",
  "cores",
  "timing",
  "compare",
  "numbers",
] as const;

export type NumerologyPage = (typeof NUMEROLOGY_PAGES)[number];

export const NUMEROLOGY_PAGE_LABEL: Record<NumerologyPage, MessageKey> = {
  overview: "numerologyPageOverview",
  cores: "numerologyPageCores",
  timing: "numerologyPageTiming",
  compare: "numerologyPageCompare",
  numbers: "numerologyPageNumbers",
};


const KEY = "ulune.numerology.page";

export function isNumerologyPage(value: unknown): value is NumerologyPage {
  return typeof value === "string" && (NUMEROLOGY_PAGES as readonly string[]).includes(value);
}

export function coerceNumerologyPage(value: unknown): NumerologyPage | undefined {
  if (isNumerologyPage(value)) return value;
  return undefined;
}

export function loadNumerologyPage(): NumerologyPage {
  if (typeof window === "undefined") return "overview";
  try {
    const raw = window.localStorage.getItem(KEY);
    const page = coerceNumerologyPage(raw);
    if (page) return page;
  } catch {
    /* ignore */
  }
  return "overview";
}

export function saveNumerologyPage(page: NumerologyPage) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, page);
  } catch {
    /* quota */
  }
}
