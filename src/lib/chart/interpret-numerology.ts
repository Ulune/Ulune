import { pickBi } from "@/lib/content/types";
import {
  NUMBER_TEXT,
  NUMEROLOGY_ABOUT,
  PERSONAL_DAY_TEXT,
  PERSONAL_MONTH_TEXT,
  PERSONAL_YEAR_TEXT,
  type NumberKey,
} from "@/lib/content/numerology";
import type { Bi } from "@/lib/content/types";
import type { ElementReading } from "./types";
import { type NumerologyChart, type NumerologyCoreId, valueOfCore } from "./numerology";
import type { YReason } from "./numerology-name";
import { stepsText, wholeText } from "./numerology-reduce";
import type { AppLocale } from "@/lib/i18n/messages";
import { numerologyHelloCells } from "@/lib/i18n/numerology-hello";
import { numerologyCoreLabel } from "@/lib/i18n/numerology-ui";
import { numerologyNumberParagraphs } from "@/lib/i18n/numerology-text";
import { numerologyCoreHow, numerologyCoreRole, numerologyMasterNote } from "@/lib/i18n/numerology-prose";

function coresOnDigit(chart: NumerologyChart, digit: number): NumerologyCoreId[] {
  const ids: NumerologyCoreId[] = [
    "lifepath",
    "expression",
    "soulurge",
    "personality",
    "birthday",
    "maturity",
    "personalYear",
  ];
  return ids.filter((id) => valueOfCore(chart, id).digit === digit);
}

/** Short kicker for cores that have no Hello cell sentence. */
const CORE_KICKER: Partial<Record<NumerologyCoreId, { en: string; fr: string }>> = {
  personality: {
    en: "From the consonants of your name: the side of you others meet first.",
    fr: "Des consonnes de votre nom : la part de vous que les autres rencontrent d’abord.",
  },
  birthday: {
    en: "From the day of the month you were born: a particular talent.",
    fr: "Du jour du mois de votre naissance : un talent particulier.",
  },
  maturity: {
    en: "Life Path plus Expression: what grows stronger in the second half of life.",
    fr: "Chemin de vie plus Expression : ce qui se renforce dans la seconde moitié de la vie.",
  },
  personalYear: {
    en: "Where you are in a nine-year cycle, from your birth month and day and the current year.",
    fr: "Votre place dans un cycle de neuf ans, d’après votre mois et votre jour de naissance et l’année en cours.",
  },
};

