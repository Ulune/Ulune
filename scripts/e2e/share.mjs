/*
 * Sharing a chart by link (share plan, feature 1; idea B1's QR code), from
 * the sender's sheet to the recipient's three cases:
 *   - the sheet (1280 English; 390 French through the ⋯ menu): what the link
 *     holds, the name and place switches, the privacy line, Copy link (the
 *     clipboard, "Copied"), the QR code, Escape giving the focus back;
 *   - the link opened in a fresh browser, with no private space (the chart
 *     opens, the offer to create one, nothing written to IndexedDB or plain
 *     storage), with an open space (kept at once, its note; opened again,
 *     no second copy), with a locked space (opened in memory and sealed in
 *     the inbox, nothing readable there; a reload while locked; unlocked, it
 *     joins with its note, the inbox emptied; a space made before the inbox,
 *     never unlocked since, keeps nothing and asks to be unlocked);
 *   - "Shared with you" in the switcher until the chart is opened there;
 *   - "Share both" from Synastry and from BaZi's Relationship page: one link,
 *     two charts, the same page with the partner set;
 *   - a broken link: a friendly page in the reader's language, a way in;
 *   - every request: no fragment, no name or place in any; the only call to
 *     the server is the cast (a date, a time, coordinates); the address bar
 *     shows no fragment once the page has read it.
 * Asking for someone's chart (idea B4), the whole round trip:
 *   - the asker (1280, a private space open): from Share and export on
 *     BaZi, the sheet (no name by default, what the recipient will read,
 *     the page their chart opens on, the link and its QR code, nothing
 *     readable in it), the name switched on; from the switcher and ⌘K too;
 *   - the recipient (a fresh browser, no space): the birth form on BaZi
 *     under "TraceQA asked for your chart"; their chart cast, kept nowhere
 *     but the tab, not marked as shared; "Send it back" opens the share
 *     sheet set to that chart (its line for the asker, the name in), whose
 *     link the asker opens: kept in their space with its note and mark;
 *   - in French: the asker's language for a recipient who chose none (not
 *     saved as theirs), the recipient's own when they chose one; a recipient
 *     with an open space keeps their chart there as any chart they cast;
 *     a request link cut short.
 * Flipping between the last two charts (idea B3): the P key and the
 *   switcher's "Back to…" row, on the same page; with a space that stays
 *   unlocked, the chart before is remembered through a reload, sealed with
 *   the library's record and in no plain storage.
 */
import { chromium } from "playwright";
import {
  DEV,
  FIXTURE_A,
  FIXTURE_B,
  CALCULATE,
  PASSPHRASE,
  VIEWPORTS,
  castFixture,
  createSpace,
  keepCharts,
  pickPlace,
  databases,
  ensureTheme,
  goStudioPage,
  gotoApp,
  openExport,
  readSpaceRecord,
  setLang,
  unlockSpace,
} from "./_lib.mjs";
import { contrastScan, formatIssue } from "./_contrast.mjs";
import { notAppFile } from "./_sent.mjs";

const PERSONAL = [FIXTURE_A.name, FIXTURE_B.name, "Paris", "Oslo", "15/06/1990", "1990-06-15", "03/11/1987", "1987-11-03", "Île-de-France"];
const failures = [];
const fail = (msg) => failures.push(msg);

const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });

/** A browser of its own (a recipient never shares anything with the sender), watched: its errors, every request, every address shown. */
async function freshPage(width, { touch = false } = {}) {
  const context = await browser.newContext({ viewport: VIEWPORTS[width], hasTouch: touch, isMobile: touch });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const watch = { errors: [], requests: [], shown: [] };
  page.on("pageerror", (e) => watch.errors.push(String(e)));
  page.on("request", (r) => watch.requests.push(r));
  page.on("framenavigated", (f) => {
    if (f === page.mainFrame()) watch.shown.push(f.url());
  });
  return { context, page, watch };
}

/** The sheet opened from the toolbar (a computer) or the ⋯ menu (a phone), its link made. */
async function openSheet(page) {
  await openExport(page);
  await page.getByTestId("share-open").click();
  await page.getByTestId("share-sheet").waitFor();
  return await readLink(page);
}

