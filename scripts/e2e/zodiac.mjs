/*
 * Chinese astrology's page (languages plan, part 7), at /chinese-astrology,
 * at 1280 and 390 px, in English and French:
 *   - reached by its card in the language picker, under "Chinese traditions"
 *     (no ⓘ yet: its encyclopedia pages come later), its card giving its own
 *     name, shēngxiào 生肖, and saying it is new (part 28);
 *   - Fixture A (made up: 15/06/1990, 12:00, Paris): the wheel of the twelve
 *     with its four animals marked (Horse year and month, Pig day, Snake
 *     hour), this year's on the rim, the four cards;
 *   - a card opens its reading (its pillar, stem, branch, phase, Na Yin);
 *     the ring walked by the keyboard, Enter opening an animal's reading;
 *   - part 8: the relations between the four animals (Fixture A: the Pig
 *     day clashes with the Snake hour, a dashed line across the ring; the
 *     two Horses punish themselves), listed with nothing chosen and opening
 *     their reading; the table's relation rows and hidden stems;
 *   - part 9: the twelve animals as Ulune's drawings on the wheel, the cards,
 *     the table and a reading's mark; Settings → Chinese traditions → "Their
 *     characters" brings the characters back (chosen in Settings at 1280,
 *     by another tab at 390);
 *   - part 10: the year's reading opens on its pair (the Metal Horse), then
 *     "A modern portrait" and "In the tradition"; a relation's reading ends
 *     "In practice";
 *   - the table view's four rows; Settings' "Name only" followed at once;
 *   - nothing sent while the page works it out; nothing scrolls sideways;
 *   - (part 29) the method notes: none for Fixture A, and the first read
 *     ends on "How Ulune calculates" (Lichun, not New Year; UTC+8; the
 *     table's source); Fixture B (made up: 03/11/1987, 23:10, Oslo) is born
 *     in the Rat hour before midnight, which the first read says of its day
 *     animal; on the Relationship page too, named for its person.
 */
import { join } from "node:path";
import { FIXTURE_A, FIXTURE_B, SHOTS, assertNoOverflow, castFixture, clickDockTab, ensureShotsDir, goStudioPage, gotoApp, launch, setLang, setView } from "./_lib.mjs";

const WORDS = {
  en: {
    heading: "Chinese traditions",
    fresh: "New",
    animals: ["Horse", "Horse", "Pig", "Snake"],
    pillar: "Yang Metal Horse",
    naYin: "Earth by the roadside",
    year: "Year animal",
    clash: "Clash",
    clashLine: "day (Pig) – hour (Snake)",
    pairLead: "The Metal Horse is the most determined of the Horses",
    sections: ["A modern portrait", "In the tradition"],
    practice: "In practice",
    how: "How Ulune calculates",
    method: ["The year animal changes at Lichun", "not at Chinese New Year", "UTC+8", "Swiss Ephemeris 2.10.03, JPL DE441"],
    day: "so your day animal is the next day’s",
    whose: "so Sample B’s day animal is the next day’s",
  },
  fr: {
    heading: "Traditions chinoises",
    fresh: "Nouveau",
    animals: ["Cheval", "Cheval", "Cochon", "Serpent"],
    pillar: "Cheval de Métal yang",
    naYin: "Terre du bord de la route",
    year: "Animal de l’année",
    clash: "Choc",
    clashLine: "jour (Cochon) – heure (Serpent)",
    pairLead: "Le Cheval de Métal est le plus déterminé des Chevaux",
    sections: ["Portrait moderne", "Dans la tradition"],
    practice: "En pratique",
    how: "Comment Ulune calcule",
    method: ["L’animal de l’année change à Lichun", "et non au Nouvel An chinois", "UTC+8", "Swiss Ephemeris 2.10.03, JPL DE441"],
    day: "et votre animal du jour est celui du lendemain",
    whose: "et l’animal du jour de Sample B est celui du lendemain",
  },
};

/** Part 29: a first read's method notes (their ids and words) and its "How Ulune calculates" (its title and words). */
async function methodNotes(page, scope) {
  return page.evaluate((s) => {
    const root = document.querySelector(`[data-testid="${s}"]`);
    const how = root?.querySelector("[data-testid=method-notes]");
    return {
      title: how?.querySelector("summary")?.textContent?.trim() ?? null,
      how: how?.textContent ?? "",
      notes: [...(root?.querySelectorAll("[data-testid=method-note]") ?? [])].map((n) => ({ id: n.getAttribute("data-note"), text: n.textContent ?? "" })),
    };
  }, scope);
}

