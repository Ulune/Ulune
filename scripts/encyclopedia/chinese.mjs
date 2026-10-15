/*
 * The encyclopedia's Chinese pages (encyclopedia plan, part 23): the four
 * Chinese traditions and their families, the writers' manifest, and the
 * build's checks of a Chinese name.
 *
 *   - The traditions: "chinese", the foundations the three Chinese languages
 *     share (the phases, stems, branches, the sixty pillars, Na Yin, solar
 *     terms, relations, trigrams and four shared ideas), shown as Chinese
 *     cosmology; then each language's own, as the language picker names
 *     them: Chinese astrology, BaZi, Feng Shui. Yin and yang is one of the
 *     encyclopedia's shared ideas ("shared", registry.mjs).
 *   - The families: each is one family of terms of src/lib/chinese/term-ids.ts
 *     (`terms`), so a family of the encyclopedia and a family of linked words
 *     are the same list, in the engine's order.
 *   - The manifest, content/encyclopedia/chinese-manifest.json: every entry
 *     to write, with its id, family, folder, addresses, titles, Chinese name
 *     and suggested related entries. Made from the engine's own names and the
 *     term registry by chinese-manifest.mjs (scripts/encyclopedia-chinese.test.mjs
 *     fails when it is out of date), and read here, so the build needs none of
 *     the engine's TypeScript.
 *   - The checks: an entry's characters (Traditional `hant`, Simplified
 *     `hans`) and pinyin (`pinyin`, with tone marks) are those the engine
 *     gives the term when it knows it; the characters are Han characters only;
 *     the pinyin has one toned syllable per character.
 *
 * Plain JavaScript with no import from src: the build runs it in the Vite
 * process as it is.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..", "..");
export const MANIFEST_FILE = "content/encyclopedia/chinese-manifest.json";
export const MANIFEST_PATH = resolve(ROOT, MANIFEST_FILE);

/**
 * The Chinese traditions, in the order the encyclopedia's home shows them
 * (after numerology, before the shared ideas). `language` is the studio's
 * language a tradition is (its picker card, its ⓘ, its page); `zh` its own
 * name, as the picker writes it (lib/chinese/language-names.ts).
 */
export const CHINESE_TRADITIONS = [
  {
    id: "chinese",
    name: { en: "Chinese cosmology", fr: "Cosmologie chinoise" },
    home: { en: "chinese-cosmology", fr: "cosmologie-chinoise" },
    intro: {
      en: "The phases, the stems and branches, the sixty-cycle, the solar terms and the trigrams: what the three Chinese languages share.",
      fr: "Les phases, les troncs et les branches, le cycle de soixante, les termes solaires et les trigrammes\u202f: ce que partagent les trois langages chinois.",
    },
  },
  {
    id: "chinese-astrology",
    name: { en: "Chinese astrology", fr: "Astrologie chinoise" },
    home: { en: "chinese-astrology", fr: "astrologie-chinoise" },
    language: "chinese-astrology",
    zh: { hant: "生肖", hans: "生肖", pinyin: "shēngxiào" },
    intro: {
      en: "The twelve animals, read from the year, the month, the day and the hour of a birth, and how they meet each other and the years.",
      fr: "Les douze animaux, lus dans l’année, le mois, le jour et l’heure d’une naissance, et la façon dont ils se rencontrent et rencontrent les années.",
    },
  },
  {
    id: "bazi",
    name: { en: "BaZi", fr: "BaZi" },
    home: { en: "bazi", fr: "bazi" },
    language: "bazi",
    zh: { hant: "八字", hans: "八字", pinyin: "bāzì" },
    intro: {
      en: "The Four Pillars of a birth, eight characters read around the Day Master, with the Ten Gods, the balance of the phases and the luck pillars.",
      fr: "Les Quatre Piliers d’une naissance, huit caractères lus autour du Maître du jour, avec les Dix Dieux, l’équilibre des phases et les piliers de chance.",
    },
  },
  {
    id: "feng-shui",
    name: { en: "Feng Shui", fr: "Feng Shui" },
    home: { en: "feng-shui", fr: "feng-shui" },
    language: "feng-shui",
    zh: { hant: "風水", hans: "风水", pinyin: "fēngshuǐ" },
    intro: {
      en: "How places and directions suit people: the Kua number and the Eight Mansions, the home’s facing and its Flying Stars.",
      fr: "Comment les lieux et les directions conviennent aux personnes\u202f: le nombre Kua et les Huit Demeures, la façade du logement et ses Étoiles volantes.",
    },
  },
];

