import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateNatal } from "../src/lib/chart/calculate.server.ts";
import { arabicLot, computeAspects, houseFromCusps, minutesApart, wrap360 } from "../src/lib/chart/anatomy.ts";
import { isMoonVoidOfCourse } from "../src/lib/chart/patterns.ts";
import { formatDegree } from "../src/lib/utils.ts";
import { signDignity } from "../src/lib/chart/dignities.ts";

const PARIS = {
  name: "Paris fixture",
  latitude: 48.8566,
  longitude: 2.3522,
  placeLabel: "Paris, France",
  houseSystem: "placidus",
};

/** Frozen Swiss Ephemeris (SEFLG_SWIEPH) tropical longitudes, 15 Jun 1990 14:30 Europe/Paris. */
const DAY_LON = {
  sun: 84.149454,
  moon: 345.636491,
  mercury: 65.726461,
  venus: 48.802098,
  mars: 11.056288,
  jupiter: 105.894000,
  saturn: 294.030713,
  uranus: 278.164401,
  neptune: 283.716556,
  pluto: 225.401082,
  northnode: 308.122193,
  lilith: 259.045702,
  chiron: 106.062629,
  ceres: 117.886214,
  juno: 220.324205,
  vesta: 34.815691,
  eris: 17.528402,
  sedna: 41.309219,
  ascendant: 182.465211,
  midheaven: 93.105583,
};

const NIGHT_LON = {
  sun: 83.671891,
  moon: 338.995732,
  northnode: 308.113948,
  lilith: 258.350267,
  ascendant: 6.245324,
};

/**
 * Fixture A — the QA reference chart, 15 Jun 1990 12:00 Europe/Paris, Placidus.
 * Sun 24°03′ Gemini, Moon 14°15′ Pisces, ASC 5°09′ Virgo (see `scripts/e2e/_lib.mjs`).
 */
const FIXTURE_A_LON = {
  sun: 84.049963,
  moon: 344.245798,
  mercury: 65.547866,
  venus: 48.679602,
  mars: 10.981394,
  jupiter: 105.871435,
  saturn: 294.036818,
  uranus: 278.168455,
  neptune: 283.719162,
  pluto: 225.403185,
  northnode: 308.120741,
  lilith: 258.928423,
  chiron: 106.052085,
  ceres: 117.841841,
  juno: 220.334873,
  vesta: 34.773636,
  eris: 17.527891,
  sedna: 41.308270,
  ascendant: 155.145263,
  midheaven: 58.038466,
  descendant: 335.145263,
  ic: 238.038466,
};

const FIXTURE_A_CUSPS = [
  155.145263, 176.545575, 203.960428, 238.038466, 275.183721, 308.132047,
  335.145263, 356.545575, 23.960428, 58.038466, 95.183721, 128.132047,
];

const FIXTURE_A = { ...PARIS, date: "1990-06-15", time: "12:00" };

/** Tromsø is inside the arctic circle: Swiss cannot build Placidus cusps there. */
const TROMSO = {
  name: "Polar fixture",
  latitude: 69.6492,
  longitude: 18.9553,
  placeLabel: "Tromsø, Norway",
};

function bodyOf(chart, id) {
  return id in chart.angles ? chart.angles[id] : chart.planets.find((p) => p.id === id);
}

function assertLongitudes(chart, frozen) {
  for (const [id, lon] of Object.entries(frozen)) {
    const body = bodyOf(chart, id);
    assert.ok(body, `missing ${id}`);
    assert.ok(
      minutesApart(body.ecliptic, lon) <= 1 + 1e-6,
      `${id}: ${body.ecliptic} vs ${lon} (${minutesApart(body.ecliptic, lon).toFixed(3)}′)`,
    );
  }
}

function placement(id, ecliptic, speed = 1, extras = {}) {
  const signDegree = ((ecliptic % 30) + 30) % 30;
  return {
    id,
    kind: extras.kind ?? "planet",
    name: id,
    sign: "aries",
    ecliptic,
    signDegree,
    formatted: formatDegree(ecliptic),
    house: extras.house ?? 1,
    retrograde: speed < 0,
    speed,
    ...extras,
  };
}

