/*
 * Feng Shui's home (languages plan, part 22), at /feng-shui/home, Feng
 * Shui's Home lens, at 1280 (typed) and 390 (a phone with touch, the
 * compass), in English and French, with Fixture A (made up: 15/06/1990,
 * 12:00, Paris) and no yin or yang count:
 *   - reached by its lens; the first read says how to find the facing;
 *   - the declination at the chart's place, a few degrees east;
 *   - a typed facing of 180°: Wu faced, Zi behind, the facing card, a Kan
 *     house of the East group, the same group as the yang count's Kua 1 and
 *     the other as the yin count's Kua 8; 170°: near Wu's edge, a
 *     replacement chart's zone; from a map, turned magnetic;
 *   - the year 1998: Period 7; a wrong year said so;
 *   - (part 23) the Flying Stars: Period 7, sitting Zi facing Wu, double
 *     stars at the sitting and the Combination of Ten; the south palace's
 *     reading; near an edge, the replacement chart beside the main one;
 *   - (part 24) the replacement chart on the figure; the nine palaces as a
 *     plan of the home (facing east: the east at the bottom) or as the books
 *     (south at the top); the luopan's ring of degrees;
 *   - a mountain's reading, the arrows walking round the dial;
 *   - on a phone: the compass on request, the plate turning under its
 *     thread (Wu at the top at 172.5°), three readings,
 *     their average used as the facing; on a computer, no compass button;
 *   - the table; Settings' "South at the top" followed at once;
 *   - nothing sent while the page works or reads the compass; nothing
 *     scrolls sideways.
 */
import { join } from "node:path";
import { chromium } from "playwright";
import { FIXTURE_A, SHOTS, VIEWPORTS, assertNoOverflow, castFixture, clickDockTab, ensureShotsDir, goStudioPage, gotoApp, setLang, setView } from "./_lib.mjs";

const WORDS = {
  en: {
    first: "Your home, step by step",
    facing: "the middle mountain of the south",
    same: "Your Kua 1 is of the same group",
    other: "Your Kua 8 is of the other group",
    edge: "Only 2.5° from Wu",
    period: "Period 7",
    bad: "A year from 1864 to 2100.",
    wu: "Wu · wǔ 午, S2: the middle mountain of the south",
    phone: "Read with this phone’s compass",
    map: "Read on a map (180° true)",
    east: " E",
    palace: "Mountain star 8, water star 6, period star 2",
    frontEast: "Front · East",
  },
  fr: {
    first: "Votre logement, pas à pas",
    facing: "la deuxième montagne du sud",
    same: "Votre Kua 1 est du même groupe",
    other: "Votre Kua 8 est de l’autre groupe",
    edge: "À 2,5° seulement de Wu",
    period: "Période 7",
    bad: "Une année de 1864 à 2100.",
    wu: "Wu · wǔ 午, S2\u202f: la deuxième montagne du sud",
    phone: "Lue avec la boussole de ce téléphone",
    map: "Lue sur une carte (180° géographique)",
    east: " E",
    palace: "Étoile de la montagne 8, étoile de l’eau 6, étoile de la période 2",
    frontEast: "Façade · Est",
  },
};
const note = (page) => page.getByTestId("click-note").evaluate((e) => e.textContent ?? "").catch(() => "");

async function waitNote(page, text, label, what) {
  await page.waitForFunction((t) => document.querySelector("[data-testid=click-note]")?.textContent?.includes(t), text, { timeout: 8000 }).catch(async () => {
    throw new Error(`${label}: ${what} "${(await note(page)).slice(0, 300)}"`);
  });
}
const text = (page, id) => page.getByTestId(id).evaluate((e) => e.textContent ?? "");
const centre = (page, id) => page.getByTestId(id).evaluate((e) => {
  const r = e.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});
const orient = (page, alpha) => page.evaluate((a) => window.dispatchEvent(new DeviceOrientationEvent("deviceorientationabsolute", { alpha: a, beta: 0, gamma: 0, absolute: true })), alpha);

