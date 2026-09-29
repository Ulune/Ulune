import { useMemo } from "react";
import { castNumerology, numerologyNameFrom, numerologyOptionsOf } from "@/lib/chart/numerology";
import { usePack } from "@/lib/content/packs";
import { useI18n } from "@/lib/i18n/locale";
import { useNumerologyFirstPending } from "@/studio/numerology-first";
import { useNumerologyYear } from "@/studio/numerology-year";
import { useStudioStore } from "@/studio/store";

export function useNumerology() {
  const { locale } = useI18n();
  const chart = useStudioStore((s) => s.chart);
  const name = useStudioStore((s) => s.input.name);
  const birthName = useStudioStore((s) => s.input.birthName);
  const currentName = useStudioStore((s) => s.input.currentName);
  const numerologyY = useStudioStore((s) => s.input.numerologyY);
  const selectedId = useStudioStore((s) => s.selectedId);
  const page = useStudioStore((s) => s.page);
  const year = useNumerologyYear();
  const enabled = page === "numerology" && Boolean(chart);
  // Worked out while the numerology page is shown (and kept for the way back),
  // for the year the wheel's stepper is on.
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
  const firstPending = useNumerologyFirstPending();
  const first = Boolean(numbers) && firstPending && selectedId == null;
  const reading = useMemo(
    () => (numbers && pack ? pack.numerologyReading(numbers, selectedId ?? (first ? null : "core:lifepath"), locale) : null),
    [numbers, pack, selectedId, locale, first],
  );
  return useMemo(
    () => ({ numbers, named, nameFrom, reading, enabled, first }),
    [numbers, named, nameFrom, reading, enabled, first],
  );
}
