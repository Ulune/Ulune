/**
 * Feng Shui's Relationship lens, two people in one home (review items FS5 and
 * FS32): two Kua pairs worked by hand (Kua 1 with Kua 4, both of the East
 * group; Kua 1 with Kua 2, of two groups), both counts for a birth without
 * one, the shared, challenging and mixed directions and their order, the
 * desk and the bed for two, every pair of Kua's invariants, the readings,
 * the home beside the two Kua, the table's text and CSV, and the texts'
 * typography and tone in both languages.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { DIRECTION_IDS, EIGHT_MANSIONS, MANSION_IDS, MANSIONS, fengShuiOf, trigramOfKua } from "../src/lib/chinese/fengshui.ts";
import { homeOf } from "../src/lib/chinese/fengshui-home.ts";
import { fengShuiPair, pairDirection } from "../src/lib/chinese/fengshui-pair.ts";
import {
  FSP_PRACTICE_REF,
  FSP_SUMMARY_REF,
  bestDirection,
  bestLine,
  directionAria,
  directionList,
  forTwoLines,
  fsPairReading,
  fsPairRefs,
  fspDirRef,
  fspKuaRef,
  groupsLine,
  kindLabel,
  pairDirLine,
  pairHomeLine,
  pairPracticeLines,
} from "../src/lib/chinese/fengshui-pair-reading.ts";
import { fsPairTableCsv, fsPairTextParts } from "../src/lib/chinese/fengshui-pair-table.ts";
import { chinese } from "../src/lib/i18n/catalog/chinese.ts";

const full = { script: "hant", show: "full" };
const names = { a: "TraceQA", b: "Sample B" };
// Made-up births (never a real person's): Camille, 15 June 1990, 12:00 in Paris; Sample B, 3 November 1987, 23:10 in Oslo.
const CAMILLE = { utc: "1990-06-15T10:00:00Z", date: "1990-06-15", time: "12:00", longitude: 2.3522 };
const SAMPLE_B = { utc: "1987-11-03T22:10:00Z", date: "1987-11-03", time: "23:10", longitude: 10.7522 };
const A_YANG = fengShuiOf(CAMILLE, "yang");
const A_YIN = fengShuiOf(CAMILLE, "yin");
const B_YANG = fengShuiOf(SAMPLE_B, "yang");
const B_YIN = fengShuiOf(SAMPLE_B, "yin");
const ctxOf = (a, b, lists = { a: [a], b: [b] }, home = null) => ({ pair: fengShuiPair(a, b), names, lists, home });
/** A Kua's Eight Mansions as fengShuiOf gives them, for any Kua (the solar year is beside the point here). */
const kuaFs = (kua) => {
  const list = EIGHT_MANSIONS[kua];
  const of = Object.fromEntries(MANSION_IDS.map((m, i) => [m, list[i]]));
  const trigram = trigramOfKua(kua);
  const directions = DIRECTION_IDS.map((d) => {
    const rank = list.indexOf(d);
    return { direction: d, mansion: MANSION_IDS[rank], rank, supportive: MANSIONS[MANSION_IDS[rank]].supportive };
  });
  return { count: "yang", solarYear: 2000, kua, steps: { root: 1, raw: 1, five: false }, trigram, group: trigram.group, directions, of, uncertain: false };
};
const mansions = (p) => Object.fromEntries(p.directions.map((x) => [x.direction, [x.a.mansion, x.b.mansion]]));

test("both counts for a birth without one: the yang count's Kua and the yin count's", () => {
  // 1990: 1 + 9 + 9 + 0 = 19, 1 + 9 = 10, 1. Yang 11 − 1 = 10 → 1 (Kan); yin 4 + 1 = 5 → 8 (Gen, the rule for 5).
  assert.deepEqual([A_YANG.kua, A_YANG.group, A_YIN.kua, A_YIN.group], [1, "east", 8, "west"]);
  // 1987: 1 + 9 + 8 + 7 = 25, 2 + 5 = 7. Yang 11 − 7 = 4 (Xun); yin 4 + 7 = 11 → 2 (Kun).
  assert.deepEqual([B_YANG.kua, B_YANG.group, B_YIN.kua, B_YIN.group], [4, "east", 2, "west"]);
});

