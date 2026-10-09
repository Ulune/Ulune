/*
 * BaZi, the Four Pillars of Destiny (languages plan, language 2, part 12:
 * "the pillar board: stems, branches, hidden stems, Ten Gods"). The four
 * pillars of a birth from the engine (pillars.ts), each a Heavenly Stem
 * over an Earthly Branch with the branch's hidden stems (main, middle and
 * residual qi, by weight), and the Day Master, the day's stem, around which
 * everything is read: every other stem, shown or hidden, is one of the Ten
 * Gods (十神 shíshén) by how its phase meets the Day Master's (the same,
 * produced, controlled, controlling, producing) and whether their
 * polarities agree.
 *
 * Pure: the birth comes from a cast chart's meta (zodiac.ts's
 * `birthMomentOf`), the clock and day boundary from Settings. Nothing
 * leaves the device. The life stages, Na Yin, empty branches and symbolic
 * stars come with part 13, the interactions with part 14.
 */
import { BRANCHES, HIDDEN_STEMS, PHASES, STEMS, type ChineseName, type PhaseId } from "./names";
import { fourPillars, type Clock, type DayBoundary, type FourPillars, type Pillar } from "./pillars";
import { birthMomentOf, type ZodiacBirth } from "./zodiac";

export type TenGodId =
  | "companion"
  | "rob-wealth"
  | "eating-god"
  | "hurting-officer"
  | "indirect-wealth"
  | "direct-wealth"
  | "seven-killings"
  | "direct-officer"
  | "indirect-resource"
  | "direct-resource";

/** The five families the Ten Gods pair into, each a way the other phase meets the Day Master's. */
export type GodFamily = "peer" | "output" | "wealth" | "power" | "resource";

export type TenGod = ChineseName & { id: TenGodId; family: GodFamily; samePolarity: boolean };

/**
 * The Ten Gods (十神), in the classical order of their families: peers (the
 * same phase), output (what the Day Master produces), wealth (what it
 * controls), power (what controls it), resource (what produces it); in each
 * family the one of the same polarity first. English and French are Ulune's,
 * after the names most English and French books use.
 */
export const TEN_GODS: readonly TenGod[] = [
  { id: "companion", family: "peer", samePolarity: true, hant: "比肩", hans: "比肩", pinyin: "bǐjiān", en: "Companion", fr: "Compagnon" },
  { id: "rob-wealth", family: "peer", samePolarity: false, hant: "劫財", hans: "劫财", pinyin: "jiécái", en: "Rob Wealth", fr: "Rival" },
  { id: "eating-god", family: "output", samePolarity: true, hant: "食神", hans: "食神", pinyin: "shíshén", en: "Eating God", fr: "Dieu nourricier" },
  { id: "hurting-officer", family: "output", samePolarity: false, hant: "傷官", hans: "伤官", pinyin: "shāngguān", en: "Hurting Officer", fr: "Officier blessant" },
  { id: "indirect-wealth", family: "wealth", samePolarity: true, hant: "偏財", hans: "偏财", pinyin: "piāncái", en: "Indirect Wealth", fr: "Richesse indirecte" },
  { id: "direct-wealth", family: "wealth", samePolarity: false, hant: "正財", hans: "正财", pinyin: "zhèngcái", en: "Direct Wealth", fr: "Richesse directe" },
  { id: "seven-killings", family: "power", samePolarity: true, hant: "七殺", hans: "七杀", pinyin: "qīshā", en: "Seven Killings", fr: "Sept Tueurs" },
  { id: "direct-officer", family: "power", samePolarity: false, hant: "正官", hans: "正官", pinyin: "zhèngguān", en: "Direct Officer", fr: "Officier direct" },
  { id: "indirect-resource", family: "resource", samePolarity: true, hant: "偏印", hans: "偏印", pinyin: "piānyìn", en: "Indirect Resource", fr: "Ressource indirecte" },
  { id: "direct-resource", family: "resource", samePolarity: false, hant: "正印", hans: "正印", pinyin: "zhèngyìn", en: "Direct Resource", fr: "Ressource directe" },
];

export const tenGodById = (id: TenGodId): TenGod => TEN_GODS.find((g) => g.id === id)!;

