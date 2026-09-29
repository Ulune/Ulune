import type { PlaneId, YReason } from "@/lib/chart/numerology-name";
import type { Bi } from "./types";

/**
 * Numerology, part 63 of the launch plan: the texts of the finer numbers and
 * the long cycles. The name's (karmic debts, lessons and hidden passion,
 * balance, rational thought, subconscious self, attitude, the planes, the
 * cornerstone, capstone and first vowel, the letter Y), the bridges, the
 * period cycles, pinnacles and challenges, the essence and letter cycles, and
 * the Chaldean number with Cheiro's planet. English and French side by side
 * (one language per reading pack). The cycles speak to the reader; none of it
 * promises an event: a number describes a theme to live, not a fate.
 */

export type Digit = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type Gap = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type KarmicDebtKey = 13 | 14 | 16 | 19;
export type CycleNumberKey = Digit | 11 | 22 | 33;
export type EssenceKey = Digit | 11 | 22;
export type LetterKey =
  | "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K" | "L" | "M"
  | "N" | "O" | "P" | "Q" | "R" | "S" | "T" | "U" | "V" | "W" | "X" | "Y" | "Z";
export type StoneId = "cornerstone" | "capstone" | "firstVowel";

// ---------------------------------------------------------------- Karmic debts

/** What a karmic debt is, as Hans Decoz frames it. */
export const KARMIC_DEBT_ABOUT: Bi = {
  en: "A karmic debt is a 13, 14, 16 or 19 reached just before the last step of a core number. Hans Decoz reads it as a lesson that keeps coming back until it is learned, not as a punishment: the number keeps its root’s meaning, with this lesson woven in.",
  fr: "Une dette karmique est un 13, 14, 16 ou 19 atteint juste avant la dernière étape d’un nombre principal. Hans Decoz y lit une leçon qui revient jusqu’à ce qu’elle soit apprise, pas une punition\u202f: le nombre garde le sens de sa racine, avec cette leçon mêlée à lui.",
};

export const KARMIC_DEBT_TEXT: Record<KarmicDebtKey, Bi> = {
  13: {
    en: "A karmic debt 13 sits behind a 4. It is read as a lesson about effort: things may take more work than they seem to take for others, and shortcuts tend to cost twice. Steady, focused work turns it into real strength.",
    fr: "Une dette karmique 13 se tient derrière un 4. On la lit comme une leçon sur l’effort\u202f: les choses demandent parfois plus de travail qu’elles n’en demandent aux autres, et les raccourcis coûtent souvent double. Un travail régulier et concentré en fait une vraie force.",
  },
  14: {
    en: "A karmic debt 14 sits behind a 5. It is read as a lesson about freedom used well: moderation, keeping commitments, not letting the appetite for change turn into running away. Adaptability around a steady core is its answer.",
    fr: "Une dette karmique 14 se tient derrière un 5. On la lit comme une leçon sur la liberté bien employée\u202f: la modération, tenir ses engagements, ne pas laisser le goût du changement devenir une fuite. La souplesse autour d’un centre stable en est la réponse.",
  },
  16: {
    en: "A karmic debt 16 sits behind a 7. It is read as a lesson about pride and humility: what is built on vanity may need rebuilding, and each rebuilding tends to leave something truer. Openness, and honesty with yourself, are its answer.",
    fr: "Une dette karmique 16 se tient derrière un 7. On la lit comme une leçon sur l’orgueil et l’humilité\u202f: ce qui est bâti sur la vanité peut devoir être reconstruit, et chaque reconstruction laisse souvent quelque chose de plus vrai. L’ouverture, et l’honnêteté envers vous-même, en sont la réponse.",
  },
  19: {
    en: "A karmic debt 19 sits behind a 1. It is read as a lesson about independence: learning to accept help, and to use your strength for more than yourself. Standing on your own while staying connected is its answer.",
    fr: "Une dette karmique 19 se tient derrière un 1. On la lit comme une leçon sur l’indépendance\u202f: apprendre à accepter de l’aide, et à mettre votre force au service de plus que vous. Tenir debout seul en restant relié aux autres en est la réponse.",
  },
};

// ------------------------------------------------ Karmic lessons, hidden passion

export const KARMIC_LESSON_ABOUT: Bi = {
  en: "A karmic lesson is a number from 1 to 9 that no letter of the birth name falls on: a quality you may have to learn on purpose rather than by nature. Most names miss one to three numbers; none of them is a flaw.",
  fr: "Une leçon karmique est un nombre de 1 à 9 sur lequel ne tombe aucune lettre du nom de naissance\u202f: une qualité que vous aurez peut-être à apprendre exprès plutôt que par nature. La plupart des noms en laissent de côté un à trois\u202f; aucun n’est un défaut.",
};

export const KARMIC_LESSON_TEXT: Record<Digit, Bi> = {
  1: {
    en: "No letter of the name falls on 1. The lesson: standing up for yourself, taking the initiative, making a decision and owning it. It grows with practice, one decision at a time.",
    fr: "Aucune lettre du nom ne tombe sur le 1. La leçon\u202f: vous affirmer, prendre l’initiative, trancher et l’assumer. Elle grandit avec la pratique, une décision après l’autre.",
  },
  2: {
    en: "No letter falls on 2. The lesson: patience, tact and cooperation; noticing what others feel and working at their pace. Listening before answering is a good place to start.",
    fr: "Aucune lettre ne tombe sur le 2. La leçon\u202f: la patience, le tact et la coopération\u202f; percevoir ce que ressentent les autres et travailler à leur rythme. Écouter avant de répondre est un bon début.",
  },
  3: {
    en: "No letter falls on 3. The lesson: expressing yourself, in words, art or play, and letting others see what you feel. Small, regular ways of sharing build the confidence.",
    fr: "Aucune lettre ne tombe sur le 3. La leçon\u202f: vous exprimer, par les mots, l’art ou le jeu, et laisser voir ce que vous ressentez. De petites façons régulières de partager construisent la confiance.",
  },
  4: {
    en: "No letter falls on 4. The lesson: method and steady work; finishing the practical tasks and building step by step. A simple routine helps more than good intentions.",
    fr: "Aucune lettre ne tombe sur le 4. La leçon\u202f: la méthode et le travail régulier\u202f; terminer les tâches concrètes et construire pas à pas. Une routine simple aide plus que les bonnes intentions.",
  },
  5: {
    en: "No letter falls on 5. The lesson: openness to change; trying the unfamiliar, travelling, adapting when plans shift. Starting with small changes makes the big ones less daunting.",
    fr: "Aucune lettre ne tombe sur le 5. La leçon\u202f: l’ouverture au changement\u202f; essayer l’inconnu, voyager, vous adapter quand les plans bougent. Commencer par de petits changements rend les grands moins intimidants.",
  },
  6: {
    en: "No letter falls on 6. The lesson: responsibility toward home, family and community; commitment when it is asked of you. Showing up reliably for one or two people is where it begins.",
    fr: "Aucune lettre ne tombe sur le 6. La leçon\u202f: la responsabilité envers le foyer, la famille et la communauté\u202f; l’engagement quand on vous le demande. Être présent de façon fiable pour une ou deux personnes en est le commencement.",
  },
  7: {
    en: "No letter falls on 7. The lesson: depth; taking time to reflect and study, and trusting your inner voice more than first impressions. Regular quiet time helps it grow.",
    fr: "Aucune lettre ne tombe sur le 7. La leçon\u202f: la profondeur\u202f; prendre le temps de réfléchir et d’étudier, et faire davantage confiance à votre voix intérieure qu’aux premières impressions. Des moments de calme réguliers la font grandir.",
  },
  8: {
    en: "No letter falls on 8. The lesson: handling money, authority and practical power with confidence. Learning the basics of a budget and taking charge of small things builds it.",
    fr: "Aucune lettre ne tombe sur le 8. La leçon\u202f: manier l’argent, l’autorité et le pouvoir concret avec assurance. Apprendre les bases d’un budget et prendre en main de petites choses la construit.",
  },
  9: {
    en: "No letter falls on 9. The lesson: compassion and a wider view; caring about people beyond your own circle, and letting go of what has ended. Giving a little of your time to others opens it.",
    fr: "Aucune lettre ne tombe sur le 9. La leçon\u202f: la compassion et une vision plus large\u202f; vous soucier des gens au-delà de votre cercle, et laisser partir ce qui est fini. Donner un peu de votre temps aux autres l’ouvre.",
  },
};

