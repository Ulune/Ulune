import { chromium } from "playwright";

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
    localStorage.removeItem("orbis.charts.v1");
    localStorage.removeItem("orbis.charts.active");
    localStorage.removeItem("ulune.wheel.bodies");
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

const mixer = page.getByTestId("body-mixer");
await mixer.waitFor({ timeout: 40000 });
await page.waitForTimeout(800);

const body = await page.locator("body").innerText();
const sunChip = /Sun\s+27°\d{2}'\s+Aquarius/i.test(body) || /27°0[34]'/.test(body);
const moonChip = /Moon\s+26°/.test(body);
const libraAsc = /ASC\s+20°/.test(body) && /Libra/.test(body);
const swiss = /Swiss Ephemeris/.test(body);
const trueLilithBtn = await page.locator('[data-body="lilith"]').count();
const ceresBtn = await page.locator('[data-body="ceres"]').count();
const vertexBtn = await page.locator('[data-body="vertex"]').count();
const erisBtn = await page.locator('[data-body="eris"]').count();
const sednaBtn = await page.locator('[data-body="sedna"]').count();

console.log("CAST_OK", swiss, "sun", sunChip, "moon", moonChip, "asc", libraAsc);
console.log("MIXER_BODIES", { trueLilithBtn, ceresBtn, vertexBtn, erisBtn, sednaBtn });
console.log("CLASSIC_CERES_ON", await page.locator('[data-body="ceres"]').getAttribute("data-on"));
console.log("CLASSIC_LILITH_ON", await page.locator('[data-body="lilith"]').getAttribute("data-on"));

const aspectCount = async () => page.locator("svg[role='img'] line.ulune-aspect").count();
const planetGlyphs = async () => page.locator("svg[role='img'] .ulune-planet").count();

const classicAspects = await aspectCount();
const classicPlanets = await planetGlyphs();
console.log("CLASSIC", { classicPlanets, classicAspects });

await page.locator('[data-preset="all"]').click();
await page.waitForTimeout(400);
const allPlanets = await planetGlyphs();
const allAspects = await aspectCount();
const ceresOn = await page.locator('[data-body="ceres"]').getAttribute("data-on");
const stripHasCeres = await page.locator("button").filter({ hasText: /Ceres/i }).count();
console.log("ALL", { allPlanets, allAspects, ceresOn, stripHasCeres });

await page.screenshot({ path: "/workspace/screenshots/swiss-all-desktop.png", fullPage: true });

await page.locator('[data-preset="none"]').click();
await page.waitForTimeout(300);
const clearPlanets = await planetGlyphs();
const clearAspects = await aspectCount();
console.log("CLEAR", { clearPlanets, clearAspects });

await page.screenshot({ path: "/workspace/screenshots/swiss-clear-desktop.png" });

await page.locator('[data-preset="classic"]').click();
await page.waitForTimeout(300);
await page.locator('[data-body="sun"]').click();
await page.waitForTimeout(250);
const noSunPlanets = await planetGlyphs();
const noSunAspects = await aspectCount();
const sunOn = await page.locator('[data-body="sun"]').getAttribute("data-on");
console.log("HIDE_SUN", { sunOn, noSunPlanets, noSunAspects, classicPlanets, classicAspects });

await page.locator('[data-body="sun"]').click();
await page.locator('[data-preset="all"]').click();
await page.waitForTimeout(250);

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(400);
await page.screenshot({ path: "/workspace/screenshots/swiss-all-mobile.png", fullPage: true });

console.log("ERRORS", errors);
await browser.close();

const fail = [];
if (!swiss) fail.push("missing Swiss caption");
if (!sunChip) fail.push("sun position");
if (!trueLilithBtn || !ceresBtn || !vertexBtn || !erisBtn || !sednaBtn) fail.push("mixer bodies");
if (allPlanets <= classicPlanets) fail.push("All did not add bodies");
if (clearPlanets !== 0) fail.push("Clear left planets");
if (clearAspects !== 0) fail.push("Clear left aspects");
if (sunOn !== "0") fail.push("Sun toggle");
if (noSunPlanets >= classicPlanets) fail.push("hiding sun did not remove glyph");
if (errors.length) fail.push("page errors");
if (fail.length) {
  console.error("FAIL", fail);
  process.exit(1);
}
console.log("PASS");
