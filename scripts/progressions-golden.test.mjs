import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
import { calculateNatal, calculateProgressions, calculateTransits } from "../src/lib/chart/calculate.server.ts";
import { houseFromCusps, minutesApart, wrap360 } from "../src/lib/chart/anatomy.ts";
import { ANGLE_ASPECT_ORBS, aspectOrb } from "../src/lib/chart/constants.ts";
import {
  isProgressionTablePair,
  lifeExactIso,
  NAIBOD_DEG_PER_YEAR,
  progressedArmc,
  progressedUtcFromNatal,
  progressionRowTestId,
  TROPICAL_YEAR_DAYS,
  yearsOfLife,
} from "../src/lib/chart/progressions.ts";
import { applyingFromExactDays, residualForType } from "../src/lib/chart/transit-exact.ts";
import { helloCells, NATAL_HELLO } from "../src/lib/i18n/natal-hello.ts";
import { progressedLine, progressedTitle } from "../src/lib/i18n/mode-hello.ts";
import {
  progressionClockLabel,
  progressionMethodLabel,
  progressionNoNatal,
  progressionReadingEmpty,
  progressionTableEmpty,
} from "../src/lib/i18n/progressions-ui.ts";

const PARIS = {
  name: "Paris fixture",
  latitude: 48.8566,
  longitude: 2.3522,
  placeLabel: "Paris, France",
  houseSystem: "placidus",
};

/** Progressed-to date recorded in the PR: 2026-08-27 14:30 Europe/Paris (natal clock) = 12:30 UTC. */
export const TARGET_UTC = "2026-08-27T12:30:00.000Z";

const NATAL_LON = {
  sun: 84.149454,
  moon: 345.636491,
  northnode: 308.122193,
  lilith: 259.045702,
  ascendant: 182.465211,
};

/**
 * Frozen tropical longitudes at the secondary progressed UT (SEFLG_SWIEPH).
 * The angles advance at the Naibod rate in right ascension; these two agree
 * within 1″ with an independent calculation (Meeus's sidereal time and
 * nutation, the textbook Midheaven and Ascendant formulas).
 */
const FROZEN = {
  sun: 118.684889,
  moon: 113.345879,
  mercury: 137.859188,
  venus: 91.887005,
  mars: 36.064584,
  jupiter: 113.944755,
  saturn: 291.504874,
  uranus: 276.732880,
  neptune: 282.758421,
  pluto: 224.973749,
  northnode: 307.263656,
  lilith: 257.796852,
  ascendant: 208.356328,
  midheaven: 126.674605,
};

function natalBodies(natal) {
  return [
    ...natal.planets.map((p) => ({ id: p.id, name: p.name, ecliptic: p.ecliptic })),
    ...Object.values(natal.angles).map((a) => ({ id: a.id, name: a.name, ecliptic: a.ecliptic })),
  ];
}

test("secondary day-for-a-year uses tropical year 365.24219", () => {
  assert.equal(TROPICAL_YEAR_DAYS, 365.24219);
  const natalUtc = new Date("1990-06-15T12:30:00.000Z");
  const targetUtc = new Date(TARGET_UTC);
  const years = yearsOfLife(natalUtc, targetUtc);
  assert.ok(years > 36.1 && years < 36.3, `years ${years}`);
  const progressed = progressedUtcFromNatal(natalUtc, targetUtc);
  const ephDays = (progressed.getTime() - natalUtc.getTime()) / 86_400_000;
  // Date is millisecond-resolution; years and eph-days are the same quantity.
  assert.ok(Math.abs(ephDays - years) < 1e-6, `ephDays ${ephDays} vs years ${years}`);
  const lifeIso = lifeExactIso(targetUtc, 0.5);
  const halfYearMs = 0.5 * TROPICAL_YEAR_DAYS * 86_400_000;
  assert.ok(Math.abs(Date.parse(lifeIso) - (targetUtc.getTime() + halfYearMs)) < 1000);
});