test("Paris 15 Jun 1990 14:30 matches Swiss Ephemeris to 1′", async () => {
  const chart = await calculateNatal({ ...PARIS, date: "1990-06-15", time: "14:30" });
  assert.equal(chart.meta.ephemeris, "swiss");
  assert.equal(chart.meta.zodiac, "tropical");
  assert.equal(chart.meta.lilith, "true");
  assert.equal(chart.meta.houseSystem, "placidus");
  assert.equal(chart.patterns.isDay, true);

  for (const [id, lon] of Object.entries(DAY_LON)) {
    const body =
      id in chart.angles
        ? chart.angles[id]
        : chart.planets.find((p) => p.id === id);
    assert.ok(body, `missing ${id}`);
    assert.ok(
      minutesApart(body.ecliptic, lon) <= 1 + 1e-6,
      `${id}: ${body.ecliptic} vs ${lon} (${minutesApart(body.ecliptic, lon).toFixed(3)}′)`,
    );
    assert.equal(body.formatted, formatDegree(lon));
  }

  const nn = chart.planets.find((p) => p.id === "northnode");
  const sn = chart.planets.find((p) => p.id === "southnode");
  assert.ok(nn && sn);
  assert.ok(minutesApart(sn.ecliptic, wrap360(nn.ecliptic + 180)) < 0.01);
  if (nn.declination != null && sn.declination != null) {
    assert.ok(Math.abs(sn.declination + nn.declination) < 0.02);
  }

  const lilith = chart.planets.find((p) => p.id === "lilith");
  assert.equal(lilith?.name, "True Lilith");

  const fortune = chart.planets.find((p) => p.id === "fortune");
  const spirit = chart.planets.find((p) => p.id === "spirit");
  const sun = chart.planets.find((p) => p.id === "sun");
  const moon = chart.planets.find((p) => p.id === "moon");
  const expectedFortune = arabicLot(true, chart.angles.ascendant.ecliptic, sun.ecliptic, moon.ecliptic, "fortune");
  const expectedSpirit = arabicLot(true, chart.angles.ascendant.ecliptic, sun.ecliptic, moon.ecliptic, "spirit");
  assert.ok(minutesApart(fortune.ecliptic, expectedFortune) < 0.01);
  assert.ok(minutesApart(spirit.ecliptic, expectedSpirit) < 0.01);
  assert.ok(chart.patterns.ranking.length === 7);
  assert.ok(chart.patterns.weights);
  assert.ok("tightest" in chart.patterns);
});

test("server payload flags peregrine (by all five dignities) and succedent/cadent weights", async () => {
  // The Sun at 24° Gemini holds its face (Gemini 20–30 is the Sun's), so it
  // is not peregrine; the Moon at 15° Pisces holds nothing (it only
  // participates in the water triplicity, which is not scored).
  assert.equal(signDignity("sun", DAY_LON.sun, true), null);
  assert.equal(signDignity("mercury", DAY_LON.mercury, true), "domicile");
  assert.equal(signDignity("moon", DAY_LON.moon, true), "peregrine");
  assert.equal(signDignity("jupiter", DAY_LON.jupiter, true), "exalted");
  assert.equal(signDignity("uranus", DAY_LON.uranus, true), null);

  const chart = await calculateNatal({ ...PARIS, date: "1990-06-15", time: "14:30" });
  const payload = JSON.stringify(chart);
  assert.match(payload, /"peregrine"/);
  assert.match(payload, /"succedent"/);
  assert.match(payload, /"cadent"/);

  const sun = chart.planets.find((p) => p.id === "sun");
  const moon = chart.planets.find((p) => p.id === "moon");
  const mercury = chart.planets.find((p) => p.id === "mercury");
  assert.equal(chart.patterns.flags.sun?.dignity, null);
  assert.equal(chart.patterns.flags.moon?.dignity, "peregrine");
  assert.equal(chart.patterns.flags.mercury?.dignity, "domicile");
  assert.equal(sun?.sign, "gemini");
  assert.equal(moon?.sign, "pisces");
  assert.equal(mercury?.sign, "gemini");

  const tempos = ["angular", "succedent", "cadent"];
  for (const id of ["sun", "moon", "mercury", "venus", "mars"]) {
    const tempo = chart.patterns.flags[id]?.tempo;
    assert.ok(tempos.includes(tempo), `${id} tempo ${tempo}`);
  }
  const a = chart.patterns.weights.angularity;
  assert.equal(typeof a.angular, "number");
  assert.equal(typeof a.succedent, "number");
  assert.equal(typeof a.cadent, "number");
  assert.ok(a.succedent > 0, `succedent weight ${a.succedent}`);
  assert.ok(a.cadent > 0, `cadent weight ${a.cadent}`);
  assert.ok(a.angular > 0, `angular weight ${a.angular}`);
});