export const HIDDEN_PASSION_ABOUT: Bi = {
  en: "The hidden passion is the number the most letters of the birth name fall on: a drive or a talent you tend to reach for without thinking. When two numbers tie, both are read.",
  fr: "La passion cachée est le nombre sur lequel tombent le plus de lettres du nom de naissance\u202f: un élan ou un talent vers lequel vous allez sans y penser. Quand deux nombres sont à égalité, on lit les deux.",
};

export const HIDDEN_PASSION_TEXT: Record<Digit, Bi> = {
  1: {
    en: "Most letters fall on 1: a hidden passion for leading and being your own person. Drive and independence come easily; so can impatience.",
    fr: "Le plus de lettres tombent sur le 1\u202f: une passion cachée pour mener et être vous-même. L’élan et l’indépendance viennent facilement\u202f; l’impatience aussi.",
  },
  2: {
    en: "Most letters fall on 2: a hidden passion for harmony and partnership. Tact and cooperation come naturally; so can taking things to heart.",
    fr: "Le plus de lettres tombent sur le 2\u202f: une passion cachée pour l’harmonie et le partage. Le tact et la coopération viennent naturellement\u202f; tout prendre à cœur aussi.",
  },
  3: {
    en: "Most letters fall on 3: a hidden passion for expression. Words, creativity and good company come easily; so can scattering your energy.",
    fr: "Le plus de lettres tombent sur le 3\u202f: une passion cachée pour l’expression. Les mots, la créativité et la bonne compagnie viennent facilement\u202f; la dispersion aussi.",
  },
  4: {
    en: "Most letters fall on 4: a hidden passion for order and work well done. Discipline comes naturally; so can rigidity.",
    fr: "Le plus de lettres tombent sur le 4\u202f: une passion cachée pour l’ordre et le travail bien fait. La discipline vient naturellement\u202f; la rigidité aussi.",
  },
  5: {
    en: "Most letters fall on 5: a hidden passion for freedom and experience. Curiosity and adaptability come easily; so can restlessness.",
    fr: "Le plus de lettres tombent sur le 5\u202f: une passion cachée pour la liberté et l’expérience. La curiosité et la souplesse viennent facilement\u202f; l’agitation aussi.",
  },
  6: {
    en: "Most letters fall on 6: a hidden passion for care, home and family. Responsibility comes naturally; so can taking on too much.",
    fr: "Le plus de lettres tombent sur le 6\u202f: une passion cachée pour le soin, le foyer et la famille. La responsabilité vient naturellement\u202f; en prendre trop aussi.",
  },
  7: {
    en: "Most letters fall on 7: a hidden passion for knowledge and understanding. Analysis and reflection come easily; so can withdrawing.",
    fr: "Le plus de lettres tombent sur le 7\u202f: une passion cachée pour le savoir et la compréhension. L’analyse et la réflexion viennent facilement\u202f; le repli aussi.",
  },
  8: {
    en: "Most letters fall on 8: a hidden passion for achievement and authority. Ambition and organisation come naturally; so can the wish to control.",
    fr: "Le plus de lettres tombent sur le 8\u202f: une passion cachée pour la réussite et l’autorité. L’ambition et l’organisation viennent naturellement\u202f; l’envie de contrôler aussi.",
  },
  9: {
    en: "Most letters fall on 9: a hidden passion for ideals and for people everywhere. Generosity comes naturally; so can forgetting your own needs.",
    fr: "Le plus de lettres tombent sur le 9\u202f: une passion cachée pour les idéaux et pour les gens, partout. La générosité vient naturellement\u202f; l’oubli de vos propres besoins aussi.",
  },
};

// ------------------------------- Balance, rational thought, subconscious, attitude

export const BALANCE_ABOUT: Bi = {
  en: "The balance number adds the first letters of each name of the birth name and reduces them: how you tend to meet a difficult situation, and what steadies you.",
  fr: "Le nombre d’équilibre additionne les premières lettres de chaque nom du nom de naissance et les réduit\u202f: votre façon d’aborder une situation difficile, et ce qui vous stabilise.",
};

export const BALANCE_TEXT: Record<Digit, Bi> = {
  1: {
    en: "In a hard moment, your strength is to stand firm and act. What helps: talking it through with one trusted person before you decide alone.",
    fr: "Dans un moment difficile, votre force est de tenir bon et d’agir. Ce qui aide\u202f: en parler avec une personne de confiance avant de décider seul.",
  },
  2: {
    en: "In a hard moment, your strength is diplomacy and patience. What helps: facing the problem directly rather than waiting for it to pass.",
    fr: "Dans un moment difficile, votre force est la diplomatie et la patience. Ce qui aide\u202f: affronter le problème de face plutôt qu’attendre qu’il passe.",
  },
  3: {
    en: "In a hard moment, your strength is to lighten things and talk them out. What helps: keeping to the point, so words don’t scatter the problem.",
    fr: "Dans un moment difficile, votre force est d’alléger et d’en parler. Ce qui aide\u202f: rester sur l’essentiel, pour que les mots ne dispersent pas le problème.",
  },
  4: {
    en: "In a hard moment, your strength is method: a plan and practical steps. What helps: letting feelings in too, and some flexibility into the plan.",
    fr: "Dans un moment difficile, votre force est la méthode\u202f: un plan et des étapes concrètes. Ce qui aide\u202f: laisser place aux émotions, et un peu de souplesse dans le plan.",
  },
  5: {
    en: "In a hard moment, your strength is flexibility and a fresh angle. What helps: staying with the problem long enough to solve it rather than moving on.",
    fr: "Dans un moment difficile, votre force est la souplesse et un regard neuf. Ce qui aide\u202f: rester assez longtemps avec le problème pour le résoudre au lieu de passer à autre chose.",
  },
  6: {
    en: "In a hard moment, your strength is care and responsibility. What helps: sharing the load instead of carrying everyone’s alone.",
    fr: "Dans un moment difficile, votre force est le soin et la responsabilité. Ce qui aide\u202f: partager la charge au lieu de porter seul celle de tous.",
  },
  7: {
    en: "In a hard moment, your strength is to step back and think it through. What helps: coming back to people once you have, rather than withdrawing for good.",
    fr: "Dans un moment difficile, votre force est de prendre du recul et de réfléchir. Ce qui aide\u202f: revenir vers les autres une fois que c’est fait, plutôt que de vous retirer pour de bon.",
  },
  8: {
    en: "In a hard moment, your strength is to take charge and use what you have. What helps: listening to people’s feelings as well as to the facts.",
    fr: "Dans un moment difficile, votre force est de prendre les choses en main et d’utiliser vos moyens. Ce qui aide\u202f: écouter les émotions des gens autant que les faits.",
  },
  9: {
    en: "In a hard moment, your strength is compassion and a wide view. What helps: keeping your own needs in the picture too.",
    fr: "Dans un moment difficile, votre force est la compassion et une vision large. Ce qui aide\u202f: garder aussi vos propres besoins dans le tableau.",
  },
};

export const RATIONAL_ABOUT: Bi = {
  en: "The rational thought number adds the first name and the day of birth: how you tend to think a question through and reach a decision.",
  fr: "Le nombre de pensée rationnelle additionne le prénom et le jour de naissance\u202f: votre façon de réfléchir à une question et d’arriver à une décision.",
};

