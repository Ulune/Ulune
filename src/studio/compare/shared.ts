import type { NatalChart } from "@/lib/chart/types";
import { importWithRetry } from "@/lib/lazy-retry";
import type { AppLocale } from "@/lib/i18n/messages";
import type { compareWords } from "@/lib/i18n/catalog/compare-words";
import { languageOf, type LanguageId } from "@/studio/map";
import type { StudioPage } from "@/studio/url";

/*
 * What they share (share and compare plan, idea B9): in Compare, a short list
 * of what the two charts have in common on the page shown, in its language:
 * the same Sun, Moon or Ascendant sign and planets in the same sign; the same
 * Human Design type, authority, profile, channels and gates; the same core
 * numbers; the same animals, Day Master, pillars, Kua or group. Each item
 * names the element in both charts (its id in each: a count's own ids may
 * differ), so a press chooses it in both. Worked out on the device from what
 * each pane already holds; each language's part is its own small download
 * (shared-*.ts), fetched with its page's Compare.
 */

/** One chart's side: its natal chart, its page's data (modes/data.tsx), its birth's yin or yang count. */
export type SharedSide = { chart: NatalChart; data: unknown; count?: "yang" | "yin" };

export type SharedItem = {
  key: string;
  label: string;
  /** The element in each chart. */
  ids: { a: string; b: string };
};

export type SharedSay = (key: keyof typeof compareWords, vars?: Record<string, string | number>) => string;

export type SharedFamily = {
  sharedItems: (page: StudioPage, a: SharedSide, b: SharedSide, locale: AppLocale, say: SharedSay) => SharedItem[];
};

const LOADERS: Record<LanguageId, () => Promise<SharedFamily>> = {
  astrology: () => import("@/studio/compare/shared-astro"),
  "human-design": () => import("@/studio/compare/shared-hd"),
  numerology: () => import("@/studio/compare/shared-numerology"),
  "chinese-astrology": () => import("@/studio/compare/shared-zodiac"),
  bazi: () => import("@/studio/compare/shared-bazi"),
  "feng-shui": () => import("@/studio/compare/shared-fengshui"),
};

/** The code that finds what the two share on this page (null on a page without a language). */
export function loadShared(page: StudioPage): Promise<SharedFamily> | null {
  const lang = languageOf(page);
  return lang ? importWithRetry(LOADERS[lang]) : null;
}

/** The same element in both charts. */
export const both = (key: string, label: string, id: string): SharedItem => ({ key, label, ids: { a: id, b: id } });
