/*
 * French typography in the readings built by code (part 73 of the launch
 * plan): a narrow no-break space before : ; ! ? and inside « », in the
 * natal, composite, transit, progressed and synastry readings. The texts
 * kept as data are checked by the release scripts; these are sentences put
 * together from pieces, where a plain space slips in easily.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateNatal, calculateProgressions, calculateTransits } from "../src/lib/chart/calculate.server.ts";
import { computeCrossAspects } from "../src/lib/chart/anatomy.ts";
import { buildCompositeDossier, buildDossier } from "../src/lib/chart/interpret-local.ts";
import { buildProgressedDossier } from "../src/lib/chart/interpret-progressions.ts";
import { buildSynastryDossier } from "../src/lib/chart/interpret-synastry.ts";
import { buildTransitDossier } from "../src/lib/chart/interpret-transit.ts";

// Made-up people.
const CAMILLE = { name: "Camille Marie Laurent", date: "1990-06-15", time: "12:00", latitude: 48.8566, longitude: 2.3522, placeLabel: "Paris, France", houseSystem: "placidus" };
const YOLANDA = { name: "Yolanda Mary Kyle", date: "1984-11-29", time: "07:45", latitude: 45.764, longitude: 4.8357, placeLabel: "Lyon, France", houseSystem: "placidus" };

function allText(dossier) {
  return Object.values(dossier.byId)
    .flatMap((r) => [
      r.title ?? "",
      r.kicker ?? "",
      r.note ?? "",
      r.lead ?? "",
      ...(r.paragraphs ?? []),
      ...(r.facts ?? []).map((f) => `${f.label} ${f.value}`),
      ...(r.sections ?? []).flatMap((s) => [s.title ?? "", ...s.paragraphs]),
      ...(r.links?.rows ?? []).map((row) => `${row.label} ${row.detail ?? ""}`),
    ])
    .join("\n");
}

function natalBodies(natal) {
  return [
    ...natal.planets.map((p) => ({ id: p.id, name: p.name, ecliptic: p.ecliptic })),
    ...Object.values(natal.angles).map((a) => ({ id: a.id, name: a.name, ecliptic: a.ecliptic })),
  ];
}

/** Every : ; ! ? that ends a phrase has a narrow no-break space before it; « » hold narrow spaces. */
function assertFrenchSpacing(text, what) {
  const bad = [];
  for (const m of text.matchAll(/(.{0,24})(?<![\u202f\d])([:;!?])(?=\s|$)/gmu)) bad.push(`${m[1]}${m[2]}`);
  for (const m of text.matchAll(/(.{0,12})«(?!\u202f)(.{0,12})/gu)) bad.push(`${m[1]}«${m[2]}`);
  for (const m of text.matchAll(/(.{0,12})(?<!\u202f)»/gu)) bad.push(`${m[1]}»`);
  assert.deepEqual(bad.slice(0, 5), [], `${what}: ${bad.length} French punctuation marks without a narrow space`);
}

test("the French readings put a narrow no-break space before : ; ! ? and inside « »", async () => {
  const camille = await calculateNatal(CAMILLE);
  const yolanda = await calculateNatal(YOLANDA);
  assertFrenchSpacing(allText(buildDossier(camille, "fr")), "natal");
  assertFrenchSpacing(allText(buildDossier(await calculateNatal({ ...CAMILLE, timeUnknown: true }), "fr", { unknownTime: true })), "natal, no birth time");
  assertFrenchSpacing(allText(buildCompositeDossier(yolanda, "fr")), "composite");

  const sky = await calculateTransits({
    utc: new Date("2026-09-30T10:00:00Z"),
    latitude: camille.meta.latitude,
    longitude: camille.meta.longitude,
    natalCusps: camille.houses.map((h) => h.ecliptic),
    natalBodies: natalBodies(camille),
    houseSystem: camille.meta.houseSystem,
  });
  assertFrenchSpacing(allText(buildTransitDossier(camille, sky, "fr")), "transits");

  const progressed = await calculateProgressions({
    natalUtc: new Date(camille.meta.utc),
    targetUtc: new Date("2026-09-30T10:00:00Z"),
    latitude: camille.meta.latitude,
    longitude: camille.meta.longitude,
    natalCusps: camille.houses.map((h) => h.ecliptic),
    natalBodies: natalBodies(camille),
    houseSystem: camille.meta.houseSystem,
  });
  assertFrenchSpacing(allText(buildProgressedDossier(camille, progressed, "fr")), "progressions");

  const aspects = computeCrossAspects(camille.planets, yolanda.planets, { idPrefix: "s" });
  assert.ok(aspects.length > 0, "the pair has aspects");
  assertFrenchSpacing(allText(buildSynastryDossier(camille, yolanda, aspects, "fr")), "synastry");
});
