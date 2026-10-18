// Keeping Ulune on this device (src/lib/offline.ts, public/sw.js, plan 1.14):
// asked once on a return visit, nothing registered until the visitor says
// yes, either answer final, and Settings can turn it on and off.
//
// The Chinese pages kept (languages plan, part 30). The worker keeps a page's
// code once it has been fetched (/assets/*), which only the production build
// has: the development server's modules are never kept. So this part runs on
// the build (`npm run build`), on a server of its own
// (scripts/perf/load/serve.mjs), stopped for real when the connection goes
// (the browser's offline switch does not reach the worker's own requests),
// with the browser offline too. A reader whose charts are kept turns on
// "Keep Ulune on this device" in Settings and opens BaZi and Feng Shui's Home
// once, a home kept there; without a connection both reload whole (the four
// pillars drawn; the home's dial, the facing kept back on it), and a Chinese
// page never opened says what any part not yet downloaded says ("This part
// didn't load.", with "Try again"), inside the app, rather than breaking; once
// the connection is back, it opens when loaded again. Without a build this
// part is skipped, and says so; `--built` runs it alone (after `npm run build`).
// A chart calculated offline (on-device plan, step 5), in the same part: the
// reader's first chart was calculated on the device before Ulune was kept, so
// the engine and its files are in the worker's own cache, and keeping Ulune
// keeps the code that starts it; without a connection, the chart's time
// changed in the Birth tab is calculated again on the device, nothing asked
// of the server.
import { spawn } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { CALCULATE, DEV, FIXTURE_A, ROOT, SHOTS, VIEWPORTS, castFixture, clickDockTab, ensureShotsDir, goStudioPage, gotoApp, keepCharts, readSpaceRecord } from "./_lib.mjs";

const fail = [];
const BUILT_ONLY = process.argv.includes("--built");

async function freshStudio(width) {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const context = await browser.newContext({ viewport: VIEWPORTS[width] });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  await gotoApp(page);
  // A reader whose charts are kept (a private space that stays unlocked here):
  // the offer is for them.
  await keepCharts(page);
  await castFixture(page, FIXTURE_A);
  // The wheel's first-run hint is behind this reader.
  await page.evaluate(() => localStorage.setItem("ulune.hint.wheel.v1", "1"));
  return { browser, page };
}

const workers = (page) =>
  page.evaluate(async () => ({
    registered: (await navigator.serviceWorker.getRegistrations()).length,
    choice: localStorage.getItem("ulune.offline.v1"),
    caches: (await caches.keys()).filter((k) => k.startsWith("ulune-")).length,
  }));

