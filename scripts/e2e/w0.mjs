import { join } from "node:path";
import {
  FIXTURE_A,
  SHOTS,
  assertFixtureA,
  assertNoOverflow,
  castFixture,
  ensureShotsDir,
  gotoApp,
  launch,
} from "./_lib.mjs";

await ensureShotsDir();
const fail = [];

for (const width of [390, 1280]) {
  const { browser, page } = await launch(width);
  try {
    await gotoApp(page);
    await castFixture(page, FIXTURE_A);
    await assertFixtureA(page);
    await assertNoOverflow(page);
    await page.screenshot({ path: join(SHOTS, `w0-${width}.png`), fullPage: true });
    console.log(`w0-${width} OK`);
  } catch (err) {
    fail.push(`${width}: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    await browser.close();
  }
}

if (fail.length) {
  console.error("W0 FAIL\n" + fail.map((f) => "- " + f).join("\n"));
  process.exit(1);
}
console.log("W0 OK", SHOTS);
