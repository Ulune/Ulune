/*
 * Compare, two charts side by side (share and compare plan, feature 2, steps
 * 2 and 3, and idea B9), with two made-up charts (Fixture B, then Fixture A
 * shown), at 1440 px in English, 1280 in French, 768 and 390 held upright
 * in English:
 *   - the ways in: the toolbar's button (⋯ on a tablet or a phone) and the
 *     chart switcher's "Compare with…"; B is the person chosen;
 *   - the layout rule: the reading in the side panel from about 1360 px,
 *     from the bottom under it (the sheet, folded to start with), the two
 *     stacked on a phone held upright, where a chart's label shows it full
 *     size for a moment (✕ or Escape, the focus back on the label);
 *   - on every page Compare shows (astrology's Natal, Transits and
 *     Progressions; Human Design and its Cycles; numerology and its Cycles; Chinese
 *     astrology and its Cycles; BaZi and its Cycles; Feng Shui's Kua and
 *     its Cycles): both
 *     panes draw, each its own person's data; a choice in A chooses the same
 *     in B (linked selection), the reading for two shows both, a chart
 *     lacking the element says so; with linked selection off a choice is its
 *     chart's only and the reading follows it; "What they share" chooses in
 *     both; Escape lets go;
 *   - the tables, two side by side, and numerology's and BaZi's one table with
 *     A and B columns;
 *   - Swap; leaving Compare returns to the page as it was (its choice, its
 *     view, where its stage was scrolled); a Relationship page, the Calendar
 *     and Feng Shui's Home leave Compare; "See how they meet" opens Synastry
 *     with the same two people;
 *   - "Both side by side" downloads one PNG; the keyboard: Tab goes from A
 *     to B, the arrows walk a figure without leaving its pane;
 *   - no element id twice, nothing sent but the calculations, nothing in the
 *     address, nothing scrolls sideways;
 *   - (1440) kept after a reload with a private space (B and linked
 *     selection with it), and nowhere in the clear.
 * Ideas B7 and B8 ("more"), with two more made-up charts (the fixtures'
 * births under other names):
 *   - three and four people at 1920, 1440 (French), 1024 and 390: added from
 *     the bar and taken out again, each pane named "Chart C: …", standing in
 *     a row or a grid of two by two (three: a row, or a grid whose third
 *     takes its row; one above the other on a phone); linked selection
 *     across all four, the reading a short list, names first; what all four
 *     share; numerology's one table with four columns (1440); Show mode with
 *     four; "All side by side"; Human Design's summary in small panes
 *     (a laptop's narrow ones, 1440's low ones);
 *   - one person in two languages (1440, 390): astrology beside Human Design
 *     with "Where they agree" (the Sun's gate), no linked selection, BaZi
 *     beside numerology with no list; one chart at two moments: numerology's
 *     this year beside next year, each stepped alone, the birth chart beside
 *     its transits and the bodygraph beside its Cycles, B's dial moving B
 *     alone;
 *   - a finger (390): Compare's bar, the panes' labels and their own page
 *     controls at 44 px in the three ways (Human Design's layers beside
 *     astrology, numerology's year beside itself), one person's pane keeping
 *     its page's list beside its letter;
 *   - the ways and their choices kept after a reload with a private space.
 * One width by hand: node scripts/e2e/compare.mjs 390; the new legs alone:
 * node scripts/e2e/compare.mjs more (or 1024,more).
 */
import { FIXTURE_A, FIXTURE_B, PAGE_PLACE, assertNoOverflow, castFixture, clickTestId, createSpace, gotoApp, goStudioPage, launch, openExport, readSpaceRecord, serverFnName, setLang, setSpaceLock, setView } from "./_lib.mjs";
import { watchSent } from "./_sent.mjs";
import { chromium } from "playwright";

/** Each page: where both panes have drawn, what a press chooses (and what the other chart is asked for). */
const PAGES = [
  { id: "natal", ready: "svg[data-depth-base] [data-kind=planet][data-body=sun]", wheel: "sun", want: "planet:sun", shared: true },
  { id: "transits", ready: "svg[data-depth-base] [data-kind=planet][data-body=sun]", wheel: "sun" },
  { id: "progressions", ready: "svg[data-depth-base] [data-kind=planet][data-body=sun]", wheel: "sun" },
  { id: "design", ready: ".ulune-hd-gate:not([data-tone=off])", press: "[data-testid=hd-fact-type]", want: "hello:type", shared: true, lacks: true },
  // Human Design's Cycles (feature 5b): each bodygraph under the one moment; the week's Sun, chosen in both.
  { id: "design-cycles", ready: "[data-testid=hd-cycles-week]", press: "[data-testid=hd-cycles-week]", want: "hdc:week" },
  { id: "numerology", ready: "[data-testid=numerology-tile-lifepath]", press: "[data-testid=numerology-tile-lifepath]", want: "core:lifepath", merged: "num-merged-lifepath" },
  { id: "numerology-cycles", ready: "[data-testid=num-month-1]", press: "[data-testid=num-month-1]" },
  { id: "zodiac", ready: "[data-testid=zodiac-card-year]", press: "[data-testid=zodiac-card-year]", want: "zk:year", shared: true },
  { id: "zodiac-years", ready: "[data-testid=zodiac-year]", press: "[data-testid=zodiac-year]" },
  { id: "bazi", ready: "[data-testid=bazi-stem-day]", press: "[data-testid=bazi-stem-day]", want: "bz:stem:day", shared: true, merged: "bazi-merged-day" },
  { id: "bazi-luck", ready: "[data-testid=bazi-flow-year]", press: "[data-testid=bazi-flow-year]" },
  { id: "fengshui", ready: "[data-testid^=fengshui-kua-]", press: "[data-testid^=fengshui-kua-]", shared: true, keys: "[data-dir][tabindex='0']" },
  // Feng Shui's Cycles (feature 5d): the year in practice, each in their own count; what they share, the directions both rest.
  { id: "fengshui-cycles", ready: "[data-testid^=fengshui-cycles-you-]", press: "[data-testid^=fengshui-cycles-you-]", want: "fsc:yang:you", shared: true },
];

const RUNS = [
  { width: 1440, lang: "en", size: { width: 1440, height: 900 }, reading: "beside", layout: "side" },
  { width: 1280, lang: "fr", size: { width: 1280, height: 900 }, reading: "sheet", layout: "side" },
  { width: 768, lang: "en", size: { width: 768, height: 1024 }, reading: "sheet", layout: "side" },
  { width: 390, lang: "en", size: { width: 390, height: 844 }, reading: "sheet", layout: "stacked" },
];

const pane = (who) => `[data-testid=compare-pane-${who}]`;
const attr = (page, sel, name) => page.evaluate(([s, n]) => document.querySelector(s)?.getAttribute(n) ?? null, [sel, name]);
const selectedOf = (page) => page.evaluate(() => ["a", "b"].map((w) => document.querySelector(`[data-testid=compare-pane-${w}]`)?.getAttribute("data-selected") ?? null));

/** Every id on the page that more than one element carries. */
const duplicateIds = (page) =>
  page.evaluate(() => {
    const seen = new Map();
    for (const el of document.querySelectorAll("[id]")) if (el.id) seen.set(el.id, (seen.get(el.id) ?? 0) + 1);
    return [...seen].filter(([, n]) => n > 1).map(([id, n]) => `${id}×${n}`);
  });

/** What the calculations may ask of Ulune's server (each pane casts its own chart's sky): nothing else. */
const CALCS = /^(castChart|castTransits|castProgressions|castHumanDesign)/;
const SKY = /^(?:GET|POST) \/api\/sky-(?:window|year)\b/;
function beyondCasts(sent, page) {
  return sent.filter((why) => {
    if (SKY.test(why)) return false;
    const m = /^POST (\/_serverFn\/\S+)/.exec(why);
    return !(m && CALCS.test(serverFnName(`${new URL(page.url()).origin}${m[1]}`)));
  });
}

async function enterFromToolbar(page) {
  if (await page.getByTestId("compare-toggle").isVisible().catch(() => false)) await page.getByTestId("compare-toggle").click();
  else {
    await page.getByTestId("stage-more").click();
    await page.getByTestId("more-compare").click();
  }
  await page.getByTestId("compare").waitFor({ timeout: 15000 });
}

async function leave(page) {
  await page.getByTestId("compare-leave").click();
  await page.getByTestId("compare").waitFor({ state: "detached", timeout: 8000 });
}

