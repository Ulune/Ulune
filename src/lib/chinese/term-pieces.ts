/*
 * The Chinese tables' cells that name several terms, as pieces (languages
 * plan, part 29: "every term ready to link"): a branch's hidden stems ("己 jǐ
 * 60 · 癸 guǐ 30 · 辛 xīn 10"), a place's animal ("day (Pig)"). Each gives
 * back exactly the text the table shows today, as
 * scripts/chinese-term-ids.test.mjs checks; ChineseTermPieces
 * (encyclopedia/ChineseTermWord.tsx) links its terms once their families are
 * written, and keeps the text as it is otherwise. BaZi's own are in
 * bazi-term-pieces.ts, apart, so the zodiac's tables load none of BaZi; and
 * neither needs the registry itself (term-ids.ts) until a family is written.
 */
import { ANIMALS, BRANCHES, HIDDEN_STEMS, STEMS } from "./names";
import { chineseLabel, type ChinesePrefs } from "./prefs";
import { cnWord } from "./words";
import { PLACE_WORD } from "./zodiac-places";
import type { ZodiacChart, ZodiacPlaceId } from "./zodiac";
import type { ChineseFamily } from "./term-ids";

type Shown = Pick<ChinesePrefs, "script" | "show">;

/** A piece of a cell's text, with the term it names, if any (lib/chinese/term-ids.ts's families and ids). */
export type TermPiece = { text: string; family?: ChineseFamily; id?: string | number | null };

/** Terms joined by a separator, as pieces: [term, sep, term…]. */
export const joinPieces = (items: readonly TermPiece[], sep: string): TermPiece[] => items.flatMap((x, i) => (i ? [{ text: sep }, x] : [x]));

/** A stem as the hidden stems say it: its characters and pinyin ("己 jǐ"), or its name alone. */
export function stemSaid(stem: number, locale: string, prefs: Shown): string {
  const s = chineseLabel(STEMS[stem]!, locale, prefs);
  return prefs.show === "names" ? s.name : [s.hanzi, s.pinyin].filter(Boolean).join(" ");
}

/** Groups of pieces joined by a separator. */
export const joinGroups = (groups: readonly TermPiece[][], sep: string): TermPiece[] => groups.flatMap((g, i) => (i ? [{ text: sep }, ...g] : g));

/** A text that starts with a term's name: the name linked, the rest as it is (the whole text plain when it does not start so). */
export function headPieces(text: string, head: string, family: ChineseFamily, id: string | number): TermPiece[] {
  return head && text.startsWith(head) ? [{ text: head, family, id }, ...(text.length > head.length ? [{ text: text.slice(head.length) }] : [])] : [{ text }];
}

/** A branch's hidden stems with their weights, as the zodiac's table says them (zodiac-table.ts, hiddenLine). */
export function hiddenStemPieces(branch: number, locale: string, prefs: Shown): TermPiece[] {
  return joinGroups(
    HIDDEN_STEMS[branch]!.map(({ stem, weight }) => [{ text: stemSaid(stem, locale, prefs), family: "stem", id: STEMS[stem]!.id }, { text: ` ${weight}` }]),
    " · ",
  );
}

/** A place with its animal, "day (Pig)" (zodiac-reading.ts, placeAnimal). */
export function placeAnimalPieces(z: ZodiacChart, id: ZodiacPlaceId, locale: string): TermPiece[] {
  const p = z.places.find((x) => x.id === id)!;
  const b = BRANCHES[p.branch]!;
  return [{ text: `${cnWord(locale, PLACE_WORD[id]).toLowerCase()} (` }, { text: locale === "fr" ? b.fr : b.en, family: "animal", id: ANIMALS[p.branch]!.id }, { text: ")" }];
}
