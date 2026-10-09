/*
 * Chinese astrology's page (languages plan, part 7), at /chinese-astrology,
 * at 1280 and 390 px, in English and French:
 *   - reached by its card in the language picker, under "Chinese traditions"
 *     (no ⓘ yet: its encyclopedia pages come later);
 *   - Fixture A (made up: 15/06/1990, 12:00, Paris): the wheel of the twelve
 *     with its four animals marked (Horse year and month, Pig day, Snake
 *     hour), this year's on the rim, the four cards;
 *   - a card opens its reading (its pillar, stem, branch, phase, Na Yin);
 *     the ring walked by the keyboard, Enter opening an animal's reading;
 *   - part 8: the relations between the four animals (Fixture A: the Pig
 *     day clashes with the Snake hour, a dashed line across the ring; the
 *     two Horses punish themselves), listed with nothing chosen and opening
 *     their reading; the table's relation rows and hidden stems;
 *   - the table view's four rows; Settings' "Name only" followed at once;
 *   - nothing sent while the page works it out; nothing scrolls sideways.
 */
import { join } from "node:path";
import { FIXTURE_A, SHOTS, assertNoOverflow, castFixture, clickDockTab, ensureShotsDir, gotoApp, launch, setLang, setView } from "./_lib.mjs";

const WORDS = {
  en: {
    heading: "Chinese traditions",
    animals: ["Horse", "Horse", "Pig", "Snake"],
    pillar: "Yang Metal Horse",
    naYin: "Earth by the roadside",
    year: "Year animal",
    clash: "Clash",
    clashLine: "day (Pig) – hour (Snake)",
  },
  fr: {
    heading: "Traditions chinoises",
    animals: ["Cheval", "Cheval", "Cochon", "Serpent"],
    pillar: "Cheval de Métal yang",
    naYin: "Terre du bord de la route",
    year: "Animal de l’année",
    clash: "Choc",
    clashLine: "jour (Cochon) – heure (Serpent)",
  },
};

