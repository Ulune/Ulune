/**
 * The Flying Stars (languages plan, part 23): the flight path, the
 * mountains' polarity, charts worked by hand, the classical lists of Period
 * 8's prosperous and reversed charts, Period 9's double stars, the
 * replacement chart, the formations, the stars' states, the texts in both
 * languages and what the page says. Made-up homes only.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { MOUNTAINS, homeOf, periodOf } from "../src/lib/chinese/fengshui-home.ts";
import { FLIGHT, LO_SHU, REPLACEMENT, STARS, counterpart, fly, flyingChart, formationsOf, mountainYang, starState } from "../src/lib/chinese/fengshui-stars.ts";
import { FORMATION_NAMES, FORMATION_TEXTS, STATE_TEXTS } from "../src/lib/chinese/fengshui-stars-texts.ts";
import { castLines, chartName, fssChartRef, fssFormationRef, fssPalaceRef, gridRows, planRows, starsReading } from "../src/lib/chinese/fengshui-stars-reading.ts";
import { homeStars, homeReading } from "../src/lib/chinese/fengshui-home-reading.ts";
import { homeTableCsv, homeTextParts } from "../src/lib/chinese/fengshui-home-table.ts";
import { mountainById } from "../src/lib/chinese/fengshui-home.ts";

const full = { script: "hant", show: "full" };
/** A chart's three stars per palace, as "mountain water/period", in the Lo Shu's rows, south at the top. */
const grid = (c) => gridRows("south").map((r) => r.map((p) => `${c.palaces[p].mountain}${c.palaces[p].water}/${c.palaces[p].period}`).join(" ")).join(" | ");
const opposite = (id) => MOUNTAINS[(mountainById(id).index + 12) % 24].id;

test("the flight path and the Lo Shu: Period 5's own chart is the square itself", () => {
  assert.deepEqual(FLIGHT, ["c", "nw", "w", "ne", "s", "n", "sw", "e", "se"]);
  assert.deepEqual(fly(5, true), LO_SHU);
  assert.deepEqual(fly(9, true), { c: 9, nw: 1, w: 2, ne: 3, s: 4, n: 5, sw: 6, e: 7, se: 8 });
  assert.deepEqual(fly(5, false), { c: 5, nw: 4, w: 3, ne: 2, s: 1, n: 9, sw: 8, e: 7, se: 6 });
  assert.deepEqual(gridRows("north"), [["nw", "n", "ne"], ["w", "c", "e"], ["sw", "s", "se"]]);
  assert.equal(STARS.length, 9);
  assert.deepEqual(STARS.map((s) => s.phase), ["water", "earth", "wood", "wood", "earth", "metal", "metal", "earth", "fire"]);
});

test("the nine palaces as a plan of the home: its front at the bottom, the outer palaces turned in steps of 45°", () => {
  assert.deepEqual(planRows("s"), [["nw", "n", "ne"], ["w", "c", "e"], ["sw", "s", "se"]], "facing south: north at the top, as a map");
  assert.deepEqual(planRows("e"), [["sw", "w", "nw"], ["s", "c", "n"], ["se", "e", "ne"]], "facing east: the north on the right");
  assert.deepEqual(planRows("n"), gridRows("south"), "facing north: the books' own layout, south at the top");
  assert.deepEqual(planRows("ne").map((r) => r[1]), ["sw", "c", "ne"]);
  for (const d of ["n", "ne", "e", "se", "s", "sw", "w", "nw"]) {
    const flat = planRows(d).flat();
    assert.equal(flat[7], d);
    assert.deepEqual([...flat].sort(), ["c", "e", "n", "ne", "nw", "s", "se", "sw", "w"]);
  }
});

test("the mountains' polarity: cardinal palaces yang first, corner palaces yang second and third", () => {
  const yang = MOUNTAINS.filter(mountainYang).map((m) => m.id);
  assert.deepEqual(yang, ["ren", "gen", "yin", "jia", "xun", "si", "bing", "kun", "shen", "geng", "qian", "hai"]);
  assert.equal(counterpart(mountainById("zi"), "se").id, "xun");
  assert.equal(counterpart(mountainById("ren"), "se").id, "chen");
  assert.equal(Object.keys(REPLACEMENT).length, 24);
  assert.deepEqual([1, 2, 6, 7, 9].map((n) => Object.values(REPLACEMENT).filter((x) => x === n).length), [4, 5, 6, 5, 4]);
});

