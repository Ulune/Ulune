// A time jump on a transit wheel: the transits a month on (the harness's
// second sky), the outer bodies gliding round to their new places while the
// cross aspects wait and fade in. Traced for 1.6 s: frames, main-thread work
// by kind, animations running a moment in. Medians of N.
// node scripts/perf/wheel/glide.mjs classic|advanced [runs]
// OVERRIDES="css" appends CSS to the app's styles (what-if runs).
import { open, waitWheel, traced, frames } from "./lib.mjs";

const preset = process.argv[2] ?? "classic";
const reps = Number(process.argv[3] ?? 3);
const WINDOW = 1600;

const med = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

const rows = [];
for (let i = 0; i < reps; i += 1) {
  const { browser, page } = await open({ overrides: process.env.OVERRIDES ?? "" });
  // What-if switches for experiments (window flags read by the app code).
  if (process.env.FLAGS) await page.addInitScript((f) => { for (const k of f.split(",")) window[k] = true; }, process.env.FLAGS);
  await page.goto(`http://perf.local/index.html?mode=transit&preset=${preset}`);
  await waitWheel(page);
  await page.mouse.move(3, 3);
  // The fade copy is made at idle; the glide runs over it as in the app.
  await page.waitForTimeout(1500);
  const fp = frames(page, WINDOW);
  const t = await traced(page, async () => {
    await page.evaluate(() => {
      const w = window;
      w.__anims = null;
      w.__h.jump();
      setTimeout(() => {
        w.__anims = document.querySelector("svg.ulune-wheel[data-depth-base]")?.getAnimations({ subtree: true }).length ?? -1;
      }, 400);
    });
    await page.waitForTimeout(WINDOW);
  });
  const f = await fp;
  const anims = await page.evaluate(() => window.__anims);
  rows.push({
    frames: f.length,
    fps: +(f.length / (f.reduce((a, b) => a + b, 0) / 1000)).toFixed(1),
    over20: f.filter((d) => d > 20).length,
    worst: Math.max(...f),
    busy: t.mainBusyMs,
    longest: t.longestTaskMs,
    style: t.styleMs,
    layout: t.layoutMs,
    prePaint: t.prePaintMs,
    paint: t.paintMs,
    layerize: t.layerizeMs,
    script: t.scriptMs,
    animations: anims ?? -1,
  });
  await browser.close();
}
const m = Object.fromEntries(Object.keys(rows[0]).map((k) => [k, +med(rows.map((r) => r[k])).toFixed(1)]));
console.log(JSON.stringify({ preset, runs: rows.length, ...m }));
