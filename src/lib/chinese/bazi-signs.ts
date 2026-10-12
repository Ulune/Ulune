/*
 * BaZi's secondary layers (languages plan, part 13): the twelve life stages
 * of the Day Master in each branch (十二長生), each pillar's Na Yin (納音),
 * the empty branches (空亡 kōngwáng) of the day's ten-day week, and about
 * fifteen common symbolic stars (神煞 shénshà). Pure tables and arithmetic,
 * each written as the classical verses give it and tested against them
 * (scripts/chinese-bazi-signs.test.mjs).
 *
 * The stars are secondary signs, as most schools weigh them: each is found
 * from one base (the day stem, the year and day branches, or the month
 * branch) as the tradition most often teaches it; where schools differ
 * (the Sword Edge of the yin stems, the bases of the trine stars) Ulune says
 * which it follows.
 */
import { naYinOf, type ChineseName, type NaYin } from "./names";
import type { BaziChart, BaziPlaceId } from "./bazi";

// ── The twelve life stages ───────────────────────────────────────────────────

export type StageId =
  | "birth"
  | "bath"
  | "crown"
  | "prosperity"
  | "peak"
  | "decline"
  | "sickness"
  | "death"
  | "tomb"
  | "extinction"
  | "conception"
  | "nurture";

export type Stage = ChineseName & { id: StageId; index: number };

/** The twelve stages (十二長生) in their order round the cycle. */
export const STAGES: readonly Stage[] = [
  { index: 0, id: "birth", hant: "長生", hans: "长生", pinyin: "chángshēng", en: "Birth", fr: "Naissance" },
  { index: 1, id: "bath", hant: "沐浴", hans: "沐浴", pinyin: "mùyù", en: "Bath", fr: "Bain" },
  { index: 2, id: "crown", hant: "冠帶", hans: "冠带", pinyin: "guàndài", en: "Crown", fr: "Couronne" },
  { index: 3, id: "prosperity", hant: "臨官", hans: "临官", pinyin: "línguān", en: "Prosperity", fr: "Prospérité" },
  { index: 4, id: "peak", hant: "帝旺", hans: "帝旺", pinyin: "dìwàng", en: "Peak", fr: "Apogée" },
  { index: 5, id: "decline", hant: "衰", hans: "衰", pinyin: "shuāi", en: "Decline", fr: "Déclin" },
  { index: 6, id: "sickness", hant: "病", hans: "病", pinyin: "bìng", en: "Sickness", fr: "Maladie" },
  { index: 7, id: "death", hant: "死", hans: "死", pinyin: "sǐ", en: "Death", fr: "Mort" },
  { index: 8, id: "tomb", hant: "墓", hans: "墓", pinyin: "mù", en: "Tomb", fr: "Tombe" },
  { index: 9, id: "extinction", hant: "絕", hans: "绝", pinyin: "jué", en: "Extinction", fr: "Extinction" },
  { index: 10, id: "conception", hant: "胎", hans: "胎", pinyin: "tāi", en: "Conception", fr: "Conception" },
  { index: 11, id: "nurture", hant: "養", hans: "养", pinyin: "yǎng", en: "Nurture", fr: "Nourrissement" },
];

/**
 * The branch where each stem is born (長生): Jia in Hai, Bing and Wu in Yin,
 * Geng in Si, Ren in Shen; Yi in Wu, Ding and Ji in You, Xin in Zi, Gui in
 * Mao. Earth follows Fire, as the Zi Ping school counts it.
 */
export const BIRTH_BRANCH = [11, 6, 2, 9, 2, 9, 5, 0, 8, 3];

/** A stem's stage in a branch: the yang stems go forward round the branches, the yin stems backward. */
export function stageOf(stem: number, branch: number): Stage {
  const s = ((stem % 10) + 10) % 10;
  const b = ((branch % 12) + 12) % 12;
  const birth = BIRTH_BRANCH[s]!;
  const k = s % 2 === 0 ? (b - birth + 12) % 12 : (birth - b + 12) % 12;
  return STAGES[k]!;
}

// ── The empty branches ───────────────────────────────────────────────────────

/** The two branches a ten-day week (旬) leaves out: of the week the day pillar is in. */
export function emptyBranchesOf(dayCycle: number): [number, number] {
  const c = ((dayCycle % 60) + 60) % 60;
  const first = (c % 12 - (c % 10) + 12) % 12;
  return [(first + 10) % 12, (first + 11) % 12];
}

// ── Symbolic stars ───────────────────────────────────────────────────────────

