/*
 * The combination pages (encyclopedia plan, part 17; claude/ulune-combinations-plan.md):
 * "Moon in Scorpio", "Venus square Mars", "Mars in the 10th house", "Life
 * Path 7"… Each is assembled at build time from the very texts Ulune's
 * readings show (src/lib/content), so a page and its reading never
 * disagree, with a summary and an opening written for it in
 * content/encyclopedia/combinations/<group>[.<part>].<lang>.md:
 *
 *   moon-in-scorpio:
 *     summary: One sentence for the card, under 160 characters.
 *     opening: One to three sentences: what makes this combination itself.
 *
 * readContent (build.mjs) turns each into an ordinary entry file, so every
 * check of the build applies to them too. A page whose opening is missing
 * is built without it, with a warning.
 *
 * The Chinese combination families (encyclopedia parts 23–26; the writers'
 * guide, section 1) are made the same way from the writers' manifest's rows
 * (content/encyclopedia/chinese-manifest.json), each by its family's maker
 * (CHINESE_MAKERS, at the end): the sixty pillars and the thirty Na Yin
 * (part 25), the 45 pairings of Flying Stars (part 26).
 */
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { readManifest } from "./chinese.mjs";
import { PILLAR_TEXTS, makeNaYin, makePillar } from "./pillars.mjs";

export const PLANETS = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
export const SIGNS = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];
export const MAJOR = ["conjunction", "sextile", "square", "trine", "opposition"];

/** Pairs by aspect that never occur in one chart: Mercury stays within about 28° of the Sun, Venus within about 47°. */
export const IMPOSSIBLE = new Set([
  ...["sextile", "square", "trine", "opposition"].flatMap((x) => [`sun-${x}-mercury`, `sun-${x}-venus`]),
  ...["square", "trine", "opposition"].map((x) => `mercury-${x}-venus`),
]);
export const PLACES = ["lifepath", "expression", "soulurge", "personality", "maturity", "birthday"];
const NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33];

const PLANET = {
  en: { sun: "Sun", moon: "Moon", mercury: "Mercury", venus: "Venus", mars: "Mars", jupiter: "Jupiter", saturn: "Saturn", uranus: "Uranus", neptune: "Neptune", pluto: "Pluto" },
  fr: { sun: "Soleil", moon: "Lune", mercury: "Mercure", venus: "Vénus", mars: "Mars", jupiter: "Jupiter", saturn: "Saturne", uranus: "Uranus", neptune: "Neptune", pluto: "Pluton" },
};
/** "the Sun", « le Soleil »: as the readings write them inside a sentence. */
const THE = {
  en: (p) => (p === "sun" || p === "moon" ? `the ${PLANET.en[p]}` : PLANET.en[p]),
  fr: (p) => (p === "sun" ? "le Soleil" : p === "moon" ? "la Lune" : PLANET.fr[p]),
};
const SIGN = {
  en: { aries: "Aries", taurus: "Taurus", gemini: "Gemini", cancer: "Cancer", leo: "Leo", virgo: "Virgo", libra: "Libra", scorpio: "Scorpio", sagittarius: "Sagittarius", capricorn: "Capricorn", aquarius: "Aquarius", pisces: "Pisces" },
  fr: { aries: "Bélier", taurus: "Taureau", gemini: "Gémeaux", cancer: "Cancer", leo: "Lion", virgo: "Vierge", libra: "Balance", scorpio: "Scorpion", sagittarius: "Sagittaire", capricorn: "Capricorne", aquarius: "Verseau", pisces: "Poissons" },
};
const GLYPH = {
  sun: "☉", moon: "☽", mercury: "☿", venus: "♀", mars: "♂", jupiter: "♃", saturn: "♄", uranus: "♅", neptune: "♆", pluto: "♇",
  aries: "♈", taurus: "♉", gemini: "♊", cancer: "♋", leo: "♌", virgo: "♍", libra: "♎", scorpio: "♏", sagittarius: "♐", capricorn: "♑", aquarius: "♒", pisces: "♓",
  conjunction: "☌", sextile: "⚹", square: "□", trine: "△", opposition: "☍",
};
const ELEMENT = ["fire", "earth", "air", "water"];
const MODALITY = ["cardinal", "fixed", "mutable"];
const ASPECT_WORD = {
  en: { conjunction: "conjunct", sextile: "sextile", square: "square", trine: "trine", opposition: "opposite" },
  fr: { conjunction: "conjoint", sextile: "sextile", square: "carré", trine: "trigone", opposition: "opposé" },
};
const FAMILY_OF = { conjunction: "blend", sextile: "flow", trine: "flow", square: "tension", opposition: "tension" };
const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const ordinal = (n) => `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`;
const PLACE = {
  en: { lifepath: "Life Path", expression: "Expression", soulurge: "Soul Urge", personality: "Personality", maturity: "Maturity", birthday: "Birthday" },
  fr: { lifepath: "Chemin de vie", expression: "Expression", soulurge: "Élan de l’âme", personality: "Personnalité", maturity: "Maturité", birthday: "Jour de naissance" },
};
const PLACE_ENTRY = { lifepath: "life-path", expression: "expression", soulurge: "soul-urge", personality: "personality-number", maturity: "maturity", birthday: "birthday" };
const PLACE_SLUG = { lifepath: "life-path", expression: "expression", soulurge: "soul-urge", personality: "personality", maturity: "maturity", birthday: "birthday" };

