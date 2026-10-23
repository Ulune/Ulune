/**
 * BaZi's secondary layers (languages plan, part 13): the twelve life stages
 * against the classical table, the empty branches of each ten-day week, the
 * symbolic stars against their verses, two made-up births' stages, Na Yin,
 * empty branches and stars, the readings in both languages, the texts' tone,
 * and the table's text and CSV.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { BRANCHES, STEMS } from "../src/lib/chinese/names.ts";
import { baziChart } from "../src/lib/chinese/bazi.ts";
import {
  ACADEMIC,
  HEAVENLY_VIRTUE,
  MONTHLY_VIRTUE,
  NOBLEMAN,
  PROSPERITY,
  STAGES,
  STARS,
  SWORD_EDGE,
  TRINE_STARS,
  baziSigns,
  emptyBranchesOf,
  stageOf,
  trineOfBranch,
} from "../src/lib/chinese/bazi-signs.ts";
import { STAGE_TEXTS, STAR_TEXTS } from "../src/lib/chinese/bazi-signs-texts.ts";
import { EMPTY_REF, baziReading, naYinRef, stageRef, starRef } from "../src/lib/chinese/bazi-reading.ts";
import { baziTableCsv, baziTextParts } from "../src/lib/chinese/bazi-table.ts";

const S = Object.fromEntries(STEMS.map((s) => [s.id, s.index]));
const B = Object.fromEntries(BRANCHES.map((b) => [b.id, b.index]));
const full = { script: "hant", show: "full" };

test("the twelve stages: each stem's Birth, Peak and Tomb as the table writes them, every stage once", () => {
  // 甲亥 乙午 丙戊寅 丁己酉 庚巳 辛子 壬申 癸卯: where each is born; the Peak (帝旺) and the Tomb (墓).
  const table = {
    jia: ["hai", "mao", "wei"],
    yi: ["wu", "yin", "xu"],
    bing: ["yin", "wu", "xu"],
    ding: ["you", "si", "chou"],
    wu: ["yin", "wu", "xu"],
    ji: ["you", "si", "chou"],
    geng: ["si", "you", "chou"],
    xin: ["zi", "shen", "chen"],
    ren: ["shen", "zi", "chen"],
    gui: ["mao", "hai", "wei"],
  };
  for (const [stem, [birth, peak, tomb]] of Object.entries(table)) {
    assert.equal(stageOf(S[stem], B[birth]).id, "birth", `${stem} born in ${birth}`);
    assert.equal(stageOf(S[stem], B[peak]).id, "peak", `${stem} at its peak in ${peak}`);
    assert.equal(stageOf(S[stem], B[tomb]).id, "tomb", `${stem} stored in ${tomb}`);
    const seen = BRANCHES.map((b) => stageOf(S[stem], b.index).id);
    assert.deepEqual([...seen].sort(), STAGES.map((x) => x.id).sort(), stem);
  }
  // The Prosperity star is the branch of the Prosperity stage (祿 = 臨官), the yang Sword Edge that of the Peak.
  for (let s = 0; s < 10; s += 1) {
    assert.equal(stageOf(s, PROSPERITY[s]).id, "prosperity", STEMS[s].id);
    if (SWORD_EDGE[s] != null) assert.equal(stageOf(s, SWORD_EDGE[s]).id, "peak", STEMS[s].id);
  }
  assert.equal(STAGES[6].hans, "病");
  assert.equal(STAGES[3].hant, "臨官");
});

test("the empty branches of the six ten-day weeks", () => {
  const weeks = { 0: ["xu", "hai"], 10: ["shen", "you"], 20: ["wu", "wei"], 30: ["chen", "si"], 40: ["yin", "mao"], 50: ["zi", "chou"] };
  for (const [start, [a, b]] of Object.entries(weeks)) {
    for (let k = 0; k < 10; k += 1) assert.deepEqual(emptyBranchesOf(Number(start) + k), [B[a], B[b]], `cycle ${Number(start) + k}`);
  }
});

test("the stars against their verses", () => {
  // 甲戊庚牛羊，乙己鼠猴鄉，丙丁豬雞位，壬癸兔蛇藏，六辛逢馬虎.
  const noble = { jia: ["chou", "wei"], wu: ["chou", "wei"], geng: ["chou", "wei"], yi: ["zi", "shen"], ji: ["zi", "shen"], bing: ["hai", "you"], ding: ["hai", "you"], ren: ["mao", "si"], gui: ["mao", "si"], xin: ["wu", "yin"] };
  for (const [stem, bs] of Object.entries(noble)) assert.deepEqual([...NOBLEMAN[S[stem]]].sort(), bs.map((b) => B[b]).sort(), stem);
  // 甲乙巳午報君知，丙戊申宮丁己雞，庚豬辛鼠壬逢虎，癸人見卯.
  assert.deepEqual(ACADEMIC, ["si", "wu", "shen", "you", "shen", "you", "hai", "zi", "yin", "mao"].map((b) => B[b]));
  // The trine stars: 申子辰 Peach Blossom in You, Horse in Yin, Canopy in Chen, General in Zi; and so round.
  const trines = { shen: ["you", "yin", "chen", "zi"], hai: ["zi", "si", "wei", "mao"], yin: ["mao", "shen", "xu", "wu"], si: ["wu", "hai", "chou", "you"] };
  for (const [base, [pb, horse, canopy, general]] of Object.entries(trines)) {
    const t = trineOfBranch(B[base]);
    assert.equal(TRINE_STARS["peach-blossom"][t], B[pb], base);
    assert.equal(TRINE_STARS["travelling-horse"][t], B[horse], base);
    assert.equal(TRINE_STARS.canopy[t], B[canopy], base);
    assert.equal(TRINE_STARS.general[t], B[general], base);
  }
  // 天德: 正丁二申宮，三壬四辛同，五亥六甲上，七癸八寅逢，九丙十歸乙，子巳丑庚中.
  const hv = { yin: { s: "ding" }, mao: { b: "shen" }, chen: { s: "ren" }, si: { s: "xin" }, wu: { b: "hai" }, wei: { s: "jia" }, shen: { s: "gui" }, you: { b: "yin" }, xu: { s: "bing" }, hai: { s: "yi" }, zi: { b: "si" }, chou: { s: "geng" } };
  for (const [m, v] of Object.entries(hv)) assert.deepEqual(HEAVENLY_VIRTUE[B[m]], v.s ? { s: S[v.s] } : { b: B[v.b] }, m);
  // 月德: 寅午戌月丙，申子辰月壬，亥卯未月甲，巳酉丑月庚.
  assert.equal(MONTHLY_VIRTUE[trineOfBranch(B.wu)], S.bing);
  assert.equal(MONTHLY_VIRTUE[trineOfBranch(B.zi)], S.ren);
  assert.equal(MONTHLY_VIRTUE[trineOfBranch(B.mao)], S.jia);
  assert.equal(MONTHLY_VIRTUE[trineOfBranch(B.you)], S.geng);
  assert.equal(STARS.length, 14);
});

// Made-up births (never a real person's).
const CAMILLE = { utc: "1990-06-15T10:00:00Z", date: "1990-06-15", time: "12:00", longitude: 2.3522 };
const SAMPLE_B = { utc: "1987-11-03T22:10:00Z", date: "1987-11-03", time: "23:10", longitude: 10.7522 };

test("Camille's stages, Na Yin, empty branches and stars", () => {
  const s = baziSigns(baziChart(CAMILLE));
  assert.deepEqual(
    s.pillars.map((p) => `${p.place}:${p.stage.id}:${p.naYin.hant}:${p.empty ? "empty" : ""}:${p.stars.join("+")}`),
    ["year:sickness:路旁土::nobleman", "month:sickness:楊柳木::nobleman+general", "day:bath:釵釧金::golden-carriage+heavenly-virtue", "hour:death:長流水::travelling-horse"],
  );
  assert.deepEqual(s.empty, [B.yin, B.mao]);
  assert.deepEqual(
    s.stars.map((h) => `${h.id}@${h.places.join("|")}<${h.sources.map((x) => x.from).join("|")}`),
    ["nobleman@year|month<dm", "golden-carriage@day<dm", "travelling-horse@hour<day", "general@month<year", "heavenly-virtue@day<month"],
  );
});

test("Sample B: the hour on an empty branch, the Peach Blossom and Red Phoenix there; three pillars without a time", () => {
  const s = baziSigns(baziChart(SAMPLE_B));
  assert.deepEqual(s.empty, [B.zi, B.chou]);
  assert.deepEqual(
    s.pillars.map((p) => `${p.place}:${p.stage.id}:${p.naYin.hant}:${p.empty ? "empty" : ""}:${p.stars.join("+")}`),
    ["year:sickness:爐中火::", "month:nurture:釵釧金::", "day:peak:沙中土::travelling-horse", "hour:extinction:壁上土:empty:peach-blossom+red-phoenix"],
  );
  const noTime = baziSigns(baziChart({ ...SAMPLE_B, timeUnknown: true }));
  assert.deepEqual(noTime.pillars.map((p) => p.place), ["year", "month", "day"]);
  assert.ok(noTime.pillars.every((p) => !p.empty));
});

test("what the stages, Na Yin, empty branches and stars say, and why", () => {
  const c = baziChart(CAMILLE);
  // 死 by Ulune's name (part 20, BZ2); its reading keeps the classical name, its pinyin and its characters.
  const stage = baziReading(c, stageRef("hour"), "en", full);
  assert.equal(stage.title, "Rest");
  assert.equal(stage.lead, STAGE_TEXTS.death[0]);
  assert.equal(stage.sections[0].paragraphs[0], "Your Day Master xīn 辛 is born in Rat · zǐ 子 and, being yin, goes backward round the branches: in Snake · sì 巳 it is at its Rest stage.");
  // Shown first, with what the name does and does not say.
  assert.equal(stage.sections[1].paragraphs[0], "The classics call this stage sǐ 死, “Death”, after a human life; the name tells the phase’s strength here, never an event, and nothing about health.");
  assert.match(stage.sections[1].paragraphs[1], /nothing about health/);
  assert.deepEqual(stage.facts.at(-1), { label: "Classical name", value: "Death · sǐ 死" });
  const fr = baziReading(c, stageRef("month"), "fr", full);
  assert.equal(fr.title, "Retrait");
  // The stage by its name, unquoted, as English says it, so it links to its page (the 2.0 fixes, item 1).
  assert.equal(fr.sections[0].paragraphs[0], "Votre Maître du jour xīn 辛 naît en Rat · zǐ 子 et, étant yin, recule dans l’ordre des branches\u202f: en Cheval · wǔ 午, il est au stade Retrait.");
  assert.equal(fr.sections[1].paragraphs[0], "Les classiques appellent ce stade bìng 病, «\u202fMaladie\u202f», d’après une vie humaine\u202f; ce nom dit la force de la phase ici, jamais un événement, et rien de la santé.");
  // Names only: the classical name alone, in quotes.
  const named = baziReading(c, stageRef("hour"), "en", { script: "hant", show: "names" });
  assert.match(named.sections[1].paragraphs[0], /^The classics call this stage “Death”, after a human life;/);
  // A stage whose usual name Ulune keeps says no more.
  const bath = baziReading(c, stageRef("day"), "en", full);
  assert.equal(bath.title, "Bath");
  assert.equal(bath.sections[1].paragraphs.length, 1);
  assert.ok(!bath.facts.some((f) => f.label === "Classical name"));
  const ny = baziReading(c, naYinRef("year"), "en", full);
  assert.equal(ny.title, "Earth by the roadside");
  assert.equal(ny.facts.at(-1).value, "Resource: what produces you");
  const empty = baziReading(c, EMPTY_REF, "en", full);
  assert.equal(empty.facts[1].value, "Tiger · yín 寅 · Rabbit · mǎo 卯");
  assert.equal(empty.facts[2].value, "None of your pillars");
  const b = baziReading(baziChart(SAMPLE_B), EMPTY_REF, "fr", full);
  assert.equal(b.facts[2].value, "Pilier de l’heure");
  const noble = baziReading(c, starRef("nobleman"), "en", full);
  assert.equal(noble.lead, STAR_TEXTS.nobleman[0]);
  assert.deepEqual(noble.facts.map((f) => f.ref), ["bz:branch:year", "bz:branch:month"]);
  assert.equal(noble.sections[0].paragraphs[0], "From your Day Master xīn 辛, the tradition looks for this star in the branch Horse · wǔ 午 or Tiger · yín 寅.");
  const horse = baziReading(c, starRef("travelling-horse"), "fr", full);
  assert.equal(horse.sections[0].paragraphs[0], "Depuis la branche Cochon · hài 亥 de votre pilier du jour, du trigone du Bois, la tradition cherche cette étoile dans la branche Serpent · sì 巳.");
  // A star not in the chart has no reading; nor does a ref that is not the board's.
  assert.equal(baziReading(c, starRef("canopy"), "en", full), null);
  assert.equal(baziReading(c, "bz:stage:nowhere", "en", full), null);
});

test("Ulune's names for the twelve stages (part 20, BZ2): none speaks of illness or death; the classical names and the ids stay", () => {
  assert.deepEqual(
    STAGES.map((s) => s.id),
    ["birth", "bath", "crown", "prosperity", "peak", "decline", "sickness", "death", "tomb", "extinction", "conception", "nurture"],
  );
  assert.deepEqual(
    STAGES.map((s) => s.en),
    ["Birth", "Bath", "Crown", "Prosperity", "Peak", "Decline", "Retreat", "Rest", "Storehouse", "Pause", "Conception", "Nurture"],
  );
  assert.deepEqual(
    STAGES.map((s) => s.fr),
    ["Naissance", "Bain", "Couronne", "Prospérité", "Apogée", "Déclin", "Retrait", "Repos", "Réserve", "Pause", "Conception", "Nourrissement"],
  );
  for (const lang of ["en", "fr"]) assert.equal(new Set(STAGES.map((s) => s[lang])).size, 12, lang);
  for (const s of STAGES) {
    assert.doesNotMatch(s.en, /\b(death|dies?|illness|disease|sick\w*|tomb|grave|extinction)\b/i, s.id);
    assert.doesNotMatch(s.fr, /\b(mort|maladie|malade|tombe|tombeau|extinction)\b/i, s.id);
  }
  assert.deepEqual(
    STAGES.filter((s) => s.classical).map((s) => `${s.id}:${s.classical.join("/")}`),
    ["sickness:Sickness/Maladie", "death:Death/Mort", "tomb:Tomb/Tombe", "extinction:Extinction/Extinction"],
  );
  // Each renamed stage's text tells it by Ulune's word.
  assert.match(STAGE_TEXTS.sickness[0], /draws back/);
  assert.match(STAGE_TEXTS.death[0], /comes to rest/);
  assert.match(STAGE_TEXTS.tomb[1], /réserve/);
  assert.match(STAGE_TEXTS.extinction[0], /a pause/);
});

test("every text in both languages, in Ulune's typography and tone", () => {
  assert.equal(Object.keys(STAGE_TEXTS).length, 12);
  assert.equal(Object.keys(STAR_TEXTS).length, 14);
  for (const [en, fr] of [...Object.values(STAGE_TEXTS), ...Object.values(STAR_TEXTS)]) {
    for (const t of [en, fr]) {
      assert.doesNotMatch(t, /'/);
      assert.doesNotMatch(t, / {2}/);
    }
    assert.doesNotMatch(fr, /[^\u202f][:;?!]/, fr.slice(0, 40));
    assert.doesNotMatch(en, /\b(death|dies?|illness|disease|sick\w*|doomed|unlucky|curse[ds]?|must|fate)\b/i, en.slice(0, 40));
    assert.doesNotMatch(fr, /\b(mort|meurt|maladie|malade|malchance|maudit|condamn\w*|doit|devez|destin)\b/i, fr.slice(0, 40));
  }
});

test("the table as text and as CSV", () => {
  const c = baziChart(CAMILLE);
  const parts = baziTextParts(c, "en", full, "Camille");
  const signs = parts.find((p) => p.id === "signs").lines;
  assert.equal(signs[4], "Hour pillar: Life stage Rest · sǐ 死 · Na Yin Long-flowing water · chángliú shuǐ 長流水");
  assert.equal(signs.at(-1), "Empty branches: Tiger · yín 寅 · Rabbit · mǎo 卯");
  const stars = parts.find((p) => p.id === "stars").lines;
  assert.equal(stars[1], "Nobleman · tiānyǐ guìrén 天乙貴人: Year · Month");
  const csv = baziTableCsv(baziChart(SAMPLE_B)).split("\n");
  assert.ok(csv.includes("signs,hour,extinction,絕,壁上土,earth,1"), csv.join("\n"));
  assert.ok(csv.includes("signs,emptyBranches,zi|chou"));
  assert.ok(csv.includes("star,peach-blossom,hour"));
});
