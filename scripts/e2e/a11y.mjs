/**
 * Accessible names: every visible button, link, input and select has one,
 * and in French no aria-label is left in English. The keyboard: the tab
 * lists, the wheel's list, and no field hidden under a sticky button.
 *
 * The Chinese pages (languages plan, part 30), in English and French, held
 * to the plan's promise: the names above on each of the eight pages and
 * their tables; every figure named, with its table twin reached and left by
 * the keyboard (a caption, header cells, rows); each cell coloured by a
 * phase saying its phase in words, on screen or in its name; a figure drawn
 * with one Tab stop whose arrows walk its parts and whose Enter reads one;
 * Feng Shui's Home given its facing and year by typing alone, and its result
 * read.
 *
 * Contrast (_contrast.mjs, the review's T4), in the dark and light themes,
 * at 1280 and 390 px: every word, field edge, icon and focus ring of the
 * eight Chinese pages (Feng Shui's Home with its luopan and its stars; on a
 * computer, a part chosen and the table too) must pass WCAG's ratios; so
 * must the page's own text on a sample of Western pages (the chart, Transits,
 * Human Design, numerology, the Calendar, an encyclopedia page). The words a
 * Western chart draws in its planets' colours (glyphs and degrees in its
 * SVG) are listed, not failed: those colours are the chart's own, the
 * owner's call (review list).
 */
import { contrastScan, formatIssue } from "./_contrast.mjs";
import { FIXTURE_A, FIXTURE_B, castFixture, clickDockTab, ensureTheme, goStudioPage, gotoApp, launch, setLang, setView } from "./_lib.mjs";

const EN_WORDS = /\b(the|and|open|close|show|hide|zoom|chart|reading|remove|select|step|play|back|next|previous|settings|search)\b/i;

async function scan(page, tag, fr) {
  return page.evaluate(
    ({ tag, fr, en }) => {
      const out = [];
      const re = new RegExp(en, "i");
      const els = document.querySelectorAll("button, a[href], input:not([type=hidden]), select, textarea, [role=button], [role=tab], [role=radio], [role=option]");
      for (const el of els) {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        if (!r.width || !r.height || cs.visibility === "hidden" || cs.display === "none") continue;
        let name = el.getAttribute("aria-label") || "";
        const lb = el.getAttribute("aria-labelledby");
        if (!name && lb) name = lb.split(" ").map((id) => document.getElementById(id)?.textContent ?? "").join(" ");
        if (!name && el.id) name = document.querySelector(`label[for="${el.id}"]`)?.textContent ?? "";
        if (!name && el.closest("label")) name = el.closest("label").textContent ?? "";
        if (!name) name = (el.textContent ?? "").trim();
        if (!name) name = el.getAttribute("title") || el.getAttribute("placeholder") || "";
        const id = el.getAttribute("data-testid") || el.id || el.className?.toString().slice(0, 40);
        if (!name.trim()) out.push(`${tag}: no name → ${el.tagName.toLowerCase()} ${id}`);
        const aria = el.getAttribute("aria-label");
        if (fr && aria && re.test(aria)) out.push(`${tag}: English aria-label → "${aria}" (${id})`);
      }
      return out;
    },
    { tag, fr, en: EN_WORDS.source },
  );
}

