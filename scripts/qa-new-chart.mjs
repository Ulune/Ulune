import { chromium } from "playwright";

const errors = [];
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

async function run(viewport, tag) {
  const page = await browser.newPage({ viewport });
  page.on("pageerror", (err) => errors.push(`${tag} ${String(err)}`));

  await page.addInitScript(() => {
    try {
      if (sessionStorage.getItem("qa-new-chart-booted")) return;
      sessionStorage.setItem("qa-new-chart-booted", "1");
      localStorage.removeItem("orbis.charts.v1");
      localStorage.removeItem("orbis.charts.active");
      localStorage.removeItem("ulune.wheel.bodies");
      localStorage.setItem("ulune.locale", "en");
    } catch {
      /* ignore */
    }
  });

  await page.goto("http://127.0.0.1:8097/", { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForSelector("#birth-date", { timeout: 20000 });
  await page.waitForTimeout(600);

  async function fillBirth({ name, date, time, place }) {
    await page.locator("#native-name").fill(name);
    await page.locator("#birth-date").fill(date);
    await page.locator("#birth-time").fill(time);
    await page.locator("#birth-place").fill(place);
  }

  async function pickerNames() {
    return page.locator("[data-testid='new-chart']").evaluate((btn) => {
      const list = btn.closest("ul");
      if (!list) return [];
      return [...list.querySelectorAll("li button")]
        .map((el) => el.textContent?.trim() ?? "")
        .filter((t) => t && t !== "New" && t !== "Nouveau");
    });
  }

  await fillBirth({ name: "Sample B", date: "1987-11-03", time: "23:10", place: "Oslo" });
  await page.getByRole("button", { name: /cast|calculer/i }).click();
  await page.getByTestId("studio-natal").waitFor({ timeout: 45000 });
  await page.waitForTimeout(400);

  const namesAfterCast = await pickerNames();
  if (!namesAfterCast.some((n) => /Sample B/i.test(n))) {
    throw new Error(`${tag} CHARTS missing after cast: ${JSON.stringify(namesAfterCast)}`);
  }

  // Pencil must reopen BIRTH DATA (cast closes the fold; scrolling a collapsed
  // header looks like a 15px jump and the form never appears).
  const birthFold = page.locator('[data-fold="birth"]');
  if ((await birthFold.getAttribute("data-open")) === "1") {
    await birthFold.locator("button[aria-expanded='true']").last().click();
    await page.waitForTimeout(200);
  }
  if ((await birthFold.getAttribute("data-open")) !== "0") {
    throw new Error(`${tag} birth fold still open before pencil`);
  }
  if (await page.locator("#native-name").isVisible()) {
    throw new Error(`${tag} birth fields visible before pencil`);
  }
  await page.locator(".ulune-chart-chip-edit").first().click();
  await page.locator("#native-name").waitFor({ state: "visible", timeout: 5000 });
  if ((await birthFold.getAttribute("data-open")) !== "1") {
    throw new Error(`${tag} pencil did not open BIRTH DATA`);
  }
  const editedName = await page.locator("#native-name").inputValue();
  if (!/Sample B/i.test(editedName)) {
    throw new Error(`${tag} pencil did not load chart into BIRTH DATA: "${editedName}"`);
  }
  // Chevron still hides/shows after the pencil path.
  await birthFold.locator("button[aria-expanded='true']").last().click();
  await page.waitForTimeout(200);
  if ((await birthFold.getAttribute("data-open")) !== "0") {
    throw new Error(`${tag} chevron hide broken after pencil`);
  }
  await birthFold.locator("button[aria-expanded='false']").last().click();
  await page.waitForTimeout(200);
  if ((await birthFold.getAttribute("data-open")) !== "1") {
    throw new Error(`${tag} chevron show broken after pencil`);
  }

  await page.getByTestId("studio-page-table").click();
  await page.getByTestId("studio-table").waitFor({ timeout: 15000 });
  const namesOnTable = await pickerNames();
  if (!namesOnTable.some((n) => /Sample B/i.test(n))) {
    throw new Error(`${tag} CHARTS empty after tab switch: ${JSON.stringify(namesOnTable)}`);
  }
  await page.getByRole("link", { name: /sign in/i }).first().click();
  await page.waitForURL(/\/login/, { timeout: 15000 });
  await page.goBack({ waitUntil: "domcontentloaded" });
  await page.waitForURL((url) => url.pathname === "/", { timeout: 15000 });
  await page.locator("[data-chart-chip] button", { hasText: "Sample B" }).waitFor({ timeout: 5000 });
  const namesAfterSettings = await pickerNames();
  if (!namesAfterSettings.some((n) => /Sample B/i.test(n))) {
    throw new Error(`${tag} CHARTS empty after settings: ${JSON.stringify(namesAfterSettings)}`);
  }

  await page.getByTestId("new-chart").click();
  await page.waitForTimeout(200);
  const emptyAfterNew = {
    name: await page.locator("#native-name").inputValue(),
    date: await page.locator("#birth-date").inputValue(),
    time: await page.locator("#birth-time").inputValue(),
    place: await page.locator("#birth-place").inputValue(),
  };
  if (emptyAfterNew.name || emptyAfterNew.date || emptyAfterNew.time || emptyAfterNew.place) {
    throw new Error(`${tag} New did not clear the form: ${JSON.stringify(emptyAfterNew)}`);
  }

  const name = page.locator("#native-name");
  await name.click();
  await name.pressSequentially("Alice", { delay: 70 });
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => {
      window.dispatchEvent(new Event("offline"));
      window.dispatchEvent(new Event("online"));
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.waitForTimeout(120);
  }
  const focusedAfterType = await page.evaluate(() => document.activeElement?.id);
  const nameAfterType = await name.inputValue();
  if (nameAfterType !== "Alice") {
    throw new Error(`${tag} typing was clobbered to "${nameAfterType}"`);
  }
  if (focusedAfterType !== "native-name") {
    throw new Error(`${tag} name field lost focus while typing (active=${focusedAfterType})`);
  }

  await page.waitForTimeout(1800);
  const nameAfterWait = await name.inputValue();
  const heading = await page.locator("#cast-form h1").innerText();
  const natalVisible = await page.getByTestId("studio-natal").count();
  if (nameAfterWait !== "Alice") {
    throw new Error(`${tag} draft was clobbered after wait: "${nameAfterWait}"`);
  }
  if (!/new natal/i.test(heading)) {
    throw new Error(`${tag} heading left new-chart mode: "${heading}"`);
  }
  if (natalVisible !== 0) {
    throw new Error(`${tag} old wheel still showing while composing a new chart`);
  }

  await fillBirth({ name: "Alice", date: "1999-07-04", time: "08:15", place: "Paris" });
  await page.getByRole("button", { name: /cast|calculer/i }).click();
  await page.getByTestId("studio-natal").waitFor({ timeout: 45000 });
  await page.waitForTimeout(400);

  const afterSecond = await pickerNames();
  const unique = new Set(afterSecond.map((n) => n.replace(/\s+/g, " ").trim()));
  if (unique.size < 2) {
    throw new Error(`${tag} expected two distinct charts, got ${JSON.stringify(afterSecond)}`);
  }

  await page.getByTestId("new-chart").click();
  await page.waitForFunction(() => {
    const el = document.getElementById("native-name");
    return el instanceof HTMLInputElement && el.value === "";
  });
  await page.locator("#native-name").click();
  await page.locator("#native-name").pressSequentially("Bob", { delay: 60 });
  await page.evaluate(() => {
    window.dispatchEvent(new Event("offline"));
    window.dispatchEvent(new Event("online"));
  });
  await page.waitForTimeout(1500);
  const bobStill = await page.locator("#native-name").inputValue();
  const bobFocus = await page.evaluate(() => document.activeElement?.id);
  if (bobStill !== "Bob") throw new Error(`${tag} second draft clobbered: "${bobStill}"`);
  if (bobFocus !== "native-name") {
    throw new Error(`${tag} second draft lost focus (active=${bobFocus})`);
  }

  console.log(`${tag}_OK`, { afterSecond, heading, focusedAfterType });
  await page.close();
}

await run({ width: 1280, height: 920 }, "DESKTOP");
await run({ width: 390, height: 844 }, "MOBILE");

await browser.close();
if (errors.length) {
  console.error("PAGE_ERRORS", errors);
  process.exit(1);
}
console.log("NEW_CHART_OK");
