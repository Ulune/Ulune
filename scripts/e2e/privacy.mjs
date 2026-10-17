/*
 * What leaves the reader's browser. Casts two charts, visits every mode, asks
 * two AIs (one called from the page, one through Ulune's relay), and checks
 * every request the page made:
 *   - no name or place name typed by the reader appears in any request
 *     (numerology's full name at birth and name used now included),
 *     except the place search, which carries the place typed there, and the
 *     birth date only in the calculations, which need it;
 *   - a cast carries a date, a time and coordinates, and no name or place;
 *   - nothing goes to the geocoder from the page (Ulune's server asks it);
 *   - an AI request carries positions, not the name, date, time or place;
 *   - The calendar asks only for the sky, by date (the transits are worked out in
 *     the page), and nothing else goes with those requests;
 *   - the encyclopedia asks for its own files only, by GET (_sent.mjs).
 * The AI providers are answered here (page.route): no real key is used.
 *
 * The Chinese pages (languages plan, part 30: "no request leaves while a
 * Chinese page calculates, casts or reads the compass"), at 1280 in English,
 * at 390 on an Android phone in English and on an iPhone in French, with two
 * made-up charts (Fixture B, then Fixture A shown): the eight pages, reached
 * by the language picker and the lenses, their elements chosen, readings
 * opened, tables shown; on Feng Shui's Home a facing, a year and three rooms
 * typed, and on a phone the compass used, Android's way
 * (`deviceorientationabsolute`) and the iPhone's (permission asked, then
 * `webkitCompassHeading`):
 *   - every request is a GET of the app's own files at Ulune's address
 *     (_sent.mjs), with no body, and no address (asked or shown) carries the
 *     facing, the year, a room, a compass heading, a name or the births;
 *   - the compass is not listened to (nor, on an iPhone, its permission
 *     asked) before "Use the compass" is tapped, and stops when the reading
 *     is used and when the page is left, even with the iPhone's permission
 *     still pending when it is, or when Stop is pressed while it is;
 *   - this browser's plain storage and cookies hold none of it, and only
 *     display settings change while the pages are used;
 *   - without a private space nothing is written to IndexedDB; with one, the
 *     home kept is sealed in the `fs/homes` record alone (read back with the
 *     key the browser keeps), and no record holds its words in the clear.
 * `node scripts/e2e/privacy.mjs --chinese` runs the Chinese pages alone.
 *
 * A chart shared by link (share plan, feature 1), Fixture A's link opened in
 * fresh browsers: with no private space nothing is written to IndexedDB (no
 * database made) and plain storage holds none of it; with a locked space the
 * chart is sealed into the space's inbox and no store holds anything
 * readable; every request is the app's own files by GET or the cast (a
 * date, a time, coordinates), none carries the link's fragment, and the
 * address bar keeps no fragment once the page has read it.
 * `node scripts/e2e/privacy.mjs --share` runs it alone.
 */
import { chromium } from "playwright";
import {
  AI_ON,
  DEV,
  FIXTURE_A,
  FIXTURE_B,
  PASSPHRASE,
  VIEWPORTS,
  castFixture,
  clickDockTab,
  createSpace,
  databases,
  goStudioPage,
  gotoApp,
  launch,
  openExport,
  readSpaceRecord,
  setLang,
  setView,
} from "./_lib.mjs";
import { notAppFile, watchSent } from "./_sent.mjs";

/** The first chart also gets numerology's two names (part 64): they stay on the device too. */
const A = { ...FIXTURE_A, birthName: "Quintessa Marie Aurelia", currentName: "Quintessa Vale", chineseCount: "yin" };
const NAMES = [A.name, A.birthName, A.currentName, "Quintessa", FIXTURE_B.name, "Oslo", "Paris"];
const DATES = ["15/06/1990", "1990-06-15", "03/11/1987", "1987-11-03"];
const PERSONAL = [...NAMES, ...DATES];
/** The place search carries the place typed into it, and only that. */
const PLACE_SEARCH_OK = ["Paris", "Oslo", "Paris, France", "Oslo, Norway"];

const MODES = ["natal", "transits", "timing", "progressions", "synastry", "composite", "design", "numerology"];

const READING = `@@TITLE@@
A test epithet
@@PORTRAIT@@
${"A portrait written for the test, long enough to count as a portrait. ".repeat(4)}
@@SECTION@@ Identity — Sun, Moon, Rising
${"Some words for the test. ".repeat(6)}
@@SECTION@@ Synthesis
${"More words for the test. ".repeat(6)}
@@END@@`;

function isServerFn(url) {
  return url.includes("/_serverFn/");
}

function decodeFnName(url) {
  const id = url.split("/_serverFn/")[1]?.split("?")[0] ?? "";
  try {
    return JSON.parse(Buffer.from(id, "base64url").toString("utf8")).export ?? id;
  } catch {
    return id;
  }
}

/** Save a key in Your AI; returns the line saying where requests go. */
async function addKey(page, provider, key) {
  await page.getByTestId("ai-accounts").click();
  await page.locator(`#ai-key-${provider}`).fill(key);
  await page.locator(`#ai-key-${provider}`).press("Enter");
  await page.getByTestId("ai-route").waitFor({ timeout: 8000 });
  const route = await page.getByTestId("ai-route").innerText();
  // The popover's backdrop closes it.
  await page.mouse.click(5, 5);
  await page.getByTestId("ai-accounts-popover").waitFor({ state: "hidden", timeout: 8000 });
  return route;
}

/** A word nobody would search for: it must not leave the page. */
const SECRET = "zqxwvquintessa";
/** The encyclopedia's own pages and the pictures of its link previews, besides the app's files. */
const ENCYCLOPEDIA_FILES = [/^\/(?:encyclopedia|encyclopedie)(?:\/[a-z0-9-]+)?\/?$/, /^\/previews\/[\w-]+\.jpg$/];

