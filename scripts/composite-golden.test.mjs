import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateNatal } from "../src/lib/chart/calculate.server.ts";
import { houseFromCusps, minutesApart, midpointLon, wrap360 } from "../src/lib/chart/anatomy.ts";
import { ANGLE_ASPECT_ORBS, STATION_SPEED, aspectOrb } from "../src/lib/chart/constants.ts";
import { HOUSE_SYSTEM_IDS } from "../src/lib/chart/types.ts";
import {
  COMPOSITE_HOUSE_METHOD,
  buildComposite,
  compositeMajors,
} from "../src/lib/chart/composite.ts";
import { helloCells, NATAL_HELLO } from "../src/lib/i18n/natal-hello.ts";
import { compositeLine, compositeTitle } from "../src/lib/i18n/mode-hello.ts";
import { compositeReadingEmpty } from "../src/lib/i18n/composite-ui.ts";

const PARIS = {
  latitude: 48.8566,
  longitude: 2.3522,
  placeLabel: "Paris, France",
  houseSystem: "placidus",
};

const DAY_LON = {
  sun: 84.149454,
  moon: 345.636491,
  northnode: 308.122193,
  lilith: 259.045702,
  ascendant: 182.465211,
  midheaven: 93.105583,
};

const NOON_LON = {
  sun: 84.049963,
  moon: 344.245798,
  northnode: 308.120741,
  lilith: 258.928423,
  ascendant: 155.145263,
  midheaven: 58.038466,
};

const PERSON_A = { ...PARIS, name: "Person A", date: "1990-06-15", time: "14:30" };
const PERSON_B = { ...PARIS, name: "Person B", date: "1990-06-15", time: "12:00" };

/**
 * Every longitude of the 14:30 / 12:00 Paris composite. Each one is the
 * circular midpoint of two natal longitudes that `natal-golden` already freezes
 * against Swiss, so these are Swiss-derived and checked at 1′.
 */
const COMPOSITE_LON = {
  sun: 84.099709,
  moon: 344.941144,
  mercury: 65.637163,
  venus: 48.740850,
  mars: 11.018841,
  jupiter: 105.882718,
  saturn: 294.033765,
  uranus: 278.166428,
  neptune: 283.717859,
  pluto: 225.402134,
  chiron: 106.057357,
  northnode: 308.121467,
  southnode: 128.121467,
  lilith: 258.987062,
  vertex: 336.048758,
  antivertex: 156.048758,
  fortune: 69.646672,
  spirit: 267.963801,
  ceres: 117.864028,
  juno: 220.329539,
  vesta: 34.794664,
  eris: 17.528147,
  sedna: 41.308744,
  ascendant: 168.805237,
  midheaven: 75.572025,
  descendant: 348.805237,
  ic: 255.572025,
};

/**
 * The Placidus composite ring. Cusps 1/4/7/10 are the midpoint ASC/IC/DSC/MC
 * and are independently checkable; cusps 2/3, 5/6, 8/9 and 11/12 sit at the
 * mean of where the two natal charts put them inside that quadrant.
 */
const COMPOSITE_CUSPS = [
  168.805237, 191.841735, 220.753782, 255.572025, 291.776365, 323.220457,
  348.805237, 11.841735, 40.753782, 75.572025, 111.776365, 143.220457,
];

/** Spans strictly positive, summing to exactly one turn, every degree in exactly one house. */
function assertRing(cusps, label) {
  assert.equal(cusps.length, 12, `${label}: ${cusps.length} cusps`);
  let turn = 0;
  for (let i = 0; i < 12; i += 1) {
    const span = wrap360(cusps[(i + 1) % 12] - cusps[i]);
    assert.ok(span > 0, `${label}: cusp ${i + 1}→${((i + 1) % 12) + 1} span ${span}`);
    assert.ok(span < 180, `${label}: cusp ${i + 1} span ${span} swallows half the wheel`);
    turn += span;
  }
  assert.ok(
    Math.abs(turn - 360) < 1e-9,
    `${label}: spans sum to ${turn}, so the ring winds more than once`,
  );
  for (let deg = 0; deg < 360; deg += 0.25) {
    let hits = 0;
    for (let i = 0; i < 12; i += 1) {
      const span = wrap360(cusps[(i + 1) % 12] - cusps[i]);
      if (wrap360(deg - cusps[i]) < span) hits += 1;
    }
    assert.equal(hits, 1, `${label}: ${deg}° lands in ${hits} houses`);
  }
}

