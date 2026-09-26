import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";

const SHOTS = existsSync("/workspace") ? "/workspace/screenshots" : join(process.cwd(), "screenshots");
await mkdir(SHOTS, { recursive: true });

const errors = [];
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 920 } });
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push("console: " + msg.text());
});
page.on("pageerror", (err) => errors.push("page: " + String(err)));

await page.addInitScript(() => {
  try {
    if (sessionStorage.getItem("qa-mixer-seeded")) return;
    localStorage.removeItem("orbis.charts.v1");
    localStorage.removeItem("orbis.charts.active");
    localStorage.removeItem("ulune.wheel.bodies");
    localStorage.removeItem("ulune.wheel.aspects");
    localStorage.removeItem("ulune.wheel.overlays.v1");
    localStorage.removeItem("ulune.wheel.stars");
    localStorage.removeItem("ulune.wheel.midpoints");
    localStorage.removeItem("ulune.chart.view.v1");
    localStorage.setItem("ulune.locale", "en");
    localStorage.setItem("ulune.theme", "dark");
    sessionStorage.setItem("qa-mixer-seeded", "1");
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
await page.getByTestId("studio-natal").waitFor({ timeout: 40000 });
const mixerFold = page.locator('[data-fold="mixer"]');
if ((await mixerFold.getAttribute("data-open")) !== "1") {
  await mixerFold.locator("button[aria-expanded]").first().click();
}
const mixer = page.getByTestId("body-mixer");
await mixer.waitFor({ timeout: 8000 });
await page.waitForTimeout(600);

const chip = (sel) => mixer.locator(sel);

const wheel = page.locator("svg.ulune-wheel");
const aspectCount = () => wheel.locator("[data-aspect-line]").count();
const planetGlyphs = () => wheel.locator('[data-kind="planet"]').count();
const angleGlyphs = () => wheel.locator('[data-kind="angle"]').count();

async function openSection(id) {
  const btn = page.locator(`[data-section-toggle="${id}"]`);
  if ((await btn.getAttribute("aria-expanded")) !== "true") await btn.click();
}

async function pressed(sel) {
  return page.locator(sel).getAttribute("aria-pressed");
}

const fail = [];

for (const id of ["minimal", "classic", "advanced", "all", "none", "custom"]) {
  if ((await page.locator(`[data-preset="${id}"]`).count()) !== 1) {
    fail.push(`missing chart preset ${id}`);
  }
}
if ((await page.getByTestId("chart-presets").count()) !== 1) fail.push("missing chart presets");
if ((await page.locator("[data-save-custom]").count()) !== 1) fail.push("missing save custom");

const groupIds = ["planets", "points", "asteroids", "angles"];
for (const id of groupIds) {
  const n = await page.locator(`[data-group-all="${id}"]`).count();
  if (n !== 1) fail.push(`missing group All for ${id}`);
}

if ((await pressed('[data-preset="classic"]')) !== "true") fail.push("classic should start selected");

const classicPlanets = await planetGlyphs();
const classicAngles = await angleGlyphs();
const classicAspects = await aspectCount();
console.log("CLASSIC", { classicPlanets, classicAngles, classicAspects });
if (classicPlanets !== 10) fail.push(`classic planets ${classicPlanets}, expected 10`);
if (classicAngles !== 4) fail.push(`classic angles ${classicAngles}, expected 4`);
if (classicAspects === 0) fail.push("classic hid every aspect line");

if ((await chip('[data-body="ceres"]').getAttribute("data-on")) !== "0") {
  fail.push("ceres should start off in classic");
}
if ((await chip('[data-body="sun"]').getAttribute("data-on")) !== "1") {
  fail.push("sun should start on in classic");
}

await page.locator('svg.ulune-wheel g[data-kind="planet"][data-body="sun"]').click({ force: true });
await page.waitForTimeout(250);
const classicParas = await page.locator(".ulune-read p").count();
const classicAsk = await page.locator('[data-fold="click"] [data-testid="ask-grok"]').count();
const classicStar = await page.locator('[data-fold="click"] [data-testid="reading-ai"]').count();
const classicDepth = await page.locator("[data-reading-depth]").getAttribute("data-reading-depth");
console.log("READING_CLASSIC", { classicParas, classicAsk, classicStar, classicDepth });
if (classicDepth !== "standard") fail.push(`classic reading depth ${classicDepth}`);
if (classicParas !== 2) fail.push(`classic should show 2 paragraphs, got ${classicParas}`);
if (classicAsk !== 0) fail.push("classic click reading should not dump Ask AI");
if (classicStar !== 1) fail.push("classic click header should keep the Your AI star");

await page.locator('[data-preset="minimal"]').click();
await page.waitForTimeout(350);
const minPlanets = await planetGlyphs();
const minAngles = await angleGlyphs();
console.log("MINIMAL", { minPlanets, minAngles, aspects: await aspectCount() });
if (minPlanets !== 2) fail.push(`minimal planets ${minPlanets}, expected 2`);
if (minAngles !== 1) fail.push(`minimal angles ${minAngles}, expected 1`);
if ((await chip('[data-body="mars"]').getAttribute("data-on")) !== "0") {
  fail.push("mars should be off in minimal");
}
if ((await pressed('[data-preset="minimal"]')) !== "true") fail.push("minimal not selected");

await page.waitForTimeout(200);
const minParas = await page.locator(".ulune-read p").count();
const minAsk = await page.locator('[data-fold="click"] [data-testid="ask-grok"]').count();
const minDepth = await page.locator("[data-reading-depth]").getAttribute("data-reading-depth");
console.log("READING_MINIMAL", { minParas, minAsk, minDepth });
if (minDepth !== "brief") fail.push(`minimal reading depth ${minDepth}`);
if (minParas !== 1) fail.push(`minimal should show 1 paragraph, got ${minParas}`);
if (minAsk !== 0) fail.push("minimal should hide Ask AI");

await page.locator('[data-preset="advanced"]').click();
await page.waitForTimeout(350);
if ((await chip('[data-body="chiron"]').getAttribute("data-on")) !== "1") {
  fail.push("chiron should be on in advanced");
}
if ((await chip('[data-body="vertex"]').getAttribute("data-on")) !== "1") {
  fail.push("vertex should be on in advanced");
}
if ((await chip('[data-aspect="quincunx"]').getAttribute("data-on")) !== "1") {
  fail.push("quincunx should be on in advanced");
}
if ((await chip('[data-overlay="dignity"]').getAttribute("data-on")) !== "1") {
  fail.push("dignity overlay should be on in advanced");
}
const advDepth = await page.locator("[data-reading-depth]").getAttribute("data-reading-depth");
if (advDepth !== "full") fail.push(`advanced reading depth ${advDepth}`);
const advParas = await page.locator(".ulune-read p").count();
if (advParas < 3) fail.push(`advanced should show full text, got ${advParas} paragraphs`);
if ((await page.locator('[data-fold="click"] [data-testid="ask-grok"]').count()) !== 0) {
  fail.push("advanced click reading should not dump Ask AI");
}
console.log("ADVANCED", { planets: await planetGlyphs(), advParas, advDepth });

await page.locator('[data-preset="all"]').click();
await page.waitForTimeout(350);
if ((await chip('[data-body="ceres"]').getAttribute("data-on")) !== "1") {
  fail.push("ceres should be on in all");
}
if ((await chip('[data-star="aldebaran"]').getAttribute("data-on")) !== "1") {
  fail.push("aldebaran should be on in all");
}
const allBodies = await page.locator("[data-testid=body-mixer] [data-body][data-on='1']").count();
console.log("ALL", { allBodies, planets: await planetGlyphs(), stars: await wheel.locator('[data-kind="star"]').count() });
if (allBodies < 20) fail.push(`all did not turn enough bodies on (${allBodies})`);

await page.locator('[data-preset="none"]').click();
await page.waitForTimeout(300);
const clearPlanets = await planetGlyphs();
const clearAspects = await aspectCount();
console.log("CLEAR", { clearPlanets, clearAspects });
if (clearPlanets !== 0) fail.push("clear left planets on the wheel");
if (clearAspects !== 0) fail.push("clear left aspect lines");
if ((await chip('[data-body="sun"]').getAttribute("data-on")) !== "0") {
  fail.push("sun should be off in clear");
}

await page.locator('[data-preset="classic"]').click();
await page.waitForTimeout(300);

await openSection("asteroids");
const asteroidsAll = page.locator('[data-group-all="asteroids"]');
await asteroidsAll.click();
await page.waitForTimeout(250);
const ceresOn = await chip('[data-body="ceres"]').getAttribute("data-on");
const junoOn = await chip('[data-body="juno"]').getAttribute("data-on");
const asteroidsState = await asteroidsAll.getAttribute("data-on");
console.log("ASTEROIDS_ALL", { ceresOn, junoOn, asteroidsState, planets: await planetGlyphs() });
if (ceresOn !== "1" || junoOn !== "1" || asteroidsState !== "1") fail.push("asteroids All did not turn group on");
if ((await pressed('[data-preset="custom"]')) !== "true") fail.push("tweaking should light Custom");

await asteroidsAll.click();
await page.waitForTimeout(250);
if ((await chip('[data-body="ceres"]').getAttribute("data-on")) !== "0") {
  fail.push("asteroids All did not turn group off");
}

await openSection("points");
const pointsAll = page.locator('[data-group-all="points"]');
await pointsAll.click();
await page.waitForTimeout(200);
if ((await pointsAll.getAttribute("data-on")) !== "1") fail.push("points All on");
if ((await chip('[data-body="vertex"]').getAttribute("data-on")) !== "1") {
  fail.push("vertex not on after points All");
}

await page.locator('[data-preset="classic"]').click();
await page.waitForTimeout(200);

const aspectMixer = page.getByTestId("aspect-mixer");
if ((await aspectMixer.count()) !== 1) fail.push("missing aspect mixer");
await openSection("aspects");

for (const preset of ["all", "major", "none"]) {
  if ((await page.locator(`[data-aspect-preset="${preset}"]`).count()) !== 1) {
    fail.push(`missing aspect preset ${preset}`);
  }
}
if ((await page.getByTestId("orb-slider").count()) !== 1) fail.push("missing orb slider");

for (const id of [
  "conjunction",
  "opposition",
  "trine",
  "square",
  "sextile",
  "quincunx",
  "semisextile",
  "semisquare",
  "quintile",
]) {
  if ((await chip(`[data-aspect="${id}"]`).count()) !== 1) fail.push(`missing aspect chip ${id}`);
}

const classicAgain = await aspectCount();
await page.locator('[data-aspect-preset="all"]').click();
await page.waitForTimeout(300);
const allAspects = await aspectCount();
const quincunxAll = await chip('[data-aspect="quincunx"]').getAttribute("data-on");
console.log("ASPECT_ALL", { allAspects, classicAgain, quincunxAll });
if (quincunxAll !== "1") fail.push("all types left quincunx off");
if (allAspects <= classicAgain) fail.push("all types did not show extra lines");

await page.locator('[data-aspect-preset="major"]').click();
await page.waitForTimeout(300);
const majorAspects = await aspectCount();
const quincunxOn = await chip('[data-aspect="quincunx"]').getAttribute("data-on");
const squareOn = await chip('[data-aspect="square"]').getAttribute("data-on");
console.log("MAJOR", { majorAspects, quincunxOn, squareOn, allAspects });
if (quincunxOn !== "0") fail.push("major left a minor type on");
if (squareOn !== "1") fail.push("major turned square off");
if (majorAspects >= allAspects) fail.push("major did not hide minor lines");
if (majorAspects === 0) fail.push("major hid every line");

await openSection("aspects");
await mixer.screenshot({ path: join(SHOTS, "mixer-major.png") });
await wheel.screenshot({ path: join(SHOTS, "wheel-major.png") });

await page.locator('[data-aspect-preset="all"]').click();
await page.waitForTimeout(200);
await page.getByTestId("orb-slider").fill("2");
await page.waitForTimeout(300);
const tightAspects = await aspectCount();
const orbValue = (await page.getByTestId("orb-value").innerText()).trim();
console.log("TIGHT", { tightAspects, orbValue, allAspects });
if (!/^2/.test(orbValue)) fail.push(`orb value not 2°, got ${orbValue}`);
if (tightAspects >= allAspects) fail.push("tight orb did not hide wide lines");

await wheel.screenshot({ path: join(SHOTS, "wheel-tight.png") });

await page.getByTestId("orb-slider").fill("8");
await page.waitForTimeout(150);
await page.locator('[data-aspect-preset="none"]').click();
await page.waitForTimeout(200);
const noneAspects = await aspectCount();
console.log("NONE", { noneAspects });
if (noneAspects !== 0) fail.push("none left aspect lines");

await chip('[data-aspect="square"]').click();
await page.waitForTimeout(250);
const squareOnly = await aspectCount();
const trineOn = await chip('[data-aspect="trine"]').getAttribute("data-on");
const onlySquare = await chip('[data-aspect="square"]').getAttribute("data-on");
console.log("SQUARES", { squareOnly, trineOn, onlySquare });
if (onlySquare !== "1" || trineOn !== "0") fail.push("square solo failed");
if (squareOnly === 0) fail.push("no square lines");
if (squareOnly >= allAspects) fail.push("squares-only did not reduce lines");

await mixer.screenshot({ path: join(SHOTS, "mixer-squares.png") });
await wheel.screenshot({ path: join(SHOTS, "wheel-squares.png") });

await page.locator("[data-save-custom]").click();
await page.waitForTimeout(200);
if ((await pressed('[data-preset="custom"]')) !== "true") fail.push("save custom did not keep Custom selected");

const stored = await page.evaluate(() => localStorage.getItem("ulune.chart.view.v1"));
console.log("STORED", stored?.slice(0, 280));
if (!stored || !stored.includes("square") || stored.includes("quintile")) {
  fail.push("chart view not persisted as squares-only custom");
}
if (!stored.includes('"presetId":"custom"')) fail.push("stored presetId should be custom");

await page.reload({ waitUntil: "networkidle", timeout: 45000 });
await page.getByTestId("studio-natal").waitFor({ timeout: 45000 });
const mixerFoldReload = page.locator('[data-fold="mixer"]');
if ((await mixerFoldReload.getAttribute("data-open")) !== "1") {
  await mixerFoldReload.locator("button[aria-expanded]").first().click();
}
await page.getByTestId("body-mixer").waitFor({ timeout: 8000 });
await page.waitForTimeout(400);
const customAfterReload = await pressed('[data-preset="custom"]');
const squareAfter = await chip('[data-aspect="square"]').getAttribute("data-on");
const quintileAfter = await chip('[data-aspect="quintile"]').getAttribute("data-on");
console.log("RELOAD", { customAfterReload, squareAfter, quintileAfter });
if (customAfterReload !== "true") fail.push("custom preset lost after reload");
if (squareAfter !== "1") fail.push("square mix lost after reload");
if (quintileAfter !== "0") fail.push("quintile came back after reload");

await page.locator('[aria-label="Language"]').getByRole("button", { name: "FR" }).click();
await openSection("aspects");
await page.getByTestId("aspect-mixer").getByText("Majeurs").waitFor({ timeout: 8000 });
const aspectText = await page.getByTestId("aspect-mixer").innerText();
console.log("FR_ASPECTS", aspectText.replace(/\s+/g, " ").slice(0, 240));
if (!/Majeurs/.test(aspectText) || !/orbe max/i.test(aspectText) || !/Trigone/.test(aspectText) || !/Carré/.test(aspectText)) {
  fail.push("french aspect labels missing");
}
const presetText = await page.getByTestId("chart-presets").innerText();
if (!/Classique/.test(presetText) || !/Perso/.test(presetText) || !/Vider/.test(presetText)) {
  fail.push("french preset labels missing");
}

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(400);
await page.getByTestId("body-mixer").screenshot({ path: join(SHOTS, "mixer-mobile.png") });
await page.screenshot({ path: join(SHOTS, "mixer-mobile-page.png"), fullPage: false });

const overflow = await page.evaluate(() => {
  const mixer = document.querySelector("[data-testid=body-mixer]");
  return {
    page: document.documentElement.scrollWidth - window.innerWidth,
    mixer: mixer ? mixer.scrollWidth - mixer.clientWidth : -1,
  };
});
console.log("MOBILE_OVERFLOW", overflow);
if (overflow.page > 8) fail.push(`mobile overflow ${overflow.page}`);
if (overflow.mixer > 8) fail.push(`mixer overflow ${overflow.mixer}`);

console.log("ERRORS", errors);
if (errors.length) fail.push("page errors");

await browser.close();

if (fail.length) {
  console.error("FAIL", fail);
  process.exit(1);
}
console.log("PASS");
