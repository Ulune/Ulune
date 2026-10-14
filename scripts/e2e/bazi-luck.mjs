/*
 * BaZi's Cycles (languages plan, part 16), at /bazi/cycles, at 1280 and 390 px
 * in English and French, with Fixture A (made up: 15/06/1990, 12:00, Paris),
 * no yin or yang count given:
 *   - reached from BaZi by its Cycles lens; both directions shown, with the
 *     note: the yang count forward from 7 years 3 months (Gui-Wei first), the
 *     yin count backward from 3 years 1 month (Xin-Si first), nine blocks each;
 *   - 2026, Bing-Wu: the Direct Officer, combining with the day stem; its
 *     luck pillars (Yi-You, Wu-Yin); its twelve months, Geng-Yin first;
 *   - the slider to 2000: the first yang block is the year's; a block's
 *     reading, and how the pillars are counted ("they agree");
 *   - the table: eighteen luck pillars, the year and twelve months;
 *   - (part 29) the page's method notes, here on the page since the side
 *     panel reads the year: none for Fixture A, and "How Ulune calculates" at
 *     the end, naming the Zi Ping school and how the luck pillars start;
 *   - nothing sent; nothing scrolls sideways.
 */
import { join } from "node:path";
import { FIXTURE_A, SHOTS, assertNoOverflow, castFixture, clickDockTab, ensureShotsDir, gotoApp, goStudioPage, launch, setLang, setView } from "./_lib.mjs";
import { watchSent } from "./_sent.mjs";

