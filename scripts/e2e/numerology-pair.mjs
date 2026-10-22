/*
 * Numerology's Relationship lens, two people's numbers (share and compare
 * plan, feature 5c; decision R3), at 1280 px and on a 390 px phone (a finger:
 * touch), in English and French, with two made-up charts (Fixture B, then
 * Fixture A shown), the year on the dial 2026:
 *   - reached by the language picker: Numerology › Relationship, at
 *     /numerology/pair (Alt+3 from its Natal, and ⌘K, on a computer); Sample
 *     B is the second person, as on every Relationship page;
 *   - the wheel for two: TraceQA's numbers inside the band, Sample B's
 *     outside, the 6 they share ringed, the relationship number 7 (4 + 3) in
 *     the centre; the six pairs one Tab stop, the arrows walking them, Enter
 *     opening the pair reached; the line under it saying the pair pointed at
 *     (or, on a phone, to tap);
 *   - each pair keyed by its two numbers (an 11 beside a 5, a 22 beside an
 *     8), each opening its reading: how the two tend to work together; the
 *     relationship number, the shared digit and "You two, now" (a 4 year
 *     beside a 6 year: the relationship's year a 1; a step on, 2027: a 3);
 *   - Swap: Sample B first, the same pairs and the same relationship number;
 *   - the first read in the side panel, each step opening its reading;
 *   - the chart switcher's pair button from Numerology leads here, and so do
 *     the numerology table's Bridges (its former Compare lives here);
 *   - the table: the six numbers side by side, the ten pairs, the
 *     relationship number and the shared digit, the year; Copy and CSV;
 *   - (at 1280 in English, 390 in French) the second person added from the
 *     page: back on it with them as the partner;
 *   - a finger's targets 44 px tall; nothing sent; nothing scrolls sideways;
 *     no page error.
 */
import { join } from "node:path";
import { chromium } from "playwright";
import { FIXTURE_A, FIXTURE_B, SHOTS, VIEWPORTS, assertNoOverflow, castFixture, clickDockTab, clickTestId, ensureShotsDir, gotoApp, goStudioPage, openExport, pickPlace, setLang, setView, waitStudioPage } from "./_lib.mjs";
import { watchSent } from "./_sent.mjs";

const WORDS = {
  en: {
    expression: "The 2 brings closeness and care, the 5 movement and curiosity.",
    lifepath: "The 3 imagines and the 4 builds: play meets method.",
    rel: "A relationship number 7 gives the pair a reflective tone",
    digit: "The 6: for TraceQA, Birthday and Maturity; for Sample B, Soul Urge.",
    year: "In 2026, a 4 year for TraceQA beside a 6 year for Sample B: the relationship’s year is a 1.",
    year27: "In 2027, a 5 year for TraceQA beside a 7 year for Sample B: the relationship’s year is a 3.",
    say: "Soul Urge: TraceQA 7 · Sample B 6 · gap 1",
    hint: "Point at a number to see the pair it belongs to.",
    hintTouch: "Tap a number to see the pair it belongs to.",
    first: "First read: the two of you in numbers",
    pairButton: "Relationship with Sample B (Numerology: two people)",
    copy: ["Side by side", "TraceQA · Sample B", "Life Path: 13/4 · 3 · gap 1", "The pairs", "Relationship number: 7 (4 + 3 = 7)", "You two, now"],
  },
  fr: {
    expression: "Le 2 apporte la proximité et le soin, le 5 le mouvement et la curiosité.",
    lifepath: "Le 3 imagine et le 4 construit\u202f: le jeu rencontre la méthode.",
    rel: "Un nombre de la relation 7 donne au duo un ton réfléchi",
    digit: "Le 6\u202f: chez TraceQA, Jour de naissance et Maturité\u202f; chez Sample B, Élan de l’âme.",
    year: "En 2026, une année 4 pour TraceQA à côté d’une année 6 pour Sample B\u202f: l’année de la relation est une année 1.",
    year27: "En 2027, une année 5 pour TraceQA à côté d’une année 7 pour Sample B\u202f: l’année de la relation est une année 3.",
    say: "Élan de l’âme\u202f: TraceQA 7 · Sample B 6 · écart 1",
    hint: "Pointez un nombre pour voir la paire à laquelle il appartient.",
    hintTouch: "Touchez un nombre pour voir la paire à laquelle il appartient.",
    first: "Première lecture\u202f: vous deux en nombres",
    pairButton: "Relation avec Sample B (Numérologie\u202f: deux personnes)",
    copy: ["Côte à côte", "TraceQA · Sample B", "Chemin de vie\u202f: 13/4 · 3 · écart 1", "Les paires", "Nombre de la relation\u202f: 7 (4 + 3 = 7)", "Vous deux, maintenant"],
  },
};
/** Each pair's two numbers, smaller first (lib/chart/numerology-pair.ts, pairKey): TraceQA's and Sample B's. */
const KEYS = {
  lifepath: "3-4",
  expression: "5-11",
  soulurge: "6-7",
  personality: "8-22",
  birthday: "3-6",
  maturity: "6-8",
  "su-pe": "7-8",
  "pe-su": "6-22",
  "lp-ex": "4-5",
  "ex-lp": "3-11",
};
const note = (page) => page.getByTestId("click-note").evaluate((e) => e.textContent ?? "").catch(() => "");