export type StarId =
  | "nobleman"
  | "academic"
  | "prosperity-star"
  | "golden-carriage"
  | "sword-edge"
  | "peach-blossom"
  | "travelling-horse"
  | "canopy"
  | "general"
  | "heavenly-virtue"
  | "monthly-virtue"
  | "red-phoenix"
  | "heavenly-joy"
  | "three-wonders";

/** What a star is read from, for its reading's facts. */
export type StarBase = "day-stem" | "year-day-branch" | "month-branch" | "year-branch" | "stems";

export type Star = ChineseName & { id: StarId; base: StarBase };

export const STARS: readonly Star[] = [
  { id: "nobleman", base: "day-stem", hant: "天乙貴人", hans: "天乙贵人", pinyin: "tiānyǐ guìrén", en: "Nobleman", fr: "Noble céleste" },
  { id: "academic", base: "day-stem", hant: "文昌", hans: "文昌", pinyin: "wénchāng", en: "Academic", fr: "Étoile des lettres" },
  { id: "prosperity-star", base: "day-stem", hant: "祿神", hans: "禄神", pinyin: "lùshén", en: "Prosperity star", fr: "Étoile de prospérité" },
  { id: "golden-carriage", base: "day-stem", hant: "金輿", hans: "金舆", pinyin: "jīnyú", en: "Golden Carriage", fr: "Char d’or" },
  { id: "sword-edge", base: "day-stem", hant: "羊刃", hans: "羊刃", pinyin: "yángrèn", en: "Sword Edge", fr: "Lame" },
  { id: "peach-blossom", base: "year-day-branch", hant: "桃花", hans: "桃花", pinyin: "táohuā", en: "Peach Blossom", fr: "Fleur de pêcher" },
  { id: "travelling-horse", base: "year-day-branch", hant: "驛馬", hans: "驿马", pinyin: "yìmǎ", en: "Travelling Horse", fr: "Cheval voyageur" },
  { id: "canopy", base: "year-day-branch", hant: "華蓋", hans: "华盖", pinyin: "huágài", en: "Canopy", fr: "Dais" },
  { id: "general", base: "year-day-branch", hant: "將星", hans: "将星", pinyin: "jiàngxīng", en: "General", fr: "Général" },
  { id: "heavenly-virtue", base: "month-branch", hant: "天德", hans: "天德", pinyin: "tiāndé", en: "Heavenly Virtue", fr: "Vertu céleste" },
  { id: "monthly-virtue", base: "month-branch", hant: "月德", hans: "月德", pinyin: "yuèdé", en: "Monthly Virtue", fr: "Vertu du mois" },
  { id: "red-phoenix", base: "year-branch", hant: "紅鸞", hans: "红鸾", pinyin: "hóngluán", en: "Red Phoenix", fr: "Phénix rouge" },
  { id: "heavenly-joy", base: "year-branch", hant: "天喜", hans: "天喜", pinyin: "tiānxǐ", en: "Heavenly Joy", fr: "Joie céleste" },
  { id: "three-wonders", base: "stems", hant: "三奇", hans: "三奇", pinyin: "sānqí", en: "Three Wonders", fr: "Trois Merveilles" },
];

export const starById = (id: StarId): Star => STARS.find((s) => s.id === id)!;

/** 甲戊庚牛羊，乙己鼠猴鄉，丙丁豬雞位，壬癸兔蛇藏，六辛逢馬虎: the Nobleman's two branches for each day stem. */
export const NOBLEMAN: readonly (readonly [number, number])[] = [
  [1, 7], [0, 8], [11, 9], [11, 9], [1, 7], [0, 8], [1, 7], [6, 2], [5, 3], [5, 3],
];
/** The Academic star's branch for each day stem. */
export const ACADEMIC = [5, 6, 8, 9, 8, 9, 11, 0, 2, 3];
/** The Prosperity star (祿) for each day stem: the branch where it is at its Prosperity stage. */
export const PROSPERITY = [2, 3, 5, 6, 5, 6, 8, 9, 11, 0];
/** The Sword Edge (羊刃) of the yang stems, the branch of their Peak; the yin stems' is disputed, and Ulune leaves it out. */
export const SWORD_EDGE: readonly (number | null)[] = [3, null, 6, null, 6, null, 9, null, 0, null];

