import { readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { fromJSON } from "seroval";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
export const SHOTS = join(ROOT, "screenshots/e2e");
export const DEV = process.env.ULUNE_DEV || "http://127.0.0.1:8097";
/** AI readings are on in this version (src/lib/features.ts); off in 1.0, so the suites check they are gone. */
export const AI_ON = /export const AI_ENABLED = true;/.test(readFileSync(join(ROOT, "src/lib/features.ts"), "utf8"));

export const VIEWPORTS = {
  390: { width: 390, height: 844 },
  768: { width: 768, height: 1024 },
  1280: { width: 1280, height: 900 },
};

/** Plan §4.7 Fixture A */
export const FIXTURE_A = {
  name: "TraceQA",
  date: "15/06/1990",
  time: "12:00",
  place: "Paris, France",
};

/** Plan §4.7 Fixture B */
export const FIXTURE_B = {
  name: "Sample B",
  date: "03/11/1987",
  time: "23:10",
  place: "Oslo, Norway",
};

export async function launch(size) {
  const viewport = typeof size === "number" ? VIEWPORTS[size] : size;
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage({ viewport });
  page.setDefaultTimeout(20000);
  return { browser, page };
}

export async function gotoApp(page, path = "/") {
  await page.goto(`${DEV}${path}`, { waitUntil: "load", timeout: 45000 });
  await page.waitForSelector("html.theme-ready", { timeout: 20000 });
}

/** Language, theme, settings and sign-in live in the account menu. */
export async function openMenu(page) {
  const panel = page.getByTestId("account-menu-panel");
  if (await panel.isVisible().catch(() => false)) return;
  await page.getByTestId("account-menu").click();
  await panel.waitFor({ timeout: 8000 });
}

export async function closeMenu(page) {
  const panel = page.getByTestId("account-menu-panel");
  if (!(await panel.isVisible().catch(() => false))) return;
  await page.keyboard.press("Escape");
  await panel.waitFor({ state: "hidden", timeout: 8000 });
}

export async function setLang(page, code) {
  await openMenu(page);
  await page.getByTestId(`lang-${code}`).click();
  await page.waitForFunction((c) => document.documentElement.lang === c, code, { timeout: 8000 });
  await closeMenu(page);
}

export async function ensureTheme(page, mode) {
  const wantLight = mode === "light";
  const isLight = await page.evaluate(() => document.documentElement.classList.contains("light"));
  if (isLight === wantLight) return;
  await openMenu(page);
  await page.getByTestId(wantLight ? "theme-light" : "theme-dark").click();
  await page.waitForFunction(
    (light) => document.documentElement.classList.contains("light") === light,
    wantLight,
    { timeout: 8000 },
  );
  await closeMenu(page);
}

/** Chart removal is an inline two-step confirm in the chart menu. */
export async function removeActiveChart(page) {
  const picker = page.getByTestId("chart-picker");
  if (!(await picker.isVisible().catch(() => false))) await page.getByTestId("chart-chip").click();
  await page.getByTestId("chart-remove").click();
  await page.getByTestId("chart-remove-confirm").click();
}

export async function assertNoOverflow(page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  if (overflow) throw new Error("horizontal overflow");
}

export async function pickPlace(page, query) {
  await page.locator("#birth-place").fill(query);
  const list = page.locator("#birth-place-list [role=option] button");
  try {
    await list.first().waitFor({ timeout: 12000 });
    await list.first().click();
    return;
  } catch {
    await page.locator("#birth-place").press("Enter");
  }
}

export async function castFixture(page, fixture) {
  await page.waitForSelector("#birth-date, [data-testid=chart-chip]", { timeout: 20000 });
  // A private space open here seals the chart a moment after the cast
  // (space-sync.ts): note its library now, to wait for the new chart below.
  const spaced = (await databases(page)).includes("ulune-space");
  const libraryBefore = spaced ? JSON.stringify(await readSpaceRecord(page, "state/library").catch(() => null)) : "";
  const natal = await page.getByTestId("studio-natal").count();
  if (natal) {
    const picker = page.getByTestId("chart-picker");
    if (!(await picker.isVisible().catch(() => false))) {
      await page.getByTestId("chart-chip").click();
    }
    await page.getByTestId("new-chart").click();
    await page.waitForSelector("#birth-date", { timeout: 8000 });
  }
  await page.locator("#native-name").fill(fixture.name);
  // Numerology's names (part 64), when the fixture has them.
  if (fixture.birthName || fixture.currentName) {
    const names = page.getByTestId("birth-names");
    if (!(await names.evaluate((el) => el.open))) await names.locator("summary").click();
    if (fixture.birthName) await page.locator("#birth-full-name").fill(fixture.birthName);
    if (fixture.currentName) await page.locator("#birth-current-name").fill(fixture.currentName);
  }
  await page.locator("#birth-date").fill(fixture.date);
  await page.locator("#birth-time").fill(fixture.time);
  await pickPlace(page, fixture.place);
  await page.getByTestId("cast-submit").click();
  await page.getByTestId("studio-natal").waitFor({ timeout: 45000 });
  // With a space, a reload right after the cast must find the chart kept.
  if (spaced) {
    const until = Date.now() + 8000;
    while (Date.now() < until) {
      const now = JSON.stringify(await readSpaceRecord(page, "state/library").catch(() => null));
      if (now !== libraryBefore && now !== "null") break;
      await page.waitForTimeout(100);
    }
  }
}

export async function pointsTableText(page) {
  const table = page.locator(
    "[data-testid=table-points], [data-testid=natal-table], [data-testid=studio-table]",
  );
  await table.first().waitFor({ timeout: 15000 });
  // The table view is its own download: wait for it rather than its stand-in.
  await page.waitForFunction(() => !document.querySelector("[data-testid=table-loading]"), null, {
    timeout: 15000,
  });
  // The table page holds every part at once: read the points alone when they are there.
  const points = page.locator("[data-testid=table-points]");
  if (await points.count()) return points.first().innerText();
  return table.first().innerText();
}

export async function clickDockTab(page, id) {
  // The Data tab merged into the stage's Table view.
  if (id === "data") {
    await setView(page, "table");
    return;
  }
  // Leaving "data" returns the stage to the wheel, as the old dock tab did.
  const table = page.getByTestId("view-table");
  if ((await table.count()) && (await table.getAttribute("aria-pressed")) === "true") {
    await setView(page, "wheel");
  }
  // New charts and partners fill in on the stage; the panel is hidden then.
  if (id === "birth" && (await page.locator("[data-on-stage]").count())) return;
  const testId = `dock-tab-${id}`;
  await page.getByTestId(testId).waitFor({ state: "attached", timeout: 8000 });
  // "Show this tab": on compact, tapping the tab that is already open closes the sheet.
  const shown = await page.evaluate((tid) => {
    const tab = document.querySelector(`[data-testid="${tid}"]`);
    const dock = document.querySelector("[data-testid=dock]");
    return (
      tab?.getAttribute("aria-selected") === "true" &&
      dock?.getAttribute("data-dock-open") === "true"
    );
  }, testId);
  if (shown) return;
  await page.evaluate((tid) => {
    const el = document.querySelector(`[data-testid="${tid}"]`);
    if (el instanceof HTMLElement) el.click();
  }, testId);
}

const MODE_GROUP = {
  natal: "chart",
  transits: "time",
  timing: "time",
  progressions: "time",
  synastry: "pair",
  composite: "pair",
  design: "systems",
  numerology: "systems",
};

export async function goStudioPage(page, id) {
  // Wheel/table is a sticky preference now; mode tests start from the wheel.
  const table = page.getByTestId("view-table");
  if ((await table.count()) && (await table.getAttribute("aria-pressed")) === "true") {
    await setView(page, "wheel");
  }
  const groupId = `mode-group-${MODE_GROUP[id]}`;
  const pageId = `studio-page-${id}`;
  await page.evaluate((gid) => {
    const el = document.querySelector(`[data-testid="${gid}"]`);
    if (el instanceof HTMLElement) el.click();
  }, groupId);
  // The switch lands a frame or two later (the bars answer at once, the page
  // is drawn two frames on, once its code is here): wait until it has.
  const landed = async (sel) => {
    await page
      .waitForFunction(
        (s) => Boolean(document.querySelector(s)) && !document.querySelector("[data-testid=studio-nav][data-pending]"),
        sel,
        { timeout: 8000 },
      )
      .catch(() => {});
  };
  // One-mode groups (Chart) have no sub-mode switch: the group tab is the mode.
  if (Object.values(MODE_GROUP).filter((g) => g === MODE_GROUP[id]).length === 1) {
    await landed(`[data-testid="${groupId}"][aria-selected="true"]`);
    return;
  }
  await page.getByTestId(pageId).waitFor({ state: "attached", timeout: 8000 });
  await page.evaluate((pid) => {
    const el = document.querySelector(`[data-testid="${pid}"]`);
    if (el instanceof HTMLElement) el.click();
  }, pageId);
  await landed(`[data-testid="${pageId}"]:is([aria-selected="true"], [aria-pressed="true"], [aria-current])`);
}

/**
 * The first position printed after `label` (DD°MM′ or DD°MM′SS″), in degrees
 * within its sign — or null.
 */
function positionAfter(text, label) {
  const at = text.search(label);
  if (at < 0) return null;
  const m = /(\d{1,2})°(\d{2})['′](?:(\d{2})["″])?/.exec(text.slice(at, at + 120));
  return m ? Number(m[1]) + Number(m[2]) / 60 + Number(m[3] ?? 0) / 3600 : null;
}

export async function assertFixtureA(page) {
  const wasWheel = (await page.getByTestId("view-table").getAttribute("aria-pressed")) !== "true";
  if (wasWheel) await setView(page, "table");
  const text = (await pointsTableText(page)).replace(/\s+/g, " ");
  const miss = [];
  // The QA reading is to the minute; the table prints seconds (Moon 14°14′45″ ≈ 14°15′).
  const within = (got, deg, min) => got != null && Math.abs(got - (deg + min / 60)) <= 1 / 60 + 1e-9;
  if (!within(positionAfter(text, /Sun/), 24, 3) || !/Gemini/.test(text)) miss.push("Sun 24°03′ Gemini");
  if (!within(positionAfter(text, /Moon/), 14, 15) || !/Pisces/.test(text)) miss.push("Moon 14°15′ Pisces");
  if (!within(positionAfter(text, /\b(ASC|Ascendant)\b/), 5, 9) || !/Virgo/.test(text)) miss.push("ASC 5°09′ Virgo");
  if (miss.length)
    throw new Error(`Fixture A missing: ${miss.join("; ")} in ${text.slice(0, 400)}`);
  if (wasWheel) await setView(page, "wheel");
}

export async function ensureShotsDir() {
  await mkdir(SHOTS, { recursive: true });
}

/* ------------------------------------------------------- private space */

export const PASSPHRASE = "correct horse battery staple";

/** Sign in for the first time with a passphrase; returns the recovery code shown. */
export async function createSpace(page, pass = PASSPHRASE, { shared = false } = {}) {
  await page.getByTestId("space-button").waitFor({ timeout: 20000 });
  await page.waitForFunction(() => document.querySelector("[data-testid=space-button]")?.getAttribute("data-space") === "none", null, { timeout: 20000 });
  await page.getByTestId("space-button").click();
  await page.getByTestId("space-use-passphrase").waitFor({ timeout: 45000 });
  // Unticked, the space stays signed in on this device (part 88); ticked, it locks when Ulune closes.
  if (shared) await page.getByTestId("space-shared").check();
  await page.getByTestId("space-use-passphrase").click();
  await page.getByTestId("space-pass").fill(pass);
  await page.getByTestId("space-pass-again").fill(pass);
  await page.getByTestId("space-create").click();
  await page.getByTestId("space-code").waitFor({ timeout: 30000 });
  const code = (await page.getByTestId("space-code").innerText()).trim();
  await page.getByTestId("space-code-kept").check();
  await page.getByTestId("space-done").click();
  await page.getByTestId("space-sheet").waitFor({ state: "detached", timeout: 8000 });
  await page.waitForFunction(() => document.querySelector("[data-testid=space-button]")?.getAttribute("data-space") === "open", null, { timeout: 8000 });
  return code;
}

/** The unlock sheet (asked on arrival, or opened here): unlock with the passphrase. */
export async function unlockSpace(page, pass = PASSPHRASE) {
  const sheet = page.getByTestId("space-sheet");
  if (!(await sheet.isVisible().catch(() => false))) {
    await page.waitForFunction(() => document.querySelector("[data-testid=space-button]")?.getAttribute("data-space") === "locked", null, { timeout: 20000 });
    await page.getByTestId("space-button").click();
  }
  await page.getByTestId("space-unlock-pass").fill(pass, { timeout: 45000 });
  await page.getByTestId("space-unlock").click();
  await sheet.waitFor({ state: "detached", timeout: 20000 });
  await page.waitForFunction(() => document.querySelector("[data-testid=space-button]")?.getAttribute("data-space") === "open", null, { timeout: 8000 });
}

/**
 * When the space locks (Settings → Private space), then back to the studio.
 * Through the page's own links: loading an address anew would lock a space
 * that locks when Ulune closes.
 */
export async function setSpaceLock(page, mode) {
  await page.getByTestId("space-button").click();
  await page.getByTestId("space-your-data").click();
  await page.getByTestId("settings-space").waitFor({ timeout: 20000 });
  await page.getByTestId(`space-lock-${mode}`).check({ timeout: 20000 });
  // Saved when the page's flag says so (lib/space/flag.ts).
  await page.waitForFunction((m) => localStorage.getItem("ulune.space") === (m === "stay" ? "stay" : "locked"), mode, {
    timeout: 8000,
  });
  await page.getByTestId("back-to-studio").click();
  await page.waitForURL((u) => u.pathname === "/", { timeout: 20000 });
}

/**
 * A record of the private space, read as the page itself can while the space
 * stays unlocked on this device (with the key the browser keeps), or null.
 */
export async function readSpaceRecord(page, key) {
  return page.evaluate(async (k) => {
    const db = await new Promise((resolve, reject) => {
      const r = indexedDB.open("ulune-space");
      r.onupgradeneeded = () => r.transaction.abort();
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    }).catch(() => null);
    if (!db) return null;
    const get = (store, id) =>
      new Promise((resolve) => {
        const q = db.transaction(store).objectStore(store).get(id);
        q.onsuccess = () => resolve(q.result ?? null);
        q.onerror = () => resolve(null);
      });
    const [meta, rec, key] = [await get("meta", "space"), await get("items", k), await get("device", "stay")];
    db.close();
    if (!meta || !rec || !key) return null;
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: rec.iv, additionalData: new TextEncoder().encode(`ulune/space/v1/item/${meta.id}/${k}`) },
      key,
      rec.ct,
    );
    return JSON.parse(new TextDecoder().decode(plain));
  }, key);
}

