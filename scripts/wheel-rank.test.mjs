import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_ASPECT_FILTER } from "../src/lib/chart/aspect-filter.ts";
import { resolveWheelFocus } from "../src/lib/chart/wheel-focus.ts";
import { houseOfLongitude, orbStrength, rankWheelFocus, rankedIds } from "../src/lib/chart/wheel-rank.ts";

// A small hand-made chart: equal houses from 0° Aries, so house n spans sign n.
const SIGNS = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];
const houses = SIGNS.map((sign, i) => ({ id: i + 1, label: String(i + 1), sign, ecliptic: i * 30, formatted: "" }));
const planet = (id, ecliptic) => ({ id, ecliptic, sign: SIGNS[Math.floor(ecliptic / 30)], house: Math.floor(ecliptic / 30) + 1 });
const planets = [
  planet("sun", 84), // gemini, house 3, decan gemini-2
  planet("moon", 344), // pisces, house 12
  planet("mercury", 65), // gemini, house 3
  planet("venus", 49), // taurus, house 2
  planet("mars", 11), // aries, house 1
  planet("saturn", 294), // capricorn, house 10
];
const asp = (a, type, b, orb, level = "major") => ({ id: `${a}_${type}_${b}`, type, label: type, level, a, b, aName: a, bName: b, orb, applying: null });
const aspects = [
  asp("sun", "square", "moon", 0.4),
  asp("sun", "conjunction", "mercury", 3.8),
  asp("venus", "sextile", "sun", 5.0),
  asp("mars", "sextile", "saturn", 1.0),
];
const chart = { planets, angles: {}, houses, aspects, patterns: {}, stars: [], midpoints: [], meta: {} };
const visible = new Set(planets.map((p) => p.id));
const filter = { ...DEFAULT_ASPECT_FILTER, types: new Set(["conjunction", "square", "sextile", "trine", "opposition"]), maxOrb: 10 };
const ctx = (over = {}) => ({
  chart,
  visible,
  filter,
  bodies: planets.map((p) => ({ id: p.id, sign: p.sign, ecliptic: p.ecliptic })),
  shownPlanets: planets.map((p) => ({ id: p.id, house: p.house })),
  shownStars: [],
  shownMids: [],
  configMembers: null,
  ...over,
});
const rank = (id, c = ctx()) => rankWheelFocus(resolveWheelFocus(id, c), c);

test("orb strength: exact is 1, the tightest is strongest, never below 0.12", () => {
  assert.equal(orbStrength({ orb: 0, level: "major" }), 1);
  assert.ok(orbStrength({ orb: 0.4, level: "major" }) > orbStrength({ orb: 3.8, level: "major" }));
  assert.equal(orbStrength({ orb: 20, level: "major" }), 0.12);
  assert.ok(orbStrength({ orb: 1, level: "minor" }) < orbStrength({ orb: 1, level: "major" }));
});

test("the house that holds a longitude", () => {
  assert.equal(houseOfLongitude(84, houses), 3);
  assert.equal(houseOfLongitude(359.9, houses), 12);
  assert.equal(houseOfLongitude(0, houses), 1);
});