test("Paris 15 Jun 1990 02:30 is a night chart with reversed Fortune/Spirit", async () => {
  const chart = await calculateNatal({ ...PARIS, date: "1990-06-15", time: "02:30" });
  assert.equal(chart.patterns.isDay, false);
  const sun = chart.planets.find((p) => p.id === "sun");
  const moon = chart.planets.find((p) => p.id === "moon");
  assert.ok(minutesApart(sun.ecliptic, NIGHT_LON.sun) <= 1);
  assert.ok(minutesApart(moon.ecliptic, NIGHT_LON.moon) <= 1);
  assert.ok(minutesApart(chart.angles.ascendant.ecliptic, NIGHT_LON.ascendant) <= 1);

  const fortune = chart.planets.find((p) => p.id === "fortune");
  const spirit = chart.planets.find((p) => p.id === "spirit");
  const nightFortune = arabicLot(false, chart.angles.ascendant.ecliptic, sun.ecliptic, moon.ecliptic, "fortune");
  const dayFortune = arabicLot(true, chart.angles.ascendant.ecliptic, sun.ecliptic, moon.ecliptic, "fortune");
  assert.ok(minutesApart(fortune.ecliptic, nightFortune) < 0.01);
  assert.ok(minutesApart(fortune.ecliptic, dayFortune) > 1);
  assert.ok(
    minutesApart(
      spirit.ecliptic,
      arabicLot(false, chart.angles.ascendant.ecliptic, sun.ecliptic, moon.ecliptic, "spirit"),
    ) < 0.01,
  );
});

test("applying vs separating from relative speed", () => {
  const applying = computeAspects([
    placement("moon", 0, 13),
    placement("saturn", 92, 0),
  ]);
  const square = applying.find((a) => a.type === "square");
  assert.ok(square);
  assert.equal(square.applying, true);

  const separating = computeAspects([
    placement("moon", 0, 13),
    placement("saturn", 88, 0),
  ]);
  const sq2 = separating.find((a) => a.type === "square");
  assert.ok(sq2);
  assert.equal(sq2.applying, false);
});

test("void-of-course Moon is about a future exact major, not current orb", () => {
  const vocMoon = placement("moon", 29.2, 13);
  const farSun = placement("sun", 100, 1);
  assert.equal(isMoonVoidOfCourse(vocMoon, [vocMoon, farSun]), true);

  const applyingMoon = placement("moon", 28.0, 13);
  const mars = placement("mars", 119.2, 0);
  assert.equal(isMoonVoidOfCourse(applyingMoon, [applyingMoon, mars]), false);

  const rxVoc = placement("moon", 1.2, -13);
  const farSaturn = placement("saturn", 200, 0);
  assert.equal(isMoonVoidOfCourse(rxVoc, [rxVoc, farSaturn]), true);

  const rxApplying = placement("moon", 2.0, -13);
  const sun = placement("sun", 0.4, 1);
  assert.equal(isMoonVoidOfCourse(rxApplying, [rxApplying, sun]), false);
});

