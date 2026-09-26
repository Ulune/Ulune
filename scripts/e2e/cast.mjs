import { join } from "node:path";
import {
  DEV,
  FIXTURE_A,
  FIXTURE_B,
  SHOTS,
  assertFixtureA,
  assertNoOverflow,
  ensureShotsDir,
  gotoApp,
  keepCharts,
  launch,
  setLang,
} from "./_lib.mjs";

const GROUP_OF = {
  natal: "chart",
  transits: "time",
  timing: "time",
  progressions: "time",
  synastry: "pair",
  composite: "pair",
  design: "systems",
  numerology: "systems",
};

async function shot(page, file) {
  try {
    await page.screenshot({ path: file, timeout: 4000, animations: "disabled" });
  } catch (err) {
    console.warn(`screenshot skipped (${file}): ${err instanceof Error ? err.message : err}`);
  }
}

async function pickPlace(page, query) {
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

async function typeInto(page, id, value) {
  const el = page.locator(`#${id}`);
  await el.evaluate((node) => {
    if (node instanceof HTMLElement) node.focus();
  });
  await el.fill("");
  await el.pressSequentially(value, { delay: 15 });
}

async function waitFocus(page, id, what) {
  await page.waitForFunction((want) => document.activeElement?.id === want, id, { timeout: 4000 }).catch(async () => {
    const got = await page.evaluate(() => document.activeElement?.id);
    throw new Error(`${what} (focus=${got})`);
  });
}

async function openPicker(page) {
  const picker = page.getByTestId("chart-picker");
  if (await picker.isVisible().catch(() => false)) return;
  await page.getByTestId("chart-chip").click();
  await picker.waitFor({ state: "visible" });
}

async function closePicker(page) {
  const picker = page.getByTestId("chart-picker");
  if (!(await picker.isVisible().catch(() => false))) return;
  await page.keyboard.press("Escape");
  await picker.waitFor({ state: "hidden" }).catch(() => {});
}

async function chipNames(page) {
  await openPicker(page);
  const names = await page.getByTestId("chart-row").evaluateAll((els) =>
    els.map((el) => el.getAttribute("data-name") ?? el.textContent?.trim() ?? "").filter(Boolean),
  );
  await closePicker(page);
  return names;
}

async function goMode(page, id) {
  const group = page.getByTestId(`mode-group-${GROUP_OF[id]}`);
  if (await group.isVisible().catch(() => false)) await group.click();
  await page.getByTestId(`studio-page-${id}`).click({ force: true });
}

async function selectedOptionText(page, testId) {
  const el = page.getByTestId(testId);
  await el.waitFor({ timeout: 15000 });
  return el.evaluate((node) => {
    if (!(node instanceof HTMLSelectElement)) return node.textContent?.trim() ?? "";
    return node.options[node.selectedIndex]?.textContent?.trim() ?? "";
  });
}

async function fillBirth(page, fixture, { checkAdvance = false, checkPlaceKeepsBirth = false, checkBackspace = false, checkPlaceKeys = false } = {}) {
  await page.waitForSelector("#native-name", { timeout: 20000 });
  await page.locator("#native-name").fill(fixture.name);
  await typeInto(page, "birth-date", fixture.date);

  if (checkAdvance) {
    await waitFocus(page, "birth-time", "date did not auto-advance to time");
  }

  if (checkBackspace) {
    await page.locator("#birth-date").evaluate((node) => {
      if (node instanceof HTMLElement) node.focus();
    });
    const before = await page.locator("#birth-date").inputValue();
    if (!before) throw new Error("date empty before backspace check");
    await page.locator("#birth-date").press("End");
    await page.locator("#birth-date").press("Backspace");
    const after = await page.locator("#birth-date").inputValue();
    if (after.length !== before.length - 1) {
      throw new Error(`backspace did not delete one char: "${before}" → "${after}"`);
    }
    const focused = await page.evaluate(() => document.activeElement?.id);
    if (focused !== "birth-date") {
      throw new Error(`backspace jumped focus to ${focused}`);
    }
    await typeInto(page, "birth-date", fixture.date);
    if (checkAdvance) {
      await waitFocus(page, "birth-time", "date did not auto-advance to time after restore");
    }
  }

  await typeInto(page, "birth-time", fixture.time);

  if (checkAdvance) {
    await waitFocus(page, "birth-place", "time did not auto-advance to place");
  }

  const dateBeforePlace = await page.locator("#birth-date").inputValue();
  const timeBeforePlace = await page.locator("#birth-time").inputValue();

  if (checkPlaceKeys) {
    await page.locator("#birth-place").fill(fixture.place);
    const list = page.locator("#birth-place-list [role=option] button");
    await list.first().waitFor({ timeout: 12000 });
    await page.locator("#birth-place").press("Escape");
    const stillOpen = await list.first().isVisible().catch(() => false);
    if (stillOpen) throw new Error("Escape did not close the place list");
    await page.locator("#native-name").focus();
    await page.locator("#birth-place").focus();
    await list.first().waitFor({ timeout: 8000 });
    await page.locator("#birth-place").press("Enter");
    const picked = await page.locator("#birth-place").inputValue();
    if (!picked) throw new Error("Enter in open place list did not pick the first hit");
  } else {
    await pickPlace(page, fixture.place);
  }

  if (checkPlaceKeepsBirth) {
    const dateAfter = await page.locator("#birth-date").inputValue();
    const timeAfter = await page.locator("#birth-time").inputValue();
    if (dateAfter !== dateBeforePlace || timeAfter !== timeBeforePlace) {
      throw new Error(
        `place pick cleared birth fields: date ${dateBeforePlace}→${dateAfter} time ${timeBeforePlace}→${timeAfter}`,
      );
    }
  }
}

async function assertKeyboard(page) {
  await page.waitForSelector("#native-name", { timeout: 20000 });
  await page.locator("#native-name").focus();
  await page.keyboard.press("Tab");
  await waitFocus(page, "birth-date", "tab Name → Date");
  await page.keyboard.press("Tab");
  const calendar = await page.evaluate(() => document.activeElement?.getAttribute("data-testid"));
  if (calendar !== "birth-date-calendar") throw new Error(`tab Date → Calendar (focus=${calendar})`);
  await page.keyboard.press("Tab");
  await waitFocus(page, "birth-time", "tab Calendar → Time");
  await page.keyboard.press("Tab");
  await waitFocus(page, "time-unknown", "tab Time → I don’t know the time");
  await page.keyboard.press("Tab");
  await waitFocus(page, "birth-place", "tab Time unknown → Place");
  await page.keyboard.press("Tab");
  const options = await page.evaluate(() => document.activeElement?.closest("[data-testid=birth-options]") != null);
  if (!options) throw new Error("tab Place → Options");
  await page.keyboard.press("Tab");
  const afterOptions = await page.evaluate(
    () => document.activeElement?.getAttribute("data-testid") || document.activeElement?.id,
  );
  if (afterOptions !== "cast-submit") {
    throw new Error(`tab Options → Cast (focus=${afterOptions})`);
  }

  await page.locator("#native-name").focus();
  await page.keyboard.press("Enter");
  await waitFocus(page, "birth-date", "enter Name → Date");
  await page.locator("#birth-date").focus();
  await page.keyboard.press("Enter");
  await waitFocus(page, "birth-time", "enter Date → Time");
  await page.locator("#birth-time").focus();
  await page.keyboard.press("Enter");
  await waitFocus(page, "birth-place", "enter Time → Place");
}

async function clickAddSecond(page, mode) {
  const barId = `${mode}-add-second`;
  const wheelId = `${mode}-add-second-wheel`;
  await page.waitForFunction(
    ({ barId, wheelId }) =>
      Boolean(document.querySelector(`[data-testid="${barId}"]`) || document.querySelector(`[data-testid="${wheelId}"]`)),
    { barId, wheelId },
    { timeout: 8000 },
  );
  await page.evaluate(
    ({ barId, wheelId }) => {
      const el =
        document.querySelector(`[data-testid="${barId}"]`) || document.querySelector(`[data-testid="${wheelId}"]`);
      if (el instanceof HTMLElement) el.click();
    },
    { barId, wheelId },
  );
}

/** What stood around the birth form's kicker (a failed read says why). */
async function kickerState(page) {
  return page.evaluate(() => {
    const hidden = (el) => {
      const out = [];
      for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
        const cs = getComputedStyle(n);
        if (cs.visibility !== "visible" || cs.display === "none") out.push(`${n.tagName.toLowerCase()}.${n.className}`.slice(0, 60));
      }
      return out;
    };
    const html = document.documentElement;
    return {
      url: location.href,
      html: [...html.attributes].map((a) => a.name).filter((n) => n.startsWith("data-")),
      kickers: [...document.querySelectorAll("[data-testid=birth-kicker]")].map((el) => ({
        text: el.textContent,
        hiddenBy: hidden(el),
      })),
      partnerForm: Boolean(document.querySelector("[data-on-stage] form[data-mode=partner]")),
      panel: document.querySelector(".ob-panel")?.getAttribute("data-detent") ?? null,
    };
  });
}