// For each trine (Shen-Zi-Chen, Hai-Mao-Wei, Yin-Wu-Xu, Si-You-Chou): its Peach Blossom, Horse, Canopy and General.
export const TRINE_STARS: Record<"peach-blossom" | "travelling-horse" | "canopy" | "general", readonly number[]> = {
  "peach-blossom": [9, 0, 3, 6],
  "travelling-horse": [2, 5, 8, 11],
  canopy: [4, 7, 10, 1],
  general: [0, 3, 6, 9],
};
/** Which of the four trines a branch is in: 0 Water (Shen-Zi-Chen), 1 Wood (Hai-Mao-Wei), 2 Fire (Yin-Wu-Xu), 3 Metal (Si-You-Chou). */
export const trineOfBranch = (b: number): number => {
  const x = ((b % 12) + 12) % 12;
  if ([8, 0, 4].includes(x)) return 0;
  if ([11, 3, 7].includes(x)) return 1;
  if ([2, 6, 10].includes(x)) return 2;
  return 3;
};

/** Heavenly Virtue (天德) by the month branch: a stem ("s") or a branch ("b"). */
export const HEAVENLY_VIRTUE: readonly { s?: number; b?: number }[] = [
  { b: 5 }, // Zi month → Si
  { s: 6 }, // Chou → Geng
  { s: 3 }, // Yin → Ding
  { b: 8 }, // Mao → Shen
  { s: 8 }, // Chen → Ren
  { s: 7 }, // Si → Xin
  { b: 11 }, // Wu → Hai
  { s: 0 }, // Wei → Jia
  { s: 9 }, // Shen → Gui
  { b: 2 }, // You → Yin
  { s: 2 }, // Xu → Bing
  { s: 1 }, // Hai → Yi
];
/** Monthly Virtue (月德) by the month branch's trine: Water Ren, Wood Jia, Fire Bing, Metal Geng. */
export const MONTHLY_VIRTUE = [8, 0, 2, 6];

/** Where a star was looked for: from the Day Master, from a pillar's branch, or the stems in order; what it looks for; where it was found. */
export type StarSource = {
  from: "dm" | BaziPlaceId | "stems";
  /** The branches it looks for, or the stem (Heavenly and Monthly Virtue), or the stems in order (Three Wonders). */
  branches?: number[];
  stems?: number[];
  places: BaziPlaceId[];
};

export type StarHit = { id: StarId; places: BaziPlaceId[]; sources: StarSource[] };

/** The Three Wonders: Jia-Wu-Geng (of heaven), Yi-Bing-Ding (of earth), Ren-Gui-Xin (of man). */
export const WONDERS: readonly (readonly [number, number, number])[] = [
  [0, 4, 6],
  [1, 2, 3],
  [8, 9, 7],
];

/** The four trines' phases, in TRINE_STARS's order. */
export const TRINE_PHASES = ["water", "wood", "fire", "metal"] as const;

/** The symbolic stars a chart holds, each with the pillars it falls in and why. */
export function starsOf(c: BaziChart): StarHit[] {
  const order = c.pillars.map((p) => p.id);
  const dm = c.dayMaster;
  const year = c.pillars.find((p) => p.id === "year")!;
  const month = c.pillars.find((p) => p.id === "month")!;
  const day = c.pillars.find((p) => p.id === "day")!;
  const hits: StarHit[] = [];
  const branchesAt = (branches: number[], except?: BaziPlaceId) =>
    c.pillars.filter((p) => p.id !== except && branches.includes(p.branch)).map((p) => p.id);
  const stemAt = (stem: number, except?: BaziPlaceId) => c.pillars.filter((p) => p.id !== except && p.stem === stem).map((p) => p.id);
  const add = (id: StarId, sources: StarSource[]) => {
    const found = sources.filter((x) => x.places.length);
    const places = order.filter((p) => found.some((x) => x.places.includes(p)));
    if (places.length) hits.push({ id, places, sources: found });
  };
  const fromDm = (branches: number[]): StarSource[] => [{ from: "dm", branches, places: branchesAt(branches) }];
  add("nobleman", fromDm([...NOBLEMAN[dm]!]));
  add("academic", fromDm([ACADEMIC[dm]!]));
  add("prosperity-star", fromDm([PROSPERITY[dm]!]));
  add("golden-carriage", fromDm([(PROSPERITY[dm]! + 2) % 12]));
  const edge = SWORD_EDGE[dm];
  if (edge != null) add("sword-edge", fromDm([edge]));
  // The trine stars, from the year branch and from the day branch, falling on the other pillars.
  for (const id of ["peach-blossom", "travelling-horse", "canopy", "general"] as const) {
    const fromYear = TRINE_STARS[id][trineOfBranch(year.branch)]!;
    const fromDay = TRINE_STARS[id][trineOfBranch(day.branch)]!;
    add(id, [
      { from: "year", branches: [fromYear], places: branchesAt([fromYear], "year") },
      { from: "day", branches: [fromDay], places: branchesAt([fromDay], "day") },
    ]);
  }
  const hv = HEAVENLY_VIRTUE[month.branch]!;
  add("heavenly-virtue", [
    hv.s != null ? { from: "month", stems: [hv.s], places: stemAt(hv.s, "month") } : { from: "month", branches: [hv.b!], places: branchesAt([hv.b!], "month") },
  ]);
  const mv = MONTHLY_VIRTUE[trineOfBranch(month.branch)]!;
  add("monthly-virtue", [{ from: "month", stems: [mv], places: stemAt(mv, "month") }]);
  const phoenix = (((3 - year.branch) % 12) + 12) % 12;
  add("red-phoenix", [{ from: "year", branches: [phoenix], places: branchesAt([phoenix], "year") }]);
  const joy = (((9 - year.branch) % 12) + 12) % 12;
  add("heavenly-joy", [{ from: "year", branches: [joy], places: branchesAt([joy], "year") }]);
  // Three Wonders: three stems in their order on three pillars that follow each other (year-month-day or month-day-hour).
  const stems = c.pillars.map((p) => p.stem);
  const wonders: StarSource[] = [];
  for (let i = 0; i + 2 < stems.length; i += 1) {
    const w = WONDERS.find((x) => x[0] === stems[i] && x[1] === stems[i + 1] && x[2] === stems[i + 2]);
    if (w) wonders.push({ from: "stems", stems: [...w], places: c.pillars.slice(i, i + 3).map((p) => p.id) });
  }
  add("three-wonders", wonders);
  return hits;
}


