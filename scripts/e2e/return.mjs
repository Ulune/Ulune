/**
 * Back to the same place (page reorganisation plan, R6; the encyclopedia
 * plan's part 6). Leaving the studio for a page outside it and coming back
 * finds the same chart, language, lens and sub-mode, the same pin, the zoom,
 * and every scroll where it was (the panel, the table, the Calendar, a phone's
 * stage and sheet), whichever way the reader returns: the browser's Back, the
 * encyclopedia's "Back to your chart" (to the very entry of the tab's history,
 * past the pages read since), or the Charts section.
 *
 *   - a computer: the natal wheel (a pin, zoom, the reading scrolled), by Back
 *     and by the link; the table scrolled; the Calendar two months on, in its
 *     year; Human Design's layer and zoom;
 *   - the pin let go by a control on the way out (the search) comes back; one
 *     let go on the page's ground does not; switching lens inside the studio
 *     lets it go, as before;
 *   - a phone: the sheet open in full on a scrolled reading, a pin;
 *   - a page opened afresh (a search engine's visitor) has no way "back";
 *   - the Chinese pages, which scroll in themselves (languages plan, part
 *     28): BaZi's luck pillars on a computer, a block chosen and the page
 *     scrolled, by Back and by the link; Feng Shui's Home on a phone, its
 *     facing, year and room given and the page scrolled, back from Settings
 *     by Back and from the encyclopedia by the link.
 *
 * The chart is the sample (1 January 2000, noon, Greenwich: nobody's birth).
 */
import { chromium } from "playwright";
import { DEV, clickDockTab, goStudioPage, gotoApp, openMenu, setView, waitStudioPage } from "./_lib.mjs";

const fail = [];
const check = (ok, msg) => {
  if (!ok) fail.push(msg);
};
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });

async function open(width, height = 900, touch = false) {
  const context = await browser.newContext({ viewport: { width, height }, ...(touch ? { isMobile: true, hasTouch: true } : {}) });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error" && /hydrat/i.test(m.text())) errors.push(m.text().slice(0, 200));
  });
  await gotoApp(page, "/astrology");
  return { context, page, errors };
}

async function sample(page) {
  await page.getByTestId("sample-chart").click();
  await page.getByTestId("studio-natal").waitFor({ timeout: 45000 });
  await page.waitForTimeout(1600);
}

/** Where things stand, as a reader would see them. */
const snapshot = (page) =>
  page.evaluate(() => {
    const top = (sel) => {
      const el = document.querySelector(sel);
      return el && el.getClientRects().length ? Math.round(el.scrollTop) : null;
    };
    const dock = document.querySelector("[data-testid=dock]");
    return {
      url: location.pathname + location.search,
      page: document.querySelector("[data-testid=studio-nav]")?.getAttribute("data-page") ?? null,
      zoom: document.querySelector("[data-zoom]")?.getAttribute("data-zoom") ?? null,
      pin: document.querySelector(".ob-figure svg[data-depth-base]")?.getAttribute("data-focus-id") ?? null,
      reading: dock?.querySelector(".ulune-dock-scroll h2, .ulune-dock-scroll h3")?.textContent?.trim().slice(0, 40) ?? null,
      readingScroll: top(".ulune-dock-scroll"),
      tableScroll: document.querySelector("[data-testid=table-page]") ? top(".ob-figure") : null,
      stageScroll: top(".ob-stage"),
      calendar: document.querySelector("[data-testid=timing-caption]")?.textContent?.trim() ?? null,
      calendarScroll: top(".ulune-timing-hero"),
      scope: document.querySelector("[data-testid^=timing-scope-][aria-pressed=true], [data-testid^=timing-scope-][aria-checked=true]")?.getAttribute("data-testid") ?? null,
      hdView: document.querySelector("[data-testid^=hd-view-][aria-pressed=true], [data-testid^=hd-view-][aria-checked=true]")?.getAttribute("data-testid") ?? null,
      hdZoom: document.querySelector("[data-testid=hd-zoom] [data-zoom], [data-testid=hd-zoom][data-zoom]")?.getAttribute("data-zoom") ?? null,
      sheet: dock?.getAttribute("data-detent") ?? null,
      history: history.length,
    };
  });

