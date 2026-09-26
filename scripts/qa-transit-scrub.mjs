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

const natal = page.locator("[data-testid='studio-natal'] svg[role='img']");
if (!(await natal.count())) {
  const birthToggle = page.getByRole("button", { name: /birth data|données de naissance/i });
  if (await birthToggle.count()) {
    const expanded = await birthToggle.getAttribute("aria-expanded");
    if (expanded === "false") await birthToggle.click();
  }
  await page.locator("#native-name").fill("Scrub QA");
  await page.locator("#birth-date").fill("1991-06-18");
  await page.locator("#birth-time").fill("14:20");
  await page.locator("#birth-place").fill("Paris");
  await page.getByRole("button", { name: /cast/i }).first().click();
  await natal.waitFor({ timeout: 30000 });
}

await page.getByTestId("studio-page-transits").click();
await page.getByTestId("transit-ring").waitFor({ timeout: 25000 });
await page.getByTestId("transit-scrubber").waitFor({ timeout: 5000 });

const fail = [];
const slider = page.locator("[data-testid=transit-scrubber] input[type=range]");
const dateBox = page.locator("[data-testid=transit-scrubber] input[type=datetime-local]");
if (!(await slider.count())) fail.push("no slider");
if (!(await dateBox.count())) fail.push("no datetime field");

async function moonX() {
  return page.locator("[data-testid=transit-ring] .ulune-planet").first().evaluate((g) => {
    const c = g.querySelector("circle[stroke]");
    return c ? Number(c.getAttribute("cx")) : null;
  });
}

const before = await moonX();
const max = await slider.getAttribute("max");
await slider.fill(max ?? "");
const after = await moonX();
console.log("POS", { before, after });
if (before == null || after == null || Math.abs(after - before) < 0.5) {
  fail.push(`planets did not move: ${before} -> ${after}`);
}

await page.screenshot({ path: "/workspace/screenshots/transit-scrubber.png" });

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(300);
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
if (overflow > 2) fail.push(`mobile overflow ${overflow}`);
await page.screenshot({ path: "/workspace/screenshots/transit-scrubber-mobile.png" });

if (fail.length) {
  console.error("FAIL", fail);
  await browser.close();
  process.exit(1);
}
console.log("PASS");
await browser.close();
