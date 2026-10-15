/*
 * The encyclopedia's build (encyclopedia plan, part 1): reads every entry in
 * content/encyclopedia/<tradition>/<id>.<lang>.md, checks it, and makes what
 * the site loads one piece at a time (src/encyclopedia/types.ts):
 *   - the term index: every entry's tradition, family and addresses;
 *   - each page, in each language;
 *   - the card texts of each tradition in each language;
 *   - the search index of each language;
 *   - the encyclopedia's home and each tradition's home, in each language.
 * The dev server and the production build run it through a Vite plugin
 * (vite-plugin.mjs), the unit tests directly (scripts/encyclopedia.test.mjs).
 *
 * The checks fail loudly, each with the file and the line: both languages
 * exist; the front matter's keys and values are valid; the summary is one
 * sentence of at most 160 characters; the headings come from the fixed list,
 * in order; every [[link]] and related id names an entry, never the page
 * itself; addresses are unique in each language and never a tradition's home;
 * the French texts have their narrow no-break spaces before : ; ! ? and inside
 * « », and typographic apostrophes.
 *
 * The Chinese pages (part 23, chinese.mjs): an entry of a Chinese tradition
 * is a term of the writers' manifest (content/encyclopedia/chinese-manifest.json),
 * in its family and at its address there; its Chinese name (hant, hans,
 * pinyin) is the engine's when the engine has one, Han characters only, one
 * toned syllable per character, and the same in both languages. A
 * tradition's home text (<tradition>/_home.<lang>.md, its introduction)
 * exists in both languages and links only what exists; a tradition has a
 * home once it has an entry or its introduction, and [[bazi]] in any text
 * links that home. The Chinese pages are written family by family, so a link
 * or a related id may name a term of the manifest not written yet: it reads
 * as plain words, and stays out of the related list, until its entry exists
 * (never a dead link); any other unknown id is a mistake.
 *
 * One rule only warns, with its file and line, and never stops a build: a
 * term links once per paragraph or list item (its first mention); a table may
 * link it in every cell (encyclopedia plan, "The rules that keep it calm").
 * Writers who link a term once per whole list or table pass it too.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fold, keyTokens, STOPWORDS, tokens } from "../../src/encyclopedia/normalize.ts";
import { buildLexicon } from "./lexicon.mjs";
import { combinationFiles } from "./combinations.mjs";
import { figureFor } from "./figures.mjs";
import { parseEntry, parseHome } from "./parse.mjs";
import { CHINESE_KEYS, FAMILIES, ID_RE, KINDS, LANGS, REQUIRED_KEYS, SECTIONS, SUMMARY_MAX, TRADITIONS } from "./registry.mjs";
import { CHINESE_TRADITIONS, MANIFEST_FILE, checkChineseName, manifestEntries, toneless } from "./chinese.mjs";

export const CONTENT_DIR = "content/encyclopedia";
/** The repository, for the figures' numbers (src/lib/chart). */
const REPO = resolve(fileURLToPath(import.meta.url), "..", "..", "..");

/** Astrology's families whose titles are common nouns, shown in small letters inside a sentence. */
const COMMON_FAMILIES = new Set(["aspects", "dignities", "techniques", "coordinates", "cycles", "elements", "patterns", "houses"]);
/** content/encyclopedia/combinations: the openings of the combination pages (combinations.mjs). */
export const COMBINATIONS_DIR = "combinations";

/**
 * Every file under a tradition's folder, as `{ path: "astrology/saturn.en.md", text }`. Files at the top (LICENSE) are not entries.
 * The combinations folder gives the combination pages, made (their missing openings as `files.combinationWarnings`).
 */
export function readContent(dir) {
  const files = [];
  let folders;
  try {
    folders = readdirSync(dir).sort();
  } catch {
    return files;
  }
  for (const folder of folders) {
    const path = join(dir, folder);
    if (!statSync(path).isDirectory()) continue;
    // The combination pages are made from the readings' texts and their openings (part 17).
    if (folder === COMBINATIONS_DIR) {
      const made = combinationFiles(dir);
      files.push(...made.files);
      files.combinationWarnings = made.warnings;
      continue;
    }
    for (const name of readdirSync(path).sort()) {
      if (name.startsWith(".")) continue;
      const file = join(path, name);
      if (statSync(file).isDirectory()) {
        files.push({ path: `${folder}/${name}`, text: null });
        continue;
      }
      files.push({ path: `${folder}/${name}`, text: readFileSync(file, "utf8") });
    }
  }
  return files;
}