function same(label, before, after, keys) {
  for (const k of keys) {
    check(JSON.stringify(before[k]) === JSON.stringify(after[k]), `${label}: ${k} was ${JSON.stringify(before[k])}, came back ${JSON.stringify(after[k])}`);
  }
}

/** Out by the sections' Encyclopedia link, onto the encyclopedia's home. */
async function leave(page) {
  await page.locator("[data-testid=section-encyclopedia]:visible").first().click();
  await page.waitForURL(/\/encyclop/, { timeout: 15000 });
  await page.getByTestId("enc-home").waitFor({ timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(500);
}

async function landed(page) {
  await page.waitForFunction(() => !/\/encyclop/.test(location.pathname), null, { timeout: 15000 });
  await page.waitForTimeout(1800);
}

/** A computer: the wheel, the table, the Calendar and Human Design, by Back and by the link. */
async function computer() {
  const { context, page, errors } = await open(1280);
  try {
    await sample(page);
    // Saturn chosen on the wheel, the wheel zoomed twice, the reading scrolled.
    const b = await page.locator(".ob-figure svg[data-depth-base] [data-kind=planet][data-body=saturn] .ulune-wheel-halo").first().boundingBox();
    if (!b) throw new Error("no Saturn on the wheel");
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.move(5, 5);
    await clickDockTab(page, "reading");
    await page.getByTestId("wheel-zoom-in").click();
    await page.getByTestId("wheel-zoom-in").click();
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      const el = document.querySelector(".ulune-dock-scroll");
      if (el) el.scrollTop = 160;
    });
    await page.waitForTimeout(300);
    const before = await snapshot(page);
    check(before.pin === "planet:saturn", `the pin before leaving is ${before.pin}`);
    check(before.zoom === "1.50", `the zoom before leaving is ${before.zoom}`);
    check(before.readingScroll > 100, `the reading did not scroll (${before.readingScroll})`);
    const keys = ["url", "page", "zoom", "pin", "reading", "readingScroll"];

    // 1. The browser's Back.
    await leave(page);
    check((await page.getByTestId("enc-back").textContent())?.includes("Back to your chart"), "no “Back to your chart” on the encyclopedia");
    await page.goBack();
    await landed(page);
    same("Back", before, await snapshot(page), keys);

    // 2. "Back to your chart", two pages further in: to the studio's own entry, the pages read kept ahead.
    await leave(page);
    await page.locator("main a[href='/encyclopedia/astrology']").first().click();
    await page.getByTestId("enc-tradition").waitFor({ timeout: 15000 });
    await page.locator("main a[href='/encyclopedia/saturn']").first().click();
    await page.getByTestId("enc-entry").waitFor({ timeout: 15000 });
    await page.waitForTimeout(400);
    const deeper = page.locator("[data-testid=enc-related] a[href^='/encyclopedia/'], [data-testid=enc-next]").first();
    if (await deeper.count()) {
      await deeper.click();
      await page.waitForTimeout(800);
    }
    const length = await page.evaluate(() => history.length);
    await page.getByTestId("enc-back").click();
    await landed(page);
    const after = await snapshot(page);
    same("the link", before, after, keys);
    check(after.history === length, `the link added to the history (${length} → ${after.history}) instead of going back in it`);
    await page.goForward();
    await page.waitForURL(/\/encyclop/, { timeout: 15000 });
    await page.goBack();
    await landed(page);
    same("the link, then Forward and Back", before, await snapshot(page), ["url", "pin", "zoom"]);

    // 3. The table, scrolled to its middle.
    await setView(page, "table");
    await page.getByTestId("table-page").waitFor({ timeout: 15000 });
    await page.waitForTimeout(800);
    await page.evaluate(() => {
      const el = document.querySelector(".ob-figure");
      if (el) el.scrollTop = 900;
    });
    await page.waitForTimeout(300);
    const table = await snapshot(page);
    check(table.tableScroll === 900, `the table did not scroll (${table.tableScroll})`);
    await leave(page);
    await page.goBack();
    await landed(page);
    same("the table", table, await snapshot(page), ["url", "tableScroll"]);
    await setView(page, "wheel");

    // 4. The Calendar: its year, two years on, scrolled.
    await goStudioPage(page, "timing");
    await page.getByTestId("timing-caption").waitFor({ timeout: 15000 });
    await page.getByTestId("timing-scope-year").click();
    await page.waitForTimeout(800);
    await page.getByTestId("timing-next").click();
    await page.getByTestId("timing-next").click();
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      const el = document.querySelector(".ulune-timing-hero");
      if (el) el.scrollTop = Math.min(400, el.scrollHeight - el.clientHeight);
    });
    await page.waitForTimeout(300);
    const cal = await snapshot(page);
    await leave(page);
    check((await page.getByTestId("enc-back").textContent())?.includes("Back to the Calendar"), "no “Back to the Calendar” from the Calendar");
    await page.getByTestId("enc-back").click();
    await landed(page);
    same("the Calendar", cal, await snapshot(page), ["url", "page", "calendar", "scope", "calendarScroll"]);

    // 5. Human Design: the Design layer, zoomed.
    await goStudioPage(page, "design");
    await page.getByTestId("hd-view-design").waitFor({ timeout: 15000 });
    await page.getByTestId("hd-view-design").click();
    await page.getByTestId("wheel-zoom-in").click().catch(() => {});
    await page.waitForTimeout(500);
    const hd = await snapshot(page);
    check(hd.hdView === "hd-view-design", `the Design layer was not chosen (${hd.hdView})`);
    await leave(page);
    await page.goBack();
    await landed(page);
    same("Human Design", hd, await snapshot(page), ["url", "page", "hdView", "zoom"]);
    check(!errors.length, `computer: ${errors.join(" | ")}`);
  } finally {
    await context.close();
  }
  console.log("computer OK");
}

