/*
 * What the year's afflictions are called and say (languages plan, part 25),
 * in English and French, with their classical names. They are matters of
 * timing, never of a place's worth: the classics counsel quiet where they
 * fall for the year (no heavy works, digging or renovation that can wait),
 * and that is all Ulune says of them. Nothing to buy, nothing to hang.
 * scripts/chinese-fengshui-years.test.mjs keeps both languages and their tone.
 */
import type { ChineseName } from "./names";
import type { Both } from "./both";
import type { AfflictionId } from "./fengshui-years";

export const AFFLICTION_NAMES: Readonly<Record<AfflictionId, ChineseName>> = {
  "five-yellow": { hant: "五黃", hans: "五黄", pinyin: "wǔ huáng", en: "The 5 Yellow", fr: "Le 5 Jaune" },
  "tai-sui": { hant: "太歲", hans: "太岁", pinyin: "tài suì", en: "The Grand Duke", fr: "Le Grand Duc" },
  "year-breaker": { hant: "歲破", hans: "岁破", pinyin: "suì pò", en: "The Year Breaker", fr: "Le Briseur de l’année" },
  "three-killings": { hant: "三煞", hans: "三煞", pinyin: "sān shà", en: "The Three Killings", fr: "Les Trois Sha" },
};

/** Each affliction, with {where} (a direction or a mountain) and {year}. */
export const AFFLICTION_TEXTS: Readonly<Record<AfflictionId, Both>> = {
  "five-yellow": [
    "The 5, the Lo Shu’s own centre, flies {where} in {year}. The classics counsel quiet in that part of the home for the year: heavy works, digging or renovation are best left until it moves on at Lichun. A matter of timing, not of the place.",
    "Le 5, le centre propre du Lo Shu, vole {where} en {year}. Les classiques conseillent le calme dans cette partie du logement pour l’année\u202f: gros travaux, creusement ou rénovation attendent de préférence qu’il reparte à Lichun. Une question de moment, pas de lieu.",
  ],
  "tai-sui": [
    "The Grand Duke, the year’s own branch, sits in {where} in {year}. The classics suggest not facing him for the year’s new beginnings, a new desk or a long task, and not breaking ground there; to have him at your back is held to be steady support.",
    "Le Grand Duc, la branche même de l’année, siège en {where} en {year}. Les classiques suggèrent de ne pas lui faire face pour les commencements de l’année, un nouveau bureau ou une longue tâche, et de ne pas y entamer de travaux\u202f; l’avoir dans le dos passe pour un appui stable.",
  ],
  "year-breaker": [
    "The Year Breaker stands in {where} in {year}, opposite the Grand Duke. The classics suggest leaving that side of the home undisturbed by works for the year.",
    "Le Briseur de l’année se tient en {where} en {year}, face au Grand Duc. Les classiques suggèrent de laisser ce côté du logement à l’abri des travaux pour l’année.",
  ],
  "three-killings": [
    "The Three Killings fall {where} in {year}, opposite the direction of the year’s trine. The classics suggest sitting with your back to them rather than facing them, and keeping works on that side for another year.",
    "Les Trois Sha tombent {where} en {year}, à l’opposé de la direction du trigone de l’année. Les classiques suggèrent de s’asseoir dos à eux plutôt que face à eux, et de garder les travaux de ce côté pour une autre année.",
  ],
};

/** How each affliction's place is found, the same every year. */
export const AFFLICTION_HOW: Readonly<Record<AfflictionId, Both>> = {
  "five-yellow": [
    "The 5 flies with the year’s chart, along the same path as every star, so where it lands follows from the year’s star in the centre: to the south when the centre holds the 1, to the north when it holds the 9. It moves on each year at Lichun.",
    "Le 5 vole avec la carte de l’année, sur le même chemin que toutes les étoiles\u202f; sa place découle donc de l’étoile de l’année au centre\u202f: au sud quand le centre porte le 1, au nord quand il porte le 9. Il change de place chaque année à Lichun.",
  ],
  "tai-sui": [
    "The Grand Duke is the mountain of the year’s own branch: Wu, the Horse, in a Horse year. He goes round the twelve branches among the 24 mountains, one a year, at Lichun.",
    "Le Grand Duc est la montagne de la branche même de l’année\u202f: Wu, le Cheval, une année du Cheval. Il fait le tour des douze branches parmi les 24 montagnes, une par an, à Lichun.",
  ],
  "year-breaker": [
    "The Year Breaker is the branch across the compass from the Grand Duke. It turns with him, one branch a year.",
    "Le Briseur de l’année est la branche qui fait face au Grand Duc sur la boussole. Il tourne avec lui, d’une branche par an.",
  ],
  "three-killings": [
    "The Three Killings follow the year’s trine, the three branches that share a phase: a Monkey, Rat or Dragon year (water) places them in the south; Tiger, Horse or Dog (fire) in the north; Snake, Rooster or Ox (metal) in the east; Pig, Rabbit or Goat (wood) in the west. They cover the three mountains of that direction.",
    "Les Trois Sha suivent le trigone de l’année, les trois branches qui partagent une phase\u202f: une année du Singe, du Rat ou du Dragon (eau) les place au sud\u202f; du Tigre, du Cheval ou du Chien (feu) au nord\u202f; du Serpent, du Coq ou du Bœuf (métal) à l’est\u202f; du Cochon, du Lièvre ou de la Chèvre (bois) à l’ouest. Ils couvrent les trois montagnes de cette direction.",
  ],
};
