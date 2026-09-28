import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
import { calculateNatal, calculateTransits } from "../src/lib/chart/calculate.server.ts";
import { computeCrossAspects, houseFromCusps, minutesApart, wrap360 } from "../src/lib/chart/anatomy.ts";
import {
  applyingFromExactDays,
  aspectPole,
  findExactDays,
  isTransitTablePair,
  lockedAspectResidual,
  motionFlags,
  residualForType,
  tightestApplyingMajors,
  transitRowTestId,
} from "../src/lib/chart/transit-exact.ts";
import { MEAN_SPEED, STATION_SPEED } from "../src/lib/chart/constants.ts";
import { formatDegree } from "../src/lib/utils.ts";

const PARIS = {
  name: "Paris fixture",
  latitude: 48.8566,
  longitude: 2.3522,
  placeLabel: "Paris, France",
  houseSystem: "placidus",
};

/** Frozen transit epoch recorded in the PR. */
export const TRANSIT_UTC = "2026-08-27T12:00:00.000Z";

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

test("locked residual is zero on the occupied square pole", () => {
  const pole = aspectPole(0, 92, 90);
  assert.equal(pole, -1);
  const r = lockedAspectResidual(0, 92, 90, pole);
  assert.ok(Math.abs(r + 2) < 1e-9, `residual ${r}`);
});

test("findExactDays perfects a linear applying square", () => {
  const days = findExactDays({
    lonAt: (d) => ({ lon: wrap360(0 + 13 * d), speed: 13 }),
    natalLon: 92,
    target: 90,
    applying: true,
    maxDays: 40,
  });
  assert.ok(days != null);
  assert.ok(Math.abs(days - 2 / 13) < 1e-6, `days ${days}`);
});

test("findExactDays perfects a linear separating square in the past", () => {
  const days = findExactDays({
    lonAt: (d) => ({ lon: wrap360(0 + 13 * d), speed: 13 }),
    natalLon: 88,
    target: 90,
    applying: false,
    maxDays: 40,
  });
  assert.ok(days != null);
  assert.ok(days < 0, `expected past, got ${days}`);
  assert.ok(Math.abs(days + 2 / 13) < 1e-6, `days ${days}`);
});

test("motion flags match natal contract", () => {
  // Stationary by the body's own speed (Mercury within about a day of its station).
  assert.ok(STATION_SPEED.mercury > 0.1 && STATION_SPEED.mercury < 0.13);
  const sta = motionFlags("mercury", 0.02);
  assert.equal(sta.stationary, true);
  assert.equal(sta.fast, false);
  const rx = motionFlags("mercury", -0.03);
  assert.equal(rx.retrograde, true);
  assert.equal(rx.stationary, true);
  const moonFast = motionFlags("moon", MEAN_SPEED.moon * 1.4);
  assert.equal(moonFast.fast, true);
  assert.equal(moonFast.stationary, false);
  const sunOk = motionFlags("sun", MEAN_SPEED.sun);
  assert.equal(sunOk.fast, false);
  assert.equal(sunOk.stationary, false);
});

test("Hello-now takes the three tightest applying majors and skips the rest", () => {
  const aspects = [
    { id: "sep", type: "square", level: "major", a: "saturn", b: "sun", orb: 0.1, applying: false },
    { id: "minor", type: "quincunx", level: "minor", a: "mars", b: "moon", orb: 0.2, applying: true },
    { id: "wide", type: "trine", level: "major", a: "jupiter", b: "venus", orb: 5.0, applying: true },
    { id: "mid", type: "sextile", level: "major", a: "mercury", b: "mars", orb: 1.2, applying: true },
    { id: "tight", type: "square", level: "major", a: "moon", b: "saturn", orb: 0.4, applying: true },
    { id: "fourth", type: "conjunction", level: "major", a: "sun", b: "pluto", orb: 2.0, applying: true },
  ];
  const hits = tightestApplyingMajors(aspects, 3);
  assert.deepEqual(
    hits.map((h) => h.id),
    ["tight", "mid", "fourth"],
  );
  const helloJson = JSON.parse(
    readFileSync(join(ROOT, "src/lib/i18n/transits-hello.json"), "utf8"),
  );
  const line = helloJson.line.en
    .replaceAll("{aspect}", "square")
    .replaceAll("{body}", "to your Saturn");
  assert.equal(line, "square to your Saturn, getting closer.");
  assert.equal(helloJson.empty.en, "No major aspect getting closer at this moment.");
});

