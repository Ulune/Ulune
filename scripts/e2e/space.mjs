/*
 * Just looking and the private space, end to end (lib/space, studio/space-sync.ts).
 *
 *   1. Just looking: two charts cast, every mode visited, an AI key typed;
 *      the browser's storage holds nothing personal (only display settings),
 *      there is no database, and a reload finds nothing kept.
 *   2. Signing in: a chart cast while just looking joins the new space, which
 *      stays signed in (a reload opens it by itself); locking when Ulune
 *      closes, a reload asks to unlock; a wrong passphrase is refused; the charts and
 *      the AI key come back, numerology's two names with their chart; what is
 *      stored is sealed (no name, date or place anywhere in the database, as
 *      bytes).
 *   3. Lock now empties the page; the recovery code opens the space and a new
 *      passphrase replaces the old one.
 *   4. Stay signed in on this device: a reload opens the space by itself; back
 *      to "when Ulune is closed", it asks again. A space from before staying
 *      signed in was the default moves to it at its next unlock; the browser
 *      closed and opened again (same profile) still has it open.
 *   5. "Just look, without it" leaves the space locked and the studio empty.
 *   6. Charts kept in the clear by versions before: kept in a new space (then
 *      erased from the clear), or erased.
 *   7. Passkeys (WebAuthn's PRF secret), with Chromium's virtual
 *      authenticators, on "localhost" (passkeys need a domain name): a passkey
 *      that can't give its secret is refused; one that can makes the space and
 *      unlocks it; Settings adds a passphrase, refuses a second passkey on the
 *      same authenticator, adds one from another (whose secret comes only when
 *      asked again), removes the first, makes a new recovery code and removes
 *      the passphrase, each after confirming with a way in.
 *   8. Backups: a space with charts and no backup says so (a dot, a line in
 *      its menu); the backup downloads as one sealed file (no name, date or
 *      place in it) and the reminder goes, until a new chart. Add another
 *      device saves the same sealed copy (no share sheet here). The file
 *      restores the space in another browser, which stays signed in (a wrong passphrase refused, a
 *      file that isn't a backup refused), and its charts join another space
 *      opened with the backup's own recovery code, once.
 *   9. Your data: the readable copy (the charts in the clear while the space
 *      is open, never an AI key), the prototype sign-in's leftovers removed on
 *      sight, "Erase everything on this device" (no database, no key, no
 *      offline copy, no settings; the page says it is done), and the privacy
 *      notice in both languages.
 */
import { chromium } from "playwright";
import {
  AI_ON,
  DEV,
  FIXTURE_A,
  FIXTURE_B,
  PASSPHRASE,
  SHOTS,
  VIEWPORTS,
  castFixture,
  clickDockTab,
  createSpace,
  databases,
  ensureShotsDir,
  goStudioPage,
  gotoApp,
  legacyRow,
  nextCastAnswer,
  readSpaceRecord,
  setLang,
  setSpaceLock,
  unlockSpace,
} from "./_lib.mjs";
import { join } from "node:path";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";

/** The second chart of the space also gets numerology's two names (part 64), sealed with it. */
const B_NAMED = { ...FIXTURE_B, birthName: "Quintessa Marie Aurelia", currentName: "Quintessa Vale" };
const PERSONAL = [FIXTURE_A.name, FIXTURE_B.name, B_NAMED.birthName, B_NAMED.currentName, "15/06/1990", "1990-06-15", "03/11/1987", "1987-11-03", "Paris", "Oslo"];
// Personal keys under either name: Ulune's, or those the prototype wrote (legacy names).
const PERSONAL_KEYS = /^(orbis|ulune)\.(charts|firstview|synastry\.partner|composite\.partner|account|login)/;
const MODES = ["natal", "transits", "timing", "progressions", "synastry", "composite", "design", "numerology"];
const KEY = "sk-ant-test-0000000000000000";

async function newPage(browser, width = 1280, init) {
  const context = await browser.newContext({ viewport: VIEWPORTS[width] });
  if (init) await context.addInitScript(init.fn, init.arg);
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return { context, page, errors };
}

/** Everything the browser keeps for this site, as text, with the database's records as raw bytes. */
async function storageDump(page) {
  return page.evaluate(async () => {
    const local = Object.fromEntries(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)]));
    const session = Object.fromEntries(Object.keys(sessionStorage).map((k) => [k, sessionStorage.getItem(k)]));
    const dbs = (await indexedDB.databases()).map((d) => d.name);
    let records = "";
    if (dbs.includes("ulune-space")) {
      const db = await new Promise((resolve) => {
        const r = indexedDB.open("ulune-space");
        r.onsuccess = () => resolve(r.result);
      });
      const bytes = (v) => {
        if (v instanceof Uint8Array) return Array.from(v, (c) => String.fromCharCode(c)).join("");
        if (v && typeof v === "object") return Object.values(v).map(bytes).join("|");
        return String(v);
      };
      for (const store of ["meta", "items", "device"]) {
        const all = await new Promise((resolve) => {
          const q = db.transaction(store).objectStore(store).getAll();
          q.onsuccess = () => resolve(q.result);
        });
        records += all.map(bytes).join("\n") + JSON.stringify(all.map((v) => (v instanceof CryptoKey ? { extractable: v.extractable } : null)));
      }
      db.close();
    }
    const cacheNames = "caches" in window ? await caches.keys() : [];
    return { local, session, dbs, records, cookies: document.cookie, cacheNames };
  });
}

