/**
 * The synced account, device to device (share and compare plan, feature 4; docs/sync-protocol.md):
 * browser contexts as separate devices (each its own storage), against the development server's
 * account endpoints and their local store (.data/account-store.json).
 *
 *   1. Device A makes its private space "on this device and my other devices" with a passphrase:
 *      the recovery code and the account id are shown; then a chart, a group, a note and a home.
 *   2. Device B joins by QR code: A shows its code and link, B opens the link (as a phone's camera
 *      would); both screens show the same six digits; each says Yes; B's space arrives, all of it.
 *   3. Device C, in French, joins with the account id and the passphrase.
 *   The new controls (the choice, the QR code, the six digits, the ways to sign in in French,
 *   Settings' sync part) have names, no English aria-label in French, and targets of 24 px or more.
 *   4. Changes flow both ways (a chart cast on B, a group renamed on A); a conflict (one note
 *      changed on both while offline) ends the same on both, the later kept; a deletion (a chart
 *      removed on A goes from B); B offline says so, and catches up when back; A locked asks
 *      nothing and its space stays as it was until it is unlocked, when B's change arrives.
 *      Meanwhile each device's storage: the session token in memory only, the keys kept by the
 *      browser not extractable, nothing personal.
 *   5. A removes C (a fresh sign-in): C's sync pauses, to sign in again.
 *   6. A stops syncing: the server's copy is deleted at once, B pauses; B stops syncing here, turns
 *      sync on again from Settings (a new account and recovery code), then deletes that account and
 *      erases its space.
 *   7. A passkey, on "localhost" (passkeys need a domain name) with Chromium's virtual authenticator:
 *      a space that syncs made with a passkey (the account's, its secret for the protocol's salt);
 *      a device with a space of its own (on this device only, a chart of its own) joins it with the
 *      recovery code alone, its chart joining the account's; the first device's space erased, the
 *      same passkey signs in again and brings it all back; the account deleted with the passkey as
 *      the fresh sign-in.
 *   8. Privacy: every request to /api/account/ carries no name, date, place, note, group, home,
 *      record name, passphrase or recovery code, and no query; the browsers' plain storage holds
 *      none of them; the local store, read as a thief would, holds nothing readable, only buckets
 *      of sealed bytes and whole days.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import {
  DEV,
  FIXTURE_A,
  FIXTURE_B,
  ROOT,
  SHOTS,
  VIEWPORTS,
  castFixture,
  clickDockTab,
  ensureShotsDir,
  goStudioPage,
  gotoApp,
  readSpaceRecord,
  removeActiveChart,
  setLang,
} from "./_lib.mjs";

const PASS = "correct horse battery staple";
const GROUP = "Zqfamily";
const GROUP_RENAMED = "Zqfamilyrenamed";
const NOTE = "Zqnote: read on 12 Oct";
const NOTE_A = "Zqnote from A, offline";
const NOTE_B = "Zqnote from B, offline later";
const HOME = "Zqcabin";
const STORE = join(ROOT, ".data/account-store.json");
/** What a request to the account, the store or the browser's plain storage must never hold. */
const SECRETS = [
  FIXTURE_A.name,
  FIXTURE_B.name,
  "15/06/1990",
  "1990-06-15",
  "03/11/1987",
  "1987-11-03",
  "Paris",
  "Oslo",
  "48.85",
  "59.91",
  "Zqfamily",
  "Zqnote",
  "Zqcabin",
  "read on 12 Oct",
  "chart/",
  "note/",
  "state/",
  "fs/homes",
  "space/ways",
  "enc/",
  PASS,
  "Linux · Chrome",
];
const BUCKETS = [8192, 16384, 32768, 65536, 131072, 262144];

