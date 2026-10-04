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
import { hdCrossName } from "./hd-cross-names";
import { hdArrowsOf } from "./hd-variable";
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
      // Its name (review 3 Oct, H3): "Right Angle Cross of Eden 1".
      sub: hdCrossName(cross, locale) ?? (cross.angle ? hdAngleLabel(locale, cross.angle) : undefined),
      uncertain: maybe("cross"),
    });
  }
  return rows;
}


/** Each type's signature and not-self theme, as Human Design names them. */
const SIGNATURE: Record<HumanDesignChart["type"], { en: [string, string]; fr: [string, string] }> = {
  Generator: { en: ["Satisfaction", "Frustration"], fr: ["Satisfaction", "Frustration"] },
  "Manifesting Generator": { en: ["Satisfaction", "Frustration and anger"], fr: ["Satisfaction", "Frustration et colère"] },
  Manifestor: { en: ["Peace", "Anger"], fr: ["Paix", "Colère"] },
  Projector: { en: ["Success", "Bitterness"], fr: ["Succès", "Amertume"] },
  Reflector: { en: ["Surprise", "Disappointment"], fr: ["Surprise", "Déception"] },
};

export type HdKeyExtra = { key: "signature" | "variable"; label: string; value: string; sub?: string; uncertain: boolean; ref: string };

/**
 * The Keys table's two more lines (review 3 Oct, H3): the signature and the
 * not-self theme of the type, and the Variable's four arrows ("PLR DLL",
 * the Personality's then the Design's, the Sun's arrow first), with a birth time.
 */
export function hdKeyExtraRows(chart: HumanDesignChart, locale: AppLocale): HdKeyExtra[] {
  const fr = locale === "fr";
  const sig = SIGNATURE[chart.type];
  const rows: HdKeyExtra[] = [];
  if (sig) {
    const [good, not] = fr ? sig.fr : sig.en;
    rows.push({
      key: "signature",
      label: fr ? "Signature · non-soi" : "Signature · not-self",
      value: `${good} · ${not}`,
      uncertain: chart.uncertain?.keys.includes("type") ?? false,
      ref: "hello:type",
    });
  }
  const arrows = hdArrowsOf(chart);
  const side = (id: string) => {
    const a = arrows.find((x) => x.id === id);
    return a ? (a.left ? "L" : "R") : "";
  };
  const p = `${side("motivation")}${side("perspective")}`;
  const d = `${side("determination")}${side("environment")}`;
  if (p.length === 2 && d.length === 2) {
    rows.push({
      key: "variable",
      label: fr ? "Variable" : "Variable",
      value: `P${p} D${d}`,
      sub: fr ? "Personnalité : motivation, perspective · Design : détermination, environnement" : "Personality: motivation, perspective · Design: determination, environment",
      uncertain: arrows.some((a) => !a.steady),
      ref: "act:personality:sun",
    });
  }
  return rows;
}