async function run() {
  const { browser, page } = await launch(1280);
  let encFrom = 0;
  let encTo = 0;
  const seen = [];
  page.on("request", (r) => {
    seen.push({ url: r.url(), method: r.method(), body: r.postData() ?? "", request: r });
  });
  const aiBodies = [];
  await page.route("https://api.anthropic.com/**", async (route) => {
    const req = route.request();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*" } });
    aiBodies.push({ via: "direct", body: req.postData() ?? "", headers: req.headers() });
    await route.fulfill({
      status: 200,
      headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
      body: JSON.stringify({ content: [{ type: "text", text: READING }] }),
    });
  });
  try {
    await gotoApp(page);
    await castFixture(page, A);
    await castFixture(page, FIXTURE_B);
    // Back to A, so B is the second person.
    await page.getByTestId("chart-chip").click();
    await page.locator("[data-testid=chart-row]").filter({ hasText: A.name }).getByRole("button").first().click();
    for (const mode of MODES) {
      await goStudioPage(page, mode);
      await page.getByTestId(`studio-${mode === "design" ? "humandesign" : mode}`).waitFor({ timeout: 30000 });
      await page.waitForTimeout(400);
    }
    console.log("modes visited");

    await goStudioPage(page, "natal");
    if (!AI_ON) {
      // AI readings wait for v1.1: nothing of them shows.
      await page.getByTestId("studio-natal").waitFor({ timeout: 30000 });
      const sun = page.locator("svg.ulune-wheel:not(.ulune-wheel-ghost) [data-kind=planet][data-body=sun]").first();
      await sun.evaluate((el) => el instanceof SVGElement && el.focus());
      await page.keyboard.press("Enter");
      await page.getByTestId("click-note").waitFor({ timeout: 20000 });
      for (const id of ["ai-accounts", "compose-grok", "reading-ask", "natal-portrait"]) {
        if (await page.getByTestId(id).count()) throw new Error(`AI is off, yet "${id}" shows`);
      }
      console.log("no AI on screen");
    } else {
    // Your AI: a Claude key (called from the page), then compose the natal reading.
    await addKey(page, "claude", "sk-ant-test-0000000000000000");
    await page.getByTestId("compose-grok").click();
    await page.getByTestId("portrait").waitFor({ timeout: 20000 });
    console.log("composed with the direct provider");

    // A second provider that goes through the relay: its request to Ulune's
    // server is inspected (the relay's own call fails here: no network to it).
    const route = await addKey(page, "grok", "xai-test-000000000000000000");
    if (!/Ulune/.test(route)) throw new Error(`relay provider not said to go through Ulune: "${route}"`);
    // Ask about the Sun: the question box sends the focus and the positions.
    const sun = page.locator("svg.ulune-wheel:not(.ulune-wheel-ghost) [data-kind=planet][data-body=sun]").first();
    await sun.evaluate((el) => el instanceof SVGElement && el.focus());
    await page.keyboard.press("Enter");
    await page.getByTestId("reading-ask").click();
    await page.getByTestId("ask-grok-submit").click();
    await page.waitForFunction(
      () => document.querySelector("[data-testid=ask-grok] [role=alert]") || document.querySelector("[data-testid=ask-grok] ol li"),
      null,
      { timeout: 45000 },
    );
    console.log("asked through the relay");
    }

    // The encyclopedia with this chart open (part 22): "In your chart", the search, a page,
    // Bookmark: nothing but its pages and the app's own files, by GET; nothing typed goes out.
    encFrom = seen.length;
    await page.locator("[data-testid=section-encyclopedia]:visible").first().click();
    await page.getByTestId("enc-home").waitFor({ timeout: 15000 });
    await page.getByTestId("enc-mine-index").waitFor({ timeout: 10000 });
    await page.getByTestId("enc-search-input").pressSequentially(`${SECRET} moon`, { delay: 15 });
    await page.getByTestId("enc-search-input").fill("");
    await page.getByTestId("enc-search-input").pressSequentially("moon", { delay: 15 });
    await page.locator('[data-testid=enc-results] [data-entry="moon"] a').first().click();
    await page.getByTestId("enc-mine").waitFor({ timeout: 10000 });
    await page.getByTestId("enc-bookmark").click();
    await page.getByTestId("enc-keep-need").waitFor({ timeout: 5000 });
    await page.waitForTimeout(1000);
    encTo = seen.length;
    console.log("encyclopedia read");
  } finally {
    await browser.close();
  }

  const failures = [];
  const fnCalls = seen.filter((r) => isServerFn(r.url));
  for (const r of seen) {
    const name = isServerFn(r.url) ? decodeFnName(r.url) : "";
    // A time zone's name is not the place: the coordinates already say where.
    let text = `${r.url}\n${r.body}`.split("Europe/Paris").join("").split("Europe/Oslo").join("");
    if (name.startsWith("searchPlaces")) {
      for (const ok of PLACE_SEARCH_OK) text = text.split(ok).join("");
    }
    // The calculations need the birth moment (they get it without a name);
    // nothing else may carry it.
    for (const word of name.startsWith("cast") ? NAMES : PERSONAL) {
      if (text.includes(word)) failures.push(`${r.method} ${name || r.url.slice(0, 80)} carries "${word}"`);
    }
    if (/open-meteo/.test(r.url)) failures.push(`the page asked the geocoder itself: ${r.url.slice(0, 80)}`);
  }
  const casts = fnCalls.filter((r) => decodeFnName(r.url).startsWith("castChart"));
  if (casts.length < 2) failures.push(`expected 2 casts, saw ${casts.length}`);
  for (const c of casts) {
    if (/"name"|"placeLabel"|"birthName"|"currentName"|"numerologyY"|"chineseCount"/.test(c.body)) failures.push(`a cast carries a name, place or count field: ${c.body.slice(0, 200)}`);
    if (!/"latitude"/.test(c.body) || !/"date"/.test(c.body)) failures.push("a cast lacks its date or coordinates");
  }
  if (!AI_ON) {
    // No request to an AI provider, and none to the relay.
    for (const r of seen) if (/anthropic|openai|googleapis|x\.ai/.test(new URL(r.url).host)) failures.push(`AI is off, yet a request went to ${r.url.slice(0, 80)}`);
    if (fnCalls.some((r) => decodeFnName(r.url).startsWith("relayAi"))) failures.push("AI is off, yet a request went to the relay");
  }
  if (AI_ON && !aiBodies.length) failures.push("no request reached the direct AI provider");
  for (const a of aiBodies) {
    for (const word of PERSONAL) if (a.body.includes(word)) failures.push(`the AI request carries "${word}"`);
    if (!/Sun|Soleil/.test(a.body) || !/ASC/.test(a.body)) failures.push("the AI request lacks the positions");
    if (a.headers["anthropic-dangerous-direct-browser-access"] !== "true") failures.push("direct call without its browser header");
  }
  const relayed = fnCalls.filter((r) => decodeFnName(r.url).startsWith("relayAi"));
  if (AI_ON && !relayed.length) failures.push("no request went to the relay");
  for (const r of relayed) {
    if (!/Person A|Personne A|ASC/.test(r.body)) failures.push("the relayed prompt lacks the positions");
  }

  // The calendar asks the server only for the sky, by date; the transits are worked out here.
  if (fnCalls.some((r) => /^castTiming/.test(decodeFnName(r.url)))) failures.push("The calendar sent the chart to the server");
  let skyAsks = 0;
  for (const r of seen) {
    const u = new URL(r.url);
    if (u.pathname !== "/api/sky-window" && u.pathname !== "/api/sky-year") continue;
    skyAsks += 1;
    const keys = [...u.searchParams.keys()].sort().join(",");
    if (r.method !== "GET" || r.body || !(keys === "t0,v" || keys === "v,y")) failures.push(`a sky request carries more than a date: ${r.method} ${r.url.slice(0, 100)}`);
  }
  if (!skyAsks) failures.push("The calendar asked for no sky");

  // The encyclopedia's part of the visit: its pages, its previews and the app's files, by GET.
  if (encTo <= encFrom) failures.push("the encyclopedia was not visited");
  for (const r of seen.slice(encFrom, encTo)) {
    const why = notAppFile(r.request, ENCYCLOPEDIA_FILES);
    if (why) failures.push(`the encyclopedia sent ${why}`);
  }
  // The Chinese traditions' count (languages plan, part 6) stays on the device.
  for (const r of seen) if (/chineseCount|"yin"/.test(r.body)) failures.push(`the yin or yang count went out: ${r.url.slice(0, 80)}`);
  for (const r of seen) if (`${r.url} ${r.body}`.toLowerCase().includes(SECRET)) failures.push(`what was typed in the search went out: ${r.url.slice(0, 80)}`);

  if (failures.length) {
    console.error(failures.join("\n"));
    throw new Error(`${failures.length} privacy failure(s)`);
  }
  console.log(`privacy ok: ${seen.length} requests, ${casts.length} casts, ${aiBodies.length} direct AI and ${relayed.length} relayed AI requests checked (${DEV})`);
}

