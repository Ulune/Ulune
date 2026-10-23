/*
 * BaZi's analysis (languages plan, part 15: "phase balance, strength,
 * structure, favourable phases"), each by a stated method the reader can
 * check, never a verdict to believe:
 *
 *   - The five phases counted: each visible stem 1 point (the Day Master
 *     too); each hidden stem by its weight (100 = 1 point, 70 = 0.7…); the
 *     month branch's hidden stems twice, for the season. With four pillars
 *     that is nine points.
 *   - The Day Master's strength from the three classic tests: born in
 *     season (得令: the month's main qi is the Day Master's phase or the
 *     one producing it), rooted (得地: a branch holds a stem of its phase),
 *     supported (得勢: at least half the other visible stems are of its
 *     phase or produce it). The season counts twice: 3 or 4 is strong, 2
 *     balanced, 0 or 1 weak.
 *   - The structure (格局) from the month branch, after the Zi Ping Zhen
 *     Quan: the Prosperity (建祿) or Sword Edge (羊刃) structure when the
 *     month is the Day Master's own branch; otherwise the god of the
 *     month's hidden stem that shows among the stems, or else of its main
 *     qi. The "follow" structures are flagged when the support is very
 *     high or very low, with no counterweight, and said to be disputed.
 *   - The favourable phases by balance (a strong Day Master is helped by
 *     what it produces, controls and is controlled by; a weak one by its
 *     own phase and what produces it), the most needed being the one the
 *     chart holds least; and by climate (調候: a winter chart wants Fire, a
 *     summer one Water; spring and autumn are mild), as a second view.
 *
 * Pure: tested in scripts/chinese-bazi-balance.test.mjs.
 */
import { HIDDEN_STEMS, PHASES, STEMS, type ChineseName, type PhaseId } from "./names";
import { familyOf, tenGodOf, type BaziChart, type BaziPlaceId, type GodFamily, type TenGodId } from "./bazi";
import { PROSPERITY, SWORD_EDGE } from "./bazi-signs";

export const PHASE_IDS: readonly PhaseId[] = PHASES.map((p) => p.id);
const round = (n: number) => Math.round(n * 100) / 100;

/** What a phase's count is made of: a visible stem, or a branch's hidden stem (the month's counted twice). */
export type PhasePart = { place: BaziPlaceId; kind: "stem" | "hidden"; stem: number; index?: number; points: number };
export type PhaseCount = { phase: PhaseId; points: number; share: number; family: GodFamily; parts: PhasePart[] };

export type StrengthId = "strong" | "balanced" | "weak";

export type StructureId =
  | "direct-officer"
  | "seven-killings"
  | "direct-wealth"
  | "indirect-wealth"
  | "direct-resource"
  | "indirect-resource"
  | "eating-god"
  | "hurting-officer"
  | "jian-lu"
  | "yang-ren";

export type SpecialId = "follow-strong" | "follow-output" | "follow-wealth" | "follow-power";

export const STRUCTURE_NAMES: Record<StructureId | SpecialId, ChineseName> = {
  "direct-officer": { hant: "正官格", hans: "正官格", pinyin: "zhèngguān gé", en: "Direct Officer structure", fr: "Structure de l’Officier direct" },
  "seven-killings": { hant: "七殺格", hans: "七杀格", pinyin: "qīshā gé", en: "Seven Killings structure", fr: "Structure des Sept Tueurs" },
  "direct-wealth": { hant: "正財格", hans: "正财格", pinyin: "zhèngcái gé", en: "Direct Wealth structure", fr: "Structure de la Richesse directe" },
  "indirect-wealth": { hant: "偏財格", hans: "偏财格", pinyin: "piāncái gé", en: "Indirect Wealth structure", fr: "Structure de la Richesse indirecte" },
  "direct-resource": { hant: "正印格", hans: "正印格", pinyin: "zhèngyìn gé", en: "Direct Resource structure", fr: "Structure de la Ressource directe" },
  "indirect-resource": { hant: "偏印格", hans: "偏印格", pinyin: "piānyìn gé", en: "Indirect Resource structure", fr: "Structure de la Ressource indirecte" },
  "eating-god": { hant: "食神格", hans: "食神格", pinyin: "shíshén gé", en: "Eating God structure", fr: "Structure du Dieu nourricier" },
  "hurting-officer": { hant: "傷官格", hans: "伤官格", pinyin: "shāngguān gé", en: "Hurting Officer structure", fr: "Structure de l’Officier blessant" },
  "jian-lu": { hant: "建祿格", hans: "建禄格", pinyin: "jiànlù gé", en: "Prosperity structure", fr: "Structure de prospérité" },
  "yang-ren": { hant: "羊刃格", hans: "羊刃格", pinyin: "yángrèn gé", en: "Sword Edge structure", fr: "Structure de la Lame" },
  "follow-strong": { hant: "專旺格", hans: "专旺格", pinyin: "zhuānwàng gé", en: "Dominant structure", fr: "Structure dominante" },
  "follow-output": { hant: "從兒格", hans: "从儿格", pinyin: "cóng’ér gé", en: "Follow Output", fr: "Suivre l’expression" },
  "follow-wealth": { hant: "從財格", hans: "从财格", pinyin: "cóngcái gé", en: "Follow Wealth", fr: "Suivre la richesse" },
  "follow-power": { hant: "從殺格", hans: "从杀格", pinyin: "cóngshā gé", en: "Follow Power", fr: "Suivre le pouvoir" },
};

