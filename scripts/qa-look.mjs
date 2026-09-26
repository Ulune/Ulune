import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";

const SHOTS = existsSync("/workspace") ? "/workspace/screenshots" : join(process.cwd(), "screenshots");
await mkdir(SHOTS, { recursive: true });

console.log("qa-look start");
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
    if (sessionStorage.getItem("qa-look-seeded")) return;
    localStorage.removeItem("orbis.charts.v1");
    localStorage.removeItem("orbis.charts.active");
    localStorage.removeItem("ulune.look.v1");
    localStorage.removeItem("ulune.look.library.v1");
    localStorage.setItem("ulune.locale", "en");
    localStorage.setItem("ulune.theme", "dark");
    sessionStorage.setItem("qa-look-seeded", "1");
  } catch {
    /* ignore */
  }
});

console.log("goto");
await page.goto("http://127.0.0.1:8097/", { waitUntil: "load", timeout: 30000 });
await page.waitForSelector("html.theme-ready", { timeout: 20000 });
await page.waitForSelector("#birth-date", { timeout: 20000 });

if (await page.getByTestId("studio-natal").count()) {
  await page.getByTestId("new-chart").click();
  await page.waitForSelector("#birth-date", { timeout: 8000 });
}

await page.locator("#native-name").fill("Sample B");
await page.locator("#birth-date").fill("1987-11-03");
await page.locator("#birth-time").fill("23:10");
await page.locator("#birth-place").fill("59.9139, 10.7522");
const filled = await page.evaluate(() => ({
  name: document.querySelector("#native-name")?.value,
  date: document.querySelector("#birth-date")?.value,
  time: document.querySelector("#birth-time")?.value,
  place: document.querySelector("#birth-place")?.value,
}));
console.log("FILLED", filled);
await page.getByTestId("cast-submit").click();

console.log("waiting natal");
try {
  await page.getByTestId("studio-natal").waitFor({ timeout: 40000 });
} catch (err) {
  await page.screenshot({ path: join(SHOTS, "look-cast-fail.png"), fullPage: true });
  const body = await page.locator("body").innerText();
  console.error("CAST_FAIL_TEXT", body.replace(/\s+/g, " ").slice(0, 800));
  throw err;
}
const fail = [];

const lookFold = page.locator('[data-fold="look"]');
await lookFold.scrollIntoViewIfNeeded();
if ((await lookFold.getAttribute("data-open")) !== "1") {
  await lookFold.locator("button[aria-expanded]").first().click();
}
await page.getByTestId("look-panel").waitFor({ state: "visible", timeout: 8000 });
console.log("look open");

const earthLeaf = lookFold.locator('[data-swatch="earth"] [data-hue="leaf"]');
if ((await earthLeaf.getAttribute("aria-pressed")) !== "true") {
  fail.push("earth default should be leaf green");
}

const airGold = lookFold.locator('[data-swatch="air"] [data-hue="gold"]');
if ((await airGold.getAttribute("aria-pressed")) !== "true") {
  fail.push("air default should be gold");
}
const fireRuby = lookFold.locator('[data-swatch="fire"] [data-hue="ruby"]');
if ((await fireRuby.getAttribute("aria-pressed")) !== "true") {
  fail.push("fire default should be ruby");
}
const waterSky = lookFold.locator('[data-swatch="water"] [data-hue="sky"]');
if ((await waterSky.getAttribute("aria-pressed")) !== "true") {
  fail.push("water default should be sky");
}

await lookFold.locator('[data-swatch="fire"] [data-hue="sky"]').click();
await page.waitForTimeout(200);
const fireVar = await page.evaluate(() => document.documentElement.style.getPropertyValue("--el-fire"));
console.log("FIRE_VAR", fireVar);
if (!/245/.test(fireVar)) fail.push(`fire did not switch to sky hue, got ${fireVar}`);