const failures = [];
const fail = (msg) => {
  failures.push(msg);
  console.log(`FAIL ${msg}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const found = (text, words) => words.filter((w) => w && text.includes(w));

/** Every request to the account's endpoints, from every device. */
const accountRequests = [];

async function newDevice(browser, name, { size = 1280, lang = "en" } = {}) {
  const context = await browser.newContext({ viewport: VIEWPORTS[size] ?? VIEWPORTS[1280], locale: lang === "fr" ? "fr-FR" : "en-GB" });
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const page = await context.newPage();
  page.setDefaultTimeout(25000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(`${name}: ${e}`));
  page.on("request", (r) => {
    if (r.url().includes("/api/account/")) accountRequests.push({ device: name, url: r.url(), body: r.postData() ?? "" });
  });
  return { name, context, page, errors };
}

/** A round now: the sync listens for the network coming back. */
async function nudge(page) {
  await page.evaluate(() => window.dispatchEvent(new Event("online"))).catch(() => {});
}

/** Waits until `test` holds on the page, asking it to sync meanwhile. */
async function until(page, test, label, ms = 45000) {
  const end = Date.now() + ms;
  let last;
  while (Date.now() < end) {
    try {
      last = await test();
      if (last) return last;
    } catch (e) {
      last = e instanceof Error ? e.message : String(e);
    }
    await nudge(page);
    await sleep(1500);
  }
  throw new Error(`${label}: not after ${ms / 1000} s (${typeof last === "string" ? last : JSON.stringify(last)?.slice(0, 200)})`);
}

/**
 * What a device keeps in its browser: every IndexedDB database's records (bytes as base64url and as
 * text, so a word or a token inside them would be found), its plain storage, the CryptoKeys kept
 * (whether page code could read them out), and, from the page's memory, the session token the sync
 * holds now (docs/sync-protocol.md, 4.5: it must be in memory only).
 */
async function storageOf(page) {
  return page.evaluate(async () => {
    const asText = (u8) => {
      let s = "";
      for (const b of u8) s += String.fromCharCode(b);
      return s;
    };
    const b64u = (u8) => btoa(asText(u8)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const keys = [];
    const texts = [];
    const walk = (v, where) => {
      if (v instanceof CryptoKey) {
        keys.push({ where, type: v.type, extractable: v.extractable, algorithm: v.algorithm.name });
        return;
      }
      if (v instanceof ArrayBuffer || ArrayBuffer.isView(v)) {
        const u8 = v instanceof ArrayBuffer ? new Uint8Array(v) : new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
        texts.push(b64u(u8), asText(u8));
        return;
      }
      if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${where}[${i}]`));
      else if (v && typeof v === "object") {
        for (const [k, x] of Object.entries(v)) {
          texts.push(k);
          walk(x, `${where}.${k}`);
        }
      } else texts.push(String(v));
    };
    for (const { name } of await indexedDB.databases()) {
      const db = await new Promise((resolve, reject) => {
        const r = indexedDB.open(name);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      for (const store of db.objectStoreNames) {
        const [ks, vs] = await new Promise((resolve) => {
          const tx = db.transaction(store);
          const os = tx.objectStore(store);
          const a = os.getAllKeys();
          const b = os.getAll();
          tx.oncomplete = () => resolve([a.result, b.result]);
          tx.onerror = () => resolve([[], []]);
        });
        ks.forEach((k, i) => {
          texts.push(String(k));
          walk(vs[i], `${name}/${store}/${String(k)}`);
        });
      }
      db.close();
    }
    texts.push(JSON.stringify({ ...localStorage }), JSON.stringify({ ...sessionStorage }));
    let token = null;
    try {
      token = (await import("/src/lib/account/client/runner.ts")).runningSync()?.session.current() ?? null;
    } catch {
      /* not syncing */
    }
    return { keys, text: texts.join("\n"), token };
  });
}

/**
 * A device's storage, while it syncs: the session token in the page's memory and nowhere in its
 * storage; every key kept by the browser not extractable (the space's own, the device's for the
 * account); nothing personal anywhere in it (the space's record names, chart/… and the like, are the
 * space's own keys in its database, random ids: not looked for here).
 */
async function checkStorage(device, words) {
  const s = await storageOf(device.page);
  if (!s.token) fail(`${device.name}: no session token in the page's memory while it syncs`);
  else if (s.text.includes(s.token) || s.text.includes(Buffer.from(s.token, "base64url").toString("latin1"))) fail(`${device.name}: the session token is kept in the browser's storage`);
  for (const k of s.keys) if (k.extractable) fail(`${device.name}: a key page code can read out, in ${k.where}`);
  if (!s.keys.some((k) => k.algorithm === "ECDSA" && k.type === "private")) fail(`${device.name}: no device key for the account in the browser's storage`);
  for (const w of found(s.text, words)) fail(`${device.name}: the browser's storage holds "${w}"`);
  return s.keys.length;
}

/**
 * The synced account's controls, held to the app's accessibility rules where they show (`scope`, a
 * selector): every visible button, link and field has a name, in French no aria-label left in
 * English, and every target at least 24 px (a checkbox or a radio by its label, which takes the click).
 */
async function a11yProblems(page, scope, fr = false) {
  return page.evaluate(
    ({ sel, fr }) => {
      const out = [];
      const en = /\b(the|and|open|close|show|hide|copy|link|remove|select|back|next|previous|settings|search|device|sync)\b/i;
      const root = document.querySelector(sel);
      if (!root) return [`${sel}: not on the page`];
      for (const el of root.querySelectorAll("button, a[href], input:not([type=hidden]), select, textarea")) {
        const cs = getComputedStyle(el);
        if (el.closest("[aria-hidden=true]") || el.getAttribute("aria-hidden") === "true" || el.classList.contains("sr-only") || cs.visibility === "hidden" || cs.display === "none") continue;
        const box = (el.type === "checkbox" || el.type === "radio") && el.closest("label") ? el.closest("label") : el;
        const r = box.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        const id = el.getAttribute("data-testid") || el.id || el.tagName.toLowerCase();
        let name = el.getAttribute("aria-label") || "";
        const lb = el.getAttribute("aria-labelledby");
        if (!name && lb) name = lb.split(" ").map((x) => document.getElementById(x)?.textContent ?? "").join(" ");
        if (!name && el.id) name = document.querySelector(`label[for="${el.id}"]`)?.textContent ?? "";
        if (!name && el.closest("label")) name = el.closest("label").textContent ?? "";
        if (!name) name = (el.textContent ?? "").trim();
        if (!name) name = el.getAttribute("title") || "";
        if (!name.trim()) out.push(`${id}: no name`);
        const aria = el.getAttribute("aria-label");
        if (fr && aria && en.test(aria)) out.push(`${id}: an English aria-label in French, "${aria}"`);
        if (Math.min(r.width, r.height) < 24) out.push(`${id}: a target of ${Math.round(r.width)}×${Math.round(r.height)} px`);
      }
      return out;
    },
    { sel: scope, fr },
  );
}

async function checkA11y(device, scope, label, fr = false) {
  for (const p of await a11yProblems(device.page, scope, fr)) fail(`${device.name}, ${label}: ${p}`);
}

/** The sync's state as the page holds it (ok, busy, offline, paused, full, error), or null when the space doesn't sync. */
const syncState = (page) => page.evaluate(async () => (await import("/src/lib/space/state.ts")).useSpace.getState().sync?.state ?? null).catch(() => null);

