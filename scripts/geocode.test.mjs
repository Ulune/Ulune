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

// ---- The geocoder's real answers (Open-Meteo, 5 Oct 2026), abridged to the fields Ulune keeps ----
import { geocodePlace, parsePlaceQuery, PLACE_CACHE, UPSTREAM_CACHE } from "../src/lib/chart/geocode.ts";

const P = (name, admin1, admin2, country, code, feature_code, population, latitude, longitude, timezone) => ({
  name, admin1, admin2, country, country_code: code, feature_code, population: population ?? undefined, latitude, longitude, timezone,
});
const PARIS_REAL = [
  P("Paris", "Île-de-France", "Département de Paris", "France", "FR", "PPLC", 2138551, 48.85341, 2.3488, "Europe/Paris"),
  P("Les Paris", "Rhône-Alpes", "Savoie", "France", "FR", "PPL", undefined, 45.63972, 5.73742, "Europe/Paris"),
  P("Paris 15 Vaugirard", "Île-de-France", "Département de Paris", "France", "FR", "PPL", 229713, 48.8412, 2.3003, "Europe/Paris"),
  P("Paris 13 Gobelins", "Île-de-France", "Département de Paris", "France", "FR", "PPL", 181271, 48.8322, 2.3561, "Europe/Paris"),
  P("Paris 17", "Île-de-France", "Département de Paris", "France", "FR", "PPL", 159212, 48.8835, 2.3219, "Europe/Paris"),
  P("Paris 20 Ménilmontant", "Île-de-France", "Département de Paris", "France", "FR", "PPL", 185140, 48.8646, 2.3984, "Europe/Paris"),
  P("Paris", "Texas", "Lamar", "United States", "US", "PPLA2", 24912, 33.66094, -95.55551, "America/Chicago"),
  P("Paris", "Tennessee", "Henry", "United States", "US", "PPLA2", 10156, 36.30200, -88.32671, "America/Chicago"),
];
const TEHERAN = [
  P("Téhéran", "Téhéran", undefined, "Iran", "IR", "PPLC", 7153309, 35.69439, 51.42151, "Asia/Tehran"),
  P("Teheran", "Illinois", "Mason", "États-Unis", "US", "PPL", undefined, 40.24, -89.97, "America/Chicago"),
  P("Teherán", "Provincia de Pinar del Río", undefined, "Cuba", "CU", "PPLL", undefined, 22.4, -83.7, "America/Havana"),
];
const SAINT_ETIENNE = [
  P("Saint-Étienne", "Rhône-Alpes", "Loire", "France", "FR", "PPLA2", 176280, 45.43389, 4.39, "Europe/Paris"),
  P("Saint-Étienne-en-Dévoluy", "Région PACA", "Hautes-Alpes", "France", "FR", "PPLA4", 537, 44.69362, 5.94063, "Europe/Paris"),
  P("Saint-Étienne-du-Rouvray", "Normandie", "Seine-Maritime", "France", "FR", "PPL", 28953, 49.37794, 1.10467, "Europe/Paris"),
  P("Saint-Étienne-de-Montluc", "Pays de la Loire", "Loire-Atlantique", "France", "FR", "PPL", 6809, 47.27622, -1.78013, "Europe/Paris"),
];
const SPRINGFIELD = [
  P("Springfield", "Missouri", "Greene", "United States", "US", "PPLA2", 170188, 37.21533, -93.29824, "America/Chicago"),
  P("Springfield", "Illinois", "Sangamon", "United States", "US", "PPLA", 114394, 39.80172, -89.64371, "America/Chicago"),
  P("Springfield", "Massachusetts", "Hampden", "United States", "US", "PPL", 154341, 42.10148, -72.58981, "America/New_York"),
  P("Palmyra", "Missouri", "Marion", "United States", "US", "PPLA2", 3616, 39.79421, -91.52321, "America/Chicago"),
  P("Jackson", "Minnesota", "Jackson", "United States", "US", "PPLA2", 3234, 43.62079, -94.9886, "America/Chicago"),
  P("Springfield", "Kentucky", "Washington", "United States", "US", "PPLA2", 3055, 37.68534, -85.22218, "America/New_York"),
];
const LONDRES = [
  P("Londres", "Angleterre", "Grand Londres", "Royaume-Uni", "GB", "PPLC", 8961989, 51.50853, -0.12574, "Europe/London"),
  P("Londres", "Catamarca", "Departamento de Belén", "Argentine", "AR", "PPL", 2627, -27.71257, -67.13551, "America/Argentina/Catamarca"),
  P("Londres", "Jalisco", "Tepatitlán de Morelos", "Mexique", "MX", "PPL", 41, 20.965, -102.66056, "America/Mexico_City"),
];
const labels = (hits) => hits.map((h) => h.label);