const problems = [];
for (const lang of ["en", "fr"]) {
  const { browser, page } = await launch(1280);
  try {
    await gotoApp(page);
    if (lang === "fr") await setLang(page, "fr");
    await castFixture(page, FIXTURE_A);
    const fr = lang === "fr";
    for (const mode of ["natal", "transits", "timing", "synastry", "design", "design-pair", "numerology", "numerology-cycles", "numerology-pair"]) {
      await goStudioPage(page, mode).catch(() => {});
      await page.waitForTimeout(700);
      for (const tab of ["reading", "bodies", "look", "birth"]) {
        await clickDockTab(page, tab).catch(() => {});
        await page.waitForTimeout(200);
        problems.push(...(await scan(page, `${lang}/${mode}/${tab}`, fr)));
      }
      // The calendar's day and year too, with their panels.
      if (mode === "timing") {
        await clickDockTab(page, "reading").catch(() => {});
        for (const scope of ["day", "year"]) {
          await page.getByTestId(`timing-scope-${scope}`).click();
          await page.getByTestId(`calendar-${scope}`).waitFor({ timeout: 30000 });
          await page.waitForTimeout(1500);
          problems.push(...(await scan(page, `${lang}/${mode}/${scope}`, fr)));
        }
        await page.getByTestId("timing-scope-month").click();
      }
    }
  } finally {
    await browser.close();
  }
}
// The encyclopedia (part 22): its home with "In your chart", a gate's figures, the aspect dial,
// a page's Bookmark and its note's way in, in both languages; every figure a drawing with its
// description and a caption; the search reached, used and left by the keyboard alone.
for (const lang of ["en", "fr"]) {
  const { browser, page } = await launch(1280);
  const fr = lang === "fr";
  const tag = (t) => `${lang}/encyclopedia/${t}`;
  const go = async (id, query) => {
    if (!(await page.getByTestId("enc-search-input").count())) {
      await page.getByTestId("enc-crumbs").locator("a").first().click();
      await page.getByTestId("enc-home").waitFor({ timeout: 10000 });
    }
    await page.getByTestId("enc-search-input").fill("");
    await page.getByTestId("enc-search-input").pressSequentially(query, { delay: 20 });
    const hit = page.locator(`[data-testid=enc-results] [data-entry="${id}"] a`).first();
    await hit.waitFor({ timeout: 8000 });
    await hit.click();
    await page.getByTestId("enc-entry").waitFor({ timeout: 10000 });
    await page.waitForTimeout(800);
  };
  try {
    await gotoApp(page);
    if (fr) await setLang(page, "fr");
    await castFixture(page, FIXTURE_A);
    await page.locator("[data-testid=section-encyclopedia]:visible").first().click();
    await page.getByTestId("enc-home").waitFor({ timeout: 15000 });
    await page.getByTestId("enc-mine-index").waitFor({ timeout: 10000 });
    problems.push(...(await scan(page, tag("home"), fr)));
    for (const [id, q] of [["hd-gate-34", fr ? "porte 34" : "gate 34"], ["trine", fr ? "trigone" : "trine"], ["saturn", fr ? "saturne" : "saturn"]]) {
      await go(id, q);
      if (id === "saturn") {
        await page.getByTestId("enc-bookmark").click();
        await page.getByTestId("enc-keep-need").waitFor({ timeout: 5000 });
      }
      if (id === "trine") await page.getByTestId("enc-dial-range").waitFor({ timeout: 8000 });
      problems.push(...(await scan(page, tag(id), fr)));
      const figures = await page.evaluate(() =>
        [...document.querySelectorAll("[data-testid=enc-figure]")].map((f) => ({
          drawings: [...f.querySelectorAll("svg")].map((svg) => {
            const label = svg.getAttribute("aria-label") || (svg.getAttribute("aria-labelledby") ? document.getElementById(svg.getAttribute("aria-labelledby"))?.textContent : "");
            return svg.getAttribute("role") === "img" && (label ?? "").trim().length > 10;
          }),
          caption: (f.querySelector("figcaption")?.textContent ?? "").trim().length > 20,
        })),
      );
      for (const f of figures) if (!f.caption || !f.drawings.every(Boolean)) problems.push(`${tag(id)}: a figure without its text twin ${JSON.stringify(f)}`);
      if (id !== "saturn" && !figures.length) problems.push(`${tag(id)}: no figure`);
    }
    // The search by the keyboard alone: Tab to the field, type, Tab to the first result, Enter.
    await page.getByTestId("enc-crumbs").locator("a").first().click();
    await page.getByTestId("enc-home").waitFor({ timeout: 10000 });
    await page.evaluate(() => document.activeElement?.blur());
    let reached = false;
    for (let i = 0; i < 25 && !reached; i += 1) {
      await page.keyboard.press("Tab");
      reached = await page.evaluate(() => document.activeElement?.getAttribute("data-testid") === "enc-search-input");
    }
    if (!reached) problems.push(`${tag("search")}: Tab does not reach the search`);
    else {
      await page.keyboard.type(fr ? "lune" : "moon", { delay: 30 });
      await page.locator("[data-testid=enc-results] [data-entry] a").first().waitFor({ timeout: 8000 });
      let onResult = false;
      for (let i = 0; i < 10 && !onResult; i += 1) {
        await page.keyboard.press("Tab");
        onResult = await page.evaluate(() => Boolean(document.activeElement?.closest("[data-testid=enc-results] [data-entry]")));
      }
      if (!onResult) problems.push(`${tag("search")}: Tab does not reach the results`);
      else {
        await page.keyboard.press("Enter");
        await page.getByTestId("enc-entry").waitFor({ timeout: 10000 }).catch(() => problems.push(`${tag("search")}: Enter on a result does not open it`));
      }
    }
  } finally {
    await browser.close();
  }
}