export function numerologyReading(
  chart: NumerologyChart,
  pickId: string | null,
  locale: AppLocale,
): ElementReading | null {
  if (!pickId) return null;
  if (pickId.startsWith("core:")) {
    const core = pickId.slice(5) as NumerologyCoreId;
    const value = valueOfCore(chart, core);
    if (value.number == null) return null;
    const hello = numerologyHelloCells(locale).find((c) => c.id === core);
    const kicker = hello?.sentence || pickBi(CORE_KICKER[core], locale) || numerologyCoreLabel(locale, core);
    const fr = locale === "fr";
    const num = numerologyNumberParagraphs(locale, value.number);
    const master = numerologyMasterNote(locale, value.number);
    const others = value.digit ? coresOnDigit(chart, value.digit).filter((id) => id !== core) : [];
    return {
      id: pickId,
      kind: "house",
      title: `${numerologyCoreLabel(locale, core)} ${wholeText(value)}`,
      kicker,
      mark: String(value.number),
      paragraphs: [numerologyCoreRole(locale, core), ...num, ...(master ? [master] : [])],
      note: numerologyCoreRole(locale, core),
      lead:
        core === "personalYear" && value.digit != null
          ? pickBi(PERSONAL_YEAR_TEXT[value.digit as 1], locale)
          : `${pickBi(NUMBER_TEXT[value.number as NumberKey]?.keywords, locale)}.`.replace(/^./, (c) => c.toUpperCase()),
      facts: [
        { label: fr ? "Nombre" : "Number", value: String(value.number), ref: `number:${value.number}` },
        ...(value.digit != null && value.digit !== value.number ? [{ label: fr ? "Racine" : "Root", value: String(value.digit) }] : []),
        ...(stepsText(value) !== String(value.number) ? [{ label: fr ? "Calcul" : "Steps", value: stepsText(value) }] : []),
      ],
      sections: [
        { id: "number", title: fr ? `Le nombre ${value.number}` : `The number ${value.number}`, paragraphs: num },
        ...(master ? [{ id: "master", title: fr ? "Nombre maître" : "Master number", paragraphs: [master] }] : []),
      ],
      links: others.length
        ? {
            title: fr ? "Même vibration" : "Same vibration",
            rows: others.map((id) => ({
              ref: `core:${id}`,
              label: numerologyCoreLabel(locale, id),
              detail: String(valueOfCore(chart, id).number ?? ""),
            })),
          }
        : undefined,
      about: {
        title: fr ? "Comment on le calcule" : "How it’s worked out",
        paragraphs: [
          numerologyCoreHow(locale, core),
          pickBi(core === "personalYear" ? NUMEROLOGY_ABOUT.cycle : NUMEROLOGY_ABOUT.reduction, locale),
        ],
      },
    };
  }
  if (pickId.startsWith("number:")) {
    const n = Number(pickId.slice(7));
    if (!Number.isFinite(n) || n < 1) return null;
    const digit = n > 9 ? n === 11 ? 2 : n === 22 ? 4 : n === 33 ? 6 : n : n;
    const hits = digit >= 1 && digit <= 9 ? coresOnDigit(chart, digit) : [];
    const labels = hits.map((id) => numerologyCoreLabel(locale, id));
    return {
      id: pickId,
      kind: "house",
      title: locale === "fr" ? `Le nombre ${n}` : `The number ${n}`,
      kicker: labels.length
        ? labels.join(" · ")
        : locale === "fr"
          ? "Absent de vos nombres principaux"
          : "Not among your core numbers",
      mark: String(n),
      paragraphs: numerologyNumberParagraphs(locale, n),
      note:
        locale === "fr"
          ? "En numérologie, chaque nombre de 1 à 9 a une signification traditionnelle, et 11, 22 et 33 sont lus comme des nombres maîtres."
          : "In numerology, each number from 1 to 9 has a traditional meaning, and 11, 22 and 33 are read as master numbers.",
      lead: pickBi(NUMBER_TEXT[n as NumberKey]?.what, locale),
      facts: [{ label: locale === "fr" ? "Mots-clés" : "Keywords", value: pickBi(NUMBER_TEXT[n as NumberKey]?.keywords, locale) }],
      sections: [
        {
          id: "number",
          title: locale === "fr" ? "Forces, pièges, exemple" : "Strengths, pitfalls, example",
          paragraphs: numerologyNumberParagraphs(locale, n).slice(1),
        },
        ...(n === 11 || n === 22 || n === 33
          ? [{ id: "master", title: locale === "fr" ? "Nombre maître" : "Master number", paragraphs: [pickBi(NUMEROLOGY_ABOUT.masters, locale)] }]
          : []),
      ],
      about: {
        title: locale === "fr" ? "À propos de la numérologie" : "About numerology",
        paragraphs: [pickBi(NUMEROLOGY_ABOUT.system, locale), pickBi(NUMEROLOGY_ABOUT.reduction, locale)],
      },
      links: hits.length
        ? {
            title: locale === "fr" ? "Dans votre carte" : "In your chart",
            rows: hits.map((id) => ({
              ref: `core:${id}`,
              label: numerologyCoreLabel(locale, id),
              detail: String(valueOfCore(chart, id).number ?? ""),
            })),
          }
        : undefined,
    };
  }
  if (pickId.startsWith("letter:")) return letterReading(chart, pickId, locale);
  if (pickId === "time:month" || pickId === "time:day") return timeReading(chart, pickId, locale);
  return null;
}

