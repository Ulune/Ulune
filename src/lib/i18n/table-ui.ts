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