/** The names of this browser's IndexedDB databases. */
export async function databases(page) {
  return page.evaluate(async () => (await indexedDB.databases()).map((d) => d.name));
}

/**
 * Charts kept across reloads, as a reader who signed in and chose "stay
 * unlocked on this device" has them: a private space, opened by itself on
 * every load. For suites that reload or open an address with a chart.
 */
export async function keepCharts(page) {
  await createSpace(page);
  await setSpaceLock(page, "stay");
}

/** The server function a request goes to (its id names it). */
export function serverFnName(url) {
  const id = url.split("/_serverFn/")[1]?.split("?")[0] ?? "";
  try {
    return JSON.parse(Buffer.from(id, "base64url").toString("utf8")).export ?? "";
  } catch {
    return "";
  }
}

/** The next cast's answer ({ chart, timeUnknown }), decoded as the page receives it. */
export function nextCastAnswer(page) {
  return new Promise((resolve) => {
    const on = async (r) => {
      if (!serverFnName(r.url()).startsWith("castChart")) return;
      try {
        // The answer is one seroval node, wrapped as its JSON form wants.
        const value = fromJSON({ t: JSON.parse(await r.text()), f: 127, m: [] });
        if (!value?.result?.chart) return;
        page.off("response", on);
        resolve(value.result);
      } catch {
        /* not this one */
      }
    };
    page.on("response", on);
  });
}

