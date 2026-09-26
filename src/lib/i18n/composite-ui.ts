import { localizedColumns } from "./columns";
import type { AppLocale } from "./messages";
import source from "./composite-ui.json" with { type: "json" };
import { pick } from "./pick";

export const COMPOSITE_UI = source;


export function compositeMethodLabel(locale: AppLocale): string {
  return pick(source.method, locale);
}

export function compositeAddSecond(locale: AppLocale): string {
  return pick(source.addSecond, locale);
}

export function compositeReadingEmpty(locale: AppLocale): string {
  return pick(source.readingEmpty, locale);
}

export function compositeNoNatal(locale: AppLocale): string {
  return pick(source.noNatal, locale);
}

export function compositeMixedHouses(locale: AppLocale, a: string, b: string): string {
  return pick(source.mixedHouses, locale).replaceAll("{a}", a).replaceAll("{b}", b);
}

export function compositePairLabel(locale: AppLocale, who: "a" | "b"): string {
  return pick(source.pair[who], locale);
}

export const COMPOSITE_TABLE_COLUMN_KEYS = ["a", "aspect", "b", "orb"] as const;

export function compositeTableColumns(locale: AppLocale): readonly string[] {
  return localizedColumns(source.table.columns, locale, COMPOSITE_TABLE_COLUMN_KEYS.length);
}

export function compositeTableEmpty(locale: AppLocale): string {
  return pick(source.table.empty, locale);
}

export function compositeTableTitle(locale: AppLocale): string {
  return pick(source.table.title, locale);
}

export function compositeTableHint(locale: AppLocale): string {
  return pick(source.table.hint, locale);
}
