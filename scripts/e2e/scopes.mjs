/*
 * The Compare foundation (share and compare plan, feature 2, "Work" step 1):
 * every studio page can be drawn twice, for two charts, side by side. The
 * development harness (src/studio/dev/scope-harness.tsx, switched on with
 * window.__uluneScopeHarness) draws the page on screen in two chart scopes, A
 * the chart shown (Fixture A) and B the other one (Fixture B). For every page
 * that Compare will show, in the figure and the table views, at 1280 px (side
 * by side) and 390 px (stacked):
 *   - both copies draw, each with its own chart's data (their text differs;
 *     the Sun's sign, the Life Path, the year's animal, the Day Master, the
 *     Kua are each person's own);
 *   - a choice in A lights A only, B's stays empty, and a choice in B leaves
 *     A's; each pane reads its own chart (their readings differ);
 *   - no element id appears twice on the page (main page and both copies);
 *   - no error in the console;
 *   - the main page is left as it was: its selection, its chart, its stage.
 * The Calendar and Feng Shui's Home stay the main page's only: the harness
 * says so and draws nothing. Development only (the harness is not built).
 */
import { FIXTURE_A, FIXTURE_B, castFixture, gotoApp, goStudioPage, launch, setView } from "./_lib.mjs";

/**
 * How each page is checked: where its figure has drawn, what a press chooses, what differs between the
 * two people. A Relationship page (`pair`: its people lists' prefix) pairs each pane's own chart with
 * the other person: its A is that pane's chart (the lists say so), though a pair read both ways (a
 * composite) may draw the same.
 */
const PAGES = [
  { id: "natal", ready: "svg[data-depth-base] [data-kind=planet][data-body=sun]", wheel: "sun", reads: [/^Sun\s[\s\S]*Gemini/, /^Sun\s[\s\S]*Scorpio/], hover: "[data-hello-cell=sun]" },
  { id: "transits", ready: "svg[data-depth-base] [data-kind=planet][data-body=sun]", wheel: "sun", dial: "transit-scrubber" },
  { id: "progressions", ready: "svg[data-depth-base] [data-kind=planet][data-body=sun]", wheel: "sun", dial: "progressions-slider" },
  { id: "synastry", ready: "svg[data-depth-base] [data-kind=planet][data-body=sun]", wheel: "sun", pair: "synastry" },
  { id: "composite", ready: "svg[data-depth-base] [data-kind=planet][data-body=sun]", wheel: "sun", pair: "composite" },
  { id: "design", ready: ".ulune-hd-gate:not([data-tone=off])", press: ".ulune-hd-gate:not([data-tone=off])" },
  { id: "numerology", ready: "[data-testid=numerology-tile-lifepath]", press: "[data-testid=numerology-tile-lifepath]", own: { sel: "[data-testid=numerology-tile-lifepath] .ulune-num-tile-n", a: /(^|\/)4$/, b: /(^|\/)3$/ } },
  { id: "numerology-cycles", ready: "[data-testid=num-month-1]", press: "[data-testid=num-month-1]" },
  { id: "zodiac", ready: "[data-testid=zodiac-card-year]", press: "[data-testid=zodiac-card-year]", own: { sel: "[data-testid=zodiac-card-year]", a: /Horse/, b: /Rabbit/ } },
  { id: "zodiac-years", ready: "[data-testid=zodiac-year]", press: "[data-testid=zodiac-year]" },
  { id: "zodiac-pair", ready: "[data-testid=zodiac-pair] button[aria-pressed]", press: "[data-testid=zodiac-pair] button[aria-pressed]", pair: "zodiac-pair" },
  { id: "bazi", ready: "[data-testid=bazi-stem-day]", press: "[data-testid=bazi-stem-day]", own: { sel: "[data-testid=bazi-stem-day]" } },
  { id: "bazi-luck", ready: "[data-testid=bazi-flow-year]", press: "[data-testid=bazi-flow-year]" },
  { id: "bazi-pair", ready: "[data-testid^=bazi-pair-meet-]", press: "[data-testid^=bazi-pair-meet-]", pair: "bazi-pair" },
  { id: "fengshui", ready: "[data-testid^=fengshui-kua-]", press: "[data-testid^=fengshui-kua-]", own: { sel: "[data-testid^=fengshui-kua-]" } },
  { id: "fengshui-pair", ready: "[data-testid=fengshui-pair-kua-a]", press: "[data-testid=fengshui-pair-kua-a]", pair: "fengshui-pair" },
];
const MAIN_ONLY = ["timing", "fengshui-home"];

