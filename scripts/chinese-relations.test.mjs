/**
 * The branches' relations (languages plan, part 8), computed by rule, checked
 * here against the classical tables written out pair by pair; the hidden
 * stems; the zodiac's relations for two made-up births; and its table's
 * text and CSV.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { BRANCHES, HIDDEN_STEMS, STEMS } from "../src/lib/chinese/names.ts";
import { RELATION_KINDS, RELATION_NAMES, branchRelations, fullTrines, placedRelations, trineOf } from "../src/lib/chinese/relations.ts";
import { zodiacChart } from "../src/lib/chinese/zodiac.ts";
import { zodiacReading, relationRef } from "../src/lib/chinese/zodiac-reading.ts";
import { hiddenLine, zodiacTableCsv, zodiacTextParts } from "../src/lib/chinese/zodiac-table.ts";

const B = Object.fromEntries(BRANCHES.map((b) => [b.id, b.index]));
const pairs = (list) => list.map((s) => s.split("-").map((id) => B[id]));
/** Every unordered pair of different branches holding `kind`, as "zi-chou" ids sorted by place. */
function holding(kind) {
  const out = [];
  for (let a = 0; a < 12; a += 1) for (let b = a + 1; b < 12; b += 1) if (branchRelations(a, b).includes(kind)) out.push(`${BRANCHES[a].id}-${BRANCHES[b].id}`);
  return out.sort();
}
const norm = (list) => pairs(list).map(([a, b]) => (a < b ? `${BRANCHES[a].id}-${BRANCHES[b].id}` : `${BRANCHES[b].id}-${BRANCHES[a].id}`)).sort();

test("the six harmonies (六合): Zi-Chou, Yin-Hai, Mao-Xu, Chen-You, Si-Shen, Wu-Wei", () => {
  assert.deepEqual(holding("harmony"), norm(["zi-chou", "yin-hai", "mao-xu", "chen-you", "si-shen", "wu-wei"]));
});

test("the four trines (三合): Shen-Zi-Chen Water, Hai-Mao-Wei Wood, Yin-Wu-Xu Fire, Si-You-Chou Metal", () => {
  const trios = { water: ["shen", "zi", "chen"], wood: ["hai", "mao", "wei"], fire: ["yin", "wu", "xu"], metal: ["si", "you", "chou"] };
  const want = [];
  for (const [phase, ids] of Object.entries(trios)) {
    for (const id of ids) assert.equal(trineOf(B[id]).phase, phase, id);
    want.push(`${ids[0]}-${ids[1]}`, `${ids[1]}-${ids[2]}`, `${ids[0]}-${ids[2]}`);
  }
  assert.deepEqual(holding("trine"), norm(want));
});

test("the six clashes (沖): each animal and its opposite", () => {
  assert.deepEqual(holding("clash"), norm(["zi-wu", "chou-wei", "yin-shen", "mao-you", "chen-xu", "si-hai"]));
});

test("the six harms (害): Zi-Wei, Chou-Wu, Yin-Si, Mao-Chen, Shen-Hai, You-Xu", () => {
  assert.deepEqual(holding("harm"), norm(["zi-wei", "chou-wu", "yin-si", "mao-chen", "shen-hai", "you-xu"]));
});

test("the punishments (刑): Yin-Si-Shen, Chou-Xu-Wei, Zi-Mao; Chen, Wu, You and Hai punish themselves", () => {
  assert.deepEqual(holding("punishment"), norm(["yin-si", "si-shen", "yin-shen", "chou-xu", "xu-wei", "chou-wei", "zi-mao"]));
  for (let b = 0; b < 12; b += 1) {
    assert.deepEqual(branchRelations(b, b), ["chen", "wu", "you", "hai"].includes(BRANCHES[b].id) ? ["self-punishment"] : [], BRANCHES[b].id);
  }
});

test("the six destructions (破): Zi-You, Yin-Hai, Chen-Chou, Wu-Mao, Shen-Si, Xu-Wei", () => {
  assert.deepEqual(holding("destruction"), norm(["zi-you", "yin-hai", "chen-chou", "wu-mao", "shen-si", "xu-wei"]));
});

test("relations are symmetric, and a pair can hold several (Si and Shen: harmony, punishment, destruction)", () => {
  for (let a = 0; a < 12; a += 1) for (let b = 0; b < 12; b += 1) assert.deepEqual(branchRelations(a, b), branchRelations(b, a));
  assert.deepEqual(branchRelations(B.si, B.shen), ["harmony", "punishment", "destruction"]);
  assert.deepEqual(branchRelations(B.yin, B.hai), ["harmony", "destruction"]);
  assert.deepEqual(branchRelations(B.chou, B.wei), ["clash", "punishment"]);
  for (const kind of RELATION_KINDS) {
    const n = RELATION_NAMES[kind];
    assert.ok(n.hant && n.hans && n.pinyin && n.en && n.fr, kind);
  }
  assert.equal(RELATION_NAMES.clash.hans, "冲");
});

test("the hidden stems: the main qi always of the branch's own phase, the weights adding to 100", () => {
  assert.equal(HIDDEN_STEMS.length, 12);
  HIDDEN_STEMS.forEach((list, b) => {
    assert.equal(STEMS[list[0].stem].phase, BRANCHES[b].phase, BRANCHES[b].id);
    assert.equal(list.reduce((n, h) => n + h.weight, 0), 100, BRANCHES[b].id);
  });
  // Chou holds Ji, Gui and Xin; Hai holds Ren and Jia.
  assert.deepEqual(HIDDEN_STEMS[B.chou].map((h) => STEMS[h.stem].id), ["ji", "gui", "xin"]);
  assert.deepEqual(HIDDEN_STEMS[B.hai].map((h) => STEMS[h.stem].id), ["ren", "jia"]);
  assert.equal(hiddenLine(B.chou, "en", { script: "hant", show: "full" }), "己 jǐ 60 · 癸 guǐ 30 · 辛 xīn 10");
  assert.equal(hiddenLine(B.chou, "fr", { script: "hant", show: "names" }), "Terre yin 60 · Eau yin 30 · Métal yin 10");
});

