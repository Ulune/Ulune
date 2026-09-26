import assert from "node:assert/strict";
import { test } from "node:test";
import { foldPlaceQuery, gazetteerHits, mapOpenMeteoHits, rankPlaceHits } from "../src/lib/chart/geocode.ts";

const PAR_HITS = [
  { name: "Paris", latitude: 48.85341, longitude: 2.3488, country: "France", admin1: "Île-de-France Region", timezone: "Europe/Paris", population: 2_138_551, feature_code: "PPLC" },
  { name: "Belém", latitude: -1.4558, longitude: -48.5044, country: "Brazil", admin1: "Pará", timezone: "America/Belem", population: 1_499_641, feature_code: "PPLA" },
  { name: "Par", latitude: 50.35, longitude: -4.7, country: "United Kingdom", admin1: "England", timezone: "Europe/London", population: 9462, feature_code: "PPL" },
  { name: "Par", latitude: 38.08, longitude: 44.97, country: "Iran", admin1: "West Azerbaijan Province", feature_code: "PPL" },
  { name: "Par", latitude: 38.25, longitude: 43.75, country: "Türkiye", admin1: "Van", feature_code: "PPL" },
  { name: "Paraná", latitude: -31.73197, longitude: -60.5238, country: "Argentina", admin1: "Entre Rios", population: 247_139, feature_code: "PPLA" },
  { name: "Par", latitude: 39.15, longitude: 46.02, country: "Armenia", admin1: "Syunik", feature_code: "MT" },
  { name: "Parakou", latitude: 9.337, longitude: 2.63, country: "Benin", admin1: "Borgou Department", population: 255_478, feature_code: "PPLA" },
  { name: "Parma", latitude: 44.8015, longitude: 10.328, country: "Italy", admin1: "Emilia-Romagna", population: 198_292, feature_code: "PPLA2" },
];

test("maps Open-Meteo hits into pickable place labels", () => {
  const hits = mapOpenMeteoHits([
    {
      name: "Paris",
      latitude: 48.85341,
      longitude: 2.3488,
      country: "France",
      admin1: "Île-de-France Region",
      timezone: "Europe/Paris",
    },
    {
      name: "Lyon",
      latitude: 45.75,
      longitude: 4.85,
      country: "France",
      timezone: "Europe/Paris",
    },
  ]);
  assert.equal(hits[0].label, "Paris, Île-de-France Region, France");
  assert.equal(hits[1].label, "Lyon, France");
  assert.equal(hits.length, 2);
});

test("empty Open-Meteo payload maps to no suggestions", () => {
  assert.deepEqual(mapOpenMeteoHits(undefined), []);
  assert.deepEqual(mapOpenMeteoHits([]), []);
});

test("Par ranks Paris above Pará / Par villages", () => {
  const hits = rankPlaceHits(PAR_HITS, "Par");
  assert.ok(hits[0].label.startsWith("Paris"), hits[0].label);
  assert.ok(!hits[0].label.includes("Belém"), hits.map((h) => h.label).join(" | "));
  assert.ok(!hits.slice(0, 3).some((h) => /^Par,/.test(h.label)), hits.map((h) => h.label).join(" | "));
});

test("Par ranks Paris above the country Paraguay", () => {
  const hits = rankPlaceHits(
    [
      ...PAR_HITS,
      { name: "Paraguay", latitude: -23.4, longitude: -58.4, country: "Paraguay", population: 6_956_071, feature_code: "PCLI" },
      { name: "Paramaribo", latitude: 5.83, longitude: -55.17, country: "Suriname", admin1: "Paramaribo District", population: 223_757, feature_code: "PPLC" },
    ],
    "Par",
  );
  assert.ok(hits[0].label.startsWith("Paris"), hits.map((h) => h.label).join(" | "));
  assert.ok(!hits[0].label.includes("Paraguay"), hits[0].label);
});

test("Ly still finds Lyon from the gazetteer when the API only has a village", () => {
  const hits = rankPlaceHits(
    [{ name: "Ly", latitude: 56.65, longitude: 12.85, country: "Sweden", admin1: "Halland County", feature_code: "PPL" }],
    "Ly",
  );
  assert.ok(hits[0].label.startsWith("Lyon"), hits[0].label);
});

test("Pa finds Paris instead of villages named Pa", () => {
  const hits = rankPlaceHits(
    [
      { name: "Pa", latitude: 12.46, longitude: -3.44, country: "Burkina Faso", population: 15170, feature_code: "PPL" },
      { name: "Pa", latitude: 5.47, longitude: 10.73, country: "Cameroon", feature_code: "PPL" },
    ],
    "Pa",
  );
  assert.ok(hits[0].label.startsWith("Paris"), hits[0].label);
});

test("foldPlaceQuery ignores accents", () => {
  assert.equal(foldPlaceQuery("Pará"), "para");
  assert.equal(foldPlaceQuery("Pār"), "par");
});

test("without the geocoder, the built-in cities still answer, the country checked", () => {
  assert.deepEqual(gazetteerHits("Paris, France").map((h) => h.label), ["Paris, Île-de-France, France"]);
  assert.deepEqual(gazetteerHits("oslo").map((h) => h.label), ["Oslo, Norway"]);
  assert.deepEqual(gazetteerHits("Paris, Texas"), []);
  assert.deepEqual(gazetteerHits("Springfield"), []);
  assert.deepEqual(gazetteerHits("P"), []);
});
