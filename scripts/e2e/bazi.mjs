/*
 * BaZi's pillar board (languages plan, part 12), at /bazi, at 1280 and
 * 390 px, in English and French, with Fixture A (made up: 15/06/1990, 12:00,
 * Paris), a Xin (Yin Metal) Day Master:
 *   - reached by its card in the language picker, under Chinese traditions;
 *   - the four columns hour to year (the year on the right), the day's
 *     marked as the Day Master, each stem's god (Eating God, Hurting
 *     Officer, Rob Wealth), the hidden stems (3, 2, 2, 2);
 *   - the Ten Gods beside the board, the Companion absent;
 *   - a stem's reading says why it is its god; a hidden stem's says its qi;
 *   - (part 13) under each column the Day Master's life stage and the Na
 *     Yin; the stars (Nobleman on the year and month, Golden Carriage and
 *     Heavenly Virtue on the day, General on the month, Travelling Horse on
 *     the hour), no empty pillar; a stage's reading says why, a star's how
 *     it is found; the stars panel and the empty branches;
 *   - (part 14) under the board the interactions between the pillars: the
 *     day and hour's clash and the year and month's self-punishment, side
 *     by side; choosing the clash outlines the day and hour branches and
 *     reads it;
 *   - (part 15) beside the board, the five phases (Fire and Water 2.7, Wood
 *     0.3), a weak Day Master, the Seven Killings structure, Earth and Metal
 *     favourable with Water by climate; the strength's reading shows its
 *     tests, the method is one tap away;
 *   - the table; Settings' "Year to hour" followed at once;
 *   - nothing sent while the page works it out; nothing scrolls sideways.
 */
import { join } from "node:path";
import { FIXTURE_A, SHOTS, assertNoOverflow, castFixture, clickDockTab, ensureShotsDir, gotoApp, launch, setLang, setView } from "./_lib.mjs";

const WORDS = {
  en: {
    heading: "Chinese traditions",
    gods: { hour: "Eating God", day: "Day Master", month: "Hurting Officer", year: "Rob Wealth" },
    why: "produces Water",
    qi: "Residual qi",
    stages: { hour: "Death", day: "Bath", month: "Sickness", year: "Sickness" },
    stageWhy: "being yin, goes backward",
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
  },
  fr: {
    heading: "Traditions chinoises",
    gods: { hour: "Dieu nourricier", day: "Maître du jour", month: "Officier blessant", year: "Rival" },
    why: "produit l’Eau",
    qi: "Qi résiduel",
    stages: { hour: "Mort", day: "Bain", month: "Maladie", year: "Maladie" },
    stageWhy: "étant yin, recule",
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
    await page.getByTestId("lang-button").click();
    await page.getByTestId("lang-card-bazi").waitFor({ timeout: 8000 });
    if (await page.getByTestId("lang-info-bazi").count()) throw new Error(`${label}: an ⓘ to a home that does not exist yet`);
    const sent = [];
    page.on("request", (r) => {
      const u = new URL(r.url());
      if (r.method() !== "GET" || /_serverFn|\/api\//.test(u.pathname)) sent.push(`${r.method()} ${u.pathname}`);
    });
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

    // The table: four pillars, ten gods.
    await setView(page, "table");
    await page.getByTestId("bazi-table").waitFor({ timeout: 10000 });
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