/** A chart as versions before the private space kept it in the clear (orbis.charts.v1). */
export function legacyRow(answer, { id, name, place = "Paris, Île-de-France, France", savedAt = 1 }) {
  const chart = { ...answer.chart, meta: { ...answer.chart.meta, name, placeLabel: place } };
  return {
    id,
    input: {
      name,
      date: chart.meta.date,
      time: chart.meta.time,
      latitude: chart.meta.latitude,
      longitude: chart.meta.longitude,
      placeLabel: place,
      houseSystem: "placidus",
    },
    chart,
    grok: null,
    timeUnknown: false,
    savedAt,
  };
}

/** Opens the fields to type a moment in from a time dial's readout (UI plan, part 94). */
export async function openTimePicker(page, dial = "transit-scrubber", picker = "transit-clock") {
  if (await page.getByTestId(picker).isVisible().catch(() => false)) return;
  // On a phone the dial's head waits under a raised sheet: lower it first.
  const raised = await page.evaluate(() => {
    const d = document.querySelector(".ob-panel")?.getAttribute("data-detent");
    return matchMedia("(max-width: 1023.98px)").matches && Boolean(d && d !== "peek");
  });
  if (raised) {
    // Tapping the tab that is open closes the sheet (Dock.tsx).
    await page.evaluate(() => {
      const tab = document.querySelector('[data-testid^="dock-tab-"][aria-selected="true"]');
      if (tab instanceof HTMLElement) tab.click();
    });
    await page.waitForFunction(() => document.querySelector(".ob-panel")?.getAttribute("data-detent") === "peek", null, { timeout: 4000 });
  }
  // The sheet takes a moment to fold; the dial's head comes back once it has.
  await page.getByTestId(`${dial}-readout`).waitFor({ state: "visible", timeout: 8000 });
  await page.waitForFunction(() => !document.querySelector(".ob-panel[data-moving]"), null, { timeout: 4000 }).catch(() => {});
  await page.getByTestId(`${dial}-readout`).click();
  await page.getByTestId(picker).waitFor({ timeout: 8000 });
}

