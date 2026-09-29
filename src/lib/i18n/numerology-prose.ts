import type { NumerologyCoreId } from "@/lib/chart/numerology";
import type { AppLocale } from "./messages";

type Pair = { en: string; fr: string };

/** What each position means, and how it is worked out. */
const CORE: Record<NumerologyCoreId, { role: Pair; how: Pair }> = {
  lifepath: {
    role: {
      en: "The Life Path is the most important number in numerology. Worked out from your full birth date, it describes the main direction of your life: the kind of work, challenges and lessons you keep meeting, whatever you decide to do.",
      fr: "Le Chemin de vie est le nombre le plus important en numérologie. Calculé à partir de la date de naissance complète, il décrit l’orientation principale de votre vie : le genre de travail, de défis et de leçons que vous rencontrez sans cesse, quoi que vous décidiez de faire.",
    },
    how: {
      en: "The Life Path reduces the month, the day and the year of birth separately, then adds them and reduces the total, keeping the master numbers 11, 22 and 33.",
      fr: "Le Chemin de vie réduit séparément le mois, le jour et l’année de naissance, puis les additionne et réduit le total, en gardant les nombres maîtres 11, 22 et 33.",
    },
  },
  expression: {
    role: {
      en: "The Expression number (also called Destiny) comes from every letter of your full birth name. It describes your natural abilities and how you tend to use them — the way you work, speak and get things done.",
      fr: "Le nombre d’Expression (aussi appelé Destinée) vient de toutes les lettres de votre nom de naissance complet. Il décrit vos aptitudes naturelles et la façon dont vous les employez — votre manière de travailler, de parler et de mener les choses.",
    },
    how: {
      en: "Expression adds the letters of each name of the full birth name (A = 1 … I = 9, then J = 1 again) and reduces each name on its own, then adds the names and reduces the total, keeping 11, 22 and 33 (Hans Decoz’s way).",
      fr: "L’Expression additionne les lettres de chaque nom du nom de naissance complet (A = 1 … I = 9, puis J = 1 à nouveau) et réduit chaque nom à part, puis additionne les noms et réduit le total, en gardant 11, 22 et 33 (la méthode de Hans Decoz).",
    },
  },
  soulurge: {
    role: {
      en: "The Soul Urge number (also called Heart’s Desire) comes from the vowels of your birth name. It describes what you want deep down — the motivation behind your choices, which other people do not always see.",
      fr: "Le nombre d’Élan de l’âme (aussi appelé Désir du cœur) vient des voyelles de votre nom de naissance. Il décrit ce que vous voulez au fond — la motivation derrière vos choix, que les autres ne voient pas toujours.",
    },
    how: {
      en: "Soul Urge adds the vowels of each name the same way: A, E, I, O, U, and Y where it sounds like a vowel, by its place in the name. Each Y can be switched by hand.",
      fr: "L’Élan de l’âme additionne de la même façon les voyelles de chaque nom\u202f: A, E, I, O, U, et Y là où il sonne comme une voyelle, selon sa place dans le nom. Chaque Y peut être changé à la main.",
    },
  },
  personality: {
    role: {
      en: "The Personality number comes from the consonants of your birth name. It describes the impression you make on people who do not know you yet — what they notice first, before they see your deeper motives.",
      fr: "Le nombre de Personnalité vient des consonnes de votre nom de naissance. Il décrit l’impression que vous faites sur les personnes qui ne vous connaissent pas encore — ce qu’elles remarquent en premier, avant de voir vos motivations profondes.",
    },
    how: {
      en: "Personality adds the consonants of each name the same way; W is always one, and Y is one where it goes with a vowel.",
      fr: "La Personnalité additionne de la même façon les consonnes de chaque nom\u202f; le W en est toujours une, et le Y aussi là où il accompagne une voyelle.",
    },
  },
  birthday: {
    role: {
      en: "The Birthday number comes from the day of the month you were born. It is a secondary number that points to one specific talent, often visible early in life.",
      fr: "Le nombre d’Anniversaire vient du jour du mois de votre naissance. C’est un nombre secondaire qui indique un talent précis, souvent visible tôt dans la vie.",
    },
    how: {
      en: "The Birthday number reduces the day of the month you were born, keeping 11 and 22 (for the 11th, the 22nd and the 29th).",
      fr: "Le nombre d’Anniversaire réduit le jour du mois de naissance, en gardant 11 et 22 (pour le 11, le 22 et le 29).",
    },
  },
  maturity: {
    role: {
      en: "The Maturity number combines your Life Path and your Expression. It describes a goal that becomes clearer with age, usually from your late thirties or forties, as you learn to put your abilities to work in the direction of your life.",
      fr: "Le nombre de Maturité combine le Chemin de vie et l’Expression. Il décrit un objectif qui se précise avec l’âge, en général vers la fin de la trentaine ou la quarantaine, à mesure que vous apprenez à mettre vos aptitudes au service de votre direction de vie.",
    },
    how: {
      en: "Maturity adds the Life Path and the Expression, then reduces the total, keeping 11, 22 and 33.",
      fr: "La Maturité additionne le Chemin de vie et l’Expression, puis réduit le total, en gardant 11, 22 et 33.",
    },
  },
  personalYear: {
    role: {
      en: "The Personal Year shows where you are in a nine-year cycle that starts again after 9. It changes every year and gives the main theme of the current one: starting (1), cooperating (2), expressing (3), building (4), and so on.",
      fr: "L’Année personnelle indique où vous en êtes dans un cycle de neuf ans qui recommence après 9. Elle change chaque année et donne le thème principal de l’année en cours : commencer (1), coopérer (2), s’exprimer (3), construire (4), etc.",
    },
    how: {
      en: "The Personal Year adds your birth month and day to the current calendar year, then reduces the total to a single digit.",
      fr: "L’Année personnelle additionne votre mois et votre jour de naissance à l’année civile en cours, puis réduit le total à un seul chiffre.",
    },
  },
};

export function numerologyCoreRole(locale: AppLocale, id: NumerologyCoreId) {
  return CORE[id].role[locale === "fr" ? "fr" : "en"];
}
export function numerologyCoreHow(locale: AppLocale, id: NumerologyCoreId) {
  return CORE[id].how[locale === "fr" ? "fr" : "en"];
}
export function numerologyMasterNote(locale: AppLocale, n: number) {
  if (n !== 11 && n !== 22 && n !== 33) return null;
  const root = n === 11 ? 2 : n === 22 ? 4 : 6;
  return locale === "fr"
    ? `${n} est un nombre maître : on le garde entier au lieu de le réduire à ${root}, car on le lit comme une version plus intense et plus exigeante du ${root}. On le vit souvent d’abord comme un ${root}, avant de grandir vers le ${n}.`
    : `${n} is a master number: it is kept whole instead of being reduced to ${root}, because it is read as a more intense, more demanding version of ${root}. People often live it as a ${root} first and grow into the ${n} later.`;
}
