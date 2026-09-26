import { pickBi } from "@/lib/content/types";
import { NUMBER_TEXT, NUMEROLOGY_ABOUT, PERSONAL_YEAR_TEXT, type NumberKey } from "@/lib/content/numerology";
import type { ElementReading } from "./types";
import { type NumerologyChart, type NumerologyCoreId, valueOfCore } from "./numerology";
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
      title: `${numerologyCoreLabel(locale, core)} ${value.number}`,
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
  return null;
}

export function helloSelectId(id: NumerologyCoreId): string {
  return `core:${id}`;
}