test("by hand: Kua 1 and Kua 4, both of the East group, share their four supportive directions and their four challenging ones", () => {
  const p = fengShuiPair(A_YANG, B_YANG);
  assert.equal(p.sameGroup, true);
  assert.equal(p.sameKua, false);
  // Kua 1: Sheng Qi SE, Tian Yi E, Yan Nian S, Fu Wei N, Huo Hai W, Wu Gui NE, Liu Sha NW, Jue Ming SW.
  // Kua 4: Sheng Qi N, Tian Yi S, Yan Nian E, Fu Wei SE, Huo Hai NW, Wu Gui SW, Liu Sha W, Jue Ming NE.
  assert.deepEqual(mansions(p), {
    n: ["fu-wei", "sheng-qi"],
    ne: ["wu-gui", "jue-ming"],
    e: ["tian-yi", "yan-nian"],
    se: ["sheng-qi", "fu-wei"],
    s: ["yan-nian", "tian-yi"],
    sw: ["jue-ming", "wu-gui"],
    w: ["huo-hai", "liu-sha"],
    nw: ["liu-sha", "huo-hai"],
  });
  assert.deepEqual(Object.fromEntries(p.directions.map((x) => [x.direction, x.kind])), { n: "both-good", ne: "both-hard", e: "both-good", se: "both-good", s: "both-good", sw: "both-hard", w: "both-hard", nw: "both-hard" });
  // The most supportive for both first: E and S (Tian Yi and Yan Nian, the lower-placed the third), then N and SE (Fu Wei, the fourth); clockwise between equals.
  assert.deepEqual(p.shared, ["e", "s", "n", "se"]);
  // The mildest first: W and NW (Huo Hai and Liu Sha), then NE and SW (Wu Gui and Jue Ming).
  assert.deepEqual(p.hard, ["w", "nw", "ne", "sw"]);
  assert.deepEqual(p.mixed, []);
  assert.equal(p.desk, "e");
  // The bed towards Tian Yi or Yan Nian for both: the east (and the south) give both.
  assert.equal(p.bed, "e");
  assert.deepEqual(p.sides, { a: ["n", "e", "se", "s"], b: ["n", "e", "se", "s"] });
  assert.equal(bestDirection(p), "e");
});

test("by hand: Kua 1 and Kua 2, of two groups: every direction is one's supportive and the other's challenging", () => {
  const p = fengShuiPair(A_YANG, B_YIN);
  assert.equal(p.sameGroup, false);
  // Kua 2: Sheng Qi NE, Tian Yi W, Yan Nian NW, Fu Wei SW, Huo Hai E, Wu Gui SE, Liu Sha S, Jue Ming N.
  assert.deepEqual(mansions(p), {
    n: ["fu-wei", "jue-ming"],
    ne: ["wu-gui", "sheng-qi"],
    e: ["tian-yi", "huo-hai"],
    se: ["sheng-qi", "wu-gui"],
    s: ["yan-nian", "liu-sha"],
    sw: ["jue-ming", "fu-wei"],
    w: ["huo-hai", "tian-yi"],
    nw: ["liu-sha", "yan-nian"],
  });
  assert.ok(p.directions.every((x) => x.kind === "mixed"));
  assert.deepEqual(Object.fromEntries(p.directions.map((x) => [x.direction, x.good])), { n: "a", ne: "b", e: "a", se: "a", s: "a", sw: "b", w: "b", nw: "b" });
  assert.deepEqual(p.shared, []);
  assert.deepEqual(p.hard, []);
  // The gentlest first: where the one challenged finds Huo Hai (E, W), then Wu Gui (NE, SE), Liu Sha (S, NW), Jue Ming (N, SW).
  assert.deepEqual(p.mixed, ["e", "w", "ne", "se", "s", "nw", "n", "sw"]);
  // The desk: the east, TraceQA's Tian Yi and Sample B's Huo Hai. The bed: the west and the east weigh the same
  // (Tian Yi for one, Huo Hai for the other); the bed takes the one the desk does not lean towards.
  assert.equal(p.desk, "e");
  assert.equal(p.bed, "w");
  assert.equal(pairDirection(p, p.desk).good, "a");
  assert.equal(pairDirection(p, p.bed).good, "b");
  assert.deepEqual(p.sides, { a: ["n", "e", "se", "s"], b: ["ne", "sw", "w", "nw"] });
});

