import { chromium } from "playwright";

const errors = [];
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("pageerror", (err) => errors.push(String(err)));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push("console: " + msg.text());
});

await page.addInitScript(() => {
  try {
    localStorage.setItem("ulune.locale", "en");
    localStorage.setItem("ulune.theme", "dark");
    localStorage.setItem("ulune.studio.page", "natal");
  } catch {
    /* ignore */
  }
});

await page.goto("http://127.0.0.1:8097/", { waitUntil: "networkidle", timeout: 45000 });
await page.waitForSelector("#birth-date", { timeout: 20000 });
const newBtn = page.getByRole("button", { name: /^new$/i });
if (await newBtn.count()) await newBtn.first().click();
await page.locator("#native-name").fill("Sample B");
await page.locator("#birth-date").fill("1987-11-03");
await page.locator("#birth-time").fill("23:10");
await page.locator("#birth-place").fill("Oslo");
await page.getByRole("button", { name: /cast/i }).click();
await page.getByTestId("studio-natal").waitFor({ timeout: 45000 });
await page.waitForTimeout(500);

const clickFold = page.locator('[data-fold="click"]');
const before = {
  open: await clickFold.getAttribute("data-open"),
  title: await clickFold.locator(".font-display").first().innerText().catch(() => ""),
  body: (await clickFold.innerText()).slice(0, 240),
};
console.log("BEFORE", JSON.stringify(before));

const stripSun = page.locator("button").filter({ hasText: /^Sun/ }).first();
console.log("STRIP_SUN", await stripSun.count());
if (await stripSun.count()) {
  await stripSun.click();
  await page.waitForTimeout(300);
}

const afterStrip = {
  open: await clickFold.getAttribute("data-open"),
  title: await clickFold.locator(".font-display").first().innerText().catch(() => ""),
  body: (await clickFold.innerText()).slice(0, 400),
};
console.log("AFTER_STRIP", JSON.stringify(afterStrip));

const moonGlyph = page.locator("svg.ulune-wheel .ulune-planet").nth(1);
await moonGlyph.click({ force: true }).catch((e) => console.log("WHEEL_CLICK_ERR", e.message));
await page.waitForTimeout(300);
const afterWheel = {
  open: await clickFold.getAttribute("data-open"),
  title: await clickFold.locator(".font-display").first().innerText().catch(() => ""),
  body: (await clickFold.innerText()).slice(0, 400),
};
console.log("AFTER_WHEEL", JSON.stringify(afterWheel));

await page.locator('[data-fold="click"]').screenshot({ path: "/workspace/screenshots/click-broken.png" });
console.log("ERRORS", errors);
await browser.close();
