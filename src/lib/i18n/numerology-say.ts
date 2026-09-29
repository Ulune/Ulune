/*
 * One line for each part of the numerology wheel (part 60): under the wheel
 * for what the pointer is on, and read out by the keyboard's list. Numbers
 * and steps come from the calculation, never written by hand.
 */
import { valueOfCore, type NumerologyChart, type NumerologyCoreId } from "@/lib/chart/numerology";
import { WHEEL_CORES } from "@/lib/chart/numerology-focus";
import { isMaster, stepsText, wholeText, type NumerologyValue } from "@/lib/chart/numerology-reduce";
import type { AppLocale } from "./messages";
import { numerologyCoreLabel, numerologyPageText, numerologyWheelText } from "./numerology-ui";

function dateWords(locale: AppLocale, year: number, month: number, day?: number): string {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    timeZone: "UTC",
    month: "long",
    ...(day ? { day: "numeric" } : {}),
  }).format(new Date(Date.UTC(year, month - 1, day ?? 1)));
}

/** "29 September", "29 septembre": a birthday in a given year. */
export function numerologyDay(locale: AppLocale, year: number, month: number, day: number): string {
  return dateWords(locale, year, month, day);
}

function coreLine(chart: NumerologyChart, id: NumerologyCoreId, locale: AppLocale): string {
  const value = valueOfCore(chart, id);
  const label = numerologyCoreLabel(locale, id);
  if (value.number == null) return label;
  const whole = wholeText(value);
  const steps = stepsText(value);
  const tail = value.debt
    ? `, ${numerologyWheelText(locale, "debt", { debt: value.debt })}`
    : isMaster(value.number)
      ? `, ${numerologyWheelText(locale, "master")}`
      : "";
  const sep = locale === "fr" ? " : " : ": ";
  return steps && steps !== whole ? `${label} ${whole}${sep}${steps}${tail}` : `${label} ${whole}${tail}`;
}

export function numerologySay(chart: NumerologyChart, id: string, locale: AppLocale): string {
  const birth = chart.names.birth;
  const letters = birth?.parsed.letters ?? [];
  if (id.startsWith("number:")) {
    const n = Number(id.slice(7));
    const on = letters.filter((l) => l.value === n);
    let line = String(n);
    if (birth) {
      const listed = on.map((l) => l.ch).join(" ");
      line = on.length
        ? numerologyWheelText(locale, on.length === 1 ? "numberLetter" : "numberLetters", { n, count: on.length, letters: listed })
        : numerologyWheelText(locale, "numberLesson", { n });
      if (on.length && birth.detail.hiddenPassion.includes(n)) line += `, ${numerologyWheelText(locale, "passion")}`;
    }
    const cores = WHEEL_CORES.filter((c) => valueOfCore(chart, c).digit === n).map(
      (c) => `${numerologyCoreLabel(locale, c)} ${wholeText(valueOfCore(chart, c))}`,
    );
    if (chart.personalYear.digit === n) cores.push(numerologyWheelText(locale, "yearDisc", { n, year: chart.calendarYear }));
    if (!cores.length) return line;
    return birth ? `${line}${locale === "fr" ? " ; " : "; "}${cores.join(", ")}` : `${line}${locale === "fr" ? " : " : ": "}${cores.join(", ")}`;
  }
  if (id.startsWith("letter:")) {
    const at = Number(id.slice(7));
    const letter = letters.find((l) => l.index === at);
    if (!letter || !birth) return "";
    const word = birth.parsed.words[letter.word]?.text ?? "";
    let line = numerologyWheelText(locale, letter.vowel ? "vowelOf" : "consonantOf", {
      letter: letter.ch,
      value: letter.value,
      word,
    });
    const first = birth.parsed.words[0]?.letters ?? [];
    if (letter.word === 0) {
      if (first[0] === letter) line += `, ${numerologyWheelText(locale, "cornerstone")}`;
      else if (first[first.length - 1] === letter) line += `, ${numerologyWheelText(locale, "capstone")}`;
      if (first.find((l) => l.vowel) === letter) line += `, ${numerologyWheelText(locale, "firstVowel")}`;
    }
    if (letter.yRule && (letter.vowel ? "v" : "c") !== letter.yRule) line += ` (${numerologyWheelText(locale, "byHand")})`;
    return line;
  }
  if (id === "core:personalYear") {
    const steps = stepsText(chart.personalYear);
    const head = numerologyWheelText(locale, "yearDisc", { n: chart.personalYear.number ?? "", year: chart.calendarYear });
    return steps ? `${head}${locale === "fr" ? " : " : ": "}${steps}` : head;
  }
  if (id === "time:month") {
    return numerologyWheelText(locale, "monthTick", {
      n: chart.personalMonth.number ?? "",
      month: dateWords(locale, chart.calendarYear, chart.calendarMonth),
    });
  }
  if (id === "time:day") {
    return numerologyWheelText(locale, "dayTick", {
      n: chart.personalDay.number ?? "",
      date: dateWords(locale, chart.calendarYear, chart.calendarMonth, chart.calendarDay),
    });
  }
  if (id.startsWith("core:")) return coreLine(chart, id.slice(5) as NumerologyCoreId, locale);
  return finerLine(chart, id, locale);
}

