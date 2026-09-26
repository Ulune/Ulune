import assert from "node:assert/strict";
import { test } from "node:test";
import {
  birthKey,
  hydrateBirthInput,
  unseenRows,
} from "../src/lib/chart/library.ts";

const base = {
  name: "A",
  date: "1990-06-15",
  time: "12:00",
  latitude: 48.8566,
  longitude: 2.3522,
  placeLabel: "Paris",
};

test("birthKey distinguishes house system and unknown time", () => {
  const a = birthKey({ ...base, houseSystem: "placidus" });
  const b = birthKey({ ...base, houseSystem: "koch" });
  const unknown = birthKey({ ...base, time: "", timeUnknown: true, houseSystem: "placidus" });
  const noonKnown = birthKey({ ...base, time: "12:00", timeUnknown: false, houseSystem: "placidus" });
  assert.notEqual(a, b);
  assert.notEqual(unknown, noonKnown);
  assert.match(unknown, /\|u$/);
  assert.match(noonKnown, /\|k$/);
});

test("hydrateBirthInput keeps time empty when unknown and backfills houseSystem", () => {
  const chart = {
    meta: { houseSystem: "koch", houseSystemRequested: "koch" },
  };
  const next = hydrateBirthInput({
    input: { ...base, time: "12:00" },
    chart,
    timeUnknown: true,
  });
  assert.equal(next.time, "");
  assert.equal(next.timeUnknown, true);
  assert.equal(next.houseSystem, "koch");
});

test("unseenRows keeps two same-birth charts with different houses", () => {
  const chart = { meta: { houseSystem: "placidus" } };
  const pending = [
    {
      id: "1",
      input: { ...base, houseSystem: "placidus" },
      chart,
      dossier: { byId: {}, order: [] },
      grok: null,
      timeUnknown: false,
      savedAt: 1,
    },
    {
      id: "2",
      input: { ...base, houseSystem: "koch" },
      chart: { meta: { houseSystem: "koch" } },
      dossier: { byId: {}, order: [] },
      grok: null,
      timeUnknown: false,
      savedAt: 2,
    },
  ];
  const remote = [
    {
      id: "r1",
      input: { ...base, houseSystem: "placidus" },
      chart,
      dossier: { byId: {}, order: [] },
      grok: null,
      timeUnknown: false,
      savedAt: 3,
    },
  ];
  const unique = unseenRows(pending, remote);
  assert.equal(unique.length, 1);
  assert.equal(unique[0].id, "2");
  // Two alike among the candidates: the first is taken.
  const twin = { ...pending[1], id: "3" };
  assert.deepEqual(unseenRows([...pending, twin], []).map((r) => r.id), ["1", "2"]);
  // The same id is the same chart, whatever its birth.
  assert.deepEqual(unseenRows([...pending, twin], [{ ...remote[0], id: "2" }]).map((r) => r.id), ["3"]);
});