/* ------------------------------------------------- the Chinese pages (languages plan, part 30) */

/** Made up for the test: the home typed on Feng Shui's Home page and the name it is kept under. */
const FACING = "137.25";
const YEAR = "1931";
const ROOMS = [
  ["ne", "kitchen"],
  ["ne", "bathroom"],
  ["n", "bedroom"],
];
const HOME_NAME = "Zqxv lodge";
/**
 * The compass as each phone gives it: Android's alpha turns the other way
 * (heading 360 − alpha); an iPhone says its heading. The plate turns by
 * 360 − heading under the thread; the average of three readings becomes the facing.
 */
const COMPASS = {
  android: { alpha: 138.3, heading: 221.7, used: "221.7" },
  iphone: { heading: 203.4, used: "203.4" },
};
/** What must never leave the page nor reach plain storage: the charts' names and births, the home, the compass. */
const HOME_WORDS = [FACING, FACING.replace(".", ","), YEAR, ...ROOMS.map(([, kind]) => kind), HOME_NAME, "Zqxv"];
const COMPASS_WORDS = ["221.7", "221,7", "138.3", "203.4", "203,4", "156.6"];
const BIRTHS = [FIXTURE_A.name, FIXTURE_B.name, "15/06/1990", "1990-06-15", "03/11/1987", "1987-11-03"];
const CHINESE_WORDS = [...BIRTHS, ...HOME_WORDS, ...COMPASS_WORDS];
/** And in an address, besides: the births' times and places. */
const ADDRESS_WORDS = [...CHINESE_WORDS, "12:00", "23:10", "12%3A00", "23%3A10", "Paris", "Oslo"];

/**
 * The display settings the Chinese pages (and the studio around them) may
 * change in this browser's plain storage: never the chart, the home or the
 * compass. Any other key changed fails the suite until it is added here,
 * with what it holds.
 */
const DISPLAY_KEYS = [
  /^ulune\.studio\.(?:page|view)$/, // the page and the view last open (src/studio/url.ts)
  /^ulune\.studio\.last\.v2$/, // each language's last lens and page, the languages last used, the day the picker first showed the new ones (src/studio/map.ts)
  /^ulune\.chinese$/, // Settings → Chinese traditions (lib/chinese/prefs.ts)
  /^ulune\.dock\.(?:w|open)$/, // the side panel's width and whether it is open (studio/dock/dock-layout.ts)
  /^ulune\.hint\.[\w.-]+$/, // a one-time hint, seen (lib/first-hint.ts, studio/shell/lang-hint.ts)
];

