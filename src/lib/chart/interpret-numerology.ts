/**
 * The numerology page's readings (parts 60–63 of the launch plan): a core
 * number in its place, a number of the wheel, a letter, the personal month
 * and day, the name's finer numbers (lessons, passion, balance, rational
 * thought, subconscious self, attitude, the planes, the cornerstone, capstone
 * and first vowel, the Chaldean number), the bridges, the long cycles and a
 * year's cycles. Every step is written from the calculation; the texts come
 * from the reading pack (src/lib/content), one language at a time.
 */
import {
  NUMBER_TEXT,
  NUMEROLOGY_ABOUT,
  PERSONAL_DAY_TEXT,
  PERSONAL_MONTH_TEXT,
  PERSONAL_YEAR_TEXT,
  UNIVERSAL_YEAR_TEXT,
  type CycleKey,
  type NumberKey,
} from "@/lib/content/numerology";
import {
  ATTITUDE_ABOUT,
  ATTITUDE_TEXT,
  BALANCE_ABOUT,
  BALANCE_TEXT,
  BRIDGE_ABOUT,
  BRIDGE_TEXT,
  CHALDEAN_ABOUT,
  CHALDEAN_TEXT,
  CHALLENGE_TEXT,
  CYCLE_ABOUT,
  ESSENCE_ABOUT,
  ESSENCE_TEXT,
  HIDDEN_PASSION_ABOUT,
  HIDDEN_PASSION_TEXT,
  KARMIC_DEBT_ABOUT,
  KARMIC_DEBT_TEXT,
  KARMIC_LESSON_ABOUT,
  KARMIC_LESSON_TEXT,
  LETTER_CYCLE_ABOUT,
  LETTER_CYCLE_TEXT,
  LETTER_TEXT,
  PERIOD_PLACE_TEXT,
  PERIOD_TEXT,
  PINNACLE_TEXT,
  PLANE_TEXT,
  PLANES_ABOUT,
  RATIONAL_ABOUT,
  RATIONAL_TEXT,
  STONE_TEXT,
  SUBCONSCIOUS_ABOUT,
  SUBCONSCIOUS_TEXT,
  Y_RULE,
  Y_WHY,
  type CycleNumberKey,
  type Digit,
  type EssenceKey,
  type Gap,
  type KarmicDebtKey,
  type LetterKey,
  type StoneId,
} from "@/lib/content/numerology-more";
import { PLACE_TEXT, type NumerologyPlace } from "@/lib/content/numerology-places";
import { pickBi, type Bi } from "@/lib/content/types";
import type { AppLocale } from "@/lib/i18n/messages";
import { numerologyHelloCells } from "@/lib/i18n/numerology-hello";
import { numerologyCoreHow, numerologyCoreRole, numerologyMasterNote } from "@/lib/i18n/numerology-prose";
import { numerologyNumberParagraphs } from "@/lib/i18n/numerology-text";
import { numerologyCoreLabel, numerologyPageText as p, numerologyReadingText as r, numerologyWheelText } from "@/lib/i18n/numerology-ui";
import { numerologyYear, valueOfCore, type NumerologyChart, type NumerologyCoreId } from "./numerology";
import { LETTER_CYCLE_IDS, type AgeSpan, type CycleKind } from "./numerology-cycles";
import { PLANE_IDS, type NameLetter, type PlaneId } from "./numerology-name";
import { stepsText, wholeText, type NumerologyValue } from "./numerology-reduce";
import type { ElementReading, ReadingFact, ReadingLink, ReadingSection } from "./types";

const t = (bi: Bi | undefined, locale: AppLocale) => (bi ? pickBi(bi, locale) : "");
const cap = (s: string) => s.replace(/^./, (c) => c.toUpperCase());
const keywordsOf = (n: number, locale: AppLocale) => {
  const row = NUMBER_TEXT[n as NumberKey];
  return row ? `${cap(pickBi(row.keywords, locale))}.` : "";
};
const howAbout = (locale: AppLocale, ...paragraphs: string[]) => ({ title: r(locale, "howTitle"), paragraphs: paragraphs.filter(Boolean) });

const CORES: NumerologyCoreId[] = ["lifepath", "expression", "soulurge", "personality", "birthday", "maturity", "personalYear"];

function coresOnDigit(chart: NumerologyChart, digit: number): NumerologyCoreId[] {
  return CORES.filter((id) => valueOfCore(chart, id).digit === digit);
}

/** Short kicker for cores that have no Hello cell sentence. */
const CORE_KICKER: Partial<Record<NumerologyCoreId, Bi>> = {
  personality: {
    en: "From the consonants of your name: the side of you others meet first.",
    fr: "Des consonnes de votre nom\u202f: la part de vous que les autres rencontrent d’abord.",
  },
  birthday: {
    en: "From the day of the month you were born: a particular talent.",
    fr: "Du jour du mois de votre naissance\u202f: un talent particulier.",
  },
  maturity: {
    en: "Life Path plus Expression: what grows stronger in the second half of life.",
    fr: "Chemin de vie plus Expression\u202f: ce qui se renforce dans la seconde moitié de la vie.",
  },
  personalYear: {
    en: "Where you are in a nine-year cycle, from your birth month and day and the current year.",
    fr: "Votre place dans un cycle de neuf ans, d’après votre mois et votre jour de naissance et l’année en cours.",
  },
};

