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
 * LIVE_FAMILIES (term-live.ts), empty until the encyclopedia has written
 * every entry of it; scripts/chinese-term-ids.test.mjs keeps the two in step
 * and these lists equal to the engines'. Until then every word stays plain.
 *
 * Pure, with no engine behind it, and downloaded only once something links:
 * the tables' words (encyclopedia/ChineseTermLink.tsx), a Chinese reading's
 * "In the encyclopedia" (ChineseReadingTerms.tsx) and its linked text
 * (LinkedText.tsx) fetch it when a family is written, never before.
 */
import { dayCycleOf } from "./day-cycle";
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
/** A palace of the Lo Shu is its trigram's (坎宮, the Kan palace, in the north); the centre is the Lo Shu's own. */
const PALACE_TRIGRAM: Readonly<Record<string, string>> = { n: "kan", ne: "gen", e: "zhen", se: "xun", s: "li", sw: "kun", w: "dui", nw: "qian" };
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

const PLACES = new Set(["year", "month", "day", "hour"]);
/** A palace's trigram ("n" → "kan"), never a key of Object's prototype. */
const palaceTrigram = (palace: string | undefined): string | undefined => (palace && Object.hasOwn(PALACE_TRIGRAM, palace) ? PALACE_TRIGRAM[palace] : undefined);
const index = (s: string | undefined, n: number): number | null => {
  const i = Number(s);
  return s != null && /^\d{1,2}$/.test(s) && i < n ? i : null;
};

/**
 * The entries a Chinese reading is about, from its id alone (the readings'
 * ids: zodiac-reading.ts, zodiac-time-reading.ts, bazi*-reading.ts,
 * fengshui*-reading.ts, and the Calendar's solar terms), whether or not they
 * are written yet. A reading of a thing named by its id gives that thing's
 * entry ("bz:god:eating-god", "fss:star:9", "fsh:mountain:zi"); a reading of
 * a place gives the idea of that place ("bz:stem:day", the Day Master;
 * "bz:hidden:year:1", the hidden stems), since the place alone does not say
 * which stem stands in it. Empty for an id that is not a Chinese reading's.
 */
export function chineseRefTerms(ref: string): string[] {
  const out: string[] = [];
  const push = (term: string | null) => {
    if (term && !out.includes(term)) out.push(term);
  };
  const add: Add = (family, id) => push(chineseTermId(family, id));
  /** The family's own entry: what a Kua number, a life stage, a relation is. */
  const concept = (family: ChineseFamily) => push(CHINESE_FAMILIES[family].concept);
  const p = ref.split(":");
  switch (p[0]) {
    case "zk": {
      // An animal of the wheel ("zk:branch:6"), a relation ("zk:rel:clash:day:hour"), a place ("zk:year").
      const b = p[1] === "branch" ? index(p[2], 12) : null;
      if (b != null) {
        add("animal", ANIMALS[b]);
        add("branch", BRANCHES[b]);
      } else if (p[1] === "rel") add("relation", p[2]);
      else if (p.length === 2 && PLACES.has(p[1]!)) add("zodiac-concept", `${p[1]}-animal`);
      break;
    }
    case "zky":
      // The year ahead (its ruler, Tai Sui) and its months.
      if (p[1] === "year" && p.length === 2) add("chinese-concept", "tai-sui");
      else if (p[1] === "month" && index(p[2], 12) != null) add("chinese-concept", "solar-month");
      break;
    case "zkp":
      // Two people's animals: A's place and B's ("zkp:m:year:day").
      if (p[1] === "m" && PLACES.has(p[2]!) && PLACES.has(p[3]!)) {
        add("zodiac-concept", `${p[2]}-animal`);
        add("zodiac-concept", `${p[3]}-animal`);
      }
      break;
    case "cnday": {
      // A day of the Calendar: its pillar and its animal.
      const d = /^(-?\d{1,4})-(\d{2})-(\d{2})$/.exec(p[1] ?? "");
      if (d) {
        const cycle = dayCycleOf(Number(d[1]), Number(d[2]), Number(d[3]));
        add("pillar", SIXTY[cycle]);
        add("animal", ANIMALS[cycle % 12]);
      }
      break;
    }
    case "bz":
      baziTerms(p, add, concept);
      break;
    case "bzp":
      // Two BaZi charts: a cell of either ("bzp:a:bz:stem:day"), the Day Masters, the partner palaces, the phases each brings, the meetings.
      if ((p[1] === "a" || p[1] === "b") && p[2] === "bz") baziTerms(p.slice(2), add, concept);
      else if (p[1] === "dm") add("bazi-concept", "day-master");
      else if (p[1] === "palace") add("bazi-concept", "partner-palace");
      else if (p[1] === "gifts") add("bazi-concept", "phase-balance");
      else if (p[1] === "meet" && PLACES.has(p[2]!)) concept("relation");
      break;
    case "fs":
      // The Kua ("fs:yang:kua"), a direction of the Eight Mansions ("fs:yang:dir:n"), their practical lines.
      if (p[1] === "yang" || p[1] === "yin") {
        if (p[2] === "kua") concept("kua");
        else if ((p[2] === "dir" && palaceTrigram(p[3])) || p[2] === "practice") concept("mansion");
      }
      break;
    case "fsh":
      if (p[1] === "facing") add("fengshui-concept", "facing");
      else if (p[1] === "period") concept("period");
      else if (p[1] === "how") add("fengshui-concept", "luopan");
      else if (p[1] === "house" && (p[2] === "yang" || p[2] === "yin")) concept("mansion");
      else if (p[1] === "mountain") add("mountain", p[2]);
      break;
    case "fss":
      // The chart ("fss:main", its replacement "fss:ti"), a palace ("fss:main:palace:n"), a formation, a star.
      if ((p[1] === "main" || p[1] === "ti") && p.length === 2) add("fengshui-concept", p[1] === "main" ? "flying-star-chart" : "replacement-chart");
      else if ((p[1] === "main" || p[1] === "ti") && p[2] === "palace") {
        if (p[3] === "c") add("chinese-concept", "lo-shu");
        else add("trigram", palaceTrigram(p[3]));
      } else if (p[1] === "formation") add("formation", p[2]);
      else if (p[1] === "star") add("flying-star", p[2]);
      break;
    case "fsy":
      if (p[1] === "year") add("fengshui-concept", "annual-stars");
      else if (p[1] === "month") add("fengshui-concept", "monthly-stars");
      else if (p[1] === "aff") add("affliction", p[2]);
      break;
    case "sky": {
      // The Calendar's solar term ("sky:term-0-1770177600000").
      const t = /^term-(\d{1,2})-/.exec(p[1] ?? "");
      if (t) add("solar-term", SOLAR_TERMS[Number(t[1])]);
      break;
    }
  }
  return out;
}

