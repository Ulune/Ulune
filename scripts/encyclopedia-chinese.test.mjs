// The encyclopedia's Chinese pages (encyclopedia plan, part 23): the writers'
// manifest is every term of the registry, once, at a free address, with the
// engine's own Chinese names; the build checks a Chinese entry against it
// (its family, kind and address, its characters and pinyin); a tradition's
// home and its written introduction; a link to a term still to be written
// reads as plain words; the lexicons borrow the shared foundations and never
// the phases' everyday names; search finds a Chinese term by its characters
// and by its pinyin with or without tones; the pilot (the five phases, yin
// and yang) is written and live in both languages, and the three Chinese
// languages' homes are where the language picker's ⓘ leads. Made-up entries
// only, besides the real content.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildEncyclopedia, formatErrors, readContent } from "./encyclopedia/build.mjs";
import { CHINESE_FAMILY_DEFS, COMBINATION_TERMS, MANIFEST_PATH, checkChineseName, hanProblem, pinyinProblem, readManifest, toneless } from "./encyclopedia/chinese.mjs";
import { manifestText } from "./encyclopedia/chinese-manifest.mjs";
import { GENERIC } from "./encyclopedia/lexicon.mjs";
import { FAMILIES, ID_RE, TRADITIONS } from "./encyclopedia/registry.mjs";
import { prepare, search } from "../src/encyclopedia/search.ts";
import { CHINESE_FAMILIES, CHINESE_FAMILY_IDS, LIVE_FAMILIES, chineseTermIds, linkableId, traditionOfTerm } from "../src/lib/chinese/term-ids.ts";
import { chineseSubjectOf } from "../src/lib/chinese/term-refs.ts";
import { LIVE_HOMES } from "../src/lib/chinese/term-live.ts";
import { PHASES, POLARITY_NAMES } from "../src/lib/chinese/names.ts";
import { LANGUAGES, languageHomePath } from "../src/studio/map.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const real = buildEncyclopedia(readContent(`${ROOT}content/encyclopedia`));
const manifest = readManifest();
const rows = new Map(manifest.entries.map((e) => [e.id, e]));
const CHINESE_LANGUAGES = ["chinese-astrology", "bazi", "feng-shui"];

/* ------------------------------------------------------------ helpers */

function md(meta, body = "") {
  const lines = ["---"];
  for (const [k, v] of Object.entries(meta)) {
    if (v === undefined) continue;
    lines.push(Array.isArray(v) ? `${k}: [${v.join(", ")}]` : `${k}: ${v}`);
  }
  lines.push("---");
  return `${lines.join("\n")}\n${body ? `\n${body}\n` : ""}`;
}

/** Both languages of an entry, as files; a Chinese term's defaults are its manifest row's. */
function pair(id, { tradition, family, kind, slug = {}, page = false, zh, related, body = {}, extra = {} } = {}) {
  const row = rows.get(id);
  return ["en", "fr"].map((lang) => ({
    path: `${tradition ?? row?.tradition ?? "astrology"}/${id}.${lang}.md`,
    text: md(
      {
        id,
        lang,
        slug: slug[lang] ?? row?.slug[lang] ?? (lang === "fr" ? `${id}-fr` : id),
        title: row?.title[lang] ?? `Title ${id}`,
        tradition: tradition ?? row?.tradition ?? "astrology",
        family: family ?? row?.family ?? "cycles",
        kind: kind ?? row?.kind ?? "core",
        page: String(page),
        summary: lang === "fr" ? "Une entrée d’essai qui dit une seule chose." : "A test entry that says one thing.",
        ...(zh === null ? {} : (zh ?? (row?.chinese ? { hant: row.chinese.hant, hans: row.chinese.hans, pinyin: row.chinese.pinyin } : {}))),
        related,
        revised: "2026-10-15",
        ...(extra[lang] ?? {}),
      },
      body[lang] ?? "",
    ),
  }));
}

