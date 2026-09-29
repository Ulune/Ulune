// Performance budgets (plan, Phase 5): each measure against its limit on
// this test machine, pass or fail, and a non-zero exit when one fails.
// node --experimental-strip-types --import ./scripts/register-ts.mjs scripts/perf/budgets.mjs [server,3d,wheel,bundle,scrub]
//
// server  the chart calculations in this process (warm, and the first cast)
// 3d      the counting WebGL harness (scripts/perf/gl3d/build.mjs first)
// wheel   node counts and per-node transitions (scripts/perf/wheel/build.mjs first)
// bundle  what "/" downloads for a returning reader (npm run build, serve.mjs on :9311)
// scrub   wheel updates per second while the scrubber is dragged (the same served build)
//
// The limits are this machine's (2 cores, software rendering); a Mac is
// several times faster. They sit a little above what the app does today, so
// a regression fails and today passes; the plan's goals are in the notes.
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { ROOT } from "./paths.mjs";

const want = new Set((process.argv[2] ?? "server,3d,wheel").split(","));
const rows = [];
const check = (area, what, value, limit, unit, better = "lower") => {
  const ok = better === "lower" ? value <= limit : value >= limit;
  rows.push({ area, what, value, limit, unit, better, ok });
};
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const node = (args, env = {}) =>
  execFileSync(process.execPath, args, { cwd: ROOT, encoding: "utf8", env: { ...process.env, ...env }, maxBuffer: 64 << 20 });

if (want.has("server")) {
  const calc = await import("../../src/lib/chart/calculate.server.ts");
  const { chunkStart } = await import("../../src/lib/chart/sky-window.ts");
  const t = () => performance.now();
  let s = t();
  const natal = await calc.calculateNatal({ name: "", placeLabel: "Paris", date: "1990-06-15", time: "12:00", latitude: 48.8566, longitude: 2.3522 });
  check("server", "first cast (cold engine)", t() - s, 1000, "ms");
  const warm = [];
  for (let i = 0; i < 9; i += 1) {
    s = t();
    await calc.calculateNatal({ name: "", placeLabel: "Paris", date: "1990-06-15", time: `12:0${i}`, latitude: 48.8566, longitude: 2.3522 });
    warm.push(t() - s);
  }
  check("server", "cast, warm", median(warm), 50, "ms");
  check("server", "cast answer", JSON.stringify({ chart: natal, timeUnknown: false }).length / 1024, 60, "KB");
  const cusps = natal.houses.map((h) => h.ecliptic);
  const bodies = [...natal.planets, ...Object.values(natal.angles)].map((p) => ({ id: p.id, name: p.name, ecliptic: p.ecliptic }));
  const at = Date.parse("2026-09-24T12:00:00Z");
  const tr = [];
  for (let i = 0; i < 7; i += 1) {
    s = t();
    await calc.calculateTransits({ utc: new Date(at + i * 3_600_000), latitude: 48.8566, longitude: 2.3522, natalCusps: cusps, natalBodies: bodies });
    tr.push(t() - s);
  }
  check("server", "transit sky with exact times (once time settles)", median(tr), 200, "ms");
  // The calendar: the year's sky file on the server (once a year for everyone,
  // then kept at the edge), your transits on the device from the chunks.
  s = t();
  const yearFile = await calc.calculateSkyYear(2026);
  check("server", "year sky file", t() - s, 2000, "ms");
  check("server", "year sky file, size", JSON.stringify(yearFile).length / 1024, 100, "KB");
  const { transitsFromWindows } = await import("../../src/lib/chart/personal-transits.ts");
  const from = Date.parse("2026-01-01T00:00:00Z");
  const to = Date.parse("2027-01-01T00:00:00Z");
  const wins = [];
  for (let c = chunkStart(from - 2 * 86_400_000); c <= to + 2 * 86_400_000; c += 32 * 86_400_000) wins.push(await calc.calculateSkyWindow(c));
  s = t();
  const hits = transitsFromWindows(wins, bodies, from, to);
  check("device", "transits of a year from the chunks", t() - s, 500, "ms");
  check("device", "transits of a year found", hits.length > 2000 ? 1 : 0, 1, "", "higher");
  s = t();
  const win = await calc.calculateSkyWindow(chunkStart(at + 90 * 86_400_000));
  // With the sky's own events since part 53 (about 130 a chunk, found and polished on Swiss).
  check("server", "scrub window chunk", t() - s, 300, "ms");
  check("server", "scrub window chunk, size", JSON.stringify(win).length / 1024, 45, "KB");
}

