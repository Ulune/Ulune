import type { TimingScope } from "@/lib/chart/transit-exact";
import { localizedColumns } from "./columns";
import type { AppLocale } from "./messages";
import source from "./timing-ui.json" with { type: "json" };
import { pick } from "./pick";

export const TIMING_UI = source;


export function timingScopeLabel(locale: AppLocale, scope: TimingScope): string {
  return pick(source.scope[scope], locale);
}

export function timingReadingEmpty(locale: AppLocale): string {
  return pick(source.readingEmpty, locale);
}

export function timingNoNatal(locale: AppLocale): string {
  return pick(source.noNatal, locale);
}

export function timingCasting(locale: AppLocale): string {
  return pick(source.casting, locale);
}

export const TIMING_TABLE_COLUMN_KEYS = ["when", "transit", "aspect", "natal", "a", "s"] as const;

export function timingTableColumns(locale: AppLocale): readonly string[] {
  return localizedColumns(source.table.columns, locale, TIMING_TABLE_COLUMN_KEYS.length);
}

export function timingTableEmpty(locale: AppLocale, scope: TimingScope): string {
  return pick(source.table.empty[scope], locale);
}

export function timingTableTitle(locale: AppLocale): string {
  return pick(source.table.title, locale);
}

export function timingTableHint(locale: AppLocale): string {
  return pick(source.table.hint, locale);
}

export function timingApplyingTitle(locale: AppLocale): string {
  return pick(source.table.applying, locale);
}

export function timingSeparatingTitle(locale: AppLocale): string {
  return pick(source.table.separating, locale);
}
