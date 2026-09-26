/**
 * The production build, served the way Vercel serves it, with a chart cast
 * through the page. Run after `npm run build`: `npm run check:deploy`.
 *
 * The function's folder is copied out of the repository first, so it has no
 * node_modules/ or ephe/ to fall back on, and it runs with that folder as its
 * working directory (/var/task on Vercel). Static files are answered first,
 * everything else goes to the function, as .vercel/output/config.json routes.
 * The cast must come back from Swiss Ephemeris with no body skipped and its
 * time zone read from the coordinates (geo-tz's map); the page must show the
 * wheel without a console error.
 */
import { cpSync, createReadStream, existsSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { extname, join, normalize, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { fromJSON } from "seroval";
import { FUNCTION_DIR, REQUIRED, ROOT } from "./copy-server-assets.mjs";

const OUTPUT = join(ROOT, ".vercel", "output");
const PORT = Number(process.env.DEPLOY_CHECK_PORT || 8099);
const TYPES = {
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".wasm": "application/wasm",
};

const fail = (why) => {
  console.error(`DEPLOY CHECK FAILED: ${why}`);
  process.exit(1);
};

if (!existsSync(FUNCTION_DIR)) fail("no build output: run `npm run build` first");
const missing = REQUIRED.filter((f) => !existsSync(join(FUNCTION_DIR, f)));
if (missing.length) fail(`not next to the server function: ${missing.join(", ")}`);

// The function and the static files, away from the repository (removed again on exit).
const away = mkdtempSync(join(tmpdir(), "ulune-vercel-"));
process.on("exit", () => rmSync(away, { recursive: true, force: true }));
const funcDir = join(away, "func");
const staticDir = join(away, "static");
cpSync(FUNCTION_DIR, funcDir, { recursive: true, dereference: true });
cpSync(join(OUTPUT, "static"), staticDir, { recursive: true, dereference: true });
process.chdir(funcDir);
const handler = (await import(pathToFileURL(join(funcDir, "index.mjs")).href)).default;

function staticFile(pathname) {
  let rel;
  try {
    rel = normalize(decodeURIComponent(pathname)).replace(/^[/\\]+/, "");
  } catch {
    return null;
  }
  if (!rel || rel.startsWith("..")) return null;
  const file = join(staticDir, rel);
  if (!file.startsWith(staticDir + sep)) return null;
  return existsSync(file) && statSync(file).isFile() ? file : null;
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
    const file = req.method === "GET" || req.method === "HEAD" ? staticFile(url.pathname) : null;
    if (file) {
      const headers = { "content-type": TYPES[extname(file)] ?? "application/octet-stream" };
      if (url.pathname.startsWith("/assets/")) headers["cache-control"] = "public, max-age=31536000, immutable";
      res.writeHead(200, headers);
      if (req.method === "HEAD") return res.end();
      return createReadStream(file).pipe(res);
    }
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") headers.set(k, v);
    headers.set("x-forwarded-for", "127.0.0.1");
    const answer = await handler.fetch(new Request(url, { method: req.method, headers, body }), { waitUntil() {} });
    const out = {};
    answer.headers.forEach((v, k) => {
      if (k !== "set-cookie") out[k] = v;
    });
    const cookies = answer.headers.getSetCookie?.() ?? [];
    if (cookies.length) out["set-cookie"] = cookies;
    res.writeHead(answer.status, out);
    if (answer.body && req.method !== "HEAD") for await (const chunk of answer.body) res.write(chunk);
    res.end();
  } catch (error) {
    console.error("server:", error);
    if (!res.headersSent) res.writeHead(500);
    res.end();
  }
});
await new Promise((ok) => server.listen(PORT, "127.0.0.1", ok));

// A watchdog: the check fails rather than hangs.
setTimeout(() => fail("no chart after 3 minutes"), 180_000).unref();

process.env.ULUNE_DEV = `http://127.0.0.1:${PORT}`;
const { FIXTURE_A, castFixture, gotoApp, launch } = await import("./e2e/_lib.mjs");
const { browser, page } = await launch(1280);
const errors = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("pageerror", (e) => errors.push(e.message));
// A production build names its server functions by hash, so a cast is the
// server call whose answer holds a chart (one seroval node, as the page reads it).
function nextChart() {
  return new Promise((resolve) => {
    const on = async (r) => {
      if (!r.url().includes("/_serverFn/")) return;
      try {
        const value = fromJSON({ t: JSON.parse(await r.text()), f: 127, m: [] });
        if (!value?.result?.chart) return;
        page.off("response", on);
        resolve(value.result.chart);
      } catch {
        /* another call */
      }
    };
    page.on("response", on);
  });
}

/** A new chart typed with coordinates for its place, cast without the search. */
async function castTyped(fixture) {
  if (await page.getByTestId("studio-natal").count()) {
    if (!(await page.getByTestId("chart-picker").isVisible().catch(() => false))) await page.getByTestId("chart-chip").click();
    await page.getByTestId("new-chart").click();
  }
  await page.waitForSelector("#birth-date", { timeout: 10000 });
  await page.locator("#native-name").fill(fixture.name);
  await page.locator("#birth-date").fill(fixture.date);
  await page.locator("#birth-time").fill(fixture.time);
  await page.locator("#birth-place").fill(fixture.coordinates);
  await page.getByTestId("cast-submit").click();
}

/** Cast through the form; the chart must be whole, from Swiss Ephemeris, nothing skipped. */
async function cast(fixture) {
  const answer = nextChart();
  if (fixture.coordinates) await castTyped(fixture);
  else await castFixture(page, fixture);
  const chart = await answer;
  await page.locator("svg.ulune-wheel:not(.ulune-wheel-ghost)").waitFor({ timeout: 30000 });
  const { meta } = chart;
  if (meta.ephemeris !== "swiss") fail(`${fixture.name}: ephemeris ${meta.ephemeris}`);
  if (meta.warnings?.length) fail(`${fixture.name}: the cast skipped something: ${meta.warnings.join("; ")}`);
  if (!chart.planets?.length || chart.houses?.length !== 12) fail(`${fixture.name}: no planets or houses`);
  return chart;
}

let ok = false;
try {
  await gotoApp(page);
  // 1. A place from the search (the server asks Open-Meteo).
  const paris = await cast(FIXTURE_A);
  if (paris.meta.birthTime?.zone !== "Europe/Paris") fail(`Paris read as ${paris.meta.birthTime?.zone}`);
  console.log(`searched place: ${paris.planets.length} bodies, ${paris.stars?.length ?? 0} star contacts, Europe/Paris, Swiss Ephemeris, nothing skipped`);
  // 2. Typed coordinates: no zone comes with them, so it must come from geo-tz's map.
  const typed = await cast({ ...FIXTURE_A, name: "Coordinates", coordinates: "40.7128, -74.0060" });
  const time = typed.meta.birthTime;
  if (time?.zoneSource !== "coordinates" || time.zone !== "America/New_York")
    fail(`typed coordinates read as ${time?.zone} from "${time?.zoneSource}", not from geo-tz's map`);
  console.log("typed coordinates: America/New_York from geo-tz's map");
  if (errors.length) fail(`console: ${errors.join(" | ")}`);
  ok = true;
} finally {
  await browser.close();
  server.close();
}
console.log(ok ? "DEPLOY CHECK OK" : "DEPLOY CHECK FAILED");
process.exit(ok ? 0 : 1);
