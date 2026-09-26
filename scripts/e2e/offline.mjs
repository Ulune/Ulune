// Keeping Ulune on this device (src/lib/offline.ts, public/sw.js, plan 1.14):
// asked once on a return visit, nothing registered until the visitor says
// yes, either answer final, and Settings can turn it on and off.
import { chromium } from "playwright";
import { DEV, FIXTURE_A, VIEWPORTS, castFixture, gotoApp, keepCharts } from "./_lib.mjs";

const fail = [];

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

for (const width of [390, 1280]) {
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
{
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

if (fail.length) {
  console.error("OFFLINE FAIL\n" + fail.map((f) => "- " + f).join("\n"));
  process.exit(1);
}
console.log("OFFLINE OK");