test("the same Kua: the same mansion everywhere, the rooms need no splitting", () => {
  const p = fengShuiPair(A_YANG, fengShuiOf(CAMILLE, "yang"));
  assert.equal(p.sameKua, true);
  assert.ok(p.directions.every((x) => x.a.mansion === x.b.mansion));
  assert.deepEqual(p.shared, ["se", "e", "s", "n"]);
  assert.equal(p.desk, "se");
  assert.equal(p.bed, "e");
  const rooms = pairPracticeLines(ctxOf(A_YANG, fengShuiOf(CAMILLE, "yang")), "en").find((l) => l.id === "rooms");
  assert.match(rooms.text, /^With the same Kua, every direction is the same for you both/);
  assert.match(pairDirLine(p, "se", names, "en"), /the Growth direction of each of you\.$/);
});

test("every pair of Kua: one group shares four and four, two groups mix all eight, the desk and the bed where they should be, and no person comes first", () => {
  const KUAS = [1, 2, 3, 4, 6, 7, 8, 9];
  for (const ka of KUAS) {
    for (const kb of KUAS) {
      const a = kuaFs(ka);
      const b = kuaFs(kb);
      const p = fengShuiPair(a, b);
      const q = fengShuiPair(b, a);
      const tag = `${ka}·${kb}`;
      assert.equal(p.shared.length + p.hard.length + p.mixed.length, 8, tag);
      if (a.group === b.group) {
        assert.deepEqual([p.shared.length, p.hard.length, p.mixed.length], [4, 4, 0], tag);
        assert.ok(p.shared.includes(p.desk) && p.shared.includes(p.bed), tag);
        // The desk is the one most supportive for both: no shared direction has both of its mansions placed higher.
        const d = pairDirection(p, p.desk);
        for (const s of p.shared) assert.ok(Math.max(pairDirection(p, s).a.rank, pairDirection(p, s).b.rank) >= Math.max(d.a.rank, d.b.rank), tag);
      } else {
        assert.deepEqual([p.shared.length, p.hard.length, p.mixed.length], [0, 0, 8], tag);
        assert.equal(p.mixed.filter((x) => pairDirection(p, x).good === "a").length, 4, tag);
        // The two gentlest middles are each person's Huo Hai, one supportive for each.
        const [m0, m1] = p.mixed.map((x) => pairDirection(p, x));
        for (const m of [m0, m1]) assert.equal(m[m.good === "a" ? "b" : "a"].mansion, "huo-hai", tag);
        assert.notEqual(m0.good, m1.good, tag);
        assert.equal(p.desk, p.mixed[0], tag);
        const bed = pairDirection(p, p.bed);
        assert.equal(bed[bed.good === "a" ? "b" : "a"].mansion, "huo-hai", tag);
      }
      // Swapping the two people swaps the sides, never what the directions are.
      assert.deepEqual(new Set(q.shared), new Set(p.shared), tag);
      assert.deepEqual(new Set(q.mixed), new Set(p.mixed), tag);
      assert.deepEqual(q.sides, { a: p.sides.b, b: p.sides.a }, tag);
      for (const x of p.directions) assert.equal(pairDirection(q, x.direction).good, x.good === null ? null : x.good === "a" ? "b" : "a", tag);
    }
  }
});

