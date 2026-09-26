import { chromium } from "playwright";

const errors = [];
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 920 } });
page.setDefaultTimeout(20000);
page.on("pageerror", (err) => errors.push(String(err)));

await page.addInitScript(() => {
  try {
    localStorage.removeItem("orbis.charts.v1");
    localStorage.removeItem("orbis.charts.active");
    localStorage.removeItem("ulune.look.v1");
    localStorage.removeItem("ulune.look.library.v1");
    localStorage.setItem("ulune.locale", "en");
    localStorage.setItem("ulune.theme", "dark");
  } catch {
    /* ignore */
  }
});

await page.goto("http://127.0.0.1:8097/", { waitUntil: "load", timeout: 30000 });
await page.waitForSelector("html.theme-ready", { timeout: 20000 });
await page.waitForSelector("#birth-date");
if (await page.getByTestId("studio-natal").count()) {
  await page.getByTestId("new-chart").click();
  await page.waitForSelector("#birth-date");
}
await page.locator("#native-name").fill("Sample B");
await page.locator("#birth-date").fill("1987-11-03");
await page.locator("#birth-time").fill("23:10");
await page.locator("#birth-place").fill("59.9139, 10.7522");
await page.getByTestId("cast-submit").click();
await page.getByTestId("studio-natal").waitFor({ timeout: 40000 });
const mixerFold = page.locator('[data-fold="mixer"]');
if ((await mixerFold.getAttribute("data-open")) !== "1") {
  await mixerFold.locator("button[aria-expanded]").first().click();
}
await page.getByTestId("body-mixer").waitFor({ timeout: 8000 });

const fail = [];
const mixerLooks = page.getByTestId("chart-presets").getByTestId("look-profiles");
if ((await mixerLooks.count()) !== 1) fail.push("look profiles missing next to custom");

const lookFold = page.locator('[data-fold="look"]');
if ((await lookFold.getAttribute("data-open")) !== "1") {
  await lookFold.locator("button[aria-expanded]").first().click();
}
await page.getByTestId("look-panel").waitFor({ state: "visible" });
await lookFold.locator('[data-swatch="fire"] [data-hue="sky"]').click();
await page.waitForTimeout(150);
await lookFold.locator("[data-look-save]").click();
await page.waitForTimeout(200);

const chips = lookFold.locator("[data-look-profile]");
const names = await chips.allTextContents();
console.log("CHIPS", names);
if (!names.some((n) => /Look 1/i.test(n))) fail.push(`saved look chip missing: ${names.join(",")}`);

const fireSky = await page.evaluate(() => document.documentElement.style.getPropertyValue("--el-fire"));
if (!/245/.test(fireSky)) fail.push(`sky fire not applied ${fireSky}`);

await lookFold.locator('[data-look-profile="default"]').click();
await page.waitForTimeout(150);
const fireDefault = await page.evaluate(() => document.documentElement.style.getPropertyValue("--el-fire"));
console.log("DEFAULT_FIRE", fireDefault);
if (/245/.test(fireDefault)) fail.push("Ulune chip did not restore default fire");

await chips.filter({ hasText: "Look 1" }).click();
await page.waitForTimeout(150);
const fireAgain = await page.evaluate(() => document.documentElement.style.getPropertyValue("--el-fire"));
if (!/245/.test(fireAgain)) fail.push("Look 1 did not restore sky fire");

if (errors.length) fail.push("page errors");
await browser.close();
if (fail.length) {
  console.error("FAIL", fail);
  process.exit(1);
}
console.log("PASS");
