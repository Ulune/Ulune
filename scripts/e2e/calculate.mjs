// Where charts are calculated (on-device plan, steps 4 and 5): on this device by default, on
// Ulune's server as Settings' other choice, and never on the server without asking.
//   1. The first chart on a device: a quiet notice while the engine's files download (held back
//      here a moment each, as a slow connection would), with a progress bar; the chart is the
//      QA fixture's, nothing of it sent; the next chart downloads nothing and shows no notice.
//   2. Settings › Where charts are calculated: the device chosen by default, the server once
//      chosen sends each chart there (the birth form's note says so), the device again sends none.
//   3. A device that can't (no WebAssembly here): the question, its focus on the first answer;
//      Escape is Cancel (nothing sent, the cast says it failed); a new chart asks again; "Use the
//      server once" casts on the server and the views that follow go there too, the setting
//      unchanged; after a reload it asks again, and "Always use the server" changes the setting.
//   4. Its files fail (French, on a phone): the question says so; the server once.
//   5. A download that stalls: after 25 s of silence the question says it took too long.
// Screenshots: screenshots/e2e/calculate-*.png. `--quick` skips the stalled download.
import { join } from "node:path";
import { chromium } from "playwright";
import { DEV, FIXTURE_A, FIXTURE_B, SHOTS, VIEWPORTS, assertFixtureA, castFixture, ensureShotsDir, goStudioPage, gotoApp, pickPlace, serverFnName, setLang } from "./_lib.mjs";

const fail = [];
const QUICK = process.argv.includes("--quick");
const ENGINE_FILE = /\/ephe\/[\w.]+\.(?:se1|txt)$|\/assets\/[\w.-]+\.(?:se1|txt)$|swisseph[\w-]*\.wasm$/;