test("Paris 14:30 / 12:00 midpoint composite matches Swiss-derived longs to 1′", async () => {
  const a = await calculateNatal({
    ...PARIS,
    name: "Person A",
    date: "1990-06-15",
    time: "14:30",
  });
  const b = await calculateNatal({
    ...PARIS,
    name: "Person B",
    date: "1990-06-15",
    time: "12:00",
  });

  assert.equal(a.meta.ephemeris, "swiss");
  assert.equal(a.meta.zodiac, "tropical");
  assert.equal(a.meta.lilith, "true");
  assert.equal(b.meta.lilith, "true");

  for (const [id, lon] of Object.entries(DAY_LON)) {
    const body = id in a.angles ? a.angles[id] : a.planets.find((p) => p.id === id);
    assert.ok(body, `missing A ${id}`);
    const d = minutesApart(body.ecliptic, lon);
    assert.ok(d <= 1, `A ${id} ${body.ecliptic} vs ${lon} (${d.toFixed(3)}′)`);
  }
  for (const [id, lon] of Object.entries(NOON_LON)) {
    const body = id in b.angles ? b.angles[id] : b.planets.find((p) => p.id === id);
    assert.ok(body, `missing B ${id}`);
    const d = minutesApart(body.ecliptic, lon);
    assert.ok(d <= 1, `B ${id} ${body.ecliptic} vs ${lon} (${d.toFixed(3)}′)`);
  }

  const chart = buildComposite(a, b);
  assert.equal(chart.meta.ephemeris, "swiss");
  assert.equal(chart.meta.zodiac, "tropical");
  assert.equal(chart.meta.lilith, "true");
  assert.equal(chart.meta.time, "midpoint");
  assert.equal(chart.meta.placeLabel, "Midpoint composite");
  assert.match(COMPOSITE_HOUSE_METHOD, /Not Davison/);
  assert.match(COMPOSITE_HOUSE_METHOD, /midpoint-axes/);
  assert.match(COMPOSITE_HOUSE_METHOD, /not averaged cusp by cusp/);

  const aSun = a.planets.find((p) => p.id === "sun");
  const bSun = b.planets.find((p) => p.id === "sun");
  const cSun = chart.planets.find((p) => p.id === "sun");
  assert.ok(aSun && bSun && cSun);
  const sunMid = midpointLon(aSun.ecliptic, bSun.ecliptic);
  const sunD = minutesApart(cSun.ecliptic, sunMid);
  assert.ok(sunD <= 1, `composite Sun ${cSun.ecliptic} vs midpoint ${sunMid} (${sunD.toFixed(3)}′)`);

  for (const id of ["moon", "northnode", "lilith"]) {
    const pa = a.planets.find((p) => p.id === id);
    const pb = b.planets.find((p) => p.id === id);
    const pc = chart.planets.find((p) => p.id === id);
    assert.ok(pa && pb && pc, `missing composite ${id}`);
    const mid = midpointLon(pa.ecliptic, pb.ecliptic);
    const d = minutesApart(pc.ecliptic, mid);
    assert.ok(d <= 1, `composite ${id} ${pc.ecliptic} vs midpoint ${mid} (${d.toFixed(3)}′)`);
  }

  const ascMid = midpointLon(a.angles.ascendant.ecliptic, b.angles.ascendant.ecliptic);
  const mcMid = midpointLon(a.angles.midheaven.ecliptic, b.angles.midheaven.ecliptic);
  assert.ok(minutesApart(chart.angles.ascendant.ecliptic, ascMid) <= 1);
  assert.ok(minutesApart(chart.angles.midheaven.ecliptic, mcMid) <= 1);
  assert.ok(minutesApart(chart.houses[0].ecliptic, chart.angles.ascendant.ecliptic) <= 1);
  assert.ok(minutesApart(chart.houses[9].ecliptic, chart.angles.midheaven.ecliptic) <= 1);

  const majors = compositeMajors(chart);
  assert.ok(majors.every((row) => row.level === "major"));
  assert.ok(
    majors.every((row) =>
      ["conjunction", "sextile", "square", "trine", "opposition"].includes(row.type),
    ),
  );
  for (const row of majors) {
    const max = aspectOrb(row.type, row.a, row.b);
    assert.ok(row.orb <= max + 1e-6, `${row.id} orb ${row.orb} > ${max}`);
  }
  assert.equal(aspectOrb("trine", "sun", "ascendant"), ANGLE_ASPECT_ORBS.trine);
  assert.equal(aspectOrb("sextile", "moon", "midheaven"), ANGLE_ASPECT_ORBS.sextile);

  const cells = helloCells("en");
  assert.equal(NATAL_HELLO.id, "natal.hello");
  assert.equal(cells[0]?.id, "sun");
  assert.equal(cells[0]?.sentence, "Your core identity: what you are aiming to become and where you want to shine.");
  assert.equal(cells[1]?.sentence, "Your emotional needs: what makes you feel safe and how you react under stress.");
  assert.equal(cells[2]?.sentence, "Your rising sign: how you come across and how you approach anything new.");

  // The Composite panel speaks of the pair, not of one person.
  assert.equal(compositeTitle("sun", "en"), "Composite Sun");
  assert.equal(compositeTitle("moon", "fr"), "Lune composite");
  assert.equal(
    compositeLine("sun", { sign: "sagittarius" }, "en", "optimistic, frank and adventurous"),
    "What the relationship is for: what the two of you build and show together. In Sagittarius: optimistic, frank and adventurous.",
  );
  assert.equal(
    compositeLine("moon", { sign: "aquarius" }, "fr", ""),
    "Son climat affectif\u202f: ce qui vous fait vous sentir chez vous, ensemble.",
  );

  assert.equal(compositeReadingEmpty("en"), "Tap a body or an aspect in the wheel.");
});

