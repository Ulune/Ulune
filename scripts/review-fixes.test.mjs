/**
 * The review of 3 Oct 2026 (bugs P5, T2): a composite's Mercury and Venus keep
 * to the composite Sun's side, its declinations match its positions, and a
 * void of course that ends on another day says which.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateNatal } from "../src/lib/chart/calculate.server.ts";
import { buildComposite, declinationOfPoint } from "../src/lib/chart/composite.ts";
import { sep180 } from "../src/lib/chart/anatomy.ts";
import { skyEventTitle } from "../src/lib/i18n/calendar-words.ts";

const CAMILLE = { name: "Camille Marie Laurent", placeLabel: "Paris", date: "1990-06-15", time: "12:00", latitude: 48.8566, longitude: 2.3522 };
const YOLANDA = { name: "Yolanda Mary Kyle", placeLabel: "Lyon", date: "1984-11-29", time: "07:45", latitude: 45.764, longitude: 4.8357 };

test("a composite's Mercury and Venus stay on its Sun's side", async () => {
  const a = await calculateNatal(CAMILLE);
  const b = await calculateNatal(YOLANDA);
  for (const [x, y] of [[a, b], [b, a]]) {
    const c = buildComposite(x, y);
    const sun = c.planets.find((p) => p.id === "sun");
    for (const id of ["mercury", "venus"]) {
      const p = c.planets.find((q) => q.id === id);
      assert.ok(sep180(p.ecliptic, sun.ecliptic) <= 90, `${id} ${p.ecliptic} vs Sun ${sun.ecliptic}`);
    }
    // No aspect between the Sun and Mercury or Venus wider than a real sky allows.
    for (const asp of c.aspects) {
      const pair = [asp.a, asp.b].sort().join("-");
      if (pair === "mercury-sun" || pair === "sun-venus") assert.ok(["conjunction", "semisextile", "semisquare"].includes(asp.type), `${pair} ${asp.type}`);
    }
  }
});

test("a composite point's declination is its own, from its position", async () => {
  const a = await calculateNatal(CAMILLE);
  const b = await calculateNatal(YOLANDA);
  const c = buildComposite(a, b);
  const obliquity = (a.meta.obliquity + b.meta.obliquity) / 2;
  for (const p of c.planets) {
    if (p.declination == null) continue;
    assert.ok(Math.abs(p.declination - declinationOfPoint(p.ecliptic, p.latitude ?? 0, obliquity)) < 1e-9, p.id);
  }
  // 0° Cancer on the ecliptic is the obliquity north.
  assert.ok(Math.abs(declinationOfPoint(90, 0, 23.44) - 23.44) < 1e-9);
});

test("a void of course ending on another day says which day", () => {
  const t = Date.UTC(2026, 9, 3, 15, 8);
  const end = Date.UTC(2026, 9, 4, 22, 54);
  const ev = { k: "void", t, end, last: null };
  const time = (ms) => new Date(ms).toISOString().slice(11, 16);
  const day = (ms) => new Date(ms).toISOString().slice(0, 10);
  assert.equal(skyEventTitle(ev, "en", time, day), "Moon void of course until 2026-10-04, 22:54");
  assert.equal(skyEventTitle(ev, "fr", time, day), "Lune vide de course jusqu’à 2026-10-04 à 22:54");
  assert.equal(skyEventTitle({ ...ev, end: t + 3_600_000 }, "en", time, day), "Moon void of course until 16:08");
});