const home = (tradition, lang, body, extra = "") => ({ path: `${tradition}/_home.${lang}.md`, text: `---\ntradition: ${tradition}\nlang: ${lang}\nrevised: 2026-10-15\n${extra}---\n\n${body}\n` });
const build = (files) => buildEncyclopedia(files, { prefix: "content/encyclopedia" });
const messages = (result) => formatErrors(result.errors);
const BODY = { en: "## Meaning\n\nA paragraph.", fr: "## Sens\n\nUn paragraphe." };

/* ------------------------------------------------------------ the manifest */

test("the manifest is the script’s own, up to date (node … scripts/encyclopedia/chinese-manifest.mjs --write)", () => {
  assert.equal(readFileSync(MANIFEST_PATH, "utf8"), manifestText());
});

test("the manifest: every term of the registry once, in its tradition, family and kind", () => {
  assert.deepEqual(manifest.entries.map((e) => e.id).sort(), chineseTermIds().sort());
  assert.equal(manifest.entries.length, 389);
  assert.equal(manifest.families.length, CHINESE_FAMILY_IDS.length);
  for (const e of manifest.entries) {
    assert.equal(e.tradition, traditionOfTerm(e.id), e.id);
    assert.ok(FAMILIES[e.tradition].some((f) => f.id === e.family), `${e.id}: ${e.tradition}/${e.family}`);
    // The pillars, the Na Yin and the pairs of stars are made like astrology's combinations; their family's own entry is a core page.
    const combination = COMBINATION_TERMS.has(e.terms) && e.id !== CHINESE_FAMILIES[e.terms].concept;
    assert.equal(e.kind, combination ? "combination" : "core", e.id);
  }
  for (const f of manifest.families) assert.equal(f.entries, chineseTermIds(f.terms).length, f.terms);
  const kinds = manifest.entries.reduce((n, e) => ({ ...n, [e.kind]: (n[e.kind] ?? 0) + 1 }), {});
  assert.deepEqual(kinds, { core: 254, combination: 135 });
  // A family of the encyclopedia is a family of terms, in the engine's order, its own entry first.
  for (const [tradition, list] of Object.entries(CHINESE_FAMILY_DEFS)) {
    for (const f of list) assert.deepEqual(FAMILIES[tradition].find((x) => x.id === f.id).order, chineseTermIds(f.terms), `${tradition}/${f.id}`);
  }
});

test("the manifest’s addresses: valid, unique in each language, free of every other entry’s address and id, never a home", () => {
  const others = Object.entries(real.data.index.terms).filter(([id]) => !rows.has(id));
  for (const lang of ["en", "fr"]) {
    const col = lang === "en" ? 2 : 3;
    const taken = new Set(others.map(([, r]) => r[col]));
    const homes = new Set(TRADITIONS.map((t) => t.home[lang]));
    const seen = new Set();
    for (const e of manifest.entries) {
      const s = e.slug[lang];
      assert.match(s, ID_RE, `${e.id} ${lang}`);
      assert.ok(!seen.has(s), `${lang} ${s} twice`);
      seen.add(s);
      assert.ok(!taken.has(s), `${lang} ${s} is another entry’s address`);
      assert.ok(!homes.has(s), `${lang} ${s} is a tradition’s home`);
      if (s !== e.id) assert.ok(!rows.has(s) && !Object.hasOwn(real.data.index.terms, s), `${lang} ${s} is an id`);
    }
  }
});

