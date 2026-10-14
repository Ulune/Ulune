/*
 * The Chinese engines as the pages run them, for timing in a browser (languages plan, part 30;
 * scripts/perf/chinese/timing.mjs bundles this file and calls it with the CPU slowed 6×).
 *
 * A full BaZi chart with its luck pillars is what BaZi's two pages compute for a chart: the four
 * pillars (src/lib/chinese/bazi.ts), the symbolic stars, the interactions and the balance, the luck
 * pillars of both counts and the year's flow. A Flying Star chart is what the Home page computes for
 * a home: its facing read, its period, the chart of stars and, near a mountain's edge, the
 * replacement chart, with the year's and the month's stars.
 *
 * The births are the test fixtures (scripts/e2e/_lib.mjs), never a real person's: FIXTURE_A,
 * 15 June 1990 12:00 in Paris, and FIXTURE_B, 3 November 1987 23:10 in Oslo. The homes are made up.
 */
import { baziChart } from "@/lib/chinese/bazi";
import { baziBalance } from "@/lib/chinese/bazi-balance";
import { baziInteractions } from "@/lib/chinese/bazi-interactions";
import { flowYear, flowYearOf, luckPillars } from "@/lib/chinese/bazi-luck";
import { baziSigns } from "@/lib/chinese/bazi-signs";
import { homeOf, periodOf } from "@/lib/chinese/fengshui-home";
import { flyingChart } from "@/lib/chinese/fengshui-stars";
import { yearStarsAt } from "@/lib/chinese/fengshui-years";

/** A fixed "now", so every run computes the same year (14 October 2026, noon UT). */
const NOW = Date.UTC(2026, 9, 14, 12);

const BIRTHS = [
  { utc: "1990-06-15T10:00:00.000Z", date: "1990-06-15", time: "12:00", longitude: 2.3522 },
  { utc: "1987-11-03T22:10:00.000Z", date: "1987-11-03", time: "23:10", longitude: 10.7522 },
];

/** Facings in degrees and the years the homes were built: one near a mountain's edge (its replacement chart too). */
const HOMES = [
  { facing: 172.5, built: 2024 },
  { facing: 180, built: 1995 },
  { facing: 37, built: 2010 },
  { facing: 292, built: 1978 },
];

function fullBazi(i: number): number {
  const c = baziChart(BIRTHS[i % BIRTHS.length]!);
  if (!c) throw new Error("no BaZi chart");
  const lucks = [luckPillars(c, "yang"), luckPillars(c, "yin")];
  const year = flowYear(c, flowYearOf(NOW), lucks);
  return baziSigns(c).stars.length + baziInteractions(c).length + baziBalance(c).total + year.year;
}

function flyingStars(i: number): number {
  const h = HOMES[i % HOMES.length]!;
  const home = homeOf(h.facing, "compass", null);
  const period = periodOf(h.built);
  const main = flyingChart(period.period, home.facingMountain.id, home.sittingMountain.id);
  const ti = home.edge.level === "clear" ? null : flyingChart(period.period, home.facingMountain.id, home.sittingMountain.id, true);
  const years = yearStarsAt(NOW);
  return main.formations.length + (ti?.formations.length ?? 0) + years.year;
}

/**
 * Each case with the calls a timing makes: some 50 ms of work unslowed, as the DevTools protocol
 * slows the CPU in short slices (a shorter timing can fall between them), and one call alone is
 * below the clock's resolution.
 */
const CASES = { bazi: { run: fullBazi, batch: 400 }, stars: { run: flyingStars, batch: 4000 } } as const;

/** Milliseconds per call: `samples` timings of a batch of calls each, after `warm` calls (the code compiled, the term table decoded), the median. */
function time(name: keyof typeof CASES, samples = 9, warm = 200): { median: number; min: number; max: number } {
  const { run, batch } = CASES[name];
  let sink = 0;
  for (let i = 0; i < warm; i += 1) sink += run(i);
  const per: number[] = [];
  for (let s = 0; s < samples; s += 1) {
    const t0 = performance.now();
    for (let i = 0; i < batch; i += 1) sink += run(s * batch + i);
    per.push((performance.now() - t0) / batch);
  }
  if (Number.isNaN(sink)) throw new Error("no result");
  per.sort((a, b) => a - b);
  return { median: per[Math.floor(per.length / 2)]!, min: per[0]!, max: per[per.length - 1]! };
}

/** A fixed arithmetic loop (no allocation, nothing to collect): how much slower the CPU runs, compared between rates. */
function spin(): number {
  const t0 = performance.now();
  let x = 1;
  for (let i = 0; i < 20_000_000; i += 1) x = (Math.imul(x, 1103515245) + 12345) | 0;
  if (x === 0.5) throw new Error("never");
  return performance.now() - t0;
}

(globalThis as unknown as { __chineseTiming: typeof time; __spin: typeof spin }).__chineseTiming = time;
(globalThis as unknown as { __spin: typeof spin }).__spin = spin;
