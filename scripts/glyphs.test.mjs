import assert from "node:assert/strict";
import { test } from "node:test";
import { codepointInUnicodeRange, primaryLookFace } from "../src/lib/chart/glyph-coverage.ts";
import { GLYPH_SVG, hasGlyphSvg, houseNumGlyphId } from "../src/lib/chart/glyph-svg.ts";
import {
  ASTRONOMICON_GLYPH,
  DEFAULT_GLYPH_FAMILY,
  GLYPH_FONT_STACK,
  NOTO_SYMBOLS_STACK,
  STARFONT_GLYPH,
  SVG_ONLY_IDS,
  UNICODE_GLYPH,
  catalogIds,
  glyphFontStack,
  isLookFaceInStack,
  mappedGlyph,
  resolveGlyph,
  unicodeGlyphText,
} from "../src/lib/chart/glyphs.ts";
import { ANGLE_IDS, ASPECT_IDS, PLANET_IDS, SIGN_IDS } from "../src/lib/chart/types.ts";

test("every sign has a Unicode glyph plus text-presentation VS", () => {
  for (const id of SIGN_IDS) {
    assert.ok(UNICODE_GLYPH[id], `missing sign ${id}`);
    assert.match(unicodeGlyphText(id), /\uFE0E$/);
  }
});

test("classic planets through Pluto are Unicode", () => {
  for (const id of [
    "sun",
    "moon",
    "mercury",
    "venus",
    "mars",
    "jupiter",
    "saturn",
    "uranus",
    "neptune",
    "pluto",
  ]) {
    assert.equal(UNICODE_GLYPH[id].length, 1, id);
  }
  assert.equal(UNICODE_GLYPH.sun, "\u2609");
  assert.equal(UNICODE_GLYPH.pluto, "\u2647");
});

test("nodes, Chiron, Lilith, and asteroids with codepoints are Unicode", () => {
  for (const id of [
    "northnode",
    "southnode",
    "chiron",
    "lilith",
    "ceres",
    "pallas",
    "juno",
    "vesta",
    "eris",
    "sedna",
  ]) {
    assert.ok(UNICODE_GLYPH[id], id);
  }
  assert.equal(UNICODE_GLYPH.ceres, "\u26B3");
  assert.equal(UNICODE_GLYPH.pallas, "\u26B4");
  assert.equal(UNICODE_GLYPH.eris, "\u2BF0");
});

test("aspects: Unicode except semisquare", () => {
  for (const id of ASPECT_IDS) {
    if (id === "semisquare") {
      assert.equal(UNICODE_GLYPH[id], undefined);
      assert.ok(SVG_ONLY_IDS.includes(id));
      continue;
    }
    assert.ok(UNICODE_GLYPH[id], id);
  }
});

test("every catalog id has an SVG path so a missing Look mark is never empty", () => {
  for (const id of catalogIds()) {
    assert.ok(hasGlyphSvg(id), `${id} missing SVG path`);
    assert.ok(
      GLYPH_SVG[id].includes("<path") || GLYPH_SVG[id].includes("<circle") || GLYPH_SVG[id].includes("<rect"),
      id,
    );
  }
  for (const id of [...PLANET_IDS, ...ANGLE_IDS]) {
    assert.ok(hasGlyphSvg(id), id);
  }
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
    assert.ok(hasGlyphSvg(houseNumGlyphId(n)), `house ${n}`);
  }
});

test("resolveGlyph prefers Unicode when the id has a codepoint", () => {
  assert.equal(resolveGlyph("ceres").kind, "font");
  assert.equal(resolveGlyph("pluto").kind, "font");
  assert.equal(resolveGlyph("northnode").kind, "font");
  assert.equal(resolveGlyph("house-1").kind, "font");
  assert.equal(resolveGlyph("house-12").kind, "font");
  if (resolveGlyph("house-12").kind === "font") {
    assert.equal(resolveGlyph("house-12").text, "12");
  }
});

test("Astronomicon and StarFont never remap house digits 1–12", () => {
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
    const id = `house-${n}`;
    assert.equal(mappedGlyph(id, "astronomicon"), undefined, id);
    assert.equal(mappedGlyph(id, "starfont-sans"), undefined, id);
    assert.equal(mappedGlyph(id, "starfont-serif"), undefined, id);
    assert.equal(unicodeGlyphText(id), String(n), id);
  }
  assert.equal(STARFONT_GLYPH.ascendant, "1");
  assert.equal(STARFONT_GLYPH.descendant, "2");
});

test("lots, Vertex, and angles paint as SVG (no Unicode)", () => {
  assert.equal(resolveGlyph("fortune", "noto").kind, "svg");
  assert.equal(resolveGlyph("spirit", "noto").kind, "svg");
  assert.equal(resolveGlyph("vertex", "noto").kind, "svg");
  assert.equal(resolveGlyph("antivertex", "noto").kind, "svg");
  assert.equal(resolveGlyph("ascendant", "noto").kind, "svg");
  assert.equal(resolveGlyph("unknown-body", "noto").kind, "none");
  assert.equal(mappedGlyph("fortune", "astronomicon"), "?");
  assert.equal(mappedGlyph("ascendant", "astronomicon"), "c");
});