// The keyboard: a menu takes the focus and gives it back, arrows move along
// tab strips, the wheel is one stop whose parts the arrows walk.
{
  const { browser, page } = await launch(1280);
  const fail = (msg) => problems.push(`keys: ${msg}`);
  const focused = () => page.evaluate(() => document.activeElement?.getAttribute("data-testid") ?? document.activeElement?.id ?? "");
  try {
    await gotoApp(page);
    await castFixture(page, FIXTURE_A);
    await goStudioPage(page, "natal");
    await clickDockTab(page, "reading");

    await page.getByTestId("account-menu").focus();
    await page.keyboard.press("Enter");
    await page.getByTestId("account-menu-panel").waitFor({ timeout: 8000 });
    await page.waitForTimeout(200);
    const inside = await page.evaluate(() =>
      Boolean(document.querySelector("[data-testid=account-menu-panel]")?.contains(document.activeElement)),
    );
    if (!inside) fail("the menu did not take the focus");
    const first = await focused();
    await page.keyboard.press("ArrowDown");
    if ((await focused()) === first) fail("ArrowDown did not move in the menu");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    if ((await focused()) !== "account-menu") fail(`the focus went to "${await focused()}" after Escape`);

    // The calendar's month: one Tab stop, the arrows walk the days, Page Down the months.
    await goStudioPage(page, "timing");
    await page.getByTestId("calendar-month").waitFor({ timeout: 30000 });
    const dayStops = await page.evaluate(() => [...document.querySelectorAll("[data-testid^=calendar-day-]")].filter((b) => b.tabIndex === 0).length);
    if (dayStops !== 1) fail(`the month has ${dayStops} Tab stops, not 1`);
    await page.locator("[data-testid^=calendar-day-][tabindex='0']").focus();
    const from = await focused();
    await page.keyboard.press("ArrowRight");
    const to = await focused();
    if (!/^calendar-day-/.test(to) || to === from) fail(`ArrowRight in the month went from ${from} to ${to}`);
    const caption = await page.getByTestId("timing-caption").innerText();
    await page.keyboard.press("PageDown");
    await page.waitForTimeout(600);
    if ((await page.getByTestId("timing-caption").innerText()) === caption) fail("Page Down did not open the next month");
    if (!/^calendar-day-/.test(await focused())) fail(`after Page Down the focus is on "${await focused()}"`);
    await goStudioPage(page, "natal");
    await clickDockTab(page, "reading");

    await page.getByTestId("dock-tab-reading").focus();
    await page.keyboard.press("ArrowRight");
    // The pane cross-fades (a view transition): the tab is chosen on its next frame.
    await page.waitForFunction(() => document.querySelector("[data-testid=dock-tab-bodies]")?.getAttribute("aria-selected") === "true", null, { timeout: 3000 }).catch(() => {});
    const dock = await page.evaluate(() => ({
      focus: document.activeElement?.getAttribute("data-testid"),
      chosen: document.querySelector("[data-testid=dock-tab-bodies]")?.getAttribute("aria-selected"),
      stops: [...document.querySelectorAll("[data-testid^=dock-tab-]")].filter((t) => t.tabIndex === 0).length,
    }));
    if (dock.focus !== "dock-tab-bodies" || dock.chosen !== "true" || dock.stops !== 1) fail(`dock tabs ${JSON.stringify(dock)}`);
    await page.keyboard.press("ArrowLeft");

    await page.getByTestId("lens-natal").focus();
    await page.keyboard.press("ArrowRight");
    const lens = await page.evaluate(() => ({
      focus: document.activeElement?.getAttribute("data-testid"),
      chosen: document.querySelector("[data-testid=lens-cycles]")?.getAttribute("aria-selected"),
      stops: [...document.querySelectorAll("[data-testid^=lens-]")].filter((t) => t.tabIndex === 0).length,
    }));
    if (lens.focus !== "lens-cycles" || lens.chosen === "true" || lens.stops !== 1) fail(`lenses ${JSON.stringify(lens)}`);
    await page.keyboard.press("ArrowLeft");

    const list = page.getByTestId("wheel-keys");
    await list.focus();
    await page.waitForTimeout(150);
    const a = await list.getAttribute("aria-activedescendant");
    await page.keyboard.press("ArrowDown");
    const b = await list.getAttribute("aria-activedescendant");
    if (!a || !b || a === b) fail(`the wheel's arrows: ${a} → ${b}`);
    const name = await page.evaluate((id) => document.getElementById(id)?.textContent?.trim() ?? "", b);
    await page.keyboard.press("PageDown");
    const kindJump = await list.getAttribute("aria-activedescendant");
    if (kindJump === b) fail("Page Down did not move");
    await page.keyboard.press("PageUp");
    await page.keyboard.press("Home");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await page.getByTestId("click-note").waitFor({ timeout: 8000 });
    const said = (await page.getByTestId("wheel-keys-said").textContent()) ?? "";
    if (!name || !said.includes(name)) fail(`said "${said}" for "${name}"`);
    const stops = await page.evaluate(() => document.querySelectorAll('svg.ulune-wheel [tabindex="0"]').length);
    if (stops) fail(`${stops} parts of the wheel are still Tab stops`);
  } finally {
    await browser.close();
  }
}