const harness = (page, on) => page.evaluate((next) => window.__uluneScopeHarness?.(next), on);
const pane = (id) => `[data-testid=scope-pane-${id}]`;
const attr = (page, sel, name) => page.evaluate(([s, n]) => document.querySelector(s)?.getAttribute(n) ?? null, [sel, name]);

/** Where each copy's dial stands (the main page's first, then A's and B's), ms. */
const dialValues = (page, testId) => page.evaluate((tid) => [...document.querySelectorAll(`[data-testid="${tid}"]`)].map((el) => Number(el.getAttribute("data-value"))), testId);

/** ← → on the page with nothing in focus: how far the main page's dial moved. */
async function pageStep(page, testId) {
  await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined));
  const before = await dialValues(page, testId);
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(500);
  const after = await dialValues(page, testId);
  return { before, after, step: after[0] - before[0] };
}

/** Every id on the page that more than one element carries. */
async function duplicateIds(page) {
  return page.evaluate(() => {
    const seen = new Map();
    for (const el of document.querySelectorAll("[id]")) if (el.id) seen.set(el.id, (seen.get(el.id) ?? 0) + 1);
    return [...seen].filter(([, n]) => n > 1).map(([id, n]) => `${id}×${n}`);
  });
}

/** Presses the page's chosen piece inside one pane: a wheel's body where it is drawn, else the element itself. */
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

async function selectedOf(page, who, want, label) {
  const sel = `${pane(who)}[data-selected]`;
  try {
    await page.waitForFunction(([s, w]) => (w === "any" ? Boolean(document.querySelector(s)?.getAttribute("data-selected")) : document.querySelector(s)?.getAttribute("data-selected") === w), [sel, want], { timeout: 6000 });
  } catch {
    throw new Error(`${label}: pane ${who} selected "${await attr(page, sel, "data-selected")}", expected ${want === "any" ? "a choice" : `"${want}"`}`);
  }
  return attr(page, sel, "data-selected");
}

