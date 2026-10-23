/**
 * The synced account before Ulune's server keeps accounts (the 2.0 fixes, item 4; docs/sync-protocol.md,
 * section 15): production answers every account operation 503 "unavailable" until the owner creates the
 * database and its secrets, and the app must say so calmly, never offer what would fail, and break nothing.
 * Against a server of its own whose account is off: a development server started here with
 * ULUNE_ACCOUNT_STORE=none (port 8096, stopped at the end), or with --built the production build with no
 * variable at all (`npm run build` first; scripts/perf/load/serve.mjs, port 9319), as Vercel runs it today.
 *
 *   1. The server: passkey/begin, the probe the app sends, answers 503 {"error":"unavailable"}, an hour to wait.
 *   2. Pages that don't offer the account ask nothing of it: the studio with a chart cast, Settings without a space.
 *   3. The private space made: its sheet asks once (an empty body), and offers no choice of where it is kept;
 *      "I already have a space on another device" says plainly that signing in from another device isn't
 *      available yet, the sealed file still offered; the space is made on this device and opens. Asked once
 *      for the whole visit.
 *   4. Settings › Private space: sync "not available yet", quietly, nothing to press, no alert; in French too.
 *   5. A new device opening a device link (/link#…) is told so plainly, in French.
 *   6. Nothing breaks or nags: no page error, no console error but the browser's own line for the account's
 *      503, no error report, no error toast.
 *
 * `--shots <dir>` saves the pictures there (the choice, the new device's step and Settings, in English and
 * French); otherwise in screenshots/e2e.
 */
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BUILT = process.argv.includes("--built");
const PORT = BUILT ? 9319 : 8096;
const BASE = `http://127.0.0.1:${PORT}`;
process.env.ULUNE_DEV = BASE;
const { FIXTURE_A, ROOT, SHOTS, castFixture, gotoApp, launch, setLang } = await import("./_lib.mjs");
const shotsAt = process.argv.indexOf("--shots");
const SHOT_DIR = shotsAt > 0 ? process.argv[shotsAt + 1] : SHOTS;
mkdirSync(SHOT_DIR, { recursive: true });
const PASS = "a calm passphrase for this device";
const PROBE = "/api/account/v1/passkey/begin";

const failures = [];
const fail = (why) => failures.push(why);

/* ------------------------------------------------------------ its own server, with the account off */

let server = null;
let said = "";
async function serverUp() {
  const env = { ...process.env };
  for (const k of ["ACCOUNT_DATABASE_URL", "ACCOUNT_SESSION_SECRET", "CRON_SECRET", "ACCOUNT_ORIGINS", "ULUNE_ACCOUNT_STORE", "ULUNE_DEV"]) delete env[k];
  // The development server with the account turned off; the build exactly as production runs it today, with nothing set.
  if (!BUILT) env.ULUNE_ACCOUNT_STORE = "none";
  const args = BUILT ? ["scripts/perf/load/serve.mjs", String(PORT)] : [join(ROOT, "node_modules/vite/bin/vite.js"), "dev", "--host", "127.0.0.1", "--port", String(PORT)];
  server = spawn(process.execPath, args, { cwd: ROOT, env, detached: true, stdio: ["ignore", "pipe", "pipe"] });
  for (const out of [server.stdout, server.stderr]) out.on("data", (d) => (said = `${said}${d}`.slice(-4000)));
  for (let i = 0; i < 240; i += 1) {
    try {
      if ((await fetch(`${BASE}/`)).status === 200) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`the server on ${PORT} did not start${BUILT ? " (npm run build first)" : ""}:\n${said}`);
}
async function serverDown() {
  if (!server) return;
  const gone = new Promise((r) => server.once("exit", r));
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    server.kill("SIGTERM");
  }
  await Promise.race([gone, new Promise((r) => setTimeout(r, 8000))]);
  try {
    process.kill(-server.pid, "SIGKILL");
  } catch {
    /* gone */
  }
  server = null;
}
// A run cut short leaves no server behind.
process.on("exit", () => {
  try {
    if (server) process.kill(-server.pid, "SIGKILL");
  } catch {
    /* gone */
  }
});