// A field reached with Tab is never hidden under the Cast button that sticks to
// the bottom of the form below 768 px (WCAG 2.4.11): on a phone, on a laptop at 200%.
for (const [width, height] of [[390, 664], [640, 450]]) {
  const { browser, page } = await launch({ width, height });
  try {
    await gotoApp(page);
    await page.waitForSelector("#native-name");
    const names = page.getByTestId("birth-names");
    if ((await names.count()) && !(await names.evaluate((el) => el.open))) await names.locator("summary").click();
    await page.evaluate(() => document.activeElement?.blur());
    for (let i = 0; i < 30; i += 1) {
      await page.keyboard.press("Tab");
      await page.waitForTimeout(100);
      const r = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body || !el.closest("form")) return null;
        const b = el.getBoundingClientRect();
        const top = document.elementFromPoint(b.left + b.width / 2, Math.min(innerHeight - 1, b.top + b.height / 2));
        const hidden = b.bottom > innerHeight || !(top === el || el.contains(top) || top?.contains(el));
        return { id: el.id || el.getAttribute("data-testid") || el.tagName.toLowerCase(), hidden, under: top?.getAttribute("data-testid") ?? top?.tagName };
      });
      if (!r) continue;
      if (r.hidden) problems.push(`focus: ${width}×${height}: ${r.id} hidden under ${r.under}`);
      if (r.id === "cast-submit") break;
    }
  } finally {
    await browser.close();
  }
}

/* --------------------------------------------- the Chinese pages (part 30) */

const CHINESE = ["zodiac", "zodiac-years", "zodiac-pair", "bazi", "bazi-luck", "bazi-pair", "fengshui", "fengshui-cycles", "fengshui-pair", "fengshui-home"];
/** Each page's table twin, shown by the toolbar's Table. */
const TWIN = {
  zodiac: "zodiac-table",
  "zodiac-years": "zodiac-years-table",
  "zodiac-pair": "zodiac-pair-table",
  bazi: "bazi-table",
  "bazi-luck": "bazi-luck-table",
  "bazi-pair": "bazi-pair-table",
  fengshui: "fengshui-table",
  "fengshui-cycles": "fengshui-cycles-table",
  "fengshui-pair": "fengshui-pair-table",
  "fengshui-home": "fengshui-home-table",
};
/** Each page's figure, waited for before it is measured. */
const FIGURE = {
  zodiac: "zodiac-wheel",
  "zodiac-years": "zodiac-years",
  "zodiac-pair": "zodiac-pair",
  bazi: "bazi-board",
  "bazi-luck": "bazi-luck",
  "bazi-pair": "bazi-pair",
  fengshui: "fengshui",
  "fengshui-cycles": "fengshui-cycles",
  "fengshui-pair": "fengshui-pair",
  "fengshui-home": "fengshui-home",
};
const PHASE_WORDS = {
  en: { wood: "wood", fire: "fire", earth: "earth", metal: "metal", water: "water" },
  fr: { wood: "bois", fire: "feu", earth: "terre", metal: "métal", water: "eau" },
};

