import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { door } from "@/lib/engine/door";
import { usePack } from "@/lib/content/packs";
import type { HdView, HumanDesignChart } from "@/lib/chart/human-design";
import { useI18n } from "@/lib/i18n/locale";
import { useScopeId, useScopeKey, useScoped } from "@/studio/scope";
import { useStudioStore } from "@/studio/store";
import { errorForState } from "@/lib/i18n/errors";
import { keptOr, useKeep } from "@/studio/return-parts";
import { noteBodygraph } from "@/encyclopedia/your-chart";

/**
 * The last bodygraphs cast, for this tab only, by birth: the same birth gives
 * the same chart, so coming back to the page (from another page of the
 * studio, or from outside it, R6) draws it at once instead of asking the
 * server again. A few, not one: Compare draws two charts' at once (share and
 * compare plan, feature 2), and neither may push the other's out.
 */
const lastHd = new Map<string, HumanDesignChart>();
/** Four: Compare's two, and the connection chart's two (modes/design-pair.tsx, which shares this memory). */
const LAST_HD_MAX = 4;

/** A birth's key in that memory: its moment, and the day's span when it has no time. */
export const hdKeyOf = (utc: string, timeUnknown: boolean | undefined): string => `${utc}|${timeUnknown ? 720 : ""}`;

/** A bodygraph cast in this tab already, by its key (null when none). */
export const keptHd = (key: string): HumanDesignChart | null => lastHd.get(key) ?? null;

export function keepHd(key: string, hd: HumanDesignChart) {
  lastHd.delete(key);
  lastHd.set(key, hd);
  for (const old of lastHd.keys()) {
    if (lastHd.size <= LAST_HD_MAX) break;
    lastHd.delete(old);
  }
}

/** The bodygraph of the chart of the scope around the caller (studio/scope.tsx), its layer and the chosen piece's reading. */
export function useHumanDesign() {
  const { locale, t } = useI18n();
  const chart = useScoped((s) => s.chart);
  const creating = useScoped((s) => s.creating);
  const page = useStudioStore((s) => s.page);
  const selectedId = useScoped((s) => s.selectedId);
  const main = useScopeId() === "main";
  const enabled = page === "design" && Boolean(chart) && !creating;
  const viewKey = useScopeKey("hd-view");
  const [view, setView] = useState<HdView>(() => keptOr(viewKey, "both"));
  useKeep(viewKey, view);
  const utc = chart?.meta.utc ?? "";
  // Without a birth time the chart is cast at noon; the server casts the
  // rest of the day too and says what could differ.
  const spanMinutes = chart?.meta.timeUnknown ? 720 : undefined;
  const hdKey = `${utc}|${spanMinutes ?? ""}`;
  const [hd, setHd] = useState<HumanDesignChart | null>(() => lastHd.get(hdKey) ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const ready = useRef(hd !== null);

  useEffect(() => {
    if (!enabled || !utc) return;
    const cached = lastHd.get(hdKey) ?? null;
    if (cached && tick === 0) {
      ready.current = true;
      setHd(cached);
      setBusy(false);
      setError(null);
      return;
    }
    let cancelled = false;
    if (!ready.current) setBusy(true);
    setError(null);
    // Through the "calculate" door: this device or Ulune's server, as Settings says (on-device plan, step 4).
    void door
      .castHumanDesign({ data: spanMinutes ? { natalUtc: utc, spanMinutes } : { natalUtc: utc } })
      .then((next) => {
        if (cancelled) return;
        ready.current = true;
        keepHd(hdKey, next);
        // For the encyclopedia's "In your chart" in this tab (part 18): the chart shown's, not a Compare pane's.
        if (main) noteBodygraph(hdKey, next);
        setHd(next);
        setBusy(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(errorForState(err));
        setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, utc, spanMinutes, hdKey, t, tick, main]);

  // The readings come with the Human Design text (its own download).
  const pack = usePack("hd", locale, enabled);
  const reading = useMemo(
    () => (hd && pack ? pack.hdReading(hd, selectedId, locale, view, chart) : null),
    [hd, pack, selectedId, locale, view, chart],
  );
  const retry = useCallback(() => setTick((n) => n + 1), []);

  return useMemo(
    () => ({ hd, view, setView, busy, error, retry, reading, enabled }),
    [hd, view, busy, error, retry, reading, enabled],
  );
}
