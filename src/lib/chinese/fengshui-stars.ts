/*
 * The Flying Stars (玄空飛星, Xuan Kong Fei Xing; languages plan, part 23:
 * "the Flying Star engine, formations, replacement charts"): a home's chart
 * from its period and its facing.
 *
 *   - The nine stars, each a number of the Lo Shu square with its colour
 *     and its classical name (一白貪狼 the 1 White, Tan Lang…).
 *   - The flight path through the nine palaces: the centre, then north-west,
 *     west, north-east, south, north, south-west, east, south-east, each
 *     palace one more (forward) or one less (backward) than the last.
 *   - The period chart (運盤): the period's number in the centre, forward.
 *   - The mountain star (山星): the period chart's number in the sitting
 *     palace goes to the centre; the water star (向星): the number in the
 *     facing palace. Each flies forward when the mountain in the same place
 *     (first, second or third) of that number's own palace is yang, backward
 *     when it is yin. A 5 has no palace: the home's own sitting (or facing)
 *     mountain decides.
 *   - The mountains' polarity (the Earth, Heaven and Man dragons): in the
 *     four cardinal palaces the first mountain is yang, the other two yin;
 *     in the four corner palaces the first is yin, the other two yang.
 *   - The replacement chart (替卦, Ti Gua), for a facing near a mountain's
 *     edge: the number going to the centre is replaced by the replacement
 *     star of that same mountain (the classical verse 子癸甲申貪狼一路行…),
 *     the direction unchanged. A 5 keeps its number.
 *   - The formations Ulune recognises over the whole chart: prosperous at
 *     sitting and facing (旺山旺向), reversed (上山下水), double facing,
 *     double sitting, the Combination of Ten (合十), the parent string
 *     (父母三般卦), the pearl string (連珠三般卦), and the repeated or
 *     opposed chart (伏吟, 反吟) when a 5 in the centre flies.
 *   - A star's state in a period: timely (the period's own star, and the two
 *     coming), waning (the one just past) or dormant (the others).
 *
 * Pure; tested in scripts/chinese-fengshui-stars.test.mjs against charts
 * worked by hand. Nothing is sent.
 */
import type { ChineseName, PhaseId } from "./names";
import type { DirectionId } from "./fengshui";
import { mountainById, type Mountain, type MountainId, type PeriodId } from "./fengshui-home";

export type StarNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type PalaceId = DirectionId | "c";

export type Star = ChineseName & {
  n: StarNumber;
  /** Its classical star name (貪狼 Tan Lang…), apart from the colour name above. */
  star: ChineseName;
  phase: PhaseId;
};

const S = (n: StarNumber, hant: string, hans: string, pinyin: string, en: string, fr: string, star: [string, string, string], phase: PhaseId): Star => ({
  n,
  hant,
  hans,
  pinyin,
  en: `${n} ${en}`,
  fr: `${n} ${fr}`,
  star: { hant: star[0], hans: star[1], pinyin: star[2], en: star[2].normalize("NFD").replace(/\p{M}/gu, "").replace(/(^|\s)./g, (c) => c.toUpperCase()), fr: star[2].normalize("NFD").replace(/\p{M}/gu, "").replace(/(^|\s)./g, (c) => c.toUpperCase()) },
  phase,
});

/** The nine stars, by their number. */
export const STARS: readonly Star[] = [
  S(1, "一白", "一白", "yī bái", "White", "Blanc", ["貪狼", "贪狼", "tān láng"], "water"),
  S(2, "二黑", "二黑", "èr hēi", "Black", "Noir", ["巨門", "巨门", "jù mén"], "earth"),
  S(3, "三碧", "三碧", "sān bì", "Jade", "Jade", ["祿存", "禄存", "lù cún"], "wood"),
  S(4, "四綠", "四绿", "sì lǜ", "Green", "Vert", ["文曲", "文曲", "wén qū"], "wood"),
  S(5, "五黃", "五黄", "wǔ huáng", "Yellow", "Jaune", ["廉貞", "廉贞", "lián zhēn"], "earth"),
  S(6, "六白", "六白", "liù bái", "White", "Blanc", ["武曲", "武曲", "wǔ qū"], "metal"),
  S(7, "七赤", "七赤", "qī chì", "Red", "Rouge", ["破軍", "破军", "pò jūn"], "metal"),
  S(8, "八白", "八白", "bā bái", "White", "Blanc", ["左輔", "左辅", "zuǒ fǔ"], "earth"),
  S(9, "九紫", "九紫", "jiǔ zǐ", "Purple", "Pourpre", ["右弼", "右弼", "yòu bì"], "fire"),
];
export const starOf = (n: number): Star => STARS[n - 1]!;

