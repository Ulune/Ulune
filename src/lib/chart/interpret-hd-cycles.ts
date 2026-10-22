/**
 * Human Design's Cycles, its readings (share and compare plan, feature 5b):
 * every gate, channel and centre as it stands between you and the moment on
 * the dial, the moment itself, the gate of the week, the Moon, each body of
 * the moment, what the moment completes and the centres it defines for you,
 * each life cycle and the year's solar return; the first read's texts and
 * the method notes. Each reading starts with you and the moment; what an
 * element is in general comes after (the existing gate and channel texts)
 * and in its "About". The words are src/lib/content/hd-cycles.ts's; this
 * file only puts them together. It ships in the page's own reading pack
 * (pack-hd-cycles.ts), one language at a time.
 */
import type { ElementReading, ReadingFact, ReadingLink, ReadingSection } from "./types";
import type { AppLocale } from "@/lib/i18n/messages";
import { HD_CENTER_IDS, HD_CHANNELS, HD_GATE_CENTER, eclipticToGate, type HdActivation, type HdBodyId, type HdCenterId } from "./human-design";
import { ageAt, cycleStatus, LIFE_CYCLES, type HdCyclesContext, type LifeCycle, type LifeCycleId } from "./hd-cycles";
import { hdTransit, HDC_CENTRES, HDC_COMPLETES, HDC_MOMENT, HDC_MOON, HDC_SOLAR, HDC_WEEK, hdcBodyRef, hdcLifeRef, parseHdcRef, type HdMomentRow, type HdTransit } from "./hd-transit";
import type { HdPairChannel } from "./hd-pair";
import { hdActivationLabel, hdBodyLabel, hdCenterLabel, hdCentreStateWord, hdChannelCentersLine, hdGateTitle } from "@/lib/i18n/hd-ui";
import { hdCenterProse } from "@/lib/i18n/hd-prose";
import { dateFormat } from "@/lib/intl-cache";
import { pickBi, type Bi } from "@/lib/content/types";
import { HD_CHANNEL_TEXT, HD_GATE_TEXT } from "@/lib/content/hd";
import { HD_BODY_TEXT } from "@/lib/content/hd-first";
import { HDP_CENTRE } from "@/lib/content/hd-pair";
import {
  HDC_ABOUT,
  HDC_AGE,
  HDC_BODY,
  HDC_BODY_NAME,
  HDC_CENTRE,
  HDC_CENTRES as HDC_CENTRES_TEXT,
  HDC_CHANNEL,
  HDC_COMPLETES as HDC_COMPLETES_TEXT,
  HDC_CYCLE_BODY,
  HDC_CYCLES_ABOUT,
  HDC_FIRST,
  HDC_GATE,
  HDC_LIFE,
  HDC_LIFE_WORDS,
  HDC_METHOD,
  HDC_METHOD_TITLE,
  HDC_MOMENT as HDC_MOMENT_TEXT,
  HDC_MOON as HDC_MOON_TEXT,
  HDC_SOLAR as HDC_SOLAR_TEXT,
  HDC_STAY,
  HDC_WEEK as HDC_WEEK_TEXT,
  HDC_WORDS,
} from "@/lib/content/hd-cycles";

export type { HdCyclesContext };

function fill(text: string, vars: Record<string, string | number>): string {
  let s = text;
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

const say = (b: Bi, locale: AppLocale, vars: Record<string, string | number> = {}) => fill(pickBi(b, locale), vars);
const word = (key: keyof typeof HDC_WORDS, locale: AppLocale, vars: Record<string, string | number> = {}) => say(HDC_WORDS[key], locale, vars);
const upper = (s: string) => (s ? s.charAt(0).toLocaleUpperCase() + s.slice(1) : s);
const tag = (locale: AppLocale) => (locale === "fr" ? "fr-FR" : "en-GB");

/** French "de" before a name: "de Paris", "d’Oslo" (a vowel or a mute h elides). */
const deName = (name: string): string => (/^(?:[aeiouhéèêëàâîïôûœæ]|y(?![aeiouéèêëàâîïôû]))/iu.test(name) ? `d’${name}` : `de ${name}`);

/** "a", "a and b", "a, b and c". */
function joinList(items: readonly string[], locale: AppLocale): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")}${word("and", locale)}${items[items.length - 1]}`;
}

/** At most `max` items, then "and 3 more". */
function shortList(items: readonly string[], locale: AppLocale, max = 3): string {
  if (items.length <= max) return joinList(items, locale);
  return `${items.slice(0, max).join(", ")} ${word("more", locale, { n: items.length - max })}`;
}

/** "20–57 · The Brainwave". */
function channelLabel(id: string, locale: AppLocale): string {
  const name = pickBi(HD_CHANNEL_TEXT[id]?.name, locale);
  return name ? `${id} · ${name}` : id;
}

/** "Power" (a gate's name alone). */
const gateName = (n: number, locale: AppLocale) => pickBi(HD_GATE_TEXT[n]?.name, locale);

/** "Gate 34 · Power". */
function gateLabel(n: number, locale: AppLocale): string {
  const name = gateName(n, locale);
  return name ? `${hdGateTitle(locale, n)} · ${name}` : hdGateTitle(locale, n);
}

/** "1 channel", "11 channels", "no channel". */
function channelsPhrase(n: number, locale: AppLocale): string {
  if (n === 0) return word("channelNone", locale);
  return word(n === 1 ? "channelOne" : "channelMany", locale, { n });
}

/** A day and a time in a zone: "Tue 14 Oct, 09:12" (the moment's), "23 Jan 2020" (a cycle's). */
const dayTime = (ms: number, zone: string, locale: AppLocale) =>
  `${dateFormat(tag(locale), { weekday: "short", day: "numeric", month: "short", timeZone: zone }).format(ms)}, ${dateFormat(tag(locale), { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: zone }).format(ms)}`;
