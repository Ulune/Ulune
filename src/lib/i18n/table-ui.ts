import type { AppLocale } from "./messages";
import { pick } from "./pick";
import source from "./table-ui.json" with { type: "json" };

/** The table page's words (loaded with the table, not with the first page). */
export type TablePartId = keyof typeof source.parts;
export type PointsWord = keyof typeof source.points;

export function tablePartLabel(locale: AppLocale, id: TablePartId): string {
  return pick(source.parts[id], locale);
}

export function tablePartHint(locale: AppLocale, id: TablePartId): string {
  return pick(source.hints[id], locale);
}

export function tableBarText(locale: AppLocale, key: keyof typeof source.bar, vars?: Record<string, string>): string {
  let text = pick(source.bar[key], locale);
  for (const [k, v] of Object.entries(vars ?? {})) text = text.replace(`{${k}}`, v);
  return text;
}

export function pointsText(locale: AppLocale, key: PointsWord): string {
  return pick(source.points[key], locale);
}

function fill(text: string, vars?: Record<string, string>): string {
  let out = text;
  for (const [k, v] of Object.entries(vars ?? {})) out = out.replace(`{${k}}`, v);
  return out;
}

export function chartFactText(locale: AppLocale, key: keyof typeof source.chart, vars?: Record<string, string>): string {
  return fill(pick(source.chart[key], locale), vars);
}

export function moonPhaseName(locale: AppLocale, id: keyof typeof source.phases): string {
  return pick(source.phases[id], locale);
}

export function pointsGroupLabel(locale: AppLocale, id: keyof typeof source.groups): string {
  return pick(source.groups[id], locale);
}

export function pointsWord(locale: AppLocale, key: PointsWord, vars?: Record<string, string>): string {
  return fill(pick(source.points[key], locale), vars);
}

export function angleShort(locale: AppLocale, id: keyof typeof source.angleShort): string {
  return pick(source.angleShort[id], locale);
}

export function unknownTimeNote(locale: AppLocale, key: keyof typeof source.unknown): string {
  return pick(source.unknown[key], locale);
}

export function housesWord(locale: AppLocale, key: keyof typeof source.houses, vars?: Record<string, string>): string {
  return fill(pick(source.houses[key], locale), vars);
}

export function aspectsWord(locale: AppLocale, key: keyof typeof source.aspects, vars?: Record<string, string>): string {
  return fill(pick(source.aspects[key], locale), vars);
}

export function gridWord(locale: AppLocale, key: keyof typeof source.grid): string {
  return pick(source.grid[key], locale);
}
