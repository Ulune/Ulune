// The address's say in the interface's language (src/lib/i18n/locale-path.ts,
// applied by src/lib/i18n/locale.tsx and the root route's <html lang>): with
// no saved choice, /encyclopedie… and /calendrier open in French and
// /encyclopedia… and /calendar in English, whatever the browser's language;
// a saved choice always wins; other addresses leave it to the browser.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { localeOfPath, pickLocale } from "../src/lib/i18n/locale-path.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("an address's own language", () => {
  for (const path of ["/encyclopedie", "/encyclopedie/", "/encyclopedie/saturne", "/encyclopedie/astrologie", "/encyclopedie/eclipse", "/calendrier", "/calendrier/", "/Calendrier"]) {
    assert.equal(localeOfPath(path), "fr", path);
  }
  for (const path of ["/encyclopedia", "/encyclopedia/saturn", "/encyclopedia/human-design", "/calendar", "/calendar/"]) {
    assert.equal(localeOfPath(path), "en", path);
  }
  for (const path of ["/", "", "/astrology", "/astrology/transits", "/numerology", "/settings", "/privacy", "/encyclopediax", "/calendars", "/calendrier-x", "/fr/calendar"]) {
    assert.equal(localeOfPath(path), null, path);
  }
});

test("with nothing saved, the address's language wins over the browser's", () => {
  for (const browser of ["en-GB", "en-US", "fr-FR", "fr", "de-DE", "", undefined]) {
    for (const saved of [null, undefined, "", "de", "FR"]) {
      assert.equal(pickLocale(saved, localeOfPath("/encyclopedie/saturne"), browser), "fr", `${saved} ${browser}`);
      assert.equal(pickLocale(saved, localeOfPath("/encyclopedie"), browser), "fr");
      assert.equal(pickLocale(saved, localeOfPath("/calendrier"), browser), "fr");
      assert.equal(pickLocale(saved, localeOfPath("/encyclopedia/saturn"), browser), "en");
      assert.equal(pickLocale(saved, localeOfPath("/encyclopedia"), browser), "en");
      assert.equal(pickLocale(saved, localeOfPath("/calendar"), browser), "en");
    }
  }
});

test("a saved choice wins everywhere; elsewhere the browser decides", () => {
  for (const path of ["/encyclopedie/saturne", "/calendrier", "/encyclopedia", "/calendar", "/", "/astrology"]) {
    assert.equal(pickLocale("en", localeOfPath(path), "fr-FR"), "en", path);
    assert.equal(pickLocale("fr", localeOfPath(path), "en-GB"), "fr", path);
  }
  assert.equal(pickLocale(null, localeOfPath("/"), "fr-CA"), "fr");
  assert.equal(pickLocale(null, localeOfPath("/astrology"), "en-US"), "en");
  assert.equal(pickLocale(null, localeOfPath("/settings"), "de"), "en");
  assert.equal(pickLocale(null, null, undefined), "en");
});

test("the server writes the address's language on <html>, and the page starts from it", () => {
  const root = read("src/routes/__root.tsx");
  assert.match(root, /const pathLocale = usePathLocale\(\);\s*const lang = useDocumentLang\(pathLocale\);/);
  assert.match(root, /<html lang=\{lang\}/);
  assert.match(root, /<LocaleProvider pathLocale=\{pathLocale\}>/);
  const locale = read("src/lib/i18n/locale.tsx");
  // The address's language: read from the router, first drawn on <html>, then the provider's first state.
  assert.match(locale, /useRouterState\(\{ select: \(s\) => localeOfPath\(s\.location\.pathname\) \}\)/);
  assert.match(locale, /useState<Locale>\(\(\) => pathLocale \?\? "en"\)/);
  assert.match(locale, /pickLocale\(savedLocale\(\), pathLocale, navigator\.language\)/);
});