test("the manifest’s Chinese names: the engine’s where it has one, Han characters, a toned syllable per character", () => {
  const named = manifest.entries.filter((e) => e.chinese);
  assert.ok(named.length > 340, `${named.length} names`);
  for (const e of named) {
    assert.equal(hanProblem(e.chinese.hant), null, e.id);
    assert.equal(hanProblem(e.chinese.hans), null, e.id);
    assert.equal(pinyinProblem(e.chinese.pinyin, e.chinese.hant), null, e.id);
    assert.equal([...e.chinese.hant].length, [...e.chinese.hans].length, e.id);
  }
  const zh = (id) => rows.get(id).chinese;
  assert.deepEqual([zh("phase-wood").hant, zh("phase-wood").pinyin, zh("phase-wood").engine], ["木", "mù", true]);
  assert.deepEqual([zh("stem-jia").hant, zh("solar-term-lichun").pinyin, zh("flying-star-9").hant], ["甲", "lìchūn", "九紫"]);
  assert.deepEqual(zh("yin-yang"), { hant: POLARITY_NAMES.yin.hant + POLARITY_NAMES.yang.hant, hans: "阴阳", pinyin: "yīnyáng", engine: true, from: zh("yin-yang").from });
  // A name the engine does not hold is marked as a suggestion, to check in a dictionary.
  assert.equal(zh("ten-god").engine, false);
  assert.match(zh("ten-god").from, /suggestion/);
  // The plan’s search example: Jia Wood by its characters and its sound.
  assert.ok(rows.get("stem-jia").aliases.en.includes("甲木") && rows.get("stem-jia").aliases.en.includes("jiǎ mù"));
});

test("pinyin and characters: the checks themselves", () => {
  assert.equal(pinyinProblem("wǔxíng", "五行"), null);
  assert.equal(pinyinProblem("hǎizhōng jīn", "海中金"), null);
  assert.equal(pinyinProblem("cóng’ér gé", "從兒格"), null);
  assert.match(pinyinProblem("wuxing", "五行"), /no tone mark/);
  assert.match(pinyinProblem("mù", "五行"), /1 toned syllable\(s\) for 2 character\(s\)/);
  assert.match(pinyinProblem("Wǔxíng", "五行"), /small letters/);
  assert.match(pinyinProblem("wǔ_xíng", "五行"), /not pinyin/);
  assert.equal(hanProblem("五行"), null);
  assert.match(hanProblem("五 行"), /not Han characters/);
  assert.match(hanProblem("Wu"), /not Han characters/);
  assert.equal(toneless("hǎizhōng jīn"), "haizhong jin");
  assert.equal(toneless("lǜ"), "lu");
  const out = [];
  checkChineseName({ hant: "木" }, rows.get("phase-wood"), (k, m) => out.push(`${k}: ${m}`));
  assert.match(out.join("\n"), /`hans` is missing/);
});

/* ------------------------------------------------------------ the build's checks */

