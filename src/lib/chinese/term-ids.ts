/*
 * Every Chinese term's entry in the encyclopedia, from the id the studio
 * already gives it (languages plan, part 29: "every term ready to link to the
 * encyclopedia"; encyclopedia plan, part 7: "structured places know their
 * term already"). The Chinese pages name their stems, branches, Ten Gods,
 * mountains and stars by stable ids (names.ts, bazi.ts, fengshui*.ts…); here
 * each family of them gets its entries' ids, prefixed so they can never meet
 * astrology's ("stem-jia", "ten-god-eating-god", "mountain-zi",
 * "flying-star-9"), the entry of the family itself ("stem": what a Heavenly
 * Stem is), and the tradition its pages will live in:
 *
 *   - "chinese": the foundation every Chinese language reads, the languages
 *     plan's reference tables (the phases, stems, branches, the sixty pillars
 *     and their Na Yin, the solar terms, the relations between branches and
 *     between stems, the trigrams) and four ideas they share (the hidden
 *     stems, Tai Sui, the solar month, the Lo Shu). Encyclopedia part 23.
 *   - "chinese-astrology", "bazi", "feng-shui": each language's own terms,
 *     as the language picker names them (encyclopedia parts 24–26).
 *   - "shared": yin and yang, one of the encyclopedia's shared ideas.
 *
 * Nothing links before its page exists: a family links only once it is in
 * LIVE_FAMILIES (term-live.ts), which it joins when the encyclopedia has
 * written every entry of it; scripts/chinese-term-ids.test.mjs keeps the two in step
 * and these lists equal to the engines'. Until then every word stays plain.
 *
 * Pure, with no engine behind it, and downloaded only once something links:
 * the tables' words (encyclopedia/ChineseTermLink.tsx), a Chinese reading's
 * "In the encyclopedia" (ChineseReadingTerms.tsx) and its linked text
 * (LinkedText.tsx) fetch it when a family is written, never before. What a
 * reading is about, from its id, is term-refs.ts: a download of its own, so
 * the tables' words never bring it (the review of languages part 20, T9).
 */
import { LIVE_FAMILIES } from "./term-live";

export { CHINESE_READING, LIVE_FAMILIES } from "./term-live";

export type ChineseTradition = "chinese" | "chinese-astrology" | "bazi" | "feng-shui" | "shared";

export type ChineseFamily =
  | "phase"
  | "polarity"
  | "stem"
  | "branch"
  | "pillar"
  | "na-yin"
  | "solar-term"
  | "relation"
  | "trigram"
  | "chinese-concept"
  | "animal"
  | "zodiac-concept"
  | "ten-god"
  | "life-stage"
  | "shen-sha"
  | "structure"
  | "bazi-concept"
  | "kua"
  | "mansion"
  | "mountain"
  | "flying-star"
  | "formation"
  | "affliction"
  | "period"
  | "pairing"
  | "fengshui-concept";

/**
 * A thing of a Chinese page by its family and the engine's own id ("life-stage", "death"; "kua", 1;
 * "na-yin", 0): what a reading names of its own chart for "In the encyclopedia" (ElementReading.terms,
 * the 2.0 fixes, item 2), turned into an entry's id only where the registry is loaded (term-refs.ts).
 */
export type ChineseTermRef = { family: ChineseFamily; id: string | number };

export type FamilyInfo = {
  tradition: ChineseTradition;
  /** The family's own entry (what a Heavenly Stem is), or null for a family of ideas. */
  concept: string | null;
  /** The engine's id (or index) → the entry's id. */
  ids: Readonly<Record<string, string>>;
  /** Entries of another family this one also names (Feng Shui's Tai Sui is the year's Tai Sui). */
  also?: Readonly<Record<string, string>>;
};

const words = (s: string): string[] => s.split(" ");
const prefixed = (prefix: string, keys: readonly string[], rename: Readonly<Record<string, string>> = {}): Record<string, string> =>
  Object.fromEntries(keys.map((k) => [k, `${prefix}-${rename[k] ?? k}`]));
const themselves = (keys: readonly string[]): Record<string, string> => Object.fromEntries(keys.map((k) => [k, k]));