export const RATIONAL_TEXT: Record<Digit, Bi> = {
  1: {
    en: "You think independently: you form your own view quickly and trust it. Checking it against one other opinion keeps it sharp.",
    fr: "Vous pensez de façon indépendante\u202f: vous vous faites vite votre propre avis et vous lui faites confiance. Le confronter à un autre avis le garde affûté.",
  },
  2: {
    en: "You think with others in mind: you weigh how a decision will land on people. Setting a moment to decide keeps the weighing from running on.",
    fr: "Vous pensez en tenant compte des autres\u202f: vous pesez la façon dont une décision touchera les gens. Vous fixer un moment pour décider évite que la pesée s’éternise.",
  },
  3: {
    en: "You think in images and words: ideas come fast and connect in surprising ways. Writing them down helps you choose among them.",
    fr: "Vous pensez en images et en mots\u202f: les idées viennent vite et se relient de façon surprenante. Les écrire vous aide à choisir parmi elles.",
  },
  4: {
    en: "You think logically, step by step: facts first, conclusions after. Leaving room for a hunch can save time when the facts run out.",
    fr: "Vous pensez avec logique, pas à pas\u202f: les faits d’abord, les conclusions ensuite. Laisser de la place à une intuition peut faire gagner du temps quand les faits manquent.",
  },
  5: {
    en: "You think quickly and from many sides: you like options and new angles. Narrowing the choice to two before deciding helps.",
    fr: "Vous pensez vite et sous tous les angles\u202f: vous aimez les options et les points de vue nouveaux. Ramener le choix à deux possibilités avant de décider aide.",
  },
  6: {
    en: "You think in terms of values and responsibility: what is right, and who will be affected. Keeping your own interests on the list is part of a fair decision.",
    fr: "Vous pensez en termes de valeurs et de responsabilité\u202f: ce qui est juste, et qui sera concerné. Garder vos propres intérêts sur la liste fait partie d’une décision juste.",
  },
  7: {
    en: "You think analytically and intuitively at once: you look beneath the surface before you conclude. Sharing your reasoning helps others trust your conclusions.",
    fr: "Vous pensez de façon à la fois analytique et intuitive\u202f: vous regardez sous la surface avant de conclure. Partager votre raisonnement aide les autres à faire confiance à vos conclusions.",
  },
  8: {
    en: "You think strategically: goals, means and results. Asking what a plan costs people, and not only money, rounds it out.",
    fr: "Vous pensez en stratège\u202f: objectifs, moyens et résultats. Vous demander ce qu’un plan coûte aux gens, et pas seulement en argent, le complète.",
  },
  9: {
    en: "You think broadly: the whole picture, the long term, the people involved. Pinning down the next concrete step keeps ideals practical.",
    fr: "Vous pensez large\u202f: l’ensemble, le long terme, les gens concernés. Fixer la prochaine étape concrète garde les idéaux praticables.",
  },
};

export const SUBCONSCIOUS_ABOUT: Bi = {
  en: "The subconscious self is 9 minus the number of karmic lessons: how many of the nine numbers the name holds. It is read as the way you react to the sudden and the unexpected.",
  fr: "Le moi subconscient vaut 9 moins le nombre de leçons karmiques\u202f: combien des neuf nombres le nom contient. On y lit votre façon de réagir au soudain et à l’imprévu.",
};

export const SUBCONSCIOUS_TEXT: Record<Digit, Bi> = {
  9: {
    en: "No karmic lesson: all nine numbers are in the name. You tend to meet the unexpected with confidence and many resources. What helps: choosing where to spend them.",
    fr: "Aucune leçon karmique\u202f: les neuf nombres sont dans le nom. Vous abordez souvent l’imprévu avec assurance et beaucoup de ressources. Ce qui aide\u202f: choisir où les employer.",
  },
  8: {
    en: "One number missing: you tend to meet the unexpected efficiently and practically, taking charge. What helps: letting feelings catch up once the crisis has passed.",
    fr: "Un nombre manque\u202f: vous abordez souvent l’imprévu avec efficacité et sens pratique, en prenant les choses en main. Ce qui aide\u202f: laisser les émotions rattraper les faits une fois la crise passée.",
  },
  7: {
    en: "Two numbers missing: you tend to think before reacting, analysing the situation first. What helps: not staying on the sidelines once you have understood.",
    fr: "Deux nombres manquent\u202f: vous réfléchissez souvent avant de réagir, en analysant d’abord la situation. Ce qui aide\u202f: ne pas rester en retrait une fois que vous avez compris.",
  },
  6: {
    en: "Three numbers missing: faced with the unexpected, you turn first to your responsibilities and the people close to you. What helps: letting others help carry them.",
    fr: "Trois nombres manquent\u202f: face à l’imprévu, vous pensez d’abord à vos responsabilités et à vos proches. Ce qui aide\u202f: laisser les autres vous aider à les porter.",
  },
  5: {
    en: "Four numbers missing: you adapt fast to the unexpected, though you may scatter your efforts. What helps: picking one thing to deal with first.",
    fr: "Quatre nombres manquent\u202f: vous vous adaptez vite à l’imprévu, au risque de vous disperser. Ce qui aide\u202f: choisir une chose à traiter en premier.",
  },
  4: {
    en: "Five numbers missing: you do best with the unexpected when there is structure: a plan, a routine, a list. What helps: simple plans prepared for what matters most.",
    fr: "Cinq nombres manquent\u202f: face à l’imprévu, vous vous en sortez mieux avec un cadre\u202f: un plan, une routine, une liste. Ce qui aide\u202f: des plans simples préparés pour ce qui compte le plus.",
  },
  3: {
    en: "Six numbers missing: the unexpected may set you worrying, or talking it over at length. What helps: one calm step at a time, and people you trust.",
    fr: "Six nombres manquent\u202f: l’imprévu peut vous inquiéter, ou vous faire en parler longuement. Ce qui aide\u202f: une étape calme à la fois, et des personnes de confiance.",
  },
  2: {
    en: "Seven numbers missing: the unexpected can feel unsettling, and you may look to others to lead. What helps: support arranged in advance.",
    fr: "Sept nombres manquent\u202f: l’imprévu peut vous déstabiliser, et vous pouvez attendre des autres qu’ils mènent. Ce qui aide\u202f: un soutien prévu à l’avance.",
  },
  1: {
    en: "Eight numbers missing, which is rare: your reaction to the unexpected is very much your own. What helps: noticing it, and pausing before you act.",
    fr: "Huit nombres manquent, ce qui est rare\u202f: votre réaction à l’imprévu n’appartient qu’à vous. Ce qui aide\u202f: la remarquer, et marquer une pause avant d’agir.",
  },
};

export const ATTITUDE_ABOUT: Bi = {
  en: "The attitude number adds the month and the day of birth: the stance you tend to take toward life, often the first thing people pick up about you.",
  fr: "Le nombre d’attitude additionne le mois et le jour de naissance\u202f: la position que vous prenez volontiers face à la vie, souvent la première chose que les gens perçoivent de vous.",
};

export const ATTITUDE_TEXT: Record<Digit, Bi> = {
  1: {
    en: "You tend to meet life head-on: confident, direct, ready to start. A word of warmth keeps the directness from sounding abrupt.",
    fr: "Vous abordez souvent la vie de front\u202f: avec assurance, franchise, prêt à commencer. Un mot chaleureux évite que la franchise paraisse abrupte.",
  },
  2: {
    en: "You tend to meet life gently: friendly, considerate, looking for common ground. Saying what you want keeps the gentleness from being overlooked.",
    fr: "Vous abordez souvent la vie avec douceur\u202f: aimable, attentif, en quête de terrain d’entente. Dire ce que vous voulez évite que la douceur passe inaperçue.",
  },
  3: {
    en: "You tend to meet life with enthusiasm: sociable, expressive, quick to see the fun. A little follow-through lets the enthusiasm carry.",
    fr: "Vous abordez souvent la vie avec enthousiasme\u202f: sociable, expressif, prompt à en voir le côté plaisant. Un peu de suite dans les idées permet à l’enthousiasme de porter.",
  },
  4: {
    en: "You tend to meet life seriously: practical, dependable, careful before committing. Some lightness keeps the seriousness from weighing on you.",
    fr: "Vous abordez souvent la vie avec sérieux\u202f: pratique, fiable, prudent avant de vous engager. Un peu de légèreté évite que le sérieux vous pèse.",
  },
  5: {
    en: "You tend to meet life with curiosity: open to change, lively, eager for the new. A few fixed points keep the curiosity from scattering.",
    fr: "Vous abordez souvent la vie avec curiosité\u202f: ouvert au changement, vif, avide de nouveauté. Quelques points fixes évitent que la curiosité se disperse.",
  },
  6: {
    en: "You tend to meet life with warmth: responsible, protective, attentive to others. Leaving people room to choose keeps the care from feeling like control.",
    fr: "Vous abordez souvent la vie avec chaleur\u202f: responsable, protecteur, attentif aux autres. Laisser aux gens la liberté de choisir évite que le soin ressemble à du contrôle.",
  },
  7: {
    en: "You tend to meet life thoughtfully: observant, reserved, taking your time before trusting. A friendly sign now and then keeps the reserve from reading as distance.",
    fr: "Vous abordez souvent la vie avec réflexion\u202f: observateur, réservé, prenant votre temps avant de faire confiance. Un signe amical de temps en temps évite que la réserve passe pour de la distance.",
  },
  8: {
    en: "You tend to meet life with assurance: capable, goal-minded, at ease with responsibility. Showing some of your doubts makes you easier to work with.",
    fr: "Vous abordez souvent la vie avec assurance\u202f: capable, tourné vers les objectifs, à l’aise avec les responsabilités. Montrer un peu de vos doutes vous rend plus facile à côtoyer.",
  },
  9: {
    en: "You tend to meet life openly: generous, tolerant, with an eye on the bigger picture. Clear limits keep the generosity from being taken for granted.",
    fr: "Vous abordez souvent la vie avec ouverture\u202f: généreux, tolérant, attentif à l’ensemble. Des limites claires évitent qu’on tienne votre générosité pour acquise.",
  },
};

