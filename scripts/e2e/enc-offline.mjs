/**
 * The encyclopedia kept on this device (encyclopedia plan, part 21), on the
 * production build (`npm run build`, then `node scripts/perf/load/serve.mjs
 * 9311`: the list of its files is made by the build): with Ulune kept on this
 * device, Settings keeps the English encyclopedia; without a connection, a
 * page never opened opens whole, another follows by its links, the search
 * answers; the French one, not kept, does not pretend to be; turned off,
 * nothing of it stays. A page read is kept too, with Ulune kept on the device.
 */
import { spawn } from "node:child_process";
import { chromium } from "playwright";

// Its own server, stopped for real when the connection is "lost" (the
// browser's offline switch does not reach a service worker's requests).
const PORT = 9317;
const BASE = `http://127.0.0.1:${PORT}`;
let server = null;
async function serverUp() {
  server = spawn(process.execPath, ["scripts/perf/load/serve.mjs", String(PORT)], { stdio: "ignore" });
  for (let i = 0; i < 60; i += 1) {
    const ok = await fetch(`${BASE}/robots.txt`).then((r) => r.ok).catch(() => false);
    if (ok) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("the production server did not start (npm run build first)");
}
async function serverDown() {
  if (!server) return;
  const gone = new Promise((r) => server.once("exit", r));
  server.kill("SIGTERM");
  await gone;
  server = null;
}
await serverUp();
const fail = (why) => {
  throw new Error(why);
};

const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
page.setDefaultTimeout(20000);
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
const reports = [];
page.on("request", (r) => {
  if (new URL(r.url()).pathname === "/api/report") reports.push(r.postData() ?? "");
});
const kept = () =>
  page.evaluate(async () => {
    const out = {};
    for (const k of await caches.keys()) if (k.startsWith("ulune-enc")) out[k] = (await (await caches.open(k)).keys()).length;
    return out;
  });

try {
  // 1. Ulune kept on this device, then the English encyclopedia.
  await page.goto(`${BASE}/settings`, { waitUntil: "load" });
  await page.getByTestId("data-offline").check({ timeout: 20000 });
  await page.waitForFunction(async () => Boolean((await navigator.serviceWorker.getRegistration())?.active), null, { timeout: 15000 });
  const options = page.getByTestId("data-enc-offline");
  await options.waitFor();
  await page
    .waitForFunction(() => /In English \(about \d+(\.\d)? MB\)/.test(document.querySelector("[data-testid=data-enc-offline]")?.textContent ?? ""), null, { timeout: 10000 })
    .catch(async () => fail(`the sizes: ${await options.innerText()}`));
  await page.getByTestId("data-enc-en").check();
  await page.waitForFunction(() => /The encyclopedia is kept on this device\./.test(document.querySelector("[data-testid=data-enc-status]")?.textContent ?? ""), null, { timeout: 90000 });
  const k = await kept();
  if (!(k["ulune-enc-en-v1"] > 900) || !(k["ulune-enc-shared-v1"] > 20) || k["ulune-enc-fr-v1"]) fail(`kept: ${JSON.stringify(k)}`);
  console.log(`kept OK ${JSON.stringify(k)}`);

  // 2. A page read, with the worker running the page.
  await page.goto(`${BASE}/encyclopedia/eclipse`, { waitUntil: "load" });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, { timeout: 10000 });
  await page.reload({ waitUntil: "load" });
  await page.locator("main h1").waitFor();

  // 3. No connection: a page never opened opens whole, its links lead on, the search answers.
  await serverDown();
  await page.goto(`${BASE}/encyclopedia/moon-in-scorpio`, { waitUntil: "load" });
  await page.waitForFunction(() => document.querySelector("main h1")?.textContent === "Moon in Scorpio", null, { timeout: 15000 });
  if (!/Scorpio/.test(await page.locator("[data-section=meaning]").innerText())) fail("offline: the page's text");
  await page.locator("[data-section=correspondences] a[href='/encyclopedia/scorpio']").first().click();
  await page.waitForFunction(() => document.querySelector("main h1")?.textContent === "Scorpio", null, { timeout: 15000 });
  if ((await page.getByTestId("enc-figure").count()) !== 1) fail("offline: the figure");
  await page.goto(`${BASE}/encyclopedia/eclipse`, { waitUntil: "load" });
  await page.waitForFunction(() => document.querySelector("main h1")?.textContent === "Eclipse", null, { timeout: 15000 });
  await page.getByTestId("enc-crumbs").locator("a").first().click();
  await page.getByTestId("enc-search-input").pressSequentially("gate 34", { delay: 20 });
  await page.locator('[data-testid=enc-results] [data-entry="hd-gate-34"]').waitFor({ timeout: 10000 });
  // French was not kept: it does not open from a copy of nothing.
  const fr = await page.goto(`${BASE}/encyclopedie/saturne`, { waitUntil: "load" }).catch(() => null);
  if (fr && (await page.locator("main h1").count()) && (await page.locator("main h1").innerText()) === "Saturne") fail("offline: French opened though not kept");
  await serverUp();
  if (reports.length) fail(`error reports: ${reports.join("\n").slice(0, 300)}`);
  console.log("offline OK");

  // 4. Turned off: nothing of it stays.
  await page.goto(`${BASE}/settings`, { waitUntil: "load" });
  await page.getByTestId("data-enc-none").check({ timeout: 20000 });
  await page.waitForFunction(() => /no longer kept/.test(document.querySelector("[data-testid=data-enc-status]")?.textContent ?? ""), null, { timeout: 10000 });
  await page.waitForTimeout(500);
  const after = await kept();
  if (after["ulune-enc-en-v1"] || after["ulune-enc-shared-v1"]) fail(`after Not kept: ${JSON.stringify(after)}`);
  if (await page.evaluate(() => localStorage.getItem("ulune.encyclopedia.offline"))) fail("the choice is still remembered");
  console.log("dropped OK");
} finally {
  await browser.close();
  await serverDown();
}
console.log("ENC OFFLINE OK");
