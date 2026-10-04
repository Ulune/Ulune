/*
 * Control sizes by pointer (UI plan, part 92): with a mouse the controls of
 * the bars are compact, with a finger they are large enough to tap, and no
 * button anywhere is under WCAG 2.2's 24 × 24 px minimum.
 *
 *   - Mouse (1440 × 900): every switch, field and button in the top bar, the
 *     stage's strip and foot and the side panel's head is at most 28 px tall;
 *     panel tabs at most 32; page tabs as tall as the top bar (48).
 *   - Finger (390 × 844, a touch phone): the same controls are at least 40 px.
 *   - Both: no visible button smaller than 24 × 24 px (inline text links
 *     excepted, as WCAG allows).
 *
 *   - A phone: the Transits wheel starts within 110 px of the top (part 96).
 *
 * Pages: Chart, Transits, Calendar, Synastry, Human Design, Numerology.
 */
import { chromium } from "playwright";
import { DEV, FIXTURE_A, FIXTURE_B, castFixture, clickDockTab, goStudioPage, gotoApp, pickPlace } from "./_lib.mjs";

const PAGES = ["natal", "transits", "timing", "synastry", "design", "numerology"];
const CHROME = ".ob-top, .ob-groups, .ob-strip, .ob-foot, .ob-panel-head, .ulune-time-scrub-head";
const CONTROL = "button, input:not([type=checkbox]):not([type=radio]):not([type=hidden]), select";

async function typeField(page, sel, value) {
  const el = page.locator(sel);
  await el.click();
  await el.fill("");
  await el.pressSequentially(value, { delay: 15 });
}

/** Every visible control inside the bars, with its size and what it is. */
async function controls(page) {
  return page.evaluate(
    ({ chrome, control }) => {
      const out = [];
      for (const bar of document.querySelectorAll(chrome)) {
        for (const el of bar.querySelectorAll(control)) {
          const r = el.getBoundingClientRect();
          if (!r.width || !r.height || getComputedStyle(el).visibility === "hidden") continue;
          if (el.closest("[aria-hidden=true], .ulune-wheel-legend, .ob-aspect-slot")) continue;
          // A link inside a sentence (“This chart isn’t kept. Sign in…”) is text, not a control.
          if (window.inSentence(el)) continue;
          const name = (el.getAttribute("aria-label") || el.textContent || el.value || el.tagName).trim().replace(/\s+/g, " ").slice(0, 30);
          const kind = el.closest(".ob-groups") ? "page-tab" : el.classList.contains("ob-panel-tab") ? "panel-tab" : "control";
          out.push({ name, kind, h: Math.round(r.height), w: Math.round(r.width) });
        }
      }
      return out;
    },
    { chrome: CHROME, control: CONTROL },
  );
}

/** In the page: a button that is a word inside running text (WCAG's inline exception). */
const IN_SENTENCE = `window.inSentence = (el) => {
  const p = el.parentElement;
  if (!p || !/^inline/.test(getComputedStyle(el).display)) return false;
  const own = (el.textContent || "").trim().length;
  return (p.textContent || "").trim().length > own + 8;
};`;

/** Buttons anywhere smaller than 24 × 24 (not inline links in a sentence). */
async function tooSmall(page) {
  return page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll("button, [role=button], select")) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || getComputedStyle(el).visibility === "hidden") continue;
      if (el.closest("[aria-hidden=true], svg")) continue;
      // A word inside running text (WCAG's inline exception).
      if (window.inSentence(el)) continue;
      if (r.width < 23.5 || r.height < 23.5) {
        // The spacing exception: a 24 px circle around it touches no other target.
        out.push(`${(el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 30)} ${Math.round(r.width)}×${Math.round(r.height)}`);
      }
    }
    return out;
  });
}

async function addPartner(page) {
  await page.getByTestId("synastry-add-second").or(page.getByTestId("synastry-add-second-wheel")).first().click();
  await page.locator("form[data-mode=partner]").waitFor({ timeout: 8000 });
  await clickDockTab(page, "birth");
  await page.locator("#native-name").fill(FIXTURE_B.name);
  await typeField(page, "#birth-date", FIXTURE_B.date);
  await typeField(page, "#birth-time", FIXTURE_B.time);
  await pickPlace(page, FIXTURE_B.place);
  await page.getByTestId("cast-submit").click();
  await page.getByTestId("synastry-ring").waitFor({ timeout: 45000 });
}

async function run() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const problems = [];
  try {
    for (const device of [
      { name: "mouse", opts: { viewport: { width: 1440, height: 900 } } },
      { name: "finger", opts: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    ]) {
      const context = await browser.newContext(device.opts);
      await context.addInitScript(IN_SENTENCE);
      const page = await context.newPage();
      page.setDefaultTimeout(30000);
      await gotoApp(page);
      const coarse = await page.evaluate(() => matchMedia("(pointer: coarse)").matches);
      if (coarse !== (device.name === "finger")) throw new Error(`${device.name}: pointer: coarse is ${coarse}`);
      await castFixture(page, FIXTURE_A);
      let partner = false;
      for (const mode of PAGES) {
        await goStudioPage(page, mode);
        if (mode === "synastry" && !partner) {
          await addPartner(page);
          partner = true;
        }
        await page.waitForTimeout(1200);
        const list = await controls(page);
        if (!list.length) problems.push(`${device.name} ${mode}: no controls found in the bars`);
        for (const c of list) {
          if (device.name === "mouse") {
            const max = c.kind === "page-tab" ? 48 : c.kind === "panel-tab" ? 32 : 28;
            if (c.h > max + 0.5) problems.push(`${device.name} ${mode}: "${c.name}" is ${c.h} px tall (≤ ${max})`);
          } else if (c.h < 39.5) {
            problems.push(`${device.name} ${mode}: "${c.name}" is ${c.h} px tall (≥ 40)`);
          }
        }
        for (const s of await tooSmall(page)) problems.push(`${device.name} ${mode}: under 24 × 24: ${s}`);
        // The phone's one toolbar row (part 96): the Transits wheel starts right under it.
        if (device.name === "finger" && mode === "transits") {
          const top = await page.evaluate(() => document.querySelector(".ob-figure svg")?.getBoundingClientRect().top ?? 999);
          if (top > 110) problems.push(`finger transits: the wheel starts at ${Math.round(top)} px (≤ 110)`);
        }
        console.log(`${device.name} ${mode}: ${list.length} controls checked`);
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }
  if (problems.length) throw new Error(`density:\n${[...new Set(problems)].join("\n")}`);
  console.log(`DENSITY OK (${DEV})`);
}

await run();