// ----------------------------------------------------------------- The planes

export const PLANES_ABOUT: Bi = {
  en: "The planes of expression sort the letters of the birth name into four groups, each added and reduced on its own: how much of the name, and which number, goes to the body, the mind, the feelings and the intuition. A plane with no letter is not a lack, only a quieter channel.",
  fr: "Les plans d’expression répartissent les lettres du nom de naissance en quatre groupes, chacun additionné et réduit à part\u202f: quelle part du nom, et quel nombre, revient au corps, à l’esprit, aux sentiments et à l’intuition. Un plan sans lettre n’est pas un manque, seulement un canal plus discret.",
};

export const PLANE_TEXT: Record<PlaneId, Bi> = {
  physical: {
    en: "The physical plane holds the letters D, E, M and W: the body, the senses and practical action. Its number shows how you deal with the tangible world: work with your hands, health, getting things done.",
    fr: "Le plan physique contient les lettres D, E, M et W\u202f: le corps, les sens et l’action concrète. Son nombre montre votre rapport au monde tangible\u202f: le travail des mains, la santé, faire avancer les choses.",
  },
  mental: {
    en: "The mental plane holds A, G, H, J, L, N and P: thinking, logic and ideas. Its number shows how you use your mind: analysing, planning, learning.",
    fr: "Le plan mental contient A, G, H, J, L, N et P\u202f: la pensée, la logique et les idées. Son nombre montre comment vous employez votre esprit\u202f: analyser, planifier, apprendre.",
  },
  emotional: {
    en: "The emotional plane holds B, I, O, R, S, T, X and Z: feeling, imagination and creativity. Its number shows how you live your emotions and put them into what you do.",
    fr: "Le plan émotionnel contient B, I, O, R, S, T, X et Z\u202f: le sentiment, l’imagination et la créativité. Son nombre montre comment vous vivez vos émotions et les mettez dans ce que vous faites.",
  },
  intuitive: {
    en: "The intuitive plane holds C, F, K, Q, U, V and Y: insight, inspiration and a sense of what can’t be measured. Its number shows how you use your intuition.",
    fr: "Le plan intuitif contient C, F, K, Q, U, V et Y\u202f: la perspicacité, l’inspiration et le sens de ce qui ne se mesure pas. Son nombre montre comment vous vous servez de votre intuition.",
  },
};

// ------------------------------------------ Cornerstone, capstone, first vowel

export const STONE_TEXT: Record<StoneId, Bi> = {
  cornerstone: {
    en: "The cornerstone is the first letter of the first name: how you approach what comes, opportunities and obstacles alike.",
    fr: "La pierre angulaire est la première lettre du prénom\u202f: votre façon d’aborder ce qui vient, occasions comme obstacles.",
  },
  capstone: {
    en: "The capstone is the last letter of the first name: how you bring things to an end, finishing them and letting them go.",
    fr: "La pierre de faîte est la dernière lettre du prénom\u202f: votre façon de mener les choses à leur terme, de les finir et de les laisser partir.",
  },
  firstVowel: {
    en: "The first vowel of the first name is a glimpse of your inner self: how you react when no one is looking.",
    fr: "La première voyelle du prénom est un aperçu de votre moi intérieur\u202f: votre façon de réagir quand personne ne regarde.",
  },
};

/** What each letter brings in the places of the first name (cornerstone, capstone, first vowel). */
export const LETTER_TEXT: Record<LetterKey, Bi> = {
  A: { en: "Ambition and independence: quick to start, sure of its direction, sometimes headstrong.", fr: "L’ambition et l’indépendance\u202f: prompt à se lancer, sûr de sa direction, parfois entêté." },
  B: { en: "Sensitivity and warmth: attentive to others, generous, sometimes shy or easily hurt.", fr: "La sensibilité et la chaleur\u202f: attentif aux autres, généreux, parfois timide ou vite blessé." },
  C: { en: "Expression and ease: communicative, intuitive, creative, sometimes scattered.", fr: "L’expression et l’aisance\u202f: communicatif, intuitif, créatif, parfois dispersé." },
  D: { en: "Order and endurance: practical, hard-working, reliable, sometimes stubborn.", fr: "L’ordre et l’endurance\u202f: pratique, travailleur, fiable, parfois têtu." },
  E: { en: "Freedom and communication: curious, lively, sensual, sometimes restless.", fr: "La liberté et la communication\u202f: curieux, vif, sensuel, parfois agité." },
  F: { en: "Care and responsibility: warm, protective, family-minded, sometimes carrying too much.", fr: "Le soin et la responsabilité\u202f: chaleureux, protecteur, attaché à la famille, portant parfois trop." },
  G: { en: "Thought and inner life: inventive, searching, self-reliant, sometimes solitary.", fr: "La pensée et la vie intérieure\u202f: inventif, chercheur, autonome, parfois solitaire." },
  H: { en: "Drive and a sense for business: resourceful, at ease with money, sometimes too set on results.", fr: "L’élan et le sens des affaires\u202f: plein de ressources, à l’aise avec l’argent, parfois trop fixé sur les résultats." },
  I: { en: "Feeling and compassion: artistic, humane, sensitive, sometimes over-emotional.", fr: "Le sentiment et la compassion\u202f: artiste, humain, sensible, parfois trop émotif." },
  J: { en: "Fairness and aspiration: honest, inventive, aiming high, sometimes slow to act on it.", fr: "L’équité et l’aspiration\u202f: honnête, inventif, visant haut, parfois lent à passer à l’acte." },
  K: { en: "Intuition and ideals: inspired, strong-willed, demanding of itself, sometimes tense.", fr: "L’intuition et les idéaux\u202f: inspiré, volontaire, exigeant envers lui-même, parfois tendu." },
  L: { en: "Expression and goodwill: articulate, lively, well-meaning, sometimes hasty.", fr: "L’expression et la bienveillance\u202f: éloquent, vif, bien intentionné, parfois précipité." },
  M: { en: "Work and steadiness: diligent, home-loving, dependable, sometimes too serious.", fr: "Le travail et la constance\u202f: appliqué, attaché au foyer, fiable, parfois trop sérieux." },
  N: { en: "Imagination and movement: inventive, talkative, open to change, sometimes unsettled.", fr: "L’imagination et le mouvement\u202f: inventif, bavard, ouvert au changement, parfois instable." },
  O: { en: "Principles and devotion: responsible, patient, protective, sometimes rigid about what is right.", fr: "Les principes et le dévouement\u202f: responsable, patient, protecteur, parfois rigide sur ce qui est juste." },
  P: { en: "Knowledge and reserve: well-informed, thoughtful, private, sometimes aloof.", fr: "Le savoir et la réserve\u202f: bien informé, réfléchi, discret, parfois distant." },
  Q: { en: "Originality and strength: resourceful, independent, persuasive, sometimes unconventional to a fault.", fr: "L’originalité et la force\u202f: plein de ressources, indépendant, persuasif, parfois original à l’excès." },
  R: { en: "Tolerance and energy: broad-minded, generous, hard-working, sometimes quick-tempered.", fr: "La tolérance et l’énergie\u202f: ouvert d’esprit, généreux, travailleur, parfois prompt à s’emporter." },
  S: { en: "Charm and drive: warm, ambitious, emotional, sometimes changeable.", fr: "Le charme et l’élan\u202f: chaleureux, ambitieux, émotif, parfois changeant." },
  T: { en: "Energy and feeling: active, sensitive, cooperative, sometimes easily unsettled.", fr: "L’énergie et le sentiment\u202f: actif, sensible, coopératif, parfois vite déstabilisé." },
  U: { en: "Openness and good fortune: expressive, generous, sometimes hesitant when it is time to choose.", fr: "L’ouverture et la chance\u202f: expressif, généreux, parfois hésitant au moment de choisir." },
  V: { en: "Vision and building: practical, ambitious, able to carry large plans, sometimes unpredictable.", fr: "La vision et la construction\u202f: pratique, ambitieux, capable de porter de grands projets, parfois imprévisible." },
  W: { en: "Self-expression and freedom: dynamic, communicative, sometimes impulsive.", fr: "L’expression de soi et la liberté\u202f: dynamique, communicatif, parfois impulsif." },
  X: { en: "Sensuality and responsibility: artistic, caring, sometimes indulgent with itself.", fr: "La sensualité et la responsabilité\u202f: artiste, attentionné, parfois complaisant envers lui-même." },
  Y: { en: "Independence and depth: free-spirited, searching, sometimes undecided.", fr: "L’indépendance et la profondeur\u202f: esprit libre, chercheur, parfois indécis." },
  Z: { en: "Optimism and good judgement: practical, wise, sometimes obstinate.", fr: "L’optimisme et le bon jugement\u202f: pratique, sage, parfois obstiné." },
};

