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
 * anything it blocks fails the check. The Chinese languages' pages are among
 * them (languages plan, part 30): their addresses from src/studio/map.ts,
 * and Feng Shui's Home page with its compass's sensors left to the page.
 */
import { cpSync, createReadStream, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
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
/** The sensors Feng Shui's compass reads (src/studio/modes/hooks/useCompass.ts): the policy must leave them to the page. */
const COMPASS_SENSORS = ["accelerometer", "gyroscope", "magnetometer"];
/**
 * The Chinese languages' addresses, read from the studio's map (src/studio/map.ts): each language's
 * own page (`/chinese-astrology`, `/bazi`, `/feng-shui`) and Feng Shui's Home page.
 */
const MAP_SOURCE = readFileSync(join(ROOT, "src", "studio", "map.ts"), "utf8");
const CHINESE_PATHS = [
  ...[...MAP_SOURCE.matchAll(/\n\s+path: "([^"]+)",\n\s+group: "chinese",/g)].map((m) => m[1]),
  /\n\s+"fengshui-home": "([^"]+)",/.exec(MAP_SOURCE)?.[1],
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

// Chunks that import each other must not read each other's values while they
// load (scripts/chunk-cycles.mjs): the order they run in depends on which page
// loads first, and a value read too early is undefined.
{
  const { findCycleReads } = await import("./chunk-cycles.mjs");
  const { findings } = findCycleReads([FUNCTION_DIR, join(OUTPUT, "static", "assets")]);
  if (findings.length) {
    for (const f of findings) console.error(`  ${f.file}:${f.line}${f.region ? ` [${f.region}]` : ""} reads ${f.name} from ${f.from}`);
    fail(`${findings.length} top-level read(s) across a cycle of chunks; read them inside a function instead`);
  }
  console.log("chunks: no value read across a cycle while loading");
}

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
  // The Chinese languages' pages (languages plan, part 30): the studio's page at their own address,
  // with the same headers, a nonce of their own on every inline script, and "/" as their one address.
  if (CHINESE_PATHS.length !== 4 || CHINESE_PATHS.some((p) => !p?.startsWith("/"))) fail(`src/studio/map.ts: the Chinese pages' addresses not found (${CHINESE_PATHS.join(", ")})`);
  for (const path of CHINESE_PATHS) {
    const page = await get(path);
    if (page.res.status !== 200 || missing(page.res).length) fail(`${path}: ${page.res.status}, missing ${missing(page.res).join(", ")}`);
    const own = nonceOf(page.res);
    if (!own || own === nonce) fail(`${path}: no nonce of its own`);
    const loose = [...page.text.matchAll(/<script\b[^>]*>/g)]
      .map((m) => m[0])
      .filter((tag) => !/\ssrc=/.test(tag) && !/type="application\/ld\+json"/.test(tag) && !tag.includes(`nonce="${own}"`));
    if (loose.length) fail(`${path}: inline scripts without the nonce: ${loose.join(" ")}`);
    if (/<link rel="canonical" href="([^"]+)"/.exec(page.text)?.[1] !== "https://ulune.app/") fail(`${path}: its canonical address is not /`);
    if (!page.text.includes('data-testid="studio-stage"')) fail(`${path}: the server's page has no studio`);
    // The compass reads the device's motion sensors: the policy must leave them to the page.
    const policy = page.res.headers.get("permissions-policy") ?? "";
    const blocked = COMPASS_SENSORS.filter((s) => new RegExp(`(^|,)\\s*${s}=\\((?![^)]*\\bself\\b)`).test(policy));
    if (blocked.length) fail(`${path}: the permissions policy blocks ${blocked.join(", ")} (Feng Shui's compass)`);
  }
  console.log(`headers: ${SECURITY.length} security headers on pages and files; a fresh nonce per page on ${inline.length} inline scripts, none from elsewhere; the Chinese pages (${CHINESE_PATHS.join(", ")}) the same, the compass's sensors left to the page`);

  // What search engines read: robots.txt, the sitemap, each page's head.
  const robots = await get("/robots.txt");
  const sitemap = await get("/sitemap.xml");
  if (robots.res.status !== 200 || !/Sitemap: https:\/\/ulune\.app\/sitemap\.xml/.test(robots.text)) fail("robots.txt");
  // The sitemap is made from the encyclopedia's index (src/lib/sitemap.ts): the app's pages, then the encyclopedia's.
  const locs = [...sitemap.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const listed = ["/", "/calendar", "/calendrier", "/privacy", "/legal", "/terms", "/credits", "/accessibility", "/changes", "/encyclopedia", "/encyclopedie"];
  if (sitemap.res.status !== 200 || listed.some((p) => !locs.includes(`https://ulune.app${p}`)) || new Set(locs).size !== locs.length) fail("sitemap.xml");
  const entry = locs.find((l) => /\/encyclopedia\/[a-z0-9-]+$/.test(l) && !/\/(astrology|human-design|numerology|shared-ideas)$/.test(l));
  if (entry) {
    const page = await get(new URL(entry).pathname);
    if (page.res.status !== 200 || /<link rel="canonical" href="([^"]+)"/.exec(page.text)?.[1] !== entry || !/hreflang="fr"/i.test(page.text)) fail(`${entry}: head`);
  }
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
  // Where a share link lands (share plan, feature 1): the same page for every link, out of search.
  const sharePage = await get("/s");
  if (sharePage.res.status !== 200 || !noindex(sharePage.text) || canonical(sharePage.text) || !sharePage.text.includes('data-testid="share-page"')) fail("/s: should answer and stay out of search");
  // Where a device link lands (feature 4, the synced account): the same, for every link.
  const linkPage = await get("/link");
  if (linkPage.res.status !== 200 || !noindex(linkPage.text) || canonical(linkPage.text) || !linkPage.text.includes('data-testid="link-page"')) fail("/link: should answer and stay out of search");
  console.log(`search: robots.txt, a ${locs.length}-page sitemap, canonical addresses, settings, /guide, /s, /link and missing pages kept out; the guide in the home page`);
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