for (const width of BUILT_ONLY ? [] : [390, 1280]) {
  const { browser, page } = await freshStudio(width);
  try {
    // First visit: never asked.
    await page.waitForTimeout(7000);
    if (await page.getByTestId("offline-offer").count()) throw new Error("asked on the first visit");

    // Return visit: asked once; "No thanks" keeps it off for good.
    await page.reload({ waitUntil: "load" });
    await page.getByTestId("offline-offer").waitFor({ timeout: 12000 });
    const none = await workers(page);
    if (none.registered || none.choice) throw new Error(`something kept before asking: ${JSON.stringify(none)}`);
    await page.getByTestId("offline-no").click();
    await page.getByTestId("offline-offer").waitFor({ state: "detached", timeout: 4000 });
    await page.reload({ waitUntil: "load" });
    await page.waitForTimeout(7500);
    if (await page.getByTestId("offline-offer").count()) throw new Error("asked again after No thanks");
    const off = await workers(page);
    if (off.registered || off.choice !== "off") throw new Error(`after No thanks: ${JSON.stringify(off)}`);

    // Settings turns it on and off.
    await page.goto(`${DEV}/settings`, { waitUntil: "load" });
    const box = page.getByTestId("data-offline");
    await box.waitFor({ timeout: 15000 });
    await box.check();
    await page.waitForFunction(async () => (await navigator.serviceWorker.getRegistrations()).length > 0, null, { timeout: 8000 });
    await box.uncheck();
    await page.waitForFunction(async () => (await navigator.serviceWorker.getRegistrations()).length === 0, null, { timeout: 8000 });
    const gone = await workers(page);
    if (gone.caches || gone.choice !== "off") throw new Error(`after turning it off: ${JSON.stringify(gone)}`);
    console.log(`offline-${width} no/settings OK`);
  } catch (err) {
    fail.push(`${width}: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    await browser.close();
  }
}

// "Keep it": the worker is registered and runs the page from the next load.
if (!BUILT_ONLY) {
  const { browser, page } = await freshStudio(1280);
  try {
    await page.reload({ waitUntil: "load" });
    await page.getByTestId("offline-offer").waitFor({ timeout: 12000 });
    await page.getByTestId("offline-yes").click();
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload({ waitUntil: "load" });
    const controlled = await page.evaluate(() => Boolean(navigator.serviceWorker.controller));
    if (!controlled) throw new Error("Keep it: the page is not run by the worker after a reload");
    await page.waitForSelector("[data-testid=studio-natal] svg.ulune-wheel", { timeout: 20000 });
    console.log("offline-keep OK");
  } catch (err) {
    fail.push(`keep: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    await browser.close();
  }
}

/* ---------------------------------------- the Chinese pages kept (languages plan, part 30) */

const PORT = 9318;
const BASE = `http://127.0.0.1:${PORT}`;
const BUILD = join(ROOT, ".vercel/output/functions/__server.func/index.mjs");
let server = null;

/**
 * The production server, started and warmed: its health check casts a chart, so the engine (the
 * Swiss Ephemeris, geo-tz's map) is loaded before the page's first cast waits on it (the part's
 * review: a first cast on a server just started once took longer than the suite waits).
 */
async function serverUp() {
  server = spawn(process.execPath, ["scripts/perf/load/serve.mjs", String(PORT)], { cwd: ROOT, stdio: "ignore" });
  for (let i = 0; i < 120; i += 1) {
    const ok = await fetch(`${BASE}/api/health`).then((r) => r.ok).catch(() => false);
    if (ok) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("the production server did not start (or its health check failed)");
}

async function serverDown() {
  if (!server) return;
  const gone = new Promise((r) => server.once("exit", r));
  server.kill("SIGTERM");
  await gone;
  server = null;
}

// A run cut short leaves no server behind.
process.on("exit", () => server?.kill("SIGKILL"));
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server?.kill("SIGKILL");
    process.exit(1);
  });
}

/** What the worker keeps: the studio's pages, and how many of the app's files. */
const kept = (page) =>
  page.evaluate(async () => ({
    pages: (await (await caches.open("ulune-pages-v1")).keys()).map((r) => new URL(r.url).pathname),
    files: (await (await caches.open("ulune-files-v1")).keys()).length,
  }));

/** The chart open, as the private space keeps it (its time and its moment). */
async function keptChart(page) {
  const id = (await readSpaceRecord(page, "state/library"))?.activeId;
  const row = id ? await readSpaceRecord(page, `chart/${id}`) : null;
  return row?.chart?.meta ?? null;
}