test("transits-ui.json is the source of Quill chrome copy", () => {
  const ui = JSON.parse(readFileSync(join(ROOT, "src/lib/i18n/transits-ui.json"), "utf8"));
  assert.deepEqual(ui.table.columns.en, ["Transit", "Aspect", "Natal", "A", "S", "Exact"]);
  assert.equal(ui.table.columns.en.includes("Type"), false);
  assert.equal(ui.table.columns.en.includes("Orb"), false);
  assert.equal(ui.table.columns.en.includes("Applying"), false);
  assert.equal(ui.table.empty.en, "No moving planet makes a major aspect to your chart at this moment.");
  assert.equal(ui.noNatal.en, "Cast a birth chart first.");
  assert.equal(ui.readingEmpty.en, "Tap a transit, a natal body, or an aspect in the wheel.");
  assert.equal(ui.clock.now.en, "Now");
  assert.equal(ui.clock.date.en, "Date");
  assert.equal(ui.clock.time.en, "Time");
  assert.equal(ui.table.applying.en, "Applying");
  assert.equal(ui.table.separating.en, "Separating");
});

test("a past-exact stationary transit cannot be tagged applying", () => {
  // Slow/stationary body: linear dt would still call this applying, but the
  // locked pole already perfected — Exact is behind, residual growing on that pass.
  const days = findExactDays({
    lonAt: (d) => ({ lon: wrap360(90.4 + 0.002 * d), speed: 0.002 }),
    natalLon: 0,
    target: 90,
    applying: true,
    maxDays: 400,
  });
  assert.ok(days != null, "expected a locked exact");
  assert.ok(days < 0, `exact should be in the past, got ${days}`);
  assert.equal(applyingFromExactDays(days, true), false);
  assert.equal(applyingFromExactDays(-12.5, true), false);
  assert.equal(applyingFromExactDays(12.5, false), true);
  assert.equal(applyingFromExactDays(null, true), false);
});

test("wide Pluto–MC / Pluto–IC hits are not major table rows", () => {
  const wide = {
    id: "tpluto_trine_midheaven",
    type: "trine",
    label: "trine",
    level: "major",
    a: "pluto",
    b: "midheaven",
    aName: "Pluto",
    bName: "MC",
    orb: 29.5,
    applying: true,
  };
  assert.equal(isTransitTablePair(wide), false);
  assert.equal(
    isTransitTablePair({ ...wide, type: "sextile", b: "ic", bName: "IC", orb: 29.5 }),
    false,
  );
});

test("table membership uses ids + recomputed residual, not labels or stored orb", () => {
  // 14:30 Paris MC / IC vs transit Pluto on 2026-08-27 (Swiss, frozen).
  const movingLon = 303.596555;
  const mc1430 = 93.105583;
  const ic1430 = 273.105583;
  assert.ok(residualForType(movingLon, mc1430, "trine") > 6, "14:30 Pluto–MC trine is out of 6°");
  assert.ok(residualForType(movingLon, ic1430, "sextile") > 4, "14:30 Pluto–IC sextile is out of 4°");

  const lying = {
    id: "tpluto_trine_midheaven",
    type: "trine",
    label: "trine",
    level: "major",
    a: "pluto",
    b: "midheaven",
    aName: "MC",
    bName: "MC",
    orb: 1.1,
    applying: false,
  };
  assert.equal(
    isTransitTablePair(lying, { movingLon, natalLon: mc1430 }),
    false,
    "lying stored orb cannot keep an out-of-orb Pluto trine MC",
  );
  assert.equal(
    isTransitTablePair(
      { ...lying, id: "tpluto_sextile_ic", type: "sextile", b: "ic", orb: 0.4 },
      { movingLon, natalLon: ic1430 },
    ),
    false,
    "lying stored orb cannot keep an out-of-orb Pluto sextile IC",
  );

  // 12:00 Paris: Swiss residual ~5.55°. Planet-to-angle trine 6° keeps MC; sextile 4° drops IC.
  const mcNoon = 58.0385;
  const icNoon = 238.0385;
  const noonTrine = residualForType(movingLon, mcNoon, "trine");
  const noonSextile = residualForType(movingLon, icNoon, "sextile");
  assert.ok(noonTrine <= 6 && noonTrine > 5, `noon Pluto–MC trine ${noonTrine}`);
  assert.ok(noonSextile > 4 && noonSextile < 6, `noon Pluto–IC sextile ${noonSextile}`);
  assert.equal(
    isTransitTablePair(
      { ...lying, orb: noonTrine },
      { movingLon, natalLon: mcNoon },
    ),
    true,
    "in-orb noon Pluto trine MC must remain a table row",
  );
  assert.equal(
    isTransitTablePair(
      { ...lying, id: "tpluto_sextile_ic", type: "sextile", b: "ic", orb: noonSextile },
      { movingLon, natalLon: icNoon },
    ),
    false,
    "noon Pluto sextile IC at ~5.55° is outside 4° and must not be a row",
  );
  assert.equal(transitRowTestId(lying), "transit-row-tpluto_trine_midheaven");
  assert.equal(
    transitRowTestId({ a: "pluto", type: "sextile", b: "ic" }),
    "transit-row-tpluto_sextile_ic",
  );
});