/**
 * The stars a pillar arriving in time (a luck pillar, a year) brings to the
 * chart: the same tables, read from the chart's Day Master, year, day and
 * month, falling on the new pillar's branch or stem (the Three Wonders,
 * which need three pillars side by side, aside).
 */
export function starsForPillar(c: BaziChart, stem: number, branch: number): StarId[] {
  const dm = c.dayMaster;
  const year = c.pillars.find((p) => p.id === "year")!;
  const month = c.pillars.find((p) => p.id === "month")!;
  const day = c.pillars.find((p) => p.id === "day")!;
  const out: StarId[] = [];
  if (NOBLEMAN[dm]!.includes(branch)) out.push("nobleman");
  if (ACADEMIC[dm] === branch) out.push("academic");
  if (PROSPERITY[dm] === branch) out.push("prosperity-star");
  if ((PROSPERITY[dm]! + 2) % 12 === branch) out.push("golden-carriage");
  if (SWORD_EDGE[dm] != null && SWORD_EDGE[dm] === branch) out.push("sword-edge");
  for (const id of ["peach-blossom", "travelling-horse", "canopy", "general"] as const) {
    if (TRINE_STARS[id][trineOfBranch(year.branch)] === branch || TRINE_STARS[id][trineOfBranch(day.branch)] === branch) out.push(id);
  }
  const hv = HEAVENLY_VIRTUE[month.branch]!;
  if (hv.s != null ? hv.s === stem : hv.b === branch) out.push("heavenly-virtue");
  if (MONTHLY_VIRTUE[trineOfBranch(month.branch)] === stem) out.push("monthly-virtue");
  if ((((3 - year.branch) % 12) + 12) % 12 === branch) out.push("red-phoenix");
  if ((((9 - year.branch) % 12) + 12) % 12 === branch) out.push("heavenly-joy");
  return out;
}

// ── All of it, pillar by pillar ──────────────────────────────────────────────

export type PillarSigns = {
  place: BaziPlaceId;
  /** The Day Master's stage in this pillar's branch. */
  stage: Stage;
  naYin: NaYin;
  /** Its branch is one of the day's empty branches. */
  empty: boolean;
  stars: StarId[];
};

export type BaziSigns = {
  pillars: PillarSigns[];
  empty: [number, number];
  stars: StarHit[];
};

export function baziSigns(c: BaziChart): BaziSigns {
  const day = c.pillars.find((p) => p.id === "day")!;
  const empty = emptyBranchesOf(day.pillar.cycle);
  const stars = starsOf(c);
  return {
    empty,
    stars,
    pillars: c.pillars.map((p) => ({
      place: p.id,
      stage: stageOf(c.dayMaster, p.branch),
      naYin: naYinOf(p.pillar.cycle),
      empty: p.id !== "day" && empty.includes(p.branch),
      stars: stars.filter((s) => s.places.includes(p.id)).map((s) => s.id),
    })),
  };
}
