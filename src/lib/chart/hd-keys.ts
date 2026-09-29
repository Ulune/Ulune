/**
 * The five keys of a bodygraph and its Incarnation Cross, in the order Human
 * Design reads them: the cards above the chart and the table's Keys part.
 */
import {
  hdAngleLabel,
  hdAuthorityLabel,
  hdDefinitionLabel,
  hdFactLabel,
  hdStrategyLabel,
  hdTypeLabel,
} from "@/lib/i18n/hd-ui";
import type { AppLocale } from "@/lib/i18n/messages";
import { hdCrossGates, hdCrossOf } from "./hd-cross";
import type { HumanDesignChart } from "./human-design";

export type HdKey = "type" | "strategy" | "authority" | "profile" | "definition" | "cross";

export type HdKeyRow = {
  key: HdKey;
  label: string;
  value: string;
  /** The cross's angle (Right Angle, Juxtaposition, Left Angle). */
  sub?: string;
  /** Without a birth time: it could differ at another hour of that day. */
  uncertain: boolean;
};

export function hdKeyRows(chart: HumanDesignChart, locale: AppLocale): HdKeyRow[] {
  const maybe = (key: HdKey) => chart.uncertain?.keys.includes(key) ?? false;
  const rows: HdKeyRow[] = [
    { key: "type", label: hdFactLabel(locale, "type"), value: hdTypeLabel(locale, chart.type), uncertain: maybe("type") },
    { key: "strategy", label: hdFactLabel(locale, "strategy"), value: hdStrategyLabel(locale, chart.strategy), uncertain: maybe("strategy") },
    { key: "authority", label: hdFactLabel(locale, "authority"), value: hdAuthorityLabel(locale, chart.authority), uncertain: maybe("authority") },
    { key: "profile", label: hdFactLabel(locale, "profile"), value: chart.profile, uncertain: maybe("profile") },
    { key: "definition", label: hdFactLabel(locale, "definition"), value: hdDefinitionLabel(locale, chart.definition), uncertain: maybe("definition") },
  ];
  const cross = hdCrossOf(chart);
  if (cross) {
    rows.push({
      key: "cross",
      label: hdFactLabel(locale, "cross"),
      value: hdCrossGates(cross),
      sub: cross.angle ? hdAngleLabel(locale, cross.angle) : undefined,
      uncertain: maybe("cross"),
    });
  }
  return rows;
}