/** Presses the page's piece in one pane: a wheel's body where it is drawn, else the element itself. */
async function press(page, spec, who) {
  const root = page.locator(pane(who));
  // Its pane in view first (three or four on a phone scroll, two to a screen), its figure laid out there.
  await root.evaluate((el) => el.scrollIntoView({ block: "nearest" }));
  await page.waitForTimeout(150);
  if (spec.wheel) {
    const halo = root.locator(`svg[data-depth-base] [data-kind=planet][data-body=${spec.wheel}] .ulune-wheel-halo`).first();
    await halo.scrollIntoViewIfNeeded();
    const box = await halo.boundingBox();
    if (!box) throw new Error(`${who}: no ${spec.wheel} on the wheel`);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  } else {
    const el = root.locator(spec.press).first();
    await el.scrollIntoViewIfNeeded();
    await el.click();
  }
}

async function waitSelected(page, label, test, what) {
  await page
    .waitForFunction(
      (src) => {
        const [a, b] = ["a", "b"].map((w) => document.querySelector(`[data-testid=compare-pane-${w}]`)?.getAttribute("data-selected") ?? "");
        return new Function("a", "b", `return ${src}`)(a, b);
      },
      test,
      { timeout: 8000 },
    )
    .catch(async () => {
      throw new Error(`${label}: ${what}, the panes chose ${JSON.stringify(await selectedOf(page))}`);
    });
}

/** The reading for two, open (the sheet raised where the reading comes from the bottom). */
async function openReading(page, run) {
  if (run.reading === "beside") return;
  const card = page.getByTestId("compare-card-read");
  if (await card.isVisible().catch(() => false)) await card.click();
  else if ((await attr(page, "[data-testid=dock]", "data-dock-open")) !== "true") await clickTestId(page, "dock-tab-reading");
  await page.waitForFunction(() => document.querySelector("[data-testid=dock]")?.getAttribute("data-dock-open") === "true", null, { timeout: 6000 });
}

/** The sheet folded again (where the reading comes from the bottom), so the panes are whole. */
async function foldSheet(page, run) {
  if (run.reading === "beside") return;
  if ((await attr(page, "[data-testid=dock]", "data-dock-open")) !== "true") return;
  await page.evaluate(() => {
    const tab = document.querySelector('[data-testid^="dock-tab-"][aria-selected="true"]');
    if (tab instanceof HTMLElement) tab.click();
  });
  await page.waitForFunction(() => document.querySelector("[data-testid=dock]")?.getAttribute("data-dock-open") === "false", null, { timeout: 6000 });
}

async function checkPage(page, spec, run, errors) {
  const label = `${run.width} ${run.lang} ${spec.id}`;
  await goStudioPage(page, spec.id);
  await page.getByTestId("compare").waitFor({ timeout: 8000 }).catch(() => {
    throw new Error(`${label}: Compare left on a page it shows`);
  });
  if ((await attr(page, "[data-testid=compare]", "data-page")) !== spec.id) {
    await page.waitForFunction((id) => document.querySelector("[data-testid=compare]")?.getAttribute("data-page") === id, spec.id, { timeout: 8000 });
  }
  for (const who of ["a", "b"]) {
    await page.locator(`${pane(who)} ${spec.ready}`).first().waitFor({ state: "attached", timeout: 25000 }).catch(() => {
      throw new Error(`${label}: pane ${who} drew no figure`);
    });
  }
  // Each pane its own person's data.
  const [ta, tb] = await page.evaluate(() => ["a", "b"].map((w) => document.querySelector(`[data-testid=compare-pane-${w}] .ob-figure`)?.textContent ?? ""));
  if (!ta.trim() || !tb.trim() || ta === tb) throw new Error(`${label}: the panes draw ${ta === tb ? "the same thing" : "nothing"}`);
  const charts = await page.evaluate(() => ["a", "b"].map((w) => document.querySelector(`[data-testid=compare-pane-${w}]`)?.getAttribute("data-chart")));
  if (!charts[0] || !charts[1] || charts[0] === charts[1]) throw new Error(`${label}: panes for charts ${charts}`);

  // Linked selection: a choice in A is B's too, and the reading reads both.
  await page.keyboard.press("Escape");
  await press(page, spec, "a");
  await waitSelected(page, label, "a && b && (a === b || a.replace(/(yang|yin)/, '') === b.replace(/(yang|yin)/, ''))", "a choice in A was not B's");
  const [sa] = await selectedOf(page);
  if (spec.want && sa !== spec.want) throw new Error(`${label}: A chose "${sa}", not ${spec.want}`);
  await openReading(page, run);
  await page.waitForFunction(() => ["a", "b"].every((w) => ["read", "lacks"].includes(document.querySelector(`[data-testid=compare-side-${w}]`)?.getAttribute("data-state") ?? "")), null, { timeout: 15000 }).catch(async () => {
    throw new Error(`${label}: the reading for two did not come: ${await page.evaluate(() => ["a", "b"].map((w) => document.querySelector(`[data-testid=compare-side-${w}]`)?.getAttribute("data-state")).join(", "))}`);
  });
  if ((await attr(page, "[data-testid=compare-side-a]", "data-state")) !== "read") throw new Error(`${label}: A's own reading is missing`);
  const heads = await page.evaluate(() => ["a", "b"].map((w) => document.querySelector(`[data-testid=compare-who-${w}]`)?.textContent ?? ""));
  if (!heads[0].includes("A ·") || !heads[1].includes("B ·")) throw new Error(`${label}: the readings' headings say ${heads}`);
  await foldSheet(page, run);

  // Linked selection off: a choice is its chart's only, the reading follows it; on again, B follows.
  await page.keyboard.press("Escape");
  await waitSelected(page, label, "!a && !b", "Escape did not let go of both");
  await page.getByTestId("compare-link").click();
  if ((await attr(page, "[data-testid=compare-link]", "aria-checked")) !== "false") throw new Error(`${label}: the link switch did not switch off`);
  await press(page, spec, "b");
  await waitSelected(page, label, "!a && b", "with the link off, a choice in B was A's too");
  await openReading(page, run);
  await page.getByTestId("compare-one").waitFor({ timeout: 8000 }).catch(() => {
    throw new Error(`${label}: with the link off, the reading is not the one chart's`);
  });
  await foldSheet(page, run);
  await page.getByTestId("compare-link").click();
  await waitSelected(page, label, "a && b", "linked again, A did not follow B");
  await page.keyboard.press("Escape");
  await waitSelected(page, label, "!a && !b", "Escape did not let go");

  // What they share: an item chooses its element in both charts.
  if (spec.shared) {
    await openReading(page, run);
    const item = page.locator("[data-testid=compare-shared] [data-testid^=compare-shared-]").first();
    await page.locator("[data-testid=compare-shared] li, [data-testid=compare-shared-none]").first().waitFor({ timeout: 10000 });
    if (await item.count()) {
      const ids = (await item.getAttribute("data-ids")).split("|");
      await item.click();
      await waitSelected(page, label, `a === ${JSON.stringify(ids[0])} && b === ${JSON.stringify(ids[1])}`, `"What they share" (${ids}) did not choose in both`);
      await page.keyboard.press("Escape");
    }
    await foldSheet(page, run);
  }
  // A chart lacking the element says so (Human Design: a gate only A has).
  if (spec.lacks) {
    const gate = await page.evaluate(() => {
      const has = (w) => new Set([...document.querySelectorAll(`[data-testid=compare-pane-${w}] .ulune-hd-gate:not([data-tone=off])`)].map((g) => g.getAttribute("data-testid")));
      const a = has("a");
      const b = has("b");
      return [...a].find((g) => g && !b.has(g)) ?? null;
    });
    if (!gate) throw new Error(`${label}: no gate of A's that B lacks`);
    const g = page.locator(`${pane("a")} [data-testid="${gate}"]`).first();
    await g.scrollIntoViewIfNeeded();
    await g.click();
    await waitSelected(page, label, "a && a === b && a.startsWith('gate:')", `${gate} was not chosen in both`);
    await openReading(page, run);
    await page.getByTestId("compare-lacks-b").waitFor({ timeout: 8000 }).catch(() => {
      throw new Error(`${label}: B lacks ${gate} and does not say so`);
    });
    await foldSheet(page, run);
    await page.keyboard.press("Escape");
  }
  const dups = await duplicateIds(page);
  if (dups.length) throw new Error(`${label}: repeated ids ${dups.join(", ")}`);
  await assertNoOverflow(page);
  if (errors.length) throw new Error(`${label}: console errors: ${errors.slice(0, 3).join(" | ")}`);
}

