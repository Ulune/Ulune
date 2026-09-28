/**
 * Reading card: At a glance → card → fact navigation with a back trail,
 * Short/Full depth that persists, About disclosure, and structured
 * readings in the Calendar, Design and Numerology.
 */
import { join } from "node:path";
import {
  FIXTURE_A,
  SHOTS,
  assertNoOverflow,
  castFixture,
  clickDockTab,
  ensureShotsDir,
  goStudioPage,
  gotoApp,
  launch,
} from "./_lib.mjs";

async function title(page) {
  return (await page.locator("#ob-rc-title").innerText()).trim();
}

async function run(width) {
  const { browser, page } = await launch(width);
  try {
    await gotoApp(page);
    await castFixture(page, FIXTURE_A);
    await clickDockTab(page, "reading");
    const glance = page.getByTestId("chart-snapshot");
    await glance.waitFor({ timeout: 8000 });
    const hl = await page.getByTestId("glance-highlights").locator("button").count();
    if (hl < 2) throw new Error(`glance highlights: ${hl}`);
    if ((await glance.locator(".ob-bal-row").count()) !== 7) throw new Error("glance balance rows ≠ 7");

    await page.getByTestId("natal-hello-sun").click();
    await page.getByTestId("reading-card").waitFor({ timeout: 8000 });
    if (!/sun|soleil/i.test(await title(page))) throw new Error("sun card title");
    // The personal reading leads; the general meaning opens "About the Sun".
    const first = await page.getByTestId("reading-card").evaluate((card) => card.querySelector(".ob-rc-note, .ob-rc-lead")?.className ?? "");
    if (!/ob-rc-lead/.test(first)) throw new Error(`sun card does not lead with its personal reading: ${first}`);
    if (!(await page.getByTestId("reading-about").getByTestId("reading-note").count())) throw new Error("sun card's meaning note is not under About");
    const facts = page.getByTestId("reading-facts").locator("button");
    if ((await facts.count()) < 3) throw new Error("sun card facts < 3");

    await facts.first().click();
    await page.waitForFunction(() => document.querySelector("[data-testid=reading-card]")?.getAttribute("data-kind") === "sign");
    const back = page.getByTestId("reading-back");
    if (!(await back.isVisible())) throw new Error("no back after fact navigation");
    await back.click();
    await page.waitForFunction(() => document.querySelector("[data-testid=reading-card]")?.getAttribute("data-kind") === "planet");
    if (await page.getByTestId("reading-back").count()) throw new Error("back trail not emptied");

    await page.getByTestId("reading-depth-full").click();
    if ((await page.getByTestId("reading-card").getAttribute("data-depth")) !== "full") throw new Error("depth full");
    const stored = await page.evaluate(() => localStorage.getItem("ulune.reading.depth"));
    if (stored !== "full") throw new Error(`depth not stored: ${stored}`);
    await page.getByTestId("reading-about").locator("summary").click();
    await page.getByTestId("reading-links").locator("button").first().click();
    await page.waitForFunction(() => document.querySelector("[data-testid=reading-card]")?.getAttribute("data-kind") === "aspect");
    await assertNoOverflow(page);
    await page.screenshot({ path: join(SHOTS, `reading-aspect-${width}.png`) });
    await page.getByTestId("reading-depth-short").click();

    await goStudioPage(page, "numerology");
    await page.getByTestId("numerology-tile-lifepath").dispatchEvent("click");
    await clickDockTab(page, "reading");
    await page.getByTestId("reading-card").waitFor({ timeout: 8000 });
    if (!(await page.locator(".ob-rc-mark-text").count())) throw new Error("numerology card lacks number mark");

    await goStudioPage(page, "design");
    await clickDockTab(page, "reading");
    await page.getByTestId("hd-hello-type").click();
    await page.getByTestId("reading-card").waitFor({ timeout: 8000 });
    const lead = await page.locator(".ob-rc-lead").innerText().catch(() => "");
    if (lead.trim().length < 40) throw new Error(`design card lead too thin: "${lead}"`);
    await page.screenshot({ path: join(SHOTS, `reading-design-${width}.png`) });
    console.log(`reading-${width} OK`);
  } finally {
    await browser.close();
  }
}

await ensureShotsDir();
for (const w of [390, 1280]) await run(w);
console.log("READING OK", SHOTS);
