/*
 * Feng Shui's Cycles, your directions through the years (share and compare
 * plan, feature 5d; decision R4), at 1280 px and on a 390 px phone (a
 * finger: touch), in English and French, with a made-up chart (Fixture A,
 * no yin or yang count, so both Kua: 1 by the yang count, 8 by the yin), the
 * dial on October 2026 (the year's 1 White, the month's 9 Purple):
 *   - reached by the language picker: Feng Shui › Cycles, at
 *     /feng-shui/cycles (Alt+2 from its Natal, on a computer);
 *   - two roses, one per count: each direction's year star and month star,
 *     what the year makes of it (Kua 1: the south-east and the east
 *     strengthened, the south and the north resting; Kua 8: the north-east
 *     strengthened, the north-west resting), the 5 Yellow and the Grand Duke
 *     in the south, the Year Breaker and the Three Killings in the north, on
 *     the rim; one Tab stop each, the arrows walking round, Enter opening the
 *     direction reached;
 *   - the readings: a direction, an affliction (the Three Killings: face
 *     them rather than sit with your back to them), the year in practice,
 *     the month;
 *   - the dials: a year on (2027: the 9 Purple, the 5 Yellow in the north,
 *     the Three Killings in the west) and back; a month on and back;
 *   - the first read in the side panel; the table (Copy, CSV);
 *   - the way to the Calendar's flying stars: the layer on, the Calendar
 *     open;
 *   - without a chart (1280 in English, 390 in French): the year's rose
 *     alone, its first read, and the birth form from the page, which comes
 *     back here with both Kua;
 *   - a finger's targets 44 px tall; nothing sent; nothing scrolls sideways;
 *     no page error.
 */
import { join } from "node:path";
import { chromium } from "playwright";
import { FIXTURE_A, SHOTS, VIEWPORTS, assertNoOverflow, castFixture, clickDockTab, clickTestId, ensureShotsDir, gotoApp, openExport, pickPlace, setLang, setView, waitStudioPage } from "./_lib.mjs";
import { watchSent } from "./_sent.mjs";