test("Fixture A — Paris 15 Jun 1990 12:00 matches Swiss to 1′", async () => {
  const chart = await calculateNatal(FIXTURE_A);
  assert.equal(chart.meta.utc, "1990-06-15T10:00:00Z");
  assert.equal(chart.meta.timezone, "Europe/Paris");
  assert.equal(chart.meta.houseSystem, "placidus");
  assert.equal(chart.meta.houseSystemRequested, undefined);
  assert.equal(chart.meta.zodiac, "tropical");
  assert.equal(chart.meta.ephemeris, "swiss");
  assert.equal(chart.meta.lilith, "true");
  assert.equal(chart.meta.timeUnknown, undefined);
  assert.equal(chart.meta.warnings, undefined);
  assert.equal(chart.patterns.isDay, true);

  assertLongitudes(chart, FIXTURE_A_LON);

  // The QA reference reading the e2e suite asserts against the rendered table.
  const sun = bodyOf(chart, "sun");
  const moon = bodyOf(chart, "moon");
  const asc = bodyOf(chart, "ascendant");
  assert.equal(sun.formatted, "24°03'");
  assert.equal(sun.sign, "gemini");
  assert.equal(moon.formatted, "14°15'");
  assert.equal(moon.sign, "pisces");
  assert.equal(asc.formatted, "5°09'");
  assert.equal(asc.sign, "virgo");

  FIXTURE_A_CUSPS.forEach((lon, i) => {
    assert.ok(
      minutesApart(chart.houses[i].ecliptic, lon) <= 1 + 1e-6,
      `cusp ${i + 1}: ${chart.houses[i].ecliptic} vs ${lon}`,
    );
    assert.equal(chart.houses[i].uncertain, undefined);
  });

  // Placidus puts the angles on their namesake cusps.
  assert.equal(asc.house, 1);
  assert.equal(bodyOf(chart, "midheaven").house, 10);
  assert.equal(bodyOf(chart, "descendant").house, 7);
  assert.equal(bodyOf(chart, "ic").house, 4);
});

test("no Math.round survives on an ecliptic longitude", async () => {
  const chart = await calculateNatal(FIXTURE_A);
  const lons = [
    ...chart.planets.map((p) => p.ecliptic),
    ...Object.values(chart.angles).map((a) => a.ecliptic),
    ...chart.houses.map((h) => h.ecliptic),
    ...chart.midpoints.map((m) => m.ecliptic),
    ...chart.stars.map((s) => s.ecliptic),
  ];
  const rounded = lons.filter((lon) => Number.isInteger(lon * 60));
  assert.equal(
    rounded.length,
    0,
    `longitudes snapped to a whole arcminute: ${rounded.join(", ")}`,
  );
  for (const p of chart.planets) {
    assert.equal(p.signDegree, ((p.ecliptic % 30) + 30) % 30);
  }
});

test("angle house numbers come from the cusps, not a hardcoded 1/10/7/4", async () => {
  const placidus = await calculateNatal({ ...FIXTURE_A, houseSystem: "placidus" });
  const koch = await calculateNatal({ ...FIXTURE_A, houseSystem: "koch" });
  const whole = await calculateNatal({ ...FIXTURE_A, houseSystem: "whole" });
  const equal = await calculateNatal({ ...FIXTURE_A, houseSystem: "equal" });

  // ASC and MC are house-system independent: same longitudes in all four.
  for (const chart of [koch, whole, equal]) {
    assert.ok(minutesApart(chart.angles.ascendant.ecliptic, FIXTURE_A_LON.ascendant) <= 1 + 1e-6);
    assert.ok(minutesApart(chart.angles.midheaven.ecliptic, FIXTURE_A_LON.midheaven) <= 1 + 1e-6);
  }

  // Quadrant systems put the MC on cusp 10 …
  assert.equal(placidus.meta.houseSystem, "placidus");
  assert.equal(placidus.angles.midheaven.house, 10);
  assert.equal(koch.meta.houseSystem, "koch");
  assert.equal(koch.angles.midheaven.house, 10);
  assert.equal(koch.angles.ic.house, 4);

  // … whole-sign and equal do not. This is the bug the hardcoded 10 hid.
  assert.equal(whole.meta.houseSystem, "whole");
  assert.equal(whole.angles.midheaven.house, 9, "whole-sign MC is in house 9 here");
  assert.equal(whole.angles.ic.house, 3, "whole-sign IC is in house 3 here");
  assert.equal(equal.angles.midheaven.house, 9, "equal-house MC is in house 9 here");
  assert.equal(equal.angles.ic.house, 3, "equal-house IC is in house 3 here");

  // The ASC always opens house 1, DSC always house 7, in every system.
  for (const chart of [placidus, koch, whole, equal]) {
    assert.equal(chart.angles.ascendant.house, 1, `${chart.meta.houseSystem} ASC`);
    assert.equal(chart.angles.descendant.house, 7, `${chart.meta.houseSystem} DSC`);
  }

  // Whole-sign cusps are the 30° boundaries of the rising sign onward.
  whole.houses.forEach((h) => assert.equal(h.ecliptic % 30, 0, `whole cusp ${h.id}`));
  assert.equal(whole.houses[0].ecliptic, 150);
});

