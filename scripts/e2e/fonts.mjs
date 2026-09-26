// No font can load (blocked, cut off, offline without a copy): the page still
// works. Glyph centring used to ask a failed font again on every render,
// re-render every glyph, and ask again — the page froze.
import { FIXTURE_A, castFixture, gotoApp, launch } from "./_lib.mjs";

const fail = [];
const { browser, page } = await launch(1280);
try {
  // Font files only (in development a font's URL import is a module of its own).
  await page.route(
    () => true,
    (route) =>
      route.request().resourceType() === "font" || /fonts\.(googleapis|gstatic)\.com/.test(route.request().url())
        ? route.abort()
        : route.fallback(),
  );
  await gotoApp(page);
  await castFixture(page, FIXTURE_A);
  await page.waitForSelector("[data-testid=studio-natal] svg.ulune-wheel", { timeout: 20000 });
  for (let i = 0; i < 5; i += 1) {
    const answer = await Promise.race([
      page.evaluate(() => document.querySelectorAll("svg.ulune-wheel:not(.ulune-wheel-ghost) [data-kind=planet]").length),
      new Promise((resolve) => setTimeout(() => resolve("frozen"), 2500)),
    ]);
    if (answer === "frozen") throw new Error("the page stopped answering with its fonts blocked");
    if (!(answer > 0)) throw new Error("no planets on the wheel with the fonts blocked");
    await page.waitForTimeout(800);
  }
  console.log("fonts-blocked OK");
} catch (err) {
  fail.push(err instanceof Error ? err.message : String(err));
} finally {
  await browser.close();
}
if (fail.length) {
  console.error("FONTS FAIL\n" + fail.map((f) => "- " + f).join("\n"));
  process.exit(1);
}
console.log("FONTS OK");
