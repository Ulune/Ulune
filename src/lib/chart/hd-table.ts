/**
 * The Human Design table's rows (part 52 of the launch plan): the five keys
 * and the Incarnation Cross, the activations, the defined channels and the
 * nine centres with the gates activated in each. The page, its Copy
 * buttons and the CSV read from here (the keys from hd-keys.ts, as the cards
 * above the chart).
 */
import type { AppLocale } from "@/lib/i18n/messages";
import { hdBodyLabel, hdCenterLabel, hdGraphText, hdLayerLabel, hdUnknownText } from "@/lib/i18n/hd-ui";
import { modesWord } from "@/lib/i18n/table-ui";
import { hdCrossGates, hdCrossOf } from "./hd-cross";
import { hdKeyRows, type HdKey } from "./hd-keys";
import { hdActId, hdColumnRows } from "./hd-rows";
import { graphForView, HD_CENTER_IDS, HD_CHANNELS, HD_GATE_CENTER, type HdActivation, type HdCenterId, type HdView, type HumanDesignChart } from "./human-design";

/** The activations of the layers the view shows: the Personality, then the Design. */
export function hdActivationRows(chart: HumanDesignChart, view: HdView): HdActivation[] {
  const layers = view === "both" ? (["personality", "design"] as const) : ([view] as const);
  return layers.flatMap((layer) => hdColumnRows(chart, layer));
}

export type HdCentreRow = {
  id: HdCenterId;
  defined: boolean;
  /** The gates activated in it, in order. */
  gates: number[];
  /** Without a birth time: a gate in it, or a channel to it, could differ at another hour. */
  uncertain: boolean;
};

/** The nine centres from the head down, defined or open, with their activated gates. */
export function hdCentreRows(chart: HumanDesignChart, view: HdView): HdCentreRow[] {
  const graph = graphForView(chart, view);
  const unsureGates = new Set(
    graph.activations.filter((a) => chart.uncertain?.rows.includes(hdActId(a.layer, a.body))).map((a) => a.gate),
  );
  // A channel that could be defined or not at another hour could open or close either of its centres.
  const unsureChannels = HD_CHANNELS.filter((ch) => chart.uncertain?.channels.includes(ch.id));
  return HD_CENTER_IDS.map((id) => {
    const gates = [...graph.gates].filter((g) => HD_GATE_CENTER[g] === id).sort((x, y) => x - y);
    const touched = gates.some((g) => unsureGates.has(g)) || unsureChannels.some((ch) => ch.centers.includes(id));
    return { id, defined: graph.centers.includes(id), gates, uncertain: Boolean(chart.uncertain) && touched };
  });
}

export type HdNamesLike = { gate: (n: number) => string | undefined; channel: (id: string) => string | undefined } | null;

type TextPart = { id: string; lines: string[] };

const mark = (on: boolean) => (on ? "~" : "");

