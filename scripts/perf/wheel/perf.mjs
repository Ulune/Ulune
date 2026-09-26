// One run of each interaction on the wheel, traced: hover, sweep, pin, unpin, theme, zoom.
// node scripts/perf/wheel/perf.mjs natal|transit classic|advanced|all [hover,sweep,pin,unpin,theme,zoom]
import { open, waitWheel, traced, frames, pointOf } from "./lib.mjs";
const mode = process.argv[2] ?? "natal";
const preset = process.argv[3] ?? "classic";
const which = (process.argv[4] ?? "hover,sweep,pin,unpin,theme,zoom").split(",");
const overrides = process.env.OVERRIDES ?? "";
const extra = process.env.EXTRA ?? "";
const { browser, page, errors } = await open({ overrides });
await page.goto(`http://perf.local/index.html?mode=${mode}&preset=${preset}${extra}`);
await waitWheel(page);
const sun = await pointOf(page, '[data-kind="planet"][data-hl="planet:sun"] > .ulune-wheel-halo');
const planets = await page.evaluate(() => [...document.querySelectorAll('svg[data-depth-base] [data-kind="planet"] > .ulune-wheel-halo')].map((el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }));
const out = { mode, preset };
const slim = (r) => { const { raw: _raw, counts: _counts, ...rest } = r; return rest; };
if (which.includes("hover")) {
  await page.mouse.move(3, 3);
  await page.waitForTimeout(700);
  out.hover = slim(await traced(page, async () => { await page.mouse.move(sun.x, sun.y); await page.waitForTimeout(900); }));
  out.hoverRelief = await page.evaluate(() => document.querySelector("[data-testid=wheel-depth]")?.dataset.reliefMs);
  await page.mouse.move(3, 3);
  await page.waitForTimeout(700);
}
if (which.includes("sweep")) {
  await page.mouse.move(3, 3);
  await page.waitForTimeout(600);
  const fp = frames(page, 1400);
  out.sweep = slim(await traced(page, async () => {
    for (const p of planets) { await page.mouse.move(p.x, p.y, { steps: 3 }); await page.waitForTimeout(60); }
    await page.mouse.move(3, 3); await page.waitForTimeout(500);
  }));
  const f = await fp; out.sweep.frames = f.length; out.sweep.over20 = f.filter((d) => d > 20).length; out.sweep.maxFrame = +Math.max(...f).toFixed(1);
  await page.waitForTimeout(600);
}
if (which.includes("pin")) {
  await page.mouse.move(sun.x, sun.y);
  await page.waitForTimeout(700);
  const fp = frames(page, 1000);
  out.pin = slim(await traced(page, async () => { await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(1100); }));
  const f = await fp; out.pin.over20 = f.filter((d) => d > 20).length; out.pin.maxFrame = +Math.max(...f).toFixed(1);
  out.pinRelief = await page.evaluate(() => document.querySelector("[data-testid=wheel-depth]")?.dataset.reliefMs);
  out.reliefNodes = await page.evaluate(() => document.querySelectorAll(".ulune-relief *").length);
  out.reliefTops = await page.evaluate(() => document.querySelectorAll(".ulune-relief-top").length);
  out.reliefSvgs = await page.evaluate(() => document.querySelectorAll(".ulune-relief svg").length);
}
if (which.includes("unpin")) {
  const fp = frames(page, 1000);
  out.unpin = slim(await traced(page, async () => { await page.keyboard.press("Escape"); await page.evaluate(() => (window).__h.setSel(null)); await page.waitForTimeout(1100); }));
  const f = await fp; out.unpin.over20 = f.filter((d) => d > 20).length; out.unpin.maxFrame = +Math.max(...f).toFixed(1);
  await page.mouse.move(3, 3); await page.waitForTimeout(600);
}
if (which.includes("theme")) {
  const fp = frames(page, 900);
  out.theme = slim(await traced(page, async () => { await page.evaluate(() => (window).__h.setTheme("light")); await page.waitForTimeout(900); }));
  const f = await fp; out.theme.over20 = f.filter((d) => d > 20).length; out.theme.maxFrame = +Math.max(...f).toFixed(1);
  await page.evaluate(() => (window).__h.setTheme("dark")); await page.waitForTimeout(800);
}
if (which.includes("zoom")) {
  await page.mouse.move(sun.x, sun.y); await page.waitForTimeout(500);
  await page.mouse.move(3, 3); await page.waitForTimeout(500);
  const c = await pointOf(page, "svg[data-depth-base]");
  await page.mouse.move(c.x + 5, c.y + 5); await page.waitForTimeout(700);
  await page.keyboard.down("Control");
  const fp = frames(page, 800);
  out.zoom = slim(await traced(page, async () => { for (let i = 0; i < 20; i += 1) { await page.mouse.wheel(0, -8); await page.waitForTimeout(16); } await page.waitForTimeout(400); }));
  await page.keyboard.up("Control");
  const f = await fp; out.zoom.over20 = f.filter((d) => d > 20).length; out.zoom.maxFrame = +Math.max(...f).toFixed(1);
}
out.errors = errors.slice(0, 5);
console.log(JSON.stringify(out));
await browser.close();
