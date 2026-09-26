import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

await mkdir("/workspace/screenshots", { recursive: true });

function rgb(s) {
  const m = s.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function dist(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (err) => errors.push(String(err)));

await page.addInitScript(() => {
  try {
    localStorage.setItem("ulune.locale", "en");
    localStorage.setItem("ulune.theme", "dark");
  } catch {
    /* ignore */
  }
});

await page.goto("http://127.0.0.1:8097/", { waitUntil: "networkidle", timeout: 45000 });
await page.waitForSelector("#birth-date", { timeout: 20000 });
await page.waitForTimeout(400);

const startBg = rgb(await page.evaluate(() => getComputedStyle(document.body).backgroundColor));
const pillBefore = await page.evaluate(() => {
  const el = document.querySelector('[aria-label="Language"] .ulune-seg-pill');
  return el ? getComputedStyle(el).transform : null;
});

await page.getByTestId("lang-fr").click();
await page.waitForTimeout(80);
const headingFr = await page.locator("#cast-form h1").innerText();
if (!/thème natal/i.test(headingFr) && !/Calculer/i.test(headingFr)) {
  const t = await page.locator("#cast-form").innerText();
  if (!/naissance|Calculer/i.test(t)) throw new Error(`FR copy missing: ${t.slice(0, 120)}`);
}

await page.screenshot({ path: "/workspace/screenshots/toggle-lang-fr.png" });

await page.getByTestId("lang-en").click();
await page.waitForTimeout(350);

const darkBg = rgb(await page.evaluate(() => getComputedStyle(document.body).backgroundColor));
await page.getByTestId("theme-toggle").click();
await page.waitForTimeout(140);
const midBg = rgb(await page.evaluate(() => getComputedStyle(document.body).backgroundColor));
await page.waitForTimeout(500);
const lightBg = rgb(await page.evaluate(() => getComputedStyle(document.body).backgroundColor));

if (!darkBg || !midBg || !lightBg) throw new Error("Could not parse body colors");
if (dist(darkBg, lightBg) < 80) throw new Error(`Theme colors too close: ${darkBg} -> ${lightBg}`);
if (dist(midBg, darkBg) < 4 || dist(midBg, lightBg) < 4) {
  console.warn("THEME_TRANSITION_SNAP", { darkBg, midBg, lightBg });
} else {
  console.log("THEME_TRANSITION_BLEND", { darkBg, midBg, lightBg });
}

await page.screenshot({ path: "/workspace/screenshots/toggle-theme-light.png" });

const themePressed = await page.getByTestId("theme-toggle").getAttribute("aria-pressed");
if (themePressed !== "false") throw new Error(`Expected theme-toggle aria-pressed false in light, got "${themePressed}"`);
const isLight = await page.evaluate(() => document.documentElement.classList.contains("light"));
if (!isLight) throw new Error("expected .light on html after theme toggle");

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(200);
await page.screenshot({ path: "/workspace/screenshots/toggle-theme-light-mobile.png" });

if (errors.length) throw new Error(errors.join("\n"));
console.log("TOGGLES_OK", { startBg, pillBefore, headingFr });
await browser.close();
