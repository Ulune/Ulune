import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

await mkdir("/workspace/screenshots", { recursive: true });
const fail = [];
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.addInitScript(() => {
  try {
    if (sessionStorage.getItem("qa-studio-ready")) return;
    localStorage.setItem("ulune.locale", "en");
    localStorage.setItem("ulune.theme", "dark");
    localStorage.setItem("ulune.studio.page", "natal");
    localStorage.removeItem("orbis.charts.v1");
    sessionStorage.setItem("qa-studio-ready", "1");
  } catch {
    /* ignore */
  }
});
await page.goto("http://127.0.0.1:8097/", { waitUntil: "networkidle", timeout: 45000 });
await page.waitForSelector("#birth-date", { timeout: 20000 });

const firstMain = await page.locator("main > *").first().getAttribute("data-testid");
if (firstMain !== "studio-nav") fail.push(`nav not first in main (got ${firstMain})`);
if ((await page.getByTestId("studio-dial").count()) !== 1) fail.push("missing dial");

const newBtn = page.getByRole("button", { name: /^new$/i });
if (await newBtn.count()) await newBtn.first().click();
await page.locator("#native-name").fill("Sample B");
await page.locator("#birth-date").fill("1987-11-03");
await page.locator("#birth-time").fill("23:10");
await page.locator("#birth-place").fill("Oslo");
await page.getByRole("button", { name: /cast/i }).click();
await page.getByTestId("studio-natal").waitFor({ timeout: 45000 });

const pages = ["natal", "table", "transits", "timing", "synastry", "composite", "progressions", "numerology", "design"];
for (const id of pages) {
  if ((await page.getByTestId(`studio-page-${id}`).count()) !== 1) fail.push(`missing tab ${id}`);
}

const mixer = await page.locator('[data-fold="mixer"]').boundingBox();
const wheel = await page.locator("svg.ulune-wheel").boundingBox();
if (!mixer || !wheel) fail.push("missing mixer or wheel");
else if (mixer.y <= wheel.y) fail.push(`mixer above wheel (${mixer.y} <= ${wheel.y})`);

const nav = await page.getByTestId("studio-nav").boundingBox();
const birth = await page.locator('[data-fold="birth"]').boundingBox();
if (!nav || !birth) fail.push("missing nav or birth");
else if (nav.y >= birth.y) fail.push(`nav not above birth (${nav.y} >= ${birth.y})`);

await page.getByTestId("studio-nav").screenshot({ path: "/workspace/screenshots/studio-nav.png" });
await page.screenshot({ path: "/workspace/screenshots/studio-natal.png", fullPage: false });

await page.getByTestId("studio-page-table").click();
await page.getByTestId("studio-table").waitFor({ timeout: 10000 });
await page.waitForTimeout(200);
await page.screenshot({ path: "/workspace/screenshots/studio-table.png", fullPage: false });
if (!/[?&]studio=table(?:&|$)/.test(page.url())) fail.push(`table tab did not navigate (${page.url()})`);
const tableText = await page.getByTestId("studio-table").innerText();
if (!/Lot of Fortune/.test(tableText)) fail.push("table missing Lot of Fortune label");
if (/Part of Fortune/.test(tableText)) fail.push("table still says Part of Fortune");

await page.getByTestId("studio-page-transits").click();
await page.waitForTimeout(280);
await page.getByTestId("studio-nav").screenshot({ path: "/workspace/screenshots/studio-nav-spin.png" });
const stageDir = await page.getByTestId("studio-stage").getAttribute("data-dir");
if (stageDir !== "fwd") fail.push(`expected fwd spin, got ${stageDir}`);

await page.getByTestId("studio-page-synastry").click();
await page.waitForTimeout(200);
await page.getByTestId("studio-synastry").waitFor({ timeout: 10000 });
await page.getByTestId("synastry-add-second").waitFor({ timeout: 5000 });
await page.screenshot({ path: "/workspace/screenshots/studio-synastry.png" });
await page.getByTestId("studio-page-numerology").click();
await page.waitForTimeout(200);
await page.getByTestId("studio-numerology").waitFor({ timeout: 15000 });
await page.getByTestId("numerology-sky").waitFor({ timeout: 8000 });
await page.screenshot({ path: "/workspace/screenshots/studio-numerology.png" });
await page.getByTestId("studio-page-design").click();
await page.waitForTimeout(200);
await page.getByTestId("studio-humandesign").waitFor({ timeout: 20000 });
await page.getByTestId("hd-sky").waitFor({ timeout: 8000 });
await page.screenshot({ path: "/workspace/screenshots/studio-design.png" });
if (await page.locator('[data-testid=studio-placeholder][data-page=design]').count()) {
  fail.push("design tab still shows the placeholder");
}

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(400);
await page.getByTestId("studio-nav").screenshot({ path: "/workspace/screenshots/studio-nav-mobile.png" });
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
if (overflow > 8) fail.push(`mobile overflow ${overflow}`);

await page.getByTestId("studio-page-table").click();
await page.getByTestId("studio-table").waitFor({ timeout: 5000 });
await page.waitForTimeout(300);
const tableOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
if (tableOverflow > 8) fail.push(`table mobile overflow ${tableOverflow}`);
const extraAfterTable = await page.evaluate(() => {
  const last = document.querySelector("[data-testid=studio-table]");
  if (!last) return 9999;
  const bottom = last.getBoundingClientRect().bottom + window.scrollY;
  return document.documentElement.scrollHeight - bottom;
});
if (extraAfterTable > 180) fail.push(`table extra space below last section (${Math.round(extraAfterTable)}px)`);
await page.screenshot({ path: "/workspace/screenshots/studio-table-mobile.png" });

await page.getByTestId("studio-page-natal").click();
await page.getByTestId("studio-natal").waitFor({ timeout: 5000 });
await page.waitForTimeout(600);
const mixerM = await page.locator('[data-fold="mixer"]').boundingBox();
const wheelM = await page.locator("svg.ulune-wheel").boundingBox();
if (mixerM && wheelM && mixerM.y <= wheelM.y) fail.push("mobile mixer above wheel");
await page.screenshot({ path: "/workspace/screenshots/studio-natal-mobile.png" });

await browser.close();
if (fail.length) {
  console.error("FAIL", fail);
  process.exit(1);
}
console.log("PASS");