test("a Chinese entry: a term of the manifest, in its family, kind, address and Chinese name", () => {
  // As the manifest says: no mistake.
  assert.deepEqual(build(pair("phase-wood")).errors, []);
  const got = messages(
    build([
      ...pair("phase-fire", { family: "stems" }),
      ...pair("phase-earth", { slug: { en: "earth" } }),
      ...pair("phase-metal", { zh: null }),
      ...pair("phase-water", { zh: { hant: "林", hans: "水", pinyin: "shui" } }),
      ...pair("phase-not-a-term", { tradition: "chinese", family: "phases" }),
      ...pair("stem-jia", { tradition: "bazi", family: "ten-gods" }),
      ...pair("phase", { kind: "combination" }),
    ]),
  );
  assert.match(got, /phase-fire\.en\.md:\d+: family "stems": the manifest puts this term in "phases"/);
  assert.match(got, /phase-earth\.en\.md:\d+: slug "earth": the manifest gives this term the address "earth-phase"/);
  assert.match(got, /phase-metal\.en\.md:\d+: this term has a Chinese name in the engine: hant: 金, hans: 金, pinyin: jīn/);
  assert.match(got, /phase-water\.en\.md:\d+: `hant` is "林"; the engine writes "水"/);
  assert.match(got, /phase-water\.en\.md:\d+: `pinyin` "shui" has no tone mark/);
  assert.match(got, /phase-not-a-term\.en\.md:\d+: "phase-not-a-term" is not a term of the Chinese traditions/);
  assert.match(got, /stem-jia\.en\.md:\d+: the manifest puts "stem-jia" in chinese, not bazi/);
  assert.match(got, /phase\.en\.md:\d+: kind "combination": the manifest's is "core"/);
  // Both languages give the same Chinese name.
  const [en, fr] = pair("phase-wood");
  const differ = build([en, { ...fr, text: fr.text.replace("pinyin: mù", "pinyin: mǔ") }]);
  assert.match(messages(differ), /`pinyin` differs from the English file/);
  // Any entry may give a Chinese name (Saturn, 土星 tǔxīng): its form is checked, not an engine’s.
  assert.deepEqual(build(pair("saturn-test", { zh: { hant: "土星", hans: "土星", pinyin: "tǔxīng" } })).errors, []);
  assert.match(messages(build(pair("saturn-test", { zh: { hant: "土星", hans: "土星", pinyin: "tuxing" } }))), /no tone mark/);
});

test("a tradition’s home: its introduction in both languages, linking only what exists; [[bazi]] links it once it has one", () => {
  const entry = pair("alpha", { family: "cycles", page: true, body: BODY });
  const ok = build([...entry, home("bazi", "en", "BaZi reads the [[alpha|alpha]] of a birth."), home("bazi", "fr", "Le BaZi lit l’[[alpha|alpha]] d’une naissance.", "sources:\n  - A book, 1900\n")]);
  assert.deepEqual(ok.errors, []);
  const t = ok.data.index.traditions.find((x) => x.id === "bazi");
  assert.deepEqual([t.count, t.about], [0, 1]);
  const h = ok.data.traditionHomes["fr/bazi"];
  assert.equal(h.families.length, 0);
  assert.deepEqual(h.zh, { hant: "八字", hans: "八字", pinyin: "bāzì" });
  assert.deepEqual(h.sources, ["A book, 1900"]);
  assert.deepEqual(h.about[0].c.slice(0, 2), ["Le BaZi lit l’", { l: "alpha", w: "alpha", s: "alpha-fr", g: "astrology" }]);
  assert.ok(ok.data.homes.en.traditions.some((x) => x.id === "bazi" && x.count === 0));
  // An entry may link a home that exists ([[bazi]], by its name), never one that does not.
  const links = build([
    ...pair("beta", { family: "cycles", page: true, body: { en: "## Meaning\n\nRead in [[bazi]] and [[feng-shui]].", fr: "## Sens\n\nLu dans le [[bazi|BaZi]]." } }),
    home("bazi", "en", "An introduction."),
    home("bazi", "fr", "Une introduction."),
  ]);
  assert.match(messages(links), /beta\.en\.md:\d+: \[\[feng-shui\]\]: Feng Shui has no home yet/);
  assert.doesNotMatch(messages(links), /\[\[bazi\]\]/);
  const bad = messages(
    build([
      ...entry,
      home("bazi", "en", "See [[nobody]] and [[bazi]].\n\n## A heading"),
      home("feng-shui", "fr", "Une introduction : sans espace insécable."),
    ]),
  );
  assert.match(bad, /bazi\/_home\.en\.md:\d+: \[\[nobody\]\]: no entry has this id/);
  assert.match(bad, /bazi\/_home\.en\.md:\d+: \[\[bazi\]\]: a home does not link to itself/);
  assert.match(bad, /bazi\/_home\.en\.md:\d+: a tradition's home text has no heading/);
  assert.match(bad, /no French home text: content\/encyclopedia\/bazi\/_home\.fr\.md/);
  assert.match(bad, /feng-shui\/_home\.fr\.md:\d+: ":" needs a narrow no-break space/);
});

test("a term still to be written: plain words in a page, out of its related list; an unknown id is still a mistake", () => {
  const body = { en: "## Meaning\n\nWritten with [[stem-jia|Jia]], [[stem-yi]] and [[phase-wood]].", fr: "## Sens\n\nAvec [[stem-jia|Jia]] et [[stem-yi]]." };
  const ok = build([...pair("gamma", { family: "cycles", page: true, body, related: ["stem-jia", "delta"] }), ...pair("delta", { family: "cycles" }), ...pair("phase-wood")]);
  assert.deepEqual(ok.errors, []);
  const p = ok.data.pages["en/gamma"];
  assert.deepEqual(p.sections[0].blocks[0].c, ["Written with ", "Jia", ", ", "Yi · Yin Wood", " and ", { l: "phase-wood", w: "Wood", s: null, g: "chinese" }, "."]);
  assert.deepEqual(p.related.map((r) => r.id), ["delta"]);
  assert.deepEqual(ok.data.pages["fr/gamma"].sections[0].blocks[0].c, ["Avec ", "Jia", " et ", "Yi · Bois yin", "."]);
  assert.match(messages(build(pair("gamma", { family: "cycles", page: true, body: { en: "## Meaning\n\n[[stem-jiaa]].", fr: "## Sens\n\n[[stem-jia]]." }, related: ["stem-yii"] }))), /\[\[stem-jiaa\]\]: no entry has this id[\s\S]*related: no entry has the id "stem-yii"/);
});

/* ------------------------------------------------------------ the real content */

test("content/encyclopedia builds clean, the pilot written in both languages with its Chinese names", () => {
  assert.equal(real.errors.length, 0, formatErrors(real.errors));
  const ids = ["phase", ...PHASES.map((p) => `phase-${p.id}`), "yin-yang"];
  for (const id of ids) {
    const row = rows.get(id);
    for (const lang of ["en", "fr"]) {
      const page = real.data.pages[`${lang}/${id}`];
      assert.ok(page, `${lang}/${id}`);
      assert.equal(page.slug, row.slug[lang]);
      assert.deepEqual(page.zh, { hant: row.chinese.hant, hans: row.chinese.hans, pinyin: row.chinese.pinyin });
      assert.equal(page.tradition.id, row.tradition);
      // At the encyclopedia’s standard: its sections, its sources, a summary for the card.
      assert.deepEqual(page.sections.map((s) => s.key), ["meaning", "practice", "traditions", "history", "calculation", "correspondences"], id);
      assert.ok(page.sources.length >= 5, `${id}: ${page.sources.length} sources`);
      const words = JSON.stringify(page.sections).split(/\s+/).length;
      assert.ok(words > 550, `${lang}/${id}: ${words} words`);
    }
    // The card names its pinyin too.
    assert.equal(real.data.cards[`en/${row.tradition}`][id][2], row.chinese.pinyin);
  }
  // The five phases in the engine’s order, the family’s own entry first; their neighbours follow the generating cycle.
  assert.deepEqual(FAMILIES.chinese.find((f) => f.id === "phases").order, ids.slice(0, 6));
  assert.equal(real.data.pages["en/phase-wood"].next.slug, "fire-phase");
  assert.equal(real.data.pages["fr/phase-water"].prev.slug, "phase-metal");
  // The A–Z: Wood under W, Bois under B.
  const letter = (lang, l) => real.data.homes[lang].az.find(([x]) => x === l)[1].map((r) => r[0]);
  assert.ok(letter("en", "W").includes("phase-wood") && letter("fr", "B").includes("phase-wood") && letter("fr", "Y").includes("yin-yang"));
});

test("the pilot is live: its words link, its readings offer it; every live family is written", () => {
  assert.ok(LIVE_FAMILIES.has("phase") && LIVE_FAMILIES.has("polarity"));
  for (const family of LIVE_FAMILIES) for (const id of chineseTermIds(family)) assert.equal(real.data.index.terms[id]?.[4], 1, `${family}: ${id}`);
  assert.equal(linkableId("phase", "wood"), "phase-wood");
  assert.equal(linkableId("polarity", "yin"), "yin-yang");
  assert.equal(linkableId("stem", "jia"), null, "the stems are not written yet");
  assert.deepEqual([...chineseSubjectOf("bz:phase:fire")], ["phase-fire"]);
});

test("the three Chinese languages’ homes: built from their introductions, and the language picker’s ⓘ leads there", () => {
  const byId = new Map(TRADITIONS.map((t) => [t.id, t]));
  for (const id of CHINESE_LANGUAGES) {
    const t = byId.get(id);
    for (const lang of ["en", "fr"]) {
      const h = real.data.traditionHomes[`${lang}/${id}`];
      assert.ok(h?.about?.length >= 3, `${lang}/${id}: its introduction`);
      assert.ok(h.zh && h.sources?.length, `${lang}/${id}`);
      assert.equal(languageHomePath(id, lang), `${lang === "fr" ? "/encyclopedie" : "/encyclopedia"}/${t.home[lang]}`);
    }
    assert.deepEqual(LIVE_HOMES[id], t.home, id);
  }
  // Exactly the languages whose home the encyclopedia builds.
  const built = LANGUAGES.filter((l) => l.group === "chinese" && real.data.traditionHomes[`en/${l.id}`]).map((l) => l.id);
  assert.deepEqual(Object.keys(LIVE_HOMES).sort(), built.sort());
  // Chinese cosmology has no picker card, but a home of its own, with its introduction and its first family.
  const cosmology = real.data.traditionHomes["en/chinese"];
  assert.deepEqual(cosmology.families.map((f) => f.id), ["phases"]);
  assert.ok(cosmology.about.length >= 3);
});

test("search: a Chinese term by its characters, its pinyin with or without tones, its names in either language", () => {
  const en = prepare(real.data.search.en);
  const fr = prepare(real.data.search.fr);
  const first = (engine, q) => search(engine, q)[0]?.id;
  for (const q of ["木", "mù", "mu", "Wood", "wood element"]) assert.equal(first(en, q), "phase-wood", q);
  for (const q of ["五行", "wuxing", "wǔxíng", "wu xing", "five elements", "cinq phases"]) assert.equal(first(en, q), "phase", q);
  for (const q of ["陰陽", "阴阳", "yin yang", "yīnyáng", "yinyang", "☯"]) assert.equal(first(fr, q), "yin-yang", q);
  assert.equal(first(fr, "bois"), "phase-wood");
  // "Fire" is the astrology element and the Chinese phase: both found, each in its tradition.
  const fire = search(en, "fire").map((h) => h.id);
  assert.ok(fire.includes("element-fire") && fire.includes("phase-fire"), fire.join(" "));
});

test("the lexicons: the shared ideas everywhere, the shared Chinese foundations in each Chinese language, the phases’ single names never", () => {
  const { lexicon } = real.data;
  const has = (lang, t, form) => lexicon[lang][t].some((r) => r[0] === form);
  for (const t of CHINESE_LANGUAGES) {
    assert.ok(has("en", t, "Five phases") && has("en", t, "five phases") && has("en", t, "yin and yang"), t);
    assert.ok(has("fr", t, "Cinq phases") && has("fr", t, "Yin et yang"), t);
  }
  for (const t of ["astrology", "human-design", "numerology"]) assert.ok(has("en", t, "Yin and yang") && !has("en", t, "Five phases"), t);
  for (const lang of ["en", "fr"]) {
    for (const [t, list] of Object.entries(lexicon[lang])) {
      for (const [form] of list) assert.ok(!GENERIC[lang].has(form), `${lang}/${t}: ${form}`);
      for (const p of PHASES) assert.ok(!list.some((r) => r[0] === p[lang]), `${lang}/${t}: ${p[lang]} alone`);
    }
  }
});
