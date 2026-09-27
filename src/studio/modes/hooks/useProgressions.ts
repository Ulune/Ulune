import { browserZone } from "@/lib/chart/client-zone";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { castProgressions } from "@/lib/chart/functions";
import { usePack } from "@/lib/content/packs";
import { progressedUtcFromNatal, yearsOfLife } from "@/lib/chart/progressions";
import { isAbort, lru } from "@/lib/chart/result-cache";
import { provisionalProgressedSky } from "@/lib/chart/sky-window";
import { onWindow, prefetchWindows, windowAt } from "@/lib/chart/window-cache";
import type { Placement, ProgressedSky } from "@/lib/chart/types";
import { useI18n } from "@/lib/i18n/locale";
import { natalBodiesOf } from "@/studio/modes/hooks/natal-bodies";
import { useStudioStore } from "@/studio/store";
import { errorForState } from "@/lib/i18n/errors";

function natalTimeOf(chart: { meta: { time?: string } }): string {
  const raw = chart.meta.time || "12:00";
  const [h = "00", m = "00"] = raw.split(":");
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
}

export function natalUtcOf(chart: { meta: { utc: string; date: string; timezone?: string; time?: string } }): Date {
  const parsed = new Date(chart.meta.utc);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  const tz = browserZone(chart.meta.timezone);
  return fromZonedTime(`${chart.meta.date}T${natalTimeOf(chart)}:00`, tz);
}

export function dateInZone(at: Date, tz: string): string {
  return formatInTimeZone(at, tz, "yyyy-MM-dd");
}

export function targetFromIsoDate(date: string, chart: { meta: { timezone?: string; time?: string } }): Date | null {
  if (!date) return null;
  const tz = browserZone(chart.meta.timezone);
  const next = fromZonedTime(`${date}T${natalTimeOf(chart)}:00`, tz);
  return Number.isNaN(next.getTime()) ? null : next;
}

/** Exact progressed skies already cast in this tab, by moment and natal chart. */
const skyCache = lru<ProgressedSky>(48);
/** As for transits (useTransitSky): a provisional sky while the slider moves, the exact cast once it holds still. */
const SETTLE_MS = 150;
const DEBOUNCE_MS = 50;

function outerBodies(sky: ProgressedSky, planets: Placement[]): Placement[] {
  return [
    ...planets.filter((p) => p.kind !== "angle"),
    sky.angles.ascendant,
    sky.angles.midheaven,
  ];
}