test("every composite longitude and cusp is frozen to 1′", async () => {
  const chart = buildComposite(
    await calculateNatal(PERSON_A),
    await calculateNatal(PERSON_B),
  );

  for (const [id, lon] of Object.entries(COMPOSITE_LON)) {
    const body = id in chart.angles ? chart.angles[id] : chart.planets.find((p) => p.id === id);
    assert.ok(body, `missing composite ${id}`);
    const d = minutesApart(body.ecliptic, lon);
    assert.ok(d <= 1, `composite ${id} ${body.ecliptic} vs ${lon} (${d.toFixed(3)}′)`);
  }

  COMPOSITE_CUSPS.forEach((lon, i) => {
    const d = minutesApart(chart.houses[i].ecliptic, lon);
    assert.ok(d <= 1, `cusp ${i + 1} ${chart.houses[i].ecliptic} vs ${lon} (${d.toFixed(3)}′)`);
  });

  assertRing(chart.houses.map((h) => h.ecliptic), "placidus composite");

  const cusps = chart.houses.map((h) => h.ecliptic);
  for (const p of [...chart.planets, ...Object.values(chart.angles)]) {
    assert.equal(p.house, houseFromCusps(p.ecliptic, cusps), `${p.id} house`);
    assert.ok(Number.isInteger(p.house) && p.house >= 1 && p.house <= 12);
  }
});

