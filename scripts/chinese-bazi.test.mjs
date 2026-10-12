/**
 * BaZi's pillar board (languages plan, part 12): the Ten Gods against the
 * classical table written out, the four pillars, hidden stems and gods of
 * two made-up births, the readings (and why each god is the one it is), the
 * texts in both languages, and the table's text and CSV.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { STEMS } from "../src/lib/chinese/names.ts";
import { TEN_GODS, baziChart, tenGodOf } from "../src/lib/chinese/bazi.ts";
import { baziReading, godRef, hiddenRef, stemRef, whyGod } from "../src/lib/chinese/bazi-reading.ts";
import { DAY_MASTER_IMAGES, FAMILY_NAMES, TEN_GOD_TEXTS } from "../src/lib/chinese/bazi-texts.ts";
import { baziTableCsv, baziTextParts } from "../src/lib/chinese/bazi-table.ts";

const S = Object.fromEntries(STEMS.map((s) => [s.id, s.index]));

test("the Ten Gods: Jia's and Xin's tables, as the books write them", () => {
  const jia = { jia: "companion", yi: "rob-wealth", bing: "eating-god", ding: "hurting-officer", wu: "indirect-wealth", ji: "direct-wealth", geng: "seven-killings", xin: "direct-officer", ren: "indirect-resource", gui: "direct-resource" };
  for (const [stem, god] of Object.entries(jia)) assert.equal(tenGodOf(S.jia, S[stem]).id, god, `Jia sees ${stem}`);
  const xin = { xin: "companion", geng: "rob-wealth", gui: "eating-god", ren: "hurting-officer", yi: "indirect-wealth", jia: "direct-wealth", ding: "seven-killings", bing: "direct-officer", ji: "indirect-resource", wu: "direct-resource" };
  for (const [stem, god] of Object.entries(xin)) assert.equal(tenGodOf(S.xin, S[stem]).id, god, `Xin sees ${stem}`);
  // Every Day Master sees each god exactly once among the ten stems, and itself as its Companion.
  for (let dm = 0; dm < 10; dm += 1) {
    const seen = STEMS.map((s) => tenGodOf(dm, s.index).id);
    assert.deepEqual([...seen].sort(), TEN_GODS.map((g) => g.id).sort(), STEMS[dm].id);
    assert.equal(tenGodOf(dm, dm).id, "companion");
  }
  // The pairs swap: what Jia controls (Wu, Indirect Wealth), Wu sees as what controls it (Seven Killings).
  assert.equal(tenGodOf(S.wu, S.jia).id, "seven-killings");
  assert.equal(TEN_GODS.find((g) => g.id === "seven-killings").hans, "七杀");
});

// Made-up births (never a real person's).
const CAMILLE = { utc: "1990-06-15T10:00:00Z", date: "1990-06-15", time: "12:00", longitude: 2.3522 };
const SAMPLE_B = { utc: "1987-11-03T22:10:00Z", date: "1987-11-03", time: "23:10", longitude: 10.7522 };

test("Camille's board: a Xin Day Master, Rob Wealth over the year, the Hurting Officer over the month, the Eating God over the hour", () => {
  const c = baziChart(CAMILLE);
  assert.equal(c.dayMaster, S.xin);
  assert.deepEqual(
    c.pillars.map((p) => `${p.id}:${STEMS[p.stem].id}:${p.god ?? "dm"}:${p.hidden.map((h) => `${STEMS[h.stem].id}${h.weight}=${h.god}`).join("+")}`),
    [
      "year:geng:rob-wealth:ding70=seven-killings+ji30=indirect-resource",
      "month:ren:hurting-officer:ding70=seven-killings+ji30=indirect-resource",
      "day:xin:dm:ren70=hurting-officer+jia30=direct-wealth",
      "hour:gui:eating-god:bing60=direct-officer+wu30=direct-resource+geng10=rob-wealth",
    ],
  );
  assert.deepEqual(c.gods["seven-killings"], { shown: 0, hidden: 2 });
  assert.deepEqual(c.gods["rob-wealth"], { shown: 1, hidden: 1 });
  assert.deepEqual(c.gods.companion, { shown: 0, hidden: 0 });
  // Without a birth time: three pillars.
  const noTime = baziChart({ ...CAMILLE, timeUnknown: true });
  assert.deepEqual(noTime.pillars.map((p) => p.id), ["year", "month", "day"]);
  // Sample B, born at 23:10: the day turns at 23:00 by default (the next day's Ding-Si), at midnight it is still Bing-Chen.
  assert.equal(STEMS[baziChart(SAMPLE_B).dayMaster].id, "ding");
  assert.equal(STEMS[baziChart(SAMPLE_B, { dayBoundary: "midnight" }).dayMaster].id, "bing");
});

test("what the board says: the Day Master's image, each god and why it is that god", () => {
  const c = baziChart(CAMILLE);
  const full = { script: "hant", show: "full" };
  const dm = baziReading(c, stemRef("day"), "en", full);
  assert.equal(dm.title, "Yin Metal · Day Master");
  assert.equal(dm.lead, DAY_MASTER_IMAGES[S.xin][0]);
  const month = baziReading(c, stemRef("month"), "en", full);
  assert.equal(month.lead, TEN_GOD_TEXTS["hurting-officer"][0]);
  assert.equal(month.sections[0].paragraphs[0], "Your Day Master xīn (Metal) produces Water, and rén is of the other polarity: the tradition calls it Hurting Officer.");
  assert.equal(
    whyGod(S.xin, S.ding, "fr", full),
    "Le Feu contrôle votre Maître du jour xīn (Métal), et dīng est de la même polarité\u202f: la tradition l’appelle Sept Tueurs.",
  );
  assert.equal(whyGod(S.xin, S.geng, "fr", full), "gēng est du Métal, comme votre Maître du jour xīn, et de l’autre polarité\u202f: la tradition l’appelle Rival.");
  assert.equal(whyGod(S.jia, S.ji, "en", full), "Your Day Master jiǎ (Wood) controls Earth, and jǐ is of the other polarity: the tradition calls it Direct Wealth.");
  const hidden = baziReading(c, hiddenRef("hour", 2), "fr", full);
  assert.equal(hidden.kicker, "Pilier de l’heure · Qi résiduel · 10");
  const god = baziReading(c, godRef("companion"), "en", full);
  assert.equal(god.facts.length, 0);
  assert.match(god.sections[0].paragraphs[0], /stands nowhere in your chart/);
  const sk = baziReading(c, godRef("seven-killings"), "en", full);
  assert.deepEqual(sk.facts.map((f) => f.ref), ["bz:hidden:year:0", "bz:hidden:month:0"]);
  assert.equal(baziReading(c, "bz:stem:hour", "en", full).facts.at(-1).value, "Eating God · shíshén 食神");
  assert.equal(baziReading(c, "zk:year", "en", full), null);
});

test("every text in both languages, in Ulune's typography and tone", () => {
  const all = [...DAY_MASTER_IMAGES, ...Object.values(TEN_GOD_TEXTS), ...Object.values(FAMILY_NAMES)];
  assert.equal(DAY_MASTER_IMAGES.length, 10);
  assert.equal(Object.keys(TEN_GOD_TEXTS).length, 10);
  for (const [en, fr] of all) {
    for (const t of [en, fr]) {
      assert.doesNotMatch(t, /'/);
      assert.doesNotMatch(t, / {2}/);
    }
    assert.doesNotMatch(fr, /[^\u202f][:;?!]/, fr.slice(0, 40));
    assert.doesNotMatch(en, /\b(death|dies?|illness|disease|sick|doomed|unlucky|curse[ds]?|must)\b/i, en.slice(0, 40));
    assert.doesNotMatch(fr, /\b(mort|meurt|maladie|malade|malchance|maudit|condamn\w*|doit|devez)\b/i, fr.slice(0, 40));
  }
  // Each Day Master's image names its own stem.
  DAY_MASTER_IMAGES.forEach(([en, fr], i) => {
    const name = STEMS[i].id.charAt(0).toUpperCase() + STEMS[i].id.slice(1);
    assert.ok(en.startsWith(`${name}, ${STEMS[i].en}`), en.slice(0, 30));
    assert.ok(fr.startsWith(`${name}, `), fr.slice(0, 30));
  });
});

test("the table as text and as CSV", () => {
  const c = baziChart(CAMILLE);
  const parts = baziTextParts(c, "en", { script: "hant", show: "full" }, "Camille");
  const pillars = parts.find((p) => p.id === "pillars").lines;
  assert.equal(parts[0].lines[0], "Camille · The chart, layer by layer");
  assert.equal(pillars[0], "The four pillars");
  assert.equal(pillars[3], "Day pillar: Yin Metal Pig · xīnhài 辛亥 · Day Master · rìzhǔ 日主 · Hidden stems 壬 rén 70 Hurting Officer · 甲 jiǎ 30 Direct Wealth");
  const csv = baziTableCsv(c).split("\n");
  assert.ok(csv.includes("bazi,dayMaster,xin"));
  assert.ok(csv.includes("pillar,hour,gui-si,癸巳,gui,eating-god,si,bing:60:direct-officer|wu:30:direct-resource|geng:10:rob-wealth,0"), csv.join("\n"));
  assert.ok(csv.includes("god,seven-killings,power,0,2"));
});
