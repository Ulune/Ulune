/*
 * What BaZi's analysis says (languages plan, part 15): the Day Master's
 * three strengths and the structures, standard and "follow", in English
 * and French, as the Zi Ping school reads them, in Ulune's words. A mirror,
 * not a verdict: no strength is better than another, no structure lucky or
 * unlucky. scripts/chinese-bazi-balance.test.mjs keeps both languages,
 * their typography and their tone.
 */
import type { Both } from "./zodiac-texts";
import type { SpecialId, StrengthId, StructureId } from "./bazi-balance";

export const STRENGTH_TEXTS: Readonly<Record<StrengthId, Both>> = {
  strong: [
    "A strong Day Master has plenty of its own energy: self-reliant, able to carry a lot. The tradition looks for outlets that use that strength well: expression, work, responsibility.",
    "Un Maître du jour fort a beaucoup d’énergie propre\u202f: autonome, capable de porter beaucoup. La tradition cherche les débouchés qui emploient bien cette force\u202f: l’expression, le travail, la responsabilité.",
  ],
  balanced: [
    "A balanced Day Master neither lacks nor overflows: it can lean on others or give to them as the moment asks. The tradition looks for what keeps that balance.",
    "Un Maître du jour équilibré ne manque de rien et ne déborde pas\u202f: il peut s’appuyer sur les autres ou leur donner selon le moment. La tradition cherche ce qui garde cet équilibre.",
  ],
  weak: [
    "A weak Day Master draws more on what surrounds it: sensitive to its setting, at its best with support, good company and learning. Weak here means receptive, not lesser.",
    "Un Maître du jour faible puise davantage dans ce qui l’entoure\u202f: sensible à son cadre, à son meilleur avec du soutien, de bonnes relations et l’apprentissage. Faible veut dire ici réceptif, non moindre.",
  ],
};

export const STRUCTURE_TEXTS: Readonly<Record<StructureId | SpecialId, Both>> = {
  "direct-officer": [
    "The Direct Officer structure frames a life around order and trust: duty, fairness, a good name, and a place within the rules that others can count on.",
    "La structure de l’Officier direct encadre une vie autour de l’ordre et de la confiance\u202f: le devoir, l’équité, une bonne réputation, et une place dans les règles sur laquelle les autres peuvent compter.",
  ],
  "seven-killings": [
    "The Seven Killings structure frames a life around challenge: pressure met with courage, ambition and the drive to take charge, at its best when that force is given a direction.",
    "La structure des Sept Tueurs encadre une vie autour du défi\u202f: la pression affrontée avec courage, l’ambition et l’élan de prendre les choses en main, à son meilleur quand cette force reçoit une direction.",
  ],
  "direct-wealth": [
    "The Direct Wealth structure frames a life around building: steady work, care with resources, and the satisfaction of what grows by effort.",
    "La structure de la Richesse directe encadre une vie autour de la construction\u202f: un travail régulier, le soin des ressources, et la satisfaction de ce qui grandit par l’effort.",
  ],
  "indirect-wealth": [
    "The Indirect Wealth structure frames a life around opportunity: enterprise, generosity, an eye for openings, and resources that come and go freely.",
    "La structure de la Richesse indirecte encadre une vie autour de l’occasion\u202f: l’esprit d’entreprise, la générosité, un œil pour les ouvertures, et des ressources qui vont et viennent librement.",
  ],
  "direct-resource": [
    "The Direct Resource structure frames a life around learning and care: knowledge received and passed on, patience, protection given and found.",
    "La structure de la Ressource directe encadre une vie autour de l’apprentissage et du soin\u202f: le savoir reçu et transmis, la patience, la protection donnée et trouvée.",
  ],
  "indirect-resource": [
    "The Indirect Resource structure frames a life around insight: unusual knowledge, intuition, independent thought, and a taste for depth over the obvious.",
    "La structure de la Ressource indirecte encadre une vie autour de l’intuition\u202f: un savoir peu commun, une pensée indépendante, et le goût du profond plutôt que de l’évident.",
  ],
  "eating-god": [
    "The Eating God structure frames a life around expression and enjoyment: talent shared with ease, good taste, and a generous, unhurried way of giving.",
    "La structure du Dieu nourricier encadre une vie autour de l’expression et du plaisir\u202f: un talent partagé avec aisance, le bon goût, et une façon généreuse et paisible de donner.",
  ],
  "hurting-officer": [
    "The Hurting Officer structure frames a life around brilliance and freedom: originality, a sharp tongue and mind, and the urge to question how things are done.",
    "La structure de l’Officier blessant encadre une vie autour de l’éclat et de la liberté\u202f: l’originalité, un esprit et une parole vifs, et l’envie de questionner la façon dont les choses se font.",
  ],
  "jian-lu": [
    "The Prosperity structure frames a life around self-reliance: the Day Master stands in its own month, and builds by its own hands rather than by inheritance.",
    "La structure de prospérité encadre une vie autour de l’autonomie\u202f: le Maître du jour se tient dans son propre mois, et bâtit de ses mains plutôt que par héritage.",
  ],
  "yang-ren": [
    "The Sword Edge structure frames a life around intensity: the Day Master at the peak of its phase, decisive and bold, at its best when that edge serves a cause.",
    "La structure de la Lame encadre une vie autour de l’intensité\u202f: le Maître du jour au sommet de sa phase, décidé et audacieux, à son meilleur quand ce tranchant sert une cause.",
  ],
  "follow-strong": [
    "A dominant chart is filled with the Day Master’s own phase: some schools read it as following that phase all the way, helped by more of it rather than less.",
    "Un thème dominant est rempli de la phase du Maître du jour\u202f: certaines écoles le lisent comme suivant cette phase jusqu’au bout, aidé par davantage de celle-ci plutôt que par moins.",
  ],
  "follow-output": [
    "Following Output, the Day Master gives itself to what it produces: some schools read a life carried by its talents and expression.",
    "En suivant l’expression, le Maître du jour se donne à ce qu’il produit\u202f: certaines écoles y lisent une vie portée par ses talents et son expression.",
  ],
  "follow-wealth": [
    "Following Wealth, the Day Master goes with what it controls: some schools read a life carried by its work, its resources and its practical sense.",
    "En suivant la richesse, le Maître du jour va avec ce qu’il contrôle\u202f: certaines écoles y lisent une vie portée par son travail, ses ressources et son sens pratique.",
  ],
  "follow-power": [
    "Following Power, the Day Master goes with what controls it: some schools read a life carried by its role, its duties and the structures it serves.",
    "En suivant le pouvoir, le Maître du jour va avec ce qui le contrôle\u202f: certaines écoles y lisent une vie portée par son rôle, ses devoirs et les structures qu’il sert.",
  ],
};
