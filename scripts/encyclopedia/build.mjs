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
 * One rule only warns, with its file and line, and never stops a build: a
 * term links once per paragraph or list item (its first mention); a table may
 * link it in every cell (encyclopedia plan, "The rules that keep it calm").
 * Writers who link a term once per whole list or table pass it too.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fold, keyTokens, STOPWORDS, tokens } from "../../src/encyclopedia/normalize.ts";
import { buildLexicon } from "./lexicon.mjs";
import { combinationFiles } from "./combinations.mjs";
import { parseEntry } from "./parse.mjs";
import { FAMILIES, ID_RE, KINDS, LANGS, REQUIRED_KEYS, SECTIONS, SUMMARY_MAX, TRADITIONS } from "./registry.mjs";

export const CONTENT_DIR = "content/encyclopedia";
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
    const m = /^([a-z0-9]+(?:-[a-z0-9]+)*)\.(en|fr)\.md$/.exec(name);
    if (!m) {
      report(1, `entries are named <id>.<lang>.md, with a lowercase id and lang en or fr (found "${name}")`);
      continue;
    }
    const [, id, lang] = m;
    const parsed = parseEntry(text, file, errors);
    checkMeta(parsed, { id, lang, tradition: folder }, report);
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
    for (const key of ["family", "kind", "page", "glyph", "related"]) {
      const a = JSON.stringify(pair.en.meta[key] ?? null);
      const b = JSON.stringify(pair.fr.meta[key] ?? null);
      if (a !== b) {
        errors.push({ file: pair.fr.file, line: pair.fr.metaLines[key] ?? 1, message: `\`${key}\` differs from the English file (${a} there, ${b} here): both languages share it` });
      }
    }
  }

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
        else if (!byId.has(r)) errors.push({ file: e.file, line, message: `related: no entry has the id "${r}"` });
        if (seen.has(r)) errors.push({ file: e.file, line, message: `related: "${r}" is listed twice` });
        seen.add(r);
      }
      for (const section of e.sections) {
        for (const block of section.blocks) {
          for (const group of inlineGroups(block)) {
            const once = new Set();
            eachLink(group.nodes, (link) => {
              if (link.l === id) errors.push({ file: e.file, line: link.line, message: `[[${link.l}]]: a page does not link to itself` });
              else if (!byId.has(link.l)) errors.push({ file: e.file, line: link.line, message: `[[${link.l}]]: no entry has this id` });
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
    const lines = e.raw.replace(/\r\n?/g, "\n").split("\n");
    for (let i = e.bodyStart - 1; i < lines.length; i += 1) {
      const line = lines[i];
      if (/^\s*#/.test(line) || /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(line)) continue;
      for (const p of frenchProblems(visibleLine(line))) errors.push({ file: e.file, line: i + 1, message: p });
    }
  }

  if (errors.length) return { errors, warnings, data: null };
  return { errors, warnings, data: assemble(byId) };
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

function assemble(byId) {
  const entries = [...byId.values()].map((pair) => ({
    id: pair.en.id,
    tradition: pair.en.tradition,
    family: pair.en.meta.family,
    kind: pair.en.meta.kind,
    page: pair.en.meta.page === true,
    glyph: pair.en.meta.glyph ?? "",
    related: pair.en.meta.related ?? [],
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
      families: FAMILIES[t.id].map((f) => ({ id: f.id, name: f.name })),
      count: own.length,
      pages: own.filter((e) => e.page).length,
    };
  });

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
      cards[`${lang}/${t.id}`] = Object.fromEntries(
        entries.filter((e) => e.tradition === t.id).map((e) => [e.id, [title(e, lang), e[lang].meta.summary]]),
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
        });
      }
      if (families.length) {
        traditionHomes[`${lang}/${t.id}`] = {
          lang,
          id: t.id,
          name: tradName,
          intro: t.intro[lang],
          home: t.home[lang],
          twinHome: t.home[other],
          families,
        };
      }
    }

    search[lang] = {
      lang,
      docs: entries.map((e) => {
        const m = e[lang].meta;
        const names = keyTokens(`${m.title} ${e.glyph}`);
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
        .filter((t) => t.count > 0)
        .map((t) => ({ id: t.id, name: t.name[lang], intro: t.intro[lang], home: t.home[lang], count: t.count, pages: t.pages })),
      az,
    };
  }

  // The words a reading's text may link, by language and tradition (part 16).
  const lexicon = Object.fromEntries(LANGS.map((lang) => [lang, buildLexicon(entries, lang)]));
  return { index, pages, cards, search, homes, traditionHomes, lexicon };

  function listRow(e, lang) {
    return [e.id, title(e, lang), e.glyph, e[lang].meta.summary, e.page ? slug(e, lang) : ""];
  }
}
