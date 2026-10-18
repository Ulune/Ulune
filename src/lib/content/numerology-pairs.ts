import type { Bi } from "./types";

/**
 * Numerology's Relationship readings (share and compare plan, feature 5c;
 * decision R3): how two numbers tend to work together, never a score and
 * never "compatible" or "incompatible". Each of the 45 pairs of 1 to 9 says
 * how the two tend to work together and where they may rub, with what helps;
 * the six pairs of master numbers have their own; a master beside a number
 * of 1 to 9 is read through its root's pair (lib/chart/numerology-pair.ts)
 * with a note on what the master adds. What each number brings, the frame of
 * each position read, the relationship number and the relationship's year
 * complete them. Suggestions and tendencies, never predictions; no illness,
 * no breaking up, nothing to buy. The French is written, not translated.
 * Cut to one language by the reading pack (pack-num-pair.ts), and held to
 * all this by scripts/numerology-pair.test.mjs.
 */

/** A pair of numbers: how the two tend to work together, and where they may rub (with what helps). */
export type PairText = { together: Bi; rub: Bi };

export const PAIR_TEXTS: Record<string, PairText> = {
  "1-1": {
    together: {
      en: "Two 1s bring twice the drive: each starts things, decides quickly and likes to lead. Side by side they can launch a great deal, especially when each has a field of their own.",
      fr: "Deux 1 réunissent deux fois plus d’élan\u202f: chacun lance, tranche vite et aime mener. Côte à côte, ils peuvent faire démarrer beaucoup de choses, surtout si chacun a son propre domaine.",
    },
    rub: {
      en: "Two people used to taking the lead can both reach for the wheel at once. What helps: agreeing who leads which part, and leaving the other the last word on their own ground.",
      fr: "Habitués tous deux à mener, ils peuvent vouloir tenir le volant en même temps. Ce qui aide\u202f: convenir de qui mène quoi, et laisser franchement la main à l’autre sur son terrain.",
    },
  },
  "1-2": {
    together: {
      en: "The 1 starts and the 2 smooths the way: initiative meets tact. The 1 brings direction and nerve; the 2 notices what people need and makes the plan work with others.",
      fr: "Le 1 lance, le 2 aplanit le chemin\u202f: l’initiative rencontre le tact. Le 1 apporte la direction et l’audace\u202f; le 2 perçoit ce dont chacun a besoin et fait fonctionner le projet avec les autres.",
    },
    rub: {
      en: "The 1 can move faster than the 2 is comfortable with, and the 2 may go quiet rather than say so. What helps: the 1 asking before deciding, the 2 saying plainly what matters to it.",
      fr: "Le 1 peut aller plus vite que le 2 ne le souhaite, et le 2 se taire plutôt que de le dire. Ce qui aide\u202f: que le 1 demande avant de décider, et que le 2 dise clairement ce qui compte pour lui.",
    },
  },
  "1-3": {
    together: {
      en: "Both like to begin: the 1 with a plan, the 3 with an idea it can share. Together there is energy, humour and a lot set in motion; the 3 makes the 1’s projects lighter and better told.",
      fr: "Tous deux aiment commencer\u202f: le 1 avec un plan, le 3 avec une idée à partager. Ensemble, il y a de l’énergie, de l’humour et beaucoup de projets lancés\u202f; le 3 rend ceux du 1 plus légers et mieux racontés.",
    },
    rub: {
      en: "Many beginnings, fewer endings: neither number loves the long middle. The 1 may find the 3 scattered, the 3 find the 1 bossy. What helps: one shared project carried through before the next.",
      fr: "Beaucoup de débuts, moins de fins\u202f: aucun des deux n’aime le long milieu. Le 1 peut trouver le 3 dispersé, le 3 trouver le 1 directif. Ce qui aide\u202f: mener un projet commun jusqu’au bout avant le suivant.",
    },
  },
  "1-4": {
    together: {
      en: "The 1 opens the road and the 4 paves it: vision meets method. The 1 brings the push to start, the 4 the patience to build something that lasts. Between them, plans tend to become real.",
      fr: "Le 1 ouvre la route, le 4 la pave\u202f: la vision rencontre la méthode. Le 1 donne l’impulsion, le 4 la patience de bâtir quelque chose qui dure. Entre eux, les projets ont tendance à devenir concrets.",
    },
    rub: {
      en: "The 1 wants it now, the 4 wants it done properly: pace is the usual friction. What helps: agreeing on the first step quickly, and leaving the 4 room to plan the rest.",
      fr: "Le 1 le veut tout de suite, le 4 le veut bien fait\u202f: le rythme est la friction habituelle. Ce qui aide\u202f: s’accorder vite sur le premier pas, et laisser au 4 le soin de planifier la suite.",
    },
  },
  "1-5": {
    together: {
      en: "Two independent spirits: the 1 drives forward, the 5 explores sideways. Together they bring energy, courage and an appetite for the new; life rarely stands still.",
      fr: "Deux esprits indépendants\u202f: le 1 fonce droit devant, le 5 explore de côté. Ensemble, ils réunissent énergie, courage et goût de la nouveauté\u202f; la vie reste rarement immobile.",
    },
    rub: {
      en: "Both value their freedom, so commitments can stay loose and routines thin. What helps: a few fixed points, a shared day or a shared goal, that leave the rest open.",
      fr: "Tous deux tiennent à leur liberté\u202f: les engagements peuvent rester flous et les habitudes rares. Ce qui aide\u202f: quelques points fixes, un jour à deux ou un but commun, qui laissent le reste ouvert.",
    },
  },
  "1-6": {
    together: {
      en: "The 1 brings drive and decisions, the 6 care and a sense of home. The 1 gives the 6 the courage to act; the 6 gives the 1 a warm base to come back to.",
      fr: "Le 1 apporte l’élan et les décisions, le 6 le soin et le sens du foyer. Le 1 donne au 6 le courage d’agir\u202f; le 6 offre au 1 un port chaleureux où revenir.",
    },
    rub: {
      en: "The 6 can feel the 1 thinks only of its own aims; the 1 can feel the 6’s care as pressure. What helps: the 1 including the others in its plans, the 6 trusting without overseeing.",
      fr: "Le 6 peut avoir l’impression que le 1 ne pense qu’à ses propres buts\u202f; le 1, ressentir le soin du 6 comme une pression. Ce qui aide\u202f: que le 1 associe les autres à ses projets, et que le 6 fasse confiance sans surveiller.",
    },
  },
  "1-7": {
    together: {
      en: "Two numbers that like their own space: the 1 acts alone, the 7 thinks alone. Each respects the other’s independence; the 7 adds depth to the 1’s plans, the 1 turns the 7’s insights into action.",
      fr: "Deux nombres qui aiment leur espace\u202f: le 1 agit seul, le 7 réfléchit seul. Chacun respecte l’indépendance de l’autre\u202f; le 7 donne de la profondeur aux projets du 1, le 1 transforme les intuitions du 7 en actes.",
    },
    rub: {
      en: "Each can withdraw into its own world, and the distance grows quietly. What helps: regular time to share what each is working on or thinking about.",
      fr: "Chacun peut se retirer dans son monde, et la distance grandit sans bruit. Ce qui aide\u202f: des moments réguliers pour partager ce sur quoi chacun travaille ou réfléchit.",
    },
  },
  "1-8": {
    together: {
      en: "Two strong engines: the 1 initiates, the 8 organises and scales up. Together they can achieve a great deal, with ambition on both sides.",
      fr: "Deux moteurs puissants\u202f: le 1 lance, le 8 organise et donne de l’ampleur. Ensemble, ils peuvent accomplir beaucoup, avec de l’ambition des deux côtés.",
    },
    rub: {
      en: "Both like to be in charge, and who decides can become the subject. What helps: dividing the fields clearly, and celebrating each other’s wins rather than comparing them.",
      fr: "Tous deux aiment diriger, et la question de qui décide peut devenir le sujet. Ce qui aide\u202f: se partager clairement les domaines, et fêter les réussites de l’autre plutôt que de les comparer.",
    },
  },
  "1-9": {
    together: {
      en: "The 1 looks to its own path, the 9 to the wider world. The 1 brings focus and nerve; the 9 brings breadth, generosity and a sense of meaning. Each widens the other.",
      fr: "Le 1 regarde son propre chemin, le 9 le monde autour. Le 1 apporte la concentration et l’audace\u202f; le 9, l’ampleur, la générosité et le sens. Chacun élargit l’autre.",
    },
    rub: {
      en: "The 9 may find the 1 self-centred; the 1 may find the 9 diffuse or too giving. What helps: linking personal goals to something larger, and the 9 keeping a share for itself.",
      fr: "Le 9 peut trouver le 1 centré sur lui-même\u202f; le 1, trouver le 9 dispersé ou trop généreux. Ce qui aide\u202f: relier les buts personnels à quelque chose de plus grand, et que le 9 garde aussi une part pour lui.",
    },
  },
  "2-2": {
    together: {
      en: "Two 2s understand each other almost without words: both sense moods, value harmony and care about the small details of being together. A gentle, attentive, cooperative pair.",
      fr: "Deux 2 se comprennent presque sans mots\u202f: tous deux sentent les humeurs, tiennent à l’harmonie et soignent les petits détails de la vie à deux. Un duo doux, attentif et coopératif.",
    },
    rub: {
      en: "Both may avoid conflict and wait for the other to decide, so small things go unsaid. What helps: taking turns to choose, and naming tensions early, kindly.",
      fr: "Tous deux peuvent éviter le conflit et attendre que l’autre décide\u202f: les petites choses restent alors non dites. Ce qui aide\u202f: décider chacun à son tour, et nommer tôt les tensions, avec douceur.",
    },
  },
  "2-3": {
    together: {
      en: "The 2 listens and the 3 speaks: a warm, sociable pair. The 3 brings lightness and ideas, the 2 support and tact; together they make people feel welcome.",
      fr: "Le 2 écoute et le 3 parle\u202f: un duo chaleureux et sociable. Le 3 apporte la légèreté et les idées, le 2 le soutien et le tact\u202f; ensemble, ils mettent les gens à l’aise.",
    },
    rub: {
      en: "The 3’s ease with words can hide how much the quieter 2 feels; the 2’s sensitivity can seem heavy to the 3. What helps: the 3 asking, and the 2 really answering.",
      fr: "L’aisance du 3 avec les mots peut masquer tout ce que ressent le 2, plus discret\u202f; la sensibilité du 2 peut sembler lourde au 3. Ce qui aide\u202f: que le 3 pose des questions, et que le 2 y réponde vraiment.",
    },
  },
  "2-4": {
    together: {
      en: "Both like steadiness: the 2 through care for others, the 4 through order and work. A loyal, practical pair that builds a calm, dependable daily life.",
      fr: "Tous deux aiment la stabilité\u202f: le 2 par le soin des autres, le 4 par l’ordre et le travail. Un duo fidèle et concret, qui bâtit un quotidien calme et sûr.",
    },
    rub: {
      en: "Routine can settle in until little feels new, and the 2’s feelings may go unspoken beside the 4’s tasks. What helps: making room for tenderness and for small surprises.",
      fr: "La routine peut s’installer jusqu’à ce que plus rien ne semble neuf, et les sentiments du 2 rester tus à côté des tâches du 4. Ce qui aide\u202f: faire place à la tendresse et aux petites surprises.",
    },
  },
  "2-5": {
    together: {
      en: "The 2 brings closeness and care, the 5 movement and curiosity. The 5 opens doors for the 2; the 2 gives the 5 a warm place to come back to.",
      fr: "Le 2 apporte la proximité et le soin, le 5 le mouvement et la curiosité. Le 5 ouvre des portes au 2\u202f; le 2 offre au 5 un lieu chaleureux où revenir.",
    },
    rub: {
      en: "The 2 values stability, the 5 change, so plans and pace can pull apart. What helps: reliable times together for the 2, real freedom for the 5, agreed in advance.",
      fr: "Le 2 tient à la stabilité, le 5 au changement\u202f: les projets et le rythme peuvent tirer dans deux sens. Ce qui aide\u202f: des rendez-vous fiables pour le 2, une vraie liberté pour le 5, convenus à l’avance.",
    },
  },
  "2-6": {
    together: {
      en: "Two caring numbers: the 2 attentive to the moment, the 6 to the home and the long run. A tender, devoted pair where each looks after the other.",
      fr: "Deux nombres attentionnés\u202f: le 2 attentif à l’instant, le 6 au foyer et à la durée. Un duo tendre et dévoué, où chacun veille sur l’autre.",
    },
    rub: {
      en: "Both can give so much that their own needs go unsaid, or start quietly counting who gave what. What helps: asking each other plainly what you need, and accepting help.",
      fr: "Tous deux peuvent tant donner que leurs propres besoins restent tus, ou commencer à tenir des comptes en silence. Ce qui aide\u202f: se demander simplement ce dont on a besoin, et accepter d’être aidé.",
    },
  },
  "2-7": {
    together: {
      en: "Both are quiet and perceptive: the 2 feels, the 7 understands. Together there is depth, calm and a gentle respect for each other’s inner life.",
      fr: "Tous deux sont discrets et perspicaces\u202f: le 2 ressent, le 7 comprend. Ensemble, il y a de la profondeur, du calme et un respect délicat de la vie intérieure de l’autre.",
    },
    rub: {
      en: "The 2 wants closeness, the 7 solitude; the 2 may read the 7’s distance as coolness. What helps: the 7 saying when it needs space, the 2 trusting that it is not a rejection.",
      fr: "Le 2 veut de la proximité, le 7 de la solitude\u202f; le 2 peut prendre la distance du 7 pour de la froideur. Ce qui aide\u202f: que le 7 dise quand il a besoin d’espace, et que le 2 sache que ce n’est pas un rejet.",
    },
  },
  "2-8": {
    together: {
      en: "The 8 builds and leads in the world; the 2 supports and harmonises around it. Strength and sensitivity, each covering the other’s blind spot.",
      fr: "Le 8 construit et mène dans le monde\u202f; le 2 soutient et harmonise autour de lui. La force et la sensibilité, chacune veillant sur ce que l’autre ne voit pas.",
    },
    rub: {
      en: "The 8’s directness can bruise the 2, and the 2’s support can go unseen. What helps: the 8 slowing down to listen, the 2 claiming its share of the success.",
      fr: "La franchise du 8 peut blesser le 2, et le soutien du 2 passer inaperçu. Ce qui aide\u202f: que le 8 ralentisse pour écouter, et que le 2 revendique sa part de la réussite.",
    },
  },
  "2-9": {
    together: {
      en: "Two generous numbers: the 2 gives to the person in front of it, the 9 to the world. A kind, idealistic pair with a strong sense of service.",
      fr: "Deux nombres généreux\u202f: le 2 donne à la personne en face de lui, le 9 au monde. Un duo bienveillant et idéaliste, avec un fort sens du service.",
    },
    rub: {
      en: "The 9 may be busy with causes when the 2 wants it close, and both can forget themselves. What helps: protected time together, and care given to each other as well as to others.",
      fr: "Le 9 peut être pris par ses causes quand le 2 le voudrait proche, et tous deux peuvent s’oublier. Ce qui aide\u202f: des moments à deux protégés, et le soin donné l’un à l’autre autant qu’aux autres.",
    },
  },
  "3-3": {
    together: {
      en: "Twice the warmth and wit: conversation, creativity and play come easily. Two 3s can make life bright and sociable, full of ideas and friends.",
      fr: "Deux fois plus de chaleur et d’esprit\u202f: la conversation, la créativité et le jeu viennent facilement. Deux 3 peuvent rendre la vie lumineuse et sociable, pleine d’idées et d’amis.",
    },
    rub: {
      en: "Both may chase the next idea and leave practical matters waiting, or vie for the stage. What helps: sharing the limelight, and splitting the dull tasks fairly.",
      fr: "Tous deux peuvent courir après la prochaine idée et laisser les questions pratiques en attente, ou se disputer la scène. Ce qui aide\u202f: partager la lumière, et répartir équitablement les tâches ingrates.",
    },
  },
  "3-4": {
    together: {
      en: "The 3 imagines and the 4 builds: play meets method. The 3 brings ideas and lightness, the 4 the steady work that turns them into something real.",
      fr: "Le 3 imagine et le 4 construit\u202f: le jeu rencontre la méthode. Le 3 apporte les idées et la légèreté, le 4 le travail régulier qui les rend réelles.",
    },
    rub: {
      en: "The 4 may find the 3 scattered, the 3 find the 4 rigid. What helps: the 4 leaving room for the unplanned, the 3 keeping its word on the practical things.",
      fr: "Le 4 peut trouver le 3 dispersé, le 3 trouver le 4 rigide. Ce qui aide\u202f: que le 4 laisse de la place à l’imprévu, et que le 3 tienne parole sur les choses concrètes.",
    },
  },
  "3-5": {
    together: {
      en: "Two lively, curious numbers: the 3 talks, the 5 explores. Together there is humour, adventure and variety; boredom rarely sets in.",
      fr: "Deux nombres vifs et curieux\u202f: le 3 parle, le 5 explore. Ensemble, il y a de l’humour, de l’aventure et de la variété\u202f; l’ennui s’installe rarement.",
    },
    rub: {
      en: "Both prefer what is new, so commitments and follow-through can slide. What helps: a shared plan for the essentials, kept simple.",
      fr: "Tous deux préfèrent la nouveauté\u202f: les engagements et le suivi peuvent glisser. Ce qui aide\u202f: un plan commun pour l’essentiel, tout simple.",
    },
  },
  "3-6": {
    together: {
      en: "The 3 brings joy and expression, the 6 care and a warm home. A harmonious pair for family, friends and a creative life together.",
      fr: "Le 3 apporte la joie et l’expression, le 6 le soin et un foyer chaleureux. Un duo harmonieux pour la famille, les amis et une vie créative partagée.",
    },
    rub: {
      en: "The 6 may want more commitment than the light-footed 3 offers; the 3 may feel the 6’s care as control. What helps: the 6 trusting, the 3 showing up when it counts.",
      fr: "Le 6 peut attendre plus d’engagement que le 3, au pied léger, n’en offre\u202f; le 3 peut ressentir le soin du 6 comme un contrôle. Ce qui aide\u202f: que le 6 fasse confiance, et que le 3 soit là quand cela compte.",
    },
  },
  "3-7": {
    together: {
      en: "The 3 lives outward, the 7 inward: talk meets reflection. The 3 draws the 7 into the world, the 7 brings depth to the 3’s ideas.",
      fr: "Le 3 vit vers l’extérieur, le 7 vers l’intérieur\u202f: la parole rencontre la réflexion. Le 3 entraîne le 7 dans le monde, le 7 donne de la profondeur aux idées du 3.",
    },
    rub: {
      en: "The 3 may find the 7 distant, the 7 find the 3 superficial or noisy. What helps: curiosity about each other’s ways, and time both together and apart.",
      fr: "Le 3 peut trouver le 7 distant, le 7 trouver le 3 superficiel ou bruyant. Ce qui aide\u202f: de la curiosité pour la manière de l’autre, et du temps ensemble comme séparément.",
    },
  },
  "3-8": {
    together: {
      en: "The 3 has the ideas and the charm, the 8 the drive and the organisation. A pair that can turn creativity into results.",
      fr: "Le 3 a les idées et le charme, le 8 l’élan et l’organisation. Un duo qui peut transformer la créativité en résultats.",
    },
    rub: {
      en: "The 8 may judge the 3’s pace unserious; the 3 may find the 8 all business. What helps: the 8 enjoying the play, the 3 respecting the targets.",
      fr: "Le 8 peut juger le rythme du 3 peu sérieux\u202f; le 3, trouver le 8 trop tourné vers les affaires. Ce qui aide\u202f: que le 8 profite du jeu, et que le 3 respecte les objectifs.",
    },
  },
  "3-9": {
    together: {
      en: "Two expressive, open-hearted numbers: the 3 brings joy, the 9 meaning. Together they can inspire others and share generously.",
      fr: "Deux nombres expressifs et ouverts\u202f: le 3 apporte la joie, le 9 le sens. Ensemble, ils peuvent inspirer les autres et partager avec générosité.",
    },
    rub: {
      en: "Both can spread their energy across many people and projects. What helps: choosing a few things to do together, and finishing them.",
      fr: "Tous deux peuvent disperser leur énergie entre beaucoup de gens et de projets. Ce qui aide\u202f: choisir quelques choses à faire ensemble, et les mener à terme.",
    },
  },
  "4-4": {
    together: {
      en: "Two builders: dependable, hard-working and loyal. A stable pair where promises are kept and what is built tends to last.",
      fr: "Deux bâtisseurs\u202f: fiables, travailleurs et fidèles. Un duo stable où les promesses sont tenues et où ce qui est construit a tendance à durer.",
    },
    rub: {
      en: "Two careful planners can grow rigid together, and work can crowd out fun. What helps: planning rest and novelty as seriously as tasks.",
      fr: "Deux planificateurs prudents peuvent se rigidifier ensemble, et le travail prendre la place du plaisir. Ce qui aide\u202f: prévoir le repos et la nouveauté aussi sérieusement que les tâches.",
    },
  },
  "4-5": {
    together: {
      en: "The 4 brings stability, the 5 movement: structure meets freedom. The 5 keeps the 4 from getting stuck, the 4 gives the 5’s energy a shape.",
      fr: "Le 4 apporte la stabilité, le 5 le mouvement\u202f: la structure rencontre la liberté. Le 5 empêche le 4 de s’enliser, le 4 donne une forme à l’énergie du 5.",
    },
    rub: {
      en: "One of the most contrasting pairs: routine beside change. What helps: agreeing which things stay fixed and which are free to move.",
      fr: "L’un des duos les plus contrastés\u202f: la routine à côté du changement. Ce qui aide\u202f: convenir de ce qui reste fixe et de ce qui peut bouger.",
    },
  },
  "4-6": {
    together: {
      en: "Both have a strong sense of responsibility: the 4 through work, the 6 through care. A devoted, home-loving pair that builds a safe, well-run life.",
      fr: "Tous deux ont le sens des responsabilités\u202f: le 4 par le travail, le 6 par le soin. Un duo dévoué et casanier, qui bâtit une vie sûre et bien tenue.",
    },
    rub: {
      en: "Duty can take up all the room, leaving little for lightness, and each may try to manage the other. What helps: keeping time to play, and trusting each other’s way of doing things.",
      fr: "Le devoir peut tout occuper et laisser peu de place à la légèreté, et chacun peut vouloir gérer l’autre. Ce qui aide\u202f: se garder du temps pour jouer, et faire confiance à la façon de faire de l’autre.",
    },
  },
  "4-7": {
    together: {
      en: "Both are serious and thorough: the 4 in practical work, the 7 in thought. A quiet, steady pair with respect for competence and depth.",
      fr: "Tous deux sont sérieux et minutieux\u202f: le 4 dans le travail concret, le 7 dans la pensée. Un duo calme et posé, qui respecte la compétence et la profondeur.",
    },
    rub: {
      en: "Both can turn inward and leave feelings unspoken. What helps: saying out loud, now and then, what the other’s support means to you.",
      fr: "Tous deux peuvent se replier sur eux-mêmes et taire leurs sentiments. Ce qui aide\u202f: dire de temps en temps à voix haute ce que le soutien de l’autre représente.",
    },
  },
  "4-8": {
    together: {
      en: "Two practical, ambitious numbers: the 4 lays the foundations, the 8 extends them. A strong pair for work, money and long-term projects.",
      fr: "Deux nombres concrets et ambitieux\u202f: le 4 pose les fondations, le 8 les prolonge. Un duo solide pour le travail, l’argent et les projets de long terme.",
    },
    rub: {
      en: "Work can become the whole relationship, and control a tug of war. What helps: shared rest, and clear roles in shared projects.",
      fr: "Le travail peut devenir toute la relation, et le contrôle tourner au bras de fer. Ce qui aide\u202f: du repos partagé, et des rôles clairs dans les projets communs.",
    },
  },
  "4-9": {
    together: {
      en: "The 4 focuses on the concrete, the 9 on the big picture. The 9 gives the 4’s work a purpose, the 4 grounds the 9’s ideals.",
      fr: "Le 4 se concentre sur le concret, le 9 sur la vue d’ensemble. Le 9 donne un but au travail du 4, le 4 ancre les idéaux du 9.",
    },
    rub: {
      en: "The 4 may find the 9 vague or too giving, the 9 find the 4 narrow. What helps: the 9 making its ideals practical, the 4 lifting its eyes now and then.",
      fr: "Le 4 peut trouver le 9 vague ou trop généreux, le 9 trouver le 4 étroit. Ce qui aide\u202f: que le 9 rende ses idéaux concrets, et que le 4 lève parfois les yeux.",
    },
  },
  "5-5": {
    together: {
      en: "Two free spirits: curious, adaptable, ready for travel and change. Life together can be full of movement and discovery.",
      fr: "Deux esprits libres\u202f: curieux, souples, prêts pour le voyage et le changement. La vie à deux peut être pleine de mouvement et de découvertes.",
    },
    rub: {
      en: "With both wanting freedom, the common ground can stay thin and plans keep changing. What helps: a few shared anchors, and honest talk about commitment.",
      fr: "Comme tous deux veulent leur liberté, le terrain commun peut rester mince et les projets changer sans cesse. Ce qui aide\u202f: quelques repères partagés, et une parole franche sur l’engagement.",
    },
  },
  "5-6": {
    together: {
      en: "The 5 brings adventure, the 6 a home: horizon and hearth. The 5 widens the 6’s world, the 6 gives the 5 somewhere to belong.",
      fr: "Le 5 apporte l’aventure, le 6 un foyer\u202f: l’horizon et l’âtre. Le 5 élargit le monde du 6, le 6 offre au 5 un lieu où il a sa place.",
    },
    rub: {
      en: "The 6 may want more presence than the 5 offers, and the 5 feel hemmed in by the 6’s care. What helps: naming and sharing both freedom and responsibilities.",
      fr: "Le 6 peut souhaiter plus de présence que le 5 n’en offre, et le 5 se sentir à l’étroit dans le soin du 6. Ce qui aide\u202f: nommer et partager à la fois la liberté et les responsabilités.",
    },
  },
  "5-7": {
    together: {
      en: "Two independent minds: the 5 explores the world, the 7 explores ideas. They give each other room and find each other interesting.",
      fr: "Deux esprits indépendants\u202f: le 5 explore le monde, le 7 les idées. Ils se laissent de l’espace et se trouvent mutuellement intéressants.",
    },
    rub: {
      en: "Both independent, they may draw close only now and then. What helps: shared interests that bring the 5’s curiosity and the 7’s depth together.",
      fr: "Indépendants tous deux, ils peuvent ne se rapprocher que de temps en temps. Ce qui aide\u202f: des intérêts communs qui réunissent la curiosité du 5 et la profondeur du 7.",
    },
  },
  "5-8": {
    together: {
      en: "The 5 brings flexibility and new openings, the 8 organisation and drive. Together they can be dynamic and resourceful, in work and ventures above all.",
      fr: "Le 5 apporte la souplesse et de nouvelles ouvertures, le 8 l’organisation et l’élan. Ensemble, ils peuvent être dynamiques et ingénieux, surtout dans le travail et les projets d’entreprise.",
    },
    rub: {
      en: "The 8 wants to steer, the 5 to roam; risk and control can clash. What helps: sharing out the responsibilities, and agreeing how much risk is fine.",
      fr: "Le 8 veut piloter, le 5 vagabonder\u202f: le risque et le contrôle peuvent se heurter. Ce qui aide\u202f: se répartir les responsabilités, et convenir du risque acceptable.",
    },
  },
  "5-9": {
    together: {
      en: "Two broad-minded numbers: the 5 loves experience, the 9 loves humanity. Travel, causes and open horizons come easily to this pair.",
      fr: "Deux nombres à l’esprit large\u202f: le 5 aime l’expérience, le 9 aime l’humanité. Les voyages, les causes et les grands horizons viennent facilement à ce duo.",
    },
    rub: {
      en: "Both can be pulled outward and let the everyday slide. What helps: looking after the home and each other with the same energy as the world.",
      fr: "Tous deux peuvent être attirés vers l’extérieur et laisser filer le quotidien. Ce qui aide\u202f: prendre soin du foyer et l’un de l’autre avec la même énergie que du monde.",
    },
  },
  "6-6": {
    together: {
      en: "Twice the care: home, family and loyalty come first. A warm, devoted pair where each feels looked after.",
      fr: "Deux fois plus de soin\u202f: le foyer, la famille et la fidélité passent avant tout. Un duo chaleureux et dévoué, où chacun se sent entouré.",
    },
    rub: {
      en: "Both can worry, take on too much and quietly try to improve the other. What helps: accepting each other as you are, and sharing responsibilities rather than doubling them.",
      fr: "Tous deux peuvent s’inquiéter, trop en prendre sur eux et vouloir discrètement améliorer l’autre. Ce qui aide\u202f: s’accepter tels que l’on est, et partager les responsabilités plutôt que de les doubler.",
    },
  },
  "6-7": {
    together: {
      en: "The 6 brings warmth and care, the 7 depth and calm. The 6 draws the 7 in; the 7 brings thoughtfulness to the 6’s home.",
      fr: "Le 6 apporte la chaleur et le soin, le 7 la profondeur et le calme. Le 6 attire le 7 vers les autres\u202f; le 7 apporte de la réflexion au foyer du 6.",
    },
    rub: {
      en: "The 6 wants closeness and involvement, the 7 solitude; the 7 may seem aloof, the 6 intrusive. What helps: agreed time alone and time together.",
      fr: "Le 6 veut de la proximité et de la participation, le 7 de la solitude\u202f; le 7 peut sembler distant, le 6 envahissant. Ce qui aide\u202f: des temps convenus, seuls et ensemble.",
    },
  },
  "6-8": {
    together: {
      en: "The 6 tends the home, the 8 tends the world: care meets ambition. Together they can build security and comfort for the people they love.",
      fr: "Le 6 prend soin du foyer, le 8 du monde\u202f: le soin rencontre l’ambition. Ensemble, ils peuvent bâtir la sécurité et le confort des personnes qu’ils aiment.",
    },
    rub: {
      en: "The 8’s work can crowd out the 6’s need for presence, and both like to be in charge in their own way. What helps: valuing both contributions equally, out loud.",
      fr: "Le travail du 8 peut empiéter sur le besoin de présence du 6, et chacun aime diriger à sa façon. Ce qui aide\u202f: reconnaître à voix haute la valeur égale des deux contributions.",
    },
  },
  "6-9": {
    together: {
      en: "Two caring numbers, one close and one wide: the 6 cares for its own, the 9 for everyone. A generous, idealistic pair with big hearts.",
      fr: "Deux nombres attentionnés, l’un proche et l’autre vaste\u202f: le 6 prend soin des siens, le 9 de tous. Un duo généreux et idéaliste, au grand cœur.",
    },
    rub: {
      en: "Both may give too much and forget themselves, and the 9’s wider causes can leave the 6 feeling second. What helps: protecting time and care for each other.",
      fr: "Tous deux peuvent trop donner et s’oublier, et les causes du 9 laisser le 6 se sentir en second. Ce qui aide\u202f: protéger du temps et du soin l’un pour l’autre.",
    },
  },
  "7-7": {
    together: {
      en: "Two thinkers who understand the need for silence: a quiet, deep pair of long conversations and shared curiosity.",
      fr: "Deux penseurs qui comprennent le besoin de silence\u202f: un duo calme et profond, fait de longues conversations et de curiosité partagée.",
    },
    rub: {
      en: "Both may live in their heads and leave feelings and practical life aside. What helps: saying what you feel, not only what you think, and sharing the tasks.",
      fr: "Tous deux peuvent vivre dans leur tête et laisser de côté les sentiments et la vie pratique. Ce qui aide\u202f: dire ce que l’on ressent, pas seulement ce que l’on pense, et se partager les tâches.",
    },
  },
  "7-8": {
    together: {
      en: "The 7 brings insight, the 8 execution: thought meets action. A pair that can do serious, well-founded work together.",
      fr: "Le 7 apporte la compréhension, le 8 la réalisation\u202f: la pensée rencontre l’action. Un duo capable d’un travail sérieux et bien fondé.",
    },
    rub: {
      en: "The 8 may find the 7 slow or withdrawn, the 7 find the 8 too set on results. What helps: the 8 respecting time to reflect, the 7 sharing its conclusions as well as its questions.",
      fr: "Le 8 peut trouver le 7 lent ou en retrait, le 7 trouver le 8 trop porté sur les résultats. Ce qui aide\u202f: que le 8 respecte le temps de la réflexion, et que le 7 partage ses conclusions autant que ses questions.",
    },
  },
  "7-9": {
    together: {
      en: "Two seekers: the 7 looks inward, the 9 outward, both for meaning. A thoughtful, idealistic pair with intellectual and spiritual depth.",
      fr: "Deux chercheurs\u202f: le 7 regarde en dedans, le 9 au dehors, tous deux en quête de sens. Un duo réfléchi et idéaliste, d’une grande profondeur intellectuelle et spirituelle.",
    },
    rub: {
      en: "Both can stand a little apart from daily life, and the 9’s openness can meet the 7’s reserve. What helps: grounding shared ideals in shared routines.",
      fr: "Tous deux peuvent se tenir un peu à l’écart de la vie quotidienne, et l’ouverture du 9 rencontrer la réserve du 7. Ce qui aide\u202f: ancrer les idéaux communs dans des habitudes communes.",
    },
  },
  "8-8": {
    together: {
      en: "Two strong, capable people: ambitious, organised and resilient. Together they can build a great deal.",
      fr: "Deux personnes fortes et capables\u202f: ambitieuses, organisées et endurantes. Ensemble, elles peuvent bâtir beaucoup.",
    },
    rub: {
      en: "Two leaders under one roof can compete, and achievement can crowd out tenderness. What helps: separate fields of authority, and time when nobody is working.",
      fr: "Deux meneurs sous le même toit peuvent rivaliser, et la réussite prendre la place de la tendresse. Ce qui aide\u202f: des domaines d’autorité séparés, et des moments où personne ne travaille.",
    },
  },
  "8-9": {
    together: {
      en: "The 8 brings resources and know-how, the 9 vision and generosity. Together they can do good on a large scale.",
      fr: "Le 8 apporte les ressources et le savoir-faire, le 9 la vision et la générosité. Ensemble, ils peuvent faire du bien à grande échelle.",
    },
    rub: {
      en: "The 8 may find the 9 impractical, the 9 find the 8 materialistic. What helps: the 8 sharing the purpose, the 9 respecting the means.",
      fr: "Le 8 peut trouver le 9 peu pratique, le 9 trouver le 8 trop matérialiste. Ce qui aide\u202f: que le 8 partage le but, et que le 9 respecte les moyens.",
    },
  },
  "9-9": {
    together: {
      en: "Two generous idealists: compassionate, open-minded, moved by the same big questions. A pair with a strong shared sense of what matters.",
      fr: "Deux idéalistes généreux\u202f: compatissants, ouverts, émus par les mêmes grandes questions. Un duo animé d’un fort sens partagé de ce qui compte.",
    },
    rub: {
      en: "Both can give so much to others that their own life together gets what is left. What helps: treating the relationship as one of the causes that matter.",
      fr: "Tous deux peuvent tant donner aux autres que leur vie à deux n’a que les restes. Ce qui aide\u202f: traiter la relation comme l’une des causes qui comptent.",
    },
  },
  "11-11": {
    together: {
      en: "Two 11s share a heightened intuition and a feel for what goes unsaid; they can inspire each other and understand each other’s sensitivity.",
      fr: "Deux 11 partagent une intuition aiguisée et le sens de ce qui n’est pas dit\u202f; ils peuvent s’inspirer l’un l’autre et comprendre la sensibilité de l’autre.",
    },
    rub: {
      en: "Two sensitive people can amplify each other’s restlessness. What helps: calm routines, time outdoors and practical tasks done together.",
      fr: "Deux personnes sensibles peuvent amplifier l’agitation de l’autre. Ce qui aide\u202f: des habitudes calmes, du temps dehors et des tâches concrètes faites ensemble.",
    },
  },
  "11-22": {
    together: {
      en: "The 11 brings inspiration and vision, the 22 the ability to build it in the world: an ambitious pair of dreamer and master builder.",
      fr: "Le 11 apporte l’inspiration et la vision, le 22 la capacité de les bâtir dans le monde\u202f: un duo ambitieux, entre rêveur et maître bâtisseur.",
    },
    rub: {
      en: "The weight of high ideals can press on both. What helps: taking ambitions one step at a time, and making room for ordinary days.",
      fr: "Le poids d’idéaux élevés peut peser sur les deux. Ce qui aide\u202f: avancer pas à pas vers ses ambitions, et faire de la place aux jours ordinaires.",
    },
  },
  "11-33": {
    together: {
      en: "Intuition meets devotion: the 11 inspires, the 33 cares and teaches. A gentle, idealistic pair turned towards helping others.",
      fr: "L’intuition rencontre le dévouement\u202f: le 11 inspire, le 33 prend soin et transmet. Un duo doux et idéaliste, tourné vers l’aide aux autres.",
    },
    rub: {
      en: "Both can take in other people’s feelings and tire. What helps: limits on how much each takes on, and care given to each other.",
      fr: "Tous deux peuvent absorber les émotions des autres et se fatiguer. Ce qui aide\u202f: limiter ce que chacun prend en charge, et prendre soin l’un de l’autre.",
    },
  },
  "22-22": {
    together: {
      en: "Two master builders: practical vision on a large scale. Together they can plan and carry out ambitious projects.",
      fr: "Deux maîtres bâtisseurs\u202f: une vision concrète à grande échelle. Ensemble, ils peuvent concevoir et mener des projets ambitieux.",
    },
    rub: {
      en: "Both may carry too much and expect a great deal of each other. What helps: rest, humour, and celebrating what is already done.",
      fr: "Tous deux peuvent porter trop de choses et beaucoup attendre de l’autre. Ce qui aide\u202f: le repos, l’humour, et fêter ce qui est déjà accompli.",
    },
  },
  "22-33": {
    together: {
      en: "The 22 builds, the 33 nurtures: large projects in the service of people. A pair with both strength and heart.",
      fr: "Le 22 construit, le 33 nourrit\u202f: de grands projets au service des personnes. Un duo qui a à la fois de la force et du cœur.",
    },
    rub: {
      en: "Duty can take over on both sides. What helps: keeping some lightness, and sharing the weight instead of each carrying their own.",
      fr: "Le devoir peut tout prendre, d’un côté comme de l’autre. Ce qui aide\u202f: garder un peu de légèreté, et partager le poids au lieu que chacun porte le sien.",
    },
  },
  "33-33": {
    together: {
      en: "Two caring guides: deep devotion, warmth and a wish to help. A pair rich in kindness.",
      fr: "Deux guides attentionnés\u202f: un dévouement profond, de la chaleur et l’envie d’aider. Un duo riche en bienveillance.",
    },
    rub: {
      en: "Both can put others first and forget their own needs. What helps: looking after each other first, without guilt.",
      fr: "Tous deux peuvent faire passer les autres d’abord et oublier leurs propres besoins. Ce qui aide\u202f: prendre soin l’un de l’autre en premier, sans culpabilité.",
    },
  },
};

