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
 *
 * The routes' headers apply as on Vercel (config.json: every route before the
 * filesystem whose pattern matches adds its headers; one without `continue`
 * ends the list). Every answer must carry the security headers, and every
 * page its content security policy, whose nonce every inline script holds;
 * the modes, the 3D view and the other pages then run under that policy, and
 * anything it blocks fails the check.
 */
import { cpSync, createReadStream, existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { extname, join, normalize, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { fromJSON } from "seroval";
import { FUNCTION_DIR, REQUIRED, ROOT } from "./copy-server-assets.mjs";

const OUTPUT = join(ROOT, ".vercel", "output");
/** What every answer must carry (src/lib/security-headers.ts). */
const SECURITY = [
  "strict-transport-security",
  "x-content-type-options",
  "referrer-policy",
  "x-frame-options",
  "cross-origin-opener-policy",
  "permissions-policy",
];
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
  ".xml": "application/xml",
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

// The routes before the filesystem, as Vercel runs them: headers only here.
const routes = [];
for (const route of JSON.parse(readFileSync(join(OUTPUT, "config.json"), "utf8")).routes) {
  if (route.handle) break;
  if (route.headers && !route.dest) routes.push({ re: new RegExp(`^${route.src}$`), headers: route.headers, stop: !route.continue });
}
function routeHeaders(pathname) {
  const out = {};
  for (const route of routes) {
    if (!route.re.test(pathname)) continue;
    for (const [k, v] of Object.entries(route.headers)) out[k.toLowerCase()] = v;
    if (route.stop) break;
  }
  return out;
}

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
    const fromRoutes = routeHeaders(url.pathname);
    if (file) {
      const headers = { ...fromRoutes, "content-type": TYPES[extname(file)] ?? "application/octet-stream" };
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
    const out = { ...fromRoutes };
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
setTimeout(() => fail("not done after 5 minutes"), 300_000).unref();

const BASE = `http://127.0.0.1:${PORT}`;

/** The headers every answer carries, and each page's policy with its own nonce. */
async function checkHeaders() {
  const get = async (path) => {
    const res = await fetch(BASE + path, { headers: { accept: "text/html" } });
    return { res, text: await res.text() };
  };
  const missing = (res) => SECURITY.filter((h) => !res.headers.get(h));
  const nonceOf = (res) => /'nonce-([0-9a-f]{32})'/.exec(res.headers.get("content-security-policy") ?? "")?.[1];

  const home = await get("/");
  if (missing(home.res).length) fail(`/ is missing ${missing(home.res).join(", ")}`);
  const nonce = nonceOf(home.res);
  if (!nonce) fail(`/ has no content security policy with a nonce: ${home.res.headers.get("content-security-policy")}`);
  if (!home.text.includes(`<meta property="csp-nonce" content="${nonce}"`)) fail("/ does not give its nonce to the page (csp-nonce meta)");
  const scripts = [...home.text.matchAll(/<script\b[^>]*>/g)].map((m) => m[0]);
  const inline = scripts.filter((tag) => !/\ssrc=/.test(tag) && !/type="application\/ld\+json"/.test(tag));
  const bare = inline.filter((tag) => !tag.includes(`nonce="${nonce}"`) && !tag.includes(`nonce='${nonce}'`));
  if (!inline.length || bare.length) fail(`/ has inline scripts without the nonce: ${bare.join(" ")}`);
  const foreign = scripts.filter((tag) => /\ssrc="(?!\/)/.test(tag));
  if (foreign.length) fail(`/ loads scripts from elsewhere: ${foreign.join(" ")}`);

  const chunk = /\/assets\/[\w.-]+\.js/.exec(home.text)?.[0];
  for (const path of ["/favicon.svg", "/manifest.webmanifest", chunk].filter(Boolean)) {
    const { res } = await get(path);
    if (res.status !== 200 || missing(res).length) fail(`${path}: ${res.status}, missing ${missing(res).join(", ")}`);
  }
  const a = nonceOf((await get("/privacy")).res);
  const b = nonceOf((await get("/privacy")).res);
  if (!a || a === b) fail("/privacy: no nonce, or the same nonce twice");
  const lost = await get("/no-such-page");
  if (lost.res.status !== 404 || !nonceOf(lost.res) || missing(lost.res).length) fail(`an unknown page: ${lost.res.status}, policy ${Boolean(nonceOf(lost.res))}`);
  console.log(`headers: ${SECURITY.length} security headers on pages and files; a fresh nonce per page on ${inline.length} inline scripts, none from elsewhere`);

  // What search engines read: robots.txt, the sitemap, each page's head.
  const robots = await get("/robots.txt");
  const sitemap = await get("/sitemap.xml");
  if (robots.res.status !== 200 || !/Sitemap: https:\/\/ulune\.app\/sitemap\.xml/.test(robots.text)) fail("robots.txt");
  if (sitemap.res.status !== 200 || (sitemap.text.match(/<loc>/g) ?? []).length !== 7) fail("sitemap.xml");
  const canonical = (html) => /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1];
  const noindex = (html) => /<meta name="robots" content="noindex"/.test(html);
  if (canonical(home.text) !== "https://ulune.app/" || noindex(home.text)) fail("/: canonical or robots");
  if (!/<script type="application\/ld\+json"[^>]*>\{"@context":"https:\/\/schema.org","@type":"WebApplication"/.test(home.text)) fail("/: no structured data");
  const privacy = await get("/privacy");
  if (canonical(privacy.text) !== "https://ulune.app/privacy" || !/<title>Privacy · Ulune<\/title>/.test(privacy.text)) fail("/privacy: head");
  const settings = await get("/settings");
  if (!noindex(settings.text) || canonical(settings.text)) fail("/settings: should stay out of search");
  if (!noindex(lost.text)) fail("an unknown page should stay out of search");
  // The first screen as the server sends it: the form's title, the guide under it, the footer's source link.
  const h1 = /<h1\b[^>]*>([^<]+)<\/h1>/.exec(home.text)?.[1];
  if (h1 !== "Cast a birth chart") fail(`/: the page's heading is "${h1}", not the form's title`);
  for (const id of ["guide", "guide-faq-time", "site-footer", "footer-link-source"]) {
    if (!home.text.includes(`data-testid="${id}"`)) fail(`/: the server's page has no ${id}`);
  }
  const guidePage = await get("/guide");
  if (guidePage.res.status !== 200 || !noindex(guidePage.text) || canonical(guidePage.text)) fail("/guide: should answer and stay out of search");
  if (!guidePage.text.includes('data-testid="guide"')) fail("/guide: no guide in the server's page");
  console.log("search: robots.txt, a 7-page sitemap, canonical addresses, settings, /guide and missing pages kept out; the guide in the home page");
}

/** The health check an uptime monitor calls, and where error reports arrive. */
async function checkRoutes() {
  const health = await fetch(`${BASE}/api/health`);
  const body = await health.json();
  if (health.status !== 200 || !body.ok || body.ephemeris !== "swiss" || body.zones !== "geo-tz")
    fail(`/api/health: ${health.status} ${JSON.stringify(body)}`);
  if (health.headers.get("cache-control") !== "no-store") fail("/api/health may be cached");

  // A report: kept as one log line, masked, nothing else.
  const lines = [];
  const log = console.error;
  console.error = (...args) => {
    const text = args.join(" ");
    if (text.startsWith("[ulune:report]")) lines.push(text);
    else log(...args);
  };
  const post = (body, headers = {}) =>
    fetch(`${BASE}/api/report`, {
      method: "POST",
      body,
      headers: { "content-type": "application/json", "sec-fetch-site": "same-origin", ...headers },
    });
  try {
    const report = { v: "1.0", kind: "error", message: "TypeError: born 1990-06-15", where: ["app-a1.js:1:23"], path: "/", engine: "blink", ip: "203.0.113.9" };
    const sent = await post(JSON.stringify(report));
    if (sent.status !== 204) fail(`/api/report: ${sent.status}`);
    const line = lines.at(-1) ?? "";
    if (!line.includes('"message":"TypeError: born ####-##-##"') || line.includes("1990") || line.includes("203.0.113.9"))
      fail(`/api/report logged: ${line}`);
    if ((await post(JSON.stringify(report), { "sec-fetch-site": "cross-site" })).status !== 403) fail("/api/report takes other sites' reports");
    if ((await post("x".repeat(3000))).status !== 413) fail("/api/report takes more than 2 KB");
    if ((await post('{"kind":"anything"}')).status !== 400) fail("/api/report takes a malformed report");
    // At most 60 a minute per server instance.
    const statuses = [];
    for (let i = 0; i < 64; i += 1) statuses.push((await post("{}")).status);
    if (!statuses.includes(429) || statuses.filter((s) => s !== 429).length > 58) fail(`/api/report has no limit: ${statuses.join(",")}`);
  } finally {
    console.error = log;
  }
  if (lines.length !== 1) fail(`/api/report wrote ${lines.length} lines for 1 report`);
  console.log(`routes: /api/health ok (Swiss Ephemeris, geo-tz, ${body.ms} ms); /api/report keeps one masked line, refuses other sites, big or odd reports, and more than 60 a minute`);
}

process.env.ULUNE_DEV = BASE;
const { FIXTURE_A, castFixture, goStudioPage, gotoApp, launch } = await import("./e2e/_lib.mjs");
const { browser, page } = await launch(1280);
const errors = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("pageerror", (e) => errors.push(e.message));
// Whatever the policy blocks is an error here, even what a browser only reports.
await page.addInitScript(() => {
  document.addEventListener("securitypolicyviolation", (e) =>
    console.error(`content security policy blocked ${e.blockedURI || "an inline script"} (${e.violatedDirective})`),
  );
});
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

/** The rest of the app under the policy: the modes, the 3D view, the other pages. */
async function tour() {
  const stages = { transits: "studio-transits", timing: "studio-timing", design: "studio-humandesign", numerology: "studio-numerology" };
  for (const [mode, stage] of Object.entries(stages)) {
    await goStudioPage(page, mode);
    await page.locator(`[data-testid="${stage}"], [data-testid="${stage}-empty"]`).first().waitFor({ timeout: 30000 });
  }
  await goStudioPage(page, "natal");
  await page.getByTestId("wheel-depth-3d").click();
  await page.locator('[data-depth-view="3d"]').waitFor({ timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.getByTestId("wheel-depth-3d").click();
  for (const path of ["/settings", "/privacy", "/credits"]) {
    await page.goto(BASE + path, { waitUntil: "networkidle" });
  }
  console.log("modes, 3D and pages: transits, timing, Human Design, numerology, 3D, settings, privacy, credits");
}

let ok = false;
try {
  await checkHeaders();
  await checkRoutes();
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
  await tour();
  if (errors.length) fail(`console: ${errors.join(" | ")}`);
  ok = true;
} finally {
  await browser.close();
  server.close();
}
console.log(ok ? "DEPLOY CHECK OK" : "DEPLOY CHECK FAILED");
process.exit(ok ? 0 : 1);