async function checkPage(page, spec, width, errors) {
  const label = `${width} ${spec.id}`;
  await harness(page, false);
  await goStudioPage(page, spec.id);
  const mainSel = await page.evaluate(() => document.querySelector("[data-testid=chart-chip]")?.textContent ?? "");
  // The main page's ← → step, alone, to compare with the step taken with both copies drawn.
  const alone = spec.dial ? (await pageStep(page, spec.dial)).step : 0;
  const before = await duplicateIds(page);
  if (before.length) throw new Error(`${label}: the main page alone repeats ids ${before.join(", ")}`);
  await harness(page, true);
  await page.locator("[data-testid=scope-harness]").waitFor({ timeout: 8000 });
  const mainSelected = await attr(page, "[data-testid=scope-harness]", "data-main-selected");
  for (const who of ["a", "b"]) {
    await page.locator(`${pane(who)} ${spec.ready}`).first().waitFor({ state: "attached", timeout: 20000 }).catch(() => {
      throw new Error(`${label}: pane ${who} drew no figure`);
    });
  }
  const text = (who) => page.locator(`${pane(who)} .ob-figure`).first().innerText();
  const [ta, tb] = [await text("a"), await text("b")];
  if (!ta.trim() || !tb.trim()) throw new Error(`${label}: an empty figure`);
  if (spec.pair) {
    const person = (who, ab) => page.locator(`${pane(who)} [data-testid=${spec.pair}-person-${ab}]`).first().inputValue();
    const [aa, ab, ba, bb] = [await person("a", "a"), await person("a", "b"), await person("b", "a"), await person("b", "b")];
    if (!aa || !ba || aa === ba || aa !== bb || ab !== ba) throw new Error(`${label}: the panes' people are ${aa} & ${ab}, ${ba} & ${bb}`);
    if (aa !== (await attr(page, pane("a"), "data-chart")) || ba !== (await attr(page, pane("b"), "data-chart"))) throw new Error(`${label}: a pane's A is not its own chart`);
  } else if (ta === tb && !spec.wheel) throw new Error(`${label}: both panes draw the same thing`);
  if (spec.wheel && !spec.pair) {
    const svg = (who) => page.locator(`${pane(who)} svg[data-depth-base]`).first().evaluate((el) => el.textContent ?? "");
    if ((await svg("a")) === (await svg("b"))) throw new Error(`${label}: both wheels draw the same chart`);
  }
  if (spec.own) {
    const own = (who) => page.locator(`${pane(who)} ${spec.own.sel}`).first().innerText();
    const [oa, ob] = [(await own("a")).trim(), (await own("b")).trim()];
    if (oa === ob) throw new Error(`${label}: both panes show "${oa}"`);
    if (spec.own.a && !spec.own.a.test(oa)) throw new Error(`${label}: A shows "${oa}"`);
    if (spec.own.b && !spec.own.b.test(ob)) throw new Error(`${label}: B shows "${ob}"`);
  }
  const dupsOn = await duplicateIds(page);
  if (dupsOn.length) throw new Error(`${label}: repeated ids with both copies drawn: ${dupsOn.join(", ")}`);

  // Pointing at A's panel previews on A's figure only, never on B's nor on the main page's.
  if (spec.hover) {
    const cell = page.locator(`${pane("a")} ${spec.hover}`).first();
    await cell.scrollIntoViewIfNeeded();
    await cell.hover();
    const focus = () => page.evaluate(() => ["[data-testid=scope-pane-a]", "[data-testid=scope-pane-b]", ".ob-body > .ob-stage"].map((r) => document.querySelector(`${r} svg[data-depth-base]`)?.getAttribute("data-focus-id") ?? ""));
    await page.waitForFunction(() => document.querySelector("[data-testid=scope-pane-a] svg[data-depth-base]")?.getAttribute("data-focus-id") === "planet:sun", null, { timeout: 4000 }).catch(async () => {
      throw new Error(`${label}: pointing at A's Sun lit ${JSON.stringify(await focus())}`);
    });
    const [, fb, fm] = await focus();
    if (fb || fm) throw new Error(`${label}: pointing in A lit B's "${fb}" or the main page's "${fm}"`);
    await page.mouse.move(1, 1);
  }
  // One time for every copy: ← → on the page steps it once, as with the main page alone (a month's
  // step is 28 to 31 days: one step, not two or three, is what counts).
  if (spec.dial) {
    const { before, after, step } = await pageStep(page, spec.dial);
    if (before.length !== 3) throw new Error(`${label}: ${before.length} dials on the page`);
    if (!(step > 0 && step < alone * 1.5) || after.some((v, i) => v - before[i] !== step)) throw new Error(`${label}: one press moved the dials by ${after.map((v, i) => v - before[i]).join(", ")} (alone: ${alone})`);
  }

  // A choice in A is A's only.
  await press(page, spec, "a");
  const chosenA = await selectedOf(page, "a", "any", label);
  if (await attr(page, pane("b"), "data-selected")) throw new Error(`${label}: choosing in A chose in B too`);
  if ((await attr(page, "[data-testid=scope-harness]", "data-main-selected")) !== mainSelected) throw new Error(`${label}: choosing in A changed the main page's choice`);
  // The same piece in B: B's own, A's kept.
  await press(page, spec, "b");
  await selectedOf(page, "b", "any", label);
  await selectedOf(page, "a", chosenA, label);
  if ((await attr(page, "[data-testid=scope-harness]", "data-main-selected")) !== mainSelected) throw new Error(`${label}: choosing in B changed the main page's choice`);
  // Each reads its own chart.
  const reading = (who) => page.locator(`[data-testid=scope-reading-${who}]`).innerText();
  await page.waitForFunction(() => ["a", "b"].every((w) => document.querySelector(`[data-testid=scope-reading-${w}]`)?.getAttribute("data-reading")), null, { timeout: 8000 }).catch(() => {});
  const [ra, rb] = [await reading("a"), await reading("b")];
  if (spec.reads) {
    if (!spec.reads[0].test(ra)) throw new Error(`${label}: A reads "${ra.slice(0, 120)}"`);
    if (!spec.reads[1].test(rb)) throw new Error(`${label}: B reads "${rb.slice(0, 120)}"`);
  }
  if (ra && rb && ra === rb && spec.wheel && !spec.pair) throw new Error(`${label}: both panes read "${ra.slice(0, 80)}"`);
  // Let go in A: B keeps its choice.
  await press(page, spec, "a");
  await selectedOf(page, "a", "", label);
  await selectedOf(page, "b", "any", label);

  // The table view: both tables, still no repeated id.
  await harness(page, false);
  await setView(page, "table");
  await harness(page, true);
  await page.waitForFunction(() => ["a", "b"].every((w) => document.querySelector(`[data-testid=scope-stage-${w}][data-view=table] .ob-figure`)?.textContent?.trim()), null, { timeout: 20000 }).catch(() => {
    throw new Error(`${label}: a table did not draw in a pane`);
  });
  await page.waitForFunction(() => !document.querySelector("[data-testid=scope-harness] [data-testid=table-loading]"), null, { timeout: 15000 }).catch(() => {});
  const tableDups = await duplicateIds(page);
  if (tableDups.length) throw new Error(`${label}: repeated ids in the table view: ${tableDups.join(", ")}`);
  const tables = await page.evaluate(() => ["a", "b"].map((w) => document.querySelector(`[data-testid=scope-stage-${w}] .ob-figure`)?.textContent ?? ""));
  if (tables[0] === tables[1] && !spec.pair) throw new Error(`${label}: both tables are the same`);
  await harness(page, false);
  await setView(page, "wheel");

  // The main page as it was.
  if ((await page.evaluate(() => document.querySelector("[data-testid=chart-chip]")?.textContent ?? "")) !== mainSel) throw new Error(`${label}: the main chart changed`);
  if (await page.locator("[data-testid=scope-harness], [data-chart-scope]").count()) throw new Error(`${label}: something of the harness stayed on the main page`);
  if (errors.length) throw new Error(`${label}: console errors: ${errors.slice(0, 3).join(" | ")}`);
}

