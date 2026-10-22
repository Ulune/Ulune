/**
 * The 2.0 navigation (page reorganisation, parts R2 to R4): the three
 * sections on a computer's top bar and a phone's bottom bar; the language
 * button and its picker, by mouse and by keyboard; the chips; each language
 * reopening its last lens and sub-mode; Human Design's two lenses (5a);
 * the sub-modes folded into their lens on a narrow toolbar; the French
 * words; no horizontal overflow from 360 to 1440 px in either language; the
 * keys L and Alt+1 to Alt+3; the language button's one-time hint for a
 * reader of 1.x (R8), never for a new reader.
 *
 * The Chinese languages (languages plan, part 28): their eight pages in the
 * overflow check; Alt+1 to Alt+4 by the lenses each has (Feng Shui's Home is
 * Alt+4, BaZi has no Home), and each reopening on the lens it was left on,
 * by the picker and by a chip; ⌘K finding each by its pinyin and characters
 * (bāzì, 八字, 風水, 风水, fengshui, 生肖), case and accents aside; on a phone
 * the language button gives its mark alone at 360 px and the short name,
 * whole, at 430 px (Zodiac, BaZi, Feng Shui; Zodiaque in French).
 *
 * The chart is the sample (1 January 2000, noon, Greenwich: nobody's birth).
 */
import { chromium } from "playwright";
import { DEV, clickTestId, goStudioPage, gotoApp, openMenu, setLang, studioPageNow, waitStudioPage } from "./_lib.mjs";

/** The ten Chinese pages (src/studio/map.ts): Chinese astrology's three, BaZi's three, Feng Shui's four (its Cycles, feature 5d). */
const CHINESE = ["zodiac", "zodiac-years", "zodiac-pair", "bazi", "bazi-luck", "bazi-pair", "fengshui", "fengshui-cycles", "fengshui-pair", "fengshui-home"];

const fail = [];
const check = (ok, msg) => {
  if (!ok) fail.push(msg);
};
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });

async function open(width, height = 900, touch = false) {
  const context = await browser.newContext({ viewport: { width, height }, ...(touch ? { isMobile: true, hasTouch: true } : {}) });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await gotoApp(page);
  return { context, page, errors };
}

async function sample(page) {
  await page.getByTestId("sample-chart").click();
  await page.getByTestId("studio-natal").waitFor({ timeout: 45000 });
}

const attr = (page, testId, name) => page.getByTestId(testId).getAttribute(name);
const shown = (page, testId) => page.getByTestId(testId).isVisible().catch(() => false);
const focusedId = (page) => page.evaluate(() => document.activeElement?.getAttribute("data-testid") ?? "");