async function run(width, lang) {
  const { browser, page } = await launch(width);
  const label = `${width} ${lang}`;
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const w = WORDS[lang];
  try {
    await gotoApp(page);
    if (lang === "fr") await setLang(page, "fr");
    await castFixture(page, FIXTURE_A);
    // The picker: a heading for the Chinese traditions, the card, no ⓘ yet.
    await page.getByTestId("lang-button").click();
    await page.getByTestId("lang-card-chinese-astrology").waitFor({ timeout: 8000 });
    // (The headings are set in capitals by their style: their words are compared as written.)
    const headings = await page.locator(".ob-langs-head").evaluateAll((els) => els.map((e) => e.textContent.trim()));
    if (!headings.includes(w.heading)) throw new Error(`${label}: picker headings ${headings.join(" | ")}`);
    if (await page.getByTestId("lang-info-chinese-astrology").count()) throw new Error(`${label}: an ⓘ to a home that does not exist yet`);
    // From here, nothing goes out while the page works the animals out.
    const sent = [];
    page.on("request", (r) => {
      const u = new URL(r.url());
      if (r.method() !== "GET" || /_serverFn|\/api\//.test(u.pathname)) sent.push(`${r.method()} ${u.pathname}`);
    });
    await page.getByTestId("lang-card-chinese-astrology").click();
    await page.getByTestId("zodiac-wheel").waitFor({ timeout: 20000 });
    if (new URL(page.url()).pathname !== "/chinese-astrology") throw new Error(`${label}: at ${page.url()}`);

    // The wheel: twelve animals, four marked, this year's on the rim.
    const wheel = await page.evaluate(() => ({
      sectors: document.querySelectorAll("[data-testid^=zodiac-sector-]").length,
      mine: [...document.querySelectorAll("[data-testid^=zodiac-sector-][data-mine]")].map((s) => s.getAttribute("data-testid")),
      badges: [...document.querySelectorAll("[data-testid^=zodiac-badge-]")].map((b) => b.getAttribute("data-place")),
      year: document.querySelector(".ulune-zk-now-year")?.textContent,
    }));
    if (wheel.sectors !== 12) throw new Error(`${label}: ${wheel.sectors} sectors`);
    if (wheel.mine.sort().join() !== "zodiac-sector-hai,zodiac-sector-si,zodiac-sector-wu") throw new Error(`${label}: marked ${wheel.mine}`);
    if (wheel.badges.sort().join() !== "day,hour,month,year") throw new Error(`${label}: badges ${wheel.badges}`);
    if (wheel.year !== String(new Date().getFullYear())) throw new Error(`${label}: this year on the rim "${wheel.year}"`);
    // The four cards.
    for (const [i, id] of ["year", "month", "day", "hour"].entries()) {
      const text = await page.getByTestId(`zodiac-card-${id}`).innerText();
      if (!text.includes(w.animals[i])) throw new Error(`${label}: the ${id} card "${text}"`);
    }
    // The relations on the ring: one line, the clash, dashed (two Horses on one animal draw none).
    const lines = await page.locator("[data-testid=zodiac-lines] line").evaluateAll((els) => els.map((e) => e.getAttribute("data-kind")));
    if (lines.join() !== "clash") throw new Error(`${label}: lines ${lines.join()}`);
    const dash = await page.locator("[data-testid=zodiac-lines] line").evaluate((e) => getComputedStyle(e).strokeDasharray);
    if (!dash || dash === "none") throw new Error(`${label}: the clash line is not dashed`);
    await assertNoOverflow(page);
    await page.screenshot({ path: join(SHOTS, `zodiac-${lang}-${width}.png`) }).catch(() => {});

    if (width >= 1024) {
      // With nothing chosen, the side panel lists the relations; one opens its reading.
      const rels = await page.locator("[data-testid^=zodiac-rel-]").evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")));
      if (rels.join() !== "zodiac-rel-clash-day-hour,zodiac-rel-self-punishment-year-month") throw new Error(`${label}: relations ${rels.join()}`);
      const relText = await page.getByTestId("zodiac-rel-clash-day-hour").innerText();
      if (!relText.includes(w.clashLine)) throw new Error(`${label}: the clash row "${relText}"`);
      await page.getByTestId("zodiac-rel-clash-day-hour").click();
      await page.waitForFunction((t) => document.querySelector("[data-testid=click-note]")?.textContent?.includes(t), w.clash, { timeout: 8000 });
      const relNote = await page.getByTestId("click-note").innerText();
      if (!relNote.includes(w.animals[2]) || !relNote.includes(w.animals[3])) throw new Error(`${label}: the clash's reading "${relNote.slice(0, 200)}"`);
      const lineOn = await page.locator("[data-testid=zodiac-lines] line.is-on").count();
      if (lineOn !== 1) throw new Error(`${label}: the chosen clash's line is not marked`);
    }

    // A card opens its reading.
    await page.getByTestId("zodiac-card-year").click();
    if (width < 1024) await clickDockTab(page, "reading");
    const note = page.getByTestId("click-note");
    await note.waitFor({ timeout: 10000 });
    await page.waitForFunction((t) => document.querySelector("[data-testid=click-note]")?.textContent?.includes(t), w.naYin, { timeout: 8000 });
    const text = await note.innerText();
    if (!text.includes(w.pillar)) throw new Error(`${label}: the year's reading "${text.slice(0, 200)}"`);

    if (width >= 1024) {
      // The ring by keyboard: one Tab stop, the arrows round it, Enter opens the animal.
      await page.locator("[data-testid=zodiac-wheel] [data-branch][tabindex='0']").focus();
      const start = await page.evaluate(() => Number(document.activeElement?.getAttribute("data-branch")));
      await page.keyboard.press("ArrowRight");
      const next = await page.evaluate(() => Number(document.activeElement?.getAttribute("data-branch")));
      if (next !== (start + 1) % 12) throw new Error(`${label}: ArrowRight from ${start} reached ${next}`);
      await page.keyboard.press("Enter");
      await page.waitForFunction((b) => document.querySelector(`[data-branch="${b}"]`)?.getAttribute("aria-pressed") === "true", next, { timeout: 4000 });
      const tab = await page.locator("[data-testid=zodiac-wheel] [data-branch][tabindex='0']").count();
      if (tab !== 1) throw new Error(`${label}: ${tab} Tab stops on the ring`);
    }

    // The table view: the four pillars.
    await setView(page, "table");
    await page.getByTestId("zodiac-table").waitFor({ timeout: 10000 });
    const rows = await page.locator("[data-testid^=zodiac-row-]").count();
    if (rows !== 4) throw new Error(`${label}: ${rows} table rows`);
    // Part 8: the hidden stems (the Horse holds Ding and Ji) and the relations' rows.
    const hidden = await page.getByTestId("zodiac-hidden-year").innerText();
    if (!hidden.includes("丁") || !hidden.includes("己")) throw new Error(`${label}: the year's hidden stems "${hidden}"`);
    const relRows = await page.locator("[data-testid^=zodiac-relrow-]").evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")));
    if (relRows.join() !== "zodiac-relrow-clash-day-hour,zodiac-relrow-self-punishment-year-month") throw new Error(`${label}: relation rows ${relRows.join()}`);
    await assertNoOverflow(page);
    await setView(page, "wheel");
    await page.getByTestId("zodiac-wheel").waitFor({ timeout: 10000 });

    // Settings → Chinese traditions, "Name only" (another tab): the cards follow at once.
    await page.evaluate(() => {
      localStorage.setItem("ulune.chinese", JSON.stringify({ show: "names" }));
      window.dispatchEvent(new StorageEvent("storage", { key: "ulune.chinese" }));
    });
    await page.waitForFunction(() => !/[一-鿿]/.test(document.querySelector("[data-testid=zodiac-cards]")?.textContent ?? "x"), null, { timeout: 4000 });
    await page.evaluate(() => localStorage.removeItem("ulune.chinese"));

    if (sent.length) throw new Error(`${label}: sent ${sent.join(", ")}`);
    if (errors.length) throw new Error(`${label}: ${errors.join(" | ")}`);
    console.log(`zodiac ${label} OK`);
  } finally {
    await browser.close();
  }
}

await ensureShotsDir();
const failures = [];
for (const [width, lang] of [
  [1280, "en"],
  [390, "en"],
  [1280, "fr"],
  [390, "fr"],
]) {
  try {
    await run(width, lang);
  } catch (e) {
    failures.push(String(e?.message ?? e));
  }
}
if (failures.length) {
  console.error(`ZODIAC FAIL\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("ZODIAC OK");