/* ------------------------------------------------------------ a browser, watched */

/** A browser of its own (a device), with what it sends to the account, its errors, its error reports and error toasts. */
async function device(width = 1280, lang = "en") {
  const { browser, page } = await launch(width);
  const watch = { account: [], reports: 0, errors: [], toasts: [] };
  page.on("request", (r) => {
    const path = new URL(r.url()).pathname;
    if (path.startsWith("/api/account/")) watch.account.push({ path, method: r.method(), body: r.postData() ?? "" });
    if (path === "/api/report") watch.reports += 1;
  });
  page.on("pageerror", (e) => watch.errors.push(`page error: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    // The browser's own line for an answer of 503 from the account: not the app's.
    if (/status of 503/.test(m.text()) && (m.location()?.url ?? "").includes("/api/account/")) return;
    watch.errors.push(`console: ${m.text().slice(0, 200)}`);
  });
  await page.addInitScript(() => {
    window.__errorToasts = [];
    new MutationObserver((changes) => {
      for (const c of changes) {
        for (const n of c.addedNodes) {
          if (n.nodeType !== 1) continue;
          for (const el of [n, ...n.querySelectorAll("[data-testid=toast]")]) if (el.matches("[data-testid=toast][data-tone=error]")) window.__errorToasts.push(el.textContent);
        }
      }
    }).observe(document, { childList: true, subtree: true });
  });
  const label = `${BUILT ? "built" : "dev"} ${width} ${lang}`;
  return { browser, page, watch, label };
}

/** What a device must not have met: errors, error reports, error toasts. */
async function calm(d) {
  for (const e of d.watch.errors) fail(`${d.label}: ${e}`);
  if (d.watch.reports) fail(`${d.label}: ${d.watch.reports} error report(s) sent`);
  const toasts = await d.page.evaluate(() => window.__errorToasts ?? []).catch(() => []);
  for (const t of toasts) fail(`${d.label}: an error toast "${t}"`);
}

const shot = (page, name) => page.screenshot({ path: join(SHOT_DIR, `${name}.png`), animations: "disabled" });

/** The private space's sheet, at its first step (the reader asked for a space). */
async function openChoice(page) {
  await page.getByTestId("space-button").waitFor({ timeout: 30000 });
  await page.waitForFunction(() => document.querySelector("[data-testid=space-button]")?.getAttribute("data-space") === "none", null, { timeout: 30000 });
  await page.getByTestId("space-button").click();
  await page.getByTestId("space-use-passphrase").waitFor({ timeout: 60000 });
}

/** The new device's step ("I already have a space on another device"): said plainly, the file still there, no way to the account. */
async function checkJoinStep(d, words) {
  const { page, label } = d;
  await page.getByTestId("space-restore").click();
  const note = page.getByTestId("sync-not-yet");
  await note.waitFor({ timeout: 15000 });
  const text = (await note.innerText()).trim();
  for (const w of words) if (!text.includes(w)) fail(`${label}: the new device's step says "${text}", not "${w}"`);
  for (const id of ["join-passkey", "join-qr", "join-pass-open", "join-code-open"]) if (await page.getByTestId(id).count()) fail(`${label}: the new device's step offers ${id}`);
  if (!(await page.getByTestId("space-backup-choose").count())) fail(`${label}: the new device's step no longer offers the file`);
  if (await page.locator("[data-testid=space-sheet] [role=alert]").count()) fail(`${label}: an alert on the new device's step`);
}

const WORDS = {
  en: {
    notYet: "Syncing with your other devices isn’t available yet.",
    file: "A sealed file from your other device still brings its space here.",
    hint: "Your space stays on this device",
    line: "This space is on this device only.",
  },
  fr: {
    notYet: "La synchronisation avec vos autres appareils n’est pas encore disponible.",
    file: "Un fichier scellé de votre autre appareil apporte quand même son espace ici.",
    hint: "Votre espace reste sur cet appareil",
    line: "Cet espace est sur cet appareil seulement.",
  },
};

/* ------------------------------------------------------------ the run */

await serverUp();
try {
  // 1. The probe the app sends, answered as production does today.
  const res = await fetch(`${BASE}${PROBE}`, { method: "POST", headers: { "content-type": "application/json", "sec-fetch-site": "same-origin" }, body: "{}" });
  const body = await res.text();
  if (res.status !== 503 || body !== '{"error":"unavailable"}' || res.headers.get("retry-after") !== "3600") fail(`the server's account: ${res.status} ${body} (Retry-After ${res.headers.get("retry-after")})`);
  else console.log(`server: the account answers 503 "unavailable", Retry-After 3600 (${BUILT ? "the production build, no variable set" : "development, ULUNE_ACCOUNT_STORE=none"})`);

  // 2–4. One device, English: nothing asked by the pages that don't offer the account; the space made; Settings.
  const d = await device(1280, "en");
  try {
    const { page, watch, label } = d;
    // The first page of a server just started compiles for a while.
    await page.goto(`${BASE}/`, { waitUntil: "load", timeout: 180000 });
    await gotoApp(page);
    await castFixture(page, FIXTURE_A);
    await gotoApp(page, "/settings");
    await page.getByTestId("settings-space").waitFor({ timeout: 30000 });
    await page.waitForTimeout(800);
    if (watch.account.length) fail(`${label}: pages that don't offer the account asked it: ${watch.account.map((a) => a.path).join(", ")}`);
    else console.log(`${label}: the studio, a chart cast and Settings without a space asked nothing of the account`);

    await gotoApp(page);
    await openChoice(page);
    if (await page.getByTestId("space-where").count()) fail(`${label}: the choice of where the space is kept is offered`);
    if (await page.getByTestId("space-where-sync").count()) fail(`${label}: "On this device and my other devices" is offered`);
    const probes = watch.account.filter((a) => a.path === PROBE);
    if (watch.account.length !== 1 || probes.length !== 1 || probes[0].method !== "POST" || probes[0].body !== "{}") fail(`${label}: the sheet asked the account ${JSON.stringify(watch.account)}`);
    await shot(page, "sync-unavailable-choice-en");
    await checkJoinStep(d, [WORDS.en.notYet, WORDS.en.file]);
    await shot(page, "sync-unavailable-join-en");
    await page.getByTestId("join-back").click();
    await page.getByTestId("space-use-passphrase").waitFor({ timeout: 10000 });
    if (await page.getByTestId("space-where").count()) fail(`${label}: the choice came back`);
    // The space made, on this device.
    await page.getByTestId("space-use-passphrase").click();
    await page.getByTestId("space-pass").fill(PASS);
    await page.getByTestId("space-pass-again").fill(PASS);
    await page.getByTestId("space-create").click();
    await page.getByTestId("space-code").waitFor({ timeout: 60000 });
    if (await page.getByTestId("sync-account-id").count()) fail(`${label}: an account id was shown`);
    await page.getByTestId("space-code-kept").check();
    await page.getByTestId("space-done").click();
    await page.getByTestId("space-sheet").waitFor({ state: "detached", timeout: 10000 });
    await page.waitForFunction(() => document.querySelector("[data-testid=space-button]")?.getAttribute("data-space") === "open", null, { timeout: 15000 });
    console.log(`${label}: the choice not offered, the new device's step plain, the space made on this device`);

    // Settings › Private space, through the page's own links (the same visit).
    await page.getByTestId("space-button").click();
    await page.getByTestId("space-your-data").click();
    await page.getByTestId("settings-space").waitFor({ timeout: 30000 });
    const part = page.locator("[data-testid=sync-settings][data-sync=unavailable]");
    await part.waitFor({ timeout: 15000 });
    const text = (await part.innerText()).replace(/\s+/g, " ");
    for (const w of [WORDS.en.line, WORDS.en.notYet, WORDS.en.hint]) if (!text.includes(w)) fail(`${label}: Settings says "${text}", not "${w}"`);
    if (await page.getByTestId("settings-sync-on").count()) fail(`${label}: Settings offers to turn sync on`);
    if (await page.locator("[data-testid=settings-space] [role=alert], [data-testid=settings-space] .ob-space-err").count()) fail(`${label}: an alert in Settings`);
    // The pictures once the space's "ready" toast has gone (it keeps the words of the language it was shown in).
    const noToast = () => page.waitForFunction(() => !document.querySelector("[data-testid=toast]"), null, { timeout: 15000 }).catch(() => {});
    await noToast();
    await part.scrollIntoViewIfNeeded();
    await shot(page, "sync-unavailable-settings-en");
    // In French, the same visit: said again, asked no more.
    await setLang(page, "fr");
    await page.waitForFunction((w) => (document.querySelector("[data-testid=sync-settings]")?.textContent ?? "").includes(w), WORDS.fr.notYet, { timeout: 10000 });
    const fr = (await part.innerText()).replace(/\s+/g, " ");
    for (const w of [WORDS.fr.line, WORDS.fr.notYet, WORDS.fr.hint]) if (!fr.includes(w)) fail(`${label}: Settings in French says "${fr}", not "${w}"`);
    await noToast();
    await part.scrollIntoViewIfNeeded();
    await shot(page, "sync-unavailable-settings-fr");
    await page.waitForTimeout(500);
    if (watch.account.length !== 1) fail(`${label}: the account was asked ${watch.account.length} times in one visit: ${watch.account.map((a) => a.path).join(", ")}`);
    else console.log(`${label}: Settings says "not available yet" quietly, nothing to press, in English and French; the account asked once for the whole visit`);
    await calm(d);
  } catch (e) {
    fail(`${d.label}: ${e instanceof Error ? e.message.split("\n")[0] : String(e)}`);
    await shot(d.page, "sync-unavailable-failed-en").catch(() => {});
  } finally {
    await d.browser.close();
  }

  // 3 again, a phone in French: the new device's step.
  const p = await device(390, "fr");
  try {
    const { page, label } = p;
    await page.goto(`${BASE}/`, { waitUntil: "load", timeout: 120000 });
    await gotoApp(page);
    await setLang(page, "fr");
    await openChoice(page);
    if (await page.getByTestId("space-where").count()) fail(`${label}: the choice of where the space is kept is offered`);
    await shot(page, "sync-unavailable-choice-fr-390");
    await checkJoinStep(p, [WORDS.fr.notYet, WORDS.fr.file]);
    await shot(page, "sync-unavailable-join-fr-390");
    await calm(p);
    console.log(`${label}: the new device's step says it plainly`);
  } catch (e) {
    fail(`${p.label}: ${e instanceof Error ? e.message.split("\n")[0] : String(e)}`);
  } finally {
    await p.browser.close();
  }

  // 5. A new device opening a device link (as a phone's camera would): said plainly, nothing else asked.
  const l = await device(390, "fr");
  try {
    const { page, watch, label } = l;
    await page.goto(`${BASE}/`, { waitUntil: "load", timeout: 120000 });
    await gotoApp(page);
    await setLang(page, "fr");
    // A link's text as a QR code holds it: the link's token and the opener's key (a P-256 point).
    const text = Buffer.concat([randomBytes(32), Buffer.from([4]), randomBytes(64)]).toString("base64url");
    await page.goto(`${BASE}/link#${text}`, { waitUntil: "load", timeout: 60000 });
    const problem = page.getByTestId("sync-link-problem");
    await problem.waitFor({ timeout: 30000 });
    const said = (await problem.innerText()).trim();
    if (said !== WORDS.fr.notYet) fail(`${label}: the device link says "${said}"`);
    await shot(page, "sync-unavailable-link-fr-390");
    const ops = [...new Set(watch.account.map((a) => a.path.replace("/api/account/v1/", "")))].sort().join(" ");
    if (ops !== "link/join passkey/begin") fail(`${label}: the device link asked ${ops}`);
    await calm(l);
    console.log(`${label}: a device link says it plainly (${ops})`);
  } catch (e) {
    fail(`${l.label}: ${e instanceof Error ? e.message.split("\n")[0] : String(e)}`);
  } finally {
    await l.browser.close();
  }
} finally {
  await serverDown();
}

if (failures.length) {
  console.error(`SYNC UNAVAILABLE FAIL (${BUILT ? "built" : "dev"})\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log(`SYNC UNAVAILABLE OK (${BUILT ? "the production build, no variable set" : "development, the account off"})`);
