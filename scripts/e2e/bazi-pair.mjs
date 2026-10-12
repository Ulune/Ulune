/*
 * BaZi's first read and Pair (languages plan, part 19), at 1280 and 390 px
 * in English and French, with two made-up charts (Fixture B, then Fixture A
 * shown):
 *   - BaZi's first read in the side panel: the Day Master, the phases, the
 *     strength, the structure, the favourable phases and both counts' luck
 *     pillars now, each opening its reading (a luck pillar's too), and the
 *     way to Cycles;
 *   - Pair (/bazi/pair), by the Relationship lens: both boards, the Day
 *     Masters (Sample B's Ding is TraceQA's Seven Killings, TraceQA's Xin
 *     Sample B's Indirect Wealth), the partner palaces (Hai and Si clash),
 *     what each brings the other (Metal to TraceQA, Fire to Sample B), the
 *     meetings of Sample B's four pillars; a card's and a cell's readings;
 *     the table;
 *   - nothing sent; nothing scrolls sideways.
 */
import { join } from "node:path";
import { FIXTURE_A, FIXTURE_B, SHOTS, assertNoOverflow, castFixture, clickDockTab, ensureShotsDir, gotoApp, goStudioPage, launch, setLang, setView } from "./_lib.mjs";

const WORDS = {
  en: { dm: "Sample B’s Day Master is the Seven Killings", back: "is the Indirect Wealth", palace: "clash", gifts: ["Sample B holds plenty of Metal", "TraceQA holds plenty of Fire"], fam: "Sample B’s Day Master controls TraceQA’s", luck: "A decade of", first: "Your first read", cell: "TraceQA ·" },
  fr: { dm: "le Maître du jour de Sample B est le dieu Sept Tueurs", back: "est le dieu Richesse indirecte", palace: "choc", gifts: ["Sample B tient beaucoup de Métal", "TraceQA tient beaucoup de Feu"], fam: "Le Maître du jour de Sample B contrôle celui de TraceQA", luck: "Une décennie", first: "Votre première lecture", cell: "TraceQA ·" },
};
const note = (page) => page.getByTestId("click-note").evaluate((e) => e.textContent ?? "").catch(() => "");

async function waitNote(page, text, label, what) {
  await page.waitForFunction((t) => document.querySelector("[data-testid=click-note]")?.textContent?.includes(t), text, { timeout: 8000 }).catch(async () => {
    throw new Error(`${label}: ${what} "${(await note(page)).slice(0, 300)}"`);
  });
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
    await castFixture(page, FIXTURE_B);
    await castFixture(page, FIXTURE_A);
    const sent = [];
    page.on("request", (r) => {
      const u = new URL(r.url());
      if (r.method() !== "GET" || /_serverFn|\/api\//.test(u.pathname)) sent.push(`${r.method()} ${u.pathname}`);
    });

    // ── BaZi's first read ──
    await goStudioPage(page, "bazi");
    await page.getByTestId("bazi-board").waitFor({ timeout: 20000 });
    if (width < 1024) await clickDockTab(page, "reading");
    await page.getByTestId("bazi-hello").waitFor({ timeout: 8000 });
    const steps = await page.locator("[data-testid^=bazi-hello-]").evaluateAll((els) => els.map((e) => e.getAttribute("data-testid").slice(11)));
    if (steps.join() !== "dm,phases,strength,structure,favourable,luck-yang,luck-yin") throw new Error(`${label}: the first read's steps ${steps}`);
    const title = await page.getByTestId("bazi-hello").evaluate((e) => e.textContent);
    if (!title.includes(w.first)) throw new Error(`${label}: the first read's title`);
    await page.getByTestId("bazi-hello-luck-yang").click();
    if (width < 1024) await clickDockTab(page, "reading").catch(() => {});
    await waitNote(page, w.luck, label, "the first read's luck pillar");
    await page.screenshot({ path: join(SHOTS, `bazi-first-${lang}-${width}.png`) }).catch(() => {});
    await page.keyboard.press("Escape").catch(() => {});

    // ── Pair ──
    await goStudioPage(page, "bazi-pair");
    await page.getByTestId("bazi-pair").waitFor({ timeout: 20000 });
    if (new URL(page.url()).pathname !== "/bazi/pair") throw new Error(`${label}: at ${page.url()}`);
    const pair = await page.evaluate(() => ({
      boards: document.querySelectorAll("[data-testid^=bazi-pair-board-]").length,
      dmCols: document.querySelectorAll(".ulune-bzp-col.is-dm").length,
      cells: document.querySelectorAll(".ulune-bzp-cell").length,
      dm: document.querySelector("[data-testid=bazi-pair-dm]")?.textContent ?? "",
      palace: document.querySelector("[data-testid=bazi-pair-palace]")?.textContent ?? "",
      gifts: document.querySelector("[data-testid=bazi-pair-gifts]")?.textContent ?? "",
      meets: [...document.querySelectorAll("[data-testid^=bazi-pair-meet-]")].map((e) => e.getAttribute("data-testid").slice(15)),
    }));
    if (pair.boards !== 2 || pair.dmCols !== 2 || pair.cells !== 16) throw new Error(`${label}: the boards ${JSON.stringify(pair)}`);
    if (!pair.dm.includes(w.dm) || !pair.dm.includes(w.back)) throw new Error(`${label}: the Day Masters "${pair.dm}"`);
    if (!pair.palace.toLowerCase().includes(w.palace)) throw new Error(`${label}: the palaces "${pair.palace}"`);
    for (const g of w.gifts) if (!pair.gifts.includes(g)) throw new Error(`${label}: the gifts "${pair.gifts}"`);
    if (pair.meets.join() !== "year,month,day,hour") throw new Error(`${label}: the meetings ${pair.meets}`);
    await assertNoOverflow(page);
    await page.screenshot({ path: join(SHOTS, `bazi-pair-${lang}-${width}.png`) }).catch(() => {});

    // A card's reading; a cell's, named for its person.
    await page.getByTestId("bazi-pair-dm").evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.getByTestId("bazi-pair-dm").click();
    if (width < 1024) await clickDockTab(page, "reading");
    await waitNote(page, w.fam, label, "the Day Masters' reading");
    if (width < 1024) await clickDockTab(page, "reading").catch(() => {});
    await page.getByTestId("bazi-pair-a-day-stem").evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.getByTestId("bazi-pair-a-day-stem").click();
    if (width < 1024) await clickDockTab(page, "reading");
    await page.waitForFunction(() => document.querySelector("[data-testid=click-note]")?.textContent?.includes("xīn"), null, { timeout: 8000 });
    if (width < 1024) await clickDockTab(page, "reading").catch(() => {});

    // The table.
    await setView(page, "table");
    await page.getByTestId("bazi-pair-table").waitFor({ timeout: 10000 });
    const rows = await page.locator("[data-testid^=bazi-pair-row-]").count();
    const meetRows = await page.locator("[data-testid^=bazi-pair-meetrow-]").count();
    if (rows !== 4 || meetRows !== 4) throw new Error(`${label}: the table ${rows} lines, ${meetRows} pillars`);
    await assertNoOverflow(page);
    await setView(page, "wheel");

    if (sent.length) throw new Error(`${label}: sent ${sent.join(", ")}`);
    if (errors.length) throw new Error(`${label}: ${errors.join(" | ")}`);
    console.log(`bazi-pair ${label} OK`);
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
  console.error(`BAZI-PAIR FAIL\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("BAZI-PAIR OK");