/** The number's own facts: its value (a link to what the number means), its root, its steps. */
function numberFacts(value: NumerologyValue, locale: AppLocale): ReadingFact[] {
  const n = value.number!;
  const steps = labelledSteps(value, locale);
  return [
    { label: r(locale, "number"), value: wholeText(value), ...(NUMBER_TEXT[n as NumberKey] ? { ref: `number:${n}` } : {}) },
    ...(value.digit != null && value.digit !== n && !value.debt ? [{ label: r(locale, "root"), value: String(value.digit) }] : []),
    ...(steps !== String(n) ? [{ label: r(locale, "steps"), value: steps }] : []),
  ];
}

const MONTHS: Record<AppLocale, string[]> = {
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  fr: ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
};

/**
 * A date's steps with each part named (review 3 Oct, N5), so a Personal
 * Year and a Life Path that add the same digits read apart:
 * "6 (June) + 6 (15th) + 1 (2026) = 13 → 4".
 */
export function labelledSteps(value: NumerologyValue, locale: AppLocale): string {
  const terms = value.terms ?? [];
  if (terms.length < 2 || !terms.every((t) => t.key === "month" || t.key === "day" || t.key === "year")) return stepsText(value);
  const name = (t: (typeof terms)[number]) =>
    t.key === "month" ? MONTHS[locale][t.raw - 1] ?? String(t.raw) : t.key === "day" ? (locale === "fr" ? `le ${t.raw}` : `${t.raw}${ordinal(t.raw)}`) : String(t.raw);
  return `${terms.map((t) => `${t.value} (${name(t)})`).join(" + ")} = ${(value.chain ?? []).join(" → ")}`;
}

function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return "th";
  return n % 10 === 1 ? "st" : n % 10 === 2 ? "nd" : n % 10 === 3 ? "rd" : "th";
}

/** One part's reduction, "1990 → 19 → 10 → 1", or the number alone. */
function partChain(t: { raw: number; chain: readonly number[] }): string {
  return t.chain.length > 1 ? t.chain.join(" → ") : String(t.raw);
}

/**
 * How it is worked out, with the person's own date (review 3 Oct, N1), the
 * same way as the steps: each part reduced, then added; a karmic debt said.
 */
function reductionExample(chart: NumerologyChart, locale: AppLocale): string {
  const lp = chart.lifePath;
  const terms = lp.terms ?? [];
  const part = (k: string) => terms.find((t) => t.key === k);
  const m = part("month");
  const d = part("day");
  const y = part("year");
  if (lp.number == null || !m || !d || !y) return t(NUMEROLOGY_ABOUT.reduction, locale);
  const date = locale === "fr" ? `${d.raw} ${MONTHS.fr[m.raw - 1]} ${y.raw}` : `${d.raw} ${MONTHS.en[m.raw - 1]} ${y.raw}`;
  const sum = `${terms.map((x) => x.value).join(" + ")} = ${(lp.chain ?? []).join(" → ")}`;
  const debt = lp.debt
    ? locale === "fr"
      ? `, et le ${lp.debt} est gardé comme dette karmique`
      : `, and the ${lp.debt} is kept as a karmic debt`
    : "";
  return locale === "fr"
    ? `On réduit un nombre en additionnant ses chiffres jusqu’à n’en garder qu’un (11, 22 et 33 sont gardés). Pour votre naissance, le ${date}, chaque partie est réduite à part\u202f: le mois donne ${partChain(m)}, le jour ${partChain(d)}, l’année ${partChain(y)}\u202f; puis ${sum}, un Chemin de vie ${wholeText(lp)}${debt}. Les noms suivent le même principe, chaque lettre recevant une valeur de A = 1 à I = 9, puis J = 1 de nouveau.`
    : `Numbers are reduced by adding their digits until one is left (11, 22 and 33 are kept). For your birth, ${date}, each part is reduced on its own: the month gives ${partChain(m)}, the day ${partChain(d)}, the year ${partChain(y)}; then ${sum}, a Life Path of ${wholeText(lp)}${debt}. Names work the same way, with each letter given a value from A = 1 to I = 9, then J = 1 again.`;
}

/** The Personal Year worked out for this year and the next, with the person's own date (N1). */
function cycleExample(chart: NumerologyChart, locale: AppLocale): string {
  const year = chart.calendarYear;
  const now = numerologyYear(chart, year).personalYear;
  const next = numerologyYear(chart, year + 1).personalYear;
  if (now.number == null || next.number == null) return t(NUMEROLOGY_ABOUT.cycle, locale);
  return locale === "fr"
    ? `Les Années personnelles suivent un cycle de neuf ans, de 1 (commencement) à 9 (achèvement), puis recommencent. La vôtre additionne votre mois et votre jour de naissance, chacun réduit, à l’année en cours, réduite elle aussi\u202f: en ${year}, ${labelledSteps(now, locale)}. En ${year + 1}, ce sera une Année personnelle ${next.number}.`
    : `Personal Years run in a nine-year cycle, from 1 (beginnings) to 9 (completion), and then start again. Yours adds your birth month and birth day, each reduced, to the current year, reduced too: in ${year}, ${labelledSteps(now, locale)}. ${year + 1} will be a Personal Year ${next.number}.`;
}

