import { join } from "node:path";
import {
  FIXTURE_A,
  FIXTURE_B,
  SHOTS,
  castFixture,
  clickDockTab,
  ensureShotsDir,
  goStudioPage,
  gotoApp,
  keepCharts,
  launch,
  pickPlace,
} from "./_lib.mjs";

/*
 * The other modes' tables (part 52): Transits, Progressions, Synastry,
 * Composite and Human Design each as one page with the pinned bar. Each
 * shows its parts in order, a link marks its part, nothing scrolls
 * sideways, no decimal degree shows, a row chooses its element, Copy gives
 * the whole table as text and CSV starts with `section,field,value`.
 */

const MODES = [
  { id: "transits", wrap: "transit-table", parts: ["aspects", "sky", "grid"] },
  { id: "progressions", wrap: "progressions-table", parts: ["aspects", "positions", "angles", "moon"] },
  { id: "synastry", wrap: "synastry-table", parts: ["aspects", "overlays", "both", "grid"] },
  { id: "composite", wrap: "composite-table", parts: ["points", "houses", "aspects", "grid", "balance"] },
  { id: "design", wrap: "hd-table", parts: ["keys", "activations", "channels", "centres"] },
];

async function settle(page) {
  let last = -1;
  for (let i = 0; i < 40; i += 1) {
    await page.waitForTimeout(80);
    const now = await page.evaluate(() => document.querySelector(".ob-stage--table .ob-figure")?.scrollTop ?? 0);
    if (Math.abs(now - last) < 0.5) return;
    last = now;
  }
}

async function typeField(page, selector, value) {
  const el = page.locator(selector).first();
  await el.click();
  await el.fill("");
  await el.pressSequentially(value, { delay: 15 });
}

async function addPartner(page) {
  await page.getByTestId("synastry-add-second").or(page.getByTestId("synastry-add-second-wheel")).first().click();
  await page.locator("form[data-mode=partner]").waitFor({ timeout: 8000 });
  await clickDockTab(page, "birth");
  await page.locator("#native-name").fill(FIXTURE_B.name);
  await typeField(page, "#birth-date", FIXTURE_B.date);
  await typeField(page, "#birth-time", FIXTURE_B.time);
  await pickPlace(page, FIXTURE_B.place);
  await page.getByTestId("cast-submit").click();
  await page.getByTestId("studio-synastry").waitFor({ timeout: 45000 });
  await page.getByTestId("synastry-ring").waitFor({ timeout: 15000 });
}

