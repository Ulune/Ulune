import type { AppLocale } from "./messages";
import source from "./transits-ui.json" with { type: "json" };
import { pick } from "./pick";

export const TRANSITS_UI = source;

export function transitClockLabel(locale: AppLocale, key: "now" | "date" | "time" | "pick"): string {
  return pick(source.clock[key], locale);
}

export function transitReadingEmpty(locale: AppLocale): string {
  return pick(source.readingEmpty, locale);
}

export function transitNoNatal(locale: AppLocale): string {
  return pick(source.noNatal, locale);
}

export function transitTableEmpty(locale: AppLocale): string {
  return pick(source.table.empty, locale);
}
