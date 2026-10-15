import { MODE_META } from "@/studio/modes/meta";
import { useStudioStore } from "@/studio/store";

/*
 * Whether the stage has a way out to offer (its Export menu on a computer,
 * the ⋯ menu's Export part on a phone): with a chart; on the Calendar, whose
 * sky needs none (its file and its table are its ways out, reorganisation
 * plan R5); on another page that needs none (Feng Shui's Home, languages
 * plan part 27, review fix FS13), in its table, whose text and CSV are its
 * ways out. Its own file, so ExportMenu.tsx exports components only.
 */
export function useExportShown(): boolean {
  return useStudioStore((s) => s.chart != null || s.page === "timing" || (!MODE_META[s.page].needsChart && s.view === "table"));
}