/** The flight path: the centre, then the palaces in the Lo Shu's order of numbers 5, 6, 7, 8, 9, 1, 2, 3, 4. */
export const FLIGHT: readonly PalaceId[] = ["c", "nw", "w", "ne", "s", "n", "sw", "e", "se"];
/** The palaces as the Lo Shu square sets them out, south at the top as the tradition draws it: rows of three. */
export const LO_SHU_ROWS: readonly (readonly PalaceId[])[] = [
  ["se", "s", "sw"],
  ["e", "c", "w"],
  ["ne", "n", "nw"],
];
/** The Lo Shu's own number in each palace (the chart of Period 5 itself). */
export const LO_SHU: Readonly<Record<PalaceId, StarNumber>> = { c: 5, nw: 6, w: 7, ne: 8, s: 9, n: 1, sw: 2, e: 3, se: 4 };
/** The palace whose own number a star is (5 has none). */
export const PALACE_OF: Readonly<Record<StarNumber, DirectionId | null>> = { 1: "n", 2: "sw", 3: "e", 4: "se", 5: null, 6: "nw", 7: "w", 8: "ne", 9: "s" };

const wrap = (n: number): StarNumber => ((((n - 1) % 9) + 9) % 9 + 1) as StarNumber;

/** A star flown through the nine palaces from the centre. */
export function fly(centre: StarNumber, forward: boolean): Record<PalaceId, StarNumber> {
  return Object.fromEntries(FLIGHT.map((p, i) => [p, wrap(centre + (forward ? i : -i))])) as Record<PalaceId, StarNumber>;
}

const CARDINAL: ReadonlySet<DirectionId> = new Set(["n", "e", "s", "w"]);
/** A mountain's polarity for the Flying Stars: in a cardinal palace the first is yang; in a corner palace the second and third. */
export function mountainYang(m: Mountain): boolean {
  return CARDINAL.has(m.direction) ? m.place === 1 : m.place !== 1;
}

/** The mountain in the same place (first, second, third) of another palace. */
export function counterpart(m: Mountain, palace: DirectionId): Mountain {
  const order: readonly DirectionId[] = ["n", "ne", "e", "se", "s", "sw", "w", "nw"];
  const idx = order.indexOf(palace) * 3 + (m.place - 1);
  const ids: readonly MountainId[] = ["ren", "zi", "gui", "chou", "gen", "yin", "jia", "mao", "yi", "chen", "xun", "si", "bing", "wu", "ding", "wei", "kun", "shen", "geng", "you", "xin", "xu", "qian", "hai"];
  return mountainById(ids[idx]!);
}

/** Each mountain's replacement star (替卦), after the classical verse: 子癸甲申 1; 壬卯乙未坤 2; 乾亥辰巽巳戌 6; 酉辛丑艮丙 7; 寅午庚丁 9. */
export const REPLACEMENT: Readonly<Record<MountainId, StarNumber>> = {
  zi: 1, gui: 1, jia: 1, shen: 1,
  ren: 2, mao: 2, yi: 2, wei: 2, kun: 2,
  qian: 6, hai: 6, chen: 6, xun: 6, si: 6, xu: 6,
  you: 7, xin: 7, chou: 7, gen: 7, bing: 7,
  yin: 9, wu: 9, geng: 9, ding: 9,
};

/** How one of the home's two stars was cast: the number met, the mountain that decided, what went to the centre, and the way it flew. */
export type Cast = {
  /** The period chart's number in the sitting (mountain star) or facing (water star) palace. */
  met: StarNumber;
  /** The mountain whose polarity decides: the counterpart in that number's palace, or the home's own for a 5. */
  by: MountainId;
  centre: StarNumber;
  forward: boolean;
  /** In a replacement chart, whether the centre's number was replaced. */
  replaced: boolean;
};

export type FormationId = "prosperous" | "reversed" | "double-facing" | "double-sitting" | "ten-mountain" | "ten-water" | "parent-string" | "pearl-string" | "fu-yin" | "fan-yin";