test("no Math.round survives on a composite longitude", async () => {
  const chart = buildComposite(
    await calculateNatal(PERSON_A),
    await calculateNatal(PERSON_B),
  );
  const lons = [
    ...chart.planets.map((p) => p.ecliptic),
    ...Object.values(chart.angles).map((x) => x.ecliptic),
    ...chart.houses.map((h) => h.ecliptic),
    ...chart.midpoints.map((m) => m.ecliptic),
    ...chart.stars.map((s) => s.ecliptic),
  ];
  const rounded = lons.filter((lon) => Number.isInteger(lon * 60));
  assert.equal(
    rounded.length,
    0,
    `composite longitudes snapped to a whole arcminute: ${rounded.join(", ")}`,
  );
  for (const p of chart.planets) {
    assert.equal(p.signDegree, ((p.ecliptic % 30) + 30) % 30);
  }
});

test("the composite ring is derived, never averaged cusp by cusp", async () => {
  // 14:30 and 02:20 put the two Ascendants ~178° apart. Averaging the twelve
  // cusps one at a time let each pick its own shorter arc: the ring wound three
  // times round, the spans summed to 1080°, and `houseFromCusps` dropped 14 of
  // the 23 bodies into house 1.
  const a = await calculateNatal(PERSON_A);
  const b = await calculateNatal({ ...PARIS, name: "B", date: "1990-06-15", time: "02:20" });
  const ascGap = minutesApart(a.angles.ascendant.ecliptic, b.angles.ascendant.ecliptic) / 60;
  assert.ok(
    Math.abs(180 - ascGap) < 2,
    `fixture drifted: the Ascendants are ${ascGap.toFixed(2)}° apart, not near-opposite`,
  );

  const chart = buildComposite(a, b);
  const cusps = chart.houses.map((h) => h.ecliptic);
  assertRing(cusps, "near-opposite pair");
  assert.equal(chart.meta.warnings, undefined);

  const houses = new Set(chart.planets.map((p) => p.house));
  assert.ok(houses.size >= 8, `bodies collapsed into ${houses.size} houses: ${[...houses].join(",")}`);

  assert.ok(minutesApart(cusps[0], chart.angles.ascendant.ecliptic) <= 1);
  assert.ok(minutesApart(cusps[9], chart.angles.midheaven.ecliptic) <= 1);
  assert.equal(chart.angles.ascendant.house, 1);
  assert.equal(chart.angles.midheaven.house, 10);
});

test("composite(A, A) reproduces A — in every house system", async () => {
  for (const system of HOUSE_SYSTEM_IDS) {
    const a = await calculateNatal({ ...PERSON_A, houseSystem: system });
    const chart = buildComposite(a, a);

    assert.equal(chart.meta.houseSystem, system);
    assert.equal(chart.meta.warnings, undefined, `${system} warned on an identical pair`);
    a.houses.forEach((h, i) => {
      const d = minutesApart(chart.houses[i].ecliptic, h.ecliptic);
      assert.ok(d <= 1 / 60, `${system} cusp ${i + 1} moved ${d.toFixed(6)}′`);
    });
    for (const id of ["ascendant", "midheaven", "descendant", "ic"]) {
      assert.ok(minutesApart(chart.angles[id].ecliptic, a.angles[id].ecliptic) <= 1 / 60);
      assert.equal(chart.angles[id].house, a.angles[id].house, `${system} ${id} house`);
    }
    for (const p of chart.planets) {
      const src = a.planets.find((x) => x.id === p.id);
      assert.ok(minutesApart(p.ecliptic, src.ecliptic) <= 1 / 60, `${system} ${p.id}`);
      assert.equal(p.house, src.house, `${system} ${p.id} house`);
    }
  }
});

