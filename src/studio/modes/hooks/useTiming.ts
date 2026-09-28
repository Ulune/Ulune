import { browserZone } from "@/lib/chart/client-zone";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { eventsOf } from "@/lib/chart/calendar-sky";
import { CALENDAR_DEFAULTS, deviceZone, loadCalendarPrefs, saveCalendarPrefs, type CalendarPrefs, type CalendarZone } from "@/lib/chart/calendar-prefs";
import { slowWindowsFromYears, transitsInSlices, type TransitWindow } from "@/lib/chart/personal-transits";
import { skyEventId, type SkyEvent } from "@/lib/chart/sky-events";
import type { SkyWindow } from "@/lib/chart/sky-window";
import { loadWindowsBetween } from "@/lib/chart/window-cache";
import { loadYearsBetween } from "@/lib/chart/year-cache";
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
import type { TimingHit, TimingScope } from "@/lib/chart/transit-exact";
import type { ElementReading, TimingCast } from "@/lib/chart/types";
import { useI18n } from "@/lib/i18n/locale";
import { natalBodiesOf } from "@/studio/modes/hooks/natal-bodies";
import { useStudioStore } from "@/studio/store";
import { useVisibleInterval } from "@/lib/use-visible-interval";
import { lru } from "@/lib/chart/result-cache";
import { errorForState } from "@/lib/i18n/errors";

const DAY_MS = 86_400_000;
/** Your transits already worked out in this tab, by span and chart. */
const castCache = lru<TimingCast>(24);
/** Chunks needed beyond each end: the search looks a day and a half past the span, a void span starts up to 2.5 days before its end. */
const EDGE_MS = 3 * DAY_MS;
/** How far ahead the Now panel looks. */
const AHEAD_MS = 16 * DAY_MS;
/** Year files around now, for the slow transits in effect (a Pluto window can outlast a year). */
const YEARS_AROUND_MS = 400 * DAY_MS;

/** The hits of a span, worked out on the device from the chunks (kept per span and chart). */
async function hitsFor(
  wins: SkyWindow[],
  natal: ReturnType<typeof natalBodiesOf>,
  from: number,
  to: number,
  key: string,
  signal: AbortSignal,
): Promise<TimingHit[] | null> {
  const cached = castCache.get(key);
  if (cached) return cached.hits;
  const hits = await transitsInSlices(wins, natal, from, to, signal);
  if (!hits) return null;
  castCache.set(key, { meta: { from: new Date(from).toISOString(), to: new Date(to).toISOString(), timezone: "", latitude: 0, longitude: 0 }, hits });
  return hits;
}

