import { localizedColumns } from "./columns";
import type { AppLocale } from "./messages";
import source from "./numerology-ui.json" with { type: "json" };
import { pick } from "./pick";

export const NUMEROLOGY_UI = source;

export function numerologySystemLabel(locale: AppLocale): string {
  return pick(source.system, locale);
}

export function numerologyReadingEmpty(locale: AppLocale): string {
  return pick(source.readingEmpty, locale);
}

export function numerologyNoNatal(locale: AppLocale): string {
  return pick(source.noNatal, locale);
}

export function numerologyMissingMark(locale: AppLocale): string {
  return pick(source.missing, locale);
}

export const NUMEROLOGY_TABLE_COLUMN_KEYS = ["number", "digit", "from"] as const;

export function numerologyTableColumns(locale: AppLocale): readonly string[] {
  return localizedColumns(source.table.columns, locale, NUMEROLOGY_TABLE_COLUMN_KEYS.length);
}

export function numerologyTableTitle(locale: AppLocale): string {
  return pick(source.table.title, locale);
}

export function numerologyTableHint(locale: AppLocale): string {
  return pick(source.table.hint, locale);
}

export type NumerologyFromId = "birthday" | "personality" | "maturity" | "personalYear";

export function numerologyFromLabel(locale: AppLocale, id: NumerologyFromId, year?: number): string {
  const raw = pick(source.table.from[id], locale);
  return raw.replaceAll("{year}", String(year ?? ""));
}

export type NumerologyCoreId =
  | "lifepath"
  | "expression"
  | "soulurge"
  | "personality"
  | "birthday"
  | "maturity"
  | "personalYear";

export function numerologyCoreLabel(locale: AppLocale, id: NumerologyCoreId): string {
  return pick(source.cores[id], locale);
}

export type NumerologyWheelKey = keyof typeof source.wheel;

/** The numerology wheel's words (part 60), with {placeholders} filled. */
export function numerologyWheelText(
  locale: AppLocale,
  key: NumerologyWheelKey,
  vars?: Record<string, string | number>,
): string {
  let text = pick(source.wheel[key], locale);
  for (const [k, v] of Object.entries(vars ?? {})) text = text.replaceAll(`{${k}}`, String(v));
  return text;
}
