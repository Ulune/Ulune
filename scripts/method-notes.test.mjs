// A chart says when its method changed (src/lib/chart/method-notes.ts):
// polar houses, the Moshier fallback, a body or a star left out; in the
// reader's language, and nothing for a usual cast.
import assert from "node:assert/strict";
import { test } from "node:test";
import { methodNotes } from "../src/lib/chart/method-notes.ts";
import { translate } from "../src/lib/i18n/messages.ts";

const notes = (meta, locale = "en") => methodNotes(meta, (k, v) => translate(locale, k, v), locale);

test("a usual cast has no note", () => {
  assert.deepEqual(notes({ houseSystem: "placidus" }), []);
  assert.deepEqual(notes(null), []);
});

test("polar houses name both systems", () => {
  const [note] = notes({ houseSystem: "porphyry", houseSystemRequested: "placidus" });
  assert.equal(note, "Houses in Porphyry: Placidus has no cusps inside the polar circles.");
  const [fr] = notes({ houseSystem: "porphyry", houseSystemRequested: "koch" }, "fr");
  assert.match(fr, /^Maisons en .+\u202f: Koch n’a pas de cuspides/);
});

test("the engine's codes, and the sentences of charts kept before them", () => {
  assert.deepEqual(notes({ warnings: ["W:moshier", "W:body.skipped|chiron", "W:star.unplaced|algol"] }), [
    "Positions from the Moshier approximation, within about 1″: no Swiss Ephemeris file covers this date.",
    "Without Chiron: its ephemeris file doesn’t cover this date.",
    "Without Algol: the star couldn’t be placed.",
  ]);
  assert.deepEqual(
    notes({
      warnings: [
        "No Swiss Ephemeris file covers this date, so positions come from the Moshier approximation …",
        "Eris could not be placed and was left out (file not found).",
        "Regulus could not be placed (not found).",
        "Something no one wrote a note for.",
      ],
    }),
    [
      "Positions from the Moshier approximation, within about 1″: no Swiss Ephemeris file covers this date.",
      "Without Eris: its ephemeris file doesn’t cover this date.",
      "Without Regulus: the star couldn’t be placed.",
    ],
  );
});

test("each note once", () => {
  assert.equal(notes({ warnings: ["W:moshier", "W:moshier"] }).length, 1);
});
