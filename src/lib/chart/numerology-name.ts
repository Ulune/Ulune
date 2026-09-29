/*
 * A name in numerology (part 59 of the launch plan): its letters and their
 * values, which letters are vowels, and every number the name gives. Rules
 * as Hans Decoz gives them:
 *   - each name (first, middle, last) is added and reduced on its own, then
 *     the names are added (masters kept all the way);
 *   - Y is a vowel when it sounds like one or is its syllable's only vowel,
 *     a consonant beside a vowel it goes with; each Y can be switched by hand;
 *   - W is never a vowel.
 * Cheiro's Chaldean values give a second, separate name number.
 */
import { absent, digitalRoot, fromTerms, reduceChain, MASTERS, NO_MASTERS, term, type NumerologyValue } from "./numerology-reduce";

/**
 * Pythagorean letter map (A=1 … I=9, then J=1 … R=9, S=1 … Z=8):
 *   1 AJS  2 BKT  3 CLU  4 DMV  5 ENW  6 FOX  7 GPY  8 HQZ  9 IR
 */
export const PYTHAGOREAN_VALUE: Readonly<Record<string, number>> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, I: 9,
  J: 1, K: 2, L: 3, M: 4, N: 5, O: 6, P: 7, Q: 8, R: 9,
  S: 1, T: 2, U: 3, V: 4, W: 5, X: 6, Y: 7, Z: 8,
};

/**
 * Cheiro's Chaldean values (Cheiro's Book of Numbers, 1926): 1 to 8 by sound,
 * no letter is 9.
 */
export const CHALDEAN_VALUE: Readonly<Record<string, number>> = {
  A: 1, I: 1, J: 1, Q: 1, Y: 1,
  B: 2, K: 2, R: 2,
  C: 3, G: 3, L: 3, S: 3,
  D: 4, M: 4, T: 4,
  E: 5, H: 5, N: 5, X: 5,
  U: 6, V: 6, W: 6,
  O: 7, Z: 7,
  F: 8, P: 8,
};

const PLAIN_VOWELS = new Set(["A", "E", "I", "O", "U"]);

/**
 * Latin letters NFD does not decompose, so stripping combining marks alone
 * leaves them outside A–Z and they would be dropped — losing a letter from the
 * name and quietly changing every name number. These are the standard ASCII
 * transliterations. French `œ` and German `ß` are the two that actually turn
 * up; `ß` already uppercases to `SS` in JS, so only the capital `ẞ` needs a row.
 */
const LIGATURE_FOLD: Readonly<Record<string, string>> = {
  Æ: "AE",
  Œ: "OE",
  ẞ: "SS",
  Ø: "O",
  Ł: "L",
  Đ: "D",
  Ð: "D",
  Þ: "TH",
};

/**
 * One source character → the A–Z letters it counts as. Accents fold (`é` → `E`),
 * ligatures expand (`œ` → `OE`, `ß` → `SS`), and anything with no Latin letter
 * in it returns an empty string rather than a zero-valued letter.
 */
export function foldLetter(ch: string): string {
  const upper = ch.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();
  let out = "";
  for (const c of upper) {
    const mapped = LIGATURE_FOLD[c];
    if (mapped) out += mapped;
    else if (c >= "A" && c <= "Z") out += c;
  }
  return out;
}

export function lettersOf(name: string): string[] {
  const out: string[] = [];
  for (const ch of name) {
    for (const letter of foldLetter(ch)) out.push(letter);
  }
  return out;
}

export function letterValue(letter: string): number {
  return PYTHAGOREAN_VALUE[letter] ?? 0;
}

export function sumLetters(letters: readonly string[]): number {
  let s = 0;
  for (const ch of letters) s += letterValue(ch);
  return s;
}

/** A Y's role in its name: a vowel or a consonant. */
export type YRole = "v" | "c";

/**
 * Decoz's rule for one Y, from its neighbours in the same name:
 *   first letter: a vowel before a consonant (Yvonne), a consonant before a vowel (Yolanda);
 *   last letter: a vowel after a consonant (Barry), a consonant after a vowel (Mickey);
 *   between consonants a vowel (Kyle), between vowels a consonant (Eyarta);
 *   after a vowel it goes with that vowel, a consonant (Taylor, Doyle);
 *   before a vowel it is the vowel of its syllable when no vowel comes before
 *   it in the name (Ryan, Bryan), a consonant otherwise (Tanya).
 */
export function yRoleByRule(word: readonly string[], i: number): YRole {
  return Y_ROLE_OF[yRuleWhy(word, i)];
}

