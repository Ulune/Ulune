import { useSyncExternalStore } from "react";
import { currentChartHover, onChartHover } from "./preview-bus";

const subscribe = (fn: () => void) => onChartHover(() => fn());
const server = () => null;

/** The chart element under the pointer right now (for companion highlights). */
export function useChartHoverId(): string | null {
  return useSyncExternalStore(subscribe, currentChartHover, server);
}
