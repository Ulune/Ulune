/**
 * The review of 3 Oct 2026, readings (R1, R4): a transit said as it is felt,
 * with when it is exact and about how long it is within a degree; a natal
 * planet names its Human Design gate, and links there.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateNatal } from "../src/lib/chart/calculate.server.ts";
import { buildDossier } from "../src/lib/chart/interpret-local.ts";
import { transitWhen } from "../src/lib/chart/interpret-transit.ts";
import { inOrbSpan } from "../src/lib/chart/transit-exact.ts";
import { eclipticToGate } from "../src/lib/chart/human-design.ts";
import { transitLinkPhrase } from "../src/lib/i18n/astro.ts";

const CAMILLE = { name: "Camille Marie Laurent", placeLabel: "Paris", date: "1990-06-15", time: "12:00", latitude: 48.8566, longitude: 2.3522 };

test("a transit is said as it is felt, in both languages", () => {
  assert.equal(transitLinkPhrase("venus", "sextile", "uranus", "en"), "Venus sextile your Uranus");
  assert.equal(transitLinkPhrase("sun", "opposition", "mars", "en"), "Sun opposite your Mars");
  assert.equal(transitLinkPhrase("mars", "conjunction", "sun", "en"), "Mars conjunct your Sun");
  assert.equal(transitLinkPhrase("venus", "sextile", "uranus", "fr"), "Vénus en sextile à votre Uranus");
  assert.equal(transitLinkPhrase("mars", "conjunction", "sun", "fr"), "Mars en conjonction avec votre Soleil");
});

test("the in-orb span follows the moving body's speed, and stays quiet near a station", () => {
  const exact = "2026-10-05T12:00:00Z";
  const sun = inOrbSpan(exact, 1, 1);
  assert.equal(sun.to - sun.from, 2 * 86_400_000);
  assert.equal(inOrbSpan(exact, 0.001, 1), null);
  assert.equal(inOrbSpan(exact, 0.005, 1), null);
  assert.equal(inOrbSpan(null, 1, 1), null);
});

test("a transit's card says when it is exact and for how long it is within a degree", () => {
  const link = { id: "t", a: "sun", b: "mars", type: "opposition", orb: 0.3, applying: true, level: "major", exactUtc: "2026-10-05T14:20:30Z" };
  const en = transitWhen(link, 0.99, "en");
  assert.match(en.exact, /5 Oct 2026, 14:20 UT/);
  assert.match(en.sentence, /^Exact on 5 Oct 2026, 14:20 UT; within 1° from about 4 Oct to 6 Oct\.$/);
  const fr = transitWhen(link, 0.99, "fr");
  assert.match(fr.sentence, /^Exact le 5 oct\. 2026,? 14:20 UT/);
  const moon = transitWhen({ ...link, a: "moon" }, 13, "en");
  assert.match(moon.sentence, /within 1° for about 4 hours\.$/);
  assert.equal(transitWhen({ ...link, exactUtc: null }, 1, "en"), null);
});

test("a natal planet names its Human Design gate and opens it there", async () => {
  const chart = await calculateNatal(CAMILLE);
  const dossier = buildDossier(chart, "en");
  const sun = chart.planets.find((p) => p.id === "sun");
  const { gate, line } = eclipticToGate(sun.ecliptic);
  const fact = dossier.byId["planet:sun"].facts.find((f) => f.label === "Human Design");
  assert.equal(fact.value, `Gate ${gate}.${line}`);
  assert.equal(fact.ref, "go:design:act:personality:sun");
  // The nodes and points are left to the bodygraph's own.
  for (const id of ["northnode", "chiron", "fortune"]) {
    const r = dossier.byId[`planet:${id}`];
    if (r) assert.equal(r.facts.some((f) => f.label === "Human Design"), false, id);
  }
});
