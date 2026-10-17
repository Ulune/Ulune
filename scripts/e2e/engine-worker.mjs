// The calculations on the device, in Chromium (on-device plan, steps 1–3). The engine's worker
// (src/lib/engine/worker.ts, through client.ts) answers every case of
// scripts/fixtures/engine-cases.mjs exactly as Ulune's server does, to the last digit: the
// server functions and routes the page calls today (castChart, castTransits, castProgressions,
// castHumanDesign, /api/sky-window, /api/sky-year), and for the Timing table, which no route
// serves, the server's module (_engine-reference.mjs). Typed coordinates get their zone from the
// new lookupZone, which is sent the coordinates and nothing else.
// Then what a reader's browser does with it: nothing of the engine in a page's load; the engine
// and the 1800–2399 files first, an earlier era only when a date needs it; the files kept for the
// next page; a long calculation cancelled at once, the engine still answering after; no request
// leaves Ulune's address. Development server only (the build: npm run check:deploy).
import { spawnSync } from "node:child_process";
import { DEV, launch, ROOT, serverFnName } from "./_lib.mjs";
import { NATAL_CASES, laterCases } from "../fixtures/engine-cases.mjs";

const STARTUP = ["s136199s.se1", "se90377s.se1", "seas_18.se1", "sefstars.txt", "semo_18.se1", "sepl_18.se1"];
/** An engine file's own download (not development's `?url` module that names it). */
const epheFetch = (u) => /\.se1$|sefstars[\w-]*\.txt$/.test(new URL(u).pathname) && !new URL(u).search;
const wasmFetch = (u) => /swisseph[\w-]*\.wasm$/.test(new URL(u).pathname) && !new URL(u).search;

/**
 * Two answers, the same to the last digit. One value is computed after Swiss with JavaScript's
 * own trigonometry, which each engine may round differently in its last digits: the Sun's altitude
 * of a natal chart (anatomy.ts, altitudeFromEquatorial; it decides day or night). It must agree
 * within 1e-9° and give the same day or night; everything else, Swiss's numbers and all the
 * arithmetic on them, must be bit for bit the same.
 */