const timeOnly = (ms: number, zone: string, locale: AppLocale) => dateFormat(tag(locale), { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: zone }).format(ms);
const dateOnly = (ms: number, zone: string, locale: AppLocale) => dateFormat(tag(locale), { day: "numeric", month: "short", year: "numeric", timeZone: zone }).format(ms);
const dayKey = (ms: number, zone: string) => dateFormat("en-GB", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: zone }).format(ms);
/** "Sunday 18 October, 08:43", « dimanche 18 octobre à 08:43 » (the moment's own sentence: "Sun 18 Oct" would meet "the Sun"). */
const dayTimeLong = (ms: number, zone: string, locale: AppLocale) =>
  word("dayAt", locale, { day: dateFormat(tag(locale), { weekday: "long", day: "numeric", month: "long", timeZone: zone }).format(ms), time: timeOnly(ms, zone, locale) });
/** A time, with its day when that is not the moment's own day. */
function timeOrDay(ms: number, ref: number, zone: string, locale: AppLocale): string {
  return dayKey(ms, zone) === dayKey(ref, zone) ? timeOnly(ms, zone, locale) : dayTime(ms, zone, locale);
}

/** The moment's bodies on a gate, as "Mars 20.3, Sun 20.1". */
function bodiesOn(rows: readonly HdMomentRow[], gate: number, locale: AppLocale): string {
  return rows
    .filter((r) => r.gate === gate)
    .map((r) => `${hdBodyLabel(locale, r.body)} ${r.gate}.${r.line}${r.retrograde ? " ℞" : ""}`)
    .join(", ");
}

/** The slowest of a gate's bodies: the transit lasts as long as it stays. */
const SLOWEST: readonly HdBodyId[] = ["pluto", "neptune", "uranus", "saturn", "jupiter", "northnode", "southnode", "mars", "venus", "mercury", "sun", "earth", "moon"];
function stayOn(rows: readonly HdMomentRow[], gate: number, locale: AppLocale): string {
  const on = new Set(rows.filter((r) => r.gate === gate).map((r) => r.body));
  const body = SLOWEST.find((b) => on.has(b));
  return body ? pickBi(HDC_STAY[body], locale) : "";
}

/** Your rows on a gate, as "Personality Venus 34.2, Design Mars 34.5". */
function actsOn(acts: readonly HdActivation[], gate: number, locale: AppLocale): string {
  return acts
    .filter((a) => a.gate === gate)
    .map((a) => hdActivationLabel(locale, a))
    .join(", ");
}

/** The bodygraph under the moment, or under an empty sky while the moment is on its way. */
function transitOf(ctx: HdCyclesContext): HdTransit {
  return ctx.transit ?? hdTransit(ctx.hd, { at: ctx.at, rows: [] });
}

const aboutTransits = (locale: AppLocale) => ({ title: word("aboutTransits", locale), paragraphs: [pickBi(HDC_ABOUT, locale)] });
const aboutCycles = (locale: AppLocale) => ({ title: word("aboutCycles", locale), paragraphs: [pickBi(HDC_CYCLES_ABOUT, locale)] });

/** A channel's place between you and the moment, in a word: temporary, the moment's own, yours, or not formed. */
function channelState(ch: HdPairChannel, locale: AppLocale): string {
  if (ch.kind === "electromagnetic") return word("temporary", locale);
  if (ch.lead === "b") return word("momentOwn", locale);
  if (ch.a.whole) return word("yoursWord", locale);
  return word("notFormed", locale);
}

/** The sentence that says what the moment does to a channel. */
export function channelNow(t: HdTransit, ch: HdPairChannel, locale: AppLocale): string {
  const rows = t.moment.rows;
  const [g1, g2] = ch.gates;
  if (ch.kind === "electromagnetic") {
    const gy = ch.a.gates[0]!;
    const gm = ch.b.gates[0]!;
    return say(HDC_CHANNEL.completes, locale, { gy, gm, bodies: bodiesOn(rows, gm, locale), stay: stayOn(rows, gm, locale) });
  }
  if (ch.lead === "b") {
    const vars = { g1, g2, first: bodiesOn(rows, g1, locale), second: bodiesOn(rows, g2, locale) };
    return ch.a.gates.length ? say(HDC_CHANNEL.fieldOne, locale, { ...vars, gy: ch.a.gates[0]! }) : say(HDC_CHANNEL.field, locale, vars);
  }
  if (ch.a.whole) {
    const gm = ch.b.gates[0];
    return gm != null ? say(HDC_CHANNEL.yoursLit, locale, { gm, bodies: bodiesOn(rows, gm, locale) }) : pickBi(HDC_CHANNEL.yours, locale);
  }
  if (ch.a.gates.length) {
    const gy = ch.a.gates[0]!;
    return say(HDC_CHANNEL.waits, locale, { gy, gm: gy === g1 ? g2 : g1 });
  }
  if (ch.b.gates.length) {
    const gm = ch.b.gates[0]!;
    return say(HDC_CHANNEL.momentHalf, locale, { gm, go: gm === g1 ? g2 : g1, bodies: bodiesOn(rows, gm, locale) });
  }
  return pickBi(HDC_CHANNEL.none, locale);
}

/** What one side holds of a channel, as a fact says it: "20–57", "Gate 20 (Mars 20.3)", "—". */
function holdFact(ch: HdPairChannel, who: "a" | "b", t: HdTransit, locale: AppLocale): string {
  const h = ch[who];
  if (!h.gates.length) return "—";
  return h.gates.map((g) => (who === "b" ? `${hdGateTitle(locale, g)} (${bodiesOn(t.moment.rows, g, locale)})` : hdGateTitle(locale, g))).join(", ");
}