test("charts worked by hand", () => {
  // Period 8, sitting Zi facing Wu: 4 at the back (its counterpart Xun, yang, forward); 3 at the front (Mao, yin, backward).
  const a = flyingChart(8, "wu", "zi");
  assert.equal(grid(a), "34/7 88/3 16/5 | 25/6 43/8 61/1 | 79/2 97/4 52/9");
  assert.deepEqual(a.mountain, { met: 4, by: "xun", centre: 4, forward: true, replaced: false });
  assert.deepEqual(a.water, { met: 3, by: "mao", centre: 3, forward: false, replaced: false });
  assert.deepEqual(a.formations, ["double-facing"]);
  // Period 8, sitting Chou facing Wei: the water's 5 takes Wei's own polarity (yin, backward).
  const b = flyingChart(8, "wei", "chou");
  assert.equal(grid(b), "36/7 71/3 58/5 | 47/6 25/8 93/1 | 82/2 69/4 14/9");
  assert.deepEqual(b.water, { met: 5, by: "wei", centre: 5, forward: false, replaced: false });
  assert.deepEqual(b.formations, ["prosperous", "ten-mountain", "fan-yin"]);
  // Period 9, sitting Zi facing Wu: double stars at the sitting.
  const c = flyingChart(9, "wu", "zi");
  assert.equal(grid(c), "63/8 18/4 81/6 | 72/7 54/9 36/2 | 27/3 99/5 45/1");
  assert.deepEqual(c.formations, ["double-sitting", "fan-yin"]);
  // Every star chart is the nine numbers once.
  for (const k of ["mountain", "water", "period"]) assert.deepEqual(FLIGHT.map((p) => c.palaces[p][k]).sort(), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
});

test("Period 8's classical lists: prosperous, reversed, and the strings that soften the reversed", () => {
  const tally = {};
  for (const f of MOUNTAINS) for (const id of flyingChart(8, f.id, opposite(f.id)).formations) (tally[id] ??= []).push(`${opposite(f.id)}-${f.id}`);
  assert.deepEqual(tally.prosperous.sort(), ["chou-wei", "hai-si", "qian-xun", "si-hai", "wei-chou", "xun-qian"]);
  assert.deepEqual(tally.reversed.sort(), ["chen-xu", "gen-kun", "kun-gen", "shen-yin", "xu-chen", "yin-shen"]);
  assert.deepEqual(tally["parent-string"].sort(), ["gen-kun", "kun-gen", "shen-yin", "yin-shen"]);
  assert.deepEqual(tally["pearl-string"].sort(), ["chen-xu", "xu-chen"]);
  assert.equal(tally["double-facing"].length + tally["double-sitting"].length, 12);
});

test("Period 9: every one of the 24 charts has double stars, at the facing or the sitting", () => {
  for (const f of MOUNTAINS) {
    const forms = flyingChart(9, f.id, opposite(f.id)).formations;
    assert.ok(forms.includes("double-facing") !== forms.includes("double-sitting"), `${f.id}: ${forms}`);
    assert.ok(!forms.includes("prosperous") && !forms.includes("reversed"), f.id);
  }
});

test("the replacement chart: the counterpart's replacement star to the centre, the direction kept, a 5 kept", () => {
  const ti = flyingChart(8, "wu", "zi", true);
  assert.deepEqual(ti.mountain, { met: 4, by: "xun", centre: 6, forward: true, replaced: true });
  assert.deepEqual(ti.water, { met: 3, by: "mao", centre: 2, forward: false, replaced: true });
  assert.equal(grid(ti), "53/7 17/3 35/5 | 44/6 62/8 89/1 | 98/2 26/4 71/9");
  assert.deepEqual(ti.formations, ["ten-water"]);
  const five = flyingChart(8, "wei", "chou", true);
  assert.equal(five.water.centre, 5);
  assert.equal(five.water.replaced, false);
  // A home near an edge has both charts; one well inside has the main alone.
  const period = { year: 1998, ...periodOf(1998) };
  assert.ok(homeStars(homeOf(170, "compass", null), period, 2026).ti);
  assert.equal(homeStars(homeOf(180, "compass", null), period, 2026).ti, null);
  assert.equal(homeStars(homeOf(180, "compass", null), null, 2026), null);
  assert.equal(homeStars(homeOf(180, "compass", null), period, 2026).now, 9);
});

test("the formations over a whole chart: the Combination of Ten, the strings, the repeated chart", () => {
  const palaces = (f) => Object.fromEntries(FLIGHT.map((p) => [p, f(p)]));
  const cast = (centre, forward) => ({ met: centre, by: "zi", centre, forward, replaced: false });
  const ten = { period: 8, palaces: palaces((p) => ({ base: 5, period: fly(8, true)[p], mountain: 10 - fly(8, true)[p], water: 1 })), mountain: cast(2, false), water: cast(1, true) };
  assert.ok(formationsOf(ten, "s", "n").includes("ten-mountain"));
  const pearl = { period: 1, palaces: palaces((p) => ({ base: 5, period: fly(1, true)[p], mountain: fly(2, true)[p], water: fly(3, true)[p] })), mountain: cast(2, true), water: cast(3, true) };
  assert.ok(formationsOf(pearl, "s", "n").includes("pearl-string"));
  const repeated = { period: 1, palaces: palaces((p) => ({ base: 5, period: fly(1, true)[p], mountain: fly(5, true)[p], water: fly(4, true)[p] })), mountain: cast(5, true), water: cast(4, true) };
  assert.ok(formationsOf(repeated, "s", "n").includes("fu-yin"));
});

test("a star's state in a period: timely, waning, dormant", () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => starState(n, 9).state), ["timely", "timely", "dormant", "dormant", "dormant", "dormant", "dormant", "waning", "timely"]);
  assert.equal(starState(9, 9).current, true);
  assert.equal(starState(1, 9).current, false);
  assert.equal(starState(7, 8).state, "waning");
});

