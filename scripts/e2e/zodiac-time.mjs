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
 *   - the Calendar's "The day's animal" layer: each day of the month drawn,
 *     the clash days (the Rat's, against a Horse year animal) marked; the
 *     day view's animal opening its reading, whose glossary claims none of
 *     astrology's words;
 *   - nothing sent while Cycles and Pair work; nothing scrolls sideways; the
 *     registry of Chinese terms never fetched, since the encyclopedia has no
 *     Chinese page yet (part 29).
 */
import { FIXTURE_A, FIXTURE_B, assertNoOverflow, castFixture, clickDockTab, ensureShotsDir, gotoApp, goStudioPage, launch, openCalendarView, setLang, setView, SHOTS } from "./_lib.mjs";
import { join } from "node:path";

const WORDS = {
  en: { fireHorse: "Yang Fire Horse", goat: "Yin Fire Goat", own: "Own year", harmony: "Harmony", ratMonth: "The Rat month", destruction: "Destruction", clash: "Clash", pairText: "One of the six destructions", day: "Day of the" },
  fr: { fireHorse: "Cheval de Feu yang", goat: "Chèvre de Feu yin", own: "Année propre", harmony: "Harmonie", ratMonth: "Le mois du Rat", destruction: "Destruction", clash: "Choc", pairText: "Une des six destructions", day: "Jour " },
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
    const sent = [];
    let watching = true;
    // The registry of Chinese terms and its links wait for the encyclopedia's Chinese pages (part 29): never fetched before.
    const registry = [];
    page.on("request", (r) => {
      const u = new URL(r.url());
      if (/chinese\/term-ids|ChineseTermLink|ChineseReadingTerms/.test(u.pathname)) registry.push(u.pathname);
      if (!watching) return;
      if (r.method() !== "GET" || /_serverFn|\/api\//.test(u.pathname)) sent.push(`${r.method()} ${u.pathname}`);
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
    await assertNoOverflow(page);
    await page.screenshot({ path: join(SHOTS, `zodiac-pair-${lang}-${width}.png`) }).catch(() => {});
    await setView(page, "table");
    await page.getByTestId("zodiac-pair-table").waitFor({ timeout: 10000 });
    const prow = await page.locator("[data-testid^=zodiac-pair-row-]").count();
    if (prow !== 9) throw new Error(`${label}: ${prow} meetings in the table`);
    await setView(page, "wheel");

    // ── The Calendar: the day's animal (the sky it shows comes from the server, as always) ──
    watching = false;
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
    if (registry.length) throw new Error(`${label}: the registry of Chinese terms was fetched before any is written: ${registry.join(", ")}`);
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