// ------------------------------------------------------------------ The letter Y

/** Why Decoz’s rule makes a Y a vowel or a consonant, with a name it happens in. */
export const Y_WHY: Record<YReason, Bi> = {
  alone: { en: "Alone, a Y is read as a vowel.", fr: "Seul, un Y se lit comme une voyelle." },
  firstBeforeConsonant: {
    en: "First in its name and before a consonant, it sounds as a vowel (as in Yvonne).",
    fr: "En tête de son nom et devant une consonne, il sonne comme une voyelle (comme dans Yvonne).",
  },
  firstBeforeVowel: {
    en: "First in its name and before a vowel, it sounds as a consonant (as in Yolanda).",
    fr: "En tête de son nom et devant une voyelle, il sonne comme une consonne (comme dans Yolanda).",
  },
  lastAfterConsonant: {
    en: "Last and after a consonant, it sounds as a vowel (as in Barry).",
    fr: "En fin de nom et après une consonne, il sonne comme une voyelle (comme dans Barry).",
  },
  lastAfterVowel: {
    en: "Last and after a vowel, it goes with that vowel as a consonant (as in Mickey).",
    fr: "En fin de nom et après une voyelle, il va avec elle, comme une consonne (comme dans Mickey).",
  },
  betweenConsonants: {
    en: "Between two consonants, it is the vowel of its syllable (as in Kyle).",
    fr: "Entre deux consonnes, c’est la voyelle de sa syllabe (comme dans Kyle).",
  },
  afterVowel: {
    en: "After a vowel, it goes with it as a consonant (as in Taylor).",
    fr: "Après une voyelle, il va avec elle, comme une consonne (comme dans Taylor).",
  },
  onlyVowel: {
    en: "Before a vowel, with no vowel earlier in the name, it is its syllable’s vowel (as in Ryan).",
    fr: "Devant une voyelle, sans voyelle avant lui dans le nom, c’est la voyelle de sa syllabe (comme dans Ryan).",
  },
  beforeVowel: {
    en: "Before a vowel, with a vowel earlier in the name, it sounds as a consonant (as in Tanya).",
    fr: "Devant une voyelle, avec une voyelle plus tôt dans le nom, il sonne comme une consonne (comme dans Tanya).",
  },
};

export const Y_RULE: Bi = {
  en: "This is Hans Decoz’s rule, by the Y’s place in the name. A name can sound otherwise: each Y can be switched under the wheel, and the numbers follow.",
  fr: "C’est la règle de Hans Decoz, selon la place du Y dans le nom. Un nom peut se prononcer autrement\u202f: chaque Y peut être changé sous la roue, et les nombres suivent.",
};

// -------------------------------------------------------------------- Bridges

export const BRIDGE_ABOUT: Bi = {
  en: "A bridge is the difference between two of your numbers: the quality that helps them work together. Life Path to Expression bridges the road and the talents; Soul Urge to Personality bridges what you want and what people see.",
  fr: "Un pont est l’écart entre deux de vos nombres\u202f: la qualité qui les aide à travailler ensemble. Du Chemin de vie à l’Expression, il relie la route et les talents\u202f; de l’Élan de l’âme à la Personnalité, ce que vous voulez et ce que les autres voient.",
};

export const BRIDGE_TEXT: Record<Gap, Bi> = {
  0: {
    en: "The two numbers agree: there is no gap to bridge. What helps: watching for too much of the same quality, and borrowing a little from your other numbers.",
    fr: "Les deux nombres s’accordent\u202f: aucun écart à franchir. Ce qui aide\u202f: vous méfier d’un excès de la même qualité, et emprunter un peu à vos autres nombres.",
  },
  1: {
    en: "A gap of 1 is bridged by initiative: deciding, starting, standing up for your view.",
    fr: "Un écart de 1 se franchit par l’initiative\u202f: décider, commencer, défendre votre point de vue.",
  },
  2: {
    en: "A gap of 2 is bridged by patience and cooperation: listening, working with others, care with details.",
    fr: "Un écart de 2 se franchit par la patience et la coopération\u202f: écouter, travailler avec les autres, soigner les détails.",
  },
  3: {
    en: "A gap of 3 is bridged by expression: saying what you feel, creating, lightening up.",
    fr: "Un écart de 3 se franchit par l’expression\u202f: dire ce que vous ressentez, créer, alléger.",
  },
  4: {
    en: "A gap of 4 is bridged by method: organisation, steady effort, practical steps.",
    fr: "Un écart de 4 se franchit par la méthode\u202f: l’organisation, l’effort régulier, les étapes concrètes.",
  },
  5: {
    en: "A gap of 5 is bridged by flexibility: openness to change, variety, letting go of fixed ideas.",
    fr: "Un écart de 5 se franchit par la souplesse\u202f: l’ouverture au changement, la variété, lâcher les idées arrêtées.",
  },
  6: {
    en: "A gap of 6 is bridged by care: responsibility, harmony, time for the people close to you.",
    fr: "Un écart de 6 se franchit par le soin\u202f: la responsabilité, l’harmonie, du temps pour vos proches.",
  },
  7: {
    en: "A gap of 7 is bridged by reflection: stepping back, studying, listening to your inner voice.",
    fr: "Un écart de 7 se franchit par la réflexion\u202f: prendre du recul, étudier, écouter votre voix intérieure.",
  },
  8: {
    en: "A gap of 8 is bridged by confident, practical power: managing money and effort, taking charge.",
    fr: "Un écart de 8 se franchit par un pouvoir concret et assuré\u202f: gérer l’argent et l’effort, prendre les choses en main.",
  },
};

// ------------------------------------------- Period cycles, pinnacles, challenges

/** What each kind of long cycle is (the calendar's change readings and the numerology page's). */
export const CYCLE_ABOUT: Record<"period" | "pinnacle" | "challenge", Bi> = {
  period: {
    en: "The three period cycles come from the birth month, day and year. The first is the ground you grow up on, the second the productive middle of life, the third its harvest. The first ends with the first personal year 1 from the 27th birthday on; the second lasts 27 years.",
    fr: "Les trois cycles de vie viennent du mois, du jour et de l’année de naissance. Le premier est le terrain sur lequel on grandit, le deuxième le cœur productif de la vie, le troisième sa moisson. Le premier finit avec la première année personnelle 1 à partir du 27e anniversaire\u202f; le deuxième dure 27 ans.",
  },
  pinnacle: {
    en: "The four pinnacles are the stages of a life: each brings a theme to grow into and a kind of success within reach. The first lasts until 36 minus the Life Path, the next two nine years each, the last for the rest of life.",
    fr: "Les quatre réalisations sont les étapes d’une vie\u202f: chacune apporte un thème à vivre et une forme de réussite à portée de main. La première dure jusqu’à 36 moins le Chemin de vie, les deux suivantes neuf ans chacune, la dernière le reste de la vie.",
  },
  challenge: {
    en: "The four challenges run with the pinnacles: each is a difficulty to meet and turn into a strength. The third, the main challenge, is felt all life long; a 0 asks you to choose your own.",
    fr: "Les quatre défis accompagnent les réalisations\u202f: chacun est une difficulté à affronter et à changer en force. Le troisième, le défi principal, se fait sentir toute la vie\u202f; un 0 vous demande de choisir le vôtre.",
  },
};

