/**
 * Birth form: sample chart, "I don't know the time", no silent first place,
 * keyboard place list, localized inline errors.
 */
import { DEV, ensureShotsDir, gotoApp, launch, setLang } from "./_lib.mjs";

async function run(width) {
  const { browser, page } = await launch(width);
  try {
    await gotoApp(page);
    await page.waitForSelector("#birth-date", { timeout: 20000 });

    // A date that doesn't exist: said precisely, the field marked, described and focused.
    await page.locator("#birth-date").fill("31/02/1990");
    await page.getByTestId("cast-submit").click();
    await page.waitForTimeout(250);
    const bad = await page.evaluate(() => ({
      hint: document.querySelector("#birth-form-hint")?.textContent ?? "",
      invalid: document.querySelector("#birth-date")?.getAttribute("aria-invalid"),
      described: document.querySelector("#birth-date")?.getAttribute("aria-describedby"),
      focus: document.activeElement?.id,
    }));
    if (!/doesn.t exist/i.test(bad.hint) || bad.invalid !== "true" || bad.described !== "birth-form-hint" || bad.focus !== "birth-date") {
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
      hint: document.querySelector("#birth-form-hint")?.textContent ?? "",
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
    const fr = await p.locator("#birth-form-hint").innerText();
    if (!/date/i.test(fr)) throw new Error(`French validation missing: "${fr}"`);
    await p.getByTestId("sample-chart").click();
    await p.getByTestId("studio-natal").waitFor({ timeout: 45000 });
    console.log(`birth-${width} sample OK`);
  } finally {
    await second.browser.close();
  }
}

await ensureShotsDir();
for (const w of [390, 1280]) await run(w);
console.log("BIRTH OK", DEV);