/** Why Decoz's rule makes this Y a vowel or a consonant, with a name it happens in. */
const Y_WHY: Record<YReason, Bi> = {
  alone: { en: "Alone, a Y is read as a vowel.", fr: "Seul, un Y se lit comme une voyelle." },
  firstBeforeConsonant: {
    en: "First in its name and before a consonant, it sounds as a vowel (as in Yvonne).",
    fr: "En tête de son nom et devant une consonne, il sonne comme une voyelle (comme dans Yvonne).",
  },
  firstBeforeVowel: {
    en: "First in its name and before a vowel, it sounds as a consonant (as in Yolanda).",
    fr: "En tête de son nom et devant une voyelle, il sonne comme une consonne (comme dans Yolanda).",
  },
  lastAfterConsonant: {
    en: "Last and after a consonant, it sounds as a vowel (as in Barry).",
    fr: "En fin de nom et après une consonne, il sonne comme une voyelle (comme dans Barry).",
  },
  lastAfterVowel: {
    en: "Last and after a vowel, it goes with that vowel as a consonant (as in Mickey).",
    fr: "En fin de nom et après une voyelle, il va avec elle, comme une consonne (comme dans Mickey).",
  },
  betweenConsonants: {
    en: "Between two consonants, it is the vowel of its syllable (as in Kyle).",
    fr: "Entre deux consonnes, c’est la voyelle de sa syllabe (comme dans Kyle).",
  },
  afterVowel: {
    en: "After a vowel, it goes with it as a consonant (as in Taylor).",
    fr: "Après une voyelle, il va avec elle, comme une consonne (comme dans Taylor).",
  },
  onlyVowel: {
    en: "Before a vowel, with no vowel earlier in the name, it is its syllable’s vowel (as in Ryan).",
    fr: "Devant une voyelle, sans voyelle avant lui dans le nom, c’est la voyelle de sa syllabe (comme dans Ryan).",
  },
  beforeVowel: {
    en: "Before a vowel, with a vowel earlier in the name, it sounds as a consonant (as in Tanya).",
    fr: "Devant une voyelle, avec une voyelle plus tôt dans le nom, il sonne comme une consonne (comme dans Tanya).",
  },
};

const Y_RULE: Bi = {
  en: "This is Hans Decoz’s rule, by the Y’s place in the name. A name can sound otherwise: each Y can be switched under the wheel, and the numbers follow.",
  fr: "C’est la règle de Hans Decoz, selon la place du Y dans le nom. Un nom peut se prononcer autrement\u202f: chaque Y peut être changé sous la roue, et les nombres suivent.",
};

