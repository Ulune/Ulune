/**
 * The aspect grid beside the wheel: wherever it is drawn it is clear of the wheel's disc, the zoom
 * bar, the legend and the stage's edges; its cells are one size; and when the zoomed wheel would
 * cover its place it steps aside (and comes back with Fit). Checked across screen sizes.
 */
import { chromium } from "playwright";
import { DEV, FIXTURE_A, castFixture, gotoApp } from "./_lib.mjs";

const SIZES = [
  [1280, 720],
  [1366, 768],
  [1440, 800],
  [1536, 864],
  [1920, 1080],
  [1920, 900],
  [2560, 1300],
  [1024, 768],
  [820, 1180],
  [390, 844],
];

const measure = (page) =>
  page.evaluate(() => {
    const R = (el) => {
      const r = el.getBoundingClientRect();
      return { l: r.left, t: r.top, r: r.right, b: r.bottom };
    };
    const grid = document.querySelector("[data-testid=wheel-aspect-grid]");
    const outer = document.querySelector("[data-testid=wheel-zoom]");
    const inner = document.querySelector(".ulune-wheel-zoom-inner");
    if (!grid || !outer || !inner) return { grid: false };
    const w = R(inner);
    const c = { x: (w.l + w.r) / 2, y: (w.t + w.b) / 2, r: (w.r - w.l) / 2 };
    const cells = [...grid.querySelectorAll(".ob-wgrid-cell:not([data-empty])")].map(R);
    const sizes = new Set([...grid.querySelectorAll(".ob-wgrid-cell")].map((e) => `${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`));
    const hits = (a, b) => a.l < b.r - 0.5 && b.l < a.r - 0.5 && a.t < b.b - 0.5 && b.t < a.b - 0.5;
    const others = ["[data-testid=wheel-zoom-bar]", ".ulune-wheel-legend", ".ulune-wheel-hint"].flatMap((s) => [...document.querySelectorAll(s)].map((e) => [s, R(e)]));
    const out = [];
    const o = R(outer);
    for (const k of cells) {
      const dx = Math.max(k.l - c.x, 0, c.x - k.r);
      const dy = Math.max(k.t - c.y, 0, c.y - k.b);
      if (Math.hypot(dx, dy) < c.r - 0.5) out.push("on the wheel");
      if (k.l < o.l - 0.5 || k.r > o.r + 0.5 || k.t < o.t - 0.5 || k.b > o.b + 0.5) out.push("outside the stage");
      for (const [s, r] of others) if (r.r > r.l && hits(k, r)) out.push(`on ${s}`);
    }
    return { grid: true, problems: [...new Set(out)], sizes: [...sizes], n: cells.length };
  });

const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const bad = [];
try {
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 800 } })).newPage();
  page.setDefaultTimeout(30000);
  await gotoApp(page);
  await page.waitForSelector("#birth-date", { timeout: 20000 });
  await castFixture(page, FIXTURE_A);
  await page.waitForTimeout(2000);
  let shown = 0;
  for (const [w, h] of SIZES) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(1200);
    const m = await measure(page);
    if (!m.grid) {
      console.log(`${w}x${h}: no grid (no room)`);
      continue;
    }
    shown++;
    // The cells of one grid are one size.
    if (m.sizes.length !== 1) bad.push(`${w}x${h}: cell sizes ${m.sizes.join(", ")}`);
    if (m.problems.length) bad.push(`${w}x${h}: ${m.problems.join("; ")}`);
    console.log(`${w}x${h}: grid ${m.sizes[0]}, ${m.n} aspects, clear`);
  }
  if (shown < 4) bad.push(`the grid is drawn at only ${shown} of ${SIZES.length} sizes`);

  // Zoomed in, the wheel covers the grid's place: it steps aside; Fit brings it back.
  await page.setViewportSize({ width: 1440, height: 800 });
  await page.waitForTimeout(1000);
  const away = () => page.evaluate(() => document.querySelector("[data-testid=wheel-aside]")?.hasAttribute("data-away"));
  if (await away()) bad.push("1440x800: the grid is away at Fit");
  await page.getByTestId("wheel-zoom-in").click();
  await page.getByTestId("wheel-zoom-in").click();
  await page.waitForTimeout(700);
  if (!(await away())) bad.push("zoomed in: the grid still covers the wheel");
  const pe = await page.evaluate(() => getComputedStyle(document.querySelector("[data-testid=wheel-aspect-grid]")).pointerEvents);
  if (pe !== "none") bad.push(`zoomed in: the grid hidden but still takes the pointer (${pe})`);
  await page.getByTestId("wheel-zoom-fit").click();
  await page.waitForTimeout(700);
  if (await away()) bad.push("after Fit: the grid did not come back");
} finally {
  await browser.close();
}
if (bad.length) {
  console.log("ASPECT GRID FAIL");
  for (const b of bad) console.log("-", b);
  process.exit(1);
}
console.log("ASPECT GRID OK", DEV);
