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

const fail = [];
const focusOf = () => page.locator("svg.ulune-wheel").getAttribute("data-focus-id");

await page.getByTestId("chart-snapshot").locator("button").first().click();
await page.waitForTimeout(150);
const pinned = await focusOf();
console.log("PINNED", pinned);
if (!pinned) fail.push("click did not pin a highlight");

const moon = page.locator('[data-kind="planet"][data-hl="planet:moon"]').first();
if (await moon.count()) {
  await moon.hover({ force: true });
  await page.waitForTimeout(80);
  const still = await focusOf();
  console.log("AFTER_HOVER", still);
  if (still !== pinned) fail.push(`hover stole pin: ${pinned} -> ${still}`);
}

await page.getByRole("button", { name: /look/i }).first().click();
await page.waitForTimeout(150);
const afterOutside = await focusOf();
console.log("AFTER_OUTSIDE", afterOutside);
if (afterOutside) fail.push(`outside click did not clear: ${afterOutside}`);

await page.getByTestId("chart-snapshot").locator("button").first().click();
await page.waitForTimeout(100);
await page.getByTestId("chart-snapshot").locator("button").first().click();
await page.waitForTimeout(100);
const afterToggle = await focusOf();
console.log("AFTER_TOGGLE", afterToggle);
if (afterToggle) fail.push(`second click did not clear: ${afterToggle}`);

console.log("ERRORS", errors);
if (errors.length) fail.push("page errors");
await browser.close();
if (fail.length) {
  console.error("FAIL", fail);
  process.exit(1);
}
console.log("PASS");
