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
 *   - The Chinese pages (languages plan, part 28), on a finger: every control
 *     of the page itself (a pillar's god, a chip, a row, a field, a palace's
 *     name) is at least 44 × 44 px, as touch asks; a radio counts by its
 *     label, a word inside a sentence is text. Feng Shui's Home is measured
 *     with a facing, a year and a room given, its stars and plan drawn. The
 *     two Pair pages too (part 30), with a second person.
 *   - The Western pages' own controls (part 30, the review's T10), on a
 *     finger: those already 44 × 44 px (Chart, Synastry, Composite,
 *     Numerology, the Calendar's month) are held to it as the Chinese pages
 *     are. A control may reach further than it is drawn (a ring that is not
 *     drawn, ::after): that reach counts only where a touch there finds it.
 *     Every Western control still under 44 px (the aspect key under a wheel,
 *     the time dial, Human Design's rows, numerology's cycles, the Calendar's
 *     day and year and its View menu) is listed for the owner, not failed.
 *
 * Pages: Chart, Transits, Progressions, Calendar, Synastry, Composite, Human
 * Design, Numerology and its Cycles; Chinese astrology and its Cycles and
 * Pair, BaZi and its luck pillars and Pair, Feng Shui and its two people
 * (Relationship) and Home.
 */
import { chromium } from "playwright";
import { DEV, FIXTURE_A, FIXTURE_B, castFixture, clickDockTab, goStudioPage, gotoApp, openCalendarView, pickPlace } from "./_lib.mjs";

const CHINESE = ["zodiac", "zodiac-years", "zodiac-pair", "bazi", "bazi-luck", "bazi-pair", "fengshui", "fengshui-pair", "fengshui-home"];
const WESTERN = ["natal", "transits", "progressions", "timing", "synastry", "composite", "design", "numerology", "numerology-cycles"];
/** The Western pages whose own controls reach 44 × 44 px on a finger (part 30): held to it. */
const WESTERN_44 = ["natal", "synastry", "composite", "numerology", "timing"];
const PAGES = [...WESTERN, ...CHINESE];
const CHROME = ".ob-top, .ob-sections, .ob-strip, .ob-foot, .ob-panel-head, .ulune-time-scrub-head";
const CONTROL = "button, a.ob-section, input:not([type=checkbox]):not([type=radio]):not([type=hidden]), select";

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
          const kind = el.closest(".ob-sections") ? "page-tab" : el.classList.contains("ob-panel-tab") ? "panel-tab" : "control";
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

/**
 * In the page: how far a control reaches for a finger. Its box, widened by a
 * ::before or ::after placed around it (a ring that is not drawn, part 30),
 * counted only where the browser confirms a touch at the widened edges lands
 * on the control (nothing over it, nothing clipping it).
 */
const REACH = `window.reach = (el) => {
  const r = el.getBoundingClientRect();
  const s = getComputedStyle(el);
  let box = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
  if (s.position !== "static") {
    for (const which of ["::before", "::after"]) {
      const p = getComputedStyle(el, which);
      if (!p || p.content === "none" || p.content === "normal" || p.display === "none" || p.pointerEvents === "none" || !/absolute|fixed/.test(p.position)) continue;
      const left = r.left + parseFloat(s.borderLeftWidth) + parseFloat(p.left);
      const top = r.top + parseFloat(s.borderTopWidth) + parseFloat(p.top);
      const w = parseFloat(p.width);
      const h = parseFloat(p.height);
      if (![left, top, w, h].every(Number.isFinite)) continue;
      box = { left: Math.min(box.left, left), top: Math.min(box.top, top), right: Math.max(box.right, left + w), bottom: Math.max(box.bottom, top + h) };
    }
  }
  const w = box.right - box.left;
  const h = box.bottom - box.top;
  if (w <= r.width + 0.5 && h <= r.height + 0.5) return { w: r.width, h: r.height };
  el.scrollIntoView({ block: "center", inline: "nearest" });
  const now = el.getBoundingClientRect();
  const dx = now.left - r.left;
  const dy = now.top - r.top;
  const cx = (box.left + box.right) / 2 + dx;
  const cy = (box.top + box.bottom) / 2 + dy;
  const lands = (x, y) => { const hit = document.elementFromPoint(x, y); return Boolean(hit) && (hit === el || el.contains(hit)); };
  const ok = lands(box.left + dx + 1, cy) && lands(box.right + dx - 1, cy) && lands(cx, box.top + dy + 1) && lands(cx, box.bottom + dy - 1);
  return ok ? { w, h } : { w: r.width, h: r.height };
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

/**
 * A page's own controls on a finger under 44 × 44 px, by their reach (inline
 * words in a sentence are text; a part of a drawing and a list kept for
 * screen readers are not touched). `roots`: where the page's own controls are.
 */
async function pageTargets(page, roots = ".ob-figure") {
  return page.evaluate((roots) => {
    const out = [];
    const boxes = [...document.querySelectorAll(roots)];
    if (!boxes.length) return [`no ${roots}`];
    const sel = "button, a[href], select, input:not([type=hidden]):not([type=radio]):not([type=checkbox]), [role=button], [role=tab], [role=option], [role=menuitem], [role=switch], [role=slider], label:has(> input[type=radio]), label:has(> input[type=checkbox])";
    const seen = new Set();
    for (const box of boxes) {
      for (const el of box.querySelectorAll(sel)) {
        if (seen.has(el)) continue;
        seen.add(el);
        const r = el.getBoundingClientRect();
        if (r.width <= 1 || r.height <= 1 || getComputedStyle(el).visibility === "hidden") continue;
        if (el.closest("svg, [aria-hidden=true], .sr-only")) continue;
        if (window.inSentence(el)) continue;
        const reach = window.reach(el);
        if (reach.w < 43.5 || reach.h < 43.5) {
          const tid = el.getAttribute("data-testid");
          const name = (el.getAttribute("aria-label") || el.textContent || el.value || el.tagName).trim().replace(/\s+/g, " ").slice(0, 30);
          // What kind of control: its first class (or its tag), for the owner's list.
          const kind = (el.getAttribute("class") || "").split(/\s+/).find((c) => /^(ulune|ob)-/.test(c)) || el.tagName.toLowerCase();
          out.push({ line: `${name}${tid ? ` [${tid}]` : ""} ${Math.round(reach.w)}×${Math.round(reach.h)}`, kind, w: Math.round(reach.w), h: Math.round(reach.h), name });
        }
      }
    }
    return out;
  }, roots);
}

/** The owner's list (T10): per page and kind of control, how many, their sizes, one example. */
function ownerAdd(owner, where, found) {
  for (const f of found) {
    const key = `${where}: ${f.kind}`;
    const o = owner.get(key) ?? { n: 0, w: [Infinity, 0], h: [Infinity, 0], example: f.name };
    o.n += 1;
    o.w = [Math.min(o.w[0], f.w), Math.max(o.w[1], f.w)];
    o.h = [Math.min(o.h[0], f.h), Math.max(o.h[1], f.h)];
    owner.set(key, o);
  }
}
const span = ([a, b]) => (a === b ? `${a}` : `${a}–${b}`);

/** Feng Shui's Home with what a reader gives it: a facing, the year built and a room (part 26), so its plan and stars are drawn. */
async function fillHome(page) {
  await page.getByTestId("fengshui-home-facing").fill("180");
  await page.getByTestId("fengshui-home-year").fill("1998");
  await page.getByTestId("fengshui-rooms-add-n").selectOption("bedroom");
  await page.getByTestId("fengshui-stars").waitFor({ timeout: 8000 });
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
  const owner = new Map();
  try {
    for (const device of [
      { name: "mouse", opts: { viewport: { width: 1440, height: 900 } } },
      { name: "finger", opts: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    ]) {
      const context = await browser.newContext(device.opts);
      await context.addInitScript(IN_SENTENCE);
      await context.addInitScript(REACH);
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
        if (mode === "fengshui-home") await fillHome(page);
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
        if (device.name === "finger" && (CHINESE.includes(mode) || WESTERN_44.includes(mode))) {
          for (const s of await pageTargets(page)) problems.push(`finger ${mode}: under 44 × 44 on the page: ${typeof s === "string" ? s : s.line}`);
        }
        // The review's T10: every Western control still under 44 px, for the owner.
        if (device.name === "finger" && WESTERN.includes(mode)) {
          ownerAdd(owner, mode, (await pageTargets(page, ".ob-figure, .ob-foot")).filter((f) => typeof f !== "string"));
          if (mode === "timing") {
            for (const scope of ["day", "year"]) {
              await page.getByTestId(`timing-scope-${scope}`).click();
              await page.getByTestId(`calendar-${scope}`).waitFor({ timeout: 30000 });
              // The transits' lines come a moment after the view.
              await page.waitForTimeout(2500);
              ownerAdd(owner, `timing ${scope}`, (await pageTargets(page, ".ob-figure, .ob-foot")).filter((f) => typeof f !== "string"));
            }
            await page.getByTestId("timing-scope-month").click();
            await page.getByTestId("calendar-month").waitFor({ timeout: 30000 });
            await openCalendarView(page);
            ownerAdd(owner, "timing View", (await pageTargets(page, "[data-testid=calendar-view-pop]")).filter((f) => typeof f !== "string"));
            await page.keyboard.press("Escape");
            await page.getByTestId("calendar-view-pop").waitFor({ state: "hidden", timeout: 4000 }).catch(() => {});
          }
        }
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
  if (owner.size) {
    // The review's T10: what reaching 44 px would change the look of (counts vary with the day shown).
    console.log("Western controls under 44 × 44 px on a finger, left for the owner (page: kind × how many, width × height, e.g.):");
    for (const [key, o] of owner) console.log(`  ${key} × ${o.n}, ${span(o.w)} × ${span(o.h)} px, e.g. “${o.example}”`);
  }
  if (problems.length) throw new Error(`density:\n${[...new Set(problems)].join("\n")}`);
  console.log(`DENSITY OK (${DEV})`);
}

await run();