async function sheetGone(page, ms = 60000) {
  await page.getByTestId("space-sheet").waitFor({ state: "detached", timeout: ms });
}

/** The space's account id, as the page holds it (base64url). */
const accountOf = (page) => page.evaluate(async () => (await import("/src/lib/space/state.ts")).useSpace.getState().sync?.account ?? null);

/** A record of the open space, written as the page's own code would (the sync is told). */
async function putRecord(page, name, value) {
  await page.evaluate(
    async ([n, v]) => {
      const { openVault } = await import("/src/lib/space/state.ts");
      const vault = openVault();
      if (!vault) throw new Error("no open space");
      await vault.put(n, v);
      // The page's own holders read it again, as after a backup joined.
      window.dispatchEvent(new Event(n === "state/groups" || n.startsWith("note/") ? "ulune:groups-kept" : "ulune:homes-kept"));
    },
    [name, value],
  );
}

async function chartNames(page) {
  const library = await readSpaceRecord(page, "state/library").catch(() => null);
  const names = [];
  for (const id of library?.order ?? []) {
    const row = await readSpaceRecord(page, `chart/${id}`).catch(() => null);
    if (row) names.push(row.input?.name);
  }
  return names;
}

/** Settings › Private space, reached through the page's own links (the space stays open). */
async function openSettings(page) {
  await page.getByTestId("space-button").click();
  await page.getByTestId("space-your-data").click();
  await page.getByTestId("settings-space").waitFor({ timeout: 20000 });
  await page.getByTestId("sync-settings").waitFor({ timeout: 20000 });
}

/** The confirm step: the passphrase given again. */
async function confirmWithPassphrase(page) {
  await page.getByTestId("space-confirm-pass").fill(PASS, { timeout: 20000 });
  await page.getByTestId("space-confirm").click();
}

/**
 * A request's body as a reader of it would see it: its plain values as they are, and every value in
 * base64url (sealed records, keys, tokens) as the bytes it stands for, so a short word is never
 * "found" by chance in the letters of an encoding.
 */
function bodyText(body) {
  let json;
  try {
    json = JSON.parse(body || "null");
  } catch {
    return body;
  }
  const out = [];
  const walk = (v) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
    else if (typeof v === "string" && /^[A-Za-z0-9_-]{16,}$/.test(v)) {
      const bytes = Buffer.from(v, "base64url");
      out.push(bytes.toString("latin1"), bytes.toString("utf8"));
    } else out.push(String(v));
  };
  walk(json);
  return out.join(" ");
}

/* ------------------------------------------------------------ the store, as a thief reads it */

function storeDump() {
  if (!existsSync(STORE)) return null;
  return JSON.parse(readFileSync(STORE, "utf8"));
}

/** Every value of the store's file: nothing readable, days as days, blobs as buckets, names sealed. */
function checkStore(dump, words) {
  const problems = [];
  let values = 0;
  const look = (where, key, value) => {
    values += 1;
    if (typeof value === "string" && value.startsWith("hex:")) {
      const bytes = Buffer.from(value.slice(4), "hex");
      for (const text of [bytes.toString("latin1"), bytes.toString("utf8")]) for (const w of found(text, words)) problems.push(`${where}.${key}: "${w}" in its bytes`);
      if (key === "blob" && !BUCKETS.includes(bytes.length)) problems.push(`${where}.blob of ${bytes.length} bytes`);
      if (key === "name" && where.startsWith("devices") && bytes.length !== 128) problems.push(`${where}.name of ${bytes.length} bytes`);
      return;
    }
    if (typeof value === "string") for (const w of found(value, words)) problems.push(`${where}.${key}: "${w}"`);
    if (/Day$/.test(key) && value !== null && !(Number.isInteger(value) && value > 19_000 && value < 40_000)) problems.push(`${where}.${key} is not a day: ${value}`);
  };
  const walk = (where, node) => {
    if (Array.isArray(node)) node.forEach((x, i) => walk(`${where}[${i}]`, x));
    else if (node && typeof node === "object") {
      for (const [k, v] of Object.entries(node)) {
        if (v && typeof v === "object") walk(`${where}.${k}`, v);
        else look(where, k, v);
      }
    }
  };
  walk("store", dump);
  return { problems, values };
}

/* ------------------------------------------------------------ the run */

