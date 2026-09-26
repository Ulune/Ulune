import { chromium } from "playwright";

const errors = [];
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("pageerror", (err) => errors.push(String(err)));

await page.addInitScript(() => {
  try {
    localStorage.removeItem("ulune.folds.v1");
    localStorage.setItem("ulune.locale", "en");
  } catch {
    /* ignore */
  }
});

await page.goto("http://127.0.0.1:8097/", { waitUntil: "networkidle", timeout: 45000 });
await page.waitForSelector("#birth-date", { timeout: 20000 });

if ((await page.locator("[data-testid=studio-natal]").count()) === 0) {
  await page.locator("#native-name").fill("Sample B");
  await page.locator("#birth-date").fill("1987-11-03");
  await page.locator("#birth-time").fill("23:10");
  await page.locator("#birth-place").fill("Oslo");
  await page.getByRole("button", { name: /cast/i }).first().click();
  await page.waitForSelector("[data-testid=studio-natal]", { timeout: 45000 });
}

await page.waitForTimeout(400);

const wheel = page.locator("svg[role='img']");
const click = page.locator("[data-testid=natal-sky-read]");
const mixer = page.locator("[data-fold=mixer]");

const wheelBox = await wheel.boundingBox();
const clickBox = await click.boundingBox();
const mixerBox = await mixer.boundingBox();
if (!wheelBox || !clickBox || !mixerBox) throw new Error("missing boxes");

const beside = clickBox.x > wheelBox.x + wheelBox.width * 0.4;
const aligned = Math.abs(clickBox.y - wheelBox.y) < 80;
const mixerBelow = mixerBox.y > wheelBox.y + wheelBox.height * 0.4;

console.log("DESKTOP", {
  beside,
  aligned,
  mixerBelow,
  wheel: { x: Math.round(wheelBox.x), y: Math.round(wheelBox.y), w: Math.round(wheelBox.width) },
  click: { x: Math.round(clickBox.x), y: Math.round(clickBox.y), w: Math.round(clickBox.width) },
  dy: Math.round(clickBox.y - wheelBox.y),
});

if (!beside) throw new Error("click reading is not beside the wheel on desktop");
if (!aligned) throw new Error(`click reading not aligned with wheel (dy=${clickBox.y - wheelBox.y})`);
if (!mixerBelow) throw new Error("mixer is not below the wheel");

await page.screenshot({ path: "/workspace/screenshots/layout-desktop.png", fullPage: true });
await wheel.screenshot({ path: "/workspace/screenshots/layout-wheel.png" });

for (const id of ["birth", "summary", "mixer", "strip", "compose"]) {
  const panel = page.locator(`[data-fold=${id}]`);
  if ((await panel.getAttribute("data-open")) === "1") {
    await panel.getByRole("button", { name: /hide/i }).click();
    await page.waitForTimeout(220);
  }
  const open = await panel.getAttribute("data-open");
  if (open !== "0") throw new Error(`${id} did not collapse (open=${open})`);
}

if ((await wheel.count()) !== 1) throw new Error("wheel vanished after collapsing panels");
await page.screenshot({ path: "/workspace/screenshots/layout-collapsed.png", fullPage: true });

await page.locator("[data-fold=mixer]").getByRole("button", { name: /show/i }).click();
await page.waitForTimeout(220);

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(400);
const mWheel = await wheel.boundingBox();
const mClick = await click.boundingBox();
if (!mWheel || !mClick) throw new Error("mobile boxes missing");
const stacked = mClick.y > mWheel.y + mWheel.height * 0.3;
console.log("MOBILE", {
  stacked,
  wheelY: Math.round(mWheel.y),
  clickY: Math.round(mClick.y),
});
if (!stacked) throw new Error("mobile reading should stack under the wheel");
await page.screenshot({ path: "/workspace/screenshots/layout-mobile.png", fullPage: true });

console.log("PAGEERRORS", errors);
await browser.close();
if (errors.length) process.exit(1);
console.log("LAYOUT_QA_OK");