test("Paris: the city before its districts and the other Parises (an exact name beats a prefix)", () => {
  const hits = rankPlaceHits(PARIS_REAL, "Paris", "fr");
  assert.equal(hits[0].label, "Paris, Île-de-France, France");
  assert.equal(hits[1].label.startsWith("Paris, "), true, labels(hits).join(" | "));
  const district = hits.findIndex((h) => /^Paris 1[357]/.test(h.label));
  assert.ok(district > 2, labels(hits).join(" | "));
  // Two Parises of that name: not for the form to choose.
  assert.ok(!hits.some((h) => h.sure));
});

test('"Paris, France" names one place; "Paris, Texas" another', () => {
  const fr = rankPlaceHits(PARIS_REAL, "Paris, France", "fr");
  assert.equal(fr[0].label, "Paris, Île-de-France, France");
  assert.equal(fr[0].sure, true);
  assert.ok(labels(fr).indexOf("Paris, Texas, United States") > 0);
  const tx = rankPlaceHits(PARIS_REAL, "paris, texas", "en");
  assert.equal(tx[0].label, "Paris, Texas, United States");
  assert.equal(tx[0].sure, true);
  // A region as the list wrote it, a country in either language.
  assert.equal(rankPlaceHits(PARIS_REAL, "Paris, Île-de-France, France", "fr")[0].sure, true);
  assert.equal(rankPlaceHits(PARIS_REAL, "Paris, USA", "en")[0].label.startsWith("Paris, T"), true);
  assert.equal(rankPlaceHits(PARIS_REAL, "Paris, Etats-Unis", "fr")[0].label.startsWith("Paris, T"), true);
  // What is typed after the name matches nothing: the places of the name are still shown.
  assert.equal(rankPlaceHits(PARIS_REAL, "Paris, Atlantis", "en")[0].label, "Paris, Île-de-France, France");
});

test("Téhéran, with its trailing comma, is Tehran, Iran — first, whatever follows", () => {
  for (const typed of ["Téhéran,", "téhéran", "Teheran", "Téhéran, Iran", "Téhéran, Téhéran, Iran"]) {
    const hits = rankPlaceHits(TEHERAN, typed, "fr");
    assert.equal(hits[0].label, "Téhéran, Iran", `${typed}: ${labels(hits).join(" | ")}`);
  }
  assert.equal(rankPlaceHits(TEHERAN, "Téhéran, Iran", "fr")[0].sure, true);
  assert.equal(rankPlaceHits(TEHERAN, "Téhéran, Téhéran, Iran", "fr")[0].sure, true);
  assert.match(rankPlaceHits(TEHERAN, "Téhéran", "fr")[0].detail ?? "", /7[.,]2/);
});

test("a name written Saint Etienne, St-Etienne or Saint-Étienne is the same name", () => {
  for (const typed of ["Saint-Étienne", "saint etienne", "St Etienne", "St-Étienne"]) {
    assert.equal(rankPlaceHits(SAINT_ETIENNE, typed, "fr")[0].label, "Saint-Étienne, Rhône-Alpes, France", typed);
  }
  // Still being typed: the city before its villages.
  assert.equal(rankPlaceHits(SAINT_ETIENNE, "Saint-Etien", "fr")[0].label, "Saint-Étienne, Rhône-Alpes, France");
});

test("Springfield: the Springfields first, the geocoder's strays last, each told apart", () => {
  const hits = rankPlaceHits(SPRINGFIELD, "Springfield", "en");
  assert.deepEqual(labels(hits).slice(0, 4).map((l) => l.split(",")[0]), ["Springfield", "Springfield", "Springfield", "Springfield"]);
  assert.ok(/^(Palmyra|Jackson)/.test(hits[hits.length - 1].label));
  // (The most lived-in first: Missouri's 170,000, then Massachusetts, then Illinois.)
  assert.equal(hits[0].label, "Springfield, Missouri, United States");
  assert.ok(!hits.some((h) => h.sure));
  const il = rankPlaceHits(SPRINGFIELD, "Springfield, Illinois", "en");
  assert.equal(il[0].label, "Springfield, Illinois, United States");
  assert.equal(il[0].sure, true);
  assert.equal(new Set(labels(hits)).size, hits.length);
});

test("Londres, UK: a country in short form, in the language of the page or not", () => {
  const hits = rankPlaceHits(LONDRES, "Londres, UK", "fr");
  assert.equal(hits[0].label, "Londres, Angleterre, Royaume-Uni");
  assert.equal(hits[0].sure, true);
  assert.equal(rankPlaceHits(LONDRES, "Londres, Royaume-Uni", "fr")[0].sure, true);
  assert.equal(rankPlaceHits(LONDRES, "Londres, Argentina", "fr")[0].country, "Argentine");
});

test("one place of the name in the world, or a slip of the finger", () => {
  const MARCIAC = [P("Marciac", "Occitanie", "Gers", "France", "FR", "PPL", 1258, 43.5258, 0.1672, "Europe/Paris")];
  const alone = rankPlaceHits(MARCIAC, "Marciac", "fr");
  assert.equal(alone[0].sure, true);
  assert.equal(rankPlaceHits(MARCIAC, "Marciac, Gers", "fr")[0].sure, true);
  assert.equal(rankPlaceHits(MARCIAC, "Marciak", "fr")[0].label, "Marciac, Occitanie, France");
  assert.equal(rankPlaceHits(MARCIAC, "Marciak", "fr")[0].sure, undefined);
  assert.deepEqual(rankPlaceHits(MARCIAC, "Marciac, Norway", "fr")[0].sure, undefined);
});

