/*
 * The reader's choices for the Chinese traditions (languages plan, part 6;
 * decisions 2, 3 and 5 of 6 October 2026), kept on this device only, in this
 * browser's storage, never with a chart and never sent:
 *
 * - `clock`: the clock the day and hour pillars are read on: true solar time
 *   (by default), local mean time or the civil clock (pillars.ts, `Clock`).
 * - `dayBoundary`: when the day turns: 23:00 (by default, the Zi Ping rule),
 *   the split Rat hour, or midnight (pillars.ts, `DayBoundary`).
 * - `script`: Traditional characters (by default) or Simplified.
 * - `show`: how a Chinese term is written beside its English or French name:
 *   with its pinyin and characters (by default), with its pinyin only, or the
 *   name alone.
 * - `animals`: how the twelve animals are drawn on the wheel, the cards and
 *   the readings: as Ulune's drawings (by default, animal-glyphs.ts, part 9)
 *   or as their characters (鼠, 牛, 虎…).
 * - `pillarOrder`: how BaZi's four pillars stand side by side: hour to year,
 *   as the tradition writes them (the year on the right, by default), or
 *   year to hour (part 12).
 *
 * Pure but for the storage: the page reads it when it runs (the server's page
 * shows the defaults), and a change is announced to the open views with the
 * window event CHINESE_PREFS_EVENT.
 */
import type { ChineseName } from "./names";
import type { Clock, DayBoundary } from "./pillars";

export type Script = "hant" | "hans";
export type TermShow = "full" | "pinyin" | "names";
export type AnimalShow = "drawings" | "characters";
export type PillarOrder = "classical" | "year-first";

export type ChinesePrefs = {
  clock: Clock;
  dayBoundary: DayBoundary;
  script: Script;
  show: TermShow;
  animals: AnimalShow;
  pillarOrder: PillarOrder;
};

export const CHINESE_PREFS_KEY = "ulune.chinese";
export const CHINESE_PREFS_EVENT = "ulune:chinese-prefs";

export const CLOCKS: readonly Clock[] = ["true-solar", "local-mean", "civil"];
export const DAY_BOUNDARIES: readonly DayBoundary[] = ["23:00", "split", "midnight"];
export const SCRIPTS: readonly Script[] = ["hant", "hans"];
export const TERM_SHOWS: readonly TermShow[] = ["full", "pinyin", "names"];
export const ANIMAL_SHOWS: readonly AnimalShow[] = ["drawings", "characters"];
export const PILLAR_ORDERS: readonly PillarOrder[] = ["classical", "year-first"];

export const DEFAULT_CHINESE_PREFS: Readonly<ChinesePrefs> = {
  clock: "true-solar",
  dayBoundary: "23:00",
  script: "hant",
  show: "full",
  animals: "drawings",
  pillarOrder: "classical",
};

const oneOf = <T extends string>(list: readonly T[], value: unknown, fallback: T): T =>
  list.includes(value as T) ? (value as T) : fallback;

/** What was kept, read with care: anything unknown falls back to its default. */
export function cleanChinesePrefs(raw: unknown): ChinesePrefs {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const d = DEFAULT_CHINESE_PREFS;
  return {
    clock: oneOf(CLOCKS, o.clock, d.clock),
    dayBoundary: oneOf(DAY_BOUNDARIES, o.dayBoundary, d.dayBoundary),
    script: oneOf(SCRIPTS, o.script, d.script),
    show: oneOf(TERM_SHOWS, o.show, d.show),
    animals: oneOf(ANIMAL_SHOWS, o.animals, d.animals),
    pillarOrder: oneOf(PILLAR_ORDERS, o.pillarOrder, d.pillarOrder),
  };
}

export function readChinesePrefs(): ChinesePrefs {
  try {
    const raw = window.localStorage.getItem(CHINESE_PREFS_KEY);
    return cleanChinesePrefs(raw ? JSON.parse(raw) : null);
  } catch {
    return { ...DEFAULT_CHINESE_PREFS };
  }
}

/** Keeps a change (only what differs from the defaults is written) and tells the open views. */
export function setChinesePrefs(patch: Partial<ChinesePrefs>): ChinesePrefs {
  const next = cleanChinesePrefs({ ...readChinesePrefs(), ...patch });
  const differs = Object.fromEntries(
    (Object.keys(next) as (keyof ChinesePrefs)[]).filter((k) => next[k] !== DEFAULT_CHINESE_PREFS[k]).map((k) => [k, next[k]]),
  );
  try {
    if (Object.keys(differs).length) window.localStorage.setItem(CHINESE_PREFS_KEY, JSON.stringify(differs));
    else window.localStorage.removeItem(CHINESE_PREFS_KEY);
  } catch {
    /* private mode: the choice lasts for this page only */
  }
  try {
    window.dispatchEvent(new CustomEvent(CHINESE_PREFS_EVENT, { detail: next }));
  } catch {
    /* no window (tests) */
  }
  return next;
}

/**
 * A Chinese term as the reader chose to see it, after its English or French
 * name: "Start of Spring · lìchūn 立春", "Start of Spring · lìchūn", or the
 * name alone. `extra` is what follows the name (`pinyin`, `hanzi`), apart, for
 * a view that sets them in their own type.
 */
export function chineseLabel(
  name: ChineseName,
  locale: string,
  prefs: Pick<ChinesePrefs, "script" | "show">,
): { name: string; pinyin: string | null; hanzi: string | null; text: string } {
  const own = locale === "fr" ? name.fr : name.en;
  const pinyin = prefs.show === "names" ? null : name.pinyin;
  const hanzi = prefs.show === "full" ? name[prefs.script] : null;
  const extra = [pinyin, hanzi].filter(Boolean).join(" ");
  return { name: own, pinyin, hanzi, text: extra ? `${own} · ${extra}` : own };
}