test("progressions-ui.json is the source of Quill chrome copy", () => {
  const ui = JSON.parse(readFileSync(join(ROOT, "src/lib/i18n/progressions-ui.json"), "utf8"));
  assert.equal(ui.table.empty.en, "No major aspect between your progressed and birth charts.");
  assert.equal(ui.noNatal.en, "Cast a birth chart first.");
  assert.equal(ui.readingEmpty.en, "Tap a body or an aspect in the wheel.");
  assert.equal(ui.clock.today.en, "Today");
  assert.equal(ui.method.en, "Secondary · day for a year");
  assert.equal(progressionClockLabel("en", "today"), "Today");
  assert.equal(progressionMethodLabel("en"), "Secondary · day for a year");
  assert.equal(progressionNoNatal("en"), "Cast a birth chart first.");
  assert.equal(progressionReadingEmpty("en"), "Tap a body or an aspect in the wheel.");
  assert.equal(progressionTableEmpty("en"), "No major aspect between your progressed and birth charts.");
});

test("Hello copy is natal-hello.json exactly", () => {
  const cells = helloCells("en");
  assert.equal(NATAL_HELLO.id, "natal.hello");
  assert.equal(cells[0].id, "sun");
  assert.equal(cells[0].sentence, "Your core identity: what you are aiming to become and where you want to shine.");
  assert.equal(cells[1].sentence, "Your emotional needs: what makes you feel safe and how you react under stress.");
  assert.equal(cells[2].sentence, "Your rising sign: how you come across and how you approach anything new.");
});

test("the Progressions panel says what progressed, not the natal meanings", () => {
  assert.equal(progressedTitle("sun", "en"), "Progressed Sun");
  assert.equal(progressedTitle("moon", "fr"), "Lune progressée");
  assert.equal(progressedTitle("ascendant", "fr"), "Ascendant progressé");
  const at = (sign, signDegree, speed) => ({ id: "sun", sign, signDegree, speed });
  // Changed sign: since when, and when it moves on.
  assert.equal(
    progressedLine(at("aquarius", 7.6, 1.017), at("capricorn", 10.4, 1.01), 26.74, "en"),
    "In Aquarius since about age 19; in Capricorn at birth. Moves into Pisces at about age 49.",
  );
  // Still in its birth sign, moving on within two years: in months.
  assert.equal(
    progressedLine(at("capricorn", 29.5, 1.017), at("capricorn", 10.4, 1.01), 19, "en"),
    "In Capricorn, as at birth. Moves into Aquarius in about 6 months.",
  );
  // The Moon back in its birth sign after going round.
  assert.equal(
    progressedLine(at("scorpio", 6.5, 12.2), at("scorpio", 13.3, 13), 26.74, "fr"),
    "De retour en Scorpion, son signe de naissance, depuis l’âge de 26\u00a0ans environ. Entre en Sagittaire dans 23\u00a0mois environ.",
  );
  assert.equal(
    progressedLine(at("aquarius", 7.6, 1.017), at("capricorn", 10.4, 1.01), 26.74, "fr"),
    "En Verseau depuis l’âge de 19\u00a0ans environ\u202f; en Capricorne à la naissance. Entre en Poissons vers 49\u00a0ans.",
  );
});

test("planet-to-angle majors use 6° trine and 4° sextile", () => {
  assert.equal(ANGLE_ASPECT_ORBS.trine, 6);
  assert.equal(ANGLE_ASPECT_ORBS.sextile, 4);
  assert.equal(aspectOrb("trine", "moon", "ascendant"), 6);
  assert.equal(aspectOrb("sextile", "sun", "midheaven"), 4);
  const base = {
    id: "pmoon_trine_ascendant",
    type: "trine",
    label: "trine",
    level: "major",
    a: "moon",
    b: "ascendant",
    aName: "Moon",
    bName: "Ascendant",
    applying: true,
  };
  assert.equal(isProgressionTablePair({ ...base, orb: 5.9 }), true);
  assert.equal(isProgressionTablePair({ ...base, orb: 6.01 }), false);
  assert.equal(
    isProgressionTablePair({ ...base, type: "sextile", b: "midheaven", orb: 4 }),
    true,
  );
  assert.equal(
    isProgressionTablePair({ ...base, type: "sextile", b: "midheaven", orb: 4.01 }),
    false,
  );
  assert.equal(progressionRowTestId(base), "progression-row-pmoon_trine_ascendant");
});

