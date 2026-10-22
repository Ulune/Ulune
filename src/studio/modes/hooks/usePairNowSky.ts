import { useCallback, useEffect, useMemo, useState } from "react";
import { door } from "@/lib/engine/door";
import { isAbort, lru } from "@/lib/chart/result-cache";
import { nowContacts, nowMoment, type NowContact } from "@/lib/chart/pair-now";
import type { NatalChart, TransitSky } from "@/lib/chart/types";
import { errorForState } from "@/lib/i18n/errors";
import { useVisibleInterval } from "@/lib/use-visible-interval";
import { natalBodiesOf } from "@/studio/modes/hooks/natal-bodies";

/** Skies already cast in this tab for a relationship's chart, by moment and chart (in memory only). */
const skies = lru<TransitSky>(12);

export type PairNowSky = {
  /** The moment read (now, to the ten minutes). */
  at: number;
  /** Today's sky over the relationship's chart; null while it is cast. */
  sky: TransitSky | null;
  /** The contacts the part shows, slow planets first. */
  contacts: NowContact[];
  error: string | null;
  retry: () => void;
};

/**
 * "You two, now" on astrology's Relationship pages (share and compare plan,
 * feature 5e): today's sky over the relationship's own chart (the composite
 * or the Davison), through the "calculate" door like any transits (this
 * device by default), the relationship's chart standing for the birth chart.
 * Cast while the page is shown with both people, again when the ten minutes
 * it reads have passed (not in a hidden tab).
 */
export function usePairNowSky(enabled: boolean, chart: NatalChart | null): PairNowSky {
  const [at, setAt] = useState(() => nowMoment(Date.now()));
  useVisibleInterval(() => setAt(nowMoment(Date.now())), 60_000, enabled);
  const [sky, setSky] = useState<{ key: string; sky: TransitSky } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const bodies = useMemo(() => (chart ? natalBodiesOf(chart) : []), [chart]);
  const cusps = useMemo(() => (chart ? chart.houses.map((h) => h.ecliptic) : []), [chart]);
  const key = chart ? `${at}|${chart.meta.latitude},${chart.meta.longitude}|${cusps.join(",")}|${bodies.map((b) => `${b.id}:${b.ecliptic}`).join(",")}` : "";
  useEffect(() => {
    if (!enabled || !chart || cusps.length !== 12) return;
    const kept = skies.get(key);
    if (kept) {
      setSky({ key, sky: kept });
      setError(null);
      return;
    }
    const ctrl = new AbortController();
    setError(null);
    door
      .castTransits({
        data: { at: new Date(at).toISOString(), latitude: chart.meta.latitude, longitude: chart.meta.longitude, natalCusps: cusps, natalBodies: bodies, houseSystem: chart.meta.houseSystem, timezone: chart.meta.timezone },
        signal: ctrl.signal,
      })
      .then((next) => {
        skies.set(key, next);
        if (!ctrl.signal.aborted) setSky({ key, sky: next });
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted || isAbort(err)) return;
        setError(errorForState(err));
      });
    return () => ctrl.abort();
    // The chart is read through its key: the same points at the same moment give the same sky.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, key, tick]);
  const shown = sky?.key === key ? sky.sky : null;
  const contacts = useMemo(() => (shown && chart ? nowContacts(shown, chart) : []), [shown, chart]);
  const retry = useCallback(() => setTick((n) => n + 1), []);
  return useMemo(() => ({ at, sky: shown, contacts, error, retry }), [at, shown, contacts, error, retry]);
}
