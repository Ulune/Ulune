/*
 * Feng Shui's home (languages plan, part 22), at /feng-shui/home, Feng
 * Shui's Home lens, at 1280 (typed) and 390 (a phone with touch, the
 * compass), in English and French, with Fixture A (made up: 15/06/1990,
 * 12:00, Paris) and no yin or yang count:
 *   - reached by its lens; the first read says how to find the facing, and
 *     (part 29) ends on "How Ulune calculates" (the Eight Mansions, the Xuan
 *     Kong Flying Stars, the edges, the periods from 1864, the magnetic
 *     model), with no method note for Fixture A;
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
 *   - (part 25) the year's and the month's stars: the card, its readings,
 *     the year's numbers on the palaces with the 5 Yellow's marked, the
 *     year's layer switched off and on, the afflictions on the luopan;
 *   - (part 27) the south palace's pair of stars (8 and 6, "Standing and
 *     wealth"), and the 8 White's own reading opened from the palace's facts;
 *   - (part 26) rooms placed on the home's plan (the north-east's kitchen and
 *     bathroom, the north's bedroom), named on the palaces and read in the
 *     palace's reading, one removed; the home kept in a private space (at
 *     1280 in English): sealed, back after a reload, a new home, forgotten,
 *     gone from the page when the space locks;
 *   - (reorganisation plan, R9) the kept home in the chart switcher, under
 *     the people, with its facing ("180° · Wu"), marked while the Home page
 *     has it open; chosen there from the Natal page or from the Home page
 *     with a new home on it, and found by name in ⌘K: the Home page opens
 *     with it, the chart unchanged; with the space locked, no homes, and on
 *     the Home page the way to unlock them, which brings them back;
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
import { FIXTURE_A, SHOTS, VIEWPORTS, assertNoOverflow, castFixture, clickDockTab, createSpace, ensureShotsDir, goStudioPage, gotoApp, readSpaceRecord, setLang, setView, unlockSpace } from "./_lib.mjs";
import { watchSent } from "./_sent.mjs";

const WORDS = {
  en: {
    first: "Your home, step by step",
    how: "How Ulune calculates",
    method: ["Eight Mansions school", "Xuan Kong Flying Stars", "24 mountains of 15°", "Within 3°", "counted from 1864", "World Magnetic Model 2025", "Swiss Ephemeris 2.10.03, JPL DE441"],
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
    five: "The 5, the Lo Shu’s own centre, flies",
    year: "the year’s star in the centre is the",
    month: "the month’s star in the centre is the",
    roomsHere: "In this palace: your kitchen and your bathroom.",
    pair: "Mountain 8 and water 6: Standing and wealth",
    star8: "The 8 White, Zuo Fu, is earth, the trigram Gen",
    label: "Kitchen · Bath",
    kitchen: "Kitchen",
  },
  fr: {
    first: "Votre logement, pas à pas",
    how: "Comment Ulune calcule",
    method: ["l’école des Huit Demeures", "Étoiles volantes du Xuan Kong", "24 montagnes de 15°", "À moins de 3°", "comptée depuis 1864", "modèle magnétique mondial 2025", "Swiss Ephemeris 2.10.03, JPL DE441"],
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
    five: "Le 5, le centre propre du Lo Shu, vole",
    year: "l’étoile de l’année au centre est le",
    month: "l’étoile du mois au centre est le",
    roomsHere: "Dans ce palais\u202f: votre cuisine et votre salle d’eau.",
    pair: "Montagne 8 et eau 6\u202f: Le rang et la richesse",
    star8: "Le 8 Blanc, Zuo Fu, est la terre, le trigramme Gen",
    label: "Cuisine · Eau",
    kitchen: "Cuisine",
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
    // Nothing but the app's own files, by GET, from here (_sent.mjs).
    const sent = watchSent(page);
    await goStudioPage(page, "fengshui-home");
    await page.getByTestId("fengshui-home").waitFor({ timeout: 20000 });
    if (new URL(page.url()).pathname !== "/feng-shui/home") throw new Error(`${label}: at ${page.url()}`);

    // The first read: how to find the facing.
    if (phone) await clickDockTab(page, "reading");
    await page.getByTestId("fengshui-home-hello").waitFor({ timeout: 8000 });
    const steps = await page.locator("[data-testid^=fengshui-home-hello-]").count();
    const hello = await text(page, "fengshui-home-hello");
    if (steps !== 4 || !hello.includes(w.first)) throw new Error(`${label}: the first read ${steps} "${hello.slice(0, 120)}"`);
    // Part 29: no note for Fixture A; the first read ends on "How Ulune calculates", folded.
    const method = await page.evaluate(() => {
      const how = document.querySelector("[data-testid=fengshui-home-hello] [data-testid=method-notes]");
      return { notes: document.querySelectorAll("[data-testid=fengshui-home-hello] [data-testid=method-note]").length, title: how?.querySelector("summary")?.textContent?.trim(), open: how?.open, text: how?.textContent ?? "" };
    });
    if (method.notes || method.title !== w.how || method.open || !w.method.every((t) => method.text.includes(t))) throw new Error(`${label}: the method notes ${JSON.stringify(method).slice(0, 300)}`);
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
    // (part 27) The pair of mountain and water read together, and the mountain star's own reading from its fact.
    await waitNote(page, w.pair, label, "the south palace's pair");
    await page.locator("[data-testid=click-note] [data-ref='fss:star:8']").first().click();
    await waitNote(page, w.star8, label, "the 8 White's reading");
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

    // (part 25) The year's and the month's stars, whatever today is: the card says them; the palaces carry the year's numbers.
    const yr = await page.getByTestId("fengshui-years").evaluate((e) => Object.fromEntries(["year", "star", "monthStar", "five", "taiSui", "breaker", "killings"].map((k) => [k, e.dataset[k]])));
    if (!/^20\d\d$/.test(yr.year) || !/^[1-9]$/.test(yr.star) || !/^[1-9]$/.test(yr.monthStar)) throw new Error(`${label}: the year's card ${JSON.stringify(yr)}`);
    const yearText = await text(page, "fengshui-years-year");
    if (!yearText.includes(yr.year) || !yearText.includes(w.year)) throw new Error(`${label}: the year's line "${yearText}"`);
    if (yr.year === "2026" && (yr.five !== "s" || yr.taiSui !== "wu" || yr.breaker !== "zi" || yr.killings !== "ren zi gui")) throw new Error(`${label}: 2026's afflictions ${JSON.stringify(yr)}`);
    const centreYear = await text(page, "fengshui-stars-year-main-c");
    const fiveCell = await page.evaluate(() => document.querySelector("[data-testid=fengshui-stars-grid-main] .is-five")?.getAttribute("data-palace"));
    const fiveYear = fiveCell ? await text(page, `fengshui-stars-year-main-${fiveCell}`) : "";
    if (centreYear !== yr.star || fiveCell !== yr.five || fiveYear !== "5") throw new Error(`${label}: the palaces' year ${centreYear} ${fiveCell} ${fiveYear}`);
    await page.getByTestId("fengshui-home-year-layer").click();
    await page.waitForFunction(() => !document.querySelector("[data-testid^=fengshui-stars-year-main-]"), null, { timeout: 4000 });
    if ((await page.getByTestId("fengshui-home-year-layer").getAttribute("aria-pressed")) !== "false") throw new Error(`${label}: the year's layer still pressed`);
    await page.getByTestId("fengshui-home-year-layer").click();
    await page.getByTestId("fengshui-stars-year-main-c").waitFor({ timeout: 4000 });
    await page.getByTestId("fengshui-years-aff-five-yellow").evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.getByTestId("fengshui-years-aff-five-yellow").click();
    if (phone) await clickDockTab(page, "reading");
    await waitNote(page, w.five, label, "the 5 Yellow's reading");
    if (phone) await clickDockTab(page, "reading").catch(() => {});
    await page.getByTestId("fengshui-years-month").evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.getByTestId("fengshui-years-month").click();
    if (phone) await clickDockTab(page, "reading");
    await waitNote(page, w.month, label, "the month's reading");
    if (phone) await clickDockTab(page, "reading").catch(() => {});
    // (part 26) Rooms on the home's plan: named on the palaces, read in the palace's reading; one removed.
    await page.getByTestId("fengshui-rooms-grid").waitFor({ timeout: 4000 });
    const planCells = await page.evaluate(() => [...document.querySelectorAll("[data-testid=fengshui-rooms-grid] [data-palace]")].map((e) => e.getAttribute("data-palace")).join());
    if (planCells !== "nw,n,ne,w,c,e,sw,s,se") throw new Error(`${label}: the rooms' plan ${planCells}`);
    await page.getByTestId("fengshui-rooms-add-ne").selectOption("kitchen");
    await page.getByTestId("fengshui-rooms-add-ne").selectOption("bathroom");
    await page.getByTestId("fengshui-rooms-add-n").selectOption("bedroom");
    const roomLabel = await text(page, "fengshui-stars-rooms-main-ne");
    if (roomLabel !== w.label) throw new Error(`${label}: the north-east's rooms "${roomLabel}"`);
    await page.getByTestId("fengshui-stars-main-ne").evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.getByTestId("fengshui-stars-main-ne").click();
    if (phone) await clickDockTab(page, "reading");
    await waitNote(page, w.roomsHere, label, "the north-east's rooms in its reading");
    if (phone) await clickDockTab(page, "reading").catch(() => {});
    await page.locator("[data-testid^=fengshui-room-remove-][data-kind=bathroom]").click();
    await page.waitForFunction((t) => document.querySelector("[data-testid=fengshui-stars-rooms-main-ne]")?.textContent === t, w.kitchen, { timeout: 4000 });
    if ((await page.locator("[data-testid^=fengshui-room-remove-]").count()) !== 2) throw new Error(`${label}: rooms after one removed`);
    await assertNoOverflow(page);
    await page.getByTestId("fengshui-rooms").evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.screenshot({ path: join(SHOTS, `fengshui-rooms-${lang}-${width}.png`) }).catch(() => {});

    // Back to the luopan for the mountains.
    await page.getByTestId("fengshui-home-fig-luopan").click();
    await page.getByTestId("fengshui-home-degrees").waitFor({ timeout: 4000 });
    // (part 25) The year's afflictions on the luopan's rim.
    const arcs = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll("[data-testid^=fengshui-home-aff-]")].map((e) => [e.getAttribute("data-testid").slice(18), e.getAttribute("data-aff")])));
    if (arcs[yr.taiSui] !== "tai-sui" || arcs[yr.breaker] !== "year-breaker" || !yr.killings.split(" ").every((m) => arcs[m] === "three-killings" || m === yr.breaker) || Object.keys(arcs).length < 4) throw new Error(`${label}: the luopan's afflictions ${JSON.stringify(arcs)}`);
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
    const roomRows = await page.evaluate(() => [...document.querySelectorAll("[data-testid^=fengshui-rooms-row-]")].map((r) => r.getAttribute("data-testid").slice(19)).join());
    if (roomRows !== "ne,n") throw new Error(`${label}: the rooms' rows ${roomRows}`);
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

/** (part 26) The home kept in a private space, at 1280 in English. */
async function kept() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const context = await browser.newContext({ viewport: VIEWPORTS[1280] });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const NAME = "Zqxv cabin";
  const facing = () => page.getByTestId("fengshui-home-facing").inputValue();
  const status = () => text(page, "fengshui-keep-status");
  // The chart switcher (R9): its people, its homes, its groups' headings.
  const switcher = page.getByTestId("chart-picker");
  const openSwitcher = async () => {
    if (!(await switcher.isVisible().catch(() => false))) await page.getByTestId("chart-chip").click();
    await switcher.waitFor({ timeout: 8000 });
  };
  const closeSwitcher = async () => {
    await page.keyboard.press("Escape");
    await switcher.waitFor({ state: "hidden" }).catch(() => {});
  };
  const people = () => page.locator("[data-testid=chart-row]").evaluateAll((els) => els.map((e) => e.getAttribute("data-name")));
  const homeRows = () =>
    page.locator("[data-testid=home-row]").evaluateAll((els) =>
      els.map((e) => ({ name: e.getAttribute("data-name"), text: e.textContent, on: e.querySelector("button")?.getAttribute("aria-current") === "true" })),
    );
  const heads = () => page.locator("[data-testid=chart-picker] .ob-picker-head").evaluateAll((els) => els.map((e) => e.textContent));
  const emptyPage = async () => {
    await page.getByTestId("fengshui-keep-pick").selectOption("");
    await page.waitForFunction(() => document.querySelector("[data-testid=fengshui-home-facing]")?.value === "", null, { timeout: 4000 });
  };
  const keptBack = async (how) => {
    await page.waitForURL((u) => u.pathname === "/feng-shui/home", { timeout: 15000 });
    await page.waitForFunction(() => document.querySelector("[data-testid=fengshui-home-facing]")?.value === "180", null, { timeout: 15000 }).catch(async () => {
      throw new Error(`kept: ${how}, the facing "${await facing().catch(() => "")}"`);
    });
    if ((await page.locator("[data-testid^=fengshui-room-remove-][data-kind=bedroom]").count()) !== 1) throw new Error(`kept: ${how}, no bedroom`);
    if ((await page.getByTestId("chart-chip").innerText()).trim() !== FIXTURE_A.name) throw new Error(`kept: ${how}, the chart changed`);
  };
  try {
    await gotoApp(page);
    await castFixture(page, FIXTURE_A);
    await goStudioPage(page, "fengshui-home");
    await page.getByTestId("fengshui-keep").waitFor({ timeout: 20000 });
    // No space: not kept, and the way in.
    if (!(await status()).includes("This home isn’t kept")) throw new Error(`kept: the status without a space "${await status()}"`);
    await page.getByTestId("fengshui-keep-sign-in").waitFor({ timeout: 4000 });
    await createSpace(page);
    // Nothing but the app's own files, by GET, from here (_sent.mjs).
    const sent = watchSent(page);
    // Nothing to keep yet; then a facing, a year and a bedroom, kept and named.
    await page.waitForFunction(() => document.querySelector("[data-testid=fengshui-keep-save]")?.disabled === true, null, { timeout: 8000 });
    await page.getByTestId("fengshui-home-facing").fill("180");
    await page.getByTestId("fengshui-home-year").fill("1998");
    await page.getByTestId("fengshui-rooms-add-n").selectOption("bedroom");
    await page.getByTestId("fengshui-keep-save").click();
    await page.getByTestId("fengshui-keep-name").waitFor({ timeout: 8000 });
    await page.getByTestId("fengshui-keep-name").fill(NAME);
    await page.waitForTimeout(900);
    const rec = await readSpaceRecord(page, "fs/homes");
    const h = rec?.homes?.[0];
    if (!h || rec.homes.length !== 1 || h.name !== NAME || h.typed !== "180" || h.year !== "1998" || h.rooms.length !== 1 || h.rooms[0].kind !== "bedroom" || h.rooms[0].palace !== "n" || rec.activeId !== h.id) {
      throw new Error(`kept: the sealed record ${JSON.stringify(rec)?.slice(0, 300)}`);
    }
    // Nothing of it in the browser's plain storage.
    const plain = await page.evaluate(() => JSON.stringify([{ ...localStorage }, { ...sessionStorage }]));
    if (plain.includes("Zqxv")) throw new Error("kept: the home's name in plain storage");
    await page.screenshot({ path: join(SHOTS, "fengshui-home-kept-en-1280.png") }).catch(() => {});
    // After a reload (the space stays open on this device), the home comes back by itself.
    await page.reload();
    await page.getByTestId("fengshui-keep").waitFor({ timeout: 30000 });
    await page.waitForFunction(() => document.querySelector("[data-testid=fengshui-home-facing]")?.value === "180", null, { timeout: 15000 });
    if ((await page.getByTestId("fengshui-keep-name").inputValue()) !== NAME) throw new Error("kept: the name after a reload");
    if ((await page.locator("[data-testid^=fengshui-room-remove-][data-kind=bedroom]").count()) !== 1) throw new Error("kept: the bedroom after a reload");

    // (R9) The chart switcher: the home under the people, with its facing, marked as the one open here.
    await openSwitcher();
    await page.getByTestId("home-row").waitFor({ timeout: 8000 });
    const peopleBefore = await people();
    let rows = await homeRows();
    if (rows.length !== 1 || rows[0].name !== NAME || !rows[0].text.includes("180° · Wu") || !rows[0].on) throw new Error(`kept: the switcher's homes ${JSON.stringify(rows)}`);
    if ((await heads()).join() !== "People,Homes") throw new Error(`kept: the switcher's groups ${await heads()}`);
    if (peopleBefore.join() !== FIXTURE_A.name) throw new Error(`kept: the switcher's people ${peopleBefore}`);
    // A home is never a person: no edit, remove or pair on its row.
    if (await page.locator("[data-testid=home-row] [data-testid^=chart-]").count()) throw new Error("kept: a person's buttons on a home");
    await closeSwitcher();
    // From the Natal page, with a new home on the Home page: the kept one chosen in the switcher.
    await emptyPage();
    await goStudioPage(page, "natal");
    await openSwitcher();
    await page.getByTestId("home-row").waitFor({ timeout: 8000 });
    if ((await homeRows())[0].on) throw new Error("kept: a home marked open away from the Home page");
    await page.locator(`[data-testid=home-row][data-name="${NAME}"] button`).click();
    await keptBack("chosen in the switcher from the Natal page");
    await switcher.waitFor({ state: "hidden", timeout: 4000 });
    // A new home, then the kept one again from the switcher, on the Home page itself.
    await emptyPage();
    await openSwitcher();
    rows = await homeRows();
    if (rows.length !== 1 || rows[0].on) throw new Error(`kept: a new home on the page, the switcher's ${JSON.stringify(rows)}`);
    await page.locator(`[data-testid=home-row][data-name="${NAME}"] button`).click();
    await keptBack("chosen again in the switcher");
    // ⌘K: part of its name finds it, with Feng Shui beside it; chosen, the same.
    await emptyPage();
    await goStudioPage(page, "natal");
    await page.keyboard.press("Control+k");
    await page.getByTestId("command-palette").waitFor({ timeout: 8000 });
    await page.keyboard.type("zqxv");
    const homeCmd = page.locator("[data-testid^='cmd-home:']");
    await homeCmd.first().waitFor({ timeout: 8000 });
    const cmdText = (await homeCmd.allTextContents()).join(" | ");
    if ((await homeCmd.count()) !== 1 || !cmdText.includes(NAME) || !cmdText.includes("Feng Shui")) throw new Error(`kept: ⌘K's homes "${cmdText}"`);
    await page.keyboard.press("Enter");
    await keptBack("chosen in ⌘K");
    // The people as they were.
    await openSwitcher();
    if ((await people()).join() !== peopleBefore.join()) throw new Error(`kept: the switcher's people now ${await people()}`);
    await closeSwitcher();

    // A new home: an empty page, not kept; the kept one chosen again.
    await page.getByTestId("fengshui-keep-pick").selectOption("");
    await page.waitForFunction(() => document.querySelector("[data-testid=fengshui-home-facing]")?.value === "", null, { timeout: 4000 });
    if (await page.locator("[data-testid^=fengshui-room-remove-]").count()) throw new Error("kept: rooms in a new home");
    await page.getByTestId("fengshui-keep-pick").selectOption({ label: NAME });
    await page.waitForFunction(() => document.querySelector("[data-testid=fengshui-home-facing]")?.value === "180", null, { timeout: 4000 });
    // Forgotten: out of the space, still on the page, unkept.
    await page.getByTestId("fengshui-keep-forget").click();
    await page.getByTestId("fengshui-keep-forget-sure").click();
    await page.waitForFunction(() => /no longer kept/.test(document.querySelector("[data-testid=fengshui-keep-status]")?.textContent ?? ""), null, { timeout: 4000 });
    await page.waitForTimeout(300);
    const after = await readSpaceRecord(page, "fs/homes");
    if (after?.homes?.length !== 0) throw new Error(`kept: forgotten but sealed ${JSON.stringify(after)}`);
    if ((await facing()) !== "180") throw new Error("kept: the page lost the forgotten home");
    // Kept again, then the space locked: the kept home goes from the page.
    await page.getByTestId("fengshui-keep-save").click();
    await page.getByTestId("fengshui-keep-name").waitFor({ timeout: 8000 });
    await page.getByTestId("space-button").click();
    await page.getByTestId("space-lock-now").click();
    await page.waitForFunction(() => document.querySelector("[data-testid=space-button]")?.getAttribute("data-space") === "locked", null, { timeout: 10000 });
    await page.waitForFunction(() => {
      const f = document.querySelector("[data-testid=fengshui-home-facing]");
      return !f || f.value === "";
    }, null, { timeout: 8000 });
    if (await page.locator("[data-testid^=fengshui-room-remove-]").count()) throw new Error("kept: rooms left after the space locked");
    // (R9) Locked: no homes in the switcher; on the Home page, the way to unlock them, which brings them back.
    await openSwitcher();
    await page.getByTestId("picker-homes-unlock").waitFor({ timeout: 8000 });
    if (await page.getByTestId("home-row").count()) throw new Error("kept: homes in the switcher with the space locked");
    // Away from Feng Shui, the switcher as it was: no homes' group, no headings.
    await closeSwitcher();
    await goStudioPage(page, "natal");
    await openSwitcher();
    await page.getByTestId("new-chart").waitFor({ timeout: 8000 });
    await page.waitForTimeout(300);
    if ((await page.getByTestId("picker-homes").count()) || (await heads()).length) throw new Error(`kept: locked, away from Feng Shui, the switcher's ${await heads()}`);
    await closeSwitcher();
    await goStudioPage(page, "fengshui-home");
    await openSwitcher();
    await page.getByTestId("picker-homes-unlock").click();
    await unlockSpace(page);
    await openSwitcher();
    await page.getByTestId("home-row").waitFor({ timeout: 8000 });
    if ((await homeRows()).length !== 1) throw new Error(`kept: the homes after unlocking ${JSON.stringify(await homeRows())}`);
    await closeSwitcher();
    if (sent.length) throw new Error(`kept: sent ${sent.join(", ")}`);
    if (errors.length) throw new Error(`kept: ${errors.join(" | ")}`);
    console.log("fengshui-home kept OK");
  } finally {
    await browser.close();
  }
}

await ensureShotsDir();
const failures = [];
try {
  await kept();
} catch (e) {
  failures.push(String(e?.message ?? e));
}
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