/** A letter of the birth name: its value, whether it is a vowel, what it adds to. */
function letterReading(chart: NumerologyChart, pickId: string, locale: AppLocale): ElementReading | null {
  const birth = chart.names.birth;
  const at = Number(pickId.slice(7));
  const letter = birth?.parsed.letters.find((l) => l.index === at);
  if (!birth || !letter) return null;
  const fr = locale === "fr";
  const word = birth.parsed.words[letter.word]?.text ?? "";
  const feeds: NumerologyCoreId = letter.vowel ? "soulurge" : "personality";
  const role = letter.vowel ? (fr ? "une voyelle" : "a vowel") : fr ? "une consonne" : "a consonant";
  const lead = fr
    ? `${letter.ch} vaut ${letter.value}\u202f: ${role} de ${word}, qui ajoute ${letter.value} à l’Expression et ${letter.vowel ? "à l’Élan de l’âme" : "à la Personnalité"}.`
    : `${letter.ch} is worth ${letter.value}: ${role} of ${word}, adding ${letter.value} to the Expression and the ${letter.vowel ? "Soul Urge" : "Personality"}.`;
  const first = birth.parsed.words[0]?.letters ?? [];
  const places: string[] = [];
  if (letter.word === 0 && first[0] === letter)
    places.push(fr ? "C’est la pierre angulaire\u202f: la première lettre du prénom, votre façon d’aborder ce qui vient." : "It is the cornerstone: the first letter of the first name, how you meet what comes.");
  else if (letter.word === 0 && first[first.length - 1] === letter)
    places.push(fr ? "C’est la pierre de faîte\u202f: la dernière lettre du prénom, votre façon de mener une chose à son terme." : "It is the capstone: the last letter of the first name, how you bring a thing to its end.");
  if (letter.word === 0 && first.find((l) => l.vowel) === letter)
    places.push(fr ? "C’est la première voyelle du prénom\u202f: un aperçu de ce que vous êtes au fond." : "It is the first vowel of the first name: a glimpse of who you are deep down.");
  const ySection =
    letter.yWhy && letter.yRule
      ? [
          {
            id: "y",
            title: fr ? "La lettre Y" : "The letter Y",
            paragraphs: [
              pickBi(Y_WHY[letter.yWhy], locale),
              ...((letter.vowel ? "v" : "c") !== letter.yRule
                ? [fr ? `Changé à la main\u202f: compté ici comme ${role}.` : `Switched by hand: counted here as ${role}.`]
                : []),
              pickBi(Y_RULE, locale),
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
    paragraphs: [lead, ...places, ...ySection.flatMap((sct) => sct.paragraphs)],
    facts: [
      { label: fr ? "Valeur" : "Value", value: String(letter.value), ref: `number:${letter.value}` },
      { label: fr ? "Nom" : "Name", value: word },
    ],
    sections: [...(places.length ? [{ id: "place", title: fr ? "Sa place" : "Its place", paragraphs: places }] : []), ...ySection],
    links: {
      title: fr ? "Elle ajoute à" : "It adds to",
      rows: (["expression", feeds] as NumerologyCoreId[]).map((id) => ({
        ref: `core:${id}`,
        label: numerologyCoreLabel(locale, id),
        detail: wholeText(valueOfCore(chart, id)),
      })),
    },
    about: {
      title: fr ? "Comment les lettres comptent" : "How the letters count",
      paragraphs: [pickBi(NUMEROLOGY_ABOUT.system, locale)],
    },
  };
}

/** The personal month or day the wheel's ticks show. */
function timeReading(chart: NumerologyChart, pickId: "time:month" | "time:day", locale: AppLocale): ElementReading | null {
  const month = pickId === "time:month";
  const value = month ? chart.personalMonth : chart.personalDay;
  if (value.digit == null) return null;
  const fr = locale === "fr";
  const when = new Intl.DateTimeFormat(fr ? "fr-FR" : "en-GB", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
    ...(month ? {} : { day: "numeric" }),
  }).format(new Date(Date.UTC(chart.calendarYear, chart.calendarMonth - 1, chart.calendarDay)));
  const text = pickBi((month ? PERSONAL_MONTH_TEXT : PERSONAL_DAY_TEXT)[value.digit as 1], locale);
  const label = month ? (fr ? "Mois personnel" : "Personal month") : fr ? "Jour personnel" : "Personal day";
  return {
    id: pickId,
    kind: "house",
    title: `${label} ${value.number}`,
    kicker: when,
    mark: String(value.number),
    lead: text,
    paragraphs: [text],
    facts: [
      { label: fr ? "Nombre" : "Number", value: String(value.number), ref: `number:${value.number}` },
      { label: fr ? "Calcul" : "Steps", value: stepsText(value) },
    ],
    about: { title: fr ? "Comment on le calcule" : "How it’s worked out", paragraphs: [pickBi(NUMEROLOGY_ABOUT.cycle, locale)] },
  };
}

export function helloSelectId(id: NumerologyCoreId): string {
  return `core:${id}`;
}
