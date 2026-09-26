import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";

const SHOTS = existsSync("/workspace") ? "/workspace/screenshots" : join(process.cwd(), "screenshots");
await mkdir(SHOTS, { recursive: true });

console.log("qa-houses start");
const errors = [];
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 920 } });
page.setDefaultTimeout(20000);
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push("console: " + msg.text());
});
page.on("pageerror", (err) => errors.push("page: " + String(err)));

await page.addInitScript(() => {
  try {
    if (sessionStorage.getItem("qa-houses-seeded")) return;
    localStorage.removeItem("orbis.charts.v1");
    localStorage.removeItem("orbis.charts.active");
    localStorage.setItem("ulune.locale", "en");
    localStorage.setItem("ulune.theme", "dark");
    sessionStorage.setItem("qa-houses-seeded", "1");
  } catch {
    /* ignore */
  }
});

await page.goto("http://127.0.0.1:8097/", { waitUntil: "load", timeout: 30000 });
await page.waitForSelector("html.theme-ready", { timeout: 20000 });
await page.waitForSelector("#birth-date", { timeout: 20000 });

if (await page.getByTestId("studio-natal").count()) {
  await page.getByTestId("new-chart").click();
  await page.waitForSelector("#birth-date", { timeout: 8000 });
}

const houseSelect = page.getByTestId("house-system");
await houseSelect.waitFor();
const defaultSystem = await houseSelect.inputValue();
const fail = [];
if (defaultSystem !== "placidus") fail.push(`default house system ${defaultSystem}`);

const optionCount = await houseSelect.locator("option").count();
if (optionCount !== 10) fail.push(`expected 10 house systems, got ${optionCount}`);

await page.locator("#native-name").fill("Sample B");
await page.locator("#birth-date").fill("1987-11-03");
await page.locator("#birth-time").fill("23:10");
await page.locator("#birth-place").fill("59.9139, 10.7522");
await page.getByTestId("cast-submit").click();
await page.getByTestId("studio-natal").waitFor({ timeout: 40000 });

async function houseCusps() {
  return page.evaluate(() =>
    [...document.querySelectorAll("[data-house][data-cusp]")].map((el) => ({
      id: el.getAttribute("data-house"),
      cusp: Number(el.getAttribute("data-cusp")),
    })),
  );
}

async function ascText() {
  const snap = page.getByTestId("chart-snapshot");
  const attr = await snap.getAttribute("data-ascendant");
  if (attr) return `ASC ${attr}`;
  const text = await snap.innerText();
  const m = text.match(/ASC\s+[0-9°'.]+\s+\w+/);
  return m ? m[0] : text;
}

const placidus = await houseCusps();
const ascPlacidus = await ascText();
console.log("PLACIDUS_H1", placidus.find((h) => h.id === "1"));
console.log("ASC", ascPlacidus);
if (placidus.length !== 12) fail.push(`placidus houses ${placidus.length}`);

const birthFold = page.locator('[data-fold="birth"]');
if ((await birthFold.getAttribute("data-open")) !== "1") {
  await birthFold.locator("button[aria-expanded]").first().click();
}
await houseSelect.waitFor({ state: "visible" });
await houseSelect.selectOption("whole");
await page.getByTestId("cast-submit").click();
await page.waitForTimeout(800);

const whole = await houseCusps();
const ascWhole = await ascText();
const h1Whole = whole.find((h) => h.id === "1")?.cusp;
const h1Plac = placidus.find((h) => h.id === "1")?.cusp;
console.log("WHOLE_H1", h1Whole, "PLACIDUS_H1", h1Plac);
if (ascWhole !== ascPlacidus) fail.push(`ASC changed on whole sign: ${ascPlacidus} -> ${ascWhole}`);
if (h1Whole == null || h1Plac == null || Math.abs(h1Whole - h1Plac) < 0.2) {
  fail.push(`whole-sign cusp 1 did not move (${h1Plac} vs ${h1Whole})`);
}

const snap = await page.getByTestId("chart-snapshot").innerText();
const birthText = await birthFold.innerText();
if (!/Whole sign/i.test(birthText) && !/Whole sign/i.test(snap)) {
  // subtitle only when fold is collapsed
  await birthFold.locator("button[aria-expanded]").first().click();
  await page.waitForTimeout(200);
  const collapsed = await birthFold.innerText();
  if (!/Whole sign/i.test(collapsed)) fail.push("whole sign missing from birth subtitle");
  await birthFold.locator("button[aria-expanded]").first().click();
}

await houseSelect.waitFor({ state: "visible" });
await houseSelect.selectOption("porphyry");
await page.getByTestId("cast-submit").click();
await page.waitForTimeout(800);

const porphyry = await houseCusps();
const h2Plac = placidus.find((h) => h.id === "2")?.cusp;
const h3Plac = placidus.find((h) => h.id === "3")?.cusp;
const h2Porph = porphyry.find((h) => h.id === "2")?.cusp;
const h3Porph = porphyry.find((h) => h.id === "3")?.cusp;
console.log("PORPHYRY_H2", h2Porph, "PLACIDUS_H2", h2Plac);
if (
  h2Porph == null ||
  h3Porph == null ||
  (Math.abs(h2Porph - h2Plac) < 0.05 && Math.abs(h3Porph - h3Plac) < 0.05)
) {
  fail.push("porphyry intermediate cusps look unchanged");
}
const ascPorph = await ascText();
if (ascPorph !== ascPlacidus) fail.push(`ASC changed on porphyry: ${ascPlacidus} -> ${ascPorph}`);

await page.getByTestId("lang-fr").click();
await page.waitForTimeout(300);
await houseSelect.waitFor({ state: "visible" });
const frOptions = await houseSelect.locator("option").allTextContents();
console.log("FR_OPTIONS", frOptions.join(" | "));
if (!frOptions.some((s) => /Porphyre/i.test(s)) || !frOptions.some((s) => /Signes entiers/i.test(s)) || !frOptions.some((s) => /Égales/i.test(s))) {
  fail.push(`french house labels missing: ${frOptions.join(", ")}`);
}

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(300);
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
console.log("MOBILE_OVERFLOW", overflow);
if (overflow > 8) fail.push(`mobile overflow ${overflow}`);
await page.screenshot({ path: join(SHOTS, "houses-mobile.png") });

console.log("ERRORS", errors);
if (errors.length) fail.push("page errors");

await browser.close();
if (fail.length) {
  console.error("FAIL", fail);
  process.exit(1);
}
console.log("PASS");