/**
 * Each Chinese tradition's families, in the order its home lists them; each
 * is one family of terms (lib/chinese/term-ids.ts) and lists its entries in
 * the engine's order, the family's own entry first (from the manifest).
 */
export const CHINESE_FAMILY_DEFS = {
  chinese: [
    { id: "phases", terms: "phase", name: { en: "The five phases", fr: "Les cinq phases" } },
    { id: "stems", terms: "stem", name: { en: "Heavenly Stems", fr: "Troncs célestes" } },
    { id: "branches", terms: "branch", name: { en: "Earthly Branches", fr: "Branches terrestres" } },
    { id: "solar-terms", terms: "solar-term", name: { en: "Solar terms", fr: "Termes solaires" } },
    { id: "relations", terms: "relation", name: { en: "Relations", fr: "Relations" } },
    { id: "trigrams", terms: "trigram", name: { en: "Trigrams", fr: "Trigrammes" } },
    { id: "ideas", terms: "chinese-concept", name: { en: "Key ideas", fr: "Notions clés" } },
    { id: "pillars", terms: "pillar", name: { en: "The sixty pillars", fr: "Les soixante piliers" } },
    { id: "na-yin", terms: "na-yin", name: { en: "Na Yin", fr: "Na Yin" } },
  ],
  "chinese-astrology": [
    { id: "animals", terms: "animal", name: { en: "The twelve animals", fr: "Les douze animaux" } },
    { id: "ideas", terms: "zodiac-concept", name: { en: "Key ideas", fr: "Notions clés" } },
  ],
  bazi: [
    { id: "ideas", terms: "bazi-concept", name: { en: "Key ideas", fr: "Notions clés" } },
    { id: "ten-gods", terms: "ten-god", name: { en: "Ten Gods", fr: "Dix Dieux" } },
    { id: "life-stages", terms: "life-stage", name: { en: "Twelve life stages", fr: "Douze stades de vie" } },
    { id: "stars", terms: "shen-sha", name: { en: "Symbolic stars", fr: "Étoiles symboliques" } },
    { id: "structures", terms: "structure", name: { en: "Structures", fr: "Structures" } },
  ],
  "feng-shui": [
    { id: "ideas", terms: "fengshui-concept", name: { en: "Key ideas", fr: "Notions clés" } },
    { id: "kua", terms: "kua", name: { en: "Kua numbers", fr: "Nombres Kua" } },
    { id: "mansions", terms: "mansion", name: { en: "Eight Mansions", fr: "Huit Demeures" } },
    { id: "mountains", terms: "mountain", name: { en: "The 24 mountains", fr: "Les 24 montagnes" } },
    { id: "flying-stars", terms: "flying-star", name: { en: "Flying Stars", fr: "Étoiles volantes" } },
    { id: "periods", terms: "period", name: { en: "Periods", fr: "Périodes" } },
    { id: "formations", terms: "formation", name: { en: "Formations", fr: "Formations" } },
    { id: "afflictions", terms: "affliction", name: { en: "Annual afflictions", fr: "Afflictions annuelles" } },
    { id: "pairings", terms: "pairing", name: { en: "Pairs of stars", fr: "Paires d’étoiles" } },
  ],
};

/** Where yin and yang lives: one of the shared ideas (term family "polarity"). */
export const SHARED_IDEAS_TERMS = "polarity";

/** The families of terms whose pages are assembled like astrology's combinations (combinations.mjs): a written opening, then Ulune's own texts and facts. */
export const COMBINATION_TERMS = new Set(["pillar", "na-yin", "pairing"]);

let manifest;
let manifestTime = -1;
/** The writers' manifest (null when it has not been made yet), read again when the file changes, so the dev server's rebuilds see a new one. */
export function readManifest() {
  const time = existsSync(MANIFEST_PATH) ? statSync(MANIFEST_PATH).mtimeMs : 0;
  if (manifest === undefined || time !== manifestTime) {
    manifest = time ? JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) : null;
    manifestTime = time;
  }
  return manifest;
}

