import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.addInitScript(() => {
  try {
    localStorage.setItem("ulune.locale", "en");
    localStorage.setItem("ulune.theme", "light");
  } catch {
    /* ignore */
  }
});
await page.goto("http://127.0.0.1:8097/", { waitUntil: "networkidle", timeout: 45000 });
await page.waitForSelector("#birth-date", { timeout: 20000 });
await page.locator("#native-name").fill("Sample B");
await page.locator("#birth-date").fill("1987-11-03");
await page.locator("#birth-time").fill("23:10");
await page.locator("#birth-place").fill("Oslo");
await page.getByRole("button", { name: /cast/i }).click();
await page.getByTestId("studio-natal").waitFor({ timeout: 45000 });
await page.waitForTimeout(400);
await page.screenshot({ path: "/workspace/screenshots/theme-light-chart.png", fullPage: true });
await page.goto("http://127.0.0.1:8097/login", { waitUntil: "networkidle", timeout: 20000 });
await page.waitForTimeout(300);
await page.screenshot({ path: "/workspace/screenshots/theme-light-login.png", fullPage: true });
console.log("CHART_LIGHT_OK");
await browser.close();