/** Every Chinese page but Home: how it is reached, its figure, what is chosen on it, its table. */
const CHINESE_PAGES = [
  { id: "zodiac", figure: "zodiac-wheel", table: "zodiac-table", read: ["zodiac-card-year", "zodiac-card-day"] },
  { id: "zodiac-years", figure: "zodiac-years", table: "zodiac-years-table", act: ["zodiac-years-next"], read: ["zodiac-month-10"] },
  { id: "zodiac-pair", figure: "zodiac-pair", table: "zodiac-pair-table", read: ["zodiac-pair-year-year", "zodiac-pair-day-day"] },
  { id: "bazi", figure: "bazi-board", table: "bazi-table", read: ["bazi-stem-month", "bazi-ix-clash:day-hour", "bazi-strength"] },
  { id: "bazi-luck", figure: "bazi-luck", table: "bazi-luck-table", slider: "bazi-luck-slider", read: ["bazi-luck-yang-2", "bazi-luck-how"] },
  { id: "bazi-pair", figure: "bazi-pair", table: "bazi-pair-table", read: ["bazi-pair-dm", "bazi-pair-a-day-stem"] },
  { id: "fengshui", figure: "fengshui", table: "fengshui-table", read: ["fengshui-wedge-yang-e", "fengshui-kua-yang", "fengshui-practice-yang"] },
  // Two people in one home (FS32): the second person's yin count chosen (kept in memory only), then a wedge, a Kua, the practice.
  { id: "fengshui-pair", figure: "fengshui-pair", table: "fengshui-pair-table", act: ["fengshui-pair-count-b-yin"], read: ["fengshui-pair-wedge-e", "fengshui-pair-kua-a", "fengshui-pair-practice"] },
];

/*
 * Set in the page before any of its code runs: who listens to the compass
 * (window's orientation listeners, added and removed), whether an iPhone's
 * permission is asked, and what is written to IndexedDB.
 */
function spies({ iphone }) {
  const ORIENT = new Set(["deviceorientation", "deviceorientationabsolute"]);
  const live = [];
  const orient = { log: [], live: () => live.length };
  window.__orient = orient;
  const add = EventTarget.prototype.addEventListener;
  const remove = EventTarget.prototype.removeEventListener;
  EventTarget.prototype.addEventListener = function (type, fn, opts) {
    if (this === window && ORIENT.has(type) && fn && !live.some(([t, f]) => t === type && f === fn)) {
      orient.log.push(`add ${type}`);
      live.push([type, fn]);
    }
    return add.call(this, type, fn, opts);
  };
  EventTarget.prototype.removeEventListener = function (type, fn, opts) {
    if (this === window && ORIENT.has(type)) {
      const i = live.findIndex(([t, f]) => t === type && f === fn);
      if (i >= 0) {
        live.splice(i, 1);
        orient.log.push(`remove ${type}`);
      }
    }
    return remove.call(this, type, fn, opts);
  };
  if (iphone && typeof DeviceOrientationEvent !== "undefined") {
    // As Safari on an iPhone: the page must ask, after a tap. The test answers (or holds the answer).
    window.__permission = { asked: 0, answer: () => Promise.resolve("granted") };
    DeviceOrientationEvent.requestPermission = () => {
      window.__permission.asked += 1;
      return window.__permission.answer();
    };
  }
  const writes = [];
  window.__idb = { opened: [], writes };
  const open = IDBFactory.prototype.open;
  IDBFactory.prototype.open = function (name, ...rest) {
    window.__idb.opened.push(String(name));
    return open.call(this, name, ...rest);
  };
  for (const op of ["put", "add", "delete", "clear"]) {
    const f = IDBObjectStore.prototype[op];
    IDBObjectStore.prototype[op] = function (...args) {
      try {
        const key = op === "put" || op === "add" ? (args[1] ?? (typeof this.keyPath === "string" ? args[0]?.[this.keyPath] : "")) : args[0];
        writes.push({ db: this.transaction.db.name, store: this.name, op, key: String(key ?? "") });
      } catch {
        /* the write itself says what is wrong */
      }
      return f.apply(this, args);
    };
  }
}

/** This browser's plain storage and cookies, as [where, key, value]. */
const plainStorage = (page) =>
  page.evaluate(() => [
    ...Object.entries(localStorage).map(([k, v]) => ["localStorage", k, v]),
    ...Object.entries(sessionStorage).map(([k, v]) => ["sessionStorage", k, v]),
    ...document.cookie
      .split(";")
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => ["cookie", c.split("=")[0], c.slice(c.indexOf("=") + 1)]),
  ]);

/** The words of `list` found in `text`; a number only as itself (1931 is not inside a time stamp's digits). */
const found = (text, list) =>
  list.filter((w) => new RegExp(`${/^\d/.test(w) ? "(?<!\\d)" : ""}${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}${/\d$/.test(w) ? "(?!\\d)" : ""}`).test(text));

/** An address without the development server's cache-busting stamps (`t=` times, `v=` hashes), decoded. */
function bareAddress(url) {
  let u = url.replace(/([?&])(?:t=\d+|v=[0-9a-f]+)(?=&|$)/g, "$1");
  try {
    u = decodeURIComponent(u);
  } catch {
    /* as it is */
  }
  return u;
}

/** The side panel's reading, as it reads now. */
const noteText = (page) => page.evaluate(() => document.querySelector("[data-testid=click-note]")?.textContent ?? "");

/** Taps (or clicks) an element by its test id, in view first. */
async function press(page, testId) {
  const el = page.getByTestId(testId).first();
  await el.waitFor({ state: "attached", timeout: 10000 });
  await el.evaluate((e) => {
    e.scrollIntoView({ block: "center" });
    // A drawing's part (SVG) has no click() of its own.
    if (typeof e.click === "function") e.click();
    else e.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
  });
}

