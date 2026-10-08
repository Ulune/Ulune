// "In your chart" (encyclopedia plan, part 18): what a page says for a
// made-up chart, in both languages; every entry it links exists; the
// studio's summary of a bodygraph names real entries; nothing personal is
// needed for any of it but the chart itself, held in the tab.
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildEncyclopedia, readContent } from "./encyclopedia/build.mjs";
import { degrees, inYourChart, titleOf, yourPages } from "../src/encyclopedia/in-your-chart.ts";
import { hdOf } from "../src/studio/your-chart-summary.ts";
import { HD_CHANNELS } from "../src/lib/chart/human-design.ts";
import { chooseYourChart, setYourCharts, takeAskedReading, askReading, yourChart } from "../src/encyclopedia/your-chart.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const real = buildEncyclopedia(readContent(`${ROOT}content/encyclopedia`));
const terms = real.data.index.terms;

const body = (id, sign, deg, house, extra = {}) => ({ id, ref: `planet:${id}`, sign, deg, house, retro: false, dignity: null, angle: false, ...extra });
/** A made-up chart (no real person's): the Sun in Gemini, the Moon in Scorpio, Saturn at home in Capricorn. */
const CHART = {
  id: "a",
  label: "Sample",
  timeUnknown: false,
  isDay: true,
  bodies: [
    body("sun", "gemini", 24.2, 10),
    body("moon", "scorpio", 12.08, 3),
    body("mercury", "gemini", 3.5, 9),
    body("venus", "taurus", 28, 9, { dignity: "domicile" }),
    body("mars", "leo", 1.1, 11),
    body("jupiter", "cancer", 5, 11, { dignity: "exaltation" }),
    body("saturn", "capricorn", 14.08, 5, { dignity: "domicile", retro: true }),
    body("uranus", "capricorn", 8, 5),
    body("neptune", "capricorn", 13, 5),
    body("pluto", "scorpio", 16, 3),
    body("north-node", "aquarius", 10, 6, { ref: "planet:northnode" }),
    { id: "ascendant", ref: "angle:ascendant", sign: "virgo", deg: 4.2, house: null, retro: false, dignity: null, angle: true },
    { id: "midheaven", ref: "angle:midheaven", sign: "gemini", deg: 1, house: null, retro: false, dignity: null, angle: true },
  ],
  cusps: ["virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces", "aries", "taurus", "gemini", "cancer", "leo"],
  aspects: [
    { a: "saturn", b: "neptune", type: "conjunction", orb: 1.08, applying: true, ref: "aspect:saturn_conjunction_neptune" },
    { a: "sun", b: "saturn", type: "quincunx", orb: 1.9, applying: false, ref: "aspect:sun_quincunx_saturn" },
    { a: "moon", b: "pluto", type: "conjunction", orb: 3.9, applying: null, ref: "aspect:moon_conjunction_pluto" },
    { a: "moon", b: "saturn", type: "sextile", orb: 2, applying: false, ref: "aspect:moon_sextile_saturn" },
    { a: "venus", b: "mars", type: "square", orb: 3.1, applying: false, ref: "aspect:venus_square_mars" },
    { a: "moon", b: "venus", type: "opposition", orb: 4.1, applying: false, ref: "aspect:moon_opposition_venus" },
  ],
  numbers: [
    { place: "life-path", value: 7, ref: "core:lifepath", debt: null },
    { place: "birthday", value: 11, ref: "core:birthday", debt: null },
    { place: "expression", value: 7, ref: "core:expression", debt: 16 },
    { place: "personal-year", value: 3, ref: "core:personalYear", debt: null },
  ],
  hd: null,
};

const page = (id) => {
  const [tradition, family] = terms[id];
  return { id, tradition, family, kind: real.data.pages[`en/${id}`]?.kind };
};
const say = (id, lang = "en", c = CHART) => {
  const m = inYourChart(page(id), c, lang);
  return m ? m.lines.map((l) => l.map((p) => (typeof p === "string" ? p : `[${p.text ?? titleOf(p.id, lang) ?? p.id}]`)).join("")).join(" / ") : null;
};
const links = (m) => m.lines.flat().filter((p) => typeof p !== "string").map((p) => p.id);

test("a planet: its sign, degree, house, dignity and closest aspects, each a link", () => {
  assert.equal(
    say("saturn"),
    "Your Saturn: in [Capricorn] at 14°05′, in the [5th house], retrograde, in its [domicile]. / Its closest aspects: [Saturn conjunct Neptune] (1°05′), [Sun quincunx Saturn] (1°54′) and [Moon sextile Saturn] (2°00′).",
  );
  assert.equal(say("saturn", "fr"), "Votre Saturne\u202f: en [Capricorne] à 14°05′, en [maison V], rétrograde, dans son [domicile]. / Ses aspects les plus serrés\u202f: [Saturne conjoint Neptune] (1°05′), [Soleil quinconce Saturne] (1°54′) et [Lune sextile Saturne] (2°00′).");
  const m = inYourChart(page("saturn"), CHART, "en");
  assert.deepEqual(links(m).slice(0, 3), ["saturn-in-capricorn", "saturn-in-house-5", "domicile"]);
  assert.deepEqual(m.reading, { path: "/", ref: "planet:saturn" });
});

