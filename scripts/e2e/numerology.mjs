/*
 * The numerology wheel (part 60 of the launch), with a made-up person,
 * Camille Marie Laurent, born 15 June 1990:
 *   - the drawing: nine numbers round the band, every letter of the name on
 *     its number (vowels inside), the karmic lessons dashed, the hidden
 *     passion marked, the six core discs with a karmic debt written whole,
 *     the Life Path in the centre, the year's disc outside with the month's
 *     and the day's ticks;
 *   - pointing lights what makes a number (Soul Urge: the vowels, and only
 *     them); a click opens the reading; the keyboard walks the wheel and
 *     Enter opens a part;
 *   - the year stepper moves the year's disc and its cycles, and comes back;
 *   - a Y switched by hand moves to the other track and changes the numbers;
 *   - the Table view (part 61): one scroll with its parts in order, the lit
 *     link following the scroll, every number with its steps, the CSV, a Y
 *     switched from the name's letters, no English left in French;
 *   - the life line (part 62) and the Calendar: the personal month in a
 *     month's title and each day's personal day, the personal year and its
 *     months in the year, a long cycle changing on its birthday (2031), in
 *     the day, the month, the year and the events table, for you alone;
 *   - the readings (part 63): the first read by keyboard, each step lighting
 *     its part of the wheel, then the Life Path's reading with its place and
 *     its karmic debt; the year's chips and the Table view's rows open theirs;
 *   - without a name, only the birth date's numbers; then numerology's names
 *     (part 64) typed in the birth form from the Table view's gate: the name
 *     numbers come at once, the name used now's minor numbers too, with no
 *     new cast, and the chart keeps them;
 *   - in French; on a phone the wheel takes the width, the tiles scroll
 *     sideways and nothing else does.
 */
import { join } from "node:path";
import { chromium } from "playwright";
import { DEV, SHOTS, castFixture, clickDockTab, ensureShotsDir, goStudioPage, gotoApp, serverFnName, setLang } from "./_lib.mjs";

const CAMILLE = { name: "Camille Marie Laurent", date: "15/06/1990", time: "12:00", place: "Paris, France" };
const YOLANDA = { name: "Yolanda Mary Kyle", date: "29/11/1984", time: "12:00", place: "Paris, France" };
const NO_NAME = { name: "", date: "15/06/1990", time: "12:00", place: "Paris, France" };

const root = (n) => (n === 0 ? 0 : 1 + ((n - 1) % 9));
/** The personal year the wheel should show for a calendar year (15 June births). */
const personalYear = (year) => root(6 + 15 + year);

function watch(page) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  return errors;
}

async function open(page, fixture) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("ulune.hint.wheel.v1", "1");
    } catch {
      /* no storage: the hint shows, which the checks do not mind */
    }
  });
  await gotoApp(page, "/");
  await castFixture(page, fixture);
  await goStudioPage(page, "numerology");
  await page.getByTestId("numerology-ring").waitFor({ timeout: 30000 });
  await page.waitForTimeout(1400);
}

const drawing = (page) =>
  page.evaluate(() => {
    const q = (s) => [...document.querySelectorAll(s)];
    const text = (s) => document.querySelector(s)?.textContent?.trim() ?? "";
    return {
      sectors: q('[data-testid^="numerology-digit-"]').length,
      letters: q(".num-letter").map((g) => g.textContent).join(""),
      vowels: q(".num-letter[data-vowel]").map((g) => g.textContent).join(""),
      lessons: q("[data-lesson]").map((g) => g.getAttribute("data-part")),
      passion: q("[data-passion]").map((g) => g.getAttribute("data-part")),
      discs: q(".num-disc").map((g) => `${g.getAttribute("data-part")}=${g.textContent}${g.hasAttribute("data-marked") ? "*" : ""}`),
      centre: text('[data-testid="numerology-core"]'),
      year: text('[data-testid="numerology-year-disc"]'),
      ticks: q(".num-tick").length,
      tiles: q('[data-testid^="numerology-tile-"]').map((b) => `${b.textContent}${b.disabled ? "!" : ""}`),
    };
  });

/** Camille's age on a day. */
function ageOn(d) {
  const before = d.getMonth() + 1 < 6 || (d.getMonth() + 1 === 6 && d.getDate() < 15);
  return d.getFullYear() - 1990 - (before ? 1 : 0);
}