async function checkTables(page, run) {
  const label = `${run.width} ${run.lang} tables`;
  for (const spec of PAGES.filter((p) => p.id === "natal" || p.merged)) {
    await goStudioPage(page, spec.id);
    await setView(page, "table");
    await page.waitForFunction(() => ["a", "b"].every((w) => document.querySelector(`[data-testid=compare-stage-${w}][data-view=table] .ob-figure`)?.textContent?.trim()), null, { timeout: 20000 }).catch(() => {
      throw new Error(`${label} ${spec.id}: two tables did not draw`);
    });
    if (spec.merged) {
      await page.getByTestId("compare-tables-one").click();
      await page.getByTestId(spec.merged).waitFor({ timeout: 15000 });
      await page.getByTestId(spec.merged).locator("button").first().click();
      await waitSelected(page, `${label} ${spec.id}`, "a && a === b", "a row of the one table did not choose in both");
      await page.keyboard.press("Escape");
      await page.getByTestId("compare-tables-two").click();
      await page.getByTestId("compare-merged").waitFor({ state: "detached", timeout: 6000 });
    }
    const dups = await duplicateIds(page);
    if (dups.length) throw new Error(`${label} ${spec.id}: repeated ids ${dups.join(", ")}`);
    await setView(page, "wheel");
  }
}

async function run(r) {
  const { browser, page } = await launch(r.size);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const label = `${r.width} ${r.lang}`;
  try {
    await gotoApp(page);
    if (r.lang === "fr") await setLang(page, "fr");
    await castFixture(page, FIXTURE_B);
    await castFixture(page, FIXTURE_A);
    await goStudioPage(page, "natal");

    // The page as it is before Compare: a choice (Mars, from the first read's list or the wheel) and where its stage is.
    const mars = page.locator(".ob-body > .ob-stage svg[data-depth-base] [data-kind=planet][data-body=mars] .ulune-wheel-halo").first();
    await mars.waitFor({ state: "attached", timeout: 20000 });
    await page.waitForTimeout(600);
    const focusNow = () => page.evaluate(() => document.querySelector(".ob-body > .ob-stage svg[data-depth-base]")?.getAttribute("data-focus-id") ?? "");
    for (let i = 0; i < 3 && (await focusNow()) !== "planet:mars"; i += 1) {
      await mars.scrollIntoViewIfNeeded();
      const box = await mars.boundingBox();
      if (!box) throw new Error(`${label}: no Mars on the page's wheel`);
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.move(1, 1);
      await page.waitForTimeout(400);
    }
    if ((await focusNow()) !== "planet:mars") {
      await page.screenshot({ path: "/tmp/claude-0/-home-claude/f16e6d1d-4019-5f75-bc7b-36e07849b3e0/scratchpad/n3/CMP-e2e-mars-fail.png" });
      throw new Error(`${label}: Mars was not chosen on the page (${await focusNow()})`);
    }
    const mainState = () =>
      page.evaluate(() => ({
        selected: document.querySelector(".ob-body > .ob-stage svg[data-depth-base]")?.getAttribute("data-focus-id") ?? "",
        url: location.href,
        top: document.querySelector(".ob-body > .ob-stage")?.scrollTop ?? 0,
      }));
    const before = await mainState();
    const sent = watchSent(page);

    // In from the toolbar: the layout rule.
    await enterFromToolbar(page);
    await page.waitForFunction(([reading, layout]) => {
      const c = document.querySelector("[data-testid=compare]");
      return c?.getAttribute("data-reading") === reading && c?.getAttribute("data-layout") === layout;
    }, [r.reading, r.layout], { timeout: 8000 }).catch(async () => {
      throw new Error(`${label}: Compare laid out ${await attr(page, "[data-testid=compare]", "data-reading")} / ${await attr(page, "[data-testid=compare]", "data-layout")}, expected ${r.reading} / ${r.layout}`);
    });
    const sheet = await page.evaluate(() => document.querySelector(".ob-body")?.hasAttribute("data-compare-sheet"));
    if ((r.reading === "sheet" && r.width >= 1024) !== Boolean(sheet)) throw new Error(`${label}: the wide screen's sheet is ${sheet ? "on" : "off"}`);
    const dockBox = await page.getByTestId("dock").boundingBox();
    if (r.reading === "beside" && !(dockBox && dockBox.x > r.width / 2 && dockBox.height > 400)) throw new Error(`${label}: the reading is not beside the charts`);
    if (r.reading === "sheet" && (await attr(page, "[data-testid=dock]", "data-detent")) !== "peek") throw new Error(`${label}: the sheet does not start folded`);
    if (r.layout === "stacked") {
      const [a, b] = await page.evaluate(() => ["a", "b"].map((w) => document.querySelector(`[data-testid=compare-pane-${w}]`)?.getBoundingClientRect().toJSON()));
      if (!(b.top >= a.bottom - 2 && Math.abs(a.height - b.height) < 4)) throw new Error(`${label}: the panes are not stacked half and half`);
    } else {
      const [a, b] = await page.evaluate(() => ["a", "b"].map((w) => document.querySelector(`[data-testid=compare-pane-${w}]`)?.getBoundingClientRect().toJSON()));
      if (!(b.left >= a.right - 2 && Math.abs(a.width - b.width) < 4)) throw new Error(`${label}: the panes are not side by side`);
      if (r.reading === "beside" && a.width < 470) throw new Error(`${label}: a pane keeps ${a.width} px beside the panel`);
    }
    if ((await attr(page, "[data-testid=compare-toggle]", "aria-pressed")) === "false") throw new Error(`${label}: the toolbar's button is not pressed`);
    const nameB = await page.getByTestId("compare-person-b").inputValue();
    if (!nameB) throw new Error(`${label}: no B`);

    // Show mode over Compare (idea B2, a computer): the F key; the two panes large, side by side, each
    // still named; where the reading comes from the bottom it stays folded; F again, Compare as it was.
    if (r.width >= 1024) {
      await page.keyboard.press("f");
      await page.waitForFunction(() => document.documentElement.hasAttribute("data-show"), null, { timeout: 15000 }).catch(() => {
        throw new Error(`${label}: F did not start Show mode over Compare`);
      });
      await page.getByTestId("show-bar").waitFor({ timeout: 15000 });
      await page.waitForTimeout(400);
      const show = await page.evaluate(() => {
        const box = (sel) => document.querySelector(sel)?.getBoundingClientRect().toJSON() ?? null;
        return { a: box("[data-testid=compare-pane-a]"), b: box("[data-testid=compare-pane-b]"), bar: box("[data-testid=compare-bar]"), label: document.querySelector("[data-testid=compare-label-b]")?.getClientRects().length ?? 0, detent: document.querySelector("[data-testid=dock]")?.getAttribute("data-detent") ?? null, w: innerWidth, h: innerHeight };
      });
      if (!show.a || !show.b || !(show.b.left >= show.a.right - 2)) throw new Error(`${label}: Show mode's panes are not side by side`);
      if (show.a.width < show.w * 0.3 || show.a.height < show.h * 0.7) throw new Error(`${label}: Show mode's panes are small (${Math.round(show.a.width)} × ${Math.round(show.a.height)})`);
      if (show.bar && show.bar.height > 0) throw new Error(`${label}: Compare's own bar shows in Show mode`);
      if (!show.label) throw new Error(`${label}: Show mode hides whose chart B is`);
      if (r.reading === "sheet" && show.detent !== "peek") throw new Error(`${label}: Show mode opened the reading over the two charts (${show.detent})`);
      await page.keyboard.press("f");
      await page.waitForFunction(() => !document.documentElement.hasAttribute("data-show"), null, { timeout: 15000 });
      if (!(await page.getByTestId("compare").count())) throw new Error(`${label}: leaving Show mode left Compare`);
      if (r.reading === "sheet" && (await attr(page, "[data-testid=dock]", "data-detent")) !== "peek") throw new Error(`${label}: after Show mode the sheet is not folded`);
    }

    // Out: the page as it was (its choice, its address, its scroll).
    await leave(page);
    await page.mouse.move(1, 1);
    const after = await mainState();
    if (JSON.stringify(after) !== JSON.stringify(before)) throw new Error(`${label}: the page came back as ${JSON.stringify(after)}, was ${JSON.stringify(before)}`);
    if ((await attr(page, "[data-testid=compare-toggle]", "aria-pressed")) === "true") throw new Error(`${label}: the button stayed pressed`);

    // In from the switcher, with Sample B.
    await page.getByTestId("chart-chip").click();
    await page.locator(`[data-testid=chart-row][data-name="${FIXTURE_B.name}"] [data-testid=chart-compare]`).click();
    await page.getByTestId("compare").waitFor({ timeout: 15000 });
    const bId = await attr(page, pane("b"), "data-chart");
    if (!bId || (await page.getByTestId("compare-person-b").inputValue()) !== bId) throw new Error(`${label}: the switcher's Compare did not set B`);

    // Every page Compare shows.
    for (const spec of PAGES) {
      await checkPage(page, spec, r, errors);
      console.log(`compare ${label} ${spec.id} OK`);
    }
    await checkTables(page, r);
    console.log(`compare ${label} tables OK`);

    // The keyboard: Tab from A's last stop reaches B; the arrows walk Feng Shui's rose inside A.
    await goStudioPage(page, "fengshui");
    await page.locator(`${pane("a")} [data-dir][tabindex='0']`).first().waitFor({ timeout: 10000 });
    const tabbed = await page.evaluate(() => {
      const stops = [...document.querySelectorAll("[data-testid=compare-pane-a] :is(button, [href], input, select, [tabindex]):not([tabindex='-1']):not([disabled])")].filter((el) => el.getClientRects().length);
      const last = stops[stops.length - 1];
      last?.focus();
      return Boolean(last);
    });
    if (!tabbed) throw new Error(`${label}: nothing to focus in A`);
    await page.keyboard.press("Tab");
    if (!(await page.evaluate(() => Boolean(document.activeElement?.closest("[data-testid=compare-pane-b]"))))) throw new Error(`${label}: Tab from A's last stop did not reach B`);
    await page.locator(`${pane("a")} [data-dir][tabindex='0']`).first().focus();
    const dir0 = await page.evaluate(() => document.activeElement?.getAttribute("data-dir"));
    await page.keyboard.press("ArrowRight");
    const [dir1, inA] = await page.evaluate(() => [document.activeElement?.getAttribute("data-dir"), Boolean(document.activeElement?.closest("[data-testid=compare-pane-a]"))]);
    if (!dir1 || dir1 === dir0 || !inA) throw new Error(`${label}: the arrows moved from ${dir0} to ${dir1} (${inA ? "in A" : "out of A"})`);
    await page.keyboard.press("Escape");

    // Swap: A and B change places, and back.
    await goStudioPage(page, "natal");
    const [ca, cb] = await page.evaluate(() => ["a", "b"].map((w) => document.querySelector(`[data-testid=compare-pane-${w}]`)?.getAttribute("data-chart")));
    await page.getByTestId("compare-swap").click();
    await page.waitForFunction(([x, y]) => document.querySelector("[data-testid=compare-pane-a]")?.getAttribute("data-chart") === y && document.querySelector("[data-testid=compare-pane-b]")?.getAttribute("data-chart") === x, [ca, cb], { timeout: 8000 }).catch(() => {
      throw new Error(`${label}: Swap did not swap`);
    });
    await page.getByTestId("compare-swap").click();
    await page.waitForFunction((x) => document.querySelector("[data-testid=compare-pane-a]")?.getAttribute("data-chart") === x, ca, { timeout: 8000 });

    // A phone held upright: a chart's label shows it full size, ✕ and Escape bring both back.
    if (r.layout === "stacked") {
      await page.getByTestId("compare-label-a").click();
      await page.waitForFunction(() => document.querySelector("[data-testid=compare-pane-a]")?.hasAttribute("data-full"), null, { timeout: 4000 });
      const role = await attr(page, pane("a"), "role");
      if (role !== "dialog") throw new Error(`${label}: the full-size chart is not a dialog`);
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => !document.querySelector("[data-testid=compare-pane-a]")?.hasAttribute("data-full"), null, { timeout: 4000 });
      if (!(await page.evaluate(() => document.activeElement?.getAttribute("data-testid") === "compare-label-a"))) throw new Error(`${label}: the focus did not come back to A's label`);
      await page.getByTestId("compare-label-b").click();
      await page.getByTestId("compare-full-close").click();
      await page.waitForFunction(() => !document.querySelector("[data-compare-full], [data-testid^=compare-pane-][data-full]"), null, { timeout: 4000 });
    }

    // Both side by side, as one PNG.
    await openExport(page);
    const [download] = await Promise.all([page.waitForEvent("download", { timeout: 20000 }), page.getByTestId("compare-export-png").click()]);
    if (!/\.png$/.test(download.suggestedFilename())) throw new Error(`${label}: downloaded ${download.suggestedFilename()}`);
    if ((await page.getByTestId("export-png").count()) && (await page.getByTestId("export-png").isVisible().catch(() => false))) throw new Error(`${label}: the single chart's PNG is offered in Compare`);

    // A Relationship page, the Calendar and the Home leave Compare; "See how they meet" opens Synastry with the two.
    await page.getByTestId("compare-meet").click();
    await page.waitForFunction(() => document.querySelector("[data-testid=studio-nav]")?.getAttribute("data-page") === "synastry", null, { timeout: 8000 });
    await page.getByTestId("compare").waitFor({ state: "detached", timeout: 8000 });
    if ((await page.getByTestId("synastry-person-b").inputValue()) !== cb) throw new Error(`${label}: Synastry does not pair the two`);
    for (const id of ["timing", "fengshui-home"]) {
      await goStudioPage(page, "natal");
      await enterFromToolbar(page);
      await goStudioPage(page, id);
      if (await page.getByTestId("compare").count()) throw new Error(`${label}: Compare stayed on ${id}`);
    }
    await goStudioPage(page, "zodiac-pair");
    if ((await attr(page, "[data-testid=compare-toggle]", "aria-disabled")) !== "true" && (await page.getByTestId("compare-toggle").isVisible().catch(() => false))) throw new Error(`${label}: Compare is offered on a Relationship page`);

    // Nothing sent but the calculations; nothing in the address.
    const extra = beyondCasts(sent, page);
    if (extra.length) throw new Error(`${label}: sent ${extra.slice(0, 3).join(", ")}`);
    if (/compare|partner|sample/i.test(decodeURIComponent(page.url()))) throw new Error(`${label}: the address carries Compare: ${page.url()}`);
    if (errors.length) throw new Error(`${label}: console errors: ${errors.slice(0, 3).join(" | ")}`);
    console.log(`compare ${label} OK`);
  } finally {
    await browser.close();
  }
}

