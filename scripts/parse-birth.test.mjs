import assert from "node:assert/strict";
import { test } from "node:test";
import {
  caretAfterMaskedDigits,
  formatEuropeanDate,
  isCompleteBirthDate,
  isCompleteBirthTime,
  maskBirthTime,
  maskEuropeanDate,
  normalizeBirth,
  parseDate,
  parseTime,
  resolveTimeUnknown,
  parseCoords,
  isValidBirthTime,
} from "../src/lib/chart/parse-birth.ts";

test("isCompleteBirthDate accepts a finished European date", () => {
  assert.equal(isCompleteBirthDate(""), false);
  assert.equal(isCompleteBirthDate("15"), false);
  assert.equal(isCompleteBirthDate("15/06"), false);
  assert.equal(isCompleteBirthDate("15/06/199"), false);
  assert.equal(isCompleteBirthDate("15/06/1990"), true);
  assert.equal(isCompleteBirthDate("15/13/1990"), false);
  assert.equal(isCompleteBirthDate("1990-06-15"), false);
  assert.equal(isCompleteBirthDate("19900615"), false);
});

test("formatEuropeanDate turns ISO or European into DD/MM/YYYY", () => {
  assert.equal(formatEuropeanDate(""), "");
  assert.equal(formatEuropeanDate("1990-06-15"), "15/06/1990");
  assert.equal(formatEuropeanDate("15/06/1990"), "15/06/1990");
  assert.equal(formatEuropeanDate("15/6/1990"), "15/06/1990");
  assert.equal(formatEuropeanDate("15/06/199"), "15/06/199");
});

test("isCompleteBirthTime only accepts finished HH:MM", () => {
  assert.equal(isCompleteBirthTime(""), false);
  assert.equal(isCompleteBirthTime("12"), false);
  assert.equal(isCompleteBirthTime("12:"), false);
  assert.equal(isCompleteBirthTime("12:0"), false);
  assert.equal(isCompleteBirthTime("12:00"), true);
  assert.equal(isCompleteBirthTime("12:00:30"), false);
  assert.equal(isCompleteBirthTime("25:00"), false);
  assert.equal(isCompleteBirthTime("12:60"), false);
});

function typeDate(keys) {
  let value = "";
  for (const key of keys) value = maskEuropeanDate(`${value}${key}`, value);
  return value;
}

function typeTime(keys) {
  let value = "";
  for (const key of keys) value = maskBirthTime(`${value}${key}`, value);
  return value;
}

test("maskEuropeanDate inserts slashes after DD and MM", () => {
  assert.equal(typeDate("03111987"), "03/11/1987");
  assert.equal(typeDate("03/11/1987"), "03/11/1987");
  assert.equal(maskEuropeanDate("03", "0"), "03/");
  assert.equal(maskEuropeanDate("03/11", "03/1"), "03/11/");
  assert.equal(maskEuropeanDate("5/", "5"), "05/");
  assert.equal(maskEuropeanDate("05/2/", "05/2"), "05/02/");
  assert.equal(maskEuropeanDate("03/11/1987"), "03/11/1987");
  assert.equal(maskEuropeanDate("03111987"), "03/11/1987");
  assert.equal(maskEuropeanDate("1987-11-03"), "1987-11-03");
  assert.equal(maskEuropeanDate("3 November 1987"), "3 November 1987");
});

test("maskEuropeanDate lets backspace remove a trailing slash", () => {
  assert.equal(maskEuropeanDate("03", "03/", true), "03");
  assert.equal(maskEuropeanDate("03/11", "03/11/", true), "03/11");
  assert.equal(maskEuropeanDate("03/11/198", "03/11/1987", true), "03/11/198");
});

