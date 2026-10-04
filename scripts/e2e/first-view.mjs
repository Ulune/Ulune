// The first view (src/lib/first-view.ts, performance plan 1.13): a returning
// reader's zodiac and houses show before the app starts, the real wheel takes
// over without a pixel changing, and only the planets and lines fly in. The
// copy is kept, sealed, in a private space that stays unlocked on this device
// (the only place charts are kept), and read back by the inline script.
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import {
  DEV,
  FIXTURE_A,
  FIXTURE_B,
  SHOTS,
  castFixture,
  VIEWPORTS,
  ensureShotsDir,
  gotoApp,
  keepCharts,
  readSpaceRecord,
  removeActiveChart,
} from "./_lib.mjs";

const RECORD = "view/first";
const WHEEL = "[data-testid=studio-natal] svg.ulune-wheel:not(.ulune-wheel-ghost)";
// Everything the copy leaves out: the bodies and the lines.
const BODIES =
  'svg.ulune-wheel > :is([data-kind="planet"], [data-aspect], [data-kind="lead"], [data-kind="degree-dots"], [data-kind="aspect-marks"], [data-kind="aspect-top"])';

await ensureShotsDir();
const fail = [];

/** Nothing in focus, then wait for the resting wheel to be copied (into the space). */
async function waitForCopy(page, until = (copy) => Boolean(copy)) {
  await page.mouse.move(2, 400);
  const t0 = Date.now();
  while (Date.now() - t0 < 25000) {
    const copy = await readSpaceRecord(page, RECORD).catch(() => null);
    if (until(copy)) return copy;
    await page.waitForTimeout(250);
  }
  throw new Error("the resting wheel was not copied");
}

async function activeId(page) {
  return (await readSpaceRecord(page, "state/library"))?.activeId ?? null;
}

/** Load "/" with the app's scripts held: what the server and the inline scripts show. */
async function loadHeld(page) {
  let open;
  const gate = new Promise((r) => (open = r));
  let held = true;
  await page.route(
    () => held,
    async (route) => {
      if (route.request().resourceType() === "script") await gate;
      await route.fallback().catch(() => {});
    },
  );
  await page.goto(`${DEV}/`, { waitUntil: "commit" });
  await page.waitForSelector("ulune-first-view, [data-testid=studio-stage]", { state: "attached", timeout: 20000 });
  await page.waitForTimeout(600);
  return async () => {
    held = false;
    open();
  };
}

/** Pixels that differ by more than `tol` in any channel between two PNGs. */
async function pixelsApart(page, a, b, tol = 8) {
  return page.evaluate(
    async ([x, y, t]) => {
      const load = async (b64) => {
        const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
        const c = new OffscreenCanvas(bmp.width, bmp.height);
        const g = c.getContext("2d");
        g.drawImage(bmp, 0, 0);
        return g.getImageData(0, 0, bmp.width, bmp.height);
      };
      const [p, q] = [await load(x), await load(y)];
      if (p.width !== q.width || p.height !== q.height) return -1;
      let n = 0;
      for (let i = 0; i < p.data.length; i += 4) {
        const d = Math.max(
          Math.abs(p.data[i] - q.data[i]),
          Math.abs(p.data[i + 1] - q.data[i + 1]),
          Math.abs(p.data[i + 2] - q.data[i + 2]),
        );
        if (d > t) n++;
      }
      return n;
    },
    [a.toString("base64"), b.toString("base64"), tol],
  );
}