/** The pin on the way out: let go by the search, it comes back; let go on purpose, it stays let go. */
async function pins() {
  const { context, page, errors } = await open(1280);
  try {
    await sample(page);
    const choose = async (body) => {
      const b = await page.locator(`.ob-figure svg[data-depth-base] [data-kind=planet][data-body=${body}] .ulune-wheel-halo`).first().boundingBox();
      if (!b) throw new Error(`no ${body} on the wheel`);
      await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
      await page.mouse.move(5, 5);
      await page.waitForTimeout(300);
    };
    const pin = () => page.evaluate(() => document.querySelector(".ob-figure svg[data-depth-base]")?.getAttribute("data-focus-id") ?? null);

    // Out by the search: its button lets go of the pin, the page read is the Moon's.
    await choose("mars");
    check((await pin()) === "planet:mars", `Mars was not chosen (${await pin()})`);
    await page.getByTestId("palette-open").click();
    await page.getByTestId("command-palette").waitFor();
    await page.keyboard.type("Moon");
    await page.waitForTimeout(500);
    const enc = page.locator("[data-testid^='cmd-enc:'], [data-testid^='cmd-entry:']").first();
    if (await enc.count()) await enc.click();
    else {
      await page.keyboard.press("Escape");
      await leave(page);
    }
    await page.waitForURL(/\/encyclop/, { timeout: 15000 });
    await page.waitForTimeout(500);
    await page.goBack();
    await landed(page);
    check((await pin()) === "planet:mars", `the pin let go by the search did not come back (${await pin()})`);

    // Let go on purpose (a press on the stage's ground), then out: it stays let go.
    const ground = await page.locator(".ob-stage").boundingBox();
    if (!ground) throw new Error("no stage");
    await page.mouse.click(ground.x + 8, ground.y + ground.height - 8);
    await page.waitForTimeout(300);
    check((await pin()) !== "planet:mars", "a press on the stage's ground did not let go of the pin");
    await leave(page);
    await page.goBack();
    await landed(page);
    check((await pin()) !== "planet:mars", "a pin let go on purpose came back with the studio");

    // Inside the studio, as before: another lens, pressed, lets go of the pin, and Natal again does not restore it.
    await choose("venus");
    await page.getByTestId("lens-cycles").click();
    await waitStudioPage(page, "transits");
    await page.getByTestId("lens-natal").click();
    await waitStudioPage(page, "natal");
    await page.waitForTimeout(800);
    const now = await pin();
    check(now !== "planet:venus", `switching lens kept the pin (${now}), unlike before`);
    check(!errors.length, `pins: ${errors.join(" | ")}`);
  } finally {
    await context.close();
  }
  console.log("pins OK");
}

