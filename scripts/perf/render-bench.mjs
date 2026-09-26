// Render-phase cost (SSR proxy) of the big React subtrees, production React.
// NODE_ENV=production node --experimental-strip-types --import ./scripts/perf/register.mjs scripts/perf/render-bench.mjs
import { performance } from "node:perf_hooks";
import { createRequire } from "node:module";
import { ROOT } from "./paths.mjs";
const require = createRequire(`${ROOT}/package.json`);
const React = require("react");
const { renderToString } = require("react-dom/server");
const h = React.createElement;

const { calculateNatal, calculateTransits } = await import("@/lib/chart/calculate.server");
const { buildDossier } = await import("@/lib/chart/interpret-local");
const cv = await import("@/lib/chart/chart-view");
const { aspectVisible } = await import("@/lib/chart/aspect-filter");
const { createSelectionStore } = await import("@/lib/chart/selection-store");

function bench(label, fn, n = 30) {
  let out = "";
  const t0 = performance.now();
  out = fn();
  const cold = performance.now() - t0;
  for (let i = 0; i < 5; i++) fn();
  const t1 = performance.now();
  for (let i = 0; i < n; i++) fn();
  const avg = (performance.now() - t1) / n;
  const tags = (out.match(/<[a-zA-Z]/g) || []).length;
  console.log(`${label.padEnd(52)} cold ${cold.toFixed(1).padStart(7)} ms  warm ${avg.toFixed(2).padStart(7)} ms  elements ${String(tags).padStart(6)}  html ${(out.length / 1024).toFixed(0)} KB`);
}

const PARIS = { latitude: 48.8566, longitude: 2.3522, placeLabel: "Paris, France", houseSystem: "placidus" };
const a = await calculateNatal({ ...PARIS, name: "Person A", date: "1990-06-15", time: "14:30" });
const natalBodies = [
  ...a.planets.map((p) => ({ id: p.id, name: p.name, ecliptic: p.ecliptic })),
  ...Object.values(a.angles).map((x) => ({ id: x.id, name: x.name, ecliptic: x.ecliptic })),
];
const sky = await calculateTransits({ utc: new Date("2026-09-24T12:00:00Z"), latitude: a.meta.latitude, longitude: a.meta.longitude, natalCusps: a.houses.map((x) => x.ecliptic), natalBodies, houseSystem: "placidus" });

for (const presetId of ["classic", "advanced", "all"]) {
  const live = cv.cloneChartView(cv.NAMED_PRESETS[presetId]);
  const visible = new Set(live.bodies);
  const aspectFilter = cv.viewToAspectFilter(live);
  const overlays = cv.viewToOverlays(live, []);
  const stars = new Set(live.stars);
  const mids = new Set(live.midpoints);
  const shownAspects = a.aspects.filter((x) => visible.has(x.a) && visible.has(x.b) && aspectVisible(x, aspectFilter)).length;
  const shownCross = sky.aspects.filter((x) => visible.has(x.a) && visible.has(x.b) && aspectVisible(x, aspectFilter)).length;
  console.log(`\n== preset ${presetId}: ${visible.size} bodies, ${shownAspects} natal aspects drawn, ${shownCross} transit cross aspects drawn ==`);
  try {
    const { ChartWheel } = await import("@/components/chart-wheel");
    bench("ChartWheel natal (full render)", () => renderToString(h(ChartWheel, { chart: a, selectedId: null, visible, aspectFilter, overlays, starVisible: stars, midpointVisible: mids, onSelect: () => {} })));
    bench("ChartWheel transit bi-wheel (full render)", () => renderToString(h(ChartWheel, { chart: a, selectedId: null, visible, aspectFilter, overlays, starVisible: stars, midpointVisible: mids, onSelect: () => {}, transits: sky.planets, crossAspects: sky.aspects, outerKind: "transit", aspectLayer: "both" })));
  } catch (e) {
    console.log("ChartWheel failed:", e.message.split("\n")[0]);
  }
  if (presetId !== "classic") continue;
  try {
    const { WheelAspectGrid } = await import("@/components/wheel-aspect-grid");
    const rows = a.aspects
      .filter((x) => visible.has(x.a) && visible.has(x.b) && aspectVisible(x, aspectFilter))
      .map((x) => ({ id: `aspect:${x.id}`, aspect: x.id, type: x.type, a: x.a, b: x.b, orb: x.orb }));
    const shownPlanets = a.planets.filter((p) => visible.has(p.id));
    const ctx = { chart: a, visible, filter: aspectFilter, bodies: [...shownPlanets, ...Object.values(a.angles).filter((x) => visible.has(x.id))], shownPlanets, shownStars: [], shownMids: [], configMembers: null, crossAspects: null, outerAspects: null, outerKind: "transit", aspectLayer: "natal", outerBodies: [] };
    const selection = createSelectionStore(null);
    bench("WheelAspectGrid (re-renders per wheel hover change)", () => renderToString(h(WheelAspectGrid, { rows, ctx, selection, onSelect: () => {} })), 200);
  } catch (e) {
    console.log("WheelAspectGrid failed:", e.message.split("\n")[0]);
  }
}

try {
  const { NatalGlance } = await import("@/components/natal-hello");
  bench("NatalGlance (re-renders per wheel hover change)", () => renderToString(h(NatalGlance, { chart: a, selectedId: null, onSelect: () => {} })), 200);
} catch (e) {
  console.log("NatalGlance failed:", e.message.split("\n")[0]);
}
try {
  const { ReadingCard } = await import("@/components/reading-card");
  const d = buildDossier(a, "en");
  const r = d.byId["planet:sun"];
  bench("ReadingCard planet:sun (per scrub tick when pinned)", () => renderToString(h(ReadingCard, { reading: { ...r }, chart: a, depth: "full", onDepth: () => {}, onGo: () => {} })), 200);
} catch (e) {
  console.log("ReadingCard failed:", e.message.split("\n")[0]);
}
try {
  const { NatalTable } = await import("@/studio/tables/natal-table");
  bench("NatalTable points section (per pin in table view)", () => renderToString(h(NatalTable, { chart: a, selectedId: "planet:sun", onSelect: () => {} })), 50);
} catch (e) {
  console.log("NatalTable failed:", e.message.split("\n")[0]);
}
process.exit(0);