function channelReading(ctx: HdCyclesContext, id: string, locale: AppLocale): ElementReading | null {
  const t = transitOf(ctx);
  const ch = t.pair.channels.find((c) => c.id === id.slice("channel:".length));
  if (!ch) return null;
  const what = pickBi(HD_CHANNEL_TEXT[ch.id]?.what, locale);
  const lead = channelNow(t, ch, locale);
  const tip = ch.kind === "electromagnetic" ? pickBi(HDC_CHANNEL.completesTip, locale) : "";
  const state = channelState(ch, locale);
  const links: ReadingLink[] = [
    ...ch.gates.map((g) => ({ ref: `gate:${g}`, label: gateLabel(g, locale), detail: [actsOn(ctx.hd.activations, g, locale), bodiesOn(t.moment.rows, g, locale)].filter(Boolean).join(" · ") || undefined })),
    ...ch.centers.map((c) => ({ ref: `center:${c}`, label: hdCenterLabel(locale, c) })),
  ];
  return {
    id,
    kind: "house",
    title: channelLabel(ch.id, locale),
    kicker: `${hdChannelCentersLine(locale, ch.centers[0], ch.centers[1])} · ${state}`,
    lead,
    paragraphs: [lead, tip, what].filter(Boolean),
    facts: [
      { label: word("inChart", locale), value: holdFact(ch, "a", t, locale) },
      { label: word("inSky", locale), value: holdFact(ch, "b", t, locale) },
    ],
    // The lead is said once: the sections hold what comes after it.
    sections: [...(tip ? [{ id: "now", title: word("now", locale), paragraphs: [tip] }] : []), ...(what ? [{ id: "channel", title: word("theChannel", locale), paragraphs: [what] }] : [])],
    links: { title: word("theChannel", locale), rows: links },
    about: aboutTransits(locale),
  };
}

function gateReading(ctx: HdCyclesContext, id: string, locale: AppLocale): ElementReading | null {
  const n = Number(id.slice(5));
  if (!Number.isInteger(n) || n < 1 || n > 64) return null;
  const t = transitOf(ctx);
  const tone = t.pair.tones.get(n) ?? "off";
  const acts = actsOn(ctx.hd.activations, n, locale);
  const bodies = bodiesOn(t.moment.rows, n, locale);
  const lead =
    tone === "both" ? say(HDC_GATE.both, locale, { acts, bodies }) : tone === "a" ? say(HDC_GATE.yours, locale, { acts }) : tone === "b" ? say(HDC_GATE.moment, locale, { bodies }) : pickBi(HDC_GATE.none, locale);
  const formed = t.pair.formed.filter((ch) => ch.gates.includes(n));
  const state = formed.length
    ? say(HDC_GATE.part, locale, { list: joinList(formed.map((ch) => `${ch.id} (${channelState(ch, locale).toLocaleLowerCase(tag(locale))})`), locale) })
    : tone !== "off"
      ? pickBi(HDC_GATE.loose, locale)
      : "";
  const what = pickBi(HD_GATE_TEXT[n]?.what, locale);
  const centre = HD_GATE_CENTER[n];
  const whose = tone === "both" ? word("bothGate", locale) : tone === "a" ? word("yourGate", locale) : tone === "b" ? word("momentGate", locale) : word("noGate", locale);
  return {
    id,
    kind: "house",
    title: gateLabel(n, locale),
    kicker: [centre ? hdCenterLabel(locale, centre) : "", whose].filter(Boolean).join(" · "),
    mark: String(n),
    lead: [lead, state].filter(Boolean).join(" "),
    paragraphs: [lead, state, what].filter(Boolean),
    facts: [
      { label: word("inChart", locale), value: acts || "—" },
      { label: word("inSky", locale), value: bodies || "—" },
      ...(centre ? [{ label: word("centreWord", locale), value: hdCenterLabel(locale, centre), ref: `center:${centre}` }] : []),
    ],
    sections: what ? [{ id: "gate", title: word("theGate", locale), paragraphs: [what] }] : undefined,
    links: {
      title: word("theChannel", locale),
      rows: HD_CHANNELS.filter((ch) => ch.gates.includes(n)).map((c) => {
        const ch = t.pair.channels.find((x) => x.id === c.id)!;
        return { ref: `channel:${ch.id}`, label: channelLabel(ch.id, locale), detail: channelState(ch, locale) };
      }),
    },
    about: aboutTransits(locale),
  };
}

/** A centre's sentence between you and the moment. */
export function centreNow(t: HdTransit, c: HdCenterId, locale: AppLocale): string {
  const centre = t.pair.centres.find((x) => x.id === c)!;
  const vars = { the: pickBi(HDP_CENTRE[c].the, locale), The: pickBi(HDP_CENTRE[c].The, locale), theme: pickBi(HDP_CENTRE[c].theme, locale) };
  const through = joinList((t.through.get(c) ?? []).map((ch) => channelLabel(ch.id, locale)), locale);
  if (centre.by === "a" || centre.by === "both") return say(HDC_CENTRE.yours, locale, vars);
  if (centre.by === "b") return say(HDC_CENTRE.moment, locale, { ...vars, channels: through });
  if (centre.by === "together") return say(HDC_CENTRE.together, locale, { ...vars, channels: through });
  return say(HDC_CENTRE.open, locale, vars);
}

function centreReading(ctx: HdCyclesContext, id: string, locale: AppLocale): ElementReading | null {
  const cid = id.slice(7) as HdCenterId;
  if (!HD_CENTER_IDS.includes(cid)) return null;
  const t = transitOf(ctx);
  const centre = t.pair.centres.find((x) => x.id === cid)!;
  const lead = centreNow(t, cid, locale);
  const conditioned = centre.by === "b" || centre.by === "together";
  const tip = conditioned ? pickBi(HDC_CENTRE.tip, locale) : "";
  const gates = Object.entries(HD_GATE_CENTER)
    .filter(([, c]) => c === cid)
    .map(([g]) => Number(g));
  const mine = gates.filter((g) => t.pair.gates.a.has(g)).length;
  const role = hdCenterProse(locale, cid, centre.a, mine).role;
  const kicker = centre.by === "a" || centre.by === "both" ? word("defined", locale) : centre.by === "b" ? word("conditioned", locale) : centre.by === "together" ? word("together", locale) : word("openNow", locale);
  const channels = t.pair.formed.filter((ch) => ch.centers.includes(cid));
  const active = gates.filter((g) => t.pair.tones.get(g) !== "off");
  return {
    id,
    kind: "house",
    title: hdCenterLabel(locale, cid),
    kicker,
    lead,
    paragraphs: [lead, tip, role].filter(Boolean),
    facts: [
      { label: word("inChart", locale), value: hdCentreStateWord(locale, centre.a, mine) },
      { label: word("now", locale), value: kicker },
    ],
    // The centre in general once, after you and the moment (not again in "About").
    sections: [...(tip ? [{ id: "now", title: word("now", locale), paragraphs: [tip] }] : []), { id: "centre", title: word("theCentre", locale), paragraphs: [role] }],
    links:
      channels.length || active.length
        ? {
            title: word("theCentre", locale),
            rows: [
              ...channels.map((ch) => ({ ref: `channel:${ch.id}`, label: channelLabel(ch.id, locale), detail: channelState(ch, locale) })),
              ...active.map((g) => ({ ref: `gate:${g}`, label: gateLabel(g, locale), detail: [actsOn(ctx.hd.activations, g, locale), bodiesOn(t.moment.rows, g, locale)].filter(Boolean).join(" · ") })),
            ],
          }
        : undefined,
    about: aboutTransits(locale),
  };
}

