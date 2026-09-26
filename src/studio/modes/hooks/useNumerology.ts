import { useMemo } from "react";
import { castNumerology, givenBirthName } from "@/lib/chart/numerology";
import { usePack } from "@/lib/content/packs";
import { useI18n } from "@/lib/i18n/locale";
import { useStudioStore } from "@/studio/store";

export function useNumerology() {
  const { locale } = useI18n();
  const chart = useStudioStore((s) => s.chart);
  const birthName = useStudioStore((s) => s.input.name);
  const selectedId = useStudioStore((s) => s.selectedId);
  const page = useStudioStore((s) => s.page);
  const enabled = page === "numerology" && Boolean(chart);
  // Worked out while the numerology page is shown (and kept for the way back).
  const numbers = useMemo(
    () => (enabled && chart ? castNumerology(chart, { name: givenBirthName(birthName, chart) }) : null),
    [enabled, chart, birthName],
  );
  const named = Boolean(numbers?.name);
  // The readings come with the numerology text (its own download).
  const pack = usePack("num", locale, enabled);
  const reading = useMemo(
    () => (numbers && pack ? pack.numerologyReading(numbers, selectedId, locale) : null),
    [numbers, pack, selectedId, locale],
  );
  return useMemo(() => ({ numbers, named, reading, enabled }), [numbers, named, reading, enabled]);
}
