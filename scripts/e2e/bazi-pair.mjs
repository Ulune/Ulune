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
 *   - (part 28) from BaZi, the chart switcher's pair button opens BaZi's own
 *     Relationship page with that person, not astrology's Synastry;
 *   - (part 20, the review's BZ9) the luck pillars of the moment: Sample B is
 *     cast with the yang count and TraceQA without one, so TraceQA has a row
 *     per count and Sample B one, then how the decades meet; a decade opens
 *     its person's reading as Cycles writes it, the meeting row the pair's;
 *     the side panel lists them; the table has their part; French names
 *     each god with its article;
 *   - nothing sent; nothing scrolls sideways.
 */
import { join } from "node:path";
import { FIXTURE_A, FIXTURE_B, SHOTS, assertNoOverflow, castFixture, clickDockTab, ensureShotsDir, gotoApp, goStudioPage, launch, setLang, setView } from "./_lib.mjs";
import { watchSent } from "./_sent.mjs";

const WORDS = {
  en: {
    dm: "Sample B’s Day Master is the Seven Killings",
    back: "is the Indirect Wealth",
    palace: "clash",
    gifts: ["Sample B holds plenty of Metal", "TraceQA holds plenty of Fire"],
    fam: "Sample B’s Day Master controls TraceQA’s",
    luck: "A decade of",
    first: "Your first read",
    cell: "TraceQA ·",
    compare: "Relationship with Sample B (BaZi: two charts)",
    luckHead: "Luck pillars now",
    yang: "Yang count",
    decade: "For ten years",
    meetHead: "How the two decades meet",
  },
  fr: {
    dm: "le Maître du jour de Sample B représente les Sept Tueurs",
    back: "représente la Richesse indirecte",
    palace: "choc",
    gifts: ["Sample B tient beaucoup de Métal", "TraceQA tient beaucoup de Feu"],
    fam: "Le Maître du jour de Sample B contrôle celui de TraceQA",
    luck: "Une décennie",
    first: "Votre première lecture",
    cell: "TraceQA ·",
    compare: "Relation avec Sample B (BaZi\u202f: deux thèmes)",
    luckHead: "Piliers de chance en cours",
    yang: "Compte yang",
    decade: "Pendant dix ans",
    meetHead: "Comment les deux décennies se rencontrent",
  },
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
    // Sample B with her yang count (part 20: the partner's own count), TraceQA without one.
    await castFixture(page, { ...FIXTURE_B, chineseCount: "yang" });
    await castFixture(page, FIXTURE_A);
    // Nothing but the app's own files, by GET, from here (_sent.mjs).
    const sent = watchSent(page);

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

    // ── The switcher's pair button (part 28): from BaZi, BaZi's own Relationship page ──
    await page.getByTestId("chart-chip").click();
    const pairButton = page.locator(`[data-testid=chart-row][data-name="${FIXTURE_B.name}"] [data-testid=chart-pair]`);
    const pairSays = await pairButton.getAttribute("aria-label");
    if (pairSays !== w.compare) throw new Error(`${label}: the pair button says "${pairSays}"`);
    await pairButton.click();
    await page.getByTestId("bazi-pair").waitFor({ timeout: 20000 });
    if (new URL(page.url()).pathname !== "/bazi/pair") throw new Error(`${label}: the pair button led to ${page.url()}`);
    if (await page.getByTestId("studio-synastry").count()) throw new Error(`${label}: the pair button opened Synastry`);

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
    // The luck pillars of the moment (part 20): TraceQA by both counts, Sample B by hers, then how the decades meet.
    const luck = await page.evaluate(() => ({
      head: document.querySelector("[data-testid=bazi-pair-luck] h2")?.textContent ?? "",
      rows: [...document.querySelectorAll("[data-testid^=bazi-pair-luck-]")].map((e) => ({
        id: e.getAttribute("data-testid").slice(15),
        kind: e.querySelector(".ulune-bz-ixrow-kind")?.textContent ?? "",
        sub: e.querySelector(".ulune-bz-ixrow-sub")?.textContent ?? "",
        h: e.getBoundingClientRect().height,
      })),
    }));
    if (luck.head !== w.luckHead) throw new Error(`${label}: the luck pillars' heading "${luck.head}"`);
    if (luck.rows.map((r) => r.id).join() !== "a-yang,a-yin,b-yang,meets") throw new Error(`${label}: the luck rows ${luck.rows.map((r) => r.id)}`);
    if (luck.rows[0].kind !== `${FIXTURE_A.name} · ${w.yang}` || luck.rows[2].kind !== FIXTURE_B.name) throw new Error(`${label}: who the rows name ${luck.rows.map((r) => r.kind)}`);
    if (!luck.rows[0].sub.includes(FIXTURE_B.name) || !luck.rows[2].sub.includes(FIXTURE_A.name)) throw new Error(`${label}: what each decade is to the other ${luck.rows.map((r) => r.sub)}`);
    if (luck.rows[3].kind !== w.meetHead || !luck.rows[3].sub) throw new Error(`${label}: how the decades meet "${luck.rows[3].kind}" "${luck.rows[3].sub}"`);
    if (luck.rows.some((r) => r.h < (width < 1024 ? 44 : 24))) throw new Error(`${label}: a luck row under its tap size ${luck.rows.map((r) => r.h)}`);
    // The side panel's first view lists them after the cards' lines (two, the palaces, two gifts, three decades, how they meet).
    if (width >= 1024) {
      await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
      await page.keyboard.press("Escape");
      await page.getByTestId("bazi-pair-hello").waitFor({ timeout: 8000 });
      const hello = await page.locator("[data-testid=bazi-pair-hello-row]").allTextContents();
      if (hello.length < 7 || !hello.some((t) => t.startsWith(`${FIXTURE_B.name}: `) || t.startsWith(`${FIXTURE_B.name}\u202f: `))) throw new Error(`${label}: the side panel's lines ${hello.join(" | ")}`);
    }
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
    // A decade opens its person's reading, as Cycles writes it; the meeting row the pair's.
    await page.getByTestId("bazi-pair-luck-a-yin").evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.getByTestId("bazi-pair-luck-a-yin").click();
    if (width < 1024) await clickDockTab(page, "reading");
    await waitNote(page, w.decade, label, "a decade's reading");
    await waitNote(page, FIXTURE_A.name, label, "a decade named for its person");
    if (width < 1024) await clickDockTab(page, "reading").catch(() => {});
    await page.getByTestId("bazi-pair-luck-meets").evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.getByTestId("bazi-pair-luck-meets").click();
    if (width < 1024) await clickDockTab(page, "reading");
    await waitNote(page, w.meetHead, label, "the decades' reading");
    if (width < 1024) await clickDockTab(page, "reading").catch(() => {});

    // The table.
    await setView(page, "table");
    await page.getByTestId("bazi-pair-table").waitFor({ timeout: 10000 });
    const rows = await page.locator("[data-testid^=bazi-pair-row-]").count();
    const meetRows = await page.locator("[data-testid^=bazi-pair-meetrow-]").count();
    const luckRows = await page.locator("[data-testid^=bazi-pair-luckrow-]").evaluateAll((els) => els.map((e) => e.getAttribute("data-testid").slice(18)));
    if (rows !== 4 || meetRows !== 4) throw new Error(`${label}: the table ${rows} lines, ${meetRows} pillars`);
    if (luckRows.join() !== "a-yang,a-yin,b-yang,meets") throw new Error(`${label}: the table's luck pillars ${luckRows}`);
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
