import type { AppLocale } from "./messages";
import source from "./numerology-ui.json" with { type: "json" };
import { pick } from "./pick";

export function numerologySystemLabel(locale: AppLocale): string {
  return pick(source.system, locale);
}

export function numerologyNoNatal(locale: AppLocale): string {
  return pick(source.noNatal, locale);
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

function fill(text: string, vars?: Record<string, string | number>): string {
  let out = text;
  for (const [k, v] of Object.entries(vars ?? {})) out = out.replaceAll(`{${k}}`, String(v));
  return out;
}

export type NumerologyWheelKey = keyof typeof source.wheel;

/** The numerology wheel's words (part 60), with {placeholders} filled. */
export function numerologyWheelText(
  locale: AppLocale,
  key: NumerologyWheelKey,
  vars?: Record<string, string | number>,
): string {
  return fill(pick(source.wheel[key], locale), vars);
}

export type NumerologyPageKey = keyof typeof source.page;

/** The numerology table page's words (part 61), with {placeholders} filled. */
export function numerologyPageText(
  locale: AppLocale,
  key: NumerologyPageKey,
  vars?: Record<string, string | number>,
): string {
  return fill(pick(source.page[key], locale), vars);
}
