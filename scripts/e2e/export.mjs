/** Export: PNG and SVG downloads of the wheel, copy summary, print sheet builds, the calendar's CSV and .ics. */
import { copyFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { FIXTURE_A, SHOTS, castFixture, ensureShotsDir, goStudioPage, gotoApp, launch, setView, openExport } from "./_lib.mjs";

await ensureShotsDir();
const { browser, page } = await launch(1280);
try {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await gotoApp(page);
  await castFixture(page, FIXTURE_A);
  await page.waitForTimeout(800);
  for (const kind of ["png", "svg"]) {
    await page.getByTestId("export-menu").click();
    const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 15000 }), page.getByTestId(`export-${kind}`).click()]);
    const out = join(SHOTS, `export-wheel.${kind}`);
    await copyFile(await dl.path(), out);
    if (!dl.suggestedFilename().endsWith(`.${kind}`)) throw new Error(`bad ${kind} name ${dl.suggestedFilename()}`);
    console.log(`export ${kind} OK → ${out}`);
  }
  await page.getByTestId("export-menu").click();
  await page.getByTestId("export-copy").click();
  await page.waitForTimeout(300);
  const text = await page.evaluate(() => navigator.clipboard.readText());
  if (!/TraceQA/.test(text) || !/Sun|Soleil/.test(text)) throw new Error(`summary: ${text.slice(0, 120)}`);
  const toast = await page.getByTestId("toast").first().innerText();
  if (!toast) throw new Error("no toast after copy");
  // The calendar's events table: its CSV (with the UT column) and its calendar file, read back.
  await goStudioPage(page, "timing");
  await page.getByTestId("calendar-month").waitFor({ timeout: 30000 });
  await page.waitForFunction(() => [...document.querySelectorAll("[data-testid^=calendar-day-]")].some((el) => Number(el.getAttribute("data-mine")) > 0), null, { timeout: 30000 });
  // On the calendar the file is in Export, with the other ways out (part 93), and picking it closes the menu.
  await page.getByTestId("export-menu").click();
  await page.getByTestId("calendar-export-main").waitFor({ timeout: 8000 });
  if ((await page.locator("[data-testid=calendar-export] [role=menuitem]").count()) !== 3) throw new Error("the calendar file's three choices in Export");
  await page.waitForFunction(() => !document.querySelector("[data-testid=calendar-export-main]")?.disabled, null, { timeout: 30000 });
  const [mainDl] = await Promise.all([page.waitForEvent("download", { timeout: 15000 }), page.getByTestId("calendar-export-main").click()]);
  if (!mainDl.suggestedFilename().endsWith(".ics")) throw new Error(`calendar file from Export: ${mainDl.suggestedFilename()}`);
  await page.getByTestId("export-panel").waitFor({ state: "detached", timeout: 4000 });
  await setView(page, "table");
  await page.getByTestId("timing-table").waitFor({ timeout: 20000 });
  await page.locator("[data-testid=calendar-table-row-sky]").first().waitFor({ timeout: 20000 });
  const shownRows = await page.locator("[data-testid^=calendar-table-row-]").count();
  const [csvDl] = await Promise.all([page.waitForEvent("download", { timeout: 15000 }), openExport(page).then(() => page.getByTestId("table-csv").click())]);
  const csv = await readFile(await csvDl.path(), "utf8");
  if (!csv.startsWith("\uFEFF")) throw new Error("calendar CSV without its byte-order mark");
  const lines = csv.slice(1).trim().split(/\r?\n/);
  if (lines[0] !== "When,What,Where,For,UT") throw new Error(`CSV header: ${lines[0]}`);
  if (!/\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(lines[1])) throw new Error(`CSV row without UT: ${lines[1]}`);
  if (lines.length - 1 < shownRows) throw new Error(`CSV ${lines.length - 1} rows, table ${shownRows}`);
  // The file's choice (review 3 Oct, T5): everything shown, here.
  // In Export with the table's text and CSV (part 97).
  await openExport(page);
  if ((await page.locator("[data-testid=calendar-ics] [role=menuitem]").count()) !== 3) throw new Error("the calendar file's three choices");
  const [icsDl] = await Promise.all([page.waitForEvent("download", { timeout: 15000 }), page.getByTestId("calendar-ics-all").click()]);
  if (!/^ulune-traceqa-/.test(icsDl.suggestedFilename())) throw new Error(`calendar file name without the person: ${icsDl.suggestedFilename()}`);
  const ics = await readFile(await icsDl.path(), "utf8");
  if (!icsDl.suggestedFilename().endsWith(".ics")) throw new Error(`calendar file name ${icsDl.suggestedFilename()}`);
  const events = ics.split("BEGIN:VEVENT").length - 1;
  if (!ics.startsWith("BEGIN:VCALENDAR\r\n") || !ics.includes("END:VCALENDAR")) throw new Error("calendar file frame");
  if (events < lines.length - 1) throw new Error(`calendar file ${events} events, CSV ${lines.length - 1} rows`);
  if (ics.split("\r\n").some((l) => new TextEncoder().encode(l).length > 75)) throw new Error("calendar file line over 75 octets");
  await copyFile(await icsDl.path(), join(SHOTS, "export-calendar.ics"));
  console.log(`calendar CSV ${lines.length - 1} rows, file ${events} events OK`);
  console.log("EXPORT OK");
} finally {
  await browser.close();
}
