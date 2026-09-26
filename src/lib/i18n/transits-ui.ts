import { localizedColumns } from "./columns";
import type { AppLocale } from "./messages";
import source from "./transits-ui.json" with { type: "json" };
import { pick } from "./pick";

export const TRANSITS_UI = source;


export function transitClockLabel(locale: AppLocale, key: "now" | "date" | "time"): string {
  return pick(source.clock[key], locale);
}

export function transitReadingEmpty(locale: AppLocale): string {
  return pick(source.readingEmpty, locale);
}

export function transitNoNatal(locale: AppLocale): string {
  return pick(source.noNatal, locale);
}

export const TRANSIT_TABLE_COLUMN_KEYS = ["transit", "aspect", "natal", "a", "s", "exact"] as const;

export function transitTableColumns(locale: AppLocale): readonly string[] {
  return localizedColumns(source.table.columns, locale, TRANSIT_TABLE_COLUMN_KEYS.length);
}

export function transitTableEmpty(locale: AppLocale): string {
  return pick(source.table.empty, locale);
}

export function transitApplyingTitle(locale: AppLocale): string {
  return pick(source.table.applying, locale);
}

export function transitSeparatingTitle(locale: AppLocale): string {
  return pick(source.table.separating, locale);
}
