// How close cubic Hermite interpolation (positions + speeds at fixed steps)
// stays to Swiss between samples: the basis of the planned scrub window.
// node --experimental-strip-types --import ./scripts/register-ts.mjs scripts/perf/interpolation-check.mjs [days]
import { calculateTransits } from "../../src/lib/chart/calculate.server.ts";

const cusps = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
const at = async (ms) => {
  const sky = await calculateTransits({ utc: new Date(ms), latitude: 48.8566, longitude: 2.3522, natalCusps: cusps, natalBodies: [] });
  return new Map(sky.planets.map((p) => [p.id, { lon: p.ecliptic, speed: p.speed ?? NaN }]));
};
const H = 3 * 3_600_000; // 3-hour grid
const start = Date.parse("2026-09-01T00:00:00Z");
const days = Number(process.argv[2] ?? 30);
const grid = [];
for (let i = 0; i <= days * 8; i++) grid.push(await at(start + i * H));
const ids = [...grid[0].keys()];
const wrap = (x) => ((x % 360) + 540) % 360 - 180;
const hermiteMid = (a, b, hDays) => {
  const p1 = a.lon + wrap(b.lon - a.lon); // unwrap across 0°
  return 0.5 * a.lon + 0.5 * p1 + 0.125 * hDays * (a.speed - b.speed);
};
const results = {};
for (const [label, stride] of [["24 h", 8], ["12 h", 4], ["6 h", 2]]) {
  const hDays = (stride * H) / 86_400_000;
  for (const id of ids) {
    let worst = 0;
    for (let i = 0; i + stride < grid.length; i += stride) {
      const a = grid[i].get(id), b = grid[i + stride].get(id), mid = grid[i + stride / 2].get(id);
      if (!a || !b || !mid || !Number.isFinite(a.speed) || !Number.isFinite(b.speed)) continue;
      const err = Math.abs(wrap(hermiteMid(a, b, hDays) - mid.lon)) * 3600;
      if (err > worst) worst = err;
    }
    (results[id] ??= {})[label] = worst;
  }
}
console.log("worst |error| at mid-step, arcseconds, over", days, "days from 2026-09-01");
console.log("body".padEnd(12), "24 h".padStart(10), "12 h".padStart(10), "6 h".padStart(10));
for (const id of ids) {
  const r = results[id];
  console.log(id.padEnd(12), ...["24 h", "12 h", "6 h"].map((k) => (r[k] ?? NaN).toFixed(4).padStart(10)));
}