/** What each of the three period cycles is, by its place in life. */
export const PERIOD_PLACE_TEXT: Record<1 | 2 | 3, Bi> = {
  1: {
    en: "The first period cycle, from birth to your late twenties or early thirties, is the ground you grow up on: family, school and the influences that shape you before you choose for yourself.",
    fr: "Le premier cycle de vie, de la naissance à la fin de la vingtaine ou au début de la trentaine, est le terrain sur lequel vous grandissez\u202f: la famille, l’école et les influences qui vous façonnent avant que vous choisissiez vous-même.",
  },
  2: {
    en: "The second period cycle, the 27 years after it, is the productive middle of life: work, creativity and the place you make for yourself.",
    fr: "Le deuxième cycle de vie, les 27 années qui suivent, est le cœur productif de la vie\u202f: le travail, la création et la place que vous vous faites.",
  },
  3: {
    en: "The third period cycle, from your mid-fifties or early sixties on, is the harvest: the inner life, what matters in the later years, what you pass on.",
    fr: "Le troisième cycle de vie, à partir du milieu de la cinquantaine ou du début de la soixantaine, est la moisson\u202f: la vie intérieure, ce qui compte dans les dernières années, ce que vous transmettez.",
  },
};

export const PERIOD_TEXT: Record<CycleNumberKey, Bi> = {
  1: {
    en: "A 1 period asks for independence: circumstances push you to stand on your own, decide for yourself and find your own way of doing things.",
    fr: "Un cycle 1 demande de l’indépendance\u202f: les circonstances vous poussent à tenir debout seul, à décider par vous-même et à trouver votre propre manière de faire.",
  },
  2: {
    en: "A 2 period is a time of cooperation and sensitivity: relationships, partnerships and patience are its themes, and progress comes through others.",
    fr: "Un cycle 2 est un temps de coopération et de sensibilité\u202f: les relations, les associations et la patience en sont les thèmes, et les progrès passent par les autres.",
  },
  3: {
    en: "A 3 period favours expression and social life: creativity, friends, communication and the pleasure of sharing what you make.",
    fr: "Un cycle 3 favorise l’expression et la vie sociale\u202f: la création, les amis, la communication et le plaisir de partager ce que vous faites.",
  },
  4: {
    en: "A 4 period is a time of work and foundations: routine, effort and practical responsibilities that build something solid.",
    fr: "Un cycle 4 est un temps de travail et de fondations\u202f: la routine, l’effort et des responsabilités concrètes qui construisent quelque chose de solide.",
  },
  5: {
    en: "A 5 period brings change and movement: variety, travel, new people and the need to adapt.",
    fr: "Un cycle 5 apporte changement et mouvement\u202f: la variété, les voyages, de nouvelles rencontres et le besoin de vous adapter.",
  },
  6: {
    en: "A 6 period centres on responsibility and care: home, family, commitments and service to those around you.",
    fr: "Un cycle 6 se centre sur la responsabilité et le soin\u202f: le foyer, la famille, les engagements et le service rendu à votre entourage.",
  },
  7: {
    en: "A 7 period turns you inward: study, reflection, specialising, and time to understand yourself.",
    fr: "Un cycle 7 vous tourne vers l’intérieur\u202f: l’étude, la réflexion, la spécialisation, et du temps pour vous comprendre.",
  },
  8: {
    en: "An 8 period is a time of ambition and material achievement: career, money, authority and the responsibility that comes with them.",
    fr: "Un cycle 8 est un temps d’ambition et de réalisation matérielle\u202f: la carrière, l’argent, l’autorité et la responsabilité qui les accompagne.",
  },
  9: {
    en: "A 9 period opens you to the wider world: generosity, broad interests, service, and letting go of what is finished.",
    fr: "Un cycle 9 vous ouvre au monde\u202f: la générosité, des intérêts larges, le service, et laisser partir ce qui est achevé.",
  },
  11: {
    en: "An 11 period sharpens intuition and idealism: inspiration comes more easily, and so does nervous tension; calm routines help.",
    fr: "Un cycle 11 aiguise l’intuition et l’idéalisme\u202f: l’inspiration vient plus facilement, la tension nerveuse aussi\u202f; des routines calmes aident.",
  },
  22: {
    en: "A 22 period gives room to build on a large scale: practical vision, organisation, work that can outlast you.",
    fr: "Un cycle 22 donne de la place pour bâtir à grande échelle\u202f: une vision concrète, l’organisation, un travail qui peut vous survivre.",
  },
  33: {
    en: "A 33 period is a time of care on a larger scale: teaching, guiding and supporting others, with clear limits so it can last.",
    fr: "Un cycle 33 est un temps de soin à plus grande échelle\u202f: enseigner, guider et soutenir les autres, avec des limites claires pour que cela dure.",
  },
};

export const PINNACLE_TEXT: Record<CycleNumberKey, Bi> = {
  1: {
    en: "A 1 pinnacle is a stage of independence and initiative: you are asked to lead, to start things and to rely on yourself. Confidence grows by acting.",
    fr: "Une réalisation 1 est une étape d’indépendance et d’initiative\u202f: on vous demande de mener, de lancer, de compter sur vous-même. La confiance grandit en agissant.",
  },
  2: {
    en: "A 2 pinnacle is a stage of cooperation: partnerships, patience, diplomacy and care with detail bring the results. Success comes with others rather than alone.",
    fr: "Une réalisation 2 est une étape de coopération\u202f: les associations, la patience, la diplomatie et le soin du détail apportent les résultats. La réussite vient avec les autres plutôt que seul.",
  },
  3: {
    en: "A 3 pinnacle is a stage of self-expression: creativity, communication and a lively social life are within reach. What you share can open doors.",
    fr: "Une réalisation 3 est une étape d’expression de soi\u202f: la créativité, la communication et une vie sociale animée sont à portée de main. Ce que vous partagez peut ouvrir des portes.",
  },
  4: {
    en: "A 4 pinnacle is a stage of hard work and foundations: effort, method and discipline build something lasting. Results come step by step.",
    fr: "Une réalisation 4 est une étape de travail et de fondations\u202f: l’effort, la méthode et la discipline construisent quelque chose de durable. Les résultats viennent pas à pas.",
  },
  5: {
    en: "A 5 pinnacle is a stage of change and freedom: travel, new directions and variety are likely. Adaptability is the key, with a few commitments as an anchor.",
    fr: "Une réalisation 5 est une étape de changement et de liberté\u202f: les voyages, de nouvelles directions et la variété sont probables. La souplesse est la clé, avec quelques engagements comme ancre.",
  },
  6: {
    en: "A 6 pinnacle is a stage of responsibility: home, family, community and service ask for your care. The reward is the love and trust you build.",
    fr: "Une réalisation 6 est une étape de responsabilité\u202f: le foyer, la famille, la communauté et le service demandent votre attention. La récompense est l’amour et la confiance que vous bâtissez.",
  },
  7: {
    en: "A 7 pinnacle is a stage of study and inner growth: specialising, reflecting, understanding yourself. Solitude can be fertile rather than lonely.",
    fr: "Une réalisation 7 est une étape d’étude et de croissance intérieure\u202f: vous spécialiser, réfléchir, vous comprendre. La solitude peut y être féconde plutôt que pesante.",
  },
  8: {
    en: "An 8 pinnacle is a stage of achievement and authority: career, finances and recognition are within reach through effort and good judgement.",
    fr: "Une réalisation 8 est une étape de réussite et d’autorité\u202f: la carrière, les finances et la reconnaissance sont à portée par l’effort et le bon jugement.",
  },
  9: {
    en: "A 9 pinnacle is a stage of completion and generosity: broad interests, service to others, and letting go of what has run its course.",
    fr: "Une réalisation 9 est une étape d’achèvement et de générosité\u202f: des intérêts larges, le service aux autres, et laisser partir ce qui a fait son temps.",
  },
  11: {
    en: "An 11 pinnacle is a stage of inspiration and visibility: intuition, ideals, perhaps a public role. It can be intense; grounding habits keep it usable.",
    fr: "Une réalisation 11 est une étape d’inspiration et de visibilité\u202f: l’intuition, les idéaux, peut-être un rôle public. Elle peut être intense\u202f; des habitudes qui ancrent la gardent utilisable.",
  },
  22: {
    en: "A 22 pinnacle is a stage of building on a large scale: turning a practical vision into something that serves many. Method matters as much as ambition.",
    fr: "Une réalisation 22 est une étape de construction à grande échelle\u202f: faire d’une vision concrète quelque chose qui sert beaucoup de monde. La méthode compte autant que l’ambition.",
  },
  33: {
    en: "A 33 pinnacle is a stage of care on a larger scale: teaching, healing or guiding others. Looking after yourself is part of the work.",
    fr: "Une réalisation 33 est une étape de soin à plus grande échelle\u202f: enseigner, soigner ou guider les autres. Prendre soin de vous fait partie du travail.",
  },
};