/** What each number brings to a pair, said after "brings" / « apporte ». */
export const BRINGS: Record<number, Bi> = {
  1: { en: "initiative and direction: the courage to start", fr: "l’initiative et la direction\u202f: le courage de commencer" },
  2: { en: "tact and attention: a feel for the other", fr: "le tact et l’attention\u202f: une sensibilité à l’autre" },
  3: { en: "warmth and words: lightness, ideas and laughter", fr: "la chaleur et les mots\u202f: la légèreté, les idées et le rire" },
  4: { en: "steadiness and method: things done well", fr: "la constance et la méthode\u202f: les choses bien faites" },
  5: { en: "movement and curiosity: room to change", fr: "le mouvement et la curiosité\u202f: de la place pour changer" },
  6: { en: "care and responsibility: a sense of home", fr: "le soin et la responsabilité\u202f: le sens du foyer" },
  7: { en: "depth and reflection: understanding and calm", fr: "la profondeur et la réflexion\u202f: la compréhension et le calme" },
  8: { en: "drive and organisation: results in the world", fr: "l’élan et l’organisation\u202f: des résultats dans le monde" },
  9: { en: "generosity and breadth: meaning and compassion", fr: "la générosité et l’ampleur\u202f: le sens et la compassion" },
  11: { en: "intuition and inspiration: a fine sense of what goes unsaid", fr: "l’intuition et l’inspiration\u202f: une perception fine de ce qui n’est pas dit" },
  22: { en: "vision on a large scale, with practical hands", fr: "une vision à grande échelle, avec des mains pratiques" },
  33: { en: "devoted care and a gift for gentle teaching", fr: "un soin dévoué et le don de transmettre avec douceur" },
};

