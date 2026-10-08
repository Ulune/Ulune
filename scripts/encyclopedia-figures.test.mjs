// The encyclopedia's figures (encyclopedia plan, part 19): drawn from the
// charts' own numbers at build time; every family that should have one has
// one, in both languages, with its text twin; the hexagrams agree with what
// the gates' pages say of their trigrams, the gates' spans with their tables.
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildEncyclopedia, readContent } from "./encyclopedia/build.mjs";
import { hexagram } from "./encyclopedia/figures.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const real = buildEncyclopedia(readContent(`${ROOT}content/encyclopedia`));
const pages = real.data.pages;

test("King Wen's 64 hexagrams: each its own six lines; 1 all whole, 2 all broken, 63 and 64 alternating", () => {
  const seen = new Set();
  for (let k = 1; k <= 64; k += 1) {
    const h = hexagram(k);
    assert.ok(h, String(k));
    seen.add(h.lines.join(""));
  }
  assert.equal(seen.size, 64);
  assert.deepEqual(hexagram(1).lines, [1, 1, 1, 1, 1, 1]);
  assert.deepEqual(hexagram(2).lines, [0, 0, 0, 0, 0, 0]);
  assert.deepEqual(hexagram(63).lines, [1, 0, 1, 0, 1, 0]);
  assert.deepEqual(hexagram(64).lines, [0, 1, 0, 1, 0, 1]);
});

test("the hexagrams agree with the gates' own pages (“Thunder over Heaven”, “Zhen, thunder, above Li, fire”)", () => {
  const NAME = { heaven: "qian", earth: "kun", thunder: "zhen", water: "kan", mountain: "gen", wind: "xun", wood: "xun", fire: "li", lake: "dui" };
  const word = Object.keys(NAME).join("|");
  const byName = new RegExp(`(${word}) (?:\\(\\w+\\) )?(?:over|above) (${word})`);
  const byPinyin = /(qian|kun|zhen|kan|gen|xun|li|dui), \w+, (?:above (qian|kun|zhen|kan|gen|xun|li|dui)|doubled)/;
  let checked = 0;
  for (let k = 1; k <= 64; k += 1) {
    const rows = JSON.stringify(pages[`en/hd-gate-${k}`].sections).toLowerCase();
    let pair = null;
    const a = byName.exec(rows);
    if (a) pair = [NAME[a[1]], NAME[a[2]]];
    else {
      const b = byPinyin.exec(rows);
      if (b) pair = [b[1], b[2] ?? b[1]];
    }
    if (!pair) continue;
    const h = hexagram(k);
    assert.deepEqual([h.upper, h.lower], pair, `gate ${k}`);
    checked += 1;
  }
  assert.ok(checked >= 62, `${checked} gates checked`);
});

test("every gate's figure gives the span its page's table gives", () => {
  for (let k = 1; k <= 64; k += 1) {
    const page = pages[`en/hd-gate-${k}`];
    const span = /from (\d+°\d\d′\d\d″) (\w+) to (\d+°\d\d′\d\d″) (\w+)/.exec(page.figure.caption);
    assert.ok(span, `gate ${k}: ${page.figure.caption}`);
    const table = JSON.stringify(page.sections);
    assert.ok(table.includes(span[1]) && table.includes(span[3]), `gate ${k}: ${span[0]}`);
  }
});

test("the families that have a figure have one, in both languages, with its text twin", () => {
  const ids = [
    ...["aries", "scorpio", "pisces", "moon-in-scorpio", "ascendant-in-leo", "element-fire", "modality-mutable"],
    ...["house-1", "house-10", "mars-in-house-10", "ascendant", "midheaven", "imum-coeli", "descendant"],
    ...["conjunction", "sextile", "square", "trine", "opposition", "quincunx", "semi-square", "venus-square-mars", "sun-conjunction-moon"],
    ...["grand-trine", "t-square", "grand-cross", "yod", "kite", "mystic-rectangle", "stellium"],
    ...["hd-centre-sacral", "hd-centre-solar-plexus", "hd-channel-34-20", "hd-gate-1", "hd-gate-64", "hd-line-6", "hd-profile-4-1", "hd-authority-emotional"],
    ...["grid-1-5-9", "grid-3-6-9", "number-7"],
  ];
  for (const id of ids) {
    for (const lang of ["en", "fr"]) {
      const f = pages[`${lang}/${id}`]?.figure;
      assert.ok(f, `${lang}/${id}`);
      assert.ok(f.caption.length > 20 && /[.]$/.test(f.caption), `${lang}/${id}: ${f.caption}`);
      for (const p of f.panels) {
        assert.match(p.svg, /^<svg viewBox="0 0 \d+ \d+"[^>]* role="img" aria-label="[^"]{20,}"/, `${lang}/${id}`);
        assert.ok(!/NaN|undefined/.test(p.svg), `${lang}/${id}`);
        assert.equal((p.svg.match(/<text/g) ?? []).length, (p.svg.match(/<\/text>/g) ?? []).length);
      }
      if (lang === "fr") assert.ok(!/ [:;!?]/.test(f.caption.replace(/\u202f[:;!?]/g, "")), `${id}: ${f.caption}`);
    }
  }
  // An aspect's figure turns; the others do not.
  assert.deepEqual(pages["en/trine"].figure.interactive, { kind: "aspect", angle: 120, orb: 8 });
  assert.equal(pages["en/venus-square-mars"].figure.interactive, undefined);
  // No figure where there is nothing to draw.
  for (const id of ["eclipse", "placidus", "sun", "life-path", "hd-generator"]) assert.equal(pages[`en/${id}`].figure, undefined, id);
});

test("a figure costs its page a few KB at most", () => {
  let largest = 0;
  for (const page of Object.values(pages)) if (page.figure) largest = Math.max(largest, JSON.stringify(page.figure).length);
  assert.ok(largest < 12_000, `${largest} characters`);
});