test("signs, houses, angles, aspects, dignities, elements", () => {
  assert.equal(say("scorpio"), "Scorpio in your chart: [Moon] 12°05′ and [Pluto] 16°00′. / Cusp in Scorpio: [3rd house].");
  assert.equal(say("aries"), "None of your planets is in Aries. / Cusp in Aries: [8th house].");
  assert.equal(say("house-5"), "Your 5th house begins in [Capricorn]; in it: [Saturn], [Uranus] and [Neptune].");
  assert.equal(say("house-5", "fr"), "Votre maison V commence en [Capricorne]\u202f; s’y trouvent\u202f: [Saturne], [Uranus] et [Neptune].");
  assert.equal(say("ascendant"), "Your Ascendant: in [Virgo] at 4°12′.");
  assert.equal(inYourChart(page("ascendant"), CHART, "en").lines[0][2].id, "ascendant-in-virgo");
  assert.equal(say("conjunction"), "Your conjunctions, tightest first: [Saturn conjunct Neptune] (1°05′) and [Moon conjunct Pluto] (3°54′).");
  assert.equal(say("trine"), "Your chart has no trine.");
  assert.equal(say("domicile"), "In their domicile in your chart: [Venus in Taurus] and [Saturn in Capricorn].");
  assert.equal(say("fall"), "None of your planets is in its fall.");
  assert.equal(say("element-earth"), "Earth in your chart: [Venus], [Saturn], [Uranus] and [Neptune], 4 of the ten planets.");
  // Nothing to say on a page that is not a part of a chart.
  assert.equal(say("eclipse"), null);
  assert.equal(say("placidus"), null);
});

test("combination pages: yes, or what the chart has instead", () => {
  assert.equal(say("moon-in-scorpio"), "Yes: your Moon is in [Scorpio] at 12°05′, in the [3rd house].");
  assert.equal(say("moon-in-taurus"), "Your Moon is in [Scorpio] at 12°05′, in the [3rd house].");
  assert.equal(links(inYourChart(page("moon-in-taurus"), CHART, "en"))[0], "moon-in-scorpio");
  assert.equal(say("saturn-in-house-5", "fr"), "Oui\u202f: votre Saturne est en [Capricorne] à 14°05′, en [maison V], rétrograde, dans son [domicile].");
  assert.equal(say("venus-square-mars"), "In your chart: orb 3°06′, separating.");
  assert.equal(say("saturn-conjunction-neptune"), "In your chart: orb 1°05′, applying.");
  assert.equal(say("moon-trine-pluto"), "Not in your chart: your Moon and Pluto are [conjunct] (3°54′).");
  assert.equal(say("moon-trine-pluto", "fr"), "Pas dans votre thème\u202f: votre Lune et Pluton sont en [conjonction] (3°54′).");
  assert.equal(say("sun-trine-moon"), "Not in your chart: your Sun and Moon make no major aspect.");
  assert.equal(say("ascendant-in-virgo"), "Yes: your Ascendant is in [Virgo] at 4°12′.");
  assert.equal(say("saturn-and-ascendant"), "Not in your chart: your Saturn and Ascendant make no major aspect.");
});

test("without a birth time: no angles, no houses, said once", () => {
  const noon = { ...CHART, timeUnknown: true, cusps: null, bodies: CHART.bodies.filter((b) => !b.angle).map((b) => ({ ...b, house: null })) };
  const why = "Without a birth time, your chart has no Ascendant, Midheaven or houses.";
  for (const id of ["ascendant", "house-10", "ascendant-in-leo", "mars-in-house-10", "saturn-and-midheaven"]) assert.equal(say(id, "en", noon), why, id);
  assert.equal(say("mars", "en", noon), "Your Mars: in [Leo] at 1°06′. / Its closest aspects: [Venus square Mars] (3°06′).");
});

test("numerology: a place, a number, a combination, a debt; names asked for where needed", () => {
  assert.equal(say("life-path"), "Your Life Path is [7].");
  assert.equal(inYourChart(page("life-path"), CHART, "en").lines[0][1].id, "life-path-7");
  assert.equal(say("life-path-7"), "Yes: your Life Path is [7].");
  assert.equal(inYourChart(page("life-path-7"), CHART, "en").lines[0][2].id, "number-7");
  assert.equal(say("life-path-3", "fr"), "Votre Chemin de vie est [7].");
  assert.equal(say("number-7"), "7 in your numbers: [Life Path] and [Expression].");
  assert.equal(say("number-5"), "5 is not among your numbers.");
  assert.equal(say("master-numbers"), "Master numbers among yours: [Birthday 11].");
  assert.equal(say("karmic-debt-16"), "On the way to your [Expression], the sum passes through 16.");
  assert.equal(say("soul-urge"), "Your Soul Urge needs the full name at birth, given on the Numerology page.");
  assert.equal(say("personal-year"), "Your personal year is [3] (this calendar year).");
});