/** What a number is in general, and when it is a master or went through a karmic debt. */
function numberSections(value: NumerologyValue, locale: AppLocale): ReadingSection[] {
  const n = value.number!;
  const master = numerologyMasterNote(locale, n);
  const general = numerologyNumberParagraphs(locale, n);
  return [
    ...(value.debt
      ? [{ id: "debt", title: r(locale, "debtTitle", { n: value.debt }), paragraphs: [t(KARMIC_DEBT_TEXT[value.debt as KarmicDebtKey], locale), t(KARMIC_DEBT_ABOUT, locale)] }]
      : []),
    ...(general.length ? [{ id: "number", title: r(locale, "numberTitle", { n }), paragraphs: general }] : []),
    ...(master ? [{ id: "master", title: r(locale, "masterTitle"), paragraphs: [master] }] : []),
  ];
}

/** The year in the Calendar (review 3 Oct, R4): its sky and your transits, with the personal year beside them. */
function calendarFact(year: number, locale: AppLocale) {
  return { label: locale === "fr" ? "Calendrier" : "Calendar", value: String(year), ref: `calendar-year:${year}` };
}

/** A core number in its place: what it asks of that place first, then the number, its debt or master note. */
function coreReading(chart: NumerologyChart, core: NumerologyCoreId, locale: AppLocale): ElementReading | null {
  const value = valueOfCore(chart, core);
  if (value.number == null) return null;
  const n = value.number;
  const hello = numerologyHelloCells(locale).find((c) => c.id === core);
  const kicker = hello?.sentence || t(CORE_KICKER[core], locale) || numerologyCoreLabel(locale, core);
  const role = numerologyCoreRole(locale, core);
  const place =
    core === "personalYear"
      ? value.digit
        ? t(PERSONAL_YEAR_TEXT[value.digit as CycleKey], locale)
        : ""
      : t((PLACE_TEXT[core as NumerologyPlace] as Partial<Record<number, Bi>>)[n], locale);
  const sections = numberSections(value, locale);
  const others = value.digit ? coresOnDigit(chart, value.digit).filter((id) => id !== core) : [];
  return {
    id: `core:${core}`,
    kind: "house",
    title: `${numerologyCoreLabel(locale, core)} ${wholeText(value)}`,
    kicker,
    mark: String(n),
    note: role,
    lead: place || keywordsOf(n, locale),
    paragraphs: [place, role, ...sections.flatMap((s) => s.paragraphs)].filter(Boolean),
    facts: core === "personalYear" ? [...numberFacts(value, locale), calendarFact(chart.calendarYear, locale)] : numberFacts(value, locale),
    sections,
    links: others.length
      ? {
          title: r(locale, "sameVibration"),
          rows: others.map((id) => ({ ref: `core:${id}`, label: numerologyCoreLabel(locale, id), detail: wholeText(valueOfCore(chart, id)) })),
        }
      : undefined,
    about: howAbout(
      locale,
      numerologyCoreHow(locale, core),
      core === "personalYear" ? cycleExample(chart, locale) : reductionExample(chart, locale),
    ),
  };
}

/** A number of the wheel: what it means, where it stands in the chart, a karmic lesson or the hidden passion. */
function numberReading(chart: NumerologyChart, n: number, locale: AppLocale): ElementReading | null {
  const row = NUMBER_TEXT[n as NumberKey];
  if (!row) return null;
  const digit = n === 11 ? 2 : n === 22 ? 4 : n === 33 ? 6 : n;
  const hits = coresOnDigit(chart, digit);
  const detail = chart.names.birth?.detail;
  const count = n <= 9 && detail ? (detail.counts[n] ?? 0) : null;
  const lesson = count === 0 && detail?.karmicLessons.includes(n);
  const passion = Boolean(detail?.hiddenPassion.includes(n));
  const general = numerologyNumberParagraphs(locale, n);
  return {
    id: `number:${n}`,
    kind: "house",
    title: r(locale, "numberTitle", { n }),
    kicker: hits.length ? hits.map((id) => numerologyCoreLabel(locale, id)).join(" · ") : r(locale, "notCore"),
    mark: String(n),
    paragraphs: general,
    note: r(locale, "numbersNote"),
    lead: t(row.what, locale),
    facts: [
      { label: r(locale, "keywords"), value: t(row.keywords, locale) },
      ...(count != null
        ? [{ label: r(locale, "letters"), value: String(count), ...(lesson ? { ref: "detail:lessons" } : passion ? { ref: "detail:passion" } : {}) }]
        : []),
    ],
    sections: [
      ...(lesson ? [{ id: "lesson", title: r(locale, "lessonTitle"), paragraphs: [t(KARMIC_LESSON_TEXT[n as Digit], locale), t(KARMIC_LESSON_ABOUT, locale)] }] : []),
      ...(passion ? [{ id: "passion", title: r(locale, "passionTitle"), paragraphs: [t(HIDDEN_PASSION_TEXT[n as Digit], locale), t(HIDDEN_PASSION_ABOUT, locale)] }] : []),
      { id: "number", title: r(locale, "strengthsTitle"), paragraphs: general.slice(1) },
      ...(n === 11 || n === 22 || n === 33 ? [{ id: "master", title: r(locale, "masterTitle"), paragraphs: [t(NUMEROLOGY_ABOUT.masters, locale)] }] : []),
    ],
    about: { title: r(locale, "aboutNumerology"), paragraphs: [t(NUMEROLOGY_ABOUT.system, locale), reductionExample(chart, locale)] },
    links: hits.length
      ? {
          title: r(locale, "inChart"),
          rows: hits.map((id) => ({ ref: `core:${id}`, label: numerologyCoreLabel(locale, id), detail: wholeText(valueOfCore(chart, id)) })),
        }
      : undefined,
  };
}

