/**
 * BaZi's Pair (languages plan, part 19): the Day Masters' gods and phases,
 * the partner palaces, every meeting between two charts' pillars (trines of
 * two included), what each brings the other; two made-up births and made-up
 * boards; the readings in both languages; the table's text and CSV. Part 20:
 * the luck pillars of the moment (BZ9), by each count or the birth's own,
 * the same decade, before the first; French's articles and elisions.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { HIDDEN_STEMS, STEMS, BRANCHES, SIXTY } from "../src/lib/chinese/names.ts";
import { baziChart, tenGodOf } from "../src/lib/chinese/bazi.ts";
import { baziPair } from "../src/lib/chinese/bazi-pair.ts";
import {
  PAIR_DM_REF,
  PAIR_GIFTS_REF,
  PAIR_LUCK_REF,
  PAIR_PALACE_REF,
  dmLine,
  giftLines,
  luckLines,
  luckRows,
  meetFromLabel,
  pairCellRef,
  pairMeetRef,
  pairReading,
} from "../src/lib/chinese/bazi-pair-reading.ts";
import { pairTableCsv, pairTextParts } from "../src/lib/chinese/bazi-pair-table.ts";
import { deFr, semicolon } from "../src/lib/chinese/both.ts";
import { PLACE_WORD } from "../src/lib/chinese/zodiac-places.ts";
import { partRows } from "../src/lib/csv.ts";

const S = Object.fromEntries(STEMS.map((s) => [s.id, s.index]));
const B = Object.fromEntries(BRANCHES.map((b) => [b.id, b.index]));
const full = { script: "hant", show: "full" };
const names = { a: "Camille", b: "Sample B" };
// Made-up births (never a real person's).
const CAMILLE = baziChart({ utc: "1990-06-15T10:00:00Z", date: "1990-06-15", time: "12:00", longitude: 2.3522 });
const SAMPLE_B = baziChart({ utc: "1987-11-03T22:10:00Z", date: "1987-11-03", time: "23:10", longitude: 10.7522 });

function board(...cols) {
  const ids = ["year", "month", "day", "hour"];
  const dm = S[cols[2][0]];
  const pillars = cols.map(([stem, branch], i) => ({
    id: ids[i],
    stem: S[stem],
    branch: B[branch],
    pillar: { cycle: 0 },
    god: i === 2 ? null : tenGodOf(dm, S[stem]).id,
    hidden: HIDDEN_STEMS[B[branch]].map((h) => ({ stem: h.stem, weight: h.weight, god: tenGodOf(dm, h.stem).id })),
    uncertain: false,
  }));
  return { pillars, dayMaster: dm };
}

test("Camille and Sample B: the Day Masters, the palaces, the meetings, the gifts", () => {
  const p = baziPair(CAMILLE, SAMPLE_B);
  assert.deepEqual(p.dm, { a: S.xin, b: S.ding, godAB: "seven-killings", godBA: "indirect-wealth", family: "power", combination: null, clash: false });
  assert.deepEqual(p.palace, { a: B.hai, b: B.si, same: false, kinds: ["clash"], phase: null });
  assert.deepEqual(
    p.meetings.map((m) => `${m.from}:${m.meets.map((x) => `${x.kind}@${x.with.join("+")}`).join(",")}`),
    [
      "year:stem-combination@month,stem-clash@hour,trine@day,destruction@year,destruction@month",
      "month:trine@year,trine@month",
      "day:stem-combination@month,stem-clash@hour,clash@day",
      "hour:clash@year,clash@month",
    ],
  );
  assert.deepEqual(p.gifts.toA.map((g) => `${g.phase}:${g.why}`), ["metal:favoured"]);
  assert.deepEqual(p.gifts.toB.map((g) => `${g.phase}:${g.why}`), ["fire:favoured"]);
  // The other way round: the gods swap, the family turns.
  const q = baziPair(SAMPLE_B, CAMILLE);
  assert.deepEqual([q.dm.godAB, q.dm.godBA, q.dm.family], ["indirect-wealth", "seven-killings", "wealth"]);
});

test("made-up boards: the same day branch, combining Day Masters, a phase one lacks", () => {
  const a = board(["bing", "wu"], ["bing", "wu"], ["jia", "zi"], ["bing", "wu"]);
  const b = board(["ren", "zi"], ["gui", "hai"], ["ji", "zi"], ["ren", "zi"]);
  const p = baziPair(a, b);
  assert.equal(p.palace.same, true);
  assert.equal(p.dm.combination, "earth");
  assert.equal(p.dm.family, "wealth");
  // a's chart holds no Water, which b is full of.
  assert.ok(p.gifts.toA.some((g) => g.phase === "water"), JSON.stringify(p.gifts));
});

test("what Pair says, and why", () => {
  const p = baziPair(CAMILLE, SAMPLE_B);
  const r = (ref, l = "en") => pairReading(p, CAMILLE, SAMPLE_B, ref, names, l, full);
  const dm = r(PAIR_DM_REF);
  assert.equal(dm.lead, "To Camille, Sample B’s Day Master is the Seven Killings; to Sample B, Camille’s is the Indirect Wealth.");
  assert.match(dm.paragraphs[1], /^Sample B’s Day Master controls Camille’s/);
  // Part 20: each god with its own article in French (« le dieu Dieu nourricier » read badly).
  assert.equal(r(PAIR_DM_REF, "fr").lead, "Pour Camille, le Maître du jour de Sample B représente les Sept Tueurs\u202f; pour Sample B, celui de Camille représente la Richesse indirecte.");
  const palace = r(PAIR_PALACE_REF);
  assert.equal(palace.paragraphs[1], "Camille’s Pig · hài 亥 and Sample B’s Snake · sì 巳: clash.");
  assert.match(palace.paragraphs[2], /^Si and Hai, the Snake and the Pig/);
  assert.deepEqual(giftLines(p, names, "en"), [
    "Sample B holds plenty of Metal (30%), which Camille’s chart favours.",
    "Camille holds plenty of Fire (30%), which Sample B’s chart favours.",
  ]);
  assert.equal(r(PAIR_GIFTS_REF).facts.length, 5);
  const meet = r(pairMeetRef("hour"));
  assert.equal(meet.title, "Sample B’s hour pillar");
  // French opens on the pillar's word, with its capital, on the page's rows as in the reading (part 20).
  assert.equal(r(pairMeetRef("hour"), "fr").title, "Pilier de l’heure de Sample B");
  assert.equal(meetFromLabel(names, "year", "fr", PLACE_WORD), "Année de Sample B");
  assert.equal(meetFromLabel(names, "year", "en", PLACE_WORD), "Sample B’s year");
  assert.match(meet.paragraphs[1], /^Clash · Year pillar: Zi and Wu, the Rat and the Horse/);
  assert.deepEqual(meet.facts.map((f) => f.ref), ["bzp:a:bz:branch:year", "bzp:a:bz:branch:month"]);
  // A cell of either chart, read by the board and named for its person.
  const cell = r(pairCellRef("b", "bz:stem:day"));
  assert.equal(cell.kicker, "Sample B · Day pillar · Day Master · rìzhǔ 日主");
  // Part 20: the person first among the facts, since the card shows no kicker beside facts.
  assert.deepEqual(cell.facts[0], { label: "Person", value: "Sample B" });
  assert.deepEqual(r(pairCellRef("a", "bz:branch:day"), "fr").facts[0], { label: "Personne", value: "Camille" });
  assert.equal(r("bzp:nothing"), null);
});

test("the table as text and as CSV", () => {
  const p = baziPair(CAMILLE, SAMPLE_B);
  const parts = pairTextParts(p, SAMPLE_B, names, "en", full);
  assert.equal(parts[0].lines[0], "Camille · Sample B · The two charts");
  assert.equal(parts[1].lines[4], "Sample B’s hour pillar (Yang Metal Rat · gēngzǐ 庚子): Clash · Year pillar; Clash · Month pillar");
  assert.equal(pairTextParts(p, SAMPLE_B, names, "fr", full)[0].lines[1], `Les Maîtres du jour\u202f: ${dmLine(p, names, "fr", full)}`);
  const text = pairTableCsv(p);
  const csv = text.split("\n");
  assert.equal(csv[0], "section,field,value");
  assert.ok(csv.includes("dm,godAB,seven-killings"));
  assert.ok(csv.includes("palace,kinds,clash"));
  assert.ok(csv.includes("gift,toA,metal:favoured:0.300"));
  assert.ok(csv.includes("meet,month,trine:year:fire|trine:month:fire"), csv.join("\n"));
  // Each part's own CSV holds its rows (part 20: the first part's was empty): the Day Masters, the palaces, the gifts.
  const main = partRows(text, ["section", "palace", "gift"]);
  assert.deepEqual(main[0], ["field", "value"]);
  assert.ok(main.some((row) => row.join() === "godAB,seven-killings") && main.some((row) => row.join() === "kinds,clash") && main.some((row) => row.join() === "toA,metal:favoured:0.300"), JSON.stringify(main));
  assert.equal(partRows(text, ["meet"]).length, 5);
  // Without a moment, no luck pillars.
  assert.equal(p.luck, null);
  assert.equal(pairTextParts(p, SAMPLE_B, names, "en", full).length, 2);
});

// The luck pillars of the moment (part 20, the review's BZ9): read at a fixed instant.
const NOW = Date.UTC(2026, 9, 15, 12);
const decade = (d) => `${d.count}:${d.given ? "given" : "both"}:${d.pillar ? `${d.pillar.index}:${SIXTY[d.pillar.pillar.cycle].id}:${d.pillar.god}>${d.godForOther}:${d.familyForOther}` : "before"}`;

test("the luck pillars of the moment: each person's decade by each count, its god for the other, how the decades meet", () => {
  const p = baziPair(CAMILLE, SAMPLE_B, { nowMs: NOW });
  assert.deepEqual(p.luck.a.map(decade), ["yang:both:3:yi-you:indirect-wealth>indirect-resource:resource", "yin:both:4:wu-yin:direct-resource>hurting-officer:output"]);
  assert.deepEqual(p.luck.b.map(decade), ["yang:both:4:bing-wu:rob-wealth>direct-officer:power", "yin:both:4:jia-yin:direct-resource>direct-wealth:wealth"]);
  // The god for the other is the decade's stem to the other's Day Master.
  for (const d of [...p.luck.a]) assert.equal(d.godForOther, tenGodOf(SAMPLE_B.dayMaster, d.pillar.stem).id);
  for (const d of [...p.luck.b]) assert.equal(d.godForOther, tenGodOf(CAMILLE.dayMaster, d.pillar.stem).id);
  // Four pairs of decades; only Camille's Wu-Yin (yin count) and Sample B's Bing-Wu (yang count) meet: Yin and Wu of the Fire trine.
  assert.deepEqual(
    p.luck.meets.map((m) => `${m.a}-${m.b}:${m.same ? "same" : ""}:${m.meets.map((x) => `${x.kind}@${x.phase ?? ""}`).join("+")}`),
    ["yang-yang::", "yang-yin::", "yin-yang::trine@fire", "yin-yin::"],
  );
  // The birth's own counts: one decade each.
  const q = baziPair(CAMILLE, SAMPLE_B, { nowMs: NOW, counts: { a: "yin", b: "yang" } });
  assert.deepEqual([...q.luck.a, ...q.luck.b].map(decade), ["yin:given:4:wu-yin:direct-resource>hurting-officer:output", "yang:given:4:bing-wu:rob-wealth>direct-officer:power"]);
  assert.equal(q.luck.meets.length, 1);
  // The same birth twice: the same decades, the same chapter (You twice also punishes itself).
  const s = baziPair(CAMILLE, CAMILLE, { nowMs: NOW });
  assert.deepEqual(s.luck.meets.map((m) => `${m.a}-${m.b}:${m.same ? "same" : ""}`), ["yang-yang:same", "yang-yin:", "yin-yang:", "yin-yin:same"]);
  // In 1991 Camille's first luck pillar has not begun, whichever count; Sample B's yin count has.
  const e = baziPair(CAMILLE, SAMPLE_B, { nowMs: Date.UTC(1991, 5, 15) });
  assert.deepEqual([...e.luck.a, ...e.luck.b].map(decade), ["yang:both:before", "yin:both:before", "yang:both:before", "yin:both:1:xin-hai:indirect-wealth>companion:peer"]);
  assert.equal(e.luck.meets.length, 0);
});

test("what Pair says of the luck pillars, in both languages", () => {
  const p = baziPair(CAMILLE, SAMPLE_B, { nowMs: NOW });
  const tz = { a: "Europe/Paris", b: "Europe/Oslo" };
  const r = (ref, l = "en", q = p) => pairReading(q, CAMILLE, SAMPLE_B, ref, names, l, full, tz);
  assert.deepEqual(
    luckLines(p, names, "en", full).map((x) => `${x.ref} ${x.text}`),
    [
      "bzp:a:bz:luck:yang:3 Camille, yang count: Yin Wood Rooster, ages 27–37; to Sample B, the Indirect Resource.",
      "bzp:a:bz:luck:yin:4 Camille, yin count: Yang Earth Tiger, ages 33–43; to Sample B, the Hurting Officer.",
      "bzp:b:bz:luck:yang:4 Sample B, yang count: Yang Fire Horse, ages 38–48; to Camille, the Direct Officer.",
      "bzp:b:bz:luck:yin:4 Sample B, yin count: Yang Wood Tiger, ages 31–41; to Camille, the Direct Wealth.",
      "bzp:luck Camille’s Yang Earth Tiger and Sample B’s Yang Fire Horse: trine.",
    ],
  );
  assert.equal(luckLines(p, names, "fr", full)[1].text, "Camille, compte yin\u202f: Tigre de Terre yang, 33–43 ans\u202f; pour Sample B, l’Officier blessant.");
  const rows = luckRows(p, names, "fr", full);
  assert.deepEqual(rows.map((x) => x.id), ["a-yang", "a-yin", "b-yang", "b-yin", "meets"]);
  assert.equal(rows[2].kind, "Sample B · Compte yang");
  assert.equal(rows[2].sub, "Cheval de Feu yang · bǐngwǔ 丙午, 38–48 ans\u202f; pour Camille, l’Officier direct");
  assert.equal(rows[4].ref, PAIR_LUCK_REF);
  assert.equal(rows[4].tone, "meet");
  // The pair's reading: each person's decade, what it brings them, what it is to the other; how the two meet; the counts.
  const luck = r(PAIR_LUCK_REF);
  assert.equal(luck.title, "Luck pillars now");
  assert.deepEqual(luck.sections.map((x) => x.id), ["luck-a", "luck-b", "meets", "counts"]);
  assert.equal(luck.sections[0].paragraphs[2], "Camille’s luck pillar now, by the yin count, is Yang Earth Tiger · wùyín 戊寅, ages 33–43, which brings Camille the Direct Resource.");
  assert.equal(
    luck.sections[0].paragraphs[3],
    "Its stem wù 戊 is the Hurting Officer to dīng 丁, Sample B’s Day Master. Sample B’s phase produces the decade’s: what Camille lives now can give Sample B room to express, to make and to share.",
  );
  assert.match(luck.sections[2].paragraphs[1], /^Yin, Wu and Xu/);
  assert.deepEqual(luck.facts.map((f) => f.ref), ["bzp:a:bz:luck:yang:3", "bzp:a:bz:luck:yin:4", "bzp:b:bz:luck:yang:4", "bzp:b:bz:luck:yin:4"]);
  const fr = r(PAIR_LUCK_REF, "fr");
  assert.equal(fr.sections[1].paragraphs[0], "Le pilier de chance de Sample B en ce moment, selon le compte yang, est Cheval de Feu yang · bǐngwǔ 丙午, 38–48 ans, qui apporte à Sample B le Rival.");
  assert.equal(
    fr.sections[1].paragraphs[1],
    "Son tronc bǐng 丙 représente l’Officier direct pour xīn 辛, le Maître du jour de Camille. La phase de la décennie contrôle celle de Camille\u202f: le chapitre de Sample B peut apporter à Camille une structure et un défi, à son meilleur quand la pression est bienveillante.",
  );
  // A decade opens as the Cycles page reads it, named for its person, dated in their birthplace's zone, its links on their chart.
  const one = r(pairCellRef("a", "bz:luck:yin:4"));
  assert.equal(one.title, "Yang Earth Tiger");
  assert.equal(one.kicker, "Camille · Luck pillar · 33–43 · Yin count");
  assert.deepEqual(one.facts[0], { label: "Person", value: "Camille" });
  assert.match(one.lead, /^For ten years, from \w+ 2023 to \w+ 2033/);
  assert.ok(one.facts.every((f) => !f.ref || f.ref.startsWith("bzp:a:")), JSON.stringify(one.facts));
  assert.match(r(pairCellRef("a", "bz:luck:yang:3"), "fr").lead, /^Pendant dix ans, d’oct\. 2017 à oct\. 2027/);
  assert.equal(r(pairCellRef("b", "bz:luck-how")).kicker, "Sample B · How they are counted");
  assert.equal(r(pairCellRef("b", "bz:luck:yin:12")), null);
  // The birth's own counts: no note on the counts; before the first luck pillar, how theirs are counted.
  const q = baziPair(CAMILLE, SAMPLE_B, { nowMs: NOW, counts: { a: "yin", b: "yang" } });
  assert.deepEqual(r(PAIR_LUCK_REF, "en", q).sections.map((x) => x.id), ["luck-a", "luck-b", "meets"]);
  assert.equal(luckLines(q, names, "en", full)[0].text, "Camille: Yang Earth Tiger, ages 33–43; to Sample B, the Hurting Officer.");
  const e = baziPair(CAMILLE, SAMPLE_B, { nowMs: Date.UTC(1991, 5, 15) });
  const before = luckLines(e, names, "fr", full)[0];
  assert.deepEqual([before.ref, before.text], ["bzp:a:bz:luck-how", "Camille, compte yang\u202f: avant le premier pilier de chance, qui commence à 7\u00a0ans 3\u00a0mois."]);
  assert.ok(!luckRows(e, names, "en", full).some((x) => x.id === "meets"));
  // The same decade for both.
  const s = baziPair(CAMILLE, CAMILLE, { nowMs: NOW });
  const same = luckLines(s, { a: "Anna", b: "Yann" }, "fr", full).filter((x) => x.ref === PAIR_LUCK_REF);
  assert.equal(same[0].text, "Anna et Yann sont dans le même pilier de chance, Coq de Bois yin\u202f: le même chapitre au même moment.");
  assert.equal(luckRows(s, { a: "Anna", b: "Yann" }, "en", full).at(-1).tone, "tension");
});

test("French: articles and elisions", () => {
  assert.equal(deFr("Anna"), "d’Anna");
  assert.equal(deFr("Élodie"), "d’Élodie");
  assert.equal(deFr("Eau"), "d’Eau");
  assert.equal(deFr("oct. 2017"), "d’oct. 2017");
  assert.equal(deFr("Yves"), "d’Yves");
  assert.equal(deFr("Yann"), "de Yann");
  assert.equal(deFr("Sample B"), "de Sample B");
  // A list's items apart in a cell: French puts a narrow no-break space before « ; » (the review of part 20).
  assert.equal(semicolon("fr"), "\u202f; ");
  assert.equal(semicolon("en"), "; ");
  // Jia and Bing: each Day Master is the other's Eating God or Indirect Resource; « le Dieu nourricier », never « le dieu Dieu nourricier ».
  const a = board(["jia", "zi"], ["jia", "zi"], ["jia", "zi"], ["jia", "zi"]);
  const b = board(["bing", "wu"], ["bing", "wu"], ["bing", "wu"], ["bing", "wu"]);
  const p = baziPair(a, b);
  assert.equal(dmLine(p, { a: "Anna", b: "Élodie" }, "fr", full), "Pour Anna, le Maître du jour d’Élodie représente le Dieu nourricier\u202f; pour Élodie, celui d’Anna représente la Ressource indirecte.");
  assert.equal(dmLine(p, { a: "Anna", b: "Élodie" }, "en", full), "To Anna, Élodie’s Day Master is the Eating God; to Élodie, Anna’s is the Indirect Resource.");
  // Water in what one brings: « beaucoup d’Eau ».
  const w = baziPair(board(["bing", "wu"], ["bing", "wu"], ["jia", "zi"], ["bing", "wu"]), board(["ren", "zi"], ["gui", "hai"], ["ji", "zi"], ["ren", "zi"]));
  assert.ok(giftLines(w, { a: "Anna", b: "Yann" }, "fr").some((l) => l.startsWith("Yann tient beaucoup d’Eau")), giftLines(w, { a: "Anna", b: "Yann" }, "fr").join(" | "));
});

test("the luck pillars as a table: Copy and CSV", () => {
  const p = baziPair(CAMILLE, SAMPLE_B, { nowMs: NOW });
  const parts = pairTextParts(p, SAMPLE_B, names, "en", full);
  assert.deepEqual(parts.map((x) => x.id), ["main", "meets", "luck"]);
  assert.equal(parts[2].lines[0], "Luck pillars now");
  assert.equal(parts[2].lines.length, 6);
  const text = pairTableCsv(p);
  const csv = text.split("\n");
  assert.ok(csv.includes("luck,person,count,given,index,pillar,hanzi,fromAge,toAge,god,godForOther"));
  assert.ok(csv.includes("luck,a,yang,0,3,yi-you,乙酉,27.32,37.32,indirect-wealth,indirect-resource"), csv.join("\n"));
  assert.ok(csv.includes("luckmeet,yin,yang,0,trine:luck:fire"));
  assert.ok(csv.includes("luckmeet,yang,yang,0,"));
  const luck = partRows(text, ["luck", "luckmeet"]);
  assert.deepEqual(luck[0], ["person", "count", "given", "index", "pillar", "hanzi", "fromAge", "toAge", "god", "godForOther"]);
  assert.equal(luck.length, 1 + 4 + 1 + 1 + 4);
  // Before the first luck pillar: the start age alone.
  const e = pairTableCsv(baziPair(CAMILLE, SAMPLE_B, { nowMs: Date.UTC(1991, 5, 15) })).split("\n");
  assert.ok(e.includes("luck,a,yang,0,,,,7.32,,,"), e.join("\n"));
});