/** Chooses an element and waits for its reading (on a phone, in the sheet's Reading tab). */
async function read(page, testId, touch, label) {
  const before = await noteText(page);
  await press(page, testId);
  const changed = () =>
    page
      .waitForFunction((b) => {
        const t = document.querySelector("[data-testid=click-note]")?.textContent ?? "";
        return t.trim().length > 20 && t !== b;
      }, before, { timeout: 6000 })
      .then(
        () => true,
        () => false,
      );
  if (await changed()) return;
  if (touch) {
    await clickDockTab(page, "reading").catch(() => {});
    if (await changed()) return;
  }
  throw new Error(`${label}: ${testId} opened no reading`);
}

/** The page's table, then its figure again. */
async function tableOf(page, testId) {
  await setView(page, "table");
  await page.getByTestId(testId).waitFor({ timeout: 15000 });
  await setView(page, "wheel");
}

/** The compass as each phone sends it. */
const orient = (page, path) =>
  page.evaluate(({ path, c }) => {
    if (path === "android") {
      window.dispatchEvent(new DeviceOrientationEvent("deviceorientationabsolute", { alpha: c.android.alpha, beta: 0, gamma: 0, absolute: true }));
    } else {
      const e = new DeviceOrientationEvent("deviceorientation", { alpha: 31, beta: 0, gamma: 0, absolute: false });
      Object.defineProperty(e, "webkitCompassHeading", { value: c.iphone.heading });
      Object.defineProperty(e, "webkitCompassAccuracy", { value: 5 });
      window.dispatchEvent(e);
    }
  }, { path, c: COMPASS });

const orientState = (page) =>
  page.evaluate(() => ({
    live: window.__orient.live(),
    adds: window.__orient.log.filter((l) => l.startsWith("add")).length,
    props: Boolean(window.ondeviceorientation || window.ondeviceorientationabsolute),
    asked: window.__permission?.asked ?? null,
  }));

/**
 * The compass on Feng Shui's Home, on a phone (useCompass.ts): listened to
 * only once tapped, three readings, their average used; stopped when used
 * and when the page is left, even with an iPhone's permission still pending.
 */
async function compassOnPhone(page, path, label, failures) {
  const c = COMPASS[path];
  const pre = await orientState(page);
  if (pre.adds || pre.live || pre.props) failures.push(`${label}: the compass was listened to before the tap ${JSON.stringify(pre)}`);
  if (path === "iphone" && pre.asked !== 0) failures.push(`${label}: the iPhone's permission was asked before the tap (${pre.asked})`);
  await press(page, "fengshui-home-compass-start");
  if (path === "iphone") {
    await page.waitForFunction(() => window.__permission.asked === 1, null, { timeout: 4000 }).catch(() => failures.push(`${label}: the tap asked no permission`));
  }
  await page.waitForFunction(() => window.__orient.live() > 0, null, { timeout: 4000 }).catch(() => {
    throw new Error(`${label}: the tap started no compass`);
  });
  for (let i = 0; i < 8; i++) await orient(page, path);
  await page.getByTestId("fengshui-home-needle").waitFor({ state: "attached", timeout: 4000 });
  const turn = Number(await page.getByTestId("fengshui-home-dial").getAttribute("data-turn"));
  if (Math.abs(turn - (360 - c.heading)) > 0.6) failures.push(`${label}: the plate turned ${turn}, not ${360 - c.heading}`);
  for (let n = 0; n < 3; n++) {
    for (let i = 0; i < 8; i++) await orient(page, path);
    await press(page, "fengshui-home-take");
  }
  await page.getByTestId("fengshui-home-average").waitFor({ state: "attached", timeout: 4000 });
  await press(page, "fengshui-home-use");
  const typed = await page.getByTestId("fengshui-home-facing").inputValue();
  if (typed !== c.used) failures.push(`${label}: the compass's facing "${typed}", not ${c.used}`);
  const used = await orientState(page);
  if (used.live) failures.push(`${label}: the compass still listened to once its reading was used`);

  // Read again, then the page left (Feng Shui's Natal lens): the compass stops with it.
  await press(page, "fengshui-home-compass-start");
  await page.waitForFunction(() => window.__orient.live() > 0, null, { timeout: 4000 });
  for (let i = 0; i < 4; i++) await orient(page, path);
  await page.getByTestId("fengshui-home-needle").waitFor({ state: "attached", timeout: 4000 });
  await goStudioPage(page, "fengshui");
  await page.getByTestId("fengshui").waitFor({ timeout: 20000 });
  const left = await orientState(page);
  if (left.live) failures.push(`${label}: the compass still listened to after the page was left`);
  await goStudioPage(page, "fengshui-home");
  await page.getByTestId("fengshui-home-compass-start").waitFor({ state: "attached", timeout: 10000 });
  const back = await orientState(page);
  if (back.live) failures.push(`${label}: the compass listened to again on coming back, untapped`);

  if (path === "iphone") {
    // The iPhone's permission still pending when the page is left: once given, nothing listens.
    await page.evaluate(() => {
      window.__permission.answer = () => new Promise((resolve) => (window.__permission.give = resolve));
    });
    await press(page, "fengshui-home-compass-start");
    await page.waitForFunction(() => typeof window.__permission.give === "function", null, { timeout: 4000 });
    await goStudioPage(page, "fengshui");
    await page.getByTestId("fengshui").waitFor({ timeout: 20000 });
    await page.evaluate(() => window.__permission.give("granted"));
    await page.waitForTimeout(200);
    for (let i = 0; i < 4; i++) await orient(page, path);
    await page.waitForTimeout(200);
    const late = await orientState(page);
    if (late.live) failures.push(`${label}: the compass started after the page was left, its permission given late`);
    await goStudioPage(page, "fengshui-home");
    await page.getByTestId("fengshui-home").waitFor({ timeout: 20000 });
    // Stopped while the iPhone still asks (its Stop shows as soon as it asks): once given, nothing listens.
    await page.evaluate(() => {
      window.__permission.give = null;
      window.__permission.answer = () => new Promise((resolve) => (window.__permission.give = resolve));
    });
    await press(page, "fengshui-home-compass-start");
    await page.waitForFunction(() => typeof window.__permission.give === "function", null, { timeout: 4000 });
    await press(page, "fengshui-home-compass-stop");
    await page.evaluate(() => window.__permission.give("granted"));
    await page.waitForTimeout(200);
    for (let i = 0; i < 4; i++) await orient(page, path);
    await page.waitForTimeout(200);
    const stopped = await orientState(page);
    const shows = await page.getByTestId("fengshui-home-compass").getAttribute("data-state");
    if (stopped.live || shows !== "idle") failures.push(`${label}: stopped while its permission was asked, the compass ${stopped.live ? "listened once it was given" : `shows "${shows}"`}`);
    await page.evaluate(() => {
      window.__permission.answer = () => Promise.resolve("granted");
    });
  }
}

