/*
 * Chinese astrology in time and between two people (languages plan,
 * part 11): the year ahead for a reader's animals, the twelve solar months
 * of a year, the day's animal and the animal it clashes with, and the
 * relations between two people's animals. Pure arithmetic on the engine
 * (pillars.ts, terms.ts) and the relations (relations.ts); nothing leaves
 * the device.
 *
 * The tradition names the year's branch its ruler, the Tai Sui (太歲): an
 * animal meets it as its own year (本命年, the same animal), or in a clash,
 * harm, punishment or destruction with it, or in harmony or a trine.
 */
import { LICHUN, termMs } from "./terms";
import { dayPillarOfDay, pillarOf, type Pillar } from "./pillars";
import { yearCycleOf } from "./lunar";
import { RELATION_KINDS, branchRelations, type RelationKind } from "./relations";
import type { ZodiacChart, ZodiacPlaceId } from "./zodiac";

/** How an animal meets a time's (or another person's) animal: the same animal, or a relation. */
export type MeetKind = "same" | RelationKind;

/** In the order they are read: the same animal, then the tensions, then the meetings. */
export const MEET_ORDER: readonly MeetKind[] = ["same", "clash", "punishment", "harm", "destruction", "self-punishment", "harmony", "trine"];

/** How two branches meet: "same" for one animal (with its self-punishment when it has one), else their relations. */
export function meetKinds(a: number, b: number): MeetKind[] {
  const x = ((a % 12) + 12) % 12;
  const y = ((b % 12) + 12) % 12;
  const kinds: MeetKind[] = x === y ? ["same", ...branchRelations(x, y)] : branchRelations(x, y);
  return kinds.sort((p, q) => MEET_ORDER.indexOf(p) - MEET_ORDER.indexOf(q));
}

/** The first kind in reading order, or null when the two animals neither meet nor oppose. */
export const firstKind = (kinds: readonly MeetKind[]): MeetKind | null => kinds[0] ?? null;

export type PlaceMeeting = { place: ZodiacPlaceId; branch: number; kinds: MeetKind[] };

/** How each of the reader's animals meets a branch (a year's, a month's, a day's). */
export function meetingsWith(z: ZodiacChart, branch: number): PlaceMeeting[] {
  return z.places.map((p) => ({ place: p.id, branch: p.branch, kinds: meetKinds(p.branch, branch) }));
}

export type MonthAhead = {
  /** 0 = the Tiger month (from Lichun) … 11 = the Ox month (from Xiaohan, in January of the next year). */
  index: number;
  fromMs: number;
  toMs: number;
  pillar: Pillar;
  yours: PlaceMeeting[];
};

export type YearAhead = {
  /** The Gregorian year whose Lichun opens it (2026: 4 February 2026 to 4 February 2027). */
  year: number;
  fromMs: number;
  toMs: number;
  pillar: Pillar;
  yours: PlaceMeeting[];
  months: MonthAhead[];
};

/** The first and last years the page steps through (the term table's span, with room). */
export const FIRST_YEAR = 1900;
export const LAST_YEAR = 2100;

/** The jie that opens solar month `index` of the year opened by Lichun of `year`. */
function monthOpens(year: number, index: number): number {
  // Lichun (term 0) … Daxue (20) fall in the same Gregorian year; Xiaohan (22) in the January after.
  return index < 11 ? termMs(year, 2 * index) : termMs(year + 1, 22);
}

/** The year ahead for a reader's animals: the year's pillar, how each animal meets it, and its twelve solar months. */
export function yearAhead(z: ZodiacChart, year: number): YearAhead {
  const pillar = pillarOf(yearCycleOf(year));
  const months: MonthAhead[] = Array.from({ length: 12 }, (_, index) => {
    const mp = pillarOf(12 * (year - 1984) + index + 2);
    return {
      index,
      fromMs: monthOpens(year, index),
      toMs: index < 11 ? monthOpens(year, index + 1) : termMs(year + 1, LICHUN),
      pillar: mp,
      yours: meetingsWith(z, mp.branch),
    };
  });
  return { year, fromMs: termMs(year, LICHUN), toMs: termMs(year + 1, LICHUN), pillar, yours: meetingsWith(z, pillar.branch), months };
}

/** The solar year (by Lichun) an instant is in: the page's "this year". */
export function yearAheadOf(ms: number): number {
  const y = new Date(ms).getUTCFullYear();
  return ms >= termMs(y, LICHUN) ? y : y - 1;
}

/** The day number (days from 1 January 1970) of a calendar date. */
export const dayOfDate = (year: number, month: number, day: number): number => {
  const d = new Date(0);
  d.setUTCFullYear(year, month - 1, day);
  return Math.round(d.getTime() / 86_400_000);
};

export type DayAnimal = {
  pillar: Pillar;
  /** The animal it clashes with: the one opposite (the almanac's "clash" of the day). */
  clashes: number;
};

/**
 * The day's pillar and animal of a calendar date, and the animal it clashes
 * with. The almanac reads the date as the calendar shows it, from midnight
 * (the Rat hour that opens it at 23:00 belongs to the birth readings).
 */
export function dayAnimalOf(year: number, month: number, day: number): DayAnimal {
  const pillar = dayPillarOfDay(dayOfDate(year, month, day));
  return { pillar, clashes: (pillar.branch + 6) % 12 };
}

/** Every relation between two people's animals, place by place (A's year with B's year, A's year with B's month…), in reading order. */
export type PairMeeting = { a: ZodiacPlaceId; b: ZodiacPlaceId; branchA: number; branchB: number; kinds: MeetKind[] };

export function pairMeetings(za: ZodiacChart, zb: ZodiacChart): PairMeeting[] {
  const out: PairMeeting[] = [];
  for (const a of za.places) {
    for (const b of zb.places) {
      const kinds = meetKinds(a.branch, b.branch);
      if (kinds.length) out.push({ a: a.id, b: b.id, branchA: a.branch, branchB: b.branch, kinds });
    }
  }
  const PLACE = ["year", "month", "day", "hour"];
  // The year animals first, then the day animals (the self with a partner), then the rest by place.
  const weight = (m: PairMeeting) => (m.a === "year" && m.b === "year" ? 0 : m.a === "day" && m.b === "day" ? 1 : 2);
  return out.sort((x, y) => weight(x) - weight(y) || PLACE.indexOf(x.a) - PLACE.indexOf(y.a) || PLACE.indexOf(x.b) - PLACE.indexOf(y.b));
}

/** Every kind this module can give, for the tests and the texts. */
export const MEET_KINDS: readonly MeetKind[] = ["same", ...RELATION_KINDS];