/** Kept after a reload with a private space (on, B, linked selection), sealed: nothing in the clear. */
async function persistence() {
  const { browser, page } = await launch({ width: 1440, height: 900 });
  try {
    await gotoApp(page);
    await createSpace(page);
    await setSpaceLock(page, "stay");
    await castFixture(page, FIXTURE_B);
    await castFixture(page, FIXTURE_A);
    await goStudioPage(page, "numerology");
    await enterFromToolbar(page);
    await page.getByTestId("compare-link").click();
    const bId = await attr(page, pane("b"), "data-chart");
    let rec = null;
    for (let i = 0; i < 40 && !(rec?.on && rec?.linked === false); i += 1) {
      await page.waitForTimeout(150);
      rec = await readSpaceRecord(page, "state/compare");
    }
    if (!rec?.on || rec.partnerId !== bId || rec.linked !== false) throw new Error(`persistence: the space keeps ${JSON.stringify(rec)}`);
    const clear = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }));
    if (clear.includes(bId)) throw new Error("persistence: B's id is in the clear");
    await page.reload({ waitUntil: "load" });
    await page.getByTestId("compare").waitFor({ timeout: 30000 });
    if ((await attr(page, pane("b"), "data-chart")) !== bId) throw new Error("persistence: another B after the reload");
    if ((await attr(page, "[data-testid=compare-link]", "aria-checked")) !== "false") throw new Error("persistence: linked selection not kept");
    if (!(await page.url()).includes("/numerology")) throw new Error(`persistence: reloaded on ${page.url()}`);
    await leave(page);
    await page.waitForTimeout(400);
    await page.reload({ waitUntil: "load" });
    await page.getByTestId("studio-numerology").waitFor({ timeout: 30000 });
    await page.waitForTimeout(1500);
    if (await page.getByTestId("compare").count()) throw new Error("persistence: Compare came back after it was left");
    console.log("compare persistence OK");
  } finally {
    await browser.close();
  }
  // Without a space nothing is kept: Compare goes with the tab's charts.
  const { browser: b2, page: p2 } = await launch({ width: 1440, height: 900 });
  try {
    await gotoApp(p2);
    await castFixture(p2, FIXTURE_B);
    await castFixture(p2, FIXTURE_A);
    await enterFromToolbar(p2);
    const clear = await p2.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }));
    if (/"on":true|partnerId/.test(clear)) throw new Error("persistence: Compare kept in the clear without a space");
    await p2.reload({ waitUntil: "load" });
    await p2.waitForSelector("html.theme-ready");
    await p2.waitForTimeout(1500);
    if (await p2.getByTestId("compare").count()) throw new Error("persistence: Compare after a reload without a space");
    console.log("compare without a space OK");
  } finally {
    await b2.close();
  }
}

