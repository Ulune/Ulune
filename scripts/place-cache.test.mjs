// The place search's memory (src/lib/chart/recent-cache.ts, geocode.ts):
// Open-Meteo's answers kept a day, the least recently used going first,
// failures never kept.
import assert from "node:assert/strict";
import { test } from "node:test";
import { RecentCache } from "../src/lib/chart/recent-cache.ts";
import { PLACE_CACHE, UPSTREAM_CACHE, geocodePlace, placeCacheKey } from "../src/lib/chart/geocode.ts";

test("an entry lasts its time, then is gone", () => {
  let now = 0;
  const cache = new RecentCache(10, 1000, () => now);
  cache.set("a", 1);
  now = 1000;
  assert.equal(cache.get("a"), 1);
  now = 1001;
  assert.equal(cache.get("a"), undefined);
  assert.equal(cache.size, 0);
});

test("when full, the least recently used goes first", () => {
  const cache = new RecentCache(2, 60_000);
  cache.set("a", 1);
  cache.set("b", 2);
  cache.get("a"); // a is now the most recent
  cache.set("c", 3);
  assert.equal(cache.get("b"), undefined);
  assert.equal(cache.get("a"), 1);
  assert.equal(cache.get("c"), 3);
  assert.equal(cache.size, 2);
});

test("the key is the language and the words, without case or extra spaces", () => {
  assert.equal(placeCacheKey("  Saint   Malo ", "fr"), "fr:saint malo");
  assert.equal(placeCacheKey("PARIS", "en"), placeCacheKey("paris", "en"));
  assert.notEqual(placeCacheKey("Paris", "en"), placeCacheKey("Paris", "fr"));
});

/** Open-Meteo, answered here; counts the calls. */
function fakeGeocoder(answer) {
  const real = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return answer();
  };
  return { calls, restore: () => (globalThis.fetch = real) };
}

const PARIS = {
  results: [
    { name: "Paris", admin1: "Île-de-France", country: "France", latitude: 48.85341, longitude: 2.3488, timezone: "Europe/Paris", population: 2138551, feature_code: "PPLC" },
  ],
};

test("a repeated search is answered from memory", async () => {
  PLACE_CACHE.clear();
  UPSTREAM_CACHE.clear();
  const geo = fakeGeocoder(() => new Response(JSON.stringify(PARIS), { status: 200 }));
  try {
    const first = await geocodePlace("Paris", "en");
    const again = await geocodePlace("  paris ", "en");
    assert.equal(geo.calls.length, 1);
    assert.deepEqual(again, first);
    assert.equal(first[0].timezone, "Europe/Paris");
    // Another language is another answer (Open-Meteo names places in it).
    await geocodePlace("Paris", "fr");
    assert.equal(geo.calls.length, 2);
  } finally {
    geo.restore();
    PLACE_CACHE.clear();
    UPSTREAM_CACHE.clear();
  }
});

test("a failed search is not kept: the next one asks again", async () => {
  PLACE_CACHE.clear();
  UPSTREAM_CACHE.clear();
  const geo = fakeGeocoder(() => new Response("busy", { status: 503 }));
  try {
    // Open-Meteo is down: the major cities still answer, but only for now.
    const local = await geocodePlace("Paris", "en");
    assert.ok(local.length > 0);
    await geocodePlace("Paris", "en");
    // Each search tried twice (a busy geocoder often answers the second time).
    assert.equal(geo.calls.length, 4);
    assert.equal(PLACE_CACHE.size, 0);
    assert.equal(UPSTREAM_CACHE.size, 0);
  } finally {
    geo.restore();
    PLACE_CACHE.clear();
    UPSTREAM_CACHE.clear();
  }
});

test("a busy geocoder is asked again once, and the second answer is used", async () => {
  PLACE_CACHE.clear();
  UPSTREAM_CACHE.clear();
  let n = 0;
  const geo = fakeGeocoder(() => (++n === 1 ? new Response("busy", { status: 503 }) : new Response(JSON.stringify(PARIS), { status: 200 })));
  try {
    const hits = await geocodePlace("Paris", "en");
    assert.equal(geo.calls.length, 2);
    assert.equal(hits[0].label, "Paris, Île-de-France, France");
    assert.equal(PLACE_CACHE.size, 1);
  } finally {
    geo.restore();
    PLACE_CACHE.clear();
    UPSTREAM_CACHE.clear();
  }
});

test("Paris and Paris, France share one call to the geocoder", async () => {
  PLACE_CACHE.clear();
  UPSTREAM_CACHE.clear();
  const geo = fakeGeocoder(() => new Response(JSON.stringify(PARIS), { status: 200 }));
  try {
    await geocodePlace("Paris", "en");
    const hits = await geocodePlace("Paris, France", "en");
    assert.equal(geo.calls.length, 1);
    assert.equal(hits[0].sure, true);
  } finally {
    geo.restore();
    PLACE_CACHE.clear();
    UPSTREAM_CACHE.clear();
  }
});
