import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ElementReading, NatalChart } from "@/lib/chart/types";

export type AiReadingFocus = {
  chart: NatalChart;
  reading: ElementReading;
};

type AiSurfaceApi = {
  open: boolean;
  setOpen: (next: boolean) => void;
  toggle: () => void;
  focus: AiReadingFocus | null;
  setFocus: (next: AiReadingFocus | null) => void;
};

const AiSurfaceContext = createContext<AiSurfaceApi | null>(null);

export function AiSurfaceProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  // The reading Your AI points at changes on every pin; nothing re-renders for
  // it (it used to re-render every AI control), readers take it when they ask.
  const focusRef = useRef<AiReadingFocus | null>(null);
  const setFocus = useCallback((next: AiReadingFocus | null) => {
    focusRef.current = next;
  }, []);

  const toggle = useCallback(() => {
    setOpen((v) => !v);
  }, []);

  const value = useMemo<AiSurfaceApi>(
    () => ({
      open,
      setOpen,
      toggle,
      get focus() {
        return focusRef.current;
      },
      setFocus,
    }),
    [open, toggle, setFocus],
  );

  return createElement(AiSurfaceContext.Provider, { value }, children);
}

export function useAiSurface(): AiSurfaceApi {
  const ctx = useContext(AiSurfaceContext);
  if (!ctx) {
    throw new Error("useAiSurface must be used within AiSurfaceProvider");
  }
  return ctx;
}

/** Keep Your AI pointed at the current click-target while this tree is mounted. */
export function useAiReadingFocus(chart: NatalChart | null | undefined, reading: ElementReading | null) {
  const { setFocus } = useAiSurface();
  const chartKey = chart
    ? `${chart.meta.date}|${chart.meta.time}|${chart.meta.latitude}|${chart.meta.longitude}|${chart.meta.utc}`
    : "";
  const readingKey = reading
    ? `${reading.id}|${reading.title}|${reading.kicker}|${reading.paragraphs[0] ?? ""}`
    : "";
  const latest = useRef({ chart, reading });
  latest.current = { chart, reading };

  useEffect(() => {
    const { chart: nextChart, reading: nextReading } = latest.current;
    if (!nextChart) {
      setFocus(null);
      return () => setFocus(null);
    }
    if (!nextReading) {
      return;
    }
    setFocus({ chart: nextChart, reading: nextReading });
    return () => setFocus(null);
  }, [chartKey, readingKey, setFocus]);
}
