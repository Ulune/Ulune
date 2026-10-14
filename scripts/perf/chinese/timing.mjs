// The Chinese engines' time in Chromium with the CPU slowed 6× (CDP Emulation.setCPUThrottlingRate),
// as the languages plan's budgets table asks (languages plan, part 30): "a full BaZi chart with luck
// pillars: under 5 ms on a 6× slowed phone", "a Flying Star chart: under 2 ms" (on the same slowed
// CPU here). Bundles timing-entry.ts with rolldown into scripts/perf/.out/chinese/timing.js, runs it
// in a blank page, unslowed and then slowed: warm calls first (the code compiled, the term table
// decoded), then 9 timings of a batch of calls (about 50 ms of work unslowed), the median per call.
// node --experimental-strip-types --import ./scripts/register-ts.mjs scripts/perf/chinese/timing.mjs [--json]
import { createRequire } from "node:module";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CHROME, OUT, PERF, ROOT, SRC } from "../paths.mjs";

const require = createRequire(join(ROOT, "package.json"));
const { chromium } = require("playwright");
const { rolldown } = require("rolldown");
const DIST = join(OUT, "chinese");
mkdirSync(DIST, { recursive: true });

const bundle = await rolldown({
  input: join(PERF, "chinese/timing-entry.ts"),
  platform: "browser",
  resolve: { alias: { "@": SRC } },
  tsconfig: false,
  transform: { define: { "import.meta.env.DEV": "false", "import.meta.env.PROD": "true", "import.meta.env.SSR": "false" } },
  logLevel: "warn",
});
const file = join(DIST, "timing.js");
await bundle.write({ file, format: "iife", sourcemap: false, minify: true, codeSplitting: false });

const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.goto("about:blank");
await page.addScriptTag({ content: readFileSync(file, "utf8") });
const cdp = await page.context().newCDPSession(page);
const result = {};
// The slowdown itself is measured too: a fixed loop (the median of three) before and after the
// timings, against the unslowed page. The protocol's throttle is coarse on a busy machine (2× to
// 6× here from one run to the next), and a timing taken while it had not engaged would pass for a
// fast engine; so the slowed run is taken again, five tries at most, until the loop ran at least
// 2.5× slower on both sides of it.
const spin = async () => {
  const t = [];
  for (let i = 0; i < 3; i += 1) t.push(await page.evaluate(() => globalThis.__spin()));
  return t.sort((a, b) => a - b)[1];
};
let base = 0;
for (const rate of [1, 6]) {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    await cdp.send("Emulation.setCPUThrottlingRate", { rate });
    const before = await spin();
    if (rate === 1) base = before;
    const times = await page.evaluate(() => ({ bazi: globalThis.__chineseTiming("bazi"), stars: globalThis.__chineseTiming("stars") }));
    const after = rate === 1 ? before : await spin();
    result[`x${rate}`] = { slowdown: Math.min(before, after) / base, ...times };
    if (rate === 1 || result[`x${rate}`].slowdown >= 2.5) break;
  }
}
await browser.close();
if (process.argv.includes("--json")) console.log(JSON.stringify(result));
else {
  for (const [rate, r] of Object.entries(result)) {
    console.log(`CPU ${rate} (a fixed loop ${r.slowdown.toFixed(1)}× slower): a full BaZi chart with luck pillars ${r.bazi.median.toFixed(3)} ms (${r.bazi.min.toFixed(3)}–${r.bazi.max.toFixed(3)}); a Flying Star chart ${r.stars.median.toFixed(3)} ms (${r.stars.min.toFixed(3)}–${r.stars.max.toFixed(3)})`);
  }
}
