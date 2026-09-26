// The returning user's first view (src/lib/first-view.ts) for the load runs:
// the saved chart's resting wheel, copied by the app itself on the phone
// viewport measure.mjs uses. Needs serve.mjs on :9311 and saved-row.json.
// node scripts/perf/load/make-first-view.mjs
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, OUT, CHROME } from "../paths.mjs";
const { chromium } = createRequire(join(ROOT, "package.json"))("playwright");
const row = readFileSync(join(OUT, "load/saved-row.json"), "utf8");
const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
const out = {};
for (const locale of ["en", "fr"]) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(([rowJson, fr]) => {
    if (localStorage.getItem("orbis.charts.v1")) return;
    const r = JSON.parse(rowJson);
    localStorage.setItem("orbis.charts.v1", JSON.stringify([r]));
    localStorage.setItem("orbis.charts.active", r.id);
    if (fr) localStorage.setItem("ulune.locale", "fr");
  }, [row, locale === "fr"]);
  const page = await ctx.newPage();
  await page.goto("http://127.0.0.1:9311/", { waitUntil: "load" });
  await page.waitForFunction(() => Boolean(localStorage.getItem("orbis.firstview.v1")), null, { timeout: 30000 });
  // Everything the app kept besides the chart: the copy, and the Look the
  // boot script checks it against.
  out[locale] = await page.evaluate(() =>
    Object.fromEntries(
      Object.keys(localStorage)
        .filter((k) => k.startsWith("ulune.") && !k.startsWith("ulune.charts"))
        .map((k) => [k, localStorage.getItem(k)]),
    ),
  );
  await ctx.close();
}
writeFileSync(join(OUT, "load/first-view.json"), JSON.stringify(out));
console.log("first-view.json", Object.keys(out.en).join(" "));
await browser.close();
