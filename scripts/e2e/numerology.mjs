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
 *   - without a name, only the birth date's numbers;
 *   - in French; on a phone the wheel takes the width, the tiles scroll
 *     sideways and nothing else does.
 */
import { join } from "node:path";
import { chromium } from "playwright";
import { DEV, SHOTS, castFixture, ensureShotsDir, goStudioPage, gotoApp, setLang } from "./_lib.mjs";

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

async function desktop() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.setDefaultTimeout(20000);
    const errors = watch(page);
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
    await page.getByTestId("view-wheel").click();
    await page.getByTestId("numerology-ring").waitFor({ timeout: 10000 });

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

    // In French, the wheel and the Table view: no English left.
    await setLang(page, "fr");
    await page.waitForTimeout(800);
    await page.getByTestId("view-table").click();
    await page.getByTestId("numerology-table").waitFor({ timeout: 10000 });
    await page.waitForTimeout(600);
    const frTable = await page.getByTestId("numerology-table").innerText();
    const english = ["The core numbers", "Karmic", "Hidden passion", "Pinnacle", "Challenge", "Personal year", "Vowels", "Consonants", "Letters", "Keywords", "What it stands for", "Between", "Whole life", "Nine years", "Steps", "the birth date", "Add a birth name", "How the numbers"];
    const left = english.filter((w) => frTable.includes(w));
    if (left.length) throw new Error(`English in the French table: ${left.join(", ")}`);
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