/** A master number beside a number of 1 to 9: read through its root, heightened. */
export const MASTER_NOTES: Record<11 | 22 | 33, Bi> = {
  11: {
    en: "An 11 is a 2 heightened: more intuition, inspiration and sensitivity, so the 2’s tenderness and wish for harmony are felt more strongly in this pair.",
    fr: "Un 11 est un 2 amplifié\u202f: plus d’intuition, d’inspiration et de sensibilité\u202f; la tendresse du 2 et son besoin d’harmonie se font sentir plus fort dans ce duo.",
  },
  22: {
    en: "A 22 is a 4 with a wider vision: the 4’s steadiness carries ambitious plans, and the pair may feel both a greater sense of purpose and more pressure.",
    fr: "Un 22 est un 4 à la vision plus large\u202f: la constance du 4 porte des projets ambitieux, et le duo peut ressentir à la fois un sens plus fort de sa mission et davantage de pression.",
  },
  33: {
    en: "A 33 is a 6 devoted to others: the 6’s care widens into teaching and helping, and the pair may need to guard its own time.",
    fr: "Un 33 est un 6 dévoué aux autres\u202f: le soin du 6 s’élargit en transmission et en aide, et le duo peut avoir à protéger son propre temps.",
  },
};

/** What each pair compares, before its dynamic ({a}, {b}: the two names; {deA}, {deB}: French « de A »). */
export const POSITION_TEXT: Record<string, Bi> = {
  lifepath: {
    en: "Your Life Paths: the road each of you travels, side by side. They say how your directions in life tend to fit.",
    fr: "Vos Chemins de vie\u202f: la route que suit chacun de vous, côte à côte. Ils disent comment vos directions dans la vie ont tendance à s’accorder.",
  },
  expression: {
    en: "Your Expressions: your talents, and the way each of you acts in the world.",
    fr: "Vos Expressions\u202f: vos talents, et la manière d’agir de chacun dans le monde.",
  },
  soulurge: {
    en: "Your Soul Urges: what each of you wants deep down, the needs of the heart.",
    fr: "Vos Élans de l’âme\u202f: ce que chacun de vous désire au fond, les besoins du cœur.",
  },
  personality: {
    en: "Your Personalities: how each of you comes across, the first impression you give.",
    fr: "Vos Personnalités\u202f: la façon dont chacun de vous apparaît, la première impression que vous donnez.",
  },
  birthday: {
    en: "Your Birthdays: a particular gift each of you was born with.",
    fr: "Vos Jours de naissance\u202f: un don particulier avec lequel chacun de vous est né.",
  },
  maturity: {
    en: "Your Maturity numbers: where each of you is heading in the second half of life.",
    fr: "Vos nombres de Maturité\u202f: là où chacun de vous se dirige dans la seconde moitié de la vie.",
  },
  "su-pe": {
    en: "{a}’s Soul Urge meets {b}’s Personality: what {a} longs for, beside how {b} comes across. Numerologists read it for what draws one to the other.",
    fr: "L’Élan de l’âme {deA} rencontre la Personnalité {deB}\u202f: ce à quoi {a} aspire, à côté de la façon dont {b} apparaît. Les numérologues y lisent ce qui attire l’un vers l’autre.",
  },
  "pe-su": {
    en: "{a}’s Personality meets {b}’s Soul Urge: how {a} comes across, beside what {b} longs for. Numerologists read it for what draws one to the other.",
    fr: "La Personnalité {deA} rencontre l’Élan de l’âme {deB}\u202f: la façon dont {a} apparaît, à côté de ce à quoi {b} aspire. Les numérologues y lisent ce qui attire l’un vers l’autre.",
  },
  "lp-ex": {
    en: "{a}’s Life Path meets {b}’s Expression: the road {a} travels, beside the talents {b} brings to it.",
    fr: "Le Chemin de vie {deA} rencontre l’Expression {deB}\u202f: la route que suit {a}, à côté des talents que {b} y apporte.",
  },
  "ex-lp": {
    en: "{a}’s Expression meets {b}’s Life Path: the talents {a} brings, beside the road {b} travels.",
    fr: "L’Expression {deA} rencontre le Chemin de vie {deB}\u202f: les talents que {a} apporte, à côté de la route que suit {b}.",
  },
};

