// The calendar's client costs: the real month (with the sky's events and the
// Moon of each day) and year grids rendered (render phase, production React),
// the table's time labels, the scope filter.
// NODE_ENV=production node --experimental-strip-types --import ./scripts/perf/register.mjs scripts/perf/timing-bench.mjs
import { performance } from "node:perf_hooks";
import { createRequire } from "node:module";
import { ROOT } from "./paths.mjs";

const require = createRequire(`${ROOT}/package.json`);
const React = require("react");
const { renderToString } = require("react-dom/server");
const h = React.createElement;

const { calculateNatal, calculateSkyWindow, calculateTiming } = await import("@/lib/chart/calculate.server");
const tw = await import("@/lib/chart/timing-window");
const { chunkStart } = await import("@/lib/chart/sky-window");
const { eventsOf } = await import("@/lib/chart/calendar-sky");
const { TimingYearGrid } = await import("@/components/timing-calendar");
const { CalendarMonth } = await import("@/components/calendar-month");

const PARIS = { latitude: 48.8566, longitude: 2.3522, placeLabel: "Paris, France", houseSystem: "placidus" };
const natal = await calculateNatal({ ...PARIS, name: "A", date: "1990-06-15", time: "14:30" });
const natalBodies = [
  ...natal.planets.map((p) => ({ id: p.id, name: p.name, ecliptic: p.ecliptic })),
  ...Object.values(natal.angles).map((x) => ({ id: x.id, name: x.name, ecliptic: x.ecliptic })),
];
const tz = "Europe/Paris";
const year = await calculateTiming({ from: new Date("2026-01-01T00:00:00Z"), to: new Date("2027-01-01T00:00:00Z"), ...PARIS, natalBodies });
const month = await calculateTiming({ from: new Date("2026-09-01T00:00:00Z"), to: new Date("2026-10-01T00:00:00Z"), ...PARIS, natalBodies });
const wins = [];
for (let c = chunkStart(Date.parse("2026-08-29T00:00:00Z")); c <= Date.parse("2026-10-04T00:00:00Z"); c += 32 * 86_400_000) wins.push(await calculateSkyWindow(c));
const events = eventsOf(wins);

function bench(label, fn, n = 20) {
  fn();
  const t = performance.now();
  for (let i = 0; i < n; i += 1) fn();
  console.log(`${label.padEnd(58)} ${((performance.now() - t) / n).toFixed(2)} ms`);
}
const noop = () => {};
bench(`Month render (${month.hits.length} hits, ${events.length} sky events)`, () =>
  renderToString(
    h(CalendarMonth, { civil: { year: 2026, month: 9, day: 1 }, tz, events, wins, hits: month.hits, showSky: true, showYours: true, selectedDay: null, todayKey: "2026-09-28", onPickDay: noop }),
  ),
);
bench(`Year grid render (${year.hits.length} hits)`, () =>
  renderToString(h(TimingYearGrid, { year: 2026, hits: year.hits, tz, onPickMonth: noop })),
);
bench(`Table labels, timingWhen × ${month.hits.length}`, () => month.hits.map((x) => tw.timingWhen(x.exactUtc, tz, "en", "table")));
bench(`hitsInScope(year hits)`, () => tw.hitsInScope(year.hits, Date.parse("2026-01-01"), Date.parse("2027-01-01")));
process.exit(0);
