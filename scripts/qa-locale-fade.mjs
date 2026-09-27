import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const SHOTS = new URL("../screenshots/", import.meta.url).pathname;
await mkdir(SHOTS, { recursive: true });

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

const before = await page.getByTestId("birth-title").innerText();
if (!/Cast a birth chart|New chart/i.test(before)) {
  throw new Error(`Expected English copy, got: ${before.slice(0, 160)}`);
}

await page.getByTestId("footer-lang-fr").click();
await page.waitForTimeout(120);
const midOpacity = await page.evaluate(() => getComputedStyle(document.body).opacity);
await page.waitForTimeout(500);
const after = await page.getByTestId("birth-title").innerText();
if (!/Calculer un thème natal|Nouveau thème/i.test(after)) {
  throw new Error(`Expected French copy, got: ${after.slice(0, 160)}`);
}

const lang = await page.evaluate(() => document.documentElement.lang);
if (lang !== "fr") throw new Error(`html lang is ${lang}`);

await page.screenshot({ path: `${SHOTS}locale-fr-after.png` });

await page.getByTestId("footer-lang-en").click();
await page.waitForTimeout(600);
const back = await page.getByTestId("birth-title").innerText();
if (!/Cast a birth chart|New chart/i.test(back)) {
  throw new Error(`Did not return to English: ${back.slice(0, 160)}`);
}

if (errors.length) throw new Error(errors.join("\n"));
console.log("LOCALE_FADE_OK", { midOpacity, lang });
await browser.close();
