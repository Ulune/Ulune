/*
 * The encyclopedia's search (encyclopedia plan, part 5), run on the device
 * over a language's index (types.ts, SearchIndex): instant, nothing typed is
 * sent anywhere. Forgiving: accents optional, one typo allowed in a word of
 * four letters or more, English and French names both found whatever the
 * page's language, glyphs pasted in (♄), Chinese characters and pinyin with
 * or without its tones (木, mù, mu; part 23), and phrases ("venus square mars"):
 * an entry naming every word comes first, then, for a phrase, those naming
 * some of its words. Pure: the index comes in, results come out.
 */
import { isHan, isWord, STOPWORDS, tokens } from "./normalize";
import type { SearchDoc, SearchIndex } from "./types";

export type SearchHit = {
  id: string;
  title: string;
  summary: string;
  glyph: string;
  tradition: string;
  family: string;
  /** Its address in the index's language, or null when it is a card only. */
  slug: string | null;
  score: number;
  /** It names every word of the search. */
  full: boolean;
};

type Prepared = {
  doc: SearchDoc;
  names: string[];
  others: string[];
  words: string[];
  /** Its title as one folded phrase, for "the whole name" matches. */
  phrase: string;
  /** A combination page ("Birthday 7") yields to the core entry ("Number 7") when both match as well. */
  after: number;
};

export type SearchEngine = { lang: string; docs: Prepared[] };

/** The Chinese languages’ own traditions, whose entries yield to the shared foundations (“chinese”) on a tie. */
const LANGUAGE_OWN = new Set(["chinese-astrology", "bazi", "feng-shui"]);

const split = (s: string) => (s ? s.split(" ") : []);
/** A title as the words a search keeps of it, so "Lune vide de course" is found whole by "lune vide course". */
const phraseOf = (s: string) => queryWords(s).join(" ");

export function prepare(index: SearchIndex): SearchEngine {
  return {
    lang: index.lang,
    docs: index.docs.map((doc) => ({ doc, names: split(doc[7]), others: split(doc[8]), words: split(doc[9]), phrase: phraseOf(doc[1]), after: doc[10] ? 0.5 : 0 })),
  };
}

/** True when `a` and `b` differ by one letter changed, added, dropped, or two letters swapped. */
export function oneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0;
  while (i < la && i < lb && a[i] === b[i]) i += 1;
  if (la === lb) {
    if (a.slice(i + 1) === b.slice(i + 1)) return true;
    return a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2);
  }
  return la > lb ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}

/**
 * How well one typed word matches a list of words: 3 the same word, 2 the
 * start of one (the word being typed), 1.5 the start of one (a finished
 * word), 1.2 one typo away, 0.8 one typo away from the start of one (the word
 * being typed). Glyphs and numbers match exactly or by their start only.
 */
function wordScore(q: string, keys: string[], last: boolean): number {
  let best = 0;
  const typos = isWord(q) && q.length >= 4;
  for (const k of keys) {
    if (k === q) return 3;
    if (q.length >= 2 && k.startsWith(q)) best = Math.max(best, last ? 2 : 1.5);
    else if (typos && best < 1.2) {
      if (oneEdit(q, k)) best = 1.2;
      else if (last && k.length > q.length && oneEdit(q, k.slice(0, q.length))) best = Math.max(best, 0.8);
    }
  }
  return best;
}

/** A word of the summary: the same word or its start (three letters at least), worth little. */
function summaryScore(q: string, words: string[]): number {
  if (q.length < 3) return 0;
  for (const w of words) if (w === q || w.startsWith(q)) return 0.35;
  return 0;
}

/** The words of a search: folded, with the little words left out unless nothing else is left; a Chinese character is a word (木). */
export function queryWords(query: string): string[] {
  const all = tokens(query).filter((t) => t.length > 1 || /^[\p{N}\p{S}]$/u.test(t) || isHan(t));
  const kept = all.filter((t) => !STOPWORDS.has(t));
  return kept.length ? kept : all;
}

/** The entries a search finds, best first. */
export function search(engine: SearchEngine, query: string, limit = 40): SearchHit[] {
  const qs = queryWords(query);
  if (!qs.length) return [];
  const whole = qs.join(" ");
  const hits: SearchHit[] = [];
  for (const p of engine.docs) {
    let score = 0;
    let named = 0;
    let found = 0;
    qs.forEach((q, i) => {
      const last = i === qs.length - 1;
      const byName = Math.max(wordScore(q, p.names, last), 0.85 * wordScore(q, p.others, last));
      const s = byName || summaryScore(q, p.words);
      if (byName) named += 1;
      if (s) {
        found += 1;
        score += s;
      }
    });
    const full = found === qs.length;
    // A phrase finds the entries naming some of its words too (each part of "venus square mars").
    if (!full && !(qs.length > 1 && named > 0)) continue;
    if (p.phrase === whole) score += 6;
    // One of its names said exactly (a pinyin syllable, a character: "mu", 木) comes before a title that only starts with it ("Mutable").
    else if (qs.length === 1 && p.names.includes(whole)) score += 2.5;
    else if (p.phrase.startsWith(whole)) score += 2;
    const [id, title, summary, glyph, tradition, family, slug] = p.doc;
    // A number or a glyph typed alone finds the entry it stands for first ("7": Number 7).
    if (glyph && phraseOf(glyph) === whole) score += 1;
    hits.push({ id, title, summary, glyph, tradition, family, slug: slug || null, score: score + (full ? 100 : 0) - p.after, full });
  }
  const collator = new Intl.Collator(engine.lang, { sensitivity: "base" });
  // On a tie, the shared Chinese foundations before one Chinese language’s own entries: “mu” is 木, Wood, before 墓, BaZi’s Storehouse stage (part 25).
  const own = (h: SearchHit) => (LANGUAGE_OWN.has(h.tradition) ? 1 : 0);
  hits.sort((a, b) => b.score - a.score || own(a) - own(b) || collator.compare(a.title, b.title));
  return hits.slice(0, limit);
}

/** Results by tradition, the tradition of the best result first; each group keeps its order. */
export function byTradition(hits: SearchHit[]): { tradition: string; hits: SearchHit[] }[] {
  const groups: { tradition: string; hits: SearchHit[] }[] = [];
  for (const h of hits) {
    let g = groups.find((x) => x.tradition === h.tradition);
    if (!g) {
      g = { tradition: h.tradition, hits: [] };
      groups.push(g);
    }
    g.hits.push(h);
  }
  return groups;
}
