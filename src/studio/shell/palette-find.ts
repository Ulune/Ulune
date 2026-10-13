/*
 * How ⌘K finds its commands (CommandPaletteDialog.tsx; languages plan, part
 * 28): every word typed must be among a command's words (its label, its
 * hint, its section, and the other names it answers to), with case and
 * accents set aside on both sides as the encyclopedia's search sets them
 * aside (encyclopedia/normalize.ts): "bazi" and "bāzì" find BaZi,
 * "numerologie" finds Numérologie. The Chinese languages also answer to
 * their pinyin and their characters, Traditional and Simplified
 * (shēngxiào 生肖, bāzì 八字, fēngshuǐ 風水 风水), and so do their lenses and
 * pages, as they answer to the language's name.
 *
 * Pure; tested in scripts/studio-nav.test.mjs.
 */
import { fold } from "@/encyclopedia/normalize";
import { LANGUAGE_NAMES } from "@/lib/chinese/language-names";
import type { LanguageId } from "@/studio/map";

/** The other names a language answers to: a Chinese language's pinyin and characters ("bāzì 八字"), else none. */
export function languageAliases(id: LanguageId): string {
  const n = LANGUAGE_NAMES[id];
  return n ? [...new Set([n.pinyin, n.hant, n.hans])].join(" ") : "";
}

/** A command's words, folded once (they are compared at each key typed). */
export function paletteWords(...parts: readonly (string | undefined)[]): string {
  return fold(parts.filter(Boolean).join(" "));
}

/** The words typed, folded; none for blank. */
export function typedWords(typed: string): string[] {
  return fold(typed).split(/\s+/).filter(Boolean);
}

/** Whether every word typed (typedWords) is among a command's words (paletteWords). */
export function paletteFinds(words: readonly string[], hay: string): boolean {
  return words.every((w) => hay.includes(w));
}
