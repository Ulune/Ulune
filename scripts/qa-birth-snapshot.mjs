import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

await mkdir("/workspace/screenshots", { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto("http://127.0.0.1:8097/", { waitUntil: "networkidle", timeout: 45000 });
await page.getByTestId("studio-page-natal").waitFor({ timeout: 15000 });
await page.getByTestId("studio-page-natal").click();

const natalSvg = page.locator("[data-testid='studio-natal'] svg[role='img']");
if (!(await natalSvg.count())) {
  const birthToggle = page.getByRole("button", { name: /birth data|données de naissance/i });
  if (await birthToggle.count()) {
    const expanded = await birthToggle.getAttribute("aria-expanded");
    if (expanded === "false") await birthToggle.click();
  }
  await page.locator("#native-name").fill("Snap QA");
  await page.locator("#birth-date").fill("1991-06-18");
  await page.locator("#birth-time").fill("14:20");
  await page.locator("#birth-place").fill("Paris");
  await page.getByRole("button", { name: /cast/i }).first().click();
  await natalSvg.waitFor({ timeout: 30000 });
}

const fail = [];
const snap = page.getByTestId("chart-snapshot");
if (!(await snap.count())) fail.push("snapshot missing");
const insideBirth = await page.locator("#cast-form [data-testid=chart-snapshot]").count();
if (insideBirth) fail.push("snapshot still inside birth section");
const onNatal = await page.locator("[data-testid=studio-natal] [data-testid=chart-snapshot]").count();
if (!onNatal) fail.push("snapshot not on natal page");
const extra = await page.locator("[data-fold=summary]").count();
if (extra) fail.push("standalone snapshot fold still present");

await page.screenshot({ path: "/workspace/screenshots/birth-snapshot-natal.png" });

await page.getByTestId("studio-page-transits").click();
await page.getByTestId("studio-transits").waitFor({ timeout: 20000 });
await page.waitForTimeout(400);
if (await page.locator("#cast-form [data-testid=chart-snapshot]").count()) {
  fail.push("snapshot leaked into birth on transits");
}
if (await page.locator("[data-fold=summary]").count()) {
  fail.push("standalone snapshot fold on transits");
}
await page.screenshot({ path: "/workspace/screenshots/birth-snapshot-transits.png" });

if (fail.length) {
  console.error("FAIL", fail);
  await browser.close();
  process.exit(1);
}
console.log("PASS");
await browser.close();