/** A computer: the sections, the picker by mouse and by keyboard, the chips, the memory of each language, the keys. */
async function computer() {
  const { context, page, errors } = await open(1280);
  try {
    // The first screen: Astrology › Natal, the form, and the picker one press away.
    await page.locator("#native-name").waitFor();
    check((await attr(page, "section-charts", "aria-current")) === "page", "first screen: Charts is not the section shown");
    check((await attr(page, "lang-button", "data-language")) === "astrology", "first screen: not Astrology");
    check((await attr(page, "lens-natal", "aria-selected")) === "true", "first screen: not Natal");
    check((await attr(page, "section-encyclopedia", "href")) === "/encyclopedia", `Encyclopedia leads to ${await attr(page, "section-encyclopedia", "href")}`);
    check((await attr(page, "section-calendar", "href")) === "/calendar", `Calendar leads to ${await attr(page, "section-calendar", "href")}`);
    // Words with a line under the chosen one: no icons on a computer.
    const icons = await page.locator("[data-testid=studio-nav] .ob-section-icon").evaluateAll((els) => els.filter((e) => e.getClientRects().length).length);
    check(icons === 0, `${icons} section icons drawn on a computer`);
    // The skip link names where it leads: the form here; the Calendar shows the sky without a chart.
    const skip = () => page.getByTestId("skip-link").textContent();
    check((await skip()) === "Skip to the form", `the first screen's skip link says "${await skip()}"`);
    await page.getByTestId("section-calendar").click();
    await waitStudioPage(page, "timing");
    await page.waitForFunction(() => document.querySelector("[data-testid=skip-link]")?.textContent === "Skip to the calendar", null, { timeout: 8000 }).catch(() => {});
    check((await skip()) === "Skip to the calendar", `the Calendar's skip link says "${await skip()}"`);
    await page.getByTestId("section-charts").click();
    await waitStudioPage(page, "natal");
    await sample(page);
    check((await skip()) === "Skip to the chart", `the chart's skip link says "${await skip()}"`);

    // The sections: Calendar, then Charts back to the page left.
    await goStudioPage(page, "progressions");
    await page.getByTestId("section-calendar").click();
    await waitStudioPage(page, "timing");
    await page.getByTestId("studio-timing").waitFor({ timeout: 20000 });
    check(new URL(page.url()).pathname === "/calendar", `the Calendar's address: ${new URL(page.url()).pathname}`);
    check((await attr(page, "section-calendar", "aria-current")) === "page", "Calendar is not the section shown");
    check(!(await page.getByTestId("lang-button").count()), "the Calendar shows a language button");
    check(!(await page.locator("[data-testid^=lens-]").count()), "the Calendar shows lens tabs");
    check((await attr(page, "section-charts", "href")) === "/astrology/progressions", `Charts leads to ${await attr(page, "section-charts", "href")}`);
    await page.getByTestId("section-charts").click();
    await waitStudioPage(page, "progressions");
    console.log("sections OK");

    // The picker by mouse: three cards under the Western heading, Chinese astrology under the Chinese one
    // (languages plan, part 7), the current one ticked, ⓘ to the encyclopedia.
    await page.getByTestId("lang-button").click();
    await page.getByTestId("lang-picker").waitFor();
    check((await attr(page, "lang-button", "aria-expanded")) === "true", "the button does not say its picker is open");
    const heads = await page.locator("[data-testid=lang-picker] h2").allInnerTexts();
    check(
      JSON.stringify(heads.map((h) => h.toLowerCase())) === JSON.stringify(["western traditions", "chinese traditions"]),
      `picker headings ${JSON.stringify(heads)}`,
    );
    const cards = await page.locator("[data-testid^=lang-card-]").evaluateAll((els) => els.map((e) => [e.dataset.testid, e.getAttribute("aria-current")]));
    check(
      JSON.stringify(cards) ===
        JSON.stringify([["lang-card-astrology", "true"], ["lang-card-human-design", null], ["lang-card-numerology", null], ["lang-card-chinese-astrology", null], ["lang-card-bazi", null], ["lang-card-feng-shui", null]]),
      `cards ${JSON.stringify(cards)}`,
    );
    for (const [id, path] of [["astrology", "/encyclopedia/astrology"], ["human-design", "/encyclopedia/human-design"], ["numerology", "/encyclopedia/numerology"]]) {
      check((await attr(page, `lang-info-${id}`, "href")) === path, `${id}'s ⓘ leads to ${await attr(page, `lang-info-${id}`, "href")}`);
    }
    const line = await page.getByTestId("lang-card-numerology").innerText();
    check(/name and a date/.test(line), `numerology's card does not say what it needs: "${line}"`);
    await page.getByTestId("lang-card-human-design").click();
    await waitStudioPage(page, "design");
    await page.getByTestId("lang-picker").waitFor({ state: "detached", timeout: 4000 });
    check((await attr(page, "lang-button", "data-language")) === "human-design", "the card did not open Human Design");
    // Its three lenses (share and compare plan, features 5a and 5b): Natal, Cycles (its transits and life cycles) and Relationship, the connection chart.
    const hdLenses = await page.locator("[data-testid^=lens-]").evaluateAll((els) => els.map((e) => e.dataset.testid));
    check(JSON.stringify(hdLenses) === JSON.stringify(["lens-natal", "lens-cycles", "lens-relationship"]), `Human Design's lenses ${JSON.stringify(hdLenses)}`);
    console.log("picker by mouse OK");

    // The picker by keyboard: Enter opens it on the current card, the arrows move, Escape gives the focus back.
    await page.getByTestId("lang-button").focus();
    await page.keyboard.press("Enter");
    await page.getByTestId("lang-picker").waitFor();
    await page.waitForFunction(() => document.activeElement?.getAttribute("data-testid") === "lang-card-human-design", null, { timeout: 4000 }).catch(() => {});
    check((await focusedId(page)) === "lang-card-human-design", `the picker opened with the focus on ${await focusedId(page)}`);
    await page.keyboard.press("ArrowRight");
    check((await focusedId(page)) === "lang-card-numerology", `ArrowRight went to ${await focusedId(page)}`);
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    check((await focusedId(page)) === "lang-card-astrology", `ArrowLeft went to ${await focusedId(page)}`);
    await page.keyboard.press("ArrowDown");
    check((await focusedId(page)) === "lang-card-numerology", `ArrowDown went to ${await focusedId(page)}`);
    await page.keyboard.press("ArrowUp");
    check((await focusedId(page)) === "lang-card-astrology", `ArrowUp went to ${await focusedId(page)}`);
    await page.keyboard.press("Escape");
    await page.getByTestId("lang-picker").waitFor({ state: "detached", timeout: 4000 });
    await page.waitForTimeout(150);
    check((await focusedId(page)) === "lang-button", `after Escape the focus is on ${await focusedId(page)}`);
    // L opens it; Enter on a card opens that language, which reopens on its last lens and sub-mode.
    await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : null));
    await page.keyboard.press("l");
    await page.getByTestId("lang-picker").waitFor();
    await page.waitForFunction(() => document.activeElement?.getAttribute("data-testid") === "lang-card-human-design", null, { timeout: 4000 }).catch(() => {});
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("Enter");
    await waitStudioPage(page, "progressions");
    check((await attr(page, "lens-cycles", "aria-selected")) === "true", "Astrology did not reopen on Cycles");
    console.log("picker by keyboard OK");

    // The chips: the other languages, one press away, the last used first; short names on this toolbar (900 px).
    const chips = await page.locator("[data-testid^=lang-chip-]").evaluateAll((els) => els.map((e) => e.dataset.testid));
    check(JSON.stringify(chips) === JSON.stringify(["lang-chip-human-design", "lang-chip-numerology"]), `chips ${JSON.stringify(chips)}`);
    check(await shown(page, "lang-chip-numerology"), "the chips are hidden at 1280 px");
    check((await page.getByTestId("lang-chip-human-design").innerText()).trim() === "HD", `the Human Design chip reads "${await page.getByTestId("lang-chip-human-design").innerText()}"`);
    await page.getByTestId("lang-chip-numerology").click();
    await waitStudioPage(page, "numerology");
    // Numerology has three lenses (its numbers, its cycles, two people: feature 5c): Natal, Cycles and Relationship, no Home.
    const numLenses = await page.locator("[data-testid^=lens-]").evaluateAll((els) => els.map((e) => e.dataset.testid));
    check(JSON.stringify(numLenses) === JSON.stringify(["lens-natal", "lens-cycles", "lens-relationship"]), `numerology's lenses ${JSON.stringify(numLenses)}`);
    const after = await page.locator("[data-testid^=lang-chip-]").evaluateAll((els) => els.map((e) => e.dataset.testid));
    check(JSON.stringify(after) === JSON.stringify(["lang-chip-astrology", "lang-chip-human-design"]), `chips on numerology ${JSON.stringify(after)}`);
    console.log("chips OK");

    // Each language reopens its last lens, each lens its last sub-mode.
    await goStudioPage(page, "composite");
    await clickTestId(page, "lens-cycles");
    await waitStudioPage(page, "progressions");
    await clickTestId(page, "lens-relationship");
    await waitStudioPage(page, "composite");
    await clickTestId(page, "lang-chip-human-design");
    await waitStudioPage(page, "design");
    await clickTestId(page, "lang-chip-astrology");
    await waitStudioPage(page, "composite");
    await goStudioPage(page, "numerology-cycles");
    check(new URL(page.url()).pathname === "/numerology/cycles", `numerology's Cycles at ${new URL(page.url()).pathname}`);
    await clickTestId(page, "lang-chip-astrology");
    await waitStudioPage(page, "composite");
    await clickTestId(page, "lang-chip-numerology");
    await waitStudioPage(page, "numerology-cycles");
    await clickTestId(page, "lang-chip-astrology");
    await waitStudioPage(page, "composite");
    console.log("memory OK");

    // Folded on this toolbar (900 px, the panel open): "Relationship: Composite ▾" opens the sub-modes.
    check(!(await shown(page, "submode-switch")), "the sub-modes are not folded at 1280 px with the panel open");
    const fold = await page.getByTestId("lens-relationship").evaluate((el) => ({
      label: el.getAttribute("aria-label"),
      // (A lens with a phone's short name holds both: the one drawn here is the long one.)
      drawn: [...el.querySelectorAll(".ob-lens-word, .ob-lens-more")].filter((e) => e.getClientRects().length).map((e) => (e.querySelector(".ob-lens-long") ?? e).textContent),
    }));
    check(
      fold.label === "Relationship: Composite" && JSON.stringify(fold.drawn) === JSON.stringify(["Relationship", ": Composite"]),
      `the folded lens reads ${JSON.stringify(fold)}`,
    );
    check((await attr(page, "lens-relationship", "aria-haspopup")) === "menu", "the folded lens does not say it opens a menu");
    await page.getByTestId("lens-relationship").click();
    await page.getByTestId("lens-menu").waitFor();
    check((await attr(page, "lens-menu-composite", "aria-checked")) === "true", "the menu does not check Composite");
    await page.getByTestId("lens-menu-synastry").click();
    await waitStudioPage(page, "synastry");
    // The keyboard: ArrowDown on the folded tab opens it, Escape gives the focus back.
    await page.getByTestId("lens-relationship").focus();
    await page.keyboard.press("ArrowDown");
    await page.getByTestId("lens-menu").waitFor();
    await page.keyboard.press("Escape");
    await page.getByTestId("lens-menu").waitFor({ state: "detached", timeout: 4000 });
    check((await focusedId(page)) === "lens-relationship", `after the menu the focus is on ${await focusedId(page)}`);
    console.log("folded sub-modes OK");

    // Keys: Alt+2 Cycles, Alt+3 Relationship, Alt+1 Natal; nothing on a language without the lens.
    await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : null));
    await page.keyboard.press("Alt+2");
    await waitStudioPage(page, "progressions");
    await page.keyboard.press("Alt+3");
    await waitStudioPage(page, "synastry");
    await page.keyboard.press("Alt+1");
    await waitStudioPage(page, "natal");
    await clickTestId(page, "lang-chip-human-design");
    await waitStudioPage(page, "design");
    // Human Design's Cycles (feature 5b): Alt+2 opens its transits and life cycles, Alt+1 the bodygraph again.
    await page.keyboard.press("Alt+2");
    await waitStudioPage(page, "design-cycles");
    await page.keyboard.press("Alt+1");
    await waitStudioPage(page, "design");
    // Nothing on a lens the language lacks: Home is Feng Shui's alone.
    await page.keyboard.press("Alt+4");
    await page.waitForTimeout(500);
    check((await studioPageNow(page)) === "design", `Alt+4 on Human Design went to ${await studioPageNow(page)}`);
    // From the Calendar, L opens Charts and its picker.
    await goStudioPage(page, "timing");
    await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : null));
    await page.keyboard.press("l");
    await page.getByTestId("lang-picker").waitFor({ timeout: 8000 });
    check((await studioPageNow(page)) === "design", `L from the Calendar opened ${await studioPageNow(page)}`);
    await page.keyboard.press("Escape");
    console.log("keys OK");
    check(!errors.length, `page errors: ${errors.join(" | ")}`);
  } finally {
    await context.close();
  }
}

