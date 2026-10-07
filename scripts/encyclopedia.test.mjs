// The encyclopedia's format, build and search (encyclopedia plan, parts 1, 2
// and 5): the entry files are read exactly as the format says, every mistake
// fails the build with its file and line, the real content in
// content/encyclopedia builds clean, and the search finds entries with or
// without accents, with a typo, by a glyph, in either language, by phrase.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { buildEncyclopedia, formatErrors, frenchProblems, readContent, summaryProblem } from "./encyclopedia/build.mjs";
import { parseEntry } from "./encyclopedia/parse.mjs";
import { encyclopediaPlugin } from "./encyclopedia/vite-plugin.mjs";
import { FAMILIES, TRADITIONS } from "./encyclopedia/registry.mjs";
import { fold, keyTokens, tokens } from "../src/encyclopedia/normalize.ts";
import { byTradition, oneEdit, prepare, queryWords, search } from "../src/encyclopedia/search.ts";
import { entryHead, homeHead, traditionHead } from "../src/encyclopedia/head.ts";
import { encyclopediaPairs, sitemapPaths, sitemapXml } from "../src/lib/sitemap.ts";
import { INDEXED_PAGES } from "../src/lib/page-head.ts";
import { GLOSSARY_ORDER } from "../src/lib/i18n/glossary.ts";
import { CATALOG } from "../src/lib/i18n/catalog/index.ts";
import { encyclopedia } from "../src/lib/i18n/catalog/encyclopedia.ts";
import { bootScript } from "../src/lib/boot.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const N = " ";

/* ------------------------------------------------------------ helpers */

/** An entry file's text: front matter from `meta` (in the format's order), then `body`. */
function md(meta, body = "") {
  const lines = ["---"];
  for (const [k, v] of Object.entries(meta)) {
    if (v === undefined) continue;
    lines.push(Array.isArray(v) ? `${k}: [${v.join(", ")}]` : `${k}: ${v}`);
  }
  lines.push("---");
  return `${lines.join("\n")}\n${body ? `\n${body}\n` : ""}`;
}

const SUMMARY = { en: "A test entry that says one thing.", fr: "Une entrée d’essai qui dit une seule chose." };

/** Both languages of an entry, as files. */
function pair(id, { tradition = "astrology", family = "cycles", page = false, slug = {}, title = {}, summary = {}, related, body = {}, extra = {} } = {}) {
  return ["en", "fr"].map((lang) => ({
    path: `${tradition}/${id}.${lang}.md`,
    text: md(
      {
        id,
        lang,
        slug: slug[lang] ?? (lang === "fr" ? `${id}-fr` : id),
        title: title[lang] ?? `${lang === "fr" ? "Titre" : "Title"} ${id}`,
        tradition,
        family,
        kind: "core",
        page: String(page),
        summary: summary[lang] ?? SUMMARY[lang],
        related,
        revised: "2026-10-07",
        ...(extra[lang] ?? {}),
      },
      body[lang] ?? "",
    ),
  }));
}

const PAGE_BODY = {
  en: "## Meaning\n\nA paragraph that links to [[beta]].\n\n## In practice\n\n- One item.\n- Another, with **bold** and *italic*.",
  fr: "## Sens\n\nUn paragraphe qui renvoie à [[beta|bêta]].\n\n## En pratique\n\n- Un élément.\n- Un autre, en **gras** et en *italique*.",
};

function build(files) {
  return buildEncyclopedia(files, { prefix: "content/encyclopedia" });
}

/** The messages of a build's errors, for one file. */
function errorsOf(result, file) {
  return result.errors.filter((e) => !file || e.file.endsWith(file)).map((e) => `${e.line}: ${e.message}`);
}

/* ------------------------------------------------------------ the parser */

test("front matter: plain and quoted values, inline and block lists, comments", () => {
  const errors = [];
  const text = [
    "---",
    "id: saturn # the id",
    "lang: en",
    'title: "Saturn: the \\"teacher\\""',
    'aliases: [Saturnus, "♄", "Kronos, Cronus"]',
    "glyph: \"♄\"              # optional",
    "summary: The planet of structure, time, limits and maturity.",
    "# a whole-line comment",
    "sources:",
    "  - Claudius Ptolemy, Tetrabiblos, c. 150",
    "",
    '  - "William Lilly, Christian Astrology, 1647"',
    "related: []",
    "---",
    "",
  ].join("\n");
  const { meta, metaLines } = parseEntry(text, "x.md", errors);
  assert.deepEqual(errors, []);
  assert.equal(meta.id, "saturn");
  assert.equal(meta.title, 'Saturn: the "teacher"');
  assert.deepEqual(meta.aliases, ["Saturnus", "♄", "Kronos, Cronus"]);
  assert.equal(meta.glyph, "♄");
  assert.deepEqual(meta.sources, ["Claudius Ptolemy, Tetrabiblos, c. 150", "William Lilly, Christian Astrology, 1647"]);
  assert.deepEqual(meta.related, []);
  assert.equal(metaLines.summary, 7);
});

