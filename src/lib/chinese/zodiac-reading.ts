/*
 * What Chinese astrology's page says about a chosen animal (languages plan,
 * part 7): its place and what the tradition reads there, its pillar, stem,
 * branch, phase and Na Yin, when its year or month runs, and whether the
 * birth time could change it. The written portraits of each animal and
 * phase come with part 10; these are the facts and the tradition's frame.
 */
import type { ElementReading, ReadingFact } from "@/lib/chart/types";
import { BRANCHES, PHASES, POLARITY_NAMES, SIXTY, SOLAR_TERMS, STEMS } from "./names";
import { ANIMAL_GLYPH_INNER } from "./animal-glyphs";
import { chineseLabel, type ChinesePrefs } from "./prefs";
import { LICHUN, termMs } from "./terms";
import { solarMonthAt } from "./pillars";
import { cnWord, theAnimal, type ChineseWordKey } from "./words";
import type { ZodiacChart, ZodiacPlace, ZodiacPlaceId } from "./zodiac";
import { branchRelations, RELATION_NAMES, trineOf, type PlacedRelation, type RelationKind } from "./relations";

type Shown = Pick<ChinesePrefs, "script" | "show"> & Partial<Pick<ChinesePrefs, "animals">>;

/** An animal's mark in its reading: Ulune's drawing of it (part 9), unless the reader chose the characters. */
const drawn = (animal: number, prefs: Shown) => ((prefs.animals ?? "drawings") === "drawings" ? ANIMAL_GLYPH_INNER[animal] : undefined);

const ROLE: Record<ZodiacPlaceId, ChineseWordKey> = { year: "zkRoleYear", month: "zkRoleMonth", day: "zkRoleDay", hour: "zkRoleHour" };
export const PLACE_WORD: Record<ZodiacPlaceId, ChineseWordKey> = { year: "zkYear", month: "zkMonth", day: "zkDay", hour: "zkHour" };
export const PLACE_ANIMAL: Record<ZodiacPlaceId, ChineseWordKey> = {
  year: "zkYearAnimal",
  month: "zkMonthAnimal",
  day: "zkDayAnimal",
  hour: "zkHourAnimal",
};

/** A selection's id on the page: a place ("zk:year") or an animal of the wheel ("zk:branch:6"). */
export const placeRef = (id: ZodiacPlaceId): string => `zk:${id}`;
export const branchRef = (branch: number): string => `zk:branch:${branch}`;
/** A relation between two of the reader's animals ("zk:rel:clash:day:hour"). */
export const relationRef = (r: Pick<PlacedRelation<ZodiacPlaceId>, "kind" | "places">): string => `zk:rel:${r.kind}:${r.places[0]}:${r.places[1]}`;

/** What the tradition reads in each relation (languages plan, part 8). */
export const RELATION_TEXT: Record<RelationKind, ChineseWordKey> = {
  harmony: "zkRelHarmony",
  trine: "zkRelTrine",
  clash: "zkRelClash",
  harm: "zkRelHarm",
  punishment: "zkRelPunishment",
  destruction: "zkRelDestruction",
  "self-punishment": "zkRelSelf",
};

/** A place in a line: "day (Pig)", « jour (Cochon) ». */
export function placeAnimal(z: ZodiacChart, id: ZodiacPlaceId, locale: string): string {
  const p = z.places.find((x) => x.id === id)!;
  const b = BRANCHES[p.branch]!;
  return `${cnWord(locale, PLACE_WORD[id]).toLowerCase()} (${locale === "fr" ? b.fr : b.en})`;
}

/** A relation in a line: "Clash · day (Pig) – hour (Snake)". */
export function relationLine(z: ZodiacChart, r: PlacedRelation<ZodiacPlaceId>, locale: string, prefs: Shown): string {
  return `${chineseLabel(RELATION_NAMES[r.kind], locale, prefs).name} · ${placeAnimal(z, r.places[0], locale)} – ${placeAnimal(z, r.places[1], locale)}`;
}

function dayFormat(locale: string, tz: string | undefined) {
  const fmt = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    timeZone: tz || "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return (ms: number) => fmt.format(new Date(ms));
}