test("Paris natal + 2026-08-27 14:30 Europe/Paris progressions match Swiss to 1′", async () => {
  const natal = await calculateNatal({ ...PARIS, date: "1990-06-15", time: "14:30" });
  assert.equal(natal.meta.ephemeris, "swiss");
  assert.equal(natal.meta.zodiac, "tropical");
  assert.equal(natal.meta.lilith, "true");

  for (const [id, lon] of Object.entries(NATAL_LON)) {
    const body = id in natal.angles ? natal.angles[id] : natal.planets.find((p) => p.id === id);
    assert.ok(body, `missing natal ${id}`);
    assert.ok(
      minutesApart(body.ecliptic, lon) <= 1 + 1e-6,
      `natal ${id}: ${body.ecliptic} vs ${lon}`,
    );
  }

  const natalUtc = new Date(natal.meta.utc);
  const targetUtc = new Date(TARGET_UTC);
  const sky = await calculateProgressions({
    natalUtc,
    targetUtc,
    latitude: natal.meta.latitude,
    longitude: natal.meta.longitude,
    natalCusps: natal.houses.map((h) => h.ecliptic),
    natalBodies: natalBodies(natal),
    houseSystem: natal.meta.houseSystem,
  });

  assert.equal(sky.meta.method, "secondary");
  assert.equal(sky.meta.tropicalYearDays, 365.24219);
  assert.match(sky.meta.targetUtc, /^2026-08-27T12:30:00Z$/);

  const expectedProgressed = progressedUtcFromNatal(natalUtc, targetUtc);
  assert.ok(
    Math.abs(Date.parse(sky.meta.progressedUtc) - expectedProgressed.getTime()) < 1000,
    `progressedUtc ${sky.meta.progressedUtc} vs ${expectedProgressed.toISOString()}`,
  );

  const nn = sky.planets.find((p) => p.id === "northnode");
  const sn = sky.planets.find((p) => p.id === "southnode");
  const lilith = sky.planets.find((p) => p.id === "lilith");
  assert.ok(nn && sn && lilith);
  assert.ok(minutesApart(sn.ecliptic, wrap360(nn.ecliptic + 180)) < 0.01);
  assert.equal(lilith.name, "True Lilith");

  const moon = sky.planets.find((p) => p.id === "moon");
  const sun = sky.planets.find((p) => p.id === "sun");
  const asc = sky.angles.ascendant;
  assert.ok(moon && sun && asc);
  assert.ok(Number.isFinite(moon.speed), "pMoon missing speed");
  assert.ok(Math.abs(moon.speed) > 10, `pMoon speed ${moon.speed} should be ~13°/day`);

  for (const [id, lon] of Object.entries(FROZEN)) {
    const body = id in sky.angles ? sky.angles[id] : sky.planets.find((p) => p.id === id);
    assert.ok(body, `missing progressed ${id}`);
    assert.ok(
      minutesApart(body.ecliptic, lon) <= 1 + 1e-6,
      `p${id}: ${body.ecliptic} vs ${lon} (${minutesApart(body.ecliptic, lon).toFixed(3)}′)`,
    );
  }

  const transits = await calculateTransits({
    utc: new Date(sky.meta.progressedUtc),
    latitude: natal.meta.latitude,
    longitude: natal.meta.longitude,
    natalCusps: natal.houses.map((h) => h.ecliptic),
    natalBodies: natalBodies(natal),
  });
  const tMoon = transits.planets.find((p) => p.id === "moon");
  const tSun = transits.planets.find((p) => p.id === "sun");
  assert.ok(tMoon && tSun);
  assert.ok(minutesApart(tMoon.ecliptic, moon.ecliptic) <= 1 + 1e-6, "pMoon vs Swiss at progressed UT");
  assert.ok(minutesApart(tSun.ecliptic, sun.ecliptic) <= 1 + 1e-6, "pSun vs Swiss at progressed UT");

  const majors = sky.aspects.filter((a) => isProgressionTablePair(a));
  assert.ok(majors.length > 0, "expected major progressed-to-natal aspects");
  for (const a of majors) {
    assert.ok(a.applying === true || a.applying === false || a.applying === null, a.id);
    if (a.applying === true) {
      assert.ok(a.exactUtc, `${a.id} applying with missing Exact`);
    }
    if (a.exactUtc && Date.parse(a.exactUtc) < targetUtc.getTime() - 120_000) {
      assert.notEqual(a.applying, true, `${a.id} past exact still applying`);
    }
  }

  const moonSat = majors.find((a) => a.a === "moon" && a.type === "opposition" && a.b === "saturn");
  assert.ok(moonSat, "expected progressed Moon opposition natal Saturn");
  assert.equal(moonSat.applying, true);
  assert.ok(moonSat.exactUtc, "pMoon opposition Saturn must have a life Exact");
  assert.ok(residualForType(moon.ecliptic, natal.planets.find((p) => p.id === "saturn").ecliptic, "opposition") < 1);
  const moonSatExact = Date.parse(moonSat.exactUtc);
  assert.ok(
    moonSatExact > Date.parse("2026-09-13T00:00:00Z") && moonSatExact < Date.parse("2026-09-14T12:00:00Z"),
    `pMoon opposition Saturn Exact ${moonSat.exactUtc}`,
  );

  const withExactMoon = majors.filter((a) => a.a === "moon" && a.exactUtc);
  assert.ok(withExactMoon.length > 0, "pMoon must have at least one locked Exact");
  for (const a of withExactMoon.slice(0, 3)) {
    const lifeExact = new Date(a.exactUtc);
    assert.ok(Number.isFinite(lifeExact.getTime()), a.id);
    const skyExact = await calculateProgressions({
      natalUtc,
      targetUtc: lifeExact,
      latitude: natal.meta.latitude,
      longitude: natal.meta.longitude,
      natalCusps: natal.houses.map((h) => h.ecliptic),
      natalBodies: natalBodies(natal),
      houseSystem: natal.meta.houseSystem,
    });
    const pair = skyExact.aspects.find((x) => x.a === a.a && x.b === a.b && x.type === a.type);
    assert.ok(pair, `missing ${a.id} at life exact`);
    assert.ok(
      pair.orb <= 1 / 60 + 1e-6,
      `${a.id} at ${a.exactUtc} orb ${pair.orb}° (${(pair.orb * 60).toFixed(3)}′)`,
    );
  }

  assert.equal(applyingFromExactDays(null, true), false);
});

