import { join } from "node:path";
import {
  DEV,
  FIXTURE_A,
  SHOTS,
  assertFixtureA,
  assertNoOverflow,
  castFixture,
  clickDockTab,
  ensureShotsDir,
  gotoApp,
  keepCharts,
  launch,
} from "./_lib.mjs";

const SECTIONS = ["identity", "points", "houses", "aspects", "patterns", "balance", "ranking"];

async function visibleHeaders(page) {
  return page.locator("[data-testid=table-points] thead th").evaluateAll((els) =>
    els
      .filter((el) => getComputedStyle(el).display !== "none")
      .map((el) => el.textContent?.trim() ?? ""),
  );
}

async function runViewport(width) {
  const { browser, page } = await launch(width);
  try {
    await gotoApp(page);
    // The chart comes back when an address is opened: a private space that stays unlocked here.
    await keepCharts(page);
    await castFixture(page, FIXTURE_A);
    await page.goto(`${DEV}/?studio=table`, { waitUntil: "load", timeout: 20000 });
    await page.waitForSelector("html.theme-ready", { timeout: 20000 });
    await page.locator("section[data-testid=studio-table]").waitFor({ timeout: 15000 });
    await page.getByTestId("table-points").waitFor({ timeout: 8000 });
    const pointsOn = await page.getByTestId("table-section-points").getAttribute("aria-selected");
    if (pointsOn !== "true") throw new Error(`?studio=table did not open Points (aria-selected=${pointsOn})`);

    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 8000 }),
      page.getByTestId("table-csv").click(),
    ]);
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const csv = Buffer.concat(chunks).toString("utf8");
    const first = csv.split(/\r?\n/)[0];
    if (first !== "section,field,value") {
      throw new Error(`CSV first line expected section,field,value got "${first}"`);
    }

    if (width === 390) {
      await page.getByTestId("table-group-position").waitFor();
      const pos = await visibleHeaders(page);
      if (!pos.includes("Name") || pos.length < 3 || pos.length > 6) {
        throw new Error(`390 position headers unexpected: ${pos.join("|")}`);
      }
      await page.getByTestId("table-group-motion").click();
      const motion = await visibleHeaders(page);
      if (!motion.some((h) => /speed|dir/i.test(h))) {
        throw new Error(`390 motion group did not swap columns: ${motion.join("|")}`);
      }
      await page.getByTestId("table-group-condition").click();
      const cond = await visibleHeaders(page);
      if (!cond.some((h) => /dignity|sect/i.test(h))) {
        throw new Error(`390 condition group did not swap columns: ${cond.join("|")}`);
      }
      await assertNoOverflow(page);
      const wrapScroll = await page.getByTestId("table-wrap").evaluate((el) => ({
        sw: el.scrollWidth,
        cw: el.clientWidth,
        page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      }));
      if (wrapScroll.page > 1) throw new Error(`page horizontal overflow ${wrapScroll.page}`);
    }

    if (width === 1280) {
      const headers = await page.locator("[data-testid=table-points] thead th").evaluateAll((els) =>
        els.filter((el) => getComputedStyle(el).display !== "none").length,
      );
      if (headers !== 17) throw new Error(`1280 expected 17 columns, got ${headers}`);
      const wrap = page.getByTestId("table-wrap");
      const th = wrap.locator("thead th").first();
      const before = await th.evaluate((el) => el.getBoundingClientRect().top);
      await wrap.evaluate((el) => {
        el.scrollTop = Math.min(240, el.scrollHeight);
      });
      const after = await th.evaluate((el) => el.getBoundingClientRect().top);
      if (Math.abs(after - before) > 2) {
        throw new Error(`header not sticky: ${before} → ${after}`);
      }
    }

    await page.goto(`${DEV}/?view=wheel`, { waitUntil: "load", timeout: 20000 });
    await page.waitForSelector("html.theme-ready", { timeout: 20000 });
    await page.getByTestId("studio-natal").waitFor({ timeout: 20000 });
    await clickDockTab(page, "data");
    await page.getByTestId("table-points").waitFor({ timeout: 8000 });
    const moon = page.locator("[data-testid=table-points] [data-body=moon]");
    await moon.waitFor({ state: "attached", timeout: 8000 });
    await moon.scrollIntoViewIfNeeded();
    await moon.click({ force: true });
    const tableSel = await page.locator("[data-testid=studio-table][data-chart-pick]").getAttribute("data-selected");
    if (tableSel !== "planet:moon") throw new Error(`store selectedId expected planet:moon, got "${tableSel}"`);
    const selected = await moon.getAttribute("data-selected");
    if (selected !== "1") throw new Error(`moon row not selected (data-selected=${selected})`);
    const tdBg = await moon.locator("td").first().evaluate((el) => getComputedStyle(el).backgroundColor);
    if (!tdBg || tdBg === "rgba(0, 0, 0, 0)" || tdBg === "transparent") {
      throw new Error(`selected moon row has no bg-bg-subtle (${tdBg})`);
    }
    await clickDockTab(page, "reading");
    await page.getByTestId("click-note").waitFor({ timeout: 8000 });
    await clickDockTab(page, "data");
    await page.getByTestId("table-points").waitFor({ timeout: 8000 });

    await page.getByTestId("table-section-houses").click();
    await page.getByTestId("table-houses").waitFor();
    const houses = await page.locator(".ulune-house-id-n").evaluateAll((els) =>
      els.map((el) => ({
        text: el.textContent?.trim() ?? "",
        font: getComputedStyle(el).fontFamily,
      })),
    );
    if (houses.length !== 12) throw new Error(`expected 12 house rows, got ${houses.length}`);
    const nums = houses.map((h) => h.text).join(",");
    if (nums !== "1,2,3,4,5,6,7,8,9,10,11,12") throw new Error(`house digits ${nums}`);
    for (const h of houses) {
      if (/astronomicon|starfont/i.test(h.font)) {
        throw new Error(`house number used glyph face: ${h.font}`);
      }
      if (!/mono|plex|ibm/i.test(h.font)) {
        throw new Error(`house number not mono: ${h.font}`);
      }
    }

    for (const id of SECTIONS) {
      await page.getByTestId(`table-section-${id}`).click();
      await page.getByTestId(`table-${id}`).waitFor({ timeout: 5000 });
      const others = await Promise.all(
        SECTIONS.filter((s) => s !== id).map(async (s) => [s, await page.getByTestId(`table-${s}`).count()]),
      );
      const leaked = others.filter(([, n]) => n > 0);
      if (leaked.length) throw new Error(`${id} still showing ${leaked.map(([s]) => s).join(",")}`);
    }

    await page.getByTestId("table-section-points").click();
    await page.getByTestId("table-points").waitFor();
    await assertFixtureA(page);
    await page.screenshot({
      path: join(SHOTS, `w6-tables-${width}.png`),
      timeout: 4000,
      animations: "disabled",
    }).catch(() => {});
    console.log(`w6-tables-${width} OK`);
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
  console.error("W6 TABLES FAIL\n" + fail.map((l) => "- " + l).join("\n"));
  process.exit(1);
}
console.log("W6 TABLES OK", SHOTS);