test("the lines for two, in English and French", () => {
  const same = fengShuiPair(A_YANG, B_YANG);
  const two = fengShuiPair(A_YANG, B_YIN);
  assert.equal(groupsLine(same, names, "en"), "TraceQA (Kua 1) and Sample B (Kua 4) are both of the East group: your four supportive directions are the same, the north, the east, the south-east and the south, and so are your four challenging ones.");
  assert.equal(groupsLine(two, names, "fr"), "TraceQA (Kua 1) est du groupe de l’Est et Sample B (Kua 2) du groupe de l’Ouest\u202f: les quatre directions favorables de l’un sont les quatre directions difficiles de l’autre.");
  assert.equal(bestLine(same, names, "en"), "The most supportive for you both: the east, TraceQA’s Restoration direction and Sample B’s Harmony.");
  assert.equal(bestLine(same, names, "fr"), "La plus favorable pour vous deux\u202f: l’est, la direction de Ressourcement pour TraceQA et d’Harmonie pour Sample B.");
  assert.equal(bestLine(two, names, "en"), "The best middle ground: the east, TraceQA’s Restoration direction and Sample B’s Friction, the mildest of the four challenging directions.");
  assert.equal(pairDirLine(two, "w", names, "en"), "The west is supportive for Sample B (Restoration) and challenging for TraceQA (Friction).");
  assert.equal(pairDirLine(two, "w", names, "fr"), "L’ouest est favorable pour Sample B (Ressourcement) et difficile pour TraceQA (Friction).");
  assert.equal(pairDirLine(same, "ne", names, "fr"), "Le nord-est est difficile pour vous deux\u202f: la direction d’Agitation pour TraceQA et d’Épuisement pour Sample B.");
  assert.equal(kindLabel(pairDirection(two, "ne"), names, "en"), "Mixed, supportive for Sample B");
  assert.equal(directionAria(two, "e", names, "en"), "East: mixed, supportive for TraceQA. TraceQA: Restoration, supportive; Sample B: Friction, challenging.");
  assert.equal(directionAria(same, "e", names, "fr"), "Est\u202f: favorable pour vous deux. TraceQA\u202f: Ressourcement, favorable\u202f; Sample B\u202f: Harmonie, favorable.");
  // A mixed direction where the one challenged finds Huo Hai makes a good middle ground; the others say only whose it is.
  assert.equal(forTwoLines(two, "e", names, "en").length, 2);
  assert.equal(forTwoLines(two, "n", names, "en").length, 1);
  assert.equal(forTwoLines(same, "s", names, "en")[0], chinese.fspTwoGood[0]);
  assert.equal(directionList(["s", "n", "e"], "fr", "or"), "le nord, l’est ou le sud");
});

test("the practical lines for two: a desk, a bed, rooms of your own, storage, suggestions with their reasons", () => {
  const same = pairPracticeLines(ctxOf(A_YANG, B_YANG), "en");
  assert.deepEqual(same.map((l) => l.id), ["desk", "bed", "rooms", "store"]);
  assert.equal(same[0].text, "A desk you share could face east: TraceQA’s Restoration direction and Sample B’s Harmony. At desks of your own, each of you could face your Growth direction: TraceQA facing south-east, Sample B facing north.");
  assert.equal(same[1].text, "For a bed you share, the tradition suggests the head towards the east: TraceQA’s Restoration direction and Sample B’s Harmony.");
  assert.match(same[2].text, /each of you could take the side of your Growth direction: TraceQA in the south-east, Sample B in the north\.$/);
  assert.equal(same[3].text, "The four directions challenging for you both, the north-east, the south-west, the west and the north-west, suit storage, a utility room or a hallway rather than a desk or a bed.");
  const two = pairPracticeLines(ctxOf(A_YANG, B_YIN), "fr");
  assert.equal(two[0].text, "Aucune direction n’est favorable pour vous deux\u202f; à un bureau partagé, faire face à l’est est le meilleur compromis\u202f: la direction de Ressourcement pour TraceQA et de Friction pour Sample B, la plus douce des quatre directions difficiles. À des bureaux séparés, chacun pourrait faire face à sa direction de Croissance\u202f: TraceQA face au sud-est, Sample B face au nord-est.");
  assert.match(two[1].text, /^Pour un lit partagé, un compromis est la tête vers l’ouest\u202f: la direction de Ressourcement pour Sample B et de Friction pour TraceQA/);
  assert.equal(two[2].text, "Les pièces peuvent se répartir selon vos côtés\u202f: une pièce ou un coin pour TraceQA vers le nord, l’est, le sud-est ou le sud, pour Sample B vers le nord-est, le sud-ouest, l’ouest ou le nord-ouest, les quatre directions favorables de chacun.");
  assert.equal(two[3].text, chinese.fspStoreSplit[1]);
});

