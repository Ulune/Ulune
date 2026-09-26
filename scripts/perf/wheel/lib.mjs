// Shared by the wheel measurements: a Chromium serving the harness from
// scripts/perf/.out/wheel (build.mjs first), CDP traces, frame intervals.
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { extname, join } from "node:path";
import { ROOT, OUT, CHROME } from "../paths.mjs";
const { chromium } = createRequire(join(ROOT, "package.json"))("playwright");
// WHEEL_DIST serves another build (a copy of an earlier tree's, to compare in one session).
const DIST = process.env.WHEEL_DIST ?? join(OUT, "wheel");
const PUB = join(ROOT, "public");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json" };
export async function open({ w = 1280, h = 900, dpr = 2, overrides = "" } = {}) {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox", "--disable-gpu-vsync", "--enable-precise-memory-info"] });
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, reducedMotion: "no-preference" });
  await ctx.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname !== "perf.local") return route.fulfill({ status: 200, contentType: "text/css", body: "" });
    let p = url.pathname === "/" ? "/index.html" : url.pathname;
    let file = join(DIST, p);
    if (!existsSync(file)) file = join(PUB, p);
    // The app's own fonts are hashed from src/assets (the CSS names them ./assets/…).
    if (!existsSync(file)) file = join(ROOT, "src", p);
    if (!existsSync(file)) return route.fulfill({ status: 404, body: "" });
    let body = readFileSync(file);
    if (p === "/styles.css" && overrides) body = Buffer.concat([body, Buffer.from("\n" + overrides)]);
    return route.fulfill({ status: 200, contentType: TYPES[extname(file)] ?? "application/octet-stream", body });
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  return { browser, ctx, page, errors };
}
export async function waitWheel(page) {
  await page.waitForSelector("svg.ulune-wheel[data-depth-base]", { timeout: 30000 });
  await page.waitForTimeout(2600); // entrance done
}
export async function traced(page, fn, cats = ["devtools.timeline", "disabled-by-default-devtools.timeline", "blink", "cc", "v8.execute"]) {
  const cdp = await page.context().newCDPSession(page);
  const chunks = [];
  cdp.on("Tracing.dataCollected", (e) => chunks.push(...e.value));
  const done = new Promise((res) => cdp.once("Tracing.tracingComplete", res));
  await cdp.send("Tracing.start", { categories: cats.join(","), transferMode: "ReportEvents" });
  const t0 = Date.now();
  await fn();
  const wall = Date.now() - t0;
  await cdp.send("Tracing.end");
  await done;
  await cdp.detach();
  return summarize(chunks, wall);
}
export function summarize(events, wall) {
  // Find the renderer main thread.
  const threads = new Map();
  for (const e of events) if (e.ph === "M" && e.name === "thread_name") threads.set(`${e.pid}:${e.tid}`, e.args.name);
  const mainKeys = [...threads].filter(([, n]) => n === "CrRendererMain").map(([k]) => k);
  const rasterKeys = [...threads].filter(([, n]) => /Compositor|Raster|CompositorTileWorker/.test(n)).map(([k]) => k);
  const by = {};
  let runTask = 0;
  let longest = 0;
  const count = {};
  for (const e of events) {
    if (e.ph !== "X") continue;
    const key = `${e.pid}:${e.tid}`;
    const dur = (e.dur ?? 0) / 1000;
    if (mainKeys.includes(key)) {
      if (e.name === "RunTask" || e.name === "ThreadControllerImpl::RunTask") { runTask += dur; longest = Math.max(longest, dur); }
      by[e.name] = (by[e.name] ?? 0) + dur;
      count[e.name] = (count[e.name] ?? 0) + 1;
    } else if (rasterKeys.includes(key) && /Raster|Rasterize|RasterTask/.test(e.name)) {
      by["(raster)" + e.name] = (by["(raster)" + e.name] ?? 0) + dur;
      count["(raster)" + e.name] = (count["(raster)" + e.name] ?? 0) + 1;
    }
  }
  const pick = (n) => +(by[n] ?? 0).toFixed(1);
  return {
    wallMs: wall,
    mainBusyMs: +runTask.toFixed(1),
    longestTaskMs: +longest.toFixed(1),
    styleMs: pick("UpdateLayoutTree"), styleN: count["UpdateLayoutTree"] ?? 0,
    layoutMs: pick("Layout"), layoutN: count["Layout"] ?? 0,
    prePaintMs: pick("PrePaint"), paintMs: pick("Paint"), paintN: count["Paint"] ?? 0,
    layerizeMs: pick("Layerize"),
    scriptMs: +(pick("EventDispatch") + pick("TimerFire") + pick("FireAnimationFrame") + pick("FunctionCall")).toFixed(1),
    rasterMs: +Object.entries(by).filter(([k]) => k.startsWith("(raster)")).reduce((s, [, v]) => s + v, 0).toFixed(1),
    raw: by, counts: count,
  };
}
/** rAF frame intervals during `ms` (in page), started now. */
export async function frames(page, ms) {
  return page.evaluate((ms) => new Promise((res) => {
    const out = []; let last = performance.now(); const end = last + ms;
    const f = (t) => { out.push(t - last); last = t; if (t < end) requestAnimationFrame(f); else res(out); };
    requestAnimationFrame(f);
  }), ms);
}
export async function pointOf(page, sel) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, sel);
}
export async function rawTrace(page, fn, cats = ["devtools.timeline", "disabled-by-default-devtools.timeline", "blink", "v8.execute", "disabled-by-default-devtools.timeline.frame"]) {
  const cdp = await page.context().newCDPSession(page);
  const chunks = [];
  cdp.on("Tracing.dataCollected", (e) => chunks.push(...e.value));
  const done = new Promise((res) => cdp.once("Tracing.tracingComplete", res));
  await cdp.send("Tracing.start", { categories: cats.join(","), transferMode: "ReportEvents" });
  await fn();
  await cdp.send("Tracing.end");
  await done;
  await cdp.detach();
  return chunks;
}
/** Long main-thread tasks with what they spent their time on. */
export function longTasks(events, minMs = 6) {
  const threads = new Map();
  for (const e of events) if (e.ph === "M" && e.name === "thread_name") threads.set(`${e.pid}:${e.tid}`, e.args.name);
  const main = new Set([...threads].filter(([, n]) => n === "CrRendererMain").map(([k]) => k));
  const evs = events.filter((e) => e.ph === "X" && main.has(`${e.pid}:${e.tid}`)).sort((a, b) => a.ts - b.ts || b.dur - a.dur);
  const tasks = evs.filter((e) => e.name === "RunTask" || e.name === "ThreadControllerImpl::RunTask");
  const t0 = tasks.length ? tasks[0].ts : 0;
  const out = [];
  for (const t of tasks) {
    if (t.dur / 1000 < minMs) continue;
    const inner = evs.filter((e) => e !== t && e.ts >= t.ts && e.ts + (e.dur ?? 0) <= t.ts + t.dur);
    const by = {};
    for (const e of inner) {
      if (/^(RunTask|ThreadControllerImpl::RunTask)$/.test(e.name)) continue;
      let label = e.name;
      if (e.name === "EventDispatch") label += `:${e.args?.data?.type}`;
      if (e.name === "FunctionCall") label += `:${(e.args?.data?.functionName || "?")}`;
      if (e.name === "TimerFire") label += "";
      by[label] = (by[label] ?? 0) + e.dur / 1000;
    }
    const top = Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 9).map(([k, v]) => `${k}=${v.toFixed(1)}`);
    out.push({ at: +((t.ts - t0) / 1000).toFixed(0), ms: +(t.dur / 1000).toFixed(1), top });
  }
  return out;
}
