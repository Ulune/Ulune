/*
 * Feng Shui, the home (languages plan, language 3, part 22: "the phone
 * compass and the facing input"): what a facing says before any star flies.
 *
 *   - The 24 mountains (二十四山), 15° each, from Ren at 337.5°: the eight
 *     directions split in three, by the stems (but Wu and Ji), the twelve
 *     branches and the four corner trigrams. A facing falls in one mountain;
 *     the home sits in the mountain opposite.
 *   - Near the edge of a mountain (within EDGE_DEGREES), many schools read a
 *     replacement chart (替卦, Ti Gua) for the Flying Stars; on the very line
 *     between two of the eight directions, a "void line" (空亡). The page
 *     says so, and asks for the facing again.
 *   - The house's trigram, as the Eight Mansions name a house: by its
 *     sitting direction (a home sitting north is a Kan house, East group).
 *     With the reader's Kua (fengshui.ts), whether the house is of their
 *     group, and which of their eight mansions it faces and sits in.
 *   - The building's period (元運), twenty years each from 1864, from the
 *     year it was built or fully renovated: Period 9 runs from Lichun 2024 to
 *     Lichun 2044.
 *   - Compass readings: a facing from three readings, by their circular mean
 *     and how far apart they are; a map's true bearing turned into the
 *     magnetic one a luopan reads, by the declination (geomag.ts).
 *
 * Pure; tested in scripts/chinese-fengshui-home.test.mjs. Nothing is sent:
 * the facing is typed or read from the device's own compass.
 */
import type { ChineseName } from "./names";
import { MANSIONS, trigramOfDirection, type DirectionId, type FengShui, type MansionId, type Trigram } from "./fengshui";

export type MountainId =
  | "ren" | "zi" | "gui" | "chou" | "gen" | "yin" | "jia" | "mao" | "yi" | "chen" | "xun" | "si"
  | "bing" | "wu" | "ding" | "wei" | "kun" | "shen" | "geng" | "you" | "xin" | "xu" | "qian" | "hai";

export type Mountain = ChineseName & {
  id: MountainId;
  index: number;
  /** Its centre, in degrees clockwise from north. */
  degrees: number;
  direction: DirectionId;
  /** Its place in its direction: 1, 2 (the middle, on the direction itself) or 3, clockwise ("S2"). */
  place: 1 | 2 | 3;
  kind: "stem" | "branch" | "trigram";
};

const M = (id: MountainId, hant: string, pinyin: string, kind: Mountain["kind"]) => ({ id, hant, hans: hant, pinyin, en: pinyin.normalize("NFD").replace(/\p{M}/gu, "").replace(/^./, (c) => c.toUpperCase()), fr: "", kind });
const RAW = [
  M("ren", "壬", "rén", "stem"), M("zi", "子", "zǐ", "branch"), M("gui", "癸", "guǐ", "stem"),
  M("chou", "丑", "chǒu", "branch"), M("gen", "艮", "gèn", "trigram"), M("yin", "寅", "yín", "branch"),
  M("jia", "甲", "jiǎ", "stem"), M("mao", "卯", "mǎo", "branch"), M("yi", "乙", "yǐ", "stem"),
  M("chen", "辰", "chén", "branch"), M("xun", "巽", "xùn", "trigram"), M("si", "巳", "sì", "branch"),
  M("bing", "丙", "bǐng", "stem"), M("wu", "午", "wǔ", "branch"), M("ding", "丁", "dīng", "stem"),
  M("wei", "未", "wèi", "branch"), M("kun", "坤", "kūn", "trigram"), M("shen", "申", "shēn", "branch"),
  M("geng", "庚", "gēng", "stem"), M("you", "酉", "yǒu", "branch"), M("xin", "辛", "xīn", "stem"),
  M("xu", "戌", "xū", "branch"), M("qian", "乾", "qián", "trigram"), M("hai", "亥", "hài", "branch"),
];
const DIRS: readonly DirectionId[] = ["n", "ne", "e", "se", "s", "sw", "w", "nw"];

/** The 24 mountains, clockwise from Ren (N1, 337.5°–352.5°). */
export const MOUNTAINS: readonly Mountain[] = RAW.map((m, index) => ({
  ...m,
  fr: m.en,
  index,
  degrees: (345 + index * 15) % 360,
  direction: DIRS[Math.floor(index / 3)]!,
  place: ((index % 3) + 1) as 1 | 2 | 3,
}));
export const mountainById = (id: MountainId): Mountain => MOUNTAINS.find((m) => m.id === id)!;

/** Many schools read a replacement chart within this many degrees of a mountain's edge. */
export const EDGE_DEGREES = 3;
/** On the line itself: within this many degrees, a void line (空亡). */
export const VOID_DEGREES = 1.5;

