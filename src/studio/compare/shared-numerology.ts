import { numerologyYear, valueOfCore, type NumerologyChart, type NumerologyCoreId } from "@/lib/chart/numerology";
import { isMaster, wholeText, type NumerologyValue } from "@/lib/chart/numerology-reduce";
import type { AppLocale } from "@/lib/i18n/messages";
import { numerologyCoreLabel, numerologyPageText, numerologyWheelText } from "@/lib/i18n/numerology-ui";
import type { StudioPage } from "@/studio/url";
import { both, type SharedItem, type SharedSay, type SharedSide } from "@/studio/compare/shared";

/*
 * What two people share in numerology (idea B9; shared.ts): on the numbers
 * wheel, the core numbers that are the same (a master number counts as
 * itself: 11/2 is not 2); on Cycles, the personal year and the pinnacle,
 * challenge and period each is in this year, when they bear the same number
 * (each person's own cycle: the ids may differ).
 */

/**
 * The six core numbers the wheel draws (numerology-focus.ts, WHEEL_CORES; held equal by
 * scripts/compare.test.mjs): named here, so Compare's download leaves that file in the page's own.
 */
export const WHEEL_CORES: readonly NumerologyCoreId[] = ["lifepath", "expression", "soulurge", "personality", "birthday", "maturity"];

/*
 * The core numbers' rows of the page's table, for the merged A | B table (merged-numerology.tsx):
 * numerology-table.ts's TABLE_CORES, tableCoreValue, tableCoreLabel and valueNote, held equal to
 * them by scripts/compare.test.mjs. That file shares a download with the Cycles page's life line:
 * taken by Compare, it would come out of it (chinese-ids.ts says why).
 */
export const TABLE_CORES = ["lifepath", "expression", "soulurge", "personality", "birthday", "maturity", "attitude", "rationalThought"] as const;
export type TableCoreId = (typeof TABLE_CORES)[number];

export function tableCoreValue(chart: NumerologyChart, id: TableCoreId): NumerologyValue {
  if (id === "attitude") return chart.attitude;
  if (id === "rationalThought") return chart.rationalThought;
  return valueOfCore(chart, id);
}

export function tableCoreLabel(locale: AppLocale, id: TableCoreId): string {
  return id === "attitude" || id === "rationalThought" ? numerologyPageText(locale, id) : numerologyCoreLabel(locale, id);
}

/** A karmic debt or a master number, in words ("karmic debt 13"). */
export function valueNote(locale: AppLocale, value: NumerologyValue): string {
  if (value.debt) return numerologyPageText(locale, "debtNote", { debt: value.debt });
  if (isMaster(value.number)) return numerologyPageText(locale, "masterNote");
  return "";
}

const numbersOf = (side: SharedSide): NumerologyChart | null => (side.data as { numbers?: NumerologyChart | null } | undefined)?.numbers ?? null;

const same = (x: NumerologyValue, y: NumerologyValue) => x.number != null && y.number != null && wholeText(x) === wholeText(y);

export function sharedItems(page: StudioPage, a: SharedSide, b: SharedSide, locale: "en" | "fr", _say: SharedSay): SharedItem[] {
  const na = numbersOf(a);
  const nb = numbersOf(b);
  if (!na || !nb || na.lifePath.number == null || nb.lifePath.number == null) return [];
  const out: SharedItem[] = [];
  if (page !== "numerology-cycles") {
    for (const id of WHEEL_CORES) {
      const va = valueOfCore(na, id);
      if (same(va, valueOfCore(nb, id))) out.push(both(`num-${id}`, `${numerologyCoreLabel(locale, id)} ${wholeText(va)}`, `core:${id}`));
    }
    return out;
  }
  const year = na.calendarYear;
  const ya = numerologyYear(na, year);
  const yb = numerologyYear(nb, year);
  if (same(ya.personalYear, yb.personalYear)) {
    out.push(both("num-year", `${numerologyCoreLabel(locale, "personalYear")} ${wholeText(ya.personalYear)}`, "core:personalYear"));
  }
  const ca = ya.cycles;
  const cb = yb.cycles;
  if (!ca || !cb) return out;
  for (const kind of ["pinnacle", "challenge", "period"] as const) {
    if (!same(ca[kind].value, cb[kind].value)) continue;
    out.push({
      key: `num-${kind}`,
      label: `${numerologyWheelText(locale, kind)} ${wholeText(ca[kind].value)}`,
      ids: { a: `cycle:${kind}:${ca[kind].index}`, b: `cycle:${kind}:${cb[kind].index}` },
    });
  }
  return out;
}