test("transit-to-natal applying uses moving speed only", () => {
  const moving = [placement("moon", 0, 13)];
  const natal = [placement("saturn", 92, 0)];
  const aspects = computeCrossAspects(moving, natal);
  const square = aspects.find((a) => a.type === "square");
  assert.ok(square);
  assert.equal(square.applying, true);
  assert.equal(square.a, "moon");
  assert.equal(square.b, "saturn");
});

test("Paris natal + 2026-08-27 12:00 UTC transits match Swiss to 1′", async () => {
  const natal = await calculateNatal({ ...PARIS, date: "1990-06-15", time: "14:30" });
  assert.equal(natal.meta.ephemeris, "swiss");
  assert.equal(natal.meta.zodiac, "tropical");
  assert.equal(natal.meta.lilith, "true");

  const utc = new Date(TRANSIT_UTC);
  const sky = await calculateTransits({
    utc,
    latitude: natal.meta.latitude,
    longitude: natal.meta.longitude,
    natalCusps: natal.houses.map((h) => h.ecliptic),
    natalBodies: [
      ...natal.planets.map((p) => ({ id: p.id, name: p.name, ecliptic: p.ecliptic })),
      ...Object.values(natal.angles).map((a) => ({ id: a.id, name: a.name, ecliptic: a.ecliptic })),
    ],
  });

  assert.match(sky.meta.utc, /^2026-08-27T12:00:00Z$/);
  assert.equal(sky.planets.length > 10, true);

  for (const p of sky.planets) {
    if (p.id === "vertex") continue;
    assert.ok(Number.isFinite(p.speed), `${p.id} missing speed`);
    const flags = motionFlags(p.id, p.speed ?? 0);
    assert.equal(p.retrograde, flags.retrograde, `${p.id} rx`);
    assert.equal(Boolean(p.stationary), flags.stationary, `${p.id} sta`);
    assert.equal(Boolean(p.fast), flags.fast, `${p.id} fast`);
    if (flags.stationary) {
      assert.ok(Math.abs(p.speed) < STATION_SPEED[p.id], `${p.id} station speed`);
    }
  }

  const majors = sky.aspects.filter((a) => isTransitTablePair(a));
  assert.ok(majors.length > 0, "expected major transit-to-natal aspects");
  for (const a of majors) {
    assert.ok(a.applying === true || a.applying === false || a.applying === null, a.id);
    const moving = sky.planets.find((p) => p.id === a.a);
    const natalP =
      a.b in natal.angles
        ? natal.angles[a.b]
        : natal.planets.find((p) => p.id === a.b);
    assert.ok(moving && natalP, `bodies for ${a.id}`);
    const recomputed = computeCrossAspects([moving], [natalP]).find((x) => x.type === a.type);
    assert.ok(recomputed, `recompute ${a.id}`);
    assert.ok(
      Math.abs(recomputed.orb - a.orb) < 1 / 60,
      `${a.id} orb ${a.orb} vs ${recomputed.orb}`,
    );
    if (a.exactUtc && new Date(a.exactUtc).getTime() < utc.getTime() - 120_000) {
      assert.notEqual(a.applying, true, `${a.id} past exact still applying`);
    }
    if (a.applying === true) {
      assert.ok(a.exactUtc, `${a.id} applying with missing Exact`);
    }
  }

  const withExact = majors.filter((a) => a.exactUtc);
  assert.ok(withExact.length > 0, "expected Swiss exact dates");

  const forbiddenIds = ["tpluto_trine_midheaven", "tpluto_sextile_ic"];
  for (const id of forbiddenIds) {
    assert.equal(
      majors.some((x) => x.id === id || transitRowTestId(x) === `transit-row-${id}`),
      false,
      `${id} must not be a table row at 14:30 (Swiss residual ~29.5°)`,
    );
  }
  assert.equal(
    majors.some((x) => x.a === "pluto" && x.type === "trine" && x.b === "midheaven"),
    false,
    "14:30: Pluto trine MC is ~29.5° and must not be a table row",
  );
  assert.equal(
    majors.some((x) => x.a === "pluto" && x.type === "sextile" && x.b === "ic"),
    false,
    "14:30: Pluto sextile IC is ~29.5° and must not be a table row",
  );
  for (const a of majors) {
    if (a.applying === true) {
      assert.ok(a.exactUtc, `${a.id} applying with missing Exact`);
    }
  }
  const chironSaturn = majors.find((x) => x.a === "chiron" && x.type === "square" && x.b === "saturn");
  assert.ok(chironSaturn, "expected Chiron square Saturn on the demo natal");
  assert.notEqual(chironSaturn.applying, true, "Chiron square Saturn must not be A without a future Exact");
  if (chironSaturn.exactUtc && new Date(chironSaturn.exactUtc).getTime() < utc.getTime() - 120_000) {
    assert.equal(chironSaturn.applying, false);
  }

  const sample = withExact
    .filter((a) => a.a === "moon" || a.a === "sun" || a.a === "mars")
    .slice(0, 4);
  assert.ok(sample.length > 0, "need a personal-planet exact to verify");

  for (const a of sample) {
    const exact = new Date(a.exactUtc);
    assert.ok(Number.isFinite(exact.getTime()), a.id);
    if (a.applying === true) assert.ok(exact.getTime() >= utc.getTime() - 120_000, `${a.id} applying should be future`);
    if (a.applying === false) assert.ok(exact.getTime() <= utc.getTime() + 120_000, `${a.id} separating should be past`);

    const skyExact = await calculateTransits({
      utc: exact,
      latitude: natal.meta.latitude,
      longitude: natal.meta.longitude,
      natalCusps: natal.houses.map((h) => h.ecliptic),
      natalBodies: [
        ...natal.planets.map((p) => ({ id: p.id, name: p.name, ecliptic: p.ecliptic })),
        ...Object.values(natal.angles).map((a) => ({ id: a.id, name: a.name, ecliptic: a.ecliptic })),
      ],
    });
    const pair = skyExact.aspects.find((x) => x.a === a.a && x.b === a.b && x.type === a.type);
    assert.ok(pair, `missing ${a.id} at exact`);
    assert.ok(
      pair.orb <= 1 / 60 + 1e-6,
      `${a.id} at ${a.exactUtc} orb ${pair.orb}° (${(pair.orb * 60).toFixed(3)}′)`,
    );
  }

  const sun = sky.planets.find((p) => p.id === "sun");
  const moon = sky.planets.find((p) => p.id === "moon");
  const nn = sky.planets.find((p) => p.id === "northnode");
  const sn = sky.planets.find((p) => p.id === "southnode");
  const lilith = sky.planets.find((p) => p.id === "lilith");
  assert.ok(sun && moon && nn && sn && lilith);
  assert.ok(minutesApart(sn.ecliptic, wrap360(nn.ecliptic + 180)) < 0.01);
  assert.equal(lilith.name, "True Lilith");

  // Frozen tropical longitudes, SEFLG_SWIEPH, 2026-08-27 12:00:00 UTC.
  const FROZEN = {
    sun: 154.246083,
    moon: 326.279888,
    mercury: 154.035519,
    venus: 199.458514,
    mars: 100.524986,
    jupiter: 132.748016,
    saturn: 13.920985,
    uranus: 65.609908,
    neptune: 3.773309,
    pluto: 303.596555,
    northnode: 329.841664,
    lilith: 259.10167,
  };
  for (const [id, lon] of Object.entries(FROZEN)) {
    const body = sky.planets.find((p) => p.id === id);
    assert.ok(body, `missing ${id}`);
    assert.ok(
      minutesApart(body.ecliptic, lon) <= 1 + 1e-6,
      `${id}: ${body.ecliptic} vs ${lon} (${minutesApart(body.ecliptic, lon).toFixed(3)}′)`,
    );
  }

  const hello = tightestApplyingMajors(sky.aspects, 3);
  assert.equal(hello.length > 0, true);
  assert.ok(hello.every((a) => a.applying === true && a.level === "major" && a.exactUtc));
  for (let i = 1; i < hello.length; i += 1) {
    assert.ok(hello[i].orb >= hello[i - 1].orb);
  }

  const evening = await calculateTransits({
    utc: new Date("2026-08-27T20:00:00.000Z"),
    latitude: natal.meta.latitude,
    longitude: natal.meta.longitude,
    natalCusps: natal.houses.map((h) => h.ecliptic),
    natalBodies: [
      ...natal.planets.map((p) => ({ id: p.id, name: p.name, ecliptic: p.ecliptic })),
      ...Object.values(natal.angles).map((a) => ({ id: a.id, name: a.name, ecliptic: a.ecliptic })),
    ],
  });
  const eveningMajors = evening.aspects.filter((a) => isTransitTablePair(a));
  assert.equal(
    eveningMajors.some((x) => x.a === "pluto" && x.type === "trine" && x.b === "midheaven"),
    false,
    "evening: Pluto trine MC must not be a table row",
  );
  assert.equal(
    eveningMajors.some((x) => x.a === "pluto" && x.type === "sextile" && x.b === "ic"),
    false,
    "evening: Pluto sextile IC must not be a table row",
  );
  for (const a of eveningMajors) {
    if (a.applying === true) assert.ok(a.exactUtc, `evening ${a.id} applying with missing Exact`);
  }
});

