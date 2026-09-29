import { join } from "node:path";
import {
  DEV,
  FIXTURE_A,
  SHOTS,
  assertFixtureA,
  assertNoOverflow,
  castFixture,
  clickDockTab,
  ensureShotsDir,
  gotoApp,
  keepCharts,
  launch,
  pickPlace,
} from "./_lib.mjs";

/*
 * The table as one page (part 47): every part one under the other in a single
 * scroll, a bar of links pinned at the top. A link lands its part's heading
 * just under the bar and gives it the focus; the link of the part being read
 * is marked (aria-current) as the page scrolls; column headers pin under the
 * bar; nothing scrolls sideways.
 */

const PARTS = ["identity", "points", "houses", "aspects", "grid", "dignities", "patterns", "balance", "stars"];

/** The table's scroller, its bar and the marked link. */
async function pageState(page) {
  return page.evaluate(() => {
    const fig = document.querySelector(".ob-stage--table .ob-figure");
    const bar = document.querySelector("[data-testid=table-bar]");
    return {
      scrollTop: fig ? fig.scrollTop : -1,
      max: fig ? fig.scrollHeight - fig.clientHeight : -1,
      sideways: fig ? fig.scrollWidth - fig.clientWidth : -1,
      figTop: fig ? fig.getBoundingClientRect().top : 0,
      barTop: bar ? bar.getBoundingClientRect().top : -1,
      barBottom: bar ? bar.getBoundingClientRect().bottom : -1,
      current: document.querySelector("[data-testid=table-bar] [aria-current=true]")?.getAttribute("data-part") ?? null,
      focus: document.activeElement?.id ?? "",
    };
  });
}

/** Wait until the page stops scrolling (a glide takes a few hundred ms). */
async function settle(page) {
  let last = -1;
  for (let i = 0; i < 40; i += 1) {
    await page.waitForTimeout(80);
    const now = await page.evaluate(() => document.querySelector(".ob-stage--table .ob-figure")?.scrollTop ?? 0);
    if (Math.abs(now - last) < 0.5) return;
    last = now;
  }
}

async function headTop(page, id) {
  return page.locator(`#table-part-${id}-h`).evaluate((el) => el.closest("section").getBoundingClientRect().top);
}

async function checkLinks(page, label) {
  for (const id of PARTS) {
    await page.getByTestId(`table-section-${id}`).click();
    await settle(page);
    const s = await pageState(page);
    if (s.current !== id) throw new Error(`${label}: ${id} link: marked ${s.current}`);
    if (s.focus !== `table-part-${id}-h`) throw new Error(`${label}: ${id} link: focus on "${s.focus}"`);
    if (Math.abs(s.barTop - s.figTop) > 1) throw new Error(`${label}: bar not pinned (${s.barTop} vs ${s.figTop})`);
    // The part lands just under the bar, unless the page ends first. On a busy machine the glide can
    // start late, after the scroll looked settled: allow it up to 3 s to arrive.
    let top = await headTop(page, id);
    let at = s;
    for (let i = 0; i < 30 && !(at.scrollTop >= at.max - 2) && Math.abs(top - at.barBottom) > 2; i += 1) {
      await page.waitForTimeout(100);
      at = await pageState(page);
      top = await headTop(page, id);
    }
    const atEnd = at.scrollTop >= at.max - 2;
    if (!atEnd && Math.abs(top - at.barBottom) > 2) {
      throw new Error(`${label}: ${id} landed at ${top}, bar bottom ${at.barBottom}`);
    }
  }
}

