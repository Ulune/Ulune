/*
 * "You two, now" on astrology's Relationship pages (share and compare plan,
 * feature 5e), at 1280 px in English and 390 px in French on a touch screen,
 * with two made-up charts (Fixture B, then Fixture A shown):
 *   - Synastry: under the side panel's first read, today's sky over the two
 *     people's composite: the heading "You two, now" (« Vous deux,
 *     maintenant »), today's date, at most six contacts, the slow planets
 *     first, each a major aspect of a moving planet (never the Moon) to the
 *     relationship's chart within 2° (the slow ones) or 1° (the fast ones);
 *     the date opens the part's reading, a row its own;
 *   - the table: a "You two, now" part with the same contacts, in Copy and
 *     in CSV;
 *   - Composite: the same part on the composite chart, then (at 1280) on the
 *     Davison chart, its reading said for it;
 *   - the sky cast on the device: nothing sent beyond the app's own files;
 *     nothing scrolls sideways; no page error.
 * Today's sky changes from day to day, so the contacts are held to the
 * part's rules rather than to a list (scripts/pair-now.test.mjs checks a
 * fixed moment against the engine).
 */
import { join } from "node:path";
import { chromium } from "playwright";
import { FIXTURE_A, FIXTURE_B, SHOTS, VIEWPORTS, assertNoOverflow, castFixture, clickDockTab, ensureShotsDir, goStudioPage, gotoApp, openExport, setLang, setView } from "./_lib.mjs";
import { watchSent } from "./_sent.mjs";

const MOVERS = ["pluto", "neptune", "uranus", "saturn", "chiron", "jupiter", "northnode", "mars", "sun", "venus", "mercury"];
const SLOW = new Set(MOVERS.slice(0, 7));
const POINTS = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "ascendant", "midheaven"];
const REF = new RegExp(`^two:asp:(${MOVERS.join("|")}):(conjunction|sextile|square|trine|opposition):(${POINTS.join("|")})$`);

const WORDS = {
  en: {
    head: "You two, now",
    today: /^Today, \d{1,2} \p{L}+ \d{4}$/u,
    phrase: /^\p{L}+(?: \p{L}+)? (?:conjunct|opposite|square|trine|sextile) the relationship’s \p{L}+(?: \p{L}+)?$/u,
    onComposite: "On the composite chart",
    onDavison: "On the Davison chart",
    rel: "The relationship’s",
    colon: ": ",
    csvHead: "now,at,moving,type,point,orb,applying,exactUtc",
  },
  fr: {
    head: "Vous deux, maintenant",
    today: /^Aujourd’hui, \d{1,2} \p{L}+ \d{4}$/u,
    phrase: /^\p{L}+(?: \p{L}+)? en (?:conjonction|opposition|carré|trigone|sextile) (?:au |aux |à |avec )[\p{L}’ ]+ de la relation$/u,
    onComposite: "Sur le thème composite",
    onDavison: "Sur le thème Davison",
    rel: "de la relation",
    colon: " : ",
    csvHead: "now;at;moving;type;point;orb;applying;exactUtc",
  },
};

const note = (page) => page.getByTestId("click-note").evaluate((e) => e.textContent ?? "").catch(() => "");
async function waitNote(page, text, label, what) {
  await page.waitForFunction((t) => document.querySelector("[data-testid=click-note]")?.textContent?.includes(t), text, { timeout: 10000 }).catch(async () => {
    throw new Error(`${label}: ${what} "${(await note(page)).slice(0, 300)}"`);
  });
}

async function csvOf(page) {
  const [download] = await Promise.all([page.waitForEvent("download", { timeout: 8000 }), openExport(page).then(() => page.getByTestId("table-csv").click())]);
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  if (!text.startsWith("﻿")) throw new Error("CSV without its byte-order mark");
  return text.slice(1).replace(/\r\n/g, "\n");
}

/** The part as drawn: its heading, its date, its rows (or the quiet sky). */
async function partOf(page, id) {
  await page.getByTestId(id).waitFor({ state: "attached", timeout: 30000 });
  // Today's sky comes through the door (on this device): the rows, or the quiet line, once it is cast.
  await page.waitForFunction((t) => document.querySelector(`[data-testid=${t}-list], [data-testid=${t}-quiet], [data-testid=${t}-error]`), id, { timeout: 45000 });
  return page.evaluate((t) => {
    const root = document.querySelector(`[data-testid=${t}]`);
    return {
      head: root.querySelector("h3")?.textContent ?? "",
      when: root.querySelector(`[data-testid=${t}-when]`)?.textContent ?? "",
      error: root.querySelector(`[data-testid=${t}-error]`)?.textContent ?? "",
      quiet: Boolean(root.querySelector(`[data-testid=${t}-quiet]`)),
      rows: [...root.querySelectorAll(`[data-testid=${t}-row]`)].map((r) => ({
        ref: r.getAttribute("data-ref"),
        slow: r.getAttribute("data-slow") === "1",
        chart: r.getAttribute("data-chart"),
        title: r.querySelector(".ulune-two-now-title")?.textContent ?? "",
        sub: r.querySelector(".ulune-two-now-sub")?.textContent ?? "",
        h: r.getBoundingClientRect().height,
      })),
    };
  }, id);
}