function about(locale: string): ElementReading["about"] {
  return { title: cnWord(locale, "zkAboutTitle"), paragraphs: [cnWord(locale, "zkAbout1"), cnWord(locale, "zkAbout2")] };
}

/** The four animals' page reading of a place. */
function placeReading(z: ZodiacChart, place: ZodiacPlace, locale: string, prefs: Shown, tz?: string): ElementReading {
  const pair = chineseLabel(SIXTY[place.pillar.cycle]!, locale, prefs);
  const day = dayFormat(locale, tz);
  const facts: ReadingFact[] = [
    { label: cnWord(locale, "zkPillar"), value: pair.text },
    { label: cnWord(locale, "zkStem"), value: chineseLabel(STEMS[place.stem]!, locale, prefs).text },
    { label: cnWord(locale, "zkBranch"), value: chineseLabel(BRANCHES[place.branch]!, locale, prefs).text, ref: branchRef(place.branch) },
    { label: cnWord(locale, "zkAnimalPhase"), value: chineseLabel(PHASES.find((p) => p.id === place.branchPhase)!, locale, prefs).text },
    { label: cnWord(locale, "zkNaYin"), value: chineseLabel(place.naYin, locale, prefs).text },
  ];
  if (place.id === "year") {
    const from = termMs(z.pillars.solarYear, LICHUN);
    const to = termMs(z.pillars.solarYear + 1, LICHUN);
    facts.push({ label: cnWord(locale, "zkYear"), value: `${day(from)} – ${day(to)}` });
  } else if (place.id === "month") {
    const m = solarMonthAt(z.birthMs);
    facts.push({ label: cnWord(locale, "zkMonth"), value: `${day(m.fromMs)} – ${day(m.toMs)}` });
  }
  for (const r of z.relations) {
    if (!r.places.includes(place.id)) continue;
    const other = r.places[0] === place.id ? r.places[1] : r.places[0];
    facts.push({ label: chineseLabel(RELATION_NAMES[r.kind], locale, prefs).name, value: placeAnimal(z, other, locale), ref: relationRef(r) });
  }
  const paragraphs = [cnWord(locale, ROLE[place.id])];
  if (place.uncertain) paragraphs.push(cnWord(locale, z.timeUnknown ? "zkUncertainDay" : "zkUncertainNear"));
  if (place.id === "year" && z.newYearAnimal != null) paragraphs.push(cnWord(locale, "zkNewYear", { theAnimal: theAnimal(z.newYearAnimal, locale) }));
  return {
    id: placeRef(place.id),
    kind: "sign",
    title: pair.name,
    kicker: [cnWord(locale, PLACE_ANIMAL[place.id]), [pair.pinyin, pair.hanzi].filter(Boolean).join(" ")].filter(Boolean).join(" · "),
    lead: paragraphs[0],
    paragraphs,
    facts,
    sections: paragraphs.length > 1 ? [{ id: "more", title: cnWord(locale, "zkTitle"), paragraphs: paragraphs.slice(1) }] : undefined,
    mark: pair.hanzi ?? undefined,
    markSvg: drawn(place.branch, prefs),
    about: about(locale),
  };
}

