/*
 * How the encyclopedia's search compares words: the build folds every name,
 * alias and summary this way into its index (scripts/encyclopedia/build.mjs),
 * and the page folds what the reader types the same way (search.ts). Pure:
 * no browser, no data.
 */

/** Lower case, accents and emoji variation selectors removed, œ æ ß opened: "Éclipse" and "eclipse" fold alike. */
export function fold(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ︎️]/g, "")
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/ß/g, "ss");
}

/** The words (letters and digits) and the symbols (♄, ℞) of a text, folded, in order. */
export function tokens(text: string): string[] {
  return fold(text).match(/[\p{L}\p{N}]+|\p{S}/gu) ?? [];
}

/**
 * The words a name is found by: its tokens, and each hyphenated word joined
 * up as well ("semi-sextile" is found as "semisextile" too).
 */
export function keyTokens(text: string): string[] {
  const out = tokens(text);
  for (const m of fold(text).matchAll(/[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)+/gu)) out.push(m[0].replace(/-/g, ""));
  return [...new Set(out)];
}

/** Little words a search leaves aside, in both languages. */
export const STOPWORDS: ReadonlySet<string> = new Set([
  "the",
  "of",
  "and",
  "a",
  "an",
  "to",
  "in",
  "on",
  "la",
  "le",
  "les",
  "de",
  "du",
  "des",
  "un",
  "une",
  "et",
  "en",
  "au",
  "aux",
]);

/** A word made only of letters: the kind a typo may be forgiven in. */
export const isWord = (token: string): boolean => /^\p{L}+$/u.test(token);