/** One line per mistake or warning: `content/encyclopedia/astrology/saturn.fr.md:12: …`. */
export function formatErrors(errors) {
  return errors.map((e) => `${e.file}:${e.line}: ${e.message}`).join("\n");
}

const TRADITION = new Map(TRADITIONS.map((t) => [t.id, t]));
/** The traditions whose entries are the manifest's Chinese terms (part 23). */
const CHINESE = new Set(CHINESE_TRADITIONS.map((t) => t.id));
const HOME_SLUGS = { en: new Set(TRADITIONS.map((t) => t.home.en)), fr: new Set(TRADITIONS.map((t) => t.home.fr)) };

/** Problems with a French text: narrow no-break spaces, apostrophes, quotes. */
export function frenchProblems(text) {
  const out = [];
  for (const m of text.matchAll(/(?<![\u202f\d])([:;!?])(?=[\s)\]»”.,]|$)/gu)) {
    out.push(`"${m[1]}" needs a narrow no-break space (U+202F) before it: "${text.slice(Math.max(0, m.index - 20), m.index + 1)}"`);
  }
  for (const m of text.matchAll(/«(?!\u202f)/gu)) out.push(`"«" needs a narrow no-break space (U+202F) after it: "${text.slice(m.index, m.index + 20)}"`);
  for (const m of text.matchAll(/(?<!\u202f)»/gu)) out.push(`"»" needs a narrow no-break space (U+202F) before it: "${text.slice(Math.max(0, m.index - 20), m.index + 1)}"`);
  if (text.includes("'")) out.push(`use the typographic apostrophe ’, not ': "${text.slice(Math.max(0, text.indexOf("'") - 20), text.indexOf("'") + 10)}"`);
  if (text.includes('"')) out.push("use « » with narrow no-break spaces, not \"");
  return out;
}

/** Why a summary is not one sentence of at most 160 characters, or null. */
export function summaryProblem(text) {
  const length = [...text].length;
  if (length > SUMMARY_MAX) return `the summary has ${length} characters; at most ${SUMMARY_MAX}`;
  if (!text.endsWith(".")) return "the summary is one sentence ending with a full stop";
  // "av. J.-C." and "apr. J.-C." end no sentence, though a capital follows their first full stop.
  const plain = text.slice(0, -1).replace(/\b(av|apr)\. J\.-C\./g, "$1 JC.");
  if (/[.!?…](?:\u202f?[»”"])?\s+[«“"]?\u202f?[A-ZÀ-ÖØ-Þ]/u.test(plain)) return "the summary is one sentence, not several";
  return null;
}

const isDate = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
};

/**
 * The words a Chinese name is found by: its characters in both scripts,
 * whole (keyTokens splits them one by one too), and its pinyin with its
 * tones, apart and joined ("hǎizhōng jīn", "haizhongjin").
 */
function chineseKeys(zh) {
  const joined = toneless(zh.pinyin).replace(/[\s-]+/g, "");
  return [zh.hant, zh.hans, zh.pinyin, joined].join(" ");
}

