/**
 * Birthdays and returns of the charts you keep (share and compare plan, idea
 * B10): the Calendar layer that puts each kept person's birthday on its day,
 * their solar return at its exact moment, and the big returns of a life when
 * the period shown holds them: the Saturn returns (around 29, 58 and 88), the
 * Uranus opposition (around 40) and the Chiron return (around 50).
 *
 *   - The people are the charts the studio holds: the private space's when one
 *     is open, else the ones made in this tab (never anything else); a group
 *     of the space can narrow them (B5).
 *   - A birthday is the birth's own date (as typed, in the birthplace), each
 *     year, on that day of the Calendar's clock; 29 February keeps 28 February
 *     in a year without one. The birth year itself is not a birthday.
 *   - The solar return is the moment the Sun comes back to its place at the
 *     birth, found on this device in the sky's chunks the Calendar holds (the
 *     same search as your transits, personal-transits.ts), within seconds of
 *     Swiss Ephemeris; it is the same moment everywhere, said in the
 *     Calendar's clock and in the birthplace's. A birth without a time gives
 *     its day only.
 *   - The big returns come from the year files around the period: every exact
 *     pass of transiting Saturn over the natal Saturn (a Saturn return) after
 *     20, of Uranus opposite the natal Uranus after 30, of Chiron over the
 *     natal Chiron after 35, each with its window within 1°.
 *
 * Pure: worked out here from what the Calendar has already, so nothing about
 * a person is asked of anyone, and nothing is kept but in memory. Names stay
 * on the page; the ids carry the chart's own id (a random one) and the
 * birthday's year or the return's day, never a date of birth.
 * scripts/calendar-people.test.mjs checks it.
 */
import { slowWindowsFromYears, transitsFromWindows, type TransitWindow } from "./personal-transits";
import type { SkyWindow } from "./sky-window";
import type { SkyYear } from "./sky-year";
import { civilFromUtc, civilKey, utcFromCivil, type CivilDate } from "./timing-window";
import type { NatalChart } from "./types";

export type PeopleKind = "birthday" | "solar" | "saturn" | "uranus" | "chiron";
/** The kinds in the order a day lists them. */
export const PEOPLE_KINDS: readonly PeopleKind[] = ["birthday", "solar", "saturn", "uranus", "chiron"];

/** A kept chart as the layer reads it: its id in the library, its name as the switcher shows it, the chart. */
export type PersonSource = { id: string; name: string; chart: NatalChart };

export type PersonEvent = {
  /** "ppl:birthday:<chart id>:2026" (its year), "ppl:solar:<chart id>:20260615", "ppl:saturn:<chart id>:20200123" (the day of the return or the pass, UT): no date of birth, no name. */
  id: string;
  kind: PeopleKind;
  personId: string;
  name: string;
  /** ms UTC: a birthday's day starting in the Calendar's clock; a return's exact moment. */
  t: number;
  /** The day it falls on in the Calendar's clock, "2026-11-03". */
  day: string;
  /** The age turned (a birthday), or reached at the pass (a return). */
  age: number;
  /** A Saturn return's order: the first (around 29), the second (around 58), the third (around 88). */
  nth?: number;
  /** A return's window within 1°, with all its exact passes. */
  window?: { from: number; to: number; passes: number[] };
  /** Without a birth time: the solar return's day is all it can say. */
  uncertain?: boolean;
  /** Where the birth was, for the moment in its own clock. */
  birthZone: string;
  /** The natal longitude returned to (the Sun's, Saturn's…), degrees. */
  natalLon: number | null;
};

const DAY_MS = 86_400_000;
const YEAR_MS = 365.2422 * DAY_MS;