{
  const isLight = await page.evaluate(() => document.documentElement.classList.contains("light"));
  if (!isLight) await page.getByTestId("theme-toggle").click();
  await page.waitForFunction(() => document.documentElement.classList.contains("light"), null, { timeout: 8000 });
}
await page.waitForTimeout(400);
const fireLight = await page.evaluate(() => document.documentElement.style.getPropertyValue("--el-fire"));
console.log("FIRE_LIGHT", fireLight);
const fireC = Number((fireLight.match(/oklch\([0-9.]+ ([0-9.]+)/) ?? [])[1]);
if (!(fireC >= 0.1)) fail.push(`light fire chroma too low: ${fireLight}`);
const airLight = await page.evaluate(() => document.documentElement.style.getPropertyValue("--el-air"));
console.log("AIR_LIGHT", airLight);
const airNums = airLight.match(/oklch\(\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)/i);
if (!airNums) fail.push(`light air not inline oklch: ${airLight}`);
else {
  const l = Number(airNums[1]);
  const h = Number(airNums[3]);
  if (l < 0.74 || l > 0.86) fail.push(`light air L off: ${airLight}`);
  if (h < 90 || h > 100) fail.push(`light air hue off: ${airLight}`);
}

await lookFold.screenshot({ path: join(SHOTS, "look-light.png") });

{
  const isLight = await page.evaluate(() => document.documentElement.classList.contains("light"));
  if (isLight) await page.getByTestId("theme-toggle").click();
  await page.waitForFunction(() => !document.documentElement.classList.contains("light"), null, { timeout: 8000 });
}
await page.waitForTimeout(250);

await lookFold.locator('[data-section-toggle="look-planets"]').click();
await page.locator('[data-planet-row="sun"] [data-hue="violet"]').click();
await page.waitForTimeout(200);
const sunVar = await page.evaluate(() => document.documentElement.style.getPropertyValue("--planet-sun"));
console.log("SUN_VAR", sunVar);
if (!sunVar) fail.push("sun override did not set --planet-sun");
if ((await page.locator('[data-planet-auto="sun"]').getAttribute("aria-pressed")) !== "false") {
  fail.push("sun Auto should unset after a hue pick");
}

await page.locator("[data-look-reset]").click();
await page.waitForTimeout(200);
const fireReset = await page.evaluate(() => document.documentElement.style.getPropertyValue("--el-fire"));
const sunReset = await page.evaluate(() => document.documentElement.style.getPropertyValue("--planet-sun"));
console.log("RESET", { fireReset, sunReset });
if (/245/.test(fireReset)) fail.push("reset left sky fire");
if (sunReset) fail.push("reset left sun override");
if ((await earthLeaf.getAttribute("aria-pressed")) !== "true") fail.push("reset lost leaf earth");
if ((await airGold.getAttribute("aria-pressed")) !== "true") fail.push("reset lost gold air");

{
  const isLight = await page.evaluate(() => document.documentElement.classList.contains("light"));
  if (!isLight) await page.getByTestId("theme-toggle").click();
  await page.waitForFunction(() => document.documentElement.classList.contains("light"), null, { timeout: 8000 });
}
await page.waitForTimeout(250);
await page.locator("[data-look-reset]").click();
await page.waitForTimeout(200);
const airResetLight = await page.evaluate(() => document.documentElement.style.getPropertyValue("--el-air"));
const airResetNums = airResetLight.match(/oklch\(\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)/i);
if (!airResetNums || Math.abs(Number(airResetNums[1]) - 0.83) > 0.005) {
  fail.push(`reset in light did not restore day air: ${airResetLight}`);
}
{
  const isLight = await page.evaluate(() => document.documentElement.classList.contains("light"));
  if (isLight) await page.getByTestId("theme-toggle").click();
  await page.waitForFunction(() => !document.documentElement.classList.contains("light"), null, { timeout: 8000 });
}
await page.waitForTimeout(250);

await lookFold.locator('[data-section-toggle="look-outer-aspects"]').click();
await lookFold.locator('[data-swatch="outer-hard"] [data-hue="rose"]').click();
await page.waitForTimeout(200);
const outerHard = await page.evaluate(() =>
  document.documentElement.style.getPropertyValue("--aspect-outer-hard"),
);
if (!/350/.test(outerHard) && !/358/.test(outerHard)) {
  fail.push(`outer-hard rose did not stick: ${outerHard}`);
}
await page.locator("[data-look-reset]").click();
await page.waitForTimeout(200);

await page.locator('[data-pairing="editorial"]').click();
await page.waitForTimeout(200);
const font = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--font-display"));
console.log("FONT", font);
if (!/Source Serif/i.test(font)) fail.push(`editorial pairing not applied: ${font}`);

await page.locator('[data-stroke="heavy"]').click();
const stroke = await page.evaluate(() => document.documentElement.style.getPropertyValue("--wheel-stroke"));
if (stroke !== "1.45") fail.push(`heavy stroke ${stroke}`);

await page.getByTestId("lang-fr").click();
await page.waitForTimeout(300);
const lookText = await page.getByTestId("look-panel").innerText();
console.log("FR_LOOK", lookText.replace(/\s+/g, " ").slice(0, 220));
if (!/éléments/i.test(lookText) || !/saturation/i.test(lookText) || !/typographie/i.test(lookText)) {
  fail.push("french look labels missing");
}

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(300);
await page.getByTestId("look-panel").screenshot({ path: join(SHOTS, "look-mobile.png") });
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
console.log("MOBILE_OVERFLOW", overflow);
if (overflow > 8) fail.push(`mobile overflow ${overflow}`);

console.log("ERRORS", errors);
if (errors.length) fail.push("page errors");

await browser.close();

if (fail.length) {
  console.error("FAIL", fail);
  process.exit(1);
}
console.log("PASS");