/** Every record of the private space as it lies in IndexedDB, its bytes read as text: nothing of the home may be legible. */
const rawSpace = (page) =>
  page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const r = indexedDB.open("ulune-space");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const text = (v) => {
      if (v == null) return "";
      if (typeof v === "string") return v;
      if (v instanceof ArrayBuffer) return new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(v));
      if (ArrayBuffer.isView(v)) return new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(v.buffer, v.byteOffset, v.byteLength));
      if (typeof v === "object" && !(v instanceof CryptoKey)) return Object.entries(v).map(([k, x]) => `${k}:${text(x)}`).join("|");
      return String(v);
    };
    const out = [];
    for (const store of Array.from(db.objectStoreNames)) {
      const all = await new Promise((resolve) => {
        const tx = db.transaction(store);
        const q = tx.objectStore(store).getAll();
        const k = tx.objectStore(store).getAllKeys();
        tx.oncomplete = () => resolve(k.result.map((key, i) => [String(key), q.result[i]]));
      });
      for (const [key, value] of all) out.push({ store, key, text: text(value) });
    }
    db.close();
    return out;
  });

/**
 * The Chinese pages at one width, in one language; on a phone, `compass`
 * says whose compass ("android", "iphone"); `space`: then a private space,
 * the home kept in it.
 */
