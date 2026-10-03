/**
 * The calendar's readings (parts 55–56 of the launch plan): one sky event (a
 * phase, an eclipse, a station, a sign change, a season, two planets in
 * aspect, a void-of-course Moon), the Moon of a day, a whole day, and one
 * slow transit's window within 1° of exact. Built with the reading text of
 * the astro pack (content/astro-calendar.ts); each links to the sky at that
 * moment in Transits.
 */
import {
  CAL_DAILY_PHASE,
  CAL_ECLIPSE,
  CAL_ECLIPSE_TYPE,
  CAL_INGRESS,
  CAL_INGRESS_SIGN,
  CAL_MAGNITUDE,
  CAL_MOON_SIGN,
  CAL_MOON_SIGN_ABOUT,
  CAL_NEAR_MISS,
  CAL_PHASE,
  CAL_RETRO,
  CAL_SEASON,
  CAL_SKY_FAMILY,
  CAL_STATION,
  CAL_VOID,
  CAL_VOID_METHOD,
  CAL_WINDOW,
  CALENDAR_ABOUT,
} from "@/lib/content/astro-calendar";
import { SIGN_TEXT } from "@/lib/content/astro-signs-houses";
import { PERSONAL_DAY_TEXT, PERSONAL_MONTH_TEXT, PERSONAL_YEAR_TEXT, UNIVERSAL_YEAR_TEXT, type CycleKey } from "@/lib/content/numerology";
import {
  CHALLENGE_TEXT,
  CYCLE_ABOUT,
  PERIOD_PLACE_TEXT,
  PERIOD_TEXT,
  PINNACLE_TEXT,
  type CycleNumberKey,
  type Gap,
} from "@/lib/content/numerology-more";
import { TRANSIT_FAMILY, TRANSIT_PACE } from "@/lib/content/astro-time";
import { pickBi } from "@/lib/content/types";
import { dateFormat } from "@/lib/intl-cache";
import { formatArc, formatDegree } from "@/lib/utils";
import { bodyBare, bodyLabel, bodyThe, houseInline, houseName, joinList, signThe } from "../i18n/astro";
import {
  CALENDAR_UI,
  dayMoonWords,
  fill,
  numChangeDetail,
  numChangeTitle,
  signWord,
  skyEventDetail,
  skyEventTitle,
  yourAspectWords,
} from "../i18n/calendar-words";
import type { Locale } from "../i18n/locale";
import { pick } from "../i18n/pick";
import { houseFromCusps } from "./anatomy";
import type { DayOverview } from "./calendar-day";
import { nextEvent, windowId } from "./calendar-sky";
import { changeId, personalDayOn, personalMonthOn, personalYearOn, type NumerologyCalendar } from "./numerology-calendar";
import { personalDayOf, personalMonthOf, personalYearOf, universalYearOf } from "./numerology-cycles";
import { stepsText, wholeText } from "./numerology-reduce";
import { movingFamilyText } from "./interpret-transit";
import type { TransitWindow } from "./personal-transits";
import { aspectFamily, aspectInPractice, bodyKeywords, pairTheme } from "./plain";
import { seasonOf, skyEventId, type SkyAspect, type SkyEvent } from "./sky-events";
import { SIGN_IDS, type BodyId, type ElementReading, type NatalChart, type ReadingFact, type ReadingLink, type ReadingSection } from "./types";

export type CalendarContext = {
  /** The natal chart: which of your houses and points an event falls on. */
  chart?: NatalChart | null;
  /** Every event at hand (the chunks' and the year files'), for "until" and the next phase. */
  events?: readonly SkyEvent[];
};

const wrap360 = (x: number) => ((x % 360) + 360) % 360;
const wrap180 = (x: number) => ((((x + 180) % 360) + 360) % 360) - 180;
const signOf = (lon: number) => Math.floor(wrap360(lon) / 30);