async function addPartner(page, mode, fixture) {
  await goMode(page, mode);
  await clickAddSecond(page, mode);
  // The partner form takes the stage (panel hidden) instead of a dock tab.
  await page.locator("[data-on-stage] form[data-mode=partner]").waitFor({ timeout: 8000 });
  await page.getByTestId("birth-kicker").waitFor({ timeout: 8000 });
  const kicker = (await page.getByTestId("birth-kicker").innerText()).trim();
  if (!/second person/i.test(kicker)) {
    throw new Error(`${mode} partner kicker EN: expected "Second person", got "${kicker}"`);
  }
  const chip = (await page.getByTestId("chart-chip").innerText()).trim();
  if (!chip.includes(FIXTURE_A.name)) {
    throw new Error(`${mode} header chip lost A while adding partner: "${chip}"`);
  }
  await setLang(page, "fr");
  const kickerFr = (await page.getByTestId("birth-kicker").innerText()).trim();
  if (!/deuxi[eè]me personne/i.test(kickerFr)) {
    // Seen once (390, composite, 1 run in 8): the kicker read empty. Say what
    // the page held at that moment, then see whether it was only a passing state.
    const state = await kickerState(page);
    const settled = await page
      .waitForFunction(
        () => /deuxi[eè]me personne/i.test(document.querySelector("[data-testid=birth-kicker]")?.innerText ?? ""),
        null,
        { timeout: 3000 },
      )
      .then(() => true)
      .catch(() => false);
    if (!settled) {
      throw new Error(`${mode} partner kicker FR: expected "Deuxième personne", got "${kickerFr}" ${JSON.stringify(state)}`);
    }
    console.warn(`${mode} partner kicker FR was empty for a moment: ${JSON.stringify(state)}`);
  }
  await setLang(page, "en");
  await fillBirth(page, fixture);
  await page.getByTestId("cast-submit").click();
  await page.getByTestId(`studio-${mode}`).waitFor({ timeout: 45000 });
  const bName = await selectedOptionText(page, `${mode}-person-b`);
  if (!bName.includes(fixture.name)) {
    throw new Error(`${mode}-person-b expected ${fixture.name}, got "${bName}"`);
  }
  const ringId = mode === "synastry" ? "synastry-ring" : "composite-wheel";
  await page.getByTestId(ringId).waitFor({ timeout: 15000 });
}