async function calendar(page, thisYear) {
  await goStudioPage(page, "timing");
  await page.getByTestId("studio-timing").waitFor({ timeout: 20000 });
  await page.getByTestId("timing-scope-month").click();
  await page.getByTestId("calendar-month").waitFor({ timeout: 8000 });
  const today = new Date();
  const month = today.getMonth() + 1;
  const pm = root(personalYear(thisYear) + month);
  const key = `${thisYear}-${String(month).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const monthView = await page.evaluate((k) => ({
    title: document.querySelector('[data-testid="calendar-num"]')?.textContent ?? "",
    pd: document.querySelector(`[data-testid="calendar-day-${k}"] .ulune-cal-pd`)?.textContent ?? "",
    days: document.querySelectorAll("[data-testid^=calendar-day-] .ulune-cal-pd").length,
    legend: Boolean(document.querySelector('[data-testid="calendar-legend-num"]')),
  }), key);
  const pd = String(root(pm + today.getDate()));
  if (monthView.title !== `Personal month ${pm}` || monthView.pd !== pd || monthView.days < 28 || !monthView.legend) throw new Error(`the month's numerology ${JSON.stringify(monthView)}`);
  await page.getByTestId("calendar-num").click();
  await page.getByTestId("reading-card").waitFor({ timeout: 10000 });
  if (!/Personal month/.test(await page.getByTestId("reading-card").innerText())) throw new Error("the personal month's reading");
  // Your transits off: numerology goes with them, and comes back.
  await page.getByTestId("calendar-switch-yours").click();
  await page.waitForFunction(() => !document.querySelector(".ulune-cal-pd") && !document.querySelector('[data-testid="calendar-num"]'), null, { timeout: 4000 });
  await page.getByTestId("calendar-switch-yours").click();
  await page.waitForFunction(() => Boolean(document.querySelector(".ulune-cal-pd")), null, { timeout: 4000 });
  // The year: its personal year in the title, a band per personal month.
  await page.getByTestId("timing-scope-year").click();
  await page.getByTestId("calendar-year").waitFor({ timeout: 30000 });
  const yearView = await page.evaluate(() => ({
    title: document.querySelector('[data-testid="calendar-num"]')?.textContent ?? "",
    bands: [...document.querySelectorAll('[data-testid^="calendar-year-pm-"]')].map((b) => b.textContent).join(""),
  }));
  const bands = Array.from({ length: 12 }, (_, i) => root(personalYear(thisYear) + i + 1)).join("");
  if (yearView.title !== `Personal year ${personalYear(thisYear)}` || yearView.bands !== bands) throw new Error(`the year's numerology ${JSON.stringify(yearView)}`);
  // 2031, when the third pinnacle and the main challenge begin on 15 June, at 41: a year at a time, each
  // year's sky come before the next (the dev server works out every chunk asked for, even one passed by).
  for (let i = 0; i < 12; i++) {
    const shown = Number((await page.getByTestId("timing-caption").innerText()).trim().slice(0, 4));
    if (shown === 2031) break;
    await page.getByTestId(shown < 2031 ? "timing-next" : "timing-prev").click();
    const next = shown < 2031 ? shown + 1 : shown - 1;
    await page.waitForFunction(
      (y) => document.querySelector('[data-testid="timing-caption"]')?.textContent?.startsWith(String(y)) && document.querySelectorAll(".ulune-cal-tl-phase").length >= 12,
      next,
      { timeout: 45000 },
    );
  }
  await page.getByTestId("calendar-year-numchange-pinnacle-3").click();
  await page.getByTestId("reading-card").waitFor({ timeout: 10000 });
  const change = (await page.getByTestId("reading-card").innerText()).replace(/\s+/g, " ");
  if (!/Pinnacle 3 begins: 1/.test(change) || !/15 Jun 2031, at 41/.test(change) || !/15 Jun 2040, at 50/.test(change)) throw new Error(`the change's reading ${change.slice(0, 200)}`);
  if (!(await page.getByTestId("calendar-year-numchange-challenge-3").count())) throw new Error("the main challenge's change");
  // June 2031: the change on the 15th; that day's own numbers.
  await page.locator(".ulune-cal-tl-axis button").nth(5).click();
  await page.getByTestId("calendar-month").waitFor({ timeout: 8000 });
  const cell = await page.getByTestId("calendar-day-2031-06-15").innerText();
  if (!/Pinnacle 3 → 1/.test(cell) || !/Challenge 3 → 5/.test(cell)) throw new Error(`the 15th: ${cell}`);
  if ((await page.getByTestId("calendar-num").innerText()) !== "Personal month 6") throw new Error("June 2031's personal month");
  await page.getByTestId("calendar-day-2031-06-15").click();
  await page.getByTestId("timing-scope-day").click();
  await page.getByTestId("calendar-numday").waitFor({ timeout: 8000 });
  const day = (await page.getByTestId("calendar-numday").innerText()).replace(/\s+/g, " ");
  if (!/^3 Personal day 3 Personal month 6 · Personal year 9 1 Pinnacle 3 begins: 1 after 7, at 41 5 Challenge 3 begins: 5 after 5, at 41$/.test(day)) throw new Error(`the day's numerology: ${day}`);
  // The events table of that month: the two changes, yours.
  await page.getByTestId("timing-scope-month").click();
  await page.getByTestId("view-table").click();
  await page.locator('[data-testid="calendar-table-row-num"]').first().waitFor({ timeout: 15000 });
  const rows = await page.locator('[data-testid="calendar-table-row-num"]').allInnerTexts();
  if (rows.length !== 2 || !/birthday/.test(rows[0]) || !/Pinnacle 3 begins: 1/.test(rows[0])) throw new Error(`the table's changes ${JSON.stringify(rows)}`);
  await page.getByTestId("view-wheel").click();
  console.log("numerology in the calendar OK");
}