for (const width of [390, 1280]) {
  // One context, two pages: the same device's storage in two windows.
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const context = await browser.newContext({ viewport: VIEWPORTS[width] });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    // A failed hydration (the page re-rendered on the client) would be one of these.
    if (m.type() === "error" && /hydrat/i.test(m.text()) && !/attributes of the server rendered HTML/.test(m.text()))
      errors.push(m.text().slice(0, 200));
  });
  try {
    await gotoApp(page);
    await keepCharts(page);
    await castFixture(page, FIXTURE_A);
    const stored = await waitForCopy(page);
    if (/data-kind="planet"|data-aspect=/.test(stored.html)) throw new Error("the copy holds bodies or lines");

    // 1. Before the app starts: the zodiac and houses, where the wheel will be.
    const release = await loadHeld(page);
    const early = await page.evaluate(() => {
      const v = document.querySelector("ulune-first-view");
      const r = v?.getBoundingClientRect();
      return {
        shown: Boolean(v),
        flag: document.documentElement.hasAttribute("data-first-view"),
        houses: v ? v.querySelectorAll("[data-house]").length : 0,
        signs: v ? v.querySelectorAll('[data-kind="sign-band"]').length : 0,
        bodies: v ? v.querySelectorAll('[data-kind="planet"], [data-aspect]').length : 0,
        box: r ? [r.x, r.y, r.width] : null,
      };
    });
    if (!early.shown || !early.flag) throw new Error(`no first view before the app: ${JSON.stringify(early)}`);
    if (early.houses !== 12 || early.signs !== 12 || early.bodies) throw new Error(`first view content: ${JSON.stringify(early)}`);
    if (Math.abs(early.box[0] - stored.x) > 0.5 || Math.abs(early.box[1] - stored.y) > 0.5 || Math.abs(early.box[2] - stored.s) > 0.5)
      throw new Error(`first view box ${early.box} vs stored ${[stored.x, stored.y, stored.s]}`);
    const clip = { x: Math.floor(stored.x), y: Math.floor(stored.y), width: Math.ceil(stored.s) + 1, height: Math.ceil(stored.s) + 1 };
    const before = await page.screenshot({ clip });
    await page.screenshot({ path: join(SHOTS, `first-view-${width}-early.png`) });

    // 2. The app starts: the real wheel takes over, the copy goes, the frame
    //    skips its entrance while the planets fly in.
    await release();
    await page.waitForSelector(WHEEL, { timeout: 30000 });
    const atMount = await page.evaluate((sel) => {
      const svg = document.querySelector(sel);
      const band = svg.querySelector('[data-kind="sign-band"]');
      const planet = svg.querySelector('[data-kind="planet"]');
      const running = (el) => el.getAnimations().some((a) => a.playState === "running" && (a.currentTime ?? 0) < a.effect.getComputedTiming().endTime);
      return { flag: document.documentElement.hasAttribute("data-first-view"), band: running(band), planet: running(planet) };
    }, WHEEL);
    if (!atMount.flag || atMount.band || !atMount.planet)
      throw new Error(`hand-over entrance: ${JSON.stringify(atMount)} (want the frame still, planets flying in)`);
    await page.waitForFunction(() => !document.querySelector("ulune-first-view"), null, { timeout: 3000 });
    await page.waitForFunction(() => !document.documentElement.hasAttribute("data-first-view"), null, { timeout: 5000 });
    // What stands over the wheel once the app runs: its hint, legend and aside,
    // and the zoom cluster in the figure's corner (part 93).
    await page.addStyleTag({ content: `${BODIES}, .ulune-wheel-hint, .ulune-wheel-legend, .ulune-wheel-aside, .ob-zoom-corner { visibility: hidden !important; }` });
    await page.mouse.move(2, 400);
    await page.waitForTimeout(400);
    const after = await page.screenshot({ clip });
    // The ring's anti-aliased edges can come out a few levels apart (up to 47 of
    // 255, seen in about one run in three at 1280) when the copy or the live SVG
    // is painted on a layer of its own; since the glyphs' shadow filters (part
    // 86) the live wheel is, and an edge pixel at 390 lands 50 apart. A shift
    // or a missing piece is far more.
    const apart = await pixelsApart(page, before, after, 56);
    if (apart !== 0) {
      await writeFile(join(SHOTS, `first-view-${width}-before.png`), before);
      await writeFile(join(SHOTS, `first-view-${width}-after.png`), after);
      throw new Error(`the first view and the real wheel differ in ${apart} pixels`);
    }

    // 3. Switching charts keeps the full entrance.
    await page.reload({ waitUntil: "load" });
    await page.waitForSelector(WHEEL, { timeout: 30000 });
    await page.waitForFunction(() => !document.documentElement.hasAttribute("data-first-view"), null, { timeout: 8000 });
    await castFixture(page, FIXTURE_B);
    const blooming = await page.evaluate((sel) => {
      const bands = document.querySelector(sel)?.querySelectorAll('[data-kind="sign-band"]') ?? [];
      return Array.from(bands).some((b) => b.getAnimations().some((a) => a.animationName === "ulune-bloom"));
    }, WHEEL);
    if (!blooming) throw new Error("a new chart skipped the zodiac's entrance");
    const active = await activeId(page);
    await waitForCopy(page, (copy) => copy?.id === active);

    // 4. The same device in another window size: no first view.
    const other = await context.newPage();
    await other.setViewportSize({ width: width + 40, height: width === 390 ? 844 : 900 });
    const release2 = await loadHeld(other);
    const drawn = await other.evaluate(() => Boolean(document.querySelector("ulune-first-view")));
    await release2();
    await other.close();
    if (drawn) throw new Error("a first view drawn for another window size");

    // 5. The copy goes with its chart.
    const id = await activeId(page);
    await removeActiveChart(page);
    const t0 = Date.now();
    while ((await activeId(page)) === id && Date.now() - t0 < 8000) await page.waitForTimeout(200);
    await page.waitForTimeout(400);
    const kept = (await readSpaceRecord(page, RECORD))?.id === id;
    if (kept) throw new Error("the copy of a removed chart stayed on the device");

    if (errors.length) throw new Error(`page errors: ${errors.join(" | ")}`);
    console.log(`first-view-${width} OK`);
  } catch (err) {
    fail.push(`${width}: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    await browser.close();
  }
}

if (fail.length) {
  console.error("FIRST VIEW FAIL\n" + fail.map((f) => "- " + f).join("\n"));
  process.exit(1);
}
console.log("FIRST VIEW OK", SHOTS);
