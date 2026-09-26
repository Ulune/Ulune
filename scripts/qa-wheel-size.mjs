import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

await mkdir("/workspace/screenshots", { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

async function measure(page) {
  return page.locator("svg[role='img']").first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    return {
      w: Math.round(r.width),
      h: Math.round(r.height),
      vw: window.innerWidth,
      vh: window.innerHeight,
    };
  });
}

async function ensureChart(page) {
  const natal = page.locator("[data-testid='studio-natal'] svg[role='img']");
  if (await natal.count()) return;
  const birthToggle = page.getByRole("button", { name: /birth data|données de naissance/i });
  if (await birthToggle.count()) {
    const expanded = await birthToggle.getAttribute("aria-expanded");
    if (expanded === "false") await birthToggle.click();
  }
  await page.locator("#native-name").fill("Wheel QA");
  await page.locator("#birth-date").fill("1991-06-18");
  await page.locator("#birth-time").fill("14:20");
  await page.locator("#birth-place").fill("Paris");
  await page.getByRole("button", { name: /cast/i }).first().click();
  await page.locator("[data-testid='studio-natal'] svg[role='img']").waitFor({ timeout: 30000 });
}

const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto("http://127.0.0.1:8097/", { waitUntil: "networkidle", timeout: 45000 });
await page.getByTestId("studio-page-natal").waitFor({ timeout: 15000 });
await page.waitForTimeout(400);
await page.getByTestId("studio-page-natal").click();
await ensureChart(page);
await page.waitForTimeout(600);

const natalDesk = await measure(page);
console.log("NATAL_DESKTOP", natalDesk);
await page.locator("[data-testid=studio-natal] svg[role=img]").screenshot({
  path: "/workspace/screenshots/natal-wheel-lg.png",
});
await page.screenshot({ path: "/workspace/screenshots/natal-page-lg.png" });

await page.getByTestId("studio-page-transits").click();
await page.getByTestId("transit-ring").waitFor({ timeout: 25000 });
await page.waitForTimeout(700);
const transitDesk = await measure(page);
console.log("TRANSIT_DESKTOP", transitDesk);
await page.locator("[data-testid=studio-transits] svg[role=img]").screenshot({
  path: "/workspace/screenshots/transits-wheel-lg.png",
});
await page.screenshot({ path: "/workspace/screenshots/transits-page-lg.png" });

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(400);
const transitMob = await measure(page);
console.log("TRANSIT_MOBILE", transitMob);
await page.screenshot({ path: "/workspace/screenshots/transits-page-sm.png" });

await page.getByTestId("studio-page-natal").click();
await page.getByTestId("studio-natal").waitFor({ timeout: 10000 });
await page.waitForTimeout(400);
const natalMob = await measure(page);
console.log("NATAL_MOBILE", natalMob);
await page.screenshot({ path: "/workspace/screenshots/natal-page-sm.png" });

const fail = [];
if (natalDesk.w < 760) fail.push(`natal desktop wheel too small: ${natalDesk.w}`);
if (transitDesk.w < 760) fail.push(`transit desktop wheel too small: ${transitDesk.w}`);
if (natalMob.w < 330) fail.push(`natal mobile wheel too small: ${natalMob.w}`);
if (natalMob.vw - natalMob.w > 40) fail.push(`natal mobile unused width: ${natalMob.vw - natalMob.w}`);
if (fail.length) {
  console.error("FAIL", fail);
  await browser.close();
  process.exit(1);
}
console.log("PASS");
await browser.close();