/** Feng Shui's Home given what a reader gives it (a facing, a year, a room), so its stars and plan are drawn. */
async function fillHome(page) {
  await page.getByTestId("fengshui-home-facing").fill("180");
  await page.getByTestId("fengshui-home-year").fill("1998");
  await page.getByTestId("fengshui-rooms-add-n").selectOption("bedroom");
  await page.getByTestId("fengshui-stars").waitFor({ timeout: 8000 });
}

/** The figures, their names, their phases in words and their headings, as the page shows them now. */
async function figureFacts(page, lang) {
  return page.evaluate((words) => {
    const nameOf = (el) => {
      let n = el.getAttribute("aria-label") || "";
      const lb = el.getAttribute("aria-labelledby");
      if (!n && lb) n = lb.split(" ").map((x) => document.getElementById(x)?.textContent ?? "").join(" ");
      return n.trim();
    };
    const out = { unnamed: [], unsaid: [], emptyHeads: 0, inMain: Boolean(document.querySelector("main .ob-figure")) };
    // Every drawing of the stage that is not hidden is a named image or group.
    for (const svg of document.querySelectorAll(".ob-figure svg")) {
      if (svg.ownerSVGElement || svg.closest("[aria-hidden=true]") || !svg.checkVisibility()) continue;
      const r = svg.getBoundingClientRect();
      if (r.width < 90 || r.height < 90) continue;
      if (!["img", "group"].includes(svg.getAttribute("role") ?? "") || nameOf(svg).length < 4) out.unnamed.push(svg.getAttribute("data-testid") || svg.getAttribute("class") || "svg");
    }
    // A cell coloured by its phase says the phase: in its words on screen, or in its name.
    for (const el of document.querySelectorAll("[data-phase]")) {
      const word = words[el.getAttribute("data-phase")];
      if (!word || !el.checkVisibility()) continue;
      // The luopan's ring of directions is a drawing for the eye alone (its parts are the mountains around it).
      if (el.closest("[aria-hidden=true]")) continue;
      const cell = el.closest("button, [role=button], a, li, td, th") || el;
      const name = (nameOf(cell) || cell.textContent || "").toLowerCase();
      const shown = (cell.textContent || "").toLowerCase();
      if (!name.includes(word) && !shown.includes(word)) {
        out.unsaid.push(`${cell.getAttribute("data-testid") || cell.getAttribute("class")?.split(" ")[0] || cell.tagName} (${el.getAttribute("data-phase")}): “${(nameOf(cell) || cell.textContent || "").trim().slice(0, 60)}”`);
      }
    }
    for (const h of document.querySelectorAll(".ob-stage :is(h1, h2, h3, h4), .ob-panel :is(h1, h2, h3, h4)")) {
      if (h.checkVisibility() && !(h.textContent ?? "").trim()) out.emptyHeads += 1;
    }
    return out;
  }, PHASE_WORDS[lang]);
}

/** A figure drawn with one Tab stop: the arrows walk its parts, Enter chooses the part reached. */
async function figureKeys(page, fail) {
  const groups = await page.evaluate(() =>
    [...document.querySelectorAll(".ob-figure svg")]
      .filter((svg) => !svg.ownerSVGElement && svg.checkVisibility())
      .map((svg) => {
        const parts = [...svg.querySelectorAll("[role=button][tabindex]")];
        return { id: svg.getAttribute("data-testid") ?? "", n: parts.length, stops: parts.filter((p) => p.getAttribute("tabindex") === "0").map((p) => p.getAttribute("data-testid")) };
      })
      .filter((g) => g.n > 1),
  );
  for (const g of groups) {
    if (g.stops.length !== 1) {
      fail(`${g.id}: ${g.stops.length} Tab stops among its ${g.n} parts, not 1`);
      continue;
    }
    await page.getByTestId(g.stops[0]).focus();
    await page.keyboard.press("ArrowRight");
    const next = await page.evaluate(() => document.activeElement?.getAttribute("data-testid") ?? "");
    if (!next || next === g.stops[0]) {
      fail(`${g.id}: the arrow leaves the focus on ${g.stops[0]}`);
      continue;
    }
    await page.keyboard.press("Enter");
    const chosen = await page
      .waitForFunction((t) => document.querySelector(`[data-testid="${t}"]`)?.getAttribute("aria-pressed") === "true", next, { timeout: 4000 })
      .then(() => true, () => false);
    if (!chosen) {
      fail(`${g.id}: Enter does not choose ${next}`);
      continue;
    }
    // Escape, the focus still on that part (an SVG element, not an HTML one), lets go of it (review of 2.0's week 3).
    await page.keyboard.press("Escape");
    const free = await page
      .waitForFunction((t) => document.querySelector(`[data-testid="${t}"]`)?.getAttribute("aria-pressed") !== "true", next, { timeout: 4000 })
      .then(() => true, () => false);
    if (!free) fail(`${g.id}: Escape on ${next} does not let go of it`);
  }
  return groups.length;
}