/** Why the rule makes a Y a vowel or a consonant (the reading says so). */
export type YReason =
  | "alone"
  | "firstBeforeConsonant"
  | "firstBeforeVowel"
  | "lastAfterConsonant"
  | "lastAfterVowel"
  | "betweenConsonants"
  | "afterVowel"
  | "onlyVowel"
  | "beforeVowel";

const Y_ROLE_OF: Readonly<Record<YReason, YRole>> = {
  alone: "v",
  firstBeforeConsonant: "v",
  firstBeforeVowel: "c",
  lastAfterConsonant: "v",
  lastAfterVowel: "c",
  betweenConsonants: "v",
  afterVowel: "c",
  onlyVowel: "v",
  beforeVowel: "c",
};

export function yRuleWhy(word: readonly string[], i: number): YReason {
  const vowelAt = (k: number) => PLAIN_VOWELS.has(word[k] ?? "");
  const hasPrev = i > 0;
  const hasNext = i < word.length - 1;
  if (!hasPrev && !hasNext) return "alone";
  if (!hasPrev) return vowelAt(i + 1) ? "firstBeforeVowel" : "firstBeforeConsonant";
  if (!hasNext) return vowelAt(i - 1) ? "lastAfterVowel" : "lastAfterConsonant";
  const before = vowelAt(i - 1);
  const after = vowelAt(i + 1);
  if (!before && !after) return "betweenConsonants";
  if (before) return "afterVowel";
  // A consonant before, a vowel after: the syllable's vowel when no vowel came earlier.
  for (let k = 0; k < i; k += 1) if (vowelAt(k)) return "beforeVowel";
  return "onlyVowel";
}

export type NameLetter = {
  /** The folded letter, A–Z. */
  ch: string;
  /** Its Pythagorean value, 1–9. */
  value: number;
  vowel: boolean;
  /** Which name it is in (0 the first name). */
  word: number;
  /** Its place in the whole name, from 0. */
  index: number;
  /** For a Y: which one it is in the name (0 the first Y), to switch it by hand. */
  y?: number;
  /** For a Y: the role the rule gives it (it may have been switched), and why. */
  yRule?: YRole;
  yWhy?: YReason;
};

export type NameWord = { text: string; letters: NameLetter[] };

export type ParsedName = { text: string; words: NameWord[]; letters: NameLetter[] };

/**
 * The name as numerology reads it: its words (names), each letter with its
 * value and whether it is a vowel. `yRoles` switches the Y's in order (their
 * count must match, or the rule is used for all of them).
 */
export function parseName(name: string, yRoles?: readonly YRole[] | null): ParsedName {
  const words: NameWord[] = [];
  const letters: NameLetter[] = [];
  let yCount = 0;
  const rawWords = name.trim().split(/\s+/).filter(Boolean);
  const totalY = rawWords.reduce((n, w) => n + lettersOf(w).filter((c) => c === "Y").length, 0);
  const useRoles = yRoles && yRoles.length === totalY ? yRoles : null;
  for (const raw of rawWords) {
    const folded = lettersOf(raw);
    if (!folded.length) continue;
    const word: NameWord = { text: raw, letters: [] };
    folded.forEach((ch, i) => {
      let vowel = PLAIN_VOWELS.has(ch);
      const letter: NameLetter = { ch, value: letterValue(ch), vowel, word: words.length, index: letters.length };
      if (ch === "Y") {
        const why = yRuleWhy(folded, i);
        const rule = Y_ROLE_OF[why];
        const role = useRoles?.[yCount] ?? rule;
        vowel = role === "v";
        letter.vowel = vowel;
        letter.y = yCount;
        letter.yRule = rule;
        letter.yWhy = why;
        yCount += 1;
      }
      word.letters.push(letter);
      letters.push(letter);
    });
    words.push(word);
  }
  return { text: name.trim(), words, letters };
}

export type NameNumbers = {
  expression: NumerologyValue;
  soulUrge: NumerologyValue;
  personality: NumerologyValue;
};

function byWord(parsed: ParsedName, pick: (l: NameLetter) => boolean): NumerologyValue {
  const terms = parsed.words.flatMap((w) => {
    const ls = w.letters.filter(pick);
    if (!ls.length) return [];
    return [term(w.text, ls.reduce((s, l) => s + l.value, 0), MASTERS)];
  });
  return fromTerms(terms, MASTERS, true);
}