function formats(locale: Locale, tz: string) {
  const loc = locale === "fr" ? "fr-FR" : "en-GB";
  const time = (ms: number) => dateFormat(loc, { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(ms));
  const day = (ms: number) => dateFormat(loc, { timeZone: tz, weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date(ms));
  const dayOnly = (ms: number) => dateFormat(loc, { timeZone: tz, day: "numeric", month: "short", year: "numeric" }).format(new Date(ms));
  const shortDay = (ms: number) => dateFormat(loc, { timeZone: tz, weekday: "short", day: "numeric", month: "short" }).format(new Date(ms));
  const long = (ms: number) => dateFormat(loc, { timeZone: tz, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(ms));
  return { time, day, dayOnly, shortDay, long, at: (ms: number) => `${day(ms)} · ${time(ms)}` };
}

const degreeOf = (locale: Locale) => (lon: number) => `${formatDegree(lon)} ${signWord(signOf(lon), locale)}`;
const put = (text: string, v: Record<string, string>) => text.replace(/\{(\w+)\}/g, (m, k: string) => v[k] ?? m);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const about = (locale: Locale, ...more: string[]) => ({
  title: locale === "fr" ? "À propos du calendrier" : "About the calendar",
  paragraphs: [pickBi(CALENDAR_ABOUT, locale), ...more.filter(Boolean)],
});

/** The link that opens Transits at a moment. */
function transitsLink(ms: number, locale: Locale, at: string): ReadingLink {
  return { ref: `transits-at:${Math.round(ms)}`, label: locale === "fr" ? "Voir le ciel à ce moment" : "See the sky at that moment", detail: at };
}

/** "your Venus" / "votre Vénus". */
function yourPoint(id: string, locale: Locale): string {
  return locale === "fr" ? `votre ${bodyBare(id, locale)}` : `your ${bodyLabel(id, locale)}`;
}

/** The chart's houses a sign spans, in the order the sign crosses them (none without a birth time). */
function housesOfSign(sign: number, chart: NatalChart): number[] {
  if (chart.meta.timeUnknown || chart.houses.length < 12) return [];
  const cusps = chart.houses.map((h) => h.ecliptic);
  const out = [houseFromCusps(sign * 30 + 0.001, cusps)];
  const inside = cusps
    .map((c, i) => ({ house: i + 1, at: wrap360(c) - sign * 30 }))
    .filter((c) => c.at > 0.001 && c.at < 30)
    .sort((a, b) => a.at - b.at);
  for (const c of inside) if (!out.includes(c.house)) out.push(c.house);
  return out;
}

/** "In your chart, Leo is your eleventh house, then your twelfth house." */
function signInChart(sign: number, chart: NatalChart | null | undefined, locale: Locale): { line: string; short: string } | null {
  if (!chart) return null;
  const houses = housesOfSign(sign, chart);
  if (!houses.length) return null;
  const id = SIGN_IDS[sign]!;
  const fr = locale === "fr";
  const list = houses.map((h) => (fr ? `votre ${houseInline(h, locale)}` : `your ${houseInline(h, locale)}`)).join(fr ? ", puis " : ", then ");
  const line = fr
    ? `Dans votre thème, ${signThe(id)} ${houses.length > 1 ? "couvre" : "correspond à"} ${list}.`
    : `In your chart, ${signWord(sign, locale)} ${houses.length > 1 ? "spans" : "is"} ${list}.`;
  // "Houses 11–12" / "Maisons XI–XII".
  const num = (h: number) => (fr ? houseName(h, locale).replace(/^Maison /, "") : String(h));
  const joined = houses.map(num).join(houses.length === 2 ? "–" : ", ");
  const short = fr ? `${houses.length > 1 ? "Maisons" : "Maison"} ${joined}` : `${houses.length > 1 ? "Houses" : "House"} ${joined}`;
  return { line, short };
}

/** Where a degree falls in your chart: its house, and your points within `orb`. */
function degreeInChart(lon: number, chart: NatalChart | null | undefined, locale: Locale, orb: number): string {
  if (!chart) return "";
  const fr = locale === "fr";
  const known = !chart.meta.timeUnknown && chart.houses.length >= 12;
  const house = known ? houseFromCusps(lon, chart.houses.map((h) => h.ecliptic)) : null;
  const points = [...chart.planets.map((p) => ({ id: p.id as string, lon: p.ecliptic })), ...(known ? Object.values(chart.angles).map((a) => ({ id: a.id as string, lon: a.ecliptic })) : [])]
    .map((p) => ({ id: p.id, gap: Math.abs(wrap180(lon - p.lon)) }))
    .filter((p) => p.gap <= orb)
    .sort((a, b) => a.gap - b.gap)
    .slice(0, 2);
  // Orbs in degrees and minutes, as everywhere in the readings.
  const near = points.map((p) => (fr ? `à ${formatArc(p.gap)} de ${yourPoint(p.id, locale)}` : `${formatArc(p.gap)} from ${yourPoint(p.id, locale)}`));
  if (house == null && !near.length) return "";
  const where = house != null ? (fr ? `dans votre ${houseInline(house, locale)}` : `in your ${houseInline(house, locale)}`) : "";
  return fr
    ? `Dans votre thème, cela tombe ${[where, joinList(near, locale)].filter(Boolean).join(", ")}.`
    : `In your chart it falls ${[where, joinList(near, locale)].filter(Boolean).join(", ")}.`;
}

/** "Moon in Taurus — a slower, steadier mood…" / "Lune en Taureau — une humeur…" (`since`: " from 16:40"). */
function moonSignText(sign: number, locale: Locale, since = ""): string {
  const text = pickBi(CAL_MOON_SIGN[SIGN_IDS[sign]!], locale);
  return `${fill(CALENDAR_UI.moon.inSign, locale, { sign: signWord(sign, locale) })}${since} — ${text.charAt(0).toLowerCase()}${text.slice(1)}`;
}

/** The sign's first three words: "warm, generous and expressive" / "chaleur, générosité et expressivité". */
function signKeys(sign: number, locale: Locale): string {
  const words = pickBi(SIGN_TEXT[SIGN_IDS[sign]!].keywords, locale).split(", ").slice(0, 3);
  return joinList(words, locale);
}

/** One event of the sky, as a reading. */
export function skyEventReading(ev: SkyEvent, locale: Locale, tz: string, ctx: CalendarContext = {}): ElementReading {
  const fr = locale === "fr";
  const f = formats(locale, tz);
  const degree = degreeOf(locale);
  const events = ctx.events ?? [];
  const title = skyEventTitle(ev, locale, f.time, f.shortDay);
  const detail = skyEventDetail(ev, locale, degree);
  const facts: ReadingFact[] = [];
  const sections: ReadingSection[] = [];
  const chartLines: string[] = [];
  const more: string[] = [];
  let lead = "";
  let note: string | undefined;

  if (ev.k === "void") {
    lead = pickBi(CAL_VOID, locale);
    facts.push({ label: fr ? "Depuis" : "From", value: f.at(ev.t) }, { label: fr ? "Jusqu’à" : "Until", value: f.at(ev.end) });
    if (detail) more.push(`${cap(detail)}.`);
    more.push(pickBi(CAL_VOID_METHOD, locale));
  } else {
    facts.push({ label: ev.k === "eclipse" ? (fr ? "Maximum" : "Greatest") : "Exact", value: f.at(ev.t) });
  }

  if (ev.k === "phase") {
    const sign = signOf(ev.lon);
    lead = pickBi(CAL_PHASE[ev.phase], locale);
    facts.push({ label: fr ? "Lune" : "Moon", value: degree(ev.lon) });
    note = `${title} · ${degree(ev.lon)}`;
    more.push(moonSignText(sign, locale));
    const where = degreeInChart(ev.lon, ctx.chart, locale, 2);
    if (where) chartLines.push(where);
  }

  if (ev.k === "eclipse") {
    lead = pickBi(CAL_ECLIPSE[ev.kind], locale);
    facts.push({ label: "Position", value: degree(ev.lon) }, { label: "Magnitude", value: ev.mag.toFixed(3).replace(".", fr ? "," : ".") });
    note = `${title} · ${degree(ev.lon)}`;
    more.push(pickBi(CAL_ECLIPSE_TYPE[ev.type], locale), pickBi(CAL_MAGNITUDE[ev.kind], locale));
    const where = degreeInChart(ev.lon, ctx.chart, locale, 3);
    if (where) chartLines.push(where);
  }

  if (ev.k === "station") {
    const vars = { body: bodyLabel(ev.body, locale), keywords: bodyKeywords(ev.body as BodyId, locale) };
    lead = put(pickBi(CAL_STATION[ev.turn], locale), vars);
    facts.push({ label: "Position", value: degree(ev.lon) });
    const next = nextEvent(events, ev.t, "station", (x) => x.body === ev.body);
    if (next) {
      facts.push({
        label: ev.turn === "rx" ? (fr ? "Direct de nouveau" : "Direct again") : fr ? "Rétrograde de nouveau" : "Retrograde again",
        value: f.dayOnly(next.t),
      });
    }
    note = `${title} · ${degree(ev.lon)}`;
    const retro = CAL_RETRO[ev.body as keyof typeof CAL_RETRO];
    if (retro) more.push(pickBi(retro, locale));
    const where = degreeInChart(ev.lon, ctx.chart, locale, 1);
    if (where) chartLines.push(where);
  }

  if (ev.k === "ingress") {
    const season = seasonOf(ev);
    const next = nextEvent(events, ev.t, "ingress", (x) => x.body === ev.body);
    if (next) facts.push({ label: fr ? "Jusqu’au" : "Until", value: next.body === "moon" ? f.at(next.t) : f.dayOnly(next.t) });
    if (ev.body === "moon") {
      lead = moonSignText(ev.sign, locale);
      more.push(pickBi(CAL_MOON_SIGN_ABOUT, locale));
    } else if (season != null) {
      lead = pickBi(CAL_SEASON[season], locale);
    } else {
      // "the Sun" / "le Soleil" inside a sentence; the node, which goes backwards through the signs, has its own line.
      const vars = { body: bodyThe(ev.body, locale), keywords: bodyKeywords(ev.body as BodyId, locale), sign: signWord(ev.sign, locale) };
      lead = cap(put(pickBi(CAL_INGRESS[ev.body === "northnode" ? "node" : ev.rx ? "back" : "forward"], locale), vars));
      more.push(put(pickBi(CAL_INGRESS_SIGN, locale), { ...vars, keywords: signKeys(ev.sign, locale) }));
    }
    const houses = signInChart(ev.sign, ctx.chart, locale);
    if (houses) {
      facts.push({ label: fr ? "Dans votre thème" : "In your chart", value: houses.short });
      const until = next ? (next.body === "moon" ? f.at(next.t) : f.dayOnly(next.t)) : "";
      const body = ev.body === "moon" ? "moon" : ev.body;
      const tail = until
        ? fr
          ? ` C’est là que ${bodyKeywords(body as BodyId, locale)} sont à l’œuvre jusqu’au ${until}.`
          : ` Astrologers look there for where ${bodyKeywords(body as BodyId, locale)} are at work until ${until}.`
        : "";
      chartLines.push(`${houses.line}${tail}`);
    }
  }

  if (ev.k === "aspect") {
    const vars = {
      a: bodyThe(ev.a, locale),
      b: bodyThe(ev.b, locale),
      ka: bodyKeywords(ev.a as BodyId, locale),
      kb: bodyKeywords(ev.b as BodyId, locale),
    };
    lead = cap(put(pickBi(CAL_SKY_FAMILY[aspectFamily(ev.type)], locale), vars));
    const theme = pairTheme(ev.a as BodyId, ev.b as BodyId, locale);
    if (theme) more.push(theme);
    more.push(aspectInPractice(ev.type, locale));
  }

  if (chartLines.length) sections.push({ id: "chart", title: fr ? "Dans votre thème" : "In your chart", paragraphs: chartLines });
  if (more.length) sections.push({ id: "more", title: fr ? "En détail" : "In detail", paragraphs: more });
  return {
    id: `sky:${skyEventId(ev)}`,
    kind: ev.k === "aspect" ? "aspect" : "planet",
    title,
    kicker: ev.k === "void" ? `${f.at(ev.t)} → ${f.time(ev.end)}` : f.at(ev.t),
    paragraphs: [lead, ...chartLines, ...more],
    lead,
    note,
    facts,
    sections: sections.length ? sections : undefined,
    links: { title: fr ? "Voir aussi" : "See also", rows: [transitsLink(ev.t, locale, f.at(ev.t))] },
    about: about(locale),
  };
}

/** A slow transit's window within 1°: its exact dates, or how close it comes. */
export function windowReading(w: TransitWindow, locale: Locale, tz: string, nowMs: number): ElementReading {
  const fr = locale === "fr";
  const f = formats(locale, tz);
  const title = yourAspectWords(w.moving, w.type as SkyAspect, w.natal, locale);
  const range = fill(CALENDAR_UI.yours.window, locale, { from: f.dayOnly(w.from), to: f.dayOnly(w.to) });
  const lead = movingFamilyText(TRANSIT_FAMILY, w.moving as BodyId, w.natal, w.type, locale);
  const facts: ReadingFact[] = [
    { label: fr ? "Période" : "Window", value: `${w.openStart ? "… " : ""}${f.dayOnly(w.from)} → ${f.dayOnly(w.to)}${w.openEnd ? " …" : ""}` },
    ...w.passes.map((t, i) => ({ label: w.passes.length > 1 ? `Exact ${i + 1}` : "Exact", value: f.at(t) })),
  ];
  const paragraphs = [lead, pickBi(CAL_WINDOW, locale)];
  if (!w.passes.length) {
    const orb = formatArc(w.minOrb);
    facts.push({ label: fr ? "Au plus près" : "Closest", value: orb });
    paragraphs.push(pickBi(CAL_NEAR_MISS, locale).replace("{orb}", orb));
  }
  const pace = pickBi(TRANSIT_PACE[w.moving as BodyId], locale);
  if (pace) paragraphs.push(pace);
  const theme = pairTheme(w.moving as BodyId, w.natal, locale);
  if (theme) paragraphs.push(theme);
  const inEffect = w.from <= nowMs && nowMs <= w.to;
  const peak = w.passes.find((t) => t >= nowMs) ?? w.passes[w.passes.length - 1] ?? (w.from + w.to) / 2;
  return {
    id: windowId(w),
    kind: "aspect",
    title,
    kicker: inEffect ? `${pick(CALENDAR_UI.when.today, locale)} · ${range}` : range,
    paragraphs,
    lead,
    note: `${title} · ${range}`,
    facts,
    sections: [{ id: "window", title: fr ? "La période" : "The period", paragraphs: paragraphs.slice(1) }],
    links: {
      title: fr ? "Où cela se voit" : "Where it shows",
      rows: [
        { ref: `timing:body:${w.moving}`, label: fr ? `${bodyLabel(w.moving, locale)} en transit` : `Transiting ${bodyLabel(w.moving, locale)}` },
        transitsLink(peak, locale, f.at(peak)),
      ],
    },
    about: about(locale, aspectInPractice(w.type, locale)),
  };
}

/** The Moon of a day: its phase and lit share, its sign (and the next), its void-of-course hours. */
export function moonDayReading(ov: DayOverview, key: string, locale: Locale, tz: string, nowMs: number): ElementReading | null {
  const moon = ov.moon;
  if (!moon) return null;
  const fr = locale === "fr";
  const f = formats(locale, tz);
  const words = dayMoonWords(ov, locale, f.time, f.shortDay);
  const dayPhase = ov.phase && ov.phase.t < ov.to ? ov.phase : null;
  const e = wrap360(moon.elong);
  const daily = e < 90 ? 0 : e < 180 ? 1 : e < 270 ? 2 : 3;
  const lead = dayPhase ? pickBi(CAL_PHASE[dayPhase.phase], locale) : pickBi(CAL_DAILY_PHASE[daily], locale);
  const signs = ov.signAtStart == null ? [] : [ov.signAtStart, ...ov.ingresses.map((i) => i.sign)];
  const signTexts = signs.map((s, i) => {
    const ing = i > 0 ? ov.ingresses[i - 1] : null;
    const since = ing ? ` ${fr ? "dès" : "from"} ${f.time(ing.t)}` : "";
    return moonSignText(s, locale, since);
  });
  const lit = Math.round(moon.lit * 100);
  const facts: ReadingFact[] = [{ label: fr ? "Éclairée" : "Lit", value: fr ? `${lit} %` : `${lit}%` }];
  if (words.sign) facts.push({ label: fr ? "Signe" : "Sign", value: words.sign.replace(/^(Moon in|Lune en) /, "") });
  if (words.void) facts.push({ label: fr ? "Vide de course" : "Void of course", value: words.void.replace(/^(void of course|vide de course) /, "") });
  if (words.phase) facts.push({ label: fr ? "Phase" : "Phase", value: words.phase.replace(/^(Next phase|Prochaine phase)\s?: /, "") });
  const sections: ReadingSection[] = [{ id: "sign", title: fr ? "Son signe" : "Its sign", paragraphs: [...signTexts, pickBi(CAL_MOON_SIGN_ABOUT, locale)] }];
  if (ov.voids.length) sections.push({ id: "void", title: fr ? "Vide de course" : "Void of course", paragraphs: [cap(words.void) + ".", pickBi(CAL_VOID, locale)] });
  const today = nowMs >= ov.from && nowMs < ov.to;
  const at = today ? nowMs : ov.from + (ov.to - ov.from) / 2;
  return {
    id: `moon:${key}`,
    kind: "planet",
    title: [
      words.title.split(" · ")[0],
      signs.length ? `${fill(CALENDAR_UI.moon.inSign, locale, { sign: signWord(signs[0]!, locale) })}${signs.length > 1 ? ` → ${signs.slice(1).map((x) => signWord(x, locale)).join(" → ")}` : ""}` : "",
    ]
      .filter(Boolean)
      .join(" · "),
    kicker: f.long(ov.from + 1),
    paragraphs: [lead, ...signTexts],
    lead,
    facts,
    sections,
    links: { title: fr ? "Voir aussi" : "See also", rows: [transitsLink(at, locale, f.at(at))] },
    about: about(locale),
  };
}

/** A whole day: its Moon, the sky's events and your exacts in time order, and what is in effect for you. */
export function calendarDayReading(
  ov: DayOverview,
  key: string,
  locale: Locale,
  tz: string,
  nowMs: number,
  num: NumerologyCalendar | null = null,
): ElementReading {
  const fr = locale === "fr";
  const f = formats(locale, tz);
  const words = dayMoonWords(ov, locale, f.time, f.shortDay);
  const sky = ov.rows.filter((r) => r.kind === "sky").length;
  const yours = ov.rows.length - sky;
  const rows: ReadingLink[] = [];
  if (ov.moon) rows.push({ ref: `moon:${key}`, label: words.title, detail: [words.sign, words.void].filter(Boolean).join(" · ") });
  if (num) {
    // Your numerology that day, beside its Moon: the personal day, and a long cycle changing on a birthday.
    const [y, m, d] = key.split("-").map(Number) as [number, number, number];
    rows.push({ ref: `numday:${key}`, label: fill(CALENDAR_UI.num.personalDay, locale, { n: personalDayOn(num, y, m, d) }), detail: pick(CALENDAR_UI.num.label, locale) });
    for (const c of num.changes.filter((x) => x.day === key)) rows.push({ ref: changeId(c), label: numChangeTitle(c, locale), detail: numChangeDetail(c, locale) });
  }
  for (const r of ov.rows) {
    const label = r.kind === "sky" ? skyEventTitle(r.ev, locale, f.time, f.shortDay) : yourAspectWords(r.hit.moving, r.hit.type as SkyAspect, r.hit.natal, locale);
    rows.push({ ref: r.id, label, detail: `${f.time(r.t)} · ${pick(r.kind === "sky" ? CALENDAR_UI.day.sky : CALENDAR_UI.day.you, locale)}` });
  }
  for (const w of ov.effect) {
    const next = w.passes.find((t) => t >= ov.from);
    rows.push({
      ref: windowId(w),
      label: yourAspectWords(w.moving, w.type as SkyAspect, w.natal, locale),
      detail: `${pick(CALENDAR_UI.day.inEffect, locale)}${next != null ? ` · ${fill(CALENDAR_UI.yours.exactOn, locale, { when: f.shortDay(next) })}` : ""}`,
    });
  }
  const today = nowMs >= ov.from && nowMs < ov.to;
  const lead = [words.title, [words.sign, words.void].filter(Boolean).join(", "), words.phase].filter(Boolean).join(". ");
  const day = key.slice(8).replace(/^0/, "");
  return {
    id: `day:${key}`,
    kind: "planet",
    mark: day,
    title: cap(f.long(ov.from + 1)),
    kicker: `${today ? `${pick(CALENDAR_UI.when.today, locale)} · ` : ""}${fill(CALENDAR_UI.day.count, locale, { sky, yours })}`,
    paragraphs: [lead ? `${lead}.` : pick(CALENDAR_UI.day.empty, locale)],
    lead: lead ? `${lead}.` : pick(CALENDAR_UI.day.empty, locale),
    links: rows.length ? { title: fr ? "La journée" : "The day", rows } : undefined,
    about: about(locale),
  };
}

const numDate = (key: string, locale: Locale, withDay = true) => {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  const f = dateFormat(locale === "fr" ? "fr-FR" : "en-GB", { timeZone: "UTC", ...(withDay ? { weekday: "long" as const } : {}), day: "numeric", month: "long", year: "numeric" });
  return cap(f.format(Date.UTC(y, m - 1, d, 12)));
};
/** "15 Jun 2031": a day in a reading's facts. */
const numShortDate = (key: string, locale: Locale) => {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  return dateFormat(locale === "fr" ? "fr-FR" : "en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }).format(Date.UTC(y, m - 1, d, 12));
};
const monthName = (y: number, m: number, locale: Locale) =>
  cap(dateFormat(locale === "fr" ? "fr-FR" : "en-GB", { timeZone: "UTC", month: "long", year: "numeric" }).format(Date.UTC(y, m - 1, 15, 12)));
const howTitle = (locale: Locale) => pick(CALENDAR_UI.num.howTitle, locale);
const numLabel = (key: "personalDay" | "personalMonth" | "personalYear" | "universalYear", locale: Locale) =>
  fill(CALENDAR_UI.num[key], locale, { n: "" }).trim();

/** The long cycles changing in a span of days, as links to their readings. */
function changeLinks(num: NumerologyCalendar, fromKey: string, toKey: string, locale: Locale): ReadingLink[] {
  return num.changes
    .filter((c) => c.day >= fromKey && c.day <= toKey)
    .map((c) => ({ ref: changeId(c), label: numChangeTitle(c, locale), detail: `${numDate(c.day, locale, false)} · ${numChangeDetail(c, locale)}` }));
}

/** A day's personal day (numerology, part 62): its number and text, with the month's and the year's. */
export function numerologyDayReading(num: NumerologyCalendar, key: string, locale: Locale): ElementReading | null {
  const [y, m, d] = key.split("-").map(Number);
  if (!y || !m || !d) return null;
  const py = personalYearOn(num, y);
  const pm = personalMonthOn(num, y, m);
  const value = personalDayOf(pm, d);
  const pd = value.number ?? personalDayOn(num, y, m, d);
  const text = pickBi(PERSONAL_DAY_TEXT[pd as CycleKey], locale);
  const month = pickBi(PERSONAL_MONTH_TEXT[pm as CycleKey], locale);
  const changes = changeLinks(num, key, key, locale);
  return {
    id: `numday:${key}`,
    kind: "house",
    mark: String(pd),
    title: fill(CALENDAR_UI.num.personalDay, locale, { n: pd }),
    kicker: numDate(key, locale),
    lead: text,
    paragraphs: [text, month],
    facts: [
      { label: pick(CALENDAR_UI.num.factDay, locale), value: numShortDate(key, locale) },
      { label: pick(CALENDAR_UI.num.steps, locale), value: stepsText(value) },
      { label: numLabel("personalMonth", locale), value: String(pm), ref: `nummonth:${key.slice(0, 7)}` },
      { label: numLabel("personalYear", locale), value: String(py), ref: `numyear:${y}` },
    ],
    sections: [{ id: "month", title: fill(CALENDAR_UI.num.personalMonth, locale, { n: pm }), paragraphs: [month] }],
    links: changes.length ? { title: pick(CALENDAR_UI.num.changesHead, locale), rows: changes } : undefined,
    about: { title: howTitle(locale), paragraphs: [pick(CALENDAR_UI.num.dayAbout, locale)] },
  };
}

/** A month's personal month: its number and text, the year's theme under it, the long cycles changing in it. */
export function numerologyMonthReading(num: NumerologyCalendar, key: string, locale: Locale): ElementReading | null {
  const [y, m] = key.split("-").map(Number);
  if (!y || !m || m > 12) return null;
  const py = personalYearOn(num, y);
  const value = personalMonthOf(py, m);
  const pm = value.number ?? personalMonthOn(num, y, m);
  const text = pickBi(PERSONAL_MONTH_TEXT[pm as CycleKey], locale);
  const year = pickBi(PERSONAL_YEAR_TEXT[py as CycleKey], locale);
  const mm = String(m).padStart(2, "0");
  const changes = changeLinks(num, `${y}-${mm}-01`, `${y}-${mm}-31`, locale);
  return {
    id: `nummonth:${y}-${mm}`,
    kind: "house",
    mark: String(pm),
    title: fill(CALENDAR_UI.num.personalMonth, locale, { n: pm }),
    kicker: monthName(y, m, locale),
    lead: text,
    paragraphs: [text, year],
    facts: [
      { label: pick(CALENDAR_UI.num.factMonth, locale), value: monthName(y, m, locale) },
      { label: pick(CALENDAR_UI.num.steps, locale), value: stepsText(value) },
      { label: numLabel("personalYear", locale), value: String(py), ref: `numyear:${y}` },
    ],
    sections: [{ id: "year", title: fill(CALENDAR_UI.num.personalYear, locale, { n: py }), paragraphs: [year] }],
    links: changes.length ? { title: pick(CALENDAR_UI.num.changesHead, locale), rows: changes } : undefined,
    about: { title: howTitle(locale), paragraphs: [pick(CALENDAR_UI.num.monthAbout, locale)] },
  };
}

/** A year's personal year: its number and text, the universal year behind it, the long cycles changing in it. */
export function numerologyYearReading(num: NumerologyCalendar, year: number, locale: Locale): ElementReading | null {
  if (!Number.isInteger(year) || year < 1) return null;
  const value = personalYearOf(num.birth, year);
  const py = value.number ?? personalYearOn(num, year);
  const uy = universalYearOf(year).number ?? 0;
  const text = pickBi(PERSONAL_YEAR_TEXT[py as CycleKey], locale);
  const universal = pickBi(UNIVERSAL_YEAR_TEXT[uy as 1], locale);
  const lead = py === 1 ? `${pick(CALENDAR_UI.num.round, locale)}. ${text}` : text;
  const changes = changeLinks(num, `${year}-01-01`, `${year}-12-31`, locale);
  return {
    id: `numyear:${year}`,
    kind: "house",
    mark: String(py),
    title: fill(CALENDAR_UI.num.personalYear, locale, { n: py }),
    kicker: `${year} · ${fill(CALENDAR_UI.num.universalYear, locale, { n: uy })}`,
    lead,
    paragraphs: [lead, universal],
    facts: [
      { label: pick(CALENDAR_UI.num.factYear, locale), value: String(year) },
      { label: pick(CALENDAR_UI.num.steps, locale), value: stepsText(value) },
      { label: numLabel("universalYear", locale), value: String(uy) },
    ],
    sections: [{ id: "universal", title: fill(CALENDAR_UI.num.universalYear, locale, { n: uy }), paragraphs: [universal] }],
    links: changes.length ? { title: pick(CALENDAR_UI.num.changesHead, locale), rows: changes } : undefined,
    about: { title: howTitle(locale), paragraphs: [pick(CALENDAR_UI.num.yearAbout, locale)] },
  };
}

/** The text of a long cycle's number, in its kind (numerology, part 63). */
function cycleText(kind: "period" | "pinnacle" | "challenge", n: number | null, locale: Locale): string {
  if (n == null) return "";
  const bi = kind === "challenge" ? CHALLENGE_TEXT[n as Gap] : kind === "pinnacle" ? PINNACLE_TEXT[n as CycleNumberKey] : PERIOD_TEXT[n as CycleNumberKey];
  return bi ? pickBi(bi, locale) : "";
}

/** A long cycle changing on a birthday (numerology, part 62): which, from when, until when, and what its number brings. */
export function numerologyChangeReading(num: NumerologyCalendar, id: string, locale: Locale): ElementReading | null {
  const c = num.changes.find((x) => changeId(x) === id);
  if (!c) return null;
  const next = num.changes.find((x) => x.kind === c.kind && x.index === c.index + 1);
  const when = [
    fill(CALENDAR_UI.num.from, locale, { date: numDate(c.day, locale), age: c.age }),
    next ? fill(CALENDAR_UI.num.until, locale, { date: numDate(next.day, locale) }) : pick(CALENDAR_UI.num.forLife, locale),
  ].join(" · ");
  const about = pickBi(CYCLE_ABOUT[c.kind], locale);
  const n = c.value.number;
  const text = cycleText(c.kind, n, locale);
  const before = cycleText(c.kind, c.previous.number, locale);
  const place = c.kind === "period" ? pickBi(PERIOD_PLACE_TEXT[c.index as 1 | 2 | 3], locale) : "";
  // The other cycles changing on the same birthday.
  const same = changeLinks(num, c.day, c.day, locale).filter((r) => r.ref !== id);
  return {
    id,
    kind: "house",
    mark: String(n ?? ""),
    title: numChangeTitle(c, locale),
    kicker: when,
    lead: text || about,
    paragraphs: [text, place, about].filter(Boolean),
    facts: [
      { label: pick(CALENDAR_UI.num.factFrom, locale), value: fill(CALENDAR_UI.num.atAge, locale, { date: numShortDate(c.day, locale), age: c.age }) },
      {
        label: pick(CALENDAR_UI.num.factUntil, locale),
        value: next ? fill(CALENDAR_UI.num.atAge, locale, { date: numShortDate(next.day, locale), age: next.age }) : pick(CALENDAR_UI.num.forLifeShort, locale),
      },
      { label: pick(CALENDAR_UI.num.number, locale), value: wholeText(c.value) },
      { label: pick(CALENDAR_UI.num.before, locale), value: wholeText(c.previous) },
    ],
    sections: [
      ...(place ? [{ id: "place", title: fill(CALENDAR_UI.num.cycle_period, locale, { n: c.index }), paragraphs: [place] }] : []),
      ...(before ? [{ id: "before", title: `${pick(CALENDAR_UI.num.before, locale)} · ${wholeText(c.previous)}`, paragraphs: [before] }] : []),
    ],
    links: same.length ? { title: pick(CALENDAR_UI.num.changesHead, locale), rows: same } : undefined,
    about: { title: howTitle(locale), paragraphs: [about] },
  };
}
