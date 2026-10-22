import { useMemo } from "react";
import { castNumerology, numerologyNameFrom, numerologyOptionsOf } from "@/lib/chart/numerology";
import { usePack } from "@/lib/content/packs";
import { useI18n } from "@/lib/i18n/locale";
import { useNumerologyFirstPending } from "@/studio/numerology-first";
import { useNumerologyYear } from "@/studio/numerology-year";
import { useScoped, useScopedPage } from "@/studio/scope";
import { useScopedYear } from "@/studio/scope-time";

/**
 * Numerology's data for one of its pages: the numbers wheel (`numerology`,
 * always this year) or its Cycles (`numerology-cycles`, the year the toolbar's
 * steps are on; page reorganisation, numerology's Cycles lens), for the
 * chart and names of the scope around the caller (studio/scope.tsx). The
 * year stepped to is shared by every scope, as the other pages' time is, but
 * by a Compare pane with a moment of its own (studio/scope-time.ts).
 */
export function useNumerology(target: "numerology" | "numerology-cycles" = "numerology") {
  const { locale } = useI18n();
  const chart = useScoped((s) => s.chart);
  const name = useScoped((s) => s.input.name);
  const birthName = useScoped((s) => s.input.birthName);
  const currentName = useScoped((s) => s.input.currentName);
  const numerologyY = useScoped((s) => s.input.numerologyY);
  const selectedId = useScoped((s) => s.selectedId);
  const page = useScopedPage();
  const stepped = useScopedYear(useNumerologyYear());
  const cycles = target === "numerology-cycles";
  const year = cycles ? stepped : null;
  const enabled = page === target && Boolean(chart);
  // Worked out while its page is shown (and kept for the way back): the wheel
  // for this year, the Cycles for the year stepped to.
  const numbers = useMemo(
    () =>
      enabled && chart
        ? castNumerology(chart, {
            ...numerologyOptionsOf({ name, birthName, currentName, numerologyY }, chart),
            ...(year != null ? { calendarYear: year } : {}),
          })
        : null,
    [enabled, chart, name, birthName, currentName, numerologyY, year],
  );
  const named = Boolean(numbers?.name);
  // Where the name numbers' name comes from (the table's Name part says so).
  const nameFrom = useMemo(
    () => (chart ? numerologyNameFrom({ name, birthName }, chart) : null),
    [chart, name, birthName],
  );
  // The readings come with the numerology text (its own download).
  const pack = usePack("num", locale, enabled);
  // With nothing chosen: the first read for a newcomer (part 63), then the Life Path's reading.
  // On the Cycles page, the year shown is read when nothing is chosen.
  const firstPending = useNumerologyFirstPending();
  const first = !cycles && Boolean(numbers) && firstPending && selectedId == null;
  const fallback = cycles ? (numbers ? `year:${numbers.calendarYear}` : null) : first ? null : "core:lifepath";
  const reading = useMemo(
    () => (numbers && pack ? pack.numerologyReading(numbers, selectedId ?? fallback, locale) : null),
    [numbers, pack, selectedId, locale, fallback],
  );
  return useMemo(
    () => ({ numbers, named, nameFrom, reading, enabled, first }),
    [numbers, named, nameFrom, reading, enabled, first],
  );
}
