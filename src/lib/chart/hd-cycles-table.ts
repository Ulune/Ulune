/*
 * Human Design's Cycles as a table (share and compare plan, feature 5b;
 * studio/tables/hd-cycles-table.tsx draws it): the moment's thirteen bodies
 * with their gates and what each meets in your chart; the channels the
 * moment completes with your gates, then those it defines on its own; the
 * nine centres in your chart and under the moment; every exact passage of
 * the life cycles; the year's solar return. As text for Copy, and as CSV
 * with ids, each part a section of its own (its header's first cell names
 * it, so a part's Copy finds its table). Pure: the words come in (the page's
 * book, the reading pack's names); tested in scripts/hd-cycles.test.mjs.
 */
import { HD_CENTER_IDS, HD_GATE_CENTER, type HdCenterId } from "./human-design";
import { ageAt, cycleStatus, LIFE_CYCLES, type HdCyclesContext, type LifeCycleId } from "./hd-cycles";
import { hdTransit, type HdTransit } from "./hd-transit";
import type { HdPairChannel } from "./hd-pair";
import { hdActivationLabel, hdBodyLabel, hdCenterLabel, hdCentreStateWord, hdGateTitle } from "@/lib/i18n/hd-ui";
import type { AppLocale } from "@/lib/i18n/messages";
import type { HdCyclesWordKey } from "@/lib/i18n/catalog/hd-cycles-words";
import { dateFormat } from "@/lib/intl-cache";

/** The page's words (its book, through bookT). */
export type HdCyclesSay = (key: HdCyclesWordKey, vars?: Record<string, string | number>) => string;
/** Gate and channel names, from the reading pack once it has loaded. */
export type HdCyclesNamesOf = { gate: (n: number) => string; channel: (id: string) => string } | null;

const cell = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);
const tag = (locale: AppLocale) => (locale === "fr" ? "fr-FR" : "en-GB");
const upper = (s: string) => (s ? s.charAt(0).toLocaleUpperCase() + s.slice(1) : s);

/** The life cycles' names, by the book's keys. */
export const CYCLE_WORD: Record<LifeCycleId, HdCyclesWordKey> = {
  saturn1: "hdcLifeSaturn1",
  uranus: "hdcLifeUranus",
  chiron: "hdcLifeChiron",
  saturn2: "hdcLifeSaturn2",
};

/** The bodygraph under the moment, or under an empty sky while the moment is on its way. */
export const transitOrEmpty = (ctx: HdCyclesContext): HdTransit => ctx.transit ?? hdTransit(ctx.hd, { at: ctx.at, rows: [] });

/** The channels the table lists: those the moment completes with your gates, then those it defines on its own. */
export function tableChannels(t: HdTransit): HdPairChannel[] {
  return [...t.completes, ...t.field.filter((ch) => !t.completes.includes(ch))];
}

/** A channel's place now, in a word. */
export function channelStateWord(ch: HdPairChannel, w: HdCyclesSay): string {
  if (ch.kind === "electromagnetic") return w("hdcStateTemporary");
  if (ch.lead === "b") return w("hdcStateOwn");
  if (ch.a.whole) return w("hdcStateYours");
  return w("hdcStateOpen");
}

/** A centre now, in words. */
export function centreNowWord(t: HdTransit, c: HdCenterId, w: HdCyclesSay): string {
  const by = t.pair.centres.find((x) => x.id === c)?.by ?? null;
  if (by === "a" || by === "both") return w("hdcCentreDefined");
  if (by === "b") return w("hdcCentreMoment");
  if (by === "together") return w("hdcCentreTogether");
  return w("hdcCentreOpen");
}

/** A centre in your own chart: defined, undefined (some gates) or open. */
export function centreOwnWord(t: HdTransit, c: HdCenterId, locale: AppLocale): string {
  const centre = t.pair.centres.find((x) => x.id === c)!;
  const active = Object.entries(HD_GATE_CENTER).filter(([g, at]) => at === c && t.pair.gates.a.has(Number(g))).length;
  return hdCentreStateWord(locale, centre.a, active);
}

/** The moment's bodies on a gate: "Mars 20.3 ℞". */
export function bodiesCell(t: HdTransit, gate: number, locale: AppLocale): string {
  return t.moment.rows
    .filter((r) => r.gate === gate)
    .map((r) => `${upper(hdBodyLabel(locale, r.body))} ${r.gate}.${r.line}${r.retrograde ? " ℞" : ""}`)
    .join(", ");
}

/** Your rows on a gate: "Personality Venus 34.2". */
export function actsCell(ctx: HdCyclesContext, gate: number, locale: AppLocale): string {
  return ctx.hd.activations
    .filter((a) => a.gate === gate)
    .map((a) => hdActivationLabel(locale, a))
    .join(", ");
}