export type FlyingChart = {
  period: PeriodId;
  facing: MountainId;
  sitting: MountainId;
  replacement: boolean;
  /** Each palace's stars. */
  palaces: Record<PalaceId, { base: StarNumber; period: StarNumber; mountain: StarNumber; water: StarNumber }>;
  mountain: Cast;
  water: Cast;
  formations: FormationId[];
};

function castOne(periodChart: Record<PalaceId, StarNumber>, own: Mountain, replacement: boolean): Cast {
  const met = periodChart[own.direction];
  const palace = PALACE_OF[met];
  const by = palace ? counterpart(own, palace) : own;
  const forward = mountainYang(by);
  const centre = replacement && met !== 5 ? REPLACEMENT[by.id] : met;
  return { met, by: by.id, centre, forward, replaced: replacement && centre !== met };
}

/** A home's Flying Star chart from its period and its facing and sitting mountains; `replacement` for the Ti Gua. */
export function flyingChart(period: PeriodId, facingId: MountainId, sittingId: MountainId, replacement = false): FlyingChart {
  const facing = mountainById(facingId);
  const sitting = mountainById(sittingId);
  const periodChart = fly(period, true);
  const mountain = castOne(periodChart, sitting, replacement);
  const water = castOne(periodChart, facing, replacement);
  const m = fly(mountain.centre, mountain.forward);
  const w = fly(water.centre, water.forward);
  const palaces = Object.fromEntries(FLIGHT.map((p) => [p, { base: LO_SHU[p], period: periodChart[p], mountain: m[p], water: w[p] }])) as FlyingChart["palaces"];
  const chart: FlyingChart = { period, facing: facingId, sitting: sittingId, replacement, palaces, mountain, water, formations: [] };
  chart.formations = formationsOf(chart, facing.direction, sitting.direction);
  return chart;
}

const PARENT_GROUPS = [[1, 4, 7], [2, 5, 8], [3, 6, 9]].map((g) => g.join());

/** The formations a chart holds, in a fixed order. */
export function formationsOf(c: Pick<FlyingChart, "period" | "palaces" | "mountain" | "water">, facing: DirectionId, sitting: DirectionId): FormationId[] {
  const out: FormationId[] = [];
  const p = c.period;
  const atS = c.palaces[sitting];
  const atF = c.palaces[facing];
  if (atS.mountain === p && atF.water === p) out.push("prosperous");
  if (atF.mountain === p && atS.water === p) out.push("reversed");
  if (atF.mountain === p && atF.water === p) out.push("double-facing");
  if (atS.mountain === p && atS.water === p) out.push("double-sitting");
  const all = FLIGHT.map((id) => c.palaces[id]);
  if (all.every((x) => x.period + x.mountain === 10)) out.push("ten-mountain");
  if (all.every((x) => x.period + x.water === 10)) out.push("ten-water");
  if (all.every((x) => PARENT_GROUPS.includes([x.period, x.mountain, x.water].sort((a, b) => a - b).join()))) out.push("parent-string");
  if (
    all.every((x) => {
      const s = [x.period, x.mountain, x.water].sort((a, b) => a - b);
      // Three in a row, the nine closing on the one (8, 9, 1 and 9, 1, 2).
      const k = s.join();
      return (s[1] === s[0] + 1 && s[2] === s[1] + 1) || k === "1,8,9" || k === "1,2,9";
    })
  )
    out.push("pearl-string");
  if (c.mountain.centre === 5 || c.water.centre === 5) {
    const five = [c.mountain, c.water].filter((x) => x.centre === 5);
    if (five.some((x) => x.forward)) out.push("fu-yin");
    if (five.some((x) => !x.forward)) out.push("fan-yin");
  }
  return out;
}

export type StarState = "timely" | "waning" | "dormant";

/** A star's state in a period: timely (the period's own, or one of the two coming), waning (the one just past), dormant (the others). */
export function starState(n: StarNumber, period: PeriodId): { state: StarState; current: boolean } {
  const ahead = (((n - period) % 9) + 9) % 9;
  if (ahead === 0) return { state: "timely", current: true };
  if (ahead === 1 || ahead === 2) return { state: "timely", current: false };
  if (ahead === 8) return { state: "waning", current: false };
  return { state: "dormant", current: false };
}