async function fresh(width, { init } = {}) {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const touch = width < 1024;
  const context = await browser.newContext({ viewport: VIEWPORTS[width], hasTouch: touch, isMobile: touch });
  if (init) await context.addInitScript(init);
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const calls = [];
  const engine = [];
  page.on("request", (r) => {
    const name = serverFnName(r.url());
    if (name) calls.push(name.split("_")[0]);
    if (ENGINE_FILE.test(new URL(r.url()).pathname)) engine.push(new URL(r.url()).pathname);
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  return { browser, context, page, calls, engine, errors };
}

const casts = (calls) => calls.filter((n) => /^cast/.test(n));

/** A first chart typed and sent, without waiting for it (it may be asked about, or fail). */
async function submitFixture(page, fixture) {
  await page.waitForSelector("#birth-date", { timeout: 20000 });
  await page.locator("#native-name").fill(fixture.name);
  await page.locator("#birth-date").fill(fixture.date);
  await page.locator("#birth-time").fill(fixture.time);
  await pickPlace(page, fixture.place);
  await page.getByTestId("cast-submit").click();
}
const shot = (page, name) => page.screenshot({ path: join(SHOTS, `calculate-${name}.png`) }).catch(() => {});

let legName = "";

/** What the page showed when a leg failed: its picture, and what it said aloud. */
async function failed(page, err) {
  const alerts = await page.getByRole("alert").allInnerTexts().catch(() => []);
  await page.screenshot({ path: join(SHOTS, `calculate-failed-${legName.replace(/\W+/g, "-")}.png`) }).catch(() => {});
  return new Error(`${err instanceof Error ? err.message : String(err)}${alerts.length ? ` (the page said: ${alerts.join(" | ")})` : ""}`);
}

async function leg(name, run) {
  legName = name;
  try {
    await run();
    console.log(`${name} OK`);
  } catch (err) {
    fail.push(`${name}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

await ensureShotsDir();

// 1. The first chart on a device, then the next.
await leg("first chart", async () => {
  const { browser, page, calls, engine, errors } = await fresh(1280);
  try {
    await page.route(ENGINE_FILE, async (route) => {
      await new Promise((r) => setTimeout(r, 900));
      await route.continue();
    });
    await gotoApp(page);
    const note = page.getByTestId("cast-note");
    if ((await note.getAttribute("data-calculate")) !== "device" || !/Calculated on this device/.test(await note.innerText())) throw new Error(`the form's note: ${await note.innerText()}`);
    const cast = castFixture(page, FIXTURE_A);
    const notice = page.getByTestId("engine-download");
    await notice.waitFor({ timeout: 20000 });
    const bar = notice.getByRole("progressbar");
    if ((await bar.getAttribute("aria-valuemax")) !== "100" || !(await bar.getAttribute("aria-label"))) throw new Error("the progress bar is not labelled");
    if (!/Setting up the calculations on this device, once/.test(await notice.innerText())) throw new Error(`the notice says "${await notice.innerText()}"`);
    await shot(page, "first-download-1280");
    await cast;
    await notice.waitFor({ state: "detached", timeout: 20000 });
    await assertFixtureA(page);
    if (casts(calls).length) throw new Error(`sent to the server: ${casts(calls).join(", ")}`);
    const first = engine.length;
    if (first < 7) throw new Error(`the engine's files fetched: ${engine.join(", ")}`);
    // The next chart: nothing downloaded, nothing shown.
    let shown = false;
    page.on("console", () => {});
    const watch = page.waitForSelector("[data-testid=engine-download]", { timeout: 6000 }).then(
      () => (shown = true),
      () => {},
    );
    await castFixture(page, FIXTURE_B);
    await watch;
    if (shown) throw new Error("the download's notice showed for the second chart");
    if (engine.length !== first) throw new Error(`the second chart fetched ${engine.slice(first).join(", ")}`);
    if (casts(calls).length) throw new Error(`sent to the server: ${casts(calls).join(", ")}`);
    if (errors.length) throw new Error(errors.join(" | "));
  } catch (err) {
    throw await failed(page, err);
  } finally {
    await browser.close();
  }
});

// 2. Settings: the device by default, the server when chosen, the device again.
await leg("settings", async () => {
  const { browser, page, calls, errors } = await fresh(1280);
  try {
    await gotoApp(page, "/settings");
    const card = page.getByTestId("settings-calculate");
    await card.waitFor();
    if (!(await page.getByTestId("calculate-device").isChecked())) throw new Error("the device is not chosen by default");
    for (const w of ["Where charts are calculated", "On this device (recommended)", "no date or time leaves it", "On Ulune’s server", "date, time and coordinates go there, never its name"]) {
      if (!(await card.innerText()).includes(w)) throw new Error(`the card lacks "${w}"`);
    }
    await card.screenshot({ path: join(SHOTS, "calculate-settings-1280.png") });
    await page.getByTestId("calculate-server").check();
    await page.waitForFunction(() => localStorage.getItem("ulune.calculate") === "server");
    await page.getByTestId("toast").filter({ hasText: "Charts are now calculated on Ulune’s server" }).first().waitFor({ timeout: 8000 });
    // "Your data" says what goes to the server now.
    if (!/Charts are calculated there/.test(await page.getByTestId("data-server").innerText())) throw new Error("Your data still says the device");
    await gotoApp(page);
    const note = page.getByTestId("cast-note");
    await note.waitFor();
    await page.waitForFunction(() => document.querySelector("[data-testid=cast-note]")?.getAttribute("data-calculate") === "server");
    if (!/Calculated on Ulune’s server/.test(await note.innerText())) throw new Error(`the form's note on the server: ${await note.innerText()}`);
    await castFixture(page, FIXTURE_A);
    await assertFixtureA(page);
    if (!casts(calls).includes("castChart")) throw new Error(`the chart did not go to the server: ${calls.join(", ")}`);
    await goStudioPage(page, "transits");
    await page.getByTestId("studio-transits").waitFor({ timeout: 30000 });
    await page.waitForFunction(() => document.querySelector("[data-testid=studio-transits] svg.ulune-wheel"), null, { timeout: 30000 });
    await page.waitForTimeout(1200);
    if (!casts(calls).includes("castTransits")) throw new Error("the transits did not go to the server");
    // The device again: nothing sent.
    await gotoApp(page, "/settings");
    await page.getByTestId("calculate-device").check();
    await page.waitForFunction(() => localStorage.getItem("ulune.calculate") === "device");
    const before = casts(calls).length;
    // (The studio opens on the page last used, the transits: the natal page's own address.)
    await gotoApp(page, "/astrology");
    await castFixture(page, FIXTURE_B);
    await goStudioPage(page, "transits");
    await page.getByTestId("studio-transits").waitFor({ timeout: 30000 });
    await page.waitForTimeout(1500);
    if (casts(calls).length !== before) throw new Error(`the device chosen again, still sent: ${casts(calls).slice(before).join(", ")}`);
    if (errors.length) throw new Error(errors.join(" | "));
  } catch (err) {
    throw await failed(page, err);
  } finally {
    await browser.close();
  }
});

// 3. A device that can't: no WebAssembly.
await leg("no WebAssembly", async () => {
  const { browser, page, calls, errors } = await fresh(1280, { init: () => delete window.WebAssembly });
  try {
    await gotoApp(page);
    await submitFixture(page, FIXTURE_A);
    const ask = page.getByTestId("engine-ask");
    await ask.waitFor({ timeout: 30000 });
    if ((await ask.getAttribute("role")) !== "alertdialog" || (await ask.getAttribute("aria-modal")) !== "true") throw new Error("the question is not a modal alert dialog");
    if ((await ask.getAttribute("data-why")) !== "E:engine.unsupported") throw new Error(`why: ${await ask.getAttribute("data-why")}`);
    const said = (await ask.innerText()).replace(/[ \t\r\n]+/g, " ");
    for (const w of ["This device can’t calculate charts right now", "This browser can’t run the calculations itself.", "never the name", "nothing is kept", "Use the server once", "Always use the server", "Cancel"]) {
      if (!said.includes(w)) throw new Error(`the question lacks "${w}": ${said}`);
    }
    if ((await page.evaluate(() => document.activeElement?.getAttribute("data-testid"))) !== "engine-once") throw new Error("the focus is not on the first answer");
    // Tab stays within the question.
    for (let i = 0; i < 3; i += 1) await page.keyboard.press("Tab");
    if ((await page.evaluate(() => document.activeElement?.getAttribute("data-testid"))) !== "engine-once") throw new Error("Tab left the question");
    await shot(page, "ask-unsupported-1280");
    // Escape: Cancel. Nothing sent, the cast says it failed.
    await page.keyboard.press("Escape");
    await ask.waitFor({ state: "detached", timeout: 8000 });
    // (The form sends the same birth again only after a moment: one cast per intent, birth-form.tsx.)
    await page.waitForTimeout(1600);
    await page.getByRole("alert").filter({ hasText: "Couldn’t cast the chart" }).first().waitFor({ timeout: 10000 });
    if (casts(calls).length) throw new Error(`Cancel, yet sent: ${casts(calls).join(", ")}`);
    // A new chart asks again; once: the server, for this visit, the setting unchanged.
    await page.getByTestId("cast-submit").click();
    await ask.waitFor({ timeout: 20000 });
    await page.getByTestId("engine-once").click();
    await page.getByTestId("studio-natal").waitFor({ timeout: 45000 });
    await assertFixtureA(page);
    if (!casts(calls).includes("castChart")) throw new Error("Use the server once: nothing went to the server");
    if (await page.evaluate(() => localStorage.getItem("ulune.calculate"))) throw new Error("Use the server once changed the setting");
    await goStudioPage(page, "transits");
    await page.getByTestId("studio-transits").waitFor({ timeout: 30000 });
    await page.waitForFunction(() => document.querySelector("[data-testid=studio-transits] svg.ulune-wheel"), null, { timeout: 30000 });
    if (await ask.count()) throw new Error("the transits asked again in the same visit");
    if (!casts(calls).includes("castTransits")) throw new Error("the transits did not follow to the server");
    // A new visit (the chart gone with the tab's memory) asks again; Always: the setting.
    await gotoApp(page, "/astrology");
    await submitFixture(page, FIXTURE_B);
    await ask.waitFor({ timeout: 30000 });
    await page.getByTestId("engine-always").click();
    await page.waitForFunction(() => localStorage.getItem("ulune.calculate") === "server", null, { timeout: 8000 });
    await page.getByTestId("studio-natal").waitFor({ timeout: 45000 });
    await gotoApp(page, "/settings");
    await page.getByTestId("settings-calculate").waitFor();
    if (!(await page.getByTestId("calculate-server").isChecked())) throw new Error("Always: Settings does not say the server");
    if (errors.length) throw new Error(errors.join(" | "));
  } catch (err) {
    throw await failed(page, err);
  } finally {
    await browser.close();
  }
});

// 4. Its files fail, on a phone, in French.
await leg("files fail (390, fr)", async () => {
  const { browser, page, calls } = await fresh(390);
  try {
    await page.route(ENGINE_FILE, (route) => route.fulfill({ status: 503, body: "busy" }));
    await gotoApp(page);
    await setLang(page, "fr");
    await submitFixture(page, FIXTURE_A);
    const ask = page.getByTestId("engine-ask");
    await ask.waitFor({ timeout: 30000 });
    const said = (await ask.innerText()).replace(/[ \t\r\n]+/g, " ");
    for (const w of ["Cet appareil ne peut pas calculer de thèmes pour l’instant", "Les fichiers de calcul ne se sont pas téléchargés.", "d’Ulune\u202f?", "Utiliser le serveur cette fois", "Toujours utiliser le serveur", "Annuler"]) {
      if (!said.includes(w)) throw new Error(`the question lacks "${w}": ${said}`);
    }
    const tap = await page.getByTestId("engine-cancel").boundingBox();
    if (!tap || tap.height < 44) throw new Error(`a tap target of ${tap?.height} px`);
    await shot(page, "ask-files-390-fr");
    await page.getByTestId("engine-once").click();
    await page.getByTestId("studio-natal").waitFor({ timeout: 45000 });
    if (!casts(calls).includes("castChart")) throw new Error("nothing went to the server");
  } catch (err) {
    throw await failed(page, err);
  } finally {
    await browser.close();
  }
});

// 5. A download that stalls.
if (!QUICK) {
  await leg("a stalled download", async () => {
    const { browser, page, calls } = await fresh(1280);
    try {
      await page.route(ENGINE_FILE, () => {
        /* never answered */
      });
      await gotoApp(page);
      await submitFixture(page, FIXTURE_A);
      const ask = page.getByTestId("engine-ask");
      await ask.waitFor({ timeout: 45000 });
      if ((await ask.getAttribute("data-why")) !== "E:engine.timeout") throw new Error(`why: ${await ask.getAttribute("data-why")}`);
      if (!/took too long to start/.test(await ask.innerText())) throw new Error("the question does not say it took too long");
      await page.getByTestId("engine-cancel").click();
      await ask.waitFor({ state: "detached", timeout: 8000 });
      if (casts(calls).length) throw new Error(`Cancel, yet sent: ${casts(calls).join(", ")}`);
    } catch (err) {
      throw await failed(page, err);
    } finally {
      await browser.close();
    }
  });
}

if (fail.length) {
  console.error(`CALCULATE FAIL\n- ${fail.join("\n- ")}`);
  process.exit(1);
}
console.log(`CALCULATE OK (${DEV})`);