function sameAnswer(serverJson, deviceJson) {
  const a = JSON.parse(serverJson);
  const b = JSON.parse(deviceJson);
  const altA = a?.chart?.meta?.sunAltitude;
  const altB = b?.chart?.meta?.sunAltitude;
  if (typeof altA === "number" && typeof altB === "number") {
    if (Math.abs(altA - altB) > 1e-9) return false;
    b.chart.meta.sunAltitude = altA;
  }
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Where two answers part: the first few paths whose values differ. */
function partsWays(a, b, path = "", out = []) {
  if (out.length >= 3) return out;
  if (typeof a !== "object" || a === null || typeof b !== "object" || b === null) {
    if (a !== b) out.push(`${path}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`);
    return out;
  }
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) partsWays(a[k], b[k], `${path}.${k}`, out);
  return out;
}
const fail = [];
const { browser, page } = await launch(1280);
const requests = [];
page.on("request", (r) => requests.push({ url: r.url(), body: r.postData() ?? "" }));
page.on("pageerror", (e) => fail.push(`page error: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error" && !/Failed to load resource|favicon/i.test(m.text())) fail.push(`console: ${m.text()}`);
});

try {
  // 1. A page's load fetches nothing of the engine.
  await page.goto(`${DEV}/credits`, { waitUntil: "networkidle", timeout: 60000 });
  const engineFile = (u) => /\/src\/lib\/engine\/|\/ephe\/|swisseph|\.se1(\?|$)|engine-worker/.test(u);
  const early = requests.filter((r) => engineFile(r.url)).map((r) => r.url);
  if (early.length) fail.push(`the page's load fetched the engine: ${early.slice(0, 3).join(", ")}`);
  const loaded = requests.length;

  // 2. The natal cases: the server's castChart, the zone for typed coordinates from lookupZone,
  //    the device's answer from the worker, in the page.
  const natal = await page.evaluate(async (cases) => {
    const { castChart } = await import("/src/lib/chart/functions.ts");
    const { lookupZone } = await import("/src/lib/engine/zone-lookup.ts");
    const { deviceEngine } = await import("/src/lib/engine/client.ts");
    const warm = await deviceEngine.warm();
    const out = [];
    for (const c of cases) {
      const data = { ...c.data, ...(c.hint ? { zone: c.hint } : {}) };
      const server = await castChart({ data });
      const place = c.zone === "search" ? { zone: c.hint, source: "place" } : await lookupZone({ data: { latitude: c.data.latitude, longitude: c.data.longitude } });
      const t0 = performance.now();
      const device = await deviceEngine.natal({ ...data, place });
      out.push({ label: c.label, server: JSON.stringify(server), device: JSON.stringify(device), ms: performance.now() - t0 });
    }
    return { out, warm };
  }, NATAL_CASES);
  if (JSON.stringify(natal.warm.files) !== JSON.stringify(STARTUP)) fail.push(`the engine started with ${natal.warm.files.join(", ")}`);
  const same = (rows) => rows.filter((r) => !sameAnswer(r.server, r.device)).map((r) => `${r.label} (${partsWays(JSON.parse(r.server), JSON.parse(r.device)).join("; ")})`);
  const bitwise = (rows) => rows.filter((r) => r.server === r.device).length;
  const natalDiff = same(natal.out);
  if (natalDiff.length) fail.push(`natal charts differ from the server's: ${natalDiff.join("; ")}`);
  console.log(`natal: ${natal.out.length - natalDiff.length}/${natal.out.length} identical to castChart, ${bitwise(natal.out)} of them bit for bit, the others but the Sun's altitude's last digits (engine started in ${natal.warm.startMs} ms in the worker)`);

  // 3. Transits, progressions, Human Design, the scrub window, the year's sky, the Timing table.
  const charts = new Map(natal.out.map((r) => [r.label, JSON.parse(r.server).chart]));
  const later = laterCases((label) => charts.get(label));
  const timingCases = later.filter((c) => c.kind === "timing");
  const ref = spawnSync(process.execPath, ["--experimental-strip-types", "--import", "./scripts/register-ts.mjs", "scripts/e2e/_engine-reference.mjs"], {
    cwd: ROOT,
    input: JSON.stringify(timingCases.map((c) => c.data)),
    encoding: "utf8",
    maxBuffer: 64 << 20,
  });
  if (ref.status !== 0) throw new Error(`the Timing reference failed: ${ref.stderr.slice(-400)}`);
  const timingRef = JSON.parse(ref.stdout);
  const rest = await page.evaluate(async (cases) => {
    const fns = await import("/src/lib/chart/functions.ts");
    const { deviceEngine } = await import("/src/lib/engine/client.ts");
    const { CALC_VERSION } = await import("/src/lib/chart/constants.ts");
    const { SKY_WINDOW_FORMAT } = await import("/src/lib/chart/sky-window.ts");
    const { SKY_YEAR_FORMAT } = await import("/src/lib/chart/sky-year.ts");
    // The server looks the zone up itself: the request it takes has none.
    const strip = (data) => Object.fromEntries(Object.entries(data).filter(([k]) => k !== "timezone"));
    const out = [];
    for (const c of cases) {
      let server = null;
      if (c.kind === "transits") server = await fns.castTransits({ data: strip(c.data) });
      if (c.kind === "progressions") server = await fns.castProgressions({ data: strip(c.data) });
      if (c.kind === "humanDesign") server = await fns.castHumanDesign({ data: c.data });
      if (c.kind === "skyWindow") server = await (await fetch(`/api/sky-window?t0=${c.t0}&v=${CALC_VERSION}.${SKY_WINDOW_FORMAT}`)).json();
      if (c.kind === "skyYear") server = await (await fetch(`/api/sky-year?y=${c.year}&v=${CALC_VERSION}.${SKY_YEAR_FORMAT}`)).json();
      const t0 = performance.now();
      const device =
        c.kind === "skyWindow" ? await deviceEngine.skyWindow(c.t0) : c.kind === "skyYear" ? await deviceEngine.skyYear(c.year) : await deviceEngine[c.kind](c.data);
      out.push({ label: c.label, kind: c.kind, server: server && JSON.stringify(server), device: JSON.stringify(device), ms: performance.now() - t0 });
    }
    return out;
  }, later);
  let t = 0;
  for (const r of rest) if (r.kind === "timing") r.server = JSON.stringify(timingRef[t++]);
  const restDiff = same(rest);
  if (restDiff.length) fail.push(`differ from the server's: ${restDiff.join("; ")}`);
  const exacts = rest.filter((r) => r.kind === "transits" || r.kind === "progressions").reduce((n, r) => n + (JSON.parse(r.device).aspects ?? []).filter((a) => a.exactUtc).length, 0);
  const hits = rest.filter((r) => r.kind === "timing").reduce((n, r) => n + JSON.parse(r.device).hits.length, 0);
  console.log(`transits, progressions, Human Design, scrub windows, the year's sky, Timing: ${rest.length - restDiff.length}/${rest.length} identical (${exacts} exact times, ${hits} Timing exacts)`);
  for (const r of [...natal.out.slice(0, 1), ...rest.filter((r) => /a year|2026$/.test(r.label))]) console.log(`  ${r.label}: ${r.ms.toFixed(0)} ms in the worker`);

  // 4. Only the eras asked for: 1200–1799 and 600–1199 for the old dates, nothing earlier.
  const held = await page.evaluate(async () => (await (await import("/src/lib/engine/client.ts")).deviceEngine.warm()).files);
  const wanted = [...STARTUP, "seas_06.se1", "seas_12.se1", "semo_06.se1", "semo_12.se1", "sepl_06.se1", "sepl_12.se1"].sort();
  if (JSON.stringify(held) !== JSON.stringify(wanted)) fail.push(`the worker holds ${held.join(", ")}`);
  const fetched = requests.slice(loaded).filter((r) => epheFetch(r.url)).map((r) => new URL(r.url).pathname.split("/").pop());
  if (fetched.some((f) => /_00|m06/.test(f)) || new Set(fetched).size !== fetched.length) fail.push(`ephemeris files fetched: ${fetched.join(", ")}`);
  console.log(`eras: started with ${STARTUP.length} files, fetched ${fetched.length - STARTUP.length} more for the dates before 1800 (${fetched.filter((f) => !STARTUP.includes(f)).join(", ")})`);

  // 5. lookupZone is sent the coordinates and nothing else.
  const zoneCalls = requests.filter((r) => serverFnName(r.url).startsWith("lookupZone"));
  const leaky = zoneCalls.filter((r) => /date|time|name|place|1990|zone/i.test(r.body.replace(/lookupZone/g, "")) || !/latitude/.test(r.body) || !/longitude/.test(r.body));
  if (!zoneCalls.length || leaky.length) fail.push(`lookupZone's requests: ${zoneCalls.length}, carrying more than coordinates: ${leaky.map((r) => r.body).join(" | ").slice(0, 300)}`);
  console.log(`lookupZone: ${zoneCalls.length} requests, coordinates only`);

  // 6. A Timing year cancelled: the promise rejects at once, the worker answers the next request.
  const cancel = await page.evaluate(async (data) => {
    const { deviceEngine } = await import("/src/lib/engine/client.ts");
    const ctrl = new AbortController();
    const t0 = performance.now();
    const asked = deviceEngine.timing(data, { signal: ctrl.signal }).then(
      () => "answered",
      (e) => e.name,
    );
    setTimeout(() => ctrl.abort(), 30);
    const outcome = await asked;
    const rejectedAfter = performance.now() - t0;
    const t1 = performance.now();
    const next = await deviceEngine.humanDesign({ natalUtc: "1990-06-15T10:00:00.000Z" });
    return { outcome, rejectedAfter, nextAfter: performance.now() - t1, nextOk: Boolean(next.definedCenters) };
  }, later.find((c) => c.label === "Timing, a year").data);
  if (cancel.outcome !== "AbortError" || cancel.rejectedAfter > 500 || !cancel.nextOk) fail.push(`cancel: ${JSON.stringify(cancel)}`);
  console.log(`cancel: a Timing year rejected after ${cancel.rejectedAfter.toFixed(0)} ms; the next request answered ${cancel.nextAfter.toFixed(0)} ms later`);

  // 7. The next visit: the page loaded again (a new worker), its files from the browser's copy.
  const before = requests.length;
  await page.goto(`${DEV}/credits`, { waitUntil: "load", timeout: 60000 });
  const again = await page.evaluate(async () => (await (await import("/src/lib/engine/client.ts")).deviceEngine.warm()));
  const refetched = requests.slice(before).filter((r) => epheFetch(r.url) || wasmFetch(r.url));
  if (again.network !== 0 || again.kept < 2_000_000 || refetched.length) fail.push(`the next visit fetched ${again.network} bytes (${refetched.length} requests)`);
  console.log(`kept: the next visit's engine read ${(again.kept / 1e6).toFixed(2)} MB from the browser's copy, none from the network (started in ${again.startMs} ms)`);

  // 8. Nothing left Ulune's address.
  const origin = new URL(DEV).origin;
  const outside = requests.filter((r) => !r.url.startsWith(origin) && !r.url.startsWith("data:") && !r.url.startsWith("blob:"));
  if (outside.length) fail.push(`requests elsewhere: ${outside.map((r) => r.url).slice(0, 3).join(", ")}`);
} finally {
  await browser.close();
}

if (fail.length) {
  console.error(`ENGINE WORKER FAILED:\n  ${fail.join("\n  ")}`);
  process.exit(1);
}
console.log("ENGINE WORKER OK");