function assertNothingPersonal(dump, where) {
  const out = [];
  for (const [k, v] of Object.entries(dump.local)) {
    if (PERSONAL_KEYS.test(k)) out.push(`${where}: localStorage key ${k}`);
    for (const w of PERSONAL) if (String(v).includes(w)) out.push(`${where}: localStorage ${k} holds "${w}"`);
  }
  for (const [k, v] of Object.entries(dump.session)) {
    for (const w of PERSONAL) if (String(v).includes(w)) out.push(`${where}: sessionStorage ${k} holds "${w}"`);
  }
  for (const w of PERSONAL) {
    if (dump.records.includes(w)) out.push(`${where}: the database holds "${w}" in the clear`);
    if (dump.cookies.includes(w)) out.push(`${where}: a cookie holds "${w}"`);
  }
  if (dump.cacheNames.length) out.push(`${where}: caches ${dump.cacheNames.join(",")}`);
  if (out.length) throw new Error(out.join("\n"));
}

async function chipText(page) {
  return (await page.getByTestId("chart-chip").innerText().catch(() => "")).trim();
}

async function libraryNames(page) {
  const picker = page.getByTestId("chart-picker");
  if (!(await picker.isVisible().catch(() => false))) await page.getByTestId("chart-chip").click();
  await picker.waitFor({ timeout: 8000 });
  const names = await page.locator("[data-testid=chart-row]").evaluateAll((els) => els.map((e) => e.getAttribute("data-name") ?? e.textContent ?? ""));
  await page.keyboard.press("Escape");
  return names;
}

async function aiConnected(page) {
  // AI readings wait for v1.1 (src/lib/features.ts): no key can be there.
  if (!AI_ON) return (await page.getByTestId("ai-accounts").count()) > 0;
  await page.getByTestId("ai-accounts").click();
  await page.getByTestId("ai-accounts-panel").waitFor({ timeout: 8000 });
  const text = await page.getByTestId("ai-accounts-panel").innerText();
  await page.mouse.click(5, 5);
  return /0000/.test(text);
}

async function addKey(page) {
  if (!AI_ON) return;
  await page.getByTestId("ai-accounts").click();
  await page.locator("#ai-key-claude").fill(KEY);
  await page.locator("#ai-key-claude").press("Enter");
  await page.getByTestId("ai-route").waitFor({ timeout: 8000 });
  await page.mouse.click(5, 5);
}

/** A chart kept in the clear by versions before (built from a real cast's answer). */
async function castRow(browser) {
  const { context, page } = await newPage(browser);
  const answer = nextCastAnswer(page);
  await gotoApp(page);
  await castFixture(page, FIXTURE_A);
  const row = legacyRow(await answer, { id: "legacy-a", name: FIXTURE_A.name });
  await context.close();
  return row;
}

const AUTHENTICATOR = {
  protocol: "ctap2",
  ctap2Version: "ctap2_1",
  transport: "internal",
  hasResidentKey: true,
  hasUserVerification: true,
  isUserVerified: true,
  hasPrf: true,
  automaticPresenceSimulation: true,
};

/** What the browser's passkey window returns, altered: no secret at all, or only when asked again. */
async function alterPasskeys(page, mode) {
  await page.evaluate((m) => {
    const w = window;
    w.__create ??= navigator.credentials.create.bind(navigator.credentials);
    if (m === "real") {
      navigator.credentials.create = w.__create;
      return;
    }
    navigator.credentials.create = async (opts) => {
      const made = await w.__create(opts);
      const real = made.getClientExtensionResults.bind(made);
      made.getClientExtensionResults = () => ({ ...real(), prf: m === "none" ? { enabled: false } : { enabled: true } });
      return made;
    };
  }, mode);
}

async function wrapKinds(page) {
  return page.evaluate(async () => {
    const db = await new Promise((resolve) => {
      const r = indexedDB.open("ulune-space");
      r.onsuccess = () => resolve(r.result);
    });
    const meta = await new Promise((resolve) => {
      const q = db.transaction("meta").objectStore("meta").get("space");
      q.onsuccess = () => resolve(q.result);
    });
    db.close();
    return meta.wraps.map((w) => w.kind).sort();
  });
}

async function sheetAlert(page) {
  const alert = page.locator("[data-testid=space-sheet] [role=alert]");
  await alert.waitFor({ timeout: 20000 });
  return (await alert.innerText()).trim();
}

async function sheetGone(page) {
  await page.getByTestId("space-sheet").waitFor({ state: "detached", timeout: 30000 });
}