test("planet-to-angle majors use 6° trine and 4° sextile", () => {
  const base = {
    id: "tpluto_trine_midheaven",
    type: "trine",
    label: "trine",
    level: "major",
    a: "pluto",
    b: "midheaven",
    aName: "Pluto",
    bName: "MC",
    applying: false,
  };
  assert.equal(isTransitTablePair({ ...base, orb: 5.6 }), true, "5.6° Pluto trine MC stays");
  assert.equal(isTransitTablePair({ ...base, orb: 6.01 }), false, "6.01° Pluto trine MC drops");
  assert.equal(
    isTransitTablePair({ ...base, id: "tpluto_sextile_ic", type: "sextile", b: "ic", orb: 5.6 }),
    false,
    "5.6° Pluto sextile IC is outside 4°",
  );
  assert.equal(
    isTransitTablePair({ ...base, id: "tpluto_sextile_ic", type: "sextile", b: "ic", orb: 4 }),
    true,
    "4.0° Pluto sextile IC stays",
  );
  assert.equal(
    isTransitTablePair({ ...base, type: "trine", b: "sun", bName: "Sun", orb: 7.5 }),
    true,
    "planet–planet trine keeps 8°",
  );
  assert.equal(
    isTransitTablePair({ ...base, type: "sextile", b: "venus", bName: "Venus", orb: 5.6 }),
    true,
    "planet–planet sextile keeps 6°",
  );
});

