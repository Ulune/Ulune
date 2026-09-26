// Sweep and pin costs of the wheel, medians of N runs, with variants that
// switch one thing off to show what it costs.
// node scripts/perf/wheel/ab.mjs natal|transit classic|advanced [variant,…] [runs]
import { open, waitWheel, traced, frames } from "./lib.mjs";

const QUIET = `(() => {
  const stop = (e) => { const t = e.target; if (t && t.closest && t.closest('.ulune-wheel, .ulune-relief')) e.stopImmediatePropagation(); };
  for (const type of ['transitionrun','transitionstart','transitionend','transitioncancel','animationstart','animationend','animationiteration','animationcancel']) window.addEventListener(type, stop, { capture: true });
})();`;
const VARIANTS = {
  base: {},
  notrans: { css: ".ulune-wheel, .ulune-wheel * { transition: none !important; }" },
  notips: { css: ".ulune-wheel [data-aspect-tip] { display: none !important; }" },
  nolift: { extra: "&lift=0" },
  // The per-node focus fades the composited ones replaced (wheel-fade.ts).
  nodefades: { extra: "&fades=node" },
  // Which fades cost what: the aspects' tapered ends; all the aspects' extra
  // parts (ends, casings, lit copies, marks, chevrons); the lines too; and
  // everything but the aspects.
  tipsnap: { css: ".ulune-wheel [data-aspect-tip] { transition: none !important; }" },
  partsnap: {
    css: ".ulune-wheel [data-aspect-tip], .ulune-wheel .ulune-aspect-case, .ulune-wheel .ulune-aspect-top, .ulune-wheel .ulune-aspect-mark, .ulune-wheel .ulune-aspect-mark-pop, .ulune-wheel .ulune-aspect-dir { transition: none !important; }",
  },
  aspsnap: {
    css: ".ulune-wheel [data-aspect-tip], .ulune-wheel [data-aspect-line], .ulune-wheel .ulune-aspect-case, .ulune-wheel .ulune-aspect-top, .ulune-wheel .ulune-aspect-mark, .ulune-wheel .ulune-aspect-mark-pop, .ulune-wheel .ulune-aspect-dir { transition: none !important; }",
  },
  restsnap: {
    css: ".ulune-wheel *:not([data-aspect-tip], [data-aspect-line], .ulune-aspect-case, .ulune-aspect-top, .ulune-aspect-mark, .ulune-aspect-mark-pop, .ulune-aspect-dir) { transition: none !important; }",
  },
  quiet: { init: QUIET },
  // The aspect web drawn elsewhere (a canvas, 2.10): what the SVG would save.
  noweb: { css: ".ulune-wheel g[data-aspect][data-hl], .ulune-wheel [data-kind='aspect-top'], .ulune-wheel [data-kind='aspect-marks'] { display: none !important; }" },
  lean: {
    css: ".ulune-wheel [data-aspect-tip], .ulune-wheel [data-kind='aspect-top'] { display: none !important; } .ulune-wheel, .ulune-wheel * { transition: none !important; }",
    extra: "&lift=0",
  },
};
const mode = process.argv[2] ?? "natal";
const preset = process.argv[3] ?? "classic";
const names = (process.argv[4] ?? "base").split(",");
const reps = Number(process.argv[5] ?? 3);
const med = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};
for (const name of names) {
  const v = VARIANTS[name];
  if (!v) throw new Error(`unknown variant ${name}`);
  const rows = [];
  for (let i = 0; i < reps; i += 1) {
    const { browser, page } = await open({ overrides: v.css ?? "" });
    if (v.init) await page.addInitScript(v.init);
    await page.goto(`http://perf.local/index.html?mode=${mode}&preset=${preset}${v.extra ?? ""}`);
    await waitWheel(page);
    const planets = await page.evaluate(() =>
      [...document.querySelectorAll('svg[data-depth-base] [data-kind="planet"] > .ulune-wheel-halo')].map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }),
    );
    const sun = planets[0];
    await page.mouse.move(3, 3);
    await page.waitForTimeout(600);
    const fp = frames(page, 2400);
    const s = await traced(page, async () => {
      for (const p of planets.slice(0, 10)) {
        await page.mouse.move(p.x, p.y, { steps: 3 });
        await page.waitForTimeout(140);
      }
      await page.mouse.move(3, 3);
      await page.waitForTimeout(300);
    });
    const f = await fp;
    await page.mouse.move(sun.x, sun.y);
    await page.waitForTimeout(800);
    const fp2 = frames(page, 900);
    const p = await traced(page, async () => {
      await page.mouse.down();
      await page.mouse.up();
      await page.waitForTimeout(900);
    });
    const f2 = await fp2;
    const u = await traced(page, async () => {
      await page.evaluate(() => window.__h.setSel(null));
      await page.waitForTimeout(900);
    });
    rows.push({
      sweepBusy: s.mainBusyMs,
      sweepStyle: s.styleMs,
      sweepScript: s.scriptMs,
      sweepFps: +(f.length / (f.reduce((a, b) => a + b, 0) / 1000)).toFixed(1),
      sweepOver20: f.filter((d) => d > 20).length,
      sweepMaxFrame: Math.max(...f),
      pinBusy: p.mainBusyMs,
      pinLongest: p.longestTaskMs,
      pinMaxFrame: Math.max(...f2),
      unpinBusy: u.mainBusyMs,
    });
    await browser.close();
  }
  const m = Object.fromEntries(Object.keys(rows[0]).map((k) => [k, +med(rows.map((r) => r[k])).toFixed(1)]));
  console.log(JSON.stringify({ mode, preset, variant: name, runs: reps, ...m }));
}