/** The side panel's first read, nothing chosen. */
async function firstRead(page, width, testId) {
  await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
  await page.keyboard.press("Escape");
  if (width < 1024) await clickDockTab(page, "reading");
  await page.getByTestId(testId).waitFor({ timeout: 8000 });
}

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
    // Part 28: its own name in pinyin and characters (Traditional, marked as such), and "new" on a first visit.
    const card = await page.getByTestId("lang-card-chinese-astrology").evaluate((b) => ({
      pinyin: b.querySelector("[lang=zh-Latn-pinyin]")?.textContent,
      hanzi: b.querySelector("[lang=zh-Hant]")?.textContent,
      fresh: b.querySelector("[data-testid=lang-new-chinese-astrology]")?.textContent,
    }));
    if (card.pinyin !== "shēngxiào" || card.hanzi !== "生肖" || card.fresh !== w.fresh) throw new Error(`${label}: the picker's card ${JSON.stringify(card)}`);
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
    // Part 9: each animal drawn, in its own cell; the cards' four drawings are the places' animals.
    const drawn = await page.evaluate(() => ({
      wheel: [...document.querySelectorAll("[data-testid^=zodiac-sector-] [data-animal-glyph]")].map((g) => Number(g.getAttribute("data-animal-glyph"))),
      hanzi: document.querySelectorAll("[data-testid=zodiac-wheel] .ulune-zk-hanzi").length,
      cards: [...document.querySelectorAll("[data-testid=zodiac-cards] [data-animal-glyph]")].map((g) => Number(g.getAttribute("data-animal-glyph"))),
    }));
    if (drawn.wheel.join() !== "0,1,2,3,4,5,6,7,8,9,10,11" || drawn.hanzi !== 0) throw new Error(`${label}: the wheel's drawings ${drawn.wheel} (${drawn.hanzi} characters)`);
    if (drawn.cards.join() !== "6,6,11,5") throw new Error(`${label}: the cards' drawings ${drawn.cards}`);
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
      // (Headings are set in capitals by their style: their words are compared as written.)
      const relWords = await page.getByTestId("click-note").evaluate((e) => e.textContent);
      if (!relWords.includes(w.practice)) throw new Error(`${label}: the clash's reading has no "${w.practice}"`);
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
    // Part 10: the pair first, then the sections titled with where they come from.
    if (!text.includes(w.pairLead)) throw new Error(`${label}: the year's lead "${text.slice(0, 200)}"`);
    const heads = await page.locator("[data-testid=click-note] .ob-rc-sec .ob-rc-h").evaluateAll((els) => els.map((e) => e.textContent.trim()));
    if (!w.sections.every((h) => heads.includes(h))) throw new Error(`${label}: the year's sections ${heads.join(" | ")}`);
    // The reading's mark is the Horse's drawing.
    const mark = await page.evaluate(() => document.querySelector("[data-testid=click-note] .ob-rc-mark svg path")?.getAttribute("d")?.slice(0, 12));
    if (!mark?.startsWith("M16.6 20.6")) throw new Error(`${label}: the year's reading's mark "${mark}"`);

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
    const tableDrawn = await page.locator("[data-testid=zodiac-table] [data-animal-glyph]").count();
    if (tableDrawn !== 4) throw new Error(`${label}: ${tableDrawn} drawings in the table`);
    // Part 8: the hidden stems (the Horse holds Ding and Ji) and the relations' rows.
    const hidden = await page.getByTestId("zodiac-hidden-year").innerText();
    if (!hidden.includes("丁") || !hidden.includes("己")) throw new Error(`${label}: the year's hidden stems "${hidden}"`);
    const relRows = await page.locator("[data-testid^=zodiac-relrow-]").evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")));
    if (relRows.join() !== "zodiac-relrow-clash-day-hour,zodiac-relrow-self-punishment-year-month") throw new Error(`${label}: relation rows ${relRows.join()}`);
    await assertNoOverflow(page);
    await setView(page, "wheel");
    await page.getByTestId("zodiac-wheel").waitFor({ timeout: 10000 });

    // Settings → Chinese traditions → The twelve animals → "Their characters": the wheel's characters come back.
    if (width >= 1024) {
      // Nothing chosen (Escape), the side panel's link to Settings.
      await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
      await page.keyboard.press("Escape");
      await page.getByTestId("zodiac-settings-link").click();
      await page.getByTestId("settings-chinese-animals").waitFor({ timeout: 15000 });
      const sample = await page.locator("[data-testid=settings-chinese-animals-sample] [data-animal-glyph]").count();
      if (sample !== 6) throw new Error(`${label}: Settings shows ${sample} drawings`);
      await page.getByTestId("chinese-animals-characters").check();
      const kept = await page.evaluate(() => JSON.parse(localStorage.getItem("ulune.chinese") ?? "{}"));
      if (kept.animals !== "characters") throw new Error(`${label}: kept ${JSON.stringify(kept)}`);
      await page.goBack();
      await page.getByTestId("zodiac-wheel").waitFor({ timeout: 20000 });
    } else {
      await page.evaluate(() => {
        localStorage.setItem("ulune.chinese", JSON.stringify({ animals: "characters" }));
        window.dispatchEvent(new StorageEvent("storage", { key: "ulune.chinese" }));
      });
    }
    await page.waitForFunction(
      () => document.querySelectorAll("[data-testid=zodiac-wheel] .ulune-zk-hanzi").length === 12 && !document.querySelector("[data-testid=zodiac-wheel] [data-animal-glyph]"),
      null,
      { timeout: 8000 },
    );
    if (await page.locator("[data-testid=zodiac-cards] [data-animal-glyph]").count()) throw new Error(`${label}: the cards still drawn`);
    await page.evaluate(() => localStorage.removeItem("ulune.chinese"));

    // Settings → Chinese traditions, "Name only" (another tab): the cards follow at once.
    await page.evaluate(() => {
      localStorage.setItem("ulune.chinese", JSON.stringify({ show: "names" }));
      window.dispatchEvent(new StorageEvent("storage", { key: "ulune.chinese" }));
    });
    await page.waitForFunction(() => !/[一-鿿]/.test(document.querySelector("[data-testid=zodiac-cards]")?.textContent ?? "x"), null, { timeout: 4000 });
    await page.evaluate(() => localStorage.removeItem("ulune.chinese"));

    if (sent.length) throw new Error(`${label}: sent ${sent.join(", ")}`);

    // Part 29: Fixture A calls for no note; the first read ends on "How Ulune calculates".
    await firstRead(page, width, "zodiac-hello");
    const usual = await methodNotes(page, "zodiac-hello");
    if (usual.notes.length) throw new Error(`${label}: Fixture A's notes ${JSON.stringify(usual.notes)}`);
    if (usual.title !== w.how || !w.method.every((t) => usual.how.includes(t))) throw new Error(`${label}: "How Ulune calculates" ${usual.title} "${usual.how.slice(0, 300)}"`);
    // Fixture B, born in the Rat hour before midnight: its day animal, said with the way to Settings.
    await goStudioPage(page, "natal");
    await castFixture(page, FIXTURE_B);
    await goStudioPage(page, "zodiac");
    await page.getByTestId("zodiac-wheel").waitFor({ timeout: 20000 });
    await firstRead(page, width, "zodiac-hello");
    const late = await methodNotes(page, "zodiac-hello");
    if (late.notes.map((n) => n.id).join() !== "day-boundary" || !late.notes[0].text.includes(w.day)) throw new Error(`${label}: Fixture B's notes ${JSON.stringify(late.notes)}`);
    // The Relationship page (Sample B shown, TraceQA beside): the note named for its person, and the language's method.
    await goStudioPage(page, "zodiac-pair");
    await page.getByTestId("zodiac-pair").waitFor({ timeout: 20000 });
    await firstRead(page, width, "zodiac-pair-hello");
    const pair = await methodNotes(page, "zodiac-pair-hello");
    if (pair.notes.map((n) => n.id).join() !== "day-boundary" || !pair.notes[0].text.startsWith("Sample B — ") || !pair.notes[0].text.includes(w.whose)) throw new Error(`${label}: Pair's notes ${JSON.stringify(pair.notes)}`);
    if (pair.title !== w.how || !pair.how.includes(w.method[0])) throw new Error(`${label}: Pair's "How Ulune calculates" ${pair.title}`);
    await assertNoOverflow(page);

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