async function run(width) {
  const { browser, page } = await launch(width);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  try {
    await gotoApp(page);
    await castFixture(page, FIXTURE_B);
    await castFixture(page, FIXTURE_A);
    if (!(await page.evaluate(() => typeof window.__uluneScopeHarness === "function"))) throw new Error("no harness here (a build, not the development server?)");
    for (const spec of PAGES) {
      await checkPage(page, spec, width, errors);
      console.log(`scopes ${width} ${spec.id} OK`);
    }
    for (const id of MAIN_ONLY) {
      await harness(page, false);
      await goStudioPage(page, id);
      await harness(page, true);
      await page.getByTestId("scope-harness-main-only").waitFor({ timeout: 8000 });
      if (await page.locator("[data-testid^=scope-pane-]").count()) throw new Error(`${width} ${id}: drawn in a scope`);
      await harness(page, false);
      console.log(`scopes ${width} ${id} main only OK`);
    }
    if (errors.length) throw new Error(`${width}: console errors: ${errors.slice(0, 3).join(" | ")}`);
  } finally {
    await browser.close();
  }
}

// One width or more by hand (node scripts/e2e/scopes.mjs 390); both by default.
const widths = process.argv[2] ? process.argv[2].split(",").map(Number) : [1280, 390];
for (const width of widths) await run(width);
console.log("scopes OK");
