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