/** "the Head and the Ajna" (with their articles), or "no centre". */
function centresPhrase(list: readonly HdCenterId[], locale: AppLocale): string {
  return list.length ? joinList(list.map((c) => pickBi(HDP_CENTRE[c].the, locale)), locale) : word("centreNone", locale);
}

/** "50.3". */
const gl = (r: HdMomentRow | undefined) => (r ? `${r.gate}.${r.line}` : "—");
const rowOf = (t: HdTransit, body: HdBodyId) => t.moment.rows.find((r) => r.body === body);

/** The moment at a glance: the first read's first step and its reading's lead. */
export function momentSummary(ctx: HdCyclesContext, locale: AppLocale): string {
  const t = transitOf(ctx);
  if (!t.moment.rows.length) return say(HDC_MOMENT_TEXT.waiting, locale, { when: upper(dayTimeLong(ctx.at, ctx.clock, locale)) });
  const lead = say(HDC_MOMENT_TEXT.lead, locale, { when: upper(dayTimeLong(ctx.at, ctx.clock, locale)), sun: gl(rowOf(t, "sun")), earth: gl(rowOf(t, "earth")), moon: gl(rowOf(t, "moon")) });
  const completes = t.completes.length ? say(HDC_MOMENT_TEXT.completes, locale, { channels: shortList(t.completes.map((ch) => ch.id), locale) }) : pickBi(HDC_MOMENT_TEXT.completesNone, locale);
  const conditions = t.conditioned.length ? say(HDC_MOMENT_TEXT.conditions, locale, { centres: centresPhrase(t.conditioned, locale) }) : pickBi(HDC_MOMENT_TEXT.conditionsNone, locale);
  return [lead, completes, conditions].join(" ");
}

function momentReading(ctx: HdCyclesContext, id: string, locale: AppLocale): ElementReading {
  const t = transitOf(ctx);
  const lead = momentSummary(ctx, locale);
  return {
    id,
    kind: "house",
    title: word("momentTitle", locale),
    kicker: upper(dayTime(ctx.at, ctx.clock, locale)),
    lead,
    paragraphs: [lead, pickBi(HDC_ABOUT, locale)],
    sections: [
      ...(t.completes.length ? [{ id: "completes", title: word("completesTitle", locale), paragraphs: t.completes.map((ch) => `${channelLabel(ch.id, locale)}. ${channelNow(t, ch, locale)}`) }] : []),
      ...(t.conditioned.length ? [{ id: "centres", title: word("centresTitle", locale), paragraphs: t.conditioned.map((c) => centreNow(t, c, locale)) }] : []),
    ],
    links: {
      title: word("momentTitle", locale),
      rows: t.moment.rows.map((r) => ({ ref: hdcBodyRef(r.body), label: upper(hdBodyLabel(locale, r.body)), detail: `${hdGateTitle(locale, r.gate)}.${r.line}${r.retrograde ? " ℞" : ""}` })),
    },
    about: aboutTransits(locale),
  };
}

function weekReading(ctx: HdCyclesContext, id: string, locale: AppLocale): ElementReading | null {
  const t = transitOf(ctx);
  const sun = rowOf(t, "sun");
  const earth = rowOf(t, "earth");
  if (!sun || !earth) return null;
  const vars = { gate: sun.gate, line: sun.line, name: gateName(sun.gate, locale), egate: earth.gate, ename: gateName(earth.gate, locale) };
  const span = ctx.week && ctx.week.gate === sun.gate ? ctx.week : null;
  const lead = span ? say(HDC_WEEK_TEXT.lead, locale, { ...vars, from: dayTime(span.from, ctx.clock, locale), to: dayTime(span.to, ctx.clock, locale) }) : say(HDC_WEEK_TEXT.leadNoSpan, locale, vars);
  const mineSun = actsOn(ctx.hd.activations, sun.gate, locale);
  const mineEarth = actsOn(ctx.hd.activations, earth.gate, locale);
  const yours = mineSun ? say(HDC_WEEK_TEXT.yours, locale, { gate: sun.gate, acts: mineSun }) : say(HDC_WEEK_TEXT.notYours, locale, { gate: sun.gate });
  const earthYours = mineEarth ? say(HDC_WEEK_TEXT.earthYours, locale, { egate: earth.gate, acts: mineEarth }) : "";
  const completes = t.completes
    .filter((ch) => ch.b.gates.some((g) => g === sun.gate || g === earth.gate))
    .map((ch) => say(HDC_WEEK_TEXT.completes, locale, { g: ch.a.gates[0] ?? "", channel: channelLabel(ch.id, locale) }));
  const tip = pickBi(HDC_WEEK_TEXT.tip, locale);
  const sunWhat = pickBi(HD_GATE_TEXT[sun.gate]?.what, locale);
  const earthWhat = pickBi(HD_GATE_TEXT[earth.gate]?.what, locale);
  return {
    id,
    kind: "house",
    // The gate's number is the reading's mark: "Gate of the week · Continuity", not "… · Gate 32 · Continuity".
    title: [word("weekTitle", locale), vars.name || hdGateTitle(locale, sun.gate)].join(" · "),
    kicker: span ? `${dayTime(span.from, ctx.clock, locale)} – ${dayTime(span.to, ctx.clock, locale)}` : word("now", locale),
    mark: String(sun.gate),
    lead,
    paragraphs: [lead, yours, earthYours, ...completes, tip, sunWhat].filter(Boolean),
    facts: [
      { label: upper(hdBodyLabel(locale, "sun")), value: gl(sun), ref: `gate:${sun.gate}` },
      { label: upper(hdBodyLabel(locale, "earth")), value: gl(earth), ref: `gate:${earth.gate}` },
      ...(span ? [{ label: word("until", locale), value: dayTime(span.to, ctx.clock, locale) }] : []),
    ],
    sections: [
      { id: "now", title: word("now", locale), paragraphs: [yours, earthYours, ...completes, tip].filter(Boolean) },
      ...(sunWhat ? [{ id: "sun", title: word("theWeek", locale), paragraphs: [sunWhat] }] : []),
      ...(earthWhat ? [{ id: "earth", title: word("theEarth", locale), paragraphs: [earthWhat] }] : []),
    ],
    about: { title: word("aboutTransits", locale), paragraphs: [pickBi(HDC_WEEK_TEXT.what, locale), pickBi(HDC_ABOUT, locale)] },
  };
}