async function run(width, lang) {
  const phone = width < 1024;
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const context = await browser.newContext({ viewport: VIEWPORTS[width], hasTouch: phone, isMobile: phone });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const label = `${width} ${lang}`;
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const w = WORDS[lang];
  try {
    await gotoApp(page);
    if (lang === "fr") await setLang(page, "fr");
    await castFixture(page, FIXTURE_A);
    const sent = [];
    page.on("request", (r) => {
      const u = new URL(r.url());
      if (r.method() !== "GET" || /_serverFn|\/api\//.test(u.pathname)) sent.push(`${r.method()} ${u.pathname}`);
    });
    await goStudioPage(page, "fengshui-home");
    await page.getByTestId("fengshui-home").waitFor({ timeout: 20000 });
    if (new URL(page.url()).pathname !== "/feng-shui/home") throw new Error(`${label}: at ${page.url()}`);

    // The first read: how to find the facing.
    if (phone) await clickDockTab(page, "reading");
    await page.getByTestId("fengshui-home-hello").waitFor({ timeout: 8000 });
    const steps = await page.locator("[data-testid^=fengshui-home-hello-]").count();
    const hello = await text(page, "fengshui-home-hello");
    if (steps !== 4 || !hello.includes(w.first)) throw new Error(`${label}: the first read ${steps} "${hello.slice(0, 120)}"`);
    if (phone) await clickDockTab(page, "reading").catch(() => {});
    await page.getByTestId("fengshui-home-none").waitFor({ timeout: 4000 });
    const decl = await text(page, "fengshui-home-declination");
    if (!decl.includes("Paris") || !decl.includes(w.east)) throw new Error(`${label}: the declination "${decl}"`);

    // A typed facing: 180°.
    await page.getByTestId("fengshui-home-facing").fill("180");
    await page.getByTestId("fengshui-home-facing-card").waitFor({ timeout: 4000 });
    const dial = await page.evaluate(() => ({
      core: document.querySelector("[data-testid=fengshui-home-core]")?.textContent,
      axis: document.querySelector("[data-testid=fengshui-home-axis]")?.getAttribute("data-facing"),
      facing: [...document.querySelectorAll(".ulune-fsh-mountain.is-facing")].map((g) => g.getAttribute("data-mountain")),
      sitting: [...document.querySelectorAll(".ulune-fsh-mountain.is-sitting")].map((g) => g.getAttribute("data-mountain")),
    }));
    if (dial.core !== "180°" || dial.axis !== "180.0" || dial.facing.join() !== "wu" || dial.sitting.join() !== "zi") throw new Error(`${label}: the dial ${JSON.stringify(dial)}`);
    const card = await text(page, "fengshui-home-facing-card");
    if (!card.includes(w.facing)) throw new Error(`${label}: the facing card "${card}"`);
    const yangHouse = await text(page, "fengshui-home-house-yang");
    const yinHouse = await text(page, "fengshui-home-house-yin");
    if (!yangHouse.includes(w.same) || !yinHouse.includes(w.other)) throw new Error(`${label}: the houses "${yangHouse}" / "${yinHouse}"`);
    await assertNoOverflow(page);
    await page.screenshot({ path: join(SHOTS, `fengshui-home-${lang}-${width}.png`) }).catch(() => {});

    // Near an edge: 170°.
    await page.getByTestId("fengshui-home-facing").fill("170");
    await page.waitForFunction((t) => document.querySelector("[data-testid=fengshui-home-facing-card]")?.textContent?.includes(t), w.edge, { timeout: 4000 }).catch(async () => {
      throw new Error(`${label}: the edge "${await text(page, "fengshui-home-facing-card")}"`);
    });
    if (!(await page.getByTestId("fengshui-home-facing-card").evaluate((e) => e.classList.contains("is-warn")))) throw new Error(`${label}: the edge card is not marked`);

    // From a map: 180° true, turned magnetic.
    await page.getByTestId("fengshui-home-source-map").check();
    await page.getByTestId("fengshui-home-facing").fill("180");
    const magnetic = Number(await page.getByTestId("fengshui-home-axis").getAttribute("data-facing"));
    if (!(magnetic > 176 && magnetic < 179.5)) throw new Error(`${label}: the map's facing read ${magnetic}`);
    await page.getByTestId("fengshui-home-facing-card").click();
    if (phone) await clickDockTab(page, "reading");
    await waitNote(page, w.map, label, "the facing's reading from a map");
    if (phone) await clickDockTab(page, "reading").catch(() => {});
    await page.getByTestId("fengshui-home-source-compass").check();

    // The year.
    await page.getByTestId("fengshui-home-year").fill("98");
    const bad = await page.getByTestId("fengshui-home-year").evaluate((e) => [e.getAttribute("aria-invalid"), document.getElementById(e.getAttribute("aria-describedby"))?.textContent]);
    if (bad[0] !== "true" || bad[1] !== w.bad) throw new Error(`${label}: a wrong year ${JSON.stringify(bad)}`);
    await page.getByTestId("fengshui-home-year").fill("1998");
    const period = await text(page, "fengshui-home-period");
    if (!period.includes(w.period)) throw new Error(`${label}: the period "${period}"`);

    // The Flying Stars (part 23): Period 7, sitting Zi facing Wu; near an edge, the replacement chart too.
    await page.getByTestId("fengshui-home-facing").fill("180");
    await page.getByTestId("fengshui-stars").waitFor({ timeout: 4000 });
    const stars = await page.evaluate(() => ({
      charts: [...document.querySelectorAll("[data-testid^=fengshui-stars-chart-]")].map((e) => e.getAttribute("data-testid").slice(21)),
      cells: document.querySelectorAll("[data-testid=fengshui-stars-grid-main] .ulune-fss-cell").length,
      forms: [...document.querySelectorAll("[data-testid^=fengshui-stars-formation-main-]")].map((e) => e.getAttribute("data-testid").slice(30)),
      top: document.querySelector("[data-testid=fengshui-stars-grid-main] .ulune-fss-cell")?.getAttribute("data-palace"),
    }));
    if (stars.charts.join() !== "main" || stars.cells !== 9 || stars.forms.join() !== "double-sitting,ten-mountain" || stars.top !== "nw") throw new Error(`${label}: the stars ${JSON.stringify(stars)}`);
    await page.getByTestId("fengshui-stars-main-s").evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.getByTestId("fengshui-stars-main-s").click();
    if (phone) await clickDockTab(page, "reading");
    await waitNote(page, w.palace, label, "the south palace's reading");
    if (phone) await clickDockTab(page, "reading").catch(() => {});
    await page.getByTestId("fengshui-home-facing").fill("170");
    await page.getByTestId("fengshui-stars-chart-ti").waitFor({ timeout: 4000 });
    // (part 24) The replacement chart on the figure.
    await page.getByTestId("fengshui-stars-pick-ti").click();
    await page.waitForFunction(() => document.querySelector("[data-testid=fengshui-stars-figure]")?.getAttribute("data-chart") === "ti", null, { timeout: 4000 });
    await page.getByTestId("fengshui-stars-pick-main").click();
    // (part 24) The nine palaces as a plan of the home: facing east, the east at the bottom and the west at the top; as the books, south at the top.
    await page.getByTestId("fengshui-home-facing").fill("90");
    const plan = async () => page.evaluate(() => [...document.querySelectorAll("[data-testid=fengshui-stars-grid-main] [data-palace]")].map((e) => e.getAttribute("data-palace")).join());
    if ((await plan()) !== "sw,w,nw,s,c,n,se,e,ne") throw new Error(`${label}: the plan facing east ${await plan()}`);
    const front = await text(page, "fengshui-stars-bottom-main");
    if (!front.includes(w.frontEast)) throw new Error(`${label}: the front "${front}"`);
    await page.getByTestId("fengshui-stars-orient-books").click();
    if ((await plan()) !== "se,s,sw,e,c,w,ne,n,nw") throw new Error(`${label}: as the books ${await plan()}`);
    await page.screenshot({ path: join(SHOTS, `fengshui-palaces-${lang}-${width}.png`) }).catch(() => {});
    await page.getByTestId("fengshui-stars-orient-home").click();
    await page.getByTestId("fengshui-home-facing").fill("180");
    // Back to the luopan for the mountains.
    await page.getByTestId("fengshui-home-fig-luopan").click();
    await page.getByTestId("fengshui-home-degrees").waitFor({ timeout: 4000 });
    await page.screenshot({ path: join(SHOTS, `fengshui-stars-${lang}-${width}.png`) }).catch(() => {});

    // A mountain's reading; the arrows walk round the dial.
    await page.getByTestId("fengshui-home-facing").fill("180");
    const wu = page.getByTestId("fengshui-home-mountain-wu");
    await wu.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await wu.click();
    if (phone) await clickDockTab(page, "reading");
    await waitNote(page, w.wu, label, "Wu's reading");
    if (phone) await clickDockTab(page, "reading").catch(() => {});
    await wu.focus();
    await page.keyboard.press("ArrowRight");
    const focused = await page.evaluate(() => document.activeElement?.getAttribute("data-testid"));
    if (focused !== "fengshui-home-mountain-ding") throw new Error(`${label}: the arrow went to ${focused}`);

    // The compass: on a phone, on request; three readings, their average.
    const start = page.getByTestId("fengshui-home-compass-start");
    if (!phone) {
      if (await start.count()) throw new Error(`${label}: a compass button on a computer`);
    } else {
      await start.evaluate((el) => el.scrollIntoView({ block: "center" }));
      await start.click();
      for (let i = 0; i < 4; i++) await orient(page, 187.5);
      await page.getByTestId("fengshui-home-needle").waitFor({ timeout: 4000 });
      // (part 24) The plate turns under the thread: the mountain the phone points at, Wu, stands at the top.
      const turn = Number(await page.getByTestId("fengshui-home-dial").getAttribute("data-turn"));
      if (Math.abs(turn - 187.5) > 0.6) throw new Error(`${label}: the plate turned ${turn}`);
      const wuLive = await centre(page, "fengshui-home-mountain-wu");
      const ziLive = await centre(page, "fengshui-home-mountain-zi");
      if (!(wuLive.y < ziLive.y)) throw new Error(`${label}: Wu is not at the top while the compass reads`);
      const heading = await text(page, "fengshui-home-heading");
      if (!/17[23]°/.test(heading)) throw new Error(`${label}: the heading "${heading}"`);
      for (const a of [187, 188, 187.5]) {
        for (let i = 0; i < 8; i++) await orient(page, a);
        await page.getByTestId("fengshui-home-take").click();
      }
      const avg = await text(page, "fengshui-home-average");
      if (!avg.includes("172")) throw new Error(`${label}: the average "${avg}"`);
      await page.screenshot({ path: join(SHOTS, `fengshui-home-compass-${lang}-${width}.png`) }).catch(() => {});
      await page.getByTestId("fengshui-home-use").click();
      const typed = await page.getByTestId("fengshui-home-facing").inputValue();
      if (typed !== "172.5") throw new Error(`${label}: the facing from the compass "${typed}"`);
      if (await page.getByTestId("fengshui-home-needle").count()) throw new Error(`${label}: the compass still live after use`);
      await page.getByTestId("fengshui-home-facing-card").click();
      await clickDockTab(page, "reading");
      await waitNote(page, w.phone, label, "the facing's reading from the phone");
      await clickDockTab(page, "reading").catch(() => {});
    }

    // The table.
    await setView(page, "table");
    await page.getByTestId("fengshui-home-table").waitFor({ timeout: 10000 });
    const rows = await page.evaluate(() => ({
      lines: document.querySelectorAll("[data-testid^=fengshui-home-row-]").length,
      mountains: document.querySelectorAll("[data-testid^=fengshui-home-mrow-]").length,
      home: [...document.querySelectorAll("[data-testid^=fengshui-home-mrow-][data-home]")].map((r) => r.getAttribute("data-testid").slice(21)),
    }));
    const starRows = await page.locator("[data-testid^=fengshui-stars-row-main-]").count();
    if (rows.lines !== 6 || rows.mountains !== 24 || rows.home.length !== 2 || starRows !== 9) throw new Error(`${label}: the table ${JSON.stringify(rows)} ${starRows}`);
    await assertNoOverflow(page);
    await setView(page, "wheel");
    await page.getByTestId("fengshui-home").waitFor({ timeout: 10000 });

    // Settings → South at the top (another tab): the dial follows at once.
    await page.evaluate(() => {
      localStorage.setItem("ulune.chinese", JSON.stringify({ compass: "south" }));
      window.dispatchEvent(new StorageEvent("storage", { key: "ulune.chinese" }));
    });
    await page.waitForFunction(() => document.querySelector("[data-testid=fengshui-home-dial]")?.getAttribute("data-top") === "south", null, { timeout: 4000 });
    const wuAt = await centre(page, "fengshui-home-mountain-wu");
    const ziAt = await centre(page, "fengshui-home-mountain-zi");
    if (!(wuAt.y < ziAt.y)) throw new Error(`${label}: the south is not at the top`);
    await page.evaluate(() => localStorage.removeItem("ulune.chinese"));

    if (sent.length) throw new Error(`${label}: sent ${sent.join(", ")}`);
    if (errors.length) throw new Error(`${label}: ${errors.join(" | ")}`);
    console.log(`fengshui-home ${label} OK`);
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
  console.error(`FENGSHUI-HOME FAIL\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("FENGSHUI-HOME OK");