/** The relationship number: the tone the pair takes together. */
export const RELATIONSHIP_TEXT: Record<number, Bi> = {
  1: {
    en: "A relationship number 1 gives the pair a pioneering tone: together you tend to start things, to stand on your own feet and to encourage each other’s independence.",
    fr: "Un nombre de la relation 1 donne au duo un ton de pionnier\u202f: ensemble, vous avez tendance à lancer des choses, à rester chacun debout et à encourager l’indépendance de l’autre.",
  },
  2: {
    en: "A relationship number 2 gives the pair a tone of partnership: closeness, cooperation and attention to each other’s feelings.",
    fr: "Un nombre de la relation 2 donne au duo un ton de partenariat\u202f: la proximité, la coopération et l’attention aux sentiments de l’autre.",
  },
  3: {
    en: "A relationship number 3 gives the pair a sociable, creative tone: conversation, humour, friends and things made together.",
    fr: "Un nombre de la relation 3 donne au duo un ton sociable et créatif\u202f: la conversation, l’humour, les amis et les choses faites ensemble.",
  },
  4: {
    en: "A relationship number 4 gives the pair a builder’s tone: steadiness, shared work, a home and plans that take time.",
    fr: "Un nombre de la relation 4 donne au duo un ton de bâtisseur\u202f: la constance, le travail partagé, un foyer et des projets qui prennent du temps.",
  },
  5: {
    en: "A relationship number 5 gives the pair a lively tone: travel, change, curiosity and room to breathe.",
    fr: "Un nombre de la relation 5 donne au duo un ton vif\u202f: les voyages, le changement, la curiosité et de l’air pour respirer.",
  },
  6: {
    en: "A relationship number 6 gives the pair a caring tone: home, family, responsibility and looking after each other.",
    fr: "Un nombre de la relation 6 donne au duo un ton attentionné\u202f: le foyer, la famille, la responsabilité et le soin l’un de l’autre.",
  },
  7: {
    en: "A relationship number 7 gives the pair a reflective tone: depth, shared questions and respect for each other’s inner life.",
    fr: "Un nombre de la relation 7 donne au duo un ton réfléchi\u202f: la profondeur, des questions partagées et le respect de la vie intérieure de l’autre.",
  },
  8: {
    en: "A relationship number 8 gives the pair an ambitious tone: shared goals, resources and achievements built together.",
    fr: "Un nombre de la relation 8 donne au duo un ton ambitieux\u202f: des buts communs, des ressources et des réussites bâties ensemble.",
  },
  9: {
    en: "A relationship number 9 gives the pair a generous tone: shared ideals, openness to others and a purpose beyond the two of you.",
    fr: "Un nombre de la relation 9 donne au duo un ton généreux\u202f: des idéaux partagés, l’ouverture aux autres et un sens qui dépasse le duo.",
  },
  11: {
    en: "A relationship number 11 gives the pair an inspired tone: intuition, shared ideals and a sensitivity to each other that asks for gentleness.",
    fr: "Un nombre de la relation 11 donne au duo un ton inspiré\u202f: l’intuition, des idéaux communs et une sensibilité l’un à l’autre qui demande de la douceur.",
  },
  22: {
    en: "A relationship number 22 gives the pair a builder’s tone on a large scale: shared projects that can reach beyond the two of you.",
    fr: "Un nombre de la relation 22 donne au duo un ton de bâtisseur à grande échelle\u202f: des projets communs qui peuvent aller au-delà de vous deux.",
  },
  33: {
    en: "A relationship number 33 gives the pair a tone of devotion: care for each other and for others, and a gift for helping.",
    fr: "Un nombre de la relation 33 donne au duo un ton de dévouement\u202f: le soin l’un de l’autre et des autres, et un don pour aider.",
  },
};