test("Vertex follows the chart's house system, not a Placidus lock", async () => {
  const placidus = await calculateNatal({ ...FIXTURE_A, houseSystem: "placidus" });
  const koch = await calculateNatal({ ...FIXTURE_A, houseSystem: "koch" });
  const vertexOf = (c) => c.planets.find((p) => p.id === "vertex");

  // The Vertex itself is system-independent, but it must now be housed against
  // the chart's own cusps rather than a second Placidus call.
  assert.ok(minutesApart(vertexOf(placidus).ecliptic, vertexOf(koch).ecliptic) < 0.01);
  assert.equal(vertexOf(koch).house, houseFromCusps(vertexOf(koch).ecliptic, koch.houses.map((h) => h.ecliptic)));

  const whole = await calculateNatal({ ...FIXTURE_A, houseSystem: "whole" });
  const anti = whole.planets.find((p) => p.id === "antivertex");
  assert.ok(anti);
  assert.ok(minutesApart(anti.ecliptic, wrap360(vertexOf(whole).ecliptic + 180)) < 0.01);
  assert.equal(anti.house, houseFromCusps(anti.ecliptic, whole.houses.map((h) => h.ecliptic)));
});

test("polar Placidus falls back to Porphyry instead of failing the chart", async () => {
  const chart = await calculateNatal({
    ...TROMSO,
    date: "1990-06-15",
    time: "12:00",
    houseSystem: "placidus",
  });

  assert.equal(chart.meta.houseSystem, "porphyry", "Placidus is undefined at 69.6°N");
  assert.equal(chart.meta.houseSystemRequested, "placidus");
  assert.equal(chart.houses.length, 12);
  for (const h of chart.houses) {
    assert.ok(Number.isFinite(h.ecliptic), `cusp ${h.id} not finite`);
  }

  // Bodies are unaffected by the house system — same sky as Paris at that UT.
  const paris = await calculateNatal(FIXTURE_A);
  for (const id of ["sun", "moon", "mercury", "pluto"]) {
    assert.ok(
      minutesApart(bodyOf(chart, id).ecliptic, bodyOf(paris, id).ecliptic) <= 1 + 1e-6,
      `${id} should not move with latitude`,
    );
  }

  // Porphyry trisects the quadrants, so the MC is still cusp 10.
  assert.equal(chart.angles.midheaven.house, 10);
  assert.equal(chart.angles.ascendant.house, 1);

  // Koch is equally undefined up there and takes the same fallback.
  const koch = await calculateNatal({
    ...TROMSO,
    date: "1990-06-15",
    time: "12:00",
    houseSystem: "koch",
  });
  assert.equal(koch.meta.houseSystem, "porphyry");
  assert.equal(koch.meta.houseSystemRequested, "koch");

  // A system that is defined at the pole is left alone.
  const whole = await calculateNatal({
    ...TROMSO,
    date: "1990-06-15",
    time: "12:00",
    houseSystem: "whole",
  });
  assert.equal(whole.meta.houseSystem, "whole");
  assert.equal(whole.meta.houseSystemRequested, undefined);
});