/** The table as text, part by part. */
export function hdTextParts(chart: HumanDesignChart, view: HdView, locale: AppLocale, names: HdNamesLike = null, who = ""): TextPart[] {
  const keys: string[] = [modesWord(locale, "partKeys")];
  if (who) keys.push(modesWord(locale, "designHead", { name: who }));
  if (chart.uncertain) keys.push(hdUnknownText(locale, "line"));
  const colon = locale === "fr" ? "\u202f: " : ": ";
  for (const k of hdKeyRows(chart, locale)) keys.push(`${k.label}${colon}${mark(k.uncertain)}${k.sub ? `${k.sub} · ` : ""}${k.value}`);

  const graph = graphForView(chart, view);
  const acts: string[] = [modesWord(locale, "partActivations")];
  for (const row of hdActivationRows(chart, view)) {
    const centre = HD_GATE_CENTER[row.gate];
    const channels = graph.channels.filter((ch) => ch.gates.includes(row.gate)).map((ch) => ch.id);
    const gateName = names?.gate(row.gate);
    const bits = [
      `${hdLayerLabel(locale, row.layer)} · ${hdBodyLabel(locale, row.body)}`,
      `${mark(chart.uncertain?.rows.includes(hdActId(row.layer, row.body)) ?? false)}${row.gate}.${row.line}${gateName ? ` ${gateName}` : ""}`,
    ];
    if (centre) bits.push(hdCenterLabel(locale, centre));
    if (channels.length) bits.push(modesWord(locale, channels.length > 1 ? "channelsOf" : "channelOf", { list: channels.join(", ") }));
    acts.push(bits.join(" · "));
  }

  const chans: string[] = [modesWord(locale, "partChannels")];
  for (const ch of graph.channels) {
    const name = names?.channel(ch.id);
    chans.push(
      [
        `${mark(chart.uncertain?.channels.includes(ch.id) ?? false)}${ch.id}${name ? ` ${name}` : ""}`,
        `${hdCenterLabel(locale, ch.centers[0])} · ${hdCenterLabel(locale, ch.centers[1])}`,
      ].join(" · "),
    );
  }

  const centres: string[] = [modesWord(locale, "partCentres")];
  for (const c of hdCentreRows(chart, view)) {
    centres.push(
      `${hdCenterLabel(locale, c.id)}${colon}${mark(c.uncertain)}${hdGraphText(locale, c.defined ? "defined" : "open")} · ${
        c.gates.length ? modesWord(locale, "gatesIn", { list: c.gates.join(", ") }) : modesWord(locale, "noGates")
      }`,
    );
  }
  return [
    { id: "keys", lines: keys },
    { id: "activations", lines: acts },
    { id: "channels", lines: chans },
    { id: "centres", lines: centres },
  ];
}

const bit = (x: boolean | null | undefined) => (x ? "1" : "0");

function csvEscape(value: string): string {
  return /[",\n;]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function hdTableCsv(chart: HumanDesignChart, view: HdView): string {
  const rows: string[][] = [["section", "field", "value"]];
  rows.push(["design", "personalityUtc", chart.personalityUtc]);
  rows.push(["design", "designUtc", chart.designUtc]);
  rows.push(["design", "view", view]);
  rows.push(["design", "timeUnknown", bit(Boolean(chart.uncertain))]);
  rows.push([]);
  rows.push(["key", "id", "value", "uncertain"]);
  const maybe = (key: HdKey) => bit(chart.uncertain?.keys.includes(key));
  rows.push(["key", "type", chart.type, maybe("type")]);
  rows.push(["key", "strategy", chart.strategy, maybe("strategy")]);
  rows.push(["key", "authority", chart.authority, maybe("authority")]);
  rows.push(["key", "profile", chart.profile, maybe("profile")]);
  rows.push(["key", "definition", chart.definition, maybe("definition")]);
  const cross = hdCrossOf(chart);
  if (cross) {
    rows.push(["key", "cross", hdCrossGates(cross), maybe("cross")]);
    if (cross.angle) rows.push(["key", "crossAngle", cross.angle, maybe("cross")]);
  }
  rows.push([]);
  const graph = graphForView(chart, view);
  rows.push(["activation", "layer", "body", "gate", "line", "longitude", "centre", "channels", "uncertain"]);
  for (const row of hdActivationRows(chart, view)) {
    rows.push([
      "activation",
      row.layer,
      row.body,
      String(row.gate),
      String(row.line),
      row.ecliptic.toFixed(6),
      HD_GATE_CENTER[row.gate] ?? "",
      graph.channels.filter((ch) => ch.gates.includes(row.gate)).map((ch) => ch.id).join("|"),
      bit(chart.uncertain?.rows.includes(hdActId(row.layer, row.body))),
    ]);
  }
  rows.push([]);
  rows.push(["channel", "id", "gates", "centres", "personality", "design", "mixed", "uncertain"]);
  for (const ch of graph.channels) {
    rows.push(["channel", ch.id, ch.gates.join("|"), ch.centers.join("|"), bit(ch.personality), bit(ch.design), bit(ch.mixed), bit(chart.uncertain?.channels.includes(ch.id))]);
  }
  rows.push([]);
  rows.push(["centre", "id", "defined", "gates", "uncertain"]);
  for (const c of hdCentreRows(chart, view)) rows.push(["centre", c.id, bit(c.defined), c.gates.join("|"), bit(c.uncertain)]);
  return rows.map((r) => r.map(csvEscape).join(",")).join("\n");
}

export { hdKeyRows };