/** The Day Master's own name in the board: 日主 rìzhǔ. */
export const DAY_MASTER_NAME: ChineseName = { hant: "日主", hans: "日主", pinyin: "rìzhǔ", en: "Day Master", fr: "Maître du jour" };

const phaseIndex = (p: PhaseId) => PHASES.findIndex((x) => x.id === p);

/** The family of a phase against the Day Master's, by the generating cycle (Wood → Fire → Earth → Metal → Water). */
function familyOf(dm: PhaseId, other: PhaseId): GodFamily {
  const step = (phaseIndex(other) - phaseIndex(dm) + 5) % 5;
  // 0 the same; 1 the one it produces; 2 the one it controls; 3 the one that controls it; 4 the one that produces it.
  return (["peer", "output", "wealth", "power", "resource"] as const)[step]!;
}

/** The Ten God a stem is to a Day Master (both 0 = Jia … 9 = Gui). */
export function tenGodOf(dayMaster: number, stem: number): TenGod {
  const dm = STEMS[((dayMaster % 10) + 10) % 10]!;
  const s = STEMS[((stem % 10) + 10) % 10]!;
  const family = familyOf(dm.phase, s.phase);
  const same = dm.polarity === s.polarity;
  return TEN_GODS.find((g) => g.family === family && g.samePolarity === same)!;
}

export type BaziPlaceId = "year" | "month" | "day" | "hour";
export const BAZI_PLACES: readonly BaziPlaceId[] = ["year", "month", "day", "hour"];

export type HiddenStem = { stem: number; weight: number; god: TenGodId };

export type BaziPillar = {
  id: BaziPlaceId;
  pillar: Pillar;
  stem: number;
  branch: number;
  /** The stem's god; null for the day's, which is the Day Master itself. */
  god: TenGodId | null;
  /** The branch's hidden stems, the main qi first, each with its weight (100, 70–30 or 60–30–10) and god. */
  hidden: HiddenStem[];
  /** Another reading of the birth time could change it (pillars.ts). */
  uncertain: boolean;
};

export type BaziChart = {
  /** Year, month, day, and the hour when the birth time is known. */
  pillars: BaziPillar[];
  /** The day's stem, the self. */
  dayMaster: number;
  timeUnknown: boolean;
  birthMs: number;
  four: FourPillars;
  /** How many times each god stands in the chart, shown (stems) and hidden (in the branches). */
  gods: Record<TenGodId, { shown: number; hidden: number }>;
};

function pillarOfPlace(id: BaziPlaceId, pillar: Pillar, dayMaster: number, uncertain: boolean): BaziPillar {
  return {
    id,
    pillar,
    stem: pillar.stem,
    branch: pillar.branch,
    god: id === "day" ? null : tenGodOf(dayMaster, pillar.stem).id,
    hidden: HIDDEN_STEMS[pillar.branch]!.map((h) => ({ stem: h.stem, weight: h.weight, god: tenGodOf(dayMaster, h.stem).id })),
    uncertain,
  };
}

/** A birth's four pillars, its Day Master and its Ten Gods, on the reader's clock and day boundary. */
export function baziChart(birth: ZodiacBirth, options: { clock?: Clock; dayBoundary?: DayBoundary } = {}): BaziChart | null {
  const moment = birthMomentOf(birth);
  if (!moment) return null;
  const four = fourPillars(moment, { clock: options.clock, dayBoundary: options.dayBoundary });
  const dayMaster = four.day.stem;
  const pillars = [
    pillarOfPlace("year", four.year, dayMaster, four.uncertain.year),
    pillarOfPlace("month", four.month, dayMaster, four.uncertain.month),
    pillarOfPlace("day", four.day, dayMaster, four.uncertain.day),
  ];
  if (four.hour) pillars.push(pillarOfPlace("hour", four.hour, dayMaster, four.uncertain.hour));
  const gods = Object.fromEntries(TEN_GODS.map((g) => [g.id, { shown: 0, hidden: 0 }])) as BaziChart["gods"];
  for (const p of pillars) {
    if (p.god) gods[p.god].shown += 1;
    for (const h of p.hidden) gods[h.god].hidden += 1;
  }
  return { pillars, dayMaster, timeUnknown: Boolean(moment.timeUnknown), birthMs: moment.ms, four, gods };
}

/** The branch's own name and phase, for the board. */
export const branchOf = (b: number) => BRANCHES[((b % 12) + 12) % 12]!;