export const CHALLENGE_TEXT: Record<Gap, Bi> = {
  0: {
    en: "A 0 challenge is the challenge of choice: no single difficulty stands out, so you meet a little of each, or you choose your own. Knowing what you value makes the choice easier.",
    fr: "Un défi 0 est le défi du choix\u202f: aucune difficulté ne domine, alors vous rencontrez un peu de chacune, ou vous choisissez la vôtre. Savoir ce qui compte pour vous rend le choix plus facile.",
  },
  1: {
    en: "A 1 challenge is about asserting yourself: standing up for yourself without dominating, and not letting others decide for you.",
    fr: "Un défi 1 porte sur l’affirmation de soi\u202f: vous défendre sans dominer, et ne pas laisser les autres décider pour vous.",
  },
  2: {
    en: "A 2 challenge is about sensitivity: not taking everything personally, and not avoiding conflict at any price.",
    fr: "Un défi 2 porte sur la sensibilité\u202f: ne pas tout prendre pour vous, et ne pas éviter le conflit à tout prix.",
  },
  3: {
    en: "A 3 challenge is about expression: sharing what you feel without scattering it, and trusting that your voice is worth hearing.",
    fr: "Un défi 3 porte sur l’expression\u202f: partager ce que vous ressentez sans vous disperser, et croire que votre voix mérite d’être entendue.",
  },
  4: {
    en: "A 4 challenge is about work and limits: accepting routine and effort without going rigid, and organising without being weighed down.",
    fr: "Un défi 4 porte sur le travail et les limites\u202f: accepter la routine et l’effort sans vous raidir, et vous organiser sans vous laisser écraser.",
  },
  5: {
    en: "A 5 challenge is about freedom: living change and the appetite for experience without scattering yourself or running from commitments.",
    fr: "Un défi 5 porte sur la liberté\u202f: vivre le changement et l’appétit d’expériences sans vous disperser ni fuir vos engagements.",
  },
  6: {
    en: "A 6 challenge is about responsibility: caring without controlling, and accepting that people, you included, don’t have to be perfect.",
    fr: "Un défi 6 porte sur la responsabilité\u202f: prendre soin sans contrôler, et accepter que les gens, vous compris, n’ont pas à être parfaits.",
  },
  7: {
    en: "A 7 challenge is about trust: not withdrawing behind reserve or doubt, and letting people, and faith, in.",
    fr: "Un défi 7 porte sur la confiance\u202f: ne pas vous retrancher derrière la réserve ou le doute, et laisser entrer les autres, et la foi.",
  },
  8: {
    en: "An 8 challenge is about money and power: neither chasing them at all costs nor shying away from them, and using authority fairly.",
    fr: "Un défi 8 porte sur l’argent et le pouvoir\u202f: ni les poursuivre à tout prix, ni les fuir, et exercer l’autorité avec équité.",
  },
};

// ------------------------------------------------ Essence and the letter cycles

export const ESSENCE_ABOUT: Bi = {
  en: "The essence adds the values of the three letters in effect in a year, one from each letter cycle, and reduces the total: the year’s underlying theme from the name, beside the Personal Year from the date. Decoz calls the letter cycles transits; Ulune calls them letter cycles so they are never mistaken for the planets’ transits.",
  fr: "L’essence additionne les valeurs des trois lettres en cours une année donnée, une par cycle de lettres, et réduit le total\u202f: le thème de fond de l’année venu du nom, à côté de l’Année personnelle venue de la date. Decoz appelle les cycles de lettres des transits\u202f; Ulune les nomme cycles de lettres pour qu’on ne les confonde jamais avec les transits des planètes.",
};

export const ESSENCE_TEXT: Record<EssenceKey, Bi> = {
  1: {
    en: "A 1 essence makes the year about you: independence, new starts, taking the reins of your own life.",
    fr: "Une essence 1 fait de l’année une affaire personnelle\u202f: l’indépendance, les nouveaux départs, prendre les rênes de votre vie.",
  },
  2: {
    en: "A 2 essence makes it a year of relationships: sensitivity, cooperation, patience and the people close to you.",
    fr: "Une essence 2 en fait une année de relations\u202f: la sensibilité, la coopération, la patience et vos proches.",
  },
  3: {
    en: "A 3 essence brings a year of expression: creativity, friends, communication and lightness.",
    fr: "Une essence 3 apporte une année d’expression\u202f: la créativité, les amis, la communication et la légèreté.",
  },
  4: {
    en: "A 4 essence brings a year of work and order: effort, routine, practical matters and building step by step.",
    fr: "Une essence 4 apporte une année de travail et d’ordre\u202f: l’effort, la routine, les questions pratiques et la construction pas à pas.",
  },
  5: {
    en: "A 5 essence brings a year of change: movement, travel, new people, freedom, and the need to adapt.",
    fr: "Une essence 5 apporte une année de changement\u202f: le mouvement, les voyages, de nouvelles rencontres, la liberté, et le besoin de vous adapter.",
  },
  6: {
    en: "A 6 essence brings a year of responsibility and care: home, family, love and commitments.",
    fr: "Une essence 6 apporte une année de responsabilité et de soin\u202f: le foyer, la famille, l’amour et les engagements.",
  },
  7: {
    en: "A 7 essence brings a year of reflection: study, solitude, inner questions and understanding.",
    fr: "Une essence 7 apporte une année de réflexion\u202f: l’étude, la solitude, les questions intérieures et la compréhension.",
  },
  8: {
    en: "An 8 essence brings a year of achievement: career, money, authority and results.",
    fr: "Une essence 8 apporte une année de réalisation\u202f: la carrière, l’argent, l’autorité et les résultats.",
  },
  9: {
    en: "A 9 essence brings a year of completion: letting go, generosity, a wider view, and endings that make room.",
    fr: "Une essence 9 apporte une année d’achèvement\u202f: laisser partir, la générosité, un regard plus large, et des fins qui font de la place.",
  },
  11: {
    en: "An 11 essence brings a year of sharpened intuition and ideals, with nervous energy to handle gently.",
    fr: "Une essence 11 apporte une année d’intuition et d’idéaux aiguisés, avec une tension nerveuse à ménager.",
  },
  22: {
    en: "A 22 essence brings a year for large, practical plans: building something that can last.",
    fr: "Une essence 22 apporte une année propice aux grands projets concrets\u202f: bâtir quelque chose qui peut durer.",
  },
};

/** The three letter cycles, by the part of the name each walks through. */
export const LETTER_CYCLE_ABOUT: Record<"physical" | "mental" | "spiritual", Bi> = {
  physical: {
    en: "The physical letter cycle walks through the first name, one letter after another, each for as many years as its value: the outer, everyday side of the years.",
    fr: "Le cycle de lettres physique parcourt le prénom, une lettre après l’autre, chacune pendant autant d’années que sa valeur\u202f: le côté extérieur et quotidien des années.",
  },
  mental: {
    en: "The mental letter cycle walks through the middle names (or the last name when there is none): the side of the years that concerns your thinking and your plans.",
    fr: "Le cycle de lettres mental parcourt les deuxièmes prénoms (ou le nom de famille quand il n’y en a pas)\u202f: le côté des années qui touche votre pensée et vos projets.",
  },
  spiritual: {
    en: "The spiritual letter cycle walks through the last name: the inner side of the years, what they ask of you deep down.",
    fr: "Le cycle de lettres spirituel parcourt le nom de famille\u202f: le côté intérieur des années, ce qu’elles vous demandent au fond.",
  },
};

