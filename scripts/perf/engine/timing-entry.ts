/*
 * The calculations on the device, as the worker runs them, for timing in a browser (on-device
 * plan, steps 2 and 6; scripts/perf/engine/timing.mjs bundles this file and calls it unslowed and
 * with the CPU slowed 4× and 6×). The same modules as src/lib/engine/worker.ts — the engine, its
 * browser file access (the Cache API, then the page's own address), the requests — on the page's
 * main thread here, because the protocol slows a page's main thread and not its workers.
 *
 * The births are the QA fixture A, 15 June 1990 12:00 in Paris, never a real person's.
 */
import { Calculator } from "@/lib/engine/calculate";
import { ALL_FILES } from "@/lib/engine/eras";
import { browserFiles, ENGINE_CACHE } from "@/lib/engine/files-browser";
import { castHumanDesign, castNatal, castProgressions, castTransits, skyWindow, timing } from "@/lib/engine/requests";

const URLS = {
  wasm: "/engine/swisseph.wasm",
  files: Object.fromEntries(ALL_FILES.map((name) => [name, `/engine/${name}`])),
};

const NATAL = {
  date: "1990-06-15",
  time: "12:00",
  latitude: 48.8566,
  longitude: 2.3522,
  houseSystem: "placidus" as const,
  place: { zone: "Europe/Paris", source: "place" as const },
};

let calc: Calculator | null = null;

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

async function timed<T>(n: number, fn: (i: number) => Promise<T>): Promise<{ median: number; min: number; max: number }> {
  const times: number[] = [];
  for (let i = 0; i < n; i += 1) {
    const t0 = performance.now();
    await fn(i);
    times.push(performance.now() - t0);
  }
  return { median: median(times), min: Math.min(...times), max: Math.max(...times) };
}

/** An engine started afresh: from the network (`cold`, the browser's copy cleared first) or from that copy. */
async function start(cold: boolean): Promise<number> {
  if (cold) await caches.delete(ENGINE_CACHE);
  const c = new Calculator(browserFiles(URLS));
  const t0 = performance.now();
  await c.ready();
  const ms = performance.now() - t0;
  calc = c;
  return ms;
}

async function run() {
  const coldStart = await start(true);
  const keptStart = (await timed(3, () => start(false))).median;
  const c = calc!;
  const natalChart = (await castNatal(c, NATAL)).chart;
  const rows = [...natalChart.planets, ...Object.values(natalChart.angles)].map((p) => ({ id: p.id, name: p.name, ecliptic: p.ecliptic }));
  const at = Date.parse("2026-08-27T12:00:00Z");
  const sky = (i: number) => ({
    at: new Date(at + i * 3_600_000).toISOString(),
    latitude: NATAL.latitude,
    longitude: NATAL.longitude,
    natalCusps: natalChart.houses.map((h) => h.ecliptic),
    natalBodies: rows,
    houseSystem: natalChart.meta.houseSystem,
    timezone: "Europe/Paris",
  });
  const span = (from: string, to: string) => ({ from, to, latitude: NATAL.latitude, longitude: NATAL.longitude, natalBodies: rows, houseSystem: natalChart.meta.houseSystem, timezone: "Europe/Paris" });
  const CHUNK = 32 * 86_400_000;
  const EPOCH = Date.UTC(2000, 0, 1);
  return {
    coldStart,
    keptStart,
    natal: await timed(7, (i) => castNatal(c, { ...NATAL, time: `12:0${i}` })),
    humanDesign: await timed(7, (i) => castHumanDesign(c, { natalUtc: new Date(Date.UTC(1990, 5, 15, 10, i)).toISOString() })),
    timingMonth: await timed(3, () => timing(c, span("2026-07-31T22:00:00.000Z", "2026-08-31T22:00:00.000Z"))),
    scrubWindow: await timed(3, (i) => skyWindow(c, EPOCH + (Math.floor((at - EPOCH) / CHUNK) + i) * CHUNK)),
    progressions: await timed(3, (i) => castProgressions(c, { ...sky(i), natalUtc: natalChart.meta.utc, targetUtc: sky(i).at })),
    transits: await timed(3, (i) => castTransits(c, sky(i))),
    timingYear: await timed(3, () => timing(c, span("2025-12-31T23:00:00.000Z", "2026-12-31T23:00:00.000Z"))),
  };
}

/** A fixed loop, to measure how much the CPU was slowed. */
function spin(): number {
  const t0 = performance.now();
  let x = 0;
  for (let i = 0; i < 2e7; i += 1) x += Math.sqrt(i);
  if (x < 0) console.log(x);
  return performance.now() - t0;
}

declare global {
  var __engineTiming: () => ReturnType<typeof run>;
  var __spin: () => number;
}
globalThis.__engineTiming = run;
globalThis.__spin = spin;