async function chineseLeg({ width, lang, compass = null, space = false }) {
  const touch = width < 1024;
  const label = `chinese ${width} ${lang}${compass ? ` ${compass}` : ""}`;
  const failures = [];
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const context = await browser.newContext({ viewport: VIEWPORTS[width], hasTouch: touch, isMobile: touch });
  await context.addInitScript(spies, { iphone: compass === "iphone" });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const shown = [];
  page.on("framenavigated", (f) => {
    if (f === page.mainFrame()) shown.push(f.url());
  });
  const asked = [];
  let sent = [];
  let counted = 0;
  try {
    await gotoApp(page);
    if (lang === "fr") await setLang(page, "fr");
    await castFixture(page, FIXTURE_B);
    await castFixture(page, FIXTURE_A);
    // From here the pages work on the device: every request is noted.
    const storeBefore = await plainStorage(page);
    const dbsBefore = await databases(page);
    await page.evaluate(() => {
      window.__idb.writes.length = 0;
      window.__idb.opened.length = 0;
    });
    page.on("request", (r) => asked.push({ url: r.url(), body: r.postData() ?? "" }));
    sent = watchSent(page);

    // The first page by the language picker, the others by their lenses and sub-modes.
    await page.getByTestId("lang-button").click();
    await page.getByTestId("lang-card-chinese-astrology").click();
    for (const p of CHINESE_PAGES) {
      await goStudioPage(page, p.id);
      await page.getByTestId(p.figure).waitFor({ timeout: 20000 });
      for (const id of p.act ?? []) await press(page, id);
      if (p.slider) {
        await page.getByTestId(p.slider).evaluate((el) => {
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, "2000");
          el.dispatchEvent(new Event("input", { bubbles: true }));
        });
      }
      for (const id of p.read) await read(page, id, touch, `${label} ${p.id}`);
      await tableOf(page, p.table);
      await page.getByTestId(p.figure).waitFor({ timeout: 15000 });
    }

    // Feng Shui's Home: a facing (from a map, then a compass), the year, three rooms, a palace's reading, the table.
    await goStudioPage(page, "fengshui-home");
    await page.getByTestId("fengshui-home").waitFor({ timeout: 20000 });
    await page.getByTestId("fengshui-home-facing").fill(FACING);
    await page.getByTestId("fengshui-home-facing-card").waitFor({ state: "attached", timeout: 4000 });
    await press(page, "fengshui-home-source-map");
    await press(page, "fengshui-home-source-compass");
    await page.getByTestId("fengshui-home-year").fill(YEAR);
    await page.getByTestId("fengshui-stars").waitFor({ state: "attached", timeout: 4000 });
    await page.getByTestId("fengshui-rooms-grid").waitFor({ state: "attached", timeout: 4000 });
    for (const [palace, kind] of ROOMS) await page.getByTestId(`fengshui-rooms-add-${palace}`).selectOption(kind);
    if ((await page.locator("[data-testid^=fengshui-room-remove-]").count()) !== ROOMS.length) failures.push(`${label}: the rooms were not placed`);
    await read(page, "fengshui-stars-main-ne", touch, `${label} the north-east palace`);
    await read(page, "fengshui-home-facing-card", touch, `${label} the facing`);
    await tableOf(page, "fengshui-home-table");
    await page.getByTestId("fengshui-home").waitFor({ timeout: 15000 });
    if (compass) await compassOnPhone(page, compass, label, failures);
    else if (await page.getByTestId("fengshui-home-compass-start").count()) failures.push(`${label}: a compass button on a computer`);
    else if ((await orientState(page)).adds) failures.push(`${label}: the compass was listened to on a computer`);
    await page.waitForTimeout(500);

    // Plain storage: none of it, and only display settings changed.
    const before = new Map(storeBefore.map(([where, k, v]) => [`${where} ${k}`, v]));
    for (const [where, k, v] of await plainStorage(page)) {
      for (const w of found(`${k}=${v}`, CHINESE_WORDS)) failures.push(`${label}: ${where} "${k}" holds "${w}"`);
      if (before.get(`${where} ${k}`) !== v && !DISPLAY_KEYS.some((re) => re.test(k))) failures.push(`${label}: ${where} "${k}" changed: ${v.slice(0, 120)}`);
    }
    // No private space: nothing written to IndexedDB, no database made.
    const idb = await page.evaluate(() => window.__idb);
    if (idb.writes.length) failures.push(`${label}: written to IndexedDB without a space: ${JSON.stringify(idb.writes).slice(0, 300)}`);
    const dbsAfter = await databases(page);
    if (dbsAfter.sort().join() !== dbsBefore.sort().join() || dbsAfter.includes("ulune-space")) failures.push(`${label}: IndexedDB's databases ${dbsBefore} → ${dbsAfter}`);

    if (space) {
      // A private space, the home kept in it: sealed in fs/homes alone, nothing of it legible.
      await createSpace(page);
      await page.getByTestId("fengshui-keep-save").waitFor({ timeout: 10000 });
      await page.waitForFunction(() => document.querySelector("[data-testid=fengshui-keep-save]")?.disabled === false, null, { timeout: 8000 });
      await press(page, "fengshui-keep-save");
      await page.getByTestId("fengshui-keep-name").waitFor({ timeout: 8000 });
      await page.getByTestId("fengshui-keep-name").fill(HOME_NAME);
      await page.waitForTimeout(900);
      const rec = await readSpaceRecord(page, "fs/homes");
      const h = rec?.homes?.[0];
      const kinds = (h?.rooms ?? []).map((r) => `${r.palace}:${r.kind}`).sort().join();
      if (!h || h.name !== HOME_NAME || h.typed !== FACING || h.year !== YEAR || kinds !== ROOMS.map(([p, k]) => `${p}:${k}`).sort().join()) {
        failures.push(`${label}: the sealed home ${JSON.stringify(rec)?.slice(0, 300)}`);
      }
      const raw = await rawSpace(page);
      const holders = [];
      for (const r of raw) {
        for (const w of found(r.text, CHINESE_WORDS)) failures.push(`${label}: the space's ${r.store} "${r.key}" holds "${w}" in the clear`);
        if (r.store === "items") {
          const plain = JSON.stringify(await readSpaceRecord(page, r.key));
          if (found(plain, [HOME_NAME, FACING]).length) holders.push(r.key);
        }
      }
      if (holders.join() !== "fs/homes") failures.push(`${label}: the home is in the space's records ${holders.join(", ") || "none"}`);
      const writes = (await page.evaluate(() => window.__idb.writes)).filter((x) => x.db !== "ulune-space");
      if (writes.length) failures.push(`${label}: written outside the space: ${JSON.stringify(writes).slice(0, 300)}`);
      for (const [where, k, v] of await plainStorage(page)) {
        for (const w of found(`${k}=${v}`, CHINESE_WORDS)) failures.push(`${label}: with a space, ${where} "${k}" holds "${w}"`);
      }
    }
  } catch (e) {
    failures.push(`${label}: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    await browser.close();
  }

  sent.stop?.();
  for (const s of sent) failures.push(`${label}: sent ${s}`);
  for (const r of asked) {
    if (r.body) failures.push(`${label}: a request with a body: ${r.url.slice(0, 100)}`);
    for (const w of found(bareAddress(r.url), ADDRESS_WORDS)) failures.push(`${label}: a request's address carries "${w}": ${r.url.slice(0, 120)}`);
    counted += 1;
  }
  for (const u of shown) for (const w of found(bareAddress(u), ADDRESS_WORDS)) failures.push(`${label}: the page's address carries "${w}": ${u.slice(0, 120)}`);
  if (counted < 10) failures.push(`${label}: only ${counted} requests seen: the pages did not load their code?`);
  if (errors.length) failures.push(`${label}: ${errors.join(" | ")}`);
  if (!failures.length) console.log(`${label} OK: ${counted} requests, all the app's own files by GET${compass ? `; the compass (${compass}) listened to only once tapped, stopped when used and when left` : ""}${space ? "; the home sealed in fs/homes alone" : ""}`);
  return failures;
}

/* ------------------------------------------------- a chart shared by link (share plan, feature 1) */

/** What a shared chart must never show in the clear: the births, their names and places. */
const SHARE_WORDS = [...BIRTHS, "Paris", "Île-de-France", "12:00", "12%3A00"];

