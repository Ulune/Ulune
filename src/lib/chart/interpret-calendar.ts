/**
 * The calendar's readings (parts 55–56 of the launch plan): one sky event
 * (a phase, an eclipse, a station, a sign change, two planets in aspect, a
 * void-of-course Moon) and one slow transit's window within 1° of exact.
 * Built with the reading text of the astro pack (content/astro-calendar.ts).
 */
import { CAL_ECLIPSE, CAL_INGRESS, CAL_MAGNITUDE, CAL_NEAR_MISS, CAL_PHASE, CAL_SEASON, CAL_SKY_ASPECT, CAL_STATION, CAL_VOID, CAL_VOID_METHOD, CAL_WINDOW, CALENDAR_ABOUT } from "@/lib/content/astro-calendar";
import { TRANSIT_FAMILY, TRANSIT_PACE } from "@/lib/content/astro-time";
import { pickBi } from "@/lib/content/types";
import { dateFormat } from "@/lib/intl-cache";
import { formatDegree } from "@/lib/utils";
import { bodyLabel, formatOrb } from "../i18n/astro";
import { CALENDAR_UI, fill, signWord, skyEventDetail, skyEventTitle, yourAspectWords } from "../i18n/calendar-words";
import type { Locale } from "../i18n/locale";
import { pick } from "../i18n/pick";
import { movingFamilyText } from "./interpret-transit";
import type { TransitWindow } from "./personal-transits";
import { aspectInPractice, bodyKeywords, pairTheme } from "./plain";
import { seasonOf, skyEventId, type SkyAspect, type SkyEvent } from "./sky-events";
import type { BodyId, ElementReading, ReadingFact } from "./types";

const wrap360 = (x: number) => ((x % 360) + 360) % 360;

function formats(locale: Locale, tz: string) {
  const loc = locale === "fr" ? "fr-FR" : "en-GB";
  const time = (ms: number) => dateFormat(loc, { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(ms));
  const day = (ms: number) => dateFormat(loc, { timeZone: tz, weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date(ms));
  const dayOnly = (ms: number) => dateFormat(loc, { timeZone: tz, day: "numeric", month: "short", year: "numeric" }).format(new Date(ms));
  return { time, day, dayOnly, at: (ms: number) => `${day(ms)} · ${time(ms)}` };
}

const degreeOf = (locale: Locale) => (lon: number) => `${formatDegree(lon)} ${signWord(Math.floor(wrap360(lon) / 30), locale)}`;

/** The text of an event: what it is, then how it is read. */
function leadOf(ev: SkyEvent, locale: Locale): string {
  const vars = (body: string) => ({ body: bodyLabel(body, locale), keywords: bodyKeywords(body as BodyId, locale) });
  const put = (text: string, v: Record<string, string>) => text.replace(/\{(\w+)\}/g, (m, k: string) => v[k] ?? m);
  switch (ev.k) {
    case "phase":
      return pickBi(CAL_PHASE[ev.phase], locale);
    case "eclipse":
      return pickBi(CAL_ECLIPSE[ev.kind], locale);
    case "station":
      return put(pickBi(CAL_STATION[ev.turn], locale), vars(ev.body));
    case "ingress": {
      const season = seasonOf(ev);
      if (season != null) return pickBi(CAL_SEASON[season], locale);
      return put(pickBi(CAL_INGRESS[ev.rx ? "back" : "forward"], locale), vars(ev.body));
    }
    case "aspect":
      return pickBi(CAL_SKY_ASPECT, locale);
    case "void":
      return pickBi(CAL_VOID, locale);
  }
}

/** One event of the sky, as a reading. */
export function skyEventReading(ev: SkyEvent, locale: Locale, tz: string): ElementReading {
  const fr = locale === "fr";
  const f = formats(locale, tz);
  const degree = degreeOf(locale);
  const title = skyEventTitle(ev, locale, f.time);
  const detail = skyEventDetail(ev, locale, degree);
  const lead = leadOf(ev, locale);
  const facts: ReadingFact[] = [];
  const paragraphs = [lead];
  if (ev.k === "void") {
    facts.push({ label: fr ? "Depuis" : "From", value: f.at(ev.t) }, { label: fr ? "Jusqu’à" : "Until", value: f.at(ev.end) });
    if (detail) paragraphs.push(detail.charAt(0).toUpperCase() + detail.slice(1) + ".");
    paragraphs.push(pickBi(CAL_VOID_METHOD, locale));
  } else {
    facts.push({ label: ev.k === "eclipse" ? (fr ? "Maximum" : "Greatest") : "Exact", value: f.at(ev.t) });
  }
  if (ev.k === "phase") facts.push({ label: fr ? "Lune" : "Moon", value: degree(ev.lon) });
  if (ev.k === "eclipse") {
    facts.push({ label: fr ? "Position" : "Position", value: degree(ev.lon) }, { label: "Magnitude", value: ev.mag.toFixed(3).replace(".", fr ? "," : ".") });
    paragraphs.push(pickBi(CAL_MAGNITUDE[ev.kind], locale));
  }
  if (ev.k === "station") facts.push({ label: fr ? "Position" : "Position", value: degree(ev.lon) });
  if (ev.k === "aspect") paragraphs.push(aspectInPractice(ev.type, locale));
  return {
    id: `sky:${skyEventId(ev)}`,
    kind: ev.k === "aspect" ? "aspect" : "planet",
    title,
    kicker: ev.k === "void" ? `${f.at(ev.t)} → ${f.time(ev.end)}` : f.at(ev.t),
    paragraphs,
    lead,
    // A second line of fact under the title (the phase's sign, a station's degree), not the title again.
    note: ev.k === "phase" ? `${title} · ${degree(ev.lon)}` : detail && ev.k !== "void" ? `${title} · ${detail}` : undefined,
    facts,
    sections: paragraphs.length > 1 ? [{ id: "more", title: fr ? "En détail" : "In detail", paragraphs: paragraphs.slice(1) }] : undefined,
    about: { title: fr ? "À propos du calendrier" : "About the calendar", paragraphs: [pickBi(CALENDAR_ABOUT, locale)] },
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
    const orb = formatOrb(w.minOrb, locale);
    facts.push({ label: fr ? "Au plus près" : "Closest", value: orb });
    paragraphs.push(pickBi(CAL_NEAR_MISS, locale).replace("{orb}", orb));
  }
  const pace = pickBi(TRANSIT_PACE[w.moving as BodyId], locale);
  if (pace) paragraphs.push(pace);
  const theme = pairTheme(w.moving as BodyId, w.natal, locale);
  if (theme) paragraphs.push(theme);
  const inEffect = w.from <= nowMs && nowMs <= w.to;
  return {
    id: `win:${w.moving}:${w.type}:${w.natal}:${w.from}`,
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
      rows: [{ ref: `timing:body:${w.moving}`, label: fr ? `${bodyLabel(w.moving, locale)} en transit` : `Transiting ${bodyLabel(w.moving, locale)}` }],
    },
    about: { title: fr ? "À propos du calendrier" : "About the calendar", paragraphs: [pickBi(CALENDAR_ABOUT, locale), aspectInPractice(w.type, locale)] },
  };
}