/** Offline: Fixture A's time changed in the Birth tab, the chart calculated again on the device. */
async function castOffline(page) {
  await page.goto(`${BASE}/astrology`, { waitUntil: "load", timeout: 45000 });
  await page.getByTestId("studio-natal").waitFor({ timeout: 30000 });
  const before = await keptChart(page);
  if (before?.time !== "12:00") throw new Error(`offline, the chart kept: ${JSON.stringify(before)?.slice(0, 120)}`);
  await clickDockTab(page, "birth");
  await page.locator("#birth-time").fill("13:00");
  await page.getByTestId("cast-submit").click();
  const until = Date.now() + 30000;
  let after = before;
  while (Date.now() < until && after?.time !== "13:00") {
    await page.waitForTimeout(300);
    after = await keptChart(page);
  }
  if (await page.getByTestId("engine-ask").count()) throw new Error("offline, the device asked to use the server");
  if (after?.time !== "13:00" || Date.parse(after.utc) - Date.parse(before.utc) !== 3_600_000) {
    const said = await page.getByRole("alert").allInnerTexts().catch(() => []);
    throw new Error(`offline, the chart was not calculated again: ${after?.time} ${after?.utc} (the page said: ${said.join(" | ")})`);
  }
  await page.screenshot({ path: join(SHOTS, "offline-cast-1280.png") }).catch(() => {});
  console.log(`offline: Fixture A calculated again at 13:00 on the device (${before.utc} → ${after.utc}), nothing asked of the server`);
}

