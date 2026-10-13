/*
 * What the Flying Stars' formations are called and say (languages plan, part
 * 23), in English and French, with their classical names. What the classics
 * read in each, and what practitioners usually suggest: never a threat,
 * nothing to buy, no change to the building asked for.
 * scripts/chinese-fengshui-stars.test.mjs keeps both languages and their tone.
 */
import type { ChineseName } from "./names";
import type { Both } from "./zodiac-texts";
import type { FormationId, StarState } from "./fengshui-stars";

export const FORMATION_NAMES: Readonly<Record<FormationId, ChineseName>> = {
  prosperous: { hant: "旺山旺向", hans: "旺山旺向", pinyin: "wàng shān wàng xiàng", en: "Prosperous at sitting and facing", fr: "Prospère au dos et à la façade" },
  reversed: { hant: "上山下水", hans: "上山下水", pinyin: "shàng shān xià shuǐ", en: "Reversed", fr: "Inversé" },
  "double-facing": { hant: "雙星到向", hans: "双星到向", pinyin: "shuāng xīng dào xiàng", en: "Double stars at the facing", fr: "Étoiles doubles à la façade" },
  "double-sitting": { hant: "雙星到坐", hans: "双星到坐", pinyin: "shuāng xīng dào zuò", en: "Double stars at the sitting", fr: "Étoiles doubles au dos" },
  "ten-mountain": { hant: "山星合十", hans: "山星合十", pinyin: "shān xīng hé shí", en: "Combination of Ten, mountain", fr: "Combinaison de dix, montagne" },
  "ten-water": { hant: "向星合十", hans: "向星合十", pinyin: "xiàng xīng hé shí", en: "Combination of Ten, water", fr: "Combinaison de dix, eau" },
  "parent-string": { hant: "父母三般卦", hans: "父母三般卦", pinyin: "fùmǔ sānbān guà", en: "Parent string", fr: "Chaîne des parents" },
  "pearl-string": { hant: "連珠三般卦", hans: "连珠三般卦", pinyin: "liánzhū sānbān guà", en: "Pearl string", fr: "Chaîne de perles" },
  "fu-yin": { hant: "伏吟", hans: "伏吟", pinyin: "fú yín", en: "Repeated chart", fr: "Thème répété" },
  "fan-yin": { hant: "反吟", hans: "反吟", pinyin: "fǎn yín", en: "Opposed chart", fr: "Thème opposé" },
};

