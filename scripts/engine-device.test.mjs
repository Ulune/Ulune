// The calculations on a device, run in Node (on-device plan, steps 1–3): the very modules a
// browser's worker runs (src/lib/engine: the engine, its browser file access, the requests),
// with the browser mocked — `fetch` and the Cache API serving the repository's ephe/ and
// swisseph.wasm as Ulune's address would — against Ulune's server path (calculate.server.ts,
// as the server functions call it). Every case of scripts/fixtures/engine-cases.mjs must come
// back identical to the last digit. Then what is particular to a device: it starts with
// 1800–2399 and fetches an earlier era only when a date needs it, keeps its files for the next
// visit and lets go of those a deploy replaced, refuses a zone its table does not know and what
// the server functions refuse, and stops a long calculation when asked.
// In Chromium, through the worker: scripts/e2e/engine-worker.mjs.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { Calculator } from "../src/lib/engine/calculate.ts";
import { browserFiles, ENGINE_CACHE } from "../src/lib/engine/files-browser.ts";
import { ALL_FILES, eraFiles, eraOfYear, filesForSpan, STARTUP_FILES } from "../src/lib/engine/eras.ts";
import { castHumanDesign, castNatal, castProgressions, castTransits, skyWindow, skyYear, timing } from "../src/lib/engine/requests.ts";
import * as server from "../src/lib/chart/calculate.server.ts";
import { zoneAt } from "../src/lib/chart/birth-time.server.ts";
import { normalizeBirth } from "../src/lib/chart/parse-birth.ts";
import { NATAL_CASES, laterCases } from "./fixtures/engine-cases.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const ORIGIN = "http://ulune.test";
const URLS = {
  wasm: "/assets/swisseph-Ab12.wasm",
  files: Object.fromEntries(ALL_FILES.map((name) => [name, `/assets/${name.replace(".", "-Cd34.")}`])),
};
const byUrl = new Map([[URLS.wasm, "node_modules/sweph-wasm/dist/wasm/swisseph.wasm"], ...Object.entries(URLS.files).map(([name, url]) => [url, `ephe/${name}`])]);

/** Ulune's address, as a browser's fetch reaches it; `fetched` counts what crossed the network. */
function site({ missing = [] } = {}) {
  const fetched = [];
  const fetch = async (url) => {
    const path = new URL(url).pathname;
    const file = byUrl.get(path);
    fetched.push(path);
    if (!file || missing.some((m) => path.includes(m))) return new Response("not found", { status: 404 });
    const bytes = readFileSync(ROOT + file);
    const type = file.endsWith(".wasm") ? "application/wasm" : file.endsWith(".txt") ? "text/plain" : "application/octet-stream";
    return new Response(bytes, { headers: { "content-type": type, "content-length": String(bytes.length) } });
  };
  return { fetch, fetched };
}

/** The Cache API, in memory. */
function memoryCaches() {
  const stores = new Map();
  return {
    stores,
    async open(name) {
      if (!stores.has(name)) {
        const m = new Map();
        stores.set(name, {
          m,
          async match(url) {
            return m.get(url)?.clone();
          },
          async put(url, res) {
            m.set(url, new Response(await res.arrayBuffer(), { headers: res.headers }));
          },
          async keys() {
            return [...m.keys()].map((url) => ({ url }));
          },
          async delete(key) {
            return m.delete(typeof key === "string" ? key : key.url);
          },
        });
      }
      return stores.get(name);
    },
    async delete(name) {
      return stores.delete(name);
    },
  };
}

const deviceOf = (net = site(), caches = memoryCaches()) => {
  const files = browserFiles(URLS, { fetch: net.fetch, caches, base: `${ORIGIN}/studio` });
  return { calc: new Calculator(files), files, net, caches };
};

/** castChart's handler (functions.ts), on the server path. */
async function serverCast(data) {
  const parsed = normalizeBirth({ date: data.date, time: data.time, placeLabel: "", latitude: data.latitude, longitude: data.longitude, timeUnknown: data.timeUnknown });
  const chart = await server.calculateNatal({
    name: "",
    date: parsed.date,
    time: parsed.timeUnknown ? "12:00" : parsed.time,
    timeUnknown: parsed.timeUnknown,
    latitude: parsed.latitude,
    longitude: parsed.longitude,
    placeLabel: "",
    houseSystem: data.houseSystem,
    zone: data.zone,
    tz: data.tz,
    fold: data.fold,
  });
  if (parsed.timeUnknown) chart.meta.time = "12:00";
  return { chart, timeUnknown: parsed.timeUnknown };
}

