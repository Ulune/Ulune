import type { ElementReading, NatalChart } from "@/lib/chart/types";
import { useAiReadingFocus } from "@/lib/ai/use-ai-surface";

export function AiReadingFocus({
  chart,
  reading,
}: {
  chart: NatalChart | null | undefined;
  reading: ElementReading | null;
}) {
  useAiReadingFocus(chart, reading);
  return null;
}