/** An animal of the wheel: its branch, phase, double hour and month, and which of the reader's animals it is. */
function branchReading(z: ZodiacChart, branch: number, locale: string, prefs: Shown): ElementReading {
  const b = BRANCHES[branch]!;
  const label = chineseLabel(b, locale, prefs);
  const phase = PHASES.find((p) => p.id === b.phase)!;
  const pad = (h: number) => `${String(h).padStart(2, "0")}:00`;
  // A branch's month opens at the jie two before its solar month's index (Tiger, 0, at Lichun).
  const term = SOLAR_TERMS[b.solarMonth * 2]!;
  const lead = cnWord(locale, "zkBranchLead", {
    TheAnimal: theAnimal(branch, locale, true),
    branch: [label.pinyin, label.hanzi].filter(Boolean).join(" ") || b.id,
    phase: (locale === "fr" ? phase.fr : phase.en).toLowerCase(),
    from: pad(b.hours[0]),
    to: pad(b.hours[1]),
    term: chineseLabel(term, locale, prefs).text,
  });
  const mine = z.places.filter((p) => p.branch === branch).map((p) => cnWord(locale, PLACE_WORD[p.id]).toLowerCase());
  const facts: ReadingFact[] = [
    { label: cnWord(locale, "zkAnimalPhase"), value: chineseLabel(phase, locale, prefs).text },
    { label: cnWord(locale, "zkPolarity"), value: chineseLabel(POLARITY_NAMES[b.polarity], locale, prefs).text },
  ];
  for (const p of z.places) if (p.branch === branch) facts.push({ label: cnWord(locale, PLACE_ANIMAL[p.id]), value: chineseLabel(SIXTY[p.pillar.cycle]!, locale, prefs).text, ref: placeRef(p.id) });
  // How this animal meets each of the reader's (another person's year animal, a year's, a day's).
  for (const p of z.places) {
    for (const kind of branchRelations(branch, p.branch)) {
      facts.push({ label: chineseLabel(RELATION_NAMES[kind], locale, prefs).name, value: placeAnimal(z, p.id, locale), ref: placeRef(p.id) });
    }
  }
  const paragraphs = [lead];
  if (mine.length) paragraphs.push(cnWord(locale, "zkSectorYours", { places: mine.join(", ") }));
  return {
    id: branchRef(branch),
    kind: "sign",
    title: label.name,
    kicker: [label.pinyin, label.hanzi].filter(Boolean).join(" ") || cnWord(locale, "zkAnimal"),
    lead,
    paragraphs,
    facts,
    mark: label.hanzi ?? undefined,
    markSvg: drawn(branch, prefs),
    about: about(locale),
  };
}

/** A relation between two of the reader's animals: what the tradition reads there, the two animals, the trine's phase. */
function relationReading(z: ZodiacChart, r: PlacedRelation<ZodiacPlaceId>, locale: string, prefs: Shown): ElementReading {
  const name = chineseLabel(RELATION_NAMES[r.kind], locale, prefs);
  const facts: ReadingFact[] = r.places.map((id) => {
    const p = z.places.find((x) => x.id === id)!;
    return { label: cnWord(locale, PLACE_ANIMAL[id]), value: chineseLabel(SIXTY[p.pillar.cycle]!, locale, prefs).text, ref: placeRef(id) };
  });
  const paragraphs = [cnWord(locale, RELATION_TEXT[r.kind])];
  if (r.kind === "trine") {
    const phase = PHASES.find((p) => p.id === trineOf(r.branches[0]).phase)!;
    facts.push({ label: cnWord(locale, "zkAnimalPhase"), value: chineseLabel(phase, locale, prefs).text });
  }
  const whole = z.trines.find((t) => r.kind === "trine" && r.places.every((id) => t.places.includes(id)));
  if (whole) {
    const phase = PHASES.find((p) => p.id === whole.phase)!;
    paragraphs.push(
      cnWord(locale, "zkTrineFull", {
        places: whole.places.map((id) => cnWord(locale, PLACE_WORD[id]).toLowerCase()).join(", "),
        phase: (locale === "fr" ? phase.fr : phase.en).toLowerCase(),
      }),
    );
  }
  return {
    id: relationRef(r),
    kind: "aspect",
    title: name.name,
    kicker: [placeAnimal(z, r.places[0], locale), placeAnimal(z, r.places[1], locale)].join(" – "),
    lead: paragraphs[0],
    paragraphs,
    facts,
    mark: name.hanzi ?? undefined,
    about: about(locale),
  };
}

/** The reading of a selection on the page, or null when it is not the page's. */
export function zodiacReading(z: ZodiacChart, ref: string | null, locale: string, prefs: Shown, tz?: string): ElementReading | null {
  if (!ref) return null;
  const branch = /^zk:branch:(\d{1,2})$/.exec(ref);
  if (branch) return Number(branch[1]) < 12 ? branchReading(z, Number(branch[1]), locale, prefs) : null;
  if (ref.startsWith("zk:rel:")) {
    const rel = z.relations.find((r) => relationRef(r) === ref);
    return rel ? relationReading(z, rel, locale, prefs) : null;
  }
  const place = z.places.find((p) => placeRef(p.id) === ref);
  return place ? placeReading(z, place, locale, prefs, tz) : null;
}
