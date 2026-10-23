/*
 * What a Chinese reading is about, from its id alone (languages plan, part
 * 29: "every term ready to link"): the entries its "In the encyclopedia"
 * offers once their families are written (encyclopedia/ChineseReadingTerms.tsx).
 * The registry it reads, each family's entries, is term-ids.ts. A module of
 * its own since the review of part 20 (review item T9): the tables' words
 * link through the registry alone, so a page's table never downloads what
 * only a reading needs.
 *
 * Pure; tested in scripts/chinese-term-ids.test.mjs.
 */
import { dayCycleOf } from "./day-cycle";
import { CHINESE_FAMILIES, ENGINE_ORDER, LIVE_FAMILIES, chineseTermId, familyOfTerm, type ChineseFamily } from "./term-ids";

const { branches: BRANCHES, animals: ANIMALS, sixty: SIXTY, solarTerms: SOLAR_TERMS } = ENGINE_ORDER;
/** A palace of the Lo Shu is its trigram's (坎宮, the Kan palace, in the north); the centre is the Lo Shu's own. */
const PALACE_TRIGRAM: Readonly<Record<string, string>> = { n: "kan", ne: "gen", e: "zhen", se: "xun", s: "li", sw: "kun", w: "dui", nw: "qian" };

/** Whether an entry's own family is written. */
const isLive = (term: string, live: ReadonlySet<ChineseFamily>): boolean => {
  const family = familyOfTerm(term);
  return family != null && live.has(family);
};

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
      // Two BaZi charts: a cell of either ("bzp:a:bz:stem:day"), the Day Masters, the luck pillars of the moment, the partner palaces, the phases each brings, the meetings.
      if ((p[1] === "a" || p[1] === "b") && p[2] === "bz") baziTerms(p.slice(2), add, concept);
      else if (p[1] === "dm") add("bazi-concept", "day-master");
      else if (p[1] === "luck") add("bazi-concept", "luck-pillar");
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
    case "fsp":
      // Two people's Kua on one compass (Feng Shui's Pair): their Kua numbers, and the directions as the Eight Mansions give them to both;
      // "You two, now", the year and the month over the directions they share ("fsp:now"), one of them ("fsp:now:dir:e").
      if ((p[1] === "a" || p[1] === "b") && p[2] === "kua") concept("kua");
      else if (p[1] === "summary" || p[1] === "practice" || (p[1] === "dir" && palaceTrigram(p[2]))) concept("mansion");
      else if (p[1] === "now" && p.length === 2) {
        add("fengshui-concept", "annual-stars");
        add("fengshui-concept", "monthly-stars");
      } else if (p[1] === "now" && p[2] === "dir" && palaceTrigram(p[3])) {
        concept("mansion");
        add("fengshui-concept", "annual-stars");
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
      // The chart ("fss:main", its replacement "fss:ti"), a palace ("fss:main:palace:n": its trigram, and the pairs of
      // stars, since every palace reads its mountain and water stars as one), a formation, a star.
      if ((p[1] === "main" || p[1] === "ti") && p.length === 2) add("fengshui-concept", p[1] === "main" ? "flying-star-chart" : "replacement-chart");
      else if ((p[1] === "main" || p[1] === "ti") && p[2] === "palace" && (p[3] === "c" || palaceTrigram(p[3]))) {
        if (p[3] === "c") add("chinese-concept", "lo-shu");
        else add("trigram", palaceTrigram(p[3]));
        concept("pairing");
      } else if (p[1] === "formation") add("formation", p[2]);
      else if (p[1] === "star") add("flying-star", p[2]);
      break;
    case "fsy":
      if (p[1] === "year") add("fengshui-concept", "annual-stars");
      else if (p[1] === "month") add("fengshui-concept", "monthly-stars");
      else if (p[1] === "aff") add("affliction", p[2]);
      break;
    case "fsc":
      // Feng Shui's Cycles: the year and the month on the dial, one of the year's afflictions, a direction under the year
      // (a count's, with its mansion there, "fsc:yang:dir:se"; the year's alone, "fsc:dir:se"), the year in practice ("fsc:yang:you").
      if (p[1] === "year" && p.length === 2) add("fengshui-concept", "annual-stars");
      else if (p[1] === "month" && p.length === 2) add("fengshui-concept", "monthly-stars");
      else if (p[1] === "aff") add("affliction", p[2]);
      else if (p[1] === "dir" && palaceTrigram(p[2])) add("fengshui-concept", "annual-stars");
      else if ((p[1] === "yang" || p[1] === "yin") && ((p[2] === "dir" && palaceTrigram(p[3])) || (p[2] === "you" && p.length === 3))) {
        concept("mansion");
        add("fengshui-concept", "annual-stars");
      }
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
