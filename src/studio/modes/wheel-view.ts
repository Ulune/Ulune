import { useAspectLayer, type BiWheelKind } from "@/lib/chart/aspect-layer-pref";
import { useChartView } from "@/lib/chart/use-chart-view";
import { useScoped } from "@/studio/scope";
import { useStudioStore } from "@/studio/store";

const BIWHEEL: Partial<Record<string, BiWheelKind>> = { transits: "transit", progressions: "progressions", synastry: "synastry" };

/**
 * What a page's figure, panels and table read of its chart: the chart and
 * its selection come from the chart scope (studio/scope.tsx: the main one,
 * or a Compare pane's), the Look and the page are the studio's, shared.
 */
export function useWheelView() {
  const view = useChartView();
  const chart = useScoped((s) => s.chart);
  const selectedId = useScoped((s) => s.selectedId);
  const pick = useScoped((s) => s.pick);
  const choose = useScoped((s) => s.choose);
  const casting = useScoped((s) => s.casting);
  const composing = useScoped((s) => s.composing);
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