/** A wide toolbar (1600 px, the panel open): the sub-modes side by side, the chips' full names. */
async function wide() {
  const { context, page } = await open(1600);
  try {
    await sample(page);
    await goStudioPage(page, "transits");
    check(await shown(page, "submode-switch"), "the sub-modes are folded on a wide toolbar");
    check((await page.getByTestId("lens-cycles").innerText()).trim() === "Cycles", `the lens reads "${await page.getByTestId("lens-cycles").innerText()}"`);
    check(!(await attr(page, "lens-cycles", "aria-haspopup")), "an unfolded lens says it opens a menu");
    check((await page.getByTestId("lang-chip-human-design").innerText()).trim() === "Human Design", "the chips' full names on a wide toolbar");
    await page.getByTestId("studio-page-progressions").click();
    await waitStudioPage(page, "progressions");
    console.log("wide toolbar OK");
  } finally {
    await context.close();
  }
}

/** A phone: the bottom bar, one toolbar row, the sheet of cards. */
async function phone() {
  const { context, page, errors } = await open(390, 844, true);
  try {
    await sample(page);
    const bar = await page.getByTestId("studio-nav").evaluate((el) => {
      const r = el.getBoundingClientRect();
      const links = [...el.querySelectorAll("a.ob-section")].map((a) => {
        const b = a.getBoundingClientRect();
        return { w: b.width, h: b.height, icon: Boolean(a.querySelector("svg")?.getClientRects().length), word: a.innerText.trim() };
      });
      return { bottom: r.bottom, links };
    });
    check(Math.abs(bar.bottom - 844) <= 1, `the sections are not at the bottom (${bar.bottom})`);
    check(bar.links.length === 3, `${bar.links.length} sections`);
    for (const l of bar.links) {
      check(l.h >= 44 && l.w >= 44, `a section is ${Math.round(l.w)}×${Math.round(l.h)}`);
      check(l.icon && l.word, `a section without its icon or word: ${JSON.stringify(l)}`);
    }
    // One row: the language's mark, the lens tabs, ⋯; the sub-modes fold into their lens.
    await goStudioPage(page, "transits");
    check(!(await shown(page, "submode-switch")), "the phone shows a row of sub-modes");
    check((await page.getByTestId("lens-cycles").innerText()).trim() === "Transits", `the folded lens reads "${await page.getByTestId("lens-cycles").innerText()}"`);
    check((await attr(page, "lens-cycles", "aria-label")) === "Cycles: Transits", `the folded lens is named "${await attr(page, "lens-cycles", "aria-label")}"`);
    const row = await page.evaluate(() => {
      const top = (sel) => Math.round(document.querySelector(sel)?.getBoundingClientRect().top ?? -1);
      return [top("[data-testid=lang-button]"), top("[data-testid=lens-cycles]"), top("[data-testid=stage-more]")];
    });
    check(new Set(row).size === 1, `the toolbar is not one row: ${row}`);
    const sizes = await page.evaluate(() =>
      [...document.querySelectorAll("[data-testid=lang-button], [data-testid^=lens-]")].map((b) => Math.round(b.getBoundingClientRect().height)),
    );
    check(sizes.every((h) => h >= 40), `toolbar targets ${sizes}`);
    await page.getByTestId("lens-cycles").click();
    await page.getByTestId("lens-menu").waitFor();
    await page.getByTestId("lens-menu-progressions").click();
    await waitStudioPage(page, "progressions");
    // The sheet: two columns, at the bottom of the screen; the last two languages used first.
    await clickTestId(page, "lang-chip-numerology");
    await waitStudioPage(page, "numerology");
    await clickTestId(page, "lang-chip-astrology");
    await waitStudioPage(page, "progressions");
    await page.getByTestId("lang-button").click();
    await page.getByTestId("lang-picker").waitFor();
    await page.waitForTimeout(450);
    const sheet = await page.evaluate(() => {
      const box = document.querySelector("[data-testid=lang-picker]").getBoundingClientRect();
      const cards = [...document.querySelectorAll("[data-testid^=lang-card-]")].map((c) => ({ id: c.dataset.testid, top: Math.round(c.getBoundingClientRect().top), h: c.getBoundingClientRect().height }));
      return { bottom: Math.round(box.bottom), cards };
    });
    check(Math.abs(sheet.bottom - 844) <= 1, `the sheet ends at ${sheet.bottom}`);
    check(
      JSON.stringify(sheet.cards.map((c) => c.id)) ===
        JSON.stringify(["lang-card-astrology", "lang-card-numerology", "lang-card-human-design", "lang-card-chinese-astrology", "lang-card-bazi", "lang-card-feng-shui"]),
      `the sheet's order ${sheet.cards.map((c) => c.id)}`,
    );
    check(sheet.cards[0].top === sheet.cards[1].top && sheet.cards[2].top > sheet.cards[0].top, `not two columns: ${JSON.stringify(sheet.cards)}`);
    check(sheet.cards.every((c) => c.h >= 44), "a card under 44 px");
    // A swipe down closes it.
    const head = await page.locator(".ob-langsheet-head").boundingBox();
    await page.mouse.move(head.x + 40, head.y + 20);
    await page.mouse.down();
    await page.mouse.move(head.x + 40, head.y + 160, { steps: 6 });
    await page.mouse.up();
    await page.getByTestId("lang-picker").waitFor({ state: "detached", timeout: 4000 });
    check(!errors.length, `page errors: ${errors.join(" | ")}`);
    console.log("phone OK");
  } finally {
    await context.close();
  }
}

