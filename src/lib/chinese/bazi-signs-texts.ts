/*
 * What BaZi's secondary layers say (languages plan, part 13): the twelve
 * life stages and the fourteen symbolic stars Ulune reads, in English and
 * French. The stages are phases of a cycle, a phase's strength in a branch,
 * told as a plant's year; never events and never health, whatever their
 * classical names. The stars are secondary signs, nuances rather than
 * verdicts, as most schools weigh them. What each stands for is the
 * consensus of the Zi Ping school and the common almanacs, in Ulune's
 * words. scripts/chinese-bazi-signs.test.mjs keeps both languages, their
 * typography and their tone.
 */
import type { Both } from "./both";
import type { StageId, StarId } from "./bazi-signs";

export const STAGE_TEXTS: Readonly<Record<StageId, Both>> = {
  birth: [
    "The phase begins in this branch, like a seed breaking ground. The tradition reads a fresh start, promise, and support from where things begin.",
    "La phase commence dans cette branche, comme une graine qui perce la terre. La tradition y lit un nouveau départ, une promesse, et un appui venu des commencements.",
  ],
  bath: [
    "The young phase is washed and exposed, still unsteady. The tradition reads curiosity, charm and a taste for trying things, at times restlessness.",
    "La jeune phase est lavée et exposée, encore mal assurée. La tradition y lit la curiosité, le charme et le goût d’essayer, parfois une certaine agitation.",
  ],
  crown: [
    "The phase comes of age and puts on its cap and belt. The tradition reads growing confidence, the wish to be seen and to learn the ways of the world.",
    "La phase devient adulte et revêt sa coiffe et sa ceinture. La tradition y lit une assurance qui grandit, le désir d’être vu et d’apprendre les usages du monde.",
  ],
  prosperity: [
    "The phase takes up its office, mature and able. The tradition reads independence, competence and the strength to stand on your own.",
    "La phase prend sa charge, mûre et capable. La tradition y lit l’indépendance, la compétence et la force de se tenir par soi-même.",
  ],
  peak: [
    "The phase is at its fullest here. The tradition reads strength, drive and determination, and the care it takes not to overreach.",
    "La phase est ici à sa plénitude. La tradition y lit la force, l’élan et la détermination, et le soin qu’il faut pour ne pas forcer.",
  ],
  decline: [
    "The phase has passed its height and softens. The tradition reads experience, moderation and a calmer, steadier strength.",
    "La phase a passé son sommet et s’adoucit. La tradition y lit l’expérience, la mesure et une force plus calme, plus égale.",
  ],
  sickness: [
    "The phase grows weaker here, like a plant at the turn of autumn. The tradition reads sensitivity, thoughtfulness and an eye for what others miss.",
    "La phase s’affaiblit ici, comme une plante au tournant de l’automne. La tradition y lit la sensibilité, la réflexion et un regard pour ce qui échappe aux autres.",
  ],
  death: [
    "The phase comes to rest here, its outward strength stilled, like a field after the harvest. The tradition reads depth, focus and a mind that goes to the heart of things.",
    "La phase se repose ici, sa force extérieure apaisée, comme un champ après la moisson. La tradition y lit la profondeur, la concentration et un esprit qui va au cœur des choses.",
  ],
  tomb: [
    "The phase is stored here, gathered in like grain in a granary. The tradition reads reserve, thrift and a gift for keeping what matters.",
    "La phase est ici mise en réserve, rentrée comme le grain au grenier. La tradition y lit la retenue, l’économie et le don de garder ce qui compte.",
  ],
  extinction: [
    "The phase is at its lowest, a pause between one cycle and the next. The tradition reads openness to change and freedom from what came before.",
    "La phase est au plus bas, une pause entre un cycle et le suivant. La tradition y lit l’ouverture au changement et la liberté vis-à-vis de ce qui précédait.",
  ],
  conception: [
    "A new cycle is conceived: the phase is a seed again, not yet visible. The tradition reads ideas in the making, plans and quiet potential.",
    "Un nouveau cycle est conçu\u202f: la phase redevient graine, pas encore visible. La tradition y lit des idées en germe, des projets et un potentiel discret.",
  ],
  nurture: [
    "The new phase is nourished, growing in shelter before its birth. The tradition reads patience, care received and the preparing of what comes next.",
    "La nouvelle phase est nourrie, elle grandit à l’abri avant sa naissance. La tradition y lit la patience, le soin reçu et la préparation de ce qui vient.",
  ],
};