export function useProgressions() {
  const { locale, t } = useI18n();
  const chart = useStudioStore((s) => s.chart);
  const creating = useStudioStore((s) => s.creating);
  const page = useStudioStore((s) => s.page);
  const targetMs = useStudioStore((s) => s.time.progressionTarget);
  const enabled = page === "progressions" && Boolean(chart) && !creating;
  const natalUtc = useMemo(() => (chart ? natalUtcOf(chart) : new Date()), [chart]);
  const tz = browserZone(chart?.meta.timezone);
  const at = Math.max(targetMs, natalUtc.getTime());

  /** On screen: the exact cast, or a provisional sky while the slider moves. */
  const [sky, setSky] = useState<ProgressedSky | null>(null);
  /** The last exact cast (the readings are built from it). */
  const [exactSky, setExactSky] = useState<ProgressedSky | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [winTick, setWinTick] = useState(0);
  const gen = useRef(0);
  const ready = useRef(false);
  const base = useRef<{ natal: string; meta: ProgressedSky["meta"] } | null>(null);
  const shown = useRef<{ key: string; exact: boolean } | null>(null);
  const natalCusps = useMemo(() => (chart ? chart.houses.map((h) => h.ecliptic) : []), [chart]);
  const natalBodies = useMemo(() => (chart ? natalBodiesOf(chart) : []), [chart]);
  const natalSig = useMemo(
    () =>
      chart
        ? [
            natalUtc.toISOString(),
            chart.meta.latitude,
            chart.meta.longitude,
            chart.meta.houseSystem ?? "",
            natalCusps.join(","),
            natalBodies.map((b) => `${b.id}:${b.ecliptic}`).join(","),
          ].join("|")
        : "",
    [chart, natalUtc, natalCusps, natalBodies],
  );

  useEffect(() => onWindow(() => setWinTick((n) => n + 1)), []);

  // While the slider moves: the progressed sky from the scrub window.
  useEffect(() => {
    if (!enabled || !chart) return;
    const prog = progressedUtcFromNatal(natalUtc, new Date(at)).getTime();
    prefetchWindows(prog, 4);
    const b = base.current;
    if (!b || b.natal !== natalSig) return;
    const key = `${at}|${natalSig}`;
    if (shown.current?.key === key && shown.current.exact) return;
    const win = windowAt(prog);
    if (!win) return;
    const target = new Date(at);
    const iso = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, "Z");
    const next = provisionalProgressedSky(
      win,
      prog,
      {
        ...b.meta,
        targetUtc: iso(target),
        progressedUtc: iso(new Date(prog)),
        local: "",
        yearsOfLife: yearsOfLife(natalUtc, target),
      },
      natalCusps,
      natalBodies,
    );
    if (!next) return;
    shown.current = { key, exact: false };
    setSky(next);
  }, [enabled, chart, at, natalUtc, natalSig, natalCusps, natalBodies, winTick]);

  // The exact cast (Swiss, with exact dates), once the moment holds still.
  useEffect(() => {
    if (!enabled || !chart) return;
    const key = `${at}|${natalSig}`;
    const show = (next: ProgressedSky) => {
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
    const prog = progressedUtcFromNatal(natalUtc, new Date(at)).getTime();
    const moving = base.current?.natal === natalSig && windowAt(prog) != null;
    const delay = !ready.current ? 0 : moving ? SETTLE_MS : DEBOUNCE_MS;
    const handle = window.setTimeout(() => {
      if (!ready.current) setBusy(true);
      setError(null);
      void castProgressions({
        data: {
          natalUtc: natalUtc.toISOString(),
          targetUtc: new Date(at).toISOString(),
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
          setError(errorForState(err));
          setBusy(false);
        });
    }, delay);
    return () => {
      window.clearTimeout(handle);
      ctrl.abort();
    };
  }, [enabled, at, natalSig, natalCusps, natalBodies, chart, natalUtc, t, tick]);

  const shownPlanets = useMemo(() => (sky ? sky.planets : []), [sky]);

  const shownAngles = useMemo(() => (sky ? sky.angles : undefined), [sky]);

  const shownSky = useMemo((): ProgressedSky | null => {
    if (!sky) return null;
    return { ...sky, planets: shownPlanets, angles: shownAngles ?? sky.angles };
  }, [sky, shownPlanets, shownAngles]);

  // The readings come with the reading text (its own download), built from
  // the exact cast (a provisional sky has no exact dates).
  const astro = usePack("astro", locale, enabled);
  const dossier = useMemo(
    () => (exactSky && chart && astro ? astro.buildProgressedDossier(chart, exactSky, locale) : null),
    [exactSky, chart, locale, astro],
  );

  // Stable between renders: a new array each time defeated the wheel's memo, so
  // every slider step and every pin re-rendered the whole bi-wheel.
  const outer = useMemo(
    () => (shownSky ? outerBodies(shownSky, shownPlanets) : []),
    [shownSky, shownPlanets],
  );
  const yearsNow = yearsOfLife(natalUtc, new Date(at));
  const retry = useCallback(() => {
    ready.current = false;
    setTick((n) => n + 1);
  }, []);

  return useMemo(
    () => ({ shownSky, outer, dossier, busy, error, retry, at, natalUtc, tz, yearsNow, enabled }),
    [shownSky, outer, dossier, busy, error, retry, at, natalUtc, tz, yearsNow, enabled],
  );
}