/* ---- Ideas B7 and B8: three or four people, one person in two languages, one chart at two moments ---- */

/** Two more made-up charts: the fixtures' births under other names (no one's real birth), each with a count of its own. */
const FIXTURE_C = { ...FIXTURE_A, name: "Fixture C", chineseCount: "yin" };
const FIXTURE_D = { ...FIXTURE_B, name: "Fixture D", chineseCount: "yang" };

const MORE_RUNS = [
  { width: 1920, lang: "en", size: { width: 1920, height: 1080 } },
  { width: 1440, lang: "fr", size: { width: 1440, height: 900 } },
  { width: 1024, lang: "en", size: { width: 1024, height: 768 } },
  { width: 390, lang: "en", size: { width: 390, height: 844 } },
];

const shownPanes = (page) => page.evaluate(() => [...document.querySelectorAll("[data-testid^=compare-pane-]")].map((el) => el.getAttribute("data-pane")));
const selectedAll = (page) => page.evaluate(() => Object.fromEntries([...document.querySelectorAll("[data-testid^=compare-pane-]")].map((el) => [el.getAttribute("data-pane"), el.getAttribute("data-selected") ?? ""])));

async function waitPanes(page, label, n) {
  await page.waitForFunction((k) => document.querySelectorAll("[data-testid^=compare-pane-]").length === k, n, { timeout: 15000 }).catch(async () => {
    throw new Error(`${label}: ${JSON.stringify(await shownPanes(page))} panes, not ${n}`);
  });
}

async function waitSelectedAll(page, label, test, what) {
  await page
    .waitForFunction((src) => new Function("s", `return ${src}`)(Object.fromEntries([...document.querySelectorAll("[data-testid^=compare-pane-]")].map((el) => [el.getAttribute("data-pane"), el.getAttribute("data-selected") ?? ""]))), test, { timeout: 10000 })
    .catch(async () => {
      throw new Error(`${label}: ${what}, the panes chose ${JSON.stringify(await selectedAll(page))}`);
    });
}

async function enterPeople(page, r) {
  await gotoApp(page);
  if (r.lang === "fr") await setLang(page, "fr");
  for (const f of [FIXTURE_D, FIXTURE_C, FIXTURE_B, FIXTURE_A]) await castFixture(page, f);
  await goStudioPage(page, "natal");
  await enterFromToolbar(page);
}

