/*
 * What Chinese astrology's page says about a chosen animal (languages plan,
 * part 7): its place and what the tradition reads there, its pillar, stem,
 * branch, phase and Na Yin, when its year or month runs, and whether the
 * birth time could change it. The written portraits of each animal and
 * phase come with part 10; these are the facts and the tradition's frame.
 */
import type { ElementReading, ReadingFact } from "@/lib/chart/types";
import { BRANCHES, PHASES, POLARITY_NAMES, SIXTY, SOLAR_TERMS, STEMS } from "./names";
import { chineseLabel, type ChinesePrefs } from "./prefs";
import { LICHUN, termMs } from "./terms";
import { solarMonthAt } from "./pillars";
import { cnWord, theAnimal, type ChineseWordKey } from "./words";
import type { ZodiacChart, ZodiacPlace, ZodiacPlaceId } from "./zodiac";

type Shown = Pick<ChinesePrefs, "script" | "show">;

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
    about: about(locale),
  };
}

/** The reading of a selection on the page, or null when it is not the page's. */
export function zodiacReading(z: ZodiacChart, ref: string | null, locale: string, prefs: Shown, tz?: string): ElementReading | null {
  if (!ref) return null;
  const branch = /^zk:branch:(\d{1,2})$/.exec(ref);
  if (branch) return Number(branch[1]) < 12 ? branchReading(z, Number(branch[1]), locale, prefs) : null;
  const place = z.places.find((p) => placeRef(p.id) === ref);
  return place ? placeReading(z, place, locale, prefs, tz) : null;
}
