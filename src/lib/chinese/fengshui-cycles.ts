/*
 * Feng Shui's Cycles: your directions through the years (share and compare
 * plan, feature 5d, decision R4). The year's and the month's flying stars
 * (fengshui-years.ts, languages plan, part 25) laid over a person's eight
 * directions, the Eight Mansions of their Kua (fengshui.ts, part 21).
 *
 *   - Any solar year and solar month: the year turns at Lichun and the month
 *     at its opening jie, as the stars themselves do; the stars of a month
 *     are those of an instant just inside it.
 *   - Each direction: the year's and the month's star there; the year's
 *     afflictions it holds (the 5 Yellow, the Grand Duke's mountain, the Year
 *     Breaker's, the Three Killings) and the month's 5 Yellow; with a Kua,
 *     the person's mansion there.
 *   - What the year makes of it, for that person: a supportive direction is
 *     strengthened when a supportive star visits it and no affliction falls
 *     there; it rests when an affliction falls there or a star that asks for
 *     calm visits it; otherwise it stays steady. A challenging direction
 *     rests or stays as it is. The stars are read as the home page reads them
 *     (fengshui-readings-texts.ts, ANNUAL_NOTES): the 1, 4, 6, 8 and 9
 *     supportive, the 2 and the 5 asking for calm, the 3 and the 7 mixed.
 *   - The Three Killings may be faced but not sat on (可向不可坐): facing the
 *     direction across from them puts them at your back, which the classics
 *     advise against. That direction is never strengthened (steady at most)
 *     nor the one to face (review of 2.0's week 3).
 *   - This year's direction to face for new starts: the first supportive
 *     mansion, in the classical order (Sheng Qi first), that the year
 *     strengthens, else the first that stays steady and does not put the
 *     Three Killings at your back.
 *
 * Suggestions about timing only, never about a place's worth. Pure; tested in
 * scripts/chinese-fengshui-cycles.test.mjs. Nothing is sent.
 */
import { DIRECTION_IDS, MANSION_IDS, type DirectionId, type FengShui, type MansionId } from "./fengshui";
import { mountainById, type MountainId } from "./fengshui-home";
import type { StarNumber } from "./fengshui-stars";
import { yearStarsAt, type AfflictionId, type YearStars } from "./fengshui-years";
import { XIAOHAN, termMs } from "./terms";

/** The years the dial walks (as numerology's and Chinese astrology's). */
export const CYCLES_FIRST_YEAR = 1900;
export const CYCLES_LAST_YEAR = 2100;

/** The year's afflictions in the order the page lists them. */
export const CYCLE_AFFLICTIONS: readonly AfflictionId[] = ["five-yellow", "tai-sui", "year-breaker", "three-killings"];

/** The instant a solar month opens (UT ms): month 0 at Lichun … month 10 at Daxue; month 11 at Xiaohan, early in the next Gregorian year. */
export function solarMonthStart(solarYear: number, monthIndex: number): number {
  const m = ((Math.trunc(monthIndex) % 12) + 12) % 12;
  return m === 11 ? termMs(solarYear + 1, XIAOHAN) : termMs(solarYear, 2 * m);
}

/** The year's and the month's stars of a solar year and month (an hour into the month, past its jie). */
export function starsOfMonth(solarYear: number, monthIndex: number): YearStars {
  return yearStarsAt(solarMonthStart(solarYear, monthIndex) + 3_600_000);
}

/** One month on (or back) from a solar month, across the solar year's turn. */
export function stepMonth(solarYear: number, monthIndex: number, by: number): { year: number; month: number } {
  const n = solarYear * 12 + monthIndex + by;
  return { year: Math.floor(n / 12), month: ((n % 12) + 12) % 12 };
}

export type StarKind = "supportive" | "calm" | "mixed";

/** How a visiting star is read: the 2 and the 5 ask for calm, the 3 and the 7 are mixed, the others supportive. */
export const starKind = (n: StarNumber): StarKind => (n === 2 || n === 5 ? "calm" : n === 3 || n === 7 ? "mixed" : "supportive");