/** The first name's letters in their places: cornerstone, capstone, first vowel. */
function stonesOf(chart: NumerologyChart): Partial<Record<StoneId, NameLetter>> {
  const first = chart.names.birth?.parsed.words[0]?.letters ?? [];
  if (!first.length) return {};
  return { cornerstone: first[0], capstone: first[first.length - 1], firstVowel: first.find((l) => l.vowel) };
}

/** A letter of the birth name: its value, whether it is a vowel, what it adds to, its place in the first name. */
function letterReading(chart: NumerologyChart, pickId: string, locale: AppLocale): ElementReading | null {
  const birth = chart.names.birth;
  const at = Number(pickId.slice(7));
  const letter = birth?.parsed.letters.find((l) => l.index === at);
  if (!birth || !letter) return null;
  const fr = locale === "fr";
  const word = birth.parsed.words[letter.word]?.text ?? "";
  const feeds: NumerologyCoreId = letter.vowel ? "soulurge" : "personality";
  const role = r(locale, letter.vowel ? "aVowel" : "aConsonant");
  const lead = fr
    ? `${letter.ch} vaut ${letter.value}\u202f: ${role} de ${word}, qui ajoute ${letter.value} à l’Expression et ${letter.vowel ? "à l’Élan de l’âme" : "à la Personnalité"}.`
    : `${letter.ch} is worth ${letter.value}: ${role} of ${word}, adding ${letter.value} to the Expression and the ${letter.vowel ? "Soul Urge" : "Personality"}.`;
  const stones = stonesOf(chart);
  const places = (["cornerstone", "capstone", "firstVowel"] as const)
    .filter((id) => stones[id] === letter && !(id === "capstone" && stones.cornerstone === letter))
    .map((id) => t(STONE_TEXT[id], locale));
  if (places.length) places.push(t(LETTER_TEXT[letter.ch as LetterKey], locale));
  const ySection: ReadingSection[] =
    letter.yWhy && letter.yRule
      ? [
          {
            id: "y",
            title: r(locale, "yLetter"),
            paragraphs: [
              t(Y_WHY[letter.yWhy], locale),
              ...((letter.vowel ? "v" : "c") !== letter.yRule ? [r(locale, "yByHand", { role })] : []),
              t(Y_RULE, locale),
            ],
          },
        ]
      : [];
  return {
    id: pickId,
    kind: "house",
    title: `${letter.ch} = ${letter.value}`,
    kicker: fr ? `${letter.vowel ? "Voyelle" : "Consonne"} de ${word}` : `${letter.vowel ? "A vowel" : "A consonant"} of ${word}`,
    mark: letter.ch,
    lead,
    paragraphs: [lead, ...places, ...ySection.flatMap((s) => s.paragraphs)],
    facts: [
      { label: r(locale, "value"), value: String(letter.value), ref: `number:${letter.value}` },
      { label: r(locale, "name"), value: word },
    ],
    sections: [...(places.length ? [{ id: "place", title: r(locale, "itsPlace"), paragraphs: places }] : []), ...ySection],
    links: {
      title: r(locale, "addsTo"),
      rows: (["expression", feeds] as NumerologyCoreId[]).map((id) => ({
        ref: `core:${id}`,
        label: numerologyCoreLabel(locale, id),
        detail: wholeText(valueOfCore(chart, id)),
      })),
    },
    about: { title: fr ? "Comment les lettres comptent" : "How the letters count", paragraphs: [t(NUMEROLOGY_ABOUT.system, locale)] },
  };
}

/** The personal month or day the wheel's ticks show. */
function timeReading(chart: NumerologyChart, pickId: "time:month" | "time:day", locale: AppLocale): ElementReading | null {
  const month = pickId === "time:month";
  const value = month ? chart.personalMonth : chart.personalDay;
  if (value.digit == null) return null;
  const when = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
    ...(month ? {} : { day: "numeric" }),
  }).format(new Date(Date.UTC(chart.calendarYear, chart.calendarMonth - 1, chart.calendarDay)));
  const text = t((month ? PERSONAL_MONTH_TEXT : PERSONAL_DAY_TEXT)[value.digit as CycleKey], locale);
  return {
    id: pickId,
    kind: "house",
    title: `${p(locale, month ? "personalMonth" : "personalDay")} ${value.number}`,
    kicker: when,
    mark: String(value.number),
    lead: text,
    paragraphs: [text],
    facts: [
      { label: r(locale, "number"), value: String(value.number), ref: `number:${value.number}` },
      { label: r(locale, "steps"), value: stepsText(value) },
    ],
    about: howAbout(locale, cycleExample(chart, locale)),
  };
}