test("progressed angles are housed from the natal cusps, not a hardcoded 1/10/7/4", async () => {
  const natal = await calculateNatal({ ...PARIS, date: "1990-06-15", time: "12:00", houseSystem: "whole" });
  assert.equal(natal.meta.houseSystem, "whole");
  const cusps = natal.houses.map((h) => h.ecliptic);

  const sky = await calculateProgressions({
    natalUtc: new Date(natal.meta.utc),
    targetUtc: new Date(TARGET_UTC),
    latitude: natal.meta.latitude,
    longitude: natal.meta.longitude,
    natalCusps: cusps,
    natalBodies: natalBodies(natal),
    houseSystem: natal.meta.houseSystem,
  });

  assert.equal(sky.meta.houseSystem, "whole");
  assert.equal(sky.meta.houseSystemRequested, undefined);
  for (const id of ["ascendant", "midheaven", "descendant", "ic"]) {
    const angle = sky.angles[id];
    assert.equal(
      angle.house,
      houseFromCusps(angle.ecliptic, cusps),
      `progressed ${id} house must come from the cusps`,
    );
  }
  for (const p of sky.planets) {
    assert.equal(p.house, houseFromCusps(p.ecliptic, cusps), `progressed ${p.id} house`);
  }

  // The progressed ASC has left the natal first sign in 36 years, so it is
  // not in house 1 any more — the old hardcoded 1 was wrong.
  assert.notEqual(sky.angles.ascendant.house, 1);
  assert.equal(wrap360(sky.angles.descendant.ecliptic - sky.angles.ascendant.ecliptic).toFixed(6), "180.000000");
});