test("maskBirthTime inserts a colon after HH", () => {
  assert.equal(typeTime("2310"), "23:10");
  assert.equal(typeTime("23:10"), "23:10");
  assert.equal(maskBirthTime("23", "2"), "23:");
  assert.equal(maskBirthTime("9:", "9"), "09:");
  assert.equal(maskBirthTime("23:10"), "23:10");
  assert.equal(maskBirthTime("2310"), "23:10");
  assert.equal(maskBirthTime("23:10:30"), "23:10:30");
  assert.equal(maskBirthTime("11:10 PM"), "11:10 PM");
});

test("maskBirthTime lets backspace remove a trailing colon", () => {
  assert.equal(maskBirthTime("23", "23:", true), "23");
  assert.equal(maskBirthTime("23:1", "23:10", true), "23:1");
});

test("caretAfterMaskedDigits sits after an auto-inserted separator", () => {
  assert.equal(caretAfterMaskedDigits("03/", 2, true), 3);
  assert.equal(caretAfterMaskedDigits("03", 2, false), 2);
  assert.equal(caretAfterMaskedDigits("23:", 2, true), 3);
  assert.equal(caretAfterMaskedDigits("03/11/1987", 8, true), 10);
});

test("blank time is unknown; explicit 12:00 is known; name-only recast keeps the flag", () => {
  assert.equal(resolveTimeUnknown({ time: "" }), true);
  assert.equal(resolveTimeUnknown({ time: "   " }), true);
  assert.equal(resolveTimeUnknown({ time: "12:00" }), false);
  assert.equal(resolveTimeUnknown({ time: "12:00", timeUnknown: true }), true);
  assert.equal(resolveTimeUnknown({ time: "23:10", timeUnknown: false }), false);

  const blank = normalizeBirth({
    name: "TraceQA",
    date: "15/06/1990",
    time: "",
    placeLabel: "Paris",
    latitude: 48.8566,
    longitude: 2.3522,
  });
  assert.equal(blank.timeUnknown, true);
  assert.equal(blank.time, "12:00");

  const noon = normalizeBirth({
    name: "TraceQA",
    date: "15/06/1990",
    time: "12:00",
    placeLabel: "Paris",
    latitude: 48.8566,
    longitude: 2.3522,
  });
  assert.equal(noon.timeUnknown, false);

  const persisted = { time: "", timeUnknown: true, name: "Renamed" };
  assert.equal(resolveTimeUnknown(persisted), true);
  const recast = normalizeBirth({
    name: persisted.name,
    date: "15/06/1990",
    time: persisted.time,
    placeLabel: "Paris",
    latitude: 48.8566,
    longitude: 2.3522,
    timeUnknown: persisted.timeUnknown,
  });
  assert.equal(recast.timeUnknown, true);
});

test("normalizeBirth still stores ISO for ephemeris math", () => {
  const n = normalizeBirth({
    name: "TraceQA",
    date: "15/06/1990",
    time: "12:00",
    placeLabel: "Paris",
    latitude: 48.8566,
    longitude: 2.3522,
  });
  assert.equal(n.date, "1990-06-15");
  assert.equal(n.time, "12:00");
  assert.equal(n.timeUnknown, false);
  assert.deepEqual(parseDate("15/06/1990"), { year: 1990, month: 6, day: 15 });
  assert.deepEqual(parseTime("12:00"), { hour: 12, minute: 0, second: 0, unknown: false });
});