/** One of the finer numbers the Table view lists, with its text. */
function simpleReading(
  id: string,
  locale: AppLocale,
  o: { title: string; value: NumerologyValue; text: string; about: string; how?: string; extra?: ReadingFact[]; links?: ElementReading["links"] },
): ElementReading | null {
  if (o.value.number == null) return null;
  return {
    id,
    kind: "house",
    title: `${o.title} ${wholeText(o.value)}`,
    kicker: o.how ?? o.title,
    mark: String(o.value.number),
    lead: o.text,
    paragraphs: [o.text, o.about].filter(Boolean),
    facts: [...numberFacts(o.value, locale), ...(o.extra ?? [])],
    sections: [{ id: "number", title: r(locale, "numberTitle", { n: o.value.number }), paragraphs: [keywordsOf(o.value.number, locale)].filter(Boolean) }],
    links: o.links,
    about: howAbout(locale, o.about),
  };
}

/** The name's finer numbers and the two extra ones from the date: `detail:<id>`. */
function detailReading(chart: NumerologyChart, id: string, locale: AppLocale): ElementReading | null {
  const pickId = `detail:${id}`;
  if (id === "attitude" || id === "rationalThought") {
    const value = id === "attitude" ? chart.attitude : chart.rationalThought;
    const d = value.digit as Digit;
    return simpleReading(pickId, locale, {
      title: p(locale, id),
      value,
      text: t((id === "attitude" ? ATTITUDE_TEXT : RATIONAL_TEXT)[d], locale),
      about: t(id === "attitude" ? ATTITUDE_ABOUT : RATIONAL_ABOUT, locale),
      how: p(locale, id === "attitude" ? "from_attitude" : "from_rationalThought"),
    });
  }
  const birth = chart.names.birth;
  if (!birth) return null;
  const d = birth.detail;
  if (id === "balance") {
    const initials = birth.parsed.words.map((w) => w.letters[0]).filter((l): l is NameLetter => Boolean(l));
    return simpleReading(pickId, locale, {
      title: p(locale, "balance"),
      value: d.balance,
      text: t(BALANCE_TEXT[d.balance.digit as Digit], locale),
      about: t(BALANCE_ABOUT, locale),
      extra: [{ label: r(locale, "letters"), value: initials.map((l) => `${l.ch} ${l.value}`).join(" + ") }],
    });
  }
  if (id === "subconscious") {
    const n = d.subconsciousSelf;
    const text = t(SUBCONSCIOUS_TEXT[n as Digit], locale);
    return {
      id: pickId,
      kind: "house",
      title: `${p(locale, "subconscious")} ${n}`,
      kicker: p(locale, "subconsciousHow", { n: d.karmicLessons.length }),
      mark: String(n),
      lead: text,
      paragraphs: [text, t(SUBCONSCIOUS_ABOUT, locale)],
      facts: [
        { label: r(locale, "number"), value: String(n) },
        { label: p(locale, "lessons"), value: d.karmicLessons.join(", ") || p(locale, "none"), ...(d.karmicLessons.length ? { ref: "detail:lessons" } : {}) },
      ],
      about: howAbout(locale, t(SUBCONSCIOUS_ABOUT, locale)),
    };
  }
  if (id === "lessons") {
    const lessons = d.karmicLessons;
    const lead = lessons.length ? t(KARMIC_LESSON_TEXT[lessons[0] as Digit], locale) : r(locale, "noLesson");
    return {
      id: pickId,
      kind: "house",
      title: `${p(locale, "lessons")}${lessons.length ? ` ${lessons.join(", ")}` : ""}`,
      kicker: p(locale, "lessonsHow"),
      mark: lessons.length ? String(lessons.length) : "0",
      lead,
      paragraphs: [...lessons.map((n) => t(KARMIC_LESSON_TEXT[n as Digit], locale)), t(KARMIC_LESSON_ABOUT, locale)].filter(Boolean),
      facts: [{ label: p(locale, "subconscious"), value: String(d.subconsciousSelf), ref: "detail:subconscious" }],
      sections: lessons.slice(1).map((n) => ({ id: `lesson-${n}`, title: r(locale, "numberTitle", { n }), paragraphs: [t(KARMIC_LESSON_TEXT[n as Digit], locale)] })),
      links: lessons.length ? { title: r(locale, "inChart"), rows: lessons.map((n) => ({ ref: `number:${n}`, label: r(locale, "numberTitle", { n }), detail: r(locale, "letterCount", { n: 0 }) })) } : undefined,
      about: howAbout(locale, t(KARMIC_LESSON_ABOUT, locale)),
    };
  }
  if (id === "passion") {
    const passion = d.hiddenPassion;
    if (!passion.length) return null;
    const count = d.counts[passion[0]!] ?? 0;
    return {
      id: pickId,
      kind: "house",
      title: `${p(locale, "passion")} ${passion.join(", ")}`,
      kicker: p(locale, "passionHow", { count }),
      mark: String(passion[0]),
      lead: t(HIDDEN_PASSION_TEXT[passion[0] as Digit], locale),
      paragraphs: [...passion.map((n) => t(HIDDEN_PASSION_TEXT[n as Digit], locale)), t(HIDDEN_PASSION_ABOUT, locale)],
      facts: [{ label: r(locale, "letters"), value: String(count) }],
      sections: passion.slice(1).map((n) => ({ id: `passion-${n}`, title: r(locale, "numberTitle", { n }), paragraphs: [t(HIDDEN_PASSION_TEXT[n as Digit], locale)] })),
      links: { title: r(locale, "inChart"), rows: passion.map((n) => ({ ref: `number:${n}`, label: r(locale, "numberTitle", { n }), detail: r(locale, "letterCount", { n: d.counts[n] ?? 0 }) })) },
      about: howAbout(locale, t(HIDDEN_PASSION_ABOUT, locale)),
    };
  }
  if (id === "cornerstone" || id === "capstone" || id === "firstVowel") {
    const letter = stonesOf(chart)[id];
    if (!letter) return null;
    const role = t(STONE_TEXT[id], locale);
    const line = t(LETTER_TEXT[letter.ch as LetterKey], locale);
    return {
      id: pickId,
      kind: "house",
      title: `${p(locale, id)} · ${letter.ch}`,
      kicker: p(locale, `${id}How`),
      mark: letter.ch,
      lead: line,
      paragraphs: [line, role],
      facts: [
        { label: r(locale, "theLetter"), value: `${letter.ch} = ${letter.value}`, ref: `letter:${letter.index}` },
        { label: r(locale, "number"), value: String(letter.value), ref: `number:${letter.value}` },
      ],
      sections: [{ id: "place", title: r(locale, "itsPlace"), paragraphs: [role] }],
      about: howAbout(locale, role),
    };
  }
  if (id === "chaldean") {
    const c = birth.chaldean;
    if (!c) return null;
    const text = t(CHALDEAN_TEXT[c.single as Digit], locale);
    const steps = [c.total, ...(c.compound != null && c.compound !== c.total ? [c.compound] : []), ...(c.single !== (c.compound ?? c.total) ? [c.single] : [])];
    return {
      id: pickId,
      kind: "house",
      title: `${p(locale, "chaldean")} ${c.single}`,
      kicker: p(locale, "chaldeanNote"),
      mark: String(c.single),
      lead: text,
      paragraphs: [text, t(CHALDEAN_ABOUT, locale)],
      facts: [
        { label: r(locale, "steps"), value: steps.join(" → ") },
        ...(c.compound != null ? [{ label: r(locale, "compound"), value: String(c.compound) }] : []),
        { label: r(locale, "cheiroPlanet"), value: cap(r(locale, `planet_${c.single as Digit}`)) },
      ],
      about: howAbout(locale, t(CHALDEAN_ABOUT, locale)),
    };
  }
  return null;
}