test("progressed angles advance at the Naibod rate in right ascension", async () => {
  const natal = await calculateNatal({ ...PARIS, date: "1990-06-15", time: "14:30" });
  const natalUtc = new Date(natal.meta.utc);
  const at = (iso) =>
    calculateProgressions({
      natalUtc,
      targetUtc: new Date(iso),
      latitude: natal.meta.latitude,
      longitude: natal.meta.longitude,
      natalCusps: natal.houses.map((h) => h.ecliptic),
      natalBodies: natalBodies(natal),
      houseSystem: natal.meta.houseSystem,
    });
  // Right ascension of a point on the ecliptic; the obliquity of the 1990s is
  // close enough for differences (they barely depend on it).
  const R = Math.PI / 180;
  const eps = 23.4405;
  const ra = (lon) => wrap360(Math.atan2(Math.sin(lon * R) * Math.cos(eps * R), Math.cos(lon * R)) / R);
  const arc = (a, b) => ((b - a) % 360 + 360) % 360;

  const a = await at("2026-01-10T00:00:00.000Z");
  const b = await at("2026-07-10T00:00:00.000Z");
  const years = b.meta.yearsOfLife - a.meta.yearsOfLife;
  const rate = arc(ra(a.angles.midheaven.ecliptic), ra(b.angles.midheaven.ecliptic));
  assert.ok(
    Math.abs(rate - NAIBOD_DEG_PER_YEAR * years) * 3600 < 2,
    `MC moved ${rate}° of right ascension in ${years} years`,
  );
  const fromBirth = arc(ra(natal.angles.midheaven.ecliptic), ra(a.angles.midheaven.ecliptic));
  assert.ok(
    Math.abs(fromBirth - NAIBOD_DEG_PER_YEAR * a.meta.yearsOfLife) * 3600 < 15,
    `MC ${fromBirth}° of right ascension from birth in ${a.meta.yearsOfLife} years`,
  );
  // Half a year moves the Ascendant under a degree, never round the zodiac
  // (houses cast at the progressed moment itself turned it once a year).
  const asc = wrap360(b.angles.ascendant.ecliptic - a.angles.ascendant.ecliptic);
  assert.ok(asc > 0.1 && asc < 1.5, `ASC moved ${asc}° in half a year`);
  for (const sky of [a, b]) {
    const speed = sky.angles.ascendant.speed;
    assert.ok(speed > 0.1 && speed < 3, `ASC speed ${speed}° a year`);
    assert.equal(sky.angles.ascendant.retrograde, false);
  }

  // Their exact dates lock: at the date given, the aspect is within 1′.
  const angleExacts = [a, b]
    .flatMap((sky) => sky.aspects)
    .filter((x) => ["ascendant", "midheaven", "descendant", "ic"].includes(x.a) && x.exactUtc);
  assert.ok(angleExacts.length > 0, "expected a progressed angle aspect with an exact date");
  for (const x of angleExacts.slice(0, 3)) {
    const there = await at(x.exactUtc);
    const pair = there.aspects.find((y) => y.a === x.a && y.b === x.b && y.type === x.type);
    assert.ok(pair && pair.orb <= 1 / 60 + 1e-6, `${x.id} at ${x.exactUtc}: orb ${pair?.orb}`);
    const years = (Date.parse(x.exactUtc) - Date.parse(a.meta.targetUtc)) / (TROPICAL_YEAR_DAYS * 86_400_000);
    assert.ok(Math.abs(years) < 60, `${x.id} exact ${years} years away`);
  }

  assert.equal(progressedArmc(100, 3), 100);
  assert.equal(progressedArmc(100, 3.25), 10);
  assert.equal(progressedArmc(10, 0.5), 190);
});

test("a polar progression falls back rather than failing", async () => {
  const natal = await calculateNatal({
    name: "Polar fixture",
    latitude: 69.6492,
    longitude: 18.9553,
    placeLabel: "Tromsø, Norway",
    date: "1990-06-15",
    time: "12:00",
    houseSystem: "placidus",
  });
  assert.equal(natal.meta.houseSystem, "porphyry");

  const sky = await calculateProgressions({
    natalUtc: new Date(natal.meta.utc),
    targetUtc: new Date(TARGET_UTC),
    latitude: natal.meta.latitude,
    longitude: natal.meta.longitude,
    natalCusps: natal.houses.map((h) => h.ecliptic),
    natalBodies: natalBodies(natal),
    houseSystem: "placidus",
  });
  assert.equal(sky.meta.houseSystem, "porphyry");
  assert.equal(sky.meta.houseSystemRequested, "placidus");
  for (const id of ["ascendant", "midheaven", "descendant", "ic"]) {
    assert.ok(Number.isFinite(sky.angles[id].ecliptic), `progressed ${id}`);
  }
});
