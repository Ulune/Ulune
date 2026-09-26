// First and returning-user loads of "/" against serve.mjs, throttled like a
// phone: Slow 4G (1.6 Mbps) or Fast 4G (9 Mbps) with 4x CPU, or none.
// node scripts/perf/load/measure.mjs slow4g|fast4g|none first|returning|returning-fr|returning-fv|returning-fv-fr
// (-fv: with the first view the app kept on the device; make-first-view.mjs)
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, OUT, CHROME } from "../paths.mjs";
const { chromium } = createRequire(join(ROOT, "package.json"))("playwright");
const BASE = "http://127.0.0.1:9311";
const ROW = join(OUT, "load/saved-row.json");
if (!existsSync(ROW)) throw new Error("make the returning-user fixture first: scripts/perf/load/make-row.mjs");
const row = readFileSync(ROW, "utf8");
const profile = process.argv[2] || "slow4g"; // slow4g | fast4g | none
const scenario = process.argv[3] || "first"; // first | returning | returning-fr | returning-fv | returning-fv-fr
const FR = scenario.endsWith("-fr");
const FV = scenario.startsWith("returning-fv") ? JSON.parse(readFileSync(join(OUT, "load/first-view.json"), "utf8"))[FR ? "fr" : "en"] : null;
const NET = {
  slow4g: { latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8, cpu: 4 },
  fast4g: { latency: 60, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (1.5 * 1024 * 1024) / 8, cpu: 4 },
  none: { latency: 0, downloadThroughput: -1, uploadThroughput: -1, cpu: 1 },
}[profile];
const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: FR ? "fr-FR" : "en-US" });
await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
// NOFONTS=1: no web fonts at all, as the baseline ran (Google Fonts cannot be
// reached from the test machine), to compare like with like.
if (process.env.NOFONTS) await ctx.route(/\/assets\/[^/]+\.woff2$/, (r) => r.abort());
if (scenario.startsWith("returning")) {
  await ctx.addInitScript(([rowJson, fr, fv]) => {
    try {
      if (!localStorage.getItem("orbis.charts.v1")) {
        const r = JSON.parse(rowJson);
        localStorage.setItem("orbis.charts.v1", JSON.stringify([r]));
        localStorage.setItem("orbis.charts.active", r.id);
        if (fr) localStorage.setItem("ulune.locale", "fr");
        if (fv) for (const [k, v] of Object.entries(fv)) localStorage.setItem(k, v);
      }
    } catch { /* storage blocked: the visit runs as a first visit */ }
  }, [row, FR, FV]);
}
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send("Network.enable");
await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
if (NET.latency || NET.downloadThroughput > 0) await cdp.send("Network.emulateNetworkConditions", { offline: false, ...{ latency: NET.latency, downloadThroughput: NET.downloadThroughput, uploadThroughput: NET.uploadThroughput } });
if (NET.cpu > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: NET.cpu });
const reqs = [];
page.on("requestfinished", async (req) => {
  try { const s = await req.sizes(); const t = req.timing(); reqs.push({ url: req.url().replace(BASE, ""), type: req.resourceType(), bytes: s.responseBodySize + s.responseHeadersSize, end: t.responseEnd, start: t.startTime }); } catch { /* request gone before its sizes were read */ }
});
const errors = [];
page.on("console", (m) => { if (m.type() === "error" || /hydrat|mismatch/i.test(m.text())) errors.push(m.text().slice(0, 300)); });
page.on("pageerror", (e) => errors.push("pageerror: " + String(e).slice(0, 300)));
await page.addInitScript(() => {
  window.__perf = { marks: {} };
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__perf.lcp = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__perf.cls = (window.__perf.cls || 0) + e.value; }).observe({ type: "layout-shift", buffered: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) { window.__perf.longtasks = (window.__perf.longtasks || []); window.__perf.longtasks.push([Math.round(e.startTime), Math.round(e.duration)]); } }).observe({ type: "longtask", buffered: true });
  const mo = new MutationObserver(() => {
    const t = performance.now();
    const m = window.__perf.marks;
    if (!m.form && document.querySelector("#cast-form, [data-testid='studio-stage'] form")) m.form = t;
    if (!m.themeReady && document.documentElement.classList.contains("theme-ready")) m.themeReady = t;
    if (!m.wheel && document.querySelector("[data-testid='studio-natal'] svg, [data-testid='wheel-depth'] svg")) m.wheel = t;
    if (!m.formGone && m.form && !document.querySelector("#cast-form")) m.formGone = t;
  });
  document.addEventListener("DOMContentLoaded", () => {
    // The first view is drawn by an inline script while the page parses.
    if (document.querySelector("ulune-first-view")) window.__perf.marks.firstView = performance.now();
    mo.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ["class"] });
  });
});
const navStart = Date.now();
await page.goto(BASE + "/", { waitUntil: "load", timeout: 180000 });
await page.waitForTimeout(scenario.startsWith("returning") ? 8000 : 5000);
const perf = await page.evaluate(() => {
  const nav = performance.getEntriesByType("navigation")[0];
  const paints = Object.fromEntries(performance.getEntriesByType("paint").map((p) => [p.name, Math.round(p.startTime)]));
  return { ttfb: Math.round(nav.responseStart), dcl: Math.round(nav.domContentLoadedEventEnd), load: Math.round(nav.loadEventEnd), paints, lcp: Math.round(window.__perf.lcp || 0), cls: +(window.__perf.cls || 0).toFixed(4), marks: Object.fromEntries(Object.entries(window.__perf.marks).map(([k, v]) => [k, Math.round(v)])), longtasks: window.__perf.longtasks || [], lang: document.documentElement.lang, text: document.body.innerText.slice(0, 160).replace(/\s+/g, " ") };
});
const byType = {};
for (const r of reqs) { byType[r.type] = byType[r.type] || { n: 0, kb: 0 }; byType[r.type].n++; byType[r.type].kb += r.bytes / 1024; }
console.log(JSON.stringify({ profile, scenario, ...perf, longtaskTotal: perf.longtasks.reduce((a, b) => a + b[1], 0), bytes: Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, `${v.n} req, ${v.kb.toFixed(1)} KB`])), errors: errors.slice(0, 6) }, null, 1));
console.log("requests (sent → done, ms from navigation start):"); for (const r of reqs.sort((a, b) => a.start - b.start)) console.log(`  ${r.type.padEnd(10)} ${(r.bytes / 1024).toFixed(1).padStart(7)} KB  ${String(Math.round(r.start - navStart)).padStart(5)} → ${String(Math.round(r.start - navStart + r.end)).padStart(5)}  ${r.url.slice(0, 90)}`);
await page.screenshot({ path: join(OUT, `load/shot-${profile}-${scenario}.png`) });
await browser.close();
