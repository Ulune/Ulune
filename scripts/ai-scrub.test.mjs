import assert from "node:assert/strict";
import { test } from "node:test";
import { hideWords, holdsHidden, personalWords } from "../src/lib/ai/scrub.ts";

/** A chart as far as the scrub reads it: its name and its birthplace. */
const chart = (name, placeLabel) => ({ meta: { name, placeLabel } });

test("An AI never reads a chart's names: numerology's full name at birth and name used now included (part 64)", () => {
  const charts = [chart("Camille Laurent", "Paris, Île-de-France, France"), chart("Sample B", "Oslo, Norway")];
  const hidden = personalWords(charts, "en", [["  Camille  Marie Laurent ", "Camille Durand"], undefined]);
  const as = (text) => hidden.find((h) => h.text === text)?.as;
  assert.equal(as("Camille Marie Laurent"), "Person A");
  assert.equal(as("Marie"), "Person A");
  assert.equal(as("Durand"), "Person A");
  assert.equal(as("Sample B"), "Person B");
  // Longest first, so a whole name goes before its words.
  for (let i = 1; i < hidden.length; i += 1) assert.ok(hidden[i - 1].text.length >= hidden[i].text.length);
  const text = "The letters of Camille Marie Laurent, and the minor numbers of Camille Durand; Sample B was born in Oslo.";
  const out = hideWords(text, hidden);
  assert.equal(out, "The letters of Person A, and the minor numbers of Person A; Person B was born in the birthplace.");
  assert.equal(holdsHidden(out, hidden), false);
  // In French, and with no names given, as before.
  assert.equal(personalWords(charts, "fr", [["Camille Marie Laurent"]]).find((h) => h.text === "Marie")?.as, "Personne A");
  assert.deepEqual(
    personalWords(charts, "en").map((h) => h.text),
    personalWords(charts, "en", [[null, ""], [undefined]]).map((h) => h.text),
  );
});