function moonReading(ctx: HdCyclesContext, id: string, locale: AppLocale): ElementReading | null {
  const t = transitOf(ctx);
  const moon = rowOf(t, "moon");
  if (!moon) return null;
  const vars = { gate: moon.gate, line: moon.line, name: gateName(moon.gate, locale) };
  const span = ctx.moon && ctx.moon.gate === moon.gate ? ctx.moon : null;
  const lead = span
    ? say(HDC_MOON_TEXT.lead, locale, { ...vars, from: timeOrDay(span.from, ctx.at, ctx.clock, locale), until: timeOrDay(span.to, ctx.at, ctx.clock, locale) })
    : say(HDC_MOON_TEXT.leadNoSpan, locale, vars);
  const mine = actsOn(ctx.hd.activations, moon.gate, locale);
  const yours = mine ? say(HDC_MOON_TEXT.yours, locale, { acts: mine }) : pickBi(HDC_MOON_TEXT.notYours, locale);
  const completes = t.completes.filter((ch) => ch.b.gates.includes(moon.gate)).map((ch) => `${channelLabel(ch.id, locale)}. ${channelNow(t, ch, locale)}`);
  const what = pickBi(HD_GATE_TEXT[moon.gate]?.what, locale);
  return {
    id,
    kind: "house",
    title: [word("moonTitle", locale), vars.name || hdGateTitle(locale, moon.gate)].join(" · "),
    kicker: span ? `${word("until", locale)} ${timeOrDay(span.to, ctx.at, ctx.clock, locale)}` : word("now", locale),
    mark: String(moon.gate),
    lead,
    paragraphs: [lead, yours, ...completes, what].filter(Boolean),
    facts: [{ label: upper(hdBodyLabel(locale, "moon")), value: gl(moon), ref: `gate:${moon.gate}` }, ...(span ? [{ label: word("until", locale), value: timeOrDay(span.to, ctx.at, ctx.clock, locale) }] : [])],
    sections: [{ id: "now", title: word("now", locale), paragraphs: [yours, ...completes].filter(Boolean) }, ...(what ? [{ id: "gate", title: word("theGate", locale), paragraphs: [what] }] : [])],
    about: { title: word("aboutTransits", locale), paragraphs: [pickBi(HDC_MOON_TEXT.what, locale), pickBi(HDC_ABOUT, locale)] },
  };
}

function bodyReading(ctx: HdCyclesContext, id: string, body: HdBodyId, locale: AppLocale): ElementReading | null {
  const t = transitOf(ctx);
  const row = rowOf(t, body);
  if (!row) return null;
  const lead = say(HDC_BODY.lead, locale, {
    body: upper(pickBi(HDC_BODY_NAME[body], locale)),
    gate: row.gate,
    line: row.line,
    name: gateName(row.gate, locale),
    retro: row.retrograde ? pickBi(HDC_BODY.retro, locale) : "",
  });
  const role = pickBi(HD_BODY_TEXT[body], locale);
  const stay = say(HDC_BODY.stay, locale, { stay: pickBi(HDC_STAY[body], locale) });
  const mine = actsOn(ctx.hd.activations, row.gate, locale);
  const yours = mine ? say(HDC_BODY.yours, locale, { gate: row.gate, acts: mine }) : "";
  const completes = t.completes.filter((ch) => ch.b.gates.includes(row.gate));
  const completesLine = completes.length ? say(HDC_BODY.completes, locale, { channels: joinList(completes.map((ch) => channelLabel(ch.id, locale)), locale) }) : "";
  const what = pickBi(HD_GATE_TEXT[row.gate]?.what, locale);
  return {
    id,
    kind: "planet",
    title: `${upper(hdBodyLabel(locale, body))} · ${gateLabel(row.gate, locale)}`,
    kicker: `${word("inSky", locale)} · ${gl(row)}${row.retrograde ? " ℞" : ""}`,
    mark: String(row.gate),
    lead,
    paragraphs: [lead, yours, completesLine, stay, role, what].filter(Boolean),
    facts: [
      { label: word("inSky", locale), value: `${gl(row)}${row.retrograde ? " ℞" : ""}`, ref: `gate:${row.gate}` },
      { label: word("stays", locale), value: pickBi(HDC_STAY[body], locale) },
    ],
    sections: [
      ...(yours || completesLine ? [{ id: "now", title: word("now", locale), paragraphs: [yours, completesLine].filter(Boolean) }] : []),
      { id: "body", title: word("theBody", locale), paragraphs: [stay, role] },
      ...(what ? [{ id: "gate", title: word("theGate", locale), paragraphs: [what] }] : []),
    ],
    links: completes.length ? { title: word("completesTitle", locale), rows: completes.map((ch) => ({ ref: `channel:${ch.id}`, label: channelLabel(ch.id, locale) })) } : undefined,
    about: aboutTransits(locale),
  };
}

