import { browserZone } from "@/lib/chart/client-zone";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { transitsInSlices } from "@/lib/chart/personal-transits";
import { loadWindowsBetween } from "@/lib/chart/window-cache";
import { usePack } from "@/lib/content/packs";
import {
  civilFromUtc,
  civilKey,
  hitsInScope,
  parseCivilKey,
  scopeBounds,
  shiftCivil,
  yearBounds,
  type CivilDate,
} from "@/lib/chart/timing-window";
import { nextHelloExacts, type TimingHit, type TimingScope } from "@/lib/chart/transit-exact";
import type { ElementReading, TimingCast } from "@/lib/chart/types";
import { useI18n } from "@/lib/i18n/locale";
import { natalBodiesOf } from "@/studio/modes/hooks/natal-bodies";
import { useStudioStore } from "@/studio/store";
import { useVisibleInterval } from "@/lib/use-visible-interval";
import { lru } from "@/lib/chart/result-cache";
import { errorForState } from "@/lib/i18n/errors";

/** Timing windows already worked out in this tab (a month, a year), by window and natal chart. */
const castCache = lru<TimingCast>(24);
/** Chunks needed beyond each end: the search looks a day and a half past the window. */
const EDGE_MS = 2 * 86_400_000;

export function useTiming() {
  const { locale, t } = useI18n();
  const chart = useStudioStore((s) => s.chart);
  const creating = useStudioStore((s) => s.creating);
  const page = useStudioStore((s) => s.page);
  const selectedId = useStudioStore((s) => s.selectedId);
  const pick = useStudioStore((s) => s.pick);
  const tz = browserZone(chart?.meta.timezone);
  const enabled = page === "timing" && Boolean(chart) && !creating;

  const [scope, setScope] = useState<TimingScope>("day");
  const [civil, setCivil] = useState<CivilDate>(() => {
    const now = civilFromUtc(new Date(), tz);
    return { year: now.year, month: now.month, day: now.day };
  });
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [cast, setCast] = useState<TimingCast | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const gen = useRef(0);
  const ready = useRef(false);
  const fetchKey = scope === "year" ? `y:${civil.year}` : `m:${civil.year}-${civil.month}`;

  useVisibleInterval(() => setNowMs(Date.now()), 60_000, enabled);

  const natalBodies = useMemo(() => (chart ? natalBodiesOf(chart) : []), [chart]);
  const natalSig = useMemo(
    () =>
      chart
        ? [chart.meta.latitude, chart.meta.longitude, natalBodies.map((b) => `${b.id}:${b.ecliptic}`).join(",")].join("|")
        : "",
    [chart, natalBodies],
  );
  const needed = useMemo(
    () => (scope === "year" ? yearBounds(civil.year, tz) : scopeBounds("month", { ...civil, day: 1 }, tz)),
    // The window depends on the month (or year) only: switching day and month
    // views inside it asks for nothing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fetchKey, tz],
  );

  useEffect(() => {
    if (!enabled || !chart) return;
    const from = needed.from.toISOString();
    const to = needed.to.toISOString();
    const key = `${from}|${to}|${natalSig}`;
    const cached = castCache.get(key);
    if (cached) {
      gen.current += 1;
      ready.current = true;
      setError(null);
      setCast(cached);
      setBusy(false);
      return;
    }
    const n = ++gen.current;
    const ctrl = new AbortController();
    if (!ready.current) setBusy(true);
    setError(null);
    // Worked out here, from the sky chunks (the same for everyone, asked for
    // by date): the chart never leaves the device for the calendar.
    const fromMs = needed.from.getTime();
    const toMs = needed.to.getTime();
    void (async () => {
      const wins = await loadWindowsBetween(fromMs - EDGE_MS, toMs + EDGE_MS);
      if (n !== gen.current || ctrl.signal.aborted) return;
      if (!wins) throw new Error("Failed to fetch the sky");
      const hits = await transitsInSlices(wins, natalBodies, fromMs, toMs, ctrl.signal);
      if (!hits || n !== gen.current) return;
      const next: TimingCast = {
        meta: { from, to, timezone: chart.meta.timezone, latitude: chart.meta.latitude, longitude: chart.meta.longitude },
        hits,
      };
      castCache.set(key, next);
      ready.current = true;
      setCast(next);
      setBusy(false);
    })().catch((err) => {
      if (n !== gen.current) return;
      setError(errorForState(err));
      setBusy(false);
    });
    return () => ctrl.abort();
  }, [enabled, needed, natalSig, natalBodies, chart, t, tick]);

  const bounds = useMemo(() => scopeBounds(scope, civil, tz), [scope, civil, tz]);
  const scoped = useMemo(
    () => hitsInScope(cast?.hits ?? [], bounds.from.getTime(), bounds.to.getTime()),
    [cast, bounds],
  );
  const helloHits = useMemo(
    () => nextHelloExacts(scoped, bounds.from.getTime(), bounds.to.getTime(), nowMs, 3, scope),
    [scoped, bounds, nowMs, scope],
  );

  // Readings come with the reading text (its own download).
  const astro = usePack("astro", locale, enabled);
  const reading = useMemo<ElementReading | null>(() => {
    if (!chart || !astro) return null;
    const { timingBodyReading, timingDateReading, timingExactReading } = astro;
    if (selectedId?.startsWith("day:")) {
      const parsed = parseCivilKey(selectedId.slice(4));
      if (!parsed) return null;
      const dayBounds = scopeBounds("day", parsed, tz);
      const dayHits = hitsInScope(cast?.hits ?? [], dayBounds.from.getTime(), dayBounds.to.getTime());
      return timingDateReading(civilKey(parsed), dayHits, locale, tz);
    }
    if (!selectedId?.startsWith("timing:")) return null;
    const raw = selectedId.slice("timing:".length);
    const hit = (cast?.hits ?? []).find((h) => h.id === raw);
    if (hit) return timingExactReading(hit, chart, locale, nowMs);
    if (raw.startsWith("date:")) {
      const parsed = parseCivilKey(raw.slice(5));
      if (!parsed) return null;
      const dayBounds = scopeBounds("day", parsed, tz);
      const dayHits = hitsInScope(cast?.hits ?? [], dayBounds.from.getTime(), dayBounds.to.getTime());
      return timingDateReading(civilKey(parsed), dayHits, locale, tz);
    }
    if (raw.startsWith("body:")) {
      const moving = raw.slice(5) as TimingHit["moving"];
      return timingBodyReading(
        moving,
        scoped.filter((h) => h.moving === moving),
        locale,
        tz,
      );
    }
    return null;
  }, [selectedId, cast, chart, locale, nowMs, tz, scoped, astro]);

  const pickHit = useCallback((hit: TimingHit) => pick(`timing:${hit.id}`), [pick]);

  const pickDay = useCallback(
    (next: CivilDate) => {
      setCivil(next);
      setScope("day");
      pick(`day:${civilKey(next)}`);
    },
    [pick],
  );

  const pickMonth = useCallback(
    (next: CivilDate) => {
      setCivil(next);
      setScope("month");
      pick(`day:${civilKey(next)}`);
    },
    [pick],
  );

  const changeScope = useCallback((next: TimingScope) => {
    setScope(next);
    if (next === "month") setCivil((c) => ({ ...c, day: 1 }));
    if (next === "year") setCivil((c) => ({ year: c.year, month: 1, day: 1 }));
  }, []);

  const shift = useCallback(
    (dir: 1 | -1) => setCivil((c) => shiftCivil(scope, c, dir)),
    [scope],
  );
  const retry = useCallback(() => setTick((n) => n + 1), []);

  return useMemo(
    () => ({
      scope,
      civil,
      setCivil,
      changeScope,
      shift,
      tz,
      cast,
      scoped,
      helloHits,
      busy,
      error,
      retry,
      nowMs,
      reading,
      pickHit,
      pickDay,
      pickMonth,
      enabled,
    }),
    [scope, civil, changeScope, shift, tz, cast, scoped, helloHits, busy, error, retry, nowMs, reading, pickHit, pickDay, pickMonth, enabled],
  );
}