/** Opens the Calendar's View menu (its clock and its two switches, part 93). */
export async function openCalendarView(page) {
  if (await page.getByTestId("calendar-view-pop").isVisible().catch(() => false)) return;
  await page.getByTestId("calendar-view").click();
  await page.getByTestId("calendar-view-pop").waitFor({ timeout: 8000 });
}

/** Wheel or Table: the toolbar's switch on a computer, the ⋯ menu's on a phone (part 96). */
export async function setView(page, view) {
  const direct = page.getByTestId(`view-${view}`);
  if (await direct.isVisible().catch(() => false)) {
    await direct.click();
    return;
  }
  await page.getByTestId("stage-more").click();
  await page.getByTestId(`more-view-${view}`).click();
  await page.getByTestId("stage-more-menu").waitFor({ state: "detached", timeout: 4000 }).catch(() => {});
}

/** Opens Export (a computer) or ⋯ (a phone), where the page's ways out are (parts 93, 96, 97). */
export async function openExport(page) {
  const menu = page.getByTestId("export-menu");
  const more = page.getByTestId("stage-more");
  const open = async (el) => (await el.getAttribute("aria-expanded").catch(() => null)) === "true";
  if ((await open(menu)) || (await open(more))) return;
  // A menu just closed may still be fading out: let it go first.
  await page.getByTestId("export-panel").waitFor({ state: "detached", timeout: 4000 }).catch(() => {});
  if (await menu.isVisible().catch(() => false)) await menu.click();
  else await page.getByTestId("stage-more").click();
  await page.getByTestId("export-panel").waitFor({ timeout: 8000 });
}
