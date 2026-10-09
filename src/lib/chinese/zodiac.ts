/*
 * Chinese astrology's chart (languages plan, language 1, part 7): the four
 * animals of a birth, read from the four pillars the engine gives
 * (pillars.ts). The year animal is the one most people know ("I'm a Horse");
 * the month, day and hour animals make the zodiac personal. Each comes with
 * its pillar (the stem over the branch: "Yang Metal Horse", Geng-Wu 庚午),
 * the branch's own phase, and the pillar's Na Yin.
 *
 * Pure: the birth comes from a cast chart's own meta (its instant, the
 * birthplace's longitude and the civil clock's offset), the reader's clock
 * and day boundary from Settings (prefs.ts). Nothing leaves the device.
 */
import { BRANCHES, naYinOf, STEMS, type NaYin, type PhaseId, type Polarity } from "./names";
import { fourPillars, monthPillarAt, yearPillarAt, type BirthMoment, type Clock, type DayBoundary, type FourPillars, type Pillar } from "./pillars";

export type ZodiacPlaceId = "year" | "month" | "day" | "hour";
export const ZODIAC_PLACES: readonly ZodiacPlaceId[] = ["year", "month", "day", "hour"];

export type ZodiacPlace = {
  id: ZodiacPlaceId;
  pillar: Pillar;
  /** The animal, as its branch: 0 = Rat … 11 = Pig. */
  branch: number;
  stem: number;
  /** The branch's own phase (the Horse is Fire), and the stem's (Geng is Metal): "Yang Metal Horse". */
  branchPhase: PhaseId;
  stemPhase: PhaseId;
  polarity: Polarity;
  naYin: NaYin;
  /** Another reading of the birth time could change it (pillars.ts, `uncertain`). */
  uncertain: boolean;
};

export type ZodiacChart = {
  /** Year, month, day, and the hour when the birth time is known. */
  places: ZodiacPlace[];
  pillars: FourPillars;
  /** The year animal counted from Chinese New Year, as most people learned it, when it differs from Lichun's. */
  newYearAnimal: number | null;
  timeUnknown: boolean;
  /** The birth instant (UT ms). */
  birthMs: number;
  /** The year and the solar month an instant ("now") is in: their animals are marked on the wheel. */
  now: { year: Pillar; month: Pillar };
};

/** What the zodiac needs of a cast chart. */
export type ZodiacBirth = {
  /** The birth instant, ISO (the chart's `meta.utc`). */
  utc: string;
  /** The local date and time of the birth, as given ("1990-06-15", "12:00"). */
  date: string;
  time: string;
  longitude: number;
  timeUnknown?: boolean;
};

const MINUTE_MS = 60_000;

/** The engine's birth: the instant, the longitude, and the civil clock's offset (the local time given minus the instant). */
export function birthMomentOf(b: ZodiacBirth): BirthMoment | null {
  const ms = Date.parse(b.utc);
  const d = /^(-?\d{1,4})-(\d{1,2})-(\d{1,2})$/.exec(b.date.trim());
  const t = /^(\d{1,2}):(\d{2})/.exec(b.time.trim());
  if (!Number.isFinite(ms) || !d || !Number.isFinite(b.longitude)) return null;
  const local = new Date(0);
  local.setUTCFullYear(Number(d[1]), Number(d[2]) - 1, Number(d[3]));
  local.setUTCHours(t ? Number(t[1]) : 12, t ? Number(t[2]) : 0, 0, 0);
  return {
    ms,
    longitude: b.longitude,
    utcOffsetMinutes: Math.round((local.getTime() - ms) / MINUTE_MS),
    timeUnknown: Boolean(b.timeUnknown),
  };
}

function placeOf(id: ZodiacPlaceId, pillar: Pillar, uncertain: boolean): ZodiacPlace {
  const stem = STEMS[pillar.stem]!;
  const branch = BRANCHES[pillar.branch]!;
  return {
    id,
    pillar,
    branch: pillar.branch,
    stem: pillar.stem,
    branchPhase: branch.phase,
    stemPhase: stem.phase,
    polarity: stem.polarity,
    naYin: naYinOf(pillar.cycle),
    uncertain,
  };
}

/** The four animals of a birth, on the reader's clock and day boundary. */
export function zodiacChart(
  birth: ZodiacBirth,
  options: { clock?: Clock; dayBoundary?: DayBoundary; nowMs?: number } = {},
): ZodiacChart | null {
  const moment = birthMomentOf(birth);
  if (!moment) return null;
  // The civil clock needs the offset, which every cast chart gives; true solar time by default.
  const pillars = fourPillars(moment, { clock: options.clock, dayBoundary: options.dayBoundary });
  const places: ZodiacPlace[] = [
    placeOf("year", pillars.year, pillars.uncertain.year),
    placeOf("month", pillars.month, pillars.uncertain.month),
    placeOf("day", pillars.day, pillars.uncertain.day),
  ];
  if (pillars.hour) places.push(placeOf("hour", pillars.hour, pillars.uncertain.hour));
  const nowMs = options.nowMs ?? Date.now();
  return {
    places,
    pillars,
    newYearAnimal: pillars.animal.lunarNewYear !== pillars.animal.lichun ? pillars.animal.lunarNewYear : null,
    timeUnknown: Boolean(moment.timeUnknown),
    birthMs: moment.ms,
    now: { year: yearPillarAt(nowMs), month: monthPillarAt(nowMs) },
  };
}

/** The angle of a branch on the wheel, degrees clockwise from the top: the Rat (north) at 0, the Rabbit (east) at 90, the Horse (south) at 180. */
export const branchAngle = (branch: number): number => (((branch % 12) + 12) % 12) * 30;
