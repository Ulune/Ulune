import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

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
    localStorage.setItem("ulune.locale", "fr");
    localStorage.removeItem("orbis.charts.v1");
    localStorage.removeItem("orbis.charts.active");
    localStorage.removeItem("ulune.wheel.bodies");
  } catch {
    /* ignore */
  }
});

await page.goto("http://127.0.0.1:8097/", { waitUntil: "networkidle", timeout: 45000 });
await page.waitForSelector("#birth-date", { timeout: 20000 });

const newBtn = page.getByRole("button", { name: /nouveau/i });
if (await newBtn.count()) await newBtn.first().click();

await page.locator("#native-name").fill("Sample B");
await page.locator("#birth-date").fill("1987-11-03");
await page.locator("#birth-time").fill("23:10");
await page.locator("#birth-place").fill("Oslo");
await page.getByRole("button", { name: /calculer/i }).first().click();

await page.getByTestId("studio-natal").waitFor({ timeout: 40000 });
const mixerFold = page.locator('[data-fold="mixer"]');
if ((await mixerFold.getAttribute("data-open")) !== "1") {
  await mixerFold.locator("button[aria-expanded]").first().click();
}
const mixer = page.getByTestId("body-mixer");
await mixer.waitFor({ timeout: 8000 });
await page.waitForTimeout(800);

const body = await page.locator("body").innerText();
const checks = {
  hasLeSoleil: /\bLe Soleil\b/.test(body),
  hasLaLune: /\bLa Lune\b/.test(body),
  hasNoeudNordReel: /Nœud Nord réel/.test(body),
  hasLilithReelle: /Lilith réelle/.test(body),
  noNeufVrai: !/Neuf vrai/i.test(body),
  noLilithVrai: !/Lilith vrai\b/i.test(body),
  noNoeudVrai: !/nœud vrai/i.test(body),
  swissCaption: /nœud Nord réel/.test(body) && /Lilith réelle/.test(body),
  noBareOppositionTitle: !/Soleil opposition Lune/.test(body),
};

await page.evaluate(() => {
  const btns = [...document.querySelectorAll("button")];
  const sun = btns.find((b) => /Le Soleil/.test(b.innerText) && b.innerText.includes("°"));
  sun?.click();
});
await page.waitForTimeout(300);
const sunPanel = await page.locator(".ulune-read").innerText();
const sunTitle = await page.locator(".ulune-read h2").innerText();
const aspectPhrases = sunPanel.match(/en (opposition|conjonction|trigone|carré|sextile) [^\n.]+/gi) ?? [];
checks.sunTitleIsLeSoleil = sunTitle === "Le Soleil";
checks.hasNativeAspect = aspectPhrases.length > 0;
checks.noEnglishAspectOrder = !/\bSoleil (opposition|conjonction|trigone|carré|sextile)\b/i.test(sunPanel);

await page.evaluate(() => {
  const btns = [...document.querySelectorAll("button")];
  const node = btns.find((b) => /Nœud Nord réel/.test(b.innerText) && b.innerText.includes("°"));
  node?.click();
});
await page.waitForTimeout(300);
const nodeTitle = await page.locator(".ulune-read h2").innerText();
checks.nodeTitle = nodeTitle;

await page.evaluate(() => {
  const btns = [...document.querySelectorAll("button")];
  const lilith = btns.find((b) => /Lilith réelle/.test(b.innerText) && b.innerText.includes("°"));
  lilith?.click();
});
await page.waitForTimeout(300);
const lilithTitle = await page.locator(".ulune-read h2").innerText();
checks.lilithTitle = lilithTitle;

console.log("COPY", checks);
console.log("ASPECTS", aspectPhrases.slice(0, 6));
console.log("SUN_PANEL", sunPanel.slice(0, 700));

await page.screenshot({ path: "/workspace/screenshots/i18n-fr-copy.png", fullPage: true });
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: "/workspace/screenshots/i18n-fr-copy-mobile.png", fullPage: true });

writeFileSync(
  "/workspace/screenshots/i18n-fr-copy.json",
  JSON.stringify({ checks, aspectPhrases, errors, sunPanel: sunPanel.slice(0, 800) }, null, 2),
);

await browser.close();
if (errors.length) {
  console.error("ERRORS", errors);
  process.exit(1);
}
const failed = Object.entries(checks).filter(([k, v]) => k.endsWith("Title") ? false : !v);
if (failed.length) {
  console.error("FAILED", failed);
  process.exit(1);
}
console.log("FR_COPY_OK");
