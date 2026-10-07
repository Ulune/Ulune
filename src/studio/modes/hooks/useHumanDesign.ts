import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { castHumanDesign } from "@/lib/chart/functions";
import { usePack } from "@/lib/content/packs";
import type { HdView, HumanDesignChart } from "@/lib/chart/human-design";
import { useI18n } from "@/lib/i18n/locale";
import { useStudioStore } from "@/studio/store";
import { errorForState } from "@/lib/i18n/errors";
import { keptOr, useKeep } from "@/studio/return-parts";

/**
 * The last bodygraph cast, for this tab only: the same birth gives the same
 * chart, so coming back to the page (from another page of the studio, or from
 * outside it, R6) draws it at once instead of asking the server again.
 */
let lastHd: { key: string; hd: HumanDesignChart } | null = null;

export function useHumanDesign() {
  const { locale, t } = useI18n();
  const chart = useStudioStore((s) => s.chart);
  const creating = useStudioStore((s) => s.creating);
  const page = useStudioStore((s) => s.page);
  const selectedId = useStudioStore((s) => s.selectedId);
  const enabled = page === "design" && Boolean(chart) && !creating;
  const [view, setView] = useState<HdView>(() => keptOr("hd-view", "both"));
  useKeep("hd-view", view);
  const utc = chart?.meta.utc ?? "";
  // Without a birth time the chart is cast at noon; the server casts the
  // rest of the day too and says what could differ.
  const spanMinutes = chart?.meta.timeUnknown ? 720 : undefined;
  const hdKey = `${utc}|${spanMinutes ?? ""}`;
  const [hd, setHd] = useState<HumanDesignChart | null>(() => (lastHd?.key === hdKey ? lastHd.hd : null));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const ready = useRef(hd !== null);

  useEffect(() => {
    if (!enabled || !utc) return;
    const cached = lastHd?.key === hdKey ? lastHd.hd : null;
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
    void castHumanDesign({ data: spanMinutes ? { natalUtc: utc, spanMinutes } : { natalUtc: utc } })
      .then((next) => {
        if (cancelled) return;
        ready.current = true;
        lastHd = { key: hdKey, hd: next };
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
  }, [enabled, utc, spanMinutes, hdKey, t, tick]);

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
