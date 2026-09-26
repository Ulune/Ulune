import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DEV,
  FIXTURE_A,
  ROOT,
  SHOTS,
  assertNoOverflow,
  castFixture,
  keepCharts,
  clickDockTab,
  ensureShotsDir,
  goStudioPage,
  gotoApp,
  launch,
} from "./_lib.mjs";

const MODES = ["natal", "transits", "timing", "synastry", "composite", "progressions", "numerology", "design"];

async function goMode(page, id) {
  await goStudioPage(page, id);
}

async function runNav(width) {
  const { browser, page } = await launch(width);
  try {
    await gotoApp(page);
    const nav = page.getByTestId("studio-nav");
    await nav.waitFor();

    if (width === 390) {
      for (const g of ["chart", "time", "pair", "systems"]) {
        await page.getByTestId(`mode-group-${g}`).waitFor({ state: "visible" });
      }
      const box = await nav.evaluate((el) => ({ sw: el.scrollWidth, cw: el.clientWidth }));
      if (box.sw > box.cw + 1) throw new Error(`nav overflow at 390: ${box.sw} > ${box.cw}`);

      for (const id of MODES) {
        await goMode(page, id);
        // Natal is the Chart group itself (no sub-mode switch).
        const tid = id === "natal" ? "mode-group-chart" : `studio-page-${id}`;
        await page.waitForFunction(
          (pid) => document.querySelector(`[data-testid="${pid}"]`)?.getAttribute("aria-selected") === "true",
          tid,
          { timeout: 8000 },
        );
      }

      const headerH = await page.getByTestId("top-left").evaluate((el) => el.getBoundingClientRect().height);
      if (headerH > 60) throw new Error(`top bar height ${headerH} > 60`);
      const navBottom = await page.getByTestId("studio-nav").evaluate((el) => el.getBoundingClientRect().bottom);
      if (Math.abs(navBottom - 844) > 1) throw new Error(`group bar not at the bottom on phone (${navBottom})`);
      await page.getByTestId("chart-chip").click();
      await page.getByTestId("new-chart").waitFor({ state: "visible" });
    }

    await assertNoOverflow(page);
    await page.screenshot({ path: join(SHOTS, `w2-shell-${width}.png`), timeout: 8000, animations: "disabled" }).catch((err) => {
      console.warn(`shot ${width}: ${err.message}`);
    });
    console.log(`w2-nav-${width} OK`);
  } finally {
    await browser.close();
  }
}

async function runTableAlias() {
  const { browser, page } = await launch(1280);
  try {
    await gotoApp(page, "/?studio=table");
    // No chart yet: the toggle is hidden, the stage still records the view.
    await page.locator("[data-view]").first().waitFor({ state: "attached" });
    const tableOn = (await page.locator("[data-view]").first().getAttribute("data-view")) === "table" ? "true" : "false";
    const natalOn = await page.getByTestId("mode-group-chart").getAttribute("aria-selected");
    if (tableOn !== "true") throw new Error(`?studio=table did not press view-table (aria-pressed=${tableOn})`);
    if (natalOn !== "true") throw new Error(`?studio=table did not select natal (aria-selected=${natalOn})`);

    await page.goto(`${DEV}/?studio=transits&view=table`, { waitUntil: "load", timeout: 45000 });
    await page.waitForSelector("html.theme-ready");
    await page.locator("[data-view]").first().waitFor({ state: "attached" });
    const tOn = (await page.locator("[data-view]").first().getAttribute("data-view")) === "table" ? "true" : "false";
    const trOn = await page.getByTestId("studio-page-transits").getAttribute("aria-selected");
    if (tOn !== "true") throw new Error(`?view=table on transits not pressed`);
    if (trOn !== "true") throw new Error(`transits not selected`);
    console.log("w2-table-alias OK");
  } finally {
    await browser.close();
  }
}

async function runThrow() {
  const { browser, page } = await launch(1280);
  try {
    await gotoApp(page, "/?__throw=stage");
    await page.getByTestId("error-slot").waitFor({ timeout: 10000 });
    await page.getByTestId("error-slot-retry").waitFor();
    await page.getByTestId("studio-nav").click();
    await goStudioPage(page, "natal");
    await page.getByTestId("error-slot-retry").click();
    await page.getByTestId("error-slot").waitFor({ state: "hidden", timeout: 8000 }).catch(async () => {
      const n = await page.getByTestId("error-slot").count();
      if (n) throw new Error("retry did not clear error-slot");
    });
    console.log("w2-throw OK");
  } finally {
    await browser.close();
  }
}