async function removeNamed(page, name) {
  await openPicker(page);
  const row = page.locator("[data-testid=chart-row]").filter({ hasText: name });
  await row.getByRole("button").first().click();
  await openPicker(page);
  await page.getByTestId("chart-remove").click();
  await page.getByTestId("chart-remove-confirm").click();
  await page.getByTestId("chart-picker").waitFor({ state: "hidden", timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(200);
}

async function runViewport(width) {
  const { browser, page } = await launch(width);
  try {
    await gotoApp(page);
    page.on("dialog", (dialog) => {
      void dialog.accept();
    });
    console.log(`${width} loaded`);
    // Charts kept across reloads: a private space that stays unlocked here.
    await keepCharts(page);
    await page.locator("#native-name").waitFor({ timeout: 20000 });

    await assertKeyboard(page);
    console.log(`${width} keyboard`);

    await fillBirth(page, FIXTURE_A, {
      checkAdvance: true,
      checkPlaceKeepsBirth: true,
      checkBackspace: true,
      checkPlaceKeys: true,
    });
    console.log(`${width} filled A`);
    await page.getByTestId("cast-submit").click();
    await page.getByTestId("studio-natal").waitFor({ timeout: 45000 });
    await assertFixtureA(page);
    await assertNoOverflow(page);
    console.log(`${width} cast A`);

    await page.reload({ waitUntil: "load" });
    await page.waitForSelector("html.theme-ready", { timeout: 20000 });
    await page.getByTestId("studio-natal").waitFor({ timeout: 20000 });
    const afterReload = await chipNames(page);
    if (!afterReload.some((l) => l.includes(FIXTURE_A.name))) {
      throw new Error(`guest library lost ${FIXTURE_A.name} after reload: ${afterReload.join(",")}`);
    }
    console.log(`${width} reloaded`);
    await shot(page, join(SHOTS, `w1-cast-${width}.png`));

    await addPartner(page, "synastry", FIXTURE_B);
    console.log(`${width} synastry partner`);

    await page.reload({ waitUntil: "load" });
    await page.waitForSelector("html.theme-ready", { timeout: 20000 });
    await goMode(page, "synastry");
    const keptB = await selectedOptionText(page, "synastry-person-b");
    if (!keptB.includes(FIXTURE_B.name)) {
      throw new Error(`guest reload lost synastry partner: "${keptB}"`);
    }
    const keptRows = await chipNames(page);
    if (!keptRows.some((l) => l.includes(FIXTURE_A.name)) || !keptRows.some((l) => l.includes(FIXTURE_B.name))) {
      throw new Error(`guest reload lost library: ${keptRows.join(",")}`);
    }
    console.log(`${width} partner persisted`);

    await removeNamed(page, FIXTURE_B.name);
    await addPartner(page, "composite", FIXTURE_B);
    console.log(`${width} composite partner`);

    const beforeEdit = await chipNames(page);
    await openPicker(page);
    await page.getByTestId("chart-edit").click();
    await page.waitForSelector("#native-name", { timeout: 8000 });
    const dateVal = await page.locator("#birth-date").inputValue();
    const timeVal = await page.locator("#birth-time").inputValue();
    if (dateVal !== FIXTURE_A.date) throw new Error(`edit date expected ${FIXTURE_A.date}, got "${dateVal}"`);
    if (timeVal !== FIXTURE_A.time) throw new Error(`edit time expected ${FIXTURE_A.time}, got "${timeVal}"`);
    await typeInto(page, "birth-time", "12:30");
    await page.getByTestId("cast-submit").click();
    await page.waitForFunction(
      () => document.querySelector("[data-testid=dock-tab-reading]")?.getAttribute("aria-selected") === "true",
      null,
      { timeout: 45000 },
    );
    const afterEdit = await chipNames(page);
    if (afterEdit.length !== beforeEdit.length) {
      throw new Error(`edit created a copy: ${beforeEdit.join(",")} → ${afterEdit.join(",")}`);
    }
    console.log(`${width} edited A`);

    console.log(`${width} opening table`);
    await page.goto(`${DEV}/?studio=table`, { waitUntil: "domcontentloaded", timeout: 20000 });
    // Until the table is up, the empty caster must never be seen (the space
    // opens a moment after the app; the page waits for it).
    const flashed = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const t0 = performance.now();
          const look = () => {
            const empty = document.querySelector("[data-testid=studio-table-empty]");
            if (empty && getComputedStyle(empty).visibility !== "hidden" && empty.getBoundingClientRect().height > 0) return resolve("empty shown");
            if (document.querySelector("[data-testid=studio-table]")) return resolve("");
            if (performance.now() - t0 > 20000) return resolve("no table");
            requestAnimationFrame(look);
          };
          look();
        }),
    );
    if (flashed) throw new Error(`?studio=table: ${flashed}`);
    await shot(page, join(SHOTS, `w1-table-300ms-${width}.png`));

    await page.goto(`${DEV}/`, { waitUntil: "load", timeout: 20000 });
    await page.waitForSelector("html.theme-ready", { timeout: 20000 });
    const beforeRemove = await chipNames(page);
    await openPicker(page);
    await page.getByTestId("chart-remove").click();
    await page.getByTestId("chart-remove-confirm").click();
    await page.waitForTimeout(400);
    const leftover = await chipNames(page);
    if (leftover.length !== beforeRemove.length - 1) {
      throw new Error(`remove active did not drop one row: ${beforeRemove.join(",")} → ${leftover.join(",")}`);
    }
    console.log(`${width} removed active`);

    await openPicker(page);
    await page.getByTestId("chart-remove").click();
    await page.getByTestId("chart-remove-confirm").click();
    await page.waitForTimeout(400);
    const last = await chipNames(page);
    if (last.length) throw new Error(`last remove left rows: ${last.join(",")}`);
    // Last remove: the birth form takes the stage again.
    await page.locator("[data-on-stage] #native-name").waitFor({ timeout: 8000 });
    const natalLeft = await page.getByTestId("studio-natal").count();
    if (natalLeft) throw new Error("last remove left natal wheel");
    console.log(`${width} empty sky`);

    console.log(`w1-cast-${width} OK`);
  } finally {
    await browser.close();
  }
}

await ensureShotsDir();
const fail = [];
for (const width of [390, 1280]) {
  try {
    await runViewport(width);
  } catch (err) {
    fail.push(`${width}: ${err instanceof Error ? err.message : String(err)}`);
  }
}
if (fail.length) {
  console.error("W1 CAST FAIL\n" + fail.map((f) => "- " + f).join("\n"));
  process.exit(1);
}
console.log("W4 CAST OK", SHOTS);