test("the composite house system drives the ring, and the MC is not pinned to 10", async () => {
  const build = async (system) =>
    buildComposite(
      await calculateNatal({ ...PERSON_A, houseSystem: system }),
      await calculateNatal({ ...PERSON_B, houseSystem: system }),
    );

  // Whole sign means sign boundaries anchored on the composite ASC's sign —
  // a cusp-by-cusp average used to leave cusp 1 sitting mid-sign.
  const whole = await build("whole");
  const wholeCusps = whole.houses.map((h) => h.ecliptic);
  assertRing(wholeCusps, "whole composite");
  assert.equal(wholeCusps[0], Math.floor(wrap360(whole.angles.ascendant.ecliptic) / 30) * 30);
  wholeCusps.forEach((lon, i) => assert.equal(lon, wrap360(wholeCusps[0] + 30 * i)));

  const equal = await build("equal");
  const equalCusps = equal.houses.map((h) => h.ecliptic);
  assertRing(equalCusps, "equal composite");
  assert.ok(minutesApart(equalCusps[0], equal.angles.ascendant.ecliptic) <= 1 / 60);
  equalCusps.forEach((lon, i) =>
    assert.ok(minutesApart(lon, wrap360(equalCusps[0] + 30 * i)) <= 1 / 60),
  );
  // Equal houses run from the Ascendant, so the MC floats. Cusp 10 used to be
  // forced onto it, which broke the 30° spacing and lied about the house.
  assert.equal(equal.angles.midheaven.house, 9);
  assert.equal(
    equal.angles.midheaven.house,
    houseFromCusps(equal.angles.midheaven.ecliptic, equalCusps),
  );
  assert.ok(minutesApart(equalCusps[9], equal.angles.midheaven.ecliptic) > 1);

  // Morinus cusp 1 is not the Ascendant, so the ring is not anchored on it.
  const morinus = await build("morinus");
  const morinusCusps = morinus.houses.map((h) => h.ecliptic);
  assertRing(morinusCusps, "morinus composite");
  assert.ok(minutesApart(morinusCusps[0], morinus.angles.ascendant.ecliptic) > 1);
  for (const id of ["ascendant", "midheaven", "descendant", "ic"]) {
    assert.equal(
      morinus.angles[id].house,
      houseFromCusps(morinus.angles[id].ecliptic, morinusCusps),
    );
  }
});

test("near-opposite angles get equal houses and say so, instead of a wound ring", async () => {
  const a = await calculateNatal(PERSON_A);
  // Quito at 00:52: both the Ascendants and the Midheavens are close to
  // opposite, and each midpoint takes a different way round, so the composite
  // ASC and MC no longer bound a quadrant.
  const q = await calculateNatal({
    latitude: -0.1807,
    longitude: -78.4678,
    placeLabel: "Quito, Ecuador",
    houseSystem: "placidus",
    name: "Q",
    date: "1990-06-15",
    time: "00:52",
  });
  const chart = buildComposite(a, q);
  const cusps = chart.houses.map((h) => h.ecliptic);
  assertRing(cusps, "incoherent axes");
  assert.ok(
    chart.meta.warnings?.some((w) => /do not form a quadrant/.test(w)),
    `expected a quadrant warning, got ${JSON.stringify(chart.meta.warnings)}`,
  );
  cusps.forEach((lon, i) => assert.ok(minutesApart(lon, wrap360(cusps[0] + 30 * i)) <= 1 / 60));
  // The axes stay the midpoint axes; their house numbers are read off the ring,
  // so the MC honestly reports where it fell.
  assert.ok(minutesApart(cusps[0], chart.angles.ascendant.ecliptic) <= 1 / 60);
  assert.equal(chart.angles.midheaven.house, 4);
  assert.equal(chart.angles.midheaven.house, houseFromCusps(chart.angles.midheaven.ecliptic, cusps));
});

