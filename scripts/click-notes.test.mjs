import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyClickNote,
  clickAtomIdForTarget,
  clickNote,
  CLICK_ATOM_IDS,
  CLICK_NOTES,
} from "../src/lib/i18n/click-notes.ts";

const LOCKED_IDS = [
  "jupiter",
  "mars",
  "mercury",
  "moon",
  "neptune",
  "pluto",
  "saturn",
  "sun",
  "uranus",
  "venus",
  "sign.aquarius",
  "sign.aries",
  "sign.cancer",
  "sign.capricorn",
  "sign.gemini",
  "sign.leo",
  "sign.libra",
  "sign.pisces",
  "sign.sagittarius",
  "sign.scorpio",
  "sign.taurus",
  "sign.virgo",
  "house.1",
  "house.10",
  "house.11",
  "house.12",
  "house.2",
  "house.3",
  "house.4",
  "house.5",
  "house.6",
  "house.7",
  "house.8",
  "house.9",
  "antivertex",
  "ascendant",
  "chiron",
  "descendant",
  "fortune",
  "ic",
  "lilith",
  "midheaven",
  "northnode",
  "southnode",
  "spirit",
  "vertex",
  "aspect.conjunction",
  "aspect.opposition",
  "aspect.sextile",
  "aspect.square",
  "aspect.trine",
  "ceres",
  "pallas",
  "eris",
  "juno",
  "sedna",
  "vesta",
];

test("click notes cover all 57 atoms with 2–4 sentences, from the content modules", () => {
  const raw = CLICK_NOTES;
  assert.equal(raw.id, "natal.click-notes");
  assert.equal(Object.keys(raw.atoms).length, 57);
  assert.deepEqual(Object.keys(raw.atoms).sort(), [...LOCKED_IDS].sort());
  assert.deepEqual([...CLICK_ATOM_IDS].sort(), [...LOCKED_IDS].sort());
  for (const id of LOCKED_IDS) {
    const atom = raw.atoms[id];
    assert.ok(atom, id);
    for (const lang of ["en", "fr"]) {
      assert.equal(typeof atom[lang], "string", `${id} ${lang}`);
      const sentences = atom[lang].split(/(?<=[.!?])\s+/).filter(Boolean);
      assert.ok(sentences.length >= 2 && sentences.length <= 4, `${id} ${lang} has ${sentences.length} sentences`);
      assert.equal(/\w'\w/.test(atom[lang]), false, `${id} ${lang} straight apostrophe`);
    }
  }
  assert.equal(raw.atoms.sun.en.includes("plot of a life"), false);
});

test("click targets map to click.en; missing atoms stay empty", () => {
  assert.equal(clickAtomIdForTarget("planet:sun"), "sun");
  assert.equal(clickNote("planet:sun"), CLICK_NOTES.atoms.sun.en);
  assert.equal(clickAtomIdForTarget("angle:ascendant"), "ascendant");
  assert.equal(clickNote("angle:midheaven"), CLICK_NOTES.atoms.midheaven.en);
  assert.equal(clickNote("house:12"), CLICK_NOTES.atoms["house.12"].en);
  assert.equal(clickNote("sign:pisces"), CLICK_NOTES.atoms["sign.pisces"].en);
  assert.equal(clickNote("aspect:sun_square_saturn"), CLICK_NOTES.atoms["aspect.square"].en);
  assert.equal(clickNote("aspect:moon_conjunction_venus"), CLICK_NOTES.atoms["aspect.conjunction"].en);
  assert.equal(clickNote("planet:ceres"), CLICK_NOTES.atoms.ceres.en);
  assert.equal(clickNote("planet:chiron"), CLICK_NOTES.atoms.chiron.en);
  assert.equal(clickNote("decan:leo-1"), null);
  assert.equal(clickNote("aspect:sun_quincunx_moon"), null);
  assert.equal(clickNote("aspect:mars_semisquare_saturn"), null);
  const sun = applyClickNote({
    id: "planet:sun",
    kind: "planet",
    title: "Sun",
    kicker: "12° Leo",
    paragraphs: ["The Sun is the plot of a life — pride, vitality, and the person you are trying to become when nobody is steering you."],
  });
  assert.ok(sun);
  assert.deepEqual(sun.paragraphs, [CLICK_NOTES.atoms.sun.en]);
  assert.equal(sun.paragraphs[0].includes("plot of a life"), false);
  assert.equal(
    applyClickNote({
      id: "decan:aries-0",
      kind: "decan",
      title: "Face",
      kicker: "",
      paragraphs: ["invented"],
    }),
    null,
  );
});