/** The part held to its rules. */
function check(part, w, label, touch) {
  if (part.error) throw new Error(`${label}: today's sky could not be read: ${part.error}`);
  if (part.head !== w.head) throw new Error(`${label}: the heading "${part.head}"`);
  if (!w.today.test(part.when)) throw new Error(`${label}: the date "${part.when}"`);
  if (!part.quiet && !part.rows.length) throw new Error(`${label}: neither rows nor a quiet sky`);
  if (part.rows.length > 6) throw new Error(`${label}: ${part.rows.length} contacts (six at most)`);
  let last = -1;
  for (const r of part.rows) {
    const m = REF.exec(r.ref ?? "");
    if (!m) throw new Error(`${label}: a row "${r.ref}"`);
    const rank = MOVERS.indexOf(m[1]);
    if (rank < last) throw new Error(`${label}: the slow planets do not come first ${part.rows.map((x) => x.ref)}`);
    last = rank;
    if (r.slow !== SLOW.has(m[1])) throw new Error(`${label}: ${r.ref} marked ${r.slow ? "slow" : "fast"}`);
    const orb = /^(\d+)°(\d\d)'/.exec(r.sub);
    if (!orb) throw new Error(`${label}: ${r.ref}'s line "${r.sub}"`);
    if (Number(orb[1]) + Number(orb[2]) / 60 > (SLOW.has(m[1]) ? 2 : 1) + 1 / 120) throw new Error(`${label}: ${r.ref}'s orb ${orb[0]}`);
    if (!w.phrase.test(r.title)) throw new Error(`${label}: ${r.ref} said "${r.title}"`);
    if (r.h < (touch ? 44 : 24)) throw new Error(`${label}: ${r.ref} ${Math.round(r.h)} px tall`);
  }
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
  /** The side panel's first read: on a phone, the sheet's Reading tab. */
  const hello = async () => {
    await page.keyboard.press("Escape").catch(() => {});
    await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
    await page.waitForFunction(() => !document.querySelector("[data-testid=click-note]"), null, { timeout: 4000 }).catch(() => {});
    if (touch) await clickDockTab(page, "reading");
  };
  const press = async (locator) => {
    await locator.evaluate((e) => e.scrollIntoView({ block: "center" }));
    if (touch) await locator.tap();
    else await locator.click();
  };
  try {
    await gotoApp(page);
    if (lang === "fr") await setLang(page, "fr");
    await castFixture(page, FIXTURE_B);
    await castFixture(page, FIXTURE_A);
    // Nothing but the app's own files, by GET, from here (_sent.mjs): today's sky is cast on the device.
    const sent = watchSent(page);

    // ── Synastry: today's sky over the two people's composite ──
    await goStudioPage(page, "synastry");
    await page.getByTestId("synastry-ring").waitFor({ timeout: 45000 });
    await hello();
    const part = await partOf(page, "synastry-now");
    check(part, w, `${label} synastry`, touch);
    if (part.rows.some((r) => r.chart !== "composite")) throw new Error(`${label}: Synastry's rows not on the composite ${part.rows.map((r) => r.chart)}`);
    await assertNoOverflow(page);
    await page.getByTestId("synastry-now").evaluate((e) => e.scrollIntoView({ block: "center" }));
    await page.screenshot({ path: join(SHOTS, `pair-now-synastry-${lang}-${width}.png`) }).catch(() => {});

    // The date opens the part's reading; a row its own.
    await press(page.getByTestId("synastry-now-when"));
    await waitNote(page, w.onComposite, label, "the part's reading");
    const title = await page.locator("[data-testid=click-note] .ob-rc-title").first().textContent();
    if (title !== w.head) throw new Error(`${label}: the part's reading is titled "${title}"`);
    if (part.rows.length) {
      await hello();
      await press(page.locator("[data-testid=synastry-now-row]").first());
      await waitNote(page, w.rel, label, "a contact's reading");
      const t = await page.locator("[data-testid=click-note] .ob-rc-title").first().textContent();
      if (t !== part.rows[0].title) throw new Error(`${label}: the contact's reading is titled "${t}", its row "${part.rows[0].title}"`);
      if (!(await note(page)).includes(w.onComposite)) throw new Error(`${label}: the contact's reading does not say its chart`);
    }
    await hello();

    // ── The table: its "You two, now" part, in Copy and CSV ──
    await setView(page, "table");
    await page.getByTestId("synastry-table").waitFor({ timeout: 15000 });
    await page.getByTestId("table-now").waitFor({ timeout: 15000 });
    await page.waitForFunction(() => !document.querySelector("[data-testid=pair-now-table-loading]"), null, { timeout: 30000 });
    const tableRows = await page.locator("[data-testid=pair-now-table-row]").evaluateAll((els) => els.map((e) => e.getAttribute("data-ref")));
    if (tableRows.join() !== part.rows.map((r) => r.ref).join()) throw new Error(`${label}: the table's contacts ${tableRows} against ${part.rows.map((r) => r.ref)}`);
    const parts = await page.locator("[data-testid=synastry-table] [data-testid=table-page] > section").evaluateAll((els) => els.map((el) => el.getAttribute("data-testid")));
    if (parts[parts.length - 1] !== "table-now") throw new Error(`${label}: the table's parts ${parts}`);
    await assertNoOverflow(page);
    await page.screenshot({ path: join(SHOTS, `pair-now-table-${lang}-${width}.png`) }).catch(() => {});
    const csv = await csvOf(page);
    if (!csv.split("\n").includes(w.csvHead)) throw new Error(`${label}: the CSV lacks the part's header ${w.csvHead}`);
    if (csv.split("\n").filter((l) => /^now[,;]\d{4}-/.test(l)).length !== part.rows.length) throw new Error(`${label}: the CSV's contacts`);
    await openExport(page);
    await page.getByTestId("table-copy").click();
    await page.waitForTimeout(300);
    const copied = await page.evaluate(() => navigator.clipboard.readText()).catch(() => "");
    if (!copied.includes(`${w.head}${w.colon}${part.when}`)) throw new Error(`${label}: Copy lacks the part "${copied.slice(-400)}"`);
    for (const r of part.rows) if (!copied.includes(r.title)) throw new Error(`${label}: Copy lacks "${r.title}"`);
    await page.keyboard.press("Escape").catch(() => {});
    await setView(page, "wheel");

    // ── Composite: the same part on the relationship's chart shown ──
    await goStudioPage(page, "composite");
    await page.getByTestId("composite-wheel").waitFor({ timeout: 30000 });
    await hello();
    const comp = await partOf(page, "composite-now");
    check(comp, w, `${label} composite`, touch);
    // The composite is the one Synastry reads: the same contacts.
    if (comp.rows.map((r) => r.ref).join() !== part.rows.map((r) => r.ref).join()) throw new Error(`${label}: Composite's contacts ${comp.rows.map((r) => r.ref)} against Synastry's ${part.rows.map((r) => r.ref)}`);
    if (!touch) {
      // The Davison chart: its own sky, its own reading.
      await page.getByTestId("relationship-button").click();
      await page.getByTestId("relationship-davison").click();
      await page.keyboard.press("Escape").catch(() => {});
      await page.waitForFunction(() => {
        const rows = [...document.querySelectorAll("[data-testid=composite-now-row]")];
        return document.querySelector("[data-testid=composite-wheel]")?.getAttribute("data-kind") === "davison" && (rows.length ? rows.every((r) => r.getAttribute("data-chart") === "davison") : Boolean(document.querySelector("[data-testid=composite-now-quiet]")));
      }, null, { timeout: 45000 });
      const dav = await partOf(page, "composite-now");
      check(dav, w, `${label} Davison`, touch);
      await press(page.getByTestId("composite-now-when"));
      await waitNote(page, w.onDavison, label, "the Davison's part");
      await hello();
      await page.getByTestId("relationship-button").click();
      await page.getByTestId("relationship-composite").click();
      await page.keyboard.press("Escape").catch(() => {});
      await page.waitForFunction(() => document.querySelector("[data-testid=composite-wheel]")?.getAttribute("data-kind") === "composite", null, { timeout: 15000 });
    }
    await assertNoOverflow(page);
    await page.screenshot({ path: join(SHOTS, `pair-now-composite-${lang}-${width}.png`) }).catch(() => {});

    if (sent.length) throw new Error(`${label}: sent ${sent.join(", ")}`);
    if (errors.length) throw new Error(`${label}: ${errors.join(" | ")}`);
    console.log(`pair-now ${label} OK (${part.rows.length} contacts today)`);
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
  console.error(`PAIR-NOW FAIL\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("PAIR-NOW OK");