test("front matter: each mistake has its line", () => {
  const errors = [];
  const text = ["---", "id: x", "colour: blue", "id: y", "title: 'single'", "aliases: Saturnus", "summary: |", "not a key", "---"].join("\n");
  parseEntry(text, "x.md", errors);
  const got = errors.map((e) => `${e.line}: ${e.message}`);
  assert.ok(got.some((m) => m.startsWith("3: unknown key `colour`")), got.join("\n"));
  assert.ok(got.some((m) => m.startsWith("4: `id` is given twice")), got.join("\n"));
  assert.ok(got.some((m) => m.startsWith("5: values are quoted with double quotes")), got.join("\n"));
  assert.ok(got.some((m) => m.startsWith("6: `aliases` is a list")), got.join("\n"));
  assert.ok(got.some((m) => m.startsWith("7: a value may not start with \"|\"")), got.join("\n"));
  assert.ok(got.some((m) => m.startsWith("8: not a `key: value` line")), got.join("\n"));
  const missing = [];
  parseEntry("id: x\n", "y.md", missing);
  assert.match(missing[0].message, /must start with a `---` line/);
});

test("body: sections, paragraphs over several lines, lists, tables, emphasis, links", () => {
  const errors = [];
  const body = [
    "## Meaning",
    "",
    "A first line",
    "and its second, with **bold *and italic* words** and [[beta|a link]].",
    "",
    "1. First",
    "2. Second, going on",
    "   on the next line",
    "",
    "## Correspondences",
    "",
    "| Day | Metal |",
    "| --- | :---: |",
    "| Saturday | [[gamma|lead]] |",
  ].join("\n");
  const { sections } = parseEntry(md({ id: "alpha", lang: "en" }, body), "x.md", errors);
  assert.deepEqual(errors, []);
  assert.deepEqual(sections.map((s) => s.key), ["meaning", "correspondences"]);
  const [p, ol] = sections[0].blocks;
  assert.equal(p.t, "p");
  assert.equal(p.c[0], "A first line and its second, with ");
  assert.deepEqual(p.c[1], { b: ["bold ", { i: ["and italic"] }, " words"] });
  assert.equal(p.c[3].l, "beta");
  assert.equal(p.c[3].w, "a link");
  // The link's own line, the paragraph's second (the front matter takes lines 1 to 4).
  assert.equal(p.c[3].line, 9);
  assert.equal(ol.t, "ol");
  assert.equal(ol.items[1].c[0], "Second, going on on the next line");
  const table = sections[1].blocks[0];
  assert.equal(table.t, "table");
  assert.deepEqual(table.align, ["", "c"]);
  assert.equal(table.rows[0].cells[1][0].l, "gamma");
});

