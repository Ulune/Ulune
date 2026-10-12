/*
 * What Feng Shui's personal page says (languages plan, part 21): the eight
 * Kua by their trigram, the two groups, and the eight mansions, in English
 * and French, after the Eight Mansions school (八宅明鏡, the Ba Zhai Ming
 * Jing) in Ulune's words. Suggestions with their reasons, never rules, never
 * a threat: no health, no misfortune, nothing to buy.
 * scripts/chinese-fengshui.test.mjs keeps both languages, their typography
 * and their tone.
 */
import type { Both } from "./zodiac-texts";
import type { MansionId, TrigramId } from "./fengshui";

export const TRIGRAM_TEXTS: Readonly<Record<TrigramId, Both>> = {
  kan: [
    "Kan, Water, the north: depth and flow, the courage to go on through difficulty, and a gift for listening.",
    "Kan, l’Eau, le nord\u202f: la profondeur et le courant, le courage de continuer dans la difficulté, et un don d’écoute.",
  ],
  kun: [
    "Kun, Earth, the south-west: the receptive, care and patience, the ground on which others build.",
    "Kun, la Terre, le sud-ouest\u202f: le réceptif, le soin et la patience, le sol sur lequel les autres bâtissent.",
  ],
  zhen: [
    "Zhen, Thunder, the east: the first movement of spring, initiative and energy that wakes things up.",
    "Zhen, le Tonnerre, l’est\u202f: le premier mouvement du printemps, l’initiative et une énergie qui réveille les choses.",
  ],
  xun: [
    "Xun, Wind, the south-east: gentleness that gets everywhere, influence by persistence, and growth over time.",
    "Xun, le Vent, le sud-est\u202f: une douceur qui pénètre partout, l’influence par la persévérance, et la croissance dans la durée.",
  ],
  qian: [
    "Qian, Heaven, the north-west: the creative, leadership and clarity of purpose, the strength that sets the course.",
    "Qian, le Ciel, le nord-ouest\u202f: le créateur, le commandement et la clarté du but, la force qui fixe le cap.",
  ],
  dui: [
    "Dui, the Lake, the west: joy and conversation, openness and the pleasure of sharing.",
    "Dui, le Lac, l’ouest\u202f: la joie et la conversation, l’ouverture et le plaisir du partage.",
  ],
  gen: [
    "Gen, the Mountain, the north-east: stillness, reflection and the wisdom of knowing when to stop.",
    "Gen, la Montagne, le nord-est\u202f: l’immobilité, la réflexion et la sagesse de savoir s’arrêter.",
  ],
  li: [
    "Li, Fire, the south: brightness and clarity, warmth, and the gift of seeing and being seen.",
    "Li, le Feu, le sud\u202f: l’éclat et la clarté, la chaleur, et le don de voir et d’être vu.",
  ],
};

export const GROUP_TEXTS: Readonly<Record<"east" | "west", Both>> = {
  east: [
    "Your Kua belongs to the East group (1, 3, 4, 9): your four supportive directions are the north, the south, the east and the south-east.",
    "Votre Kua appartient au groupe de l’Est (1, 3, 4, 9)\u202f: vos quatre directions favorables sont le nord, le sud, l’est et le sud-est.",
  ],
  west: [
    "Your Kua belongs to the West group (2, 6, 7, 8): your four supportive directions are the west, the north-west, the south-west and the north-east.",
    "Votre Kua appartient au groupe de l’Ouest (2, 6, 7, 8)\u202f: vos quatre directions favorables sont l’ouest, le nord-ouest, le sud-ouest et le nord-est.",
  ],
};

export const MANSION_TEXTS: Readonly<Record<MansionId, Both>> = {
  "sheng-qi": [
    "Sheng Qi, the breath of life, is your best direction for growth, initiative and new projects. The tradition suggests facing it to work or to begin something.",
    "Sheng Qi, le souffle de vie, est votre meilleure direction pour la croissance, l’initiative et les projets nouveaux. La tradition suggère de lui faire face pour travailler ou commencer quelque chose.",
  ],
  "tian-yi": [
    "Tian Yi, the heavenly helper, is a direction for rest, regaining energy and receiving help from others. The tradition suggests it for the head of a bed or a place to recover your calm.",
    "Tian Yi, l’aide céleste, est une direction pour le repos, reprendre des forces et recevoir l’aide des autres. La tradition la suggère pour la tête du lit ou un lieu où retrouver son calme.",
  ],
  "yan-nian": [
    "Yan Nian, the lasting years, is a direction for relationships, family and steady bonds. The tradition suggests it for a place where you meet, talk or share a meal.",
    "Yan Nian, les années qui durent, est une direction pour les relations, la famille et les liens stables. La tradition la suggère pour un lieu où l’on se retrouve, parle ou partage un repas.",
  ],
  "fu-wei": [
    "Fu Wei, your own position, is a direction of calm, clarity and personal steadiness. The tradition suggests it for study, reflection and quiet work.",
    "Fu Wei, votre propre position, est une direction de calme, de clarté et de stabilité personnelle. La tradition la suggère pour l’étude, la réflexion et le travail tranquille.",
  ],
  "huo-hai": [
    "Huo Hai is the mildest of your four challenging directions: small frictions and setbacks. The tradition suggests it for storage or a utility room rather than a desk.",
    "Huo Hai est la plus douce de vos quatre directions difficiles\u202f: de petites frictions et des contretemps. La tradition la suggère pour le rangement ou une buanderie plutôt que pour un bureau.",
  ],
  "wu-gui": [
    "Wu Gui, the five ghosts, is a restless direction: scattered energy and quarrels that start from little. The tradition suggests not facing it for long tasks.",
    "Wu Gui, les cinq fantômes, est une direction agitée\u202f: une énergie dispersée et des querelles qui naissent de peu. La tradition suggère de ne pas lui faire face pour les longues tâches.",
  ],
  "liu-sha": [
    "Liu Sha, the six imbalances, is a direction of entanglements and misunderstandings. The tradition suggests it for passing through rather than for sitting.",
    "Liu Sha, les six déséquilibres, est une direction d’enchevêtrements et de malentendus. La tradition la suggère pour le passage plutôt que pour s’asseoir.",
  ],
  "jue-ming": [
    "Jue Ming is, in the tradition’s words, your most draining direction. It suggests not sitting or sleeping facing it when you can choose, and keeping that side for a bathroom or a storeroom.",
    "Jue Ming est, selon la tradition, votre direction la plus épuisante. Elle suggère de ne pas s’asseoir ni dormir face à elle quand on peut choisir, et de garder ce côté pour une salle de bains ou un débarras.",
  ],
};
