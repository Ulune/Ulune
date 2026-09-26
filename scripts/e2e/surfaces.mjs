/** W7 surfaces: command palette + shortcuts, library search/sort/pair, Your data. */
import { FIXTURE_A, castFixture, ensureShotsDir, gotoApp, launch, legacyRow, nextCastAnswer, SHOTS } from "./_lib.mjs";
import { join } from "node:path";

await ensureShotsDir();
const { browser, page } = await launch(1280);
try {
  await gotoApp(page);
  const answer = nextCastAnswer(page);
  await castFixture(page, FIXTURE_A);
  await page.waitForTimeout(600);

  // Palette: Ctrl+K, search a planet, Enter opens its reading.
  await page.locator("body").click({ position: { x: 5, y: 400 } }).catch(() => {});
  await page.keyboard.press("Control+k");
  await page.getByTestId("command-palette").waitFor({ timeout: 5000 });
  await page.keyboard.type("mars");
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => /mars/i.test(document.querySelector("#ob-rc-title")?.textContent ?? ""), null, { timeout: 8000 });
  // Shortcuts: 2 → Time group, T → table, T → wheel.
  await page.locator("#ob-rc-title").click();
  await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : null));
  await page.keyboard.press("2");
  await page.getByTestId("studio-transits").waitFor({ timeout: 8000 });
  await page.keyboard.press("t");
  await page.waitForFunction(() => document.querySelector("[data-view]")?.getAttribute("data-view") === "table");
  await page.keyboard.press("t");
  await page.waitForFunction(() => document.querySelector("[data-view]")?.getAttribute("data-view") === "wheel");
  await page.keyboard.press("1");
  await page.getByTestId("studio-natal").waitFor({ timeout: 8000 });
  console.log("palette + shortcuts OK");

  // Library: seed 7 more charts, as kept in the clear by versions before (the
  // page reads them, then asks what to do with them: later), then search and sort.
  const cast = await answer;
  const names = ["Ada", "Basile", "Chloé", "Dario", "Eun", "Farah", "Gus"];
  const rows = [FIXTURE_A.name, ...names].map((name, i) => legacyRow(cast, { id: `seed-${i}`, name, savedAt: Date.now() - i * 1000 }));
  await page.evaluate((r) => {
    localStorage.setItem("orbis.charts.v1", JSON.stringify(r));
    localStorage.setItem("orbis.charts.active", r[0].id);
  }, rows);
  await page.reload();
  await page.waitForSelector("html.theme-ready");
  await page.getByTestId("space-legacy-later").click({ timeout: 30000 });
  await page.getByTestId("space-sheet").waitFor({ state: "detached" });
  await page.getByTestId("chart-chip").click();
  await page.getByTestId("chart-search").fill("far");
  const found = await page.locator("[data-testid=chart-row]").evaluateAll((els) => els.map((e) => e.getAttribute("data-name")));
  if (found.length !== 1 || found[0] !== "Farah") throw new Error(`search: ${found}`);
  await page.getByTestId("chart-search").fill("");
  await page.getByTestId("chart-sort").selectOption("name");
  const sorted = await page.locator("[data-testid=chart-row]").evaluateAll((els) => els.map((e) => e.getAttribute("data-name")));
  if (sorted[0] !== "Ada") throw new Error(`sort: ${sorted.slice(0, 3)}`);
  await page.screenshot({ path: join(SHOTS, "surfaces-library.png") });
  await page.locator("[data-testid=chart-row][data-name=Basile] [data-testid=chart-pair]").click();
  await page.getByTestId("studio-synastry").waitFor({ timeout: 15000 });
  console.log("library OK");

  // Your data: export, then wipe.
  // After hydration: the card is in the server's page before its buttons work.
  await gotoApp(page, "/settings");
  await page.getByTestId("settings-data").waitFor({ timeout: 15000 });
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByTestId("data-export").click()]);
  if (!/ulune-data-.*\.json$/.test(dl.suggestedFilename())) throw new Error(`export name ${dl.suggestedFilename()}`);
  await page.getByTestId("data-wipe").click();
  await page.getByTestId("data-wipe-confirm").click();
  await page.waitForSelector("#birth-date", { timeout: 20000 });
  // legacy names: the prototype's charts go too
  const left = await page.evaluate(() => Object.keys(localStorage).filter((k) => /^(orbis|ulune)\.charts/.test(k)).length);
  if (left) throw new Error("wipe left charts");
  console.log("SURFACES OK");
} finally {
  await browser.close();
}
