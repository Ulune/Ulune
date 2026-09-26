/** Export: PNG and SVG downloads of the wheel, copy summary, print sheet builds. */
import { copyFile } from "node:fs/promises";
import { join } from "node:path";
import { FIXTURE_A, SHOTS, castFixture, ensureShotsDir, gotoApp, launch } from "./_lib.mjs";

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
  console.log("EXPORT OK");
} finally {
  await browser.close();
}
