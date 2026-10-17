import { useCallback, useSyncExternalStore } from "react";
import { currentChartHover, onChartHover } from "./preview-bus";

const server = () => null;

/**
 * The chart element under the pointer right now (for companion highlights),
 * in a chart scope (preview-bus.ts; the caller passes its own, studio/scope.tsx).
 */
export function useChartHoverId(scope = "main"): string | null {
  const subscribe = useCallback((fn: () => void) => onChartHover(() => fn(), scope), [scope]);
  return useSyncExternalStore(subscribe, () => currentChartHover(scope), server);
}
