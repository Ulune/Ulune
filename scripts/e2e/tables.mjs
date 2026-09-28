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

const PARTS = ["identity", "points", "houses", "aspects", "grid", "patterns", "balance", "ranking"];

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
    const top = await headTop(page, id);
    // The part lands just under the bar, unless the page ends first.
    const atEnd = s.scrollTop >= s.max - 2;
    if (!atEnd && Math.abs(top - s.barBottom) > 2) {
      throw new Error(`${label}: ${id} landed at ${top}, bar bottom ${s.barBottom}`);
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