async function checkFollow(page, label) {
  // Scroll by hand to the houses: their link is marked.
  await page.evaluate(() => {
    const fig = document.querySelector(".ob-stage--table .ob-figure");
    const bar = document.querySelector("[data-testid=table-bar]");
    const part = document.getElementById("table-part-houses");
    fig.scrollTop += part.getBoundingClientRect().top - bar.getBoundingClientRect().bottom + 30;
  });
  await settle(page);
  let s = await pageState(page);
  if (s.current !== "houses") throw new Error(`${label}: scrolled to the houses, marked ${s.current}`);
  // Up to the very top: the first part.
  await page.evaluate(() => {
    document.querySelector(".ob-stage--table .ob-figure").scrollTop = 0;
  });
  await settle(page);
  s = await pageState(page);
  if (s.current !== PARTS[0]) throw new Error(`${label}: at the top, marked ${s.current}`);
  // Down to the very end: the last part, however short.
  await page.evaluate(() => {
    const fig = document.querySelector(".ob-stage--table .ob-figure");
    fig.scrollTop = fig.scrollHeight;
  });
  await settle(page);
  s = await pageState(page);
  if (s.current !== PARTS.at(-1)) throw new Error(`${label}: at the end, marked ${s.current}`);
}

async function checkNoSideways(page, label) {
  const s = await pageState(page);
  if (s.sideways > 1) throw new Error(`${label}: the table scrolls sideways by ${s.sideways}px`);
  await assertNoOverflow(page);
}

/*
 * Houses and aspects (part 49): each house's size, ruler and bodies inside;
 * the aspects' sort, filters and folded mirrors; the parallels; the grid's
 * orbs and its parallels switch.
 */
