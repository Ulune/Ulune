/*
 * BaZi's table cells that name several terms, as pieces (languages plan,
 * part 29: "every term ready to link"): the hidden stems with their gods, a
 * branch with its phase, the stars, what a pillar joins or meets and the
 * points it brings, the empty branches, an interaction's stems or branches
 * and what it gives, the analysis's structure and phases. Each gives back
 * exactly the text the table shows today (bazi-full.ts, bazi-table.ts,
 * bazi-luck-reading.ts), as scripts/chinese-term-ids.test.mjs checks;
 * ChineseTermPieces (encyclopedia/ChineseTermWord.tsx) links their terms once
 * their families are written, and keeps the text as it is otherwise.
 */
import { BRANCHES, HIDDEN_STEMS, PHASES, STEMS, type PhaseId } from "./names";
import { chineseLabel, type ChinesePrefs } from "./prefs";
import { cnWord } from "./words";
import { tenGodOf, type BaziChart, type BaziPlaceId } from "./bazi";
import { STARS, type StarId } from "./bazi-signs";
import { INTERACTION_NAMES, interactionTone, type Interaction } from "./bazi-interactions";
import { STRUCTURE_NAMES, baziBalance, type BaziBalance } from "./bazi-balance";
import { PILLAR_WORD, fmtPoints, ixStatus } from "./bazi-reading";
import { PLACE_WORD } from "./zodiac-places";
import type { Meeting } from "./bazi-luck";
import { headPieces, joinGroups, joinPieces, stemSaid, type TermPiece } from "./term-pieces";

type Shown = Pick<ChinesePrefs, "script" | "show">;

const dash = "–";
const namesOnly = (prefs: Shown): Shown => ({ ...prefs, show: "names" });
const phaseOf = (id: PhaseId) => PHASES.find((x) => x.id === id)!;

/** A branch's hidden stems, their weights and their gods to the Day Master: "己 jǐ 60 Indirect Resource · …" (bazi-full.ts; bazi-table.ts, hiddenGodsLine). */
export function hiddenGodPieces(dayMaster: number, branch: number, locale: string, prefs: Shown): TermPiece[] {
  return joinGroups(
    HIDDEN_STEMS[branch]!.map(({ stem, weight }) => {
      const god = tenGodOf(dayMaster, stem);
      return [
        { text: stemSaid(stem, locale, prefs), family: "stem", id: STEMS[stem]!.id },
        { text: ` ${weight} ` },
        { text: chineseLabel(god, locale, namesOnly(prefs)).name, family: "ten-god", id: god.id },
      ];
    }),
    " · ",
  );
}

/** A branch and its phase: "Horse · wǔ 午 · Fire" (bazi-full.ts). */
export function branchPhasePieces(branch: number, locale: string, prefs: Shown): TermPiece[] {
  const br = BRANCHES[branch]!;
  const ph = phaseOf(br.phase);
  return [
    { text: chineseLabel(br, locale, prefs).text, family: "branch", id: br.id },
    { text: " · " },
    { text: chineseLabel(ph, locale, namesOnly(prefs)).name, family: "phase", id: ph.id },
  ];
}

/** The symbolic stars of a pillar: "Nobleman, Canopy", or a dash (bazi-full.ts). */
export function starPieces(ids: readonly StarId[], locale: string, prefs: Shown): TermPiece[] {
  if (!ids.length) return [{ text: dash }];
  return joinPieces(
    ids.map((id) => ({ text: chineseLabel(STARS.find((x) => x.id === id)!, locale, namesOnly(prefs)).name, family: "shen-sha" as const, id })),
    ", ",
  );
}

/** What a pillar of the chart joins: "Harmony · Month; Clash · Hour", or a dash (bazi-full.ts). */
export function natalLinkPieces(ixs: readonly Interaction[], place: BaziPlaceId, locale: string, prefs: Shown): TermPiece[] {
  const mine = ixs.filter((x) => x.places.includes(place));
  if (!mine.length) return [{ text: dash }];
  return joinGroups(
    mine.map((x) => [
      { text: chineseLabel(INTERACTION_NAMES[x.kind], locale, namesOnly(prefs)).name, family: "relation", id: x.kind },
      { text: ` · ${x.places.filter((q) => q !== place).map((q) => cnWord(locale, PLACE_WORD[q])).join(", ") || cnWord(locale, PLACE_WORD[place])}` },
    ]),
    "; ",
  );
}

/**
 * What a luck pillar or a year meets: "Clash · Day; Trine · Year, Month", or
 * a dash; the places in the zodiac's words in the full table (bazi-full.ts),
 * in the pillars' in the luck table (bazi-luck-reading.ts, meetingShort).
 */