async function readLink(page) {
  await page.waitForFunction(() => /^https?:\/\/.+\/s#1\./.test(document.querySelector("[data-testid=share-link]")?.value ?? ""), null, { timeout: 10000 });
  return page.getByTestId("share-link").inputValue();
}

/** Opens a link and waits for the studio page it names. */
async function arrive(page, link, path) {
  await page.goto(link, { waitUntil: "load", timeout: 45000 });
  await page.waitForFunction((p) => location.pathname === p, path, { timeout: 30000 });
  await page.waitForSelector("[data-testid=chart-chip]", { timeout: 30000 });
}

/** A toast saying this, within a while. */
async function toastSays(page, text, label) {
  try {
    await page.getByTestId("toast").filter({ hasText: text }).first().waitFor({ timeout: 20000 });
  } catch {
    const seen = await page.getByTestId("toast").allInnerTexts().catch(() => []);
    fail(`${label}: no note "${text}" (toasts: ${JSON.stringify(seen)})`);
  }
}

/** The switcher's rows: name and whether each is marked "Shared with you". */
async function switcher(page) {
  if (!(await page.getByTestId("chart-picker").isVisible().catch(() => false))) await page.getByTestId("chart-chip").click();
  await page.getByTestId("chart-picker").waitFor();
  const rows = await page.locator("[data-testid=chart-row]").evaluateAll((els) =>
    els.map((el) => ({ name: el.getAttribute("data-name"), shared: el.querySelector("[data-testid=chart-shared]")?.textContent ?? null })),
  );
  await page.keyboard.press("Escape");
  return rows;
}

/** Every record of the space's database as it lies on disk, its bytes read as text. */
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

/** What a recipient's browser sent: only the app's own files by GET, and the cast with a date, a time and coordinates; never the link's fragment. */
function checkSent(watch, link, label) {
  const fragment = link.slice(link.indexOf("#") + 1);
  const [, key, sealed] = fragment.split(".");
  let casts = 0;
  for (const r of watch.requests) {
    const url = r.url();
    const body = r.postData() ?? "";
    for (const piece of [fragment, key, sealed.slice(0, 24)]) if (url.includes(piece) || body.includes(piece)) fail(`${label}: a request carries the link's fragment: ${url.slice(0, 100)}`);
    const why = notAppFile(r);
    if (!why) continue;
    if (url.includes("/_serverFn/") && /castChart/.test(Buffer.from(url.split("/_serverFn/")[1].split("?")[0], "base64url").toString("utf8"))) {
      casts += 1;
      // A time zone's name is not the place: the coordinates already say where (as the privacy suite reads it).
      const said = body.split("Europe/Paris").join("").split("Europe/Oslo").join("");
      for (const word of [FIXTURE_A.name, FIXTURE_B.name, "Paris", "Oslo", "Île"]) if (said.includes(word)) fail(`${label}: the cast carries "${word}"`);
      if (/"name"|"placeLabel"|"birthName"|"chineseCount"/.test(body)) fail(`${label}: the cast carries a name or place field`);
      continue;
    }
    fail(`${label}: sent ${why}`);
  }
  // Each time a link is opened, the page reads its fragment and takes it out of the address bar before anything else.
  const shown = watch.shown;
  for (let i = 0; i < shown.length; i++) {
    if (!shown[i].includes("#")) continue;
    let j = i + 1;
    while (j < shown.length && shown[j] === shown[i]) j++;
    if (shown[j] !== shown[i].split("#")[0]) fail(`${label}: the fragment was not taken out of the address bar at once (then ${shown[j]?.slice(0, 50)})`);
    i = j;
  }
  for (const u of watch.shown) for (const w of PERSONAL) if (decodeURIComponent(u).includes(w)) fail(`${label}: an address shows "${w}"`);
  if (watch.errors.length) fail(`${label}: ${watch.errors.join(" | ")}`);
  return casts;
}

/** This browser's plain storage: none of the charts in it. */
async function plainHolds(page) {
  const all = await page.evaluate(() => [...Object.entries(localStorage), ...Object.entries(sessionStorage)].map(([k, v]) => `${k}=${v}`).join("\n"));
  return PERSONAL.filter((w) => all.includes(w));
}

let linkA = "";
let linkSynastry = "";
let linkBazi = "";

/* ---------------------------------------------------------------- the sender, 1280 English */
{
  const { context, page, watch } = await freshPage(1280);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  try {
    await gotoApp(page);
    await castFixture(page, FIXTURE_A);
    linkA = await openSheet(page);
    const preview = await page.getByTestId("share-preview").innerText();
    if (!preview.startsWith("TraceQA · 15 June 1990, 12:00 · Paris")) fail(`the sheet's line: "${preview}"`);
    if (!/Birth chart/.test(await page.getByTestId("share-opens").innerText())) fail("the sheet does not say which page the link opens");
    for (const id of ["share-keep-name", "share-keep-place"]) if ((await page.getByTestId(id).getAttribute("aria-checked")) !== "true") fail(`${id} is not on by default`);
    if (!/Anyone with this link can see this chart\. The link never passes through Ulune’s server\./.test(await page.getByTestId("share-privacy").innerText())) fail("the privacy line");
    if (!(await page.getByTestId("share-qr").count()) || Number(await page.getByTestId("share-qr").getAttribute("data-version")) < 5) fail("no QR code of the link");
    if (await page.getByTestId("share-both").count()) fail("Share both on the birth chart");
    if (linkA.length > 175) fail(`the link is ${linkA.length} characters`);
    for (const w of [...PERSONAL, "12:00", "1990"]) if (linkA.includes(w)) fail(`the link shows "${w}"`);
    // Copy link: the clipboard holds it, the button says so.
    await page.getByTestId("share-copy").click();
    await page.waitForFunction(() => document.querySelector("[data-testid=share-copy]")?.hasAttribute("data-copied"), null, { timeout: 4000 }).catch(() => fail("Copy link never said Copied"));
    if ((await page.evaluate(() => navigator.clipboard.readText())) !== linkA) fail("the clipboard does not hold the link");
    // The switches: the name, then the place's name, left out of the line and of the link.
    await page.getByTestId("share-keep-name").click();
    const noName = await readLink(page);
    if (noName === linkA || /TraceQA/.test(await page.getByTestId("share-preview").innerText())) fail("the name switch left the name in");
    await page.getByTestId("share-keep-place").click();
    await readLink(page);
    if (/Paris/.test(await page.getByTestId("share-preview").innerText())) fail("the place switch left the place in");
    await page.getByTestId("share-keep-name").click();
    await page.getByTestId("share-keep-place").click();
    // Escape closes it, the focus back on the menu's button.
    await page.keyboard.press("Escape");
    await page.getByTestId("share-sheet").waitFor({ state: "detached", timeout: 4000 });
    const focus = await page.evaluate(() => document.activeElement?.getAttribute("data-testid"));
    if (focus !== "export-menu") fail(`the focus went to ${focus}, not back to the menu`);

    // Share both: Synastry, then BaZi's Relationship page, with Sample B as the partner.
    await castFixture(page, FIXTURE_B);
    await page.getByTestId("chart-chip").click();
    await page.locator("[data-testid=chart-row]").filter({ hasText: FIXTURE_A.name }).getByRole("button").first().click();
    for (const [id, figure] of [
      ["synastry", "studio-synastry"],
      ["bazi-pair", "bazi-pair"],
    ]) {
      await goStudioPage(page, id);
      await page.getByTestId(figure).first().waitFor({ timeout: 30000 });
      await openSheet(page);
      if (!(await page.getByTestId("share-both").count())) fail(`${id}: no Share both`);
      await page.getByTestId("share-both").click();
      await page.waitForFunction(() => document.querySelectorAll("[data-testid^=share-preview-]").length === 2, null, { timeout: 4000 }).catch(() => fail(`${id}: Share both shows one line`));
      const lines = await page.locator("[data-testid^=share-preview-]").allInnerTexts();
      if (!/TraceQA/.test(lines[0] ?? "") || !/Sample B/.test(lines[1] ?? "")) fail(`${id}: the two lines ${JSON.stringify(lines)}`);
      if (!/these two charts/.test(await page.getByTestId("share-privacy").innerText())) fail(`${id}: the privacy line for two`);
      const link = await readLink(page);
      if (id === "synastry") linkSynastry = link;
      else linkBazi = link;
      await page.getByTestId("share-close").click();
      await page.getByTestId("share-sheet").waitFor({ state: "detached", timeout: 4000 });
    }
    if (watch.errors.length) fail(`sender: ${watch.errors.join(" | ")}`);
    console.log(`sender OK: ${linkA.length}-character link, the switches, Copy link, the QR code, Share both on Synastry and BaZi`);
  } catch (e) {
    fail(`sender: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    await context.close();
  }
}

/* ---------------------------------------------------------------- no private space */
if (linkA) {
  const { context, page, watch } = await freshPage(1280);
  try {
    await arrive(page, linkA, "/astrology");
    await page.getByTestId("studio-natal").waitFor({ timeout: 45000 });
    if ((await page.getByTestId("chart-chip").innerText()).trim() !== FIXTURE_A.name) fail("no space: the chart shown is not the one shared");
    await page.getByTestId("share-note").waitFor({ timeout: 10000 });
    if (!/Keep this chart: create your private space, free, on this device, encrypted\./.test(await page.getByTestId("share-note").innerText())) fail("no space: the offer's words");
    if ((await page.getByTestId("share-note").getAttribute("data-kind")) !== "offer") fail("no space: not the offer");
    if (new URL(page.url()).hash) fail("no space: the address still has a fragment");
    const rows = await switcher(page);
    if (rows.length !== 1 || !/^Shared with you, \d{1,2} \w+/.test(rows[0].shared ?? "")) fail(`no space: the switcher ${JSON.stringify(rows)}`);
    // Opened from the switcher once: the mark goes.
    await page.getByTestId("chart-chip").click();
    await page.locator("[data-testid=chart-row]").first().getByRole("button").first().click();
    if ((await switcher(page))[0]?.shared) fail("no space: still marked once opened from the switcher");
    if ((await databases(page)).includes("ulune-space")) fail("no space: a database was made");
    const held = await plainHolds(page);
    if (held.length) fail(`no space: plain storage holds ${held.join(", ")}`);
    // Not now puts the offer away.
    await page.getByTestId("share-note-later").click();
    await page.getByTestId("share-note").waitFor({ state: "detached", timeout: 4000 });
    const casts = checkSent(watch, linkA, "no space");
    // Cast on the device by default (on-device plan): no call to the server at all.
    if (casts !== (CALCULATE === "server" ? 1 : 0)) fail(`no space: ${casts} casts on the server`);
    console.log("no space OK: opened, the offer, the switcher's mark until opened, nothing stored, one cast with no name or place");
  } catch (e) {
    fail(`no space: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    await context.close();
  }
}

/* ---------------------------------------------------------------- an open private space */
if (linkA) {
  const { context, page, watch } = await freshPage(1280);
  try {
    await gotoApp(page);
    await createSpace(page);
    const before = (await readSpaceRecord(page, "state/library"))?.order?.length ?? 0;
    await arrive(page, linkA, "/astrology");
    await toastSays(page, "TraceQA’s chart is now in your private space.", "open space");
    const library = await readSpaceRecord(page, "state/library");
    const order = library?.order ?? [];
    if (order.length !== before + 1) fail(`open space: ${order.length} charts kept, not ${before + 1}`);
    const kept = order.length ? await readSpaceRecord(page, `chart/${order[0]}`) : null;
    if (kept?.input?.name !== FIXTURE_A.name || !Number.isFinite(kept?.sharedAt)) fail(`open space: the chart kept ${JSON.stringify(kept)?.slice(0, 160)}`);
    // The same link again: it opens the chart kept, no second copy.
    await arrive(page, linkA, "/astrology");
    await toastSays(page, "TraceQA’s chart was already in your private space.", "open space, again");
    const again = (await readSpaceRecord(page, "state/library"))?.order ?? [];
    if (again.length !== order.length) fail(`open space: opened twice, ${again.length} charts kept`);
    if ((await page.getByTestId("chart-chip").innerText()).trim() !== FIXTURE_A.name) fail("open space: opened again, not shown");
    checkSent(watch, linkA, "open space");
    console.log("open space OK: kept at once with its note; opened again, the same chart, no copy");
  } catch (e) {
    fail(`open space: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    await context.close();
  }
}

/* ---------------------------------------------------------------- a locked private space */
if (linkA) {
  const { context, page, watch } = await freshPage(1280);
  try {
    await gotoApp(page);
    // A shared computer's space: it locks when Ulune closes, so a new page finds it locked.
    await createSpace(page, PASSPHRASE, { shared: true });
    await arrive(page, linkA, "/astrology");
    await page.getByTestId("space-sheet").waitFor({ timeout: 20000 });
    await page.getByTestId("space-just-look").click();
    await toastSays(page, "This chart will be saved to your private space when you unlock it.", "locked");
    if ((await page.getByTestId("chart-chip").innerText()).trim() !== FIXTURE_A.name) fail("locked: the chart is not shown");
    const raw = await rawSpace(page);
    const inbox = raw.filter((r) => r.store === "meta" && r.key.startsWith("in/"));
    if (inbox.length !== 1) fail(`locked: ${inbox.length} charts in the inbox`);
    if (!raw.some((r) => r.store === "meta" && r.key === "inbox")) fail("locked: no inbox key beside the space");
    for (const r of raw) for (const w of PERSONAL) if (r.text.includes(w)) fail(`locked: the space's ${r.store} "${r.key}" holds "${w}" in the clear`);
    if ((await plainHolds(page)).length) fail("locked: plain storage holds the chart");
    // A reload while locked: the chart is no longer in the tab, but kept for the space.
    await page.reload({ waitUntil: "load" });
    await unlockSpace(page);
    await toastSays(page, "1 chart shared with you was added to your private space.", "unlocked");
    const rows = await switcher(page);
    const shared = rows.find((r) => r.name === FIXTURE_A.name);
    if (!shared?.shared) fail(`unlocked: the switcher ${JSON.stringify(rows)}`);
    const after = await rawSpace(page);
    if (after.some((r) => r.store === "meta" && r.key.startsWith("in/"))) fail("unlocked: the inbox was not emptied");
    checkSent(watch, linkA, "locked");
    console.log("locked space OK: shown, sealed in the inbox (nothing readable), kept through a reload, joined at unlock with its note");
  } catch (e) {
    fail(`locked: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    await context.close();
  }
}

/* ---------------------------------------------------------------- a locked space made before the inbox */
if (linkA) {
  const { context, page, watch } = await freshPage(1280);
  try {
    await gotoApp(page);
    await createSpace(page, PASSPHRASE, { shared: true });
    // As a space made before sharing came, and not unlocked since: no inbox key beside it.
    await page.evaluate(
      () =>
        new Promise((resolve, reject) => {
          const r = indexedDB.open("ulune-space");
          r.onsuccess = () => {
            const tx = r.result.transaction("meta", "readwrite");
            tx.objectStore("meta").delete("inbox");
            tx.oncomplete = () => {
              r.result.close();
              resolve(null);
            };
            tx.onerror = () => reject(tx.error);
          };
          r.onerror = () => reject(r.error);
        }),
    );
    await arrive(page, linkA, "/astrology");
    await page.getByTestId("space-sheet").waitFor({ timeout: 20000 });
    await page.getByTestId("space-just-look").click();
    await page.getByTestId("share-note").waitFor({ timeout: 10000 });
    if ((await page.getByTestId("share-note").getAttribute("data-kind")) !== "unlock" || !/Unlock your private space to keep it\./.test(await page.getByTestId("share-note").innerText())) fail("older space: not asked to unlock");
    const raw = await rawSpace(page);
    if (raw.some((r) => r.key.startsWith("in/"))) fail("older space: something was written for it while locked");
    for (const r of raw) for (const w of PERSONAL) if (r.text.includes(w)) fail(`older space: "${w}" in the clear in ${r.store} "${r.key}"`);
    // Unlocked from the note: the chart in the tab joins it, and the space gets its inbox key.
    await page.getByTestId("share-note-act").click();
    await unlockSpace(page);
    await page.getByTestId("share-note").waitFor({ state: "detached", timeout: 8000 }).catch(() => fail("older space: the note stayed once unlocked"));
    const rows = await switcher(page);
    if (!rows.find((r) => r.name === FIXTURE_A.name)?.shared) fail(`older space: the switcher ${JSON.stringify(rows)}`);
    if (!(await rawSpace(page)).some((r) => r.store === "meta" && r.key === "inbox")) fail("older space: no inbox key once unlocked");
    checkSent(watch, linkA, "older space");
    console.log("older locked space OK: nothing stored while it had no inbox, asked to unlock; unlocked, the chart joins and the inbox is made");
  } catch (e) {
    fail(`older space: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    await context.close();
  }
}

/* ---------------------------------------------------------------- Share both, received */
for (const [link, path, prefix] of [
  [linkSynastry, "/astrology/synastry", "synastry"],
  [linkBazi, "/bazi/pair", "bazi-pair"],
]) {
  if (!link) continue;
  const { context, page, watch } = await freshPage(1280);
  try {
    await arrive(page, link, path);
    const b = page.getByTestId(`${prefix}-person-b`);
    await b.waitFor({ timeout: 30000 });
    await page.waitForFunction((tid) => document.querySelector(`[data-testid="${tid}"]`)?.selectedOptions?.[0]?.textContent === "Sample B", `${prefix}-person-b`, { timeout: 10000 }).catch(() => {});
    const a = await page.getByTestId(`${prefix}-person-a`).evaluate((el) => el.selectedOptions[0]?.textContent);
    const bName = await b.evaluate((el) => el.selectedOptions[0]?.textContent);
    if (a !== FIXTURE_A.name || bName !== FIXTURE_B.name) fail(`${prefix}: the pair shown is ${a} and ${bName}`);
    const rows = await switcher(page);
    if (rows.length !== 2 || rows.some((r) => !r.shared)) fail(`${prefix}: the switcher ${JSON.stringify(rows)}`);
    if (!/Keep these charts/.test(await page.getByTestId("share-note").innerText().catch(() => ""))) fail(`${prefix}: the offer for two`);
    const casts = checkSent(watch, link, prefix);
    if (casts !== (CALCULATE === "server" ? 2 : 0)) fail(`${prefix}: ${casts} casts on the server`);
    console.log(`${prefix} OK: one link, two charts, the same page with the partner set`);
  } catch (e) {
    fail(`${prefix}: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    await context.close();
  }
}

/* ---------------------------------------------------------------- contrast: the sheet, the note, the /s page, both themes */
if (linkA) {
  const { context, page, watch } = await freshPage(1280);
  try {
    const scan = async (root, label) => {
      const { checked, issues } = await contrastScan(page, { root });
      if (!checked) fail(`contrast ${label}: nothing measured`);
      for (const i of issues) fail(`contrast ${label}: ${formatIssue(i)}`);
    };
    await arrive(page, linkA, "/astrology");
    await page.getByTestId("share-note").waitFor({ timeout: 15000 });
    for (const theme of ["dark", "light"]) {
      await ensureTheme(page, theme);
      await scan(".ob-share-note", `the offer, ${theme}`);
      await openSheet(page);
      await scan(".ob-share", `the sheet, ${theme}`);
      await page.keyboard.press("Escape");
      await page.getByTestId("share-sheet").waitFor({ state: "detached", timeout: 4000 });
    }
    await page.goto(`${DEV}/s#1.broken`, { waitUntil: "load" });
    await page.getByTestId("share-problem").waitFor({ timeout: 15000 });
    await scan(".ob-share-landing", "the broken link's page, light");
    if (watch.errors.length) fail(`contrast: ${watch.errors.join(" | ")}`);
    console.log("contrast OK: the sheet and the offer in both themes, the broken link's page");
  } catch (e) {
    fail(`contrast: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    await context.close();
  }
}

/* ---------------------------------------------------------------- 390, French, through the ⋯ menu; a broken link */
{
  const { context, page, watch } = await freshPage(390, { touch: true });
  try {
    await gotoApp(page);
    await setLang(page, "fr");
    await castFixture(page, FIXTURE_A);
    await page.getByTestId("stage-more").click();
    await page.getByTestId("stage-more-menu").waitFor();
    await page.getByTestId("share-open").click();
    await page.getByTestId("share-sheet").waitFor();
    const link = await readLink(page);
    const sheet = (await page.getByTestId("share-sheet").textContent()) ?? "";
    for (const words of ["Partager un lien", "Le lien contient", "TraceQA · 15 juin 1990, 12:00", "Le nom du lieu", "Toute personne qui a ce lien peut voir ce thème", "Copier le lien"]) {
      if (!sheet.includes(words)) fail(`390 fr: the sheet lacks "${words}"`);
    }
    const box = await page.locator(".ob-share").boundingBox();
    if (!box || box.x < 0 || box.x + box.width > 390) fail(`390 fr: the sheet overflows ${JSON.stringify(box)}`);
    const small = await page.evaluate(() =>
      [...document.querySelectorAll("[data-testid=share-sheet] button")].filter((b) => b.offsetParent && (b.offsetHeight < 44 || b.offsetWidth < 44)).map((b) => b.dataset.testid ?? b.textContent),
    );
    if (small.length) fail(`390 fr: tap targets under 44 px: ${small.join(", ")}`);
    await page.getByTestId("share-close").click();

    // The link opened on this phone (in French): the chart, then the offer in French.
    const { context: c2, page: p2, watch: w2 } = await freshPage(390, { touch: true });
    try {
      await gotoApp(p2);
      await setLang(p2, "fr");
      await arrive(p2, link, "/astrology");
      await p2.getByTestId("share-note").waitFor({ timeout: 10000 });
      if (!/Gardez ce thème\u202f: créez votre espace privé/.test(await p2.getByTestId("share-note").innerText())) fail("390 fr: the offer in French");
      checkSent(w2, link, "390 fr recipient");
      // A link cut short: a friendly page in French, a way into Ulune, the fragment gone from the address bar.
      await p2.goto(`${DEV}/s#1.${link.split("#1.")[1].slice(0, 40)}`, { waitUntil: "load" });
      await p2.getByTestId("share-problem").waitFor({ timeout: 15000 });
      if (!/Ce lien n’ouvre pas de thème/.test(await p2.getByTestId("share-problem").innerText())) fail("390 fr: the broken link's title");
      if (new URL(p2.url()).hash) fail("broken link: the fragment stayed in the address bar");
      await p2.getByTestId("share-open-ulune").click();
      await p2.waitForFunction(() => location.pathname === "/", null, { timeout: 15000 });
    } finally {
      await c2.close();
    }
    if (watch.errors.length) fail(`390 fr: ${watch.errors.join(" | ")}`);
    console.log("390 fr OK: the sheet through ⋯ in French, tap targets, the offer in French, a broken link's page");
  } catch (e) {
    fail(`390 fr: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    await context.close();
  }
}

/* ---------------------------------------------------------------- asking for someone's chart (idea B4) */

/** The request sheet from the share menu, its link made. */
async function openAsk(page) {
  await openExport(page);
  await page.getByTestId("ask-open").click();
  await page.getByTestId("ask-sheet").waitFor();
  return readAskLink(page);
}

async function readAskLink(page, not = "") {
  await page.waitForFunction((was) => {
    const v = document.querySelector("[data-testid=ask-link]")?.value ?? "";
    return /^https?:\/\/.+\/s#2\./.test(v) && v !== was;
  }, not, { timeout: 10000 });
  return page.getByTestId("ask-link").inputValue();
}

/** The birth form filled with a fixture and cast, on whatever page it stands. */
async function castHere(page, fixture, stage) {
  await page.locator("#native-name").fill(fixture.name);
  await page.locator("#birth-date").fill(fixture.date);
  await page.locator("#birth-time").fill(fixture.time);
  await pickPlace(page, fixture.place);
  await page.getByTestId("cast-submit").click();
  await page.getByTestId(stage).waitFor({ timeout: 45000 });
}

/**
 * What a request's recipient sent: never the link's fragment nor the asker's name in any request,
 * the fragment out of the address bar at once, no page error. (The place they type goes to the
 * place search, and their birth to the cast, as for any chart they cast.)
 */
function checkRequestSent(watch, link, label) {
  const fragment = link.slice(link.indexOf("#") + 1);
  const [, key, sealed] = fragment.split(".");
  for (const r of watch.requests) {
    const url = r.url();
    const body = r.postData() ?? "";
    for (const piece of [fragment, key, sealed.slice(0, 20), "TraceQA"]) if (url.includes(piece) || body.includes(piece)) fail(`${label}: a request carries "${piece.slice(0, 20)}": ${url.slice(0, 100)}`);
  }
  const shown = watch.shown;
  for (let i = 0; i < shown.length; i++) {
    if (!shown[i].includes("#")) continue;
    let j = i + 1;
    while (j < shown.length && shown[j] === shown[i]) j++;
    if (shown[j] !== shown[i].split("#")[0]) fail(`${label}: the fragment was not taken out of the address bar at once (then ${shown[j]?.slice(0, 50)})`);
    i = j;
  }
  if (watch.errors.length) fail(`${label}: ${watch.errors.join(" | ")}`);
}

let askLink = "";
let askLinkFr = "";
{
  const { context: asker, page, watch } = await freshPage(1280);
  await asker.grantPermissions(["clipboard-read", "clipboard-write"]);
  try {
    await gotoApp(page);
    await createSpace(page);
    await castFixture(page, FIXTURE_A);
    await goStudioPage(page, "bazi");
    await page.getByTestId("studio-bazi").waitFor({ timeout: 30000 });
    const anonymous = await openAsk(page);
    if ((await page.getByTestId("ask-say-name").getAttribute("aria-checked")) !== "false") fail("ask: the name is in by default");
    if ((await page.getByTestId("ask-preview").innerText()) !== "“Someone asked you for your chart”") fail(`ask: the preview "${await page.getByTestId("ask-preview").innerText()}"`);
    if (!/^Their chart opens on: BaZi/.test(await page.getByTestId("ask-opens").innerText())) fail(`ask: opens on "${await page.getByTestId("ask-opens").innerText()}"`);
    if (!(await page.getByTestId("ask-qr").count())) fail("ask: no QR code");
    if (anonymous.length > 120) fail(`ask: the link is ${anonymous.length} characters`);
    // The asker says it is them: the preview and the link change; the name is not readable in it.
    await page.getByTestId("ask-say-name").click();
    await page.getByTestId("ask-name").fill("TraceQA");
    askLink = await readAskLink(page, anonymous);
    if ((await page.getByTestId("ask-preview").innerText()) !== "“TraceQA asked for your chart”") fail(`ask: the named preview "${await page.getByTestId("ask-preview").innerText()}"`);
    for (const w of [...PERSONAL, "bazi", "BaZi"]) if (askLink.includes(w)) fail(`ask: the link shows "${w}"`);
    await page.getByTestId("ask-copy").click();
    await page.waitForFunction(() => document.querySelector("[data-testid=ask-copy]")?.hasAttribute("data-copied"), null, { timeout: 4000 }).catch(() => fail("ask: Copy link never said Copied"));
    if ((await page.evaluate(() => navigator.clipboard.readText())) !== askLink) fail("ask: the clipboard does not hold the link");
    await page.keyboard.press("Escape");
    await page.getByTestId("ask-sheet").waitFor({ state: "detached", timeout: 4000 });
    // From the switcher, and from ⌘K.
    await page.getByTestId("chart-chip").click();
    await page.getByTestId("ask-chart").click();
    await page.getByTestId("ask-sheet").waitFor();
    await page.getByTestId("ask-close").click();
    await page.getByTestId("ask-sheet").waitFor({ state: "detached", timeout: 4000 });
    await page.keyboard.press("Control+k");
    await page.getByTestId("command-palette").waitFor();
    await page.keyboard.type("ask someone");
    await page.getByTestId("cmd-chart:ask").click();
    await page.getByTestId("ask-sheet").waitFor();
    await page.keyboard.press("Escape");
    await page.getByTestId("ask-sheet").waitFor({ state: "detached", timeout: 4000 });

    /* the recipient: a fresh browser, no space */
    let back = "";
    const { context: c2, page: p2, watch: w2 } = await freshPage(1280);
    await c2.grantPermissions(["clipboard-read", "clipboard-write"]);
    try {
      await p2.goto(askLink, { waitUntil: "load", timeout: 45000 });
      await p2.waitForFunction(() => location.pathname === "/bazi", null, { timeout: 30000 });
      await p2.getByTestId("request-head").waitFor({ timeout: 20000 });
      if ((await p2.getByTestId("request-title").innerText()) !== "TraceQA asked for your chart") fail(`recipient: the header "${await p2.getByTestId("request-title").innerText()}"`);
      if (!(await p2.locator("#birth-date").isVisible())) fail("recipient: no birth form");
      if (new URL(p2.url()).hash) fail("recipient: the address still has a fragment");
      await castHere(p2, FIXTURE_B, "studio-bazi");
      if (new URL(p2.url()).pathname !== "/bazi") fail(`recipient: the chart opened on ${new URL(p2.url()).pathname}`);
      await p2.getByTestId("reply-card").waitFor({ timeout: 10000 });
      if (!/ready to send back to TraceQA/.test(await p2.getByTestId("reply-card").innerText())) fail("recipient: the card's words");
      if ((await databases(p2)).includes("ulune-space")) fail("recipient: a database was made");
      const rows = await switcher(p2);
      if (rows.length !== 1 || rows[0].shared) fail(`recipient: the switcher ${JSON.stringify(rows)}`);
      // Send it back: the share sheet, set to that chart, its line for the asker, the name in.
      await p2.getByTestId("reply-send").click();
      await p2.getByTestId("share-sheet").waitFor();
      back = await readLink(p2);
      if ((await p2.getByTestId("share-reply").innerText()) !== "For TraceQA, who asked for your chart") fail(`recipient: the sheet's line "${await p2.getByTestId("share-reply").innerText()}"`);
      if ((await p2.getByTestId("share-keep-name").getAttribute("aria-checked")) !== "true") fail("recipient: the name is not in");
      if (!(await p2.getByTestId("share-preview").innerText()).startsWith("Sample B · 3 November 1987, 23:10 · Oslo")) fail(`recipient: the link holds "${await p2.getByTestId("share-preview").innerText()}"`);
      if (!/BaZi/.test(await p2.getByTestId("share-opens").innerText())) fail("recipient: the link does not open BaZi");
      await p2.getByTestId("share-copy").click();
      await p2.waitForFunction(() => document.querySelector("[data-testid=share-copy]")?.hasAttribute("data-copied"), null, { timeout: 4000 }).catch(() => fail("recipient: Copy link never said Copied"));
      await p2.getByTestId("share-close").click();
      await p2.getByTestId("share-sheet").waitFor({ state: "detached", timeout: 4000 });
      // Answered: the card goes.
      await p2.getByTestId("reply-card").waitFor({ state: "detached", timeout: 4000 }).catch(() => fail("recipient: the card stayed once sent"));
      if ((await plainHolds(p2)).length || (await p2.evaluate(() => [...Object.values(localStorage), ...Object.values(sessionStorage)].join("|").includes("TraceQA")))) fail("recipient: plain storage holds a name");
      checkRequestSent(w2, askLink, "recipient");
      console.log("request OK: the asker's sheet (switch off, preview, page, link, QR, switcher, ⌘K); the recipient's form and header, their chart kept nowhere, Send it back");
    } finally {
      await c2.close();
    }

    /* the asker receives the chart sent back: kept in their space */
    if (back) {
      const before = (await readSpaceRecord(page, "state/library"))?.order?.length ?? 0;
      // From here on: what the asker's browser sends as the chart arrives.
      watch.requests.length = 0;
      watch.shown.length = 0;
      await arrive(page, back, "/bazi");
      await toastSays(page, "Sample B’s chart is now in your private space.", "asker");
      const order = (await readSpaceRecord(page, "state/library"))?.order ?? [];
      if (order.length !== before + 1) fail(`asker: ${order.length} charts kept, not ${before + 1}`);
      const shared = (await switcher(page)).find((r) => r.name === FIXTURE_B.name);
      if (!shared?.shared) fail("asker: the chart sent back is not marked as shared");
      if ((await page.getByTestId("chart-chip").innerText()).trim() !== FIXTURE_B.name) fail("asker: the chart sent back is not shown");
      checkSent(watch, back, "asker");
      console.log("request OK: the chart sent back joins the asker's space, marked, on BaZi");
    }
  } catch (e) {
    fail(`request: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    await asker.close();
  }
}

/* ---------------------------------------------------------------- a request in French; a recipient who chose a language; one with a space */
{
  const { context, page } = await freshPage(390, { touch: true });
  try {
    await gotoApp(page);
    await setLang(page, "fr");
    await castFixture(page, FIXTURE_A);
    await page.getByTestId("stage-more").click();
    await page.getByTestId("stage-more-menu").waitFor();
    await page.getByTestId("ask-open").click();
    await page.getByTestId("ask-sheet").waitFor();
    askLinkFr = await readAskLink(page);
    const sheet = (await page.getByTestId("ask-sheet").textContent()) ?? "";
    for (const words of ["Demander le thème de quelqu’un", "Dire que c’est vous", "« Quelqu’un vous demande votre thème »", "Son thème s’ouvrira sur : Thème natal", "Copier le lien"]) {
      if (!sheet.includes(words)) fail(`ask fr: the sheet lacks "${words}"`);
    }
    const box = await page.locator(".ob-share").boundingBox();
    if (!box || box.x < 0 || box.x + box.width > 390) fail(`ask fr: the sheet overflows ${JSON.stringify(box)}`);
    const small = await page.evaluate(() =>
      [...document.querySelectorAll("[data-testid=ask-sheet] button")].filter((b) => b.offsetParent && (b.offsetHeight < 44 || b.offsetWidth < 44)).map((b) => b.dataset.testid ?? b.textContent),
    );
    if (small.length) fail(`ask fr: tap targets under 44 px: ${small.join(", ")}`);
  } catch (e) {
    fail(`ask fr: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    await context.close();
  }
}
if (askLinkFr) {
  // No language chosen: the asker's, for this visit only.
  const { context, page, watch } = await freshPage(390, { touch: true });
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  try {
    await page.goto(askLinkFr, { waitUntil: "load", timeout: 45000 });
    await page.waitForFunction(() => location.pathname === "/astrology", null, { timeout: 30000 });
    await page.getByTestId("request-head").waitFor({ timeout: 20000 });
    if ((await page.getByTestId("request-title").innerText()) !== "Quelqu’un vous demande votre thème") fail(`fr recipient: the header "${await page.getByTestId("request-title").innerText()}"`);
    if ((await page.evaluate(() => document.documentElement.lang)) !== "fr") fail("fr recipient: the page is not in French");
    if (await page.evaluate(() => localStorage.getItem("ulune.locale"))) fail("fr recipient: the asker's language was saved as the recipient's");
    await castHere(page, FIXTURE_B, "studio-natal");
    await page.getByTestId("reply-card").waitFor({ timeout: 10000 });
    if (!/Votre thème est prêt à être renvoyé\./.test(await page.getByTestId("reply-card").innerText())) fail("fr recipient: the card's words");
    await page.getByTestId("reply-send").click();
    await page.getByTestId("share-sheet").waitFor();
    await readLink(page);
    if ((await page.getByTestId("share-reply").innerText()) !== "Pour la personne qui vous a demandé votre thème") fail(`fr recipient: the sheet's line "${await page.getByTestId("share-reply").innerText()}"`);
    await page.getByTestId("share-close").click();
    checkRequestSent(watch, askLinkFr, "fr recipient");
  } catch (e) {
    fail(`fr recipient: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    await context.close();
  }

  // A language chosen: theirs, whatever the asker's.
  const { context: c3, page: p3 } = await freshPage(1280);
  try {
    await gotoApp(p3);
    // A choice saved: French, then English.
    await setLang(p3, "fr");
    await setLang(p3, "en");
    await p3.goto(askLinkFr, { waitUntil: "load", timeout: 45000 });
    await p3.getByTestId("request-head").waitFor({ timeout: 30000 });
    if ((await p3.getByTestId("request-title").innerText()) !== "Someone asked you for your chart") fail(`chosen language: the header "${await p3.getByTestId("request-title").innerText()}"`);
    // Set aside: the form stays, for a chart of one's own.
    await p3.getByTestId("request-dismiss").click();
    await p3.getByTestId("request-head").waitFor({ state: "detached", timeout: 4000 });
    if (!(await p3.locator("#birth-date").isVisible())) fail("chosen language: the form went with the request");
  } catch (e) {
    fail(`chosen language: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    await c3.close();
  }
}
if (askLink) {
  // A recipient with an open space: their chart is kept there, as any chart they cast, not marked as shared.
  const { context, page } = await freshPage(1280);
  try {
    await gotoApp(page);
    await createSpace(page);
    await arrive(page, askLink, "/bazi");
    await page.getByTestId("request-head").waitFor({ timeout: 20000 });
    await castHere(page, FIXTURE_B, "studio-bazi");
    await page.getByTestId("reply-card").waitFor({ timeout: 10000 });
    const until = Date.now() + 8000;
    let order = [];
    while (Date.now() < until && !order.length) {
      order = (await readSpaceRecord(page, "state/library"))?.order ?? [];
      if (!order.length) await page.waitForTimeout(150);
    }
    const kept = order.length ? await readSpaceRecord(page, `chart/${order[0]}`) : null;
    if (order.length !== 1 || kept?.input?.name !== FIXTURE_B.name || kept?.sharedAt !== undefined) fail(`space recipient: kept ${JSON.stringify({ order: order.length, name: kept?.input?.name, sharedAt: kept?.sharedAt })}`);
    // Not now: the request goes, the chart stays.
    await page.getByTestId("reply-later").click();
    await page.getByTestId("reply-card").waitFor({ state: "detached", timeout: 4000 });
    console.log("request OK: in French (the asker's language, not saved), a chosen language kept, a recipient's space keeping their chart");
  } catch (e) {
    fail(`space recipient: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    await context.close();
  }

  // A request cut short.
  const { context: c4, page: p4 } = await freshPage(1280);
  try {
    await p4.goto(`${DEV}/s#2.${askLink.split("#2.")[1].slice(0, 30)}`, { waitUntil: "load" });
    await p4.getByTestId("share-problem").waitFor({ timeout: 15000 });
    if (new URL(p4.url()).hash) fail("broken request: the fragment stayed in the address bar");
  } catch (e) {
    fail(`broken request: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    await c4.close();
  }
}

/* ---------------------------------------------------------------- flipping between the last two charts (idea B3) */
{
  const { context, page, watch } = await freshPage(1280);
  try {
    await gotoApp(page);
    await keepCharts(page);
    await castFixture(page, FIXTURE_A);
    await castFixture(page, FIXTURE_B);
    await goStudioPage(page, "bazi");
    await page.getByTestId("studio-bazi").waitFor({ timeout: 30000 });
    await page.locator("body").click({ position: { x: 5, y: 600 } }).catch(() => {});
    await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
    await page.keyboard.press("p");
    await page.waitForFunction((n) => document.querySelector("[data-testid=chart-chip]")?.textContent?.trim() === n, FIXTURE_A.name, { timeout: 8000 }).catch(() => fail("flip: P did not open the chart before"));
    if (new URL(page.url()).pathname !== "/bazi") fail(`flip: P left BaZi for ${new URL(page.url()).pathname}`);
    await page.keyboard.press("p");
    await page.waitForFunction((n) => document.querySelector("[data-testid=chart-chip]")?.textContent?.trim() === n, FIXTURE_B.name, { timeout: 8000 }).catch(() => fail("flip: P did not flip back"));
    // The switcher's row.
    await page.getByTestId("chart-chip").click();
    const row = page.getByTestId("chart-previous");
    await row.waitFor({ timeout: 4000 });
    if ((await row.innerText()).replace(/\s+/g, " ").trim() !== "Back to TraceQA P") fail(`flip: the switcher's row "${await row.innerText()}"`);
    await row.click();
    await page.waitForFunction((n) => document.querySelector("[data-testid=chart-chip]")?.textContent?.trim() === n, FIXTURE_A.name, { timeout: 8000 }).catch(() => fail("flip: the switcher's row did not open the chart before"));
    if (new URL(page.url()).pathname !== "/bazi") fail("flip: the switcher's row left BaZi");
    // Sealed with the library's record, never in plain storage; remembered through a reload.
    let library = null;
    const until = Date.now() + 8000;
    while (Date.now() < until) {
      library = await readSpaceRecord(page, "state/library");
      if (library?.previousId && library.activeId && library.previousId !== library.activeId) break;
      await page.waitForTimeout(150);
    }
    if (!library?.previousId) fail(`flip: no previous chart in the sealed record ${JSON.stringify(library)}`);
    const plain = await page.evaluate(() => [...Object.values(localStorage), ...Object.values(sessionStorage)].join("|"));
    if (library?.previousId && plain.includes(library.previousId)) fail("flip: the previous chart's id is in plain storage");
    await page.reload({ waitUntil: "load" });
    await page.waitForFunction((n) => document.querySelector("[data-testid=chart-chip]")?.textContent?.trim() === n, FIXTURE_A.name, { timeout: 30000 }).catch(() => fail(`flip: after the reload the chart shown is not ${FIXTURE_A.name}`));
    await page.getByTestId("chart-chip").click();
    await page.getByTestId("chart-previous").waitFor({ timeout: 8000 }).catch(() => fail("flip: the chart before was not remembered through the reload"));
    if (!/Sample B/.test(await page.getByTestId("chart-previous").innerText().catch(() => ""))) fail("flip: after the reload, the chart before is not Sample B");
    await page.keyboard.press("Escape");
    if (watch.errors.length) fail(`flip: ${watch.errors.join(" | ")}`);
    console.log("flip OK: P both ways and the switcher's row on BaZi; sealed with the library, remembered through a reload, not in plain storage");
  } catch (e) {
    fail(`flip: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    await context.close();
  }
}

await browser.close();
if (failures.length) {
  console.error(`SHARE FAIL\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("SHARE OK");
