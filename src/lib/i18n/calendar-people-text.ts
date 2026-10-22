/**
 * What the Calendar's birthdays and returns say (share and compare plan, idea
 * B10): each event's title, its line, its reading and its item in a calendar
 * file, in the reader's language. Pure, loaded with the layer
 * (src/components/calendar-people.tsx, which draws them);
 * scripts/calendar-people.test.mjs reads them in both languages. Names go
 * into a calendar file only through personIcsItem, which the Calendar calls
 * only when the reader includes them.
 */
import { deFr } from "@/lib/chinese/both";
import type { IcsItem } from "@/lib/chart/calendar-ics";
import type { PeopleKind, PersonEvent } from "@/lib/chart/calendar-people";
import { zoneCity } from "@/lib/chart/calendar-prefs";
import type { PeopleRow } from "@/lib/chart/calendar-rows";
import { SIGN_IDS, type ElementReading, type ReadingFact } from "@/lib/chart/types";
import { signName } from "@/lib/i18n/astro";
import { cpWord, type CalendarPeopleWordKey } from "@/lib/i18n/catalog/calendar-people-words";
import { dateFormat } from "@/lib/intl-cache";
import { formatDegree } from "@/lib/utils";

/** The cake as a reading's mark (the inner markup of a 24 × 24 drawing; lucide's cake): a return's mark is its planet (reading-card.tsx). */
const CAKE_SVG =
  '<g fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"/><path d="M2 21h20M7 8v3M12 8v3M17 8v3M7 4h.01M12 4h.01M17 4h.01"/></g>';

