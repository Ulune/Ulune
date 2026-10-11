/*
 * BaZi's time (languages plan, part 16: "luck pillars (Da Yun): ten-year
 * pillars running forward or backward from the month pillar, starting at an
 * age computed from the days to the nearest term (three days to a year)…
 * years, months and days (Liu Nian, Liu Yue, Liu Ri): each new pillar's Ten
 * God for you and its interactions with your four pillars and your current
 * luck pillar").
 *
 *   - The direction: forward when the year stem's polarity and the
 *     tradition's count agree (a yang year and a yang count, a yin year and
 *     a yin count), backward otherwise. The count is the birth form's
 *     optional field (decision 4); without it, both directions are given.
 *   - The start: the days from the birth to the next jie (forward) or back to
 *     the last one (backward), three days making a year, so one day four
 *     months and one double hour ten days, as the Zi Ping school counts.
 *   - The pillars: from the month pillar, one step along the sixty-cycle per
 *     ten years, forward or back.
 *   - A year runs from Lichun to Lichun, its months from jie to jie; a day is
 *     the reader's calendar day.
 *   - What a new pillar meets: its stem's combinations and clashes with the
 *     chart's stems; its branch's harmonies, clashes, harms, punishments and
 *     destructions with the chart's branches, and the trines and seasonal
 *     trios it completes with two of them.
 *
 * Pure: tested in scripts/chinese-bazi-luck.test.mjs.
 */
import { HIDDEN_STEMS, STEMS, type PhaseId } from "./names";
import { pillarOf, type Pillar } from "./pillars";
import { yearCycleOf } from "./lunar";
import { LICHUN, jieAfter, jieAtOrBefore, termMs } from "./terms";
import { tenGodOf, type BaziChart, type BaziPlaceId, type TenGodId } from "./bazi";
import { harmonyPhase, SEASONS, stemClash, stemCombination, type InteractionKind } from "./bazi-interactions";
import { TRINES, branchRelations } from "./relations";

export type LuckCount = "yang" | "yin";
export type LuckDirection = "forward" | "backward";

const DAY_MS = 86_400_000;
const YEAR_MS = 365.2425 * DAY_MS;

/** The direction of the luck pillars: forward when the year stem's polarity and the count agree. */
export function luckDirection(yearStem: number, count: LuckCount): LuckDirection {
  const yang = STEMS[((yearStem % 10) + 10) % 10]!.polarity === "yang";
  return yang === (count === "yang") ? "forward" : "backward";
}

/** A place a new pillar can meet: one of the chart's four, or the luck pillar of the moment. */
export type MeetPlace = BaziPlaceId | "luck";

export type Meeting = {
  kind: Extract<InteractionKind, "stem-combination" | "stem-clash" | "harmony" | "trine" | "season" | "clash" | "harm" | "punishment" | "self-punishment" | "destruction">;
  level: "stem" | "branch";
  /** The places it meets (one for a pair; two for a trine or trio it completes). */
  with: MeetPlace[];
  phase?: PhaseId;
};

const MEETING_ORDER: readonly Meeting["kind"][] = ["stem-combination", "stem-clash", "season", "trine", "harmony", "clash", "punishment", "self-punishment", "harm", "destruction"];

/** What a pillar arriving in time (a luck pillar, a year, a month, a day) meets among placed pillars. */
export function meetingsOf(stem: number, branch: number, placed: readonly { place: MeetPlace; stem: number; branch: number }[]): Meeting[] {
  const out: Meeting[] = [];
  for (const p of placed) {
    const combo = stemCombination(stem, p.stem);
    if (combo) out.push({ kind: "stem-combination", level: "stem", with: [p.place], phase: combo });
    if (stemClash(stem, p.stem)) out.push({ kind: "stem-clash", level: "stem", with: [p.place] });
    const h = harmonyPhase(branch, p.branch);
    if (h) out.push({ kind: "harmony", level: "branch", with: [p.place], phase: h });
    for (const k of branchRelations(branch, p.branch)) {
      if (k === "harmony" || k === "trine") continue;
      out.push({ kind: k, level: "branch", with: [p.place] });
    }
  }
  // Trines and seasonal trios the new branch completes with two of the placed branches.
  for (const [kind, groups] of [
    ["season", SEASONS],
    ["trine", TRINES],
  ] as const) {
    for (const g of groups) {
      if (!g.branches.includes(branch)) continue;
      const others = g.branches.filter((b) => b !== branch);
      const found = others.map((b) => placed.find((p) => p.branch === b));
      if (found.every(Boolean)) out.push({ kind, level: "branch", with: found.map((p) => p!.place), phase: g.phase });
    }
  }
  return out.sort((a, b) => MEETING_ORDER.indexOf(a.kind) - MEETING_ORDER.indexOf(b.kind));
}

export type LuckPillar = {
  /** 1 for the first luck pillar. */
  index: number;
  pillar: Pillar;
  stem: number;
  branch: number;
  /** The stem's god, and the branch's main qi's. */
  god: TenGodId;
  branchGod: TenGodId;
  /** Ages (years, from the birth) and instants it runs between. */
  fromAge: number;
  toAge: number;
  fromMs: number;
  toMs: number;
  meets: Meeting[];
};

export type Luck = {
  count: LuckCount;
  direction: LuckDirection;
  /** The jie counted to, and the days between it and the birth. */
  jieMs: number;
  days: number;
  /** The start age: in years (a day is four months), and as years, months and days. */
  startAge: number;
  start: { years: number; months: number; days: number };
  startMs: number;
  pillars: LuckPillar[];
};