/** The relationship’s year (the two personal years added and reduced, 1–9). */
export const COUPLE_YEAR_TEXT: Record<number, Bi> = {
  1: {
    en: "A 1 year for the two of you: a time to begin something together, a project, a place or a habit.",
    fr: "Une année 1 pour vous deux\u202f: le moment de commencer quelque chose ensemble, un projet, un lieu ou une habitude.",
  },
  2: {
    en: "A 2 year for the two of you: a time for patience, closeness and listening; things grow quietly.",
    fr: "Une année 2 pour vous deux\u202f: un temps de patience, de proximité et d’écoute\u202f; les choses grandissent en silence.",
  },
  3: {
    en: "A 3 year for the two of you: a time for friends, outings, play and saying what you feel.",
    fr: "Une année 3 pour vous deux\u202f: un temps pour les amis, les sorties, le jeu, et pour dire ce que vous ressentez.",
  },
  4: {
    en: "A 4 year for the two of you: a time to build, with practical plans, shared work and things put in order.",
    fr: "Une année 4 pour vous deux\u202f: un temps pour bâtir, avec des projets concrets, du travail partagé et de l’ordre.",
  },
  5: {
    en: "A 5 year for the two of you: a time for change and fresh air, travel, new experiences and flexibility.",
    fr: "Une année 5 pour vous deux\u202f: un temps de changement et d’air frais, de voyages, d’expériences nouvelles et de souplesse.",
  },
  6: {
    en: "A 6 year for the two of you: a time for home and family, for commitments and for looking after each other.",
    fr: "Une année 6 pour vous deux\u202f: un temps pour le foyer et la famille, pour les engagements et le soin l’un de l’autre.",
  },
  7: {
    en: "A 7 year for the two of you: a quieter time, for reflection, rest and understanding each other more deeply.",
    fr: "Une année 7 pour vous deux\u202f: un temps plus calme, pour la réflexion, le repos et une compréhension plus profonde l’un de l’autre.",
  },
  8: {
    en: "An 8 year for the two of you: a time for goals and resources, shared projects, money matters and ambitions.",
    fr: "Une année 8 pour vous deux\u202f: un temps pour les buts et les ressources, les projets communs, les questions d’argent et les ambitions.",
  },
  9: {
    en: "A 9 year for the two of you: a time to complete, to let go of what has run its course and to make room for what comes next.",
    fr: "Une année 9 pour vous deux\u202f: un temps pour achever, laisser partir ce qui a fait son temps et faire de la place à ce qui vient.",
  },
};