/** Three and four people (idea B8): arranged, named, linked across all, what all share, Show mode, the picture, and back to two. */
async function people(r) {
  const { browser, page } = await launch(r.size);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const label = `people ${r.width} ${r.lang}`;
  try {
    await enterPeople(page, r);
    if ((await attr(page, "[data-testid=compare]", "data-mode")) !== "people") throw new Error(`${label}: Compare opened in another way`);
    // A third, then a fourth: the charts kept last that are not shown yet.
    await page.getByTestId("compare-add-person").click();
    await waitPanes(page, label, 3);
    // Three: a row, or a grid whose third chart takes its row's width (a phone: one above the other).
    const three = await page.evaluate(() => ({
      arrange: document.querySelector("[data-testid=compare-panes]")?.getAttribute("data-arrange") ?? null,
      boxes: ["a", "b", "c"].map((w) => document.querySelector(`[data-testid=compare-pane-${w}]`)?.getBoundingClientRect().toJSON()),
    }));
    if (r.width >= 600) {
      const [p, q, s] = three.boxes;
      const ok = three.arrange === "grid" ? Math.abs(s.width - (q.right - p.left)) < 3 && s.top >= p.bottom - 2 : three.arrange === "row" && q.left >= p.right - 2 && s.left >= q.right - 2;
      if (!ok) throw new Error(`${label}: three stand as "${three.arrange}": ${JSON.stringify(three.boxes.map((b) => [Math.round(b.left), Math.round(b.top), Math.round(b.width)]))}`);
    } else if (!three.boxes.every((b, i) => i === 0 || b.top >= three.boxes[i - 1].bottom - 2)) throw new Error(`${label}: the three are not one above the other`);
    await page.getByTestId("compare-add-person").click();
    await waitPanes(page, label, 4);
    if (await page.getByTestId("compare-add-person").count()) throw new Error(`${label}: a fifth is offered`);
    for (const who of ["a", "b", "c", "d"]) {
      await page.locator(`${pane(who)} svg[data-depth-base] [data-kind=planet][data-body=sun]`).first().waitFor({ state: "attached", timeout: 30000 }).catch(() => {
        throw new Error(`${label}: pane ${who} drew no wheel`);
      });
    }
    const charts = await page.evaluate(() => ["a", "b", "c", "d"].map((w) => document.querySelector(`[data-testid=compare-pane-${w}]`)?.getAttribute("data-chart")));
    if (new Set(charts).size !== 4 || charts.some((c) => !c)) throw new Error(`${label}: the four panes show ${charts}`);
    // Each pane named for a screen reader: "Chart C: Fixture C".
    const named = await page.evaluate(() => ["a", "b", "c", "d"].map((w) => document.querySelector(`[data-testid=compare-pane-${w}]`)?.getAttribute("aria-label") ?? ""));
    const want = r.lang === "fr" ? "Thème C : Fixture C" : "Chart C: Fixture C";
    if (named[2] !== want) throw new Error(`${label}: C is named "${named[2]}", not "${want}"`);
    // How they stand: a phone one above the other (scrolling, two to a screen); else a grid of two by two (or a row).
    const boxes = await page.evaluate(() => ["a", "b", "c", "d"].map((w) => document.querySelector(`[data-testid=compare-pane-${w}]`)?.getBoundingClientRect().toJSON()));
    if (r.width < 600) {
      if (!boxes.every((b, i) => i === 0 || b.top >= boxes[i - 1].bottom - 2)) throw new Error(`${label}: the four are not one above the other`);
      if (boxes[0].height < 200) throw new Error(`${label}: a pane keeps ${Math.round(boxes[0].height)} px on a phone`);
    } else {
      const grid = boxes[1].left >= boxes[0].right - 2 && boxes[2].top >= boxes[0].bottom - 2 && Math.abs(boxes[2].left - boxes[0].left) < 3 && boxes[3].left >= boxes[2].right - 2;
      const row = boxes.every((b, i) => i === 0 || b.left >= boxes[i - 1].right - 2);
      if (!grid && !row) throw new Error(`${label}: four panes stand neither in a grid nor a row: ${JSON.stringify(boxes.map((b) => [Math.round(b.left), Math.round(b.top)]))}`);
      if (Math.min(...boxes.map((b) => b.width)) < 280) throw new Error(`${label}: a pane keeps ${Math.round(Math.min(...boxes.map((b) => b.width)))} px`);
    }

    // The keyboard: Tab from C's last stop reaches D (the panes in reading order).
    const tabbed = await page.evaluate(() => {
      const stops = [...document.querySelectorAll("[data-testid=compare-pane-c] :is(button, [href], input, select, [tabindex]):not([tabindex='-1']):not([disabled])")].filter((el) => el.getClientRects().length);
      stops[stops.length - 1]?.focus();
      return stops.length > 0;
    });
    if (!tabbed) throw new Error(`${label}: nothing to focus in C`);
    await page.keyboard.press("Tab");
    if (!(await page.evaluate(() => Boolean(document.activeElement?.closest("[data-testid=compare-pane-d]"))))) throw new Error(`${label}: Tab from C's last stop did not reach D`);
    await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());

    // Linked selection across all four: the Sun in A is everyone's, and the reading lists them, names first.
    await page.keyboard.press("Escape");
    await press(page, PAGES[0], "a");
    await waitSelectedAll(page, label, "['a','b','c','d'].every((w) => s[w] === 'planet:sun')", "the Sun in A was not everyone's");
    await openReading(page, { reading: (await attr(page, "[data-testid=compare]", "data-reading")) });
    await page.waitForFunction(() => ["a", "b", "c", "d"].every((w) => document.querySelector(`[data-testid=compare-row-${w}]`)?.getAttribute("data-state") === "read"), null, { timeout: 20000 }).catch(async () => {
      throw new Error(`${label}: the reading for four did not come: ${await page.evaluate(() => ["a", "b", "c", "d"].map((w) => document.querySelector(`[data-testid=compare-row-${w}]`)?.getAttribute("data-state")).join(", "))}`);
    });
    const first = await page.evaluate(() => document.querySelector("[data-testid=compare-row-c] .ob-compare-row-name")?.textContent ?? "");
    if (!first.startsWith("C · Fixture C")) throw new Error(`${label}: C's line starts "${first}"`);
    await foldSheet(page, { reading: await attr(page, "[data-testid=compare]", "data-reading") });
    // Linked off: a choice is its chart's only; on again, the others follow it.
    await page.keyboard.press("Escape");
    await waitSelectedAll(page, label, "Object.values(s).every((v) => !v)", "Escape did not let go of all four");
    await page.getByTestId("compare-link").click();
    await press(page, PAGES[0], "c");
    await waitSelectedAll(page, label, "s.c === 'planet:sun' && !s.a && !s.b && !s.d", "with the link off, a choice in C was another's");
    await page.getByTestId("compare-link").click();
    await waitSelectedAll(page, label, "['a','b','c','d'].every((w) => s[w] === 'planet:sun')", "linked again, the others did not follow C");
    await page.keyboard.press("Escape");
    // What all four share: an item chooses its element in all four.
    const reading = await attr(page, "[data-testid=compare]", "data-reading");
    await openReading(page, { reading });
    await page.locator("[data-testid=compare-shared][data-count='4'] li, [data-testid=compare-shared-none]").first().waitFor({ timeout: 15000 });
    const chip = page.locator("[data-testid=compare-shared] [data-testid^=compare-shared-]:not([data-testid=compare-shared-none])").first();
    if (await chip.count()) {
      const ids = (await chip.getAttribute("data-ids")).split("|");
      const whoHas = await chip.getAttribute("data-who");
      if (whoHas !== "abcd") throw new Error(`${label}: "What all four share" lists an item of ${whoHas}`);
      await chip.click();
      await waitSelectedAll(page, label, `${JSON.stringify(ids)}.every((id, i) => s['abcd'[i]] === id)`, `"What all four share" (${ids}) did not choose in all four`);
      await page.keyboard.press("Escape");
    }
    await foldSheet(page, { reading });

    // Show mode with four (a computer): the four large, each still named, Compare's bar gone.
    if (r.width >= 1024) {
      await page.keyboard.press("f");
      await page.waitForFunction(() => document.documentElement.hasAttribute("data-show"), null, { timeout: 15000 });
      await page.waitForTimeout(500);
      const show = await page.evaluate(() => ({
        panes: ["a", "b", "c", "d"].map((w) => document.querySelector(`[data-testid=compare-pane-${w}]`)?.getBoundingClientRect().toJSON()),
        labels: ["a", "b", "c", "d"].filter((w) => document.querySelector(`[data-testid=compare-label-${w}]`)?.getClientRects().length).length,
        bar: document.querySelector("[data-testid=compare-bar]")?.getBoundingClientRect().height ?? 0,
        w: innerWidth,
      }));
      if (show.panes.some((b) => !b || b.width < show.w * 0.2)) throw new Error(`${label}: Show mode's four panes are small`);
      if (show.labels !== 4) throw new Error(`${label}: Show mode names ${show.labels} of the four`);
      if (show.bar > 0) throw new Error(`${label}: Compare's bar shows in Show mode`);
      await page.keyboard.press("f");
      await page.waitForFunction(() => !document.documentElement.hasAttribute("data-show"), null, { timeout: 15000 });
      await waitPanes(page, label, 4);
    }
    // All side by side, as one picture.
    if (r.width >= 1024) {
      await openExport(page);
      const item = page.getByTestId("compare-export-png");
      const word = (await item.textContent()) ?? "";
      if (!(r.lang === "fr" ? /Tous côte à côte/ : /All side by side/).test(word)) throw new Error(`${label}: the export says "${word}"`);
      const [download] = await Promise.all([page.waitForEvent("download", { timeout: 30000 }), item.click()]);
      if (!/\.png$/.test(download.suggestedFilename())) throw new Error(`${label}: downloaded ${download.suggestedFilename()}`);
      await page.keyboard.press("Escape");
    }
    // Numerology's one table, a column for each of the four; a row chooses in all four.
    if (r.width === 1440) {
      await goStudioPage(page, "numerology");
      await setView(page, "table");
      await page.getByTestId("compare-tables-one").click();
      await page.getByTestId("num-merged-lifepath").waitFor({ timeout: 20000 });
      const cols = await page.evaluate(() => document.querySelectorAll("[data-testid=compare-merged] thead th").length);
      if (cols !== 5) throw new Error(`${label}: the one table has ${cols} columns, not the numbers' and four people's`);
      await page.getByTestId("num-merged-lifepath").locator("button").first().click();
      await waitSelectedAll(page, label, "['a','b','c','d'].every((w) => s[w] === 'core:lifepath')", "a row of the one table did not choose in all four");
      await page.keyboard.press("Escape");
      await page.getByTestId("compare-tables-two").click();
      await setView(page, "wheel");
      // Human Design in four short panes (530 × 370 px): each its summary, its bodygraph too low to read.
      await goStudioPage(page, "design");
      for (const who of ["a", "b", "c", "d"]) {
        await page.getByTestId(`compare-summary-${who}`).waitFor({ timeout: 30000 }).catch(() => {
          throw new Error(`${label}: Human Design's pane ${who} in four short panes shows no summary`);
        });
      }
      await goStudioPage(page, "natal");
    }
    // Small panes (a laptop beside the panel): Human Design's summary, its rows choosing in all four.
    if (r.width === 1024) {
      await goStudioPage(page, "design");
      await page.getByTestId("compare-summary-c").waitFor({ timeout: 30000 }).catch(() => {
        throw new Error(`${label}: Human Design's small pane shows no summary`);
      });
      await page.getByTestId("compare-summary-c-hello-type").click();
      await waitSelectedAll(page, label, "['a','b','c','d'].every((w) => s[w] === 'hello:type')", "the summary's Type did not choose in all four");
      await page.keyboard.press("Escape");
      await goStudioPage(page, "natal");
    }
    const dups = await duplicateIds(page);
    if (dups.length) throw new Error(`${label}: repeated ids ${dups.join(", ")}`);
    await assertNoOverflow(page);
    // Back to two: D, then C, taken out; "See how they meet" comes back.
    await page.getByTestId("compare-remove-d").click();
    await waitPanes(page, label, 3);
    await page.getByTestId("compare-remove-c").click();
    await waitPanes(page, label, 2);
    if (!(await page.getByTestId("compare-meet").count())) throw new Error(`${label}: "See how they meet" did not come back for two`);
    if (/compare|fixture|sample/i.test(decodeURIComponent(page.url()))) throw new Error(`${label}: the address carries Compare: ${page.url()}`);
    if (errors.length) throw new Error(`${label}: console errors: ${errors.slice(0, 3).join(" | ")}`);
    console.log(`compare ${label} OK`);
  } finally {
    await browser.close();
  }
}

