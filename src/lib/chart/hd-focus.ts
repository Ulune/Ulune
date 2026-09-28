/**
 * What a selection lights on the bodygraph and in its two columns, and the
 * one line that names a piece (under the chart, on the phone's card, in the
 * keyboard's list).
 */
import { hdActId, hdColumnRows, parseHdActId } from "./hd-rows";
import {
  bodiesOnGate,
  graphForView,
  HD_CHANNELS,
  HD_GATE_CENTER,
  type HdAuthority,
  type HdCenterId,
  type HdView,
  type HumanDesignChart,
} from "./human-design";
import type { AppLocale } from "@/lib/i18n/messages";
import { hdActivationLabel, hdCenterLabel, hdChannelCentersLine, hdGateTitle, hdGraphText } from "@/lib/i18n/hd-ui";

/** Gate and channel names, from the reading pack once it has loaded. */
export type HdNames = { gate: (n: number) => string; channel: (id: string) => string };

const AUTHORITY_CENTER: Partial<Record<HdAuthority, HdCenterId>> = {
  Emotional: "solarPlexus",
  Sacral: "sacral",
  Splenic: "spleen",
  Ego: "heart",
  "Self-Projected": "g",
};

/** The centre an authority speaks from (none for Mental and Lunar). */
export function hdAuthoritySeat(authority: HdAuthority): HdCenterId | null {
  return AUTHORITY_CENTER[authority] ?? null;
}

/**
 * The piece of the chart a selection stands for: a gate, channel or centre
 * as itself, a row of the columns as its gate, the authority as its centre.
 */
export function hdHeroOf(id: string | null, chart: HumanDesignChart): string | null {
  if (!id) return null;
  if (/^(gate|channel|center):/.test(id)) return id;
  const act = parseHdActId(id);
  if (act) {
    const row = chart.activations.find((a) => a.layer === act.layer && a.body === act.body);
    return row ? `gate:${row.gate}` : null;
  }
  if (id === "hello:authority") {
    const c = AUTHORITY_CENTER[chart.authority];
    return c ? `center:${c}` : null;
  }
  return null;
}

/** What stays lit around a piece: a gate's channels and their far gates and its centre; a channel's gates and centres; a centre's gates and channels. */
export function hdLitOf(hero: string | null): Set<string> {
  const out = new Set<string>();
  if (!hero) return out;
  out.add(hero);
  const sep = hero.indexOf(":");
  const kind = hero.slice(0, sep);
  const key = hero.slice(sep + 1);
  if (kind === "gate") {
    const n = Number(key);
    const c = HD_GATE_CENTER[n];
    if (c) out.add(`center:${c}`);
    for (const ch of HD_CHANNELS) {
      if (!ch.gates.includes(n)) continue;
      out.add(`channel:${ch.id}`);
      out.add(`gate:${ch.gates[0] === n ? ch.gates[1] : ch.gates[0]}`);
    }
  } else if (kind === "channel") {
    const ch = HD_CHANNELS.find((c) => c.id === key);
    if (ch) {
      for (const g of ch.gates) out.add(`gate:${g}`);
      for (const c of ch.centers) out.add(`center:${c}`);
    }
  } else if (kind === "center") {
    for (const [g, c] of Object.entries(HD_GATE_CENTER)) if (c === key) out.add(`gate:${g}`);
    for (const ch of HD_CHANNELS) if (ch.centers.includes(key as HdCenterId)) out.add(`channel:${ch.id}`);
  }
  return out;
}

/** The gates a hero stands on: a gate itself, a channel's two, a centre's own. */
function heroGates(hero: string): Set<number> {
  const sep = hero.indexOf(":");
  const kind = hero.slice(0, sep);
  const key = hero.slice(sep + 1);
  if (kind === "gate") return new Set([Number(key)]);
  if (kind === "channel") return new Set(HD_CHANNELS.find((c) => c.id === key)?.gates ?? []);
  if (kind === "center") {
    return new Set(
      Object.entries(HD_GATE_CENTER)
        .filter(([, c]) => c === key)
        .map(([g]) => Number(g)),
    );
  }
  return new Set();
}

/**
 * What a selection (or the pointer) lights: the piece that gets the ring,
 * what stays bright on the chart, and the rows that stay bright in the
 * columns. The profile lights the two Suns; the cross its four gates.
 */
