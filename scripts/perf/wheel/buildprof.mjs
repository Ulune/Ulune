// JS profile of entering 3D (or of a rebuild: REBUILD=1): where the build's
// time goes, by function, self and inclusive.
// node scripts/perf/wheel/buildprof.mjs natal|transit classic|advanced|all
import { open, waitWheel } from "./lib.mjs";
const mode = process.argv[2] ?? "natal";
const preset = process.argv[3] ?? "classic";
const { browser, page } = await open({ dpr: Number(process.env.DPR ?? 2) });
await page.goto(`http://perf.local/index.html?mode=${mode}&preset=${preset}`);
await waitWheel(page);
await page.mouse.move(2, 2);
const on = () => page.waitForFunction(() => document.querySelector("svg.ulune-wheel[data-depth-base]")?.getAttribute("data-view3d") === "gl", null, { timeout: 20000 });
if (process.env.REBUILD === "1") {
  await page.evaluate(() => window.__h.d3(true));
  await on();
  await page.waitForTimeout(3000);
}
const cdp = await page.context().newCDPSession(page);
await cdp.send("Profiler.enable");
await cdp.send("Profiler.setSamplingInterval", { interval: 100 });
await cdp.send("Profiler.start");
if (process.env.REBUILD === "1") {
  await page.evaluate(() => document.querySelector(".ulune-depth").__uluneView3d.rebuild());
  await page.waitForTimeout(1500);
} else {
  await page.evaluate(() => window.__h.d3(true));
  await on();
  await page.waitForTimeout(500);
}
const { profile } = await cdp.send("Profiler.stop");
const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const parent = new Map();
for (const n of profile.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
const self = new Map();
const incl = new Map();
const dt = profile.timeDeltas;
for (let i = 0; i < profile.samples.length; i += 1) {
  const n = byId.get(profile.samples[i]);
  const k = `${n.callFrame.functionName || "(anon)"}:${n.callFrame.lineNumber + 1}`;
  self.set(k, (self.get(k) ?? 0) + (dt[i] ?? 0) / 1000);
  const seen = new Set();
  let id = profile.samples[i];
  while (id != null) {
    const m = byId.get(id);
    const key = `${m.callFrame.functionName || "(anon)"}:${m.callFrame.lineNumber + 1}`;
    if (!seen.has(key)) {
      incl.set(key, (incl.get(key) ?? 0) + (dt[i] ?? 0) / 1000);
      seen.add(key);
    }
    id = parent.get(id);
  }
}
console.log("SELF");
for (const [k, v] of [...self].sort((a, b) => b[1] - a[1]).slice(0, 22)) console.log(v.toFixed(1).padStart(8), k);
console.log("INCLUSIVE");
for (const [k, v] of [...incl].sort((a, b) => b[1] - a[1]).slice(0, 40)) console.log(v.toFixed(1).padStart(8), k);
await browser.close();