/** The theme of a letter’s years in a letter cycle. */
export const LETTER_CYCLE_TEXT: Record<LetterKey, Bi> = {
  A: { en: "A fresh start: a time to take the initiative and act on your own.", fr: "Un nouveau départ\u202f: un temps pour prendre l’initiative et agir par vous-même." },
  B: { en: "A time of emotional sensitivity and relationships: patience and closeness count.", fr: "Un temps de sensibilité et de relations\u202f: la patience et la proximité comptent." },
  C: { en: "A time of expression and social life: creativity flows, and so can scattered energy.", fr: "Un temps d’expression et de vie sociale\u202f: la créativité coule, la dispersion aussi." },
  D: { en: "A time of work and structure: the effort made now builds something lasting.", fr: "Un temps de travail et de structure\u202f: l’effort fourni maintenant construit quelque chose de durable." },
  E: { en: "A time of change and movement: travel, new people, more freedom.", fr: "Un temps de changement et de mouvement\u202f: des voyages, de nouvelles rencontres, plus de liberté." },
  F: { en: "A time of responsibility: home, family and commitments ask for your care.", fr: "Un temps de responsabilité\u202f: le foyer, la famille et les engagements demandent votre attention." },
  G: { en: "A time of study and reflection: understanding grows, sometimes in solitude.", fr: "Un temps d’étude et de réflexion\u202f: la compréhension grandit, parfois dans la solitude." },
  H: { en: "A time of ambition and material matters: career, money, achievement.", fr: "Un temps d’ambition et de questions matérielles\u202f: la carrière, l’argent, la réussite." },
  I: { en: "A time of strong feelings and completion: compassion, and letting go.", fr: "Un temps d’émotions fortes et d’achèvement\u202f: la compassion, et le lâcher-prise." },
  J: { en: "A new beginning, led by a sense of what is fair and what you aim for.", fr: "Un nouveau commencement, guidé par le sens de ce qui est juste et de ce que vous visez." },
  K: { en: "Sharpened intuition and ideals, with some nervous tension: trust your insight, calmly.", fr: "Une intuition et des idéaux aiguisés, avec un peu de tension nerveuse\u202f: suivez vos intuitions, calmement." },
  L: { en: "An active, sociable time: ideas, words and travel come readily.", fr: "Un temps actif et sociable\u202f: les idées, les mots et les déplacements viennent facilement." },
  M: { en: "A time of steady work and practical duties: patience pays.", fr: "Un temps de travail régulier et de devoirs concrets\u202f: la patience paie." },
  N: { en: "A time of change and restlessness: new ideas and new places call.", fr: "Un temps de changement et d’agitation\u202f: de nouvelles idées et de nouveaux lieux appellent." },
  O: { en: "A time of responsibility and commitment, often at home: your principles are tested.", fr: "Un temps de responsabilité et d’engagement, souvent au foyer\u202f: vos principes sont mis à l’épreuve." },
  P: { en: "A time of study, reflection and privacy: knowledge deepens.", fr: "Un temps d’étude, de réflexion et de discrétion\u202f: le savoir s’approfondit." },
  Q: { en: "A time of unusual openings in work and money, calling for good judgement.", fr: "Un temps d’occasions inhabituelles dans le travail et l’argent, qui demande du discernement." },
  R: { en: "A time of intense feelings and broad changes: tolerance helps.", fr: "Un temps d’émotions intenses et de grands changements\u202f: la tolérance aide." },
  S: { en: "A time of sudden change and fresh starts, often strongly felt.", fr: "Un temps de changements soudains et de nouveaux départs, souvent vécus intensément." },
  T: { en: "A time of sensitivity and partnership: cooperation carries you.", fr: "Un temps de sensibilité et d’association\u202f: la coopération vous porte." },
  U: { en: "A creative, expressive time, with choices that may be hard to make.", fr: "Un temps créatif et expressif, avec des choix parfois difficiles à faire." },
  V: { en: "A time for building with vision: practical work toward a larger goal.", fr: "Un temps pour bâtir avec vision\u202f: un travail concret vers un but plus grand." },
  W: { en: "A time of change, travel and self-expression.", fr: "Un temps de changement, de voyages et d’expression de soi." },
  X: { en: "A time of responsibility and strong emotions, often around home and love.", fr: "Un temps de responsabilité et d’émotions fortes, souvent autour du foyer et de l’amour." },
  Y: { en: "A time of searching and independence: inner questions come forward.", fr: "Un temps de recherche et d’indépendance\u202f: les questions intérieures passent au premier plan." },
  Z: { en: "A time of practical achievement and good judgement.", fr: "Un temps de réalisation concrète et de bon jugement." },
};

// ------------------------------------------------------------------- Chaldean

export const CHALDEAN_ABOUT: Bi = {
  en: "Chaldean numerology, in the form Cheiro published in 1926, gives the letters other values (1 to 8; 9 is never given to a letter) and reads a name’s total as a compound number before reducing it. It stands beside the Pythagorean numbers here, labelled, and never mixes with them. The planets are Cheiro’s own associations: they stay in this reading and never change a number or reach into the birth chart.",
  fr: "La numérologie chaldéenne, sous la forme que Cheiro a publiée en 1926, donne d’autres valeurs aux lettres (de 1 à 8\u202f; le 9 n’est jamais donné à une lettre) et lit le total d’un nom comme un nombre composé avant de le réduire. Elle se tient ici à côté des nombres pythagoriciens, étiquetée, sans jamais s’y mêler. Les planètes sont les correspondances propres à Cheiro\u202f: elles restent dans cette lecture, ne changent aucun nombre et n’entrent pas dans le thème natal.",
};

export const CHALDEAN_TEXT: Record<Digit, Bi> = {
  1: {
    en: "In Cheiro’s system, 1 belongs to the Sun: individuality, creative drive, the wish to stand out and to lead.",
    fr: "Dans le système de Cheiro, le 1 appartient au Soleil\u202f: l’individualité, l’élan créateur, le désir de vous distinguer et de mener.",
  },
  2: {
    en: "In Cheiro’s system, 2 belongs to the Moon: imagination, gentleness and feeling; its changeability can make decisions harder.",
    fr: "Dans le système de Cheiro, le 2 appartient à la Lune\u202f: l’imagination, la douceur et le sentiment\u202f; sa variabilité peut rendre les décisions plus difficiles.",
  },
  3: {
    en: "In Cheiro’s system, 3 belongs to Jupiter: ambition, growth, discipline and a taste for responsibility.",
    fr: "Dans le système de Cheiro, le 3 appartient à Jupiter\u202f: l’ambition, la croissance, la discipline et le goût des responsabilités.",
  },
  4: {
    en: "In Cheiro’s system, 4 belongs to Uranus: an independent, unconventional mind, quick to question rules and to reform them.",
    fr: "Dans le système de Cheiro, le 4 appartient à Uranus\u202f: un esprit indépendant et peu conventionnel, prompt à remettre les règles en cause et à les réformer.",
  },
  5: {
    en: "In Cheiro’s system, 5 belongs to Mercury: a quick, versatile mind, and a gift for trade, travel and communication.",
    fr: "Dans le système de Cheiro, le 5 appartient à Mercure\u202f: un esprit vif et polyvalent, et un don pour le commerce, les voyages et la communication.",
  },
  6: {
    en: "In Cheiro’s system, 6 belongs to Venus: love, beauty, harmony and a warm home; a charm people feel.",
    fr: "Dans le système de Cheiro, le 6 appartient à Vénus\u202f: l’amour, la beauté, l’harmonie et un foyer chaleureux\u202f; un charme que les gens ressentent.",
  },
  7: {
    en: "In Cheiro’s system, 7 belongs to Neptune: imagination, dreams, independence of thought and an interest in the mysterious.",
    fr: "Dans le système de Cheiro, le 7 appartient à Neptune\u202f: l’imagination, les rêves, l’indépendance d’esprit et un intérêt pour le mystère.",
  },
  8: {
    en: "In Cheiro’s system, 8 belongs to Saturn: patience, endurance and responsibility. Cheiro thought it a heavy number; read today, it rewards perseverance.",
    fr: "Dans le système de Cheiro, le 8 appartient à Saturne\u202f: la patience, l’endurance et la responsabilité. Cheiro y voyait un nombre lourd\u202f; lu aujourd’hui, il récompense la persévérance.",
  },
  9: {
    en: "In Cheiro’s system, 9 belongs to Mars: energy, courage and determination; its fire wants an aim worthy of it.",
    fr: "Dans le système de Cheiro, le 9 appartient à Mars\u202f: l’énergie, le courage et la détermination\u202f; son feu demande un but à sa mesure.",
  },
};