/** "23 Jan 2020", in the birthplace's time. */
export const cycleDate = (ms: number, ctx: Pick<HdCyclesContext, "zone">, locale: AppLocale) =>
  dateFormat(tag(locale), { day: "numeric", month: "short", year: "numeric", timeZone: ctx.zone }).format(ms);
/** "15 Jun 2026, 04:53", in the birthplace's time. */
export const cycleDateTime = (ms: number, ctx: Pick<HdCyclesContext, "zone">, locale: AppLocale) =>
  `${cycleDate(ms, ctx, locale)}, ${dateFormat(tag(locale), { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: ctx.zone }).format(ms)}`;
/** The moment on the dial, in its clock: "Sat 18 Oct, 07:58". */
export const momentWhen = (ctx: Pick<HdCyclesContext, "at" | "clock">, locale: AppLocale) =>
  `${dateFormat(tag(locale), { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: ctx.clock }).format(ctx.at)}, ${dateFormat(tag(locale), { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: ctx.clock }).format(ctx.at)}`;

const statusWord = (s: "past" | "now" | "coming" | null, w: HdCyclesSay) => (s === "past" ? w("hdcPast") : s === "now" ? w("hdcNow") : s === "coming" ? w("hdcComing") : "");

export function hdCyclesTextParts(ctx: HdCyclesContext, locale: AppLocale, w: HdCyclesSay, names: HdCyclesNamesOf): { id: string; lines: string[] }[] {
  const colon = locale === "fr" ? "\u202f: " : ": ";
  const t = transitOrEmpty(ctx);
  const channelName = (id: string) => {
    const n = names?.channel(id);
    return n ? `${id} · ${n}` : id;
  };
  const gateName = (g: number) => {
    const n = names?.gate(g);
    return n ? `${hdGateTitle(locale, g)} · ${n}` : hdGateTitle(locale, g);
  };
  const moment = t.moment.rows.map((r) => {
    const centre = HD_GATE_CENTER[r.gate];
    const mine = actsCell(ctx, r.gate, locale);
    const completes = t.completes.filter((ch) => ch.b.gates.includes(r.gate)).map((ch) => ch.id);
    return [
      `${upper(hdBodyLabel(locale, r.body))} ${r.gate}.${r.line}${r.retrograde ? " ℞" : ""}`,
      gateName(r.gate),
      centre ? hdCenterLabel(locale, centre) : "",
      mine ? `${w("hdcColYours")}${colon}${mine}` : "",
      completes.length ? `${w("hdcColCompletes")}${colon}${completes.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join(" · ");
  });
  const channels = tableChannels(t).map((ch) => {
    const mine = ch.a.gates.map((g) => hdGateTitle(locale, g)).join(", ") || "—";
    const theirs = ch.b.gates.map((g) => `${hdGateTitle(locale, g)} (${bodiesCell(t, g, locale)})`).join(", ") || "—";
    return `${channelName(ch.id)} · ${channelStateWord(ch, w)} · ${w("hdcColYourGate")}${colon}${mine} · ${w("hdcColMomentGate")}${colon}${theirs}`;
  });
  const life: string[] = [];
  for (const def of LIFE_CYCLES) {
    const c = ctx.cycles?.find((x) => x.id === def.id);
    if (!c) continue;
    const status = statusWord(cycleStatus(c, ctx.at), w);
    if (!c.passages.length) life.push(`${w(CYCLE_WORD[def.id])} · ${c.beyond ? w("hdcLifeBeyond") : w("hdcLifeNone")}`);
    for (const p of c.passages) {
      life.push(
        [w(CYCLE_WORD[def.id]), cycleDate(p.at, ctx, locale), p.retrograde ? w("hdcRetrograde") : w("hdcDirect"), w("hdcAgeAt", { n: ageAt(ctx.birth, p.at).years }), `${hdGateTitle(locale, c.gate.gate)}.${c.gate.line}`, status]
          .filter(Boolean)
          .join(" · "),
      );
    }
  }
  const solar: string[] = [];
  if (ctx.solar) {
    const sun = ctx.hd.activations.find((a) => a.layer === "personality" && a.body === "sun");
    const earth = ctx.hd.activations.find((a) => a.layer === "personality" && a.body === "earth");
    const when = ctx.solar.at == null ? w("hdcSolarNone") : ctx.timeUnknown ? cycleDate(ctx.solar.at, ctx, locale) : cycleDateTime(ctx.solar.at, ctx, locale);
    solar.push(`${w("hdcStepSolar", { year: ctx.solar.year })}${colon}${when}`);
    if (sun && earth) solar.push(w("hdcSolarSunEarth", { sun: `${sun.gate}.${sun.line}`, earth: `${earth.gate}.${earth.line}` }));
    for (const ch of ctx.solar.transit?.completes ?? []) solar.push(`${channelName(ch.id)} · ${w("hdcStateTemporary")}`);
  }
  return [
    { id: "moment", lines: [`${ctx.name} · ${w("hdcPartMoment")} · ${momentWhen(ctx, locale)}`, ...moment] },
    { id: "channels", lines: [w("hdcPartChannels"), ...(channels.length ? channels : [w("hdcCompletesNone")])] },
    {
      id: "centres",
      lines: [w("hdcPartCentres"), ...HD_CENTER_IDS.map((c) => `${hdCenterLabel(locale, c)}${colon}${centreOwnWord(t, c, locale)} · ${centreNowWord(t, c, w)}`)],
    },
    { id: "life", lines: [w("hdcPartLife"), ...(life.length ? life : [w("hdcWorking")])] },
    { id: "solar", lines: [w("hdcPartSolar"), ...solar] },
  ];
}

export function hdCyclesTableCsv(ctx: HdCyclesContext): string {
  const t = transitOrEmpty(ctx);
  const rows: string[][] = [["moment", "body", "gate", "line", "ecliptic", "speed", "retrograde", "centre", "yours", "completes", "at_utc"]];
  const at = new Date(ctx.at).toISOString();
  for (const r of t.moment.rows) {
    rows.push([
      "moment",
      r.body,
      String(r.gate),
      String(r.line),
      r.ecliptic.toFixed(6),
      r.speed.toFixed(6),
      r.retrograde ? "1" : "0",
      HD_GATE_CENTER[r.gate] ?? "",
      ctx.hd.activations
        .filter((a) => a.gate === r.gate)
        .map((a) => `${a.layer}:${a.body}:${a.gate}.${a.line}`)
        .join("|"),
      t.completes
        .filter((ch) => ch.b.gates.includes(r.gate))
        .map((ch) => ch.id)
        .join("|"),
      at,
    ]);
  }
  rows.push([]);
  rows.push(["channel", "id", "gates", "centres", "state", "your_gates", "moment_gates", "moment_bodies"]);
  for (const ch of tableChannels(t)) {
    const state = ch.kind === "electromagnetic" ? "temporary" : ch.lead === "b" ? "moment" : ch.a.whole ? "yours" : "open";
    const bodies = t.moment.rows.filter((r) => ch.b.gates.includes(r.gate)).map((r) => `${r.body}:${r.gate}.${r.line}`);
    rows.push(["channel", ch.id, ch.gates.join("|"), ch.centers.join("|"), state, ch.a.gates.join("|"), ch.b.gates.join("|"), bodies.join("|")]);
  }
  rows.push([]);
  rows.push(["centre", "id", "yours", "now", "through"]);
  for (const c of t.pair.centres) {
    const now = c.by === "a" || c.by === "both" ? "defined" : c.by === "b" ? "moment" : c.by === "together" ? "together" : "open";
    rows.push(["centre", c.id, c.a ? "1" : "0", now, (t.through.get(c.id) ?? []).map((ch) => ch.id).join("|")]);
  }
  rows.push([]);
  // Gate and line in their own columns, as the bodygraph's table writes them: "61.4" would read as a decimal in French.
  rows.push(["cycle", "id", "body", "point", "gate", "line", "passage_utc", "direction", "age_years", "status"]);
  for (const c of ctx.cycles ?? []) {
    const status = cycleStatus(c, ctx.at) ?? "";
    for (const p of c.passages) {
      rows.push(["cycle", c.id, c.body, c.target.toFixed(6), String(c.gate.gate), String(c.gate.line), new Date(p.at).toISOString(), p.retrograde ? "retrograde" : "direct", (Math.floor(((p.at - ctx.birth) / (365.2425 * 86_400_000)) * 100) / 100).toFixed(2), status]);
    }
  }
  rows.push([]);
  rows.push(["solar", "year", "utc", "zone", "local", "sun_gate", "sun_line", "earth_gate", "earth_line", "completes"]);
  if (ctx.solar) {
    const sun = ctx.hd.activations.find((a) => a.layer === "personality" && a.body === "sun");
    const earth = ctx.hd.activations.find((a) => a.layer === "personality" && a.body === "earth");
    const local =
      ctx.solar.at == null
        ? ""
        : dateFormat("sv-SE", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: ctx.zone }).format(ctx.solar.at);
    rows.push([
      "solar",
      String(ctx.solar.year),
      ctx.solar.at == null ? "" : new Date(ctx.solar.at).toISOString(),
      ctx.zone,
      local,
      sun ? String(sun.gate) : "",
      sun ? String(sun.line) : "",
      earth ? String(earth.gate) : "",
      earth ? String(earth.line) : "",
      (ctx.solar.transit?.completes ?? []).map((ch) => ch.id).join("|"),
    ]);
  }
  return rows.map((r) => r.map(cell).join(",")).join("\n");
}