/**
 * The synced account in the build (docs/sync-protocol.md; share and compare plan, feature 4): every
 * operation answers garbage with the one uniform error, with the security headers and no-store; other
 * methods 405, unknown operations 404; a failed sign-in says the same whether the account exists or
 * not. Then, with accounts kept in memory for this check only (ULUNE_ACCOUNT_STORE=memory, which the
 * server never honours on Vercel), an account is created, signed into, given a sealed record, read
 * back and deleted, through the built function. The daily clean-up refuses to run without its secret.
 */
async function checkAccount() {
  const { randomBytes, webcrypto } = await import("node:crypto");
  process.env.ULUNE_ACCOUNT_STORE = "memory";
  process.env.ACCOUNT_SESSION_SECRET = randomBytes(32).toString("base64");
  delete process.env.ACCOUNT_DATABASE_URL;
  delete process.env.CRON_SECRET;
  const protocol = readFileSync(join(ROOT, "src", "lib", "account", "protocol.ts"), "utf8");
  const ops = [.../export const OPERATIONS = \[([\s\S]*?)\] as const;/.exec(protocol)[1].matchAll(/"([a-z/-]+)"/g)].map((m) => m[1]);
  if (ops.length < 20) fail(`the account's operations not found in protocol.ts (${ops.length})`);
  const b64u = (bytes) => Buffer.from(bytes).toString("base64url");
  const post = (op, body, headers = {}) =>
    fetch(`${BASE}/api/account/v1/${op}`, { method: "POST", headers: { "content-type": "application/json", "sec-fetch-site": "same-origin", ...headers }, body });
  const expect = async (res, status, text, what) => {
    const got = await res.text();
    if (res.status !== status || got !== text) fail(`${what}: ${res.status} ${got.slice(0, 120)}`);
    if (res.headers.get("cache-control") !== "no-store") fail(`${what}: may be cached`);
    const lacking = SECURITY.filter((h) => !res.headers.get(h));
    if (lacking.length) fail(`${what}: missing ${lacking.join(", ")}`);
  };
  for (const op of ops) {
    for (const garbage of ["garbage", "[]", '{"surprise":1}', "", "null"]) await expect(await post(op, garbage), 400, '{"error":"bad-request"}', `${op} ${garbage || "(empty)"}`);
    await expect(await fetch(`${BASE}/api/account/v1/${op}`), 405, '{"error":"method"}', `GET ${op}`);
    await expect(await post(op, "{}", { "sec-fetch-site": "cross-site" }), 403, '{"error":"cross-site"}', `${op} from another site`);
  }
  await expect(await post("no/such", "{}"), 404, '{"error":"not-found"}', "an unknown operation");
  // One account, from creation to deletion.
  const deviceKey = async () => {
    const pair = await webcrypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, false, ["sign", "verify"]);
    return { key: b64u(new Uint8Array(await webcrypto.subtle.exportKey("spki", pair.publicKey))) };
  };
  const json = async (res, what) => {
    if (res.status !== 200) fail(`${what}: ${res.status} ${(await res.text()).slice(0, 120)}`);
    return await res.json();
  };
  const begin = await json(await post("account/begin", "{}"), "account/begin");
  const authKey = b64u(randomBytes(32));
  const made = await json(
    await post(
      "account/create",
      JSON.stringify({
        account: begin.account,
        challenge: begin.challenge,
        device: await deviceKey(),
        passphrase: { salt: b64u(randomBytes(16)), m: 19456, t: 2, p: 1, authKey, wrap: b64u(randomBytes(60)) },
        recovery: { lookup: b64u(randomBytes(16)), authKey: b64u(randomBytes(32)), wrap: b64u(randomBytes(60)) },
      }),
    ),
    "account/create",
  );
  const auth = { authorization: `Bearer ${made.token}` };
  const signIn = (account, key) => post("passphrase/sign-in", JSON.stringify({ account, authKey: key, device: { key: "" } }));
  await expect(await signIn(begin.account, authKey), 400, '{"error":"bad-request"}', "a sign-in with no device key");
  const signedIn = await json(await post("passphrase/sign-in", JSON.stringify({ account: begin.account, authKey, device: await deviceKey() })), "passphrase/sign-in");
  if (signedIn.account !== begin.account || signedIn.way.kind !== "passphrase") fail("passphrase/sign-in answered another account");
  for (const [account, key] of [[begin.account, b64u(randomBytes(32))], [b64u(randomBytes(16)), authKey]]) {
    await expect(await post("passphrase/sign-in", JSON.stringify({ account, authKey: key, device: await deviceKey() })), 401, '{"error":"denied"}', "a failed sign-in");
  }
  const blob = b64u(randomBytes(8192));
  const put = await json(await post("records/put", JSON.stringify({ puts: [{ rid: b64u(randomBytes(16)), base: 0, blob }] }), auth), "records/put");
  if (put.applied?.[0]?.version !== 1) fail(`records/put: ${JSON.stringify(put).slice(0, 120)}`);
  await expect(await post("records/put", JSON.stringify({ puts: [{ rid: b64u(randomBytes(16)), base: 0, blob: b64u(randomBytes(8000)) }] }), auth), 400, '{"error":"bad-request"}', "an unpadded record");
  const changes = await json(await post("records/changes", '{"cursor":0}', auth), "records/changes");
  if (changes.changes?.[0]?.blob !== blob) fail("records/changes did not give the record back");
  if ((await json(await post("account/delete", '{"confirm":"delete-everything"}', auth), "account/delete")).deleted !== true) fail("account/delete");
  await expect(await post("account/status", "{}", auth), 401, '{"error":"denied"}', "a deleted account's session");
  await expect(await fetch(`${BASE}/api/account/cleanup`, { headers: { authorization: "Bearer guess" } }), 503, '{"error":"unavailable"}', "the clean-up without CRON_SECRET");
  console.log(`account: ${ops.length} operations answer garbage, other methods and other sites uniformly; an account created, signed into, synced and deleted through the built function; the clean-up locked without its secret`);
}

