/*
 * What BaZi's pillar board says (languages plan, part 12): each Day Master
 * by its classical image, and what each of the Ten Gods stands for. The
 * images are the tradition's (the Di Tian Sui's verses on the ten stems,
 * public domain, said in Ulune's words); what the gods stand for is the
 * consensus of the Zi Ping school. The full readings (each god present or
 * missing, strength, structure) come with part 18. Neutral: no fate, no
 * health, no orders; scripts/chinese-bazi.test.mjs keeps both languages,
 * their typography and their tone.
 */
import type { Both } from "./zodiac-texts";
import type { GodFamily, TenGodId } from "./bazi";

/** The ten Day Masters, by stem (0 = Jia … 9 = Gui): the image the tradition gives each. */
export const DAY_MASTER_IMAGES: readonly Both[] = [
  [
    "Jia, Yang Wood, is the tall tree: upright, growing towards the light, steady in its roots. The tradition reads someone who stands for something and grows by keeping straight.",
    "Jia, le Bois yang, est le grand arbre\u202f: droit, tourné vers la lumière, solide dans ses racines. La tradition y lit quelqu’un qui défend quelque chose et grandit en restant droit.",
  ],
  [
    "Yi, Yin Wood, is the vine and the flower: supple, finding its way round obstacles, thriving by what it leans on. The tradition reads tact, adaptability and quiet persistence.",
    "Yi, le Bois yin, est la liane et la fleur\u202f: souple, contournant les obstacles, prospérant grâce à ses appuis. La tradition y lit le tact, l’adaptabilité et une persévérance discrète.",
  ],
  [
    "Bing, Yang Fire, is the sun: warm, generous, shining on everyone alike. The tradition reads openness, enthusiasm and a presence that lights up a room.",
    "Bing, le Feu yang, est le soleil\u202f: chaud, généreux, brillant pour tous également. La tradition y lit l’ouverture, l’enthousiasme et une présence qui illumine une pièce.",
  ],
  [
    "Ding, Yin Fire, is the candle and the lamp: a focused light that shows the way in the dark. The tradition reads warmth for those close, insight and a quiet devotion.",
    "Ding, le Feu yin, est la bougie et la lampe\u202f: une lumière concentrée qui montre le chemin dans le noir. La tradition y lit la chaleur pour les proches, la clairvoyance et un dévouement discret.",
  ],
  [
    "Wu, Yang Earth, is the mountain: solid, broad, unmoved by passing weather. The tradition reads reliability, patience and a calm that others lean on.",
    "Wu, la Terre yang, est la montagne\u202f: solide, large, insensible au temps qui passe. La tradition y lit la fiabilité, la patience et un calme sur lequel les autres s’appuient.",
  ],
  [
    "Ji, Yin Earth, is the field and the garden soil: fertile, receptive, nourishing what is planted in it. The tradition reads care, practicality and a gift for making things grow.",
    "Ji, la Terre yin, est le champ et la terre du jardin\u202f: fertile, accueillante, nourrissant ce qu’on y plante. La tradition y lit le soin, le sens pratique et le don de faire pousser les choses.",
  ],
  [
    "Geng, Yang Metal, is the raw ore and the axe: strong, decisive, made sharper by the forge. The tradition reads courage, frankness and a sense of justice.",
    "Geng, le Métal yang, est le minerai brut et la hache\u202f: fort, décidé, affûté par la forge. La tradition y lit le courage, la franchise et le sens de la justice.",
  ],
  [
    "Xin, Yin Metal, is the jewel and the fine blade: refined, precise, shining when it is washed clean. The tradition reads taste, sensitivity and high standards.",
    "Xin, le Métal yin, est le joyau et la lame fine\u202f: raffiné, précis, brillant quand on le lave. La tradition y lit le goût, la sensibilité et des exigences élevées.",
  ],
  [
    "Ren, Yang Water, is the river and the sea: wide, moving, carrying everything along. The tradition reads intelligence, freedom and a wish to go far.",
    "Ren, l’Eau yang, est le fleuve et la mer\u202f: vaste, mouvante, emportant tout avec elle. La tradition y lit l’intelligence, la liberté et l’envie d’aller loin.",
  ],
  [
    "Gui, Yin Water, is the rain and the dew: gentle, everywhere, giving life quietly. The tradition reads intuition, imagination and a care that works unseen.",
    "Gui, l’Eau yin, est la pluie et la rosée\u202f: douce, partout, donnant la vie sans bruit. La tradition y lit l’intuition, l’imagination et un soin qui agit sans se montrer.",
  ],
];

