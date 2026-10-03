import { useAspectLayer, type BiWheelKind } from "@/lib/chart/aspect-layer-pref";
import { useChartView } from "@/lib/chart/use-chart-view";
import { useStudioStore } from "@/studio/store";

const BIWHEEL: Partial<Record<string, BiWheelKind>> = { transits: "transit", progressions: "progressions", synastry: "synastry" };

export function useWheelView() {
  const view = useChartView();
  const chart = useStudioStore((s) => s.chart);
  const selectedId = useStudioStore((s) => s.selectedId);
  const pick = useStudioStore((s) => s.pick);
  const choose = useStudioStore((s) => s.choose);
  const casting = useStudioStore((s) => s.casting);
  const composing = useStudioStore((s) => s.composing);
  const page = useStudioStore((s) => s.page);
  const [aspectLayer, setAspectLayer] = useAspectLayer(BIWHEEL[page] ?? null);
  return {
    chart,
    selectedId,
    pick,
    choose,
    casting,
    composing,
    visible: view.visible,
    aspectFilter: view.aspectFilter,
    overlays: view.overlays,
    starVisible: view.starVisible,
    midpointVisible: view.midpointVisible,
    readingDepth: view.readingDepth,
    aspectLayer,
    setAspectLayer,
  };
}
