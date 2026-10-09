/**
 * The twelve animals as Ulune glyphs (languages plan, part 9): drawn in the
 * planet glyphs' language (a 24 × 24 box, two stroke weights, dots), each
 * inside its box, each its own; shown by default and replaced by the
 * characters when the reader chooses them.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { ANIMAL_GLYPH_INNER, animalGlyphSvg } from "../src/lib/chinese/animal-glyphs.ts";
import { DEFAULT_CHINESE_PREFS, cleanChinesePrefs } from "../src/lib/chinese/prefs.ts";
import { zodiacChart } from "../src/lib/chinese/zodiac.ts";
import { zodiacReading } from "../src/lib/chinese/zodiac-reading.ts";

/** The elements of a glyph, as [name, attributes]. */
function elements(inner) {
  return [...inner.matchAll(/<(\w+)\s([^>]*?)\/>/g)].map(([, name, attrs]) => [name, Object.fromEntries([...attrs.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, k, v]) => [k, v]))]);
}

/** The ink's reach in each direction: a path's points and Bézier handles bound its curve; a circle or ellipse its centre and radius. */
function reach(inner) {
  let lo = Infinity;
  let hi = -Infinity;
  for (const [name, a] of elements(inner)) {
    const half = Number(a["stroke-width"] ?? 0) / 2;
    if (name === "path") {
      assert.doesNotMatch(a.d, /[a-z]/, "absolute commands only, so the points can be read");
      for (const n of a.d.match(/-?\d*\.?\d+/g).map(Number)) {
        lo = Math.min(lo, n - half);
        hi = Math.max(hi, n + half);
      }
    } else {
      const r = name === "circle" ? Number(a.r) : Math.max(Number(a.rx), Number(a.ry));
      for (const c of [Number(a.cx), Number(a.cy)]) {
        lo = Math.min(lo, c - r - half);
        hi = Math.max(hi, c + r + half);
      }
    }
  }
  return { lo, hi };
}

const ANIMALS = ["Rat", "Ox", "Tiger", "Rabbit", "Dragon", "Snake", "Horse", "Goat", "Monkey", "Rooster", "Dog", "Pig"];

test("twelve glyphs, each its own, in the planet glyphs' language", () => {
  assert.equal(ANIMAL_GLYPH_INNER.length, 12);
  assert.equal(new Set(ANIMAL_GLYPH_INNER).size, 12);
  ANIMAL_GLYPH_INNER.forEach((inner, i) => {
    const els = elements(inner);
    // Every tag is a self-closed path, circle or ellipse: nothing else (no text, no image, no script).
    assert.equal((inner.match(/</g) ?? []).length, els.length, ANIMALS[i]);
    for (const [name, a] of els) {
      assert.ok(["path", "circle", "ellipse"].includes(name), `${ANIMALS[i]}: <${name}>`);
      if (a.stroke) {
        assert.equal(a.stroke, "currentColor");
        assert.equal(a.fill, "none");
        assert.ok(["1.8", "1.3"].includes(a["stroke-width"]), `${ANIMALS[i]}: stroke ${a["stroke-width"]}`);
        assert.equal(a["stroke-linecap"], "round");
      } else {
        assert.equal(a.fill, "currentColor", `${ANIMALS[i]}: a dot`);
      }
    }
    // At least one line of the main weight: a drawing, not a cloud of dots.
    assert.ok(els.some(([, a]) => a["stroke-width"] === "1.8"), ANIMALS[i]);
  });
});

test("each glyph's ink stays inside its 24 × 24 box, about as far out as the planets'", () => {
  ANIMAL_GLYPH_INNER.forEach((inner, i) => {
    const { lo, hi } = reach(inner);
    assert.ok(lo >= 1, `${ANIMALS[i]} reaches ${lo.toFixed(2)}`);
    assert.ok(hi <= 23, `${ANIMALS[i]} reaches ${hi.toFixed(2)}`);
  });
  assert.match(animalGlyphSvg(13), /^<svg viewBox="0 0 24 24" xmlns="http:\/\/www.w3.org\/2000\/svg">/);
  assert.equal(animalGlyphSvg(13), animalGlyphSvg(1), "the cycle goes round");
});

test("drawn by default; the characters when the reader chooses them", () => {
  assert.equal(DEFAULT_CHINESE_PREFS.animals, "drawings");
  assert.equal(cleanChinesePrefs({ animals: "characters" }).animals, "characters");
  const z = zodiacChart({ utc: "1990-06-15T10:00:00Z", date: "1990-06-15", time: "12:00", longitude: 2.3522 }, { nowMs: Date.UTC(2026, 9, 9, 12) });
  const full = { script: "hant", show: "full" };
  // The year's Horse and the wheel's Dragon carry their drawings; the characters stay as the text mark.
  const year = zodiacReading(z, "zk:year", "en", full);
  assert.equal(year.markSvg, ANIMAL_GLYPH_INNER[6]);
  assert.equal(year.mark, "庚午");
  assert.equal(zodiacReading(z, "zk:branch:4", "en", { ...full, animals: "drawings" }).markSvg, ANIMAL_GLYPH_INNER[4]);
  const chars = zodiacReading(z, "zk:branch:4", "en", { ...full, animals: "characters" });
  assert.equal(chars.markSvg, undefined);
  assert.equal(chars.mark, "辰");
  // A relation is not an animal: its mark stays its character.
  const clash = zodiacReading(z, "zk:rel:clash:day:hour", "en", full);
  assert.equal(clash.markSvg, undefined);
});
