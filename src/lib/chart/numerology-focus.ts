/*
 * What lights on the numerology wheel when a part is pointed at or chosen
 * (part 60): a number lights its letters and the discs on it; a letter its
 * number and the core numbers it feeds; Soul Urge the vowels, Personality the
 * consonants, Expression every letter; the Life Path and the personal year
 * the numbers they are added from; the name's finer numbers, the planes and
 * the bridges what they are made of (part 63). Parts are named as the
 * readings are: number:3, letter:4 (its place in the name), core:soulurge,
 * time:month, detail:lessons, plane:mental, bridge:lifePathExpression.
 */
import { digitalRoot } from "./numerology-reduce";
import { valueOfCore, type NumerologyChart, type NumerologyCoreId } from "./numerology";

/** The six core numbers the wheel draws as discs, in the tiles' order. */
export const WHEEL_CORES: readonly NumerologyCoreId[] = [
  "lifepath",
  "expression",
  "soulurge",
  "personality",
  "birthday",
  "maturity",
];

export type NumerologyFocus = { hero: string; lit: Set<string> };

export function numerologyFocus(id: string | null, chart: NumerologyChart | null): NumerologyFocus | null {
  if (!id || !chart) return null;
  const lit = new Set<string>([id]);
  const letters = chart.names.birth?.parsed.letters ?? [];
  const addNumber = (n: number | null | undefined) => {
    if (n) lit.add(`number:${digitalRoot(n)}`);
  };
  const addLetters = (pick: (vowel: boolean) => boolean) => {
    for (const l of letters) if (pick(l.vowel)) lit.add(`letter:${l.index}`);
  };

  if (id.startsWith("number:")) {
    const n = Number(id.slice(7));
    if (!(n >= 1 && n <= 9)) return null;
    for (const l of letters) if (l.value === n) lit.add(`letter:${l.index}`);
    for (const c of WHEEL_CORES) if (valueOfCore(chart, c).digit === n) lit.add(`core:${c}`);
    if (chart.personalYear.digit === n) lit.add("core:personalYear");
    if (chart.personalMonth.digit === n) lit.add("time:month");
    if (chart.personalDay.digit === n) lit.add("time:day");
    return { hero: id, lit };
  }
  if (id.startsWith("letter:")) {
    const at = Number(id.slice(7));
    const letter = letters.find((l) => l.index === at);
    if (!letter) return null;
    addNumber(letter.value);
    lit.add("core:expression");
    lit.add(letter.vowel ? "core:soulurge" : "core:personality");
    return { hero: id, lit };
  }
  if (id === "time:month" || id === "time:day") {
    addNumber((id === "time:month" ? chart.personalMonth : chart.personalDay).digit);
    return { hero: id, lit };
  }
  // The name's finer numbers (part 63): what they are made of lights up.
  const detail = chart.names.birth?.detail;
  const first = chart.names.birth?.parsed.words[0]?.letters ?? [];
  const numbers = (ns: readonly number[]) => {
    for (const n of ns) lit.add(`number:${n}`);
    return ns.length ? { hero: `number:${ns[0]}`, lit } : null;
  };
  const letterFocus = (l: { index: number; value: number } | undefined) => {
    if (!l) return null;
    lit.add(`letter:${l.index}`);
    addNumber(l.value);
    return { hero: `letter:${l.index}`, lit };
  };
  switch (id) {
    case "detail:lessons":
    case "detail:subconscious":
      return detail ? numbers(detail.karmicLessons) : null;
    case "detail:passion":
      if (!detail) return null;
      for (const l of letters) if (detail.hiddenPassion.includes(l.value)) lit.add(`letter:${l.index}`);
      return numbers(detail.hiddenPassion);
    case "detail:balance": {
      const initials = (chart.names.birth?.parsed.words ?? []).map((w) => w.letters[0]).filter(Boolean);
      for (const l of initials) addNumber(l!.value);
      for (const l of initials) lit.add(`letter:${l!.index}`);
      return initials.length ? { hero: `letter:${initials[0]!.index}`, lit } : null;
    }
    case "detail:rationalThought":
      for (const l of first) lit.add(`letter:${l.index}`);
      lit.add("core:birthday");
      return first.length ? { hero: "core:birthday", lit } : null;
    case "detail:attitude":
      for (const t of chart.lifePath.terms?.slice(0, 2) ?? []) addNumber(t.value);
      addNumber(chart.attitude.digit);
      return chart.attitude.digit ? { hero: `number:${chart.attitude.digit}`, lit } : null;
    case "detail:cornerstone":
      return letterFocus(first[0]);
    case "detail:capstone":
      return letterFocus(first[first.length - 1]);
    case "detail:firstVowel":
      return letterFocus(first.find((l) => l.vowel));
    case "bridge:lifePathExpression":
      lit.add("core:expression");
      return { hero: "core:lifepath", lit };
    case "bridge:soulUrgePersonality":
      lit.add("core:personality");
      return { hero: "core:soulurge", lit };
  }
  if (id.startsWith("plane:")) {
    const plane = detail?.planes.find((x) => `plane:${x.id}` === id);
    if (!plane?.letters.length) return null;
    for (const l of plane.letters) lit.add(`letter:${l.index}`);
    return { hero: `letter:${plane.letters[0]!.index}`, lit };
  }
  if (!id.startsWith("core:")) return null;
  switch (id.slice(5)) {
    case "lifepath":
      for (const t of chart.lifePath.terms ?? []) addNumber(t.value);
      break;
    case "expression":
      addLetters(() => true);
      break;
    case "soulurge":
      addLetters((vowel) => vowel);
      break;
    case "personality":
      addLetters((vowel) => !vowel);
      break;
    case "birthday":
      addNumber(chart.birthday.digit);
      break;
    case "maturity":
      lit.add("core:lifepath");
      lit.add("core:expression");
      break;
    case "personalYear":
      for (const t of chart.personalYear.terms ?? []) addNumber(t.value);
      break;
    default:
      return null;
  }
  return { hero: id, lit };
}