test("unknown birth time flags the composite axes and cusps without moving them", async () => {
  const a = await calculateNatal(PERSON_A);
  const knownB = await calculateNatal(PERSON_B);
  const unknownB = await calculateNatal({ ...PERSON_B, timeUnknown: true });

  const known = buildComposite(a, knownB);
  const unknown = buildComposite(a, unknownB);

  assert.equal(known.meta.timeUnknown, undefined);
  assert.equal(unknown.meta.timeUnknown, true);
  for (const id of ["ascendant", "midheaven", "descendant", "ic"]) {
    assert.equal(known.angles[id].uncertain, undefined);
    assert.equal(unknown.angles[id].uncertain, true);
  }
  assert.ok(unknown.houses.every((h) => h.uncertain === true));
  assert.ok(known.houses.every((h) => h.uncertain === undefined));

  // Time-dependent points stay flagged through the midpoint; bodies are not
  // flagged, exactly the call the natal chart makes.
  for (const id of ["vertex", "antivertex", "fortune", "spirit"]) {
    assert.equal(unknown.planets.find((p) => p.id === id).uncertain, true, id);
  }
  for (const id of ["sun", "moon", "saturn"]) {
    assert.equal(unknown.planets.find((p) => p.id === id).uncertain, undefined, id);
  }

  // No birth time is invented: the flags are the only difference.
  assert.deepEqual(
    unknown.houses.map((h) => h.ecliptic),
    known.houses.map((h) => h.ecliptic),
  );
  assert.deepEqual(
    unknown.planets.map((p) => p.ecliptic),
    known.planets.map((p) => p.ecliptic),
  );
});

test("a mixed pair warns instead of quietly averaging two different systems", async () => {
  const a = await calculateNatal({ ...PERSON_A, houseSystem: "placidus" });
  const b = await calculateNatal({ ...PERSON_B, houseSystem: "koch" });

  const chart = buildComposite(a, b);
  assert.equal(chart.meta.houseSystem, "placidus");
  assert.ok(
    chart.meta.warnings?.some((w) => /different house systems/.test(w) && /koch/.test(w)),
    JSON.stringify(chart.meta.warnings),
  );
  assertRing(chart.houses.map((h) => h.ecliptic), "mixed systems");

  // A polar chart that fell back to Porphyry is a mixed pair too.
  const tromso = await calculateNatal({
    latitude: 69.6492,
    longitude: 18.9553,
    placeLabel: "Tromsø, Norway",
    houseSystem: "placidus",
    name: "T",
    date: "1990-06-15",
    time: "12:00",
  });
  assert.equal(tromso.meta.houseSystem, "porphyry");
  assert.equal(tromso.meta.houseSystemRequested, "placidus");
  const polar = buildComposite(a, tromso);
  assert.equal(polar.meta.houseSystem, "placidus");
  assert.ok(polar.meta.warnings?.some((w) => /porphyry/.test(w)), JSON.stringify(polar.meta.warnings));
  assertRing(polar.houses.map((h) => h.ecliptic), "polar partner");
});

test("a body only one chart has is dropped with a warning, not silently", async () => {
  const a = await calculateNatal(PERSON_A);
  const b = await calculateNatal(PERSON_B);
  // Swiss skips a body whose .se1 file is missing, so one side can be short.
  const short = { ...b, planets: b.planets.filter((p) => p.id !== "chiron") };

  const chart = buildComposite(a, short);
  assert.equal(chart.planets.some((p) => p.id === "chiron"), false);
  assert.ok(
    chart.meta.warnings?.some((w) => /chiron/.test(w)),
    JSON.stringify(chart.meta.warnings),
  );
  assert.ok(chart.planets.length >= 20);
  assertRing(chart.houses.map((h) => h.ecliptic), "short partner");
});

test("composite motion is read off the mean speed, not inherited from A", async () => {
  const a = await calculateNatal(PERSON_A);
  const b = await calculateNatal(PERSON_B);
  const chart = buildComposite(a, b);

  for (const p of chart.planets) {
    const pa = a.planets.find((x) => x.id === p.id);
    const pb = b.planets.find((x) => x.id === p.id);
    assert.equal(p.speed, ((pa.speed ?? 0) + (pb.speed ?? 0)) / 2, `${p.id} speed`);
    assert.equal(p.retrograde, p.speed < 0, `${p.id} retrograde`);
    const limit = STATION_SPEED[p.id];
    assert.equal(p.stationary, limit != null && Math.abs(p.speed) < limit, `${p.id} stationary`);
  }
  // patterns.isDay is the one sect answer; a composite has no horizon, so it is
  // read off the Sun's house and captions must take it from there.
  const sun = chart.planets.find((p) => p.id === "sun");
  assert.equal(chart.patterns.isDay, sun.house >= 7 && sun.house <= 12);
});
