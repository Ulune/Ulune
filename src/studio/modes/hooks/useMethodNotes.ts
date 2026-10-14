import { useMemo } from "react";
import type { NatalChart } from "@/lib/chart/types";
import { methodNotesOf, type ChinesePageId, type MethodNote } from "@/lib/chinese/method-notes";
import { useChinesePrefs } from "@/lib/chinese/use-chinese-prefs";
import { useI18n } from "@/lib/i18n/locale";

/*
 * The method notes a Chinese page's birth calls for (languages plan, part 29;
 * lib/chinese/method-notes.ts), on the reader's clock and day rule and in the
 * reader's language, followed live; studio/modes/chinese-notes.tsx shows them.
 */

/** A cast chart's birth as the Chinese engine reads it. */
const birthOf = (chart: NatalChart) => ({
  utc: chart.meta.utc,
  date: chart.meta.date,
  time: chart.meta.time,
  longitude: chart.meta.longitude,
  timeUnknown: chart.meta.timeUnknown,
});

/** The notes for the chart a page shows, and on a Pair page for the second person too, each named. */
export function useMethodNotes(page: ChinesePageId, chart: NatalChart | null, pair?: { chart: NatalChart | null; names: { a: string; b: string } }): MethodNote[] {
  const { locale } = useI18n();
  const { clock, dayBoundary, script, show } = useChinesePrefs();
  const partner = pair?.chart ?? null;
  const nameA = pair?.names.a;
  const nameB = pair?.names.b;
  return useMemo(() => {
    const prefs = { clock, dayBoundary, script, show };
    const notes = chart ? methodNotesOf(birthOf(chart), page, prefs, locale, nameA) : [];
    return partner ? [...notes, ...methodNotesOf(birthOf(partner), page, prefs, locale, nameB)] : notes;
  }, [page, chart, partner, nameA, nameB, clock, dayBoundary, script, show, locale]);
}
