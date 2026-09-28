/*
 * The readings in the table's notation (part 48b of the launch plan): orbs
 * in degrees and minutes, never decimals; without a birth time, what hangs
 * on the hour says so first and its facts are marked ~.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateNatal } from "../src/lib/chart/calculate.server.ts";
import { buildCompositeDossier, buildDossier } from "../src/lib/chart/interpret-local.ts";
import { chartSummaryText } from "../src/lib/export/chart-summary.ts";

const TRACE = {
  name: "TraceQA",
  date: "1990-06-15",
  time: "12:00",
  latitude: 48.8566,
  longitude: 2.3522,
  placeLabel: "Paris, France",
  houseSystem: "placidus",
};

function allText(dossier) {
  return Object.values(dossier.byId)
    .flatMap((r) => [
      r.kicker ?? "",
      r.note ?? "",
      r.lead ?? "",
      ...(r.paragraphs ?? []),
      ...(r.facts ?? []).map((f) => `${f.label} ${f.value}`),
      ...(r.sections ?? []).flatMap((s) => s.paragraphs),
      ...(r.links?.rows ?? []).map((row) => `${row.label} ${row.detail ?? ""}`),
    ])
    .join("\n");
}

test("orbs in the readings and the summary are in degrees and minutes, in English and French", async () => {
  const chart = await calculateNatal(TRACE);
  for (const locale of ["en", "fr"]) {
    const text = allText(buildDossier(chart, locale));
    assert.doesNotMatch(text, /\d[.,]\d+ ?°/, `${locale}: a decimal degree in the readings`);
    assert.match(text, /\b0°11'/, `${locale}: Jupiter–Chiron's orb 0°11'`);
    const summary = chartSummaryText(chart, locale);
    assert.doesNotMatch(summary, /\d[.,]\d+ ?°/, `${locale}: a decimal degree in the summary`);
  }
});

test("without a birth time, the readings that hang on the hour say so first and mark their facts", async () => {
  const known = buildDossier(await calculateNatal(TRACE), "en");
  assert.ok(
    Object.values(known.byId).every((r) => !(r.sections ?? []).some((s) => s.id === "time")),
    "a chart with its birth time has no such note",
  );
  const chart = await calculateNatal({ ...TRACE, timeUnknown: true });
  const d = buildDossier(chart, "en");
  const time = (id) => (d.byId[id].sections ?? []).find((s) => s.id === "time");
  const fact = (id, label) => d.byId[id].facts.find((f) => f.label === label)?.value;

  // The Ascendant goes round every sign in a day.
  assert.match(time("angle:ascendant").paragraphs[0], /The Ascendant goes round every sign in a day/);
  assert.equal(d.byId["angle:ascendant"].sections[0].id, "time");
  assert.equal(fact("angle:ascendant", "Sign"), "~5°09' Virgo");
  assert.equal(fact("angle:ascendant", "Ruler"), "~Mercury");
  // Every house.
  for (let h = 1; h <= 12; h += 1) assert.ok(time(`house:${h}`), `house ${h}`);
  // A body keeps its sign but not its house; the Moon moves 13°20' that day.
  assert.equal(fact("planet:jupiter", "House"), "~11");
  assert.equal(fact("planet:jupiter", "Sign"), "15°52' Cancer");
  assert.match(time("planet:moon").paragraphs[0], /The Moon moves 13°20' that day, from 7°37' Pisces to 20°57' Pisces/);
  assert.match(d.byId["planet:moon"].kicker, /^~14°15' Pisces .* ~Seventh house/);
  // The lots hang on the hour.
  assert.match(time("planet:fortune").paragraphs[0], /The Lot of Fortune depends on the hour of birth/);
  // An aspect that holds all day carries no note; one that may not, does.
  const jc = chart.aspects.find((a) => a.a === "jupiter" && a.b === "chiron");
  assert.equal(time(`aspect:${jc.id}`), undefined);
  const mn = chart.aspects.find((a) => a.a === "moon" && a.b === "neptune");
  assert.ok(time(`aspect:${mn.id}`), "the Moon's sextile to Neptune perfects that day");
  // French.
  const fr = buildDossier(chart, "fr");
  assert.match((fr.byId["angle:ascendant"].sections ?? [])[0].paragraphs[0], /L’Ascendant fait le tour des signes en une journée/);
  // A composite keeps its own wording.
  const composite = buildCompositeDossier(chart, "en");
  assert.ok(Object.values(composite.byId).every((r) => !(r.sections ?? []).some((s) => s.id === "time")));
});
