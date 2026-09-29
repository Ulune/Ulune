import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateNatal } from "../src/lib/chart/calculate.server.ts";
import { houseFromCusps, minutesApart } from "../src/lib/chart/anatomy.ts";
import { ANGLE_ASPECT_ORBS, ASPECT_ORBS, aspectOrb } from "../src/lib/chart/constants.ts";
import {
  buildSynastry,
  chartPoints,
  cuspLongitudes,
  houseRing,
  meetingAspect,
  overlaysUncertain,
} from "../src/lib/chart/synastry.ts";
import { synastryHelloEmpty, synastryHelloLine } from "../src/lib/i18n/synastry-hello.ts";
import { formatOrb } from "../src/lib/i18n/astro.ts";
import { synastryTableEmpty } from "../src/lib/i18n/synastry-ui.ts";

const PARIS = {
  latitude: 48.8566,
  longitude: 2.3522,
  placeLabel: "Paris, France",
  houseSystem: "placidus",
};

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

/** A's bodies read against B's Placidus cusps, and B's against A's. */
const A_IN_B = {
  sun: 10,
  moon: 7,
  mercury: 10,
  venus: 9,
  mars: 8,
  jupiter: 11,
  saturn: 5,
  uranus: 5,
  neptune: 5,
  pluto: 3,
  chiron: 11,
  northnode: 5,
  southnode: 11,
  lilith: 4,
  vertex: 8,
  antivertex: 2,
  fortune: 10,
  spirit: 5,
  ceres: 11,
  pallas: 10,
  juno: 3,
  vesta: 9,
  eris: 8,
  sedna: 9,
  ascendant: 2,
  midheaven: 10,
  descendant: 8,
  ic: 4,
};

const B_IN_A = {
  sun: 9,
  moon: 6,
  mercury: 9,
  venus: 8,
  mars: 7,
  jupiter: 10,
  saturn: 4,
  uranus: 4,
  neptune: 4,
  pluto: 2,
  chiron: 10,
  northnode: 4,
  southnode: 10,
  lilith: 3,
  vertex: 4,
  antivertex: 10,
  fortune: 8,
  spirit: 3,
  ceres: 10,
  pallas: 9,
  juno: 2,
  vesta: 8,
  eris: 7,
  sedna: 8,
  ascendant: 11,
  midheaven: 9,
  descendant: 5,
  ic: 3,
};

/** Cross-aspect orbs, frozen at 1′ (1′ = 0.016667°). */
const CROSS_ORB = {
  ssun_conjunction_sun: 0.0995,
  smoon_conjunction_moon: 1.3907,
  seris_conjunction_eris: 0.0005,
  snorthnode_conjunction_northnode: 0.0015,
  spluto_conjunction_pluto: 0.0021,
};