/** One person in two languages, one chart at two moments (idea B7). */
async function mixed(r) {
  const { browser, page } = await launch(r.size);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const label = `mixed ${r.width} ${r.lang}`;
  const reading = () => attr(page, "[data-testid=compare]", "data-reading");
  try {
    await gotoApp(page);
    if (r.lang === "fr") await setLang(page, "fr");
    await castFixture(page, FIXTURE_B);
    await castFixture(page, FIXTURE_A);
    await goStudioPage(page, "natal");
    await enterFromToolbar(page);
    const aId = await attr(page, pane("a"), "data-chart");

    // Two languages: astrology beside Human Design, the same chart in both, no linked selection.
    await page.getByTestId("compare-way-languages").click();
    await page.waitForFunction(() => document.querySelector("[data-testid=compare]")?.getAttribute("data-mode") === "languages", null, { timeout: 8000 });
    if ((await page.getByTestId("compare-page-b").inputValue()) !== "design") throw new Error(`${label}: B opened on ${await page.getByTestId("compare-page-b").inputValue()}`);
    await page.locator(`${pane("b")} .ulune-hd-gate:not([data-tone=off])`).first().waitFor({ state: "attached", timeout: 30000 });
    await page.locator(`${pane("a")} svg[data-depth-base] [data-kind=planet][data-body=sun]`).first().waitFor({ state: "attached", timeout: 30000 });
    if ((await attr(page, pane("b"), "data-chart")) !== aId) throw new Error(`${label}: B is not A's chart`);
    if (await page.getByTestId("compare-link").count()) throw new Error(`${label}: linked selection offered between two languages`);
    // Where they agree: the Sun in Gemini is Gate 12's; chosen, both readings.
    await openReading(page, { reading: await reading() });
    const agree = page.locator("[data-testid^=compare-agree-agree-hd-sun]");
    await agree.waitFor({ timeout: 20000 }).catch(() => {
      throw new Error(`${label}: "Where they agree" has no Sun`);
    });
    const [sa, sb] = (await agree.getAttribute("data-ids")).split("|");
    if (sa !== "planet:sun" || !/^gate:\d+$/.test(sb)) throw new Error(`${label}: the Sun's agreement chooses ${sa} and ${sb}`);
    await agree.click();
    await waitSelected(page, label, `a === "planet:sun" && b === ${JSON.stringify(sb)}`, "the agreement did not choose in both");
    await page.waitForFunction(() => ["a", "b"].every((w) => document.querySelector(`[data-testid=compare-side-${w}]`)?.getAttribute("data-state") === "read"), null, { timeout: 15000 }).catch(() => {
      throw new Error(`${label}: the agreement's two readings did not come`);
    });
    await foldSheet(page, { reading: await reading() });
    await page.keyboard.press("Escape");
    // A choice in one language is its own: the other pane keeps nothing.
    await press(page, PAGES[0], "a");
    await waitSelected(page, label, "a === 'planet:sun' && !b", "a choice in astrology was Human Design's too");
    await page.keyboard.press("Escape");
    // BaZi beside numerology: A's page (the toolbar's) and B's, each from its label; no list for them.
    await page.getByTestId("compare-page-a").selectOption("numerology");
    await page.waitForFunction(() => document.querySelector("[data-testid=studio-nav]")?.getAttribute("data-page") === "numerology", null, { timeout: 10000 });
    await page.getByTestId("compare-page-b").selectOption("bazi");
    await page.locator(`${pane("b")} [data-testid=bazi-stem-day]`).first().waitFor({ timeout: 30000 });
    await page.locator(`${pane("a")} [data-testid=numerology-tile-lifepath]`).first().waitFor({ timeout: 30000 });
    await openReading(page, { reading: await reading() });
    await page.getByTestId("compare-agree-none").waitFor({ timeout: 15000 }).catch(() => {
      throw new Error(`${label}: BaZi beside numerology claims an agreement`);
    });
    await foldSheet(page, { reading: await reading() });
    // B's own controls in its bar, A's in the toolbar; Swap is not offered for one person.
    if (await page.getByTestId("compare-swap").count()) throw new Error(`${label}: Swap offered for one person`);

    // Two moments: numerology's this year beside next year, each stepped alone.
    await goStudioPage(page, "numerology-cycles");
    await page.getByTestId("compare-way-moments").click();
    const yearOf = (where) => page.evaluate((sel) => Number(document.querySelector(sel)?.textContent?.trim() ?? NaN), where);
    const thisYear = new Date().getFullYear();
    await page.waitForFunction(() => document.querySelector("[data-testid=compare-pane-b] [data-testid=num-year]") != null, null, { timeout: 30000 });
    await page.waitForFunction((y) => Number(document.querySelector("[data-testid=compare-pane-b] [data-testid=num-year]")?.textContent) === y + 1, thisYear, { timeout: 10000 }).catch(async () => {
      throw new Error(`${label}: B shows ${await yearOf("[data-testid=compare-pane-b] [data-testid=num-year]")}, not next year`);
    });
    const toolbarYear = "[data-testid=stage-toolbar] [data-testid=num-year]";
    await page.waitForFunction((sel) => document.querySelector(sel) != null, toolbarYear, { timeout: 15000 }).catch(async () => {
      throw new Error(`${label}: no year in the toolbar on ${await attr(page, "[data-testid=studio-nav]", "data-page")}`);
    });
    if ((await yearOf(toolbarYear)) !== thisYear) throw new Error(`${label}: A's year is ${await yearOf(toolbarYear)}`);
    await page.locator("[data-testid=compare-pane-b] [data-testid=num-year-next]").click();
    await page.waitForFunction((y) => Number(document.querySelector("[data-testid=compare-pane-b] [data-testid=num-year]")?.textContent) === y + 2, thisYear, { timeout: 8000 });
    if ((await yearOf(toolbarYear)) !== thisYear) throw new Error(`${label}: B's step moved A's year`);
    await page.locator(`${toolbarYear.replace("num-year", "num-year-next")}`).click();
    await page.waitForFunction((y) => Number(document.querySelector("[data-testid=stage-toolbar] [data-testid=num-year]")?.textContent) === y + 1, thisYear, { timeout: 8000 });
    if ((await yearOf("[data-testid=compare-pane-b] [data-testid=num-year]")) !== thisYear + 2) throw new Error(`${label}: A's step moved B's year`);
    await page.locator(`${toolbarYear}`).click();
    const moment = await page.getByTestId("compare-moment-b").textContent();
    if (moment?.trim() !== String(thisYear + 2)) throw new Error(`${label}: B's label says "${moment}"`);
    // Natal beside its transits: B's own dial moves B alone.
    await goStudioPage(page, "natal");
    await page.locator(`${pane("b")} svg[data-depth-base]`).first().waitFor({ state: "attached", timeout: 30000 });
    if ((await attr(page, pane("b"), "data-page")) !== "transits") throw new Error(`${label}: B shows ${await attr(page, pane("b"), "data-page")} beside the birth chart`);
    const now = (await page.getByTestId("compare-moment-b").textContent())?.trim();
    if (now !== (r.lang === "fr" ? "maintenant" : "now")) throw new Error(`${label}: B starts at "${now}"`);
    await page.locator(`${pane("b")} [data-testid=transit-scrubber-forward]`).click();
    await page.waitForFunction((was) => document.querySelector("[data-testid=compare-moment-b]")?.textContent?.trim() !== was, now, { timeout: 8000 }).catch(() => {
      throw new Error(`${label}: B's dial did not move B's moment`);
    });
    // Linked selection holds between two moments of one chart.
    await press(page, PAGES[0], "a");
    await waitSelected(page, label, "a === 'planet:sun' && b === 'planet:sun'", "the Sun at birth was not chosen at B's moment");
    await page.keyboard.press("Escape");
    // The bodygraph beside its Cycles (feature 5b): B's own moment, its dial B's alone.
    await goStudioPage(page, "design");
    await page.waitForFunction(() => document.querySelector("[data-testid=compare-pane-b]")?.getAttribute("data-page") === "design-cycles", null, { timeout: 15000 }).catch(() => {
      throw new Error(`${label}: B is not Human Design's Cycles beside the bodygraph`);
    });
    await page.locator(`${pane("b")} [data-testid=hd-cycles-week]`).waitFor({ timeout: 30000 });
    const hdNow = (await page.getByTestId("compare-moment-b").textContent())?.trim();
    await page.locator(`${pane("b")} [data-testid=hd-cycles-dial-forward]`).click();
    await page.waitForFunction((was) => document.querySelector("[data-testid=compare-moment-b]")?.textContent?.trim() !== was, hdNow, { timeout: 8000 }).catch(() => {
      throw new Error(`${label}: B's dial did not move Human Design's moment`);
    });
    // Back to people: two people again, B the second person.
    await page.getByTestId("compare-way-people").click();
    await waitPanes(page, label, 2);
    if ((await attr(page, pane("b"), "data-chart")) === aId) throw new Error(`${label}: back to people, B is A`);
    const dups = await duplicateIds(page);
    if (dups.length) throw new Error(`${label}: repeated ids ${dups.join(", ")}`);
    await assertNoOverflow(page);
    if (/compare|languages|moments|fixture|sample/i.test(decodeURIComponent(page.url()))) throw new Error(`${label}: the address carries Compare: ${page.url()}`);
    if (errors.length) throw new Error(`${label}: console errors: ${errors.slice(0, 3).join(" | ")}`);
    console.log(`compare ${label} OK`);
  } finally {
    await browser.close();
  }
}