/** French: the sections, lenses and the picker's words; the French addresses. */
async function french() {
  const { context, page } = await open(1280);
  try {
    await setLang(page, "fr");
    await sample(page);
    const words = await page.locator("[data-testid=studio-nav] .ob-section:not(.ob-section--ink) .ob-section-label").allInnerTexts();
    check(JSON.stringify(words) === JSON.stringify(["Thèmes", "Calendrier", "Encyclopédie"]), `sections in French ${JSON.stringify(words)}`);
    check((await attr(page, "section-encyclopedia", "href")) === "/encyclopedie", "Encyclopédie's address");
    check((await attr(page, "section-calendar", "href")) === "/calendrier", "Calendrier's address");
    const lenses = await page.locator("[data-testid^=lens-]").allInnerTexts();
    check(JSON.stringify(lenses.map((l) => l.trim())) === JSON.stringify(["Natal", "Cycles", "Relation"]), `lenses in French ${JSON.stringify(lenses)}`);
    check((await page.getByTestId("lang-button").innerText()).trim() === "Astrologie", `the button reads "${await page.getByTestId("lang-button").innerText()}"`);
    await goStudioPage(page, "transits");
    const fold = await page.getByTestId("lens-cycles").evaluate((el) => ({
      label: el.getAttribute("aria-label"),
      // (A lens with a phone's short name holds both: the one drawn here is the long one.)
      drawn: [...el.querySelectorAll(".ob-lens-word, .ob-lens-more")].filter((e) => e.getClientRects().length).map((e) => (e.querySelector(".ob-lens-long") ?? e).textContent),
    }));
    // A narrow no-break space before the colon.
    check(
      fold.label === "Cycles : Transits" && JSON.stringify(fold.drawn) === JSON.stringify(["Cycles", " : Transits"]),
      `the folded lens reads ${JSON.stringify(fold)}`,
    );
    await page.getByTestId("lang-button").click();
    await page.getByTestId("lang-picker").waitFor();
    const text = await page.getByTestId("lang-picker").innerText();
    for (const w of ["Traditions occidentales", "Astrologie", "Human Design", "Numérologie", "Demande l’heure de naissance", "Demande un nom et une date"]) {
      check(text.toLowerCase().includes(w.toLowerCase()), `the picker lacks "${w}"`);
    }
    check((await attr(page, "lang-info-human-design", "href")) === "/encyclopedie/design-humain", "Human Design's ⓘ in French");
    check((await attr(page, "lang-info-numerology", "href")) === "/encyclopedie/numerologie", "numerology's ⓘ in French");
    await page.keyboard.press("Escape");
    await goStudioPage(page, "timing");
    check(new URL(page.url()).pathname === "/calendrier", `the French Calendar's address: ${new URL(page.url()).pathname}`);
    const skip = await page.getByTestId("skip-link").textContent();
    check(skip === "Aller au calendrier", `the French Calendar's skip link says "${skip}"`);
    console.log("French OK");
  } finally {
    await context.close();
  }
}