test("a district is found when it is asked for", () => {
  assert.equal(rankPlaceHits(PARIS_REAL, "Paris 15", "fr")[0].label.startsWith("Paris 15 Vaugirard"), true);
});

test("the typed words are read as a name and what narrows it", () => {
  assert.deepEqual(parsePlaceQuery("Téhéran,"), { head: "Téhéran", qualifiers: [], postcodes: [] });
  assert.deepEqual(parsePlaceQuery("Paris, Île-de-France, France"), { head: "Paris", qualifiers: ["Île-de-France", "France"], postcodes: [] });
  assert.deepEqual(parsePlaceQuery("31200 Toulouse"), { head: "Toulouse", qualifiers: [], postcodes: ["31200"] });
  assert.deepEqual(parsePlaceQuery("Toulouse, 31200, France"), { head: "Toulouse", qualifiers: ["France"], postcodes: ["31200"] });
  assert.deepEqual(parsePlaceQuery("Springfield (Illinois)"), { head: "Springfield", qualifiers: ["Illinois"], postcodes: [] });
  assert.deepEqual(parsePlaceQuery("  Paris ,  , France  "), { head: "Paris", qualifiers: ["France"], postcodes: [] });
  assert.deepEqual(parsePlaceQuery("75015"), { head: "75015", qualifiers: [], postcodes: [] });
});

/** The geocoder, answered here by the name asked. */
function geocoder(answers) {
  const real = globalThis.fetch;
  const asked = [];
  globalThis.fetch = async (url) => {
    const name = new URL(String(url)).searchParams.get("name");
    asked.push(name);
    const rows = answers[name];
    return new Response(JSON.stringify(rows ? { results: rows } : { generationtime_ms: 0.2 }), { status: 200 });
  };
  return { asked, restore: () => (globalThis.fetch = real) };
}

test("St Etienne: the geocoder knows nothing of it, so the hyphenated name is asked too", async () => {
  PLACE_CACHE.clear();
  UPSTREAM_CACHE.clear();
  const geo = geocoder({ "Saint-Etienne": SAINT_ETIENNE });
  try {
    const hits = await geocodePlace("St Etienne", "fr");
    assert.equal(hits[0].label, "Saint-Étienne, Rhône-Alpes, France");
    assert.deepEqual(geo.asked, ["St Etienne", "Saint-Etienne"]);
  } finally {
    geo.restore();
    PLACE_CACHE.clear();
    UPSTREAM_CACHE.clear();
  }
});

test("Saint Etienne: a village answers, the city is still found", async () => {
  PLACE_CACHE.clear();
  UPSTREAM_CACHE.clear();
  const village = [P("Saint-Étienne-de-Valoux", "Rhône-Alpes", "Ardèche", "France", "FR", "PPL", 211, 45.3, 4.8, "Europe/Paris")];
  const geo = geocoder({ "Saint Etienne": village, "Saint-Etienne": SAINT_ETIENNE });
  try {
    const hits = await geocodePlace("Saint Etienne", "fr");
    assert.equal(hits[0].label, "Saint-Étienne, Rhône-Alpes, France");
  } finally {
    geo.restore();
    PLACE_CACHE.clear();
    UPSTREAM_CACHE.clear();
  }
});

test("Boston USA and Paris 15: the country, the number, read off the end", async () => {
  PLACE_CACHE.clear();
  UPSTREAM_CACHE.clear();
  const BOSTON = [
    P("Boston", "Massachusetts", "Suffolk", "United States", "US", "PPLA", 675647, 42.35843, -71.05977, "America/New_York"),
    P("Boston", "England", "Lincolnshire", "United Kingdom", "GB", "PPL", 41000, 52.97, -0.02, "Europe/London"),
  ];
  const geo = geocoder({ Boston: BOSTON, Paris: PARIS_REAL });
  try {
    const us = await geocodePlace("Boston USA", "en");
    assert.equal(us[0].label, "Boston, Massachusetts, United States");
    assert.equal(us[0].sure, true);
    const arr = await geocodePlace("Paris 15", "fr");
    assert.equal(arr[0].label.startsWith("Paris 15 Vaugirard"), true);
  } finally {
    geo.restore();
    PLACE_CACHE.clear();
    UPSTREAM_CACHE.clear();
  }
});

test("the built-in cities are never 'sure': they stand in only when the geocoder is silent", () => {
  assert.equal(rankPlaceHits([], "Paris", "en")[0].label.startsWith("Paris"), true);
  assert.ok(!rankPlaceHits([], "Paris", "en").some((h) => h.sure));
  assert.equal(gazetteerHits("Par")[0].label.startsWith("Paris"), true);
  assert.equal(gazetteerHits("Teh")[0].label, "Tehran, Tehran Province, Iran");
});