/** The table twin, reached and left by the keyboard: a caption or a name, header cells, rows. */
async function tableTwin(page, id, tag, fr, fail) {
  const sw = page.getByTestId("view-table");
  const reachable = await sw.evaluate((b) => b.checkVisibility() && b.tabIndex >= 0 && !b.disabled).catch(() => false);
  if (!reachable) return fail("no Table switch the keyboard reaches");
  await sw.focus();
  await page.keyboard.press("Enter");
  const twin = page.getByTestId(TWIN[id]);
  if (!(await twin.waitFor({ timeout: 15000 }).then(() => true, () => false))) return fail(`Table does not show ${TWIN[id]}`);
  await page.waitForTimeout(300);
  const tables = await twin.evaluate((el) => {
    const named = (n) => (n ? (n.getAttribute("aria-label") || (n.getAttribute("aria-labelledby") ? document.getElementById(n.getAttribute("aria-labelledby"))?.textContent : "") || "").trim() : "");
    return (el.matches("table") ? [el] : [...el.querySelectorAll("table")]).map((t) => ({
      // Its caption or name, or (the tables' house style) the named section its heading opens.
      name: (t.querySelector("caption")?.textContent || "").trim() || named(t) || named(t.closest("section[aria-labelledby], section[aria-label], [role=region]")),
      heads: t.querySelectorAll("th").length,
      rows: t.querySelectorAll("tbody tr").length,
    }));
  });
  if (!tables.length) fail(`${TWIN[id]} holds no table`);
  for (const [i, t] of tables.entries()) {
    if (!t.name) fail(`${TWIN[id]}: table ${i + 1} has no caption nor name, nor a named section`);
    if (!t.heads || !t.rows) fail(`${TWIN[id]}: table ${i + 1} has ${t.heads} header cells, ${t.rows} rows`);
  }
  problems.push(...(await scan(page, `${tag}/table`, fr)));
  const back = page.getByTestId("view-wheel");
  await back.focus();
  await page.keyboard.press("Enter");
  if (!(await twin.waitFor({ state: "detached", timeout: 8000 }).then(() => true, () => false))) fail("the figure's switch does not leave the table");
}

/**
 * Feng Shui's Home by the keyboard alone, for a reader who cannot hold a
 * phone to the door (the plan): Tab to the facing, type it, Tab on to the
 * year built, type it; the stars are drawn, and Tab reaches the facing's card,
 * which says the degrees and the direction.
 */