/** Expression, Soul Urge and Personality: each name reduced, then the names added. */
export function nameNumbersOf(parsed: ParsedName): NameNumbers {
  if (!parsed.letters.length) return { expression: absent(), soulUrge: absent(), personality: absent() };
  return {
    expression: byWord(parsed, () => true),
    soulUrge: byWord(parsed, (l) => l.vowel),
    personality: byWord(parsed, (l) => !l.vowel),
  };
}

/** Full-name numbers (Decoz's rules). Empty letter list → absent (never a fake 0). */
export function nameNumbers(name: string, yRoles?: readonly YRole[] | null): NameNumbers {
  return nameNumbersOf(parseName(name, yRoles));
}

export const PLANE_IDS = ["physical", "mental", "emotional", "intuitive"] as const;
export type PlaneId = (typeof PLANE_IDS)[number];

/** Decoz's planes of expression: which letters show each side of a person. */
export const PLANE_LETTERS: Readonly<Record<PlaneId, string>> = {
  physical: "DEMW",
  mental: "AGHJLNP",
  emotional: "BIORSTXZ",
  intuitive: "CFKQUVY",
};

/** A plane: its letters in the name, and their values added (11, 22, 33 kept). */
export type Plane = { id: PlaneId; letters: NameLetter[]; value: NumerologyValue };

export type NameDetail = {
  /** How many letters give each number, 1 to 9 (index 0 unused). */
  counts: number[];
  /** The numbers 1–9 no letter gives. */
  karmicLessons: number[];
  /** The number(s) with the most letters. */
  hiddenPassion: number[];
  /** How many of the nine numbers the name holds (9 minus the lessons). */
  subconsciousSelf: number;
  /** The initials added, reduced to 1–9. */
  balance: NumerologyValue;
  planes: Plane[];
  /** The first name's first letter, last letter and first vowel. */
  cornerstone: string | null;
  capstone: string | null;
  firstVowel: string | null;
  /** The first name alone, reduced (masters kept): Rational Thought starts from it. */
  firstName: NumerologyValue;
};

export function nameDetail(parsed: ParsedName): NameDetail {
  const counts = Array.from({ length: 10 }, () => 0);
  for (const l of parsed.letters) counts[l.value] = (counts[l.value] ?? 0) + 1;
  const nine = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const karmicLessons = nine.filter((n) => counts[n] === 0);
  const most = Math.max(0, ...nine.map((n) => counts[n] ?? 0));
  const hiddenPassion = most > 0 ? nine.filter((n) => counts[n] === most) : [];
  // Balance reduces all the way, masters too (Decoz).
  const initials = parsed.words.map((w) => w.letters[0]!).filter(Boolean);
  const balance = fromTerms(
    initials.map((l) => term(l.ch, l.value, NO_MASTERS)),
    NO_MASTERS,
    false,
  );
  const planes: Plane[] = PLANE_IDS.map((id) => {
    const ls = parsed.letters.filter((l) => PLANE_LETTERS[id].includes(l.ch));
    const value = ls.length ? fromTerms([term(id, ls.reduce((s, l) => s + l.value, 0), MASTERS)], MASTERS, false) : absent();
    return { id, letters: ls, value };
  });
  const first = parsed.words[0];
  const firstName = first ? fromTerms([term(first.text, first.letters.reduce((s, l) => s + l.value, 0), MASTERS)], MASTERS, false) : absent();
  return {
    counts,
    karmicLessons,
    hiddenPassion,
    subconsciousSelf: 9 - karmicLessons.length,
    balance,
    planes,
    cornerstone: first?.letters[0]?.ch ?? null,
    capstone: first?.letters[first.letters.length - 1]?.ch ?? null,
    firstVowel: first?.letters.find((l) => l.vowel)?.ch ?? null,
    firstName,
  };
}

export type ChaldeanNumber = {
  /** The name's letters added with Cheiro's values. */
  total: number;
  /** Cheiro's compound number (10–52): the total, reduced while it is above 52. None under 10. */
  compound: number | null;
  /** The single number, 1–9. */
  single: number;
};

export function chaldeanOf(parsed: ParsedName): ChaldeanNumber | null {
  if (!parsed.letters.length) return null;
  const total = parsed.letters.reduce((s, l) => s + (CHALDEAN_VALUE[l.ch] ?? 0), 0);
  let compound = total;
  while (compound > 52) compound = reduceChain(compound, NO_MASTERS)[1] ?? compound;
  return { total, compound: compound >= 10 ? compound : null, single: digitalRoot(total) };
}