export function useTiming() {
  const { locale } = useI18n();
  const chart = useStudioStore((s) => s.chart);
  const creating = useStudioStore((s) => s.creating);
  const page = useStudioStore((s) => s.page);
  const selectedId = useStudioStore((s) => s.selectedId);
  const pick = useStudioStore((s) => s.pick);
  const enabled = page === "timing" && Boolean(chart) && !creating;

  // Which clock the times follow (this device's by default), and the switches: kept in this browser.
  const [prefs, setPrefs] = useState<CalendarPrefs>(CALENDAR_DEFAULTS);
  useEffect(() => setPrefs(loadCalendarPrefs()), []);
  const updatePrefs = useCallback((next: Partial<CalendarPrefs>) => {
    setPrefs((cur) => {
      const merged = { ...cur, ...next };
      saveCalendarPrefs(merged);
      return merged;
    });
  }, []);
  const zones = useMemo<Record<CalendarZone, string>>(
    () => ({ device: browserZone(deviceZone()), birth: browserZone(chart?.meta.timezone), utc: "UTC" }),
    [chart?.meta.timezone],
  );
  const tz = zones[prefs.zone];

  const [scope, setScope] = useState<TimingScope>("month");
  const [civil, setCivil] = useState<CivilDate>(() => {
    const now = civilFromUtc(new Date(), tz);
    return { year: now.year, month: now.month, day: now.day };
  });
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [wins, setWins] = useState<SkyWindow[]>([]);
  const [nowWins, setNowWins] = useState<SkyWindow[]>([]);
  const [hits, setHits] = useState<TimingHit[] | null>(null);
  const [nowHits, setNowHits] = useState<TimingHit[]>([]);
  const [windows, setWindows] = useState<TransitWindow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const gen = useRef(0);
  const ready = useRef(false);
  const fetchKey = scope === "year" ? `y:${civil.year}` : `m:${civil.year}-${civil.month}`;

  useVisibleInterval(() => setNowMs(Date.now()), 60_000, enabled);

  const natalBodies = useMemo(() => (chart ? natalBodiesOf(chart) : []), [chart]);
  const natalSig = useMemo(
    () => (chart ? natalBodies.map((b) => `${b.id}:${b.ecliptic}`).join(",") : ""),
    [chart, natalBodies],
  );
  const needed = useMemo(
    () => (scope === "year" ? yearBounds(civil.year, tz) : scopeBounds("month", { ...civil, day: 1 }, tz)),
    // The span depends on the month (or year) only: switching day and month views inside it asks for nothing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fetchKey, tz],
  );

  // The span shown: its chunks, then your transits in it, worked out here.
  useEffect(() => {
    if (!enabled || !chart) return;
    const from = needed.from.getTime();
    const to = needed.to.getTime();
    const n = ++gen.current;
    const ctrl = new AbortController();
    if (!ready.current) setBusy(true);
    setError(null);
    void (async () => {
      const got = await loadWindowsBetween(from - EDGE_MS, to + EDGE_MS);
      if (n !== gen.current || ctrl.signal.aborted) return;
      if (!got) throw new Error("Failed to fetch the sky");
      setWins(got);
      const found = await hitsFor(got, natalBodies, from, to, `${from}|${to}|${natalSig}`, ctrl.signal);
      if (!found || n !== gen.current) return;
      ready.current = true;
      setHits(found);
      setBusy(false);
    })().catch((err) => {
      if (n !== gen.current) return;
      setError(errorForState(err));
      setBusy(false);
    });
    return () => ctrl.abort();
  }, [enabled, needed, natalSig, natalBodies, chart, tick]);

  // Now: the sky and your transits of the coming days, and the slow transits in effect.
  const nowDay = Math.floor(nowMs / DAY_MS);
  useEffect(() => {
    if (!enabled || !chart) return;
    const ctrl = new AbortController();
    const from = nowDay * DAY_MS;
    void (async () => {
      const got = await loadWindowsBetween(from - EDGE_MS, from + AHEAD_MS + EDGE_MS);
      if (!got || ctrl.signal.aborted) return;
      setNowWins(got);
      const found = await hitsFor(got, natalBodies, from, from + AHEAD_MS, `now|${from}|${natalSig}`, ctrl.signal);
      if (found && !ctrl.signal.aborted) setNowHits(found);
      const years = await loadYearsBetween(from - YEARS_AROUND_MS, from + YEARS_AROUND_MS);
      if (!years || ctrl.signal.aborted) return;
      setWindows(slowWindowsFromYears(years, natalBodies, from - YEARS_AROUND_MS, from + YEARS_AROUND_MS));
    })().catch(() => {
      /* the panel waits; the span's own error shows */
    });
    return () => ctrl.abort();
  }, [enabled, chart, natalBodies, natalSig, nowDay, tick]);

  const events = useMemo<SkyEvent[]>(() => eventsOf(wins), [wins]);
  const nowEvents = useMemo<SkyEvent[]>(() => eventsOf(nowWins), [nowWins]);
  const bounds = useMemo(() => scopeBounds(scope, civil, tz), [scope, civil, tz]);
  const scoped = useMemo(() => hitsInScope(hits ?? [], bounds.from.getTime(), bounds.to.getTime()), [hits, bounds]);
  const cast = useMemo<TimingCast | null>(
    () => (hits ? { meta: { from: needed.from.toISOString(), to: needed.to.toISOString(), timezone: tz, latitude: 0, longitude: 0 }, hits } : null),
    [hits, needed, tz],
  );

  // Readings come with the reading text (its own download).
  const astro = usePack("astro", locale, enabled);
  const reading = useMemo<ElementReading | null>(() => {
    if (!chart || !astro) return null;
    const { skyEventReading, timingBodyReading, timingDateReading, timingExactReading, windowReading } = astro;
    const allHits = [...(hits ?? []), ...nowHits];
    if (selectedId?.startsWith("day:")) {
      const parsed = parseCivilKey(selectedId.slice(4));
      if (!parsed) return null;
      const dayBounds = scopeBounds("day", parsed, tz);
      const dayHits = hitsInScope(hits ?? [], dayBounds.from.getTime(), dayBounds.to.getTime());
      return timingDateReading(civilKey(parsed), dayHits, locale, tz);
    }
    if (selectedId?.startsWith("sky:")) {
      const id = selectedId.slice(4);
      const ev = [...events, ...nowEvents].find((e) => skyEventId(e) === id);
      return ev ? skyEventReading(ev, locale, tz) : null;
    }
    if (selectedId?.startsWith("win:")) {
      const w = windows.find((x) => `win:${x.moving}:${x.type}:${x.natal}:${x.from}` === selectedId);
      return w ? windowReading(w, locale, tz, nowMs) : null;
    }
    if (!selectedId?.startsWith("timing:")) return null;
    const raw = selectedId.slice("timing:".length);
    const hit = allHits.find((h) => h.id === raw);
    if (hit) return timingExactReading(hit, chart, locale, nowMs, tz);
    if (raw.startsWith("date:")) {
      const parsed = parseCivilKey(raw.slice(5));
      if (!parsed) return null;
      const dayBounds = scopeBounds("day", parsed, tz);
      const dayHits = hitsInScope(hits ?? [], dayBounds.from.getTime(), dayBounds.to.getTime());
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
  }, [selectedId, hits, nowHits, chart, locale, nowMs, tz, scoped, astro, events, nowEvents, windows]);

  const pickHit = useCallback((hit: TimingHit) => pick(`timing:${hit.id}`), [pick]);

  /** A day chosen in the month: its reading opens, the month stays. */
  const pickDay = useCallback(
    (next: CivilDate) => {
      setCivil(next);
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
    if (next === "year") setCivil((c) => ({ year: c.year, month: 1, day: 1 }));
  }, []);

  const shift = useCallback(
    (dir: 1 | -1) => setCivil((c) => shiftCivil(scope, c, dir)),
    [scope],
  );
  const goToday = useCallback(() => {
    const now = civilFromUtc(new Date(), tz);
    setCivil({ year: now.year, month: now.month, day: now.day });
  }, [tz]);
  const retry = useCallback(() => setTick((n) => n + 1), []);
  const todayKey = useMemo(() => civilKey(civilFromUtc(new Date(nowMs), tz)), [nowMs, tz]);

  return useMemo(
    () => ({
      scope,
      civil,
      setCivil,
      changeScope,
      shift,
      goToday,
      tz,
      zones,
      prefs,
      updatePrefs,
      cast,
      wins,
      events,
      nowWins,
      nowEvents,
      hits: hits ?? [],
      nowHits,
      windows,
      scoped,
      busy,
      error,
      retry,
      nowMs,
      todayKey,
      reading,
      pickHit,
      pickDay,
      pickMonth,
      enabled,
    }),
    [scope, civil, changeScope, shift, goToday, tz, zones, prefs, updatePrefs, cast, wins, events, nowWins, nowEvents, hits, nowHits, windows, scoped, busy, error, retry, nowMs, todayKey, reading, pickHit, pickDay, pickMonth, enabled],
  );
}
