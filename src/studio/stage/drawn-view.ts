import { CalendarDays, ChartGantt, Circle, Shapes } from "lucide-react";
import { useI18n } from "@/lib/i18n/locale";
import { useStudioStore } from "@/studio/store";

/** The drawn view is named for what it draws: the calendar, the bodygraph and numerology's cycles are no wheels. */
export function useDrawnView() {
  const { t } = useI18n();
  const studioPage = useStudioStore((s) => s.page);
  return studioPage === "timing"
    ? { name: t("viewCalendar"), Icon: CalendarDays, switch: t("viewSwitchCalendar") }
    : studioPage === "design"
      ? { name: t("viewBodygraph"), Icon: Shapes, switch: t("viewSwitchBodygraph") }
      : studioPage === "numerology-cycles"
        ? { name: t("viewTimeline"), Icon: ChartGantt, switch: t("viewSwitchTimeline") }
        : { name: t("viewWheel"), Icon: Circle, switch: t("viewSwitch") };
}