async function runRoundTrip() {
  const { browser, page } = await launch(1280);
  try {
    await gotoApp(page);
    for (const id of ["natal", "transits", "synastry", "design", "numerology"]) {
      await goMode(page, id);
      if (await page.getByTestId("error-slot").count()) throw new Error(`error-slot on ${id}`);
      if (await page.locator("[data-testid=app-error], [data-testid=router-error]").count()) {
        throw new Error(`router error on ${id}`);
      }
    }
    console.log("w2-roundtrip OK");
  } finally {
    await browser.close();
  }
}

/**
 * Modes, tables, tabs, 3D, the calendar and export load on demand (Phase 1 of
 * the performance plan). Every file under src/studio and src/routes that
 * imports on demand must go through the retry helpers (lazyNamed,
 * importWithRetry): a chunk that fails once, or went away in a deploy, is
 * fetched again instead of breaking the studio.
 */
function assertLazyImportsRetry() {
  const out = execSync("grep -rln 'import(\"' src/studio src/routes || true", { cwd: ROOT, encoding: "utf8" });
  const files = out.split("\n").filter(Boolean);
  const bare = files.filter((f) => {
    const text = readFileSync(join(ROOT, f), "utf8");
    return !/lazyNamed\(|importWithRetry\(/.test(text);
  });
  if (bare.length) throw new Error(`on-demand imports without the retry helpers:\n${bare.join("\n")}`);
  console.log("w2-lazy-imports-retry OK");
}

async function wheelSide(page) {
  return page.getByTestId("wheel-zoom").evaluate((el) => {
    const r = el.getBoundingClientRect();
    return Math.min(r.width, r.height);
  });
}

async function runNatalLayout(width) {
  const { browser, page } = await launch(width);
  try {
    await gotoApp(page);
    if (width === 390) {
      // Empty studio: the birth form is the stage.
      await page.locator("[data-on-stage] #native-name").waitFor();
      const top = await page.locator("#native-name").evaluate((el) => el.getBoundingClientRect().top);
      if (top > 300) throw new Error(`caster top ${top} > 300`);
    }
    // The chart comes back when an address is opened below: a private space that stays unlocked here.
    await keepCharts(page);
    await castFixture(page, FIXTURE_A);
    await page.getByTestId("studio-natal").waitFor({ timeout: 45000 });

    if (width === 1280) {
      const metrics = await page.evaluate(() => {
        const natal = document.querySelector("[data-testid=studio-natal]");
        const dock = document.querySelector("[data-testid=dock]");
        const wheel = document.querySelector("[data-testid=wheel-zoom]");
        return {
          scroll: document.documentElement.scrollHeight,
          inner: window.innerHeight,
          natal: natal?.getBoundingClientRect().toJSON() ?? null,
          dock: dock?.getBoundingClientRect().toJSON() ?? null,
          wheel: wheel?.getBoundingClientRect().toJSON() ?? null,
        };
      });
      if (metrics.scroll > metrics.inner + 80) {
        throw new Error(`scrollHeight ${metrics.scroll} > innerHeight ${metrics.inner}+80`);
      }
      const side = Math.min(metrics.wheel?.width ?? 0, metrics.wheel?.height ?? 0);
      if (side < 560) throw new Error(`wheel side ${side} < 560`);
      if ((metrics.dock?.left ?? 0) < (metrics.wheel?.right ?? 0) - 1) {
        throw new Error(`dock not beside wheel (dock.left=${metrics.dock?.left} wheel.right=${metrics.wheel?.right})`);
      }
    }

    if (width === 390) {
      const gap = await page.evaluate(() => {
        const top = document.querySelector("[data-testid=top-left]");
        const wheel = document.querySelector(".ulune-wheel-zoom-inner");
        return (wheel?.getBoundingClientRect().top ?? 0) - (top?.getBoundingClientRect().bottom ?? 0);
      });
      if (gap > 200) throw new Error(`wheel ${gap}px below top bar`);
      // Nothing may sit under the sheet: the stage ends where the sheet begins.
      const clash = await page.evaluate(() => {
        const stage = document.querySelector(".ob-stage")?.getBoundingClientRect();
        const sheet = document.querySelector("[data-testid=dock]")?.getBoundingClientRect();
        return stage && sheet ? stage.bottom - sheet.top : 0;
      });
      if (clash > 1) throw new Error(`stage runs ${clash}px under the sheet`);
      const selected = await page.locator("[data-testid^=dock-tab-][aria-selected=true]").count();
      if (selected !== 1) throw new Error(`expected 1 dock tab selected, got ${selected}`);
      await page.locator("[data-body=sun]").first().click({ force: true });
      await page.waitForTimeout(260);
      const clashOpen = await page.evaluate(() => {
        const stage = document.querySelector(".ob-stage")?.getBoundingClientRect();
        const sheet = document.querySelector("[data-testid=dock]")?.getBoundingClientRect();
        return stage && sheet ? stage.bottom - sheet.top : 0;
      });
      if (clashOpen > 1) throw new Error(`open sheet covers the stage by ${clashOpen}px`);
      const readingOn = await page.getByTestId("dock-tab-reading").getAttribute("aria-selected");
      if (readingOn !== "true") throw new Error("wheel tap did not select reading tab");
      await page.getByTestId("click-note").waitFor({ timeout: 8000 });
      await clickDockTab(page, "look");
      const lookOn = await page.getByTestId("dock-tab-look").getAttribute("aria-selected");
      const readOn = await page.getByTestId("dock-tab-reading").getAttribute("aria-selected");
      if (lookOn !== "true" || readOn === "true") throw new Error("look tab did not close reading");
    }

    if (width === 768 || width === 1280) {
      const a = await wheelSide(page);
      if (a < 400) throw new Error(`natal wheel ${a} < 400 at 400ms`);
      await page.waitForTimeout(400);
      const b = await wheelSide(page);
      if (b < 400) throw new Error(`natal wheel ${b} < 400 at 400ms`);
      await page.waitForTimeout(1400);
      const c = await wheelSide(page);
      if (Math.abs(c - b) > 8) throw new Error(`natal wheel collapsed ${b} → ${c}`);
      await goMode(page, "transits");
      await page.getByTestId("studio-transits").waitFor({ timeout: 20000 });
      await page.waitForTimeout(400);
      const t1 = await wheelSide(page);
      if (t1 < 400) throw new Error(`transit wheel ${t1} < 400`);
      await page.waitForTimeout(1400);
      const t2 = await wheelSide(page);
      if (Math.abs(t2 - t1) > 8) throw new Error(`transit wheel collapsed ${t1} → ${t2}`);
    }

    await goMode(page, "natal");
    await page.goto(`${DEV}/?studio=natal&view=table`, { waitUntil: "load", timeout: 45000 });
    await page.waitForSelector("html.theme-ready", { timeout: 20000 });
    await page.locator("section[data-testid=studio-table]").waitFor({ timeout: 8000 });
    const tableWide = await page.locator("section[data-testid=studio-table]").evaluate((el) => el.getBoundingClientRect().width);
    if (tableWide < width * 0.7) throw new Error(`table width ${tableWide} not full`);
    await page.getByTestId("view-wheel").click({ force: true });
    try {
      await page.getByTestId("wheel-zoom").waitFor({ timeout: 5000 });
    } catch {
      await page.goto(`${DEV}/`, { waitUntil: "load", timeout: 45000 });
      await page.waitForSelector("html.theme-ready", { timeout: 20000 });
      await page.getByTestId("wheel-zoom").waitFor({ timeout: 8000 });
    }
    console.log(`w3-layout-${width} OK`);
  } finally {
    await browser.close();
  }
}

await ensureShotsDir();
const fail = [];

try {
  assertLazyImportsRetry();
} catch (err) {
  fail.push(String(err instanceof Error ? err.message : err));
}

for (const width of [390, 768, 1280]) {
  try {
    await runNav(width);
  } catch (err) {
    fail.push(`nav ${width}: ${err instanceof Error ? err.message : err}`);
  }
}
for (const fn of [runTableAlias, runThrow, runRoundTrip]) {
  try {
    await fn();
  } catch (err) {
    fail.push(`${fn.name}: ${err instanceof Error ? err.message : err}`);
  }
}
for (const width of [390, 768, 1280]) {
  try {
    await runNatalLayout(width);
  } catch (err) {
    fail.push(`layout ${width}: ${err instanceof Error ? err.message : err}`);
  }
}

if (fail.length) {
  console.error("W2 SHELL FAIL\n" + fail.map((f) => "- " + f).join("\n"));
  process.exit(1);
}
console.log("W2 SHELL OK", SHOTS);
