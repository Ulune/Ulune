// JS profile of a pointer sweep over 10 planets: self and inclusive time per function.
// node scripts/perf/wheel/jsprof.mjs natal|transit classic|advanced
// D3=1: in the 3D view (the planets where the view draws them).
import { open, waitWheel } from "./lib.mjs";
const mode = process.argv[2] ?? "transit";
const preset = process.argv[3] ?? "advanced";
const { browser, page } = await open({ overrides: process.env.OVERRIDES ?? "" });
await page.goto(`http://perf.local/index.html?mode=${mode}&preset=${preset}${process.env.EXTRA ?? ""}`);
await waitWheel(page);
const d3 = process.env.D3 === "1";
if (d3) {
  await page.evaluate(() => window.__h.d3(true));
  await page.waitForFunction(() => document.querySelector("svg.ulune-wheel[data-depth-base]")?.getAttribute("data-view3d") === "gl", null, { timeout: 20000 });
  await page.waitForTimeout(3000);
}
const planets = d3
  ? await page.evaluate(() => {
      const v = document.querySelector(".ulune-depth").__uluneView3d;
      return v.debugState().sprites.filter((s) => s.id.startsWith("planet:")).map((s) => v.screenOf(s.id));
    })
  : await page.evaluate(() => [...document.querySelectorAll('svg[data-depth-base] [data-kind="planet"] > .ulune-wheel-halo')].map((el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }));
await page.mouse.move(3, 3); await page.waitForTimeout(600);
const cdp = await page.context().newCDPSession(page);
await cdp.send("Profiler.enable");
await cdp.send("Profiler.setSamplingInterval", { interval: 100 });
await cdp.send("Profiler.start");
for (const p of planets.slice(0, 10)) { await page.mouse.move(p.x, p.y, { steps: 3 }); await page.waitForTimeout(60); }
await page.mouse.move(3, 3); await page.waitForTimeout(400);
const { profile } = await cdp.send("Profiler.stop");
// self time per function
const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const self = new Map();
const dt = profile.timeDeltas;
for (let i = 0; i < profile.samples.length; i += 1) {
  const n = byId.get(profile.samples[i]);
  const k = `${n.callFrame.functionName || "(anon)"} ${n.callFrame.url.split("/").pop()}:${n.callFrame.lineNumber + 1}`;
  self.set(k, (self.get(k) ?? 0) + (dt[i] ?? 0) / 1000);
}
// inclusive time per function name (walk parents)
const parent = new Map();
for (const n of profile.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
const incl = new Map();
for (let i = 0; i < profile.samples.length; i += 1) {
  const seen = new Set();
  let id = profile.samples[i];
  while (id != null) {
    const n = byId.get(id);
    const k = `${n.callFrame.functionName || "(anon)"}:${n.callFrame.lineNumber + 1}`;
    if (!seen.has(k)) { incl.set(k, (incl.get(k) ?? 0) + (dt[i] ?? 0) / 1000); seen.add(k); }
    id = parent.get(id);
  }
}
console.log("SELF");
for (const [k, v] of [...self].sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log(v.toFixed(1).padStart(8), k);
console.log("INCLUSIVE");
for (const [k, v] of [...incl].sort((a, b) => b[1] - a[1]).slice(0, 45)) console.log(v.toFixed(1).padStart(8), k);
await browser.close();