test("Human Design: from the bodygraph when it was cast in the tab, else a line saying so", () => {
  assert.equal(say("hd-generator"), "Your bodygraph shows here once the Human Design page has drawn it in this tab.");
  assert.deepEqual(inYourChart(page("hd-gate-34"), CHART, "en").reading, { path: "/human-design", ref: null });
  const hd = hdOf({
    type: "Manifesting Generator",
    authority: "Self-Projected",
    profile: "1/3",
    definition: "Single",
    definedCenters: ["sacral", "solarPlexus", "throat"],
    activations: [
      { body: "sun", layer: "personality", gate: 34, line: 2, ecliptic: 0 },
      { body: "earth", layer: "design", gate: 20, line: 5, ecliptic: 0 },
      { body: "northnode", layer: "design", gate: 57, line: 1, ecliptic: 0 },
    ],
    definedChannels: [{ id: "34–20", gates: [34, 20], centers: ["sacral", "throat"], personality: false, design: false, mixed: true }],
  });
  for (const id of [hd.type, hd.authority, hd.profile, ...hd.centres, ...hd.channels.map((c) => c.id)]) assert.ok(terms[id], id);
  const c = { ...CHART, hd };
  // (The page shows the entry's title for a link given by id: here, the id.)
  assert.equal(say("hd-manifesting-generator", "en", c), "You are a [hd-manifesting-generator].");
  assert.equal(say("hd-projector", "en", c), "Your type is [hd-manifesting-generator].");
  assert.equal(say("hd-gate-34", "en", c), "Gate 34 is active in your bodygraph: line 2, Sun (Personality). / It completes [the channel 34–20].");
  assert.equal(say("hd-gate-20", "fr", c), "La porte 20 est active dans votre bodygraph\u202f: ligne 5, Terre (Design). / Elle complète [le canal 34–20].");
  assert.equal(say("hd-channel-10-57", "en", c), "You have one of its gates: [gate 57], a hanging gate.");
  assert.equal(say("hd-centre-head", "en", c), "This centre is undefined in your bodygraph.");
  assert.equal(say("hd-line-3", "en", c), "Line 3 is in your profile ([hd-profile-1-3]).");
});

test("every channel, type and authority the studio can give has its entry", () => {
  for (const ch of HD_CHANNELS) assert.ok(terms[`hd-channel-${ch.id.replace("–", "-")}`], ch.id);
  for (const t of ["Manifestor", "Generator", "Manifesting Generator", "Projector", "Reflector"]) assert.ok(terms[`hd-${t.toLowerCase().replace(/ /g, "-")}`], t);
  for (const a of ["Emotional", "Sacral", "Splenic", "Ego", "Self-Projected", "Mental", "Lunar"]) assert.ok(terms[`hd-authority-${a.toLowerCase()}`], a);
});

test("every link a page can make exists, and the home's index lists real pages", () => {
  const ids = Object.keys(terms);
  for (const id of ids) {
    for (const lang of ["en", "fr"]) {
      const m = inYourChart(page(id), CHART, lang);
      if (!m) continue;
      for (const l of links(m)) assert.ok(terms[l], `${id} → ${l}`);
      for (const line of m.lines) for (const p of line) if (typeof p === "string") assert.ok(!/undefined|NaN/.test(p), `${id}: ${p}`);
    }
  }
  for (const g of yourPages(CHART)) for (const id of g.ids) {
    assert.ok(terms[id], id);
    assert.equal(titleOf(id, "en"), real.data.pages[`en/${id}`].title, id);
    assert.equal(titleOf(id, "fr"), real.data.pages[`fr/${id}`].title, id);
  }
  assert.equal(degrees(29.9999), "30°00′");
});

test("the bridge: the open chart, a chosen one, a reading asked once; nothing kept", () => {
  setYourCharts({ active: "a", charts: [CHART, { ...CHART, id: "b", label: "Sample B" }] });
  assert.equal(yourChart().id, "a");
  chooseYourChart("b");
  assert.equal(yourChart().id, "b");
  askReading("b", "planet:saturn");
  assert.deepEqual(takeAskedReading(), { chart: "b", ref: "planet:saturn" });
  assert.equal(takeAskedReading(), null);
  setYourCharts(null);
  assert.equal(yourChart(), null);
});
