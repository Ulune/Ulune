import type { Bi } from "./types";
import type { AspectFamily } from "./astro-aspects";

/*
 * "You two, now" on astrology's Relationship pages (share and compare plan,
 * feature 5e): today's transits to the relationship's own chart, said for
 * two. What each moving planet brings to a pair, how a contact of each family
 * tends to feel, what the part is. Suggestions to use, never predictions; no
 * verdict on the relationship. Read through the pair-now reading pack
 * (pack-pair-now.ts), one language at a time.
 */

/** What a moving planet brings to two people, as a phrase that follows "bringing" or "asking for" (« apporte », « demande »). */
export const MOVING_TWO: Readonly<Record<string, Bi>> = {
  sun: { en: "attention, warmth and a sense of shared purpose", fr: "de l’attention, de la chaleur et un but commun" },
  mercury: { en: "talk, plans and listening", fr: "des échanges, des projets et de l’écoute" },
  venus: { en: "affection, pleasure and good company", fr: "de la tendresse, du plaisir et de la douceur" },
  mars: { en: "energy and initiative", fr: "de l’énergie et de l’initiative" },
  jupiter: { en: "growth, generosity and shared hopes", fr: "de la croissance, de la générosité et des espoirs partagés" },
  saturn: { en: "commitment, structure and patience", fr: "de l’engagement, de la structure et de la patience" },
  uranus: { en: "change, fresh air and room for each of you", fr: "du changement, de l’air frais et de la place pour chacun" },
  neptune: { en: "tenderness and imagination, with plain words to keep things clear", fr: "de la tendresse et de l’imagination, avec des mots simples pour garder les choses claires" },
  pluto: { en: "depth, honesty and renewal", fr: "de la profondeur, de la sincérité et du renouveau" },
  chiron: { en: "care for old sore points", fr: "du soin pour les vieux points sensibles" },
  northnode: { en: "a direction to grow in together", fr: "une direction où grandir ensemble" },
};

/**
 * A contact by its family. {moving}: the moving planet ("Saturn", « Saturne »), at the start of the
 * sentence; {point}: the relationship chart's point ("Sun", « le Soleil »); {pointWords}: what that point
 * stands for; {movingWords}: MOVING_TWO.
 */
export const FAMILY_TWO: Readonly<Record<AspectFamily, Bi>> = {
  blend: {
    en: "{moving} meets the relationship’s {point} ({pointWords}), bringing {movingWords} straight into this part of your bond. A good moment to begin something here together.",
    fr: "{moving} rejoint {point} de la relation ({pointWords}) et apporte {movingWords} au cœur de cette part de votre lien. Un bon moment pour y commencer quelque chose à deux.",
  },
  flow: {
    en: "{moving} supports the relationship’s {point} ({pointWords}), bringing {movingWords} to this part of your bond with ease. Easy contacts pass quietly unless you use them: a moment to plan or ask for something together.",
    fr: "{moving} soutient {point} de la relation ({pointWords}) et apporte sans effort {movingWords} à cette part de votre lien. Les contacts faciles passent inaperçus si l’on n’en fait rien\u202f: un moment pour faire des projets ou demander quelque chose ensemble.",
  },
  tension: {
    en: "{moving} presses on the relationship’s {point} ({pointWords}), asking for {movingWords} in this part of your bond. Talking it through, rather than pushing, tends to turn the pressure into progress together.",
    fr: "{moving} met sous pression {point} de la relation ({pointWords}) et demande {movingWords} dans cette part de votre lien. En parler, plutôt que forcer, change souvent la pression en progrès à deux.",
  },
};

/** What the part is: its "About". */
export const NOW_ABOUT: Bi = {
  en: "“You two, now” lays today’s sky on the relationship’s own chart, the composite (the midpoints of your two charts) or the Davison (the moment and place halfway between your births): the major aspects within a tight orb, the slow planets first, as they colour the time you share. Suggestions to use, never predictions.",
  fr: "«\u202fVous deux, maintenant\u202f» pose le ciel du jour sur le thème propre de la relation, le composite (les points médians de vos deux thèmes) ou le Davison (le moment et le lieu à mi-chemin de vos naissances)\u202f: les aspects majeurs à orbe serré, les planètes lentes d’abord, comme ils colorent le temps que vous partagez. Des suggestions à utiliser, jamais des prédictions.",
};

/** The summary's lead, with contacts and without. */
export const NOW_LEAD: Bi = {
  en: "Today’s sky touches the relationship’s chart in {n}: the slow planets set the tone of a season, the faster ones of a few days.",
  fr: "Le ciel du jour touche le thème de la relation en {n}\u202f: les planètes lentes donnent le ton d’une saison, les plus rapides celui de quelques jours.",
};
export const NOW_QUIET: Bi = {
  en: "No planet makes a major aspect within a tight orb to the relationship’s chart today: a quiet sky for the two of you, shaped by what you bring to it.",
  fr: "Aucune planète ne forme d’aspect majeur à orbe serré avec le thème de la relation aujourd’hui\u202f: un ciel calme pour vous deux, façonné par ce que vous y apportez.",
};
