import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.setDefaultTimeout(45000);
const errors = [];
page.on("pageerror", (err) => errors.push(String(err)));

await page.goto("http://127.0.0.1:8097/", { waitUntil: "networkidle", timeout: 45000 });
await page.waitForTimeout(600);

if ((await page.locator('[data-testid=body-mixer]').count()) === 0) {
  await page.locator("#native-name").fill("Sample B");
  await page.locator("#birth-date").fill("1987-11-03");
  await page.locator("#birth-time").fill("23:10");
  await page.locator("#birth-place").fill("Oslo");
  await page.getByRole("button", { name: /cast/i }).first().click();
  await page.waitForSelector('[data-testid=body-mixer]', { timeout: 40000 });
}

const form = page.locator("#cast-form");
await form.screenshot({ path: "/workspace/screenshots/form-mobile.png" });

await page.locator('[data-preset=classic]').click();
await page.waitForTimeout(300);

const wheel = page.locator("svg[role='img']");
await wheel.screenshot({ path: "/workspace/screenshots/wheel-aspects.png" });

const strip = page.locator("ul.flex.flex-wrap.justify-center").last();
await strip.screenshot({ path: "/workspace/screenshots/planet-strip.png" });

const hit = page.locator('svg[role="img"] line[stroke="transparent"]').first();
await hit.click({ force: true });
await page.waitForTimeout(250);

const panel = page.locator("section.ulune-read");
const panelText = await panel.innerText();
console.log("PANEL_HAS_RAW_ID", /chiron_opposition|saturn_quincunx|_opposition_/.test(panelText));
console.log("PANEL_TITLE", panelText.split("\n").slice(0, 4));
console.log("PANEL_DUP", panelText.includes("polarity that asks") && panelText.split("polarity that asks").length > 2);
await panel.screenshot({ path: "/workspace/screenshots/aspect-reading.png" });

await page.setViewportSize({ width: 1280, height: 900 });
await page.waitForTimeout(300);
await page.screenshot({ path: "/workspace/screenshots/qa-desktop.png", fullPage: true });

console.log("ERRORS", errors);
await browser.close();
if (errors.length) process.exit(1);
console.log("PASS");