test("the home on the Home lens beside the two Kua: its group against each one's, and the mansions its front faces", () => {
  // Facing 180° (south), sitting north: a Kan ☵ house, of the East group.
  const home = { home: homeOf(180, "compass", null), name: "Rue des Lilas" };
  const both = pairHomeLine(ctxOf(A_YANG, B_YANG, undefined, home), "en");
  assert.equal(both, "Your home “Rue des Lilas”, on the Home lens, is a Kan ☵ house of the East group. The same group as both your Kua: the Eight Mansions read it as suited to you both. Its front faces south: TraceQA’s Harmony direction and Sample B’s Restoration.");
  const one = pairHomeLine(ctxOf(A_YANG, B_YIN, undefined, { ...home, name: "" }), "fr");
  assert.equal(one, "Votre logement, dans le prisme Logement, est une maison Kan ☵ du groupe de l’Est. Le même groupe que le Kua de TraceQA, pas que celui de Sample B\u202f: la tradition ne demande à personne de déménager, et suggère à Sample B de s’appuyer sur ses propres directions favorables à l’intérieur. Sa façade est tournée vers le sud\u202f: la direction d’Harmonie pour TraceQA et d’Enchevêtrement pour Sample B.");
  const none = pairHomeLine(ctxOf(A_YIN, B_YIN, undefined, home), "en");
  assert.match(none, /A group neither of your Kua belongs to: the tradition never asks anyone to move/);
  assert.equal(pairHomeLine(ctxOf(A_YANG, B_YANG), "en"), null);
  const lines = pairPracticeLines(ctxOf(A_YANG, B_YANG, undefined, home), "en");
  assert.equal(lines.at(-1).id, "home");
});

test("the readings: the summary, each person's Kua named and read for two, each direction for two, the practice", () => {
  const c = ctxOf(A_YANG, B_YIN, { a: [A_YANG, A_YIN], b: [B_YANG, B_YIN] });
  for (const locale of ["en", "fr"]) for (const ref of fsPairRefs()) assert.ok(fsPairReading(c, ref, locale, full), `${locale} ${ref}`);
  const sum = fsPairReading(c, FSP_SUMMARY_REF, "en", full);
  assert.equal(sum.kicker, "TraceQA · Sample B · Two groups");
  assert.deepEqual(sum.facts.map((f) => f.value), ["Kua 1 · East group", "Kua 2 · West group", "—", "—", "N, NE, E, SE, S, SW, W, NW"]);
  assert.equal(sum.sections[1].title, "The best middle ground");
  assert.equal(sum.links.rows.length, 8);
  const kua = fsPairReading(c, fspKuaRef("b"), "fr", full);
  assert.match(kua.lead, /^Le nombre Kua de Sample B est le 2\u202f: le trigramme Kun/);
  assert.match(kua.kicker, /^Sample B · .*Compte yin/);
  assert.ok(kua.links.rows.every((r) => r.ref.startsWith("fsp:dir:")), "its directions read for two");
  const e = fsPairReading(c, fspDirRef("e"), "en", full);
  assert.equal(e.kicker, "Mixed, supportive for TraceQA");
  assert.deepEqual(e.sections.map((s) => s.id), ["two", "a", "b"]);
  assert.equal(e.sections[1].title, "TraceQA · Restoration");
  const practice = fsPairReading(c, FSP_PRACTICE_REF, "en", full);
  assert.deepEqual(practice.facts.map((f) => [f.value, f.ref]), [["East", fspDirRef("e")], ["West", fspDirRef("w")]]);
  assert.equal(fsPairReading(c, "fs:yang:kua", "en", full), null, "another page's ref");
  assert.equal(fsPairReading(c, null, "en", full), null);
  assert.equal(fsPairReading(null, FSP_SUMMARY_REF, "en", full), null);
});