test("unknown birth time flags the angles instead of inventing a time", async () => {
  const known = await calculateNatal(FIXTURE_A);
  const unknown = await calculateNatal({ ...FIXTURE_A, timeUnknown: true });

  assert.equal(unknown.meta.timeUnknown, true);
  assert.equal(known.meta.timeUnknown, undefined);

  // Noon is still the placeholder epoch — the sky itself does not move.
  assert.equal(unknown.meta.utc, known.meta.utc);
  assertLongitudes(unknown, FIXTURE_A_LON);

  // Every time-dependent point is marked as a placeholder …
  for (const id of ["ascendant", "midheaven", "descendant", "ic"]) {
    assert.equal(unknown.angles[id].uncertain, true, `${id} must be flagged`);
    assert.equal(known.angles[id].uncertain, undefined, `${id} must not be flagged at a known time`);
  }
  for (const id of ["vertex", "antivertex", "fortune", "spirit"]) {
    const body = unknown.planets.find((p) => p.id === id);
    assert.ok(body, `missing ${id}`);
    assert.equal(body.uncertain, true, `${id} must be flagged`);
    assert.equal(known.planets.find((p) => p.id === id).uncertain, undefined);
  }
  for (const h of unknown.houses) {
    assert.equal(h.uncertain, true, `cusp ${h.id} must be flagged`);
  }

  // … and the bodies, which barely move in a day, are not.
  for (const id of ["sun", "moon", "mercury", "saturn", "northnode"]) {
    assert.equal(unknown.planets.find((p) => p.id === id).uncertain, undefined, `${id}`);
  }
});

test("ambiguous DST fold resolves to the standard-time instant, deterministically", async () => {
  // Europe/Paris ended summer time on 30 Sep 1990 (the EU moved the autumn
  // change to October only in 1996), so 02:30 local happened twice that night.
  const fold = await calculateNatal({ ...PARIS, date: "1990-09-30", time: "02:30" });
  assert.equal(fold.meta.timezone, "Europe/Paris");
  assert.equal(fold.meta.utc, "1990-09-30T01:30:00Z", "the later, CET (+01:00) reading wins");
  assertLongitudes(fold, {
    sun: 186.642726,
    moon: 310.296415,
    ascendant: 138.997212,
    midheaven: 35.700824,
  });

  // The unambiguous hour before the fold is still CEST (+02:00).
  const before = await calculateNatal({ ...PARIS, date: "1990-09-30", time: "01:30" });
  assert.equal(before.meta.utc, "1990-09-29T23:30:00Z");
  assert.ok(
    minutesApart(before.angles.ascendant.ecliptic, fold.angles.ascendant.ecliptic) > 60,
    "the two readings must not collapse onto the same chart",
  );

  assert.equal(fold.meta.birthTime.local, "ambiguous", "the chart says the time was ambiguous");
  assert.deepEqual(
    fold.meta.birthTime.readings.map((r) => r.abbr),
    ["CEST", "CET"],
    "both readings are offered, first one first",
  );
  assert.equal(fold.meta.birthTime.fold, 1);
  const first = await calculateNatal({ ...PARIS, date: "1990-09-30", time: "02:30", fold: 0 });
  assert.equal(first.meta.utc, "1990-09-30T00:30:00Z", "fold 0 picks the first (CEST) reading");

  // Spring-forward: 02:30 on 25 Mar 1990 never existed in Paris. It is read
  // with the offset in force before the change (CET, +01:00) — as if the
  // clock had not been moved yet — and flagged, never thrown or guessed silently.
  const gap = await calculateNatal({ ...PARIS, date: "1990-03-25", time: "02:30" });
  assert.equal(gap.meta.utc, "1990-03-25T01:30:00Z");
  assert.equal(gap.meta.birthTime.local, "nonexistent");
  assert.equal(gap.meta.birthTime.abbr, "CET");
  assertLongitudes(gap, {
    sun: 4.142558,
    moon: 340.191984,
    ascendant: 267.603299,
    midheaven: 209.161698,
  });
});

