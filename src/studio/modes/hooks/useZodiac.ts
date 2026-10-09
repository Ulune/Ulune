import { useMemo } from "react";
import type { NatalChart } from "@/lib/chart/types";
import type { ChinesePrefs } from "@/lib/chinese/prefs";
import { zodiacChart, type ZodiacChart } from "@/lib/chinese/zodiac";

/** A cast chart's four animals, on the reader's clock and day boundary (Chinese astrology's pages). */
export function zodiacOf(chart: NatalChart | null, prefs: Pick<ChinesePrefs, "clock" | "dayBoundary">): ZodiacChart | null {
  if (!chart) return null;
  return zodiacChart(
    { utc: chart.meta.utc, date: chart.meta.date, time: chart.meta.time, longitude: chart.meta.longitude, timeUnknown: chart.meta.timeUnknown },
    { clock: prefs.clock, dayBoundary: prefs.dayBoundary },
  );
}

/** The same, kept between renders while its page is shown. */
export function useZodiacOf(chart: NatalChart | null, prefs: Pick<ChinesePrefs, "clock" | "dayBoundary">, enabled: boolean): ZodiacChart | null {
  return useMemo(() => (enabled ? zodiacOf(chart, prefs) : null), [enabled, chart, prefs.clock, prefs.dayBoundary]); // eslint-disable-line react-hooks/exhaustive-deps
}