async function shareLeg() {
  const failures = [];
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  try {
    // The sender: Fixture A, its link from the share sheet.
    const sender = await browser.newContext({ viewport: VIEWPORTS[1280] });
    const sp = await sender.newPage();
    sp.setDefaultTimeout(20000);
    await gotoApp(sp);
    await castFixture(sp, FIXTURE_A);
    await openExport(sp);
    await sp.getByTestId("share-open").click();
    await sp.waitForFunction(() => /\/s#1\./.test(document.querySelector("[data-testid=share-link]")?.value ?? ""), null, { timeout: 10000 });
    const link = await sp.getByTestId("share-link").inputValue();
    await sender.close();
    for (const w of found(bareAddress(link), SHARE_WORDS)) failures.push(`share: the link carries "${w}"`);
    const fragment = link.slice(link.indexOf("#") + 1);

    for (const space of ["none", "locked"]) {
      const label = `share, ${space === "none" ? "no space" : "a locked space"}`;
      const context = await browser.newContext({ viewport: VIEWPORTS[1280] });
      await context.addInitScript(spies, { iphone: false });
      const page = await context.newPage();
      page.setDefaultTimeout(20000);
      const errors = [];
      page.on("pageerror", (e) => errors.push(String(e)));
      const shown = [];
      page.on("framenavigated", (f) => {
        if (f === page.mainFrame()) shown.push(f.url());
      });
      const asked = [];
      try {
        // Ulune opened once before (its display settings made), then the link.
        await gotoApp(page);
        // A shared computer's space: a new page finds it locked.
        if (space === "locked") await createSpace(page, PASSPHRASE, { shared: true });
        await page.evaluate(() => {
          window.__idb.writes.length = 0;
        });
        const storeBefore = await plainStorage(page);
        page.on("request", (r) => asked.push(r));
        await page.goto(link, { waitUntil: "load", timeout: 45000 });
        await page.waitForFunction(() => location.pathname === "/astrology", null, { timeout: 30000 });
        await page.getByTestId("studio-natal").waitFor({ timeout: 45000 });
        if (space === "locked") {
          await page.getByTestId("space-just-look").click({ timeout: 20000 });
          await page.getByTestId("toast").filter({ hasText: "when you unlock it" }).first().waitFor({ timeout: 15000 });
        } else {
          await page.getByTestId("share-note").waitFor({ timeout: 15000 });
        }
        await page.waitForTimeout(500);
        // Plain storage: none of it, and only display settings changed.
        const before = new Map(storeBefore.map(([where, k, v]) => [`${where} ${k}`, v]));
        for (const [where, k, v] of await plainStorage(page)) {
          for (const w of found(`${k}=${v}`, SHARE_WORDS)) failures.push(`${label}: ${where} "${k}" holds "${w}"`);
          if (before.get(`${where} ${k}`) !== v && !DISPLAY_KEYS.some((re) => re.test(k))) failures.push(`${label}: ${where} "${k}" changed: ${v.slice(0, 120)}`);
        }
        const idb = await page.evaluate(() => window.__idb);
        if (space === "none") {
          if (idb.writes.length) failures.push(`${label}: written to IndexedDB without a space: ${JSON.stringify(idb.writes).slice(0, 300)}`);
          if ((await databases(page)).includes("ulune-space")) failures.push(`${label}: a database was made`);
        } else {
          const inbox = idb.writes.filter((x) => x.db === "ulune-space" && x.store === "meta" && x.key.startsWith("in/"));
          if (inbox.length !== 1) failures.push(`${label}: ${inbox.length} charts sealed into the inbox`);
          const elsewhere = idb.writes.filter((x) => x.db !== "ulune-space");
          if (elsewhere.length) failures.push(`${label}: written outside the space: ${JSON.stringify(elsewhere).slice(0, 300)}`);
          for (const r of await rawSpace(page)) for (const w of found(r.text, SHARE_WORDS)) failures.push(`${label}: the space's ${r.store} "${r.key}" holds "${w}" in the clear`);
        }
      } catch (e) {
        failures.push(`${label}: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        await context.close();
      }
      // Every request: the app's own files by GET, or the cast with a date, a time and coordinates; never the fragment.
      let casts = 0;
      for (const r of asked) {
        const body = r.postData() ?? "";
        if (r.url().includes(fragment.slice(2, 30)) || body.includes(fragment.slice(2, 30))) failures.push(`${label}: a request carries the link's fragment`);
        const why = notAppFile(r);
        if (!why) continue;
        if (isServerFn(r.url()) && decodeFnName(r.url()).startsWith("castChart")) {
          casts += 1;
          const said = body.split("Europe/Paris").join("");
          for (const w of found(said, [FIXTURE_A.name, "Paris", "Île-de-France"])) failures.push(`${label}: the cast carries "${w}"`);
          if (/"name"|"placeLabel"|"birthName"|"chineseCount"/.test(body)) failures.push(`${label}: the cast carries a name or place field`);
          continue;
        }
        failures.push(`${label}: sent ${why}`);
      }
      if (casts !== 1) failures.push(`${label}: ${casts} casts, not one`);
      // The address bar: the fragment only as the page opens, then gone; no address shows the birth.
      const at = shown.findIndex((u) => u.includes("#"));
      const after = shown.slice(at + 1).filter((u) => u !== shown[at]);
      if (at < 0 || !after.length || after.some((u) => u.includes("#"))) failures.push(`${label}: the address bar kept the fragment: ${JSON.stringify(after.map((u) => u.slice(0, 40)))}`);
      for (const u of shown) for (const w of found(bareAddress(u), ADDRESS_WORDS)) failures.push(`${label}: the page's address carries "${w}": ${u.slice(0, 60)}`);
      if (errors.length) failures.push(`${label}: ${errors.join(" | ")}`);
      if (!failures.some((f) => f.startsWith(label))) console.log(`${label} OK: ${asked.length} requests (${casts} cast, no name or place), nothing readable stored, the fragment read and gone`);
    }
  } catch (e) {
    failures.push(`share: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    await browser.close();
  }
  return failures;
}

const failed = [];
const only = process.argv.includes("--chinese") ? "chinese" : process.argv.includes("--share") ? "share" : null;
if (!only) {
  try {
    await run();
  } catch (e) {
    failed.push(e instanceof Error ? e.message : String(e));
  }
}
if (!only || only === "chinese") {
  for (const leg of [
    { width: 1280, lang: "en", space: true },
    { width: 390, lang: "en", compass: "android" },
    { width: 390, lang: "fr", compass: "iphone" },
  ]) {
    failed.push(...(await chineseLeg(leg)));
  }
}
if (!only || only === "share") failed.push(...(await shareLeg()));
if (failed.length) {
  console.error(`PRIVACY FAIL\n- ${failed.join("\n- ")}`);
  process.exit(1);
}
console.log("PRIVACY OK");