test("the texts in both languages, in Ulune's typography and tone", () => {
  const all = [...Object.values(FORMATION_TEXTS), ...Object.values(STATE_TEXTS), ...Object.values(FORMATION_NAMES).map((n) => [n.en, n.fr])];
  assert.equal(Object.keys(FORMATION_TEXTS).length, 10);
  for (const [en, fr] of all) {
    for (const t of [en, fr]) {
      assert.doesNotMatch(t, /'/);
      assert.doesNotMatch(t, / {2}/);
    }
    assert.doesNotMatch(fr, /[^\u202f][:;?!]/, fr.slice(0, 40));
    assert.doesNotMatch(en, /\b(death|dies?|illness|disease|sick\w*|health\w*|doomed|unlucky|lucky|curse[ds]?|must|fate|disaster|divorce|accident|bankrupt\w*|buy)\b/i, en.slice(0, 40));
    assert.doesNotMatch(fr, /\b(mort|meurt|maladie|malade|santé|malchance|maudit|condamn\w*|doit|devez|destin|désastre|divorce|accident|faillite|acheter)\b/i, fr.slice(0, 40));
  }
});

test("what the page says: the chart, its casting, a palace, a formation; the table", () => {
  const home = homeOf(180, "compass", null);
  const period = { year: 2005, ...periodOf(2005) };
  const stars = homeStars(home, period, 2026);
  const ctx = { home, period, people: [], place: "Paris", declination: null, stars };
  assert.equal(chartName(stars.main, "en", full), "Period 8 · Zi mountain, Wu facing · 子山午向");
  assert.equal(chartName(stars.main, "fr", { script: "hant", show: "names" }), "Période 8 · montagne Zi, façade Wu");
  const lines = castLines(stars.main, "en", full);
  assert.match(lines[0], /^The period chart: 8 in the centre/);
  assert.equal(lines[1], "The mountain star: the period chart’s 4, in the sitting palace, goes to the centre. In palace 4, Xun holds the place Zi holds in its own; being yang, the star flies forward.");
  assert.equal(castLines(stars.main, "fr", full)[2], "L’étoile de l’eau\u202f: le 3 du thème de la période, dans le palais de la façade, va au centre. Dans le palais 3, Mao tient la place que Wu tient dans le sien\u202f; étant yin, l’étoile vole vers l’arrière.");
  const chart = homeReading(ctx, fssChartRef("main"), "en", full);
  assert.equal(chart.kicker, "Double stars at the facing");
  assert.equal(chart.links.rows.length, 9);
  const s = homeReading(ctx, fssPalaceRef("main", "s"), "en", full);
  assert.equal(s.title, "South palace");
  assert.equal(s.lead, "Mountain star 8, water star 8, period star 3; the Lo Shu’s own number here is 9.");
  assert.equal(s.paragraphs[1], "Mountain star: 8 White · bā bái 八白, earth, waning.");
  assert.equal(homeReading(ctx, fssPalaceRef("main", "c"), "fr", full).title, "Le centre");
  assert.equal(homeReading(ctx, fssPalaceRef("main", "e"), "fr", full).title, "Palais de l’est");
  const f = homeReading(ctx, fssFormationRef("double-facing"), "en", full);
  assert.equal(f.lead, FORMATION_TEXTS["double-facing"][0]);
  assert.equal(f.facts[0].ref, fssChartRef("main"));
  assert.equal(homeReading(ctx, fssChartRef("ti"), "en", full), null, "no replacement chart well inside a mountain");
  assert.equal(starsReading(null, fssChartRef("main"), "en", full), null);
  // The table: the stars between the facing and the mountains.
  const parts = homeTextParts(ctx, "Camille", "en", full);
  assert.deepEqual(parts.map((p) => p.id), ["facing", "stars", "mountains"]);
  assert.equal(parts[1].lines[1], "Period 8 · Zi mountain, Wu facing · 子山午向");
  assert.equal(parts[1].lines.length, 3 + 9);
  const csv = homeTableCsv(ctx).split("\n");
  assert.ok(csv.includes("stars,main,s,8,8,3,9,8-8"));
  assert.ok(csv.includes("stars,main,formations,double-facing,,,,"));
});