/** No page wider than the screen, and no toolbar wider than its row, from 360 to 1440 px, in both languages. */
async function overflow() {
  const pages = ["natal", "transits", "progressions", "synastry", "composite", "design", "design-cycles", "design-pair", "numerology", "numerology-cycles", "numerology-pair", ...CHINESE, "timing"];
  for (const lang of ["en", "fr"]) {
    for (const width of [360, 390, 768, 1024, 1280, 1440]) {
      const touch = width < 1024;
      const { context, page } = await open(width, touch ? 800 : 900, touch);
      try {
        if (lang === "fr") await setLang(page, "fr");
        await sample(page);
        for (const id of pages) {
          await goStudioPage(page, id);
          await page.waitForTimeout(250);
          const r = await page.evaluate(() => {
            const strip = document.querySelector("[data-testid=stage-toolbar]");
            const nav = document.querySelector("[data-testid=charts-nav]");
            const end = document.querySelector(".ob-strip-end");
            const clash = nav && end && end.getClientRects().length ? nav.getBoundingClientRect().right - end.getBoundingClientRect().left : -1;
            // A Relationship page's two people (pair-selects.tsx) never run under the view switch and the tools
            // in the same row (review of 2.0's week 3: the second person's list ran 30 px under it at 1280).
            const e = end && end.getClientRects().length ? end.getBoundingClientRect() : null;
            const people = [...(strip?.querySelectorAll(".ulune-pair-bar > *") ?? [])].map((el) => el.getBoundingClientRect());
            const pair = e ? Math.max(-1, ...people.filter((p) => p.top < e.bottom - 1 && e.top < p.bottom - 1).map((p) => p.right - e.left)) : -1;
            return {
              page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
              strip: strip ? strip.scrollWidth - strip.clientWidth : 0,
              clash,
              pair,
            };
          });
          check(r.page <= 1, `${lang} ${width} ${id}: the page is ${r.page}px wider than the screen`);
          check(r.strip <= 1, `${lang} ${width} ${id}: the toolbar runs ${r.strip}px past its row`);
          check(r.clash <= 0, `${lang} ${width} ${id}: the language and lenses run ${Math.round(r.clash)}px under the toolbar's end`);
          check(r.pair <= 0, `${lang} ${width} ${id}: the two people run ${Math.round(r.pair)}px under the toolbar's end`);
        }
      } finally {
        await context.close();
      }
    }
  }
  console.log("no overflow OK");
}

/**
 * The Chinese languages' keys and memory (languages plan, part 28): Alt+1 to
 * Alt+4 choose a lens the language has and nothing else (Feng Shui: Natal,
 * Cycles, Relationship and Home; BaZi: Natal, Cycles, Relationship); a language reopens on the lens it
 * was left on, by the picker's card and by its chip, as this device keeps it.
 */