async function waitNote(page, text, label, what) {
  await page.waitForFunction((t) => document.querySelector("[data-testid=click-note]")?.textContent?.includes(t), text, { timeout: 8000 }).catch(async () => {
    throw new Error(`${label}: ${what} "${(await note(page)).slice(0, 300)}"`);
  });
}

/** A press as the reader makes it: a tap on a phone, a click on a computer; in view first. */
async function press(page, testId, touch) {
  const el = page.getByTestId(testId).first();
  await el.evaluate((e) => e.scrollIntoView({ block: "center" }));
  if (touch) await el.tap();
  else await el.click();
}

/** The year on the dial (the numerology pages' own), stepped to `year`. */
async function yearTo(page, year, label) {
  for (let i = 0; i < 200; i += 1) {
    const now = Number(await page.getByTestId("numerology-pair").getAttribute("data-year"));
    if (now === year) return;
    await page.getByTestId(now < year ? "numerology-pair-year-next" : "numerology-pair-year-prev").click();
    await page.waitForFunction((n) => document.querySelector("[data-testid=numerology-pair]")?.getAttribute("data-year") !== String(n), now, { timeout: 4000 });
  }
  throw new Error(`${label}: the year did not reach ${year}`);
}

/** The figure as it stands: the wheel's parts and Tab stops, the pairs' keys, the shared digits. */
const figure = (page) =>
  page.evaluate(() => {
    const root = document.querySelector("[data-testid=numerology-pair]");
    const parts = [...document.querySelectorAll("[data-testid^=numerology-pair-part-]")];
    return {
      rel: root?.getAttribute("data-rel") ?? "",
      year: root?.getAttribute("data-year") ?? "",
      parts: parts.filter((p) => p.getAttribute("role") === "button").map((p) => p.getAttribute("data-pair")),
      stops: parts.filter((p) => p.getAttribute("tabindex") === "0").map((p) => p.getAttribute("data-pair")),
      keys: Object.fromEntries([...document.querySelectorAll("[data-testid^=numerology-pair-row-]")].filter((r) => r.hasAttribute("data-key")).map((r) => [r.getAttribute("data-testid").slice(20), r.getAttribute("data-key")])),
      digits: [...document.querySelectorAll("[data-testid^=numerology-pair-digit-]")].map((d) => d.getAttribute("data-testid").slice(22)),
      sectors: [...document.querySelectorAll("[data-testid^=numerology-pair-sector-][data-shared]")].map((s) => s.getAttribute("data-testid").slice(23)),
      centre: document.querySelector("[data-testid=numerology-pair-centre]")?.textContent ?? "",
      rows: [...document.querySelectorAll("[data-testid^=numerology-pair-row-]")].length,
      say: document.querySelector("[data-testid=numerology-pair-say]")?.textContent ?? "",
      yearLine: document.querySelector("[data-testid=numerology-pair-year-line]")?.textContent ?? "",
      firstA: document.querySelector("[data-testid=numerology-pair-row-lifepath] .ulune-np-num.is-a")?.textContent ?? "",
    };
  });

