/**
 * Birth form: sample chart, "I don't know the time", no silent first place,
 * keyboard place list, localized inline errors. Its keys are its own (the
 * bug-fix round, item 8): C, F, P, L and T typed into its fields are typed,
 * never the page's keys, and on a narrow screen, where it sits in the sheet,
 * Escape closing the place's suggestions leaves the sheet and the focus be.
 * On a phone with its keyboard up (a short screen, a touch pointer), the place
 * field rises under the bars and its suggestions open under it, whole on the
 * screen, the best match first (2.0.1: on an iPhone they ran off the top).
 */
import { chromium } from "playwright";
import { DEV, clickDockTab, ensureShotsDir, gotoApp, launch, setLang } from "./_lib.mjs";

async function run(width) {
  const { browser, page } = await launch(width);
  try {
    await gotoApp(page);
    await page.waitForSelector("#birth-date", { timeout: 20000 });

    // A date that doesn't exist: said precisely under the field, which is marked, described and focused.
    await page.locator("#birth-date").fill("31/02/1990");
    await page.getByTestId("cast-submit").click();
    await page.waitForTimeout(250);
    const bad = await page.evaluate(() => ({
      hint: document.querySelector("#err-birth-date")?.textContent ?? "",
      invalid: document.querySelector("#birth-date")?.getAttribute("aria-invalid"),
      described: document.querySelector("#birth-date")?.getAttribute("aria-describedby"),
      timeToo: Boolean(document.querySelector("#err-birth-time")),
      focus: document.activeElement?.id,
    }));
    if (!/doesn.t exist/i.test(bad.hint) || bad.invalid !== "true" || bad.described !== "err-birth-date" || !bad.timeToo || bad.focus !== "birth-date") {
      throw new Error(`31 February: ${JSON.stringify(bad)}`);
    }
    // A month in words is read, and written back as the form writes dates.
    await page.locator("#birth-date").fill("15 June 1990");
    await page.locator("#native-name").focus();
    const read = await page.locator("#birth-date").inputValue();
    if (read !== "15/06/1990") throw new Error(`"15 June 1990" read as "${read}"`);
    if (await page.locator("#birth-date").getAttribute("aria-invalid")) throw new Error("date still marked once fixed");
    // No place: the place field is marked and takes the focus.
    await page.getByTestId("time-unknown").check();
    await page.getByTestId("cast-submit").click();
    await page.waitForTimeout(250);
    const noPlace = await page.evaluate(() => ({
      hint: document.querySelector("#err-birth-place")?.textContent ?? "",
      invalid: document.querySelector("#birth-place")?.getAttribute("aria-invalid"),
      focus: document.activeElement?.id,
    }));
    if (!/city/i.test(noPlace.hint) || noPlace.invalid !== "true" || noPlace.focus !== "birth-place") {
      throw new Error(`no place: ${JSON.stringify(noPlace)}`);
    }

    // No silent first hit: typing a city and submitting shows the list.
    await page.locator("#native-name").fill("Birth QA");
    await page.locator("#birth-date").fill("15/06/1990");
    await page.getByTestId("time-unknown").check();
    if (!(await page.locator("#birth-time").isDisabled())) throw new Error("time field not disabled when time unknown");
    await page.locator("#birth-place").fill("Paris");
    await page.locator("#birth-place-list [role=option]").first().waitFor({ timeout: 12000 });
    await page.locator("#birth-place").press("Escape");
    // Escape closes the list; it never wipes what was typed (a search field would).
    if ((await page.locator("#birth-place").inputValue()) !== "Paris") throw new Error("Escape cleared the place field");
    await page.getByTestId("cast-submit").click();
    await page.locator("#birth-place-list [role=option]").first().waitFor({ timeout: 12000 });
    await page.waitForTimeout(300);
    const hint = await page.locator("#birth-form-hint").textContent();
    if (!/choose|choisissez/i.test(hint)) throw new Error(`no "choose a place" hint: "${hint}"`);
    if (await page.getByTestId("studio-natal").count()) throw new Error("cast without choosing a place");

    // Keyboard: arrow moves the active option; Enter picks it.
    await page.locator("#birth-place").focus();
    await page.locator("#birth-place").press("ArrowDown");
    const activeId = await page.locator("#birth-place").getAttribute("aria-activedescendant");
    if (!activeId) throw new Error("combobox has no active descendant");
    await page.locator("#birth-place").press("Enter");
    await page.getByTestId("cast-submit").click();
    await page.getByTestId("studio-natal").waitFor({ timeout: 45000 });
    console.log(`birth-${width} OK`);

    // The form again, in the Birth tab: the page's keys typed into its fields are letters, nothing more.
    await clickDockTab(page, "birth");
    await page.locator("#native-name").waitFor({ state: "visible", timeout: 8000 });
    const keysState = () =>
      page.evaluate(() => ({
        show: document.documentElement.hasAttribute("data-show"),
        compare: Boolean(document.querySelector("[data-testid=compare]")),
        picker: Boolean(document.querySelector("[data-testid=lang-picker]")?.getClientRects().length),
        view: document.querySelector("[data-view]")?.getAttribute("data-view") ?? "",
        path: location.pathname,
        sheet: document.querySelector("[data-testid=dock]")?.getAttribute("data-detent") ?? "",
      }));
    const calm = await keysState();
    await page.locator("#native-name").fill("");
    await page.locator("#native-name").pressSequentially("cfpltCFPLT", { delay: 20 });
    await page.waitForTimeout(300);
    if ((await page.locator("#native-name").inputValue()) !== "cfpltCFPLT") throw new Error(`the name field took "${await page.locator("#native-name").inputValue()}"`);
    if (JSON.stringify(await keysState()) !== JSON.stringify(calm)) throw new Error(`keys typed in the name field acted: ${JSON.stringify(await keysState())} (was ${JSON.stringify(calm)})`);
    await page.locator("#native-name").fill("Birth QA");
    // The place's suggestions, then Escape: the list closes, the sheet (on a narrow screen) and the focus stay.
    await page.locator("#birth-place").fill("Lyon");
    await page.locator("#birth-place-list [role=option]").first().waitFor({ timeout: 12000 });
    await page.locator("#birth-place").press("Escape");
    await page.waitForTimeout(400);
    const after = await keysState();
    const focus = await page.evaluate(() => document.activeElement?.id);
    if (after.sheet !== calm.sheet || focus !== "birth-place") throw new Error(`Escape in the place's suggestions: the sheet ${calm.sheet} → ${after.sheet}, the focus on "${focus}"`);
    console.log(`birth-${width} keys OK`);
  } finally {
    await browser.close();
  }

  // Sample chart on a fresh visit; French inline error.
  const second = await launch(width);
  try {
    const p = second.page;
    await gotoApp(p);
    await setLang(p, "fr");
    await p.waitForSelector("#birth-date", { timeout: 20000 });
    await p.getByTestId("cast-submit").click();
    const fr = await p.getByTestId("err-birth-date").innerText();
    if (!/date/i.test(fr)) throw new Error(`French validation missing: "${fr}"`);
    await p.getByTestId("sample-chart").click();
    await p.getByTestId("studio-natal").waitFor({ timeout: 45000 });
    console.log(`birth-${width} sample OK`);
  } finally {
    await second.browser.close();
  }
}