async function chinese() {
  const { context, page, errors } = await open(1280);
  const path = () => new URL(page.url()).pathname;
  const blur = () => page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : null));
  /** A key, from no field; `to` the page it leads to (else it leads nowhere). */
  const press = async (combo, from, to) => {
    await blur();
    await page.keyboard.press(combo);
    if (to) await waitStudioPage(page, to).catch(() => {});
    else await page.waitForTimeout(500);
    const now = await studioPageNow(page);
    check(now === (to ?? from), `${combo} on ${from} went to ${now} (${path()}), not ${to ?? "nowhere"}`);
  };
  try {
    await sample(page);
    // Feng Shui: Alt+4 its Home, Alt+2 its Cycles (feature 5d), Alt+3 its two people (FS32), Alt+1 its Natal.
    await goStudioPage(page, "fengshui");
    await press("Alt+4", "fengshui", "fengshui-home");
    check(path() === "/feng-shui/home", `Feng Shui's Home at ${path()}`);
    check((await attr(page, "lens-home", "aria-selected")) === "true", "Alt+4 did not choose the Home lens");
    await press("Alt+2", "fengshui-home", "fengshui-cycles");
    check(path() === "/feng-shui/cycles", `Feng Shui's Cycles at ${path()}`);
    check((await attr(page, "lens-cycles", "aria-selected")) === "true", "Alt+2 did not choose Feng Shui's Cycles lens");
    await press("Alt+3", "fengshui-cycles", "fengshui-pair");
    check(path() === "/feng-shui/pair", `Feng Shui's two people at ${path()}`);
    check((await attr(page, "lens-relationship", "aria-selected")) === "true", "Alt+3 did not choose Feng Shui's Relationship lens");
    await press("Alt+4", "fengshui-pair", "fengshui-home");
    await press("Alt+1", "fengshui-home", "fengshui");
    check(path() === "/feng-shui", `Feng Shui's Natal at ${path()}`);
    // BaZi: Alt+2 its luck pillars, Alt+3 its pair page, Alt+4 nothing (no Home), Alt+1 its board.
    await goStudioPage(page, "bazi");
    await press("Alt+2", "bazi", "bazi-luck");
    check(path() === "/bazi/cycles", `BaZi's luck pillars at ${path()}`);
    await press("Alt+3", "bazi-luck", "bazi-pair");
    check(path() === "/bazi/pair", `BaZi's pair page at ${path()}`);
    await press("Alt+4", "bazi-pair");
    await press("Alt+1", "bazi-pair", "bazi");
    console.log("Chinese keys OK");

    // Left on Cycles, BaZi reopens on Cycles: by the picker's card, then by its chip.
    await press("Alt+2", "bazi", "bazi-luck");
    await goStudioPage(page, "natal");
    await page.getByTestId("lang-button").click();
    await page.getByTestId("lang-picker").waitFor();
    await page.getByTestId("lang-card-bazi").click();
    await waitStudioPage(page, "bazi-luck").catch(() => {});
    check((await studioPageNow(page)) === "bazi-luck", `BaZi reopened by its card on ${await studioPageNow(page)}`);
    check((await attr(page, "lens-cycles", "aria-selected")) === "true", "BaZi reopened without its Cycles lens chosen");
    await page.getByTestId("lang-picker").waitFor({ state: "detached", timeout: 4000 }).catch(() => {});
    await clickTestId(page, "lang-chip-astrology");
    await waitStudioPage(page, "natal");
    check(await clickTestId(page, "lang-chip-bazi"), "no BaZi chip beside astrology");
    await waitStudioPage(page, "bazi-luck").catch(() => {});
    check((await studioPageNow(page)) === "bazi-luck", `BaZi reopened by its chip on ${await studioPageNow(page)}`);
    // Feng Shui left on its Home reopens there too.
    await goStudioPage(page, "fengshui-home");
    await clickTestId(page, "lang-chip-bazi");
    await waitStudioPage(page, "bazi-luck").catch(() => {});
    await page.getByTestId("lang-button").click();
    await page.getByTestId("lang-picker").waitFor();
    await page.getByTestId("lang-card-feng-shui").click();
    await waitStudioPage(page, "fengshui-home").catch(() => {});
    check((await studioPageNow(page)) === "fengshui-home", `Feng Shui reopened by its card on ${await studioPageNow(page)}`);
    // What this device keeps (map.ts): each language's last lens, nothing about the chart.
    const kept = await page.evaluate(() => JSON.parse(localStorage.getItem("ulune.studio.last.v2") ?? "{}"));
    check(kept.lens?.bazi === "cycles" && kept.lens?.["feng-shui"] === "home", `the lenses kept on this device ${JSON.stringify(kept.lens)}`);
    check(!errors.length, `Chinese: page errors: ${errors.join(" | ")}`);
    console.log("Chinese memory OK");
  } finally {
    await context.close();
  }
}

/**
 * ⌘K finds a language by its name whatever the accents and case, and a
 * Chinese one by its pinyin and characters, Traditional or Simplified
 * (languages plan, part 28); Enter opens it. In English, then in French.
 */