/** A phone: the sheet open in full on a scrolled reading, and a pin. */
async function phone() {
  const { context, page, errors } = await open(390, 844, true);
  try {
    await sample(page);
    await clickDockTab(page, "birth");
    await page.waitForTimeout(600);
    await clickDockTab(page, "reading");
    await page.waitForTimeout(800);
    await page.evaluate(async () => {
      const el = document.querySelector(".ulune-dock-scroll");
      if (el) el.scrollTop = 120;
    });
    await page.waitForTimeout(300);
    const before = await snapshot(page);
    check(before.sheet === "full", `the sheet is ${before.sheet}, not full`);
    await leave(page);
    await page.getByTestId("enc-back").click();
    await landed(page);
    same("phone", before, await snapshot(page), ["url", "page", "sheet", "reading", "readingScroll"]);
    check(!errors.length, `phone: ${errors.join(" | ")}`);
  } finally {
    await context.close();
  }
  console.log("phone OK");
}

/** A Chinese page's own scroller, its choices and its fields, as a reader would see them (part 28). */
const chineseLook = (page, scroller) =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel);
    const value = (id) => document.querySelector(`[data-testid=${id}]`)?.value ?? null;
    return {
      url: location.pathname + location.search,
      page: document.querySelector("[data-testid=studio-nav]")?.getAttribute("data-page") ?? null,
      chosen: [...(el?.querySelectorAll("[aria-pressed=true]") ?? [])].map((b) => b.getAttribute("data-testid")),
      reading: document.querySelector("[data-testid=dock] .ulune-dock-scroll h2, [data-testid=dock] .ulune-dock-scroll h3")?.textContent?.trim().slice(0, 40) ?? null,
      facing: value("fengshui-home-facing"),
      year: value("fengshui-home-year"),
      rooms: [...document.querySelectorAll("[data-testid^=fengshui-room-remove-]")].map((b) => `${b.closest("[data-palace]")?.getAttribute("data-palace")}:${b.getAttribute("data-kind")}`),
      scroll: el && el.getClientRects().length ? Math.round(el.scrollTop) : null,
    };
  }, scroller);

/** The same place, the same choices, the scroll within a few pixels. */
function near(label, before, after) {
  same(label, before, after, ["url", "page", "chosen", "reading", "facing", "year", "rooms"]);
  check(after.scroll != null && Math.abs(after.scroll - before.scroll) <= 3, `${label}: the page was scrolled to ${before.scroll}, came back at ${after.scroll}`);
}

/** Scrolls a page's own scroller to `top` (or as far as it goes). */
const scrollTo = (page, sel, top) =>
  page.evaluate(
    ([s, t]) => {
      const el = document.querySelector(s);
      if (el) el.scrollTop = Math.min(t, el.scrollHeight - el.clientHeight);
    },
    [sel, top],
  );

/** BaZi's luck pillars on a computer (part 28): a block chosen, the page scrolled in itself; back by Back, then by the link. */
async function luck() {
  const { context, page, errors } = await open(1280);
  try {
    await sample(page);
    await goStudioPage(page, "bazi-luck");
    await page.getByTestId("bazi-luck").waitFor({ timeout: 20000 });
    await page.getByTestId("bazi-luck-yang-3").click();
    await page.waitForTimeout(500);
    await scrollTo(page, ".ulune-bzl", 200);
    await page.waitForTimeout(300);
    const before = await chineseLook(page, ".ulune-bzl");
    check(JSON.stringify(before.chosen) === JSON.stringify(["bazi-luck-yang-3"]), `the luck block chosen before leaving: ${JSON.stringify(before.chosen)}`);
    check(before.scroll > 80, `the luck pillars did not scroll (${before.scroll})`);
    check(Boolean(before.reading), "no reading for the luck block");

    // 1. Out by the top bar's Encyclopedia, back by the browser's Back.
    await leave(page);
    await page.goBack();
    await landed(page);
    near("BaZi's luck, Back", before, await chineseLook(page, ".ulune-bzl"));

    // 2. Out again, an entry read, back by "Back to your chart".
    await leave(page);
    await page.locator("main a[href='/encyclopedia/astrology']").first().click();
    await page.getByTestId("enc-tradition").waitFor({ timeout: 15000 });
    check((await page.getByTestId("enc-back").textContent())?.includes("Back to your chart"), "no “Back to your chart” from BaZi’s luck pillars");
    await page.getByTestId("enc-back").click();
    await landed(page);
    near("BaZi's luck, the link", before, await chineseLook(page, ".ulune-bzl"));
    check(!errors.length, `luck: ${errors.join(" | ")}`);
  } finally {
    await context.close();
  }
  console.log("BaZi's luck OK");
}

