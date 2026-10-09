/*
 * Chinese astrology's table (languages plan, part 8): the four animals with
 * every layer (pillar, stem, branch, the animal's phase, polarity, Na Yin,
 * hidden stems) and the relations between them, as rows for the table view,
 * as plain text for Copy, and as CSV in the tables' common shape (a section
 * column, ids rather than words, so a spreadsheet can read it in any
 * language).
 */
import { BRANCHES, HIDDEN_STEMS, PHASES, POLARITY_NAMES, SIXTY, STEMS } from "./names";
import { chineseLabel, type ChinesePrefs } from "./prefs";
import { RELATION_NAMES } from "./relations";
import { cnWord } from "./words";
import { PLACE_WORD, placeAnimal } from "./zodiac-reading";
import type { ZodiacChart, ZodiacPlace } from "./zodiac";

type Shown = Pick<ChinesePrefs, "script" | "show">;

/** A branch's hidden stems as a line: "己 jǐ 60 · 癸 guǐ 30 · 辛 xīn 10", or the stems' names. */
export function hiddenLine(branch: number, locale: string, prefs: Shown): string {
  return HIDDEN_STEMS[branch]!.map(({ stem, weight }) => {
    const l = chineseLabel(STEMS[stem]!, locale, prefs);
    const said = prefs.show === "names" ? l.name : [l.hanzi, l.pinyin].filter(Boolean).join(" ");
    return `${said} ${weight}`;
  }).join(" · ");
}

export type ZodiacAnimalRow = {
  place: ZodiacPlace;
  pillar: string;
  stem: string;
  branch: string;
  phase: string;
  polarity: string;
  naYin: string;
  hidden: string;
};

export function zodiacAnimalRows(z: ZodiacChart, locale: string, prefs: Shown): ZodiacAnimalRow[] {
  return z.places.map((place) => ({
    place,
    pillar: chineseLabel(SIXTY[place.pillar.cycle]!, locale, prefs).text,
    stem: chineseLabel(STEMS[place.stem]!, locale, prefs).text,
    branch: chineseLabel(BRANCHES[place.branch]!, locale, prefs).text,
    phase: chineseLabel(PHASES.find((p) => p.id === place.branchPhase)!, locale, prefs).text,
    polarity: chineseLabel(POLARITY_NAMES[BRANCHES[place.branch]!.polarity], locale, prefs).text,
    naYin: chineseLabel(place.naYin, locale, prefs).text,
    hidden: hiddenLine(place.branch, locale, prefs),
  }));
}

/** The table as text, part by part, for Copy. */
export function zodiacTextParts(z: ZodiacChart, locale: string, prefs: Shown, name = ""): { id: string; lines: string[] }[] {
  const colon = locale === "fr" ? " : " : ": ";
  const animals = zodiacAnimalRows(z, locale, prefs).map(
    (r) =>
      `${cnWord(locale, PLACE_WORD[r.place.id])}${r.place.uncertain ? " ~" : ""}${colon}${r.pillar} · ${r.phase} · ${cnWord(locale, "zkNaYin")} ${r.naYin} · ${cnWord(locale, "zkHidden")} ${r.hidden}`,
  );
  const relations = z.relations.length
    ? z.relations.map((r) => `${chineseLabel(RELATION_NAMES[r.kind], locale, prefs).text}${colon}${placeAnimal(z, r.places[0], locale)} – ${placeAnimal(z, r.places[1], locale)}`)
    : [cnWord(locale, "zkRelationsNone")];
  return [
    { id: "animals", lines: [`${name ? `${name} · ` : ""}${cnWord(locale, "zkPartAnimals")}`, ...animals] },
    { id: "relations", lines: [cnWord(locale, "zkPartRelations"), ...relations] },
  ];
}

const cell = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);
const bit = (b: boolean) => (b ? "1" : "0");

/** The CSV, in the tables' common shape: a section column, ids, the characters as they are. */
export function zodiacTableCsv(z: ZodiacChart): string {
  const rows: string[][] = [["section", "field", "value"]];
  rows.push(["zodiac", "birthUtc", new Date(z.birthMs).toISOString()]);
  rows.push(["zodiac", "clock", z.pillars.clock]);
  rows.push(["zodiac", "dayBoundary", z.pillars.dayBoundary]);
  rows.push(["zodiac", "timeUnknown", bit(z.timeUnknown)]);
  if (z.newYearAnimal != null) rows.push(["zodiac", "newYearAnimal", BRANCHES[z.newYearAnimal]!.id]);
  rows.push([]);
  rows.push(["animal", "place", "pillar", "hanzi", "stem", "branch", "animal", "phase", "polarity", "naYin", "hiddenStems", "uncertain"]);
  for (const p of z.places) {
    const pair = SIXTY[p.pillar.cycle]!;
    const branch = BRANCHES[p.branch]!;
    rows.push([
      "animal",
      p.id,
      pair.id,
      pair.hant,
      STEMS[p.stem]!.id,
      branch.id,
      branch.en.toLowerCase(),
      p.branchPhase,
      branch.polarity,
      p.naYin.hant,
      HIDDEN_STEMS[p.branch]!.map((h) => `${STEMS[h.stem]!.id}:${h.weight}`).join("|"),
      bit(p.uncertain),
    ]);
  }
  rows.push([]);
  rows.push(["relation", "kind", "placeA", "placeB", "branchA", "branchB"]);
  for (const r of z.relations) rows.push(["relation", r.kind, r.places[0], r.places[1], BRANCHES[r.branches[0]]!.id, BRANCHES[r.branches[1]]!.id]);
  return rows.map((r) => r.map(cell).join(",")).join("\n");
}