// Made-up test births (never a real person's).
const CAMILLE = { utc: "1990-06-15T10:00:00Z", date: "1990-06-15", time: "12:00", longitude: 2.3522 };
const SAMPLE_B = { utc: "1987-11-03T22:10:00Z", date: "1987-11-03", time: "23:10", longitude: 10.7522 };
const NOW = Date.UTC(2026, 9, 9, 12);

test("the zodiac's relations: Camille's two Horses punish themselves and her Pig clashes with her Snake; Sample B's Rabbit and Dog are in harmony", () => {
  const a = zodiacChart(CAMILLE, { nowMs: NOW });
  assert.deepEqual(a.relations.map((r) => `${r.kind}:${r.places.join("-")}`), ["clash:day-hour", "self-punishment:year-month"]);
  const b = zodiacChart(SAMPLE_B, { nowMs: NOW });
  assert.deepEqual(b.relations.map((r) => `${r.kind}:${r.places.join("-")}`), ["harmony:year-month", "punishment:year-hour"]);
  assert.deepEqual(b.trines, []);
  // A whole trine: three places on the Fire trine's three animals.
  assert.deepEqual(fullTrines([{ id: "year", branch: 2 }, { id: "day", branch: 6 }, { id: "hour", branch: 10 }]), [{ phase: "fire", places: ["year", "day", "hour"] }]);
  assert.deepEqual(placedRelations([{ id: "year", branch: 0 }, { id: "day", branch: 0 }]), [], "the same Rat twice: no relation");
});

test("a whole trine in French elides « de » before its phase: « un trigone entier d’eau » (the review of part 20)", () => {
  const b = zodiacChart(SAMPLE_B, { nowMs: NOW });
  // The Water trine: the Monkey (壬申), the Rat (甲子) and the Dragon (戊辰) on the year, month and day.
  const cycles = { year: 8, month: 0, day: 4 };
  const places = b.places.map((p) => (p.id in cycles ? { ...p, branch: cycles[p.id] % 12, pillar: { ...p.pillar, cycle: cycles[p.id] } } : p));
  const z = { ...b, places, relations: placedRelations(places), trines: fullTrines(places) };
  assert.deepEqual(z.trines.map((t) => t.phase), ["water"]);
  const trine = z.relations.find((r) => r.kind === "trine");
  const full = { script: "hant", show: "full" };
  assert.match(zodiacReading(z, relationRef(trine), "fr", full).paragraphs.join(" "), /forment un trigone entier d’eau\u202f: trois alliés/);
  assert.match(zodiacReading(z, relationRef(trine), "en", full).paragraphs.join(" "), /make a whole trine of water: three allies/);
});

test("what the page says of a relation, and of a place's relations", () => {
  const b = zodiacChart(SAMPLE_B, { nowMs: NOW });
  const full = { script: "hant", show: "full" };
  const harmony = zodiacReading(b, relationRef(b.relations[0]), "en", full);
  assert.equal(harmony.title, "Harmony");
  assert.equal(harmony.kicker, "year (Rabbit) – month (Dog)");
  assert.match(harmony.lead, /natural partners/);
  const fr = zodiacReading(b, relationRef(b.relations[1]), "fr", full);
  assert.equal(fr.title, "Punition");
  assert.equal(fr.kicker, "année (Lapin) – heure (Rat)");
  const year = zodiacReading(b, "zk:year", "en", full);
  assert.deepEqual(
    year.facts.filter((f) => f.ref?.startsWith("zk:rel:")).map((f) => `${f.label}: ${f.value}`),
    ["Harmony: month (Dog)", "Punishment: hour (Rat)"],
  );
  // An animal of the wheel against the reader's: the Rooster clashes with the year's Rabbit.
  const rooster = zodiacReading(b, "zk:branch:9", "en", full);
  assert.ok(rooster.facts.some((f) => f.label === "Clash" && f.value === "year (Rabbit)"));
});

test("the table as text and as CSV", () => {
  const b = zodiacChart(SAMPLE_B, { nowMs: NOW });
  const parts = zodiacTextParts(b, "en", { script: "hant", show: "full" }, "Sample B");
  assert.equal(parts[0].lines[0], "Sample B · The four animals");
  assert.match(parts[0].lines[1], /^Year: Yin Fire Rabbit · dīngmǎo 丁卯 · Wood · mù 木 · Na Yin Fire in the furnace · lúzhōng huǒ 爐中火 · Hidden stems 乙 yǐ 100$/);
  assert.deepEqual(parts[1].lines.slice(1), ["Harmony · liùhé 六合: year (Rabbit) – month (Dog)", "Punishment · xíng 刑: year (Rabbit) – hour (Rat)"]);
  const csv = zodiacTableCsv(b).split("\n");
  assert.ok(csv.includes("animal,year,ding-mao,丁卯,ding,mao,rabbit,wood,yin,爐中火,yi:100,0"), csv.join("\n"));
  assert.ok(csv.includes("relation,harmony,year,month,mao,xu"));
  assert.ok(csv.includes("zodiac,dayBoundary,23:00"));
});
