/**
 * Charts as they are kept on this device (the guest library and a signed-in
 * reader's copy): without what the client rebuilds exactly from the stored
 * bodies. The aspects and midpoints are two thirds of a chart's size (a
 * library of ten charts went from ~0.5 MB to ~0.2 MB), and browsers allow
 * about 5 MB per site. A chart cast under other rules keeps everything until
 * it is recast (visibility.ts needsSwissUpgrade).
 */
import { computeAspects, computeMidpoints } from "./anatomy";
import { CALC_VERSION } from "./constants";
import type { NatalChart } from "./types";

/** A chart as stored: the aspects and midpoints may be left out. */
export type StoredChart = Omit<NatalChart, "aspects" | "midpoints"> &
  Partial<Pick<NatalChart, "aspects" | "midpoints">>;

/** Leaves out what `fullChart` rebuilds, when the chart was cast under today's rules. */
export function slimChart(chart: NatalChart): StoredChart {
  if (chart.meta.calc !== CALC_VERSION) return chart;
  const { aspects: _aspects, midpoints: _midpoints, ...rest } = chart;
  return rest;
}

/** The chart with its aspects and midpoints, rebuilt when they were left out. */
export function fullChart(stored: StoredChart): NatalChart {
  if (stored.aspects && stored.midpoints) return stored as NatalChart;
  const aspects = stored.aspects ?? computeAspects([...stored.planets, ...Object.values(stored.angles)]);
  const midpoints = stored.midpoints ?? computeMidpoints(stored.planets, stored.angles);
  // The same key order as a cast (a stored chart compares equal to a fresh one).
  return {
    meta: stored.meta,
    angles: stored.angles,
    planets: stored.planets,
    houses: stored.houses,
    aspects,
    patterns: stored.patterns,
    stars: stored.stars,
    midpoints,
  };
}