export const FORMATION_TEXTS: Readonly<Record<FormationId, Both>> = {
  prosperous: [
    "The period’s star stands as the mountain star at the back and as the water star at the front, where the classics want them: support behind, opportunity ahead. Many practitioners count it the most balanced chart a period offers.",
    "L’étoile de la période se tient comme étoile de la montagne au dos et comme étoile de l’eau à la façade, là où les classiques les veulent\u202f: un appui derrière, une ouverture devant. Beaucoup de praticiens y voient le thème le plus équilibré qu’une période puisse offrir.",
  ],
  reversed: [
    "The period’s mountain star stands at the front and its water star at the back, the other way round from where the classics want them. Practitioners usually answer it with the surroundings rather than the building: something steady or tall at the front, open space at the back.",
    "L’étoile de la montagne de la période se tient à la façade et son étoile de l’eau au dos, à l’inverse de ce que veulent les classiques. Les praticiens y répondent d’ordinaire par les abords plutôt que par le bâtiment\u202f: quelque chose de stable ou de haut devant, de l’espace ouvert derrière.",
  ],
  "double-facing": [
    "Both of the period’s stars stand at the front. The front counts twice: practitioners suggest keeping it open and lively for the water star, with something steady nearby, a wall, a tall plant, a heavy piece of furniture, for the mountain star.",
    "Les deux étoiles de la période se tiennent à la façade. L’avant compte double\u202f: les praticiens suggèrent de le garder ouvert et vivant pour l’étoile de l’eau, avec quelque chose de stable tout près, un mur, une grande plante, un meuble lourd, pour l’étoile de la montagne.",
  ],
  "double-sitting": [
    "Both of the period’s stars stand at the back. Practitioners suggest a steady, quiet back for the mountain star and, where the home allows it, some open space or a view behind for the water star.",
    "Les deux étoiles de la période se tiennent au dos. Les praticiens suggèrent un arrière stable et calme pour l’étoile de la montagne et, quand le logement le permet, un peu d’espace ouvert ou une vue derrière pour l’étoile de l’eau.",
  ],
  "ten-mountain": [
    "In every palace the mountain star and the period star add up to ten. The classics read it as a chart whose stars work together, for people and the bonds between them.",
    "Dans chaque palais, l’étoile de la montagne et l’étoile de la période font dix ensemble. Les classiques y lisent un thème dont les étoiles s’accordent, pour les personnes et les liens entre elles.",
  ],
  "ten-water": [
    "In every palace the water star and the period star add up to ten. The classics read it as a chart whose stars work together, for activity and resources.",
    "Dans chaque palais, l’étoile de l’eau et l’étoile de la période font dix ensemble. Les classiques y lisent un thème dont les étoiles s’accordent, pour l’activité et les ressources.",
  ],
  "parent-string": [
    "In every palace the three stars belong to one of the groups 1-4-7, 2-5-8 or 3-6-9, which join the three ages of the 180-year cycle. The classics read it as a chart whose stars hold together, said to soften what else it carries.",
    "Dans chaque palais, les trois étoiles appartiennent à l’un des groupes 1-4-7, 2-5-8 ou 3-6-9, qui relient les trois âges du cycle de 180 ans. Les classiques y lisent un thème dont les étoiles tiennent ensemble, réputé adoucir ce qu’il porte par ailleurs.",
  ],
  "pearl-string": [
    "In every palace the three stars follow one another, like 4, 5 and 6. The classics read it as a chart whose stars connect, like a string of pearls, said to soften what else it carries.",
    "Dans chaque palais, les trois étoiles se suivent, comme 4, 5 et 6. Les classiques y lisent un thème dont les étoiles se relient, comme un collier de perles, réputé adoucir ce qu’il porte par ailleurs.",
  ],
  "fu-yin": [
    "A 5 in the centre flies forward, so those stars stand on the Lo Shu’s own numbers in every palace. The classics read it as energy that repeats rather than moves; practitioners give it attention when the years’ stars are read on top.",
    "Un 5 au centre vole vers l’avant, si bien que ces étoiles retombent sur les nombres propres du Lo Shu dans chaque palais. Les classiques y lisent une énergie qui se répète au lieu d’avancer\u202f; les praticiens y prêtent attention quand on lit par-dessus les étoiles des années.",
  ],
  "fan-yin": [
    "A 5 in the centre flies backward, so each palace holds the number opposite its own. The classics read it as energy running against the square’s own order; practitioners give it attention when the years’ stars are read on top.",
    "Un 5 au centre vole vers l’arrière, si bien que chaque palais porte le nombre opposé au sien. Les classiques y lisent une énergie qui va à rebours de l’ordre du carré\u202f; les praticiens y prêtent attention quand on lit par-dessus les étoiles des années.",
  ],
};

/** The three states of a star in a period, and what the classics read in each. */
export const STATE_TEXTS: Readonly<Record<StarState, Both>> = {
  timely: [
    "A timely star is at its best: the period’s own, or one of the two rising after it. The classics read it as support where it stands.",
    "Une étoile en phase est à son meilleur\u202f: celle de la période, ou l’une des deux qui montent après elle. Les classiques y lisent un appui là où elle se tient.",
  ],
  waning: [
    "A waning star led the period just past: its strength is passing. The classics read it gently, as something to let rest.",
    "Une étoile déclinante a mené la période passée\u202f: sa force s’en va. Les classiques la lisent avec douceur, comme une chose à laisser reposer.",
  ],
  dormant: [
    "A dormant star is out of its time in this period. The classics read it as quiet; what it brings depends on the stars beside it and the years that pass.",
    "Une étoile en sommeil est hors de son temps dans cette période. Les classiques la lisent comme tranquille\u202f; ce qu’elle apporte dépend des étoiles voisines et des années qui passent.",
  ],
};