/** A birth's date as typed ("1990-06-15"); null when it cannot be read. */
function birthDate(chart: NatalChart): CivilDate | null {
  const m = /^(-?\d{1,4})-(\d{2})-(\d{2})$/.exec(chart.meta.date ?? "");
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

const leap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/** The birthday in a year: the birth's month and day, 29 February keeping 28 February in a year without one. */
export function birthdayIn(birth: CivilDate, year: number): CivilDate {
  if (birth.month === 2 && birth.day === 29 && !leap(year)) return { year, month: 2, day: 28 };
  return { year, month: birth.month, day: birth.day };
}

/** The id of an event: the chart's own id, the kind, and the birthday's year or the return's day in UT ("20260615"), never a date of birth. */
export const peopleEventId = (kind: PeopleKind, personId: string, when: number | string): string => `ppl:${kind}:${personId}:${when}`;

/** A return's day in UT, for its id: "20260615" (one solar return a day; a slow planet's passes are months apart). */
const passDay = (ms: number): string => new Date(ms).toISOString().slice(0, 10).replaceAll("-", "");

/** Every birthday in [from, to) on the Calendar's clock. */
export function birthdaysBetween(people: readonly PersonSource[], from: number, to: number, tz: string): PersonEvent[] {
  const out: PersonEvent[] = [];
  const y0 = new Date(from).getUTCFullYear() - 1;
  const y1 = new Date(to).getUTCFullYear() + 1;
  for (const p of people) {
    const birth = birthDate(p.chart);
    if (!birth) continue;
    for (let year = Math.max(y0, birth.year + 1); year <= y1; year += 1) {
      const day = birthdayIn(birth, year);
      const t = utcFromCivil({ ...day, hour: 0, minute: 0 }, tz).getTime();
      if (t < from || t >= to) continue;
      out.push({
        id: peopleEventId("birthday", p.id, year),
        kind: "birthday",
        personId: p.id,
        name: p.name,
        t,
        day: civilKey(day),
        age: year - birth.year,
        birthZone: p.chart.meta.timezone,
        natalLon: null,
      });
    }
  }
  return out;
}

const natalLonOf = (chart: NatalChart, id: string): number | null => {
  const p = chart.planets.find((x) => x.id === id);
  return p && Number.isFinite(p.ecliptic) ? p.ecliptic : null;
};

/** The day an instant falls on in a clock. */
const dayOf = (ms: number, tz: string) => civilKey(civilFromUtc(new Date(ms), tz));

/**
 * Every solar return in [from, to): the Sun back on its natal place, from the sky's chunks (which must
 * cover the span and a day and a half each side; nothing is found otherwise).
 */
export function solarReturnsBetween(people: readonly PersonSource[], wins: readonly SkyWindow[], from: number, to: number, tz: string): PersonEvent[] {
  const out: PersonEvent[] = [];
  for (const p of people) {
    const sun = natalLonOf(p.chart, "sun");
    const birthMs = Date.parse(p.chart.meta.utc);
    if (sun == null || !Number.isFinite(birthMs)) continue;
    const hits = transitsFromWindows(wins, [{ id: "sun", ecliptic: sun }], from, to, ["sun"]).filter((h) => h.type === "conjunction" && h.natal === "sun");
    for (const h of hits) {
      const t = Date.parse(h.exactUtc);
      // The birth itself is no return.
      if (t - birthMs < 300 * DAY_MS) continue;
      out.push({
        id: peopleEventId("solar", p.id, passDay(t)),
        kind: "solar",
        personId: p.id,
        name: p.name,
        t,
        day: dayOf(t, tz),
        age: Math.round((t - birthMs) / YEAR_MS),
        uncertain: p.chart.meta.timeUnknown === true || undefined,
        birthZone: p.chart.meta.timezone,
        natalLon: sun,
      });
    }
  }
  return out;
}

/** The big returns read: the moving body, the aspect to its own natal place, and the youngest age it counts from. */
const BIG_RETURNS: readonly { kind: "saturn" | "uranus" | "chiron"; body: "saturn" | "uranus" | "chiron"; type: "conjunction" | "opposition"; minAge: number }[] = [
  { kind: "saturn", body: "saturn", type: "conjunction", minAge: 20 },
  { kind: "uranus", body: "uranus", type: "opposition", minAge: 30 },
  { kind: "chiron", body: "chiron", type: "conjunction", minAge: 35 },
];

/** A Saturn return's order by the age at its pass: around 29, 58 and 88. */
export const saturnNth = (age: number): number => (age < 45 ? 1 : age < 75 ? 2 : 3);

/**
 * Every exact pass of a big return in [from, to), with its window within 1°, from the year files around
 * the span (contiguous years holding it).
 */
export function bigReturnsBetween(people: readonly PersonSource[], years: readonly SkyYear[], from: number, to: number, tz: string): PersonEvent[] {
  const out: PersonEvent[] = [];
  if (!years.length) return out;
  for (const p of people) {
    const birthMs = Date.parse(p.chart.meta.utc);
    if (!Number.isFinite(birthMs)) continue;
    const natal = BIG_RETURNS.map((r) => ({ id: r.body, ecliptic: natalLonOf(p.chart, r.body) })).filter((x): x is { id: "saturn" | "uranus" | "chiron"; ecliptic: number } => x.ecliptic != null);
    if (!natal.length) continue;
    const windows: TransitWindow[] = slowWindowsFromYears(years, natal, from, to);
    for (const r of BIG_RETURNS) {
      for (const w of windows) {
        if (w.moving !== r.body || w.natal !== r.body || w.type !== r.type) continue;
        for (const t of w.passes) {
          if (t < from || t >= to) continue;
          const age = (t - birthMs) / YEAR_MS;
          if (age < r.minAge) continue;
          out.push({
            id: peopleEventId(r.kind, p.id, passDay(t)),
            kind: r.kind,
            personId: p.id,
            name: p.name,
            t,
            day: dayOf(t, tz),
            age: Math.floor(age),
            ...(r.kind === "saturn" ? { nth: saturnNth(age) } : {}),
            window: { from: w.from, to: w.to, passes: [...w.passes] },
            birthZone: p.chart.meta.timezone,
            natalLon: natal.find((x) => x.id === r.body)?.ecliptic ?? null,
          });
        }
      }
    }
  }
  return out;
}

/** Everything the layer shows in [from, to), in time order (a day's birthday first). */
export function peopleEvents(
  people: readonly PersonSource[],
  sky: { wins: readonly SkyWindow[]; years: readonly SkyYear[] },
  from: number,
  to: number,
  tz: string,
): PersonEvent[] {
  const all = [...birthdaysBetween(people, from, to, tz), ...solarReturnsBetween(people, sky.wins, from, to, tz), ...bigReturnsBetween(people, sky.years, from, to, tz)];
  const seen = new Set<string>();
  return all
    .filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)))
    .sort((a, b) => a.t - b.t || PEOPLE_KINDS.indexOf(a.kind) - PEOPLE_KINDS.indexOf(b.kind) || a.name.localeCompare(b.name));
}

/** The people a group keeps (null: everyone), in the library's order. */
export function peopleOfGroup(people: readonly PersonSource[], members: readonly string[] | null): PersonSource[] {
  if (!members) return [...people];
  const keep = new Set(members);
  return people.filter((p) => keep.has(p.id));
}

/** The events of one day ("2026-11-03"). */
export function eventsOfDay(events: readonly PersonEvent[], day: string): PersonEvent[] {
  return events.filter((e) => e.day === day);
}
