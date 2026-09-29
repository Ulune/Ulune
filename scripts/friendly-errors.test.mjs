// Failures become words for the reader (src/lib/i18n/errors.ts): a code in
// the page's state, a sentence in the reader's language on screen, never an
// engine's or a framework's message.
import assert from "node:assert/strict";
import { test } from "node:test";
import { errorForState, localizeError } from "../src/lib/i18n/errors.ts";

test("codes pass through, with what the reader typed", () => {
  assert.equal(errorForState(new Error("E:birth.date.missing")), "E:birth.date.missing");
  assert.equal(errorForState(new Error("E:tz.invalid|Mars/Olympus")), "E:tz.invalid|Mars/Olympus");
  assert.equal(errorForState(new Error("E:place.notfound|Atlantis")), "E:place.notfound|Atlantis");
});

test("no connection, too slow, out of range", () => {
  assert.equal(errorForState(new TypeError("Failed to fetch")), "E:net.unreachable");
  assert.equal(errorForState(new TypeError("Load failed")), "E:net.unreachable");
  assert.equal(errorForState(new TypeError("NetworkError when attempting to fetch resource.")), "E:net.unreachable");
  const timeout = new DOMException("The operation timed out.", "TimeoutError");
  assert.equal(errorForState(timeout), "E:net.timeout");
  assert.equal(errorForState(new Error("FUNCTION_INVOCATION_TIMEOUT")), "E:net.timeout");
  const zod = new Error('[{"origin":"number","code":"too_big","maximum":90,"path":["latitude"]}]');
  assert.equal(errorForState(zod), "E:input.range");
});

test("anything else is a server fault, never its own words", () => {
  for (const raw of ["Internal Server Error", "Invariant failed", "Swiss Ephemeris failed for sun: x", "Cannot read properties of undefined (reading 'lon')"]) {
    assert.equal(errorForState(new Error(raw)), "E:server.failed", raw);
  }
  assert.equal(errorForState(undefined), "E:server.failed");
});

test("on screen: the reader's language, or the surface's fallback", () => {
  assert.equal(localizeError("E:net.offline", "en"), "You’re offline: calculating needs the internet. Check the connection and try again.");
  assert.match(localizeError("E:net.offline", "fr"), /^Vous êtes hors ligne/);
  assert.match(localizeError("E:net.timeout", "en"), /took too long/);
  assert.match(localizeError("E:input.range", "en"), /can’t calculate this entry/);
  assert.equal(localizeError("E:place.notfound|Atlantis", "en"), "Could not find “Atlantis”. Try another city, or paste coordinates.");
  assert.match(localizeError("E:place.notfound|Atlantis", "fr"), /Atlantis/);
  assert.equal(localizeError("E:place.missing", "en"), "Add a birth place — a city name is enough.");
  // No sentence for this code: the surface says what failed.
  assert.equal(localizeError("E:server.failed", "en"), "Could not cast the chart. Try again in a moment.");
  assert.equal(localizeError("E:net.unreachable", "en"), "Ulune’s server couldn’t be reached. Check the connection and try again.");
  assert.match(localizeError("E:net.unreachable", "fr"), /^Le serveur d’Ulune est injoignable/);
  assert.equal(localizeError("E:server.failed", "en", "couldNotCastSky"), "Could not calculate the current sky.");
  // Engine words that slipped through still never show.
  assert.equal(localizeError("Invariant failed", "en"), "Could not cast the chart. Try again in a moment.");
  assert.equal(localizeError("Internal Server Error", "fr"), "Impossible de calculer le thème. Réessayez dans un instant.");
  assert.equal(localizeError(null, "en"), "Could not cast the chart. Try again in a moment.");
});