async function palette() {
  const { context, page, errors } = await open(1280);
  const box = page.locator("[data-testid=command-palette] input");
  /** The languages ⌘K lists for what is typed. */
  const languages = async (typed) => {
    if (!(await box.isVisible().catch(() => false))) {
      await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : null));
      await page.keyboard.press("Control+k");
      await page.getByTestId("command-palette").waitFor({ timeout: 8000 });
    }
    await box.fill(typed);
    await page.waitForTimeout(120);
    return page.locator("[data-testid^='cmd-lang:']").evaluateAll((els) => els.map((e) => e.getAttribute("data-testid").slice(9)));
  };
  const FINDS = [
    ["bāzì", "bazi"],
    ["bazi", "bazi"],
    ["八字", "bazi"],
    ["風水", "feng-shui"],
    ["风水", "feng-shui"],
    ["fengshui", "feng-shui"],
    ["FĒNGSHUǏ", "feng-shui"],
    ["shengxiao", "chinese-astrology"],
    ["生肖", "chinese-astrology"],
  ];
  try {
    await sample(page);
    for (const [typed, id] of FINDS) {
      const got = await languages(typed);
      check(JSON.stringify(got) === JSON.stringify([id]), `⌘K "${typed}" lists the languages ${JSON.stringify(got)}, not ["${id}"]`);
    }
    // The lens of a Chinese language, by its characters and the lens's name.
    await languages("八字 cycles");
    const lenses = await page.locator("[data-testid^='cmd-lens:']").evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")));
    check(JSON.stringify(lenses) === JSON.stringify(["cmd-lens:bazi:cycles"]), `⌘K "八字 cycles" lists the lenses ${JSON.stringify(lenses)}`);
    // Enter opens the first: 風水 opens Feng Shui.
    await languages("風水");
    const first = await page.locator("[data-testid=command-palette] [role=option]").first().getAttribute("data-testid");
    check(first === "cmd-lang:feng-shui", `⌘K "風水" lists ${first} first`);
    await page.keyboard.press("Enter");
    await waitStudioPage(page, "fengshui").catch(() => {});
    check((await studioPageNow(page)) === "fengshui", `⌘K "風水" and Enter opened ${await studioPageNow(page)}`);
    // In French: without its accent, Numérologie; the pinyin as in English.
    await setLang(page, "fr");
    for (const [typed, id] of [["numerologie", "numerology"], ["fēngshuǐ", "feng-shui"], ["astrologie chinoise", "chinese-astrology"]]) {
      const got = await languages(typed);
      check(JSON.stringify(got) === JSON.stringify([id]), `fr: ⌘K "${typed}" lists the languages ${JSON.stringify(got)}, not ["${id}"]`);
    }
    // On a phone's width, a language's name is whole: its line beside it is what gets cut.
    await page.setViewportSize({ width: 390, height: 844 });
    await languages("astrologie chinoise");
    const cut = await page.locator("[data-testid='cmd-lang:chinese-astrology'] .ob-palette-label").evaluate((e) => e.scrollWidth > e.clientWidth + 1);
    check(!cut, "fr 390: ⌘K cuts “Astrologie chinoise” for its line");
    await page.keyboard.press("Escape");
    check(!errors.length, `palette: page errors: ${errors.join(" | ")}`);
  } finally {
    await context.close();
  }
  console.log("⌘K by pinyin and characters OK");
}

/**
 * A phone's language button on the Chinese pages (part 28): at 360 px the
 * language's mark alone beside the lens tabs (its name stays in its label);
 * at 430 px, the largest phones, its short name, whole, on the toolbar's one
 * row; in English and French.
 */
async function phoneNames() {
  const SHORT = {
    en: { zodiac: "Zodiac", bazi: "BaZi", fengshui: "Feng Shui" },
    fr: { zodiac: "Zodiaque", bazi: "BaZi", fengshui: "Feng Shui" },
  };
  const FULL = {
    en: { zodiac: "Chinese astrology", bazi: "BaZi", fengshui: "Feng Shui" },
    fr: { zodiac: "Astrologie chinoise", bazi: "BaZi", fengshui: "Feng Shui" },
  };
  for (const lang of ["en", "fr"]) {
    for (const width of [360, 430]) {
      const { context, page, errors } = await open(width, 800, true);
      try {
        if (lang === "fr") await setLang(page, "fr");
        await sample(page);
        for (const id of ["zodiac", "bazi", "fengshui"]) {
          const where = `${lang} ${width} ${id}`;
          await goStudioPage(page, id);
          await page.waitForTimeout(250);
          const r = await page.evaluate(() => {
            const btn = document.querySelector("[data-testid=lang-button]");
            const b = btn.getBoundingClientRect();
            const drawn = [...btn.querySelectorAll(".ob-lang-name, .ob-lang-short")].filter((e) => e.getClientRects().length);
            const top = (sel) => Math.round(document.querySelector(sel)?.getBoundingClientRect().top ?? -1);
            return {
              words: drawn.map((e) => e.textContent),
              inside: drawn.every((e) => {
                const r = e.getBoundingClientRect();
                return r.left >= b.left - 0.5 && r.right <= b.right + 0.5 && r.right <= document.documentElement.clientWidth;
              }),
              mark: Boolean(btn.querySelector("svg")?.getClientRects().length),
              label: btn.getAttribute("aria-label") ?? "",
              rows: new Set([top("[data-testid=lang-button]"), top("[data-testid=lens-natal]"), top("[data-testid=stage-more]")]).size,
              h: Math.round(b.height),
            };
          });
          const want = width < 420 ? [] : [SHORT[lang][id]];
          check(JSON.stringify(r.words) === JSON.stringify(want), `${where}: the language button reads ${JSON.stringify(r.words)}, not ${JSON.stringify(want)}`);
          check(r.inside && r.mark, `${where}: the button's mark or name is cut (${JSON.stringify(r)})`);
          check(r.label.includes(FULL[lang][id]), `${where}: the button is named "${r.label}", without the language's full name`);
          check(r.rows === 1, `${where}: the toolbar is not one row`);
          check(r.h >= 40, `${where}: the language button is ${r.h} px tall`);
        }
        check(!errors.length, `${lang} ${width}: page errors: ${errors.join(" | ")}`);
      } finally {
        await context.close();
      }
    }
  }
  console.log("phone short names OK");
}

/**
 * A reader of 1.x (R8): the language button's one-time hint, under the button
 * and inside the screen, named as the button's description, taking no focus;
 * kept across a reload until "Got it" or the picker; hidden while the tour
 * runs; in French on the smallest phone. A new reader never gets it.
 */
