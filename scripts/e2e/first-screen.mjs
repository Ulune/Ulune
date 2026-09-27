/*
 * The first screen (the form first, the guide and the footer under it) and
 * the tour, on a computer, a phone and the smallest phone, in English and
 * French:
 *   - the form comes first: its title is the page's only h1, the first field
 *     is the name, and the first Tab stop skips straight to it;
 *   - the guide's seven sections and the footer follow; every footer link
 *     answers, the source link names the public repository;
 *   - nothing scrolls sideways; no AI anywhere (AI readings wait for v1.1);
 *   - a link to a mode without a chart shows the form with a line saying so,
 *     and the mode opens after the cast;
 *   - the tour starts only from its links, walks eight steps, ends with Done,
 *     Skip or Escape, and remembers one value; its link then goes;
 *   - "New chart" after a cast is the plain form, without the guide;
 *   - /guide stays out of search and sends the tour back to the studio.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  AI_ON,
  DEV,
  FIXTURE_A,
  ROOT,
  SHOTS,
  assertNoOverflow,
  ensureShotsDir,
  gotoApp,
  launch,
  openMenu,
  pickPlace,
  setLang,
} from "./_lib.mjs";

const SOURCE_URL = /export const SOURCE_URL = "([^"]+)"/.exec(readFileSync(join(ROOT, "src/lib/app-identity.ts"), "utf8"))[1];
const SECTIONS_EN = ["What Ulune is", "What you can do", "How to begin", "New to charts?", "Your data stays yours", "Precise, and open about it", "Questions"];
const FOOTER = ["privacy", "legal", "terms", "credits", "accessibility", "source", "report"];

function watch(page) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  return errors;
}

async function firstVisit(width) {
  const { browser, page } = await launch(width);
  const errors = watch(page);
  try {
    await gotoApp(page);
    await page.waitForSelector("#native-name", { timeout: 20000 });
    const heads = await page.evaluate(() => ({
      h1: [...document.querySelectorAll("h1")].map((e) => e.textContent.trim()),
      h2: [...document.querySelectorAll("[data-testid=guide] h2")].map((e) => e.textContent.trim()),
      firstField: document.querySelector("#cast-form input, #cast-form select")?.id,
    }));
    if (heads.h1.length !== 1 || heads.h1[0] !== "Cast a birth chart") throw new Error(`h1: ${JSON.stringify(heads.h1)}`);
    if (JSON.stringify(heads.h2) !== JSON.stringify(SECTIONS_EN)) throw new Error(`guide sections: ${JSON.stringify(heads.h2)}`);
    if (heads.firstField !== "native-name") throw new Error(`first field: ${heads.firstField}`);
    // The first Tab stop goes straight to the form.
    await page.keyboard.press("Tab");
    const skip = await page.evaluate(() => ({ id: document.activeElement?.getAttribute("data-testid"), text: document.activeElement?.textContent }));
    if (skip.id !== "skip-link" || skip.text !== "Skip to the form") throw new Error(`first Tab stop: ${JSON.stringify(skip)}`);
    await page.keyboard.press("Enter");
    if ((await page.evaluate(() => document.activeElement?.id)) !== "native-name") throw new Error("the skip link did not reach the name field");
    // The footer: every link answers; the source link is the public repository.
    for (const id of FOOTER) {
      const link = page.getByTestId(`footer-link-${id}`);
      if (!(await link.count())) throw new Error(`footer link ${id} missing`);
      const href = await link.getAttribute("href");
      if (id === "source" && href !== SOURCE_URL) throw new Error(`source link: ${href}`);
      if (id === "report" && !href.startsWith("mailto:limiel.ulune@protonmail.com")) throw new Error(`report link: ${href}`);
      if (href.startsWith("/")) {
        const res = await page.request.get(DEV + href);
        if (res.status() !== 200) throw new Error(`${href}: ${res.status()}`);
      }
    }
    // A question opens without script help (native disclosure).
    await page.getByTestId("guide-faq-time").locator("summary").click();
    if (!(await page.getByTestId("guide-faq-time").evaluate((d) => d.open))) throw new Error("a question did not open");
    // No AI in 1.0.
    if (!AI_ON && (await page.getByTestId("ai-accounts").count())) throw new Error("AI is off, yet Your AI shows");
    await assertNoOverflow(page);
    await page.screenshot({ path: join(SHOTS, `first-screen-${width}.png`) });
    if (width === 390) {
      await setLang(page, "fr");
      const fr = (await page.getByTestId("birth-title").innerText()).trim();
      if (fr !== "Calculer un thème natal") throw new Error(`French title: "${fr}"`);
      await assertNoOverflow(page);
      await page.screenshot({ path: join(SHOTS, `first-screen-fr-${width}.png`) });
      await setLang(page, "en");
    }
    if (errors.length) throw new Error(`console: ${errors.join(" | ")}`);
    console.log(`first screen ${typeof width === "number" ? width : width.width} OK`);
  } finally {
    await browser.close();
  }
}

async function tour(width) {
  const { browser, page } = await launch(width);
  const errors = watch(page);
  try {
    await gotoApp(page);
    await page.waitForSelector("#native-name", { timeout: 20000 });
    await page.waitForTimeout(1500);
    if (await page.getByTestId("tour-card").count()) throw new Error("the tour opened by itself");
    await page.getByTestId("first-tour").click();
    await page.locator('[data-testid="tour-card"][data-step="chart"]').waitFor({ timeout: 45000 });
    const count = (await page.getByTestId("tour-card").locator(".ob-tour-count").innerText()).trim();
    if (count !== "1 of 8") throw new Error(`step count: "${count}"`);
    if (width < 1024 && (await page.getByTestId("tour-card").getAttribute("data-edge")) !== "bottom") throw new Error("the phone's card is not at the bottom");
    const seen = [];
    for (let i = 0; i < 7; i++) {
      seen.push(await page.getByTestId("tour-card").getAttribute("data-step"));
      if (await page.getByTestId("wheel-hint").count()) throw new Error("the wheel hint showed during the tour");
      await page.getByTestId("tour-next").click();
    }
    seen.push(await page.getByTestId("tour-card").getAttribute("data-step"));
    if (seen.join(",") !== "chart,planets,houses,aspects,reading,table,modes,keep") throw new Error(`steps: ${seen.join(",")}`);
    await page.getByTestId("tour-back").click();
    if ((await page.getByTestId("tour-card").getAttribute("data-step")) !== "modes") throw new Error("Back did not go back");
    await page.keyboard.press("ArrowRight");
    await page.getByTestId("tour-done").click();
    await page.getByTestId("tour-card").waitFor({ state: "detached", timeout: 5000 });
    const kept = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("ulune.tour")).map((k) => `${k}=${localStorage.getItem(k)}`));
    if (kept.join() !== "ulune.tour.v1=done") throw new Error(`what the tour kept: ${kept.join()}`);
    // Reloaded: nothing was kept, so the first screen again, without the tour's link under the form.
    const again = page;
    await again.reload({ waitUntil: "load" });
    await again.waitForSelector("html.theme-ready", { timeout: 20000 });
    await again.waitForSelector("#native-name", { timeout: 20000 });
    if (await again.getByTestId("first-tour").isVisible()) throw new Error("the tour's link stayed after the tour");
    // The guide still offers it, and Escape ends it.
    await again.getByTestId("guide-tour").click();
    await again.locator('[data-testid="tour-card"][data-step="chart"]').waitFor({ timeout: 45000 });
    await again.keyboard.press("Escape");
    await again.getByTestId("tour-card").waitFor({ state: "detached", timeout: 5000 });
    if (errors.length) throw new Error(`console: ${errors.join(" | ")}`);
    console.log(`tour ${width} OK`);
  } finally {
    await browser.close();
  }
}

async function otherStates() {
  const { browser, page } = await launch(1280);
  const errors = watch(page);
  try {
    // A link to a mode, no chart yet: the form, with a line, then the mode.
    await gotoApp(page, "/?studio=transits");
    await page.getByTestId("birth-mode-line").waitFor({ timeout: 20000 });
    const line = (await page.getByTestId("birth-mode-line").innerText()).trim();
    if (line !== "To open Transits, cast a birth chart first.") throw new Error(`mode line: "${line}"`);
    await page.locator("#native-name").fill(FIXTURE_A.name);
    await page.locator("#birth-date").fill(FIXTURE_A.date);
    await page.locator("#birth-time").fill(FIXTURE_A.time);
    await pickPlace(page, FIXTURE_A.place);
    await page.getByTestId("cast-submit").click();
    await page.getByTestId("studio-transits").waitFor({ timeout: 45000 });
    // With a chart on screen: a hidden h1 names it, and the skip link goes to the chart.
    const h1 = await page.evaluate(() => [...document.querySelectorAll("h1")].map((e) => e.textContent));
    if (h1.length !== 1 || !h1[0].startsWith("Transits · ")) throw new Error(`h1 with a chart: ${JSON.stringify(h1)}`);
    // "New chart" is the plain form: no guide.
    await page.getByTestId("chart-chip").click();
    await page.getByTestId("new-chart").click();
    await page.waitForSelector("#birth-date", { timeout: 8000 });
    if (await page.getByTestId("guide").count()) throw new Error("the guide shows under New chart");
    const title = (await page.getByTestId("birth-title").innerText()).trim();
    if (title !== "New chart") throw new Error(`New chart title: "${title}"`);
    // The menu has the guide and the tour.
    await openMenu(page);
    for (const id of ["menu-guide", "menu-tour"]) if (!(await page.getByTestId(id).count())) throw new Error(`${id} missing`);
    // /guide: out of search; its tour link brings the tour to the studio, not in the address.
    await gotoApp(page, "/guide");
    const robots = await page.locator('meta[name="robots"]').getAttribute("content");
    if (robots !== "noindex") throw new Error(`/guide robots: ${robots}`);
    await page.getByTestId("guide-tour").click();
    await page.getByTestId("tour-card").waitFor({ timeout: 45000 });
    if (new URL(page.url()).search.includes("tour")) throw new Error(`the tour is in the address: ${page.url()}`);
    await page.keyboard.press("Escape");
    if (errors.length) throw new Error(`console: ${errors.join(" | ")}`);
    console.log("other states OK");
  } finally {
    await browser.close();
  }
}

await ensureShotsDir();
for (const w of [1280, 390, { width: 320, height: 640 }]) await firstVisit(w);
for (const w of [1280, 390]) await tour(w);
await otherStates();
console.log("FIRST SCREEN OK", DEV);