// The engines' ids, in their own order (names.ts, bazi.ts, bazi-signs.ts, bazi-balance.ts,
// bazi-interactions.ts, fengshui.ts, fengshui-home.ts, fengshui-stars.ts, fengshui-years.ts).
const STEMS = words("jia yi bing ding wu ji geng xin ren gui");
const BRANCHES = words("zi chou yin mao chen si wu wei shen you xu hai");
const ANIMALS = words("rat ox tiger rabbit dragon snake horse goat monkey rooster dog pig");
const SIXTY = Array.from({ length: 60 }, (_, i) => `${STEMS[i % 10]}-${BRANCHES[i % 12]}`);
const SOLAR_TERMS = words(
  "lichun yushui jingzhe chunfen qingming guyu lixia xiaoman mangzhong xiazhi xiaoshu dashu liqiu chushu bailu qiufen hanlu shuangjiang lidong xiaoxue daxue dongzhi xiaohan dahan",
);
/** The Na Yin by their toneless pinyin, one for each two pairs of the cycle (names.ts keeps them by index). */
const NA_YIN = words(
  "haizhong-jin luzhong-huo dalin-mu lupang-tu jianfeng-jin shantou-huo jianxia-shui chengtou-tu baila-jin yangliu-mu quanzhong-shui wushang-tu pili-huo songbai-mu changliu-shui shazhong-jin shanxia-huo pingdi-mu bishang-tu jinbo-jin fudeng-huo tianhe-shui dayi-tu chaichuan-jin sangzhe-mu daxi-shui shazhong-tu tianshang-huo shiliu-mu dahai-shui",
);
/** The engines' ids that reading ids give by their index (term-refs.ts: a wheel's animal, a day's pillar, a solar term). */
export const ENGINE_ORDER = { branches: BRANCHES, animals: ANIMALS, sixty: SIXTY, solarTerms: SOLAR_TERMS } as const;
const NINE = words("1 2 3 4 5 6 7 8 9");
const PAIRS = NINE.flatMap((a) => NINE.filter((b) => b >= a).map((b) => `${a}-${b}`));

export const CHINESE_FAMILIES: Readonly<Record<ChineseFamily, FamilyInfo>> = {
  phase: { tradition: "chinese", concept: "phase", ids: prefixed("phase", words("wood fire earth metal water")) },
  polarity: { tradition: "shared", concept: null, ids: { yang: "yin-yang", yin: "yin-yang" } },
  stem: { tradition: "chinese", concept: "stem", ids: prefixed("stem", STEMS) },
  branch: { tradition: "chinese", concept: "branch", ids: prefixed("branch", BRANCHES) },
  pillar: { tradition: "chinese", concept: "pillar", ids: prefixed("pillar", SIXTY) },
  "na-yin": { tradition: "chinese", concept: "na-yin", ids: Object.fromEntries(NA_YIN.map((n, i) => [String(i), `na-yin-${n}`])) },
  "solar-term": { tradition: "chinese", concept: "solar-term", ids: prefixed("solar-term", SOLAR_TERMS) },
  // The zodiac's relations (relations.ts) and BaZi's interactions (bazi-interactions.ts): one entry each.
  relation: {
    tradition: "chinese",
    concept: "relation",
    ids: prefixed("relation", words("harmony trine half-trine season clash harm punishment self-punishment destruction stem-combination stem-clash"), { season: "seasonal-trio" }),
  },
  trigram: { tradition: "chinese", concept: "trigram", ids: prefixed("trigram", words("kan kun zhen xun qian dui gen li")) },
  "chinese-concept": { tradition: "chinese", concept: null, ids: themselves(words("hidden-stems tai-sui solar-month lo-shu")) },
  animal: { tradition: "chinese-astrology", concept: "animal", ids: prefixed("animal", ANIMALS) },
  "zodiac-concept": { tradition: "chinese-astrology", concept: null, ids: themselves(words("year-animal month-animal day-animal hour-animal ben-ming-nian")) },
  "ten-god": {
    tradition: "bazi",
    concept: "ten-god",
    ids: prefixed("ten-god", words("companion rob-wealth eating-god hurting-officer indirect-wealth direct-wealth seven-killings direct-officer indirect-resource direct-resource")),
  },
  "life-stage": { tradition: "bazi", concept: "life-stage", ids: prefixed("life-stage", words("birth bath crown prosperity peak decline sickness death tomb extinction conception nurture")) },
  "shen-sha": {
    tradition: "bazi",
    concept: "shen-sha",
    ids: prefixed(
      "shen-sha",
      words("nobleman academic prosperity-star golden-carriage sword-edge peach-blossom travelling-horse canopy general heavenly-virtue monthly-virtue red-phoenix heavenly-joy three-wonders"),
    ),
  },
  structure: {
    tradition: "bazi",
    concept: "structure",
    ids: prefixed(
      "structure",
      words("direct-officer seven-killings direct-wealth indirect-wealth direct-resource indirect-resource eating-god hurting-officer jian-lu yang-ren follow-strong follow-output follow-wealth follow-power"),
    ),
  },
  "bazi-concept": {
    tradition: "bazi",
    concept: null,
    ids: themselves(
      words("day-master year-pillar month-pillar day-pillar hour-pillar empty-branches phase-balance day-master-strength favourable-phases luck-pillar annual-pillar monthly-pillar daily-pillar partner-palace"),
    ),
  },
  kua: { tradition: "feng-shui", concept: "kua", ids: prefixed("kua", words("1 2 3 4 6 7 8 9")) },
  mansion: { tradition: "feng-shui", concept: "mansion", ids: prefixed("mansion", words("sheng-qi tian-yi yan-nian fu-wei huo-hai wu-gui liu-sha jue-ming")) },
  mountain: { tradition: "feng-shui", concept: "mountain", ids: prefixed("mountain", words("ren zi gui chou gen yin jia mao yi chen xun si bing wu ding wei kun shen geng you xin xu qian hai")) },
  "flying-star": { tradition: "feng-shui", concept: "flying-star", ids: prefixed("flying-star", NINE) },
  formation: {
    tradition: "feng-shui",
    concept: "formation",
    ids: prefixed("formation", words("prosperous reversed double-facing double-sitting ten-mountain ten-water parent-string pearl-string fu-yin fan-yin")),
  },
  affliction: { tradition: "feng-shui", concept: "affliction", ids: prefixed("affliction", words("five-yellow year-breaker three-killings")), also: { "tai-sui": "tai-sui" } },
  period: { tradition: "feng-shui", concept: "period", ids: prefixed("period", NINE) },
  pairing: { tradition: "feng-shui", concept: "pairing", ids: prefixed("pairing", PAIRS) },
  "fengshui-concept": { tradition: "feng-shui", concept: null, ids: themselves(words("facing luopan flying-star-chart replacement-chart annual-stars monthly-stars")) },
};