test("transit houses follow the natal house system", async () => {
  const natal = await calculateNatal({ ...PARIS, date: "1990-06-15", time: "12:00", houseSystem: "koch" });
  assert.equal(natal.meta.houseSystem, "koch");

  const sky = await calculateTransits({
    utc: new Date(TRANSIT_UTC),
    latitude: natal.meta.latitude,
    longitude: natal.meta.longitude,
    natalCusps: natal.houses.map((h) => h.ecliptic),
    natalBodies: natal.planets.map((p) => ({ id: p.id, name: p.name, ecliptic: p.ecliptic })),
    houseSystem: natal.meta.houseSystem,
  });
  assert.equal(sky.meta.houseSystem, "koch", "the transit pass must not silently re-lock to Placidus");

  // Transit bodies are housed against the natal cusps that were handed in.
  const cusps = natal.houses.map((h) => h.ecliptic);
  for (const p of sky.planets) {
    assert.equal(p.house, houseFromCusps(p.ecliptic, cusps), `${p.id} house`);
  }

  // Omitting the system keeps the historical Placidus default.
  const fallback = await calculateTransits({
    utc: new Date(TRANSIT_UTC),
    latitude: natal.meta.latitude,
    longitude: natal.meta.longitude,
    natalCusps: cusps,
    natalBodies: natal.planets.map((p) => ({ id: p.id, name: p.name, ecliptic: p.ecliptic })),
  });
  assert.equal(fallback.meta.houseSystem, "placidus");
});