/** The manifest's entries by id. */
export function manifestEntries() {
  const m = readManifest();
  return new Map((m?.entries ?? []).map((e) => [e.id, e]));
}

/** A Chinese family's entries in the engine's order, the family's own entry first (from the manifest). */
export function chineseOrder(tradition, family) {
  const m = readManifest();
  return (m?.entries ?? []).filter((e) => e.tradition === tradition && e.family === family).map((e) => e.id);
}

/* ------------------------------------------------------------------ the checks */

/** The tone-marked vowels of Hanyu Pinyin (lower case, as Ulune writes it). */
const TONED = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/gu;
const HAN = /\p{Script=Han}/u;

/** How many Han characters a text has. */
export const hanCount = (text) => [...text].filter((c) => HAN.test(c)).length;

/** Why a text is not Han characters only, or null. */
export function hanProblem(text) {
  if (typeof text !== "string" || !text) return "is empty";
  const other = [...text].filter((c) => !HAN.test(c));
  return other.length ? `holds "${other.join("")}", not Han characters` : null;
}

/**
 * Why a pinyin is not Hanyu Pinyin with one toned syllable per character
 * (`chars`, the characters it reads), or null. Lower case; syllables joined
 * or apart (lìchūn, hǎizhōng jīn), an apostrophe where two would run
 * together (cóng’ér).
 */
export function pinyinProblem(pinyin, chars) {
  if (typeof pinyin !== "string" || !pinyin) return "is empty";
  const text = pinyin.normalize("NFC");
  if (/[A-Z]/.test(text)) return `"${pinyin}" is written in small letters`;
  if (!/^[a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü' ’-]+$/u.test(text)) return `"${pinyin}" has a letter that is not pinyin's`;
  const words = text.split(/[\s-]+/).filter(Boolean);
  const bare = words.find((w) => !w.match(TONED));
  if (bare) return `"${bare}" has no tone mark`;
  const tones = (text.match(TONED) ?? []).length;
  if (chars != null && tones !== hanCount(chars)) return `"${pinyin}" has ${tones} toned syllable(s) for ${hanCount(chars)} character(s) (${chars}): one per character`;
  return null;
}

/** Pinyin without its tones, as a reader types it: "lìchūn" → "lichun", "hǎizhōng jīn" → "haizhong jin". */
export const toneless = (pinyin) =>
  pinyin
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[’']/g, "")
    .toLowerCase();

/**
 * The checks of an entry's Chinese name, against its manifest row (`known`,
 * or undefined for an entry the manifest does not list): `report(key,
 * message)` for each mistake. The three keys come together; the engine's
 * name, when it has one, is the entry's.
 */
export function checkChineseName(meta, known, report) {
  const keys = ["hant", "hans", "pinyin"];
  const given = keys.filter((k) => meta[k] != null && meta[k] !== "");
  if (given.length && given.length < 3) {
    for (const k of keys) if (!given.includes(k)) report(given[0], `\`${k}\` is missing: a Chinese name gives hant, hans and pinyin together`);
    return;
  }
  const zh = known?.chinese;
  if (!given.length) {
    if (zh?.engine) report("id", `this term has a Chinese name in the engine: hant: ${zh.hant}, hans: ${zh.hans}, pinyin: ${zh.pinyin} (${MANIFEST_FILE})`);
    return;
  }
  for (const k of ["hant", "hans"]) {
    const p = hanProblem(meta[k]);
    if (p) report(k, `\`${k}\` ${p}`);
  }
  if (hanCount(meta.hant) !== hanCount(meta.hans)) report("hans", `\`hans\` has ${hanCount(meta.hans)} character(s), \`hant\` ${hanCount(meta.hant)}`);
  const p = pinyinProblem(meta.pinyin, meta.hant);
  if (p) report("pinyin", `\`pinyin\` ${p}`);
  if (zh?.engine) {
    for (const k of keys) {
      if (meta[k].normalize("NFC") !== zh[k].normalize("NFC")) report(k, `\`${k}\` is "${meta[k]}"; the engine writes "${zh[k]}" (${zh.from})`);
    }
  }
}
