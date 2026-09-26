import { localizedColumns } from "./columns";
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

export const PROGRESSION_TABLE_COLUMN_KEYS = [
  "progressed",
  "aspect",
  "natal",
  "a",
  "s",
  "exact",
] as const;

export function progressionTableColumns(locale: AppLocale): readonly string[] {
  return localizedColumns(source.table.columns, locale, PROGRESSION_TABLE_COLUMN_KEYS.length);
}

export function progressionTableEmpty(locale: AppLocale): string {
  return pick(source.table.empty, locale);
}

export function progressionTableTitle(locale: AppLocale): string {
  return pick(source.table.title, locale);
}

export function progressionTableHint(locale: AppLocale): string {
  return pick(source.table.hint, locale);
}

export function progressionApplyingTitle(locale: AppLocale): string {
  return pick(source.table.applying, locale);
}

export function progressionSeparatingTitle(locale: AppLocale): string {
  return pick(source.table.separating, locale);
}
