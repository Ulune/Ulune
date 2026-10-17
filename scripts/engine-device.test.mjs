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

// The "calculate" door (src/lib/engine/door.ts, step 4 prepared): the server's until step 5's setting.
const { calculateOn, makeDoor, DEV_CALCULATE_KEY } = await import("../src/lib/engine/door.ts");

/** A door over recorded parts; `device` answers with `natal` (or fails with it, if it is an Error). */
function recordedDoor(where, { natal = { chart: "device" }, supported = true, zone = { zone: "Europe/Berlin", source: "coordinates" } } = {}) {
  const calls = [];
  const door = makeDoor({
    where: () => where,
    server: {
      castChart: async (call) => (calls.push(["server.castChart", call.data]), { chart: "server" }),
      castTransits: async (call) => (calls.push(["server.castTransits", call.data]), "server sky"),
      castProgressions: async (call) => (calls.push(["server.castProgressions", call.data]), "server progressed"),
      castHumanDesign: async (call) => (calls.push(["server.castHumanDesign", call.data]), "server design"),
    },
    lookupZone: async (call) => (calls.push(["lookupZone", call.data]), zone),
    device: async () => ({
      supported: () => supported,
      engine: {
        natal: async (data) => {
          calls.push(["device.natal", data.place]);
          const next = Array.isArray(natal) ? natal.shift() : natal;
          if (next instanceof Error) throw next;
          return next;
        },
        transits: async (data) => (calls.push(["device.transits", data.timezone]), "device sky"),
        progressions: async (data) => (calls.push(["device.progressions", data.timezone]), "device progressed"),
        humanDesign: async () => (calls.push(["device.humanDesign"]), "device design"),
      },
    }),
  });
  return { door, calls };
}

const PARIS_DATA = { date: "1990-06-15", time: "12:00", latitude: 48.8566, longitude: 2.3522 };

test("the door: Ulune's server until the setting exists; the development flag only in development", async () => {
  globalThis.localStorage = { getItem: (k) => (k === DEV_CALCULATE_KEY ? "device" : null) };
  try {
    assert.equal(calculateOn(), "server", "a build that is not development never reads the flag");
  } finally {
    delete globalThis.localStorage;
  }
  const { door, calls } = recordedDoor("server");
  assert.deepEqual(await door.castChart({ data: { ...PARIS_DATA, zone: "Europe/Paris" } }), { chart: "server" });
  await door.castTransits({ data: { at: "2026-01-01T00:00:00.000Z", latitude: 1, longitude: 2, natalCusps: [], natalBodies: [], timezone: "Europe/Paris" } });
  assert.deepEqual(calls.map((c) => c[0]), ["server.castChart", "server.castTransits"]);
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
  r = recordedDoor("device");
  await r.door.castProgressions({ data: { natalUtc: "1990-06-15T10:00:00.000Z", targetUtc: "2026-01-01T00:00:00.000Z", latitude: 1, longitude: 2, natalCusps: [], natalBodies: [], timezone: "Europe/Oslo" } });
  assert.deepEqual(r.calls, [["device.progressions", "Europe/Oslo"]]);
});

test("the door never turns to the server by itself when the device cannot calculate", async () => {
  let r = recordedDoor("device", { supported: false });
  await assert.rejects(r.door.castChart({ data: { ...PARIS_DATA, zone: "Europe/Paris" } }), /E:engine\.unsupported/);
  r = recordedDoor("device", { natal: new Error("E:engine.offline") });
  await assert.rejects(r.door.castChart({ data: { ...PARIS_DATA, zone: "Europe/Paris" } }), /E:engine\.offline/);
  await assert.rejects(r.door.castChart({ data: PARIS_DATA }), /E:engine\.offline/);
  assert.ok(!r.calls.some((c) => c[0].startsWith("server.")), "no server call");
});

test("through the door, the device's answers are the server's", async () => {
  const { calc } = deviceOf();
  const parts = (where) =>
    makeDoor({
      where: () => where,
      server: {
        castChart: ({ data }) => serverCast(data),
        castTransits: ({ data }) => serverAnswer({ kind: "transits", data }),
        castProgressions: ({ data }) => serverAnswer({ kind: "progressions", data }),
        castHumanDesign: ({ data }) => serverAnswer({ kind: "humanDesign", data }),
      },
      lookupZone: ({ data }) => zoneAt(data.latitude, data.longitude),
      device: async () => ({
        supported: () => true,
        engine: {
          natal: (data) => castNatal(calc, data),
          transits: (data) => castTransits(calc, data),
          progressions: (data) => castProgressions(calc, data),
          humanDesign: (data) => castHumanDesign(calc, data),
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
});