test("the table: each person's Kua for each count shown, the one on the compass marked; the directions for two; the practice; CSV with ids", () => {
  const c = ctxOf(A_YANG, B_YIN, { a: [A_YANG, A_YIN], b: [B_YANG, B_YIN] }, { home: homeOf(180, "compass", null), name: "" });
  const parts = fsPairTextParts(c, "en", { script: "hans", show: "names" });
  assert.deepEqual(parts.map((x) => x.id), ["kua", "dirs", "practice"]);
  assert.equal(parts[0].lines[1], "TraceQA · Yang count: Kua 1 · ☵ Kan · East group (on the compass)");
  assert.equal(parts[0].lines[4], "Sample B · Yin count: Kua 2 · ☷ Kun · West group (on the compass)");
  assert.equal(parts[1].lines.length, 9);
  assert.match(parts[1].lines[3], /^East: TraceQA Restoration \(supportive\) · Sample B Friction \(challenging\) · Mixed, supportive for TraceQA$/);
  assert.equal(parts[2].lines.length, 6);
  assert.match(parts[2].lines[5], /^Your home: Your home, on the Home lens/);
  const fr = fsPairTextParts(c, "fr", full);
  assert.match(fr[0].lines[1], /^TraceQA · Compte yang\u202f: Kua 1/);
  const csv = fsPairTableCsv(c);
  const rows = csv.split("\n");
  assert.equal(rows[0], "kua,person,count,kua,trigram,group,compass,uncertain");
  assert.ok(rows.includes("kua,a,yang,1,kan,east,1,0"));
  assert.ok(rows.includes("kua,a,yin,8,gen,west,0,0"));
  assert.ok(rows.includes("kua,b,yin,2,kun,west,1,0"));
  assert.ok(rows.includes("dir,e,tian-yi,supportive,huo-hai,challenging,mixed,a"));
  assert.ok(rows.includes("practice,desk,e"));
  assert.ok(rows.includes("practice,bed,w"));
  assert.ok(rows.includes("practice,rooms-b,ne|sw|w|nw"));
  assert.ok(rows.includes("practice,store,"));
  assert.ok(rows.includes("practice,home,s"));
  // Each part a section of its own, named by its header's first cell.
  assert.deepEqual(csv.split("\n\n").map((s) => s.split(",")[0]), ["kua", "dir", "practice"]);
});

test("every text of the page in both languages, in Ulune's typography and tone", () => {
  const keys = Object.entries(chinese).filter(([k]) => k.startsWith("fsp"));
  assert.ok(keys.length > 60);
  const said = { en: [], fr: [] };
  for (const [, [en, fr]] of keys) {
    said.en.push(en);
    said.fr.push(fr);
  }
  // And every line the page builds, for the pairs above and the home, so the sentences put together are held to it too.
  const built = { en: [], fr: [] };
  for (const locale of ["en", "fr"]) {
    for (const [a, b] of [[A_YANG, B_YANG], [A_YANG, B_YIN], [A_YIN, B_YANG], [A_YANG, A_YANG]]) {
      const c = ctxOf(a, b, { a: [a], b: [b] }, { home: homeOf(45, "compass", null), name: "Home" });
      for (const ref of fsPairRefs()) {
        const r = fsPairReading(c, ref, locale, full);
        built[locale].push(r.lead ?? "", r.kicker, ...r.paragraphs, ...(r.sections ?? []).flatMap((s) => [s.title, ...s.paragraphs]));
      }
      built[locale].push(...fsPairTextParts(c, locale, full).flatMap((x) => x.lines));
    }
    for (const t of built[locale]) assert.doesNotMatch(t, /\{|\}|undefined|null|NaN/, t.slice(0, 60));
    said[locale].push(...built[locale]);
  }
  for (const locale of ["en", "fr"]) {
    for (const t of said[locale]) {
      assert.doesNotMatch(t, /'/, t.slice(0, 60));
      assert.doesNotMatch(t, / {2}/, t.slice(0, 60));
      if (locale === "fr") {
        assert.doesNotMatch(t, /[^\u202f][:;?!](?=\s|$)/, t.slice(0, 80));
        assert.doesNotMatch(t, /\b(mort|meurt|maladie|malade|santé|malchance|maudit|condamn\w*|doit|devez|destin|désastre|divorce|accident|achet\w*|séparation|dispute)\b/i, t.slice(0, 60));
        assert.doesNotMatch(t, /"/, t.slice(0, 60));
      } else {
        assert.doesNotMatch(t, /\b(death|dies?|illness|disease|sick\w*|health\w*|doomed|unlucky|lucky|curse[ds]?|must|fate|disaster|divorce|accident|buy\w*|break[- ]?up|incompatible)\b/i, t.slice(0, 60));
        assert.doesNotMatch(t, /"/, t.slice(0, 60));
      }
    }
  }
  // Never a verdict on two people: the groups say nothing of how they get on.
  assert.match(chinese.fspNoVerdict[0], /never the bond between you/);
  assert.match(chinese.fspAbout[1], /rien n’est envoyé/);
});