export const STAR_TEXTS: Readonly<Record<StarId, Both>> = {
  nobleman: [
    "The Nobleman is the most valued of the stars: help that arrives when it is needed, people of good will, a way through difficulty. The tradition reads support from others, and a gift for finding it.",
    "Le Noble céleste est la plus estimée des étoiles\u202f: une aide qui arrive quand il le faut, des personnes bienveillantes, un passage à travers les difficultés. La tradition y lit le soutien des autres, et le don de le trouver.",
  ],
  academic: [
    "The Academic star is the star of letters: learning, writing, clear thinking, and a gift for study and for expression.",
    "L’Étoile des lettres est celle de l’étude\u202f: apprendre, écrire, penser clairement, et un don pour les études comme pour l’expression.",
  ],
  "prosperity-star": [
    "The Prosperity star is where the Day Master finds its own resources: steady means, work that sustains you, and the confidence of standing on your own ground.",
    "L’Étoile de prospérité est l’endroit où le Maître du jour trouve ses propres ressources\u202f: des moyens stables, un travail qui vous fait vivre, et l’assurance d’être sur son propre terrain.",
  ],
  "golden-carriage": [
    "The Golden Carriage is a star of comfort and grace: ease, good taste, and help from those close, from a partner above all.",
    "Le Char d’or est une étoile de confort et de grâce\u202f: l’aisance, le bon goût, et l’aide des proches, d’un partenaire avant tout.",
  ],
  "sword-edge": [
    "The Sword Edge is the Day Master’s phase at its sharpest: decisiveness, courage and the strength to cut through. The tradition reads an energy to channel with care.",
    "La Lame est la phase du Maître du jour à son plus tranchant\u202f: la décision, le courage et la force de trancher. La tradition y lit une énergie à canaliser avec soin.",
  ],
  "peach-blossom": [
    "The Peach Blossom is the star of charm: attraction, ease with people, a gift for the arts and for being liked.",
    "La Fleur de pêcher est l’étoile du charme\u202f: l’attirance, l’aisance avec les gens, un don pour les arts et pour plaire.",
  ],
  "travelling-horse": [
    "The Travelling Horse is the star of movement: journeys, moves and changes, a restless and adventurous energy.",
    "Le Cheval voyageur est l’étoile du mouvement\u202f: les voyages, les déménagements et les changements, une énergie inquiète et aventureuse.",
  ],
  canopy: [
    "The Canopy is the star of solitude and the spirit: art, philosophy, a taste for the deep and the unusual, time spent alone with ideas.",
    "Le Dais est l’étoile de la solitude et de l’esprit\u202f: l’art, la philosophie, le goût du profond et de l’insolite, du temps passé seul avec ses idées.",
  ],
  general: [
    "The General is the star of leadership: authority, a gift for organising, and for being followed.",
    "Le Général est l’étoile du commandement\u202f: l’autorité, un don pour organiser, et pour être suivi.",
  ],
  "heavenly-virtue": [
    "Heavenly Virtue is a star of protection: kindness returned, difficulties softened, a good nature that others trust.",
    "La Vertu céleste est une étoile de protection\u202f: la bonté rendue, les difficultés adoucies, un bon naturel en qui l’on a confiance.",
  ],
  "monthly-virtue": [
    "Monthly Virtue is Heavenly Virtue’s companion: gentleness, generosity, and help that eases the way.",
    "La Vertu du mois accompagne la Vertu céleste\u202f: la douceur, la générosité, et une aide qui facilite le chemin.",
  ],
  "red-phoenix": [
    "The Red Phoenix is a star of romance and celebration: love, union and happy events.",
    "Le Phénix rouge est une étoile de l’amour et de la fête\u202f: la romance, l’union et les heureux événements.",
  ],
  "heavenly-joy": [
    "Heavenly Joy is the Red Phoenix’s partner, opposite it on the wheel: joy, good news and occasions to celebrate.",
    "La Joie céleste est la partenaire du Phénix rouge, en face de lui sur la roue\u202f: la joie, les bonnes nouvelles et les occasions de fêter.",
  ],
  "three-wonders": [
    "The Three Wonders appear when three stems follow each other in one of three rare orders: an unusual mind, talent, and breadth of vision.",
    "Les Trois Merveilles apparaissent quand trois troncs se suivent dans l’un de trois ordres rares\u202f: un esprit peu commun, du talent et une vision large.",
  ],
};