/** A plane of expression: which letters of the name fall on it, and its number. */
function planeReading(chart: NumerologyChart, id: PlaneId, locale: AppLocale): ElementReading | null {
  const plane = chart.names.birth?.detail.planes.find((x) => x.id === id);
  if (!plane) return null;
  const n = plane.value.number;
  const text = t(PLANE_TEXT[id], locale);
  return {
    id: `plane:${id}`,
    kind: "house",
    title: n == null ? p(locale, `plane_${id}`) : `${p(locale, `plane_${id}`)} ${wholeText(plane.value)}`,
    kicker: plane.letters.length ? plane.letters.map((l) => l.ch).join(" ") : p(locale, "none"),
    mark: n == null ? "0" : String(n),
    lead: text,
    paragraphs: [text, ...(n != null ? [keywordsOf(n, locale)] : []), t(PLANES_ABOUT, locale)].filter(Boolean),
    facts: [
      { label: r(locale, "letters"), value: String(plane.letters.length) },
      ...(n != null ? numberFacts(plane.value, locale) : []),
    ],
    sections: n != null ? [{ id: "number", title: r(locale, "numberTitle", { n }), paragraphs: [keywordsOf(n, locale)] }] : [],
    links: {
      title: r(locale, "otherPlanes"),
      rows: PLANE_IDS.filter((x) => x !== id).map((x) => {
        const other = chart.names.birth!.detail.planes.find((pl) => pl.id === x)!;
        return { ref: `plane:${x}`, label: p(locale, `plane_${x}`), detail: other.value.number == null ? p(locale, "none") : wholeText(other.value) };
      }),
    },
    about: howAbout(locale, t(PLANES_ABOUT, locale)),
  };
}

