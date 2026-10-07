/*
 * The encyclopedia's search (encyclopedia plan, part 5), run on the device
 * over a language's index (types.ts, SearchIndex): instant, nothing typed is
 * sent anywhere. Forgiving: accents optional, one typo allowed in a word of
 * four letters or more, English and French names both found whatever the
 * page's language, glyphs pasted in (♄), and phrases ("venus square mars"):
 * an entry naming every word comes first, then, for a phrase, those naming
 * some of its words. Pure: the index comes in, results come out.
 */
import { isWord, STOPWORDS, tokens } from "./normalize";
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
};

export type SearchEngine = { lang: string; docs: Prepared[] };

const split = (s: string) => (s ? s.split(" ") : []);
/** A title as the words a search keeps of it, so "Lune vide de course" is found whole by "lune vide course". */
const phraseOf = (s: string) => queryWords(s).join(" ");

export function prepare(index: SearchIndex): SearchEngine {
  return {
    lang: index.lang,
    docs: index.docs.map((doc) => ({ doc, names: split(doc[7]), others: split(doc[8]), words: split(doc[9]), phrase: phraseOf(doc[1]) })),
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

/** The words of a search: folded, with the little words left out unless nothing else is left. */
export function queryWords(query: string): string[] {
  const all = tokens(query).filter((t) => t.length > 1 || /^[\p{N}\p{S}]$/u.test(t));
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
    else if (p.phrase.startsWith(whole)) score += 2;
    const [id, title, summary, glyph, tradition, family, slug] = p.doc;
    hits.push({ id, title, summary, glyph, tradition, family, slug: slug || null, score: score + (full ? 100 : 0), full });
  }
  const collator = new Intl.Collator(engine.lang, { sensitivity: "base" });
  hits.sort((a, b) => b.score - a.score || collator.compare(a.title, b.title));
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
