// Pictures of the 3D view at rest, for comparing two trees pixel by pixel:
// entered, a hover, a pin, let go, turned, light theme, back to flat.
// node scripts/perf/wheel/shots3d.mjs outdir natal|transit classic|advanced|all
// (WHEEL_DIST picks the build; DPR=1|2.) Run one at a time: on a busy machine
// the software GL's frames stretch past the springs' 1/4 s step and a picture
// can be taken before its motion has settled.
import { mkdirSync } from "node:fs";
import { open, waitWheel } from "./lib.mjs";
const [out, mode = "natal", preset = "classic"] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const dpr = Number(process.env.DPR ?? 2);
const { browser, page, errors } = await open({ dpr });
await page.goto(`http://perf.local/index.html?mode=${mode}&preset=${preset}`);
await waitWheel(page);
await page.mouse.move(2, 2);
const stage = async () =>
  page.evaluate(() => {
    const r = document.querySelector(".ulune-depth").getBoundingClientRect();
    return { x: Math.floor(r.left), y: Math.floor(r.top), width: Math.ceil(r.width), height: Math.ceil(r.height) };
  });
const shot = async (name) => page.screenshot({ path: `${out}/${name}.png`, clip: await stage() });
const settle = (ms) => page.waitForTimeout(ms);
await page.evaluate(() => window.__h.d3(true));
await page.waitForFunction(() => document.querySelector("svg.ulune-wheel[data-depth-base]")?.getAttribute("data-view3d") === "gl", null, { timeout: 20000 });
await settle(3200);
await shot("1-rest");
const at = (id) => page.evaluate((id) => document.querySelector(".ulune-depth").__uluneView3d.screenOf(id), id);
const sun = await at("planet:sun");
await page.mouse.move(sun.x, sun.y);
await settle(3000);
await shot("2-hover");
await page.mouse.down();
await page.mouse.up();
await settle(3500);
await shot("3-pin");
await page.mouse.move(2, 2);
await settle(2500);
await shot("4-pin-away");
await page.evaluate(() => window.__h.setSel(null));
await settle(3500);
await shot("5-unpin");
await page.evaluate(() => {
  const d = document.querySelector(".ulune-depth").__uluneDepth;
  const c = d.getCamera();
  d.dragCamera(c.rx + 12, c.rz + 35);
});
await settle(1500);
await shot("6-turned");
await page.evaluate(() => window.__h.setTheme("light"));
await settle(3000);
await shot("7-light");
await page.evaluate(() => window.__h.d3(false));
await settle(2600);
await shot("8-flat");
if (errors.length) console.log("errors", JSON.stringify(errors.slice(0, 3)));
console.log(JSON.stringify({ out, mode, preset }));
await browser.close();