async function checkHousesAspects(page, width) {
  const label = `${width} houses and aspects`;
  const house1 = await page.locator("[data-testid=table-houses] tr[data-house='1']").innerText();
  if (!/21°24'/.test(house1) || !/Mercury in Gemini, house 10/.test(house1) || !/Virgo on cusps 1 and 2/.test(house1)) {
    throw new Error(`${label}: the 1st house reads "${house1}"`);
  }
  const intercepted = await page.getByTestId("intercepted-4").innerText();
  if (intercepted !== "intercepted sign: Sagittarius") throw new Error(`${label}: house 4 reads "${intercepted}"`);
  const trad = await page.locator("[data-testid=table-houses] tr[data-house='4'] [data-ruler=mars]").innerText();
  if (!/Mars in Aries, house 8/.test(trad) || !/traditional/.test(trad)) throw new Error(`${label}: Scorpio's traditional ruler reads "${trad}"`);
  // A glyph inside a house chooses that body, not the house.
  await page.locator("[data-testid=inside-10] [data-body=sun]").click();
  const chosen = await page.locator("[data-testid=studio-table][data-chart-pick]").getAttribute("data-selected");
  if (chosen !== "planet:sun") throw new Error(`${label}: the Sun's glyph in house 10 chose "${chosen}"`);

  const rows = () => page.locator("[data-testid=table-aspects] table:not(.ulune-parallels) tbody tr").count();
  const count = () => page.getByTestId("aspects-count").innerText();
  if ((await rows()) !== 129) throw new Error(`${label}: ${await rows()} aspect rows, expected 129`);
  if ((await count()) !== "159 aspects · 30 mirrors shown under their aspect") throw new Error(`${label}: count reads "${await count()}"`);
  const first = await page.locator("[data-testid=table-aspects] tbody tr").first().getAttribute("data-aspect");
  if (first !== "jupiter_conjunction_chiron") throw new Error(`${label}: the tightest major first, not ${first}`);
  const uranus = await page.locator("[data-testid=table-aspects] tr[data-aspect=uranus_trine_ascendant]").innerText();
  if (!/3°01'\s+of 6°/.test(uranus) || !/mirror: Uranus sextile Descendant/.test(uranus)) throw new Error(`${label}: Uranus trine ASC reads "${uranus}"`);
  const oos = await page.locator("[data-testid=table-aspects] tr[data-out-of-sign='1']").count();
  if (oos !== 3) throw new Error(`${label}: ${oos} rows out of sign, expected 3 (the others are mirrors)`);
  await page.getByTestId("aspects-minors").uncheck();
  if ((await rows()) >= 129) throw new Error(`${label}: minors off left ${await rows()} rows`);
  if (await page.locator("[data-testid=table-aspects] tr[data-minor='1']").count()) throw new Error(`${label}: a minor aspect with minors off`);
  await page.getByTestId("aspects-minors").check();
  await page.getByTestId("aspects-angles").uncheck();
  if ((await rows()) !== 101) throw new Error(`${label}: angles off, ${await rows()} rows`);
  await page.getByTestId("aspects-angles").check();
  await page.getByTestId("aspects-unfold").check();
  if ((await rows()) !== 159) throw new Error(`${label}: mirrors unfolded, ${await rows()} rows`);
  if (await page.getByTestId("aspect-mirror").count()) throw new Error(`${label}: mirror lines left when unfolded`);
  await page.getByTestId("aspects-unfold").uncheck();
  await page.getByTestId("aspects-sort-aspect").click();
  const byAspect = await page.locator("[data-testid=table-aspects] tbody tr").first().getAttribute("data-aspect");
  if (!/_conjunction_/.test(byAspect ?? "")) throw new Error(`${label}: by aspect, first is ${byAspect}`);
  await page.getByTestId("aspects-sort-body").click();
  const byBody = await page.locator("[data-testid=table-aspects] tbody tr").first().getAttribute("data-aspect");
  if (!/^sun_/.test(byBody ?? "")) throw new Error(`${label}: by body, first is ${byBody}`);
  await page.getByTestId("aspects-sort-orb").click();
  // The parallels: 17 rows, the Sun contra-parallel Uranus among them.
  const parallels = await page.locator("[data-testid=table-parallels] tbody tr").count();
  if (parallels !== 17) throw new Error(`${label}: ${parallels} parallels, expected 17`);
  const sunUranus = await page.locator("[data-testid=table-parallels] tr[data-parallel='sun|contra|uranus']").innerText();
  if (!/Contra-parallel/.test(sunUranus) || !/0°12'/.test(sunUranus) || !/\+23°18'30" \/ −23°30'48"/.test(sunUranus)) {
    throw new Error(`${label}: the Sun and Uranus read "${sunUranus}"`);
  }
  // The grid: orbs in the cells; A or S on a wide grid; the parallels above the diagonal.
  const cell = page.locator("[data-testid=aspect-grid] button[aria-label^='Jupiter Conjunction Chiron']");
  const cellText = (await cell.locator(".ob-agrid-orb").innerText()).replace(/\s+/g, "");
  const wide = (await page.getByTestId("aspect-grid").evaluate((el) => el.clientWidth)) >= 600;
  if (cellText !== (wide ? "0°11'A" : "0°11")) throw new Error(`${label}: the Jupiter–Chiron cell reads "${cellText}"`);
  if (await page.locator("[data-testid=aspect-grid] td.ob-agrid-par").count()) throw new Error(`${label}: parallels before the switch`);
  await page.getByTestId("grid-parallels").check();
  const par = await page.locator("[data-testid=aspect-grid] td.ob-agrid-par[data-kind]").count();
  if (par < 5) throw new Error(`${label}: ${par} parallels in the grid`);
  await checkNoSideways(page, `${label} grid with parallels`);
  await page.getByTestId("grid-parallels").uncheck();
}

/*
 * Dignities (part 50): the chart ruler, the dignity table and its scores,
 * the dispositors and the receptions; the patterns' shapes merged, the
 * dominant first.
 */
async function checkDignities(page, width) {
  const label = `${width} dignities`;
  const ruler = await page.getByTestId("dignities-ruler").innerText();
  if (!/Mercury in Gemini, house 10/.test(ruler) || !/\+7/.test(ruler)) throw new Error(`${label}: the chart ruler reads "${ruler}"`);
  const scores = {};
  for (const id of ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"]) {
    scores[id] = (await page.getByTestId(`dignity-score-${id}`).innerText()).split(/\s+/)[0];
  }
  const want = { sun: "+1", moon: "−5", mercury: "+7", venus: "+8", mars: "+5", jupiter: "+4", saturn: "+7" };
  if (JSON.stringify(scores) !== JSON.stringify(want)) throw new Error(`${label}: scores ${JSON.stringify(scores)}`);
  const own = await page.locator("[data-testid=dignities-table] tr[data-planet=mercury] .ulune-dig-ruler.is-own").count();
  if (own !== 2) throw new Error(`${label}: Mercury holds ${own} marked dignities, expected 2 (domicile, term)`);
  if (width < 800) {
    const head = await page.locator("[data-testid=dignities-table] thead").evaluate((el) => getComputedStyle(el).display);
    if (head !== "none") throw new Error(`${label}: the dignity table keeps its header on a narrow page`);
  }
  const finals = await page.getByTestId("dispositors-finals").innerText();
  for (const name of ["Mercury", "Venus", "Mars", "Saturn"]) if (!finals.includes(name)) throw new Error(`${label}: finals read "${finals}"`);
  const receptions = await page.locator("[data-testid=dignities-receptions] li[data-kind]").evaluateAll((els) => els.map((el) => el.getAttribute("data-kind")));
  if (receptions.join(",") !== "exaltation,domicile") throw new Error(`${label}: receptions ${receptions.join(",")}`);
  await page.locator("[data-testid=dignities-table] tr[data-planet=venus] .ulune-row-pick").click();
  const chosen = await page.locator("[data-testid=studio-table][data-chart-pick]").getAttribute("data-selected");
  if (chosen !== "planet:venus") throw new Error(`${label}: the Venus row chose "${chosen}"`);
  const shapes = await page.locator("[data-testid=table-patterns] li[data-shape]").evaluateAll((els) =>
    els.map((el) => `${el.getAttribute("data-shape")}${el.getAttribute("data-dominant") ? "*" : ""}`),
  );
  if (shapes.join(",") !== "kite*,kite,mysticRectangle,grandTrine,tsquare") throw new Error(`${label}: shapes ${shapes.join(",")}`);
  const tsquare = await page.locator("[data-testid=table-patterns] li[data-shape=tsquare]").innerText();
  if (!/Jupiter or Chiron, Neptune or Uranus/.test(tsquare) || !/4 ways/.test(tsquare)) throw new Error(`${label}: the T-square reads "${tsquare}"`);
  const tightest = await page.getByTestId("aspects-tightest").innerText();
  if (tightest !== "Tightest major: Jupiter conjunction Chiron, 0°11'") throw new Error(`${label}: the tightest reads "${tightest}"`);
}

/*
 * Stars and balance (part 51): the fixed stars and the midpoints with the
 * bodies on them, the bodies in each balance row, the Moon's course, and a
 * part's glossary words.
 */
async function checkStars(page, width) {
  const label = `${width} stars`;
  const stars = await page.locator("[data-testid=stars-fixed] tbody tr").count();
  const midpoints = await page.locator("[data-testid=stars-midpoints] tbody tr").count();
  if (stars !== 6 || midpoints !== 5) throw new Error(`${label}: ${stars} stars, ${midpoints} midpoints`);
  const sunMoon = await page.locator("[data-testid=stars-midpoints] tr[data-midpoint=sun-moon]").innerText();
  if (!/Vesta\s*0°38'/.test(sunMoon)) throw new Error(`${label}: the Sun/Moon midpoint reads "${sunMoon}"`);
  const earth = await page.locator("[data-testid=table-balance] .ob-bal[data-group=elements] li[data-row=earth] .ob-bal-bodies [data-body]").count();
  if (earth !== 6) throw new Error(`${label}: ${earth} bodies in earth, expected 6`);
  const course = await page.locator("[data-testid=table-patterns] [data-pattern=voc]").innerText();
  if (!/next aspect: trine Pluto, 15 Jun 1990, 12:04 UT/.test(course)) throw new Error(`${label}: the Moon's course reads "${course}"`);
  // A part's words fold open under its hint.
  await page.getByTestId("table-terms-stars").locator("summary").click();
  await page.locator("[data-testid=table-terms-stars] [data-term=fixedStar]").waitFor({ timeout: 8000 });
  await page.getByTestId("table-terms-stars").locator("summary").click();
}

async function runViewport(width) {
  const { browser, page } = await launch(width);
  try {
    await gotoApp(page);
    // The chart comes back when an address is opened: a private space that stays unlocked here.
    await keepCharts(page);
    await castFixture(page, FIXTURE_A);
    await page.goto(`${DEV}/?studio=table`, { waitUntil: "load", timeout: 20000 });
    await page.waitForSelector("html.theme-ready", { timeout: 20000 });
    await page.locator("section[data-testid=studio-table]").waitFor({ timeout: 15000 });
    await page.getByTestId("table-points").waitFor({ timeout: 8000 });

    // Every part on one page, in order, with the first one marked.
    const order = await page.locator("[data-testid=table-page] > section").evaluateAll((els) =>
      els.map((el) => el.getAttribute("data-testid")),
    );
    if (order.join(",") !== PARTS.map((id) => `table-${id}`).join(",")) {
      throw new Error(`parts ${order.join(",")}`);
    }
    await settle(page);
    const first = await pageState(page);
    if (first.current !== PARTS[0]) throw new Error(`?studio=table marked ${first.current}, not ${PARTS[0]}`);
    const bar = await page.getByTestId("table-bar").evaluate((el) => ({ tag: el.tagName, label: el.getAttribute("aria-label") }));
    if (bar.tag !== "NAV" || !bar.label) throw new Error(`the bar is not a named navigation: ${JSON.stringify(bar)}`);

    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 8000 }),
      page.getByTestId("table-csv").click(),
    ]);
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const csv = Buffer.concat(chunks).toString("utf8");
    const firstLine = csv.split(/\r?\n/)[0];
    if (firstLine !== "section,field,value") {
      throw new Error(`CSV first line expected section,field,value got "${firstLine}"`);
    }

    await checkNoSideways(page, `${width}`);
    await noDecimalDegree(page, `${width}`);
    await checkHousesAspects(page, width);
    await checkDignities(page, width);
    await checkStars(page, width);
    await checkLinks(page, `${width}`);
    await checkFollow(page, `${width}`);

    if (width === 390) {
      // Rows fold into items: no column headers, no column-group tabs.
      const thead = await page.locator("[data-testid=table-points] thead").evaluate((el) => getComputedStyle(el).display);
      if (thead !== "none") throw new Error(`390: points header shows (${thead})`);
      if (await page.locator("[data-testid^=table-group-]").count()) throw new Error("390: column-group tabs still there");
      const sun = await page.locator("[data-testid=table-points] tr[data-body=sun]").innerText();
      if (!/Gemini/.test(sun) || !/\+23°18'30"/.test(sun)) throw new Error(`390: the Sun's item lacks its facts: ${sun}`);
    }

    if (width === 1280) {
      // Column headers pin under the bar while their table scrolls past.
      await page.getByTestId("table-section-aspects").click();
      await settle(page);
      await page.evaluate(() => {
        document.querySelector(".ob-stage--table .ob-figure").scrollTop += 700;
      });
      await settle(page);
      const pin = await page.evaluate(() => ({
        th: document.querySelector("[data-testid=table-aspects] thead th").getBoundingClientRect().top,
        bar: document.querySelector("[data-testid=table-bar]").getBoundingClientRect().bottom,
      }));
      if (Math.abs(pin.th - pin.bar) > 1) throw new Error(`1280: aspect headers at ${pin.th}, bar bottom ${pin.bar}`);
      // With the side panel folded away the stage is wider: still nothing sideways.
      await page.getByTestId("dock-collapse").click();
      await page.waitForTimeout(500);
      await checkNoSideways(page, "1280 panel folded");
      const cols = await page.locator("[data-testid=table-points] thead th").evaluateAll((els) =>
        els.filter((el) => getComputedStyle(el).display !== "none").length,
      );
      if (cols !== 8) throw new Error(`1280 panel folded: ${cols} points columns, expected 8`);
      await page.getByTestId("dock-collapse").click();
      await page.waitForTimeout(500);
      // With reduced motion a link jumps: the part is there at once.
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.getByTestId("table-section-houses").click();
      await page.waitForTimeout(60);
      const s = await pageState(page);
      const top = await headTop(page, "houses");
      if (Math.abs(top - s.barBottom) > 2) throw new Error(`1280 reduced motion: houses at ${top}, bar ${s.barBottom}`);
      await page.emulateMedia({ reducedMotion: "no-preference" });
    }

    // The keyboard reaches a row: Enter on its button chooses it.
    await page.getByTestId("table-section-points").click();
    await settle(page);
    await page.locator("[data-testid=table-points] tr[data-body=mars] .ulune-row-pick").focus();
    await page.keyboard.press("Enter");
    const byKey = await page.locator("[data-testid=studio-table][data-chart-pick]").getAttribute("data-selected");
    if (byKey !== "planet:mars") throw new Error(`Enter on the Mars row chose "${byKey}"`);

    // The part last read comes back after a trip to the wheel.
    await page.getByTestId("table-section-balance").click();
    await settle(page);
    await page.getByTestId("view-wheel").click();
    await page.getByTestId("studio-natal").waitFor({ timeout: 20000 });
    await page.getByTestId("view-table").click();
    await page.getByTestId("table-points").waitFor({ timeout: 8000 });
    await settle(page);
    const back = await pageState(page);
    if (back.current !== "balance") throw new Error(`back from the wheel, marked ${back.current}`);

    await page.goto(`${DEV}/?view=wheel`, { waitUntil: "load", timeout: 20000 });
    await page.waitForSelector("html.theme-ready", { timeout: 20000 });
    await page.getByTestId("studio-natal").waitFor({ timeout: 20000 });
    await clickDockTab(page, "data");
    await page.getByTestId("table-points").waitFor({ timeout: 8000 });
    const moon = page.locator("[data-testid=table-points] [data-body=moon]");
    await moon.waitFor({ state: "attached", timeout: 8000 });
    await moon.scrollIntoViewIfNeeded();
    await moon.click({ force: true });
    const tableSel = await page.locator("[data-testid=studio-table][data-chart-pick]").getAttribute("data-selected");
    if (tableSel !== "planet:moon") throw new Error(`store selectedId expected planet:moon, got "${tableSel}"`);
    const selected = await moon.getAttribute("data-selected");
    if (selected !== "1") throw new Error(`moon row not selected (data-selected=${selected})`);
    const tdBg = await moon.locator("td").first().evaluate((el) => getComputedStyle(el).backgroundColor);
    if (!tdBg || tdBg === "rgba(0, 0, 0, 0)" || tdBg === "transparent") {
      throw new Error(`selected moon row has no bg-bg-subtle (${tdBg})`);
    }
    await clickDockTab(page, "reading");
    await page.getByTestId("click-note").waitFor({ timeout: 8000 });
    await clickDockTab(page, "data");
    await page.getByTestId("table-houses").waitFor({ timeout: 8000 });

    const houses = await page.locator(".ulune-house-id-n").evaluateAll((els) =>
      els.map((el) => ({
        text: el.textContent?.trim() ?? "",
        font: getComputedStyle(el).fontFamily,
      })),
    );
    if (houses.length !== 12) throw new Error(`expected 12 house rows, got ${houses.length}`);
    const nums = houses.map((h) => h.text).join(",");
    if (nums !== "1,2,3,4,5,6,7,8,9,10,11,12") throw new Error(`house digits ${nums}`);
    for (const h of houses) {
      if (/astronomicon|starfont/i.test(h.font)) {
        throw new Error(`house number used glyph face: ${h.font}`);
      }
      if (!/mono|plex|ibm/i.test(h.font)) {
        throw new Error(`house number not mono: ${h.font}`);
      }
    }

    await page.getByTestId("table-section-points").click();
    await settle(page);
    await assertFixtureA(page);
    await page.screenshot({
      path: join(SHOTS, `w6-tables-${width}.png`),
      timeout: 4000,
      animations: "disabled",
    }).catch(() => {});
    console.log(`w6-tables-${width} OK`);
  } finally {
    await browser.close();
  }
}

/*
 * Exact points (part 48): a chart without a birth time says so and marks what
 * hangs on the time (~); a birth at a station gives the station's moment; no
 * decimal degree anywhere on the page.
 */
async function openTable(page, fixture) {
  await page.waitForSelector("#birth-date", { timeout: 20000 });
  await page.locator("#native-name").fill(fixture.name);
  await page.locator("#birth-date").fill(fixture.date);
  if (fixture.time) await page.locator("#birth-time").fill(fixture.time);
  else await page.getByTestId("time-unknown").check();
  await pickPlace(page, fixture.place);
  await page.getByTestId("cast-submit").click();
  // A cast from the table's own new-chart form comes back to the table.
  await page.locator("[data-testid=studio-natal], [data-testid=table-points]").first().waitFor({ timeout: 45000 });
  if (!(await page.getByTestId("table-points").count())) await page.getByTestId("view-table").click();
  await page.getByTestId("table-points").waitFor({ timeout: 15000 });
  await page.waitForFunction((name) => document.querySelector("[data-testid=table-fact-name]")?.textContent?.includes(name), fixture.name, { timeout: 15000 });
  await settle(page);
}

async function noDecimalDegree(page, label) {
  const text = await page.getByTestId("table-page").innerText();
  const hit = /\d[.,]\d+ ?°|°\/d/.exec(text);
  if (hit) throw new Error(`${label}: a decimal degree on the page: "${text.slice(Math.max(0, hit.index - 40), hit.index + 20)}"`);
}

async function runExact() {
  const { browser, page } = await launch(1280);
  try {
    await gotoApp(page);
    await openTable(page, { name: "NoTimeQA", date: "15/06/1990", time: "", place: "Paris, France" });
    const born = await page.getByTestId("table-fact-born").innerText();
    if (!/time unknown/.test(born) || /12:00/.test(born.split("\n")[0])) throw new Error(`no time: born reads "${born}"`);
    const sect = await page.getByTestId("table-fact-sect").innerText();
    if (!sect.startsWith("~")) throw new Error(`no time: the sect reads "${sect}"`);
    if (!(await page.locator("[data-testid=table-points] .ulune-unknown-note").count())) throw new Error("no time: no note over the points");
    const asc = await page.locator("[data-testid=table-points] tr[data-body=ascendant]").getAttribute("data-uncertain");
    if (asc !== "1") throw new Error("no time: the Ascendant is not marked");
    const moon = await page.locator("[data-testid=table-points] tr[data-body=moon] td[data-col=position]").innerText();
    if (!moon.startsWith("~") || !/over the day/.test(moon)) throw new Error(`no time: the Moon's position reads "${moon}"`);
    const pluto = await page.locator("[data-testid=table-points] tr[data-body=pluto] td[data-col=position]").innerText();
    if (pluto.startsWith("~")) throw new Error(`no time: Pluto is marked though it barely moves: "${pluto}"`);
    const cusp = await page.locator("[data-testid=table-houses] tr[data-house='1']").getAttribute("data-uncertain");
    if (cusp !== "1") throw new Error("no time: the first cusp is not marked");
    const size = await page.locator("[data-testid=table-houses] tr[data-house='1'] td[data-col=size]").innerText();
    if (!size.startsWith("~")) throw new Error(`no time: the first house's size reads "${size}"`);
    // The parallels say which may not hold all day: the Moon's, the angles'.
    if (!(await page.locator("[data-testid=table-parallels] .ulune-unknown-note").count())) throw new Error("no time: no note over the parallels");
    const moonPar = await page.locator("[data-testid=table-parallels] tr[data-parallel='moon|contra|mars']").getAttribute("data-uncertain");
    if (moonPar !== "1") throw new Error("no time: the Moon's contra-parallel to Mars is not marked");
    const slowPar = await page.locator("[data-testid=table-parallels] tr[data-parallel='saturn|parallel|neptune']").getAttribute("data-uncertain");
    if (slowPar === "1") throw new Error("no time: Saturn parallel Neptune is marked though it holds all day");
    // The dignities: the chart ruler hangs on the rising sign, the sect on the time.
    if (!(await page.locator("[data-testid=table-dignities] > .ulune-unknown-note").count())) throw new Error("no time: no note over the dignities");
    const rulerMark = await page.locator("[data-testid=dignities-ruler] dd .ob-pick-row").innerText();
    if (!rulerMark.includes("~")) throw new Error(`no time: the chart ruler reads "${rulerMark}"`);
    const sunSect = await page.locator("[data-testid=dignities-table] tr[data-planet=sun] td[data-col=sect]").innerText();
    if (!sunSect.startsWith("~")) throw new Error(`no time: the Sun's sect reads "${sunSect}"`);
    const balance = await page.locator("[data-testid=table-balance] .ob-bal[data-group=hemisphere]").getAttribute("data-uncertain");
    if (balance !== "1") throw new Error("no time: the hemispheres are not marked");
    await noDecimalDegree(page, "no time");
    await checkNoSideways(page, "no time");
    // The side panel says so too: the Ascendant, the houses, the chart ruler and the tightest aspect marked ~,
    // the orb in degrees and minutes; the Ascendant's reading opens with the note.
    const ascPlace = await page.getByTestId("natal-hello-asc-place").innerText();
    if (!ascPlace.startsWith("~")) throw new Error(`no time: the glance's Ascendant reads "${ascPlace}"`);
    const marked = await page.locator("[data-testid=glance-highlights] [data-uncertain='1']").count();
    if (marked < 2) throw new Error(`no time: ${marked} glance lines marked`);
    const glance = await page.getByTestId("glance-highlights").innerText();
    if (/\d[.,]\d+ ?°/.test(glance) || !/\d+°\d\d'/.test(glance)) throw new Error(`no time: the glance's orbs read "${glance}"`);
    await page.getByTestId("natal-hello-asc").click();
    await page.getByTestId("reading-time").waitFor({ timeout: 8000 });
    // Back to the glance.
    await page.keyboard.press("Escape");
    await page.getByTestId("glance-highlights").waitFor({ timeout: 8000 });

    await page.getByTestId("chart-chip").click();
    await page.getByTestId("new-chart").click();
    await openTable(page, { name: "StationQA", date: "09/11/2025", time: "20:00", place: "London, United Kingdom" });
    const station = await page.getByTestId("station-mercury").innerText();
    if (!/^station retrograde 9 Nov 2025, 19:0\d UT$/.test(station)) throw new Error(`station: Mercury reads "${station}"`);
    const words = await page.locator("[data-testid=table-points] tr[data-body=mercury] td[data-col=motion]").innerText();
    if (!/retrograde · stationary/.test(words)) throw new Error(`station: Mercury's motion reads "${words}"`);
    const dignity = await page.getByTestId("dignity-mercury").innerText();
    if (!/^−4\s+detriment · face$/.test(dignity.trim())) throw new Error(`station: Mercury's dignity reads "${dignity}"`);
    await noDecimalDegree(page, "station");
    await checkNoSideways(page, "station");
    const glanceKnown = await page.getByTestId("glance-highlights").innerText();
    if (glanceKnown.includes("~") || /\d[.,]\d+ ?°/.test(glanceKnown)) throw new Error(`station: the glance reads "${glanceKnown}"`);
    console.log("exact points OK");
  } finally {
    await browser.close();
  }
}

await ensureShotsDir();
const fail = [];
for (const width of [390, 768, 1280]) {
  try {
    await runViewport(width);
  } catch (err) {
    fail.push(`${width}: ${err instanceof Error ? err.message : String(err)}`);
  }
}
try {
  await runExact();
} catch (err) {
  fail.push(`exact: ${err instanceof Error ? err.message : String(err)}`);
}
if (fail.length) {
  console.error("W6 TABLES FAIL\n" + fail.map((l) => "- " + l).join("\n"));
  process.exit(1);
}
console.log("W6 TABLES OK", SHOTS);
