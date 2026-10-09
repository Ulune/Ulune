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
 *   - the table; Settings' "Year to hour" followed at once;
 *   - nothing sent while the page works it out; nothing scrolls sideways.
 */
import { join } from "node:path";
import { FIXTURE_A, SHOTS, assertNoOverflow, castFixture, clickDockTab, ensureShotsDir, gotoApp, launch, setLang, setView } from "./_lib.mjs";

const WORDS = {
  en: { heading: "Chinese traditions", gods: { hour: "Eating God", day: "Day Master", month: "Hurting Officer", year: "Rob Wealth" }, why: "produces Water", qi: "Residual qi" },
  fr: { heading: "Traditions chinoises", gods: { hour: "Dieu nourricier", day: "Maître du jour", month: "Officier blessant", year: "Rival" }, why: "produit l’Eau", qi: "Qi résiduel" },
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

    // The table: four pillars, ten gods.
    await setView(page, "table");
    await page.getByTestId("bazi-table").waitFor({ timeout: 10000 });
    const rows = await page.locator("[data-testid^=bazi-row-]").count();
    if (rows !== 4) throw new Error(`${label}: ${rows} pillars in the table`);
    const hidCell = await page.getByTestId("bazi-hidden-cell-hour").innerText();
    if (!hidCell.includes(w.gods.year)) throw new Error(`${label}: the hour's hidden stems "${hidCell}"`);
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