function completesReading(ctx: HdCyclesContext, id: string, locale: AppLocale): ElementReading {
  const t = transitOf(ctx);
  const lead = t.completes.length ? say(HDC_COMPLETES_TEXT.what, locale, { list: joinList(t.completes.map((ch) => channelLabel(ch.id, locale)), locale) }) : pickBi(HDC_COMPLETES_TEXT.none, locale);
  return {
    id,
    kind: "house",
    title: word("completesTitle", locale),
    kicker: channelsPhrase(t.completes.length, locale),
    lead,
    paragraphs: [lead, ...t.completes.map((ch) => `${channelLabel(ch.id, locale)}. ${channelNow(t, ch, locale)}`)],
    sections: t.completes.map((ch) => ({ id: ch.id, title: channelLabel(ch.id, locale), paragraphs: [channelNow(t, ch, locale)] })),
    links: t.completes.length ? { title: word("completesTitle", locale), rows: t.completes.map((ch) => ({ ref: `channel:${ch.id}`, label: channelLabel(ch.id, locale), detail: hdChannelCentersLine(locale, ch.centers[0], ch.centers[1]) })) } : undefined,
    about: aboutTransits(locale),
  };
}

function centresReading(ctx: HdCyclesContext, id: string, locale: AppLocale): ElementReading {
  const t = transitOf(ctx);
  const lead = t.conditioned.length ? say(HDC_CENTRES_TEXT.what, locale, { list: centresPhrase(t.conditioned, locale) }) : pickBi(HDC_CENTRES_TEXT.none, locale);
  return {
    id,
    kind: "house",
    title: word("centresTitle", locale),
    kicker: t.conditioned.map((c) => hdCenterLabel(locale, c)).join(" · ") || word("centreNone", locale),
    lead,
    paragraphs: [lead, ...t.conditioned.map((c) => centreNow(t, c, locale)), ...(t.conditioned.length ? [pickBi(HDC_CENTRE.tip, locale)] : [])],
    sections: [
      ...t.conditioned.map((c) => ({ id: c, title: hdCenterLabel(locale, c), paragraphs: [centreNow(t, c, locale)] })),
      ...(t.conditioned.length ? [{ id: "now", title: word("now", locale), paragraphs: [pickBi(HDC_CENTRE.tip, locale)] }] : []),
    ],
    links: t.conditioned.length ? { title: word("centresTitle", locale), rows: t.conditioned.map((c) => ({ ref: `center:${c}`, label: hdCenterLabel(locale, c) })) } : undefined,
    about: aboutTransits(locale),
  };
}

/* ── The life cycles ── */

/** "on 23 Jan 2020", "on 28 Feb 2049, 16 Jul 2049 (retrograde) and 28 Nov 2049"; « le 23 janv. 2020 », « le 28 févr. 2049, le 16 juil. 2049 (rétrograde) et le 28 nov. 2049 ». */
export function passagesPhrase(c: LifeCycle, zone: string, locale: AppLocale): string {
  const retro = pickBi(HDC_LIFE_WORDS.retro, locale);
  const items = c.passages.map((p) => `${locale === "fr" ? "le " : ""}${dateOnly(p.at, zone, locale)}${p.retrograde ? ` (${retro})` : ""}`);
  return locale === "fr" ? joinList(items, locale) : `on ${joinList(items, locale)}`;
}

/** "at 29", "between 58 and 59"; « à 29 ans », « entre 58 et 59 ans ». */
export function agePhrase(c: LifeCycle, birth: number, locale: AppLocale): string {
  const first = c.passages[0];
  const last = c.passages[c.passages.length - 1];
  if (!first || !last) return "";
  const a = ageAt(birth, first.at).years;
  const b = ageAt(birth, last.at).years;
  return a === b ? say(HDC_AGE.at, locale, { n: a }) : say(HDC_AGE.between, locale, { a, b });
}

/** Where the planet stood at birth, and the point it comes to. */
function placeLine(c: LifeCycle, locale: AppLocale): string {
  const vars = { gate: c.gate.gate, line: c.gate.line, name: gateName(c.gate.gate, locale) };
  if (c.body === "chiron") return say(HDC_LIFE_WORDS.placeChiron, locale, vars);
  if (c.id === "uranus") {
    const n = eclipticToGate(c.natal);
    return say(HDC_LIFE_WORDS.placeOpposite, locale, { ...vars, ngate: n.gate, nline: n.line });
  }
  return say(HDC_LIFE_WORDS.place, locale, { ...vars, body: pickBi(HDC_CYCLE_BODY[c.body], locale) });
}

/** A cycle's line about its passages and where it stands now, or "" while it is worked out. */
export function cycleNow(ctx: HdCyclesContext, c: LifeCycle, locale: AppLocale): string {
  if (!c.passages.length) return pickBi(c.beyond ? HDC_LIFE_WORDS.beyond : HDC_LIFE_WORDS.none, locale);
  const body = pickBi(HDC_CYCLE_BODY[c.body], locale);
  const dates = passagesPhrase(c, ctx.zone, locale);
  const status = cycleStatus(c, ctx.at) ?? "coming";
  // Its tense follows the dial: passed behind you, will pass ahead, passes in its season.
  const [one, many] = status === "past" ? (["passedOne", "passedMany"] as const) : status === "coming" ? (["willOne", "willMany"] as const) : (["passOne", "passMany"] as const);
  const pass = c.passages.length === 1 ? say(HDC_LIFE_WORDS[one], locale, { body, dates }) : say(HDC_LIFE_WORDS[many], locale, { body, n: c.passages.length, dates });
  return say(HDC_LIFE_WORDS[status], locale, { pass, age: agePhrase(c, ctx.birth, locale) });
}

