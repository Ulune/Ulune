import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

await mkdir("/workspace/screenshots", { recursive: true });

const errors = [];
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

async function shot(page, name) {
  await page.screenshot({ path: `/workspace/screenshots/${name}.png`, fullPage: true });
}

async function ensureTheme(page, mode) {
  const wantLight = mode === "light";
  const isLight = await page.evaluate(() => document.documentElement.classList.contains("light"));
  if (isLight === wantLight) return;
  await page.getByTestId("theme-toggle").click();
  await page.waitForFunction(
    (light) => document.documentElement.classList.contains("light") === light,
    wantLight,
    { timeout: 8000 },
  );
}

async function run({ width, height, tag }) {
  const context = await browser.newContext({ viewport: { width, height } });
  await context.addInitScript(() => {
    try {
      localStorage.setItem("ulune.locale", "en");
    } catch {
      /* ignore */
    }
  });
  const page = await context.newPage();
  page.on("pageerror", (err) => errors.push(`${tag} ${err}`));
  await page.goto("http://127.0.0.1:8097/", { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForSelector("#birth-date", { timeout: 20000 });
  await ensureTheme(page, "dark");
  await page.waitForTimeout(250);

  const darkBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await shot(page, `theme-dark-${tag}`);

  await ensureTheme(page, "light");
  await page.waitForTimeout(250);
  const lightBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const htmlClass = await page.evaluate(() => document.documentElement.className);
  const fg = await page.evaluate(() => getComputedStyle(document.body).color);
  await shot(page, `theme-light-${tag}`);

  if (!htmlClass.split(/\s+/).includes("light")) {
    throw new Error(`${tag} html missing .light, got "${htmlClass}"`);
  }
  if (lightBg === darkBg) {
    throw new Error(`${tag} light bg did not change from dark (${darkBg})`);
  }

  const stored = await page.evaluate(() => localStorage.getItem("ulune.theme"));
  if (stored !== "light") throw new Error(`${tag} theme not persisted: ${stored}`);

  await page.reload({ waitUntil: "networkidle", timeout: 45000 });
  await page.waitForSelector("#birth-date", { timeout: 20000 });
  const stillLight = await page.evaluate(() => document.documentElement.classList.contains("light"));
  if (!stillLight) throw new Error(`${tag} theme did not survive reload`);

  await ensureTheme(page, "dark");
  await page.waitForTimeout(200);
  console.log(`${tag}_OK`, { darkBg, lightBg, fg });
  await context.close();
}

await run({ width: 1280, height: 800, tag: "desktop" });
await run({ width: 390, height: 844, tag: "mobile" });

if (errors.length) {
  console.log("PAGE_ERRORS", errors);
  throw new Error(errors.join("\n"));
}

console.log("THEME_OK");
await browser.close();