test("Paris 14:30 and 12:00 match Swiss to 1′; Hello-meeting matches the table", async () => {
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
  assert.notEqual(a.angles.ascendant.ecliptic, b.angles.ascendant.ecliptic);
  assert.notEqual(a.angles.midheaven.ecliptic, b.angles.midheaven.ecliptic);

  for (const [id, lon] of Object.entries(DAY_LON)) {
    const body =
      id in a.angles ? a.angles[id] : a.planets.find((p) => p.id === id);
    assert.ok(body, `missing A ${id}`);
    const d = minutesApart(body.ecliptic, lon);
    assert.ok(d <= 1, `A ${id} ${body.ecliptic} vs ${lon} (${d.toFixed(3)}′)`);
  }
  for (const [id, lon] of Object.entries(NOON_LON)) {
    const body =
      id in b.angles ? b.angles[id] : b.planets.find((p) => p.id === id);
    assert.ok(body, `missing B ${id}`);
    const d = minutesApart(body.ecliptic, lon);
    assert.ok(d <= 1, `B ${id} ${body.ecliptic} vs ${lon} (${d.toFixed(3)}′)`);
  }

  const pair = buildSynastry(a, b);
  assert.ok(pair.overlays.aInB.length >= 10);
  assert.ok(pair.overlays.bInA.length >= 10);
  for (const row of [...pair.overlays.aInB, ...pair.overlays.bInA]) {
    assert.ok(row.house >= 1 && row.house <= 12, `${row.body} house ${row.house}`);
  }

  const majors = pair.majors;
  assert.ok(majors.every((row) => row.level === "major"));
  assert.ok(majors.every((row) => ["conjunction", "sextile", "square", "trine", "opposition"].includes(row.type)));

  for (const row of majors) {
    const max = aspectOrb(row.type, row.a, row.b);
    assert.ok(row.orb <= max + 1e-6, `${row.id} orb ${row.orb} > ${max}`);
  }

  const sunSun = meetingAspect(majors, "sun");
  const moonMoon = meetingAspect(majors, "moon");
  const ascAsc = meetingAspect(majors, "ascendant");

  assert.ok(sunSun, "Sun–Sun should be a major");
  assert.equal(sunSun.type, "conjunction");
  assert.ok(sunSun.orb < 1, `Sun–Sun orb ${sunSun.orb}`);

  assert.ok(moonMoon, "Moon–Moon should be a major");
  assert.equal(moonMoon.type, "conjunction");
  assert.ok(moonMoon.orb > 1 && moonMoon.orb < 2, `Moon–Moon orb ${moonMoon.orb}`);

  assert.equal(ascAsc, null, "Asc–Asc is 27° at this pair — no major");
  assert.equal(aspectOrb("opposition", "ascendant", "ascendant"), ASPECT_ORBS.opposition);
  assert.equal(aspectOrb("trine", "sun", "ascendant"), ANGLE_ASPECT_ORBS.trine);
  assert.equal(aspectOrb("sextile", "moon", "ascendant"), ANGLE_ASPECT_ORBS.sextile);

  const tableSun = majors.find((row) => row.id === sunSun.id);
  const tableMoon = majors.find((row) => row.id === moonMoon.id);
  assert.equal(tableSun?.orb, sunSun.orb);
  assert.equal(tableMoon?.orb, moonMoon.orb);
  assert.equal(tableSun?.applying, sunSun.applying);
  assert.equal(tableMoon?.applying, moonMoon.applying);
  assert.equal(
    majors.some((row) => row.a === "ascendant" && row.b === "ascendant"),
    false,
  );

  const helloSun = synastryHelloLine("en", sunSun.type, `${formatOrb(sunSun.orb, "en")}°`);
  assert.equal(helloSun, `Conjunction · ${formatOrb(sunSun.orb, "en")}°.`);
  const helloMoon = synastryHelloLine("en", moonMoon.type, `${formatOrb(moonMoon.orb, "en")}°`);
  assert.equal(helloMoon, `Conjunction · ${formatOrb(moonMoon.orb, "en")}°.`);

  assert.equal(synastryHelloEmpty("en", "sun"), "No major aspect between the two Suns.");
  assert.equal(synastryHelloEmpty("en", "moon"), "No major aspect between the two Moons.");
  assert.equal(synastryHelloEmpty("en", "ascendant"), "No major aspect between the two Ascendants.");
  assert.equal(synastryTableEmpty("en"), "No major aspect between these two charts.");

});

test("synastry applying uses both natal speeds, not transit moving-only", async () => {
  const a = await calculateNatal({
    ...PARIS,
    name: "A",
    date: "1990-06-15",
    time: "14:30",
  });
  const b = await calculateNatal({
    ...PARIS,
    name: "B",
    date: "1990-06-15",
    time: "12:00",
  });
  const pair = buildSynastry(a, b);
  const sunSun = meetingAspect(pair.majors, "sun");
  assert.ok(sunSun);
  const aSun = a.planets.find((p) => p.id === "sun");
  const bSun = b.planets.find((p) => p.id === "sun");
  assert.ok(aSun && bSun);
  const dt = 0.05;
  const sep = Math.abs(((((aSun.ecliptic - bSun.ecliptic + 540) % 360) - 180)));
  const later = Math.abs(
    (((((aSun.ecliptic + (aSun.speed ?? 0) * dt) - (bSun.ecliptic + (bSun.speed ?? 0) * dt) + 540) % 360) - 180)),
  );
  const nowOrb = Math.abs(sep - 0);
  const laterOrb = Math.abs(later - 0);
  let expected = null;
  if (laterOrb < nowOrb - 1e-8) expected = true;
  else if (laterOrb > nowOrb + 1e-8) expected = false;
  assert.equal(sunSun.applying, expected);
  assert.equal(sunSun.exactUtc, undefined);
});

test("cross-aspect orbs and both overlay directions are frozen to 1′", async () => {
  const a = await calculateNatal(PERSON_A);
  const b = await calculateNatal(PERSON_B);
  const pair = buildSynastry(a, b);

  for (const [id, orb] of Object.entries(CROSS_ORB)) {
    const row = pair.aspects.find((x) => x.id === id);
    assert.ok(row, `missing cross aspect ${id}`);
    const d = Math.abs(row.orb - orb) * 60;
    assert.ok(d <= 1, `${id} orb ${row.orb} vs ${orb} (${d.toFixed(3)}′)`);
  }

  const read = (rows) => Object.fromEntries(rows.map((r) => [r.body, r.house]));
  assert.deepEqual(read(pair.overlays.aInB), A_IN_B);
  assert.deepEqual(read(pair.overlays.bInA), B_IN_A);

  // Overlays are the shared house rule against the host chart's own cusps —
  // no private copy of `houseFromCusps` in the pair path.
  for (const p of chartPoints(a)) {
    assert.equal(
      pair.overlays.aInB.find((r) => r.body === p.id).house,
      houseFromCusps(p.ecliptic, cuspLongitudes(b)),
      `${p.id} in B`,
    );
  }
});