async function csvOf(page) {
  const [download] = await Promise.all([page.waitForEvent("download", { timeout: 8000 }), openExport(page).then(() => page.getByTestId("table-csv").click())]);
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  if (!text.startsWith("﻿")) throw new Error("CSV without its byte-order mark");
  return text.slice(1).replace(/\r\n/g, "\n");
}

async function run(width, lang) {
  const touch = width < 1024;
  const label = `${width} ${lang}${touch ? " touch" : ""}`;
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const context = await browser.newContext({ viewport: VIEWPORTS[width], hasTouch: touch, isMobile: touch });
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const w = WORDS[lang];
  const reading = async () => {
    if (touch) await clickDockTab(page, "reading");
  };
  const back = async () => {
    if (touch) await clickDockTab(page, "reading").catch(() => {});
  };
  const blur = () => page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : null));
  try {
    await gotoApp(page);
    if (lang === "fr") await setLang(page, "fr");
    await castFixture(page, FIXTURE_B);
    await castFixture(page, FIXTURE_A);
    // Nothing but the app's own files, by GET, from here (_sent.mjs).
    const sent = watchSent(page);

    // ── The picker: Numerology, then its Relationship lens ──
    await page.getByTestId("lang-button").click();
    await page.getByTestId("lang-card-numerology").click();
    await page.waitForFunction(() => document.querySelector("[data-testid=lang-button]")?.getAttribute("data-language") === "numerology", null, { timeout: 8000 });
    await page.getByTestId("lens-relationship").waitFor({ state: "attached", timeout: 8000 });
    await clickTestId(page, "lens-relationship");
    await waitStudioPage(page, "numerology-pair");
    await page.getByTestId("numerology-pair").waitFor({ timeout: 20000 });
    if (new URL(page.url()).pathname !== "/numerology/pair") throw new Error(`${label}: at ${page.url()}`);
    if (!touch) {
      // Alt+1 its Natal, Alt+3 back here; ⌘K finds the lens by the language's name and the lens's.
      await blur();
      await page.keyboard.press("Alt+1");
      await waitStudioPage(page, "numerology");
      await blur();
      await page.keyboard.press("Alt+3");
      await waitStudioPage(page, "numerology-pair");
      await page.keyboard.press("Control+k");
      await page.getByTestId("command-palette").waitFor({ timeout: 8000 });
      await page.locator("[data-testid=command-palette] input").fill(lang === "fr" ? "numérologie relation" : "numerology relationship");
      await page.waitForTimeout(150);
      const lenses = await page.locator("[data-testid^='cmd-lens:']").evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")));
      if (!lenses.includes("cmd-lens:numerology:relationship")) throw new Error(`${label}: ⌘K lists the lenses ${JSON.stringify(lenses)}`);
      await page.keyboard.press("Escape");
      await page.getByTestId("command-palette").waitFor({ state: "detached", timeout: 4000 }).catch(() => {});
    }
    // The second person: synastry's, as on every Relationship page.
    const second = await page.getByTestId("numerology-pair-person-b").evaluate((s) => s.options[s.selectedIndex]?.textContent ?? "");
    if (second !== FIXTURE_B.name) throw new Error(`${label}: the second person is "${second}"`);
    await yearTo(page, 2026, label);

    // ── The wheel for two, the pairs, the shared digit, the year ──
    let f = await figure(page);
    if (f.rel !== "7" || !f.centre.includes("7")) throw new Error(`${label}: the relationship number ${f.rel} (${f.centre})`);
    if (f.parts.join() !== "lifepath,expression,soulurge,personality,birthday,maturity" || f.stops.length !== 1) throw new Error(`${label}: the wheel's parts ${JSON.stringify(f.parts)}, stops ${f.stops}`);
    if (JSON.stringify(f.keys) !== JSON.stringify(KEYS)) throw new Error(`${label}: the pairs ${JSON.stringify(f.keys)}`);
    if (f.digits.join() !== "6" || f.sectors.join() !== "6") throw new Error(`${label}: the shared digits ${f.digits} (sectors ${f.sectors})`);
    if (!f.yearLine.includes(w.year)) throw new Error(`${label}: the year "${f.yearLine}"`);
    if (touch && f.say !== w.hintTouch) throw new Error(`${label}: the line under the wheel says "${f.say}" to a finger`);
    if (!touch) {
      if (f.say !== w.hint) throw new Error(`${label}: the line under the wheel says "${f.say}"`);
      // Pointing at a pair says it; leaving, the hint comes back.
      await page.locator("[data-testid=numerology-pair-part-soulurge] .ulune-np-disc.is-a .ulune-np-disc-face").hover();
      await page.waitForFunction((t) => document.querySelector("[data-testid=numerology-pair-say]")?.textContent === t, w.say, { timeout: 4000 }).catch(async () => {
        throw new Error(`${label}: pointing at the Soul Urges says "${(await figure(page)).say}"`);
      });
      await page.mouse.move(2, 2);
      await page.waitForFunction((t) => document.querySelector("[data-testid=numerology-pair-say]")?.textContent === t, w.hint, { timeout: 4000 });
    }
    await assertNoOverflow(page);
    await page.screenshot({ path: join(SHOTS, `numerology-pair-${lang}-${width}.png`) }).catch(() => {});

    // A pair's reading, the relationship number's, the year's.
    await press(page, "numerology-pair-row-expression", touch);
    await reading();
    await waitNote(page, w.expression, label, "the Expressions' reading");
    await back();
    await press(page, "numerology-pair-rel", touch);
    await reading();
    await waitNote(page, w.rel, label, "the relationship number's reading");
    await back();
    await press(page, "numerology-pair-year-line", touch);
    await reading();
    await waitNote(page, w.year, label, "the year's reading");
    await back();

    // ── The keyboard: one Tab stop, the arrows walk the pairs, Enter opens the pair reached ──
    if (!touch) {
      await page.getByTestId("numerology-pair-part-lifepath").focus();
      await page.keyboard.press("ArrowRight");
      const at = await page.evaluate(() => document.activeElement?.getAttribute("data-testid"));
      if (at !== "numerology-pair-part-expression") throw new Error(`${label}: the arrow went to ${at}`);
      await page.keyboard.press("Enter");
      await waitNote(page, w.expression, label, "the Expressions by keyboard");
      if ((await page.getByTestId("numerology-pair-part-expression").getAttribute("aria-pressed")) !== "true") throw new Error(`${label}: Enter did not choose the Expressions`);
      await page.keyboard.press("End");
      if ((await page.evaluate(() => document.activeElement?.getAttribute("data-testid"))) !== "numerology-pair-part-maturity") throw new Error(`${label}: End`);
      await page.keyboard.press("Home");
      await page.keyboard.press("Enter");
      await waitNote(page, w.lifepath, label, "the Life Paths by keyboard");
    }

    // ── The year a step on: 2027, a 5 year beside a 7 year, the relationship's year a 3 ──
    await press(page, "numerology-pair-year-next", touch);
    await page.waitForFunction(() => document.querySelector("[data-testid=numerology-pair]")?.getAttribute("data-year") === "2027", null, { timeout: 4000 });
    f = await figure(page);
    if (!f.yearLine.includes(w.year27)) throw new Error(`${label}: 2027 "${f.yearLine}"`);
    await press(page, "numerology-pair-year-prev", touch);
    await page.waitForFunction(() => document.querySelector("[data-testid=numerology-pair]")?.getAttribute("data-year") === "2026", null, { timeout: 4000 });

    // ── Swap: Sample B first, the same pairs, the same relationship number ──
    await press(page, "numerology-pair-swap", touch);
    // (Each number says whose it is to a screen reader: "Sample B: 3".)
    const firstNumber = (n) => page.waitForFunction((x) => document.querySelector("[data-testid=numerology-pair-row-lifepath] .ulune-np-num.is-a")?.textContent?.trim().split(/\s/).pop() === x, n, { timeout: 6000 });
    await firstNumber("3").catch(async () => {
      throw new Error(`${label}: swapped, Sample B's Life Path shows "${(await figure(page)).firstA}"`);
    });
    f = await figure(page);
    // The same six pairs; the crossed ones cross the other way (Sample B's Soul Urge with TraceQA's Personality: a 6 and a 22/4).
    const swapped = { ...KEYS, "su-pe": "6-22", "pe-su": "7-8", "lp-ex": "3-11", "ex-lp": "4-5" };
    if (f.rel !== "7" || JSON.stringify(f.keys) !== JSON.stringify(swapped)) throw new Error(`${label}: swapped ${JSON.stringify(f)}`);
    await press(page, "numerology-pair-swap", touch);
    await firstNumber("13/4");

    if (touch) {
      // A finger's targets: the rows, the cards, the digit, the year's steps.
      const small = await page.evaluate(() =>
        [...document.querySelectorAll("[data-testid^=numerology-pair-row-], [data-testid=numerology-pair-rel], [data-testid^=numerology-pair-digit-], [data-testid=numerology-pair-year-line], [data-testid^=numerology-pair-year-]")]
          .map((b) => [b.getAttribute("data-testid"), Math.round(b.getBoundingClientRect().height), Math.round(b.getBoundingClientRect().width)])
          .filter(([, h, wd]) => h < 44 || wd < 44),
      );
      if (small.length) throw new Error(`${label}: under 44 px for a finger ${JSON.stringify(small)}`);
      // The wheel on top, the rest under it.
      const order = await page.evaluate(() => {
        const wheel = document.querySelector("[data-testid=numerology-pair-wheel]").getBoundingClientRect();
        const rel = document.querySelector("[data-testid=numerology-pair-rel]").getBoundingClientRect();
        return { wheelW: Math.round(wheel.width), below: rel.top >= wheel.bottom - 1 };
      });
      if (!order.below || order.wheelW < 300) throw new Error(`${label}: the phone's layout ${JSON.stringify(order)}`);
    }

    // ── The first read: nothing chosen ──
    await page.keyboard.press("Escape").catch(() => {});
    await blur();
    await page.waitForFunction(() => !document.querySelector("[data-testid=click-note]"), null, { timeout: 4000 }).catch(() => {});
    if (touch) await clickDockTab(page, "reading");
    await page.getByTestId("numerology-pair-hello").waitFor({ timeout: 8000 });
    const hello = await page.getByTestId("numerology-pair-hello").evaluate((e) => ({
      text: e.textContent ?? "",
      steps: [...e.querySelectorAll("[data-testid^=numerology-pair-hello-]")].map((s) => s.getAttribute("data-testid").slice(22)),
    }));
    if (hello.steps.join() !== "rel,lifepath,soulurge,shared,year") throw new Error(`${label}: the first read's steps ${hello.steps}`);
    if (!hello.text.includes(w.first) || !hello.text.includes(w.lifepath)) throw new Error(`${label}: the first read "${hello.text.slice(0, 300)}"`);
    await press(page, "numerology-pair-hello-shared", touch);
    await reading();
    await waitNote(page, w.digit, label, "the first read's shared digit");
    await back();

    // ── The switcher's pair button: from Numerology, Numerology's own Relationship page ──
    await page.keyboard.press("Escape").catch(() => {});
    await goStudioPage(page, "numerology");
    await page.getByTestId("chart-chip").click();
    const pairButton = page.locator(`[data-testid=chart-row][data-name="${FIXTURE_B.name}"] [data-testid=chart-pair]`);
    const pairSays = await pairButton.getAttribute("aria-label");
    if (pairSays !== w.pairButton) throw new Error(`${label}: the pair button says "${pairSays}"`);
    await pairButton.click();
    await page.getByTestId("numerology-pair").waitFor({ timeout: 20000 });
    if (new URL(page.url()).pathname !== "/numerology/pair") throw new Error(`${label}: the pair button led to ${page.url()}`);

    // ── The numerology table's Bridges lead here (its former Compare) ──
    await goStudioPage(page, "numerology");
    await setView(page, "table");
    await press(page, "numerology-pair-link", touch);
    await waitStudioPage(page, "numerology-pair");

    // ── The table: the six numbers, the ten pairs, the relationship number and the digit, the year; Copy and CSV ──
    await setView(page, "table");
    await page.getByTestId("numerology-pair-table").waitFor({ timeout: 10000 });
    const table = await page.evaluate(() => ({
      side: document.querySelectorAll("[data-testid^=numerology-pair-side-]").length,
      dyn: document.querySelectorAll("[data-testid^=numerology-pair-dyn-]").length,
      rel: document.querySelector("[data-testid=numerology-pair-row-rel]")?.textContent ?? "",
      digits: [...document.querySelectorAll("[data-testid^=numerology-pair-row-digit-]")].map((r) => r.getAttribute("data-testid").slice(26)),
      year: document.querySelector("[data-testid=numerology-pair-row-year]")?.textContent ?? "",
    }));
    if (table.side !== 6 || table.dyn !== 10 || !table.rel.includes("4 + 3 = 7") || table.digits.join() !== "6" || !/^2026/.test(table.year)) throw new Error(`${label}: the table ${JSON.stringify(table)}`);
    await assertNoOverflow(page);
    await page.screenshot({ path: join(SHOTS, `numerology-pair-table-${lang}-${width}.png`) }).catch(() => {});
    const csv = await csvOf(page);
    const sep = lang === "fr" ? ";" : ",";
    for (const row of [["pair", "relationship", "7"], ["core", "lifepath", "4", "3", "1"], ["dyn", "expression", "expression", "11", "expression", "5", "5-11", "2-5", "3"], ["digit", "6", "birthday|maturity", "soulurge"], ["year", "2026", "4", "6", "1"]]) {
      if (!csv.split("\n").includes(row.join(sep))) throw new Error(`${label}: the CSV lacks ${row.join(sep)}\n${csv.slice(0, 400)}`);
    }
    await openExport(page);
    await page.getByTestId("table-copy").click();
    await page.waitForTimeout(300);
    const copied = await page.evaluate(() => navigator.clipboard.readText()).catch(() => "");
    for (const line of w.copy) if (!copied.includes(line)) throw new Error(`${label}: Copy lacks "${line}" in "${copied.slice(0, 300)}"`);
    await page.keyboard.press("Escape").catch(() => {});
    // A row opens its reading.
    await page.getByTestId("numerology-pair-dyn-expression").locator("button").click();
    await reading();
    await waitNote(page, w.expression, label, "a row of the table");
    await back();
    await setView(page, "wheel");

    if (sent.length) throw new Error(`${label}: sent ${sent.join(", ")}`);
    if (errors.length) throw new Error(`${label}: ${errors.join(" | ")}`);
    console.log(`numerology-pair ${label} OK`);
  } finally {
    await browser.close();
  }
}