/** A phone with its keyboard up: 390 wide, a short visible screen, touch. */
async function phoneList(height) {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    await gotoApp(page);
    await page.waitForSelector("#birth-place", { timeout: 20000 });
    await page.locator("#birth-place").tap();
    await page.locator("#birth-place").pressSequentially("Paris", { delay: 30 });
    await page.locator("#birth-place-list [role=option]").first().waitFor({ timeout: 12000 });
    await page.waitForTimeout(500);
    const r = await page.evaluate(() => {
      const field = document.getElementById("birth-place").getBoundingClientRect();
      const list = document.getElementById("birth-place-list").getBoundingClientRect();
      const first = document.getElementById("birth-place-opt-0").getBoundingClientRect();
      const atField = document.elementFromPoint(field.left + field.width / 2, field.top + field.height / 2);
      return {
        vh: innerHeight,
        field: [Math.round(field.top), Math.round(field.bottom)],
        list: [Math.round(list.top), Math.round(list.bottom)],
        first: [Math.round(first.top), Math.round(first.bottom)],
        fieldSeen: atField?.id === "birth-place",
        firstSeen: document.elementFromPoint(first.left + 20, first.top + first.height / 2)?.closest("#birth-place-opt-0") !== null,
      };
    });
    const ok =
      r.fieldSeen &&
      r.firstSeen &&
      r.list[0] >= r.field[1] &&
      r.list[1] <= r.vh &&
      r.first[0] >= r.list[0] &&
      r.first[1] <= r.list[1];
    if (!ok) throw new Error(`phone ${height}: the place list ${JSON.stringify(r)}`);
    console.log(`birth-phone-${height} place list OK`);
  } finally {
    await browser.close();
  }
}