test("an overlay follows the host chart's house system, including a polar fallback", async () => {
  const a = await calculateNatal(PERSON_A);
  const placidusB = await calculateNatal(PERSON_B);
  const wholeB = await calculateNatal({ ...PERSON_B, houseSystem: "whole" });

  const onPlacidus = buildSynastry(a, placidusB).overlays.aInB;
  const onWhole = buildSynastry(a, wholeB).overlays.aInB;
  const moved = onWhole
    .filter((r, i) => r.house !== onPlacidus[i].house)
    .map((r) => [r.body, onPlacidus.find((x) => x.body === r.body).house, r.house]);
  assert.deepEqual(moved, [
    ["northnode", 5, 6],
    ["southnode", 11, 12],
    ["midheaven", 10, 11],
    ["ic", 4, 5],
  ]);

  // Tromsø falls back to Porphyry; the overlay must read those cusps, not a
  // Placidus ring that does not exist at that latitude.
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
  const polar = buildSynastry(a, tromso);
  assert.equal(polar.overlays.aInB.length, chartPoints(a).length);
  for (const row of polar.overlays.aInB) {
    const point = chartPoints(a).find((p) => p.id === row.body);
    assert.equal(row.house, houseFromCusps(point.ecliptic, cuspLongitudes(tromso)));
  }
});

test("a chart with no usable house ring gets no overlays instead of a wall of house 1", async () => {
  const a = await calculateNatal(PERSON_A);
  const b = await calculateNatal(PERSON_B);

  assert.ok(houseRing(a));
  assert.ok(houseRing(b));

  // A chart saved before cusps existed.
  const legacy = { ...b, houses: [] };
  assert.equal(houseRing(legacy), null);
  const guarded = buildSynastry(a, legacy);
  assert.deepEqual(guarded.overlays.aInB, []);
  assert.equal(guarded.overlays.bInA.length, chartPoints(b).length);
  // Aspects need no houses, so they survive.
  assert.equal(guarded.aspects.length, buildSynastry(a, b).aspects.length);

  // A ring that no longer winds exactly once round.
  const scrambled = {
    ...b,
    houses: b.houses.map((h, i) => (i === 3 ? { ...h, ecliptic: b.houses[0].ecliptic } : h)),
  };
  assert.equal(houseRing(scrambled), null);
  assert.deepEqual(buildSynastry(a, scrambled).overlays.aInB, []);
});

test("overlays into a chart with no birth time are flagged, not presented as known", async () => {
  const a = await calculateNatal(PERSON_A);
  const known = await calculateNatal(PERSON_B);
  const unknown = await calculateNatal({ ...PERSON_B, timeUnknown: true });

  assert.equal(overlaysUncertain(a, known), false);
  assert.equal(overlaysUncertain(a, unknown), true);
  assert.equal(overlaysUncertain(unknown, a), true);

  // The host's own cusps already carry the flag, so nothing is re-derived.
  assert.ok(unknown.houses.every((h) => h.uncertain === true));
  const pair = buildSynastry(a, unknown);
  assert.deepEqual(
    pair.overlays.aInB.map((r) => r.house),
    buildSynastry(a, known).overlays.aInB.map((r) => r.house),
    "a noon placeholder must not move the overlay, only flag it",
  );
});

test("synastry is directional and uses one orb table", async () => {
  const a = await calculateNatal(PERSON_A);
  const b = await calculateNatal(PERSON_B);
  const forward = buildSynastry(a, b);
  const reverse = buildSynastry(b, a);

  assert.equal(forward.aspects.length, reverse.aspects.length);
  for (const row of forward.aspects) {
    const mirror = reverse.aspects.find((x) => x.a === row.b && x.b === row.a && x.type === row.type);
    assert.ok(mirror, `${row.id} has no mirror in the reversed pair`);
    assert.equal(mirror.orb, row.orb, `${row.id} orb is not symmetric`);
  }

  // Same caps as natal: no synastry orb table. A planet-to-angle trine is 6°,
  // not the 8° a planet-to-planet trine gets.
  for (const row of forward.aspects) {
    assert.ok(row.orb <= aspectOrb(row.type, row.a, row.b) + 1e-6, `${row.id} orb ${row.orb}`);
  }
  assert.equal(aspectOrb("trine", "sun", "moon"), ASPECT_ORBS.trine);
  assert.equal(aspectOrb("trine", "sun", "midheaven"), ANGLE_ASPECT_ORBS.trine);
  assert.notEqual(ANGLE_ASPECT_ORBS.trine, ASPECT_ORBS.trine);
});