/** A direction under the year and the month, the same for everyone. */
export type DirectionYear = {
  direction: DirectionId;
  /** The year's star there, and the month's. */
  year: StarNumber;
  month: StarNumber;
  /** The year's afflictions falling there, in CYCLE_AFFLICTIONS's order. */
  afflictions: AfflictionId[];
  /** The Grand Duke's or the Year Breaker's mountain, when it stands there (one of the direction's three). */
  mountains: { id: MountainId; affliction: "tai-sui" | "year-breaker" }[];
  /** The month's 5 Yellow visits it. */
  monthFive: boolean;
  /** The year's Three Killings fall across from it: facing it puts them at your back. */
  killingsBehind: boolean;
};

/** The direction across the compass: at your back as you face `d`. */
export const oppositeOf = (d: DirectionId): DirectionId => DIRECTION_IDS[(DIRECTION_IDS.indexOf(d) + 4) % 8]!;

/** The eight directions under a year's and a month's stars, clockwise from the north. */
export function directionsOfYear(y: YearStars): DirectionYear[] {
  const a = y.afflictions;
  return DIRECTION_IDS.map((d) => {
    const mountains: DirectionYear["mountains"] = [];
    if (mountainById(a.taiSui).direction === d) mountains.push({ id: a.taiSui, affliction: "tai-sui" });
    if (mountainById(a.yearBreaker).direction === d) mountains.push({ id: a.yearBreaker, affliction: "year-breaker" });
    const afflictions = CYCLE_AFFLICTIONS.filter((id) =>
      id === "five-yellow" ? a.fiveYellow === d : id === "three-killings" ? a.threeKillings.direction === d : mountains.some((m) => m.affliction === id),
    );
    return {
      direction: d,
      year: y.yearChart[d],
      month: y.monthChart[d],
      afflictions,
      mountains,
      monthFive: a.monthFiveYellow === d,
      killingsBehind: oppositeOf(d) === a.threeKillings.direction,
    };
  });
}

export type CycleState = "strengthened" | "steady" | "rest";

/**
 * What the year makes of a direction for a person: strengthened, steady or resting. A direction that
 * would put the Three Killings at your back is steady at most: not a side to face.
 */
export function stateOf(supportive: boolean, star: StarNumber, afflicted: boolean, killingsBehind = false): CycleState {
  if (afflicted || starKind(star) === "calm") return "rest";
  return supportive && starKind(star) === "supportive" && !killingsBehind ? "strengthened" : "steady";
}

/** A person's direction under the year. */
export type PersonDirection = DirectionYear & { mansion: MansionId; rank: number; supportive: boolean; state: CycleState };

/** A person's eight directions under a year's and a month's stars (one count's Kua). */
export type PersonYear = {
  fs: FengShui;
  /** Clockwise from the north. */
  directions: PersonDirection[];
  /** Each mansion's direction under the year, Sheng Qi first. */
  byMansion: PersonDirection[];
  /** The supportive directions the year strengthens, and those it asks to rest (Sheng Qi first). */
  strengthened: DirectionId[];
  resting: DirectionId[];
  /** The challenging directions that rest too. */
  quiet: DirectionId[];
  /**
   * The direction to face for new starts this year: strengthened, else steady without the Three Killings
   * behind it (null when all four rest, or the one left would put them at your back).
   */
  best: DirectionId | null;
};

export function personYear(fs: FengShui, y: YearStars, dirs: readonly DirectionYear[] = directionsOfYear(y)): PersonYear {
  const directions: PersonDirection[] = dirs.map((x) => {
    const own = fs.directions.find((r) => r.direction === x.direction)!;
    return { ...x, mansion: own.mansion, rank: own.rank, supportive: own.supportive, state: stateOf(own.supportive, x.year, x.afflictions.length > 0, x.killingsBehind) };
  });
  const byMansion = MANSION_IDS.map((m) => directions.find((x) => x.mansion === m)!);
  const good = byMansion.filter((x) => x.supportive);
  const best = good.find((x) => x.state === "strengthened") ?? good.find((x) => x.state === "steady" && !x.killingsBehind) ?? null;
  return {
    fs,
    directions,
    byMansion,
    strengthened: good.filter((x) => x.state === "strengthened").map((x) => x.direction),
    resting: good.filter((x) => x.state === "rest").map((x) => x.direction),
    quiet: byMansion.filter((x) => !x.supportive && x.state === "rest").map((x) => x.direction),
    best: best?.direction ?? null,
  };
}

/** A person's direction under the year, by its id. */
export const personDirection = (p: PersonYear, d: DirectionId): PersonDirection => p.directions.find((x) => x.direction === d)!;
