// The 3D view's own framebuffer, hashed after a forced draw, in several
// states: the GL output compared between two trees exactly (the page's
// screenshots of a hovered 3D stage vary from run to run; this does not).
// node scripts/perf/wheel/fb3d.mjs natal|transit classic|advanced|all  (WHEEL_DIST picks the build,
// EXTRA adds to the query string, e.g. "&tex=pot&gldpr=3", DPR sets the device pixel ratio)
// SAVE=dir also writes each state's framebuffer as a PNG (flipped upright).
import { mkdirSync, writeFileSync } from "node:fs";
import { open, waitWheel } from "./lib.mjs";
const [mode = "natal", preset = "classic"] = process.argv.slice(2);
const save = process.env.SAVE;
if (save) mkdirSync(save, { recursive: true });
const { browser, page, errors } = await open({ dpr: Number(process.env.DPR ?? 2) });
await page.goto(`http://perf.local/index.html?mode=${mode}&preset=${preset}${process.env.EXTRA ?? ""}`);
await waitWheel(page);
await page.mouse.move(2, 2);
await page.evaluate(() => window.__h.d3(true));
await page.waitForFunction(() => document.querySelector("svg.ulune-wheel[data-depth-base]")?.getAttribute("data-view3d") === "gl", null, { timeout: 20000 });
await page.waitForTimeout(3500);
/** Until the depth loop has stopped (every spring at rest): on this machine's
 * software GL a busy chart draws a few frames a second, and a fixed wait can
 * catch a camera move before it ends. */
const rested = () =>
  page.waitForFunction(
    () => {
      const d = document.querySelector(".ulune-depth")?.__uluneDepth;
      const quiet = d && !d.raf;
      window.__quiet = quiet ? (window.__quiet ?? 0) + 1 : 0;
      return window.__quiet >= 3;
    },
    null,
    { polling: 150, timeout: 30000 },
  );
const fb = async (name) => {
  await rested();
  const got = await page.evaluate((png) => {
    const v = document.querySelector(".ulune-depth").__uluneView3d;
    const gl = v.gl;
    v.render();
    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;
    const px = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    // (The page is not a secure context: no crypto.subtle. Two 32-bit FNV-style hashes.)
    const words = new Uint32Array(px.buffer);
    let h1 = 0x811c9dc5;
    let h2 = 0x01000193;
    for (let i = 0; i < words.length; i += 1) {
      h1 = Math.imul(h1 ^ words[i], 16777619);
      h2 = Math.imul(h2 + words[i], 2246822519) ^ (h2 >>> 13);
    }
    const hash = (h1 >>> 0).toString(16).padStart(8, "0") + (h2 >>> 0).toString(16).padStart(8, "0");
    let url = null;
    if (png) {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      const img = ctx.createImageData(w, h);
      for (let y = 0; y < h; y += 1) img.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
      ctx.putImageData(img, 0, 0);
      url = c.toDataURL("image/png");
    }
    return { hash: `${hash} ${w}x${h}`, url };
  }, Boolean(save));
  if (save && got.url) writeFileSync(`${save}/${name}.png`, Buffer.from(got.url.split(",")[1], "base64"));
  return got.hash;
};
const out = { mode, preset };
const view = () => page.evaluate(() => document.querySelector(".ulune-depth").__uluneView3d);
await view();
out.rest = await fb("1-rest");
const sun = await page.evaluate(() => document.querySelector(".ulune-depth").__uluneView3d.screenOf("planet:sun"));
await page.mouse.move(sun.x, sun.y);
await page.waitForTimeout(3000);
out.hover = await fb("2-hover");
await page.mouse.down();
await page.mouse.up();
await page.waitForTimeout(3500);
out.pin = await fb("3-pin");
await page.mouse.move(2, 2);
await page.waitForTimeout(2500);
out.pinAway = await fb("4-pin-away");
await page.evaluate(() => window.__h.setSel(null));
await page.waitForTimeout(3500);
out.unpin = await fb("5-unpin");
await page.evaluate(() => {
  const d = document.querySelector(".ulune-depth").__uluneDepth;
  const c = d.getCamera();
  d.dragCamera(c.rx + 12, c.rz + 35);
});
await page.waitForTimeout(1500);
out.turned = await fb("6-turned");
await page.evaluate(() => window.__h.setTheme("light"));
await page.waitForTimeout(3500);
out.light = await fb("7-light");
await page.evaluate(() => window.__h.setSel("planet:moon"));
await page.waitForTimeout(3500);
out.lightPin = await fb("8-light-pin");
// Out of 3D and back in (a context and pictures that may be kept), then the
// transits a month on (a rebuild: some cells of the atlas change, some stay),
// then another preset (other aspects and bodies).
await page.evaluate(() => window.__h.d3(false));
await page.waitForFunction(() => !document.querySelector("svg.ulune-wheel[data-depth-base]")?.hasAttribute("data-view3d"), null, { timeout: 30000 });
await page.waitForTimeout(500);
await page.evaluate(() => window.__h.d3(true));
await page.waitForFunction(() => document.querySelector("svg.ulune-wheel[data-depth-base]")?.getAttribute("data-view3d") === "gl", null, { timeout: 20000 });
await page.waitForTimeout(3500);
out.reenter = await fb("10-reenter");
console.error("reuse on re-entry", await page.evaluate(() => document.querySelector(".ulune-depth")?.dataset.depthReuse ?? null));
await page.evaluate(() => window.__h.jump());
await page.waitForTimeout(3500);
out.jumped = await fb("11-jumped");
await page.evaluate((p) => window.__h.view.applyPreset(p === "classic" ? "advanced" : "classic"), preset);
await page.waitForTimeout(3500);
out.preset = await fb("12-preset");
// (What the last build kept, on stderr: it is not part of the picture.)
console.error("reuse", await page.evaluate(() => document.querySelector(".ulune-depth")?.dataset.depthReuse ?? null));
// The entry's middle frames (the view part way in: dashes long, tubes rising).
for (const t of [0.15, 0.45, 0.8]) {
  await page.evaluate((t) => {
    const v = document.querySelector(".ulune-depth").__uluneView3d;
    Object.assign(v.t, { x: t, target: t, v: 0, holdUntil: 0 });
  }, t);
  out[`entry${t}`] = await fb(`9-entry-${t}`);
}
if (errors.length) out.errors = errors.slice(0, 3);
console.log(JSON.stringify(out));
await browser.close();
