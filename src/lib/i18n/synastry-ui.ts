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

export function synastryTableEmpty(locale: AppLocale): string {
  return pick(source.table.empty, locale);
}
