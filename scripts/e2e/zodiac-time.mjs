/*
 * Chinese astrology in time and between two people (languages plan,
 * part 11), at 1280 px in English and 390 px in French, with two made-up
 * charts (Fixture B, then Fixture A shown):
 *   - Cycles (/chinese-astrology/cycles), the year ahead: stepped to 2026,
 *     the Yang Fire Horse, Fixture A's own year (本命年); its months, the
 *     Horse month marked "own year" and the Rat month a clash, each opening
 *     its reading; the table's twelve months; 2027, the Goat, in harmony;
 *   - Pair (/chinese-astrology/pair): A's and B's animals on one wheel (eight
 *     badges, B's as rings), the year animals in a destruction (Horse–Rabbit),
 *     the day animals in a clash (Pig–Snake), a meeting's reading, the table;
 *     "You two, now" (share and compare plan, feature 5e) beside the wheel
 *     and in the first read: this year's animal for both, each one's year
 *     animal meeting it, the month for both, a line for the two; the year
 *     opens its reading; the table's last part says the same;
 *   - the Calendar's "The day's animal" layer: each day of the month drawn,
 *     the clash days (the Rat's, against a Horse year animal) marked; the
 *     day view's animal opening its reading, whose glossary claims none of
 *     astrology's words;
 *   - nothing sent while Cycles and Pair work; nothing scrolls sideways; the
 *     registry of Chinese terms never fetched while no family of terms is
 *     written (part 29). Since the encyclopedia's pilot (encyclopedia plan,
 *     part 23: the phases, yin and yang) it comes with the tables' words.
 */
import { FIXTURE_A, FIXTURE_B, assertNoOverflow, castFixture, clickDockTab, ensureShotsDir, gotoApp, goStudioPage, launch, openCalendarView, setLang, setView, SHOTS } from "./_lib.mjs";
import { watchSent } from "./_sent.mjs";
import { join } from "node:path";
import { readFileSync } from "node:fs";

/** Whether a family of Chinese terms is written (lib/chinese/term-live.ts): then the tables' words link, and fetch the registry to do so. */
const LIVE = /LIVE_FAMILIES[^=]*=\s*new Set<ChineseFamily>\(\[([^\]]*)\]/.exec(readFileSync(new URL("../../src/lib/chinese/term-live.ts", import.meta.url), "utf8"));
const ANY_LIVE = /"[a-z-]+"/.test(LIVE?.[1] ?? "");

const WORDS = {
  en: { fireHorse: "Yang Fire Horse", goat: "Yin Fire Goat", own: "Own year", harmony: "Harmony", ratMonth: "The Rat month", destruction: "Destruction", clash: "Clash", pairText: "One of the six destructions", day: "Day of the", nowHead: "You two, now" },
  fr: { fireHorse: "Cheval de Feu yang", goat: "Chèvre de Feu yin", own: "Année propre", harmony: "Harmonie", ratMonth: "Le mois du Rat", destruction: "Destruction", clash: "Choc", pairText: "Une des six destructions", day: "Jour ", nowHead: "Vous deux, maintenant" },
};