await ensureShotsDir();
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
let A;
let B;
let C;
let Q;
let code = "";
let codeP = "";
let accountA = "";
try {
  /* 1. Device A: a space that syncs, with a chart, a group, a note and a home. */
  A = await newDevice(browser, "A");
  await gotoApp(A.page);
  await castFixture(A.page, FIXTURE_A);
  await A.page.getByTestId("space-button").click();
  await A.page.getByTestId("space-where").waitFor({ timeout: 45000 });
  if (!(await A.page.getByTestId("space-where-here").isChecked())) fail("the choice: this device only is not the default");
  // The sign-up says it plainly: no email, the two-year rule, and the honest limit.
  const choice = await A.page.getByTestId("space-where").innerText();
  if (!/No email/.test(choice) || !/deleted after two years unused/.test(choice) || !/nobody can open your data, Ulune included/.test(choice)) fail(`the choice: the account's rules not said: "${choice.replace(/\s+/g, " ").slice(0, 160)}"`);
  await A.page.screenshot({ path: join(SHOTS, "sync-choice-1280.png") });
  await checkA11y(A, "[data-testid=space-sheet]", "the choice");
  await A.page.getByTestId("space-where-sync").check();
  await A.page.getByTestId("space-use-passphrase").click();
  await A.page.getByTestId("space-pass").fill(PASS);
  await A.page.getByTestId("space-pass-again").fill(PASS);
  await A.page.getByTestId("space-create").click();
  await A.page.getByTestId("space-code").waitFor({ timeout: 60000 });
  code = (await A.page.getByTestId("space-code").innerText()).trim();
  const shownId = (await A.page.getByTestId("sync-account-id-text").innerText()).trim();
  if (!/^([0-9A-HJKMNP-TV-Z]{4}-){6}[0-9A-HJKMNP-TV-Z]{2}$/.test(shownId)) fail(`the account id shown: "${shownId}"`);
  await A.page.getByTestId("space-code-kept").check();
  await A.page.getByTestId("space-done").click();
  await sheetGone(A.page);
  await until(A.page, async () => (await syncState(A.page)) === "ok", "A synced");
  accountA = await accountOf(A.page);
  // While it syncs, no backup reminder (the server's copy does its work).
  if (await A.page.locator("[data-testid=space-button][data-due]").count()) fail("A: a backup reminder while it syncs");
  console.log(`A: a space that syncs, account ${shownId}`);

  // A group with the chart, a note on it, a home.
  await A.page.getByTestId("chart-chip").click();
  await A.page.getByTestId("groups-row").click({ timeout: 15000 });
  await A.page.getByTestId("group-new-name").fill(GROUP);
  await A.page.getByTestId("group-new-name").press("Enter");
  await A.page.locator(`[data-testid=group-item][data-group=${GROUP}]`).waitFor({ timeout: 8000 });
  await A.page.keyboard.press("Escape");
  await A.page.getByTestId("chart-picker").waitFor({ state: "detached", timeout: 8000 }).catch(() => {});
  await A.page.getByTestId("chart-chip").click();
  const rowA = A.page.locator(`[data-testid=chart-picker] [data-testid=chart-row][data-name="${FIXTURE_A.name}"]`).first();
  await rowA.getByTestId("chart-groups").click();
  await rowA.locator(`[data-testid=group-toggle][data-group=${GROUP}]`).click();
  await A.page.keyboard.press("Escape");
  await A.page.getByTestId("chart-picker").waitFor({ state: "detached", timeout: 8000 }).catch(() => {});
  await clickDockTab(A.page, "birth");
  await A.page.getByTestId("notes-text").fill(NOTE);
  await A.page.waitForFunction(() => /^Kept at /.test(document.querySelector("[data-testid=notes-status]")?.textContent ?? ""), null, { timeout: 8000 });
  await goStudioPage(A.page, "fengshui-home");
  await A.page.getByTestId("fengshui-keep").waitFor({ timeout: 20000 });
  await A.page.getByTestId("fengshui-home-facing").fill("180");
  await A.page.getByTestId("fengshui-home-year").fill("1998");
  await A.page.getByTestId("fengshui-keep-save").click();
  await A.page.getByTestId("fengshui-keep-name").waitFor({ timeout: 8000 });
  await A.page.getByTestId("fengshui-keep-name").fill(HOME);
  await A.page.waitForTimeout(900);
  await goStudioPage(A.page, "natal");
  const chartId = (await readSpaceRecord(A.page, "state/library")).order[0];
  // Everything sent: the server holds the chart, the group, the note, the home.
  await until(
    A.page,
    async () => {
      const s = storeDump();
      const hex = Buffer.from(accountA, "base64url").toString("hex");
      const rows = s?.records?.find(([account]) => account === hex)?.[1] ?? [];
      return rows.filter((r) => !r.deleted).length >= 6 ? rows.length : false;
    },
    "A's records on the server",
  );
  console.log("A: a chart, a group, a note and a home, sent sealed");

  /* 2. Device B joins by QR code: A shows it, B opens its link, the six digits compared. */
  B = await newDevice(browser, "B", { size: 390 });
  await gotoApp(B.page);
  await A.page.getByTestId("space-button").click();
  await A.page.getByTestId("space-add-device-now").click();
  await A.page.getByTestId("sync-add-qr").click();
  await confirmWithPassphrase(A.page);
  await A.page.getByTestId("sync-link-qr").waitFor({ timeout: 30000 });
  const linkA = await A.page.getByTestId("sync-link-address").inputValue();
  if (!/\/link#[A-Za-z0-9_-]{100,}$/.test(linkA)) fail(`the link shown: ${linkA.slice(0, 60)}`);
  await A.page.screenshot({ path: join(SHOTS, "sync-qr-giver-1280.png") });
  await checkA11y(A, "[data-testid=space-sheet]", "the QR code to scan");
  await B.page.goto(linkA, { waitUntil: "load" });
  await B.page.getByTestId("sync-link-code").waitFor({ timeout: 30000 });
  if (new URL(B.page.url()).hash) fail("the /link page kept its fragment in the address bar");
  await A.page.getByTestId("sync-link-code").waitFor({ timeout: 30000 });
  const codeA = (await A.page.getByTestId("sync-link-code").innerText()).trim();
  const codeB = (await B.page.getByTestId("sync-link-code").innerText()).trim();
  if (codeA !== codeB || !/^\d{3} \d{3}$/.test(codeA)) fail(`the six digits differ: ${codeA} / ${codeB}`);
  // The keyboard stays in the sheet as its panel changes: the focus on Yes once the digits show (Escape and Tab work).
  for (const device of [A, B]) {
    const focused = await device.page.evaluate(() => document.activeElement?.getAttribute("data-testid") ?? document.activeElement?.tagName);
    if (focused !== "sync-link-yes") fail(`${device.name}: the focus is on ${focused}, not on Yes, once the six digits show`);
  }
  await B.page.screenshot({ path: join(SHOTS, "sync-qr-taker-390.png") });
  await checkA11y(B, "[data-testid=space-sheet]", "the six digits");
  await B.page.getByTestId("sync-link-yes").click();
  await A.page.getByTestId("sync-link-yes").click();
  await sheetGone(A.page);
  await sheetGone(B.page, 90000);
  await B.page.waitForFunction(() => document.querySelector("[data-testid=space-button]")?.getAttribute("data-space") === "open", null, { timeout: 30000 });
  await B.page.getByTestId("studio-natal").waitFor({ timeout: 30000 });
  if ((await accountOf(B.page)) !== accountA) fail("B: another account");
  const bNames = await chartNames(B.page);
  if (bNames.join() !== FIXTURE_A.name) fail(`B's charts: ${bNames.join(", ")}`);
  const bGroups = await readSpaceRecord(B.page, "state/groups");
  if (bGroups?.groups?.[0]?.name !== GROUP || !bGroups.groups[0].members.includes(chartId)) fail(`B's groups: ${JSON.stringify(bGroups)}`);
  if ((await readSpaceRecord(B.page, `note/${chartId}`))?.text !== NOTE) fail("B: the note");
  if ((await readSpaceRecord(B.page, "fs/homes"))?.homes?.[0]?.name !== HOME) fail("B: the home");
  console.log("B: joined by QR code, the same six digits on both, everything arrived");

  /* 3. Device C joins with the account id and the passphrase. */
  C = await newDevice(browser, "C", { lang: "fr" });
  await gotoApp(C.page);
  await setLang(C.page, "fr");
  await C.page.getByTestId("space-button").click();
  await C.page.getByTestId("space-restore").click({ timeout: 45000 });
  await checkA11y(C, "[data-testid=space-sheet]", "the ways to sign in, in French", true);
  await C.page.getByTestId("join-pass-open").click();
  await checkA11y(C, "[data-testid=space-sheet]", "the account id and the passphrase, in French", true);
  await C.page.getByTestId("join-account").fill(shownId.toLowerCase());
  await C.page.getByTestId("join-pass").fill("not the passphrase at all");
  await C.page.getByTestId("join-pass-go").click();
  await C.page.locator("[data-testid=space-sheet] [role=alert]").waitFor({ timeout: 30000 });
  if (!/n’ouvre aucun compte/.test(await C.page.locator("[data-testid=space-sheet] [role=alert]").innerText())) fail("C: a wrong passphrase is not said");
  await C.page.getByTestId("join-pass").fill(PASS);
  await C.page.getByTestId("join-pass-go").click();
  await sheetGone(C.page);
  await C.page.getByTestId("studio-natal").waitFor({ timeout: 30000 });
  if ((await chartNames(C.page)).join() !== FIXTURE_A.name) fail("C: the charts");
  console.log("C (in French): joined with the account id (typed in lower case) and the passphrase; a wrong one refused");

  // What each device keeps: the session token in memory only, keys that can't be read out, nothing personal.
  {
    const personal = SECRETS.filter((w) => !/\/$|^(fs\/homes|space\/ways)$/.test(w)).concat([code, code.replace(/-/g, "")]);
    let kept = 0;
    for (const device of [A, B, C]) {
      await until(device.page, async () => (await syncState(device.page)) === "ok", `${device.name} synced`);
      kept += await checkStorage(device, personal);
    }
    console.log(`storage: on A, B and C the session token in memory only, ${kept} keys kept by the browsers, none extractable, nothing personal`);
  }

  /* 4. Changes both ways, a conflict, a deletion, offline and back. */
  await castFixture(B.page, FIXTURE_B);
  await until(A.page, async () => (await chartNames(A.page)).includes(FIXTURE_B.name), "B's new chart on A");
  // The chart arrives on A's page too, not only in its space.
  await until(A.page, async () => (await A.page.locator("[data-testid=chart-chip]").count()) > 0, "A's page");
  const groups = await readSpaceRecord(A.page, "state/groups");
  await putRecord(A.page, "state/groups", { groups: groups.groups.map((g) => ({ ...g, name: GROUP_RENAMED, at: Date.now() })) });
  await until(B.page, async () => (await readSpaceRecord(B.page, "state/groups"))?.groups?.[0]?.name === GROUP_RENAMED, "the group renamed on A, on B");
  console.log("changes both ways: a chart cast on B reached A, a group renamed on A reached B");

  // A conflict: the same note changed on both while offline, A first, B later; both keep B's.
  await A.context.setOffline(true);
  await B.context.setOffline(true);
  await putRecord(A.page, `note/${chartId}`, { text: NOTE_A, at: Date.now() });
  await sleep(1200);
  await putRecord(B.page, `note/${chartId}`, { text: NOTE_B, at: Date.now() });
  await until(B.page, async () => (await syncState(B.page)) === "offline", "B says it waits for the network", 20000);
  await B.context.setOffline(false);
  await until(B.page, async () => (await syncState(B.page)) === "ok", "B back online");
  await A.context.setOffline(false);
  await until(A.page, async () => (await readSpaceRecord(A.page, `note/${chartId}`))?.text === NOTE_B, "the conflict on A: the later note");
  await until(B.page, async () => (await readSpaceRecord(B.page, `note/${chartId}`))?.text === NOTE_B, "the conflict on B: the later note");
  console.log("a conflict: the note changed on both offline, the later one kept on both");

  // A deletion: chart B removed on A goes from B.
  await A.page.getByTestId("chart-chip").click();
  await A.page.locator(`[data-testid=chart-picker] [data-testid=chart-row][data-name="${FIXTURE_B.name}"]`).first().getByRole("button").first().click();
  await A.page.waitForFunction((n) => document.querySelector("[data-testid=chart-chip]")?.textContent?.includes(n), FIXTURE_B.name, { timeout: 10000 });
  await A.page.getByTestId("chart-picker").waitFor({ state: "detached", timeout: 8000 }).catch(() => {});
  await removeActiveChart(A.page);
  await until(B.page, async () => !(await chartNames(B.page)).includes(FIXTURE_B.name), "the chart deleted on A, gone from B");
  console.log("a deletion: a chart removed on A went from B");

  // Offline and back: B changes the home while offline; A gets it once B is back.
  await B.context.setOffline(true);
  const homes = await readSpaceRecord(B.page, "fs/homes");
  await putRecord(B.page, "fs/homes", { ...homes, homes: homes.homes.map((h) => ({ ...h, year: "2001", savedAt: Date.now() })) });
  await until(B.page, async () => (await syncState(B.page)) === "offline", "B offline", 20000);
  await sleep(2500);
  if ((await readSpaceRecord(A.page, "fs/homes"))?.homes?.[0]?.year === "2001") fail("offline: the change arrived anyway");
  await B.context.setOffline(false);
  await until(A.page, async () => (await readSpaceRecord(A.page, "fs/homes"))?.homes?.[0]?.year === "2001", "B's offline change on A, once back");
  console.log("offline: B waited for the network, then its change reached A");

  // Locked, a device syncs nothing: no request, its space unchanged, until it is unlocked; then the change arrives.
  await A.page.getByTestId("space-button").click();
  await A.page.getByTestId("space-lock-now").click();
  await A.page.waitForFunction(() => document.querySelector("[data-testid=space-button]")?.getAttribute("data-space") === "locked", null, { timeout: 20000 });
  if ((await syncState(A.page)) !== null) fail("locked: A's sync still running");
  const asked = accountRequests.filter((r) => r.device === "A").length;
  const homesB = await readSpaceRecord(B.page, "fs/homes");
  await putRecord(B.page, "fs/homes", { ...homesB, homes: homesB.homes.map((h) => ({ ...h, year: "2003", savedAt: Date.now() })) });
  await until(
    B.page,
    async () => {
      if ((await syncState(B.page)) !== "ok") return false;
      const st = await B.page.evaluate(async () => (await import("/src/lib/account/client/runner.ts")).runningSync()?.vault.get("sync/account"));
      return st && !Object.keys(st.pending ?? {}).length;
    },
    "B's change sent while A is locked",
  );
  for (let i = 0; i < 4; i += 1) {
    await nudge(A.page);
    await A.page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await sleep(1500);
  }
  if (accountRequests.filter((r) => r.device === "A").length !== asked) fail("locked: A asked the account while locked");
  if ((await readSpaceRecord(A.page, "fs/homes"))?.homes?.[0]?.year === "2003") fail("locked: A's space changed while locked");
  await A.page.getByTestId("space-button").click();
  await A.page.getByTestId("space-unlock-pass").fill(PASS, { timeout: 30000 });
  await A.page.getByTestId("space-unlock").click();
  await sheetGone(A.page);
  await until(A.page, async () => (await readSpaceRecord(A.page, "fs/homes"))?.homes?.[0]?.year === "2003", "B's change on A, once unlocked");
  await until(A.page, async () => (await syncState(A.page)) === "ok", "A syncing again once unlocked");
  console.log("locked: A asked nothing and its space stayed as it was until it was unlocked; then B's change arrived");

  /* 5. A removes C: a fresh sign-in, then C's sync pauses. */
  await openSettings(A.page);
  await until(A.page, async () => (await A.page.locator("[data-testid=sync-device]").count()) === 3, "three devices in A's Settings");
  await A.page.screenshot({ path: join(SHOTS, "sync-settings-1280.png"), fullPage: true });
  const status = await A.page.getByTestId("sync-status").innerText();
  if (!/^Synced · /.test(status.trim())) fail(`A's status: "${status}"`);
  if ((await A.page.getByTestId("sync-account").innerText()).trim() !== shownId) fail("A's Settings show another account id");
  if (!/unused for two years is deleted/.test(await A.page.getByTestId("sync-rule").innerText())) fail("A's Settings don't state the two-year rule");
  if (!/Keep your recovery code/.test(await A.page.getByTestId("sync-settings").innerText())) fail("A's Settings don't remind of the recovery code");
  await checkA11y(A, "[data-testid=sync-settings]", "Settings › Sync");
  // C's row (every device here is "Linux · Chrome": the row is found by C's own id, as C knows it).
  const deviceC = await C.page.evaluate(async () => (await import("/src/lib/account/client/runner.ts")).runningSync()?.session.device ?? null);
  await A.page.locator(`[data-testid=sync-device][data-device="${deviceC}"]`).getByTestId("sync-device-remove").click();
  await confirmWithPassphrase(A.page);
  await sheetGone(A.page);
  await until(A.page, async () => (await A.page.locator("[data-testid=sync-device]").count()) === 2, "two devices after removing one");
  await until(C.page, async () => (await syncState(C.page)) === "paused", "C paused after being removed");
  // Paused, the backup reminder is back.
  await until(C.page, async () => (await C.page.locator("[data-testid=space-button][data-due]").count()) > 0, "C: the backup reminder back once paused");
  console.log("a device removed: two left, and the removed one paused");

  /* 6. A stops syncing: the server's copy goes; B pauses, stops here, syncs again, deletes the account. */
  await A.page.getByTestId("sync-off").click();
  await A.page.getByTestId("sync-off-go").click();
  await confirmWithPassphrase(A.page);
  await sheetGone(A.page);
  await A.page.getByTestId("sync-settings").waitFor({ timeout: 10000 });
  if ((await A.page.getByTestId("sync-settings").getAttribute("data-sync")) !== "off") fail("A still syncs after stopping");
  await until(
    A.page,
    async () => {
      const s = storeDump();
      const hex = Buffer.from(accountA, "base64url").toString("hex");
      return s && !s.accounts.some((a) => a.id === `hex:${hex}`) && !s.records.some(([account]) => account === hex);
    },
    "the account gone from the server",
  );
  if ((await chartNames(A.page)).join() !== FIXTURE_A.name) fail("A's space after stopping: its charts");
  await until(B.page, async () => (await syncState(B.page)) === "paused", "B paused once the account is gone");
  console.log("sync stopped on A: the server's copy deleted at once, A keeps its space, B paused");

  await openSettings(B.page);
  await B.page.getByTestId("sync-sign-in-again").click();
  await B.page.getByTestId("sync-leave").click();
  await sheetGone(B.page);
  await B.page.getByTestId("sync-settings").waitFor({ timeout: 10000 });
  if ((await B.page.getByTestId("sync-settings").getAttribute("data-sync")) !== "off") fail("B still syncs after leaving");
  // Turned on again from Settings: a new account, a new recovery code.
  await B.page.getByTestId("settings-sync-on").click();
  await B.page.getByTestId("sync-on-start").click();
  await confirmWithPassphrase(B.page);
  await B.page.getByTestId("space-code").waitFor({ timeout: 60000 });
  const codeAgain = (await B.page.getByTestId("space-code").innerText()).trim();
  if (codeAgain === code) fail("turning sync on again kept the old recovery code");
  const idAgain = (await B.page.getByTestId("sync-account-id-text").innerText()).trim();
  if (idAgain === shownId) fail("turning sync on again gave the same account");
  await B.page.getByTestId("space-code-kept").check();
  await B.page.getByTestId("space-done").click();
  await sheetGone(B.page);
  await until(B.page, async () => (await syncState(B.page)) === "ok", "B syncing again");
  const accountB = await accountOf(B.page);
  console.log("B: stopped syncing here, then turned sync on again from Settings (a new account and code)");
  await B.page.getByTestId("sync-delete").click();
  await B.page.getByTestId("sync-delete-erase").check();
  await B.page.getByTestId("sync-off-go").click();
  await confirmWithPassphrase(B.page);
  await sheetGone(B.page);
  await until(
    B.page,
    async () => {
      const s = storeDump();
      const hex = Buffer.from(accountB, "base64url").toString("hex");
      return s && !s.accounts.some((a) => a.id === `hex:${hex}`);
    },
    "B's account deleted",
  );
  await until(B.page, async () => (await B.page.getByTestId("settings-space").getAttribute("data-space")) === "none", "B's space erased too");
  console.log("B: its account deleted, and its space erased as asked");

  /* 7. A passkey: made for the account, signing in again after this device's space was erased. */
  {
    const P = await newDevice(browser, "P");
    const cdp = await P.context.newCDPSession(P.page);
    await cdp.send("WebAuthn.enable");
    await cdp.send("WebAuthn.addVirtualAuthenticator", {
      options: { protocol: "ctap2", ctap2Version: "ctap2_1", transport: "internal", hasResidentKey: true, hasUserVerification: true, isUserVerified: true, hasPrf: true, automaticPresenceSimulation: true },
    });
    const LOCAL = DEV.replace("127.0.0.1", "localhost");
    await P.page.goto(`${LOCAL}/`, { waitUntil: "load", timeout: 45000 });
    await P.page.waitForSelector("html.theme-ready", { timeout: 20000 });
    await castFixture(P.page, FIXTURE_A);
    await P.page.getByTestId("space-button").click();
    await P.page.getByTestId("space-where-sync").check({ timeout: 45000 });
    await P.page.getByTestId("space-use-passkey").click({ timeout: 20000 });
    await P.page.getByTestId("space-code").waitFor({ timeout: 60000 });
    codeP = (await P.page.getByTestId("space-code").innerText()).trim();
    if (!(await P.page.getByTestId("sync-account-id-text").count())) fail("passkey: the account was not made");
    await P.page.getByTestId("space-code-kept").check();
    await P.page.getByTestId("space-done").click();
    await sheetGone(P.page);
    await until(P.page, async () => (await syncState(P.page)) === "ok", "passkey: synced");
    const accountP = await accountOf(P.page);
    const wraps = await P.page.evaluate(async () => (await import("/src/lib/space/state.ts")).openVault()?.meta.wraps.map((w) => w.kind).sort().join());
    if (wraps !== "passkey,recovery") fail(`passkey: the space's ways in ${wraps}`);
    // A device with a space of its own joins with the recovery code alone (typed in lower case): its chart joins the account's.
    Q = await newDevice(browser, "Q");
    await gotoApp(Q.page);
    await castFixture(Q.page, FIXTURE_B);
    await Q.page.getByTestId("space-button").click();
    await Q.page.getByTestId("space-use-passphrase").click({ timeout: 45000 });
    await Q.page.getByTestId("space-pass").fill(PASS);
    await Q.page.getByTestId("space-pass-again").fill(PASS);
    await Q.page.getByTestId("space-create").click();
    await Q.page.getByTestId("space-code").waitFor({ timeout: 60000 });
    await Q.page.getByTestId("space-code-kept").check();
    await Q.page.getByTestId("space-done").click();
    await sheetGone(Q.page);
    await openSettings(Q.page);
    await Q.page.getByTestId("settings-sync-on").click();
    await Q.page.getByTestId("sync-join-other").click();
    await Q.page.getByTestId("join-code-open").click();
    await Q.page.getByTestId("join-code-input").fill(codeP.toLowerCase());
    await Q.page.getByTestId("join-code-go").click();
    await sheetGone(Q.page);
    await until(Q.page, async () => (await syncState(Q.page)) === "ok", "recovery code: the joined device synced");
    if ((await accountOf(Q.page)) !== accountP) fail("recovery code: joined another account");
    const both = [FIXTURE_A.name, FIXTURE_B.name].sort().join();
    const qNames = (await chartNames(Q.page)).sort().join();
    if (qNames !== both) fail(`recovery code: the joined device's charts: ${qNames}`);
    await until(P.page, async () => (await chartNames(P.page)).includes(FIXTURE_B.name), "recovery code: the joined device's own chart, on the first");
    console.log("recovery code: a device with a space of its own joined with the code alone, and its chart joined the account's");
    // Everything on this device erased (it leaves the account, which stays); the passkey brings the space back.
    await openSettings(P.page);
    await P.page.getByTestId("data-wipe").click();
    await P.page.getByTestId("data-wipe-confirm").click();
    await P.page.waitForURL((u) => u.pathname === "/", { timeout: 20000 });
    await P.page.waitForFunction(() => document.querySelector("[data-testid=space-button]")?.getAttribute("data-space") === "none", null, { timeout: 30000 });
    await P.page.getByTestId("space-button").click();
    await P.page.getByTestId("space-restore").click({ timeout: 45000 });
    await P.page.getByTestId("join-passkey").click();
    await sheetGone(P.page);
    await P.page.getByTestId("studio-natal").waitFor({ timeout: 30000 });
    if ((await accountOf(P.page)) !== accountP) fail("passkey: signed in to another account");
    if ((await chartNames(P.page)).sort().join() !== both) fail("passkey: the charts after signing in again");
    // The account deleted, the passkey as the fresh sign-in (it answers the server's challenge).
    await openSettings(P.page);
    await P.page.getByTestId("sync-delete").click();
    await P.page.getByTestId("sync-off-go").click();
    await P.page.getByTestId("space-confirm-passkey").click();
    await sheetGone(P.page);
    await until(
      P.page,
      async () => {
        const s = storeDump();
        const hex = Buffer.from(accountP, "base64url").toString("hex");
        return s && !s.accounts.some((a) => a.id === `hex:${hex}`);
      },
      "passkey: the account deleted",
    );
    // Deleted with "keep this device's space" (the default): the space stays here, on this device only.
    await P.page.getByTestId("sync-settings").waitFor({ timeout: 10000 });
    if ((await P.page.getByTestId("sync-settings").getAttribute("data-sync")) !== "off") fail("passkey: still syncing after deleting the account");
    if ((await P.page.getByTestId("settings-space").getAttribute("data-space")) !== "open") fail("passkey: the space kept here is not open");
    if ((await chartNames(P.page)).sort().join() !== both) fail("passkey: the charts kept after deleting the account");
    // The joined device finds the account gone: its sync pauses, its space stays.
    await until(Q.page, async () => (await syncState(Q.page)) === "paused", "recovery code: the joined device paused once the account is gone");
    for (const e of [...P.errors, ...Q.errors]) fail(e);
    await P.context.close();
    console.log("passkey: a space that syncs made with a passkey, erased here, brought back by the same passkey, the account deleted with it (the space kept here)");
  }

  /* 8. Privacy. */
  const words = [...SECRETS, code.replace(/-/g, ""), code, codeAgain, codeAgain.replace(/-/g, ""), codeP, codeP.replace(/-/g, "")];
  for (const r of accountRequests) {
    const u = new URL(r.url);
    if (u.search) fail(`${r.device}: a query on ${u.pathname}`);
    for (const w of found(`${u.pathname} ${bodyText(r.body)}`, words)) fail(`${r.device}: ${u.pathname} carries "${w}"`);
  }
  for (const device of [A, B, C, Q]) {
    const plain = await device.page.evaluate(() => JSON.stringify([{ ...localStorage }, { ...sessionStorage }])).catch(() => "");
    for (const w of found(plain, words)) fail(`${device.name}: the browser's plain storage holds "${w}"`);
  }
  await sleep(1500);
  const dump = storeDump();
  if (!dump) fail("no local store to read");
  else {
    const { problems, values } = checkStore(dump, words);
    for (const p of problems.slice(0, 20)) fail(`the store: ${p}`);
    console.log(`privacy: ${accountRequests.length} requests to the account, none with anything readable; the store's ${values} values read as a thief would: nothing readable`);
  }
  for (const device of [A, B, C]) for (const e of device.errors) fail(e);
} catch (e) {
  fail(e instanceof Error ? e.message.split("\n")[0] : String(e));
  for (const device of [A, B, C, Q].filter(Boolean)) {
    await device.page.screenshot({ path: join(SHOTS, `sync-failed-${device.name}.png`) }).catch(() => {});
    for (const err of device.errors) console.log(err);
  }
} finally {
  await browser.close();
}
if (failures.length) {
  console.error(`SYNC FAIL\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("SYNC OK");
