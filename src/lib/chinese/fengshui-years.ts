/*
 * The years' and months' flying stars (languages plan, part 25: "annual and
 * monthly stars, in the page and the calendar"), on top of a home's chart.
 *
 *   - The year's star (年紫白): the number in the centre for a solar year
 *     (Lichun to Lichun), one less each year: 1 White in 2026, 9 Purple in
 *     2027, 2 Black in 2025. It flies forward.
 *   - The month's star (月紫白): the number in the centre for a solar month
 *     (jie to jie), one less each month from the Tiger month's, which the
 *     year's branch gives (子午卯酉八白, 辰戌丑未五黃, 寅申巳亥二黑: a Rat,
 *     Horse, Rabbit or Rooster year opens with the 8, a Dragon, Dog, Ox or
 *     Goat year with the 5, a Tiger, Monkey, Snake or Pig year with the 2).
 *     It flies forward.
 *   - The year's afflictions the classics place by the year: where the 5
 *     Yellow flies, the Grand Duke (太歲, the year's branch), the Year
 *     Breaker (歲破, the branch opposite) and the Three Killings (三煞, the
 *     direction opposite the year's trine: south for a Monkey, Rat or
 *     Dragon year, north for Tiger, Horse or Dog, east for Snake, Rooster or
 *     Ox, west for Pig, Rabbit or Goat). The month's 5 Yellow too.
 *
 * Pure; tested in scripts/chinese-fengshui-years.test.mjs. Nothing is sent.
 */
import type { DirectionId } from "./fengshui";
import { mountainById, type MountainId } from "./fengshui-home";
import { FLIGHT, fly, type PalaceId, type StarNumber } from "./fengshui-stars";
import { solarMonthAt, solarYearOf } from "./pillars";
import { BRANCHES } from "./names";

const wrap = (n: number): StarNumber => ((((n - 1) % 9) + 9) % 9 + 1) as StarNumber;

/** The year's star in the centre: 1 White in 2026, one less each year. */
export const yearCentre = (solarYear: number): StarNumber => wrap(1 - (solarYear - 2026));

/** The year's branch, 0 the Rat (子). */
export const yearBranch = (solarYear: number): number => (((solarYear - 4) % 12) + 12) % 12;

/** The month's star in the centre: the Tiger month's by the year's branch, one less each month after. */
export function monthCentre(solarYear: number, monthIndex: number): StarNumber {
  const b = yearBranch(solarYear);
  const first = [0, 6, 3, 9].includes(b) ? 8 : [4, 10, 1, 7].includes(b) ? 5 : 2;
  return wrap(first - monthIndex);
}

export type AfflictionId = "five-yellow" | "tai-sui" | "year-breaker" | "three-killings";

export type YearStars = {
  solarYear: number;
  monthIndex: number;
  /** The jie that opened the month and the one that closes it, UT ms. */
  monthFrom: number;
  monthTo: number;
  year: StarNumber;
  month: StarNumber;
  yearChart: Record<PalaceId, StarNumber>;
  monthChart: Record<PalaceId, StarNumber>;
  afflictions: {
    fiveYellow: PalaceId;
    monthFiveYellow: PalaceId;
    taiSui: MountainId;
    yearBreaker: MountainId;
    threeKillings: { direction: DirectionId; mountains: MountainId[] };
  };
};

const BRANCH_MOUNTAIN = (b: number): MountainId => BRANCHES[((b % 12) + 12) % 12]!.id as MountainId;

/** The Three Killings: opposite the direction of the year's trine. */
function threeKillings(branch: number): { direction: DirectionId; mountains: MountainId[] } {
  // 申子辰 (water) → south; 寅午戌 (fire) → north; 巳酉丑 (metal) → east; 亥卯未 (wood) → west.
  const trine = branch % 4; // 0: 子辰申, 2: 寅午戌, 1: 丑巳酉, 3: 卯未亥
  const direction: DirectionId = trine === 0 ? "s" : trine === 2 ? "n" : trine === 1 ? "e" : "w";
  const ids: Record<"s" | "n" | "e" | "w", MountainId[]> = { s: ["bing", "wu", "ding"], n: ["ren", "zi", "gui"], e: ["jia", "mao", "yi"], w: ["geng", "you", "xin"] };
  return { direction, mountains: ids[direction as "s"] };
}

const fiveIn = (chart: Record<PalaceId, StarNumber>): PalaceId => FLIGHT.find((p) => chart[p] === 5)!;

/** The year's and the month's stars at an instant. */
export function yearStarsAt(ms: number): YearStars {
  const solarYear = solarYearOf(ms);
  const m = solarMonthAt(ms);
  const year = yearCentre(solarYear);
  const month = monthCentre(m.year, m.index);
  const yearChart = fly(year, true);
  const monthChart = fly(month, true);
  const b = yearBranch(solarYear);
  return {
    solarYear,
    monthIndex: m.index,
    monthFrom: m.fromMs,
    monthTo: m.toMs,
    year,
    month,
    yearChart,
    monthChart,
    afflictions: {
      fiveYellow: fiveIn(yearChart),
      monthFiveYellow: fiveIn(monthChart),
      taiSui: BRANCH_MOUNTAIN(b),
      yearBreaker: BRANCH_MOUNTAIN(b + 6),
      threeKillings: threeKillings(b),
    },
  };
}

/** The palace a mountain stands in (its direction). */
export const palaceOfMountain = (id: MountainId): DirectionId => mountainById(id).direction;
