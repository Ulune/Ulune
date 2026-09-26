import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.setDefaultTimeout(45000);
const errors = [];
page.on("pageerror", (err) => errors.push(String(err)));

await page.goto("http://127.0.0.1:8097/", { waitUntil: "networkidle", timeout: 45000 });
await page.waitForTimeout(800);

if ((await page.locator('[data-testid=body-mixer]').count()) === 0) {
  await page.locator("#native-name").fill("Sample B");
  await page.locator("#birth-date").fill("1987-11-03");
  await page.locator("#birth-time").fill("23:10");
  await page.locator("#birth-place").fill("Oslo");
  await page.getByRole("button", { name: /cast/i }).first().click();
  await page.waitForSelector('[data-testid=body-mixer]', { timeout: 40000 });
}

await page.locator('[data-preset=classic]').click();
await page.waitForTimeout(400);
const wheel = page.locator("svg[role='img']");
await wheel.screenshot({ path: "/workspace/screenshots/wheel-classic-tight.png" });

await page.locator('[data-preset=all]').click();
await page.waitForTimeout(400);
await wheel.screenshot({ path: "/workspace/screenshots/wheel-all-tight.png" });

await page.screenshot({ path: "/workspace/screenshots/qa-desktop.png", fullPage: true });
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(300);
await page.locator('[data-preset=classic]').click();
await page.waitForTimeout(300);
await page.screenshot({ path: "/workspace/screenshots/qa-mobile.png", fullPage: true });

console.log("ERRORS", errors);
await browser.close();
if (errors.length) process.exit(1);
console.log("PASS");
