// The calculations on the device in Chromium, unslowed and with the CPU slowed 4× and 6× (CDP
// Emulation.setCPUThrottlingRate: a mid-range and a cheap phone), as the on-device plan's
// timings table and its step 6 ask: the first chart (its files downloaded from a local server, the
// engine started, the chart cast), the engine's start (the first visit; a return visit, its files
// from the browser's copy), a natal chart, Human Design, a Timing month, a scrub-window chunk,
// progressions and transits with their exact times, a Timing year, and the Calendar's own work on
// a device (a year's sky file, a year's chunks).
// Bundles timing-entry.ts with rolldown into scripts/perf/.out/engine/, serves it with the
// engine's files (ephe/, swisseph.wasm) on a local port, and runs it on a page's main thread
// (the protocol does not slow workers; the worker runs the same code). Medians.
// node --experimental-strip-types --import ./scripts/register-ts.mjs scripts/perf/engine/timing.mjs [--json]
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { CHROME, OUT, PERF, ROOT, SRC } from "../paths.mjs";

const require = createRequire(join(ROOT, "package.json"));
const { chromium } = require("playwright");
const { rolldown } = require("rolldown");
const DIST = join(OUT, "engine");
mkdirSync(DIST, { recursive: true });

const bundle = await rolldown({
  input: join(PERF, "engine/timing-entry.ts"),
  platform: "browser",
  resolve: { alias: { "@": SRC } },
  tsconfig: false,
  transform: { define: { "import.meta.env.DEV": "false", "import.meta.env.PROD": "true", "import.meta.env.SSR": "false" } },
  logLevel: "warn",
});
const file = join(DIST, "timing.js");
await bundle.write({ file, format: "es", sourcemap: false, minify: true, codeSplitting: false });

const WASM = join(ROOT, "node_modules/sweph-wasm/dist/wasm/swisseph.wasm");
const server = createServer((req, res) => {
  const path = new URL(req.url, "http://x").pathname;
  if (path === "/") {
    res.writeHead(200, { "content-type": "text/html" });
    return res.end('<!doctype html><meta charset="utf-8"><script type="module" src="/timing.js"></script>');
  }
  if (path === "/timing.js") {
    res.writeHead(200, { "content-type": "text/javascript" });
    return res.end(readFileSync(file));
  }
  const name = path.startsWith("/engine/") ? path.slice(8) : "";
  const source = name === "swisseph.wasm" ? WASM : join(ROOT, "ephe", name);
  if (name && !name.includes("/") && existsSync(source)) {
    res.writeHead(200, { "content-type": name.endsWith(".wasm") ? "application/wasm" : "application/octet-stream" });
    return res.end(readFileSync(source));
  }
  res.writeHead(404);
  res.end();
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const base = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.goto(base);
await page.waitForFunction(() => typeof globalThis.__engineTiming === "function");
const cdp = await page.context().newCDPSession(page);
const spin = async () => {
  const t = [];
  for (let i = 0; i < 3; i += 1) t.push(await page.evaluate(() => globalThis.__spin()));
  return t.sort((a, b) => a - b)[1];
};
const result = {};
let unslowed = 0;
// As the Chinese harness: the slowdown is measured around the timings, and a slowed run is taken
// again (five tries at most) until a fixed loop ran at least 0.6 × the rate slower on both sides.
for (const rate of [1, 4, 6]) {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    await cdp.send("Emulation.setCPUThrottlingRate", { rate });
    const before = await spin();
    if (rate === 1) unslowed = before;
    const times = await page.evaluate(() => globalThis.__engineTiming());
    const after = rate === 1 ? before : await spin();
    result[`x${rate}`] = { slowdown: Math.min(before, after) / unslowed, ...times };
    if (rate === 1 || result[`x${rate}`].slowdown >= 0.6 * rate) break;
  }
}
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
await browser.close();
server.close();

if (process.argv.includes("--json")) console.log(JSON.stringify(result));
else {
  const ms = (x) => (typeof x === "number" ? x : x.median);
  const rows = [
    ["the first chart (download, start, cast)", "firstChart"],
    ["engine start, first visit (download, compile, mount)", "coldStart"],
    ["engine start, from the browser's copy", "keptStart"],
    ["a natal chart", "natal"],
    ["Human Design", "humanDesign"],
    ["Timing, a month", "timingMonth"],
    ["scrub window, a chunk (32 days, every 12 h)", "scrubWindow"],
    ["progressions at one moment", "progressions"],
    ["transits at one moment, with exact times", "transits"],
    ["Timing, a year", "timingYear"],
    ["the year's sky file (the Calendar)", "skyYear"],
    ["the Calendar's year: its 13 chunks", "calendarYear"],
  ];
  console.log(`${"".padEnd(52)} ${Object.entries(result).map(([k, r]) => `${k} (${r.slowdown.toFixed(1)}×)`.padStart(14)).join(" ")}`);
  for (const [label, key] of rows) {
    console.log(`${label.padEnd(52)} ${Object.values(result).map((r) => `${ms(r[key]).toFixed(1)} ms`.padStart(14)).join(" ")}`);
  }
}