function lifeReading(ctx: HdCyclesContext, id: string, cycleId: LifeCycleId, locale: AppLocale): ElementReading {
  const text = HDC_LIFE[cycleId];
  const def = LIFE_CYCLES.find((d) => d.id === cycleId)!;
  const c = ctx.cycles?.find((x) => x.id === cycleId) ?? null;
  const asks = pickBi(text.asks, locale);
  const tip = pickBi(text.tip, locale);
  const now = c ? cycleNow(ctx, c, locale) : ctx.cycles ? "" : pickBi(HDC_FIRST.working, locale);
  const place = c ? placeLine(c, locale) : "";
  const unknown = ctx.timeUnknown ? pickBi(HDC_LIFE_WORDS.unknownTime, locale) : "";
  const status = c ? cycleStatus(c, ctx.at) : null;
  const statusWord = status === "past" ? word("past", locale) : status === "now" ? word("now", locale) : status === "coming" ? word("coming", locale) : "";
  const first = c?.passages[0];
  const last = c?.passages[c.passages.length - 1];
  const ages = first && last ? ([ageAt(ctx.birth, first.at).years, ageAt(ctx.birth, last.at).years] as const) : null;
  // Four facts at most: where it stands, every exact passage on one line, the age, the point.
  const facts: ReadingFact[] =
    c && first
      ? [
          ...(statusWord ? [{ label: word("status", locale), value: statusWord }] : []),
          {
            label: word(c.passages.length === 1 ? "passageOne" : "passageMany", locale),
            value: c.passages.map((p) => `${dateOnly(p.at, ctx.zone, locale)}${p.retrograde ? " ℞" : ""}`).join(" · "),
          },
          ...(ages ? [{ label: word("ageWord", locale), value: ages[0] === ages[1] ? word("ageValue", locale, { n: ages[0] }) : word("ageRange", locale, { a: ages[0], b: ages[1] }) }] : []),
          { label: word(c.id === "uranus" ? "pointOpposite" : "point", locale), value: `${hdGateTitle(locale, c.gate.gate)}.${c.gate.line}`, ref: `gate:${c.gate.gate}` },
        ]
      : [];
  // The lead says where the cycle stands; the sections what it asks, then where its point lies in your chart.
  const lead = now || asks;
  const sections: ReadingSection[] = [
    ...(unknown && c?.passages.length ? [{ id: "time", title: word("noTime", locale), paragraphs: [unknown] }] : []),
    { id: "asks", title: word("theCycle", locale), paragraphs: now ? [asks, tip] : [tip] },
    ...(place ? [{ id: "passages", title: word("thePoint", locale), paragraphs: [place] }] : []),
  ];
  return {
    id,
    kind: "planet",
    title: pickBi(text.name, locale),
    kicker: [pickBi(text.around, locale), statusWord].filter(Boolean).join(" · "),
    mark: first ? String(ageAt(ctx.birth, first.at).years) : String(def.about[0]),
    lead,
    paragraphs: [now, place, unknown, asks, tip].filter(Boolean),
    facts: facts.length ? facts : undefined,
    sections,
    links: c ? { title: word(c.id === "uranus" ? "pointOpposite" : "point", locale), rows: [{ ref: `gate:${c.gate.gate}`, label: gateLabel(c.gate.gate, locale) }] } : undefined,
    about: aboutCycles(locale),
  };
}

/* ── The solar return ── */

/** The year's theme in a sentence or two (the solar return's reading and its first-read step). */
export function solarTheme(ctx: HdCyclesContext, locale: AppLocale): string {
  const t = ctx.solar?.transit;
  if (!t) return "";
  if (!t.completes.length) return pickBi(HDC_SOLAR_TEXT.themeNone, locale);
  const theme = say(HDC_SOLAR_TEXT.theme, locale, { channels: joinList(t.completes.map((ch) => channelLabel(ch.id, locale)), locale) });
  return t.conditioned.length ? `${theme} ${say(HDC_SOLAR_TEXT.themeCentres, locale, { centres: centresPhrase(t.conditioned, locale) })}` : theme;
}

/** When the Sun comes back that year, in the birthplace's time. */
export function solarWhen(ctx: HdCyclesContext, locale: AppLocale): string {
  const s = ctx.solar;
  if (!s) return "";
  if (s.at == null) return pickBi(HDC_SOLAR_TEXT.none, locale);
  const date = dateFormat(tag(locale), { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: ctx.zone }).format(s.at);
  if (ctx.timeUnknown) return say(HDC_SOLAR_TEXT.leadDay, locale, { year: s.year, date });
  return say(HDC_SOLAR_TEXT.lead, locale, { year: s.year, date, time: timeOnly(s.at, ctx.zone, locale), zone: word("zoneTime", locale, { zone: ctx.place, deZone: deName(ctx.place) }) });
}