const rowsOf = (rows) => rows.map((r) => ({ id: r.id, name: r.name, ecliptic: r.ecliptic }));

/** The other server functions' handlers and routes, on the server path. */
function serverAnswer(c) {
  const d = c.data;
  if (c.kind === "transits")
    return server.calculateTransits({ utc: new Date(d.at), latitude: d.latitude, longitude: d.longitude, natalCusps: d.natalCusps, natalBodies: rowsOf(d.natalBodies), houseSystem: d.houseSystem });
  if (c.kind === "progressions")
    return server.calculateProgressions({ natalUtc: new Date(d.natalUtc), targetUtc: new Date(d.targetUtc), latitude: d.latitude, longitude: d.longitude, natalCusps: d.natalCusps, natalBodies: rowsOf(d.natalBodies), houseSystem: d.houseSystem });
  if (c.kind === "humanDesign") return server.calculateHumanDesign({ natalUtc: new Date(d.natalUtc), spanMinutes: d.spanMinutes });
  if (c.kind === "skyWindow") return server.calculateSkyWindow(c.t0);
  if (c.kind === "skyYear") return server.calculateSkyYear(c.year);
  if (c.kind === "timing") return server.calculateTiming({ from: new Date(d.from), to: new Date(d.to), latitude: d.latitude, longitude: d.longitude, natalBodies: rowsOf(d.natalBodies), houseSystem: d.houseSystem });
  throw new Error(c.kind);
}

function deviceAnswer(calc, c) {
  if (c.kind === "transits") return castTransits(calc, c.data);
  if (c.kind === "progressions") return castProgressions(calc, c.data);
  if (c.kind === "humanDesign") return castHumanDesign(calc, c.data);
  if (c.kind === "skyWindow") return skyWindow(calc, c.t0);
  if (c.kind === "skyYear") return skyYear(calc, c.year);
  if (c.kind === "timing") return timing(calc, c.data);
  throw new Error(c.kind);
}

/** The zone a device hands in: the place search's (the server confirms it is the one it would use), or the server's for typed coordinates. */
async function deviceZone(c) {
  if (c.zone === "search") {
    assert.deepEqual(await zoneAt(c.data.latitude, c.data.longitude, c.hint), { zone: c.hint, source: "place" }, `${c.label}: the search's zone`);
    return { zone: c.hint, source: "place" };
  }
  return zoneAt(c.data.latitude, c.data.longitude);
}