/** A bridge between two core numbers: the gap, and the quality that closes it. */
function bridgeReading(chart: NumerologyChart, id: string, locale: AppLocale): ElementReading | null {
  if (id !== "lifePathExpression" && id !== "soulUrgePersonality") return null;
  const value = chart.bridges[id];
  if (value.number == null) return null;
  const [a, b]: NumerologyCoreId[] = id === "lifePathExpression" ? ["lifepath", "expression"] : ["soulurge", "personality"];
  const text = t(BRIDGE_TEXT[value.number as Gap], locale);
  const label = p(locale, id === "lifePathExpression" ? "bridgeLpEx" : "bridgeSuPe");
  return {
    id: `bridge:${id}`,
    kind: "house",
    title: `${label} ${value.number}`,
    kicker: r(locale, "bridgeBetween", { a: numerologyCoreLabel(locale, a), b: numerologyCoreLabel(locale, b) }),
    mark: String(value.number),
    lead: text,
    paragraphs: [text, t(BRIDGE_ABOUT, locale)],
    facts: [{ label: r(locale, "gap"), value: stepsText(value) }],
    links: {
      title: r(locale, "inChart"),
      rows: [a, b].map((core) => ({ ref: `core:${core}`, label: numerologyCoreLabel(locale, core), detail: wholeText(valueOfCore(chart, core)) })),
    },
    about: howAbout(locale, t(BRIDGE_ABOUT, locale)),
  };
}

const within = (span: AgeSpan, age: number) => age >= span.fromAge && (span.toAge == null || age < span.toAge);

function spanText(chart: NumerologyChart, span: AgeSpan, locale: AppLocale) {
  const ages = span.toAge == null ? p(locale, "onwards", { from: span.fromAge }) : `${span.fromAge}–${span.toAge}`;
  const from = chart.year + span.fromAge;
  const years = span.toAge == null ? p(locale, "onwards", { from }) : `${from}–${chart.year + span.toAge}`;
  return { ages, years };
}

function cycleNumberText(kind: CycleKind, n: number | null, locale: AppLocale): string {
  if (n == null) return "";
  if (kind === "challenge") return t(CHALLENGE_TEXT[n as Gap], locale);
  return t((kind === "pinnacle" ? PINNACLE_TEXT : PERIOD_TEXT)[n as CycleNumberKey], locale);
}

/** A period cycle, a pinnacle or a challenge: its number's text, its years, the others that run with it. */
function cycleReading(chart: NumerologyChart, kind: CycleKind, index: number, locale: AppLocale): ElementReading | null {
  const list = kind === "pinnacle" ? chart.life.pinnacles : kind === "challenge" ? chart.life.challenges : chart.life.periods;
  const c = list.find((x) => x.index === index);
  if (!c || c.value.number == null) return null;
  const n = c.value.number;
  const { ages, years } = spanText(chart, c, locale);
  const now = within(c, chart.age);
  const text = cycleNumberText(kind, n, locale);
  const place = kind === "period" ? t(PERIOD_PLACE_TEXT[index as 1 | 2 | 3], locale) : "";
  const main = kind === "challenge" && "main" in c && c.main ? r(locale, "mainForLife") : "";
  const about = t(CYCLE_ABOUT[kind], locale);
  const partner = kind === "pinnacle" ? chart.life.challenges.find((x) => x.index === index) : kind === "challenge" ? chart.life.pinnacles.find((x) => x.index === index) : null;
  const rows: ReadingLink[] = [
    ...(partner && partner.value.number != null
      ? [{ ref: `cycle:${kind === "pinnacle" ? "challenge" : "pinnacle"}:${index}`, label: p(locale, kind === "pinnacle" ? "cycle_challenge" : "cycle_pinnacle", { n: index }), detail: wholeText(partner.value) }]
      : []),
    ...list
      .filter((x) => x.index !== index)
      .map((x) => ({ ref: `cycle:${kind}:${x.index}`, label: p(locale, `cycle_${kind}`, { n: x.index }), detail: `${wholeText(x.value)} · ${spanText(chart, x, locale).ages}` })),
  ];
  return {
    id: `cycle:${kind}:${index}`,
    kind: "house",
    title: `${p(locale, `cycle_${kind}`, { n: index })} · ${wholeText(c.value)}`,
    kicker: `${ages} · ${years}${now ? ` · ${r(locale, "runningNow")}` : ""}`,
    mark: String(n),
    lead: text,
    paragraphs: [text, place, main, about].filter(Boolean),
    facts: [
      { label: r(locale, "number"), value: wholeText(c.value), ...(NUMBER_TEXT[n as NumberKey] ? { ref: `number:${n}` } : {}) },
      { label: r(locale, "steps"), value: stepsText(c.value) },
      { label: r(locale, "ages"), value: ages },
      { label: r(locale, "years"), value: years },
    ],
    sections: [
      ...(place ? [{ id: "place", title: r(locale, "placeInLife"), paragraphs: [place] }] : []),
      ...(main ? [{ id: "main", title: p(locale, "main"), paragraphs: [main] }] : []),
    ],
    links: rows.length ? { title: r(locale, "theCycles"), rows } : undefined,
    about: howAbout(locale, about),
  };
}

