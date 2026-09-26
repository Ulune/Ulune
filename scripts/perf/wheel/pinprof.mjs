// What a pin costs, task by task: hover the Sun, then pin it, tracing the main thread for 900 ms.
// node scripts/perf/wheel/pinprof.mjs natal|transit classic|advanced
// The first task listed is mostly the JS profiler starting.
import { open, waitWheel } from "./lib.mjs";
const mode = process.argv[2] ?? "transit";
const preset = process.argv[3] ?? "classic";
const { browser, page } = await open({ overrides: process.env.OVERRIDES ?? "" });
await page.goto(`http://perf.local/index.html?mode=${mode}&preset=${preset}${process.env.EXTRA ?? ""}`);
await waitWheel(page);
const sun = await page.evaluate(() => {
  const el = document.querySelector('svg[data-depth-base] [data-kind="planet"] > .ulune-wheel-halo');
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});
await page.mouse.move(3, 3);
await page.waitForTimeout(600);
await page.mouse.move(sun.x, sun.y);
await page.waitForTimeout(800);
const cdp = await page.context().newCDPSession(page);
const ev = [];
cdp.on("Tracing.dataCollected", (e) => ev.push(...e.value));
const done = new Promise((r) => cdp.once("Tracing.tracingComplete", r));
await cdp.send("Profiler.enable");
await cdp.send("Profiler.setSamplingInterval", { interval: 100 });
await cdp.send("Tracing.start", { categories: "devtools.timeline,disabled-by-default-devtools.timeline,blink,v8.execute", transferMode: "ReportEvents" });
await cdp.send("Profiler.start");
await page.mouse.down();
await page.mouse.up();
await page.waitForTimeout(900);
const { profile } = await cdp.send("Profiler.stop");
await cdp.send("Tracing.end");
await done;
const threads = new Map();
for (const e of ev) if (e.ph === "M" && e.name === "thread_name") threads.set(`${e.pid}:${e.tid}`, e.args.name);
const main = [...threads].filter(([, n]) => n === "CrRendererMain").map(([k]) => k);
const mine = ev.filter((e) => e.ph === "X" && main.includes(`${e.pid}:${e.tid}`));
const tasks = mine.filter((e) => e.name === "RunTask" || e.name === "ThreadControllerImpl::RunTask").sort((a, b) => a.ts - b.ts);
const t0 = tasks.length ? tasks[0].ts : 0;
let busy = 0;
for (const t of tasks) {
  const d = t.dur / 1000;
  busy += d;
  if (d < 4) continue;
  const inside = mine.filter((e) => e.ts >= t.ts && e.ts + (e.dur ?? 0) <= t.ts + t.dur && e !== t);
  const sum = {};
  for (const e of inside) {
    if (!["UpdateLayoutTree", "Layout", "Paint", "PrePaint", "Layerize", "FunctionCall", "TimerFire", "FireAnimationFrame", "EventDispatch", "HitTest", "ParseHTML", "V8.GCScavenger", "MajorGC", "MinorGC", "ScheduleStyleRecalculation", "UpdateLayer", "Commit", "RunMicrotasks", "v8.callFunction"].includes(e.name)) continue;
    sum[e.name] = (sum[e.name] ?? 0) + (e.dur ?? 0) / 1000;
  }
  const parts = Object.entries(sum).filter(([, v]) => v >= 0.5).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v.toFixed(1)}`).join(", ");
  console.log(`@${((t.ts - t0) / 1000).toFixed(0)}ms task ${d.toFixed(1)}ms: ${parts}`);
}
console.log("busy", busy.toFixed(1));
const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const parent = new Map();
for (const n of profile.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
const incl = new Map();
const self = new Map();
for (let i = 0; i < profile.samples.length; i += 1) {
  const dt = (profile.timeDeltas[i] ?? 0) / 1000;
  const n0 = byId.get(profile.samples[i]);
  const k0 = `${n0.callFrame.functionName || "(anon)"}:${n0.callFrame.lineNumber + 1}`;
  self.set(k0, (self.get(k0) ?? 0) + dt);
  const seen = new Set();
  let id = profile.samples[i];
  while (id != null) {
    const n = byId.get(id);
    const k = `${n.callFrame.functionName || "(anon)"}:${n.callFrame.lineNumber + 1}`;
    if (!seen.has(k)) { incl.set(k, (incl.get(k) ?? 0) + dt); seen.add(k); }
    id = parent.get(id);
  }
}
console.log("INCLUSIVE");
for (const [k, v] of [...incl].sort((a, b) => b[1] - a[1]).filter(([k]) => !/^\((root|program|idle|garbage collector)\)/.test(k)).slice(0, 30)) console.log(v.toFixed(1).padStart(8), k);
console.log("SELF");
for (const [k, v] of [...self].sort((a, b) => b[1] - a[1]).filter(([k]) => !/^\((root|program|idle)\)/.test(k)).slice(0, 15)) console.log(v.toFixed(1).padStart(8), k);
await browser.close();