export type Structure = {
  id: StructureId;
  /** How it was found: the month is the Day Master's Prosperity or Sword Edge branch, a month's hidden stem shows among the stems, or the month's main qi. */
  via: "lu" | "ren" | "revealed" | "main";
  /** The month's hidden stem it comes from (for "revealed" and "main"). */
  stem?: number;
  /** Where that stem shows (for "revealed"). */
  shownAt?: BaziPlaceId;
};

export type Tests = {
  season: { met: boolean; month: number; main: number; family: GodFamily };
  root: { met: boolean; roots: { place: BaziPlaceId; stem: number; index: number; weight: number }[] };
  support: { met: boolean; helpers: BaziPlaceId[]; others: BaziPlaceId[] };
};

export type Season = "spring" | "summer" | "autumn" | "winter";

export type BaziBalance = {
  phases: PhaseCount[];
  total: number;
  dmPhase: PhaseId;
  /** The share of the Day Master's own phase and the one producing it. */
  support: number;
  tests: Tests;
  /** The tests' score, the season counting twice (0–4). */
  score: number;
  strength: StrengthId;
  structure: Structure;
  /** A "follow" structure, when the chart meets its conditions. */
  special: SpecialId | null;
  favourable: {
    /** By balance: the families that help, as phases, the most needed first. */
    good: PhaseId[];
    bad: PhaseId[];
    /** By climate: the season of the month, and the phase it asks for (null in a mild month). */
    season: Season;
    climate: PhaseId | null;
  };
};

const FAMILY_ORDER: readonly GodFamily[] = ["peer", "output", "wealth", "power", "resource"];

/** The phase standing in a family to a Day Master's phase. */
export function phaseOfFamily(dm: PhaseId, family: GodFamily): PhaseId {
  return PHASE_IDS[(PHASE_IDS.indexOf(dm) + FAMILY_ORDER.indexOf(family)) % 5]!;
}

/** The season of a month branch: Yin, Mao, Chen spring; Si, Wu, Wei summer; Shen, You, Xu autumn; Hai, Zi, Chou winter. */
export function seasonOf(month: number): Season {
  const m = ((month % 12) + 12) % 12;
  if ([2, 3, 4].includes(m)) return "spring";
  if ([5, 6, 7].includes(m)) return "summer";
  if ([8, 9, 10].includes(m)) return "autumn";
  return "winter";
}

/**
 * The climate's need (調候), in its broad form: the winter months (Hai, Zi,
 * Chou) want Fire's warmth, the summer months (Si, Wu, Wei) Water's
 * moisture; spring and autumn are mild, and the balance leads. (The
 * classical tables, the Qiong Tong Bao Jian's, go Day Master by month; they
 * may come with the readings.)
 */
export function climateNeed(month: number): PhaseId | null {
  const s = seasonOf(month);
  return s === "winter" ? "fire" : s === "summer" ? "water" : null;
}

const STRUCTURE_OF_GOD: Partial<Record<TenGodId, StructureId>> = {
  "direct-officer": "direct-officer",
  "seven-killings": "seven-killings",
  "direct-wealth": "direct-wealth",
  "indirect-wealth": "indirect-wealth",
  "direct-resource": "direct-resource",
  "indirect-resource": "indirect-resource",
  "eating-god": "eating-god",
  "hurting-officer": "hurting-officer",
};

/** The structure, from the month branch (see the header). */
export function structureOf(c: BaziChart): Structure {
  const dm = c.dayMaster;
  const month = c.pillars.find((p) => p.id === "month")!;
  if (month.branch === PROSPERITY[dm]) return { id: "jian-lu", via: "lu" };
  if (SWORD_EDGE[dm] != null && month.branch === SWORD_EDGE[dm]) return { id: "yang-ren", via: "ren" };
  const hidden = HIDDEN_STEMS[month.branch]!.map((h) => h.stem).filter((s) => tenGodOf(dm, s).family !== "peer");
  const shown = c.pillars.filter((p) => p.id !== "day");
  for (const s of hidden) {
    const at = shown.find((p) => p.stem === s);
    if (at) return { id: STRUCTURE_OF_GOD[tenGodOf(dm, s).id]!, via: "revealed", stem: s, shownAt: at.id };
  }
  const main = hidden[0] ?? HIDDEN_STEMS[month.branch]![0]!.stem;
  const god = tenGodOf(dm, main).id;
  return { id: STRUCTURE_OF_GOD[god] ?? "jian-lu", via: "main", stem: main };
}