test("the Sun: itself, then its sign, house, decan and aspects (tightest first), then the other ends", () => {
  const r = rank("planet:sun");
  assert.deepEqual(r.bodies.get("sun"), { tier: 0, weight: 1 });
  assert.equal(r.signs.get("gemini").tier, 1);
  assert.equal(r.houses.get(3).tier, 1);
  assert.equal(r.decans.get("gemini-2").tier, 1);
  const a = [...r.aspects.values()].sort((x, y) => x.order - y.order);
  assert.deepEqual(a.map((x) => x.orb), [0.4, 3.8, 5.0]);
  assert.ok(a.every((x) => x.tier === 1));
  assert.ok(a[0].strength > a[1].strength && a[1].strength > a[2].strength);
  // Other ends: tier 2, weighted by how tight their link is.
  assert.equal(r.bodies.get("moon").tier, 2);
  assert.ok(r.bodies.get("moon").weight > r.bodies.get("venus").weight);
  assert.equal(r.signs.get("pisces").tier, 2);
  assert.equal(r.houses.get(12).tier, 2);
  // Mercury shares the Sun's sign and house: those stay tier 1.
  assert.equal(r.bodies.get("mercury").tier, 2);
  assert.equal(r.signs.get("gemini").tier, 1);
  // Mars–Saturn has nothing to do with the Sun.
  assert.equal(r.bodies.has("mars"), false);
  assert.equal(r.aspects.has("mars_sextile_saturn"), false);
  const ids = rankedIds(r);
  assert.equal(ids.get("planet:sun").tier, 0);
  assert.equal(ids.get("sign:gemini").tier, 1);
  assert.equal(ids.get("house:3").tier, 1);
});

test("an aspect: the line itself, then its two bodies, then where they sit", () => {
  const r = rank("aspect:sun_square_moon");
  assert.equal(r.aspects.get("sun_square_moon").tier, 0);
  assert.equal(r.bodies.get("sun").tier, 1);
  assert.equal(r.bodies.get("moon").tier, 1);
  assert.equal(r.signs.get("pisces").tier, 2);
  assert.equal(r.houses.get(3).tier, 2);
});

test("a sign: itself, the bodies in it, then their houses and aspects", () => {
  const r = rank("sign:gemini");
  assert.equal(r.signs.get("gemini").tier, 0);
  assert.equal(r.bodies.get("sun").tier, 1);
  assert.equal(r.bodies.get("mercury").tier, 1);
  assert.equal(r.houses.get(3).tier, 2);
  assert.equal(r.aspects.get("sun_square_moon").tier, 2);
  assert.equal(r.bodies.get("moon").tier, 2);
});

test("a house: itself, the sign on its cusp and the bodies in it", () => {
  const r = rank("house:10");
  assert.equal(r.houses.get(10).tier, 0);
  assert.equal(r.signs.get("capricorn").tier, 1);
  assert.equal(r.bodies.get("saturn").tier, 1);
  assert.equal(r.aspects.get("mars_sextile_saturn").tier, 2);
  assert.equal(r.bodies.get("mars").tier, 2);
});

test("hidden bodies are left out", () => {
  const c = ctx({ visible: new Set(["sun", "mercury", "venus", "mars", "saturn"]) });
  const r = rank("planet:sun", c);
  assert.equal(r.bodies.has("moon"), false);
  assert.equal(r.aspects.has("sun_square_moon"), false);
});

test("an outer body: itself, its sign and natal house, its aspects, then the natal bodies it touches", () => {
  const cross = [{ ...asp("jupiter", "trine", "moon", 1.2), id: "tjupiter_trine_moon" }];
  const outerBodies = [{ id: "jupiter", sign: "cancer", ecliptic: 104 }];
  // The wheel's visibility set is by body id, shared by both rings.
  const c = ctx({ crossAspects: cross, outerBodies, outerKind: "transit", aspectLayer: "cross", visible: new Set([...visible, "jupiter"]) });
  const r = rank("transit:jupiter", c);
  assert.equal(r.partners.get("jupiter").tier, 0);
  assert.equal(r.signs.get("cancer").tier, 1);
  assert.equal(r.houses.get(4).tier, 1);
  assert.equal(r.aspects.get("tjupiter_trine_moon").tier, 1);
  assert.equal(r.aspects.get("tjupiter_trine_moon").source, "cross");
  assert.equal(r.bodies.get("moon").tier, 2);
  assert.equal(r.signs.get("pisces").tier, 2);
});

test("no focus, no ranking", () => {
  const r = rank(null);
  assert.equal(r.bodies.size + r.signs.size + r.houses.size + r.aspects.size, 0);
});