/** The name's finer numbers, the planes and the bridges (part 63): a label and its number. */
function finerLine(chart: NumerologyChart, id: string, locale: AppLocale): string {
  const colon = locale === "fr" ? "\u202f: " : ": ";
  const detail = chart.names.birth?.detail;
  const first = chart.names.birth?.parsed.words[0]?.letters ?? [];
  const valued = (label: string, value: NumerologyValue) => {
    if (value.number == null) return label;
    const steps = stepsText(value);
    const whole = wholeText(value);
    return steps && steps !== whole ? `${label} ${whole}${colon}${steps}` : `${label} ${whole}`;
  };
  switch (id) {
    case "detail:attitude":
      return valued(numerologyPageText(locale, "attitude"), chart.attitude);
    case "detail:rationalThought":
      return valued(numerologyPageText(locale, "rationalThought"), chart.rationalThought);
  }
  if (!detail) return "";
  const none = numerologyPageText(locale, "none");
  switch (id) {
    case "detail:lessons":
      return `${numerologyPageText(locale, "lessons")}${colon}${detail.karmicLessons.join(", ") || none}`;
    case "detail:passion":
      return `${numerologyPageText(locale, "passion")}${colon}${detail.hiddenPassion.join(", ") || none}`;
    case "detail:subconscious":
      return `${numerologyPageText(locale, "subconscious")} ${detail.subconsciousSelf}`;
    case "detail:balance":
      return valued(numerologyPageText(locale, "balance"), detail.balance);
    case "detail:cornerstone":
    case "detail:capstone":
    case "detail:firstVowel": {
      const key = id.slice(7) as "cornerstone" | "capstone" | "firstVowel";
      const letter = key === "cornerstone" ? first[0] : key === "capstone" ? first[first.length - 1] : first.find((l) => l.vowel);
      return letter ? `${numerologyPageText(locale, key)}${colon}${letter.ch} = ${letter.value}` : "";
    }
    case "bridge:lifePathExpression":
    case "bridge:soulUrgePersonality": {
      const value = chart.bridges[id.slice(7) as "lifePathExpression" | "soulUrgePersonality"];
      return valued(numerologyPageText(locale, id === "bridge:lifePathExpression" ? "bridgeLpEx" : "bridgeSuPe"), value);
    }
  }
  if (id.startsWith("plane:")) {
    const plane = detail.planes.find((x) => `plane:${x.id}` === id);
    if (!plane) return "";
    const label = numerologyPageText(locale, `plane_${plane.id}`);
    const letters = plane.letters.map((l) => l.ch).join(" ");
    return plane.value.number == null ? `${label}${colon}${none}` : `${valued(label, plane.value)}${letters ? ` (${letters})` : ""}`;
  }
  return "";
}