export const slugify = (s) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/œ/g, "oe")
    .toLowerCase()
    .replace(/[’']/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Every combination: its id, group and the family it is listed in, by group, in order. */
export function combinationIds() {
  const groups = {
    "planet-in-sign": PLANETS.flatMap((p) => SIGNS.map((s) => `${p}-in-${s}`)),
    "planet-aspect": PLANETS.flatMap((a, i) => PLANETS.slice(i + 1).flatMap((b) => MAJOR.map((x) => `${a}-${x}-${b}`))),
    "planet-in-house": PLANETS.flatMap((p) => Array.from({ length: 12 }, (_, i) => `${p}-in-house-${i + 1}`)),
    "angle-in-sign": ["ascendant", "midheaven"].flatMap((a) => SIGNS.map((s) => `${a}-in-${s}`)),
    "planet-angle": ["ascendant", "midheaven"].flatMap((a) => PLANETS.map((p) => `${p}-and-${a}`)),
    "number-in-place": PLACES.flatMap((pl) => NUMBERS.filter((n) => !(pl === "birthday" && n === 33)).map((n) => `${PLACE_SLUG[pl]}-${n}`)),
  };
  return groups;
}

/** The families the combinations are listed in, per tradition, as the registry adds them. */
export const COMBINATION_FAMILIES = {
  astrology: [
    { id: "in-signs", group: "planet-in-sign", name: { en: "Planets in signs", fr: "Planètes en signe" } },
    { id: "in-aspect", group: "planet-aspect", name: { en: "Planets in aspect", fr: "Planètes en aspect" } },
    { id: "in-houses", group: "planet-in-house", name: { en: "Planets in houses", fr: "Planètes en maison" } },
    { id: "angles-in-signs", group: "angle-in-sign", name: { en: "The Ascendant and the Midheaven by sign", fr: "L’Ascendant et le Milieu du Ciel par signe" } },
    { id: "planets-and-angles", group: "planet-angle", name: { en: "Planets and the angles", fr: "Les planètes et les angles" } },
  ],
  numerology: [{ id: "numbers-in-places", group: "number-in-place", name: { en: "Numbers by position", fr: "Les nombres par position" } }],
};

/** "moon-in-scorpio:\n  summary: …\n  opening: …" → { id: { summary, opening } }, with its revision date. */
export function parseOpenings(text) {
  const out = {};
  let revised = null;
  let id = null;
  for (const raw of text.split("\n")) {
    const line = raw.replace(/\s+$/, "");
    if (!line || line.startsWith("#")) continue;
    const date = /^revised:\s*(\d{4}-\d{2}-\d{2})$/.exec(line);
    if (date) {
      revised = date[1];
      continue;
    }
    const head = /^([a-z0-9-]+):$/.exec(line);
    if (head) {
      id = head[1];
      out[id] = {};
      continue;
    }
    const field = /^ {2}(summary|opening): (.+)$/.exec(line);
    if (field && id) out[id][field[1]] = field[2];
  }
  return { revised, entries: out };
}

/** The texts the readings use, read fresh (a change shows on the next build). */
function texts(root) {
  const require = createRequire(join(root, "package.json"));
  const load = (f) => {
    const path = join(root, "src/lib/content", f);
    delete require.cache[path];
    return require(path);
  };
  return {
    ...load("astro-planet-sign.ts"),
    ...load("astro-aspects.ts"),
    ...load("astro-bodies.ts"),
    ...load("astro-signs-houses.ts"),
    ...load("numerology-places.ts"),
  };
}

const quote = (s) => `"${s.replace(/"/g, "”")}"`;

function entryFile({ id, lang, slug, title, aliases = [], tradition, family, glyph, summary, related, revised, body }) {
  const meta = [
    "---",
    `id: ${id}`,
    `lang: ${lang}`,
    `slug: ${slug}`,
    `title: ${title}`,
    ...(aliases.length ? [`aliases: [${aliases.join(", ")}]`] : []),
    `tradition: ${tradition}`,
    `family: ${family}`,
    "kind: combination",
    "page: true",
    `glyph: ${quote(glyph)}`,
    `summary: ${quote(summary)}`,
    `related: [${related.join(", ")}]`,
    `revised: ${revised}`,
    "---",
    "",
  ];
  return meta.join("\n") + body.join("\n") + "\n";
}

const pick = (bi, lang) => (bi ? bi[lang] : "");

/**
 * The combination entries as files `{ path: "astrology/moon-in-scorpio.en.md", text }`,
 * plus the warnings for missing openings. `dir` is content/encyclopedia.
 */
export function combinationFiles(dir) {
  const root = resolve(dir, "..", "..");
  const files = [];
  const warnings = [];
  if (!existsSync(join(dir, "combinations"))) return { files, warnings };
  const T = texts(root);
  const groups = combinationIds();
  const sec = { en: { meaning: "Meaning", practice: "In practice", corr: "Correspondences" }, fr: { meaning: "Sens", practice: "En pratique", corr: "Correspondances" } };

  for (const lang of ["en", "fr"]) {
    // A group's openings may be split in parts: planet-in-sign.en.md, planet-in-sign.2.en.md…
    const openingsOf = (group) => {
      const out = { revised: null, entries: {} };
      const re = new RegExp(`^${group}(\\.[a-z0-9-]+)?\\.${lang}\\.md$`);
      for (const name of readdirSync(join(dir, "combinations")).sort()) {
        if (!re.test(name)) continue;
        const one = parseOpenings(readFileSync(join(dir, "combinations", name), "utf8"));
        if (one.revised && (!out.revised || one.revised > out.revised)) out.revised = one.revised;
        Object.assign(out.entries, one.entries);
      }
      return out;
    };
    for (const fam of [...COMBINATION_FAMILIES.astrology.map((f) => ({ ...f, tradition: "astrology" })), ...COMBINATION_FAMILIES.numerology.map((f) => ({ ...f, tradition: "numerology" }))]) {
      const { revised, entries } = openingsOf(fam.group);
      for (const id of groups[fam.group]) {
        const o = entries[id] ?? {};
        if (!o.summary || !o.opening) warnings.push({ file: `content/encyclopedia/combinations/${fam.group}.${lang}.md`, line: 1, message: `${id}: no ${!o.summary ? "summary" : "opening"} yet` });
        const made = make(fam.group, id, lang, T);
        if (!made) continue;
        const body = [`## ${sec[lang].meaning}`, "", ...(o.opening ? [o.opening, ""] : []), ...made.meaning.flatMap((p) => [p, ""])];
        if (made.practice?.length) body.push(`## ${sec[lang].practice}`, "", ...made.practice.flatMap((p) => [p, ""]));
        body.push(`## ${sec[lang].corr}`, "", ...made.corr.map((c) => `- ${c}`));
        files.push({
          path: `${fam.tradition}/${id}.${lang}.md`,
          text: entryFile({
            id,
            lang,
            slug: made.slug,
            title: made.title,
            aliases: made.aliases,
            tradition: fam.tradition,
            family: fam.id,
            glyph: made.glyph,
            summary: o.summary ?? `${made.title}.`,
            related: made.related,
            revised: revised ?? "2026-10-08",
            body,
          }),
        });
      }
    }
  }
  // The Chinese combination families (parts 23–26): the manifest's rows, each family's maker below.
  chineseCombinationFiles(dir, root, files, warnings);
  return { files, warnings };

  function make(group, id, lang, T) {
    const fr = lang === "fr";
    if (group === "planet-in-sign") {
      const [p, , s] = id.split("-");
      const si = SIGNS.indexOf(s);
      const text = pick(T.PLANET_IN_SIGN[p]?.[s], lang);
      if (!text) return null;
      const title = fr ? `${PLANET.fr[p]} en ${SIGN.fr[s]}` : `${PLANET.en[p]} in ${SIGN.en[s]}`;
      return {
        title,
        slug: slugify(title),
        aliases: fr ? [] : [`${SIGN.en[s]} ${PLANET.en[p]}`],
        glyph: GLYPH[p] + GLYPH[s],
        related: [p, s, `${p}-in-${SIGNS[(si + 11) % 12]}`, `${p}-in-${SIGNS[(si + 1) % 12]}`],
        meaning: [text],
        corr: [
          `${fr ? "La planète\u202f" : "The planet"}: [[${p}]]`,
          `${fr ? "Le signe\u202f" : "The sign"}: [[${s}]], [[element-${ELEMENT[si % 4]}]], [[modality-${MODALITY[si % 3]}]]`,
          `${fr ? "Le même signe, une autre planète\u202f" : "The same sign, another planet"}: ${PLANETS.filter((x) => x !== p).map((x) => `[[${x}-in-${s}|${fr ? PLANET.fr[x] : PLANET.en[x]}]]`).join(", ")}`,
        ],
      };
    }
    if (group === "planet-aspect") {
      const [a, x, b] = id.split("-");
      const pair = T.PAIR_TEXT[[a, b].sort().join("|")];
      const asp = T.ASPECT_TEXT[x];
      if (!pair || !asp) return null;
      const title = fr ? `${PLANET.fr[a]} ${ASPECT_WORD.fr[x]} ${PLANET.fr[b]}` : `${PLANET.en[a]} ${ASPECT_WORD.en[x]} ${PLANET.en[b]}`;
      return {
        title,
        slug: slugify(title),
        aliases: fr ? [] : [`${PLANET.en[a]} ${x} ${PLANET.en[b]}`].filter((s) => s !== title),
        glyph: GLYPH[a] + GLYPH[x] + GLYPH[b],
        related: [a, b, x, ...MAJOR.filter((y) => y !== x).slice(0, 2).map((y) => `${a}-${y}-${b}`)],
        meaning: [pick(pair.theme, lang), pick(pair[FAMILY_OF[x]], lang)],
        // An aspect no birth chart can hold (Mercury and Venus stay near the Sun) gets no advice for having it.
        practice: IMPOSSIBLE.has(id) ? [] : [pick(asp.inPractice, lang)],
        corr: [
          `${fr ? "Les planètes\u202f" : "The planets"}: [[${a}]], [[${b}]]`,
          `${fr ? "L’aspect\u202f" : "The aspect"}: [[${x}]] (${asp.angle})`,
          `${fr ? "Les mêmes planètes, un autre aspect\u202f" : "The same planets, another aspect"}: ${MAJOR.filter((y) => y !== x).map((y) => `[[${a}-${y}-${b}|${ASPECT_WORD[lang][y]}]]`).join(", ")}`,
        ],
      };
    }
    if (group === "planet-in-house") {
      const parts = id.split("-");
      const p = parts[0];
      const n = Number(parts[3]);
      const verb = pick(T.BODY_TEXT[p]?.inHouse, lang);
      const area = pick(T.HOUSE_TEXT[n]?.area, lang);
      if (!verb || !area) return null;
      const sentence = fr ? `En maison ${ROMAN[n]}, ${THE.fr(p)} ${verb} ${area}.` : `In the ${ordinal(n)} house, ${THE.en(p)} ${verb} ${area}.`;
      const title = fr ? `${PLANET.fr[p]} en maison ${ROMAN[n]}` : `${PLANET.en[p]} in the ${ordinal(n)} house`;
      return {
        title,
        slug: fr ? slugify(`${PLANET.fr[p]} en maison ${n}`) : slugify(title),
        aliases: fr ? [`${PLANET.fr[p]} en maison ${n}`] : [`${PLANET.en[p]} in house ${n}`],
        glyph: `${GLYPH[p]}${n}`,
        related: [p, `house-${n}`, `${p}-in-house-${n === 1 ? 12 : n - 1}`, `${p}-in-house-${n === 12 ? 1 : n + 1}`],
        meaning: [sentence.charAt(0).toUpperCase() + sentence.slice(1)],
        corr: [
          `${fr ? "La planète\u202f" : "The planet"}: [[${p}]]`,
          `${fr ? "La maison\u202f" : "The house"}: [[house-${n}]]`,
          `${fr ? "La même maison, une autre planète\u202f" : "The same house, another planet"}: ${PLANETS.filter((x) => x !== p).map((x) => `[[${x}-in-house-${n}|${fr ? PLANET.fr[x] : PLANET.en[x]}]]`).join(", ")}`,
        ],
      };
    }
    if (group === "angle-in-sign") {
      const [a, , s] = id.split("-");
      const text = pick(T.SIGN_TEXT[s]?.[a === "ascendant" ? "rising" : "midheaven"], lang);
      if (!text) return null;
      const angle = a === "ascendant" ? (fr ? "Ascendant" : "Ascendant") : fr ? "Milieu du Ciel" : "Midheaven";
      const title = fr ? `${angle} en ${SIGN.fr[s]}` : `${angle} in ${SIGN.en[s]}`;
      return {
        title,
        slug: slugify(title),
        aliases: fr ? [] : a === "ascendant" ? [`${SIGN.en[s]} rising`, `${SIGN.en[s]} Ascendant`] : [`${SIGN.en[s]} Midheaven`],
        glyph: (a === "ascendant" ? "AC" : "MC") + GLYPH[s],
        related: [a, s],
        meaning: [text],
        corr: [`${fr ? "L’angle\u202f" : "The angle"}: [[${a}]]`, `${fr ? "Le signe\u202f" : "The sign"}: [[${s}]]`],
      };
    }
    if (group === "planet-angle") {
      const [p, , a] = id.split("-");
      const t = T.ANGLE_PAIR_TEXT[`${a}|${p}`];
      if (!t) return null;
      const angle = a === "ascendant" ? (fr ? "l’Ascendant" : "the Ascendant") : fr ? "le Milieu du Ciel" : "the Midheaven";
      const title = fr ? `${PLANET.fr[p]} et ${angle}` : `${PLANET.en[p]} and ${angle}`;
      return {
        title,
        slug: slugify(title),
        aliases: fr ? [] : [`${PLANET.en[p]} on ${angle}`],
        glyph: GLYPH[p] + (a === "ascendant" ? "AC" : "MC"),
        related: [p, a],
        meaning: [pick(t.theme, lang)],
        corr: [`${fr ? "La planète\u202f" : "The planet"}: [[${p}]]`, `${fr ? "L’angle\u202f" : "The angle"}: [[${a}]]`],
      };
    }
    if (group === "number-in-place") {
      const n = Number(id.split("-").pop());
      const place = PLACES.find((pl) => id === `${PLACE_SLUG[pl]}-${n}`);
      const text = pick(T.PLACE_TEXT[place]?.[n], lang);
      if (!text) return null;
      const title = `${PLACE[lang][place]} ${n}`;
      return {
        title,
        slug: slugify(title),
        aliases: [],
        glyph: String(n),
        related: [PLACE_ENTRY[place], `number-${n}`],
        meaning: [text],
        corr: [
          `${fr ? "La position\u202f" : "The position"}: [[${PLACE_ENTRY[place]}]]`,
          `${fr ? "Le nombre\u202f" : "The number"}: [[number-${n}]]`,
          `${fr ? "Le même nombre ailleurs\u202f" : "The same number elsewhere"}: ${PLACES.filter((x) => x !== place && !(x === "birthday" && n === 33)).map((x) => `[[${PLACE_SLUG[x]}-${n}|${PLACE[lang][x]}]]`).join(", ")}`,
        ],
      };
    }
    return null;
  }
}

/* ------------------------------------------------------------------ the Chinese combinations */

/**
 * The Chinese combination families' makers, by family of terms (COMBINATION_TERMS, chinese.mjs).
 * Each family's pages are the manifest's rows of kind "combination", assembled from the texts
 * Ulune's readings show after the summary and opening written for each in
 * content/encyclopedia/combinations/<terms>[.<part>].<lang>.md (`id:`, `  summary:`, `  opening:`).
 * A family's pages are made in a language only once an openings file of it is there, so a family
 * appears whole or not at all; a page whose opening is missing warns, as astrology's do.
 *
 *   texts   the modules of src/lib/chinese the maker reads: modules with no runtime import, or
 *           only ones with an explicit ".ts" (the Vite process that runs the build has no resolver);
 *   make    (row, lang, T) → { sections, related, aliases?, sources? } or null: `sections` by key
 *           (meaning, practice, traditions, history, calculation, correspondences), each a list of
 *           Markdown blocks (a paragraph, a "- " list line, a "|" table line; the lines of one list
 *           or table go together); the opening goes first under meaning. `related[0]` gives the
 *           page its preview image (src/encyclopedia/head.ts). The front matter comes from the row:
 *           its address, title, aliases (unless the maker gives its own), glyph and Chinese name.
 */
export const CHINESE_MAKERS = {
  // The sixty pillars and the thirty Na Yin (encyclopedia part 25): pillars.mjs.
  pillar: { texts: PILLAR_TEXTS, make: makePillar },
  "na-yin": { texts: PILLAR_TEXTS, make: makeNaYin },
  // Feng Shui's 45 pairings of mountain and water stars (encyclopedia part 26; languages part 27).
  pairing: { texts: ["fengshui-pair-texts.ts", "fengshui-readings-texts.ts"], make: makePairing },
};

/** The section headings, as registry.mjs's SECTIONS (a heading not in that list fails the build). */
const HEADINGS = {
  en: { meaning: "Meaning", practice: "In practice", traditions: "Across traditions", history: "Origin and history", calculation: "How Ulune calculates it", correspondences: "Correspondences" },
  fr: { meaning: "Sens", practice: "En pratique", traditions: "D’une tradition à l’autre", history: "Origine et histoire", calculation: "Comment Ulune le calcule", correspondences: "Correspondances" },
};
const SECTION_ORDER = ["meaning", "practice", "traditions", "history", "calculation", "correspondences"];

/** A section's blocks as Markdown: a blank line between blocks, none between the lines of one list or one table. */
function blocksText(blocks) {
  const lines = [];
  blocks.forEach((b, i) => {
    const prev = blocks[i - 1];
    const together = prev != null && ((prev.startsWith("- ") && b.startsWith("- ")) || (prev.startsWith("|") && b.startsWith("|")));
    if (i > 0 && !together) lines.push("");
    lines.push(b);
  });
  return lines;
}

/** The modules a maker reads, read fresh (a change shows on the next build). */
function chineseTexts(root, list) {
  const require = createRequire(join(root, "package.json"));
  const out = {};
  for (const f of list) {
    const path = join(root, "src/lib/chinese", f);
    delete require.cache[path];
    Object.assign(out, require(path));
  }
  return out;
}

/** An item of an inline list, quoted when the format needs it. */
const listItem = (s) => (/, |[[\]"#]|^\s|\s$/.test(s) ? quote(s) : s);

function chineseEntryFile({ row, lang, aliases, summary, related, sources, revised, body }) {
  const zh = row.chinese;
  const meta = [
    "---",
    `id: ${row.id}`,
    `lang: ${lang}`,
    `slug: ${row.slug[lang]}`,
    `title: ${row.title[lang]}`,
    ...(aliases.length ? [`aliases: [${aliases.map(listItem).join(", ")}]`] : []),
    `tradition: ${row.tradition}`,
    `family: ${row.family}`,
    "kind: combination",
    "page: true",
    ...(row.glyph ? [`glyph: ${quote(row.glyph)}`] : []),
    ...(zh ? [...(zh.engine ? [] : ["# Chinese name: the manifest’s suggestion, not in the engine: to check in a dictionary."]), `hant: ${zh.hant}`, `hans: ${zh.hans}`, `pinyin: ${zh.pinyin}`] : []),
    `summary: ${quote(summary)}`,
    `related: [${related.join(", ")}]`,
    ...(sources?.length ? ["sources:", ...sources.map((s) => `  - ${s}`)] : []),
    `revised: ${revised}`,
    "---",
    "",
  ];
  return meta.join("\n") + body.join("\n") + "\n";
}

/** The Chinese combination pages, added to `files` (and their missing openings to `warnings`). */
function chineseCombinationFiles(dir, root, files, warnings) {
  const entries = readManifest()?.entries ?? [];
  const names = readdirSync(join(dir, "combinations")).sort();
  for (const [terms, maker] of Object.entries(CHINESE_MAKERS)) {
    let T = null;
    for (const lang of ["en", "fr"]) {
      const re = new RegExp(`^${terms}(\\.[a-z0-9-]+)?\\.${lang}\\.md$`);
      const own = names.filter((n) => re.test(n));
      // Not begun in this language: no page of the family yet.
      if (!own.length) continue;
      const openings = { revised: null, entries: {} };
      for (const name of own) {
        const one = parseOpenings(readFileSync(join(dir, "combinations", name), "utf8"));
        if (one.revised && (!openings.revised || one.revised > openings.revised)) openings.revised = one.revised;
        Object.assign(openings.entries, one.entries);
      }
      T ??= chineseTexts(root, maker.texts);
      for (const row of entries.filter((e) => e.terms === terms && e.kind === "combination")) {
        const o = openings.entries[row.id] ?? {};
        if (!o.summary || !o.opening) warnings.push({ file: `content/encyclopedia/combinations/${own[0]}`, line: 1, message: `${row.id}: no ${!o.summary ? "summary" : "opening"} yet` });
        const made = maker.make(row, lang, T);
        if (!made) continue;
        const sections = { ...made.sections, meaning: [...(o.opening ? [o.opening] : []), ...(made.sections.meaning ?? [])] };
        const body = [];
        for (const key of SECTION_ORDER) if (sections[key]?.length) body.push(`## ${HEADINGS[lang][key]}`, "", ...blocksText(sections[key]), "");
        files.push({
          path: `${row.tradition}/${row.id}.${lang}.md`,
          text: chineseEntryFile({
            row,
            lang,
            aliases: made.aliases ?? row.aliases?.[lang] ?? [],
            summary: o.summary ?? `${row.title[lang]}.`,
            related: made.related,
            sources: made.sources,
            revised: openings.revised ?? "2026-10-23",
            body,
          }),
        });
      }
    }
  }
}

/* ------------------------------------------------------------------ the pairings of Flying Stars (part 26) */

/**
 * The nine Flying Stars as the pairing pages name them: fengshui-stars.ts's STARS (the colour name,
 * the phase, the classical star name) and the trigram of each star's home palace in the Lo Shu
 * (none for the 5). scripts/encyclopedia-chinese.test.mjs keeps them equal to the engine's.
 */
export const FLYING_STARS = {
  1: { en: "1 White", fr: "1 Blanc", phase: "water", trigram: "kan", star: "Tan Lang" },
  2: { en: "2 Black", fr: "2 Noir", phase: "earth", trigram: "kun", star: "Ju Men" },
  3: { en: "3 Jade", fr: "3 Jade", phase: "wood", trigram: "zhen", star: "Lu Cun" },
  4: { en: "4 Green", fr: "4 Vert", phase: "wood", trigram: "xun", star: "Wen Qu" },
  5: { en: "5 Yellow", fr: "5 Jaune", phase: "earth", trigram: null, star: "Lian Zhen" },
  6: { en: "6 White", fr: "6 Blanc", phase: "metal", trigram: "qian", star: "Wu Qu" },
  7: { en: "7 Red", fr: "7 Rouge", phase: "metal", trigram: "dui", star: "Po Jun" },
  8: { en: "8 White", fr: "8 Blanc", phase: "earth", trigram: "gen", star: "Zuo Fu" },
  9: { en: "9 Purple", fr: "9 Pourpre", phase: "fire", trigram: "li", star: "You Bi" },
};
/** A trigram's name, symbol and Later Heaven direction (fengshui.ts TRIGRAMS). */
const TRIGRAM_PLACE = { kan: ["Kan", "☵", "n"], kun: ["Kun", "☷", "sw"], zhen: ["Zhen", "☳", "e"], xun: ["Xun", "☴", "se"], qian: ["Qian", "☰", "nw"], dui: ["Dui", "☱", "w"], gen: ["Gen", "☶", "ne"], li: ["Li", "☲", "s"] };
const DIRECTION_IN = {
  en: { n: "in the north", ne: "in the north-east", e: "in the east", se: "in the south-east", s: "in the south", sw: "in the south-west", w: "in the west", nw: "in the north-west" },
  fr: { n: "au nord", ne: "au nord-est", e: "à l’est", se: "au sud-est", s: "au sud", sw: "au sud-ouest", w: "à l’ouest", nw: "au nord-ouest" },
};
/** The phases in the order of production (names.ts PHASES: wood feeds fire, fire earth…). */
const PHASE_ORDER = ["wood", "fire", "earth", "metal", "water"];
const PHASE_TITLE = { en: { wood: "Wood", fire: "Fire", earth: "Earth", metal: "Metal", water: "Water" }, fr: { wood: "Bois", fire: "Feu", earth: "Terre", metal: "Métal", water: "Eau" } };
/** The period whose states the pages name: Period 9, 2024–2043 (fengshui-home.ts periodOf). */
const PAIR_PERIOD = 9;

/** A star's state in a period, as fengshui-stars.ts's starState: "T" timely (its own, or one of the two rising after it), "W" waning (just past), "D" dormant. */
export const starStateIn = (n, period) => {
  const ahead = (((n - period) % 9) + 9) % 9;
  return ahead <= 2 ? "T" : ahead === 8 ? "W" : "D";
};
/** How the mountain star's phase meets the water star's, as fengshui-pairs.ts's relationOf. */
export const pairRelation = (m, w) => ["same", "m-feeds-w", "m-checks-w", "w-checks-m", "w-feeds-m"][(PHASE_ORDER.indexOf(FLYING_STARS[w].phase) - PHASE_ORDER.indexOf(FLYING_STARS[m].phase) + 5) % 5];

const PAIRING_SOURCES = {
  en: [
    "Zi Bai Jue (Verse of the Purple and White), Xuan Kong school",
    "Xuan Kong Mi Zhi (Secret Meaning of the Profound Void), Xuan Kong school",
    "Fei Xing Fu (Rhapsody of the Flying Stars), Xuan Kong school",
    "Shen Zhureng, Shen shi Xuankong xue, published after 1906",
  ],
  fr: [
    "Zi Bai Jue (Chant du Pourpre et du Blanc), école Xuan Kong",
    "Xuan Kong Mi Zhi (Sens secret du Vide mystérieux), école Xuan Kong",
    "Fei Xing Fu (Rhapsodie des Étoiles volantes), école Xuan Kong",
    "Shen Zhureng, Shen shi Xuankong xue, publié après 1906",
  ],
};

/** Which face of the pairing's text Period 9 reads, from the two stars' states then. */
function pairingNow(a, b, fr, T) {
  const key = `${a}-${b}`;
  if (T.PAIRS_WITHOUT_FACES?.includes(key)) {
    return fr ? `**À chaque période**\u202f: le texte du ${a} et du ${b} donne son conseil seul, sans face à choisir.` : `**In every period**: the text of the ${a} and the ${b} gives its counsel alone, with no face to choose.`;
  }
  const P = fr ? "**En Période 9 (2024–2043)**" : "**In Period 9 (2024–2043)**";
  const sa = starStateIn(a, PAIR_PERIOD);
  const sb = starStateIn(b, PAIR_PERIOD);
  if (a === b) {
    if (sa === "T") return fr ? `${P}, le ${a} est en saison\u202f: lisez «\u202fen saison\u202f», pour les habitants comme pour ce qui arrive.` : `${P}, the ${a} is in season: read “in season”, for the people of the home and for what comes in.`;
    if (sa === "W" && T.PAIRS_WITH_WANING_FACE?.includes(key)) {
      return fr ? `${P}, le ${a} vient de passer son temps\u202f: c’est la face que son texte donne à une étoile juste après son temps qui s’applique.` : `${P}, the ${a} has just passed its time: the face its text gives a star just past its time applies.`;
    }
    if (sa === "W") return fr ? `${P}, le ${a} vient de passer son temps\u202f: lisez «\u202fhors saison\u202f», plus doucement tant qu’il garde un peu de sa force.` : `${P}, the ${a} has just passed its time: read “out of season”, more gently while it keeps some of its strength.`;
    return fr ? `${P}, le ${a} est hors de son temps\u202f: lisez «\u202fhors saison\u202f», pour les habitants comme pour ce qui arrive.` : `${P}, the ${a} is out of its time: read “out of season”, for the people of the home and for what comes in.`;
  }
  if (sa === "T" && sb === "T") return fr ? `${P}, les deux étoiles sont en saison\u202f: lisez «\u202fen saison\u202f», quelle que soit l’étoile de la montagne.` : `${P}, both stars are in season: read “in season”, whichever is the mountain star.`;
  const sides = fr ? "les habitants quand une étoile est celle de la montagne, ce qui arrive quand elle est celle de l’eau" : "the people of the home when a star is the mountain’s, what comes in when it is the water’s";
  if (sa === "T" || sb === "T") {
    const [x, y, sy] = sa === "T" ? [a, b, sb] : [b, a, sa];
    return fr
      ? `${P}, le ${x} est en saison et le ${y} ${sy === "W" ? "vient de passer son temps" : "ne l’est pas"}\u202f: lisez «\u202fen saison\u202f» pour ce dont parle le ${x} et «\u202fhors saison\u202f»${sy === "W" ? ", plus doucement," : ""} pour ce dont parle le ${y}, ${sides}.`
      : `${P}, the ${x} is in season and the ${y} ${sy === "W" ? "has just passed its time" : "is not"}: read “in season” for what the ${x} speaks for and “out of season”${sy === "W" ? ", more gently," : ""} for what the ${y} speaks for, ${sides}.`;
  }
  if (sa === "W" || sb === "W") {
    const w = sa === "W" ? a : b;
    return fr
      ? `${P}, aucune des deux étoiles n’est en saison, mais le ${w} vient à peine de passer son temps\u202f: lisez «\u202fhors saison\u202f», plus doucement pour ce dont parle le ${w}.`
      : `${P}, neither star is in season, though the ${w} has only just passed its time: read “out of season”, more gently for what the ${w} speaks for.`;
  }
  return fr ? `${P}, aucune des deux étoiles n’est en saison\u202f: lisez «\u202fhors saison\u202f», quelle que soit l’étoile de la montagne.` : `${P}, neither star is in season: read “out of season”, whichever is the mountain star.`;
}

/**
 * A pairing of mountain and water stars ("pairing-1-4"): what the classics read in it, the text a
 * palace's reading gives (fengshui-pair-texts.ts), then how the two phases meet in each order and
 * which face Period 9 reads (fengshui-readings-texts.ts, as fengshui-stars-reading.ts says them),
 * and its stars, phases, trigrams and neighbours.
 */
function makePairing(row, lang, T) {
  const fr = lang === "fr";
  const key = row.id.replace(/^pairing-/, "");
  const [a, b] = key.split("-").map(Number);
  const text = T.PAIR_TEXTS?.[key];
  if (!text || !FLYING_STARS[a] || !FLYING_STARS[b]) return null;
  const say = (both) => both[fr ? 1 : 0];
  const low = (s) => s.charAt(0).toLowerCase() + s.slice(1);
  const same = a === b;
  const A = FLYING_STARS[a];
  const B = FLYING_STARS[b];
  const phaseWord = (n) => say(T.PHASE_WORDS[FLYING_STARS[n].phase]);
  const relation = (m, w) => say(T.RELATION_TEXTS[pairRelation(m, w)]).replace("{m}", phaseWord(m)).replace("{w}", phaseWord(w)).replace("{phase}", phaseWord(m));

  const practice = [
    fr
      ? `- **Dans le thème d’un logement**\u202f: un palais dont l’étoile de la montagne et celle de l’eau sont ${same ? `toutes deux le ${a}` : `le ${a} et le ${b}, dans un ordre ou dans l’autre,`} porte cette paire\u202f; la lecture du palais la nomme et donne le texte ci-dessus, puis la rencontre des deux phases et la face qui s’applique.`
      : `- **In a home’s chart**: a palace whose mountain star and water star are ${same ? `both the ${a}` : `the ${a} and the ${b}, in either order,`} holds this pairing; the palace’s reading names it and gives the text above, then how the two phases meet and which face applies.`,
    ...(same ? [[a, a]] : [[a, b], [b, a]]).map(([m, w]) =>
      fr
        ? `- **${same ? `Le ${a} comme étoile de la montagne et de l’eau` : `Le ${m} en étoile de la montagne, le ${w} en étoile de l’eau`}**\u202f: ${low(relation(m, w))}`
        : `- **${same ? `The ${a} as both mountain and water star` : `The ${m} as mountain star, the ${w} as water star`}**: ${low(relation(m, w))}`,
    ),
    `- ${pairingNow(a, b, fr, T)}`,
  ];

  const starLink = (n) => `[[flying-star-${n}|${fr ? FLYING_STARS[n].fr : FLYING_STARS[n].en}]]`;
  const phaseLink = (n) => `[[phase-${FLYING_STARS[n].phase}|${PHASE_TITLE[lang][FLYING_STARS[n].phase]}]]`;
  const home = (n) => {
    const t = FLYING_STARS[n].trigram;
    if (!t) return fr ? "le centre, sans trigramme" : "the centre, with no trigram";
    const [name, symbol, d] = TRIGRAM_PLACE[t];
    return `[[trigram-${t}|${name}]] ${symbol}, ${DIRECTION_IN[lang][d]}`;
  };
  const pairLink = (x, y) => {
    const [p, q] = x <= y ? [x, y] : [y, x];
    return `[[pairing-${p}-${q}|${p} ${fr ? "et" : "and"} ${q}]]`;
  };
  const others = (n) =>
    [1, 2, 3, 4, 5, 6, 7, 8, 9]
      .filter((k) => `${Math.min(n, k)}-${Math.max(n, k)}` !== key)
      .map((k) => pairLink(n, k))
      .join(", ");
  const samePhase = A.phase === B.phase;
  const corr = [
    fr
      ? `- **${same ? "L’étoile" : "Les étoiles"}**\u202f: ${same ? `le ${starLink(a)} (${A.star}), deux fois` : `le ${starLink(a)} (${A.star}) et le ${starLink(b)} (${B.star})`}`
      : `- **${same ? "The star" : "The stars"}**: ${same ? `the ${starLink(a)} (${A.star}), twice` : `the ${starLink(a)} (${A.star}) and the ${starLink(b)} (${B.star})`}`,
    same
      ? `- **${fr ? "Sa phase" : "Its phase"}**${fr ? "\u202f:" : ":"} ${phaseLink(a)}`
      : samePhase
        ? `- **${fr ? "Leur phase" : "Their phase"}**${fr ? "\u202f:" : ":"} ${phaseLink(a)}, ${fr ? "la même pour les deux" : "the same for both"}`
        : `- **${fr ? "Leurs phases" : "Their phases"}**${fr ? "\u202f:" : ":"} ${phaseLink(a)} ${fr ? "et" : "and"} ${phaseLink(b)}`,
    same
      ? fr
        ? `- **Son trigramme et sa place dans le [[lo-shu|Lo Shu]]**\u202f: ${home(a)}`
        : `- **Its trigram and home in the [[lo-shu|Lo Shu]]**: ${home(a)}`
      : fr
        ? `- **Leurs trigrammes et leurs places dans le [[lo-shu|Lo Shu]]**\u202f: ${home(a)}\u202f; ${home(b)}`
        : `- **Their trigrams and homes in the [[lo-shu|Lo Shu]]**: ${home(a)}; ${home(b)}`,
    ...(Math.abs(a - b) === 5
      ? [fr ? "- **Une paire du Hetu**\u202f: l’une des quatre paires que joint le Diagramme du Fleuve, 1 et 6, 2 et 7, 3 et 8, 4 et 9" : "- **A He Tu pair**: one of the four pairs the River Chart joins, 1 and 6, 2 and 7, 3 and 8, 4 and 9"]
      : []),
    ...(a + b === 10
      ? [fr ? "- **Dix**\u202f: les deux font dix, comme les nombres qui se font face de part et d’autre du centre du carré" : "- **Ten**: the two add up to ten, as the numbers facing each other across the square’s centre do"]
      : []),
    fr ? `- **Le ${a} avec les autres étoiles**\u202f: ${others(a)}` : `- **The ${a} with the other stars**: ${others(a)}`,
    ...(same ? [] : [fr ? `- **Le ${b} avec les autres étoiles**\u202f: ${others(b)}` : `- **The ${b} with the other stars**: ${others(b)}`]),
  ];

  return {
    sections: { meaning: [say(text)], practice, correspondences: corr },
    related: [`flying-star-${a}`, ...(same ? [] : [`flying-star-${b}`]), "pairing", `phase-${A.phase}`, ...(samePhase ? [] : [`phase-${B.phase}`]), "flying-star-chart"],
    aliases: same ? [key] : [fr ? `${b} et ${a}` : `${b} and ${a}`, key],
    sources: PAIRING_SOURCES[lang],
  };
}