/** How many luck pillars Ulune lists: nine, to past ninety. */
export const LUCK_PILLARS = 9;

const natalPlaced = (c: BaziChart) => c.pillars.map((p) => ({ place: p.id as MeetPlace, stem: p.stem, branch: p.branch }));

/** The luck pillars of a chart, for one count. */
export function luckPillars(c: BaziChart, count: LuckCount): Luck {
  const year = c.pillars.find((p) => p.id === "year")!;
  const month = c.pillars.find((p) => p.id === "month")!;
  const direction = luckDirection(year.stem, count);
  const jie = direction === "forward" ? jieAfter(c.birthMs) : jieAtOrBefore(c.birthMs);
  const days = Math.abs(jie.ms - c.birthMs) / DAY_MS;
  const startAge = days / 3;
  // A day is four months; a month of age thirty days.
  const totalMonths = days * 4;
  const years = Math.floor(totalMonths / 12);
  const months = Math.floor(totalMonths - years * 12);
  const restDays = Math.floor((totalMonths - years * 12 - months) * 30);
  const startMs = c.birthMs + startAge * YEAR_MS;
  const step = direction === "forward" ? 1 : -1;
  const placed = natalPlaced(c);
  const pillars: LuckPillar[] = Array.from({ length: LUCK_PILLARS }, (_, i) => {
    const pillar = pillarOf(month.pillar.cycle + step * (i + 1));
    const fromAge = startAge + 10 * i;
    return {
      index: i + 1,
      pillar,
      stem: pillar.stem,
      branch: pillar.branch,
      god: tenGodOf(c.dayMaster, pillar.stem).id,
      branchGod: tenGodOf(c.dayMaster, HIDDEN_STEMS[pillar.branch]![0]!.stem).id,
      fromAge,
      toAge: fromAge + 10,
      fromMs: c.birthMs + fromAge * YEAR_MS,
      toMs: c.birthMs + (fromAge + 10) * YEAR_MS,
      meets: meetingsOf(pillar.stem, pillar.branch, placed),
    };
  });
  return { count, direction, jieMs: jie.ms, days, startAge, start: { years, months, days: restDays }, startMs, pillars };
}

/** The luck pillar running at an instant, or null before the first. */
export const luckAt = (luck: Luck, ms: number): LuckPillar | null => luck.pillars.find((p) => ms >= p.fromMs && ms < p.toMs) ?? null;

export type TimePillar = {
  pillar: Pillar;
  god: TenGodId;
  branchGod: TenGodId;
  fromMs: number;
  toMs: number;
  /** What it meets among the four pillars, and (for a year) the luck pillar running at its start, by count. */
  meets: Meeting[];
};

export type FlowYear = TimePillar & {
  /** The Gregorian year whose Lichun opens it. */
  year: number;
  months: (TimePillar & { index: number })[];
  /** The luck pillar running at the year's middle, by count, and what the year meets in it. */
  luck: { count: LuckCount; pillar: LuckPillar | null; meets: Meeting[] }[];
};

/** The jie that opens solar month `index` of the year opened by Lichun of `year`: Lichun … Daxue in that year, Xiaohan in the January after. */
const monthOpens = (year: number, index: number): number => (index < 11 ? termMs(year, 2 * index) : termMs(year + 1, 22));

function timePillar(c: BaziChart, pillar: Pillar, fromMs: number, toMs: number): TimePillar {
  return {
    pillar,
    god: tenGodOf(c.dayMaster, pillar.stem).id,
    branchGod: tenGodOf(c.dayMaster, HIDDEN_STEMS[pillar.branch]![0]!.stem).id,
    fromMs,
    toMs,
    meets: meetingsOf(pillar.stem, pillar.branch, natalPlaced(c)),
  };
}

/** A year of the flow (流年): its pillar and god, what it meets, its twelve months (流月), and the luck pillar it falls in for each count given. */
export function flowYear(c: BaziChart, year: number, lucks: readonly Luck[]): FlowYear {
  const fromMs = termMs(year, LICHUN);
  const toMs = termMs(year + 1, LICHUN);
  const base = timePillar(c, pillarOf(yearCycleOf(year)), fromMs, toMs);
  const months = Array.from({ length: 12 }, (_, index) => ({
    index,
    ...timePillar(c, pillarOf(12 * (year - 1984) + index + 2), monthOpens(year, index), index < 11 ? monthOpens(year, index + 1) : toMs),
  }));
  const mid = (fromMs + toMs) / 2;
  const luck = lucks.map((l) => {
    const pillar = luckAt(l, mid);
    return { count: l.count, pillar, meets: pillar ? meetingsOf(base.pillar.stem, base.pillar.branch, [{ place: "luck", stem: pillar.stem, branch: pillar.branch }]) : [] };
  });
  return { ...base, year, months, luck };
}

/** A day of the flow (流日): the day pillar of a calendar day (the cycle given by day-cycle.ts), its god and what it meets. */
export function flowDay(c: BaziChart, dayCycle: number): Omit<TimePillar, "fromMs" | "toMs"> {
  const pillar = pillarOf(dayCycle);
  const t = timePillar(c, pillar, 0, 0);
  return { pillar: t.pillar, god: t.god, branchGod: t.branchGod, meets: t.meets };
}

/** The solar year (by Lichun) an instant is in. */
export function flowYearOf(ms: number): number {
  const y = new Date(ms).getUTCFullYear();
  return ms >= termMs(y, LICHUN) ? y : y - 1;
}