// A field low on the screen (the keyboard up, the page unable to rise): the list stands over it,
// its best match the row nearest the field, and nothing of it runs off the top.
async function phoneAbove() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 520 }, isMobile: true });
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    // Four suggestions, whatever the geocoder says today (the server function's reply, as it is serialised).
    const places = ["Saint-Denis, Île-de-France", "Saint-Étienne, Auvergne-Rhône-Alpes", "Saint-Malo, Brittany", "Saint-Nazaire, Pays de la Loire"];
    await page.route("**/_serverFn/**", async (route) => {
      if (route.request().method() !== "POST" || !(route.request().postData() ?? "").includes('"q","locale"')) return route.continue();
      const hits = places.map((label, n) => ({
        t: 10,
        i: 2 + n,
        p: { k: ["label", "latitude", "longitude", "timezone", "country", "detail"], v: [{ t: 1, s: label }, { t: 0, s: 48.8 + n / 10 }, { t: 0, s: 2.3 }, { t: 1, s: "Europe/Paris" }, { t: 1, s: "France" }, { t: 1, s: "1 000 people" }] },
        o: 0,
      }));
      const body = { t: 10, i: 0, p: { k: ["result", "error", "context"], v: [{ t: 9, i: 1, a: hits, o: 0 }, { t: 2, s: 1 }, { t: 11, i: 2 + places.length, p: { k: [], v: [] }, o: 0 }] }, o: 0 };
      await route.fulfill({ status: 200, contentType: "application/json", headers: { "x-tss-serialized": "true" }, body: JSON.stringify(body) });
    });
    await gotoApp(page);
    await page.waitForSelector("#birth-place", { timeout: 20000 });
    // The visible screen is the field's row and what is over it: nothing below but the keyboard.
    await page.evaluate(() => {
      const vv = {
        offsetTop: 0,
        offsetLeft: 0,
        width: 390,
        get height() {
          return Math.round(document.getElementById("birth-place").getBoundingClientRect().bottom + 20);
        },
        addEventListener() {},
        removeEventListener() {},
      };
      Object.defineProperty(window, "visualViewport", { value: vv, configurable: true });
    });
    await page.locator("#birth-place").click();
    await page.locator("#birth-place").pressSequentially("Saint", { delay: 30 });
    await page.locator("#birth-place-list [role=option]").first().waitFor({ timeout: 12000 });
    await page.waitForTimeout(500);
    const r = await page.evaluate(() => {
      const field = document.getElementById("birth-place").getBoundingClientRect();
      const list = document.getElementById("birth-place-list").getBoundingClientRect();
      const first = document.getElementById("birth-place-opt-0").getBoundingClientRect();
      const second = document.getElementById("birth-place-opt-1")?.getBoundingClientRect();
      return {
        field: [Math.round(field.top), Math.round(field.bottom)],
        list: [Math.round(list.top), Math.round(list.bottom)],
        first: [Math.round(first.top), Math.round(first.bottom)],
        second: second ? [Math.round(second.top), Math.round(second.bottom)] : null,
        firstSeen: document.elementFromPoint(first.left + 20, first.top + first.height / 2)?.closest("#birth-place-opt-0") !== null,
      };
    });
    const ok =
      r.list[1] <= r.field[0] &&
      r.list[0] >= 0 &&
      r.firstSeen &&
      r.first[1] <= r.list[1] &&
      r.list[1] - r.first[1] <= 12 &&
      r.second !== null && r.second[1] <= r.first[0] + 1;
    if (!ok) throw new Error(`phone above: the place list ${JSON.stringify(r)}`);
    console.log("birth-phone-above place list OK");
  } finally {
    await browser.close();
  }
}

await ensureShotsDir();
for (const w of [390, 1280]) await run(w);
for (const h of [340, 480]) await phoneList(h);
await phoneAbove();
console.log("BIRTH OK", DEV);