async function run() {
  await ensureShotsDir();
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  try {
    // 1. Just looking.
    {
      const { context, page, errors } = await newPage(browser);
      await gotoApp(page);
      await castFixture(page, FIXTURE_A);
      await castFixture(page, FIXTURE_B);
      const offer = await page.getByTestId("keep-offer").innerText();
      if (!/This chart isn’t kept/.test(offer)) throw new Error(`no quiet offer under the chart: "${offer}"`);
      for (const mode of MODES) {
        await goStudioPage(page, mode);
        await page.getByTestId(`studio-${mode === "design" ? "humandesign" : mode}`).waitFor({ timeout: 30000 });
        await page.waitForTimeout(300);
      }
      await goStudioPage(page, "natal");
      await addKey(page);
      const dump = await storageDump(page);
      assertNothingPersonal(dump, "just looking");
      if (dump.dbs.includes("ulune-space")) throw new Error("just looking made a database");
      if (dump.local["ulune.space"]) throw new Error("just looking left a space flag");
      await page.reload({ waitUntil: "load" });
      await page.waitForSelector("html.theme-ready");
      await page.waitForSelector("#birth-date", { timeout: 20000 });
      if (await page.getByTestId("studio-natal").count()) throw new Error("a chart was kept while just looking");
      if (await aiConnected(page)) throw new Error("an AI key was kept while just looking");
      if (errors.length) throw new Error(`page errors: ${errors.join(" | ")}`);
      await context.close();
      console.log("just looking OK: nothing personal kept");
    }

    // 2–5. The private space.
    {
      const { context, page, errors } = await newPage(browser);
      await gotoApp(page);
      await castFixture(page, FIXTURE_A);
      const code = await createSpace(page);
      if (!/^[0-9A-Z]{5}(-[0-9A-Z]{5}){4}$/.test(code)) throw new Error(`recovery code shape: ${code}`);
      await castFixture(page, B_NAMED);
      await addKey(page);
      await page.waitForTimeout(600);
      const dump = await storageDump(page);
      assertNothingPersonal(dump, "private space");
      const extra = Object.keys(dump.local).filter((k) => !/^ulune\.(look|boot|studio|dock|depth|wheel|reading|numerology|bodies|chart\.view|scrub|offline|hint|theme|locale|space)/.test(k));
      if (extra.length) throw new Error(`unexpected keys: ${extra.join(", ")}`);
      if (dump.local["ulune.space"] !== "stay") throw new Error(`flag ${dump.local["ulune.space"]}`);
      console.log("signed in: the chart cast before joined, nothing readable stored");

      // It stays signed in: a reload opens it by itself, with both charts.
      await page.reload({ waitUntil: "load" });
      await page.getByTestId("studio-natal").waitFor({ timeout: 30000 });
      if (await page.getByTestId("space-sheet").count()) throw new Error("asked to unlock a space that stays signed in");
      if ((await libraryNames(page)).length !== 2) throw new Error("the charts after a reload, signed in");
      console.log("stays signed in after a reload");

      // Locking when Ulune closes (a shared computer): a reload asks to unlock.
      await setSpaceLock(page, "close");
      await page.reload({ waitUntil: "load" });
      await page.getByTestId("space-sheet").waitFor({ timeout: 30000 });
      if ((await page.getByTestId("space-sheet").getAttribute("data-step")) !== "unlock") throw new Error("no unlock step on return");
      await page.screenshot({ path: join(SHOTS, "space-unlock-1280.png") });
      await page.getByTestId("space-unlock-pass").fill("not the passphrase at all");
      await page.getByTestId("space-unlock").click();
      await page.locator("[data-testid=space-sheet] [role=alert]").waitFor({ timeout: 20000 });
      await unlockSpace(page);
      await page.getByTestId("studio-natal").waitFor({ timeout: 20000 });
      const names = await libraryNames(page);
      if (!names.some((n) => n.includes(FIXTURE_A.name)) || !names.some((n) => n.includes(FIXTURE_B.name)))
        throw new Error(`charts after unlock: ${names.join(", ")}`);
      // Numerology's names came back with their chart.
      await page.getByTestId("chart-chip").click();
      await page.locator(`[data-testid=chart-row][data-name="${FIXTURE_B.name}"]`).getByRole("button").first().click();
      await clickDockTab(page, "birth");
      const kept = (await page.getByTestId("birth-names-val").innerText()).trim();
      if (kept !== `${B_NAMED.birthName} · ${B_NAMED.currentName}`) throw new Error(`numerology's names after unlock: "${kept}"`);
      if (AI_ON && !(await aiConnected(page))) throw new Error("the AI key did not come back with the space");
      console.log(AI_ON ? "unlocked: the charts and the AI key are back" : "unlocked: the charts are back");

      // 3. Lock now, then the recovery code and a new passphrase.
      await page.getByTestId("space-button").click();
      await page.getByTestId("space-lock-now").click();
      await page.waitForFunction(() => document.querySelector("[data-testid=space-button]")?.getAttribute("data-space") === "locked");
      await page.waitForSelector("#birth-date", { timeout: 20000 });
      if (await page.getByTestId("studio-natal").count()) throw new Error("a chart stayed on screen after locking");
      if (await aiConnected(page)) throw new Error("the AI key stayed after locking");
      await page.getByTestId("space-button").click();
      await page.getByTestId("space-use-code").click();
      await page.getByTestId("space-code-input").fill(code.toLowerCase());
      await page.getByTestId("space-unlock-code").click();
      await page.getByTestId("space-newpass").waitFor({ timeout: 20000 });
      await page.getByTestId("space-newpass").fill("a brand new passphrase");
      await page.getByTestId("space-newpass-again").fill("a brand new passphrase");
      await page.getByTestId("space-newpass-save").click();
      await page.getByTestId("space-sheet").waitFor({ state: "detached", timeout: 20000 });
      await page.reload({ waitUntil: "load" });
      await page.getByTestId("space-sheet").waitFor({ timeout: 30000 });
      await page.getByTestId("space-unlock-pass").fill(PASSPHRASE);
      await page.getByTestId("space-unlock").click();
      await page.locator("[data-testid=space-sheet] [role=alert]").waitFor({ timeout: 20000 });
      await unlockSpace(page, "a brand new passphrase");
      await page.getByTestId("studio-natal").waitFor({ timeout: 20000 });
      console.log("recovery code and new passphrase OK");

      // 4. Stay unlocked on this device.
      await setSpaceLock(page, "stay");
      await page.reload({ waitUntil: "load" });
      await page.getByTestId("studio-natal").waitFor({ timeout: 30000 });
      if (await page.getByTestId("space-sheet").count()) throw new Error("asked to unlock while staying unlocked");
      const library = await readSpaceRecord(page, "state/library");
      if (library?.order?.length !== 2) throw new Error(`library record: ${JSON.stringify(library)}`);
      await setSpaceLock(page, "close");
      await page.reload({ waitUntil: "load" });
      await page.getByTestId("space-sheet").waitFor({ timeout: 30000 });
      console.log("stay signed in on and off OK");

      // A space from before (locking when Ulune closes only because that was the default): its next unlock keeps it signed in.
      await page.evaluate(
        () =>
          new Promise((resolve, reject) => {
            const r = indexedDB.open("ulune-space");
            r.onsuccess = () => {
              const db = r.result;
              const tx = db.transaction("meta", "readwrite");
              const store = tx.objectStore("meta");
              const get = store.get("space");
              get.onsuccess = () => {
                const meta = { ...get.result, lock: "close" };
                delete meta.lockSet;
                store.put(meta, "space");
              };
              tx.oncomplete = () => {
                db.close();
                resolve(null);
              };
              tx.onerror = () => reject(tx.error);
            };
          }),
      );
      await unlockSpace(page, "a brand new passphrase");
      await page.waitForFunction(() => localStorage.getItem("ulune.space") === "stay", null, { timeout: 8000 });
      await page.reload({ waitUntil: "load" });
      await page.getByTestId("studio-natal").waitFor({ timeout: 30000 });
      if (await page.getByTestId("space-sheet").count()) throw new Error("a space from before still asks after its unlock");
      // Back to locking, chosen this time: kept.
      await setSpaceLock(page, "close");
      await page.reload({ waitUntil: "load" });
      await page.getByTestId("space-sheet").waitFor({ timeout: 30000 });
      console.log("a space from before stays signed in from its next unlock; a chosen lock is kept");

      // 5. Just look, without it.
      await page.getByTestId("space-just-look").click();
      await page.getByTestId("space-sheet").waitFor({ state: "detached" });
      if (await page.getByTestId("studio-natal").count()) throw new Error("just looking showed the space's chart");
      await castFixture(page, FIXTURE_A);
      const offer = await page.getByTestId("keep-offer").innerText();
      if (!/Unlock/.test(offer)) throw new Error(`the offer under a chart with a locked space: "${offer}"`);
      if (errors.length) throw new Error(`page errors: ${errors.join(" | ")}`);
      await context.close();
      console.log("just look with a locked space OK");
    }

    // 4b. The browser closed and opened again, as after a restart: still signed in.
    {
      const profile = await mkdtemp(join(tmpdir(), "ulune-profile-"));
      const open = async () => {
        const context = await chromium.launchPersistentContext(profile, {
          headless: true,
          args: ["--no-sandbox", "--disable-dev-shm-usage"],
          viewport: VIEWPORTS[1280],
        });
        const page = context.pages()[0] ?? (await context.newPage());
        page.setDefaultTimeout(20000);
        return { context, page };
      };
      try {
        let { context, page } = await open();
        await gotoApp(page);
        await castFixture(page, FIXTURE_A);
        await createSpace(page);
        await page.waitForTimeout(800);
        await context.close();
        ({ context, page } = await open());
        await gotoApp(page);
        await page.getByTestId("studio-natal").waitFor({ timeout: 30000 });
        if (await page.getByTestId("space-sheet").count()) throw new Error("asked to sign in again after the browser was closed");
        if ((await page.getByTestId("space-button").getAttribute("data-space")) !== "open") throw new Error("the space is not open after a restart");
        if ((await chipText(page)).indexOf(FIXTURE_A.name) < 0) throw new Error("the chart after a restart");
        await page.screenshot({ path: join(SHOTS, "space-after-restart-1280.png") });
        await context.close();
        console.log("still signed in after closing and opening the browser");
      } finally {
        await rm(profile, { recursive: true, force: true });
      }
    }

    // 6. Charts from before, in the clear.
    const row = await castRow(browser);
    const seed = {
      fn: (r) => {
        if (sessionStorage.getItem("seeded")) return;
        sessionStorage.setItem("seeded", "1");
        localStorage.setItem("orbis.charts.v1", JSON.stringify([r]));
        localStorage.setItem("orbis.charts.active", r.id);
        localStorage.setItem("orbis.synastry.partner", "");
      },
      arg: row,
    };
    {
      const { context, page, errors } = await newPage(browser, 1280, seed);
      await gotoApp(page);
      await page.getByTestId("space-sheet").waitFor({ timeout: 30000 });
      if ((await page.getByTestId("space-sheet").getAttribute("data-step")) !== "legacy") throw new Error("no question about charts from before");
      await page.screenshot({ path: join(SHOTS, "space-legacy-1280.png") });
      if ((await chipText(page)).indexOf(FIXTURE_A.name) < 0) throw new Error("the charts from before are not shown");
      await page.getByTestId("space-legacy-keep").click();
      await page.getByTestId("space-pass").fill(PASSPHRASE);
      await page.getByTestId("space-pass-again").fill(PASSPHRASE);
      await page.getByTestId("space-create").click();
      await page.getByTestId("space-code-kept").check({ timeout: 30000 });
      await page.getByTestId("space-done").click();
      // legacy names: what the prototype wrote is gone once kept in the space
      await page.waitForFunction(() => !Object.keys(localStorage).some((k) => /^(orbis|ulune)\.(charts|synastry|composite|firstview|account)/.test(k)), null, { timeout: 8000 });
      assertNothingPersonal(await storageDump(page), "kept from before");
      await page.reload({ waitUntil: "load" });
      await page.getByTestId("studio-natal").waitFor({ timeout: 30000 });
      if ((await chipText(page)).indexOf(FIXTURE_A.name) < 0) throw new Error("the chart from before is not in the space");
      if (errors.length) throw new Error(`page errors: ${errors.join(" | ")}`);
      await context.close();
      console.log("charts from before kept in a space OK");
    }
    {
      const { context, page } = await newPage(browser, 390, seed);
      await gotoApp(page);
      await page.getByTestId("space-sheet").waitFor({ timeout: 30000 });
      await page.screenshot({ path: join(SHOTS, "space-legacy-390.png") });
      await page.getByTestId("space-legacy-erase").click();
      // legacy names: nothing the prototype wrote is left
      const left = await page.evaluate(() => Object.keys(localStorage).filter((k) => /^(orbis|ulune)\.(charts|synastry|composite|firstview|account)/.test(k)));
      if (left.length) throw new Error(`erase left ${left.join(", ")}`);
      if ((await databases(page)).includes("ulune-space")) throw new Error("erasing made a database");
      await context.close();
      console.log("charts from before erased OK");
    }

    // 7. Passkeys.
    {
      const LOCAL = DEV.replace("127.0.0.1", "localhost");
      const { context, page, errors } = await newPage(browser);
      const cdp = await context.newCDPSession(page);
      await cdp.send("WebAuthn.enable");
      const first = (await cdp.send("WebAuthn.addVirtualAuthenticator", { options: AUTHENTICATOR })).authenticatorId;
      await page.goto(`${LOCAL}/`, { waitUntil: "load", timeout: 45000 });
      await page.waitForSelector("html.theme-ready", { timeout: 20000 });
      await castFixture(page, FIXTURE_A);
      await page.waitForFunction(() => document.querySelector("[data-testid=space-button]")?.getAttribute("data-space") === "none", null, { timeout: 20000 });

      // Signing in offers a passkey first; one that can't give its secret is refused and makes nothing.
      await page.getByTestId("space-button").click();
      await page.getByTestId("space-use-passkey").waitFor({ timeout: 45000 });
      await page.screenshot({ path: join(SHOTS, "space-choose-passkey-1280.png") });
      await alterPasskeys(page, "none");
      await page.getByTestId("space-use-passkey").click();
      const refused = await sheetAlert(page);
      if (!/can’t open a private space/.test(refused)) throw new Error(`a passkey without a secret: "${refused}"`);
      if ((await databases(page)).includes("ulune-space")) throw new Error("a refused passkey made a space");
      await alterPasskeys(page, "real");

      // The passkey makes the space (on a shared computer, so it locks): a passkey and the recovery code open it, nothing else.
      await page.getByTestId("space-shared").check();
      await page.getByTestId("space-use-passkey").click();
      await page.getByTestId("space-code").waitFor({ timeout: 30000 });
      const code = (await page.getByTestId("space-code").innerText()).trim();
      await page.getByTestId("space-code-kept").check();
      await page.getByTestId("space-done").click();
      await sheetGone(page);
      await page.waitForFunction(() => document.querySelector("[data-testid=space-button]")?.getAttribute("data-space") === "open", null, { timeout: 8000 });
      if ((await wrapKinds(page)).join() !== "passkey,recovery") throw new Error(`ways in: ${await wrapKinds(page)}`);
      assertNothingPersonal(await storageDump(page), "passkey space");

      // A reload asks for the passkey, which unlocks it.
      await page.reload({ waitUntil: "load" });
      await page.getByTestId("space-unlock-passkey").waitFor({ timeout: 45000 });
      if (await page.getByTestId("space-unlock-pass").count()) throw new Error("a passphrase asked for a space without one");
      await page.screenshot({ path: join(SHOTS, "space-unlock-passkey-1280.png") });
      await page.setViewportSize(VIEWPORTS[390]);
      await page.screenshot({ path: join(SHOTS, "space-unlock-passkey-390.png") });
      await page.setViewportSize(VIEWPORTS[1280]);
      await page.getByTestId("space-unlock-passkey").click();
      await sheetGone(page);
      await page.getByTestId("studio-natal").waitFor({ timeout: 20000 });
      if ((await chipText(page)).indexOf(FIXTURE_A.name) < 0) throw new Error("the chart did not come back with the passkey");
      console.log("passkey: refused without a secret; made the space; unlocked it");

      // Settings: a passphrase added, confirmed with the passkey.
      await page.getByTestId("space-button").click();
      await page.getByTestId("space-your-data").click();
      await page.getByTestId("space-ways").waitFor({ timeout: 20000 });
      if ((await page.getByTestId("space-way-passkey").count()) !== 1) throw new Error("the passkey is not listed");
      if (await page.getByTestId("space-passkey-remove").count()) throw new Error("the only way in can be removed");
      await page.getByTestId("space-passphrase-set").click();
      await page.getByTestId("space-confirm-passkey").click({ timeout: 30000 });
      await page.getByTestId("space-newpass").fill("a passphrase for later");
      await page.getByTestId("space-newpass-again").fill("a passphrase for later");
      await page.getByTestId("space-newpass-save").click();
      await sheetGone(page);
      await page.getByTestId("space-passphrase-remove").waitFor({ timeout: 20000 });
      if ((await wrapKinds(page)).join() !== "passkey,passphrase,recovery") throw new Error(`ways in: ${await wrapKinds(page)}`);

      // The same authenticator can't hold a second passkey for the space.
      await page.getByTestId("space-add-passkey").click();
      await page.getByTestId("space-confirm-passkey").click({ timeout: 30000 });
      const twice = await sheetAlert(page);
      if (!/already holds a passkey/.test(twice)) throw new Error(`a second passkey on one authenticator: "${twice}"`);
      await page.getByTestId("space-cancel").click();
      await sheetGone(page);

      // Another authenticator (a phone, a key): added after confirming with the passphrase; its secret comes when asked again.
      await cdp.send("WebAuthn.removeVirtualAuthenticator", { authenticatorId: first });
      await cdp.send("WebAuthn.addVirtualAuthenticator", { options: AUTHENTICATOR });
      await alterPasskeys(page, "later");
      await page.getByTestId("space-add-passkey").click();
      await page.getByTestId("space-confirm-pass").fill("a passphrase for later", { timeout: 30000 });
      await page.getByTestId("space-confirm").click();
      await sheetGone(page);
      await alterPasskeys(page, "real");
      if ((await page.getByTestId("space-way-passkey").count()) !== 2) throw new Error("the second passkey is not listed");
      await page.screenshot({ path: join(SHOTS, "settings-ways-1280.png"), fullPage: true });

      // The first passkey (on no authenticator now) removed, confirmed with the second.
      await page.getByTestId("space-passkey-remove").first().click();
      await page.getByTestId("space-confirm-passkey").click({ timeout: 30000 });
      await sheetGone(page);
      await page.waitForFunction(() => document.querySelectorAll("[data-testid=space-way-passkey]").length === 1, null, { timeout: 8000 });

      // A new recovery code, confirmed with the old one.
      await page.getByTestId("space-new-code").click();
      await page.getByTestId("space-confirm-use-code").click({ timeout: 30000 });
      await page.getByTestId("space-confirm-code-input").fill(code);
      await page.getByTestId("space-confirm-code").click();
      await page.getByTestId("space-code").waitFor({ timeout: 30000 });
      const fresh = (await page.getByTestId("space-code").innerText()).trim();
      if (fresh === code) throw new Error("the new recovery code is the old one");
      await page.getByTestId("space-code-kept").check();
      await page.getByTestId("space-done").click();
      await sheetGone(page);

      // The passphrase removed, confirmed with the passkey.
      await page.getByTestId("space-passphrase-remove").click();
      await page.getByTestId("space-confirm-passkey").click({ timeout: 30000 });
      await sheetGone(page);
      await page.waitForFunction(() => !document.querySelector("[data-testid=space-passphrase-remove]"), null, { timeout: 8000 });
      if ((await wrapKinds(page)).join() !== "passkey,recovery") throw new Error(`ways in: ${await wrapKinds(page)}`);
      console.log("settings: passphrase added and removed, passkeys added and removed, new recovery code");

      // Locked: the old recovery code no longer opens the space, the new one does.
      await page.getByTestId("back-to-studio").click();
      await page.waitForURL((u) => u.pathname === "/", { timeout: 20000 });
      await page.getByTestId("space-button").click();
      await page.getByTestId("space-lock-now").click();
      await page.waitForFunction(() => document.querySelector("[data-testid=space-button]")?.getAttribute("data-space") === "locked");
      await page.getByTestId("space-button").click();
      await page.getByTestId("space-use-code").click({ timeout: 30000 });
      await page.getByTestId("space-code-input").fill(code);
      await page.getByTestId("space-unlock-code").click();
      await sheetAlert(page);
      await page.getByTestId("space-code-input").fill(fresh);
      await page.getByTestId("space-unlock-code").click();
      await page.getByTestId("space-newpass").waitFor({ timeout: 20000 });
      await page.getByRole("button", { name: "Later" }).click();
      await sheetGone(page);
      await page.waitForFunction(() => document.querySelector("[data-testid=space-button]")?.getAttribute("data-space") === "open", null, { timeout: 8000 });
      if (errors.length) throw new Error(`page errors: ${errors.join(" | ")}`);
      await context.close();
      console.log("passkeys OK");
    }

    // 8. Backups.
    {
      const file = join(SHOTS, "space-backup.json");
      const deviceFile = join(SHOTS, "space-device-copy.json");
      const notBackup = join(SHOTS, "not-a-backup.json");
      await writeFile(notBackup, JSON.stringify({ app: "ulune", data: {} }));
      let code;
      {
        const { context, page, errors } = await newPage(browser);
        await gotoApp(page);
        await castFixture(page, FIXTURE_A);
        code = await createSpace(page);
        // Charts and no backup: a dot on the button, a line in its menu.
        await page.waitForSelector("[data-testid=space-button][data-due]", { timeout: 8000 });
        await page.getByTestId("space-button").click();
        const due = (await page.getByTestId("space-backup-due").innerText()).trim();
        if (due !== "No backup yet") throw new Error(`the menu's backup line: "${due}"`);
        await page.screenshot({ path: join(SHOTS, "space-menu-backup-1280.png") });
        const [download] = await Promise.all([page.waitForEvent("download"), page.getByTestId("space-backup-now").click()]);
        if (!/^ulune-private-space-\d{4}-\d{2}-\d{2}\.json$/.test(download.suggestedFilename())) throw new Error(`file name ${download.suggestedFilename()}`);
        await download.saveAs(file);
        const text = await readFile(file, "utf8");
        const backup = JSON.parse(text);
        if (backup.app !== "ulune" || backup.type !== "private-space" || !backup.items.some(([k]) => k.startsWith("chart/")))
          throw new Error("the backup's shape");
        for (const w of PERSONAL) if (text.includes(w)) throw new Error(`the backup holds "${w}" in the clear`);
        await page.waitForSelector("[data-testid=space-button]:not([data-due])", { timeout: 8000 });
        // A new chart: due again.
        await castFixture(page, FIXTURE_B);
        await page.waitForSelector("[data-testid=space-button][data-due]", { timeout: 8000 });
        await page.getByTestId("space-button").click();
        await page.getByTestId("space-your-data").click();
        await page.getByTestId("space-backup").waitFor({ timeout: 20000 });
        const line = (await page.getByTestId("space-backup-line").innerText()).trim();
        if (!/^Last backup .+\. Your charts have changed since\.$/.test(line)) throw new Error(`the backup line: "${line}"`);
        await page.getByTestId("settings-space").screenshot({ path: join(SHOTS, "settings-backup-1280.png") });
        // Add another device: the same sealed copy, saved here (headless Chromium has no share sheet).
        await page.getByTestId("space-add-device").click();
        await page.getByTestId("space-add-device-steps").waitFor({ timeout: 20000 });
        if ((await page.getByTestId("space-add-device-send").getAttribute("data-via")) !== "file") throw new Error("a share sheet in headless Chromium?");
        await page.screenshot({ path: join(SHOTS, "space-add-device-1280.png") });
        const [sent] = await Promise.all([page.waitForEvent("download"), page.getByTestId("space-add-device-send").click()]);
        if (!/^ulune-private-space-\d{4}-\d{2}-\d{2}\.json$/.test(sent.suggestedFilename())) throw new Error(`device copy name ${sent.suggestedFilename()}`);
        await sent.saveAs(deviceFile);
        const sentText = await readFile(deviceFile, "utf8");
        for (const w of PERSONAL) if (sentText.includes(w)) throw new Error(`the device copy holds "${w}" in the clear`);
        if (sentText.includes('"lock"') || sentText.includes("lockSet")) throw new Error("the device copy carries this device's lock");
        await page.getByTestId("space-add-device-done").waitFor({ timeout: 8000 });
        await page.getByTestId("space-add-device-close").click();
        await sheetGone(page);
        if (errors.length) throw new Error(`page errors: ${errors.join(" | ")}`);
        await context.close();
        console.log("backup: reminded, downloaded sealed, reminded again after a new chart");
      }
      {
        // Another browser: the backup restores the space.
        const { context, page, errors } = await newPage(browser, 390);
        await gotoApp(page);
        await page.waitForFunction(() => document.querySelector("[data-testid=space-button]")?.getAttribute("data-space") === "none", null, { timeout: 20000 });
        await page.getByTestId("space-button").click();
        await page.getByTestId("space-restore").click({ timeout: 45000 });
        await page.screenshot({ path: join(SHOTS, "space-from-device-390.png") });
        await page.getByTestId("space-backup-file").setInputFiles(notBackup);
        const refused = await sheetAlert(page);
        if (!/isn’t a backup from Ulune/.test(refused)) throw new Error(`a file that isn't a backup: "${refused}"`);
        await page.getByTestId("space-backup-file").setInputFiles(file);
        await page.getByTestId("space-backup-pass").fill("not the passphrase at all", { timeout: 20000 });
        await page.getByTestId("space-backup-open").click();
        await sheetAlert(page);
        if ((await databases(page)).includes("ulune-space")) throw new Error("a wrong passphrase left a space behind");
        await page.screenshot({ path: join(SHOTS, "space-restore-390.png") });
        await page.getByTestId("space-backup-pass").fill(PASSPHRASE);
        await page.getByTestId("space-backup-open").click();
        await sheetGone(page);
        await page.waitForFunction(() => document.querySelector("[data-testid=space-button]")?.getAttribute("data-space") === "open", null, { timeout: 8000 });
        await page.getByTestId("studio-natal").waitFor({ timeout: 20000 });
        const names = await libraryNames(page);
        if (names.length !== 1 || !names[0].includes(FIXTURE_A.name)) throw new Error(`restored charts: ${names.join(", ")}`);
        if (await page.locator("[data-testid=space-button][data-due]").count()) throw new Error("a backup is due right after restoring it");
        // It stays signed in on the new device too.
        if ((await page.evaluate(() => localStorage.getItem("ulune.space"))) !== "stay") throw new Error("a restored space doesn't stay signed in");
        await page.reload({ waitUntil: "load" });
        await page.getByTestId("studio-natal").waitFor({ timeout: 30000 });
        if (await page.getByTestId("space-sheet").count()) throw new Error("a restored space asks to unlock");
        if (errors.length) throw new Error(`page errors: ${errors.join(" | ")}`);
        await context.close();
        console.log("backup: restored in another browser, signed in there too");
      }
      {
        // Another device, from the copy Add another device made: both charts, on a shared computer (it locks).
        const { context, page, errors } = await newPage(browser, 390);
        await gotoApp(page);
        await page.waitForFunction(() => document.querySelector("[data-testid=space-button]")?.getAttribute("data-space") === "none", null, { timeout: 20000 });
        await page.getByTestId("space-button").click();
        await page.getByTestId("space-restore").click({ timeout: 45000 });
        await page.getByTestId("space-shared").check();
        await page.getByTestId("space-backup-file").setInputFiles(deviceFile);
        await page.getByTestId("space-backup-pass").fill(PASSPHRASE, { timeout: 20000 });
        await page.getByTestId("space-backup-open").click();
        await sheetGone(page);
        await page.getByTestId("studio-natal").waitFor({ timeout: 20000 });
        const names = await libraryNames(page);
        if (names.length !== 2) throw new Error(`charts from the other device: ${names.join(", ")}`);
        if ((await page.evaluate(() => localStorage.getItem("ulune.space"))) !== "locked") throw new Error("a shared computer's space stays signed in");
        await page.reload({ waitUntil: "load" });
        await page.getByTestId("space-sheet").waitFor({ timeout: 30000 });
        if (errors.length) throw new Error(`page errors: ${errors.join(" | ")}`);
        await context.close();
        console.log("another device: opened from the sealed copy; a shared computer locks");
      }
      {
        // Another space: the backup's charts join it, opened with the backup's own recovery code.
        const { context, page, errors } = await newPage(browser);
        await gotoApp(page);
        await castFixture(page, FIXTURE_B);
        await createSpace(page, "another space's passphrase");
        await page.getByTestId("space-button").click();
        await page.getByTestId("space-your-data").click();
        await page.getByTestId("space-backup-import").click({ timeout: 20000 });
        await page.getByTestId("space-backup-file").setInputFiles(file);
        await page.getByTestId("space-backup-use-code").click({ timeout: 20000 });
        await page.getByTestId("space-backup-code-input").fill(code);
        await page.getByTestId("space-backup-code").click();
        await sheetGone(page);
        await page.getByText("One chart added from the backup").waitFor({ timeout: 8000 });
        await page.getByTestId("space-backup-import").click();
        await page.getByTestId("space-backup-file").setInputFiles(file);
        await page.getByTestId("space-backup-pass").fill(PASSPHRASE, { timeout: 20000 });
        await page.getByTestId("space-backup-open").click();
        await sheetGone(page);
        await page.getByText("No new charts in this backup").waitFor({ timeout: 8000 });
        await page.getByTestId("back-to-studio").click();
        await page.waitForURL((u) => u.pathname === "/", { timeout: 20000 });
        const names = await libraryNames(page);
        if (names.length !== 2 || !names.some((n) => n.includes(FIXTURE_A.name))) throw new Error(`charts after adding: ${names.join(", ")}`);
        // Kept: sealed into this space, there after locking and unlocking.
        await page.getByTestId("space-button").click();
        await page.getByTestId("space-lock-now").click();
        await unlockSpace(page, "another space's passphrase");
        const again = await libraryNames(page);
        if (again.length !== 2) throw new Error(`charts after unlocking: ${again.join(", ")}`);
        if (errors.length) throw new Error(`page errors: ${errors.join(" | ")}`);
        await context.close();
        console.log("backup: its charts added to another space, once");
      }
    }

    // 9. Your data.
    {
      const leftovers = {
        fn: () => {
          if (sessionStorage.getItem("seeded")) return;
          sessionStorage.setItem("seeded", "1");
          localStorage.setItem("grok-auth.bearer-token", "old-token");
          localStorage.setItem("grok-auth.user-snapshot", JSON.stringify({ name: "Someone", email: "someone@example.com" }));
        },
      };
      const { context, page, errors } = await newPage(browser, 1280, leftovers);
      await gotoApp(page);
      await page.waitForFunction(() => !Object.keys(localStorage).some((k) => k.startsWith("grok-auth.")), null, { timeout: 8000 });
      await castFixture(page, FIXTURE_A);
      await createSpace(page);
      await addKey(page);
      await page.getByTestId("space-button").click();
      await page.getByTestId("space-your-data").click();
      await page.getByTestId("settings-data").waitFor({ timeout: 20000 });
      const where = await page.getByTestId("data-space").innerText();
      if (!/encrypted, on this device only/.test(where)) throw new Error(`what the space holds: "${where}"`);
      await page.getByTestId("settings-data").screenshot({ path: join(SHOTS, "settings-your-data-1280.png") });
      // The readable copy: the chart in the clear, no AI key.
      const [dl] = await Promise.all([page.waitForEvent("download"), page.getByTestId("data-export").click()]);
      const copyPath = join(SHOTS, "readable-copy.json");
      await dl.saveAs(copyPath);
      const copyText = await readFile(copyPath, "utf8");
      const copy = JSON.parse(copyText);
      if (copy.type !== "readable-copy" || copy.charts?.length !== 1 || copy.charts[0].input.name !== FIXTURE_A.name)
        throw new Error("the readable copy lacks the chart");
      if (copyText.includes(KEY) || copyText.includes("state/ai")) throw new Error("the readable copy holds an AI key");
      // The privacy notice, in both languages.
      await page.getByTestId("data-privacy").click();
      await page.getByTestId("privacy-page").waitFor({ timeout: 20000 });
      if (!/no cookies, no analytics/.test(await page.getByTestId("privacy-page").innerText())) throw new Error("the privacy notice");
      // Who publishes Ulune, with the address as a mail link.
      const who = page.getByTestId("privacy-who");
      if (!/published by \S+/.test(await who.innerText())) throw new Error("the privacy notice names no publisher");
      if (!/^mailto:[^@\s]+@[^@\s]+$/.test((await who.locator("a").getAttribute("href")) ?? "")) throw new Error("the publisher's address is not a mail link");
      await page.screenshot({ path: join(SHOTS, "privacy-1280.png"), fullPage: true });
      await setLang(page, "fr");
      if (!/pas de cookies/.test(await page.getByTestId("privacy-page").innerText())) throw new Error("the privacy notice in French");
      if (!/édité par \S+/.test(await page.getByTestId("privacy-who").innerText())) throw new Error("the publisher, in French");
      await page.goBack();
      await page.getByTestId("settings-data").waitFor({ timeout: 20000 });
      // Erase everything on this device (in French, with a setting of our own: both must go).
      await page.evaluate(() => localStorage.setItem("ulune.sentinel", "1"));
      await page.getByTestId("data-wipe").click();
      await page.getByTestId("data-wipe-ask").waitFor();
      await page.getByTestId("data-wipe-confirm").click();
      await page.waitForURL((u) => u.pathname === "/", { timeout: 20000 });
      await page.getByText("Everything Ulune kept on this device is erased.").waitFor({ timeout: 8000 });
      const after = await storageDump(page);
      if (after.dbs.includes("ulune-space")) throw new Error("erasing left the database");
      if (after.local["ulune.space"]) throw new Error("erasing left the space's flag");
      if (after.local["ulune.sentinel"] || (await page.evaluate(() => document.documentElement.lang)) !== "en")
        throw new Error("erasing left the settings");
      if (after.cacheNames.length) throw new Error(`erasing left caches: ${after.cacheNames.join(", ")}`);
      const workers = await page.evaluate(async () => (await navigator.serviceWorker?.getRegistrations?.())?.length ?? 0);
      if (workers) throw new Error("erasing left the offline copy");
      if ((await page.getByTestId("space-button").getAttribute("data-space")) !== "none") throw new Error("a space after erasing");
      if (errors.length) throw new Error(`page errors: ${errors.join(" | ")}`);
      await context.close();
      console.log("your data: readable copy, leftovers removed, everything erased, privacy notice");
    }
  } finally {
    await browser.close();
  }
  console.log(`SPACE OK (${DEV})`);
}

await run();