test("every golden case: the device's answer is the server's, to the last digit", async () => {
  const serverNatal = new Map();
  const serverLater = [];
  for (const c of NATAL_CASES) serverNatal.set(c.label, await serverCast({ ...c.data, ...(c.hint ? { zone: c.hint } : {}) }));
  const later = laterCases((label) => serverNatal.get(label).chart);
  for (const c of later) serverLater.push(await serverAnswer(c));

  const { calc, net } = deviceOf();
  const diffs = [];
  for (const c of NATAL_CASES) {
    const got = await castNatal(calc, { ...c.data, ...(c.hint ? { zone: c.hint } : {}), place: await deviceZone(c) });
    if (JSON.stringify(got) !== JSON.stringify(serverNatal.get(c.label))) diffs.push(c.label);
  }
  for (const [i, c] of later.entries()) {
    const got = await deviceAnswer(calc, c);
    if (JSON.stringify(got) !== JSON.stringify(serverLater[i])) diffs.push(c.label);
  }
  assert.deepEqual(diffs, []);
  assert.ok(NATAL_CASES.length + later.length >= 35, "the cases are all there");
  // The startup files, then the 600–1199 and 1200–1799 eras the old dates asked for; nothing else.
  const eras = new Set(net.fetched.filter((p) => p.endsWith(".se1") || p.endsWith(".txt")).map((p) => p.replace(/^\/assets\//, "").replace("-Cd34.", ".")));
  assert.deepEqual([...eras].sort(), [...STARTUP_FILES, ...eraFiles(600), ...eraFiles(1200)].sort());
});

test("a device starts with 1800–2399 and fetches an earlier era only when a date needs it", async () => {
  const { calc, net } = deviceOf();
  await castNatal(calc, { date: "1990-06-15", time: "12:00", latitude: 48.8566, longitude: 2.3522, place: { zone: "Europe/Paris", source: "place" } });
  assert.deepEqual(calc.held().sort(), [...STARTUP_FILES].sort());
  assert.equal(net.fetched.length, STARTUP_FILES.length + 1, "the engine and the six files, once each");
  await castNatal(calc, { date: "1500-03-01", time: "12:00", latitude: 49.4521, longitude: 11.0767, place: { zone: "Europe/Berlin", source: "coordinates" } });
  assert.deepEqual(calc.held().sort(), [...STARTUP_FILES, ...eraFiles(1200)].sort());
  // A transit search that reaches back before 1800 from 1801 (slow bodies look years away): the
  // file it reads is fetched, and the answer is the server's.
  const natal = await castNatal(calc, { date: "1801-02-01", time: "12:00", latitude: 48.8566, longitude: 2.3522, place: { zone: "Europe/Paris", source: "coordinates" } });
  const fresh = deviceOf();
  await castNatal(fresh.calc, { date: "1801-02-01", time: "12:00", latitude: 48.8566, longitude: 2.3522, place: { zone: "Europe/Paris", source: "coordinates" } });
  const req = {
    at: "1801-03-01T12:00:00.000Z",
    latitude: 48.8566,
    longitude: 2.3522,
    natalCusps: natal.chart.houses.map((h) => h.ecliptic),
    natalBodies: rowsOf([...natal.chart.planets, ...Object.values(natal.chart.angles)]),
    timezone: "Europe/Paris",
  };
  const sky = await castTransits(fresh.calc, req);
  const ref = await server.calculateTransits({ utc: new Date(req.at), latitude: req.latitude, longitude: req.longitude, natalCusps: req.natalCusps, natalBodies: req.natalBodies });
  assert.equal(JSON.stringify(sky), JSON.stringify(ref));
});

test("an answer depends on its request alone, not on the requests before it", async () => {
  // Near the start of an era two files overlap by weeks, and a slow body's coefficients reach years
  // past it: Swiss used to answer from whatever it had read last (up to 0.007″ for an asteroid, 3 s
  // on an exact time). Every calculation now starts from Swiss's clean state (swiss.ts, run).
  const natal = await serverCast({ date: "1801-02-01", time: "12:00", latitude: 48.8566, longitude: 2.3522 });
  const req = {
    utc: new Date("1801-03-01T12:00:00.000Z"),
    latitude: 48.8566,
    longitude: 2.3522,
    natalCusps: natal.chart.houses.map((h) => h.ecliptic),
    natalBodies: rowsOf([...natal.chart.planets, ...Object.values(natal.chart.angles)]),
  };
  const before = JSON.stringify(await server.calculateTransits(req));
  await serverCast({ date: "1500-03-01", time: "12:00", latitude: 49.4521, longitude: 11.0767 });
  await server.calculateHumanDesign({ natalUtc: new Date("1800-03-21T06:00:00Z") });
  await server.calculateSkyWindow(Date.UTC(2000, 0, 1) + Math.floor((Date.UTC(1799, 11, 20) - Date.UTC(2000, 0, 1)) / (32 * 864e5)) * 32 * 864e5);
  assert.equal(JSON.stringify(await server.calculateTransits(req)), before);
});

test("the files are kept for the next visit, and those a deploy replaced are let go", async () => {
  const caches = memoryCaches();
  const first = deviceOf(site(), caches);
  await first.calc.ready();
  const kept = caches.stores.get(ENGINE_CACHE).m;
  assert.equal(kept.size, STARTUP_FILES.length + 1);
  assert.ok(first.files.traffic().network > 2_000_000, "about 2.8 MB the first time (uncompressed)");
  // A stale copy from an older deploy.
  kept.set(`${ORIGIN}/assets/sepl_18-Old1.se1`, new Response("old"));
  const again = deviceOf(site(), caches);
  await again.calc.ready();
  assert.deepEqual(again.net.fetched, [], "nothing fetched the second time");
  assert.equal(again.files.traffic().network, 0);
  assert.ok(again.files.traffic().kept > 2_000_000);
  await new Promise((r) => setTimeout(r, 20));
  assert.ok(!kept.has(`${ORIGIN}/assets/sepl_18-Old1.se1`), "the replaced file is let go");
  await again.files.forget();
  assert.ok(!caches.stores.has(ENGINE_CACHE));
});

test("a device without its files says so; without the Cache API it still works", async () => {
  const broken = deviceOf(site({ missing: ["semo_18"] }));
  await assert.rejects(broken.calc.ready(), /E:engine\.files\|404/);
  const offline = deviceOf({ fetch: async () => Promise.reject(new TypeError("Failed to fetch")), fetched: [] });
  await assert.rejects(offline.calc.ready(), /E:engine\.offline/);
  const net = site();
  const bare = new Calculator(browserFiles(URLS, { fetch: net.fetch, caches: null, base: ORIGIN }));
  const a = await castNatal(bare, { date: "1990-06-15", time: "12:00", latitude: 48.8566, longitude: 2.3522, place: { zone: "Europe/Paris", source: "place" } });
  assert.equal(a.chart.meta.ephemeris, "swiss");
});

test("the device refuses what the server functions refuse, and a zone its table does not know", async () => {
  const { calc } = deviceOf();
  const base = { date: "1990-06-15", time: "12:00", latitude: 48.8566, longitude: 2.3522 };
  await assert.rejects(castNatal(calc, { ...base, place: { zone: "Mars/Olympus", source: "place" } }), /E:engine\.zone\|Mars\/Olympus/);
  await assert.rejects(castNatal(calc, { ...base, latitude: 91, place: { zone: "Europe/Paris", source: "place" } }));
  await assert.rejects(castNatal(calc, { ...base, tz: "+16:00", place: { zone: "Europe/Paris", source: "place" } }), /E:tz\.invalid/);
  await assert.rejects(castHumanDesign(calc, { natalUtc: "-0700-01-01T00:00:00.000Z" }), /E:moment\.range/);
  await assert.rejects(skyWindow(calc, Date.UTC(2026, 0, 2)), /E:window\.start/);
  await assert.rejects(skyYear(calc, 3000), /E:year\.range/);
  await assert.rejects(castTransits(calc, { at: "2026-01-01T00:00:00.000Z", latitude: 0, longitude: 0, natalCusps: [1, 2], natalBodies: [], timezone: "Europe/Paris" }));
});

test("a long calculation stops at its next step when asked", async () => {
  const { calc } = deviceOf();
  await calc.ready();
  let steps = 0;
  const pause = async () => {
    steps += 1;
    if (steps === 3) throw new Error("E:engine.cancelled");
  };
  const natal = await castNatal(calc, { date: "1990-06-15", time: "12:00", latitude: 48.8566, longitude: 2.3522, place: { zone: "Europe/Paris", source: "place" } });
  const req = { from: "2026-01-01T00:00:00.000Z", to: "2027-01-01T00:00:00.000Z", latitude: 48.8566, longitude: 2.3522, natalBodies: rowsOf(natal.chart.planets), timezone: "Europe/Paris" };
  await assert.rejects(timing(calc, req, { pause }), /E:engine\.cancelled/);
  assert.equal(steps, 3);
  await assert.rejects(skyYear(calc, 2026, { pause: async () => Promise.reject(new Error("E:engine.cancelled")) }), /E:engine\.cancelled/);
  // The engine is still fine afterwards.
  const again = await timing(calc, { ...req, to: "2026-02-01T00:00:00.000Z" });
  assert.ok(again.hits.length > 0);
});

test("which era a date reads, as Swiss Ephemeris names its files", () => {
  assert.equal(eraOfYear(2399), 1800);
  assert.equal(eraOfYear(1800), 1800);
  assert.equal(eraOfYear(1799), 1200);
  assert.equal(eraOfYear(600), 600);
  assert.equal(eraOfYear(0), 0);
  assert.equal(eraOfYear(-1), -600);
  assert.equal(eraOfYear(-600), -600);
  assert.equal(eraOfYear(-601), -1200);
  assert.deepEqual(eraFiles(-600), ["seplm06.se1", "semom06.se1", "seasm06.se1"]);
  assert.deepEqual(filesForSpan(Date.UTC(1990, 5, 15), Date.UTC(1990, 5, 15)), eraFiles(1800));
  assert.deepEqual(filesForSpan(Date.UTC(1800, 0, 10), Date.UTC(1800, 0, 10)).sort(), [...eraFiles(1200), ...eraFiles(1800)].sort());
  assert.deepEqual(filesForSpan(Date.UTC(-1000, 0, 1), Date.UTC(-1000, 0, 1)), [], "before 600 BC: no file anywhere");
  // A device can fetch exactly the files the server mounts (ephe/, as a deploy ships it).
  const shipped = readdirSync(ROOT + "ephe").filter((name) => name.endsWith(".se1") || name === "sefstars.txt");
  assert.deepEqual([...ALL_FILES].sort(), shipped.sort());
});

// The "calculate" door (src/lib/engine/door.ts, steps 4 and 5) and the setting it follows (choice.ts).
const { makeDoor } = await import("../src/lib/engine/door.ts");
const choice = await import("../src/lib/engine/choice.ts");

/**
 * A door over recorded parts; `device` answers with `natal` (or fails with it, if it is an
 * Error), the reader answers the door's question with `answer`.
 */
function recordedDoor(where, { natal = { chart: "device" }, supported = true, zone = { zone: "Europe/Berlin", source: "coordinates" }, answer = "cancel", kept = null, sky = "device window" } = {}) {
  const calls = [];
  const door = makeDoor({
    where: () => where,
    server: {
      castChart: async (call) => (calls.push(["server.castChart", call.data]), { chart: "server" }),
      castTransits: async (call) => (calls.push(["server.castTransits", call.data]), "server sky"),
      castProgressions: async (call) => (calls.push(["server.castProgressions", call.data]), "server progressed"),
      castHumanDesign: async (call) => (calls.push(["server.castHumanDesign", call.data]), "server design"),
      skyWindow: async (t0, v) => (calls.push(["server.skyWindow", t0, v]), "server window"),
      skyYear: async (y, v) => (calls.push(["server.skyYear", y, v]), "server year"),
    },
    lookupZone: async (call) => (calls.push(["lookupZone", call.data]), zone),
    device: async () => ({
      supported: () => supported,
      engine: {
        natal: async (data, opts) => {
          calls.push(["device.natal", data.place]);
          const next = Array.isArray(natal) ? natal.shift() : typeof natal === "function" ? await natal(opts) : natal;
          if (next instanceof Error) throw next;
          return next;
        },
        transits: async (data) => {
          calls.push(["device.transits", data.timezone]);
          if (data.timezone === "Mars/Olympus") throw new Error("E:engine.zone|Mars/Olympus");
          return "device sky";
        },
        progressions: async (data) => (calls.push(["device.progressions", data.timezone]), "device progressed"),
        humanDesign: async () => (calls.push(["device.humanDesign"]), "device design"),
        skyWindow: async (t0) => {
          calls.push(["device.skyWindow", t0]);
          if (sky instanceof Error) throw sky;
          return sky;
        },
        skyYear: async (y) => (calls.push(["device.skyYear", y]), "device year"),
      },
    }),
    ask: async (err) => (calls.push(["ask", err.message]), answer),
    useServer: (how) => calls.push(["useServer", how]),
    ...(kept ? { kept } : {}),
  });
  return { door, calls };
}

const PARIS_DATA = { date: "1990-06-15", time: "12:00", latitude: 48.8566, longitude: 2.3522 };
/** The versions a sky file is asked for and kept under (window-cache.ts and year-cache.ts pass them). */
const WINDOW_V = { v: "3.2" };
const YEAR_V = { v: "3.1" };

/** A device's calculation that never answers: it fails as the worker's client does when its signal ends. */
function abortedBy(signal) {
  const error = () => Object.assign(new Error("Aborted"), { name: "AbortError" });
  if (signal.aborted) return Promise.reject(error());
  return new Promise((_, reject) => signal.addEventListener("abort", () => reject(error()), { once: true }));
}

/** A browser's plain storage, for the setting. */
function withStorage(values, run) {
  const store = new Map(Object.entries(values));
  globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  try {
    return run(store);
  } finally {
    delete globalThis.localStorage;
  }
}

test("where charts are calculated: on this device unless Ulune's server is chosen; \"once\" for this visit only", () => {
  withStorage({}, (store) => {
    assert.equal(choice.calculateOn(), "device", "the device by default");
    let told = 0;
    const stop = choice.onCalculateOn(() => (told += 1));
    choice.setCalculateOn("server");
    assert.equal(store.get(choice.CALCULATE_KEY), "server");
    assert.equal(choice.calculateOn(), "server");
    choice.setCalculateOn("device");
    assert.equal(choice.calculateOn(), "device");
    choice.calculateOnServerForNow();
    assert.equal(choice.calculateOn(), "server", "Use the server once: the server for now");
    assert.equal(choice.chosenCalculateOn(), "device", "the setting itself unchanged");
    assert.equal(store.get(choice.CALCULATE_KEY), "device");
    choice.setCalculateOn("device");
    assert.equal(choice.calculateOn(), "device", "a choice in Settings ends it");
    stop();
    assert.equal(told, 4);
  });
  assert.equal(choice.calculateOn(), "device", "no storage at all (a private window): the device");
});

test("the door on the server: today's requests, the zone left to the server", async () => {
  const { door, calls } = recordedDoor("server");
  assert.deepEqual(await door.castChart({ data: { ...PARIS_DATA, zone: "Europe/Paris" } }), { chart: "server" });
  await door.castTransits({ data: { at: "2026-01-01T00:00:00.000Z", latitude: 1, longitude: 2, natalCusps: [], natalBodies: [], timezone: "Europe/Paris" } });
  assert.equal(await door.skyWindow(1789948800000, WINDOW_V), "server window");
  assert.equal(await door.skyYear(2026, YEAR_V), "server year");
  assert.deepEqual(calls.map((c) => c[0]), ["server.castChart", "server.castTransits", "server.skyWindow", "server.skyYear"]);
  assert.deepEqual(calls.slice(2), [["server.skyWindow", 1789948800000, "3.2"], ["server.skyYear", 2026, "3.1"]], "asked for with their versions");
  assert.ok(!("timezone" in calls[1][1]), "the server's request carries no zone: it looks it up itself");
});

test("the door on the device: the search's zone, else the server asked for the coordinates' zone alone", async () => {
  let r = recordedDoor("device");
  await r.door.castChart({ data: { ...PARIS_DATA, zone: "Europe/Paris" } });
  assert.deepEqual(r.calls, [["device.natal", { zone: "Europe/Paris", source: "place" }]], "a searched place: nothing asked of the server");
  r = recordedDoor("device");
  await r.door.castChart({ data: { ...PARIS_DATA, houseSystem: "koch", tz: "lmt" } });
  assert.deepEqual(r.calls[0], ["lookupZone", { latitude: 48.8566, longitude: 2.3522 }], "typed coordinates: their zone alone is asked for");
  assert.deepEqual(r.calls[1], ["device.natal", { zone: "Europe/Berlin", source: "coordinates" }]);
  r = recordedDoor("device", { natal: [new Error("E:engine.zone|Mars/Olympus"), { chart: "device" }] });
  assert.deepEqual(await r.door.castChart({ data: { ...PARIS_DATA, zone: "Mars/Olympus" } }), { chart: "device" });
  assert.deepEqual(r.calls.map((c) => c[0]), ["device.natal", "lookupZone", "device.natal"], "a zone the table does not know: the server's, then again");
  // A zone chosen in the form (the Davison chart's universal time, a reader's own): the place's zone plays no part.
  r = recordedDoor("device");
  await r.door.castChart({ data: { ...PARIS_DATA, tz: "Etc/UTC" } });
  assert.deepEqual(r.calls, [["device.natal", { zone: "Etc/UTC", source: "place" }]], "a chosen zone: no lookup");
  r = recordedDoor("device");
  await r.door.castChart({ data: { ...PARIS_DATA, tz: "+05:30" } });
  assert.equal(r.calls[0][0], "lookupZone", "a fixed offset still names the place's zone in the chart");
  r = recordedDoor("device");
  await r.door.castProgressions({ data: { natalUtc: "1990-06-15T10:00:00.000Z", targetUtc: "2026-01-01T00:00:00.000Z", latitude: 1, longitude: 2, natalCusps: [], natalBodies: [], timezone: "Europe/Oslo" } });
  assert.deepEqual(r.calls, [["device.progressions", "Europe/Oslo"]]);
  // A chart whose zone the table does not know: the zone of its coordinates, as the server would.
  r = recordedDoor("device");
  assert.equal(await r.door.castTransits({ data: { at: "2026-01-01T00:00:00.000Z", latitude: 1, longitude: 2, natalCusps: [], natalBodies: [], timezone: "Mars/Olympus" } }), "device sky");
  assert.deepEqual(r.calls, [["device.transits", "Mars/Olympus"], ["lookupZone", { latitude: 1, longitude: 2 }], ["device.transits", "Europe/Berlin"]]);
});

test("the sky on the device: worked out once, then from the browser's copy", async () => {
  const shelf = new Map();
  const kept = { get: async (k) => shelf.get(k) ?? null, put: (k, v) => shelf.set(k, v) };
  const r = recordedDoor("device", { kept });
  assert.equal(await r.door.skyWindow(1789948800000, WINDOW_V), "device window");
  assert.equal(await r.door.skyWindow(1789948800000, WINDOW_V), "device window");
  assert.equal(await r.door.skyYear(2026, YEAR_V), "device year");
  assert.deepEqual(r.calls.map((c) => c[0]), ["device.skyWindow", "device.skyYear"], "the second time from the copy");
  assert.deepEqual([...shelf.keys()], ["/api/sky-window?t0=1789948800000&v=3.2", "/api/sky-year?y=2026&v=3.1"], "kept under the server's own addresses");
});

test("when the device can't, the door asks the reader and never turns to the server by itself", async () => {
  // Cancel: nothing sent, the calculation fails.
  let r = recordedDoor("device", { supported: false });
  await assert.rejects(r.door.castChart({ data: { ...PARIS_DATA, zone: "Europe/Paris" } }), /E:engine\.declined/);
  assert.deepEqual(r.calls, [["ask", "E:engine.unsupported"]]);
  // Once: this calculation on the server, the setting left for the visit.
  r = recordedDoor("device", { natal: new Error("E:engine.files|404"), answer: "once" });
  assert.deepEqual(await r.door.castChart({ data: { ...PARIS_DATA, zone: "Europe/Paris" } }), { chart: "server" });
  assert.deepEqual(r.calls.map((c) => c[0]), ["device.natal", "ask", "useServer", "server.castChart"]);
  assert.deepEqual(r.calls[2], ["useServer", "once"]);
  // Always: the setting changed.
  r = recordedDoor("device", { natal: new Error("E:engine.worker"), answer: "always" });
  await r.door.castChart({ data: { ...PARIS_DATA, zone: "Europe/Paris" } });
  assert.deepEqual(r.calls[2], ["useServer", "always"]);
  // A device that fell silent, a deadline that ran out: asked too; the server's call starts afresh.
  r = recordedDoor("device", { natal: new Error("E:engine.timeout"), answer: "once" });
  assert.deepEqual(await r.door.castChart({ data: { ...PARIS_DATA, zone: "Europe/Paris" } }), { chart: "server" });
  // As AbortSignal.timeout ends it (its own timer would not keep this test's process alive).
  const late = new AbortController();
  setTimeout(() => late.abort(new DOMException("The operation timed out.", "TimeoutError")), 5);
  const deadline = late.signal;
  r = recordedDoor("device", {
    answer: "once",
    natal: (opts) => abortedBy(opts.signal),
  });
  assert.deepEqual(await r.door.castChart({ data: { ...PARIS_DATA, zone: "Europe/Paris" }, signal: deadline }), { chart: "server" });
  assert.deepEqual(r.calls.map((c) => c[0]), ["device.natal", "ask", "useServer", "server.castChart"]);
  // A reader who left (an abort, not a deadline): nothing asked.
  const leave = new AbortController();
  r = recordedDoor("device", { natal: (opts) => abortedBy(opts.signal) });
  const left = r.door.castChart({ data: { ...PARIS_DATA, zone: "Europe/Paris" }, signal: leave.signal });
  leave.abort();
  await assert.rejects(left, /Aborted/);
  assert.ok(!r.calls.some((c) => c[0] === "ask"));
  // What the server would refuse too is no reason to ask.
  r = recordedDoor("device", { natal: new Error("E:moment.range") });
  await assert.rejects(r.door.castChart({ data: { ...PARIS_DATA, zone: "Europe/Paris" } }), /E:moment\.range/);
  assert.ok(!r.calls.some((c) => c[0] === "ask" || c[0].startsWith("server.")));
});

test("after Cancel, only a new chart asks again; the questions of one moment are one", async () => {
  const r = recordedDoor("device", { supported: false, answer: "cancel" });
  const both = await Promise.allSettled([r.door.skyWindow(1789948800000, WINDOW_V), r.door.skyYear(2026, YEAR_V), r.door.castHumanDesign({ data: { natalUtc: "1990-06-15T10:00:00.000Z" } })]);
  assert.ok(both.every((x) => x.status === "rejected" && /E:engine\.declined/.test(x.reason.message)));
  assert.equal(r.calls.filter((c) => c[0] === "ask").length, 1, "three calculations, one question");
  await assert.rejects(r.door.skyWindow(1792713600000, WINDOW_V), /E:engine\.declined/);
  assert.equal(r.calls.filter((c) => c[0] === "ask").length, 1, "the Calendar's next chunk asks nothing");
  await assert.rejects(r.door.castChart({ data: { ...PARIS_DATA, zone: "Europe/Paris" } }), /E:engine\.declined/);
  assert.equal(r.calls.filter((c) => c[0] === "ask").length, 2, "a new chart asks again");
  assert.ok(!r.calls.some((c) => c[0].startsWith("server.")));
});

test("offline, a device without its files says the connection is missing: the server could not answer either", async () => {
  const had = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "navigator", { value: { onLine: false }, configurable: true });
  try {
    const r = recordedDoor("device", { natal: new Error("E:engine.offline") });
    await assert.rejects(r.door.castChart({ data: { ...PARIS_DATA, zone: "Europe/Paris" } }), /E:net\.offline/);
    assert.ok(!r.calls.some((c) => c[0] === "ask"));
  } finally {
    if (had) Object.defineProperty(globalThis, "navigator", had);
    else delete globalThis.navigator;
  }
  // Online, files that can't be fetched (a filter, a captive portal): asked.
  const r = recordedDoor("device", { natal: new Error("E:engine.offline") });
  await assert.rejects(r.door.castChart({ data: { ...PARIS_DATA, zone: "Europe/Paris" } }), /E:engine\.declined/);
  assert.deepEqual(r.calls.map((c) => c[0]), ["device.natal", "ask"]);
});

test("through the door, the device's answers are the server's", async () => {
  const { calc } = deviceOf();
  const parts = (where) =>
    makeDoor({
      where: () => where,
      ask: async () => "cancel",
      useServer: () => {},
      server: {
        castChart: ({ data }) => serverCast(data),
        castTransits: ({ data }) => serverAnswer({ kind: "transits", data }),
        castProgressions: ({ data }) => serverAnswer({ kind: "progressions", data }),
        castHumanDesign: ({ data }) => serverAnswer({ kind: "humanDesign", data }),
        skyWindow: (t0) => serverAnswer({ kind: "skyWindow", t0 }),
        skyYear: (year) => serverAnswer({ kind: "skyYear", year }),
      },
      lookupZone: ({ data }) => zoneAt(data.latitude, data.longitude),
      device: async () => ({
        supported: () => true,
        engine: {
          natal: (data) => castNatal(calc, data),
          transits: (data) => castTransits(calc, data),
          progressions: (data) => castProgressions(calc, data),
          humanDesign: (data) => castHumanDesign(calc, data),
          skyWindow: (t0) => skyWindow(calc, t0),
          skyYear: (year) => skyYear(calc, year),
        },
      }),
    });
  const server = parts("server");
  const device = parts("device");
  for (const data of [{ ...PARIS_DATA, zone: "Europe/Paris" }, { date: "1962-07-01", time: "12:00", latitude: 59.9139, longitude: 10.7522 }]) {
    const a = await server.castChart({ data });
    assert.equal(JSON.stringify(await device.castChart({ data })), JSON.stringify(a));
    const sky = { at: "2026-08-27T12:00:00.000Z", latitude: a.chart.meta.latitude, longitude: a.chart.meta.longitude, natalCusps: a.chart.houses.map((h) => h.ecliptic), natalBodies: rowsOf(a.chart.planets), timezone: a.chart.meta.timezone };
    assert.equal(JSON.stringify(await device.castTransits({ data: sky })), JSON.stringify(await server.castTransits({ data: sky })));
    const hd = { natalUtc: a.chart.meta.utc };
    assert.equal(JSON.stringify(await device.castHumanDesign({ data: hd })), JSON.stringify(await server.castHumanDesign({ data: hd })));
  }
  // The Davison chart, cast in universal time chosen as its zone (lib/chart/davison.ts): no zone asked for, the server's to the last digit.
  const davison = { date: "1988-08-24", time: "17:35:12", latitude: 47.31, longitude: 6.79, tz: "Etc/UTC", houseSystem: "placidus", timeUnknown: false };
  const d = await device.castChart({ data: davison });
  assert.equal(JSON.stringify(d), JSON.stringify(await server.castChart({ data: davison })));
  assert.equal(d.chart.meta.timezone, "Etc/UTC");
  // The sky's chunks and year files.
  const t0 = Date.UTC(2000, 0, 1) + 300 * 32 * 864e5;
  assert.equal(JSON.stringify(await device.skyWindow(t0, WINDOW_V)), JSON.stringify(await server.skyWindow(t0, WINDOW_V)));
});

test("the download is measured against the files' own sizes, and heard as it arrives", async () => {
  // eras.ts FILE_BYTES: each shipped file's size, and the engine's.
  const { FILE_BYTES } = await import("../src/lib/engine/eras.ts");
  const { statSync } = await import("node:fs");
  for (const name of ALL_FILES) assert.equal(FILE_BYTES[name], statSync(ROOT + "ephe/" + name).size, name);
  assert.equal(FILE_BYTES["swisseph.wasm"], statSync(ROOT + "node_modules/sweph-wasm/dist/wasm/swisseph.wasm").size);
  // The first start: every byte heard, against the startup files' and the engine's sizes; then done.
  const heard = [];
  const net = site();
  const caches = memoryCaches();
  const files = browserFiles(URLS, { fetch: net.fetch, caches, base: ORIGIN, onProgress: (p) => heard.push(p) });
  await new Calculator(files).ready();
  const total = [...STARTUP_FILES, "swisseph.wasm"].reduce((n, f) => n + FILE_BYTES[f], 0);
  const last = heard.at(-1);
  assert.ok(heard.length > 3, `${heard.length} reports`);
  assert.ok(last.done && last.loaded === total && last.total === total, JSON.stringify(last));
  assert.ok(heard.every((p, i) => i === 0 || p.loaded >= heard[i - 1].loaded || heard[i - 1].done), "it only grows");
  // The next start reads the browser's copy: nothing to hear.
  const again = [];
  await new Calculator(browserFiles(URLS, { fetch: site().fetch, caches, base: ORIGIN, onProgress: (p) => again.push(p) })).ready();
  assert.deepEqual(again, []);
});