export const CHINESE_FAMILY_IDS = Object.keys(CHINESE_FAMILIES) as ChineseFamily[];

/** Every family: the live set a test passes to see what would link once everything is written. */
export const ALL_FAMILIES: ReadonlySet<ChineseFamily> = new Set(CHINESE_FAMILY_IDS);

/** Each entry's family (its own, never one that only names it). */
const OWNER = new Map<string, ChineseFamily>();
for (const family of CHINESE_FAMILY_IDS) {
  const f = CHINESE_FAMILIES[family];
  for (const id of [f.concept, ...Object.values(f.ids)]) if (id && !OWNER.has(id)) OWNER.set(id, family);
}

/** The entry's id for a thing of a Chinese page, whether or not it is written yet; null when it has none. */
export function chineseTermId(family: ChineseFamily, id: string | number | null | undefined): string | null {
  if (id == null) return null;
  const f = CHINESE_FAMILIES[family];
  const key = String(id);
  if (Object.hasOwn(f.ids, key)) return f.ids[key]!;
  return f.also && Object.hasOwn(f.also, key) ? f.also[key]! : null;
}

/** The family an entry belongs to, or null when it is not a Chinese term's. */
export const familyOfTerm = (term: string): ChineseFamily | null => OWNER.get(term) ?? null;

/** The tradition an entry's page lives in. */
export function traditionOfTerm(term: string): ChineseTradition | null {
  const family = OWNER.get(term);
  return family ? CHINESE_FAMILIES[family].tradition : null;
}

const isLive = (term: string, live: ReadonlySet<ChineseFamily>): boolean => {
  const family = OWNER.get(term);
  return family != null && live.has(family);
};

/** The entry to link a thing to: its id once its family is written, else null (the word stays plain). */
export function linkableId(family: ChineseFamily, id: string | number | null | undefined, live: ReadonlySet<ChineseFamily> = LIVE_FAMILIES): string | null {
  if (!live.size) return null;
  const term = chineseTermId(family, id);
  return term && isLive(term, live) ? term : null;
}

/** Every entry id of a family (its own entry first), or of all of them: the test's list. */
export function chineseTermIds(family?: ChineseFamily): string[] {
  if (family) {
    const f = CHINESE_FAMILIES[family];
    return [...new Set([...(f.concept ? [f.concept] : []), ...Object.values(f.ids)])];
  }
  return [...OWNER.keys()];
}