/** Feng Shui's Home on a phone (part 28): a facing, a year and a room given, the page scrolled; back from Settings and from the encyclopedia. */
async function home() {
  const { context, page, errors } = await open(390, 844, true);
  try {
    await sample(page);
    await goStudioPage(page, "fengshui-home");
    await page.getByTestId("fengshui-home").waitFor({ timeout: 20000 });
    await page.getByTestId("fengshui-home-facing").fill("180");
    await page.getByTestId("fengshui-home-year").fill("1998");
    await page.getByTestId("fengshui-rooms-add-n").selectOption("bedroom");
    await page.getByTestId("fengshui-stars").waitFor({ timeout: 8000 });
    await scrollTo(page, ".ulune-fsh", 900);
    await page.waitForTimeout(300);
    const before = await chineseLook(page, ".ulune-fsh");
    check(before.facing === "180" && before.year === "1998", `the home before leaving: ${before.facing}° ${before.year}`);
    check(JSON.stringify(before.rooms) === JSON.stringify(["n:bedroom"]), `the rooms before leaving: ${JSON.stringify(before.rooms)}`);
    check(before.scroll > 600, `Feng Shui's Home did not scroll (${before.scroll})`);

    // 1. Out to Settings by the account menu, back by the browser's Back.
    await openMenu(page);
    await page.getByTestId("menu-settings").click();
    await page.getByTestId("settings-page").waitFor({ timeout: 15000 });
    await page.waitForTimeout(400);
    await page.goBack();
    await page.waitForFunction(() => !/\/settings/.test(location.pathname), null, { timeout: 15000 });
    await page.waitForTimeout(1800);
    near("Feng Shui's Home, from Settings", before, await chineseLook(page, ".ulune-fsh"));

    // 2. Out by the bottom bar's Encyclopedia, back by "Back to your chart".
    await leave(page);
    await page.getByTestId("enc-back").click();
    await landed(page);
    near("Feng Shui's Home, from the encyclopedia", before, await chineseLook(page, ".ulune-fsh"));
    check(!errors.length, `home: ${errors.join(" | ")}`);
  } finally {
    await context.close();
  }
  console.log("Feng Shui's Home OK");
}

/** A page opened afresh, as from a search engine: nothing to go back to. */
async function fresh() {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  try {
    await page.goto(`${DEV}/encyclopedia/saturn`, { waitUntil: "load" });
    await page.getByTestId("enc-entry").waitFor({ timeout: 15000 });
    // The page awake (hydrated): a press moves within the app, rather than loading a new page.
    await page.waitForSelector("html.theme-ready", { timeout: 20000 });
    await page.waitForTimeout(500);
    check((await page.getByTestId("enc-back").count()) === 0, "a fresh encyclopedia page offers “Back to your chart”");
    // From there into the studio and out again: now there is a way back.
    await page.locator("[data-testid=section-charts]").first().click();
    await waitStudioPage(page, "natal").catch(() => {});
    await page.waitForTimeout(800);
    await page.goBack();
    await page.getByTestId("enc-entry").waitFor({ timeout: 15000 });
    check((await page.getByTestId("enc-back").count()) === 1, "no way back to the studio after visiting it");
  } finally {
    await context.close();
  }
  console.log("fresh OK");
}

for (const fn of [computer, pins, phone, luck, home, fresh]) {
  try {
    await fn();
  } catch (err) {
    fail.push(`${fn.name}: ${err instanceof Error ? err.message : err}`);
  }
}
await browser.close();
if (fail.length) {
  console.error("RETURN FAIL\n" + fail.map((f) => "- " + f).join("\n"));
  process.exit(1);
}
console.log("RETURN OK", DEV);