export const loc = (locale: string) => (locale === "fr" ? "fr-FR" : "en-GB");
const dayLong = (ms: number, locale: string, tz: string) => dateFormat(loc(locale), { timeZone: tz, day: "numeric", month: "long", year: "numeric" }).format(new Date(ms));
export const dayShort = (ms: number, locale: string, tz: string) => dateFormat(loc(locale), { timeZone: tz, day: "numeric", month: "short" }).format(new Date(ms));
const timeOf = (ms: number, tz: string) => dateFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(ms));
/** "24°10' Gemini". */
const lonWords = (lon: number, locale: string) => `${formatDegree(lon)} ${signName(SIGN_IDS[Math.floor((((lon % 360) + 360) % 360) / 30)]!, locale === "fr" ? "fr" : "en")}`;
/** A birthday's day as written ("2026-11-03"), said: "3 November 2026". */
const dayWords = (day: string, locale: string) => {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return dateFormat(loc(locale), { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" }).format(new Date(Date.UTC(y, m - 1, d, 12)));
};

const TITLE: Record<Exclude<PeopleKind, "saturn">, CalendarPeopleWordKey> = {
  birthday: "cplTitleBirthday",
  solar: "cplTitleSolar",
  uranus: "cplTitleUranus",
  chiron: "cplTitleChiron",
};
const SHORT: Record<PeopleKind, CalendarPeopleWordKey> = {
  birthday: "cplShortBirthday",
  solar: "cplShortSolar",
  saturn: "cplShortSaturn",
  uranus: "cplShortUranus",
  chiron: "cplShortChiron",
};

/** "Camille’s solar return", « Retour solaire de Camille ». */
export function personTitle(ev: PersonEvent, locale: string): string {
  const vars = { name: ev.name, deName: deFr(ev.name) };
  if (ev.kind === "saturn") return cpWord(locale, ev.nth === 3 ? "cplTitleSaturn3" : ev.nth === 2 ? "cplTitleSaturn2" : "cplTitleSaturn1", vars);
  return cpWord(locale, TITLE[ev.kind], vars);
}

/** "Camille · birthday", for a day's cell and a pointer's card. */
export const personShort = (ev: PersonEvent, locale: string): string => `${ev.name} · ${cpWord(locale, SHORT[ev.kind])}`;

/** The line under a title: "turns 37", "21:32", "21:32 · at 29". */
export function personDetail(ev: PersonEvent, locale: string, tz: string): string {
  if (ev.kind === "birthday") return cpWord(locale, "cplTurns", { n: ev.age });
  if (ev.uncertain) return cpWord(locale, "cplAround", { date: dayShort(ev.t, locale, tz) });
  return [timeOf(ev.t, tz), ev.kind === "solar" ? "" : cpWord(locale, "cplAge", { n: ev.age })].filter(Boolean).join(" · ");
}

/** The event's reading: what it is, when (in the Calendar's clock and the birthplace's), the way to the person's chart and transits. */
export function personReading(ev: PersonEvent, locale: string, tz: string): ElementReading {
  const vars = { name: ev.name, deName: deFr(ev.name) };
  const lon = ev.natalLon != null ? lonWords(ev.natalLon, locale) : "";
  const date = ev.kind === "birthday" ? dayWords(ev.day, locale) : dayLong(ev.t, locale, tz);
  const facts: ReadingFact[] = [];
  let lead: string;
  if (ev.kind === "birthday") {
    lead = cpWord(locale, "cplLeadBirthday", { ...vars, n: ev.age, date });
  } else if (ev.kind === "solar") {
    lead = ev.uncertain ? cpWord(locale, "cplLeadSolarDay", { ...vars, lon, date }) : cpWord(locale, "cplLeadSolar", { ...vars, lon, date, time: timeOf(ev.t, tz) });
  } else {
    lead = cpWord(locale, ev.kind === "saturn" ? "cplLeadSaturn" : ev.kind === "uranus" ? "cplLeadUranus" : "cplLeadChiron", { ...vars, lon, date });
  }
  if (ev.kind !== "birthday") {
    facts.push({ label: cpWord(locale, "cplFactExact"), value: ev.uncertain ? cpWord(locale, "cplAround", { date: dayShort(ev.t, locale, tz) }) : `${date}, ${timeOf(ev.t, tz)}` });
    // The moment in the birthplace's clock, where a return's chart is cast.
    if (!ev.uncertain && ev.birthZone) facts.push({ label: cpWord(locale, "cplFactBirthplace"), value: cpWord(locale, "cplAtBirthplace", { time: `${dayShort(ev.t, locale, ev.birthZone)}, ${timeOf(ev.t, ev.birthZone)}`, city: zoneCity(ev.birthZone) }) });
    if (lon) facts.push({ label: cpWord(locale, "cplFactNatal"), value: lon });
  }
  const window = ev.window
    ? ev.window.passes.length > 1
      ? cpWord(locale, "cplWindow", { from: dayShort(ev.window.from, locale, tz), to: dayShort(ev.window.to, locale, tz), n: ev.window.passes.length, passes: ev.window.passes.map((p) => dayShort(p, locale, tz)).join(", ") })
      : cpWord(locale, "cplWindowOne", { from: dayShort(ev.window.from, locale, tz), to: dayShort(ev.window.to, locale, tz) })
    : "";
  if (ev.window) facts.push({ label: cpWord(locale, "cplFactWindow"), value: `${dayShort(ev.window.from, locale, tz)} – ${dayShort(ev.window.to, locale, tz)}` });
  const rows = [
    { ref: `open-chart:${ev.personId}:natal`, label: cpWord(locale, "cplOpen", vars) },
    ...(ev.kind === "birthday" || ev.uncertain ? [] : [{ ref: `open-chart:${ev.personId}:transits:${Math.round(ev.t)}`, label: cpWord(locale, "cplSky", vars), detail: `${dayShort(ev.t, locale, tz)}, ${timeOf(ev.t, tz)}` }]),
  ];
  return {
    id: ev.id,
    kind: "planet",
    title: personTitle(ev, locale),
    kicker: [ev.kind === "birthday" ? dayWords(ev.day, locale) : date, personDetail(ev, locale, tz)].join(" · "),
    // A birthday draws its cake; a return, the planet that returns.
    markSvg: ev.kind === "birthday" ? CAKE_SVG : undefined,
    glyph: ev.kind === "birthday" ? undefined : ev.kind === "solar" ? "sun" : ev.kind,
    lead,
    paragraphs: [lead, ...(window ? [window] : [])],
    facts,
    sections: window ? [{ id: "window", title: cpWord(locale, "cplFactWindow"), paragraphs: [window] }] : undefined,
    links: { title: personShort(ev, locale), rows },
    about: { title: cpWord(locale, "cplAboutTitle"), paragraphs: [cpWord(locale, "cplAbout1"), cpWord(locale, "cplAbout2")] },
  };
}

/** The event as an item of a calendar file (only when the reader includes them): a birthday as its whole day, a return at its moment. */
export function personIcsItem(r: PeopleRow, locale: string, tz: string): IcsItem {
  const ev = r.ev;
  const uid = `${ev.id.replaceAll(":", "-")}@ulune.app`;
  if (ev.kind === "birthday" || ev.uncertain) {
    const [y, m, d] = ev.day.split("-").map(Number) as [number, number, number];
    const next = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
    return { uid, start: r.t, days: { from: ev.day, to: next }, summary: `${personTitle(ev, locale)} (${personDetail(ev, locale, tz)})` };
  }
  return { uid, start: ev.t, summary: personTitle(ev, locale), description: personDetail(ev, locale, tz) };
}

/** The calendar file's question, with the layer on: off by default, the file holds no names. */
export function peopleIcsWords(locale: string): { ask: string; off: string; on: string } {
  return { ask: cpWord(locale, "cplIcsInclude"), off: cpWord(locale, "cplIcsHint"), on: cpWord(locale, "cplIcsOn") };
}