function solarReading(ctx: HdCyclesContext, id: string, locale: AppLocale): ElementReading | null {
  const s = ctx.solar;
  if (!s) return null;
  const sun = ctx.hd.activations.find((a) => a.layer === "personality" && a.body === "sun");
  const earth = ctx.hd.activations.find((a) => a.layer === "personality" && a.body === "earth");
  const when = solarWhen(ctx, locale);
  const same =
    sun && earth
      ? say(HDC_SOLAR_TEXT.same, locale, { sun: `${sun.gate}.${sun.line}`, earth: `${earth.gate}.${earth.line}`, sunName: gateName(sun.gate, locale), earthName: gateName(earth.gate, locale) })
      : "";
  const theme = solarTheme(ctx, locale);
  const unknown = ctx.timeUnknown ? pickBi(HDC_SOLAR_TEXT.unknownTime, locale) : "";
  const what = pickBi(HDC_SOLAR_TEXT.what, locale);
  const t = s.transit;
  return {
    id,
    kind: "planet",
    title: word("solarTitle", locale, { year: s.year }),
    kicker: s.at != null ? (ctx.timeUnknown ? dateOnly(s.at, ctx.zone, locale) : `${dateOnly(s.at, ctx.zone, locale)}, ${timeOnly(s.at, ctx.zone, locale)}`) : String(s.year),
    mark: sun ? String(sun.gate) : undefined,
    lead: when || what,
    paragraphs: [when, same, theme, unknown, what].filter(Boolean),
    facts: [
      ...(sun ? [{ label: upper(hdBodyLabel(locale, "sun")), value: `${sun.gate}.${sun.line}`, ref: `gate:${sun.gate}` }] : []),
      ...(earth ? [{ label: upper(hdBodyLabel(locale, "earth")), value: `${earth.gate}.${earth.line}`, ref: `gate:${earth.gate}` }] : []),
      ...(t ? [{ label: word("completesTitle", locale), value: channelsPhrase(t.completes.length, locale) }] : []),
    ],
    sections: [
      ...(unknown && s.at != null ? [{ id: "time", title: word("noTime", locale), paragraphs: [unknown] }] : []),
      ...(theme ? [{ id: "theme", title: word("theYear", locale), paragraphs: [theme] }] : []),
      ...(same ? [{ id: "sun", title: word("sunEarth", locale), paragraphs: [same] }] : []),
      ...(t && t.completes.length ? [{ id: "channels", title: word("completesTitle", locale), paragraphs: t.completes.map((ch) => `${channelLabel(ch.id, locale)}. ${channelNow(t, ch, locale)}`) }] : []),
    ],
    about: { title: word("aboutSolar", locale), paragraphs: [what] },
  };
}

/** The reading of what is chosen on the page (null: nothing chosen, or not this page's). */
export function hdCyclesReading(ctx: HdCyclesContext | null, id: string | null, locale: AppLocale): ElementReading | null {
  if (!ctx || !id) return null;
  const ref = parseHdcRef(id);
  if (ref) {
    if (ref.kind === "moment") return momentReading(ctx, id, locale);
    if (ref.kind === "week") return weekReading(ctx, id, locale);
    if (ref.kind === "moon") return moonReading(ctx, id, locale);
    if (ref.kind === "completes") return completesReading(ctx, id, locale);
    if (ref.kind === "centres") return centresReading(ctx, id, locale);
    if (ref.kind === "solar") return solarReading(ctx, id, locale);
    if (ref.kind === "body") return bodyReading(ctx, id, ref.body, locale);
    return lifeReading(ctx, id, ref.id, locale);
  }
  if (id.startsWith("channel:")) return channelReading(ctx, id, locale);
  if (id.startsWith("gate:")) return gateReading(ctx, id, locale);
  if (id.startsWith("center:")) return centreReading(ctx, id, locale);
  return null;
}

export type HdCyclesFirstRead = {
  lead: string;
  /** Each step's text, by step: moment, week, moon, completes, centres, the four cycles (life:<id>), solar. */
  texts: Record<string, string>;
  next: string;
};

/** The first read's texts (the page puts its labels and values beside them). */
export function hdCyclesFirstRead(ctx: HdCyclesContext, locale: AppLocale): HdCyclesFirstRead {
  const t = transitOf(ctx);
  const texts: Record<string, string> = {};
  texts.moment = [t.completes.length ? say(HDC_MOMENT_TEXT.completes, locale, { channels: shortList(t.completes.map((ch) => ch.id), locale) }) : pickBi(HDC_MOMENT_TEXT.completesNone, locale), t.conditioned.length ? say(HDC_MOMENT_TEXT.conditions, locale, { centres: centresPhrase(t.conditioned, locale) }) : pickBi(HDC_MOMENT_TEXT.conditionsNone, locale)].join(" ");
  const sun = rowOf(t, "sun");
  if (sun) {
    const mine = actsOn(ctx.hd.activations, sun.gate, locale);
    texts.week = [gateName(sun.gate, locale), mine ? say(HDC_WEEK_TEXT.yours, locale, { gate: sun.gate, acts: mine }) : say(HDC_WEEK_TEXT.notYours, locale, { gate: sun.gate })].filter(Boolean).join(". ");
  }
  const moon = rowOf(t, "moon");
  if (moon) {
    const span = ctx.moon && ctx.moon.gate === moon.gate ? ctx.moon : null;
    texts.moon = [gateName(moon.gate, locale), span ? `${word("until", locale)} ${timeOrDay(span.to, ctx.at, ctx.clock, locale)}` : ""].filter(Boolean).join(" · ");
  }
  texts.completes = t.completes.length ? t.completes.map((ch) => channelLabel(ch.id, locale)).join(", ") : pickBi(HDC_COMPLETES_TEXT.none, locale);
  texts.centres = t.conditioned.length ? `${upper(centresPhrase(t.conditioned, locale))}.` : pickBi(HDC_CENTRES_TEXT.none, locale);
  for (const def of LIFE_CYCLES) {
    const c = ctx.cycles?.find((x) => x.id === def.id);
    texts[`life:${def.id}`] = c ? cycleNow(ctx, c, locale) : ctx.cycles ? "" : pickBi(HDC_FIRST.working, locale);
  }
  texts.solar = [solarWhen(ctx, locale), solarTheme(ctx, locale)].filter(Boolean).join(" ");
  return { lead: pickBi(HDC_FIRST.lead, locale), texts, next: pickBi(HDC_FIRST.next, locale) };
}

/** "How Ulune finds these dates": the method notes. */
export function hdCyclesMethod(locale: AppLocale): { title: string; items: string[] } {
  return { title: pickBi(HDC_METHOD_TITLE, locale), items: HDC_METHOD.map((b) => pickBi(b, locale)) };
}

/** The life cycles' names for the page and the table (the pack's words). */
export function hdCycleName(id: LifeCycleId, locale: AppLocale): string {
  return pickBi(HDC_LIFE[id].name, locale);
}

/** A gate's or a channel's name for the page's lines and the table. */
export { channelLabel as hdCyclesChannelLabel, gateLabel as hdCyclesGateLabel };
/** The page's ids, for the pack's users. */
export { HDC_CENTRES, HDC_COMPLETES, HDC_MOMENT, HDC_MOON, HDC_SOLAR, HDC_WEEK, hdcBodyRef, hdcLifeRef };
