// The wheel's entrance: a fresh wheel is mounted in a page that is already
// up (the harness's remount), and its 2.4 s entrance is traced: frames,
// main-thread work by kind, and how many animations run at once.
// node scripts/perf/wheel/entrance.mjs natal|transit classic|advanced [runs]
// OVERRIDES="css" appends CSS to the app's styles (what-if runs).
import { open, waitWheel, traced, frames } from "./lib.mjs";

const mode = process.argv[2] ?? "natal";
const preset = process.argv[3] ?? "classic";
const reps = Number(process.argv[4] ?? 3);
const WINDOW = 2400;

const med = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

const rows = [];
for (let i = 0; i < reps; i += 1) {
  const { browser, page } = await open({ overrides: process.env.OVERRIDES ?? "" });
  await page.goto(`http://perf.local/index.html?mode=${mode}&preset=${preset}`);
  await waitWheel(page);
  await page.mouse.move(3, 3);
  await page.waitForTimeout(1500);
  const fp = frames(page, WINDOW);
  const t = await traced(page, async () => {
    await page.evaluate(() => {
      const w = window;
      w.__anims = null;
      w.__h.remount();
      // How many animations run at once, a moment into the entrance.
      setTimeout(() => {
        w.__anims = document.querySelector("svg.ulune-wheel[data-depth-base]")?.getAnimations({ subtree: true }).length ?? -1;
      }, 900);
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
    raster: t.rasterMs,
    animations: anims ?? -1,
  });
  await browser.close();
}
const m = Object.fromEntries(Object.keys(rows[0]).map((k) => [k, +med(rows.map((r) => r[k])).toFixed(1)]));
console.log(JSON.stringify({ mode, preset, runs: rows.length, ...m }));