export type HdFocus = { hero: string | null; lit: Set<string>; rows: Set<string> };

export function hdFocusOf(id: string | null, chart: HumanDesignChart): HdFocus | null {
  if (!id) return null;
  const rowsOn = (gates: Set<number>) => {
    const out = new Set<string>();
    for (const layer of ["design", "personality"] as const) {
      for (const row of hdColumnRows(chart, layer)) if (gates.has(row.gate)) out.add(hdActId(layer, row.body));
    }
    return out;
  };
  const hero = hdHeroOf(id, chart);
  if (hero) return { hero, lit: hdLitOf(hero), rows: rowsOn(heroGates(hero)) };
  if (id === "hello:profile" || id === "hello:cross") {
    const bodies = id === "hello:profile" ? (["sun"] as const) : (["sun", "earth"] as const);
    const rows = new Set<string>();
    const lit = new Set<string>();
    for (const layer of ["personality", "design"] as const) {
      for (const body of bodies) {
        const row = chart.activations.find((a) => a.layer === layer && a.body === body);
        if (!row) continue;
        rows.add(hdActId(layer, body));
        lit.add(`gate:${row.gate}`);
      }
    }
    return lit.size ? { hero: null, lit, rows } : null;
  }
  return null;
}

type Names = HdNames;

function gateName(locale: AppLocale, n: number, names: Names | null): string {
  const name = names?.gate(n);
  return name ? `${hdGateTitle(locale, n)} · ${name}` : hdGateTitle(locale, n);
}

function channelName(id: string, names: Names | null): string {
  const name = names?.channel(id);
  return name ? `${id} · ${name}` : id;
}

/**
 * One line naming a piece for the line under the chart and the phone's card:
 * "Gate 34 · Power · Sacral · Personality Venus 34.2"; a row of the columns
 * starts with its body: "Personality Venus 34.2 · Gate 34 · Power · Sacral".
 */
export function hdSay(chart: HumanDesignChart, view: HdView, id: string, locale: AppLocale, names: Names | null): string {
  const act = parseHdActId(id);
  if (act) {
    const row = chart.activations.find((a) => a.layer === act.layer && a.body === act.body);
    if (!row) return "";
    const c = HD_GATE_CENTER[row.gate];
    return [hdActivationLabel(locale, row), gateName(locale, row.gate, names), c ? hdCenterLabel(locale, c) : ""].filter(Boolean).join(" · ");
  }
  const sep = id.indexOf(":");
  const kind = id.slice(0, sep);
  const key = id.slice(sep + 1);
  if (kind === "gate") {
    const n = Number(key);
    const rows = bodiesOnGate(chart, n, view);
    const c = HD_GATE_CENTER[n];
    const acts = rows.length ? rows.map((r) => hdActivationLabel(locale, r)).join(", ") : hdGraphText(locale, "notActivated");
    return [gateName(locale, n, names), c ? hdCenterLabel(locale, c) : "", acts].filter(Boolean).join(" · ");
  }
  if (kind === "channel") {
    const ch = HD_CHANNELS.find((c) => c.id === key);
    if (!ch) return key;
    const graph = graphForView(chart, view);
    const on = graph.channels.some((c) => c.id === key);
    let state = hdGraphText(locale, on ? "channelDefined" : "channelOpen");
    if (!on) {
      const rows = [...bodiesOnGate(chart, ch.gates[0], view), ...bodiesOnGate(chart, ch.gates[1], view)];
      if (rows.length) state = hdGraphText(locale, "channelHalf", { who: rows.map((r) => hdActivationLabel(locale, r)).join(", ") });
    }
    return [channelName(key, names), hdChannelCentersLine(locale, ch.centers[0], ch.centers[1]), state].join(" · ");
  }
  if (kind === "center") {
    const cid = key as HdCenterId;
    const graph = graphForView(chart, view);
    const gates = Object.entries(HD_GATE_CENTER)
      .filter(([, c]) => c === cid)
      .map(([g]) => Number(g));
    const active = gates.filter((g) => graph.gates.has(g)).length;
    return [
      hdCenterLabel(locale, cid),
      hdGraphText(locale, graph.centers.includes(cid) ? "defined" : "open"),
      hdGraphText(locale, "gatesActive", { n: active, m: gates.length }),
    ].join(" · ");
  }
  return "";
}