const WORDS = {
  en: { yang: "7 years 3 months", yin: "3 years 1 month", god: "Direct Officer", combo: "Stem combination · Day pillar", lead: "For ten years", agree: "they agree", how: "How Ulune calculates", method: ["BaZi follows the Zi Ping school", "The luck pillars step from the month pillar", "Swiss Ephemeris 2.10.03, JPL DE441"] },
  fr: { yang: "7 ans 3 mois", yin: "3 ans 1 mois", god: "Officier direct", combo: "Combinaison de troncs · Pilier du jour", lead: "Pendant dix ans", agree: "ils s’accordent", how: "Comment Ulune calcule", method: ["Le BaZi suit l’école Zi Ping", "Les piliers de chance avancent ou reculent depuis le pilier du mois", "Swiss Ephemeris 2.10.03, JPL DE441"] },
};
const note = (page) => page.getByTestId("click-note").evaluate((e) => e.textContent ?? "").catch(() => "");

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
    // Nothing but the app's own files, by GET, from here (_sent.mjs).
    const sent = watchSent(page);
    await goStudioPage(page, "bazi-luck");
    await page.getByTestId("bazi-luck").waitFor({ timeout: 20000 });
    if (new URL(page.url()).pathname !== "/bazi/cycles") throw new Error(`${label}: at ${page.url()}`);

    // Both directions, nine blocks each.
    await page.getByTestId("bazi-luck-both").waitFor({ timeout: 5000 });
    const bands = await page.evaluate(() => ({
      yang: document.querySelector("[data-testid=bazi-luck-start-yang]")?.textContent ?? "",
      yin: document.querySelector("[data-testid=bazi-luck-start-yin]")?.textContent ?? "",
      n: [...document.querySelectorAll("[data-testid^=bazi-luck-yang-], [data-testid^=bazi-luck-yin-]")].filter((b) => /-(yang|yin)-\d+$/.test(b.getAttribute("data-testid"))).length,
      first: [document.querySelector("[data-testid=bazi-luck-yang-1] .ulune-bzl-pair")?.textContent, document.querySelector("[data-testid=bazi-luck-yin-1] .ulune-bzl-pair")?.textContent],
    }));
    if (!bands.yang.includes(w.yang) || !bands.yin.includes(w.yin)) throw new Error(`${label}: the starts "${bands.yang}" / "${bands.yin}"`);
    if (bands.n !== 18) throw new Error(`${label}: ${bands.n} luck blocks`);
    if (bands.first.join() !== "癸未,辛巳") throw new Error(`${label}: the first luck pillars ${bands.first}`);
    // Part 29: no note for Fixture A; at the page's end, "How Ulune calculates", folded.
    const method = await page.evaluate(() => {
      const how = document.querySelector("[data-testid=bazi-luck] [data-testid=method-notes]");
      return { notes: document.querySelectorAll("[data-testid=bazi-luck] [data-testid=method-note]").length, title: how?.querySelector("summary")?.textContent?.trim(), open: how?.open, text: how?.textContent ?? "" };
    });
    if (method.notes || method.title !== w.how || method.open || !w.method.every((t) => method.text.includes(t))) throw new Error(`${label}: the method notes ${JSON.stringify(method).slice(0, 300)}`);

    // To 2026 whatever year this is.
    for (let i = 0; i < 120; i += 1) {
      const y = Number(await page.getByTestId("bazi-luck-year").innerText());
      if (y === 2026) break;
      await page.getByTestId(y > 2026 ? "bazi-luck-prev" : "bazi-luck-next").click();
    }
    const year = await page.evaluate(() => ({
      pair: document.querySelector("[data-testid=bazi-flow-year] .ulune-bzl-pair")?.textContent,
      god: document.querySelector("[data-testid=bazi-flow-year-god]")?.textContent,
      meets: document.querySelector("[data-testid=bazi-flow-year-meets]")?.textContent ?? "",
      luck: [document.querySelector("[data-testid=bazi-flow-year-luck-yang]")?.textContent ?? "", document.querySelector("[data-testid=bazi-flow-year-luck-yin]")?.textContent ?? ""],
      months: [...document.querySelectorAll("[data-testid^=bazi-flow-month-] .ulune-bzl-pair")].map((m) => m.textContent),
    }));
    if (year.pair !== "丙午" || year.god !== w.god) throw new Error(`${label}: 2026 ${year.pair} ${year.god}`);
    if (!year.meets.includes(w.combo)) throw new Error(`${label}: 2026 meets "${year.meets}"`);
    if (!year.luck[0].includes("乙酉") || !year.luck[1].includes("戊寅")) throw new Error(`${label}: 2026's luck pillars ${year.luck}`);
    if (year.months.length !== 12 || year.months[0] !== "庚寅") throw new Error(`${label}: 2026's months ${year.months}`);
    await assertNoOverflow(page);
    await page.screenshot({ path: join(SHOTS, `bazi-luck-${lang}-${width}.png`) }).catch(() => {});

    // The slider to 2000: the first yang block (1997–2007) is the year's.
    await page.getByTestId("bazi-luck-slider").evaluate((el) => {
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      set.call(el, "2000");
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await page.waitForFunction(() => document.querySelector("[data-testid=bazi-luck-slider-year]")?.textContent === "2000", null, { timeout: 4000 });
    const isYear = await page.getByTestId("bazi-luck-yang-1").evaluate((e) => e.classList.contains("is-year"));
    if (!isYear) throw new Error(`${label}: 2000 is not in the first yang block`);

    // A block's reading; how they are counted.
    await page.getByTestId("bazi-luck-yang-2").evaluate((el) => el.scrollIntoView({ block: "center", inline: "center" }));
    await page.getByTestId("bazi-luck-yang-2").click();
    if (width < 1024) await clickDockTab(page, "reading");
    await page.waitForFunction((t) => document.querySelector("[data-testid=click-note]")?.textContent?.includes(t), w.lead, { timeout: 8000 }).catch(async () => {
      throw new Error(`${label}: a block's reading "${(await note(page)).slice(0, 300)}"`);
    });
    if (width < 1024) await clickDockTab(page, "reading").catch(() => {});
    await page.getByTestId("bazi-luck-how").evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.getByTestId("bazi-luck-how").click();
    if (width < 1024) await clickDockTab(page, "reading");
    await page.waitForFunction((t) => document.querySelector("[data-testid=click-note]")?.textContent?.includes(t), w.agree, { timeout: 8000 });
    if (width < 1024) await clickDockTab(page, "reading").catch(() => {});

    // The table.
    await setView(page, "table");
    await page.getByTestId("bazi-luck-table").waitFor({ timeout: 10000 });
    const luckRows = await page.locator("[data-testid^=bazi-luck-row-]").count();
    const flowRows = await page.locator("[data-testid^=bazi-flow-row-]").count();
    if (luckRows !== 18 || flowRows !== 13) throw new Error(`${label}: the table ${luckRows} luck pillars, ${flowRows} year and months`);
    await assertNoOverflow(page);
    await setView(page, "wheel");
    await page.getByTestId("bazi-luck-year").click().catch(() => {});

    if (sent.length) throw new Error(`${label}: sent ${sent.join(", ")}`);
    if (errors.length) throw new Error(`${label}: ${errors.join(" | ")}`);
    console.log(`bazi-luck ${label} OK`);
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
  console.error(`BAZI-LUCK FAIL\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("BAZI-LUCK OK");
