import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { castTransits } from "@/lib/chart/functions";
import { usePack } from "@/lib/content/packs";
import type { TransitSky } from "@/lib/chart/types";
import { useI18n } from "@/lib/i18n/locale";
import { isAbort, lru } from "@/lib/chart/result-cache";
import { provisionalTransitSky } from "@/lib/chart/sky-window";
import { onWindow, prefetchWindows, windowAt, windowsWork } from "@/lib/chart/window-cache";
import { natalBodiesOf } from "@/studio/modes/hooks/natal-bodies";
import { useStudioStore } from "@/studio/store";
import { useVisibleInterval } from "@/lib/use-visible-interval";

/** Exact skies already cast in this tab, by moment and natal chart. */
const skyCache = lru<TransitSky>(48);
/**
 * While the time moves and the scrub window has the moment, the sky is drawn
 * on the client (provisional) and the exact cast waits for the moment to hold
 * still this long; without the window, a short debounce as before.
 */
const SETTLE_MS = 150;
const DEBOUNCE_MS = 50;

export function useTransitSky() {
  const { locale, t } = useI18n();
  const chart = useStudioStore((s) => s.chart);
  const creating = useStudioStore((s) => s.creating);
  const page = useStudioStore((s) => s.page);
  const atMs = useStudioStore((s) => s.time.at);
  const live = useStudioStore((s) => s.time.live);
  const enabled = page === "transits" && Boolean(chart) && !creating;

  /** What is on screen: the exact cast, or a provisional sky while time moves. */
  const [sky, setSky] = useState<TransitSky | null>(null);
  /** The last exact cast (the readings are built from it). */
  const [exactSky, setExactSky] = useState<TransitSky | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [winTick, setWinTick] = useState(0);
  const gen = useRef(0);
  const ready = useRef(false);
  /** The last exact cast's frame (zone, house system) for this natal chart. */
  const base = useRef<{ natal: string; meta: TransitSky["meta"] } | null>(null);
  /** The moment and chart of the sky on screen, and whether it is exact. */
  const shown = useRef<{ key: string; exact: boolean } | null>(null);

  const natalCusps = useMemo(() => (chart ? chart.houses.map((h) => h.ecliptic) : []), [chart]);
  const natalBodies = useMemo(() => (chart ? natalBodiesOf(chart) : []), [chart]);
  /** Every natal input of the cast (the cache key's chart half). */
  const natalSig = useMemo(
    () =>
      chart
        ? [
            chart.meta.latitude,
            chart.meta.longitude,
            chart.meta.houseSystem ?? "",
            natalCusps.join(","),
            natalBodies.map((b) => `${b.id}:${b.ecliptic}`).join(","),
          ].join("|")
        : "",
    [chart, natalCusps, natalBodies],
  );

  // The live sky follows the clock, but not in a hidden tab.
  useVisibleInterval(() => useStudioStore.getState().now(), 60_000, live && enabled);

  // A chunk of the scrub window arriving may let the sky follow at once.
  useEffect(() => onWindow(() => setWinTick((n) => n + 1)), []);

  const retry = useCallback(() => {
    ready.current = false;
    setTick((n) => n + 1);
  }, []);

  // While time moves: the sky from the scrub window, drawn at once.
  useEffect(() => {
    if (!enabled || !chart) return;
    prefetchWindows(atMs);
    const b = base.current;
    if (!b || b.natal !== natalSig) return;
    const key = `${atMs}|${natalSig}`;
    if (shown.current?.key === key && shown.current.exact) return;
    const win = windowAt(atMs);
    if (!win) return;
    const next = provisionalTransitSky(win, atMs, b.meta, natalCusps, natalBodies);
    if (!next) return;
    shown.current = { key, exact: false };
    setSky(next);
  }, [enabled, chart, atMs, natalSig, natalCusps, natalBodies, winTick]);

  // The exact cast (Swiss, with exact times), once the moment holds still.
  useEffect(() => {
    if (!enabled || !chart) return;
    const key = `${atMs}|${natalSig}`;
    const show = (next: TransitSky) => {
      ready.current = true;
      base.current = { natal: natalSig, meta: next.meta };
      shown.current = { key, exact: true };
      setSky(next);
      setExactSky(next);
      setBusy(false);
    };
    const cached = skyCache.get(key);
    if (cached) {
      gen.current += 1;
      setError(null);
      show(cached);
      return;
    }
    const n = ++gen.current;
    const ctrl = new AbortController();
    const moving = base.current?.natal === natalSig && windowAt(atMs) != null;
    const delay = !ready.current ? 0 : moving ? SETTLE_MS : DEBOUNCE_MS;
    const handle = window.setTimeout(() => {
      if (!ready.current) setBusy(true);
      setError(null);
      void castTransits({
        data: {
          at: new Date(atMs).toISOString(),
          latitude: chart.meta.latitude,
          longitude: chart.meta.longitude,
          natalCusps,
          natalBodies,
          houseSystem: chart.meta.houseSystem,
        },
        signal: ctrl.signal,
      })
        .then((next) => {
          skyCache.set(key, next);
          if (n !== gen.current) return;
          show(next);
        })
        .catch((err) => {
          if (n !== gen.current || isAbort(err)) return;
          setError(err instanceof Error && err.message ? err.message : t("couldNotCastSky"));
          setBusy(false);
        });
    }, delay);
    return () => {
      window.clearTimeout(handle);
      ctrl.abort();
    };
  }, [enabled, atMs, natalSig, natalCusps, natalBodies, chart, t, tick]);

  const shownTransits = useMemo(() => (sky ? sky.planets : []), [sky]);

  // The readings of the transits come with the reading text (its own download),
  // built from the exact cast (a provisional sky has no exact times).
  const astro = usePack("astro", locale, enabled);
  const dossier = useMemo(
    () => (exactSky && chart && astro ? astro.buildTransitDossier(chart, exactSky, locale) : null),
    [exactSky, chart, locale, astro],
  );
  const provisional = Boolean(sky?.meta.provisional);
  // Time can move smoothly (Play, dragging) once the window works here.
  const smooth = enabled && windowsWork();

  return useMemo(
    () => ({ sky, shownTransits, dossier, busy, error, retry, atMs, live, enabled, provisional, smooth }),
    [sky, shownTransits, dossier, busy, error, retry, atMs, live, enabled, provisional, smooth],
  );
}