type Add = (family: ChineseFamily, id: string | number | null | undefined) => void;

/** A reading of BaZi's board, its analysis or its time ("bz:…", split at its colons). */
function baziTerms(p: string[], add: Add, concept: (family: ChineseFamily) => void): void {
  const place = PLACES.has(p[2]!) ? p[2]! : null;
  switch (p[1]) {
    case "stem":
      // The day's stem is the Day Master; another is the stem of its pillar.
      if (place) {
        add("bazi-concept", place === "day" ? "day-master" : `${place}-pillar`);
        concept("stem");
      }
      break;
    case "branch":
      if (place) {
        add("bazi-concept", `${place}-pillar`);
        concept("branch");
      }
      break;
    case "hidden":
      if (place) add("chinese-concept", "hidden-stems");
      break;
    case "god":
      add("ten-god", p[2]);
      break;
    case "stage":
      if (place) concept("life-stage");
      break;
    case "nayin":
      if (place) concept("na-yin");
      break;
    case "empty":
      add("bazi-concept", "empty-branches");
      break;
    case "star":
      add("shen-sha", p[2]);
      break;
    case "ix":
      // "bz:ix:harmony:year-month": the interaction's kind.
      add("relation", p[2]);
      break;
    case "balance":
      add("bazi-concept", "phase-balance");
      break;
    case "phase":
      add("phase", p[2]);
      break;
    case "strength":
      add("bazi-concept", "day-master-strength");
      break;
    case "structure":
      concept("structure");
      break;
    case "favourable":
      add("bazi-concept", "favourable-phases");
      break;
    case "luck":
    case "luck-how":
      add("bazi-concept", "luck-pillar");
      break;
    case "flow-year":
      add("bazi-concept", "annual-pillar");
      break;
    case "flow-month":
      add("bazi-concept", "monthly-pillar");
      break;
    case "flow-day":
      add("bazi-concept", "daily-pillar");
      break;
  }
}

/** The entries a Chinese reading is about that are written (linkable): what its "In the encyclopedia" offers. */
export function chineseSubjectOf(ref: string, live: ReadonlySet<ChineseFamily> = LIVE_FAMILIES): Set<string> {
  if (!live.size) return new Set();
  return new Set(chineseRefTerms(ref).filter((term) => isLive(term, live)));
}