const WORDS = {
  en: {
    se: "In 2026, the year’s 9 Purple visits the south-east, your Growth direction.",
    s: "In 2026, the year’s 5 Yellow visits the south, your Harmony direction.",
    killings: "the classics suggest facing them rather than sitting with your back to them",
    you: "Face the south-east (Growth) for what you begin this year.",
    month: "From 8 October to 7 November, the month’s star in the centre is the 9 Purple. Its 5 Yellow visits the north.",
    skyN: "In 2026, the year’s 6 White visits the north.",
    first: "First read: your directions this year",
    calendar: "/calendar",
    copy: ["The year and the month", "The Three Killings: North", "The eight directions", "Yin count: Face the north-east (Stability) for what you begin this year."],
  },
  fr: {
    se: "En 2026, le 9 Pourpre de l’année visite le sud-est, votre direction de Croissance.",
    s: "En 2026, le 5 Jaune de l’année visite le sud, votre direction d’Harmonie.",
    killings: "les classiques suggèrent de leur faire face plutôt que de leur tourner le dos",
    you: "Tournez-vous vers le sud-est (Croissance) pour ce que vous commencez cette année.",
    month: "Du 8 octobre au 7 novembre, l’étoile du mois au centre est le 9 Pourpre. Son 5 Jaune visite le nord.",
    skyN: "En 2026, le 6 Blanc de l’année visite le nord.",
    first: "Première lecture\u202f: vos directions cette année",
    calendar: "/calendrier",
    copy: ["L’année et le mois", "Les Trois Sha\u202f: Nord", "Les huit directions", "Compte yin\u202f: Tournez-vous vers le nord-est (Stabilité) pour ce que vous commencez cette année."],
  },
};
/** October 2026 over the eight directions (fengshui-cycles.ts, checked by scripts/chinese-fengshui-cycles.test.mjs). */
const STARS = "n:6/5,ne:4/3,e:8/7,se:9/8,s:5/4,sw:7/6,w:3/2,nw:2/1";
const MARKS = "n:year-breaker three-killings,s:five-yellow tai-sui";
const STATES = {
  yang: "n:rest,ne:steady,e:strengthened,se:strengthened,s:rest,sw:steady,w:steady,nw:rest",
  yin: "n:rest,ne:strengthened,e:steady,se:steady,s:rest,sw:steady,w:steady,nw:rest",
  sky: "n:rest,ne:steady,e:steady,se:steady,s:rest,sw:steady,w:steady,nw:rest",
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

const rootAttr = (page, name) => page.getByTestId("fengshui-cycles").getAttribute(name);

/** The dial on a year and a solar month (0 the Tiger month, 8 the Dog month, from Hanlu in October). */
async function dialTo(page, year, month, touch, label) {
  for (let i = 0; i < 400; i += 1) {
    const [y, m] = [Number(await rootAttr(page, "data-year")), Number(await rootAttr(page, "data-month"))];
    if (y === year && m === month) return;
    const id = y !== year ? (y < year ? "fengshui-cycles-next" : "fengshui-cycles-prev") : m < month ? "fengshui-cycles-month-next" : "fengshui-cycles-month-prev";
    await press(page, id, touch);
    await page.waitForFunction(([a, b]) => {
      const r = document.querySelector("[data-testid=fengshui-cycles]");
      return r?.getAttribute("data-year") !== String(a) || r?.getAttribute("data-month") !== String(b);
    }, [y, m], { timeout: 4000 });
  }
  throw new Error(`${label}: the dial did not reach ${year}/${month}`);
}

/** The roses as they stand: each wedge's stars, marks and state, the Tab stops, the marks on the rim. */
const roses = (page) =>
  page.evaluate(() => {
    const out = {};
    for (const svg of document.querySelectorAll("[data-testid^=fengshui-cycles-rose-]")) {
      const id = svg.getAttribute("data-testid").slice(21);
      const wedges = [...svg.querySelectorAll("[data-testid^=fengshui-cycles-wedge-]")];
      out[id] = {
        n: wedges.length,
        stars: wedges.map((w) => `${w.getAttribute("data-dir")}:${w.getAttribute("data-year-star")}/${w.getAttribute("data-month-star")}`).join(),
        marks: wedges.filter((w) => w.getAttribute("data-marks")).map((w) => `${w.getAttribute("data-dir")}:${w.getAttribute("data-marks")}`).join(),
        states: wedges.map((w) => `${w.getAttribute("data-dir")}:${w.getAttribute("data-state")}`).join(),
        stops: wedges.filter((w) => w.getAttribute("tabindex") === "0").map((w) => w.getAttribute("data-dir")),
        rim: [...svg.querySelectorAll("[data-mark]")].map((m) => m.getAttribute("data-mark")).sort().join(),
        named: (svg.getAttribute("aria-label") ?? "").length > 4 && svg.getAttribute("role") === "group",
      };
    }
    return out;
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

async function open(width) {
  const touch = width < 1024;
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const context = await browser.newContext({ viewport: VIEWPORTS[width], hasTouch: touch, isMobile: touch });
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  return { browser, page, errors, touch };
}

async function run(width, lang) {
  const { browser, page, errors, touch } = await open(width);
  const label = `${width} ${lang}${touch ? " touch" : ""}`;
  const w = WORDS[lang];
  const reading = async () => {
    if (touch) await clickDockTab(page, "reading");
  };
  const back = async () => {
    if (touch) await clickDockTab(page, "reading").catch(() => {});
  };
  const blur = () => page.evaluate(() => (document.activeElement && "blur" in document.activeElement ? document.activeElement.blur() : null));
  try {
    await gotoApp(page);
    if (lang === "fr") await setLang(page, "fr");
    await castFixture(page, FIXTURE_A);
    // Nothing but the app's own files, by GET, from here (_sent.mjs).
    const sent = watchSent(page);

    // ── The picker: Feng Shui, then its Cycles lens ──
    await page.getByTestId("lang-button").click();
    await page.getByTestId("lang-card-feng-shui").click();
    await page.waitForFunction(() => document.querySelector("[data-testid=lang-button]")?.getAttribute("data-language") === "feng-shui", null, { timeout: 8000 });
    await page.getByTestId("lens-cycles").waitFor({ state: "attached", timeout: 8000 });
    await clickTestId(page, "lens-cycles");
    await waitStudioPage(page, "fengshui-cycles");
    await page.getByTestId("fengshui-cycles").waitFor({ timeout: 20000 });
    if (new URL(page.url()).pathname !== "/feng-shui/cycles") throw new Error(`${label}: at ${page.url()}`);
    if (!touch) {
      await blur();
      await page.keyboard.press("Alt+1");
      await waitStudioPage(page, "fengshui");
      await blur();
      await page.keyboard.press("Alt+2");
      await waitStudioPage(page, "fengshui-cycles");
      await page.getByTestId("fengshui-cycles").waitFor({ timeout: 20000 });
    }
    await dialTo(page, 2026, 8, touch, label);

    // ── Two roses, one per count: the stars, what falls where, what the year makes of each direction ──
    const r = await roses(page);
    if (Object.keys(r).sort().join() !== "yang,yin") throw new Error(`${label}: the roses ${Object.keys(r)}`);
    for (const count of ["yang", "yin"]) {
      const x = r[count];
      if (x.n !== 8 || x.stars !== STARS || x.marks !== MARKS || !x.named) throw new Error(`${label}: the ${count} rose ${JSON.stringify(x)}`);
      if (x.states !== STATES[count]) throw new Error(`${label}: the ${count} count's states ${x.states}`);
      if (x.rim !== "tai-sui,three-killings,year-breaker") throw new Error(`${label}: the rim's marks ${x.rim}`);
    }
    if (r.yang.stops.join() !== "se" || r.yin.stops.join() !== "ne") throw new Error(`${label}: the Tab stops ${r.yang.stops} and ${r.yin.stops} (each count's direction to face)`);
    const quiet = await page.getByTestId("fengshui-cycles-quiet").evaluate((e) => ["five", "tai-sui", "breaker", "killings"].map((k) => e.getAttribute(`data-${k}`)).join());
    if (quiet !== "s,wu,zi,n") throw new Error(`${label}: where the year asks for quiet ${quiet}`);
    const monthLine = (await page.getByTestId("fengshui-cycles-month").textContent()) ?? "";
    if (!monthLine.includes(w.month)) throw new Error(`${label}: the month "${monthLine}"`);
    const best = await page.evaluate(() => ["yang", "yin"].map((c) => `${document.querySelector(`[data-testid=fengshui-cycles-count-${c}]`)?.getAttribute("data-best")}|${document.querySelector(`[data-testid=fengshui-cycles-count-${c}]`)?.getAttribute("data-resting")}`));
    if (best.join() !== "se|s n,ne|nw") throw new Error(`${label}: the directions to face and to rest ${best}`);
    if (!(await page.getByTestId("fengshui-cycles-both-note").isVisible())) throw new Error(`${label}: no word on the two counts`);
    await assertNoOverflow(page);
    await page.screenshot({ path: join(SHOTS, `fengshui-cycles-${lang}-${width}.png`) }).catch(() => {});

    // ── The readings: a direction, an affliction, the year in practice, the month ──
    await press(page, "fengshui-cycles-wedge-yang-se", touch);
    await reading();
    await waitNote(page, w.se, label, "the south-east's reading");
    await back();
    await press(page, "fengshui-cycles-aff-three-killings", touch);
    await reading();
    await waitNote(page, w.killings, label, "the Three Killings' reading");
    await back();
    await press(page, "fengshui-cycles-you-yang", touch);
    await reading();
    await waitNote(page, w.you, label, "the year in practice");
    await back();
    await press(page, "fengshui-cycles-month", touch);
    await reading();
    await waitNote(page, w.month.split(/(?<=\.) /)[0], label, "the month's reading");
    await back();

    // ── The keyboard: one Tab stop a rose, the arrows walk round it, Enter opens the direction reached ──
    if (!touch) {
      await page.keyboard.press("Escape").catch(() => {});
      await page.getByTestId("fengshui-cycles-wedge-yang-se").focus();
      await page.keyboard.press("ArrowRight");
      const at = await page.evaluate(() => document.activeElement?.getAttribute("data-testid"));
      if (at !== "fengshui-cycles-wedge-yang-s") throw new Error(`${label}: the arrow went to ${at}`);
      await page.keyboard.press("Enter");
      await waitNote(page, w.s, label, "the south by keyboard");
      if ((await page.getByTestId("fengshui-cycles-wedge-yang-s").getAttribute("aria-pressed")) !== "true") throw new Error(`${label}: Enter did not choose the south`);
    }

    // ── The dials: a year on (2027: the 9 Purple, the 5 Yellow north, the Three Killings west), back; a month on, back ──
    await press(page, "fengshui-cycles-next", touch);
    await page.waitForFunction(() => document.querySelector("[data-testid=fengshui-cycles]")?.getAttribute("data-year") === "2027", null, { timeout: 4000 });
    const y27 = await page.evaluate(() => {
      const q = document.querySelector("[data-testid=fengshui-cycles-quiet]");
      return `${document.querySelector("[data-testid=fengshui-cycles]")?.getAttribute("data-star")}|${q?.getAttribute("data-five")}|${q?.getAttribute("data-killings")}`;
    });
    if (y27 !== "9|n|w") throw new Error(`${label}: 2027 ${y27}`);
    await press(page, "fengshui-cycles-prev", touch);
    await page.waitForFunction(() => document.querySelector("[data-testid=fengshui-cycles]")?.getAttribute("data-year") === "2026", null, { timeout: 4000 });
    await press(page, "fengshui-cycles-month-next", touch);
    await page.waitForFunction(() => document.querySelector("[data-testid=fengshui-cycles]")?.getAttribute("data-month-star") === "8", null, { timeout: 4000 });
    await press(page, "fengshui-cycles-month-prev", touch);
    await page.waitForFunction(() => document.querySelector("[data-testid=fengshui-cycles]")?.getAttribute("data-month-star") === "9", null, { timeout: 4000 });

    if (touch) {
      // A finger's targets: the rows, the cards, the month's steps and line, the Calendar's way.
      const small = await page.evaluate(() =>
        [...document.querySelectorAll("[data-testid^=fengshui-cycles-dir-], [data-testid^=fengshui-cycles-you-], [data-testid^=fengshui-cycles-aff-], [data-testid=fengshui-cycles-month], [data-testid^=fengshui-cycles-month-], [data-testid=fengshui-cycles-year], [data-testid=fengshui-cycles-calendar]")]
          .filter((b) => b.getClientRects().length)
          .map((b) => [b.getAttribute("data-testid"), Math.round(b.getBoundingClientRect().height), Math.round(b.getBoundingClientRect().width)])
          .filter(([, h, wd]) => h < 44 || wd < 44),
      );
      if (small.length) throw new Error(`${label}: under 44 px for a finger ${JSON.stringify(small)}`);
      // The roses one under the other, each over its lists.
      const order = await page.evaluate(() => {
        const rose = document.querySelector("[data-testid=fengshui-cycles-rose-yang]").getBoundingClientRect();
        const you = document.querySelector("[data-testid=fengshui-cycles-you-yang]").getBoundingClientRect();
        const yin = document.querySelector("[data-testid=fengshui-cycles-rose-yin]").getBoundingClientRect();
        return { roseW: Math.round(rose.width), below: you.top >= rose.bottom - 1, yinBelow: yin.top >= you.bottom - 1 };
      });
      if (!order.below || !order.yinBelow || order.roseW < 300) throw new Error(`${label}: the phone's layout ${JSON.stringify(order)}`);
    }

    // ── The first read: nothing chosen ──
    await page.keyboard.press("Escape").catch(() => {});
    await blur();
    await page.waitForFunction(() => !document.querySelector("[data-testid=click-note]"), null, { timeout: 4000 }).catch(() => {});
    if (touch) await clickDockTab(page, "reading");
    await page.getByTestId("fengshui-cycles-hello").waitFor({ timeout: 8000 });
    const hello = await page.getByTestId("fengshui-cycles-hello").evaluate((e) => ({
      text: e.textContent ?? "",
      steps: [...e.querySelectorAll("[data-testid^=fengshui-cycles-hello-]")].map((s) => s.getAttribute("data-testid").slice(22)),
    }));
    if (hello.steps.join() !== "year,best-yang,rest-yang,best-yin,rest-yin,month") throw new Error(`${label}: the first read's steps ${hello.steps}`);
    if (!hello.text.includes(w.first) || !hello.text.includes(w.you)) throw new Error(`${label}: the first read "${hello.text.slice(0, 300)}"`);
    await press(page, "fengshui-cycles-hello-best-yang", touch);
    await reading();
    await waitNote(page, w.se, label, "the first read's direction to face");
    await back();
    await page.keyboard.press("Escape").catch(() => {});

    // ── The table: the year and the month, the eight directions, for you; Copy and CSV ──
    await setView(page, "table");
    await page.getByTestId("fengshui-cycles-table").waitFor({ timeout: 10000 });
    const table = await page.evaluate(() => ({
      aff: document.querySelectorAll("[data-testid^=fengshui-cycles-row-aff-]").length,
      dirs: document.querySelectorAll("[data-testid^=fengshui-cycles-row-dir-]").length,
      you: document.querySelectorAll("[data-testid^=fengshui-cycles-row-you-]").length,
      year: Boolean(document.querySelector("[data-testid=fengshui-cycles-row-year]")),
    }));
    if (table.aff !== 4 || table.dirs !== 8 || table.you < 4 || !table.year) throw new Error(`${label}: the table ${JSON.stringify(table)}`);
    await assertNoOverflow(page);
    await page.screenshot({ path: join(SHOTS, `fengshui-cycles-table-${lang}-${width}.png`) }).catch(() => {});
    const csv = await csvOf(page);
    const sep = lang === "fr" ? ";" : ",";
    for (const row of [["year", "solarYear", "2026"], ["year", "monthStar", "9"], ["aff", "five-yellow", "s"], ["aff", "three-killings", "n"], ["dir", "n", "6", "5", "year-breaker|three-killings", "1"], ["you", "yang", "se", "sheng-qi", "1", "strengthened"], ["best", "yin", "8", "ne", "nw"]]) {
      if (!csv.split("\n").includes(row.join(sep))) throw new Error(`${label}: the CSV lacks ${row.join(sep)}\n${csv.slice(0, 400)}`);
    }
    await openExport(page);
    await page.getByTestId("table-copy").click();
    await page.waitForTimeout(300);
    const copied = await page.evaluate(() => navigator.clipboard.readText()).catch(() => "");
    for (const line of w.copy) if (!copied.includes(line)) throw new Error(`${label}: Copy lacks "${line}" in "${copied.slice(0, 300)}"`);
    await page.keyboard.press("Escape").catch(() => {});
    await setView(page, "wheel");

    // ── The way to the Calendar's flying stars: the layer on, the Calendar open ──
    await page.getByTestId("fengshui-cycles").waitFor({ timeout: 10000 });
    await press(page, "fengshui-cycles-calendar", touch);
    await waitStudioPage(page, "timing");
    if (new URL(page.url()).pathname !== w.calendar) throw new Error(`${label}: the Calendar at ${page.url()}`);
    const layers = await page.evaluate(() => JSON.parse(localStorage.getItem("ulune.calendar.v1") ?? "{}").layers ?? {});
    if (layers.stars !== true) throw new Error(`${label}: the flying stars' layer ${JSON.stringify(layers)}`);

    if (sent.length) throw new Error(`${label}: sent ${sent.join(", ")}`);
    if (errors.length) throw new Error(`${label}: ${errors.join(" | ")}`);
    console.log(`fengshui-cycles ${label} OK`);
  } finally {
    await browser.close();
  }
}

/** Without a chart: the year's rose alone, its first read; the birth form from the page comes back here with both Kua. */
async function noChart(width, lang) {
  const { browser, page, errors, touch } = await open(width);
  const label = `${width} ${lang} without a chart`;
  const w = WORDS[lang];
  try {
    await gotoApp(page, "/feng-shui/cycles");
    if (lang === "fr") await setLang(page, "fr");
    await page.getByTestId("fengshui-cycles").waitFor({ timeout: 20000 });
    await dialTo(page, 2026, 8, touch, label);
    const r = await roses(page);
    if (Object.keys(r).join() !== "sky" || r.sky.stars !== STARS || r.sky.states !== STATES.sky || r.sky.stops.join() !== "n") throw new Error(`${label}: the rose ${JSON.stringify(r)}`);
    await page.getByTestId("fengshui-cycles-invite").waitFor({ timeout: 4000 });
    await assertNoOverflow(page);
    await page.screenshot({ path: join(SHOTS, `fengshui-cycles-sky-${lang}-${width}.png`) }).catch(() => {});
    await press(page, "fengshui-cycles-wedge-sky-n", touch);
    if (touch) await clickDockTab(page, "reading");
    await waitNote(page, w.skyN, label, "the north's reading");
    // The first read: the year, its 5 Yellow, the month.
    // (A rose's part is an SVG element: blurred as one.)
    await page.evaluate(() => (document.activeElement && "blur" in document.activeElement ? document.activeElement.blur() : null));
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForFunction(() => !document.querySelector("[data-testid=click-note]"), null, { timeout: 4000 });
    if (touch) await clickDockTab(page, "reading");
    const steps = await page.getByTestId("fengshui-cycles-hello").evaluate((e) => [...e.querySelectorAll("[data-testid^=fengshui-cycles-hello-]")].map((s) => s.getAttribute("data-testid").slice(22)));
    if (steps.join() !== "year,five,month,nochart,cast") throw new Error(`${label}: the first read ${steps}`);
    // The birth form from the page: cast, and back here with both Kua.
    await press(page, "fengshui-cycles-cast", touch);
    await page.locator("#birth-date").waitFor({ timeout: 8000 });
    await page.locator("#native-name").fill(FIXTURE_A.name);
    await page.locator("#birth-date").fill(FIXTURE_A.date);
    await page.locator("#birth-time").fill(FIXTURE_A.time);
    await pickPlace(page, FIXTURE_A.place);
    await page.getByTestId("cast-submit").click();
    await page.getByTestId("fengshui-cycles-rose-yang").waitFor({ timeout: 45000 });
    if (new URL(page.url()).pathname !== "/feng-shui/cycles") throw new Error(`${label}: back at ${page.url()}`);
    if ((await rootAttr(page, "data-counts")) !== "2") throw new Error(`${label}: cast, ${await rootAttr(page, "data-counts")} counts`);
    if (errors.length) throw new Error(`${label}: ${errors.join(" | ")}`);
    console.log(`fengshui-cycles ${label} OK`);
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
    await noChart(width, lang);
  } catch (e) {
    failures.push(String(e?.message ?? e));
  }
}
if (failures.length) {
  console.error(`FENGSHUI-CYCLES FAIL\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("FENGSHUI-CYCLES OK");
