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
 *     Progressions; Human Design; numerology and its Cycles; Chinese
 *     astrology and its Cycles; BaZi and its Cycles; Feng Shui's Kua): both
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
 * One width by hand: node scripts/e2e/compare.mjs 390
 */
import { FIXTURE_A, FIXTURE_B, PAGE_PLACE, assertNoOverflow, castFixture, clickTestId, createSpace, gotoApp, goStudioPage, launch, openExport, readSpaceRecord, serverFnName, setLang, setSpaceLock, setView } from "./_lib.mjs";
import { watchSent } from "./_sent.mjs";

/** Each page: where both panes have drawn, what a press chooses (and what the other chart is asked for). */
const PAGES = [
  { id: "natal", ready: "svg[data-depth-base] [data-kind=planet][data-body=sun]", wheel: "sun", want: "planet:sun", shared: true },
  { id: "transits", ready: "svg[data-depth-base] [data-kind=planet][data-body=sun]", wheel: "sun" },
  { id: "progressions", ready: "svg[data-depth-base] [data-kind=planet][data-body=sun]", wheel: "sun" },
  { id: "design", ready: ".ulune-hd-gate:not([data-tone=off])", press: "[data-testid=hd-fact-type]", want: "hello:type", shared: true, lacks: true },
  { id: "numerology", ready: "[data-testid=numerology-tile-lifepath]", press: "[data-testid=numerology-tile-lifepath]", want: "core:lifepath", merged: "num-merged-lifepath" },
  { id: "numerology-cycles", ready: "[data-testid=num-month-1]", press: "[data-testid=num-month-1]" },
  { id: "zodiac", ready: "[data-testid=zodiac-card-year]", press: "[data-testid=zodiac-card-year]", want: "zk:year", shared: true },
  { id: "zodiac-years", ready: "[data-testid=zodiac-year]", press: "[data-testid=zodiac-year]" },
  { id: "bazi", ready: "[data-testid=bazi-stem-day]", press: "[data-testid=bazi-stem-day]", want: "bz:stem:day", shared: true, merged: "bazi-merged-day" },
  { id: "bazi-luck", ready: "[data-testid=bazi-flow-year]", press: "[data-testid=bazi-flow-year]" },
  { id: "fengshui", ready: "[data-testid^=fengshui-kua-]", press: "[data-testid^=fengshui-kua-]", shared: true, keys: "[data-dir][tabindex='0']" },
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

const only = process.argv[2] ? process.argv[2].split(",").map(Number) : null;
for (const r of RUNS) if (!only || only.includes(r.width)) await run(r);
if (!only || only.includes(1440)) await persistence();
void PAGE_PLACE;
console.log("compare OK");
