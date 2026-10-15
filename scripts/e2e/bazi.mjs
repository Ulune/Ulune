/*
 * BaZi's pillar board (languages plan, part 12), at /bazi, at 1280 and
 * 390 px, in English and French, with Fixture A (made up: 15/06/1990, 12:00,
 * Paris), a Xin (Yin Metal) Day Master:
 *   - reached by its card in the language picker, under Chinese traditions,
 *     its card giving its own name, bāzì 八字, and saying it is new (part 28);
 *     its ⓘ leads to BaZi's home in the encyclopedia once that is written
 *     (lib/chinese/term-live.ts), and is not there before;
 *   - the four columns hour to year (the year on the right), the day's
 *     marked as the Day Master, each stem's god (Eating God, Hurting
 *     Officer, Rob Wealth), the hidden stems (3, 2, 2, 2);
 *   - the Ten Gods beside the board, the Companion absent;
 *   - a stem's reading says why it is its god; a hidden stem's says its qi;
 *   - (part 13) under each column the Day Master's life stage and the Na
 *     Yin; the stars (Nobleman on the year and month, Golden Carriage and
 *     Heavenly Virtue on the day, General on the month, Travelling Horse on
 *     the hour), no empty pillar; a stage's reading says why, a star's how
 *     it is found; the stars panel and the empty branches; (part 20) the
 *     stages by Ulune's names (Rest, Retreat), the hour's reading keeping
 *     the classical name, sǐ 死, "Death";
 *   - (part 14) under the board the interactions between the pillars: the
 *     day and hour's clash and the year and month's self-punishment, side
 *     by side; choosing the clash outlines the day and hour branches and
 *     reads it;
 *   - (part 15) beside the board, the five phases (Fire and Water 2.7, Wood
 *     0.3), a weak Day Master, the Seven Killings structure, Earth and Metal
 *     favourable with Water by climate; the strength's reading shows its
 *     tests, the method is one tap away;
 *   - (part 18) an absent god's and a scarce phase's readings;
 *   - the table: first (part 17) every pillar by every layer, with both
 *     counts' luck pillars and this year; Settings' "Year to hour" followed
 *     at once;
 *   - nothing sent while the page works it out; nothing scrolls sideways;
 *   - (part 29) the method notes: Fixture A, born at noon, calls for none,
 *     and the first read ends on "How Ulune calculates", naming the Zi Ping
 *     school and the table's source; Fixture B (made up: 03/11/1987, 23:10,
 *     Oslo, 23:09 by the Sun) is born in the Rat hour before midnight, and the
 *     first read says what the day rule gives, with the way to Settings, and
 *     follows a change of rule at once; on Pair, the note names its person.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FIXTURE_A, FIXTURE_B, SHOTS, assertNoOverflow, castFixture, clickDockTab, ensureShotsDir, goStudioPage, gotoApp, launch, setLang, setView } from "./_lib.mjs";
import { watchSent } from "./_sent.mjs";

// BaZi's home in the encyclopedia, once written (encyclopedia plan, part 23): the picker's ⓘ leads there, and there is none before.
const HOME = /^\s*bazi: \{ en: "([^"]+)", fr: "([^"]+)" \}/m.exec(readFileSync(new URL("../../src/lib/chinese/term-live.ts", import.meta.url), "utf8"));

const WORDS = {
  en: {
    heading: "Chinese traditions",
    fresh: "New",
    gods: { hour: "Eating God", day: "Day Master", month: "Hurting Officer", year: "Rob Wealth" },
    why: "produces Water",
    qi: "Residual qi",
    stages: { hour: "Rest", day: "Bath", month: "Retreat", year: "Retreat" },
    stageWhy: "being yin, goes backward",
    classical: "The classics call this stage sǐ 死, “Death”, after a human life",
    starHow: "of the Wood trine",
    empty: "Tiger · Rabbit",
    side: "side by side",
    clash: "opposite branches",
    bars: { wood: "0.3", fire: "2.7", earth: "1.2", metal: "2.1", water: "2.7" },
    strength: "Weak",
    structure: "Seven Killings structure",
    fav: "Earth, Metal · by climate Water",
    tests: "born out of season",
    method: "count twice",
    absent: "No Companion stands in your chart",
    little: "Little Wood",
    how: "How Ulune calculates",
    school: "BaZi follows the Zi Ping school",
    born: /^Born at 23:0\d by true solar time \(23:10 on the clock\), in the Rat hour before midnight: by the Zi Ping rule/,
    settings: "Settings → Chinese traditions",
    chose: "with the day turning at midnight, as you chose",
    whose: "so Sample B’s day pillar is the next day’s",
  },
  fr: {
    heading: "Traditions chinoises",
    fresh: "Nouveau",
    gods: { hour: "Dieu nourricier", day: "Maître du jour", month: "Officier blessant", year: "Rival" },
    why: "produit l’Eau",
    qi: "Qi résiduel",
    stages: { hour: "Repos", day: "Bain", month: "Retrait", year: "Retrait" },
    stageWhy: "étant yin, recule",
    classical: "Les classiques appellent ce stade sǐ 死, «\u202fMort\u202f», d’après une vie humaine",
    starHow: "du trigone du Bois",
    empty: "Tigre · Lapin",
    side: "côte à côte",
    clash: "branches face à face",
    bars: { wood: "0,3", fire: "2,7", earth: "1,2", metal: "2,1", water: "2,7" },
    strength: "Faible",
    structure: "Structure des Sept Tueurs",
    fav: "Terre, Métal · par le climat Eau",
    tests: "né hors saison",
    method: "comptent double",
    absent: "Aucun Compagnon dans votre thème",
    little: "Peu de Bois",
    how: "Comment Ulune calcule",
    school: "Le BaZi suit l’école Zi Ping",
    born: /^Naissance à 23\u202fh\u202f0\d en temps solaire vrai \(23\u202fh\u202f10 à la pendule\), dans l’heure du Rat avant minuit\u202f: selon la règle du Zi Ping/,
    settings: "Réglages → Traditions chinoises",
    chose: "avec le jour qui change à minuit, comme vous l’avez choisi",
    whose: "et le pilier du jour de Sample B est celui du lendemain",
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
    await page.getByTestId("lang-button").click();
    await page.getByTestId("lang-card-bazi").waitFor({ timeout: 8000 });
    const info = page.getByTestId("lang-info-bazi");
    if (HOME) {
      const want = lang === "fr" ? `/encyclopedie/${HOME[2]}` : `/encyclopedia/${HOME[1]}`;
      const href = await info.getAttribute("href", { timeout: 4000 }).catch(() => null);
      if (href !== want) throw new Error(`${label}: the ⓘ leads to ${href}, not BaZi's home ${want}`);
    } else if (await info.count()) throw new Error(`${label}: an ⓘ to a home that does not exist yet`);
    // Part 28: its own name in pinyin and characters (Traditional, marked as such), and "new" on a first visit.
    const card = await page.getByTestId("lang-card-bazi").evaluate((b) => ({
      pinyin: b.querySelector("[lang=zh-Latn-pinyin]")?.textContent,
      hanzi: b.querySelector("[lang=zh-Hant]")?.textContent,
      fresh: b.querySelector("[data-testid=lang-new-bazi]")?.textContent,
      label: b.getAttribute("aria-label"),
    }));
    if (card.pinyin !== "bāzì" || card.hanzi !== "八字" || card.fresh !== w.fresh || card.label !== `BaZi, ${w.fresh}`) throw new Error(`${label}: the picker's card ${JSON.stringify(card)}`);
    // Nothing but the app's own files, by GET, from here (_sent.mjs).
    const sent = watchSent(page);
    await page.getByTestId("lang-card-bazi").click();
    await page.getByTestId("bazi-board").waitFor({ timeout: 20000 });
    if (new URL(page.url()).pathname !== "/bazi") throw new Error(`${label}: at ${page.url()}`);

    // The board: hour to year, the Day Master marked, each stem's god, the hidden stems.
    const board = await page.evaluate(() => ({
      order: [...document.querySelectorAll("[data-testid=bazi-board] > [data-place]")].map((c) => c.getAttribute("data-place")),
      dm: [...document.querySelectorAll(".ulune-bz-col.is-dm")].map((c) => c.getAttribute("data-place")),
      gods: Object.fromEntries([...document.querySelectorAll("[data-testid^=bazi-god-of-]")].map((g) => [g.getAttribute("data-testid").slice(12), g.textContent.trim()])),
      hidden: [...document.querySelectorAll("[data-testid=bazi-board] > [data-place]")].map((c) => c.querySelectorAll("[data-testid^=bazi-hidden-]").length),
      none: [...document.querySelectorAll("[data-testid^=bazi-god-].is-none")].map((g) => g.getAttribute("data-testid")),
    }));
    if (board.order.join() !== "hour,day,month,year") throw new Error(`${label}: the order ${board.order}`);
    if (board.dm.join() !== "day") throw new Error(`${label}: the Day Master ${board.dm}`);
    for (const [id, g] of Object.entries(w.gods)) if (board.gods[id] !== g) throw new Error(`${label}: the ${id} god "${board.gods[id]}"`);
    if (board.hidden.join() !== "3,2,2,2") throw new Error(`${label}: hidden stems ${board.hidden}`);
    if (!board.none.includes("bazi-god-companion") || !board.none.includes("bazi-god-indirect-wealth")) throw new Error(`${label}: absent gods ${board.none}`);
    await assertNoOverflow(page);
    await page.screenshot({ path: join(SHOTS, `bazi-${lang}-${width}.png`) }).catch(() => {});

    // A stem's reading says why it is its god.
    await page.getByTestId("bazi-stem-month").evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.getByTestId("bazi-stem-month").click();
    if (width < 1024) await clickDockTab(page, "reading");
    await page
      .waitForFunction((t) => document.querySelector("[data-testid=click-note]")?.textContent?.includes(t), w.why, { timeout: 8000 })
      .catch(async () => {
        throw new Error(`${label}: the month stem's reading "${(await page.getByTestId("click-note").textContent().catch(() => "")).slice(0, 300)}"`);
      });
    // A hidden stem's says its qi.
    if (width < 1024) await clickDockTab(page, "reading").catch(() => {});
    // (In the middle of the stage: a phone's toolbar stays over its top.)
    await page.getByTestId("bazi-hidden-hour-2").evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.getByTestId("bazi-hidden-hour-2").click();
    if (width < 1024) await clickDockTab(page, "reading");
    await page.waitForFunction((t) => document.querySelector("[data-testid=click-note]")?.textContent?.includes(t), w.qi, { timeout: 8000 });

    // Part 13: the stages and Na Yin under each column, the stars, no empty pillar.
    const signs = await page.evaluate(() => ({
      stages: Object.fromEntries([...document.querySelectorAll("[data-testid^=bazi-stage-]")].map((g) => [g.getAttribute("data-testid").slice(11), g.querySelector(".ulune-bz-sign-v").textContent.trim()])),
      nayin: document.querySelectorAll("[data-testid^=bazi-nayin-]").length,
      chips: [...document.querySelectorAll("[data-testid^=bazi-star-]")].map((g) => g.getAttribute("data-testid").slice(10)).sort(),
      empty: document.querySelectorAll("[data-testid^=bazi-empty-]").length,
      rows: [...document.querySelectorAll("[data-testid^=bazi-starrow-]")].map((g) => g.getAttribute("data-testid").slice(13)),
      emptyRow: document.querySelector("[data-testid=bazi-empty]")?.textContent ?? "",
    }));
    for (const [id, st] of Object.entries(w.stages)) if (!signs.stages[id]?.endsWith(st)) throw new Error(`${label}: the ${id} stage "${signs.stages[id]}"`);
    if (signs.nayin !== 4) throw new Error(`${label}: ${signs.nayin} Na Yin`);
    const chips = ["day-golden-carriage", "day-heavenly-virtue", "hour-travelling-horse", "month-general", "month-nobleman", "year-nobleman"];
    if (signs.chips.join() !== chips.join()) throw new Error(`${label}: star chips ${signs.chips}`);
    if (signs.empty !== 0) throw new Error(`${label}: ${signs.empty} empty pillars`);
    if (signs.rows.join() !== "nobleman,golden-carriage,travelling-horse,general,heavenly-virtue") throw new Error(`${label}: stars ${signs.rows}`);
    if (!signs.emptyRow.replace(/[\u3400-\u9fff] /g, "").includes(w.empty)) throw new Error(`${label}: empty branches "${signs.emptyRow}"`);
    await assertNoOverflow(page);
    // A stage's reading says why; a star's how it is found.
    await page.getByTestId("bazi-stage-hour").evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.getByTestId("bazi-stage-hour").click();
    if (width < 1024) await clickDockTab(page, "reading");
    await page.waitForFunction((t) => document.querySelector("[data-testid=click-note]")?.textContent?.includes(t), w.stageWhy, { timeout: 8000 }).catch(async () => {
      throw new Error(`${label}: the hour's stage reading "${(await page.getByTestId("click-note").textContent().catch(() => "")).slice(0, 300)}"`);
    });
    // Part 20 (BZ2): the board says Ulune's name; the reading keeps the classical one, its pinyin and characters.
    if (!(await page.getByTestId("click-note").textContent()).includes(w.classical)) throw new Error(`${label}: the stage's classical name`);
    if (width < 1024) await clickDockTab(page, "reading").catch(() => {});
    await page.getByTestId("bazi-star-hour-travelling-horse").evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.getByTestId("bazi-star-hour-travelling-horse").click();
    if (width < 1024) await clickDockTab(page, "reading");
    await page.waitForFunction((t) => document.querySelector("[data-testid=click-note]")?.textContent?.includes(t), w.starHow, { timeout: 8000 });
    if (width < 1024) await clickDockTab(page, "reading").catch(() => {});

    // Part 14: the interactions under the board; the clash outlines its two branches and reads.
    const ix = await page.evaluate(() =>
      [...document.querySelectorAll("[data-testid^=bazi-ix-]:not([data-testid^=bazi-ix-status-])")].map((r) => [
        r.getAttribute("data-testid").slice(8),
        r.querySelector(".ulune-bz-ixrow-status").textContent.trim(),
      ]),
    );
    if (ix.map((x) => x[0]).join() !== "clash:day-hour,self-punishment:year-month") throw new Error(`${label}: interactions ${ix.map((x) => x[0])}`);
    if (!ix.every((x) => x[1] === w.side)) throw new Error(`${label}: interaction statuses ${ix.map((x) => x[1])}`);
    await page.getByTestId("bazi-ix-clash:day-hour").evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.getByTestId("bazi-ix-clash:day-hour").click();
    const linkedCells = await page.evaluate(() => [...document.querySelectorAll(".ulune-bz-cell.is-linked")].map((c) => c.getAttribute("data-testid")).sort().join());
    if (linkedCells !== "bazi-branch-day,bazi-branch-hour") throw new Error(`${label}: outlined cells ${linkedCells}`);
    if (width < 1024) await clickDockTab(page, "reading");
    await page.waitForFunction((t) => document.querySelector("[data-testid=click-note]")?.textContent?.includes(t), w.clash, { timeout: 8000 });
    if (width < 1024) await clickDockTab(page, "reading").catch(() => {});
    await assertNoOverflow(page);

    // Part 15: the five phases, the strength, the structure, the favourable phases.
    const bal = await page.evaluate(() => ({
      bars: Object.fromEntries([...document.querySelectorAll("[data-testid^=bazi-phase-]")].map((b) => [b.getAttribute("data-phase"), b.querySelector(".ulune-bz-bar-n").textContent.trim()])),
      dm: document.querySelector(".ulune-bz-bar.is-dm")?.getAttribute("data-phase"),
      strength: document.querySelector("[data-testid=bazi-strength] .ulune-bz-sumrow-v")?.textContent.trim(),
      structure: document.querySelector("[data-testid=bazi-structure] .ulune-bz-sumrow-v")?.textContent.trim(),
      fav: document.querySelector("[data-testid=bazi-favourable] .ulune-bz-sumrow-v")?.textContent.trim(),
    }));
    if (JSON.stringify(bal.bars) !== JSON.stringify(w.bars)) throw new Error(`${label}: the phases ${JSON.stringify(bal.bars)}`);
    if (bal.dm !== "metal") throw new Error(`${label}: the Day Master's phase ${bal.dm}`);
    if (bal.strength !== w.strength || bal.structure !== w.structure || bal.fav !== w.fav) throw new Error(`${label}: the analysis ${JSON.stringify(bal)}`);
    await page.getByTestId("bazi-strength").evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.getByTestId("bazi-strength").click();
    if (width < 1024) await clickDockTab(page, "reading");
    await page.waitForFunction((t) => document.querySelector("[data-testid=click-note]")?.textContent?.includes(t), w.tests, { timeout: 8000 });
    if (width < 1024) await clickDockTab(page, "reading").catch(() => {});
    await page.getByTestId("bazi-balance-how").evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.getByTestId("bazi-balance-how").click();
    if (width < 1024) await clickDockTab(page, "reading");
    await page.waitForFunction((t) => document.querySelector("[data-testid=click-note]")?.textContent?.includes(t), w.method, { timeout: 8000 });
    if (width < 1024) await clickDockTab(page, "reading").catch(() => {});
    await assertNoOverflow(page);

    // Part 18: an absent god's reading, and a phase the chart holds little of.
    for (const [id, t] of [
      ["bazi-god-companion", w.absent],
      ["bazi-phase-wood", w.little],
    ]) {
      await page.getByTestId(id).evaluate((el) => el.scrollIntoView({ block: "center" }));
      await page.getByTestId(id).click();
      if (width < 1024) await clickDockTab(page, "reading");
      await page.waitForFunction((x) => document.querySelector("[data-testid=click-note]")?.textContent?.includes(x), t, { timeout: 8000 }).catch(async () => {
        throw new Error(`${label}: ${id}'s reading "${(await page.getByTestId("click-note").textContent().catch(() => "")).slice(0, 300)}"`);
      });
      if (width < 1024) await clickDockTab(page, "reading").catch(() => {});
    }

    // The table: four pillars, ten gods.
    await setView(page, "table");
    await page.getByTestId("bazi-table").waitFor({ timeout: 10000 });
    // Part 17: the full table first, every pillar by every layer, the luck pillars (both counts) and the year of the moment.
    const fullRows = await page.locator("[data-testid^=bazi-full-]").evaluateAll((els) => els.map((e) => e.getAttribute("data-testid").slice(10)));
    if (fullRows.join() !== "year,month,day,hour,luck-yang,luck-yin,flow-year") throw new Error(`${label}: the full table's rows ${fullRows}`);
    const dayRow = await page.getByTestId("bazi-full-day").evaluate((e) => e.textContent);
    if (!dayRow.includes(w.gods.day) || !dayRow.includes(w.stages.day)) throw new Error(`${label}: the full table's day "${dayRow}"`);
    const firstPart = await page.locator("[data-testid=bazi-table] section, [data-testid=bazi-table] [id^=table-part-]").first().getAttribute("id").catch(() => "");
    if (firstPart && !firstPart.includes("full")) throw new Error(`${label}: the table's first part ${firstPart}`);
    const rows = await page.locator("[data-testid^=bazi-row-]").count();
    if (rows !== 4) throw new Error(`${label}: ${rows} pillars in the table`);
    const hidCell = await page.getByTestId("bazi-hidden-cell-hour").innerText();
    if (!hidCell.includes(w.gods.year)) throw new Error(`${label}: the hour's hidden stems "${hidCell}"`);
    const signRows = await page.locator("[data-testid^=bazi-signrow-]").count();
    if (signRows !== 5) throw new Error(`${label}: ${signRows} rows of stages and Na Yin`);
    const starRows = await page.locator("[data-testid^=bazi-starrow-t-]").count();
    if (starRows !== 5) throw new Error(`${label}: ${starRows} stars in the table`);
    const ixRows = await page.locator("[data-testid^=bazi-ixrow-]").count();
    if (ixRows !== 2) throw new Error(`${label}: ${ixRows} interactions in the table`);
    const phaseRows = await page.locator("[data-testid^=bazi-phaserow-]").count();
    const sumRows = await page.locator("[data-testid^=bazi-sumrow-]").count();
    if (phaseRows !== 5 || sumRows !== 9) throw new Error(`${label}: the balance's table ${phaseRows} phases, ${sumRows} lines`);
    await assertNoOverflow(page);
    await setView(page, "wheel");
    await page.getByTestId("bazi-board").waitFor({ timeout: 10000 });

    // Settings → Chinese traditions → The four pillars → Year to hour (another tab): the board follows at once.
    await page.evaluate(() => {
      localStorage.setItem("ulune.chinese", JSON.stringify({ pillarOrder: "year-first" }));
      window.dispatchEvent(new StorageEvent("storage", { key: "ulune.chinese" }));
    });
    await page.waitForFunction(
      () => [...document.querySelectorAll("[data-testid=bazi-board] > [data-place]")].map((c) => c.getAttribute("data-place")).join() === "year,month,day,hour",
      null,
      { timeout: 4000 },
    );
    await page.evaluate(() => localStorage.removeItem("ulune.chinese"));

    if (sent.length) throw new Error(`${label}: sent ${sent.join(", ")}`);

    // Part 29: Fixture A, born at noon, calls for no note; the first read ends on "How Ulune calculates".
    await firstRead(page, width, "bazi-hello");
    const usual = await methodNotes(page, "bazi-hello");
    if (usual.notes.length) throw new Error(`${label}: Fixture A's notes ${JSON.stringify(usual.notes)}`);
    if (usual.title !== w.how || !usual.how.includes(w.school) || !usual.how.includes("Swiss Ephemeris 2.10.03, JPL DE441")) throw new Error(`${label}: "How Ulune calculates" ${usual.title} "${usual.how.slice(0, 200)}"`);
    // Fixture B, born at 23:10 in Oslo, 23:09 by the Sun: the Rat hour before midnight, said with the way to Settings.
    await goStudioPage(page, "natal");
    await castFixture(page, FIXTURE_B);
    await goStudioPage(page, "bazi");
    await page.getByTestId("bazi-board").waitFor({ timeout: 20000 });
    await firstRead(page, width, "bazi-hello");
    const late = await methodNotes(page, "bazi-hello");
    if (late.notes.map((n) => n.id).join() !== "day-boundary" || !w.born.test(late.notes[0].text) || !late.notes[0].text.endsWith(w.settings)) throw new Error(`${label}: Fixture B's notes ${JSON.stringify(late.notes)}`);
    if ((await page.locator("[data-testid=bazi-hello] [data-testid=method-note-settings]").getAttribute("href")) !== "/settings#chinese") throw new Error(`${label}: the note's way to Settings`);
    await assertNoOverflow(page);
    await page.screenshot({ path: join(SHOTS, `bazi-note-${lang}-${width}.png`) }).catch(() => {});
    // Settings → Chinese traditions → At midnight (another tab): the note follows at once.
    await page.evaluate(() => {
      localStorage.setItem("ulune.chinese", JSON.stringify({ dayBoundary: "midnight" }));
      window.dispatchEvent(new StorageEvent("storage", { key: "ulune.chinese" }));
    });
    await page.waitForFunction((t) => document.querySelector("[data-testid=bazi-hello] [data-testid=method-note]")?.textContent?.includes(t), w.chose, { timeout: 4000 });
    await page.evaluate(() => {
      localStorage.removeItem("ulune.chinese");
      window.dispatchEvent(new StorageEvent("storage", { key: "ulune.chinese" }));
    });
    // Pair: Sample B shown, TraceQA beside; the note names its person, the first read ends on the language's method.
    await goStudioPage(page, "bazi-pair");
    await page.getByTestId("bazi-pair").waitFor({ timeout: 20000 });
    await firstRead(page, width, "bazi-pair-hello");
    const pair = await methodNotes(page, "bazi-pair-hello");
    if (pair.notes.map((n) => n.id).join() !== "day-boundary" || !pair.notes[0].text.startsWith("Sample B — ") || !pair.notes[0].text.includes(w.whose)) throw new Error(`${label}: Pair's notes ${JSON.stringify(pair.notes)}`);
    if (pair.title !== w.how || !pair.how.includes(w.school)) throw new Error(`${label}: Pair's "How Ulune calculates" ${pair.title}`);

    if (errors.length) throw new Error(`${label}: ${errors.join(" | ")}`);
    console.log(`bazi ${label} OK`);
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
  console.error(`BAZI FAIL\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("BAZI OK");
