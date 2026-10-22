import { useCallback, useEffect, useMemo, useState } from "react";
import { lifeCycles, solarReturn, type CycleBody, type LifeCycle, type SkyAt } from "@/lib/chart/hd-cycles";
import { hdMomentOf, type HdMoment } from "@/lib/chart/hd-transit";
import { isAbort, lru } from "@/lib/chart/result-cache";
import type { NatalChart } from "@/lib/chart/types";
import { errorForState } from "@/lib/i18n/errors";
import { importWithRetry } from "@/lib/lazy-retry";
import { castSky, chunkSky, TURNED_TO_SERVER, yearSky } from "@/studio/modes/hooks/hd-sky";

/*
 * Human Design's life cycles and the year's solar return for the chart of a
 * page (share and compare plan, feature 5b; lib/chart/hd-cycles.ts finds
 * them): on this device through the door's casts (a few hundred, about half
 * a second, never with anything of the reader's in them), from the shared
 * sky files when the reader chose Ulune's server (hd-sky.ts). Kept in this
 * tab's memory by birth, so a return to the page, or Compare's second
 * person, finds them at once; never stored anywhere.
 */

const keptCycles = lru<LifeCycle[]>(6);
const keptSolar = lru<{ at: number | null; moment: HdMoment | null }>(16);

/** What the cycles are found from: the birth moment and the slow planets' places then. */
function birthOf(chart: NatalChart | null): { birth: number; natal: Partial<Record<CycleBody | "sun", number>>; key: string } | null {
  if (!chart) return null;
  const birth = Date.parse(chart.meta.utc);
  if (!Number.isFinite(birth)) return null;
  const natal: Partial<Record<CycleBody | "sun", number>> = {};
  for (const p of chart.planets) if (p.id === "saturn" || p.id === "uranus" || p.id === "chiron" || p.id === "sun") natal[p.id] = p.ecliptic;
  const key = `${chart.meta.utc}|${["sun", "saturn", "uranus", "chiron"].map((b) => natal[b as CycleBody]?.toFixed(7) ?? "").join(",")}`;
  return { birth, natal, key };
}

/**
 * Runs a search on this device, or on the shared files when the reader chose
 * Ulune's server; a device that turns to the server mid-way ("Use the server
 * once") starts it again on the files rather than sending hundreds of casts.
 */
async function onDeviceOrFiles<T>(device: (sky: SkyAt) => Promise<T>, files: () => Promise<T>, signal: AbortSignal): Promise<T> {
  const choice = await importWithRetry(() => import("@/lib/engine/choice"));
  if (choice.calculateOn() === "server") return files();
  try {
    return await device(castSky(signal, () => choice.calculateOn() !== "server"));
  } catch (err) {
    if (err instanceof Error && err.message === TURNED_TO_SERVER) return files();
    throw err;
  }
}

export type HdLifeCyclesState = { cycles: LifeCycle[] | null; busy: boolean; error: string | null; retry: () => void };

/** The four life cycles of the chart, once `enabled` (null while they are found). */
export function useHdLifeCycles(chart: NatalChart | null, enabled: boolean): HdLifeCyclesState {
  const b = useMemo(() => birthOf(chart), [chart]);
  const [found, setFound] = useState<{ key: string; cycles: LifeCycle[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const key = b?.key ?? "";
  useEffect(() => {
    if (!enabled || !b) return;
    const kept = keptCycles.get(b.key);
    if (kept) {
      setFound({ key: b.key, cycles: kept });
      setError(null);
      return;
    }
    const ctrl = new AbortController();
    setError(null);
    const run = (sky: SkyAt, batch: number) => lifeCycles(sky, b.birth, b.natal, { signal: ctrl.signal, batch });
    void onDeviceOrFiles((sky) => run(sky, 4), () => run(yearSky(), 8), ctrl.signal)
      .then((cycles) => {
        keptCycles.set(b.key, cycles);
        if (!ctrl.signal.aborted) setFound({ key: b.key, cycles });
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted || isAbort(err)) return;
        setError(errorForState(err));
      });
    return () => ctrl.abort();
    // The chart is read through its key: the same birth gives the same cycles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, key, tick]);
  const cycles = found && found.key === key ? found.cycles : (keptCycles.get(key) ?? null);
  const retry = useCallback(() => {
    setError(null);
    setTick((n) => n + 1);
  }, []);
  return useMemo(() => ({ cycles, busy: enabled && Boolean(b) && !cycles && !error, error, retry }), [cycles, enabled, b, error, retry]);
}

export type HdSolarState = { year: number; at: number | null; moment: HdMoment | null; busy: boolean; error: string | null; retry: () => void };

/** The solar return of `year` for the chart: its moment and the sky's gates then. */
export function useHdSolarReturn(chart: NatalChart | null, year: number, enabled: boolean): HdSolarState {
  const b = useMemo(() => birthOf(chart), [chart]);
  const key = b ? `${b.key}|${year}` : "";
  const [found, setFound] = useState<{ key: string; at: number | null; moment: HdMoment | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!enabled || !b || b.natal.sun == null) return;
    const kept = keptSolar.get(key);
    if (kept) {
      setFound({ key, ...kept });
      setError(null);
      return;
    }
    const ctrl = new AbortController();
    setError(null);
    const natalSun = b.natal.sun;
    const find = async (sky: SkyAt) => {
      const at = await solarReturn(sky, b.birth, natalSun, year);
      if (at == null) return { at: null, moment: null };
      const s = await sky(at);
      return { at, moment: s ? hdMomentOf(at, (body) => s[body] ?? null) : null };
    };
    void onDeviceOrFiles(find, () => find(chunkSky()), ctrl.signal)
      .then((res) => {
        keptSolar.set(key, res);
        if (!ctrl.signal.aborted) setFound({ key, ...res });
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted || isAbort(err)) return;
        setError(errorForState(err));
      });
    return () => ctrl.abort();
    // The chart is read through its key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, key, tick]);
  const shown = found && found.key === key ? found : (keptSolar.get(key) ?? null);
  const retry = useCallback(() => {
    setError(null);
    setTick((n) => n + 1);
  }, []);
  return useMemo(
    () => ({ year, at: shown?.at ?? null, moment: shown?.moment ?? null, busy: enabled && Boolean(b) && !shown && !error, error, retry }),
    [year, shown, enabled, b, error, retry],
  );
}
