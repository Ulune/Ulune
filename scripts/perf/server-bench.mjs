// Server cost of every chart calculation (warm engine) and the size of each answer.
// node --experimental-strip-types --import ./scripts/register-ts.mjs scripts/perf/server-bench.mjs
import {
  calculateNatal,
  calculateTransits,
  calculateTiming,
  calculateProgressions,
  calculateHumanDesign,
} from "../../src/lib/chart/calculate.server.ts";

const t = () => performance.now();
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const kb = (o) => (JSON.stringify(o).length / 1024).toFixed(1) + " KB";
const out = {};

let s = t();
const natal = await calculateNatal({ name: "", placeLabel: "Paris", date: "1990-06-15", time: "12:00", latitude: 48.8566, longitude: 2.3522 });
out.natalCold = t() - s;
const natalWarm = [];
for (let i = 0; i < 10; i++) {
  s = t();
  await calculateNatal({ name: "", placeLabel: "Paris", date: "1990-06-15", time: `12:${String(i).padStart(2, "0")}`, latitude: 48.8566, longitude: 2.3522 });
  natalWarm.push(t() - s);
}
out.natalWarm = median(natalWarm);
out.natalSize = kb(natal);

const natalCusps = natal.houses.map((h) => h.ecliptic);
const natalBodies = [
  ...natal.planets.map((p) => ({ id: p.id, name: p.name, ecliptic: p.ecliptic })),
  ...Object.values(natal.angles).map((a) => ({ id: a.id, name: a.name, ecliptic: a.ecliptic })),
];
const base = Date.parse("2026-09-24T12:00:00Z");
const tr = [];
let sky;
for (let i = 0; i < 20; i++) {
  s = t();
  sky = await calculateTransits({ utc: new Date(base + i * 3_600_000), latitude: 48.8566, longitude: 2.3522, natalCusps, natalBodies });
  tr.push(t() - s);
}
out.transitsFirst = tr[0];
out.transitsMedian = median(tr.slice(1));
out.transitsSize = kb(sky);
out.transitAspects = sky.aspects.length;
out.transitExacts = sky.aspects.filter((a) => a.exactUtc).length;

s = t();
const month = await calculateTiming({ from: new Date("2026-09-01T00:00:00Z"), to: new Date("2026-10-01T00:00:00Z"), latitude: 48.8566, longitude: 2.3522, natalBodies });
out.timingMonth = t() - s;
out.timingMonthHits = month.hits.length;
out.timingMonthSize = kb(month);
s = t();
const year = await calculateTiming({ from: new Date("2026-01-01T00:00:00Z"), to: new Date("2027-01-01T00:00:00Z"), latitude: 48.8566, longitude: 2.3522, natalBodies });
out.timingYear = t() - s;
out.timingYearHits = year.hits.length;
out.timingYearSize = kb(year);

const pr = [];
let prog;
for (let i = 0; i < 5; i++) {
  s = t();
  prog = await calculateProgressions({ natalUtc: new Date(natal.meta.utc), targetUtc: new Date(base + i * 86_400_000), latitude: 48.8566, longitude: 2.3522, natalCusps, natalBodies });
  pr.push(t() - s);
}
out.progressionsMedian = median(pr);
out.progressionsSize = kb(prog);

const hd = [];
let hdc;
for (let i = 0; i < 5; i++) {
  s = t();
  hdc = await calculateHumanDesign({ natalUtc: new Date(Date.parse(natal.meta.utc) + i * 60_000) });
  hd.push(t() - s);
}
out.humanDesignMedian = median(hd);
out.humanDesignSize = kb(hdc);

for (const [k, v] of Object.entries(out)) console.log(k.padEnd(20), typeof v === "number" ? v.toFixed(1) + (k.endsWith("Hits") || k.endsWith("Aspects") || k.endsWith("Exacts") ? "" : " ms") : v);
