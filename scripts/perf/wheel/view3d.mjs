// The 3D view in a real browser (the wheel harness; WebGL is this machine's
// software GL, so the frame rate is the rasterizer's, and the main thread's
// share is what the page itself costs): entering 3D (cold, then again), an
// orbit, a pointer sweep over the planets, a pin.
// node scripts/perf/wheel/view3d.mjs natal|transit classic|advanced|all [enter,reenter,orbit,sweep,pin,theme]
// DPR=1|2 (default 2). COUNT=1 counts GL calls and draws per frame (every
// WebGL method wrapped: its timings are not comparable, run it apart).
import { open, waitWheel, rawTrace, summarize, longTasks, frames } from "./lib.mjs";
const mode = process.argv[2] ?? "natal";
const preset = process.argv[3] ?? "classic";
const which = (process.argv[4] ?? "enter,reenter,orbit,sweep,pin").split(",");
const dpr = Number(process.env.DPR ?? 2);
const count = process.env.COUNT === "1";
const { browser, page, errors } = await open({ dpr });
if (count) {
  await page.addInitScript(() => {
    const c = { calls: 0, draws: 0, uploads: 0, by: {} };
    window.__glc = c;
    for (const P of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
      if (!P) continue;
      for (const name of Object.getOwnPropertyNames(P.prototype)) {
        const d = Object.getOwnPropertyDescriptor(P.prototype, name);
        if (!d || typeof d.value !== "function" || name === "constructor") continue;
        const fn = d.value;
        const draw = /^draw/.test(name);
        const upload = /^(texImage2D|texSubImage2D|bufferData|bufferSubData)$/.test(name);
        P.prototype[name] = function (...args) {
          c.calls += 1;
          c.by[name] = (c.by[name] ?? 0) + 1;
          if (draw) c.draws += 1;
          if (upload) c.uploads += 1;
          return fn.apply(this, args);
        };
      }
    }
  });
}
await page.goto(`http://perf.local/index.html?mode=${mode}&preset=${preset}`);
await waitWheel(page);
await page.mouse.move(2, 2);
await page.waitForTimeout(600);
const out = { mode, preset, dpr };
const slim = (r) => {
  const { raw, counts, ...rest } = r;
  rest.gcMs = +Object.entries(raw).filter(([k]) => /GC/.test(k)).reduce((s, [, v]) => s + v, 0).toFixed(1);
  rest.gcN = Object.entries(counts).filter(([k]) => /^(MinorGC|MajorGC)$/.test(k)).reduce((s, [, v]) => s + v, 0);
  rest.rafMs = +(raw.FireAnimationFrame ?? 0).toFixed(1);
  return rest;
};
const glSnap = () => (count ? page.evaluate(() => ({ ...window.__glc, by: { ...window.__glc.by } })) : null);
const glDiff = (a, b, framesN) => {
  if (!a || !b) return undefined;
  const by = {};
  for (const [k, v] of Object.entries(b.by)) {
    const d = v - (a.by[k] ?? 0);
    if (d) by[k] = d;
  }
  const top = Object.fromEntries(Object.entries(by).sort((x, y) => y[1] - x[1]).slice(0, 8));
  return { calls: b.calls - a.calls, draws: b.draws - a.draws, uploads: b.uploads - a.uploads, perFrame: framesN ? { calls: Math.round((b.calls - a.calls) / framesN), draws: Math.round((b.draws - a.draws) / framesN) } : undefined, top };
};
/** From the toggle to the canvas on stage (first frame drawn), and the entrance after it. */
async function enter(label) {
  const g0 = await glSnap();
  const fp = frames(page, 3000);
  let at = null;
  const events = await rawTrace(page, async () => {
    at = await page.evaluate(
      () =>
        new Promise((res) => {
          const t0 = performance.now();
          window.__h.d3(true);
          const svg = () => document.querySelector("svg.ulune-wheel[data-depth-base]");
          const poll = () => {
            if (svg()?.getAttribute("data-view3d") === "gl") {
              // The first frame with the canvas on stage.
              requestAnimationFrame(() => res({ glMs: +(performance.now() - t0).toFixed(1) }));
            } else if (performance.now() - t0 > 20000) res({ glMs: null });
            else requestAnimationFrame(poll);
          };
          requestAnimationFrame(poll);
        }),
    );
    await page.waitForTimeout(2800);
  });
  const f = await fp;
  const g1 = await glSnap();
  const sum = slim(summarize(events, 0));
  const scene = await page.evaluate(() => {
    const s = document.querySelector(".ulune-depth");
    const v = s?.__uluneView3d;
    const st = v?.debugState?.();
    return { buildMs: Number(s?.dataset.depthBuildMs ?? NaN), gl: s?.dataset.depthGl, sprites: st?.sprites.length, tubes: st?.tubes.length, canvas: st?.canvas };
  });
  out[label] = {
    ...at,
    ...scene,
    main: sum.mainBusyMs,
    longest: sum.longestTaskMs,
    styleMs: sum.styleMs,
    layoutMs: sum.layoutMs,
    rafMs: sum.rafMs,
    gcMs: sum.gcMs,
    fps: +(1000 / (f.reduce((s, d) => s + d, 0) / f.length)).toFixed(1),
    over20: f.filter((d) => d > 20).length,
    maxFrame: +Math.max(...f).toFixed(1),
    long: longTasks(events, 30).slice(0, 4).map((t) => `${t.ms}ms: ${t.top.slice(0, 4).join(" ")}`),
    gl: glDiff(g0, g1, f.length),
  };
}
if (which.includes("enter")) await enter("enter");
if (which.includes("reenter")) {
  await page.evaluate(() => window.__h.d3(false));
  await page.waitForTimeout(2500);
  await enter("reenter");
}
if (["orbit", "sweep", "pin", "theme"].some((w) => which.includes(w))) {
  // (A run that asked for none of the entries still starts in 3D.)
  const on = await page.evaluate(() => document.querySelector("svg.ulune-wheel[data-depth-base]")?.getAttribute("data-view3d") === "gl");
  if (!on) {
    await page.evaluate(() => window.__h.d3(true));
    await page.waitForFunction(() => document.querySelector("svg.ulune-wheel[data-depth-base]")?.getAttribute("data-view3d") === "gl", null, { timeout: 20000 });
    await page.waitForTimeout(2800);
  }
}
if (which.includes("orbit")) {
  // A drag-orbit, 2 s at 90°/s, as the pointer would drive it (dragCamera each frame).
  const g0 = await glSnap();
  let n = 0;
  const events = await rawTrace(page, async () => {
    n = await page.evaluate(
      () =>
        new Promise((res) => {
          const d = document.querySelector(".ulune-depth").__uluneDepth;
          const cam = d.getCamera() ?? { rx: 50, rz: 0 };
          const t0 = performance.now();
          let frames = 0;
          const step = (t) => {
            frames += 1;
            d.dragCamera(cam.rx, cam.rz + ((t - t0) / 1000) * 90);
            if (t - t0 < 2000) requestAnimationFrame(step);
            else res(frames);
          };
          requestAnimationFrame(step);
        }),
    );
    await page.waitForTimeout(300);
  });
  const g1 = await glSnap();
  const sum = slim(summarize(events, 0));
  out.orbit = { frames: n, fps: +(n / 2).toFixed(1), main: sum.mainBusyMs, rafMs: sum.rafMs, perFrameMs: +(sum.rafMs / Math.max(1, n)).toFixed(2), longest: sum.longestTaskMs, gcMs: sum.gcMs, gcN: sum.gcN, gl: glDiff(g0, g1, n) };
}
if (which.includes("sweep")) {
  const pts = await page.evaluate(() => {
    const v = document.querySelector(".ulune-depth").__uluneView3d;
    return v.debugState().sprites.filter((s) => s.id.startsWith("planet:")).map((s) => v.screenOf(s.id)).filter(Boolean);
  });
  await page.mouse.move(2, 2);
  await page.waitForTimeout(500);
  const fp = frames(page, 1600);
  const events = await rawTrace(page, async () => {
    for (const p of pts) {
      await page.mouse.move(p.x, p.y, { steps: 3 });
      await page.waitForTimeout(60);
    }
    await page.mouse.move(2, 2);
    await page.waitForTimeout(500);
  });
  const f = await fp;
  const sum = slim(summarize(events, 0));
  out.sweep = { planets: pts.length, main: sum.mainBusyMs, scriptMs: sum.scriptMs, styleMs: sum.styleMs, rafMs: sum.rafMs, longest: sum.longestTaskMs, gcMs: sum.gcMs, fps: +(1000 / (f.reduce((s, d) => s + d, 0) / f.length)).toFixed(1), over20: f.filter((d) => d > 20).length };
  await page.waitForTimeout(600);
}
if (which.includes("pin")) {
  const sun = await page.evaluate(() => document.querySelector(".ulune-depth").__uluneView3d.screenOf("planet:sun"));
  await page.mouse.move(sun.x, sun.y);
  await page.waitForTimeout(700);
  const fp = frames(page, 1400);
  const events = await rawTrace(page, async () => {
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForTimeout(1500);
  });
  const f = await fp;
  const sum = slim(summarize(events, 0));
  out.pin = { main: sum.mainBusyMs, scriptMs: sum.scriptMs, styleMs: sum.styleMs, rafMs: sum.rafMs, longest: sum.longestTaskMs, gcMs: sum.gcMs, fps: +(1000 / (f.reduce((s, d) => s + d, 0) / f.length)).toFixed(1), over20: f.filter((d) => d > 20).length, maxFrame: +Math.max(...f).toFixed(1) };
}
if (which.includes("theme")) {
  // A theme switch in 3D: how many times the pictures are drawn again, and the work.
  await page.evaluate(() => {
    const v = document.querySelector(".ulune-depth").__uluneView3d;
    window.__builds = 0;
    const done = v.hooks.rebuilt;
    v.hooks.rebuilt = () => {
      window.__builds += 1;
      done?.();
    };
  });
  const fp = frames(page, 1800);
  const events = await rawTrace(page, async () => {
    await page.evaluate(() => window.__h.setTheme("light"));
    await page.waitForTimeout(2200);
  });
  const f = await fp;
  const sum = slim(summarize(events, 0));
  out.theme = { builds: await page.evaluate(() => window.__builds), main: sum.mainBusyMs, scriptMs: sum.scriptMs, styleMs: sum.styleMs, rafMs: sum.rafMs, longest: sum.longestTaskMs, over20: f.filter((d) => d > 20).length, maxFrame: +Math.max(...f).toFixed(1) };
  await page.evaluate(() => window.__h.setTheme("dark"));
  await page.waitForTimeout(2200);
}
out.errors = errors.slice(0, 5);
console.log(JSON.stringify(out));
await browser.close();