export function baziBalance(c: BaziChart): BaziBalance {
  const dm = c.dayMaster;
  const dmPhase = STEMS[dm]!.phase;
  const parts: PhasePart[] = [];
  for (const p of c.pillars) {
    parts.push({ place: p.id, kind: "stem", stem: p.stem, points: 1 });
    const times = p.id === "month" ? 2 : 1;
    p.hidden.forEach((h, index) => parts.push({ place: p.id, kind: "hidden", stem: h.stem, index, points: round((h.weight / 100) * times) }));
  }
  const total = round(parts.reduce((s, x) => s + x.points, 0));
  const phases: PhaseCount[] = PHASE_IDS.map((phase) => {
    const mine = parts.filter((x) => STEMS[x.stem]!.phase === phase);
    const points = round(mine.reduce((s, x) => s + x.points, 0));
    return { phase, points, share: total ? points / total : 0, family: familyOf(dmPhase, phase), parts: mine };
  });
  const pointsOf = (f: GodFamily) => phases.find((x) => x.family === f)!.points;
  const support = total ? (pointsOf("peer") + pointsOf("resource")) / total : 0;

  // The three tests.
  const month = c.pillars.find((p) => p.id === "month")!;
  const main = HIDDEN_STEMS[month.branch]![0]!.stem;
  const seasonFamily = familyOf(dmPhase, STEMS[main]!.phase);
  const roots = c.pillars.flatMap((p) => p.hidden.map((h, index) => ({ place: p.id, stem: h.stem, index, weight: h.weight })).filter((h) => STEMS[h.stem]!.phase === dmPhase));
  const others = c.pillars.filter((p) => p.id !== "day");
  const helpers = others.filter((p) => ["peer", "resource"].includes(familyOf(dmPhase, STEMS[p.stem]!.phase))).map((p) => p.id);
  const tests: Tests = {
    season: { met: seasonFamily === "peer" || seasonFamily === "resource", month: month.branch, main, family: seasonFamily },
    root: { met: roots.length > 0, roots },
    support: { met: others.length > 0 && helpers.length * 2 >= others.length, helpers, others: others.map((p) => p.id) },
  };
  const score = (tests.season.met ? 2 : 0) + (tests.root.met ? 1 : 0) + (tests.support.met ? 1 : 0);
  const strength: StrengthId = score >= 3 ? "strong" : score === 2 ? "balanced" : "weak";

  // The "follow" structures: almost all support and no power showing, or almost none, unrooted, with no helper among the stems.
  let special: SpecialId | null = null;
  const powerShown = others.some((p) => familyOf(dmPhase, STEMS[p.stem]!.phase) === "power");
  if (support >= 0.8 && !powerShown) special = "follow-strong";
  else if (support <= 0.2 && !tests.root.met && helpers.length === 0) {
    const top = (["output", "wealth", "power"] as const).map((f) => [f, pointsOf(f)] as const).sort((a, b) => b[1] - a[1])[0]![0];
    special = top === "output" ? "follow-output" : top === "wealth" ? "follow-wealth" : "follow-power";
  }

  // Favourable by balance: the helping families, the most needed (the least held) first.
  const lean = special === "follow-strong" ? "with" : special ? "against" : strength === "weak" ? "with" : strength === "strong" ? "against" : "even";
  const withFamilies: GodFamily[] = special === "follow-strong" ? ["peer", "resource", "output"] : ["peer", "resource"];
  const againstFamilies: GodFamily[] = ["output", "wealth", "power"];
  const byNeed = (fs: readonly GodFamily[]) => fs.map((f) => phaseOfFamily(dmPhase, f)).sort((a, b) => phases.find((x) => x.phase === a)!.points - phases.find((x) => x.phase === b)!.points);
  let good: PhaseId[];
  let bad: PhaseId[];
  if (lean === "with") {
    good = byNeed(withFamilies);
    bad = byNeed(FAMILY_ORDER.filter((f) => !withFamilies.includes(f)));
  } else if (lean === "against") {
    good = byNeed(againstFamilies);
    bad = byNeed(["peer", "resource"]);
  } else {
    // Balanced: keep it so; the phases the chart holds least are the ones to tend.
    const sorted = [...phases].sort((a, b) => a.points - b.points);
    good = sorted.slice(0, 2).map((x) => x.phase);
    bad = sorted.slice(-1).map((x) => x.phase);
  }

  return {
    phases,
    total,
    dmPhase,
    support,
    tests,
    score,
    strength,
    structure: structureOf(c),
    special,
    favourable: { good, bad, season: seasonOf(month.branch), climate: climateNeed(month.branch) },
  };
}
