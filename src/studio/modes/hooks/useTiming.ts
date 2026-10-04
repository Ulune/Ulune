import { browserZone } from "@/lib/chart/client-zone";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { dayOverview } from "@/lib/chart/calendar-day";
import { yearLayout } from "@/lib/chart/calendar-year";
import { calendarRows, type NumRow } from "@/lib/chart/calendar-rows";
import { changeId, numerologyCalendarOf, personalMonthOn, personalYearOn } from "@/lib/chart/numerology-calendar";
import { CALENDAR_UI, fill } from "@/lib/i18n/calendar-words";
import { calendarIcs, type IcsKind } from "@/lib/i18n/calendar-export";
import { downloadText } from "@/lib/download-text";
import { eventsOf, mergeEvents, windowId } from "@/lib/chart/calendar-sky";
import { CALENDAR_DEFAULTS, deviceZone, loadCalendarPrefs, saveCalendarPrefs, type CalendarPrefs, type CalendarZone } from "@/lib/chart/calendar-prefs";
import { slowWindowsFromYears, transitsInSlices, type TransitWindow } from "@/lib/chart/personal-transits";
import { skyEventId, type SkyEvent } from "@/lib/chart/sky-events";
import { bodyAt, type SkyWindow } from "@/lib/chart/sky-window";
import { loadWindowsBetween } from "@/lib/chart/window-cache";
import { loadYearsBetween } from "@/lib/chart/year-cache";
import type { SkyYear } from "@/lib/chart/sky-year";
import { usePack } from "@/lib/content/packs";
import {
  civilFromUtc,
  civilKey,
  hitsInScope,
  landOnToday,
  parseCivilKey,
  scopeBounds,
  shiftCivil,
  utcFromCivil,
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
  // Your numerology in the calendar: the personal day, month and year, and the long cycles' changes on birthdays.
  const numCal = useMemo(() => numerologyCalendarOf(chart), [chart]);
  const numRows = useMemo<NumRow[]>(
    () =>
      numCal
        ? numCal.changes.map((c) => {
            const [year, month, day] = c.day.split("-").map(Number) as [number, number, number];
            return { kind: "num", t: utcFromCivil({ year, month, day, hour: 0, minute: 0 }, tz).getTime(), id: changeId(c), change: c };
          })
        : [],
    [numCal, tz],
  );

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

  // What has arrived for the span shown (review 3 Oct, T1): until both its
  // transits and its year files are here, the exports wait (they used to
  // save whatever had come, a year with a tenth of its events).
  const spanKey = `${needed.from.getTime()}|${needed.to.getTime()}|${natalSig}`;
  const yearsKey = `${needed.from.getTime()}|${needed.to.getTime()}`;
  const [hitsFor_, setHitsFor] = useState<string | null>(null);
  const [yearsFor, setYearsFor] = useState<string | null>(null);
  const loading = hitsFor_ !== spanKey || yearsFor !== yearsKey;

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
      setHitsFor(`${from}|${to}|${natalSig}`);
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

  // The year files around the span shown: the slow transits in effect on its days, and
  // the events past the chunks' ends (until when a planet stays, the next phase).
  const [spanYears, setSpanYears] = useState<SkyYear[]>([]);
  useEffect(() => {
    if (!enabled || !chart) return;
    let live = true;
    const from = needed.from.getTime();
    const to = needed.to.getTime();
    loadYearsBetween(from - YEARS_AROUND_MS, to + YEARS_AROUND_MS)
      .then((years) => {
        if (live && years) {
          setSpanYears(years);
          setYearsFor(`${from}|${to}`);
        }
      })
      .catch(() => {
        /* the day and the readings do without */
      });
    return () => {
      live = false;
    };
  }, [enabled, chart, needed, tick]);
  const spanWindows = useMemo(
    () =>
      spanYears.length && natalBodies.length
        ? slowWindowsFromYears(spanYears, natalBodies, needed.from.getTime() - DAY_MS, needed.to.getTime() + DAY_MS)
        : [],
    [spanYears, natalBodies, needed],
  );

  const events = useMemo<SkyEvent[]>(() => eventsOf(wins), [wins]);
  const nowEvents = useMemo<SkyEvent[]>(() => eventsOf(nowWins), [nowWins]);
  const allEvents = useMemo(
    () => mergeEvents(events, nowEvents, spanYears.flatMap((y) => y.events)),
    [events, nowEvents, spanYears],
  );
  /** Your exacts of the span and of the coming days, each once. */
  const allHits = useMemo(() => {
    const seen = new Map<string, TimingHit>();
    for (const h of [...(hits ?? []), ...nowHits]) if (!seen.has(h.id)) seen.set(h.id, h);
    return [...seen.values()];
  }, [hits, nowHits]);
  const allWindows = useMemo(() => {
    const seen = new Map<string, TransitWindow>();
    for (const w of [...spanWindows, ...windows]) if (!seen.has(windowId(w))) seen.set(windowId(w), w);
    return [...seen.values()];
  }, [spanWindows, windows]);
  const allWins = useMemo(() => [...wins, ...nowWins], [wins, nowWins]);
  /** A day of the calendar, laid out (the day view, the day's and the Moon's readings). */
  const overviewOf = useCallback(
    (day: CivilDate) => {
      const b = scopeBounds("day", day, tz);
      const noon = utcFromCivil({ ...day, hour: 12, minute: 0 }, tz).getTime();
      return dayOverview({ from: b.from.getTime(), to: b.to.getTime(), noon }, allEvents, allWins, allHits, allWindows, nowMs);
    },
    [tz, allEvents, allWins, allHits, allWindows, nowMs],
  );
  const dayView = useMemo(() => (scope === "day" ? overviewOf(civil) : null), [scope, civil, overviewOf]);
  /** The year laid out (the year view and its panel). */
  const yearView = useMemo(
    () => (scope === "year" ? yearLayout(civil.year, tz, allEvents, spanYears, spanWindows) : null),
    [scope, civil.year, tz, allEvents, spanYears, spanWindows],
  );
  const bounds = useMemo(() => scopeBounds(scope, civil, tz), [scope, civil, tz]);
  const scoped = useMemo(() => hitsInScope(hits ?? [], bounds.from.getTime(), bounds.to.getTime()), [hits, bounds]);
  const cast = useMemo<TimingCast | null>(
    () => (hits ? { meta: { from: needed.from.toISOString(), to: needed.to.toISOString(), timezone: tz, latitude: 0, longitude: 0 }, hits } : null),
    [hits, needed, tz],
  );

  // Readings come with the calendar's reading text (its own download).
  const texts = usePack("cal", locale, enabled);
  const reading = useMemo<ElementReading | null>(() => {
    if (!chart || !texts || !selectedId) return null;
    const {
      calendarDayReading,
      moonDayReading,
      numerologyChangeReading,
      numerologyDayReading,
      numerologyMonthReading,
      numerologyYearReading,
      skyEventReading,
      timingBodyReading,
      timingExactReading,
      windowReading,
    } = texts;
    const num = prefs.yours ? numCal : null;
    const dayReading = (key: string) => {
      const parsed = parseCivilKey(key);
      return parsed ? calendarDayReading(overviewOf(parsed), civilKey(parsed), locale, tz, nowMs, num) : null;
    };
    if (selectedId.startsWith("day:")) return dayReading(selectedId.slice(4));
    if (selectedId.startsWith("numday:")) return numCal ? numerologyDayReading(numCal, selectedId.slice(7), locale) : null;
    if (selectedId.startsWith("numcycle:")) return numCal ? numerologyChangeReading(numCal, selectedId, locale) : null;
    if (selectedId.startsWith("nummonth:")) return numCal ? numerologyMonthReading(numCal, selectedId.slice(9), locale) : null;
    if (selectedId.startsWith("numyear:")) return numCal ? numerologyYearReading(numCal, Number(selectedId.slice(8)), locale) : null;
    if (selectedId.startsWith("moon:")) {
      const parsed = parseCivilKey(selectedId.slice(5));
      return parsed ? moonDayReading(overviewOf(parsed), civilKey(parsed), locale, tz, nowMs) : null;
    }
    if (selectedId.startsWith("sky:")) {
      const id = selectedId.slice(4);
      const ev = allEvents.find((e) => skyEventId(e) === id) ?? [...events, ...nowEvents].find((e) => skyEventId(e) === id);
      return ev ? skyEventReading(ev, locale, tz, { chart, events: allEvents }) : null;
    }
    if (selectedId.startsWith("win:")) {
      const w = allWindows.find((x) => windowId(x) === selectedId);
      return w ? windowReading(w, locale, tz, nowMs) : null;
    }
    if (!selectedId.startsWith("timing:")) return null;
    const raw = selectedId.slice("timing:".length);
    const hit = allHits.find((h) => h.id === raw);
    if (hit) return timingExactReading(hit, chart, locale, nowMs, tz);
    if (raw.startsWith("date:")) return dayReading(raw.slice(5));
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
  }, [selectedId, chart, locale, nowMs, tz, scoped, texts, events, nowEvents, allEvents, allHits, allWindows, overviewOf, prefs.yours, numCal]);

  const pickHit = useCallback((hit: TimingHit) => pick(`timing:${hit.id}`), [pick]);

  /** A day chosen in the month: its reading opens, the month stays. */
  const pickDay = useCallback(
    (next: CivilDate) => {
      setCivil(next);
      pick(`day:${civilKey(next)}`);
    },
    [pick],
  );

  // A reading's "Calendar · 2027" (review 3 Oct, R4): the year view on that year.
  const calendarAt = useStudioStore((st) => st.calendarAt);
  useEffect(() => {
    if (!calendarAt) return;
    const now = civilFromUtc(new Date(), tz);
    setCivil(calendarAt.year === now.year ? { year: now.year, month: now.month, day: now.day } : { year: calendarAt.year, month: 1, day: 1 });
    setScope("year");
    useStudioStore.setState({ calendarAt: null });
  }, [calendarAt, tz]);

  const todayCivil = useCallback((): CivilDate => {
    const now = civilFromUtc(new Date(), tz);
    return { year: now.year, month: now.month, day: now.day };
  }, [tz]);

  /** A month opened from the year: on today if it is this month. */
  const pickMonth = useCallback(
    (next: CivilDate) => {
      setCivil(landOnToday("month", next, todayCivil()));
      setScope("month");
    },
    [todayCivil],
  );

  /**
   * Day, month or year: the date stays where it is (today unless the reader
   * moved), so the year view and back keeps the month, not January.
   */
  const changeScope = useCallback((next: TimingScope) => setScope(next), []);

  const shift = useCallback(
    (dir: 1 | -1) => setCivil((c) => shiftCivil(scope, c, dir, todayCivil())),
    [scope, todayCivil],
  );
  const goToday = useCallback(() => setCivil(todayCivil()), [todayCivil]);
  const retry = useCallback(() => setTick((n) => n + 1), []);
  /** The period's name in file names: "2026-09-28", "2026-09", "2026". */
  const fileName = scope === "year" ? String(civil.year) : scope === "month" ? `${civil.year}-${String(civil.month).padStart(2, "0")}` : civilKey(civil);
  /** The period shown as a calendar file: the switches' choice, the Moon's own on a day only. */
  const exportIcs = useCallback(
    (kind: IcsKind = "mine") => {
      const from = bounds.from.getTime();
      const to = bounds.to.getTime();
      const rows = calendarRows(allEvents, hits ?? [], from, to, { sky: prefs.sky, yours: prefs.yours, moon: scope === "day" }, numRows);
      const spans = prefs.yours ? allWindows.filter((w) => w.from < to && w.to >= from) : [];
      // Whose calendar it is, in the file and its name (review 3 Oct, T5); it stays on this device.
      const who = chart?.meta.name?.trim() || "";
      const slug = who.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "");
      const lonAt = (body: string, t: number) => {
        const w = [...wins, ...nowWins].find((x) => t >= x.t0 && t <= x.t0 + (x.n - 1) * x.step * 3_600_000);
        return w ? (bodyAt(w, body as Parameters<typeof bodyAt>[1], t)?.lon ?? null) : null;
      };
      const meaning = texts && chart ? (h: TimingHit) => texts.timingExactReading(h, chart, locale, nowMs, tz).lead ?? "" : undefined;
      downloadText(
        `ulune-${slug ? `${slug}-` : ""}${fileName}.ics`,
        calendarIcs(rows, spans, locale, tz, `Ulune · ${who ? `${who} · ` : ""}${fileName}`, { lonAt, kind, meaning }),
        "text/calendar;charset=utf-8",
      );
    },
    [bounds, allEvents, hits, prefs, scope, allWindows, fileName, locale, tz, numRows, chart, wins, nowWins, texts, nowMs],
  );
  const todayKey = useMemo(() => civilKey(civilFromUtc(new Date(nowMs), tz)), [nowMs, tz]);
  // The bar's numerology (with your transits on): the personal month in a month's title, the personal year in a year's.
  const numTitle = useMemo(() => {
    if (!numCal || !prefs.yours || scope === "day") return null;
    if (scope === "year") return { id: `numyear:${civil.year}`, text: fill(CALENDAR_UI.num.personalYear, locale, { n: personalYearOn(numCal, civil.year) }) };
    const mm = String(civil.month).padStart(2, "0");
    return { id: `nummonth:${civil.year}-${mm}`, text: fill(CALENDAR_UI.num.personalMonth, locale, { n: personalMonthOn(numCal, civil.year, civil.month) }) };
  }, [numCal, prefs.yours, scope, civil.year, civil.month, locale]);

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
      allEvents,
      allWindows,
      bounds,
      fileName,
      exportIcs,
      dayView,
      yearView,
      hits: hits ?? [],
      nowHits,
      windows,
      scoped,
      busy,
      loading,
      error,
      retry,
      nowMs,
      todayKey,
      reading,
      pickHit,
      pickDay,
      pickMonth,
      enabled,
      numCal,
      numRows,
      numTitle,
    }),
    [scope, civil, changeScope, shift, goToday, tz, zones, prefs, updatePrefs, cast, wins, events, nowWins, nowEvents, allEvents, allWindows, bounds, fileName, exportIcs, dayView, yearView, hits, nowHits, windows, scoped, busy, loading, error, retry, nowMs, todayKey, reading, pickHit, pickDay, pickMonth, enabled, numCal, numRows, numTitle],
  );
}
