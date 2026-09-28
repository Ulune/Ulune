import { localizedColumns } from "./columns";
import type { AppLocale } from "./messages";
import type { HdAuthority, HdCenterId, HdDefinition, HdStrategy, HdType, HdView } from "@/lib/chart/human-design";
import source from "./hd-ui.json" with { type: "json" };
import { pick } from "./pick";

export const HD_UI = source;


export function hdReadingEmpty(locale: AppLocale): string {
  return pick(source.readingEmpty, locale);
}

export function hdNoNatal(locale: AppLocale): string {
  return pick(source.noNatal, locale);
}

export function hdCaption(locale: AppLocale, profile: string, definition: HdDefinition): string {
  return pick(source.caption, locale)
    .replaceAll("{profile}", profile)
    .replaceAll("{definition}", pick(source.definition[definition], locale));
}

export function hdEmptyChannels(locale: AppLocale): string {
  return pick(source.emptyChannels, locale);
}

export const HD_TABLE_COLUMN_KEYS = ["channel", "gates", "centers"] as const;

export function hdTableColumns(locale: AppLocale): readonly string[] {
  return localizedColumns(source.table.columns, locale, HD_TABLE_COLUMN_KEYS.length);
}

export function hdViewLabel(locale: AppLocale, view: HdView): string {
  return pick(source.views[view], locale);
}

export function hdTypeLabel(locale: AppLocale, type: HdType): string {
  return pick(source.type[type], locale);
}

export function hdStrategyLabel(locale: AppLocale, strategy: HdStrategy): string {
  return pick(source.strategy[strategy], locale);
}

export function hdAuthorityLabel(locale: AppLocale, authority: HdAuthority): string {
  return pick(source.authority[authority], locale);
}

export function hdDefinitionLabel(locale: AppLocale, definition: string): string {
  const row = (source.definition as Record<string, { en: string; fr: string }>)[definition];
  return row ? pick(row, locale) : definition;
}

export function hdCenterLabel(locale: AppLocale, id: HdCenterId): string {
  return pick(source.center[id], locale);
}

export function hdGateTitle(locale: AppLocale, n: number): string {
  return pick(source.kind.gate, locale).replaceAll("{n}", String(n));
}

export function hdChannelCentersLine(locale: AppLocale, a: HdCenterId, b: HdCenterId): string {
  return pick(source.copy.channelCenters, locale)
    .replaceAll("{a}", hdCenterLabel(locale, a))
    .replaceAll("{b}", hdCenterLabel(locale, b));
}

export function hdCenterState(locale: AppLocale, defined: boolean): string {
  return pick(defined ? source.copy.centerDefined : source.copy.centerOpen, locale);
}

export function hdLayerLabel(locale: AppLocale, layer: "personality" | "design"): string {
  return pick(source.copy[layer], locale);
}

export type HdBodyKey = keyof typeof source.bodies;

/** A Human Design body's name (Sun, Earth, the Nodes, the Moon, Mercury to Pluto). */
export function hdBodyLabel(locale: AppLocale, body: string): string {
  const row = (source.bodies as Record<string, { en: string; fr: string }>)[body];
  return row ? pick(row, locale) : body;
}

type GraphKey = keyof typeof source.graph;

/** The bodygraph's own words (hint, keyboard list, caption line), with {placeholders} filled. */
export function hdGraphText(locale: AppLocale, key: GraphKey, vars: Record<string, string | number> = {}): string {
  let s = pick(source.graph[key], locale);
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

/** "Personality Venus 34.2" (EN) or "Vénus (Personnalité) 34.2" (FR). */
export function hdActivationLabel(
  locale: AppLocale,
  row: { layer: "personality" | "design"; body: string; gate: number; line: number },
): string {
  return hdGraphText(locale, "activation", {
    layer: hdLayerLabel(locale, row.layer),
    body: hdBodyLabel(locale, row.body),
    gate: row.gate,
    line: row.line,
  });
}