/** What the page reads, and how its two numbers of the pair are worked out. */
export const PAIR_ABOUT: Bi = {
  en: "Numerology reads two people by setting their numbers side by side: how each pair of numbers tends to work together, what each brings and where they may rub. It describes dynamics, never a verdict: no two numbers are good or bad together.",
  fr: "La numérologie lit deux personnes en plaçant leurs nombres côte à côte\u202f: comment chaque paire de nombres a tendance à fonctionner, ce que chacun apporte, et où ils peuvent frotter. Elle décrit des dynamiques, jamais un verdict\u202f: aucun couple de nombres n’est bon ou mauvais en soi.",
};

export const RELATIONSHIP_HOW: Bi = {
  en: "The relationship number adds the two Life Paths, each as its own page shows it (11, 22 and 33 kept whole), then reduces the total to one digit or a master number: 4 + 3 = 7, 11 + 11 = 22.",
  fr: "Le nombre de la relation additionne les deux Chemins de vie, chacun tel que sa page le montre (11, 22 et 33 gardés entiers), puis réduit le total à un chiffre ou à un nombre maître\u202f: 4 + 3 = 7, 11 + 11 = 22.",
};

export const COUPLE_YEAR_HOW: Bi = {
  en: "The relationship’s year adds the two personal years and reduces the total to 1–9, as personal years are; each personal year runs from 1 January.",
  fr: "L’année de la relation additionne les deux années personnelles et réduit le total de 1 à 9, comme les années personnelles\u202f; chacune court à partir du 1er janvier.",
};