test("a polar natal can still cast transits instead of throwing on Placidus", async () => {
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

  // Before Step 1 this call hardcoded swe_houses(..., "P") and threw at 69.6°N,
  // taking the whole transit cast down with it.
  const sky = await calculateTransits({
    utc: new Date(TRANSIT_UTC),
    latitude: natal.meta.latitude,
    longitude: natal.meta.longitude,
    natalCusps: natal.houses.map((h) => h.ecliptic),
    natalBodies: natal.planets.map((p) => ({ id: p.id, name: p.name, ecliptic: p.ecliptic })),
    houseSystem: "placidus",
  });
  assert.equal(sky.meta.houseSystem, "porphyry");
  const vertex = sky.planets.find((p) => p.id === "vertex");
  assert.ok(vertex && Number.isFinite(vertex.ecliptic), "polar transit Vertex must resolve");

  // Same sky as anywhere else at that instant.
  assert.ok(minutesApart(sky.planets.find((p) => p.id === "sun").ecliptic, 154.246083) <= 1 + 1e-6);
});

test("noon Paris natal keeps Pluto trine MC and drops Pluto sextile IC", async () => {
  const natal = await calculateNatal({ ...PARIS, date: "1990-06-15", time: "12:00" });
  const utc = new Date(TRANSIT_UTC);
  const sky = await calculateTransits({
    utc,
    latitude: natal.meta.latitude,
    longitude: natal.meta.longitude,
    natalCusps: natal.houses.map((h) => h.ecliptic),
    natalBodies: [
      ...natal.planets.map((p) => ({ id: p.id, name: p.name, ecliptic: p.ecliptic })),
      ...Object.values(natal.angles).map((a) => ({ id: a.id, name: a.name, ecliptic: a.ecliptic })),
    ],
  });
  const pluto = sky.planets.find((p) => p.id === "pluto");
  assert.ok(pluto);
  const mcTrine = residualForType(pluto.ecliptic, natal.angles.midheaven.ecliptic, "trine");
  const icSext = residualForType(pluto.ecliptic, natal.angles.ic.ecliptic, "sextile");
  assert.ok(mcTrine <= 6, `noon Pluto–MC trine ${mcTrine} must be inside 6°`);
  assert.ok(icSext > 4, `noon Pluto–IC sextile ${icSext} must be outside 4°`);
  assert.ok(Math.abs(mcTrine - 5.55) < 0.15, `noon Pluto–MC trine ${mcTrine} expected ~5.55°`);

  const majors = sky.aspects.filter((a) => isTransitTablePair(a));
  const trineMc = majors.find((x) => x.a === "pluto" && x.type === "trine" && x.b === "midheaven");
  const sextileIc = majors.find((x) => x.a === "pluto" && x.type === "sextile" && x.b === "ic");
  assert.ok(trineMc, "5.6° Pluto trine MC must stay a table row");
  assert.equal(Boolean(sextileIc), false, "5.6° Pluto sextile IC must not be a table row");
  assert.ok(Math.abs(trineMc.orb - mcTrine) < 1 / 60, `UI orb ${trineMc.orb} vs Swiss ${mcTrine}`);
});