/** The text a reader sees on a body line: links as their words, no ** or *. */
function visibleLine(line) {
  return line
    .replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, "$2")
    .replace(/\[\[([^\]]*)\]\]/g, "X")
    .replace(/\\([\\*[\]|_`#<>!])/g, "$1")
    .replace(/\*+/g, "");
}

/** Walk inline nodes, calling `fn` on every link. */
function eachLink(nodes, fn) {
  for (const n of nodes) {
    if (typeof n === "string") continue;
    if ("l" in n) fn(n);
    else eachLink(n.b ?? n.i, fn);
  }
}

/** Every block's inline groups: a paragraph, each list item, each table cell. */
function inlineGroups(block) {
  if (block.t === "p") return [{ nodes: block.c, perParagraph: true }];
  if (block.t === "ul" || block.t === "ol") return block.items.map((it) => ({ nodes: it.c, perParagraph: true, item: true }));
  return [...block.head, ...block.rows.flatMap((r) => r.cells)].map((nodes) => ({ nodes, perParagraph: false }));
}

/**
 * Build everything from the files (`readContent`). Returns `{ errors,
 * warnings, data }`; `data` is null when there is any error, never because of
 * a warning.
 */
export function buildEncyclopedia(files, { prefix = CONTENT_DIR } = {}) {
  const errors = [];
  const warnings = [...(files.combinationWarnings ?? [])];
  /** id → { en, fr }, each `{ file, meta, metaLines, sections, raw }`. */
  const byId = new Map();
  const where = new Map();
  /** tradition → { en, fr }: each tradition's home text (part 23). */
  const homeTexts = new Map();
  const known = manifestEntries();

  for (const { path, text } of files) {
    const file = `${prefix}/${path}`;
    const report = (line, message) => errors.push({ file, line, message });
    const [folder, name] = path.split("/");
    if (!TRADITION.has(folder)) {
      report(1, `"${folder}" is not a tradition (${TRADITIONS.map((t) => t.id).join(", ")})`);
      continue;
    }
    if (text == null) {
      report(1, "a folder inside a tradition's folder: entries sit directly in it");
      continue;
    }
    const home = /^_home\.(en|fr)\.md$/.exec(name);
    if (home) {
      const parsed = parseHome(text, file, errors);
      const at = (key) => parsed.metaLines[key] ?? 1;
      if (parsed.meta.tradition !== folder) report(at("tradition"), `tradition "${parsed.meta.tradition ?? ""}" is not its folder's ("${folder}")`);
      if (parsed.meta.lang !== home[1]) report(at("lang"), `lang "${parsed.meta.lang ?? ""}" is not the file's ("${home[1]}")`);
      if (!isDate(String(parsed.meta.revised ?? ""))) report(at("revised"), `revised "${parsed.meta.revised ?? ""}": a date written YYYY-MM-DD`);
      if (!homeTexts.has(folder)) homeTexts.set(folder, {});
      homeTexts.get(folder)[home[1]] = { file, lang: home[1], ...parsed, raw: text };
      continue;
    }
    const m = /^([a-z0-9]+(?:-[a-z0-9]+)*)\.(en|fr)\.md$/.exec(name);
    if (!m) {
      report(1, `entries are named <id>.<lang>.md, with a lowercase id and lang en or fr (found "${name}")`);
      continue;
    }
    const [, id, lang] = m;
    const parsed = parseEntry(text, file, errors);
    checkMeta(parsed, { id, lang, tradition: folder }, report);
    checkChinese(parsed, { id, lang, tradition: folder }, known.get(id), report);
    const entry = { file, id, lang, tradition: folder, ...parsed, raw: text };
    const prev = where.get(id);
    if (prev && prev !== folder) report(1, `the id "${id}" is also used in ${prefix}/${prev}`);
    where.set(id, folder);
    if (!byId.has(id)) byId.set(id, {});
    byId.get(id)[lang] = entry;
  }

  // Both languages, and the facts they must share.
  for (const pair of byId.values()) {
    for (const lang of LANGS) {
      const other = LANGS.find((l) => l !== lang);
      if (!pair[lang] && pair[other]) {
        errors.push({ file: pair[other].file, line: 1, message: `no ${lang === "fr" ? "French" : "English"} file: ${pair[other].file.replace(/\.(en|fr)\.md$/, `.${lang}.md`)}` });
      }
    }
    if (!pair.en || !pair.fr) continue;
    for (const key of ["family", "kind", "page", "glyph", "related", ...CHINESE_KEYS]) {
      const a = JSON.stringify(pair.en.meta[key] ?? null);
      const b = JSON.stringify(pair.fr.meta[key] ?? null);
      if (a !== b) {
        errors.push({ file: pair.fr.file, line: pair.fr.metaLines[key] ?? 1, message: `\`${key}\` differs from the English file (${a} there, ${b} here): both languages share it` });
      }
    }
  }

  // A tradition's id is its home's name in a link ([[bazi]]): no entry takes it.
  for (const [id, pair] of byId) {
    const e = pair.en ?? pair.fr;
    if (TRADITION.has(id)) errors.push({ file: e.file, line: e.metaLines.id ?? 1, message: `"${id}" is a tradition's id ([[${id}]] links its home): choose another` });
  }
  // A tradition's home text: in both languages, for a tradition that is one.
  for (const [tradition, pair] of homeTexts) {
    for (const lang of LANGS) {
      const other = LANGS.find((l) => l !== lang);
      if (!pair[lang] && pair[other]) errors.push({ file: pair[other].file, line: 1, message: `no ${lang === "fr" ? "French" : "English"} home text: ${pair[other].file.replace(/\.(en|fr)\.md$/, `.${lang}.md`)}` });
    }
    if (!TRADITION.has(tradition)) homeTexts.delete(tradition);
  }
  /** The traditions with a home ([[bazi]] may link it): those with an entry, or with their introduction written in both languages. */
  const withHome = new Set([...byId.values()].map((pair) => (pair.en ?? pair.fr).tradition));
  for (const [tradition, pair] of homeTexts) if (pair.en && pair.fr) withHome.add(tradition);

  // Addresses: unique in each language, never a tradition's home, never another entry's id.
  for (const lang of LANGS) {
    const seen = new Map();
    for (const [id, pair] of byId) {
      const e = pair[lang];
      const slug = e?.meta.slug;
      if (!e || typeof slug !== "string" || !ID_RE.test(slug)) continue;
      const line = e.metaLines.slug ?? 1;
      if (HOME_SLUGS[lang].has(slug)) errors.push({ file: e.file, line, message: `the slug "${slug}" is a tradition's home address in this language` });
      if (seen.has(slug)) errors.push({ file: e.file, line, message: `the slug "${slug}" is already ${seen.get(slug)}'s in this language` });
      else seen.set(slug, id);
      if (slug !== id && byId.has(slug)) {
        errors.push({ file: e.file, line, message: `the slug "${slug}" is the id of another entry, whose address it would take` });
      }
    }
  }

  // Links and related ids: they name entries, never the page itself; a link once per paragraph (a warning).
  for (const [id, pair] of byId) {
    for (const lang of LANGS) {
      const e = pair[lang];
      if (!e) continue;
      const related = Array.isArray(e.meta.related) ? e.meta.related : [];
      const seen = new Set();
      for (const r of related) {
        const line = e.metaLines.related ?? 1;
        if (!ID_RE.test(r)) errors.push({ file: e.file, line, message: `related: "${r}" is not an id` });
        else if (r === id) errors.push({ file: e.file, line, message: "related: an entry is not related to itself" });
        // A Chinese term of the manifest not written yet (part 23) is listed once it is.
        else if (!byId.has(r) && !known.has(r)) errors.push({ file: e.file, line, message: `related: no entry has the id "${r}"` });
        if (seen.has(r)) errors.push({ file: e.file, line, message: `related: "${r}" is listed twice` });
        seen.add(r);
      }
      for (const section of e.sections) {
        for (const block of section.blocks) {
          for (const group of inlineGroups(block)) {
            const once = new Set();
            eachLink(group.nodes, (link) => {
              if (link.l === id) errors.push({ file: e.file, line: link.line, message: `[[${link.l}]]: a page does not link to itself` });
              else if (!byId.has(link.l)) linkProblem(link, e.file);
              if (group.perParagraph && once.has(link.l)) {
                warnings.push({ file: e.file, line: link.line, message: `[[${link.l}]] is linked twice in one ${group.item ? "list item" : "paragraph"}: link its first mention only` });
              }
              once.add(link.l);
            });
          }
        }
      }
    }
  }

  // A home text's links: entries, or another tradition's home once it has one.
  for (const [tradition, pair] of homeTexts) {
    for (const lang of LANGS) {
      const h = pair[lang];
      if (!h) continue;
      for (const block of h.blocks) {
        for (const group of inlineGroups(block)) {
          eachLink(group.nodes, (link) => {
            if (link.l === tradition) errors.push({ file: h.file, line: link.line, message: `[[${link.l}]]: a home does not link to itself` });
            else if (!byId.has(link.l)) linkProblem(link, h.file);
          });
        }
      }
    }
  }

  /**
   * A link that names no entry: a tradition's home, when it has one, or a
   * Chinese term of the manifest not written yet (part 23), shown as plain
   * words until its entry exists; anything else is a mistake.
   */
  function linkProblem(link, file) {
    const t = TRADITION.get(link.l);
    if (t) {
      if (!withHome.has(t.id)) errors.push({ file, line: link.line, message: `[[${link.l}]]: ${t.name.en} has no home yet (no entry, no introduction) to link` });
    } else if (!known.has(link.l)) errors.push({ file, line: link.line, message: `[[${link.l}]]: no entry has this id` });
  }

  // French typography: the title, the aliases, the summary and the body's text.
  for (const pair of byId.values()) {
    const e = pair.fr;
    if (!e) continue;
    const texts = [
      ["title", e.meta.title],
      ["summary", e.meta.summary],
      ...(Array.isArray(e.meta.aliases) ? e.meta.aliases.map((a) => ["aliases", a]) : []),
    ];
    for (const [key, value] of texts) {
      if (typeof value !== "string") continue;
      for (const p of frenchProblems(value)) errors.push({ file: e.file, line: e.metaLines[key] ?? 1, message: `${key}: ${p}` });
    }
    frenchBody(e);
  }
  for (const pair of homeTexts.values()) if (pair.fr) frenchBody(pair.fr);

  /** A French body's lines, headings and table rules aside. */
  function frenchBody(e) {
    const lines = e.raw.replace(/\r\n?/g, "\n").split("\n");
    for (let i = e.bodyStart - 1; i < lines.length; i += 1) {
      const line = lines[i];
      if (/^\s*#/.test(line) || /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(line)) continue;
      for (const p of frenchProblems(visibleLine(line))) errors.push({ file: e.file, line: i + 1, message: p });
    }
  }

  if (errors.length) return { errors, warnings, data: null };
  return { errors, warnings, data: assemble(byId, homeTexts, known) };
}

/**
 * An entry's Chinese side (part 23): a term of the manifest when its
 * tradition is Chinese, in the family, kind and address the manifest gives
 * it; its Chinese name checked (chinese.mjs).
 */
function checkChinese(parsed, { id, lang, tradition }, row, report) {
  const { meta, metaLines } = parsed;
  const at = (key) => metaLines[key] ?? 1;
  if (CHINESE.has(tradition) && !row) {
    report(at("id"), `"${id}" is not a term of the Chinese traditions (${MANIFEST_FILE} lists them)`);
    return;
  }
  if (row) {
    if (row.tradition !== tradition) report(at("tradition"), `the manifest puts "${id}" in ${row.tradition}, not ${tradition} (${MANIFEST_FILE})`);
    if (meta.family != null && meta.family !== row.family) report(at("family"), `family "${meta.family}": the manifest puts this term in "${row.family}"`);
    if (meta.kind != null && meta.kind !== row.kind) report(at("kind"), `kind "${meta.kind}": the manifest's is "${row.kind}"`);
    if (typeof meta.slug === "string" && meta.slug !== row.slug[lang]) {
      report(at("slug"), `slug "${meta.slug}": the manifest gives this term the address "${row.slug[lang]}" (change it in scripts/encyclopedia/chinese-manifest.mjs if it must differ, before the page is published)`);
    }
  }
  checkChineseName(meta, row, (key, message) => report(at(key), message));
}

/** The front matter of one file, checked against its name and folder. */
function checkMeta(parsed, { id, lang, tradition }, report) {
  const { meta, metaLines, sections } = parsed;
  const at = (key) => metaLines[key] ?? 1;
  for (const key of REQUIRED_KEYS) if (meta[key] == null || meta[key] === "") report(1, `\`${key}\` is missing`);
  if (meta.id != null && meta.id !== id) report(at("id"), `id "${meta.id}" is not the file's name ("${id}")`);
  if (meta.lang != null && meta.lang !== lang) report(at("lang"), `lang "${meta.lang}" is not the file's ("${lang}")`);
  if (meta.tradition != null && meta.tradition !== tradition) report(at("tradition"), `tradition "${meta.tradition}" is not its folder's ("${tradition}")`);
  if (typeof meta.slug === "string" && meta.slug && !ID_RE.test(meta.slug)) {
    report(at("slug"), `slug "${meta.slug}": lowercase ASCII words joined by hyphens, accents removed`);
  }
  if (typeof meta.title === "string" && /\[\[|\*|`|<[A-Za-z/]/.test(meta.title)) report(at("title"), "the title is plain text");
  if (meta.family != null) {
    const families = FAMILIES[tradition] ?? [];
    if (!families.some((f) => f.id === meta.family)) {
      report(at("family"), `family "${meta.family}" is not one of ${tradition}'s: ${families.map((f) => f.id).join(", ")}`);
    }
  }
  if (meta.kind != null && !KINDS.includes(meta.kind)) report(at("kind"), `kind "${meta.kind}": one of ${KINDS.join(", ")}`);
  if (meta.page != null) {
    if (meta.page !== "true" && meta.page !== "false") report(at("page"), `page "${meta.page}": true or false`);
    else meta.page = meta.page === "true";
  }
  if (meta.page === true && !sections.length) report(at("page"), "page: true, but the body has no section: write the page, or set page: false");
  if (typeof meta.summary === "string" && meta.summary) {
    const problem = summaryProblem(meta.summary);
    if (problem) report(at("summary"), problem);
  }
  if (meta.glyph === "") delete meta.glyph;
  if (meta.glyph != null && (typeof meta.glyph !== "string" || [...meta.glyph].length > 8)) report(at("glyph"), "a glyph is a few characters at most");
  if (meta.revised != null && !isDate(String(meta.revised))) report(at("revised"), `revised "${meta.revised}": a date written YYYY-MM-DD`);
  for (const key of ["aliases", "sources"]) {
    const list = meta[key];
    if (list == null || list === "") {
      if (list === "") meta[key] = [];
      continue;
    }
    if (!Array.isArray(list)) continue;
    if (new Set(list).size !== list.length) report(at(key), `${key}: an item is listed twice`);
  }
  // No related entries is an empty list, however it is written.
  if (meta.related == null || meta.related === "") meta.related = [];
}

/* ------------------------------------------------------------------ the outputs */

function assemble(byId, homeTexts = new Map(), known = new Map()) {
  const entries = [...byId.values()].map((pair) => ({
    id: pair.en.id,
    tradition: pair.en.tradition,
    family: pair.en.meta.family,
    kind: pair.en.meta.kind,
    page: pair.en.meta.page === true,
    glyph: pair.en.meta.glyph ?? "",
    // A Chinese term not written yet (part 23) joins the list once it is.
    related: (pair.en.meta.related ?? []).filter((r) => byId.has(r)),
    // Its Chinese name (part 23): the same in both languages (checked above).
    zh: pair.en.meta.hant ? { hant: pair.en.meta.hant, hans: pair.en.meta.hans, pinyin: pair.en.meta.pinyin } : null,
    en: pair.en,
    fr: pair.fr,
  }));
  const entry = new Map(entries.map((e) => [e.id, e]));
  const title = (e, lang) => e[lang].meta.title;
  const slug = (e, lang) => e[lang].meta.slug;

  /** A family's entries in their order: the registry's first, the others by English title. */
  const ordered = (tradition, family) => {
    const order = FAMILIES[tradition].find((f) => f.id === family)?.order ?? [];
    const rank = (e) => {
      const i = order.indexOf(e.id);
      return i < 0 ? order.length : i;
    };
    return entries
      .filter((e) => e.tradition === tradition && e.family === family)
      .sort((a, b) => rank(a) - rank(b) || title(a, "en").localeCompare(title(b, "en"), "en"));
  };

  const traditions = TRADITIONS.map((t) => {
    const own = entries.filter((e) => e.tradition === t.id);
    return {
      id: t.id,
      name: t.name,
      home: t.home,
      intro: t.intro,
      ...(t.zh ? { zh: t.zh } : {}),
      families: FAMILIES[t.id].map((f) => ({ id: f.id, name: f.name })),
      count: own.length,
      pages: own.filter((e) => e.page).length,
      // Its introduction is written (part 23): its home exists before its first entry.
      ...(homeTexts.get(t.id)?.en && homeTexts.get(t.id)?.fr ? { about: 1 } : {}),
    };
  });
  const tradition = new Map(traditions.map((t) => [t.id, t]));

  const index = { traditions, terms: {} };
  for (const e of entries) index.terms[e.id] = [e.tradition, e.family, slug(e, "en"), slug(e, "fr"), e.page ? 1 : 0, e.glyph];

  const ref = (e, lang) => ({
    id: e.id,
    title: title(e, lang),
    glyph: e.glyph,
    summary: e[lang].meta.summary,
    slug: e.page ? slug(e, lang) : null,
    tradition: e.tradition,
  });

  // A bare [[id]] shows the entry's title; inside a sentence, a common noun's title ("Fall", "Grand trine",
  // "Maison X") shows in small letters ("its fall", "a grand trine", "en maison X"), a name never.
  const proper = new Set(entries.filter((e) => e.tradition === "astrology" && (e.family === "planets" || e.family === "signs")).flatMap((e) => [title(e, "en"), title(e, "fr")]));
  const shown = (target, lang, before) => {
    const t = title(target, lang);
    const inSentence = typeof before === "string" && before !== "" && !/[.!?]\s*$/.test(before);
    if (!inSentence || target.tradition !== "astrology" || !COMMON_FAMILIES.has(target.family) || proper.has(t.split(/\s/)[0])) return t;
    return t.charAt(0).toLowerCase() + t.slice(1);
  };
  const inline = (nodes, lang) =>
    nodes.map((n, i) => {
      if (typeof n === "string") return n;
      if ("b" in n) return { b: inline(n.b, lang) };
      if ("i" in n) return { i: inline(n.i, lang) };
      const target = entry.get(n.l);
      if (!target) {
        // A tradition's home (part 23): [[bazi]], by its name.
        const t = tradition.get(n.l);
        if (t) return { l: n.l, w: n.w ?? t.name[lang], s: t.home[lang], g: t.id, h: 1 };
        // A Chinese term not written yet: its words, plain, until its entry exists.
        return n.w ?? known.get(n.l).title[lang];
      }
      return { l: n.l, w: n.w ?? shown(target, lang, nodes[i - 1]), s: target.page ? slug(target, lang) : null, g: target.tradition };
    });
  const block = (b, lang) => {
    if (b.t === "p") return { t: "p", c: inline(b.c, lang) };
    if (b.t === "ul") return { t: "ul", items: b.items.map((it) => inline(it.c, lang)) };
    if (b.t === "ol") return { t: "ol", start: b.start, items: b.items.map((it) => inline(it.c, lang)) };
    return {
      t: "table",
      align: b.align,
      head: b.head.map((c) => inline(c, lang)),
      rows: b.rows.map((r) => r.cells.map((c) => inline(c, lang))),
    };
  };

  const pages = {};
  const cards = {};
  const search = {};
  const homes = {};
  const traditionHomes = {};
  for (const lang of LANGS) {
    const other = lang === "en" ? "fr" : "en";
    for (const t of TRADITIONS) {
      const tradName = t.name[lang];
      // A Chinese term's card names its pinyin too (part 23).
      cards[`${lang}/${t.id}`] = Object.fromEntries(
        entries.filter((e) => e.tradition === t.id).map((e) => [e.id, e.zh ? [title(e, lang), e[lang].meta.summary, e.zh.pinyin] : [title(e, lang), e[lang].meta.summary]]),
      );
      const families = [];
      for (const f of FAMILIES[t.id]) {
        const list = ordered(t.id, f.id);
        // Combination families are a short list of names on the home (part 17), not cards with summaries.
        const compact = list.length > 0 && list.every((e) => e.kind === "combination");
        if (list.length) families.push({ id: f.id, name: f.name[lang], ...(compact ? { compact: true } : {}), rows: list.map((e) => (compact ? [e.id, title(e, lang), e.glyph, "", slug(e, lang)] : listRow(e, lang))) });
        const withPage = list.filter((e) => e.page);
        withPage.forEach((e, i) => {
          const m = e[lang].meta;
          const near = (n) => (n ? { slug: slug(n, lang), title: title(n, lang) } : null);
          pages[`${lang}/${e.id}`] = {
            id: e.id,
            lang,
            slug: m.slug,
            title: m.title,
            glyph: e.glyph,
            ...(e.zh ? { zh: e.zh } : {}),
            aliases: m.aliases ?? [],
            summary: m.summary,
            kind: m.kind,
            tradition: { id: t.id, name: tradName, home: t.home[lang] },
            family: { id: f.id, name: f.name[lang] },
            twin: { lang: other, slug: slug(e, other), title: title(e, other) },
            sections: e[lang].sections.map((s) => ({
              key: s.key,
              h: SECTIONS.find((x) => x.key === s.key)[lang],
              blocks: s.blocks.map((b) => block(b, lang)),
            })),
            related: e.related.map((r) => ref(entry.get(r), lang)),
            sources: m.sources ?? [],
            revised: String(m.revised),
            prev: near(withPage[i - 1]),
            next: near(withPage[i + 1]),
          };
          // Its figure, drawn from the charts' own numbers (part 19).
          const figure = figureFor(e, lang, m.title, REPO);
          if (figure) pages[`${lang}/${e.id}`].figure = figure;
        });
      }
      const about = homeTexts.get(t.id)?.[lang];
      if (families.length || about) {
        traditionHomes[`${lang}/${t.id}`] = {
          lang,
          id: t.id,
          name: tradName,
          intro: t.intro[lang],
          home: t.home[lang],
          twinHome: t.home[other],
          ...(t.zh ? { zh: t.zh } : {}),
          // Its written home text (part 23): what the tradition is, with its links, and the sources it draws on.
          ...(about ? { about: about.blocks.map((b) => block(b, lang)) } : {}),
          ...(Array.isArray(about?.meta.sources) && about.meta.sources.length ? { sources: about.meta.sources } : {}),
          families,
        };
      }
    }

    search[lang] = {
      lang,
      docs: entries.map((e) => {
        const m = e[lang].meta;
        // A Chinese term is found by its characters, in either script, one by one too, and by its pinyin with or without tones (part 23).
        const names = keyTokens(`${m.title} ${e.glyph}${e.zh ? ` ${chineseKeys(e.zh)}` : ""}`);
        const others = keyTokens([e[other].meta.title, ...(e.en.meta.aliases ?? []), ...(e.fr.meta.aliases ?? [])].join(" ")).filter(
          (k) => !names.includes(k),
        );
        // A combination is found by its names ("moon scorpio"), not by its summary's words, which would crowd every search.
        const words = e.kind === "combination" ? [] : [...new Set(tokens(m.summary))].filter((w) => w.length >= 3 && !STOPWORDS.has(w) && !names.includes(w));
        const doc = [e.id, m.title, m.summary, e.glyph, e.tradition, e.family, e.page ? m.slug : "", names.join(" "), others.join(" "), words.join(" ")];
        return e.kind === "combination" ? [...doc, 1] : doc;
      }),
    };

    const collator = new Intl.Collator(lang, { sensitivity: "base", numeric: true });
    const sorted = [...entries].sort((a, b) => collator.compare(title(a, lang), title(b, lang)));
    const az = [];
    // The A–Z lists the core entries; the combinations are found by search and on their tradition's home.
    for (const e of sorted.filter((x) => x.kind !== "combination")) {
      const first = fold(title(e, lang)).charAt(0).toUpperCase();
      const letter = /^[A-Z]$/.test(first) ? first : "#";
      let group = az.find((g) => g[0] === letter);
      if (!group) {
        group = [letter, []];
        az.push(group);
      }
      group[1].push([...listRow(e, lang), e.tradition]);
    }
    az.sort((a, b) => (a[0] === "#" ? -1 : b[0] === "#" ? 1 : a[0].localeCompare(b[0])));
    homes[lang] = {
      lang,
      traditions: traditions
        .filter((t) => t.count > 0 || t.about)
        .map((t) => ({ id: t.id, name: t.name[lang], intro: t.intro[lang], home: t.home[lang], ...(t.zh ? { zh: t.zh } : {}), count: t.count, pages: t.pages })),
      az,
    };
  }

  // The words a reading's text may link, by language and tradition (part 16).
  const lexicon = Object.fromEntries(LANGS.map((lang) => [lang, buildLexicon(entries, lang, TRADITIONS.map((t) => t.id))]));
  return { index, pages, cards, search, homes, traditionHomes, lexicon };

  function listRow(e, lang) {
    return [e.id, title(e, lang), e.glyph, e[lang].meta.summary, e.page ? slug(e, lang) : ""];
  }
}
