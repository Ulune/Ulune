/*
 * What the Calendar loads for its flying stars' layer (languages plan, part
 * 25): the month's star from each month's opening solar term (a jie), the
 * year's from Lichun, and the stars of any day. Its own download, with the
 * engine's term table.
 */
import { termsOfYear, isJie } from "./terms";
import { monthCentre, yearCentre, yearStarsAt } from "./fengshui-years";
import { solarYearOf } from "./pillars";
import { starOf, type StarNumber } from "./fengshui-stars";

export { yearStarsAt };

export type StarChange = {
  /** The jie, UT ms. */
  t: number;
  /** The month's star from then on. */
  month: StarNumber;
  /** At Lichun, the year's star from then on; null at the other jie. */
  year: StarNumber | null;
};

/** The stars' changes between two instants: one at each jie. */
export function starChangesBetween(from: number, to: number): StarChange[] {
  const out: StarChange[] = [];
  const first = new Date(from).getUTCFullYear() - 1;
  const last = new Date(to).getUTCFullYear();
  for (let year = first; year <= last; year += 1) {
    for (const m of termsOfYear(year)) {
      if (!isJie(m.term) || m.ms < from || m.ms >= to) continue;
      // Just after the jie: the month it opens (Lichun opens month 0 of a new solar year).
      const at = m.ms + 1;
      const sy = solarYearOf(at);
      const index = m.term / 2;
      out.push({ t: m.ms, month: monthCentre(sy, index), year: m.term === 0 ? yearCentre(sy) : null });
    }
  }
  return out.sort((a, b) => a.t - b.t);
}

/** A star by its number and colour: "1 White", « 8 Blanc ». */
export const starName = (n: number, locale: string): string => (locale === "fr" ? starOf(n).fr : starOf(n).en);