const note = (page) => page.getByTestId("click-note").evaluate((e) => e.textContent ?? "");

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
    // Nothing but the app's own files, by GET, while Cycles and Pair work (_sent.mjs).
    const sent = watchSent(page);
    // The registry of Chinese terms and its links wait for the encyclopedia's Chinese pages (part 29): never fetched before a family is written.
    const registry = [];
    page.on("request", (r) => {
      const u = new URL(r.url());
      if (/chinese\/term-(?:ids|refs)|ChineseTermLink|ChineseReadingTerms/.test(u.pathname)) registry.push(u.pathname);
    });

    // ── Cycles: the year ahead ──
    await goStudioPage(page, "zodiac-years");
    await page.getByTestId("zodiac-years").waitFor({ timeout: 20000 });
    if (new URL(page.url()).pathname !== "/chinese-astrology/cycles") throw new Error(`${label}: at ${page.url()}`);
    // Step to 2026 whatever year this is.
    for (let i = 0; i < 300; i += 1) {
      const y = Number(await page.getByTestId("zodiac-years-year").innerText());
      if (y === 2026) break;
      await page.getByTestId(y > 2026 ? "zodiac-years-prev" : "zodiac-years-next").click();
    }
    const head = await page.getByTestId("zodiac-year").innerText();
    if (!head.includes(w.fireHorse)) throw new Error(`${label}: the year "${head}"`);
    const own = await page.getByTestId("zodiac-year-year").evaluate((e) => [e.getAttribute("data-tone"), e.textContent]);
    if (own[0] !== "same" || !own[1].includes(w.own)) throw new Error(`${label}: the year animal's year ${own.join(" | ")}`);
    const months = await page.locator("[data-testid^=zodiac-month-]").evaluateAll((els) => els.map((e) => e.getAttribute("data-tone") ?? ""));
    if (months.length !== 12 || months[4] !== "same" || months[10] !== "tension") throw new Error(`${label}: the months' tones ${months.join(",")}`);
    if (width < 1024) await page.getByTestId("zodiac-month-10").scrollIntoViewIfNeeded();
    await page.getByTestId("zodiac-month-10").click();
    if (width < 1024) await clickDockTab(page, "reading");
    await page.waitForFunction((t) => document.querySelector("[data-testid=click-note]")?.textContent?.includes(t), w.ratMonth, { timeout: 8000 });
    await assertNoOverflow(page);
    await page.screenshot({ path: join(SHOTS, `zodiac-years-${lang}-${width}.png`) }).catch(() => {});
    // The table: twelve months.
    await setView(page, "table");
    await page.getByTestId("zodiac-years-table").waitFor({ timeout: 10000 });
    const rows = await page.locator("[data-testid^=zodiac-years-row-]").count();
    if (rows !== 12) throw new Error(`${label}: ${rows} months in the table`);
    await setView(page, "wheel");
    await page.getByTestId("zodiac-years").waitFor({ timeout: 10000 });
    // 2027, the Goat: in harmony with the Horse.
    await page.getByTestId("zodiac-years-next").click();
    await page.waitForFunction((t) => document.querySelector("[data-testid=zodiac-year]")?.textContent?.includes(t), w.goat, { timeout: 4000 });
    const y27 = await page.getByTestId("zodiac-year-year").evaluate((e) => [e.getAttribute("data-tone"), e.textContent]);
    if (y27[0] !== "meet" || !y27[1].includes(w.harmony)) throw new Error(`${label}: 2027 for the Horse ${y27.join(" | ")}`);
    await page.getByTestId("zodiac-years-year").click();

    // ── Pair: two people's animals ──
    await goStudioPage(page, "zodiac-pair");
    await page.getByTestId("zodiac-pair").waitFor({ timeout: 20000 });
    if (new URL(page.url()).pathname !== "/chinese-astrology/pair") throw new Error(`${label}: at ${page.url()}`);
    const badges = await page.evaluate(() => ({
      a: document.querySelectorAll("[data-testid^=zodiac-pair-badge-a-]").length,
      b: document.querySelectorAll("[data-testid^=zodiac-pair-badge-b-].is-b").length,
      lines: document.querySelectorAll("[data-testid=zodiac-lines] line").length,
    }));
    if (badges.a !== 4 || badges.b !== 4 || badges.lines < 1) throw new Error(`${label}: the pair's wheel ${JSON.stringify(badges)}`);
    const years = await page.getByTestId("zodiac-pair-year-year").evaluate((e) => e.textContent ?? "");
    if (!years.includes(w.destruction)) throw new Error(`${label}: the year animals "${years}"`);
    const days = await page.getByTestId("zodiac-pair-day-day").evaluate((e) => e.textContent ?? "");
    if (!days.includes(w.clash)) throw new Error(`${label}: the day animals "${days}"`);
    await page.getByTestId("zodiac-pair-year-year").click();
    if (width < 1024) await clickDockTab(page, "reading");
    await page.waitForFunction((t) => document.querySelector("[data-testid=click-note]")?.textContent?.includes(t), w.pairText, { timeout: 8000 });
    if (width < 1024) await clickDockTab(page, "reading").catch(() => {});
    // "You two, now" beside the wheel (feature 5e): this year's animal for both, the month, a line for the two.
    const nowOf = (id) =>
      page.evaluate((t) => {
        const root = document.querySelector(`[data-testid=${t}]`);
        const row = (x) => root?.querySelector(`[data-testid=${t}-${x}]`);
        return {
          head: root?.querySelector("h3")?.textContent ?? "",
          when: root?.querySelector(`[data-testid=${t}-when]`)?.textContent ?? "",
          lead: root?.querySelector(".ulune-two-now-lead")?.textContent ?? "",
          a: row("a")?.querySelector(".ulune-two-now-title")?.textContent ?? "",
          b: row("b")?.querySelector(".ulune-two-now-title")?.textContent ?? "",
          tones: [row("a")?.getAttribute("data-tone"), row("b")?.getAttribute("data-tone")],
          month: row("month")?.querySelector(".ulune-two-now-sub")?.textContent ?? "",
        };
      }, id);
    const now = await nowOf("zodiac-pair-now-side");
    if (now.head !== w.nowHead || !/^\d{4}, /.test(now.when) || !now.lead) throw new Error(`${label}: "You two, now" ${JSON.stringify(now)}`);
    if (!now.a.startsWith(`${FIXTURE_A.name} · `) || !now.b.startsWith(`${FIXTURE_B.name} · `)) throw new Error(`${label}: whose year "${now.a}" "${now.b}"`);
    if (!now.tones.every((t) => ["support", "quiet", "move"].includes(t)) || !now.month.includes(FIXTURE_A.name) || !now.month.includes(FIXTURE_B.name)) throw new Error(`${label}: the year and the month for both ${JSON.stringify(now)}`);
    await page.getByTestId("zodiac-pair-now-side-when").evaluate((e) => e.scrollIntoView({ block: "center" }));
    await page.getByTestId("zodiac-pair-now-side-when").click();
    if (width < 1024) await clickDockTab(page, "reading");
    await page.waitForFunction((t) => document.querySelector("[data-testid=click-note]")?.textContent?.includes(t), now.lead, { timeout: 8000 });
    if (width < 1024) await clickDockTab(page, "reading").catch(() => {});
    // The same part ends the first read (the side panel; a phone's sheet).
    await page.keyboard.press("Escape").catch(() => {});
    await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
    await page.waitForFunction(() => !document.querySelector("[data-testid=click-note]"), null, { timeout: 4000 }).catch(() => {});
    if (width < 1024) await clickDockTab(page, "reading");
    await page.getByTestId("zodiac-pair-now").waitFor({ state: "attached", timeout: 8000 });
    const hello = await nowOf("zodiac-pair-now");
    if (JSON.stringify(hello) !== JSON.stringify(now)) throw new Error(`${label}: the first read's "You two, now" ${JSON.stringify(hello)} against ${JSON.stringify(now)}`);
    if (width < 1024) await clickDockTab(page, "reading").catch(() => {});
    await assertNoOverflow(page);
    await page.screenshot({ path: join(SHOTS, `zodiac-pair-${lang}-${width}.png`) }).catch(() => {});
    await setView(page, "table");
    await page.getByTestId("zodiac-pair-table").waitFor({ timeout: 10000 });
    const prow = await page.locator("[data-testid^=zodiac-pair-row-]").count();
    if (prow !== 9) throw new Error(`${label}: ${prow} meetings in the table`);
    // Its last part, "You two, now": each person's year animal meeting this year's, then the month.
    const nowTable = await page.locator("[data-testid=table-now] [data-testid^=zodiac-pair-now-]").evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")));
    if (nowTable.join() !== "zodiac-pair-now-table-together,zodiac-pair-now-table,zodiac-pair-now-row-a,zodiac-pair-now-row-b,zodiac-pair-now-month-a,zodiac-pair-now-month-b,zodiac-pair-now-table-year") throw new Error(`${label}: the table's "You two, now" ${nowTable}`);
    await setView(page, "wheel");

    // ── The Calendar: the day's animal (the sky it shows comes from the server, as always) ──
    sent.stop();
    await goStudioPage(page, "timing");
    await page.getByTestId("studio-timing").waitFor({ timeout: 20000 });
    await openCalendarView(page);
    const sw = page.getByTestId("calendar-layer-animals");
    if ((await sw.getAttribute("aria-checked")) !== "false") throw new Error(`${label}: the day's animal is on by default`);
    await sw.click();
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => document.querySelectorAll("[data-testid^=calendar-animal-]").length >= 28, null, { timeout: 8000 });
    // Clash days: the Rat's, against Fixture A's Horse year animal, once the engine has come.
    await page.waitForFunction(
      () => {
        const rats = document.querySelectorAll("[data-testid^=calendar-animal-][data-branch='0']").length;
        return rats > 0 && document.querySelectorAll(".ulune-cal-cell[data-clash]").length === rats;
      },
      null,
      { timeout: 20000 },
    );
    await page.getByTestId("timing-scope-day").click();
    await page.getByTestId("calendar-cnday").click();
    if (width < 1024) await clickDockTab(page, "reading");
    await page.waitForFunction((t) => document.querySelector("[data-testid=click-note]")?.textContent?.includes(t), w.day, { timeout: 15000 });
    const dayNote = await note(page);
    if (!/\p{Script=Han}/u.test(dayNote)) throw new Error(`${label}: the day's reading has no pillar "${dayNote.slice(0, 160)}"`);
    // Its glossary claims none of astrology's words as its own (no "In this reading", no Transit).
    await page.getByTestId("glossary").locator("summary").click();
    await page.locator("[data-testid=glossary] .ob-glossary-body").waitFor({ timeout: 10000 });
    if (await page.locator("[data-testid=glossary] .ob-glossary-h").count()) throw new Error(`${label}: the day's animal has words "in this reading"`);
    await page.getByTestId("glossary").locator("summary").click();
    await assertNoOverflow(page);
    // Back to the month and the layer off, as found.
    await page.getByTestId("timing-scope-month").click();
    await openCalendarView(page);
    await page.getByTestId("calendar-layer-animals").click();
    await page.keyboard.press("Escape");

    if (sent.length) throw new Error(`${label}: sent ${sent.join(", ")}`);
    if (!ANY_LIVE && registry.length) throw new Error(`${label}: the registry of Chinese terms was fetched before any is written: ${registry.join(", ")}`);
    if (errors.length) throw new Error(`${label}: ${errors.join(" | ")}`);
    console.log(`zodiac-time ${label} OK`);
  } finally {
    await browser.close();
  }
}

await ensureShotsDir();
const failures = [];
for (const [width, lang] of [
  [1280, "en"],
  [390, "fr"],
]) {
  try {
    await run(width, lang);
  } catch (e) {
    failures.push(String(e?.message ?? e));
  }
}
if (failures.length) {
  console.error(`ZODIAC-TIME FAIL\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("ZODIAC-TIME OK");
