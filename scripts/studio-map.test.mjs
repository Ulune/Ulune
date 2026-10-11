import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  CALENDAR_PATHS,
  LANGUAGES,
  PAGE_PATHS,
  isStudioPath,
  languageOf,
  lastLanguage,
  legacyStudioPath,
  lensOf,
  lensesOf,
  pageFor,
  pageFromPath,
  pagePath,
  rememberPage,
  sectionOf,
} from "../src/studio/map.ts";
import { STUDIO_PAGES, studioHref } from "../src/studio/url.ts";

function memory() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
}

test("every studio page has one path, and the path leads back to it", () => {
  for (const page of STUDIO_PAGES) {
    const path = pagePath(page);
    assert.match(path, /^\/[a-z-]+(\/[a-z]+)?$/, page);
    assert.equal(pageFromPath(path), page, path);
    assert.equal(pageFromPath(`${path}/`), page, `${path}/`);
  }
  assert.equal(new Set(Object.values(PAGE_PATHS)).size, STUDIO_PAGES.length, "no two pages share a path");
  assert.equal(pagePath("timing", "fr"), "/calendrier");
  assert.equal(pageFromPath("/calendrier"), "timing");
  assert.equal(pageFromPath("/"), undefined, "the first screen restores the last page");
  assert.equal(pageFromPath("/settings"), undefined);
});

test("the studio's paths, and nothing else, draw the studio", () => {
  for (const path of ["/", "/astrology", "/astrology/transits", "/human-design", "/numerology", "/numerology/cycles", "/calendar", "/calendrier"]) {
    assert.ok(isStudioPath(path), path);
  }
  for (const path of ["/settings", "/guide", "/privacy", "/astrology/nope", "/encyclopedia"]) {
    assert.ok(!isStudioPath(path), path);
  }
});

test("every page belongs to one language and one lens, except the Calendar, a section of its own", () => {
  for (const page of STUDIO_PAGES) {
    if (page === "timing") {
      assert.equal(sectionOf(page), "calendar");
      assert.equal(languageOf(page), undefined);
      continue;
    }
    assert.equal(sectionOf(page), "charts", page);
    assert.ok(languageOf(page), page);
    assert.ok(lensOf(page), page);
    // A language's pages hang under its path.
    const lang = LANGUAGES.find((l) => l.id === languageOf(page));
    assert.ok(pagePath(page).startsWith(lang.path), `${page} under ${lang.path}`);
  }
  assert.deepEqual(lensesOf("astrology"), ["natal", "cycles", "relationship"]);
  assert.deepEqual(lensesOf("human-design"), ["natal"], "a lens a language lacks is not there");
  assert.deepEqual(lensesOf("numerology"), ["natal", "cycles"], "numerology's cycles (from R3)");
  assert.equal(pagePath("numerology-cycles"), "/numerology/cycles");
  assert.deepEqual(lensesOf("chinese-astrology"), ["natal", "cycles", "relationship"], "Chinese astrology's year ahead and two people (part 11)");
  assert.equal(pagePath("zodiac-years"), "/chinese-astrology/cycles");
  assert.equal(pagePath("zodiac-pair"), "/chinese-astrology/pair");
  assert.equal(pagePath("bazi-luck"), "/bazi/cycles");
});

test("every 1.x address lands on its 2.0 page", () => {
  const cases = {
    natal: "/astrology",
    transits: "/astrology/transits",
    timing: "/calendar",
    progressions: "/astrology/progressions",
    synastry: "/astrology/synastry",
    composite: "/astrology/composite",
    design: "/human-design",
    numerology: "/numerology",
  };
  // 2.0's own pages have no 1.x name to carry.
  const NEW_IN_2 = ["numerology-cycles", "zodiac", "zodiac-years", "zodiac-pair", "bazi", "bazi-luck"];
  assert.deepEqual(Object.keys(cases).sort(), STUDIO_PAGES.filter((p) => !NEW_IN_2.includes(p)).sort(), "every 1.0.4 name is covered");
  for (const [studio, path] of Object.entries(cases)) {
    assert.deepEqual(legacyStudioPath({ studio }), { path, view: undefined }, studio);
  }
  assert.deepEqual(legacyStudioPath({ studio: "transits", view: "table" }), { path: "/astrology/transits", view: "table" });
  assert.deepEqual(legacyStudioPath({ studio: "table" }), { path: "/astrology", view: "table" });
  assert.deepEqual(legacyStudioPath({ studio: "timing" }, "fr"), { path: "/calendrier", view: undefined });
  assert.equal(legacyStudioPath({}), undefined);
  assert.equal(legacyStudioPath({ studio: "nonsense" }), undefined);
});

test("addresses: the path, then what the query still carries", () => {
  assert.equal(studioHref("natal", "wheel", { here: "/" }), "/", "the first screen keeps its address");
  assert.equal(studioHref("natal", "wheel", { here: "/astrology/transits" }), "/astrology");
  assert.equal(studioHref("transits", "table", { here: "/" }), "/astrology/transits?view=table");
  assert.equal(studioHref("timing", "wheel", { locale: "fr" }), "/calendrier");
  assert.equal(studioHref("design", "wheel", { bodies: "points", look: "colours" }), "/human-design?bodies=points&look=colours");
});

test("each language remembers its lens, each lens its sub-mode, on this device only", () => {
  const store = memory();
  assert.equal(pageFor("astrology", undefined, store), "natal", "a first visit opens Natal");
  assert.equal(lastLanguage(store), "astrology");
  rememberPage("progressions", store);
  assert.equal(pageFor("astrology", "cycles", store), "progressions");
  assert.equal(pageFor("astrology", undefined, store), "progressions", "the language reopens on its last lens");
  rememberPage("synastry", store);
  assert.equal(pageFor("astrology", "cycles", store), "progressions", "each lens keeps its own");
  assert.equal(pageFor("astrology", undefined, store), "synastry");
  rememberPage("design", store);
  assert.equal(lastLanguage(store), "human-design");
  assert.equal(pageFor("astrology", undefined, store), "synastry", "another language does not reset it");
  rememberPage("timing", store);
  assert.equal(lastLanguage(store), "human-design", "the Calendar is not a language");
  // A broken entry is ignored, never thrown.
  store.setItem("ulune.studio.last.v2", "{nope");
  assert.equal(pageFor("astrology", undefined, store), "natal");
});

test("the offline worker keeps exactly the studio's paths", () => {
  const src = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
  const m = src.match(/const STUDIO = (\/.*\/);/);
  assert.ok(m, "sw.js names its studio paths");
  const re = eval(m[1]);
  for (const path of ["/", ...Object.values(PAGE_PATHS), ...Object.values(CALENDAR_PATHS)]) {
    assert.ok(re.test(path), `the worker keeps ${path}`);
  }
  for (const path of ["/settings", "/guide", "/privacy", "/api/health", "/encyclopedia"]) {
    assert.ok(!re.test(path), `the worker leaves ${path}`);
  }
});
