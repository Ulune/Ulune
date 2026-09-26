import { localizedColumns } from "./columns";
import type { AppLocale } from "./messages";
import source from "./synastry-ui.json" with { type: "json" };
import { pick } from "./pick";

export const SYNASTRY_UI = source;


export function synastryAddSecond(locale: AppLocale): string {
  return pick(source.addSecond, locale);
}

export function synastryReadingEmpty(locale: AppLocale): string {
  return pick(source.readingEmpty, locale);
}

export function synastryNoNatal(locale: AppLocale): string {
  return pick(source.noNatal, locale);
}

export function synastryPairLabel(locale: AppLocale, who: "a" | "b"): string {
  return pick(source.pair[who], locale);
}

export function synastryLegend(locale: AppLocale, ring: "inner" | "outer"): string {
  return pick(source.legend[ring], locale);
}

export const SYNASTRY_TABLE_COLUMN_KEYS = ["a", "aspect", "b", "orb", "as-a", "as-s"] as const;

export function synastryTableColumns(locale: AppLocale, aName?: string, bName?: string): readonly string[] {
  const cols = [...localizedColumns(source.table.columns, locale, SYNASTRY_TABLE_COLUMN_KEYS.length)];
  cols[0] = aName?.trim() || cols[0] || "A";
  cols[2] = bName?.trim() || cols[2] || "B";
  return cols;
}

export function synastryTableEmpty(locale: AppLocale): string {
  return pick(source.table.empty, locale);
}

export function synastryTableTitle(locale: AppLocale): string {
  return pick(source.table.title, locale);
}

export function synastryTableHint(locale: AppLocale): string {
  return pick(source.table.hint, locale);
}

export function synastryApplyingTitle(locale: AppLocale): string {
  return pick(source.table.applying, locale);
}

export function synastrySeparatingTitle(locale: AppLocale): string {
  return pick(source.table.separating, locale);
}