/** The page's parts in order, each link marking its part; nothing sideways, no decimal degree. */
async function checkPage(page, mode, label) {
  const wrap = page.getByTestId(mode.wrap);
  const order = await wrap.locator("[data-testid=table-page] > section").evaluateAll((els) => els.map((el) => el.getAttribute("data-testid")));
  if (order.join(",") !== mode.parts.map((p) => `table-${p}`).join(",")) throw new Error(`${label}: parts ${order.join(",")}`);
  for (const id of mode.parts) {
    await page.evaluate((p) => document.querySelector(`[data-testid=table-section-${p}]`)?.click(), id);
    await settle(page);
    const current = await page.evaluate(() => document.querySelector("[data-testid=table-bar] [aria-current=true]")?.getAttribute("data-part"));
    if (current !== id) throw new Error(`${label}: ${id} link marked ${current}`);
  }
  const state = await page.evaluate(() => {
    const fig = document.querySelector(".ob-stage--table .ob-figure");
    return {
      sideways: fig ? fig.scrollWidth - fig.clientWidth : -1,
      doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  if (state.sideways > 1 || state.doc > 1) throw new Error(`${label}: sideways ${JSON.stringify(state)}`);
  const text = await wrap.innerText();
  const decimal = /\d\.\d+°/.exec(text);
  if (decimal) throw new Error(`${label}: decimal degree "${decimal[0]}"`);
  if (/undefined|NaN|\{[a-z]+\}/.test(text)) throw new Error(`${label}: unfilled words`);
  return text;
}

async function csvOf(page) {
  const [download] = await Promise.all([page.waitForEvent("download", { timeout: 8000 }), page.getByTestId("table-csv").click()]);
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function copied(page) {
  await page.getByTestId("table-copy").click();
  await page.waitForTimeout(300);
  return page.evaluate(() => navigator.clipboard.readText());
}

async function runViewport(width) {
  const { browser, page } = await launch(width);
  try {
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await gotoApp(page);
    await keepCharts(page);
    await castFixture(page, FIXTURE_A);
    let partner = false;
    for (const mode of MODES) {
      await goStudioPage(page, mode.id);
      await page.waitForTimeout(500);
      if (mode.id === "transits") {
        await page.getByTestId("transit-date").fill("29/09/2026");
        await page.getByTestId("transit-time").fill("12:00");
        await page.waitForTimeout(1500);
      }
      if ((mode.id === "synastry" || mode.id === "composite") && !partner) {
        await addPartner(page);
        partner = true;
        if (mode.id === "composite") await goStudioPage(page, "composite");
      }
      await clickDockTab(page, "data");
      await page.getByTestId(mode.wrap).waitFor({ timeout: 20000 });
      await page.waitForFunction(() => !document.querySelector("[data-testid=table-loading]"), null, { timeout: 15000 });
      const label = `${width} ${mode.id}`;
      const text = await checkPage(page, mode, label);
      const wrap = page.getByTestId(mode.wrap);

      if (mode.id === "transits") {
        for (const col of ["orb", "phase", "exact"]) {
          if (!(await page.getByTestId(`transit-col-${col}`).count())) throw new Error(`${label}: missing transit-col-${col}`);
        }
        const rows = wrap.locator("[data-testid^=transit-row-]");
        if ((await rows.count()) < 5) throw new Error(`${label}: ${await rows.count()} transit rows`);
        const orb = await rows.first().locator("td[data-col=orb]").innerText();
        if (!/\d+°\d\d'\s*of \d+°/.test(orb)) throw new Error(`${label}: orb cell "${orb}"`);
        const exact = await rows.first().locator("td[data-col=exact]").innerText();
        if (!/\d{4}, \d\d:\d\d UT$/.test(exact.trim())) throw new Error(`${label}: exact cell "${exact}"`);
        if ((await wrap.locator("#table-part-sky tr[data-body]").count()) < 12) throw new Error(`${label}: the Sky rows`);
        if ((await wrap.locator("[data-testid=cross-grid] tbody tr").count()) < 10) throw new Error(`${label}: the grid rows`);
        const id = await rows.first().getAttribute("data-testid");
        await rows.first().locator("td").first().click();
        const chosen = await wrap.getAttribute("data-selected");
        if (!chosen?.startsWith("taspect:")) throw new Error(`${label}: row ${id} chose "${chosen}"`);
        const clip = await copied(page);
        // The clock's 12:00 is Paris time: 10:00 in universal time.
        if (!/^Aspects\nTransits · TraceQA · 29 Sept? 2026, 10:00 UT\n/.test(clip) || !clip.includes("\n\nSky\n")) throw new Error(`${label}: copied ${clip.slice(0, 160)}`);
      }

      if (mode.id === "progressions") {
        if ((await wrap.locator("#table-part-positions tr[data-body]").count()) < 10) throw new Error(`${label}: progressed positions`);
        if ((await wrap.locator("#table-part-angles tr[data-body]").count()) !== 5) throw new Error(`${label}: progressed angles`);
        const moon = await wrap.getByTestId("progressed-moon").innerText();
        if (!/(New Moon|Crescent|First quarter|Gibbous|Full Moon|Disseminating|Last quarter|Balsamic) · \d+°\d\d' past the progressed Sun/.test(moon)) throw new Error(`${label}: Moon "${moon}"`);
        if (!/in about \d+ months|at about age \d+|in about a month/.test(moon)) throw new Error(`${label}: next phase "${moon}"`);
        const moved = await wrap.locator("#table-part-positions tr[data-body=moon] td[data-col=moved]").innerText();
        if (!/^\+4\d\d°/.test(moved.trim())) throw new Error(`${label}: the Moon moved "${moved}"`);
      }

      if (mode.id === "synastry") {
        for (const side of ["overlays-a", "overlays-b"]) {
          const n = await wrap.locator(`[data-testid=${side}] tbody tr`).count();
          if (n < 12) throw new Error(`${label}: ${side} ${n} rows`);
        }
        const before = await wrap.locator("[data-testid^=synastry-row-]").count();
        await page.getByTestId("synastry-minor-bodies").check();
        const after = await wrap.locator("[data-testid^=synastry-row-]").count();
        if (!(after > before)) throw new Error(`${label}: asteroids and lots ${before} → ${after}`);
        await page.getByTestId("synastry-minor-bodies").uncheck();
        const csv = await csvOf(page);
        const lines = csv.split("\n");
        if (lines[0] !== "section,field,value" || !lines.some((l) => l.startsWith("overlay,a,"))) throw new Error(`${label}: CSV ${lines.slice(0, 3).join(" | ")}`);
      }

      if (mode.id === "composite") {
        if (/Julian day|Jour julien/.test(text)) throw new Error(`${label}: the Chart part shows`);
        const csv = await csvOf(page);
        const lines = csv.split("\n");
        if (lines[0] !== "section,field,value" || lines[2] !== "identity,method,midpoint composite") throw new Error(`${label}: CSV ${lines.slice(0, 3).join(" | ")}`);
        if (lines.some((l) => l.startsWith("dignity,") || l.startsWith("star,"))) throw new Error(`${label}: CSV has parts the page does not`);
      }

      if (mode.id === "design") {
        if ((await wrap.locator("[data-testid^=hd-centre-]").count()) !== 9) throw new Error(`${label}: centres`);
        if ((await wrap.locator("[data-testid=hd-acts] tbody tr").count()) !== 26) throw new Error(`${label}: activations`);
        await wrap.getByTestId("hd-centre-sacral").locator("td").first().click();
        const chosen = await wrap.getAttribute("data-selected");
        if (chosen !== "center:sacral") throw new Error(`${label}: centre chose "${chosen}"`);
        const clip = await copied(page);
        if (!/^Keys\n/.test(clip) || !clip.includes("\n\nCentres\n")) throw new Error(`${label}: copied ${clip.slice(0, 120)}`);
      }

      await page.screenshot({ path: join(SHOTS, `mode-tables-${mode.id}-${width}.png`), timeout: 4000, animations: "disabled" }).catch(() => {});
      console.log(`${label} OK`);
      await clickDockTab(page, "reading");
    }
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
  console.error(fail.join("\n"));
  process.exit(1);
}
console.log("MODE TABLES OK");