/** The second person added from the page itself: the cast comes back to Numerology's Relationship with that person as the partner. */
async function addFromPage(width, lang) {
  const touch = width < 1024;
  const label = `${width} ${lang} adding`;
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const context = await browser.newContext({ viewport: VIEWPORTS[width], hasTouch: touch, isMobile: touch });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  try {
    await gotoApp(page);
    if (lang === "fr") await setLang(page, "fr");
    await castFixture(page, FIXTURE_A);
    await goStudioPage(page, "numerology-pair");
    await page.getByTestId("numerology-pair-need-second").waitFor({ timeout: 20000 });
    await press(page, "numerology-pair-add-second-wheel", touch);
    await page.locator("#birth-date").waitFor({ timeout: 8000 });
    await page.locator("#native-name").fill(FIXTURE_B.name);
    await page.locator("#birth-date").fill(FIXTURE_B.date);
    await page.locator("#birth-time").fill(FIXTURE_B.time);
    await pickPlace(page, FIXTURE_B.place);
    await page.getByTestId("cast-submit").click();
    await page.getByTestId("numerology-pair").waitFor({ timeout: 45000 });
    if (new URL(page.url()).pathname !== "/numerology/pair") throw new Error(`${label}: back at ${page.url()}`);
    const second = await page.getByTestId("numerology-pair-person-b").evaluate((s) => s.options[s.selectedIndex]?.textContent ?? "");
    if (second !== FIXTURE_B.name) throw new Error(`${label}: the second person is "${second}"`);
    const rel = await page.getByTestId("numerology-pair").getAttribute("data-rel");
    if (rel !== "7") throw new Error(`${label}: the relationship number ${rel}`);
    await assertNoOverflow(page);
    if (errors.length) throw new Error(`${label}: ${errors.join(" | ")}`);
    console.log(`numerology-pair ${label} OK`);
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
for (const [width, lang] of [
  [1280, "en"],
  [390, "fr"],
]) {
  try {
    await addFromPage(width, lang);
  } catch (e) {
    failures.push(String(e?.message ?? e));
  }
}
if (failures.length) {
  console.error(`NUMEROLOGY-PAIR FAIL\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("NUMEROLOGY-PAIR OK");