/** An angle in [0, 360). */
export const norm360 = (d: number): number => ((d % 360) + 360) % 360;

export function mountainAt(degrees: number): Mountain {
  return MOUNTAINS[Math.floor(norm360(degrees - 337.5) / 15)]!;
}

export type Edge = {
  /** Degrees to the nearest edge of the mountain. */
  distance: number;
  /** The mountain across that edge. */
  neighbour: Mountain;
  /** Between two of the eight directions (the outer lines of a direction), or two mountains of one direction. */
  between: "directions" | "mountains";
  /** Within EDGE_DEGREES: a replacement chart is likely; within VOID_DEGREES: on the void line. */
  level: "clear" | "replacement" | "void";
};

export function edgeOf(degrees: number): Edge {
  const off = norm360(degrees - 337.5) % 15;
  const m = mountainAt(degrees);
  const toNext = 15 - off;
  const next = toNext < off;
  const distance = Math.min(off, toNext);
  const neighbour = MOUNTAINS[(m.index + (next ? 1 : 23)) % 24]!;
  const between = neighbour.direction === m.direction ? "mountains" : "directions";
  const level = distance <= VOID_DEGREES ? "void" : distance < EDGE_DEGREES ? "replacement" : "clear";
  return { distance, neighbour, between, level };
}

/** The eight directions' share of the circle: a bearing's direction (N is 337.5°–22.5°). */
export const directionAt = (degrees: number): DirectionId => DIRS[Math.floor(norm360(degrees + 22.5) / 45)]!;

export type PeriodId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
/** The period a year falls in: twenty years each, Period 1 from 1864 (the Three Cycles, 三元九運, of 180 years). */
export function periodOf(year: number): { period: PeriodId; from: number; to: number } {
  const k = Math.floor((((year - 1864) % 180) + 180) % 180 / 20);
  const from = year - ((((year - 1864) % 20) + 20) % 20);
  return { period: (k + 1) as PeriodId, from, to: from + 19 };
}

export type Facing = {
  /** The facing as a luopan reads it: magnetic, in degrees. */
  degrees: number;
  /** What the reader gave: a compass bearing (magnetic) or a map's (true), and the declination used to turn one into the other. */
  source: "compass" | "map" | "phone";
  declination: number | null;
};

export type Home = {
  facing: Facing;
  facingMountain: Mountain;
  sittingMountain: Mountain;
  facingDirection: DirectionId;
  sittingDirection: DirectionId;
  edge: Edge;
  /** The house's trigram, named by where it sits (宅卦). */
  house: Trigram;
};

/** What a facing says. `typed` is the reader's number; from a map, the declination turns it into the magnetic bearing. */
export function homeOf(typed: number, source: Facing["source"], declinationDeg: number | null): Home {
  const degrees = norm360(source === "map" && declinationDeg != null ? typed - declinationDeg : typed);
  const facingMountain = mountainAt(degrees);
  const sittingMountain = mountainAt(degrees + 180);
  return {
    facing: { degrees, source, declination: declinationDeg },
    facingMountain,
    sittingMountain,
    facingDirection: facingMountain.direction,
    sittingDirection: sittingMountain.direction,
    edge: edgeOf(degrees),
    house: trigramOfDirection(sittingMountain.direction),
  };
}

export type HouseMatch = {
  same: boolean;
  /** The reader's mansions the home faces and sits in. */
  facing: MansionId;
  sitting: MansionId;
  facingSupportive: boolean;
  sittingSupportive: boolean;
};

/** A house and a person's Kua: the same group or not, and the mansions of its facing and sitting directions. */
export function houseMatch(home: Home, fs: FengShui): HouseMatch {
  const at = (d: DirectionId) => fs.directions.find((x) => x.direction === d)!.mansion;
  const facing = at(home.facingDirection);
  const sitting = at(home.sittingDirection);
  return { same: home.house.group === fs.group, facing, sitting, facingSupportive: MANSIONS[facing].supportive, sittingSupportive: MANSIONS[sitting].supportive };
}

/** Readings of a compass: their circular mean and their spread (the largest gap from the mean), in degrees. */
export function averageBearing(list: readonly number[]): { mean: number; spread: number } | null {
  if (!list.length) return null;
  const rad = Math.PI / 180;
  const sx = list.reduce((a, d) => a + Math.sin(d * rad), 0);
  const cx = list.reduce((a, d) => a + Math.cos(d * rad), 0);
  if (Math.hypot(sx, cx) < 1e-9) return null;
  const mean = norm360(Math.atan2(sx, cx) / rad);
  const spread = Math.max(...list.map((d) => Math.abs(((norm360(d - mean) + 180) % 360) - 180)));
  return { mean, spread };
}

/** Readings this far apart ask for another try (a phone near metal reads 20° off). */
export const SPREAD_WARN = 5;