async function homeByKeys(page, fr, fail) {
  const at = () => page.evaluate(() => document.activeElement?.getAttribute("data-testid") ?? "");
  const tabTo = async (testId, max) => {
    for (let i = 0; i < max; i += 1) {
      if ((await at()) === testId) return true;
      await page.keyboard.press("Tab");
    }
    return (await at()) === testId;
  };
  await page.evaluate(() => document.activeElement?.blur());
  await page.getByTestId("lens-home").focus();
  if (!(await tabTo("fengshui-home-facing", 80))) return fail(`Tab does not reach the facing (it stops on ${await at()})`);
  await page.keyboard.type("180", { delay: 25 });
  if (!(await tabTo("fengshui-home-year", 8))) return fail(`from the facing, Tab does not reach the year (it stops on ${await at()})`);
  await page.keyboard.type("1998", { delay: 25 });
  if (!(await page.getByTestId("fengshui-stars").waitFor({ timeout: 8000 }).then(() => true, () => false))) return fail("no Flying Stars after typing a facing and a year");
  if ((await at()) !== "fengshui-home-year") return fail(`the focus left the year for ${await at()} while the stars were drawn`);
  if (!(await tabTo("fengshui-home-facing-card", 40))) return fail(`Tab does not reach the facing's card (it stops on ${await at()})`);
  const said = await page.getByTestId("fengshui-home-facing-card").evaluate((b) => b.getAttribute("aria-label") || b.textContent || "");
  if (!/180/.test(said) || !(fr ? /\bsud\b/i : /\bsouth\b/i).test(said)) fail(`the facing's card says “${said.slice(0, 120)}”`);
}

for (const lang of ["en", "fr"]) {
  const { browser, page } = await launch(1280);
  const fr = lang === "fr";
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  try {
    await gotoApp(page);
    if (fr) await setLang(page, "fr");
    await castFixture(page, FIXTURE_B);
    await castFixture(page, FIXTURE_A);
    let walked = 0;
    for (const id of CHINESE) {
      const tag = `${lang}/${id}`;
      const fail = (msg) => problems.push(`chinese: ${tag} — ${msg}`);
      await goStudioPage(page, id);
      await page.getByTestId(FIGURE[id]).waitFor({ timeout: 20000 }).catch(() => fail(`no ${FIGURE[id]}`));
      await page.waitForTimeout(700);
      if (id === "fengshui-home") {
        await homeByKeys(page, fr, fail);
        await page.getByTestId("fengshui-rooms-add-n").selectOption("bedroom").catch(() => fail("no room to add"));
      }
      for (const tab of ["reading", "look", "birth"]) {
        await clickDockTab(page, tab).catch(() => {});
        await page.waitForTimeout(200);
        problems.push(...(await scan(page, `${tag}/${tab}`, fr)));
      }
      await clickDockTab(page, "reading").catch(() => {});
      // On Home, the luopan too: its mountains are cells in their phases' colours.
      for (const figure of id === "fengshui-home" ? ["stars", "luopan"] : [null]) {
        if (figure) {
          await page.getByTestId(`fengshui-home-fig-${figure}`).click();
          await page.waitForTimeout(300);
        }
        const facts = await figureFacts(page, lang);
        if (!facts.inMain) fail("the stage's figure is not inside the main landmark");
        for (const u of facts.unnamed) fail(`a figure without a role and a name: ${u}`);
        for (const u of facts.unsaid) fail(`a phase shown by its colour alone: ${u}`);
        if (facts.emptyHeads) fail(`${facts.emptyHeads} empty headings`);
        walked += await figureKeys(page, fail);
        problems.push(...(await scan(page, `${tag}/${figure ?? "figure"}`, fr)));
      }
      await tableTwin(page, id, tag, fr, fail);
    }
    // The wheel (twice: astrology's and Pair's), two roses, the dial and the palaces.
    if (walked < 5) problems.push(`chinese: ${lang} — only ${walked} figures walked by the keyboard`);
    if (errors.length) problems.push(`chinese: ${lang} — page errors: ${errors.join(" | ")}`);
  } finally {
    await browser.close();
  }
}

/* ------------------------------------------------------ contrast (part 30) */

/** The part chosen on each Chinese page, on a computer: its cell takes its "on" tint and the side panel reads it. */
const CHOOSE = {
  zodiac: "zodiac-card-year",
  "zodiac-years": "zodiac-year",
  "zodiac-pair": "zodiac-pair-year-year",
  bazi: "bazi-branch-day",
  "bazi-luck": "bazi-luck-yang-2",
  "bazi-pair": "bazi-pair-a-day-branch",
  fengshui: "fengshui-wedge-yang-s",
  "fengshui-cycles": "fengshui-cycles-wedge-yang-s",
  "fengshui-pair": "fengshui-pair-wedge-s",
  "fengshui-home": "fengshui-stars-main-c",
};
const WESTERN = ["natal", "transits", "design", "design-pair", "numerology", "timing"];
const contrastCounts = [];
/** Per Western page and theme: the words its chart draws in its own colours, under the ratio (listed, not failed). */
const westernDrawn = new Map();