test("body: what the format leaves out fails, with its line", () => {
  const errors = [];
  const body = [
    "Before any heading.",
    "## Meaning",
    "",
    "Raw <b>HTML</b>, an ![image](x.png), a [link](https://example.org), `code`.",
    "",
    "### Too deep",
    "## Origin and history",
    "",
    "  - nested",
    "",
    "> a quote",
    "",
    "An **unclosed bold.",
    "## Meaning",
    "## Sens",
    "## In practice",
    "",
    "Out of order.",
  ].join("\n");
  parseEntry(md({ id: "alpha", lang: "en" }, body), "x.md", errors);
  const got = errors.map((e) => `${e.line}: ${e.message}`).join("\n");
  const start = 6; // the body's first line in the file (the front matter takes lines 1 to 4, then a blank line)
  for (const [offset, re] of [
    [0, /text before the first section heading/],
    [3, /raw HTML/],
    [3, /images are not part/],
    [3, /written \[\[id\]\]/],
    [3, /code \(`\)/],
    [5, /only `## ` headings/],
    [8, /nested lists/],
    [10, /quotes \(`>`\)/],
    [12, /"\*\*" is not closed/],
    [13, /"## Meaning" is used twice/],
    [14, /"Sens" is not one of the headings/],
    [15, /out of order/],
  ]) {
    assert.match(got, new RegExp(`^${start + offset}: .*${re.source}`, "m"), `line ${start + offset}: ${re}\n${got}`);
  }
});

/* ------------------------------------------------------------ the build's checks */

test("a valid pair builds: pages, cards, index, search, homes", () => {
  const files = [
    ...pair("alpha", { page: true, related: ["beta"], body: PAGE_BODY, extra: { en: { glyph: '"♄"' }, fr: { glyph: '"♄"' } } }),
    ...pair("beta", { slug: { fr: "beta-fr" } }),
  ];
  const { errors, data } = build(files);
  assert.deepEqual(errors, []);
  assert.deepEqual(Object.keys(data.pages).sort(), ["en/alpha", "fr/alpha"]);
  const page = data.pages["fr/alpha"];
  assert.equal(page.twin.slug, "alpha");
  assert.equal(page.family.name, "Les cycles du ciel");
  assert.deepEqual(page.related.map((r) => [r.id, r.slug]), [["beta", null]]);
  // A link's words: the writer's, or the target's title in the page's language; no address for a card only.
  assert.deepEqual(page.sections[0].blocks[0].c[1], { l: "beta", w: "bêta", s: null, g: "astrology" });
  assert.deepEqual(data.index.terms.alpha, ["astrology", "cycles", "alpha", "alpha-fr", 1, "♄"]);
  assert.deepEqual(data.index.terms.beta, ["astrology", "cycles", "beta", "beta-fr", 0, ""]);
  assert.deepEqual(data.cards["fr/astrology"].beta, ["Titre beta", SUMMARY.fr]);
  assert.equal(data.homes.en.traditions.length, 1);
  assert.deepEqual(data.traditionHomes["en/astrology"].families.map((f) => f.id), ["cycles"]);
  assert.equal(data.traditionHomes["fr/astrology"].twinHome, "astrology");
});

test("each language must exist, and they must agree", () => {
  const [en] = pair("alpha");
  const lone = build([en]);
  assert.match(formatErrors(lone.errors), /content\/encyclopedia\/astrology\/alpha\.en\.md:1: no French file: content\/encyclopedia\/astrology\/alpha\.fr\.md/);
  const [a, b] = pair("alpha");
  const drift = build([a, { ...b, text: b.text.replace("family: cycles", "family: dignities") }]);
  assert.match(formatErrors(drift.errors), /alpha\.fr\.md:7: `family` differs from the English file/);
});

test("the front matter's values are checked against the file and the registry", () => {
  const [en, fr] = pair("alpha");
  const bad = en.text
    .replace("id: alpha", "id: alfa")
    .replace("family: cycles", "family: comets")
    .replace("kind: core", "kind: essay")
    .replace("page: false", "page: maybe")
    .replace("revised: 2026-10-07", "revised: 2026-02-30")
    .replace("slug: alpha", "slug: Alpha_One");
  const got = errorsOf(build([{ ...en, text: bad }, fr]), "alpha.en.md").join("\n");
  assert.match(got, /^2: id "alfa" is not the file's name/m);
  assert.match(got, /^4: slug "Alpha_One": lowercase ASCII/m);
  assert.match(got, /^7: family "comets" is not one of astrology's/m);
  assert.match(got, /^8: kind "essay"/m);
  assert.match(got, /^9: page "maybe": true or false/m);
  assert.match(got, /^11: revised "2026-02-30"/m);
  const wrongFolder = build(pair("alpha").map((f) => ({ ...f, path: f.path.replace("astrology/", "tarot/") })));
  assert.match(formatErrors(wrongFolder.errors), /"tarot" is not a tradition/);
  const wrongName = build([{ path: "astrology/Alpha.EN.md", text: en.text }]);
  assert.match(formatErrors(wrongName.errors), /entries are named <id>\.<lang>\.md/);
});

test("the summary is one sentence of at most 160 characters", () => {
  assert.equal(summaryProblem("The planet of structure, time, limits and maturity."), null);
  assert.equal(summaryProblem("Of 10° of the zodiac (c. 150), in the 1er decan."), null);
  assert.match(summaryProblem(`${"a".repeat(160)}.`), /161 characters; at most 160/);
  assert.match(summaryProblem("No full stop"), /ending with a full stop/);
  assert.match(summaryProblem("One sentence. Two sentences."), /not several/);
  assert.match(summaryProblem(`Une question${N}? Une réponse.`), /not several/);
  const files = pair("alpha", { summary: { en: "First. Second." } });
  assert.match(formatErrors(build(files).errors), /alpha\.en\.md:10: the summary is one sentence, not several/);
});

test("a page has a body; links and related ids name entries, never the page itself", () => {
  const empty = build(pair("alpha", { page: true }));
  assert.match(formatErrors(empty.errors), /alpha\.en\.md:9: page: true, but the body has no section/);
  const body = {
    en: "## Meaning\n\nSee [[gamma]], [[alpha]], then [[beta]].",
    fr: PAGE_BODY.fr,
  };
  const got = formatErrors(build([...pair("alpha", { page: true, related: ["delta", "alpha", "beta", "beta"], body }), ...pair("beta")]).errors);
  // The front matter takes lines 1 to 13 (related on 11); the paragraph is line 17.
  assert.match(got, /alpha\.en\.md:17: \[\[gamma\]\]: no entry has this id/);
  assert.match(got, /alpha\.en\.md:17: \[\[alpha\]\]: a page does not link to itself/);
  assert.match(got, /alpha\.en\.md:11: related: no entry has the id "delta"/);
  assert.match(got, /alpha\.en\.md:11: related: an entry is not related to itself/);
  assert.match(got, /alpha\.en\.md:11: related: "beta" is listed twice/);
});

test("a term linked twice in a paragraph or a list item is a warning with its line, never a mistake", () => {
  const body = {
    en: [
      "## Meaning",
      "",
      "Once [[beta]], then [[beta|beta again]].",
      "",
      "- An item with [[beta]] and",
      "  [[beta]] on its next line.",
      "- Another item with [[beta]]: a new item may link it again.",
      "",
      "| A | B |",
      "| --- | --- |",
      "| [[beta]] | [[beta]] |",
    ].join("\n"),
    fr: PAGE_BODY.fr,
  };
  const out = build([...pair("alpha", { page: true, body }), ...pair("beta")]);
  assert.deepEqual(out.errors, []);
  assert.ok(out.data, "a warning does not stop the build");
  // The paragraph is line 16, the list's second line 19; a table may name the same entry in every cell.
  assert.equal(
    formatErrors(out.warnings),
    [
      "content/encyclopedia/astrology/alpha.en.md:16: [[beta]] is linked twice in one paragraph: link its first mention only",
      "content/encyclopedia/astrology/alpha.en.md:19: [[beta]] is linked twice in one list item: link its first mention only",
    ].join("\n"),
  );
  // Linking a term once in a whole list or table, as the writers do, passes too.
  assert.deepEqual(build([...pair("alpha", { page: true, body: PAGE_BODY }), ...pair("beta")]).warnings, []);
});

test("the writers' forms: quoted values, free sources, links in bold and tables, numbers as glyphs, every character", () => {
  const front = (lang) => ({
    title: lang === "en" ? '"The Mercury–Saturn square"' : '"Le carré Mercure–Saturne"',
    aliases: lang === "en" ? '["☿ □ ♄", "Mesouranēma", Lìchūn]' : '["☿ □ ♄", "Mesouranēma", Lìchūn]',
    glyph: '"1"',
    revised: "2026-10-07",
  });
  const sources = {
    en: ["sources:", '  - "Robert Hand: Horoscope Symbols, 1981"', "  - Claudius Ptolemy, Tetrabiblos, 2nd century", "  - A table of houses, anonymous"],
    fr: ["sources:", "  - Claude Ptolémée, Tétrabible, vers 150", "  - Manilius, Astronomiques, Ier siècle", '  - "Hipparque : un catalogue, IIe siècle av. J.-C."'],
  };
  const body = {
    en: [
      "## Meaning",
      "",
      "**[[beta|Mercury]] square [[gamma|Saturn]]** and **The [[beta]] in Virgo**: about 2½ degrees, 15′ of arc, ~1500 years.",
      "",
      "## Correspondences",
      "",
      "| # | Name | Value |",
      "| --- | --- | --- |",
      "| 1 | [[beta]] | [[gamma]] |",
    ].join("\n"),
    fr: [
      "## Sens",
      "",
      `**[[beta|Mercure]] carré [[gamma|Saturne]]**${N}: 10${N}000 ans, 50${N}%, «${N}mesouranēma${N}» et l’aspect.`,
      "",
      "## Correspondances",
      "",
      "| # | Nom | Valeur |",
      "| --- | --- | --- |",
      "| 1 | [[beta]] | [[gamma]] |",
    ].join("\n"),
  };
  const files = pair("alpha", { page: true, body, slug: { en: "alpha", fr: "alpha" } }).map((f) => {
    const lang = f.path.endsWith(".fr.md") ? "fr" : "en";
    let text = f.text;
    for (const [k, v] of Object.entries(front(lang))) text = text.replace(new RegExp(`^${k}: .*$`, "m"), `${k}: ${v}`);
    text = text.replace(/^title: (.*)$/m, (line) => `${line}\naliases: ${front(lang).aliases}\nglyph: ${front(lang).glyph}`);
    return { ...f, text: text.replace(/^revised: .*$/m, (line) => `${line}\n${sources[lang].join("\n")}`) };
  });
  // beta has no glyph at all; the only slug both languages share is allowed ("cancer" does it).
  const out = build([...files, ...pair("beta"), ...pair("gamma")]);
  assert.equal(formatErrors(out.errors), "");
  const en = out.data.pages["en/alpha"];
  assert.equal(en.title, "The Mercury–Saturn square");
  assert.equal(en.glyph, "1");
  assert.equal(out.data.index.terms.beta[5], "");
  assert.deepEqual(en.sources, ["Robert Hand: Horoscope Symbols, 1981", "Claudius Ptolemy, Tetrabiblos, 2nd century", "A table of houses, anonymous"]);
  assert.deepEqual(out.data.pages["fr/alpha"].sources[2], "Hipparque : un catalogue, IIe siècle av. J.-C.");
  // Links inside bold keep both: the bold and the links, with the writer's words or the target's title.
  const [bold, , bold2] = en.sections[0].blocks[0].c;
  assert.deepEqual(bold, { b: [{ l: "beta", w: "Mercury", s: null, g: "astrology" }, " square ", { l: "gamma", w: "Saturn", s: null, g: "astrology" }] });
  assert.deepEqual(bold2, { b: ["The ", { l: "beta", w: "Title beta", s: null, g: "astrology" }, " in Virgo"] });
  assert.match(en.sections[0].blocks[0].c.at(-1), /2½ degrees, 15′ of arc, ~1500 years\.$/);
  // A bare [[id]] in a table's cells shows the target's title; "#" is a cell like any other.
  const table = en.sections[1].blocks[0];
  assert.deepEqual(table.head[0], ["#"]);
  assert.deepEqual(table.rows[0][1], [{ l: "beta", w: "Title beta", s: null, g: "astrology" }]);
  // Macrons, tones and glyphs in aliases are found without their marks.
  const engine = prepare(out.data.search.en);
  assert.equal(search(engine, "mesouranema")[0]?.id, "alpha");
  assert.equal(search(engine, "lichun")[0]?.id, "alpha");
  assert.equal(summaryProblem("Né au IIe siècle av. J.-C. en Égypte, mort vers 120 apr. J.-C. à Rome."), null);
  assert.match(summaryProblem("Né au IIe siècle av. J.-C. Puis mort."), /not several/);
});

test("addresses are unique in each language, never a tradition's home, never another entry's id", () => {
  const files = [
    ...pair("alpha", { slug: { fr: "commun" } }),
    ...pair("beta", { slug: { fr: "commun" } }),
    ...pair("gamma", { slug: { en: "astrology" } }),
    ...pair("delta", { slug: { en: "alpha" } }),
  ];
  const got = formatErrors(build(files).errors);
  assert.match(got, /beta\.fr\.md:4: the slug "commun" is already alpha's/);
  assert.match(got, /gamma\.en\.md:4: the slug "astrology" is a tradition's home address/);
  assert.match(got, /delta\.en\.md:4: the slug "alpha" is already alpha's in this language/);
  assert.match(got, /delta\.en\.md:4: the slug "alpha" is the id of another entry/);
  // The French homes are taken in French only.
  assert.ok(TRADITIONS.every((t) => t.home.en !== t.home.fr || t.id === "astrology"));
});

test("French texts: narrow no-break spaces before : ; ! ? and inside « », typographic apostrophes", () => {
  assert.deepEqual(frenchProblems(`Le Soleil${N}: la Lune${N}; «${N}oui${N}»${N}! L’année 12:00${N}?`), []);
  assert.equal(frenchProblems("Le Soleil : la Lune").length, 1);
  assert.equal(frenchProblems("Le Soleil: la Lune").length, 1);
  assert.equal(frenchProblems("Pourquoi ?").length, 1);
  assert.equal(frenchProblems("« oui »").length, 2);
  assert.match(frenchProblems("l'année")[0], /typographic apostrophe/);
  const files = pair("alpha", {
    page: true,
    summary: { fr: "Une entrée : sans espace fine." },
    body: { en: PAGE_BODY.en, fr: "## Sens\n\nUne phrase ; puis «oui».\n\n## En pratique\n\n- Un [[beta|lien : ici]]." },
  });
  const got = formatErrors(build([...files, ...pair("beta")]).errors);
  assert.match(got, /alpha\.fr\.md:10: summary: ":" needs a narrow no-break space/);
  assert.match(got, /alpha\.fr\.md:16: ";" needs a narrow no-break space/);
  assert.match(got, /alpha\.fr\.md:16: "«" needs a narrow no-break space/);
  assert.match(got, /alpha\.fr\.md:16: "»" needs a narrow no-break space/);
  assert.match(got, /alpha\.fr\.md:20: ":" needs a narrow no-break space/);
  // English files keep English typography.
  assert.doesNotMatch(got, /alpha\.en\.md/);
});

/* ------------------------------------------------------------ the real content */

const real = buildEncyclopedia(readContent(`${ROOT}content/encyclopedia`));

test("content/encyclopedia builds with no mistake", () => {
  assert.equal(formatErrors(real.errors), "");
  assert.ok(Object.keys(real.data.index.terms).length >= 69);
  for (const id of ["retrograde", "station", "eclipse"]) {
    assert.ok(real.data.pages[`en/${id}`] && real.data.pages[`fr/${id}`], `${id} has its pages`);
  }
});

test("every glossary word has its entry", () => {
  // Nine of them (aspect, orb, applying, sign, house, ascendant, midheaven, parallel, out-of-sign) came with the writers' families.
  const kebab = (id) => id.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
  const missing = GLOSSARY_ORDER.map(kebab).filter((id) => !real.data.index.terms[id]);
  assert.deepEqual(missing, []);
  assert.equal(GLOSSARY_ORDER.length, 75);
  for (const id of ["detriment", "fall", "house-system"]) assert.ok(real.data.index.terms[id], id);
});

test("every id in a family's order is unique across the registry's families", () => {
  for (const t of TRADITIONS) {
    const seen = new Set();
    for (const f of FAMILIES[t.id]) {
      for (const id of f.order) {
        assert.ok(!seen.has(id), `${id} twice in ${t.id}`);
        seen.add(id);
      }
    }
  }
});

test("the term index: each entry's tradition, family and addresses; a family in its order", () => {
  const { index, traditionHomes, pages } = real.data;
  assert.deepEqual(index.terms.retrograde, ["astrology", "cycles", "retrograde", "retrograde", 1, "℞"]);
  assert.deepEqual(index.terms["moon-phase"].slice(2, 5), ["moon-phase", "phase-de-la-lune", 1]);
  // A short card (no page yet): its row says so.
  assert.deepEqual(index.terms["hd-gate"].slice(2, 5), ["gate", "porte", 0]);
  const cycles = traditionHomes["en/astrology"].families.find((f) => f.id === "cycles").rows.map((r) => r[0]);
  assert.deepEqual(cycles, ["retrograde", "station", "ingress", "moon-phase", "eclipse", "void-of-course", "season"]);
  // Previous and next go through the pages of the family only.
  assert.equal(pages["en/retrograde"].prev, null);
  assert.deepEqual(pages["en/station"].prev, { slug: "retrograde", title: "Retrograde" });
  assert.deepEqual(pages["fr/station"].next, { slug: "ingres", title: "Ingrès" });
  assert.deepEqual(pages["en/eclipse"].next, { slug: "void-of-course", title: "Void of course" });
  assert.equal(pages["en/season"].next, null);
});

/* ------------------------------------------------------------ the Vite plugin */

test("the plugin hands each piece as its own module, pages through their tradition's list", () => {
  const plugin = encyclopediaPlugin();
  plugin.configResolved({ root: ROOT });
  const load = (path) => plugin.load(`\0virtual:ulune-encyclopedia/${path}`);
  assert.equal(plugin.resolveId("virtual:ulune-encyclopedia/index"), "\0virtual:ulune-encyclopedia/index");
  assert.equal(plugin.resolveId("react"), null);
  const loaders = load("loaders");
  assert.match(loaders, /export const pages = \{\n {2}"en\/astrology": \(\) => import\("virtual:ulune-encyclopedia\/pages\/en\/astrology"\),/);
  for (const kind of ["cards", "search", "homes", "traditions"]) assert.match(loaders, new RegExp(`export const ${kind} = \\{`));
  // Every module a list names is one the plugin makes.
  const pages = load("pages/fr/astrology");
  const named = [...pages.matchAll(/import\("virtual:ulune-encyclopedia\/([^"]+)"\)/g)].map((m) => m[1]);
  const astrology = Object.keys(real.data.pages).filter((k) => k.startsWith("fr/") && real.data.index.terms[k.slice(3)][0] === "astrology");
  assert.deepEqual(named.sort(), astrology.map((k) => `page/${k}`).sort());
  assert.ok(named.includes("page/fr/station") && !named.some((p) => p.startsWith("page/en/")));
  for (const path of named) assert.match(load(path), /^export default JSON\.parse\(/);
  const page = JSON.parse(JSON.parse(/JSON\.parse\((.*)\);/.exec(load("page/fr/station"))[1]));
  assert.equal(page.title, "Station");
  assert.throws(() => load("page/fr/hd-gate"), /No encyclopedia module/);
  assert.equal(plugin.load("/src/other.ts"), null);
});

test("a mistake in an entry stops a production build, with its file and line", () => {
  const dir = mkdtempSync(join(tmpdir(), "ulune-enc-"));
  try {
    mkdirSync(join(dir, "content/encyclopedia/astrology"), { recursive: true });
    for (const f of pair("alpha", { summary: { en: "No full stop" } })) writeFileSync(join(dir, "content/encyclopedia", f.path), f.text);
    const plugin = encyclopediaPlugin();
    plugin.configResolved({ root: dir });
    const said = [];
    const context = (mode) => ({ environment: { mode }, error: (m) => said.push(["error", m]), warn: (m) => said.push(["warn", m]) });
    plugin.buildStart.call(context("build"));
    assert.equal(said[0][0], "error");
    assert.match(said[0][1], /content\/encyclopedia\/astrology\/alpha\.en\.md:10: the summary is one sentence ending with a full stop/);
    // The dev server says it, and goes on serving the rest of the site.
    plugin.buildStart.call(context("dev"));
    assert.equal(said[1][0], "warn");
    assert.throws(() => plugin.load("\0virtual:ulune-encyclopedia/index"), /1 mistake/);
    // A warning is said with its file and line, and the build goes on.
    const twice = { en: "## Meaning\n\n[[beta]] and [[beta]].", fr: "## Sens\n\n[[beta]]." };
    for (const f of [...pair("alpha", { page: true, body: twice }), ...pair("beta")]) writeFileSync(join(dir, "content/encyclopedia", f.path), f.text);
    const warned = encyclopediaPlugin();
    warned.configResolved({ root: dir });
    said.length = 0;
    warned.buildStart.call(context("build"));
    assert.deepEqual(said.map(([kind]) => kind), ["warn"]);
    assert.match(said[0][1], /1 warning\(s\):\ncontent\/encyclopedia\/astrology\/alpha\.en\.md:16: \[\[beta\]\] is linked twice in one paragraph/);
    assert.match(warned.load("\0virtual:ulune-encyclopedia/index"), /^export default JSON\.parse/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/* ------------------------------------------------------------ search */

const engines = { en: prepare(real.data.search.en), fr: prepare(real.data.search.fr) };
const first = (lang, q) => search(engines[lang], q)[0]?.id;
const ids = (lang, q) => search(engines[lang], q).map((h) => h.id);

test("folding and words: accents, ligatures, glyphs, hyphens", () => {
  assert.equal(fold("Éclipse Œuvre"), "eclipse oeuvre");
  assert.deepEqual(tokens("l’Ascendant, ℞︎ ♄ 11:11"), ["l", "ascendant", "℞", "♄", "11", "11"]);
  assert.ok(keyTokens("Semi-sextile").includes("semisextile"));
  assert.deepEqual(queryWords("la Lune de course"), ["lune", "course"]);
  assert.deepEqual(queryWords("le"), ["le"]);
  assert.ok(oneEdit("eclpise", "eclipse") && oneEdit("retrograd", "retrograde") && oneEdit("synatsry", "synastry"));
  assert.ok(!oneEdit("station", "sextile") && !oneEdit("abcd", "dcba"));
});

test("search: names in either language, accents optional, one typo, glyphs", () => {
  assert.equal(first("en", "Eclipse"), "eclipse");
  assert.equal(first("fr", "eclipse"), "eclipse");
  assert.equal(first("fr", "éclipse"), "eclipse");
  assert.equal(first("en", "retrogarde"), "retrograde");
  assert.equal(first("en", "eclpise"), "eclipse");
  assert.equal(first("en", "℞"), "retrograde");
  assert.equal(first("fr", "℞︎"), "retrograde");
  // The other language's name finds the entry, shown in the page's language.
  assert.equal(first("en", "chemin de vie"), "life-path");
  assert.equal(search(engines.en, "chemin de vie")[0].title, "Life Path");
  assert.equal(first("fr", "life path"), "life-path");
  assert.equal(search(engines.fr, "life path")[0].title, "Chemin de vie");
  // As letters are typed.
  assert.equal(first("en", "synas"), "synastry");
  assert.equal(first("fr", "lune vide"), "void-of-course");
  // Aliases, and numbers.
  assert.equal(first("en", "exile"), "detriment");
  assert.ok(ids("en", "22").includes("master-numbers"));
  assert.deepEqual(search(engines.en, "zzqx"), []);
});

test("search: phrases, whole first, then their parts; grouped by tradition with summaries", () => {
  assert.equal(first("fr", "lune vide de course"), "void-of-course");
  const parts = search(engines.en, "station eclipse");
  assert.deepEqual(parts.slice(0, 2).map((h) => h.id).sort(), ["eclipse", "station"]);
  assert.ok(parts.every((h) => !h.full || h.id === "eclipse" || h.id === "station"));
  const mixed = search(engines.en, "line");
  const groups = byTradition(mixed);
  assert.equal(groups[0].tradition, "human-design");
  assert.ok(groups.every((g) => g.hits.every((h) => h.tradition === g.tradition)));
  assert.ok(mixed[0].summary.length > 20);
  // An entry with no page is found too, with no address.
  const card = search(engines.en, "gate")[0];
  assert.equal(card.id, "hd-gate");
  assert.equal(card.slug, null);
});

/* ------------------------------------------------------------ heads, sitemap, boot */

test("an entry's head: title, summary, own address, its twin, a DefinedTerm", () => {
  const head = entryHead(real.data.pages["fr/eclipse"]);
  const meta = (k, v) => head.meta.find((m) => m[k] === v);
  assert.equal(head.meta[0].title, "Éclipse · Encyclopédie · Ulune");
  assert.equal(meta("name", "description").content, real.data.pages["fr/eclipse"].summary);
  assert.deepEqual(
    head.links.map((l) => [l.rel, l.hrefLang ?? "", l.href]),
    [
      ["canonical", "", "https://ulune.app/encyclopedie/eclipse"],
      ["alternate", "en", "https://ulune.app/encyclopedia/eclipse"],
      ["alternate", "fr", "https://ulune.app/encyclopedie/eclipse"],
      ["alternate", "x-default", "https://ulune.app/encyclopedia/eclipse"],
    ],
  );
  const data = JSON.parse(head.scripts[0].children);
  assert.equal(data["@type"], "DefinedTerm");
  assert.equal(data.name, "Éclipse");
  assert.equal(data.inLanguage, "fr");
  assert.equal(data.url, "https://ulune.app/encyclopedie/eclipse");
  assert.match(data.license, /by-nc-sa\/4\.0/);
  assert.doesNotMatch(head.scripts[0].children, /</);
  assert.equal(homeHead("en").meta[0].title, "Encyclopedia · Ulune");
  const astro = traditionHead(real.data.traditionHomes["fr/astrology"]);
  assert.equal(astro.links[0].href, "https://ulune.app/encyclopedie/astrologie");
  assert.equal(astro.links[1].href, "https://ulune.app/encyclopedia/astrology");
});

test("the sitemap: the app's public pages, then every encyclopedia page in both languages, each with its twin", () => {
  const { index } = real.data;
  const paths = sitemapPaths(index);
  assert.equal(new Set(paths).size, paths.length, "no address twice");
  for (const p of INDEXED_PAGES) assert.ok(paths.includes(p), `${p} is listed`);
  for (const id of ["retrograde", "station", "eclipse"]) {
    assert.ok(paths.includes(`/encyclopedia/${index.terms[id][2]}`) && paths.includes(`/encyclopedie/${index.terms[id][3]}`), id);
  }
  // No entry without a page, and the homes INDEXED_PAGES names are those the index has.
  assert.ok(!paths.includes("/encyclopedia/gate") && paths.includes("/encyclopedia/decan"));
  const homes = encyclopediaPairs(index).slice(0, 1 + index.traditions.filter((t) => t.count > 0).length).flatMap((p) => [p.en, p.fr]);
  assert.deepEqual(INDEXED_PAGES.filter((p) => p.startsWith("/encycloped")), homes);
  const xml = sitemapXml(index);
  assert.match(xml, /<loc>https:\/\/ulune\.app\/encyclopedie\/eclipse<\/loc><xhtml:link rel="alternate" hreflang="en" href="https:\/\/ulune\.app\/encyclopedia\/eclipse"\/>/);
  assert.equal((xml.match(/<loc>/g) ?? []).length, paths.length);
});

test("the reader's link mark is set before the page paints", () => {
  const attrs = new Map();
  const root = { classList: { contains: () => false }, style: { cssText: "" }, setAttribute: (k, v) => attrs.set(k, v) };
  const document = { documentElement: root, head: { appendChild() {} }, createElement: () => ({}) };
  const store = (v) => ({ getItem: (k) => (k === "ulune.term-links" ? v : null) });
  new Function("document", "localStorage", bootScript({}))(document, store("underline"));
  assert.equal(attrs.get("data-term-links"), "underline");
  attrs.clear();
  new Function("document", "localStorage", bootScript({}))(document, store("nonsense"));
  assert.equal(attrs.has("data-term-links"), false);
});

test("the encyclopedia's words: both languages, French typography, every one used, none in the app's catalog", () => {
  for (const [key, [en, fr]] of Object.entries(encyclopedia)) {
    assert.ok(en.trim() && fr.trim(), `${key}: a language is missing`);
    assert.ok(!/\w'\w/.test(en) && !/\w'\w/.test(fr), `${key}: a straight apostrophe`);
    assert.deepEqual(frenchProblems(fr.replace(/\{\w+\}/g, "x")), [], `${key}: ${fr}`);
    assert.ok(!(key in CATALOG), `${key} is in the app's catalog too`);
  }
  // Each word is said somewhere (as i18n-catalog.test.mjs asks of the app's).
  const files = readdirSync(`${ROOT}src`, { recursive: true }).filter((f) => /\.(ts|tsx)$/.test(f) && !f.endsWith("catalog/encyclopedia.ts"));
  const corpus = files.map((f) => readFileSync(`${ROOT}src/${f}`, "utf8")).join("\n");
  const unused = Object.keys(encyclopedia).filter((key) => !new RegExp(`["'\`]${key}["'\`]`).test(corpus));
  assert.deepEqual(unused, []);
  // The palette's own change stays a few lines.
  assert.match(readFileSync(`${ROOT}src/studio/shell/CommandPaletteDialog.tsx`, "utf8"), /useEncyclopediaCommands\(q, locale\)/);
});

test("every entry the studio links by id (tables, panels) exists", async () => {
  const { allTermIds, termId } = await import("../src/encyclopedia/term-ids.ts");
  const missing = allTermIds().filter((id) => !real.data.index.terms[id]);
  assert.deepEqual(missing, []);
  assert.equal(termId("body", "ic"), "imum-coeli");
  assert.equal(termId("house", 10), "house-10");
  assert.equal(termId("house", 13), null);
  assert.equal(termId("aspect", "semisextile"), "semi-sextile");
  assert.equal(termId("body", "antivertex"), null, "no entry: the word stays plain");
});