export function meetPieces(meets: readonly Meeting[], locale: string, prefs: Shown, words: "place" | "pillar"): TermPiece[] {
  if (!meets.length) return [{ text: dash }];
  const word = words === "pillar" ? PILLAR_WORD : PLACE_WORD;
  return joinGroups(
    meets.map((m) => [
      { text: chineseLabel(INTERACTION_NAMES[m.kind], locale, namesOnly(prefs)).name, family: "relation", id: m.kind },
      { text: ` · ${m.with.map((p) => (p === "luck" ? cnWord(locale, "bzlInLuck") : cnWord(locale, word[p]))).join(", ")}` },
    ]),
    "; ",
  );
}

/** The points a pillar brings to the phases: "Wood 1 · Fire 0.6" (bazi-full.ts). */
export function pointPieces(balance: BaziBalance, place: BaziPlaceId, locale: string, prefs: Shown): TermPiece[] {
  const pts = PHASES.map((ph) => [ph, balance.phases.find((x) => x.phase === ph.id)!.parts.filter((x) => x.place === place).reduce((s, x) => s + x.points, 0)] as const).filter(([, n]) => n > 0);
  return joinGroups(
    pts.map(([ph, n]) => [{ text: chineseLabel(ph, locale, namesOnly(prefs)).name, family: "phase", id: ph.id }, { text: ` ${fmtPoints(n, locale)}` }]),
    " · ",
  );
}

/** The empty branches: "Dog · xū 戌 · Pig · hài 亥" (bazi-table.tsx's signs). */
export function emptyPieces(empty: readonly number[], locale: string, prefs: Shown): TermPiece[] {
  return joinPieces(
    empty.map((b) => ({ text: chineseLabel(BRANCHES[b]!, locale, prefs).text, family: "branch" as const, id: BRANCHES[b]!.id })),
    " · ",
  );
}

/** The stems or branches an interaction joins: "Rabbit 卯 mǎo · Dog 戌 xū" (bazi-table.ts, ixItemShort). */
export function ixItemPieces(ix: Interaction, locale: string, prefs: Shown): TermPiece[] {
  return joinPieces(
    ix.items.map((n) => {
      const rec = (ix.level === "stem" ? STEMS : BRANCHES)[n]!;
      const l = chineseLabel(rec, locale, prefs);
      return { text: prefs.show === "names" ? l.name : `${l.name} ${[l.hanzi, l.pinyin].filter(Boolean).join(" ")}`, family: ix.level === "stem" ? ("stem" as const) : ("branch" as const), id: rec.id };
    }),
    " · ",
  );
}

/** What an interaction gives: "Fire · Transforms", its phase linked (bazi-reading.ts, ixStatus). */
export function ixResultPieces(ix: Interaction, locale: string): TermPiece[] {
  const text = ixStatus(ix, locale);
  if (interactionTone(ix.kind) !== "meet" || !ix.phase) return [{ text }];
  const ph = phaseOf(ix.phase);
  return headPieces(text, locale === "fr" ? ph.fr : ph.en, "phase", ph.id);
}

/** Phases in a list: "Wood, Fire" (bazi-reading.ts, phaseList). */
const phaseListPieces = (ids: readonly PhaseId[], locale: string): TermPiece[] =>
  joinPieces(
    ids.map((id) => ({ text: locale === "fr" ? phaseOf(id).fr : phaseOf(id).en, family: "phase" as const, id })),
    ", ",
  );

/** A value of the analysis's summary (bazi-table.ts, balanceRows): the structure, the special one, the favourable and unfavourable phases, the climate's. */
export function summaryPieces(c: BaziChart, label: string, locale: string, prefs: Shown, b: BaziBalance = baziBalance(c)): TermPiece[] | null {
  if (label === cnWord(locale, "bzStructure")) return [{ text: chineseLabel(STRUCTURE_NAMES[b.structure.id], locale, prefs).text, family: "structure", id: b.structure.id }];
  if (label === cnWord(locale, "bzSpecialFlag") && b.special) return [{ text: chineseLabel(STRUCTURE_NAMES[b.special], locale, prefs).text, family: "structure", id: b.special }];
  if (label === cnWord(locale, "bzFavBalance")) return phaseListPieces(b.favourable.good, locale);
  if (label === cnWord(locale, "bzUnfav")) return phaseListPieces(b.favourable.bad, locale);
  if (label === cnWord(locale, "bzFavClimate") && b.favourable.climate) return phaseListPieces([b.favourable.climate], locale);
  return null;
}