test("glyphFontStack keeps the Look face first and Noto before generics", () => {
  const classic = glyphFontStack('"Outfit", "Segoe UI", system-ui, sans-serif');
  const editorial = glyphFontStack('"Source Sans 3", "Segoe UI", system-ui, sans-serif');
  const clean = glyphFontStack('"IBM Plex Sans", "Segoe UI", system-ui, sans-serif');

  assert.match(classic, /^"Outfit"/);
  assert.match(editorial, /^"Source Sans 3"/);
  assert.match(clean, /^"IBM Plex Sans"/);

  for (const stack of [classic, editorial, clean]) {
    assert.ok(isLookFaceInStack(stack), stack);
    const noto = stack.indexOf('"Noto Sans Symbols"');
    const noto2 = stack.indexOf('"Noto Sans Symbols 2"');
    const generic = stack.search(/system-ui|sans-serif/);
    assert.ok(noto >= 0 && noto2 > noto, stack);
    assert.ok(generic < 0 || noto < generic, stack);
    assert.ok(stack.includes(NOTO_SYMBOLS_STACK.split(",")[0].trim()));
  }
});

test("new users default to Ulune Classic (the Astronomicon subset) on the wheel", () => {
  assert.equal(DEFAULT_GLYPH_FAMILY, "astronomicon");
  assert.equal(mappedGlyph("sun", DEFAULT_GLYPH_FAMILY), "Q");
  assert.equal(mappedGlyph("aries", DEFAULT_GLYPH_FAMILY), "A");
});

test("mapped glyph families paint letters, not tofu Unicode, for the Sun", () => {
  assert.equal(mappedGlyph("sun", "astronomicon"), "Q");
  assert.equal(mappedGlyph("sun", "starfont-sans"), "s");
  assert.equal(mappedGlyph("sun", "noto"), undefined);
  assert.equal(resolveGlyph("sun", "astronomicon").kind, "font");
  if (resolveGlyph("sun", "astronomicon").kind === "font") {
    assert.equal(resolveGlyph("sun", "astronomicon").text, "Q");
  }
  assert.match(GLYPH_FONT_STACK.astronomicon, /^"Ulune Classic",/);
  assert.match(GLYPH_FONT_STACK["starfont-serif"], /StarFont Serif/);
  assert.ok(ASTRONOMICON_GLYPH.aries);
  assert.ok(STARFONT_GLYPH.aries);
});

test("unicode-range parser and Look face picker", () => {
  assert.equal(primaryLookFace('"Outfit", "Segoe UI", system-ui, sans-serif'), "Outfit");
  assert.equal(primaryLookFace('"Source Sans 3", sans-serif'), "Source Sans 3");
  assert.equal(codepointInUnicodeRange("U+0000-00FF", 0x31), true);
  assert.equal(codepointInUnicodeRange("U+0000-00FF", 0x2647), false);
  assert.equal(codepointInUnicodeRange("U+2600-26FF", 0x2647), true);
  assert.equal(codepointInUnicodeRange("U+2647", 0x2647), true);
  assert.equal(codepointInUnicodeRange("U+0000-00FF, U+2600-26FF", 0x260a), true);
});

test("every SVG glyph has its measured ink (re-run scripts/measure-glyph-ink.mjs after changing one)", async () => {
  const { GLYPH_INK, glyphShift } = await import("../src/lib/chart/glyph-ink.ts");
  assert.deepEqual(Object.keys(GLYPH_INK).sort(), Object.keys(GLYPH_SVG).sort());
  for (const [id, [x0, y0, x1, y1]] of Object.entries(GLYPH_INK)) {
    assert.ok(x1 > x0 && y1 > y0, `${id}: empty ink`);
    const s = glyphShift(id) ?? { dx: 0, dy: 0 };
    // Shifted, the ink's middle is the box's middle.
    assert.ok(Math.abs((x0 + x1) / 2 + s.dx - 12) <= 0.01, `${id}: x`);
    assert.ok(Math.abs((y0 + y1) / 2 + s.dy - 12) <= 0.01, `${id}: y`);
  }
});

test("the nodes' path marks: the North Node opens downward (☊), the South Node upward (☋)", () => {
  // Dots at the open ends: below the arc for ☊, above it for ☋.
  const dotsY = (raw) => [...raw.matchAll(/<circle[^>]*cy="([\d.]+)"/g)].map((m) => Number(m[1]));
  const arcY = (raw) => Number(/<path d="M[\d.]+ ([\d.]+)a/.exec(raw)[1]);
  const north = GLYPH_SVG.northnode;
  const south = GLYPH_SVG.southnode;
  assert.ok(/a6\.85 6\.85 0 0 1/.test(north), "☊ bulges up");
  assert.ok(/a6\.85 6\.85 0 0 0/.test(south), "☋ bulges down");
  assert.ok(dotsY(north).every((y) => y === arcY(north)) && dotsY(south).every((y) => y === arcY(south)));
});