process.env.ULUNE_DEV = BASE;
// The casts below go to Ulune's server (Settings' other choice), so their answers can be read off the network
// and the device's checked against them; the device's own cast through the page comes after (deviceCast).
process.env.ULUNE_CALCULATE = "server";
const { FIXTURE_A, assertFixtureA, castFixture, goStudioPage, gotoApp, launch } = await import("./e2e/_lib.mjs");
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
/**
 * The ids a seroval answer refers back to (its "indexed value" nodes, type 4): an object met twice
 * (a chart's dominant pattern is one of its configurations) is sent once, then referred to, and
 * reading the answer without these ids leaves the second place empty.
 */
function backReferences(tree, out = []) {
  if (Array.isArray(tree)) for (const n of tree) backReferences(n, out);
  else if (tree && typeof tree === "object") {
    if (tree.t === 4 && typeof tree.i === "number") out.push(tree.i);
    for (const v of Object.values(tree)) backReferences(v, out);
  }
  return out;
}

// A production build names its server functions by hash, so a cast is the
// server call whose answer holds a chart (one seroval node, as the page reads it).
function nextChart() {
  return new Promise((resolve) => {
    const on = async (r) => {
      if (!r.url().includes("/_serverFn/")) return;
      try {
        const tree = JSON.parse(await r.text());
        const value = fromJSON({ t: tree, f: 127, m: backReferences(tree) });
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
  // The Chinese languages (languages plan, part 30): each page's figure, its code and its words.
  const chinese = { zodiac: "zodiac-wheel", bazi: "bazi-board", "bazi-luck": "studio-bazi-luck", fengshui: "studio-fengshui", "fengshui-home": "fengshui-home" };
  for (const [mode, figure] of Object.entries(chinese)) {
    await goStudioPage(page, mode);
    await page.getByTestId(figure).first().waitFor({ timeout: 30000 });
  }
  // The compass's sensors, as the browser reads the policy on the Home page (Chromium's document.featurePolicy).
  const blocked = await page.evaluate((sensors) => {
    const policy = document.featurePolicy;
    return policy ? sensors.filter((s) => !policy.allowsFeature(s)) : [];
  }, COMPASS_SENSORS);
  if (blocked.length) fail(`/feng-shui/home: the page may not read ${blocked.join(", ")} (Feng Shui's compass)`);
  await goStudioPage(page, "natal");
  await page.getByTestId("wheel-depth-3d").click();
  await page.locator('[data-depth-view="3d"]').waitFor({ timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.getByTestId("wheel-depth-3d").click();
  for (const path of ["/settings", "/privacy", "/credits"]) {
    await page.goto(BASE + path, { waitUntil: "networkidle" });
  }
  console.log(
    "modes, 3D and pages: transits, timing, Human Design, numerology, Chinese astrology, BaZi and its luck pillars, Feng Shui and its Home (the compass's sensors allowed), 3D, settings, privacy, credits",
  );
}

/**
 * The calculations on the device (on-device plan, step 2), as the build ships them: the engine's
 * worker under its own policy (src/lib/security-headers.ts, ENGINE_WORKER_CSP: WebAssembly and
 * Ulune's address only), the engine and the 17 ephemeris files and the star catalogue as /assets/
 * files, and the chart the server just cast, cast again by the worker in the page under the
 * page's policy: the same chart (the Sun's altitude, computed with JavaScript's own trigonometry,
 * to 1e-9°; everything else to the last digit).
 */
async function engineCheck(cast) {
  const files = readdirSync(join(staticDir, "assets"));
  const worker = files.find((f) => /^engine-worker-[\w-]+\.js$/.test(f));
  if (!worker) fail("no engine worker in the build (assets/engine-worker-*.js)");
  const policy = (await fetch(`${BASE}/assets/${worker}`)).headers.get("content-security-policy") ?? "";
  if (!/^default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'$/.test(policy)) fail(`the engine worker's policy: "${policy}"`);
  const wasm = files.find((f) => /^swisseph-[\w-]+\.wasm$/.test(f));
  const ephe = files.filter((f) => /\.se1$/.test(f) || /^sefstars-[\w-]+\.txt$/.test(f));
  if (!wasm || ephe.length !== 18) fail(`the engine's files in the build: ${wasm ?? "no engine"}, ${ephe.length} ephemeris files`);
  const type = (await fetch(`${BASE}/assets/${wasm}`, { method: "HEAD" })).headers.get("content-type");
  if (type !== "application/wasm") fail(`the engine is sent as ${type}`);
  const m = cast.meta;
  const data = {
    date: m.date,
    time: m.time,
    latitude: m.latitude,
    longitude: m.longitude,
    houseSystem: m.houseSystemRequested ?? m.houseSystem,
    place: { zone: m.birthTime.zone, source: m.birthTime.zoneSource },
  };
  const answer = await page.evaluate(
    ({ file, data }) =>
      new Promise((resolve) => {
        const w = new Worker(`/assets/${file}`, { type: "module" });
        const t0 = performance.now();
        w.onmessage = (e) => {
          // (The download's progress comes first, as { id: 0, progress }: the answer is the request's own.)
          if (e.data?.id !== 1) return;
          w.terminate();
          resolve({ ...e.data, wall: performance.now() - t0 });
        };
        w.onerror = (e) => resolve({ ok: false, error: e.message || "the worker failed to start" });
        w.postMessage({ id: 1, job: { kind: "natal", data } });
      }),
    { file: worker, data },
  );
  if (!answer.ok) fail(`the engine's worker: ${answer.error}`);
  const device = answer.result.chart;
  if (Math.abs(device.meta.sunAltitude - cast.meta.sunAltitude) > 1e-9) fail(`the Sun's altitude: ${device.meta.sunAltitude} vs ${cast.meta.sunAltitude}`);
  device.meta.sunAltitude = cast.meta.sunAltitude;
  if (JSON.stringify(device) !== JSON.stringify(cast)) {
    const parts = [];
    const walk = (a, b, path) => {
      if (parts.length >= 3) return;
      if (typeof a !== "object" || a === null || typeof b !== "object" || b === null) {
        if (a !== b) parts.push(`${path}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`);
        return;
      }
      for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) walk(a[k], b[k], `${path}.${k}`);
    };
    walk(device, cast, "chart");
    fail(`the device's chart is not the server's: ${parts.join("; ")}`);
  }
  console.log(`engine: the worker (its own policy), the engine and ${ephe.length} files in /assets; the chart cast again in the page, the server's to the last digit (${answer.wall.toFixed(0)} ms with the engine's start)`);
}

/**
 * The default (on-device plan, step 5): a chart cast through the page on the device, under the page's
 * and the worker's policies, the engine's files from /assets: the QA fixture's positions, nothing sent
 * to the server but the place search, no policy refusing anything.
 */
async function deviceCast() {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addInitScript(() => localStorage.setItem("ulune.calculate", "device"));
  const p = await context.newPage();
  p.setDefaultTimeout(20000);
  const seen = [];
  p.on("console", (m) => {
    if (m.type() === "error") errors.push(`device: ${m.text()}`);
  });
  p.on("pageerror", (e) => errors.push(`device: ${e.message}`));
  await p.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (e) => console.error(`content security policy blocked ${e.blockedURI || "an inline script"} (${e.violatedDirective})`));
  });
  // (A production build names its server functions by hash: a calculation is known by what it carries.)
  p.on("request", (r) => {
    if (r.url().includes("/_serverFn/") && /"(?:date|natalUtc|at|t0|latitude)"/.test(r.postData() ?? "")) seen.push(r.postData().slice(0, 80));
  });
  try {
    await gotoApp(p);
    await castFixture(p, FIXTURE_A);
    await assertFixtureA(p);
    if (seen.length) fail(`on the device, a calculation was sent to the server: ${seen.join(" | ")}`);
    console.log("device: Fixture A calculated in the page's worker, under the policies, nothing but the place search sent");
  } finally {
    await context.close();
  }
}

let ok = false;
try {
  await checkHeaders();
  await checkRoutes();
  await checkAccount();
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
  await engineCheck(paris);
  await deviceCast();
  if (errors.length) fail(`console: ${errors.join(" | ")}`);
  ok = true;
} finally {
  await browser.close();
  server.close();
}
console.log(ok ? "DEPLOY CHECK OK" : "DEPLOY CHECK FAILED");
process.exit(ok ? 0 : 1);