/** A year: its personal year, the long cycles running, the essence and the three letters of the name. */
function yearReading(chart: NumerologyChart, year: number, locale: AppLocale): ElementReading | null {
  if (!Number.isInteger(year)) return null;
  const row = numerologyYear(chart, year);
  const py = row.personalYear.number;
  if (py == null) return null;
  const c = row.cycles;
  const text = t(PERSONAL_YEAR_TEXT[py as CycleKey], locale);
  const uy = row.universalYear.number;
  const essence = c?.letters && c.essence.number != null ? c.essence : null;
  const essenceText = essence ? t(ESSENCE_TEXT[essence.number as EssenceKey], locale) : "";
  const letterLines = c?.letters
    ? LETTER_CYCLE_IDS.map((id) => {
        const span = c.letters![id];
        const l = span.letter;
        return `${r(locale, `cycle_${id}`)} · ${r(locale, "letterSpan", { letter: l.ch, value: l.value, from: span.fromAge, to: span.toAge })}. ${t(LETTER_CYCLE_TEXT[l.ch as LetterKey], locale)}`;
      })
    : [];
  const rows: ReadingLink[] = c
    ? (["pinnacle", "challenge", "period"] as const).map((kind) => {
        const x = c[kind];
        return { ref: `cycle:${kind}:${x.index}`, label: p(locale, `cycle_${kind}`, { n: x.index }), detail: wholeText(x.value) };
      })
    : [];
  return {
    id: `year:${year}`,
    kind: "house",
    title: `${year} · ${r(locale, "personalYearOf", { n: py })}`,
    kicker: c ? r(locale, "yearKicker", { year, age: p(locale, "ageShort", { age: row.age }) }) : r(locale, "beforeBirth"),
    mark: String(py),
    lead: text,
    paragraphs: [text, essenceText, ...letterLines].filter(Boolean),
    facts: [
      { label: numerologyCoreLabel(locale, "personalYear"), value: String(py) },
      { label: r(locale, "steps"), value: stepsText(row.personalYear) },
      ...(uy != null ? [{ label: p(locale, "universalYear"), value: String(uy) }] : []),
      ...(essence ? [{ label: numerologyWheelText(locale, "essence"), value: wholeText(essence) }] : []),
      calendarFact(year, locale),
    ],
    sections: [
      ...(essence ? [{ id: "essence", title: r(locale, "essenceTitle", { n: wholeText(essence) }), paragraphs: [essenceText, t(ESSENCE_ABOUT, locale)] }] : []),
      ...(letterLines.length ? [{ id: "letters", title: r(locale, "letterCycles"), paragraphs: letterLines }] : []),
      ...(uy != null ? [{ id: "universal", title: r(locale, "universalOf", { n: uy }), paragraphs: [t(UNIVERSAL_YEAR_TEXT[uy as Digit], locale)] }] : []),
    ],
    links: rows.length ? { title: r(locale, "inEffect"), rows } : undefined,
    about: howAbout(locale, cycleExample(chart, locale), ...(c?.letters ? [t(ESSENCE_ABOUT, locale), ...LETTER_CYCLE_IDS.map((id) => t(LETTER_CYCLE_ABOUT[id], locale))] : [])),
  };
}

export function numerologyReading(chart: NumerologyChart, pickId: string | null, locale: AppLocale): ElementReading | null {
  if (!pickId) return null;
  const [kind, a = "", b = ""] = pickId.split(":");
  switch (kind) {
    case "core":
      return CORES.includes(a as NumerologyCoreId) ? coreReading(chart, a as NumerologyCoreId, locale) : null;
    case "number": {
      const n = Number(a);
      return Number.isInteger(n) && n >= 1 ? numberReading(chart, n, locale) : null;
    }
    case "letter":
      return letterReading(chart, pickId, locale);
    case "time":
      return pickId === "time:month" || pickId === "time:day" ? timeReading(chart, pickId, locale) : null;
    case "detail":
      return detailReading(chart, a, locale);
    case "plane":
      return (PLANE_IDS as readonly string[]).includes(a) ? planeReading(chart, a as PlaneId, locale) : null;
    case "bridge":
      return bridgeReading(chart, a, locale);
    case "cycle":
      return a === "pinnacle" || a === "challenge" || a === "period" ? cycleReading(chart, a, Number(b), locale) : null;
    case "year":
      return yearReading(chart, Number(a), locale);
    default:
      return null;
  }
}

/** The steps of the first read (part 63): four core numbers and this year, each lighting its part of the wheel. */
export const FIRST_READ_STEPS: NumerologyCoreId[] = ["lifepath", "expression", "soulurge", "personality", "personalYear"];

/** A first-read step: the number written whole and the words of its place. */
export function numerologyFirstStep(chart: NumerologyChart, core: NumerologyCoreId, locale: AppLocale): { value: string; text: string } | null {
  const value = valueOfCore(chart, core);
  if (value.number == null) return null;
  const text =
    core === "personalYear"
      ? value.digit
        ? t(PERSONAL_YEAR_TEXT[value.digit as CycleKey], locale)
        : ""
      : t((PLACE_TEXT[core as NumerologyPlace] as Partial<Record<number, Bi>>)[value.number], locale);
  return { value: wholeText(value), text };
}

export function helloSelectId(id: NumerologyCoreId): string {
  return `core:${id}`;
}