async function desktop() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.setDefaultTimeout(20000);
    const errors = watch(page);
    // The casts sent (numerology's names must not need one).
    const castCalls = [];
    page.on("request", (r) => {
      if (serverFnName(r.url()).startsWith("castChart")) castCalls.push(r.url());
    });
    await open(page, CAMILLE);
    const thisYear = new Date().getFullYear();

    // The drawing.
    const d = await drawing(page);
    const want = {
      sectors: 9,
      letters: "CAMILLEMARIELAURENT",
      vowels: "AIEAIEAUE",
      lessons: ["number:6", "number:7", "number:8"],
      passion: ["number:3"],
      centre: "413/4",
      ticks: 2,
    };
    for (const [k, v] of Object.entries(want)) {
      if (JSON.stringify(d[k]) !== JSON.stringify(v)) throw new Error(`drawing ${k}: ${JSON.stringify(d[k])}`);
    }
    const discs = [...d.discs].sort().join(" ");
    if (discs !== "core:birthday=6 core:expression=3 core:lifepath=13/4* core:maturity=7 core:personality=9 core:soulurge=3") {
      throw new Error(`discs ${discs}`);
    }
    if (d.year !== String(personalYear(thisYear))) throw new Error(`the year's disc ${d.year}`);
    if (d.tiles.join(" ") !== "13/4Life Path 3Expression 3Soul Urge 9Personality 6Birthday 7Maturity") throw new Error(`tiles ${d.tiles}`);
    // Nothing overlaps: every disc clear of every other.
    const touching = await page.evaluate(() => {
      const c = [...document.querySelectorAll(".num-disc-face, .num-centre-face")].map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2, r: r.width / 2 };
      });
      let n = 0;
      for (let i = 0; i < c.length; i++) for (let j = i + 1; j < c.length; j++) if (Math.hypot(c[i].x - c[j].x, c[i].y - c[j].y) < c[i].r + c[j].r) n++;
      return n;
    });
    if (touching) throw new Error(`${touching} discs overlap`);

    // The first read (part 63): five steps by keyboard, each lighting its part of the wheel, then the Life Path's reading.
    await page.getByTestId("numerology-first").waitFor({ timeout: 15000 });
    const firstSteps = [];
    await page.getByTestId("numerology-first-next").focus();
    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(250);
      firstSteps.push(
        await page.evaluate(() => ({
          step: document.querySelector('[data-testid="numerology-first"]')?.getAttribute("data-step"),
          count: document.querySelector('[data-testid="numerology-first-count"]')?.textContent,
          text: document.querySelector(".ulune-num-first-text")?.textContent ?? "",
          vowelsLit: [...document.querySelectorAll(".num-letter[data-vowel]")].every((g) => g.hasAttribute("data-lit")),
          consonantsLit: [...document.querySelectorAll(".num-letter:not([data-vowel])")].some((g) => g.hasAttribute("data-lit")),
          focused: document.activeElement?.getAttribute("data-testid"),
        })),
      );
      await page.keyboard.press("Enter");
    }
    const wantSteps = ["lifepath", "expression", "soulurge", "personality", "personalYear"];
    if (firstSteps.map((x) => x.step).join() !== wantSteps.join() || firstSteps[4].count !== "5 of 5" || firstSteps.some((x) => x.focused !== "numerology-first-next" || x.text.length < 40)) {
      throw new Error(`the first read ${JSON.stringify(firstSteps)}`);
    }
    if (!firstSteps[2].vowelsLit || firstSteps[2].consonantsLit) throw new Error("the Soul Urge step does not light the vowels alone");
    if (!/^A Soul Urge 3 wants to express itself/.test(firstSteps[2].text)) throw new Error(`the Soul Urge step: ${firstSteps[2].text}`);
    await page.getByTestId("click-note").waitFor({ timeout: 8000 });
    if (await page.getByTestId("numerology-first").count()) throw new Error("the first read stayed after Done");
    if (!/^Life Path 13\/4/.test(await page.locator("[data-testid=click-note] h2").first().innerText())) throw new Error("Done did not open the Life Path");
    if ((await page.evaluate(() => localStorage.getItem("ulune.hint.numfirst.v1"))) !== "1") throw new Error("the first read's hint not kept");
    // The Life Path's reading leads with its place: a road of building, then its karmic debt.
    const lpCard = (await page.getByTestId("click-note").innerText()).replace(/\s+/g, " ");
    if (!/A Life Path 4 is a road of building/.test(lpCard) || !/Karmic debt 13/i.test(lpCard)) throw new Error(`the Life Path reading: ${lpCard.slice(0, 300)}`);

    // Pointing at the Soul Urge lights the vowels, and only them.
    await page.getByTestId("numerology-tile-soulurge").hover();
    await page.waitForFunction(() => document.querySelector('[data-testid="numerology-ring"]')?.getAttribute("data-focus") === "hover");
    const lit = await page.evaluate(() => ({
      vowels: [...document.querySelectorAll(".num-letter[data-vowel]")].every((g) => g.hasAttribute("data-lit")),
      consonants: [...document.querySelectorAll(".num-letter:not([data-vowel])")].some((g) => g.hasAttribute("data-lit")),
      disc: document.querySelector('[data-testid="numerology-disc-soulurge"]').getAttribute("data-hero"),
      say: document.querySelector('[data-testid="num-say"]').textContent,
    }));
    if (!lit.vowels || lit.consonants || lit.disc !== "1") throw new Error(`Soul Urge lit ${JSON.stringify(lit)}`);
    if (lit.say !== "Soul Urge 3: 6 + 6 + 9 = 21 → 3") throw new Error(`say ${lit.say}`);
    await page.mouse.move(5, 400);
    await page.waitForTimeout(400);

    // A click on a number opens its reading and keeps it lit.
    await page.getByTestId("numerology-digit-3").click();
    await page.waitForTimeout(500);
    if (!/The number 3/.test(await page.getByTestId("click-note").innerText())) throw new Error("number 3's reading");
    if ((await page.getByTestId("numerology-digit-3").getAttribute("data-chosen")) !== "1") throw new Error("number 3 not kept lit");
    const say3 = await page.getByTestId("num-say").innerText();
    if (!/^3: 5 letters, C L L L U, the most, the hidden passion; Expression 3, Soul Urge 3/.test(say3)) throw new Error(`say for 3: ${say3}`);

    // The keyboard: one stop, the arrows walk, Enter opens.
    await page.getByTestId("num-keys").focus();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);
    if (!/The number 4/.test(await page.getByTestId("click-note").innerText())) throw new Error("Enter on 4");
    if (!/reading opened/.test(await page.getByTestId("num-keys-said").innerText())) throw new Error("Enter says nothing");
    await page.keyboard.press("PageDown");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);
    if (!/^Life Path 13\/4/.test(await page.locator("[data-testid=click-note] h2, [data-testid=click-note] h3").first().innerText())) {
      throw new Error("Page Down, Enter: the first disc");
    }

    // A letter's reading.
    await page.locator('[data-part="letter:0"]').click();
    await page.waitForTimeout(500);
    const letter = await page.getByTestId("click-note").innerText();
    if (!/C = 3/.test(letter) || !/consonant of Camille/.test(letter) || !/cornerstone/.test(letter)) throw new Error(`letter C: ${letter.slice(0, 200)}`);

    // The year stepper: the disc moves, the cycles follow, and the year comes back.
    await page.getByTestId("num-year-next").click();
    await page.waitForTimeout(400);
    const next = await page.evaluate(() => ({
      year: document.querySelector('[data-testid="num-year"]').textContent,
      disc: document.querySelector('[data-testid="numerology-year-disc"]').textContent,
      now: document.querySelector('[data-testid="numerology-year-disc"]').hasAttribute("data-now"),
      ticks: document.querySelectorAll(".num-tick").length,
      chip: document.querySelector('[data-testid="num-chip-year"]').textContent,
    }));
    const py1 = String(personalYear(thisYear + 1));
    if (next.year !== String(thisYear + 1) || next.disc !== py1 || next.now || next.ticks !== 0 || !next.chip.endsWith(py1)) {
      throw new Error(`next year ${JSON.stringify(next)}`);
    }
    for (let i = 0; i < 4; i++) await page.getByTestId("num-year-prev").click();
    const back3 = await page.getByTestId("num-year").innerText();
    if (back3 !== String(thisYear - 3)) throw new Error(`three years back: ${back3}`);
    await page.getByTestId("num-year").click();
    await page.waitForTimeout(300);
    if ((await page.getByTestId("num-year").innerText()) !== String(thisYear)) throw new Error("the year did not come back");
    // Each chip under the stepper opens its reading (part 63).
    await page.getByTestId("num-chip-challenge").click();
    await page.waitForTimeout(400);
    if (!/^Challenge \d · \d/.test(await page.locator("[data-testid=click-note] h2").first().innerText())) throw new Error("the challenge chip's reading");
    await page.screenshot({ path: join(SHOTS, "numerology-1280.png") });

    // The Table view: one scroll under the bar, the parts in order.
    await page.getByTestId("view-table").click();
    await page.getByTestId("numerology-table").waitFor({ timeout: 10000 });
    await page.waitForTimeout(800);
    const order = await page.evaluate(() =>
      [...document.querySelectorAll('[data-testid="numerology-table"] [data-testid="table-page"] > section')].map((e) => e.getAttribute("data-testid")).join(","),
    );
    if (order !== "table-core,table-name,table-grid,table-cycles,table-years,table-bridges,table-numbers") throw new Error(`parts ${order}`);
    const table = await page.evaluate(() => {
      const t = (id) => document.querySelector(`[data-testid="${id}"]`)?.innerText.replace(/\s+/g, " ").trim() ?? "";
      return {
        lp: t("num-core-lifepath"),
        camille: t("num-words-0"),
        counts: t("num-counts"),
        lessons: t("num-detail-lessons"),
        chaldean: t("num-detail-chaldean"),
        full: [...document.querySelectorAll('[data-testid^="num-line-"][data-state="full"]')].map((r) => r.getAttribute("data-testid")),
        pinnacle2: t("num-cycle-pinnacle-2"),
        bridge: t("num-bridge-soulUrgePersonality"),
        years: document.querySelectorAll('[data-testid="num-years"] tr').length,
        sideways: document.querySelector(".ob-stage--table .ob-figure").scrollWidth - document.querySelector(".ob-stage--table .ob-figure").clientWidth,
        words: document.querySelector('[data-testid="numerology-table"]').innerText,
      };
    });
    const want61 = {
      lp: /Life Path 13\/4 karmic debt 13 6 \+ 6 \+ 1 = 13 → 4 the birth date/,
      camille: /Camille C ?3 A ?1 M ?4 I ?9 L ?3 L ?3 E ?5 28 → 10 → 1 15 → 6 13 → 4/,
      counts: /^Letters 3 1 5 2 4 0 0 0 4$/,
      lessons: /Karmic lessons 6, 7, 8/,
      chaldean: /59 → 14 → 5/,
      pinnacle2: /Pinnacle 2 7 32–41/,
      bridge: /3 · 9 6$/,
    };
    for (const [k, re] of Object.entries(want61)) if (!re.test(table[k])) throw new Error(`table ${k}: ${table[k]}`);
    if (table.full.join() !== "num-line-1-5-9" || table.years !== 9 || table.sideways > 1) throw new Error(`table ${JSON.stringify({ ...table, words: "" })}`);
    if (/undefined|NaN|\{[a-z]+\}/.test(table.words)) throw new Error("unfilled words in the table");
    // Its rows open their readings (part 63), and the Table view stays.
    for (const [row, title] of [
      ["num-detail-lessons", /^Karmic lessons 6, 7, 8$/],
      ["num-detail-plane-emotional", /^Emotional plane 11\/2$/],
      ["num-cycle-pinnacle-3", /^Pinnacle 3 · 1$/],
      ["num-bridge-soulUrgePersonality", /^Soul Urge – Personality 6$/],
      ["num-core-attitude", /^Attitude 3$/],
      [`num-year-${thisYear}`, new RegExp(`^${thisYear} · Personal year ${personalYear(thisYear)}$`)],
    ]) {
      await page.getByTestId(row).scrollIntoViewIfNeeded();
      await page.getByTestId(row).click();
      await page.waitForTimeout(400);
      const h = await page.locator("[data-testid=click-note] h2").first().innerText();
      if (!title.test(h.replace(/\s+/g, " "))) throw new Error(`${row} opened «${h}»`);
      if ((await page.getByTestId("view-table").getAttribute("aria-pressed")) !== "true") throw new Error(`${row} left the Table view`);
    }
    // The link of the part being read is lit as the page scrolls.
    await page.evaluate(() => document.querySelector('[data-testid="table-cycles"]').scrollIntoView({ block: "start" }));
    await page.waitForTimeout(700);
    if ((await page.getByTestId("table-section-cycles").getAttribute("aria-current")) !== "true") throw new Error("the bar does not follow the scroll");
    await page.getByTestId("table-section-numbers").click();
    await page.waitForTimeout(1200);
    if ((await page.getByTestId("table-section-numbers").getAttribute("aria-current")) !== "true") throw new Error("the Numbers link not lit");
    // The Lo Shu layout: the same digits, other lines.
    await page.getByTestId("num-grid-loshu").click();
    const loshu = await page.evaluate(() => [...document.querySelectorAll('[data-testid^="num-line-"]')].map((r) => r.getAttribute("data-testid").slice(9)).join(" "));
    if (loshu !== "4-9-2 3-5-7 8-1-6 4-3-8 9-5-1 2-7-6 4-5-6 2-5-8") throw new Error(`Lo Shu lines ${loshu}`);
    // The whole life: from the birth year to 90.
    await page.getByTestId("num-years-life").click();
    if ((await page.locator('[data-testid="num-years"] tr').count()) !== 91) throw new Error("the whole life's years");
    // The CSV, the same in every language.
    const [download] = await Promise.all([page.waitForEvent("download", { timeout: 8000 }), page.getByTestId("table-csv").click()]);
    const chunks = [];
    for await (const chunk of await download.createReadStream()) chunks.push(chunk);
    const csv = Buffer.concat(chunks).toString("utf8");
    if (!csv.startsWith("section,field,value\nnumerology,birthDate,1990-06-15\nnumerology,name,Camille Marie Laurent")) throw new Error(`CSV head ${csv.slice(0, 120)}`);
    const yearRows = csv.split("\n").filter((l) => /^year,\d/.test(l)).length;
    if (!/\ncore,lifepath,4,4,6 \+ 6 \+ 1 = 13 → 4,13,0\n/.test(csv) || yearRows !== 91) throw new Error(`CSV rows: ${yearRows} years`);
    await page.getByTestId("num-years-nine").click();
    // The life line (part 62): the cycles to scale, the ones running now in gold, each new round, the year shown.
    const age = ageOn(new Date());
    const life = await page.evaluate(() => {
      const q = (s) => [...document.querySelectorAll(s)];
      return {
        spans: q('[data-testid^="num-life-"]').map((e) => `${e.getAttribute("data-testid").slice(9)}=${e.querySelector("b").textContent}${e.hasAttribute("data-now") ? "*" : ""}`),
        starts: q(".ulune-num-life-start").length,
        now: Boolean(document.querySelector(".ulune-num-life-now")),
        caption: document.querySelector(".ulune-num-life-caption")?.textContent ?? "",
      };
    });
    const ends = { period: [33, 60], pinnacle: [32, 41, 50], challenge: [32, 41, 50] };
    const nums = { period: ["6", "6", "1"], pinnacle: ["3", "7", "1", "7"], challenge: ["0", "5", "5", "5"] };
    const wantLife = [];
    for (const kind of ["period", "pinnacle", "challenge"]) {
      nums[kind].forEach((n, i) => {
        const from = i === 0 ? 0 : ends[kind][i - 1];
        const to = ends[kind][i];
        wantLife.push(`${kind}-${i + 1}=${n}${age >= from && (to == null || age < to) ? "*" : ""}`);
      });
    }
    if (life.spans.join(" ") !== wantLife.join(" ") || life.starts !== 8 || !life.now || life.caption !== `${thisYear} · age ${age} · personal year ${personalYear(thisYear)}`) {
      throw new Error(`the life line ${JSON.stringify(life)} want ${wantLife.join(" ")}`);
    }
    await page.getByTestId("view-wheel").click();
    await page.getByTestId("numerology-ring").waitFor({ timeout: 10000 });

    // The Calendar (part 62): the personal month in a month's title and each day's personal day,
    // the personal year and its months in the year; a long cycle changing on its birthday, for you alone.
    await calendar(page, thisYear);
    await goStudioPage(page, "numerology");
    await page.getByTestId("numerology-ring").waitFor({ timeout: 30000 });

    // A Y switched by hand.
    await goStudioPage(page, "natal");
    await castFixture(page, YOLANDA);
    await goStudioPage(page, "numerology");
    await page.getByTestId("numerology-ring").waitFor({ timeout: 30000 });
    await page.waitForTimeout(1200);
    const suBefore = await page.getByTestId("numerology-tile-soulurge").innerText();
    if (!/^19\/1/.test(suBefore)) throw new Error(`Yolanda's Soul Urge ${suBefore}`);
    await page.locator('[data-part="letter:0"]').click();
    await page.getByTestId("num-y-switch").waitFor({ timeout: 5000 });
    if ((await page.getByTestId("num-y-consonant").getAttribute("aria-pressed")) !== "true") throw new Error("Yolanda's Y is not a consonant by the rule");
    await page.getByTestId("num-y-vowel").click();
    await page.waitForTimeout(500);
    const after = await page.evaluate(() => ({
      su: document.querySelector('[data-testid="numerology-tile-soulurge"]').textContent,
      vowel: document.querySelector('[data-part="letter:0"]').hasAttribute("data-vowel"),
      say: document.querySelector('[data-testid="num-say"]').textContent,
    }));
    if (!/^8Soul Urge$/.test(after.su) || !after.vowel || !/switched by hand/.test(after.say)) throw new Error(`the Y switched ${JSON.stringify(after)}`);
    await page.getByTestId("num-y-consonant").click();
    await page.waitForTimeout(400);
    if (!/^19\/1/.test(await page.getByTestId("numerology-tile-soulurge").innerText())) throw new Error("the Y did not switch back");
    // The same Y, switched from the name's letters in the Table view.
    await page.getByTestId("view-table").click();
    await page.getByTestId("num-y-0").waitFor({ timeout: 10000 });
    await page.getByTestId("num-y-0").click();
    await page.waitForTimeout(400);
    const suRow = (await page.getByTestId("num-core-soulurge").innerText()).replace(/\s+/g, " ");
    if (!/^Soul Urge 8 /.test(suRow)) throw new Error(`the table's Y switch: ${suRow}`);
    await page.getByTestId("num-y-0").click();
    await page.waitForTimeout(300);
    await page.getByTestId("view-wheel").click();

    // Without a name: the birth date's numbers only, no letters and no lessons.
    await goStudioPage(page, "natal");
    await castFixture(page, NO_NAME);
    await goStudioPage(page, "numerology");
    await page.getByTestId("numerology-ring").waitFor({ timeout: 30000 });
    await page.waitForTimeout(1200);
    const bare = await drawing(page);
    if (bare.letters || bare.lessons.length || bare.passion.length || bare.discs.length !== 2 || !bare.tiles.includes("—Expression!")) {
      throw new Error(`no name ${JSON.stringify(bare)}`);
    }

    // Numerology's names (part 64): the Table view's gate opens the birth form on the full name at
    // birth; typed there (Enter goes on to the name used now), the name numbers come at once, with the
    // name used now's minor numbers, and the chart keeps them without a new cast.
    const castsBefore = castCalls.length;
    await page.getByTestId("view-table").click();
    await page.getByTestId("numerology-add-birth-name").first().click();
    await page.waitForFunction(() => document.activeElement?.id === "birth-full-name", null, { timeout: 10000 });
    await page.keyboard.type("Camille Marie Laurent");
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => document.activeElement?.id === "birth-current-name", null, { timeout: 5000 });
    await page.keyboard.type("Camille Durand");
    await page.keyboard.press("Tab");
    await page.getByTestId("num-name-from").waitFor({ timeout: 10000 });
    const namesNow = async () =>
      page.evaluate(() => ({
        from: document.querySelector('[data-testid="num-name-from"]')?.getAttribute("data-from"),
        expression: document.querySelector('[data-testid="num-core-expression"]')?.innerText.replace(/\s+/g, " "),
        current: Boolean(document.querySelector('[data-testid="num-current"]')),
        summary: document.querySelector('[data-testid="birth-names-val"]')?.textContent,
      }));
    const named = await namesNow();
    if (named.from !== "birth" || !/^Expression 3\b/.test(named.expression ?? "") || !named.current || named.summary !== "Camille Marie Laurent · Camille Durand") {
      throw new Error(`the names typed ${JSON.stringify(named)}`);
    }
    if (castCalls.length !== castsBefore) throw new Error("the names asked for a new cast");
    // Kept with the chart: another chart, then this one again.
    for (const row of [
      '[data-testid=chart-row][data-name="Yolanda Mary Kyle"]',
      '[data-testid=chart-row]:not([data-name="Yolanda Mary Kyle"]):not([data-name="Camille Marie Laurent"])',
    ]) {
      await page.getByTestId("chart-chip").click();
      await page.locator(row).first().getByRole("button").first().click();
      await page.waitForTimeout(900);
    }
    await page.getByTestId("num-name-from").waitFor({ timeout: 10000 });
    const kept = await namesNow();
    if (kept.from !== "birth" || !/^Expression 3\b/.test(kept.expression ?? "") || !kept.current) throw new Error(`the names not kept ${JSON.stringify(kept)}`);

    // A name changed while a cast runs ("Update", its answer held back here) is the one kept after it.
    let hold = true;
    await page.route("**/_serverFn/**", async (route) => {
      if (hold && serverFnName(route.request().url()).startsWith("castChart")) {
        hold = false;
        await new Promise((resolve) => setTimeout(resolve, 2500));
      }
      await route.continue();
    });
    await clickDockTab(page, "birth");
    await page.getByTestId("cast-submit").click();
    await page.locator("#birth-current-name").fill("Camille Rivière");
    await page.locator("#birth-date").focus();
    await page.locator('[data-testid="dock-tab-reading"][aria-selected="true"]').waitFor({ timeout: 20000 });
    await page.unroute("**/_serverFn/**");
    const currentHead = async () => {
      await page.getByTestId("view-table").click();
      await page.getByTestId("num-current").waitFor({ timeout: 10000 });
      const head = await page.locator(".ulune-num-subhead").filter({ hasText: "Name used now" }).first().innerText();
      await page.getByTestId("view-wheel").click();
      return head;
    };
    if (!/Camille Rivière/.test(await currentHead())) throw new Error("the name typed during the cast was lost");
    for (const row of [
      '[data-testid=chart-row][data-name="Yolanda Mary Kyle"]',
      '[data-testid=chart-row]:not([data-name="Yolanda Mary Kyle"]):not([data-name="Camille Marie Laurent"])',
    ]) {
      await page.getByTestId("chart-chip").click();
      await page.locator(row).first().getByRole("button").first().click();
      await page.waitForTimeout(900);
    }
    if (!/Camille Rivière/.test(await currentHead())) throw new Error("the name typed during the cast was not kept with the chart");
    await page.getByTestId("numerology-ring").waitFor({ timeout: 10000 });

    // In French, the wheel and the Table view: no English left.
    await setLang(page, "fr");
    await page.waitForTimeout(800);
    await page.getByTestId("view-table").click();
    await page.getByTestId("numerology-table").waitFor({ timeout: 10000 });
    await page.waitForTimeout(600);
    const frTable = await page.getByTestId("numerology-table").innerText();
    const english = ["The core numbers", "Karmic", "Hidden passion", "Pinnacle", "Challenge", "Personal year", "Vowels", "Consonants", "Letters", "Keywords", "What it stands for", "Between", "Whole life", "Nine years", "Steps", "the birth date", "Add the full name", "Read from", "Change the names", "Name used now", "How the numbers"];
    const left = english.filter((w) => frTable.includes(w));
    if (left.length) throw new Error(`English in the French table: ${left.join(", ")}`);
    if (!/^Lu dans le nom complet de naissance, Camille Marie Laurent\./.test(await page.getByTestId("num-name-from").innerText())) throw new Error("the French name line");
    await page.getByTestId("view-wheel").click();
    await page.getByTestId("numerology-ring").waitFor({ timeout: 10000 });
    const fr = await page.evaluate(() => ({
      say: document.querySelector('[data-testid="num-say"]').textContent,
      chips: document.querySelector('[data-testid="num-year-line"]').textContent,
      aria: document.querySelector('[data-testid="numerology-ring"]').getAttribute("aria-label"),
    }));
    if (!/^Touchez|^Pointez/.test(fr.say) || !/Réalisation/.test(fr.chips) || !/^Roue de numérologie/.test(fr.aria)) throw new Error(`French ${JSON.stringify(fr)}`);
    await setLang(page, "en");

    if (errors.length) throw new Error(`page errors: ${errors.join(" | ")}`);
    console.log("numerology-1280 OK");
  } finally {
    await browser.close();
  }
}