/** What each of the Ten Gods stands for, by the Zi Ping school's consensus. */
export const TEN_GOD_TEXTS: Readonly<Record<TenGodId, Both>> = {
  companion: [
    "The Companion is the same phase as the Day Master, and of the same polarity: peers, friends and siblings, self-reliance and the will to stand on one’s own.",
    "Le Compagnon est de la même phase que le Maître du jour, et de la même polarité\u202f: les pairs, les amis et la fratrie, l’autonomie et la volonté de tenir debout seul.",
  ],
  "rob-wealth": [
    "Rob Wealth is the same phase as the Day Master, of the other polarity: rivals and teammates at once, competition, boldness and a readiness to share or to take risks.",
    "Le Rival est de la même phase que le Maître du jour, de l’autre polarité\u202f: rivaux et coéquipiers à la fois, la compétition, l’audace et l’envie de partager ou de risquer.",
  ],
  "eating-god": [
    "The Eating God is the phase the Day Master produces, of the same polarity: talent expressed with ease, enjoyment, creativity and a generous, relaxed way of giving.",
    "Le Dieu nourricier est la phase que produit le Maître du jour, de la même polarité\u202f: le talent exprimé avec aisance, le plaisir, la créativité et une générosité détendue.",
  ],
  "hurting-officer": [
    "The Hurting Officer is the phase the Day Master produces, of the other polarity: brilliance and a sharp tongue, originality and a readiness to question rules.",
    "L’Officier blessant est la phase que produit le Maître du jour, de l’autre polarité\u202f: le brio et la parole vive, l’originalité et l’envie de remettre les règles en question.",
  ],
  "indirect-wealth": [
    "Indirect Wealth is the phase the Day Master controls, of the same polarity: opportunities, ventures and windfalls, generosity and a broad, open hand.",
    "La Richesse indirecte est la phase que contrôle le Maître du jour, de la même polarité\u202f: les occasions, les entreprises et les aubaines, la générosité et la main ouverte.",
  ],
  "direct-wealth": [
    "Direct Wealth is the phase the Day Master controls, of the other polarity: steady earnings and what is built by work, care with resources and a sense of reward.",
    "La Richesse directe est la phase que contrôle le Maître du jour, de l’autre polarité\u202f: les gains réguliers et ce que bâtit le travail, le soin des ressources et le sens de la récompense.",
  ],
  "seven-killings": [
    "Seven Killings is the phase that controls the Day Master, of the same polarity: pressure and challenge, courage under fire, ambition and the drive to take charge.",
    "Les Sept Tueurs sont la phase qui contrôle le Maître du jour, de la même polarité\u202f: la pression et le défi, le courage dans l’épreuve, l’ambition et l’élan pour prendre les choses en main.",
  ],
  "direct-officer": [
    "The Direct Officer is the phase that controls the Day Master, of the other polarity: order, duty and reputation, fairness and the respect of rules.",
    "L’Officier direct est la phase qui contrôle le Maître du jour, de l’autre polarité\u202f: l’ordre, le devoir et la réputation, l’équité et le respect des règles.",
  ],
  "indirect-resource": [
    "The Indirect Resource is the phase that produces the Day Master, of the same polarity: unusual knowledge and intuition, solitude that feeds, an independent mind.",
    "La Ressource indirecte est la phase qui produit le Maître du jour, de la même polarité\u202f: le savoir peu commun et l’intuition, une solitude qui nourrit, un esprit indépendant.",
  ],
  "direct-resource": [
    "The Direct Resource is the phase that produces the Day Master, of the other polarity: learning and support, care received and given, patience and protection.",
    "La Ressource directe est la phase qui produit le Maître du jour, de l’autre polarité\u202f: l’apprentissage et le soutien, le soin reçu et donné, la patience et la protection.",
  ],
};

/** The families' names, as the board's key says them. */
export const FAMILY_NAMES: Readonly<Record<GodFamily, Both>> = {
  peer: ["Peers: the same phase", "Les pairs\u202f: la même phase"],
  output: ["Output: what you produce", "L’expression\u202f: ce que vous produisez"],
  wealth: ["Wealth: what you control", "La richesse\u202f: ce que vous contrôlez"],
  power: ["Power: what controls you", "Le pouvoir\u202f: ce qui vous contrôle"],
  resource: ["Resource: what produces you", "La ressource\u202f: ce qui vous produit"],
};