async function fromOne() {
  // What 1.x left while its tabs were used, and nothing of 2.0's: set once, before the first page.
  const seed = (fr) => {
    if (sessionStorage.getItem("seeded")) return;
    sessionStorage.setItem("seeded", "1");
    localStorage.setItem("ulune.studio.group-last", JSON.stringify({ time: "transits" }));
    if (fr) localStorage.setItem("ulune.locale", "fr");
  };
  const reload = async (page) => {
    await page.reload({ waitUntil: "load" });
    await page.waitForSelector("html.theme-ready");
    await page.getByTestId("lang-button").waitFor();
  };
  const hintGone = async (page, msg) => {
    await page.waitForTimeout(1200);
    check(!(await page.getByTestId("lang-hint").count()), msg);
  };
  for (const [width, height, touch, fr] of [
    [1280, 900, false, false],
    [360, 740, true, true],
  ]) {
    const context = await browser.newContext({ viewport: { width, height }, ...(touch ? { isMobile: true, hasTouch: true } : {}) });
    await context.addInitScript(seed, fr);
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    const where = `${width}${fr ? " fr" : ""}`;
    try {
      await gotoApp(page);
      await sample(page);
      await page.getByTestId("lang-hint").waitFor();
      await page.waitForTimeout(600);
      const geo = await page.evaluate(() => {
        const button = document.querySelector("[data-testid=lang-button]");
        const hint = document.querySelector("[data-testid=lang-hint]");
        const b = button.getBoundingClientRect();
        const h = hint.getBoundingClientRect();
        return {
          gap: h.top - b.bottom,
          left: h.left - b.left,
          right: document.documentElement.clientWidth - h.right,
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          describedBy: button.getAttribute("aria-describedby"),
          bodyId: hint.querySelector(".ob-lang-hint-body")?.id,
          role: hint.getAttribute("role"),
          focus: document.activeElement?.closest("[data-testid=lang-hint]") ? "the hint" : "",
          text: hint.innerText,
          ok: hint.querySelector("[data-testid=lang-hint-ok]").getBoundingClientRect().height,
        };
      });
      check(geo.gap > 0 && geo.gap < 20, `${where}: the hint is not just under the button (${geo.gap}px)`);
      check(Math.abs(geo.left) <= 1, `${where}: the hint does not start at the button (${geo.left}px)`);
      check(geo.right >= 8, `${where}: the hint runs to the screen's edge (${geo.right}px left)`);
      check(geo.overflow <= 1, `${where}: the page is ${geo.overflow}px wider than the screen with the hint`);
      check(Boolean(geo.describedBy) && geo.describedBy === geo.bodyId, `${where}: the button is not described by the hint (${geo.describedBy} / ${geo.bodyId})`);
      check(geo.role === "note" && !geo.focus, `${where}: the hint is a ${geo.role}, focus ${geo.focus || "elsewhere"}`);
      const want = fr ? ["Nouveau dans Ulune 2.0", "Temps devient Cycles, Duo devient Relation", "Compris"] : ["New in Ulune 2.0", "Time is now Cycles, Pair is Relationship", "Got it"];
      for (const w of want) check(geo.text.includes(w), `${where}: the hint lacks "${w}"`);
      check(geo.ok >= (touch ? 44 : 32), `${where}: "Got it" is ${geo.ok}px high`);
      // It stays until it is done.
      await reload(page);
      await page.getByTestId("lang-hint").waitFor();
      if (!touch) {
        // Not over the tour, which shows the same place in its own words; back after it.
        await openMenu(page);
        await page.getByTestId("menu-tour").click();
        await page.getByTestId("tour-card").waitFor();
        check(!(await page.getByTestId("lang-hint").count()), `${where}: the hint shows over the tour`);
        await page.keyboard.press("Escape");
        await page.getByTestId("tour-card").waitFor({ state: "detached" });
        await page.getByTestId("lang-hint").waitFor();
        // "Got it": gone, the focus back on the button, and for good.
        await page.getByTestId("lang-hint-ok").focus();
        await page.keyboard.press("Enter");
        await page.getByTestId("lang-hint").waitFor({ state: "detached" });
        const after = await page.evaluate(() => ({
          focus: document.activeElement?.getAttribute("data-testid"),
          describedBy: document.querySelector("[data-testid=lang-button]").getAttribute("aria-describedby"),
        }));
        check(after.focus === "lang-button", `${where}: after "Got it" the focus is on ${after.focus}`);
        check(after.describedBy === null, `${where}: the button is still described by the hint`);
      } else {
        // Opening the picker is what it asks for: gone, for good.
        await page.getByTestId("lang-button").click();
        await page.getByTestId("lang-picker").waitFor();
        check(!(await page.getByTestId("lang-hint").count()), `${where}: the hint stays with the picker open`);
        await page.keyboard.press("Escape");
        await page.getByTestId("lang-picker").waitFor({ state: "detached" });
      }
      await hintGone(page, `${where}: the hint came back once done`);
      check((await page.evaluate(() => localStorage.getItem("ulune.hint.lang.v1"))) === "1", `${where}: done is not kept`);
      await reload(page);
      await hintGone(page, `${where}: the hint came back after a reload`);
      check(!errors.length, `${where}: page errors: ${errors.join(" | ")}`);
    } finally {
      await context.close();
    }
  }
  // A new reader never gets it, and the answer is kept.
  const { context, page } = await open(1280);
  try {
    await sample(page);
    await page.getByTestId("lang-button").waitFor();
    await page.waitForTimeout(1500);
    check(!(await page.getByTestId("lang-hint").count()), "a new reader is shown the hint");
    check((await page.evaluate(() => localStorage.getItem("ulune.hint.lang.v1"))) === "1", "a new reader's answer is not kept");
  } finally {
    await context.close();
  }
  console.log("the 1.x reader's hint OK");
}

for (const fn of [computer, wide, phone, french, overflow, chinese, palette, phoneNames, fromOne]) {
  try {
    await fn();
  } catch (err) {
    fail.push(`${fn.name}: ${err instanceof Error ? err.message : err}`);
  }
}
await browser.close();
if (fail.length) {
  console.error("SECTIONS FAIL\n" + fail.map((f) => "- " + f).join("\n"));
  process.exit(1);
}
console.log("SECTIONS OK", DEV);
