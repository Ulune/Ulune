import type { AppLocale } from "./messages";
import source from "./progressions-ui.json" with { type: "json" };
import { pick } from "./pick";

export const PROGRESSIONS_UI = source;

export function progressionMethodLabel(locale: AppLocale): string {
  return pick(source.method, locale);
}

export function progressionClockLabel(locale: AppLocale, key: "today" | "date"): string {
  return pick(source.clock[key], locale);
}

export function progressionReadingEmpty(locale: AppLocale): string {
  return pick(source.readingEmpty, locale);
}

export function progressionNoNatal(locale: AppLocale): string {
  return pick(source.noNatal, locale);
}

export function progressionTableEmpty(locale: AppLocale): string {
  return pick(source.table.empty, locale);
}