if (want.has("3d")) {
  node([join(ROOT, "scripts/perf/gl3d/build.mjs")]);
  const out = node([join(ROOT, "scripts/perf/gl3d/harness.mjs")], { INST: "1" });
  const runs = out.split("\n").filter((l) => l.startsWith("{")).map((l) => JSON.parse(l));
  const limits = { "natal default": [360, 8], "natal detailed": [620, 8], "natal every body": [1300, 16], "bi-wheel transits": [900, 12] };
  for (const r of runs) {
    const key = Object.keys(limits).find((k) => r.name.startsWith(k));
    if (!key) continue;
    check("3d", `${key}: GL calls per frame`, r.glCallsPerFrame, limits[key][0], "");
    check("3d", `${key}: garbage per frame`, Math.max(0, r.allocKBPerFrame), limits[key][1], "KB");
  }
}

if (want.has("wheel")) {
  node([join(ROOT, "scripts/perf/wheel/build.mjs")]);
  const { open, waitWheel } = await import("./wheel/lib.mjs");
  const limits = { "natal classic": 1050, "natal advanced": 1350, "transit classic": 1170, "transit advanced": 1800 };
  for (const key of Object.keys(limits)) {
    const [mode, preset] = key.split(" ");
    const { browser, page } = await open({});
    await page.goto(`http://perf.local/index.html?mode=${mode}&preset=${preset}`);
    await waitWheel(page);
    const r = await page.evaluate(() => {
      const svg = document.querySelector("svg.ulune-wheel[data-depth-base]");
      const all = svg.getElementsByTagName("*");
      let transitions = 0;
      for (const el of all) {
        if (getComputedStyle(el).transitionDuration.split(",").some((d) => parseFloat(d) > 0)) transitions += 1;
      }
      return { nodes: all.length, transitions };
    });
    await browser.close();
    check("wheel", `${key}: nodes at rest`, r.nodes, limits[key], "");
    check("wheel", `${key}: nodes with their own transition`, r.transitions, 0, "");
  }
}

if (want.has("bundle")) {
  const out = node([join(ROOT, "scripts/perf/load/chunks.mjs"), "/", "--returning", "--json"]);
  const [home] = JSON.parse(out.slice(out.indexOf("[")));
  check("bundle", '"/" JavaScript with the load (returning reader)', home.jsUpFront / 1024, 262, "KB gz");
  // Style sheets: those the first paint waits for, and all of them once the
  // modes' own have loaded after it (the calendar's since part 55; the
  // table's, fetched when idle, grew with part 49: limit 46).
  const cssUpFront = home.files.filter((f) => f.type === "stylesheet" && !f.later).reduce((n, f) => n + (f.gz ?? 0), 0);
  check("bundle", '"/" style sheets up front', cssUpFront / 1024, 32, "KB gz");
  check("bundle", '"/" style sheets with the modes\' own', home.cssGz / 1024, 46, "KB gz");
  const largest = Math.max(...home.files.filter((f) => f.type === "script").map((f) => f.gz ?? 0));
  check("bundle", "largest script", largest / 1024, 80, "KB gz");
}

if (want.has("scrub")) {
  const out = node([join(ROOT, "scripts/perf/wheel/scrub.mjs"), "3", "1"], { ULUNE_DEV: process.env.ULUNE_DEV ?? "http://127.0.0.1:9311" });
  const res = JSON.parse(out.trim().split("\n").pop());
  check("scrub", "wheel updates per second while dragging", res.median.updatesPerSec, 20, "/s", "higher");
  check("scrub", "server casts during the drag", res.median.castsDuringDrag, 0, "");
  check("scrub", "exact sky after letting go", res.median.exactAfterMs, 600, "ms");
}

let failed = 0;
for (const r of rows) {
  if (!r.ok) failed += 1;
  const v = Number.isInteger(r.value) ? String(r.value) : r.value.toFixed(1);
  console.log(`${r.ok ? "ok  " : "FAIL"}  ${r.area.padEnd(6)} ${r.what.padEnd(52)} ${v.padStart(8)} ${r.better === "lower" ? "≤" : "≥"} ${r.limit} ${r.unit}`);
}
console.log(failed ? `${failed} budget(s) over` : `all ${rows.length} within budget`);
process.exit(failed ? 1 : 0);