/**
 * A finger (a phone, pointer: coarse): every control of Compare's bar, of the panes' labels and of a
 * pane's own page controls reaches 44 × 44 px in the three ways; one person's pane keeps its letter and
 * its page's list on one row.
 */
async function finger() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  page.setDefaultTimeout(20000);
  const label = "finger 390";
  const under44 = () =>
    page.evaluate(() => {
      const out = [];
      const sel = "button, select, [role=switch]";
      for (const el of document.querySelectorAll(`:is([data-testid=compare-bar], .ob-compare-label, .ob-compare-pane .ob-strip-extra) :is(${sel})`)) {
        const r = el.getBoundingClientRect();
        if (r.width <= 1 || r.height <= 1 || getComputedStyle(el).visibility === "hidden") continue;
        if (r.width < 43.5 || r.height < 43.5) out.push(`${el.getAttribute("data-testid") ?? el.className} ${Math.round(r.width)}×${Math.round(r.height)}`);
      }
      return out;
    });
  try {
    await gotoApp(page);
    if (!(await page.evaluate(() => matchMedia("(pointer: coarse)").matches))) throw new Error(`${label}: not a finger`);
    await castFixture(page, FIXTURE_B);
    await castFixture(page, FIXTURE_A);
    await goStudioPage(page, "natal");
    await enterFromToolbar(page);
    await page.locator(`${pane("b")} svg[data-depth-base]`).first().waitFor({ state: "attached", timeout: 30000 });
    for (const way of ["people", "languages", "moments"]) {
      await page.getByTestId(`compare-way-${way}`).click();
      await page.waitForFunction((w) => document.querySelector("[data-testid=compare]")?.getAttribute("data-mode") === w, way, { timeout: 8000 });
      await page.waitForTimeout(600);
      const small = await under44();
      if (small.length) throw new Error(`${label} ${way}: under 44 × 44 px: ${small.join(", ")}`);
    }
    // Numerology's year beside itself: B's own steps in its bar.
    await goStudioPage(page, "numerology-cycles");
    await page.locator(`${pane("b")} [data-testid=num-year-next]`).waitFor({ timeout: 30000 });
    const steps = await under44();
    if (steps.length) throw new Error(`${label} numerology's two years: under 44 × 44 px: ${steps.join(", ")}`);
    await goStudioPage(page, "natal");
    // Two languages: each pane's letter and its page's list on one row, the person being the bar's.
    await page.getByTestId("compare-way-languages").click();
    await page.getByTestId("compare-page-b").waitFor({ timeout: 8000 });
    for (const who of ["a", "b"]) {
      const [l, p] = await page.evaluate((w) => [`[data-testid=compare-label-${w}]`, `[data-testid=compare-page-${w}]`].map((s) => document.querySelector(s)?.getBoundingClientRect().toJSON()), who);
      if (!l || !p || p.top >= l.bottom - 2) throw new Error(`${label}: ${who.toUpperCase()}'s page list stands under its letter`);
    }
    await page.getByTestId("compare-way-people").click();
    console.log(`compare ${label} OK`);
  } finally {
    await browser.close();
  }
}

/** The ways and their choices kept after a reload with a private space, sealed: nothing in the clear. */
async function persistenceMore() {
  const { browser, page } = await launch({ width: 1440, height: 900 });
  const label = "persistence of the ways";
  try {
    await gotoApp(page);
    await createSpace(page);
    await setSpaceLock(page, "stay");
    for (const f of [FIXTURE_D, FIXTURE_C, FIXTURE_B, FIXTURE_A]) await castFixture(page, f);
    await goStudioPage(page, "natal");
    await enterFromToolbar(page);
    await page.getByTestId("compare-add-person").click();
    await page.getByTestId("compare-add-person").click();
    await waitPanes(page, label, 4);
    const ids = await page.evaluate(() => ["c", "d"].map((w) => document.querySelector(`[data-testid=compare-pane-${w}]`)?.getAttribute("data-chart")));
    const until = async (test, what) => {
      let rec = null;
      for (let i = 0; i < 60; i += 1) {
        rec = await readSpaceRecord(page, "state/compare");
        if (rec && test(rec)) return rec;
        await page.waitForTimeout(150);
      }
      throw new Error(`${label}: ${what}: the space keeps ${JSON.stringify(rec)}`);
    };
    await until((rec) => JSON.stringify(rec.more) === JSON.stringify(ids), "C and D not kept");
    await page.getByTestId("compare-way-languages").click();
    await page.getByTestId("compare-page-b").selectOption("bazi");
    await until((rec) => rec.mode === "languages" && rec.langPage === "bazi", "two languages not kept");
    const clear = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }));
    for (const id of ids) if (clear.includes(id)) throw new Error(`${label}: a chart's id in the clear`);
    if (/"langPage"|"more"/.test(clear)) throw new Error(`${label}: Compare's way in the clear`);
    await page.reload({ waitUntil: "load" });
    await page.getByTestId("compare").waitFor({ timeout: 30000 });
    await page.waitForFunction(() => document.querySelector("[data-testid=compare]")?.getAttribute("data-mode") === "languages", null, { timeout: 15000 }).catch(() => {
      throw new Error(`${label}: the two languages did not come back`);
    });
    if ((await attr(page, pane("b"), "data-page")) !== "bazi") throw new Error(`${label}: B came back on ${await attr(page, pane("b"), "data-page")}`);
    // People again: the four as they were.
    await page.getByTestId("compare-way-people").click();
    await waitPanes(page, label, 4);
    const back = await page.evaluate(() => ["c", "d"].map((w) => document.querySelector(`[data-testid=compare-pane-${w}]`)?.getAttribute("data-chart")));
    if (JSON.stringify(back) !== JSON.stringify(ids)) throw new Error(`${label}: C and D came back as ${back}`);
    // Two moments: B's year kept.
    await goStudioPage(page, "bazi-luck");
    await page.getByTestId("compare-way-moments").click();
    await page.waitForFunction(() => document.querySelector("[data-testid=compare-pane-b] [data-testid=bazi-luck-year]") != null, null, { timeout: 30000 });
    const year = Number(await page.locator("[data-testid=compare-pane-b] [data-testid=bazi-luck-year]").textContent());
    await until((rec) => rec.mode === "moments" && rec.moment?.page === "bazi-luck" && rec.moment?.year === year, "B's moment not kept");
    await page.reload({ waitUntil: "load" });
    await page.getByTestId("compare").waitFor({ timeout: 30000 });
    await page.waitForFunction((y) => Number(document.querySelector("[data-testid=compare-pane-b] [data-testid=bazi-luck-year]")?.textContent) === y, year, { timeout: 30000 }).catch(() => {
      throw new Error(`${label}: B's moment did not come back as ${year}`);
    });
    console.log("compare persistence of the ways OK");
  } finally {
    await browser.close();
  }
}

// node scripts/e2e/compare.mjs [widths][,more]: all of it by default; widths alone, the two-people runs at those
// widths; with "more", the ideas B7 and B8 legs alone (at those widths, if any).
const args = process.argv[2] ? process.argv[2].split(",") : [];
const only = args.filter((a) => /^\d+$/.test(a)).map(Number);
const more = !args.length || args.includes("more");
const two = !args.includes("more");
const at = (w) => !only.length || only.includes(w);
for (const r of RUNS) if (two && at(r.width)) await run(r);
if (two && at(1440)) await persistence();
if (more) {
  for (const r of MORE_RUNS) if (at(r.width)) await people(r);
  for (const r of [MORE_RUNS[1], MORE_RUNS[3]]) if (at(r.width)) await mixed(r);
  if (at(390)) await finger();
  if (at(1440)) await persistenceMore();
}
void PAGE_PLACE;
console.log("compare OK");