test("houseFromCusps is one shared rule that holds on every cusp edge", () => {
  const cusps = FIXTURE_A_CUSPS;
  cusps.forEach((cusp, i) => {
    assert.equal(houseFromCusps(cusp, cusps), i + 1, `exactly on cusp ${i + 1}`);
    // A float ulp below the cusp still belongs to that house, not the previous.
    assert.equal(houseFromCusps(cusp - 1e-12, cusps), i + 1, `an ulp under cusp ${i + 1}`);
    assert.equal(houseFromCusps(cusp + 1e-9, cusps), i + 1, `just inside cusp ${i + 1}`);
  });

  // Wrapping across 0° Aries: cusp 8 is 356.55° and cusp 9 is 23.96°, so
  // 0° Aries sits in house 8 and negative input must wrap, not clamp.
  assert.equal(houseFromCusps(0, cusps), 8);
  assert.equal(houseFromCusps(360, cusps), 8);
  assert.equal(houseFromCusps(-5, cusps), 7, "-5° is 355°, still short of cusp 8");
  assert.equal(houseFromCusps(-10, cusps), 7);
  assert.equal(houseFromCusps(20, cusps), 8);
  assert.equal(houseFromCusps(25, cusps), 9);

  // Whole-sign: every cusp is a sign boundary.
  const wholeCusps = Array.from({ length: 12 }, (_, i) => wrap360(150 + i * 30));
  assert.equal(houseFromCusps(150, wholeCusps), 1);
  assert.equal(houseFromCusps(179.999, wholeCusps), 1);
  assert.equal(houseFromCusps(180, wholeCusps), 2);
  assert.equal(houseFromCusps(58.038466, wholeCusps), 9);
});

test("an unreachable body is skipped with a warning, not fatal to the chart", async () => {
  const REQUIRED = [
    "sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn",
    "uranus", "neptune", "pluto", "northnode", "southnode",
  ];
  const OPTIONAL = ["chiron", "ceres", "juno", "vesta", "eris", "sedna"];

  // With a complete ephe/ every body resolves and nothing is warned about.
  const chart = await calculateNatal(FIXTURE_A);
  for (const id of [...REQUIRED, ...OPTIONAL]) {
    assert.ok(chart.planets.find((p) => p.id === id), `${id} should resolve in this checkout`);
  }
  assert.equal(chart.meta.warnings, undefined, "nothing should be skipped with a full ephe/");

  // The Eris and Sedna files stop at JD 2488922 (mid-2136). Past that Swiss
  // throws for those two only — which used to take the whole natal down.
  const late = await calculateNatal({ ...PARIS, date: "2150-06-15", time: "12:00" });
  for (const id of REQUIRED) {
    assert.ok(late.planets.find((p) => p.id === id), `${id} must survive a skipped asteroid`);
  }
  assert.equal(late.planets.find((p) => p.id === "eris"), undefined, "Eris is out of file range");
  assert.equal(late.planets.find((p) => p.id === "sedna"), undefined, "Sedna is out of file range");
  assert.ok(late.planets.find((p) => p.id === "chiron"), "Chiron is still in range and must stay");

  assert.ok(Array.isArray(late.meta.warnings), "the skip must be visible on meta");
  assert.equal(late.meta.warnings.length, 2);
  // Codes the page translates (lib/chart/method-notes.ts).
  assert.ok(late.meta.warnings.includes("W:body.skipped|eris"), late.meta.warnings.join(" | "));
  assert.ok(late.meta.warnings.includes("W:body.skipped|sedna"), late.meta.warnings.join(" | "));

  // The rest of the chart is whole: angles, cusps, aspects, patterns.
  assert.equal(late.houses.length, 12);
  assert.ok(Number.isFinite(late.angles.ascendant.ecliptic));
  assert.ok(late.aspects.length > 0);
  assert.ok(late.patterns.ranking.length === 7);
});