async function phone() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    page.setDefaultTimeout(20000);
    const errors = watch(page);
    await open(page, CAMILLE);
    const layout = await page.evaluate(() => {
      const zoom = document.querySelector("[data-testid=num-zoom]").getBoundingClientRect();
      const tiles = document.querySelector("[data-testid=num-tiles]");
      return {
        wheel: zoom.width,
        square: Math.abs(zoom.width - zoom.height),
        tilesScroll: tiles.scrollWidth > tiles.clientWidth + 1,
        sideways: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    if (layout.wheel < 340 || layout.square > 1 || !layout.tilesScroll || layout.sideways > 1) throw new Error(`phone layout ${JSON.stringify(layout)}`);
    await page.getByTestId("numerology-digit-3").tap();
    // The wheel stays whole: the reading waits behind the Reading tab.
    await page.waitForTimeout(300);
    if ((await page.getByTestId("dock").getAttribute("data-dock-open")) === "true") throw new Error("a tap on the wheel opened the sheet");
    await page.getByTestId("dock-tab-reading").tap();
    await page.getByTestId("click-note").waitFor({ timeout: 8000 });
    await page.waitForTimeout(700);
    const half = await page.evaluate(() => {
      const z = document.querySelector("[data-testid=num-zoom]").getBoundingClientRect();
      const sheet = document.querySelector(".ob-panel").getBoundingClientRect();
      return { bottom: z.bottom, sheet: sheet.top, w: z.width };
    });
    if (half.bottom > half.sheet + 1 || half.w < 120) throw new Error(`the wheel above the sheet ${JSON.stringify(half)}`);
    await page.screenshot({ path: join(SHOTS, "numerology-390.png") });
    if (errors.length) throw new Error(`page errors: ${errors.join(" | ")}`);
    console.log("numerology-390 OK");
  } finally {
    await browser.close();
  }
}

await ensureShotsDir();
await desktop();
await phone();
console.log("NUMEROLOGY OK", DEV);
