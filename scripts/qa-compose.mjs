import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

await mkdir("/workspace/screenshots", { recursive: true });

const errors = [];
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 920 } });
page.on("pageerror", (err) => errors.push(String(err)));

await page.addInitScript(() => {
  try {
    localStorage.removeItem("orbis.charts.v1");
    localStorage.removeItem("orbis.charts.active");
    localStorage.removeItem("ulune.wheel.bodies");
    localStorage.setItem("ulune.locale", "fr");
  } catch {
    /* ignore */
  }
});

await page.goto("http://127.0.0.1:8097/", { waitUntil: "networkidle", timeout: 45000 });
await page.waitForSelector("#birth-date", { timeout: 20000 });
await page.getByTestId("lang-fr").click();
await page.waitForTimeout(400);

await page.locator("#native-name").fill("Sample B");
await page.locator("#birth-date").fill("1987-11-03");
await page.locator("#birth-time").fill("23:10");
await page.locator("#birth-place").fill("Oslo");
await page.getByRole("button", { name: /cast|calculer/i }).click();
await page.getByTestId("studio-natal").waitFor({ timeout: 45000 });

const compose = page.getByTestId("compose-grok");
await compose.scrollIntoViewIfNeeded();
await compose.click();

const progress = page.getByTestId("compose-progress");
await progress.waitFor({ state: "visible", timeout: 8000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: "/workspace/screenshots/compose-progress.png", fullPage: false });

const progressText = await progress.innerText();
console.log("PROGRESS", progressText.replace(/\s+/g, " ").trim());
if (!/lecture|rédaction|maisons|aspects|synthèse|%/.test(progressText.toLowerCase())) {
  throw new Error("Progress copy missing: " + progressText);
}

const reading = page.locator("section[aria-busy]").or(page.locator("text=Interprétation approfondie"));
await page.waitForFunction(
  () => {
    const err = document.body.innerText;
    if (/Expected ','|JSON at position|SyntaxError/i.test(err)) return "json-error";
    const progress = document.querySelector("[data-testid='compose-progress']");
    if (progress) return false;
    const articles = document.querySelectorAll("section article h3");
    if (articles.length >= 2) return "ok";
    if (/incomplète|incomplete|trop tardé|timeout/i.test(err) && !progress) return "failed";
    return false;
  },
  null,
  { timeout: 110000 },
);

const bodyText = await page.locator("body").innerText();
if (/Expected ','|JSON at position|SyntaxError/i.test(bodyText)) {
  await page.screenshot({ path: "/workspace/screenshots/compose-json-error.png" });
  throw new Error("Raw JSON error leaked into the UI");
}

await page.screenshot({ path: "/workspace/screenshots/compose-fr.png", fullPage: true });
const frOk = /vous|votre|thème|ascendant|soleil|lune/i.test(bodyText) && (await page.locator("section article h3").count()) >= 2;
console.log("FR_READING", frOk, "sections", await page.locator("section article h3").count());
if (!frOk) {
  throw new Error("French reading did not render");
}

await page.getByTestId("lang-en").click();
await progress.waitFor({ state: "visible", timeout: 8000 });
const rewriteText = await progress.innerText();
console.log("REWRITE", rewriteText.replace(/\s+/g, " ").trim());
await page.screenshot({ path: "/workspace/screenshots/compose-rewrite.png" });

await page.waitForFunction(
  () => {
    const err = document.body.innerText;
    if (/Expected ','|JSON at position|SyntaxError/i.test(err)) return "json-error";
    const progress = document.querySelector("[data-testid='compose-progress']");
    if (progress) return false;
    const articles = document.querySelectorAll("section article h3");
    if (articles.length >= 2 && /\b(you|your|rising|sun|moon)\b/i.test(err)) return "ok";
    if (/incomplete|too long|incomplète/i.test(err) && !progress) return "failed";
    return false;
  },
  null,
  { timeout: 110000 },
);

const enText = await page.locator("body").innerText();
if (/Expected ','|JSON at position/i.test(enText)) {
  throw new Error("Raw JSON error after language switch");
}
await page.screenshot({ path: "/workspace/screenshots/compose-en.png", fullPage: true });
const enOk = (await page.locator("section article h3").count()) >= 2 && /\b(you|your)\b/i.test(enText);
console.log("EN_READING", enOk, "pageerrors", errors);
if (!enOk) throw new Error("English rewrite did not render");
if (errors.length) throw new Error("page errors: " + errors.join(" | "));

console.log("COMPOSE_QA_OK");
await browser.close();