async function measure(page, label, chinese) {
  const res = await contrastScan(page);
  contrastCounts.push(`${label}: ${res.issues.length} of ${res.checked}`);
  for (const i of res.issues) {
    if (!chinese && i.svg && i.kind === "text") {
      const d = westernDrawn.get(label) ?? { n: 0, min: 21, max: 0, kinds: new Set() };
      d.n += i.count;
      d.min = Math.min(d.min, i.ratio);
      d.max = Math.max(d.max, i.ratio);
      d.kinds.add(i.sel.split(" > ").pop().replace(/\[.*\]/, ""));
      westernDrawn.set(label, d);
      continue;
    }
    problems.push(`contrast: ${label} — ${formatIssue(i)}`);
  }
}

for (const width of [1280, 390]) {
  const { browser, page } = await launch(width);
  const desk = width >= 1024;
  try {
    await gotoApp(page);
    await castFixture(page, FIXTURE_B);
    await castFixture(page, FIXTURE_A);
    let homeFilled = false;
    for (const theme of ["dark", "light"]) {
      await ensureTheme(page, theme);
      // The themes cross-fade (styles.css, --dur-theme): measured once settled.
      await page.waitForTimeout(500);
      for (const id of CHINESE) {
        const label = `${theme} ${width} ${id}`;
        await goStudioPage(page, id);
        await page.getByTestId(FIGURE[id]).waitFor({ timeout: 20000 });
        if (id === "fengshui-home" && !homeFilled) {
          await fillHome(page);
          homeFilled = true;
        }
        await page.waitForTimeout(900);
        if (id === "fengshui-home") {
          await page.getByTestId("fengshui-home-fig-luopan").click();
          await page.waitForTimeout(400);
          await measure(page, `${label} luopan`, true);
          await page.getByTestId("fengshui-home-fig-stars").click();
          await page.waitForTimeout(400);
        }
        await measure(page, label, true);
        if (!desk) continue;
        // A part chosen: its cell's "on" tint, and its reading in the side panel.
        await page.getByTestId(CHOOSE[id]).evaluate((el) => el.scrollIntoView({ block: "center" }));
        await page.getByTestId(CHOOSE[id]).click();
        await page.getByTestId("click-note").waitFor({ timeout: 8000 }).catch(() => problems.push(`contrast: ${label} — choosing ${CHOOSE[id]} opened no reading`));
        await page.waitForTimeout(500);
        await measure(page, `${label} chosen`, true);
        await page.keyboard.press("Escape");
        // Its table twin.
        await setView(page, "table");
        await page.getByTestId(TWIN[id]).waitFor({ timeout: 15000 });
        await page.waitForTimeout(400);
        await measure(page, `${label} table`, true);
        await setView(page, "wheel");
      }
      for (const id of WESTERN) {
        await goStudioPage(page, id);
        if (id === "timing") await page.getByTestId("calendar-month").waitFor({ timeout: 30000 });
        await page.waitForTimeout(1200);
        await measure(page, `${theme} ${width} ${id}`, false);
      }
    }
    // An encyclopedia page, in both themes.
    await gotoApp(page, "/encyclopedia/saturn");
    await page.getByTestId("enc-entry").waitFor({ timeout: 20000 });
    for (const theme of ["dark", "light"]) {
      await ensureTheme(page, theme);
      await page.waitForTimeout(600);
      await measure(page, `${theme} ${width} encyclopedia/saturn`, false);
    }
  } finally {
    await browser.close();
  }
}
console.log(`contrast, measured (issues of elements): ${contrastCounts.join(" · ")}`);
if (westernDrawn.size) {
  console.log("contrast, words the Western charts draw in their own colours (glyphs, degrees), under the ratio — for the owner, not failed:");
  for (const [label, d] of westernDrawn) console.log(`  ${label}: ${d.n}, ${d.min}–${d.max}:1 (${[...d.kinds].slice(0, 4).join(", ")})`);
}

const uniq = [...new Set(problems.map((p) => p.replace(/^[^:]+: /, "")))];
if (uniq.length) {
  console.log(uniq.join("\n"));
  console.log(`A11Y FAIL ${uniq.length}`);
  process.exit(1);
}
console.log("A11Y OK");