async function chineseOffline() {
  await ensureShotsDir();
  await serverUp();
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const context = await browser.newContext({ viewport: VIEWPORTS[1280] });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  try {
    // A reader whose charts are kept (a space that stays unlocked here), Fixture A cast.
    await page.goto(`${BASE}/`, { waitUntil: "load", timeout: 45000 });
    await page.waitForSelector("html.theme-ready", { timeout: 20000 });
    await keepCharts(page);
    await castFixture(page, FIXTURE_A);
    // Ulune kept on this device, as Settings turns it on.
    await page.goto(`${BASE}/settings`, { waitUntil: "load" });
    await page.getByTestId("data-offline").check({ timeout: 20000 });
    // Once active, the worker takes this page over (clients.claim): the next page is then its own from the first request.
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, { timeout: 30000 });
    // The studio, run by the worker from here: BaZi, then Feng Shui's Home, a home kept there.
    await page.goto(`${BASE}/`, { waitUntil: "load" });
    const viaWorker = await page.evaluate(() => Boolean(navigator.serviceWorker.controller) && performance.getEntriesByType("navigation")[0]?.workerStart > 0);
    if (!viaWorker) throw new Error("the studio's page did not come through the worker");
    await page.getByTestId("studio-natal").waitFor({ timeout: 30000 });
    await goStudioPage(page, "bazi");
    await page.getByTestId("bazi-board").waitFor({ timeout: 20000 });
    await goStudioPage(page, "fengshui-home");
    await page.getByTestId("fengshui-home").waitFor({ timeout: 20000 });
    await page.getByTestId("fengshui-home-facing").fill("180");
    await page.getByTestId("fengshui-home-year").fill("1998");
    await page.getByTestId("fengshui-keep-save").click();
    await page.getByTestId("fengshui-keep-name").waitFor({ timeout: 8000 });
    await page.waitForTimeout(900);
    if ((await readSpaceRecord(page, "fs/homes"))?.homes?.[0]?.typed !== "180") throw new Error("the home was not kept");
    // The worker puts what it fetched away a moment later.
    await page.waitForTimeout(1500);
    const before = await kept(page);
    if (!before.pages.includes("/") || before.files < 20) throw new Error(`kept before going offline: ${JSON.stringify(before)}`);

    // No connection: the server stopped, the browser offline.
    await serverDown();
    await context.setOffline(true);
    await page.reload({ waitUntil: "load", timeout: 45000 });
    await page.getByTestId("fengshui-home").waitFor({ timeout: 30000 });
    const home = () =>
      page.evaluate(() => ({
        palaces: document.querySelectorAll("[data-testid=fengshui-stars-grid-main] [data-palace]").length,
        mountains: document.querySelectorAll("[data-testid=fengshui-home-dial] [data-mountain]").length,
        facing: document.querySelector("[data-testid=fengshui-home-facing]")?.value ?? null,
        space: document.querySelector("[data-testid=space-button]")?.getAttribute("data-space") ?? null,
      }));
    // The kept home back from the space, its Flying Stars on the stage; then its luopan, facing it.
    await page.waitForFunction(() => document.querySelectorAll("[data-testid=fengshui-stars-grid-main] [data-palace]").length === 9 && document.querySelector("[data-testid=fengshui-home-facing]")?.value === "180", null, { timeout: 15000 }).catch(async () => {
      throw new Error(`offline, Feng Shui's Home came back without its figure or its kept facing: ${JSON.stringify(await home())}`);
    });
    await page.getByTestId("fengshui-home-fig-luopan").click();
    await page.waitForFunction(() => document.querySelectorAll("[data-testid=fengshui-home-dial] [data-mountain]").length === 24, null, { timeout: 8000 }).catch(async () => {
      throw new Error(`offline, the home's luopan: ${JSON.stringify(await home())}`);
    });
    const axis = await page.getByTestId("fengshui-home-axis").getAttribute("data-facing");
    if (axis !== "180.0") throw new Error(`offline, the home's luopan faces ${axis}`);
    await page.screenshot({ path: join(SHOTS, "offline-fengshui-home-1280.png") }).catch(() => {});
    console.log("offline: Feng Shui's Home reloaded whole, the kept home back");
    await page.goto(`${BASE}/bazi`, { waitUntil: "load", timeout: 45000 });
    await page.getByTestId("bazi-board").waitFor({ timeout: 30000 });
    const pillars = await page.locator("[data-testid=bazi-board] > [data-place]").count();
    if (pillars !== 4) throw new Error(`offline, BaZi drew ${pillars} pillars`);
    console.log("offline: BaZi reloaded whole, four pillars");
    if (CALCULATE === "device") await castOffline(page);
    const broken = errors.length;

    // A Chinese page never opened: what any part not yet downloaded says, inside the app.
    await page.goto(`${BASE}/chinese-astrology`, { waitUntil: "load", timeout: 45000 });
    await page.getByTestId("mode-load-failed").waitFor({ timeout: 30000 });
    const said = (await page.getByTestId("mode-load-failed").innerText()).replace(/\s+/g, " ");
    if (!said.includes("This part didn’t load.") || !said.includes("Try again")) throw new Error(`offline, a page never opened says "${said}"`);
    if (await page.getByTestId("app-error").count()) throw new Error("offline, a page never opened broke the app");
    if (!(await page.getByTestId("lang-button").count())) throw new Error("offline, a page never opened lost the app around it");
    console.log(`offline: a page never opened says "${said}"`);
    await page.screenshot({ path: join(SHOTS, "offline-unvisited-1280.png") }).catch(() => {});

    // The connection back: the page opens once loaded again (Chromium keeps a failed download for the
    // page's life, so "Try again" alone can't fetch it; the message then offers the reload).
    await serverUp();
    await context.setOffline(false);
    await page.reload({ waitUntil: "load", timeout: 45000 });
    await page.getByTestId("zodiac-wheel").waitFor({ timeout: 30000 });
    if (broken) throw new Error(`errors on the pages kept: ${errors.slice(0, broken).join(" | ")}`);
    console.log("offline-chinese OK");
  } catch (err) {
    // What the page showed when it failed, for the person reading the report.
    await page.screenshot({ path: join(SHOTS, "offline-chinese-failed.png") }).catch(() => {});
    throw err;
  } finally {
    await browser.close();
    await serverDown();
  }
}

if (existsSync(BUILD)) {
  console.log(`the Chinese pages offline, on the production build of ${statSync(BUILD).mtime.toISOString()}`);
  try {
    await chineseOffline();
  } catch (err) {
    fail.push(`chinese: ${err instanceof Error ? err.message : String(err)}`);
  }
} else if (BUILT_ONLY) {
  fail.push("chinese: no production build (npm run build first)");
} else {
  console.log("the Chinese pages offline: SKIPPED, no production build (npm run build, then node scripts/e2e/offline.mjs --built)");
}

if (fail.length) {
  console.error("OFFLINE FAIL\n" + fail.map((f) => "- " + f).join("\n"));
  process.exit(1);
}
console.log("OFFLINE OK");