test("parseCoords reads decimal, hemisphere letters, D°M′S″ and atlas notation — signs included", () => {
  const near = (got, lat, lon) =>
    assert.ok(
      got && Math.abs(got.latitude - lat) < 1e-9 && Math.abs(got.longitude - lon) < 1e-9,
      `${JSON.stringify(got)} vs ${lat}, ${lon}`,
    );
  near(parseCoords("48.8566, 2.3522"), 48.8566, 2.3522);
  near(parseCoords("48.8566 2.3522"), 48.8566, 2.3522);
  near(parseCoords("40.7128, -74.0060"), 40.7128, -74.006);
  // A trailing W used to be dropped, putting New York in China.
  near(parseCoords("40.7128, 74.0060 W"), 40.7128, -74.006);
  near(parseCoords("40.7128 N, 74.0060 W"), 40.7128, -74.006);
  near(parseCoords("N40.7128 W74.0060"), 40.7128, -74.006);
  near(parseCoords("74.0060 W, 40.7128 N"), 40.7128, -74.006);
  near(parseCoords(`40°42'46"N 74°00'22"W`), 40 + 42 / 60 + 46 / 3600, -(74 + 22 / 3600));
  near(parseCoords("40° 42′ 46″ N, 74° 0′ 22″ W"), 40 + 42 / 60 + 46 / 3600, -(74 + 22 / 3600));
  near(parseCoords("48n52 2e20"), 48 + 52 / 60, 2 + 20 / 60);
  near(parseCoords("33s52, 151e13"), -(33 + 52 / 60), 151 + 13 / 60);
  assert.equal(parseCoords("Paris"), null);
  assert.equal(parseCoords("95, 10"), null);
  assert.equal(parseCoords("10 N, 20 N"), null);
  assert.equal(parseCoords("40°75' N, 3° W"), null, "75 minutes is not a coordinate");
  // One hemisphere letter between two numbers: the first's suffix or the second's prefix? Refused.
  assert.equal(parseCoords("48.85 N 2.35"), null);
  assert.equal(parseCoords("2.35 E 48.85"), null);
  near(parseCoords("48.85 N 2.35 E"), 48.85, 2.35);
});

test("a rectified time with seconds is valid; nonsense is not", () => {
  assert.equal(isValidBirthTime("23:10"), true);
  assert.equal(isValidBirthTime("23:10:30"), true);
  assert.equal(isValidBirthTime("23:10:75"), false);
  assert.equal(isValidBirthTime("25:00"), false);
  assert.equal(isValidBirthTime("2310"), false);
});

test("historical dates: years 1–2399, and Julian leap days before 1582-10-15", () => {
  assert.deepEqual(parseDate("01/03/1500"), { year: 1500, month: 3, day: 1 });
  assert.deepEqual(parseDate("29/02/1500"), { year: 1500, month: 2, day: 29 }, "a Julian leap day");
  assert.throws(() => parseDate("29/02/1700"), /E:birth.date.invalid/, "1700 is not a Gregorian leap year");
  assert.deepEqual(parseDate("15/06/0800"), { year: 800, month: 6, day: 15 });
  assert.throws(() => parseDate("01/01/2400"), /E:birth.year.range/);
});

test("a month in words, in English or French, with or without an ordinal", () => {
  const june15 = { year: 1990, month: 6, day: 15 };
  assert.deepEqual(parseDate("15 juin 1990"), june15);
  assert.deepEqual(parseDate("15 Juin 1990"), june15);
  assert.deepEqual(parseDate("15 June 1990"), june15);
  assert.deepEqual(parseDate("15th June 1990"), june15);
  assert.deepEqual(parseDate("June 15, 1990"), june15);
  assert.deepEqual(parseDate("June 15th, 1990"), june15);
  assert.deepEqual(parseDate("1er mai 1990"), { year: 1990, month: 5, day: 1 });
  assert.deepEqual(parseDate("3 déc. 1985"), { year: 1985, month: 12, day: 3 });
  assert.deepEqual(parseDate("12 févr. 2001"), { year: 2001, month: 2, day: 12 });
  assert.deepEqual(parseDate("7 août 1969"), { year: 1969, month: 8, day: 7 });
  assert.equal(formatEuropeanDate("15 juin 1990"), "15/06/1990");
  // The precise reasons the form now shows.
  assert.throws(() => parseDate("15 juni 1990"), /E:birth.month.unreadable\|15 juni 1990/);
  assert.throws(() => parseDate("31/02/1990"), /E:birth.date.invalid/);
  assert.throws(() => parseDate("30 février 1990"), /E:birth.date.invalid/);
});
