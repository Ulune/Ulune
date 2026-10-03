import { join } from "node:path";
import {
  DEV,
  FIXTURE_A,
  FIXTURE_B,
  SHOTS,
  assertFixtureA,
  assertNoOverflow,
  castFixture,
  clickDockTab,
  ensureShotsDir,
  goStudioPage,
  gotoApp,
  launch,
  setLang,
} from "./_lib.mjs";

async function goMode(page, id) {
  await goStudioPage(page, id);
}

async function typeField(page, selector, value) {
  const el = page.locator(selector).first();
  await el.click();
  await el.fill("");
  await el.pressSequentially(value, { delay: 15 });
}

async function runViewport(width) {
  const { browser, page } = await launch(width);
  try {
    await gotoApp(page);
    await clickDockTab(page, "birth");
    await castFixture(page, FIXTURE_A);
    await page.getByTestId("studio-natal").waitFor({ timeout: 45000 });
    await assertFixtureA(page);
    await clickDockTab(page, "reading");
    await page.getByTestId("chart-snapshot").waitFor({ timeout: 8000 });
    const natalSun = page.locator("svg.ulune-wheel:not(.ulune-wheel-ghost) [data-kind=planet][data-body=sun]").first();
    await natalSun.evaluate((el) => {
      if (el instanceof SVGElement) el.focus();
    });
    await page.keyboard.press("Enter");
    // Choosing on the chart keeps the panel as it is: its reading is opened from the Reading tab.
    await clickDockTab(page, "reading");
    await page.getByTestId("click-note").waitFor({ timeout: 8000 });
    const sunNote = await page.getByTestId("click-note").innerText();
    if (!/sun|soleil/i.test(sunNote)) throw new Error(`planet click-note missing sun: "${sunNote.slice(0, 80)}"`);
    await natalSun.evaluate((el) => {
      if (el instanceof SVGElement) el.focus();
    });
    await page.keyboard.press("Enter");
    await page.waitForTimeout(250);
    if (await page.getByTestId("click-note").count()) {
      throw new Error("empty wheel did not clear click-note");
    }
    console.log(`${width} natal`);

    await goMode(page, "transits");
    await page.getByTestId("studio-transits").waitFor({ timeout: 20000 });
    const native = await page.evaluate(() => document.querySelector("input[type=date],input[type=time]"));
    if (native) throw new Error("native date/time input still present");
    await page.getByTestId("transit-clock").waitFor();
    await page.getByTestId("transit-ring").waitFor({ timeout: 30000 });
    await page.waitForFunction(
      () => document.querySelectorAll("[data-testid=transit-ring] [data-transit]").length >= 10,
      null,
      { timeout: 30000 },
    );
    const glyphs = await page.locator("[data-testid=transit-ring] [data-transit]").count();
    if (glyphs < 10) throw new Error(`transit-ring glyphs ${glyphs} < 10`);
    await page.getByTestId("transit-date").fill("07/09/2026");
    await page.getByTestId("transit-time").fill("12:00");
    const liveAfterType = await page.getByTestId("transit-clock").getAttribute("data-live");
    if (liveAfterType !== "0") {
      throw new Error(`expected pinned after typing clock, data-live=${liveAfterType}`);
    }
    const pinnedLabel = await page.getByTestId("transit-clock").innerText();
    if (!/pinned|figé/i.test(pinnedLabel)) {
      throw new Error(`skyPinned label missing: "${pinnedLabel}"`);
    }
    await page.getByTestId("transit-now").click();
    const liveAfterNow = await page.getByTestId("transit-clock").getAttribute("data-live");
    if (liveAfterNow !== "1") {
      throw new Error(`expected live after Now, data-live=${liveAfterNow}`);
    }
    // The time dial (part 87d): a step forward is exactly one step of the size
    // chosen, back returns to the same minute, and a drag along the tape
    // settles on whole steps.
    const scrub = page.getByTestId("transit-scrubber");
    await page.getByTestId("transit-scrubber-unit").selectOption("hour");
    const before = Number(await scrub.getAttribute("data-value"));
    await page.getByTestId("transit-scrubber-forward").click();
    await page.waitForFunction((b) => Number(document.querySelector("[data-testid=transit-scrubber]").dataset.value) !== b, before);
    const oneHour = Number(await scrub.getAttribute("data-value")) - before;
    if (oneHour !== 3_600_000) throw new Error(`a step forward moved ${oneHour} ms, not an hour`);
    await page.getByTestId("transit-scrubber-back").click();
    await page.waitForFunction((b) => Number(document.querySelector("[data-testid=transit-scrubber]").dataset.value) === b, before);
    const box = await scrub.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 - 41, box.y + box.height / 2, { steps: 6 });
    await page.waitForTimeout(150); // held still: no flick
    await page.mouse.up();
    await page.waitForTimeout(150);
    const dragged = Number(await scrub.getAttribute("data-value")) - before;
    if (dragged !== 5 * 3_600_000) throw new Error(`a 41 px drag at 8 px an hour moved ${dragged / 3_600_000} h, not 5`);
    const after = await page.getByTestId("transit-scrubber-readout").innerText();
    if (!after) throw new Error("the dial has no readout");
    const outerSun = page.locator("[data-testid=transit-ring] [data-kind=transit][data-transit=sun]");
    await outerSun.focus();
    await page.keyboard.press("Enter");
    await clickDockTab(page, "reading");
    await page.getByTestId("click-note").waitFor({ timeout: 8000 });
    await clickDockTab(page, "reading");
    await clickDockTab(page, "data");
    await page.getByTestId("transit-table").waitFor({ timeout: 8000 });
    for (const col of ["orb", "phase", "exact"]) {
      if (!(await page.getByTestId(`transit-col-${col}`).count())) {
        throw new Error(`missing transit-col-${col}`);
      }
    }
    await clickDockTab(page, "reading");
    await page.locator("[data-testid=transit-ring]").click({ position: { x: 8, y: 8 } }).catch(() => {});
    await clickDockTab(page, "reading");
    await page.waitForTimeout(200);
    if (await page.getByTestId("click-note").count()) {
      await page.evaluate(() => document.body.click());
    }
    console.log(`${width} transits`);

    await goMode(page, "timing");
    await page.getByTestId("studio-timing").waitFor({ timeout: 20000 });
    await page.getByTestId("timing-scope-month").click();
    await page.getByTestId("calendar-month").waitFor({ timeout: 8000 });
    // The sky arrives by date: each day has its Moon, and the Now panel reads it.
    await page.waitForFunction(
      () => document.querySelectorAll("[data-testid^=calendar-day-] .ulune-moon").length >= 28,
      null,
      { timeout: 20000 },
    );
    await clickDockTab(page, "reading");
    await page.getByTestId("calendar-now-moon").waitFor({ timeout: 20000 });
    // Your transits land on their days (worked out on this device).
    await page.waitForFunction(
      () => [...document.querySelectorAll("[data-testid^=calendar-day-]")].some((el) => Number(el.getAttribute("data-mine")) > 0),
      null,
      { timeout: 30000 },
    );
    // The switch hides them, and brings them back.
    await page.getByTestId("calendar-switch-yours").click();
    await page.waitForFunction(() => !document.querySelector(".ulune-cal-you"), null, { timeout: 4000 });
    await page.getByTestId("calendar-switch-yours").click();
    await page.waitForFunction(() => Boolean(document.querySelector(".ulune-cal-you")), null, { timeout: 4000 });
    // Universal time: the clock line says so.
    await page.getByTestId("calendar-zone-select").selectOption("utc");
    await page.waitForFunction(() => /Universal time/.test(document.querySelector("[data-testid=calendar-zone-line]")?.textContent ?? ""), null, { timeout: 4000 });
    await page.getByTestId("calendar-zone-select").selectOption("device");
    await page.waitForFunction(() => !/Universal time/.test(document.querySelector("[data-testid=calendar-zone-line]")?.textContent ?? ""), null, { timeout: 4000 });
    const dayCell = page.locator("[data-testid^=calendar-day-]").first();
    const dayId = await dayCell.getAttribute("data-testid");
    await dayCell.click();
    await clickDockTab(page, "reading");
    await page.getByTestId("click-note").waitFor({ timeout: 8000 });
    // A day opens its reading and the month stays.
    if (!(await page.getByTestId("calendar-month").isVisible())) throw new Error("picking a day left the month");
    const dayNote = await page.getByTestId("click-note").innerText();
    if (!dayNote.trim()) throw new Error("timing day click-note empty");
    const selectedDay = await page.evaluate(() => {
      const note = document.querySelector("[data-testid=click-note]");
      return note ? note.textContent : "";
    });
    if (!selectedDay?.trim()) throw new Error(`timing day ${dayId} did not open reading`);
    // The day: its Moon, its agenda (the sky's and yours), a row's reading, the Moon's, and Transits at that minute.
    await page.getByTestId("timing-scope-day").click();
    await page.getByTestId("calendar-day").waitFor({ timeout: 8000 });
    await page.locator("[data-testid=calendar-row-sky]").first().waitFor({ timeout: 20000 });
    await page.locator("[data-testid=calendar-row-sky]").first().click();
    await clickDockTab(page, "reading");
    await page.getByTestId("reading-card").waitFor({ timeout: 8000 });
    await page.getByTestId("calendar-moonbar").click();
    await clickDockTab(page, "reading");
    const toTransits = page.locator("[data-ref^='transits-at:']").first();
    await toTransits.waitFor({ timeout: 8000 });
    const at = Number((await toTransits.getAttribute("data-ref")).split(":")[1]);
    await toTransits.click();
    await page.getByTestId("studio-transits").waitFor({ timeout: 20000 });
    const d = new Date(at);
    const want = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    const shown = await page.locator("#transit-time").inputValue().catch(() => "");
    if (shown && shown !== want) throw new Error(`Transits opened at ${shown}, not ${want}`);
    await goMode(page, "timing");
    await page.getByTestId("studio-timing").waitFor({ timeout: 20000 });
    // The year: a timeline on a wide stage, a card per month on a narrow one; a big transit opens its reading.
    await page.getByTestId("timing-scope-year").click();
    await page.getByTestId("calendar-year").waitFor({ timeout: 30000 });
    const wide = width >= 1024;
    const bigTransit = wide ? page.locator("[data-testid^=calendar-year-transit-]").first() : page.locator("[data-testid=calendar-year-months] .ulune-cal-effect-line:not(.is-num)").first();
    await bigTransit.waitFor({ timeout: 40000 });
    await bigTransit.click();
    await clickDockTab(page, "reading");
    await page.getByTestId("reading-card").waitFor({ timeout: 8000 });
    await page.getByTestId("timing-scope-month").click();
    await clickDockTab(page, "birth");
    const nameField = page.locator("#native-name");
    await nameField.click();
    const currentName = await nameField.inputValue();
    await nameField.fill(`${currentName} T`);
    await page.getByTestId("cast-submit").click();
    await page.getByTestId("studio-timing").waitFor({ timeout: 45000 });
    console.log(`${width} timing`);

    await goMode(page, "progressions");
    await page.getByTestId("studio-progressions").waitFor({ timeout: 20000 });
    const pType = await page.getByTestId("progressions-date").getAttribute("type");
    if (pType === "date") throw new Error("progressions-date is native date");
    await page.getByTestId("progressed-ring").waitFor({ timeout: 30000 });
    const yearsBefore = await page.getByTestId("progressions-years").innerText();
    // Ten steps on (a month each by default) from the tape, by keyboard.
    await page.getByTestId("progressions-slider").focus();
    await page.keyboard.press("PageUp");
    await page.waitForTimeout(400);
    const yearsAfter = await page.getByTestId("progressions-years").innerText();
    if (yearsAfter === yearsBefore) throw new Error("progressions slider did not change years");
    await page.getByTestId("progressed-ring").waitFor();
    console.log(`${width} progressions`);

    await goMode(page, "synastry");
    await page.getByTestId("synastry-add-second").or(page.getByTestId("synastry-add-second-wheel")).first().click();
    await page.locator("form[data-mode=partner]").waitFor({ timeout: 8000 });
    await clickDockTab(page, "birth");
    await page.locator("#native-name").fill(FIXTURE_B.name);
    await typeField(page, "#birth-date", FIXTURE_B.date);
    await typeField(page, "#birth-time", FIXTURE_B.time);
    await page.locator("#birth-place").fill(FIXTURE_B.place);
    const list = page.locator("#birth-place-list [role=option] button");
    try {
      await list.first().waitFor({ timeout: 12000 });
      await list.first().click();
    } catch {
      await page.locator("#birth-place").press("Enter");
    }
    await page.getByTestId("cast-submit").click();
    await page.getByTestId("studio-synastry").waitFor({ timeout: 45000 });
    await page.getByTestId("synastry-ring").waitFor({ timeout: 15000 });
    const bName = await page.getByTestId("synastry-person-b").evaluate((el) =>
      el instanceof HTMLSelectElement ? el.options[el.selectedIndex]?.textContent ?? "" : "",
    );
    if (!bName.includes(FIXTURE_B.name)) throw new Error(`synastry B ${bName}`);
    const partnerSun = page.locator("[data-testid=synastry-ring] [data-kind=transit][data-transit=sun]");
    await partnerSun.focus();
    await page.keyboard.press("Enter");
    await clickDockTab(page, "reading");
    await page.getByTestId("click-note").waitFor({ timeout: 8000 });
    await page.locator("[data-testid=synastry-ring]").click({ position: { x: 8, y: 8 } }).catch(() => {});
    await clickDockTab(page, "reading");
    await setLang(page, "fr");
    const helloTitle = page.locator("[data-testid=synastry-hello-sun] [data-hello-title]");
    await helloTitle.waitFor({ timeout: 8000 });
    const frHello = await helloTitle.innerText();
    if (!/soleil/i.test(frHello)) throw new Error(`synastry hello FR still English: "${frHello}"`);
    await setLang(page, "en");
    await clickDockTab(page, "data");
    await page.getByTestId("synastry-table").waitFor({ timeout: 8000 });
    console.log(`${width} synastry`);

    await goMode(page, "composite");
    await page.getByTestId("studio-composite").waitFor({ timeout: 20000 });
    await page.getByTestId("composite-wheel").waitFor({ timeout: 15000 });
    await clickDockTab(page, "data");
    await page.getByTestId("composite-table").waitFor({ timeout: 8000 });
    console.log(`${width} composite`);

    await goMode(page, "design");
    await page.getByTestId("studio-humandesign").waitFor({ timeout: 20000 });
    await page.getByTestId("hd-graph").waitFor({ timeout: 30000 });
    await page.getByTestId("hd-view-personality").click();
    await page.getByTestId("hd-gate-12").click();
    await clickDockTab(page, "reading");
    await page.getByTestId("click-note").waitFor({ timeout: 8000 });
    await clickDockTab(page, "data");
    await page.getByTestId("hd-table").waitFor({ timeout: 8000 });
    console.log(`${width} design`);

    await goMode(page, "numerology");
    await page.getByTestId("studio-numerology").waitFor({ timeout: 20000 });
    await page.getByTestId("numerology-ring").waitFor();
    await page.getByTestId("numerology-digit-4").click();
    await clickDockTab(page, "reading");
    await page.getByTestId("click-note").waitFor({ timeout: 8000 });
    await clickDockTab(page, "data");
    await page.getByTestId("numerology-table").waitFor({ timeout: 8000 });
    console.log(`${width} numerology`);

    await goMode(page, "natal");
    await page.getByTestId("studio-natal").waitFor({ timeout: 15000 });
    await assertFixtureA(page);
    await assertNoOverflow(page);
    await page.screenshot({ path: join(SHOTS, `w5-modes-${width}.png`), timeout: 4000, animations: "disabled" }).catch(() => {});
    console.log(`w5-modes-${width} OK`);
  } finally {
    await browser.close();
  }
}

await ensureShotsDir();
const fail = [];
for (const width of [390, 1280]) {
  try {
    await runViewport(width);
  } catch (err) {
    fail.push(`${width}: ${err instanceof Error ? err.message : String(err)}`);
  }
}
if (fail.length) {
  console.error("W5 MODES FAIL\n" + fail.map((l) => "- " + l).join("\n"));
  process.exit(1);
}
console.log("W5 MODES OK", SHOTS);
void DEV;
