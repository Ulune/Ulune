// What each page downloads on a first visit, per file, in gzip bytes (from the
// build on disk, so every run and every server compares the same way).
// Needs serve.mjs running on :9311 (npm run build first).
// node scripts/perf/load/chunks.mjs [/ /settings /nope] [--returning] [--json]
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";
import { ROOT, OUT, CHROME } from "../paths.mjs";
const { chromium } = createRequire(join(ROOT, "package.json"))("playwright");
const BASE = "http://127.0.0.1:9311";
const STATIC = join(ROOT, ".vercel/output/static");
const args = process.argv.slice(2);
const returning = args.includes("--returning");
const asJson = args.includes("--json");
const paths = args.filter((a) => a.startsWith("/"));
if (!paths.length) paths.push("/", "/settings", "/nope");
const ROW = join(OUT, "load/saved-row.json");
const row = returning && existsSync(ROW) ? readFileSync(ROW, "utf8") : null;

const gz = new Map();
function gzBytes(url) {
  const p = join(STATIC, new URL(url).pathname);
  if (!existsSync(p)) return null;
  if (!gz.has(p)) gz.set(p, gzipSync(readFileSync(p), { level: 9 }).length);
  return gz.get(p);
}

const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
const report = [];
for (const path of paths) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  if (row) {
    await ctx.addInitScript((rowJson) => {
      try {
        if (!localStorage.getItem("orbis.charts.v1")) {
          const r = JSON.parse(rowJson);
          localStorage.setItem("orbis.charts.v1", JSON.stringify([r]));
          localStorage.setItem("orbis.charts.active", r.id);
        }
      } catch { /* storage blocked */ }
    }, row);
  }
  const page = await ctx.newPage();
  const seen = [];
  let fcp = null;
  page.on("request", (req) => {
    const t = req.resourceType();
    if (t === "script" || t === "stylesheet" || t === "font") seen.push({ url: req.url(), type: t, at: Date.now() });
  });
  const t0 = Date.now();
  const res = await page.goto(BASE + path, { waitUntil: "load", timeout: 120000 });
  // Asked for by the page load itself; what comes after (idle prefetch,
  // lazy parts) is counted apart.
  const tLoad = Date.now();
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(1500);
  fcp = await page.evaluate(() => performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? null);
  const html = await (await ctx.request.get(BASE + path)).text();
  const preloads = [...html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+)"/g)].map((m) => m[1]);
  const files = seen
    .filter((s) => s.url.startsWith(BASE))
    .map((s) => ({ file: new URL(s.url).pathname, type: s.type, gz: gzBytes(s.url), ms: s.at - t0, later: s.at > tLoad }));
  const sum = (type, later = null) => files.filter((f) => f.type === type && (later === null || f.later === later)).reduce((a, f) => a + (f.gz ?? 0), 0);
  report.push({ path, status: res?.status(), fcp: fcp && Math.round(fcp), jsGz: sum("script"), jsUpFront: sum("script", false), jsLater: sum("script", true), cssGz: sum("stylesheet"), fontGz: sum("font"), preloads: preloads.length, files });
  await ctx.close();
}
await browser.close();
if (asJson) console.log(JSON.stringify(report, null, 1));
else for (const r of report) {
  console.log(`${r.path}  status ${r.status}  JS ${(r.jsGz / 1024).toFixed(1)} KB gz (${(r.jsUpFront / 1024).toFixed(1)} with the load, ${(r.jsLater / 1024).toFixed(1)} after)  CSS ${(r.cssGz / 1024).toFixed(1)} KB gz  fonts ${(r.fontGz / 1024).toFixed(1)} KB  (${r.files.length} files, ${r.preloads} modulepreloads)`);
  for (const f of r.files.sort((a, b) => (b.gz ?? 0) - (a.gz ?? 0))) console.log(`   ${f.type.padEnd(10)} ${((f.gz ?? 0) / 1024).toFixed(1).padStart(6)} KB  ${f.later ? "after " : "      "}${f.file}`);
}
