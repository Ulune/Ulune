/**
 * BaZi's Pair (languages plan, part 19): the Day Masters' gods and phases,
 * the partner palaces, every meeting between two charts' pillars (trines of
 * two included), what each brings the other; two made-up births and made-up
 * boards; the readings in both languages; the table's text and CSV.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { HIDDEN_STEMS, STEMS, BRANCHES } from "../src/lib/chinese/names.ts";
import { baziChart, tenGodOf } from "../src/lib/chinese/bazi.ts";
import { baziPair } from "../src/lib/chinese/bazi-pair.ts";
import { PAIR_DM_REF, PAIR_GIFTS_REF, PAIR_PALACE_REF, giftLines, pairCellRef, pairMeetRef, pairReading } from "../src/lib/chinese/bazi-pair-reading.ts";
import { pairTableCsv, pairTextParts } from "../src/lib/chinese/bazi-pair-table.ts";

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
  assert.equal(r(PAIR_DM_REF, "fr").lead, "Pour Camille, le Maître du jour de Sample B est le dieu Sept Tueurs\u202f; pour Sample B, celui de Camille est le dieu Richesse indirecte.");
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
  assert.match(meet.paragraphs[1], /^Clash · Year pillar: Zi and Wu, the Rat and the Horse/);
  assert.deepEqual(meet.facts.map((f) => f.ref), ["bzp:a:bz:branch:year", "bzp:a:bz:branch:month"]);
  // A cell of either chart, read by the board and named for its person.
  const cell = r(pairCellRef("b", "bz:stem:day"));
  assert.equal(cell.kicker, "Sample B · Day pillar · Day Master · rìzhǔ 日主");
  assert.equal(r("bzp:nothing"), null);
});

test("the table as text and as CSV", () => {
  const p = baziPair(CAMILLE, SAMPLE_B);
  const parts = pairTextParts(p, SAMPLE_B, names, "en", full);
  assert.equal(parts[0].lines[0], "Camille · Sample B · The two charts");
  assert.equal(parts[1].lines[4], "Sample B’s hour pillar (Yang Metal Rat · gēngzǐ 庚子): Clash · Year pillar; Clash · Month pillar");
  const csv = pairTableCsv(p).split("\n");
  assert.ok(csv.includes("dm,godAB,seven-killings"));
  assert.ok(csv.includes("palace,kinds,clash"));
  assert.ok(csv.includes("gift,toA,metal:favoured:0.300"));
  assert.ok(csv.includes("meet,month,trine:year:fire|trine:month:fire"), csv.join("\n"));
});
