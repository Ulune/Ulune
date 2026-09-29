import type { NumberKey } from "./numerology";
import type { Bi } from "./types";

/**
 * Numerology, part 63 of the launch plan: a text for each number in each core
 * place, so a Life Path 7 and an Expression 7 read differently. Written for
 * Ulune in English and French side by side (one language per reading pack,
 * scripts/content-packs-plugin.mjs). They speak to the reader, concretely and
 * kindly: what the number asks of that place, and what helps.
 */

export type NumerologyPlace = "lifepath" | "expression" | "soulurge" | "personality" | "maturity" | "birthday";

type Places = Record<Exclude<NumerologyPlace, "birthday">, Record<NumberKey, Bi>> & {
  /** The day of the month keeps 11 and 22 only: no 33. */
  birthday: Record<Exclude<NumberKey, 33>, Bi>;
};

export const PLACE_TEXT: Places = {
  lifepath: {
    1: {
      en: "A Life Path 1 is a road of learning to stand on your own feet: to decide, to start, to trust your judgement before the room agrees. Life tends to hand you situations where no one else will go first. The lesson runs both ways: independence grows best alongside people, not against them.",
      fr: "Un Chemin de vie 1 est une route où vous apprenez à tenir sur vos propres jambes\u202f: décider, commencer, faire confiance à votre jugement avant que tout le monde soit d’accord. La vie vous place souvent là où personne d’autre ne part en premier. La leçon va dans les deux sens\u202f: l’indépendance grandit mieux avec les autres que contre eux.",
    },
    2: {
      en: "A Life Path 2 is a road of learning through relationships: listening, cooperating, bringing people and ideas together. Your progress often comes through partnerships and patient work behind the scenes rather than solo leaps. The growing edge is to value your own view as much as you value harmony.",
      fr: "Un Chemin de vie 2 est une route où vous apprenez par les relations\u202f: écouter, coopérer, rapprocher les gens et les idées. Vos progrès viennent souvent d’associations et d’un travail patient en coulisses plutôt que d’élans en solitaire. Le point où grandir\u202f: donner à votre propre avis autant de valeur qu’à l’harmonie.",
    },
    3: {
      en: "A Life Path 3 is a road of expression: finding your voice in words, art, humour or conversation, and letting it be heard. Life often opens up when you share what you see and feel, and stalls when you scatter it. The growing edge is to finish, not only to start, what you create.",
      fr: "Un Chemin de vie 3 est une route d’expression\u202f: trouver votre voix, par les mots, l’art, l’humour ou la conversation, et la faire entendre. La vie s’ouvre souvent quand vous partagez ce que vous voyez et ressentez, et piétine quand vous vous dispersez. Le point où grandir\u202f: terminer, et pas seulement commencer, ce que vous créez.",
    },
    4: {
      en: "A Life Path 4 is a road of building: steady work, method, foundations that last. Life tends to reward patience and practical effort more than shortcuts, and it may test you with limits to work within. The growing edge is to keep some room for play and change inside the structure.",
      fr: "Un Chemin de vie 4 est une route de construction\u202f: un travail régulier, de la méthode, des fondations qui durent. La vie récompense plutôt la patience et l’effort concret que les raccourcis, et vous met parfois à l’épreuve avec des limites à respecter. Le point où grandir\u202f: garder de la place pour le jeu et le changement à l’intérieur du cadre.",
    },
    5: {
      en: "A Life Path 5 is a road of experience: change, movement, people, places and ideas, tried first-hand. Life tends to bring variety and the unexpected, and you learn by adapting. The growing edge is freedom with a direction: choosing commitments that let you move rather than running from all of them.",
      fr: "Un Chemin de vie 5 est une route d’expérience\u202f: changements, mouvement, gens, lieux et idées, vécus de première main. La vie apporte souvent de la variété et de l’imprévu, et vous apprenez en vous adaptant. Le point où grandir\u202f: une liberté qui a une direction, choisir les engagements qui vous laissent bouger plutôt que les fuir tous.",
    },
    6: {
      en: "A Life Path 6 is a road of responsibility and care: home, family, community and the people who count on you. Life often asks you to help, to mend and to make things fair. The growing edge is to give without controlling, and to count yourself among those you look after.",
      fr: "Un Chemin de vie 6 est une route de responsabilité et de soin\u202f: le foyer, la famille, la communauté et ceux qui comptent sur vous. La vie vous demande souvent d’aider, de réparer, de rendre les choses justes. Le point où grandir\u202f: donner sans contrôler, et vous compter parmi ceux dont vous prenez soin.",
    },
    7: {
      en: "A Life Path 7 is a road of understanding: study, observation and time alone to think things through. Life tends to push you past easy answers toward what is true for you. The growing edge is to share what you find, and to trust a few people enough to let them in.",
      fr: "Un Chemin de vie 7 est une route de compréhension\u202f: l’étude, l’observation et du temps seul pour réfléchir. La vie vous pousse au-delà des réponses faciles, vers ce qui est vrai pour vous. Le point où grandir\u202f: partager ce que vous trouvez, et faire assez confiance à quelques personnes pour les laisser entrer.",
    },
    8: {
      en: "A Life Path 8 is a road of achievement: work, money, authority and the practical power to get things done. Life often puts you in charge, or where resources must be managed well. The growing edge is to use power fairly, and to measure success by more than results.",
      fr: "Un Chemin de vie 8 est une route de réalisation\u202f: le travail, l’argent, l’autorité et le pouvoir concret de faire avancer les choses. La vie vous place souvent aux commandes, ou là où il faut bien gérer des ressources. Le point où grandir\u202f: exercer le pouvoir avec équité, et mesurer la réussite à autre chose qu’aux résultats.",
    },
    9: {
      en: "A Life Path 9 is a road of wide horizons: compassion, generosity and concern for more than your own circle. Life often asks you to let go of what is finished and to give without keeping score. The growing edge is to look after your own needs while you look after the world’s.",
      fr: "Un Chemin de vie 9 est une route aux horizons larges\u202f: la compassion, la générosité, le souci de plus que votre propre cercle. La vie vous demande souvent de laisser partir ce qui est achevé et de donner sans compter. Le point où grandir\u202f: prendre soin de vos besoins tout en prenant soin de ceux du monde.",
    },
    11: {
      en: "A Life Path 11 is the master form of the 2: a road of inspiration and intuition, where you may sense things before you can explain them and want to pass them on. It carries more nervous energy than the 2, and it is often lived first as a 2, through patience and cooperation. The growing edge is to trust your insight and keep your feet on the ground.",
      fr: "Un Chemin de vie 11 est la forme maîtresse du 2\u202f: une route d’inspiration et d’intuition, où vous sentez parfois les choses avant de pouvoir les expliquer, avec l’envie de les transmettre. Il porte plus de tension nerveuse que le 2, et se vit souvent d’abord comme un 2, par la patience et la coopération. Le point où grandir\u202f: faire confiance à vos intuitions en gardant les pieds sur terre.",
    },
    22: {
      en: "A Life Path 22 is the master form of the 4: a road of building on a large scale, turning a vision into something practical that serves many people. It asks for the 4’s method and patience with bigger stakes, and it is often lived first as a 4. The growing edge is to aim high without being crushed by the size of the aim.",
      fr: "Un Chemin de vie 22 est la forme maîtresse du 4\u202f: une route de construction à grande échelle, où une vision devient quelque chose de concret au service de beaucoup. Il demande la méthode et la patience du 4 avec des enjeux plus grands, et se vit souvent d’abord comme un 4. Le point où grandir\u202f: viser haut sans vous laisser écraser par la taille du but.",
    },
    33: {
      en: "A Life Path 33 is the master form of the 6: a road of care on a larger scale, teaching and easing others by example. It is rare, and it is usually lived first as a 6, through responsibility for those close to you. The growing edge is to care deeply while keeping clear limits, so the giving can last.",
      fr: "Un Chemin de vie 33 est la forme maîtresse du 6\u202f: une route de soin à plus grande échelle, où vous enseignez et apaisez par l’exemple. Il est rare, et se vit en général d’abord comme un 6, par la responsabilité envers les proches. Le point où grandir\u202f: prendre soin profondément tout en gardant des limites nettes, pour que le don puisse durer.",
    },
  },
  expression: {
    1: {
      en: "An Expression 1 gives you the ability to lead and to originate: to work out your own method and get things moving. You tend to do your best work when you have room to decide. What helps: letting others in on the plan early.",
      fr: "Une Expression 1 vous donne la capacité de mener et d’innover\u202f: trouver votre propre méthode et mettre les choses en route. Vous donnez souvent le meilleur de vous-même quand vous avez la liberté de décider. Ce qui aide\u202f: associer les autres au projet dès le début.",
    },
    2: {
      en: "An Expression 2 gives you the talents of a partner and a go-between: tact, attention to detail, a sense of what people need. You often work best in a team, making the whole run smoothly. What helps: naming your own contribution rather than letting it go unseen.",
      fr: "Une Expression 2 vous donne les talents d’un partenaire et d’un médiateur\u202f: le tact, le sens du détail, une perception de ce dont les gens ont besoin. Vous travaillez souvent mieux en équipe, en faisant tourner l’ensemble sans heurts. Ce qui aide\u202f: dire ce que vous apportez plutôt que de le laisser passer inaperçu.",
    },
    3: {
      en: "An Expression 3 gives you a gift for words, images and ideas: writing, speaking, performing, anything that communicates. Your work tends to shine when it is shared with an audience. What helps: a little structure, so your ideas reach the finish line.",
      fr: "Une Expression 3 vous donne un don pour les mots, les images et les idées\u202f: écrire, parler, jouer, tout ce qui communique. Votre travail brille souvent quand il est partagé avec un public. Ce qui aide\u202f: un peu de structure, pour que vos idées aillent jusqu’au bout.",
    },
    4: {
      en: "An Expression 4 gives you the abilities of an organiser and a builder: method, reliability, a feel for systems and practical detail. People tend to trust your work because it holds. What helps: leaving some slack in the plan for the unexpected.",
      fr: "Une Expression 4 vous donne les capacités d’un organisateur et d’un bâtisseur\u202f: la méthode, la fiabilité, le sens des systèmes et du détail concret. On fait souvent confiance à votre travail parce qu’il tient. Ce qui aide\u202f: laisser du jeu dans le plan pour l’imprévu.",
    },
    5: {
      en: "An Expression 5 gives you versatility: quick learning, ease with people, a talent for selling, travelling, adapting and trying the new. You tend to do well where no two days look alike. What helps: carrying a few things through before starting the next.",
      fr: "Une Expression 5 vous donne la polyvalence\u202f: apprendre vite, aller facilement vers les gens, un talent pour vendre, voyager, vous adapter et essayer du neuf. Vous réussissez souvent là où aucun jour ne ressemble au précédent. Ce qui aide\u202f: mener quelques projets à terme avant de lancer le suivant.",
    },
    6: {
      en: "An Expression 6 gives you the abilities of a carer and a counsellor: making people feel looked after, creating harmony, beauty and a sense of home. You often do your best work in the service of others. What helps: saying no when the load is too heavy.",
      fr: "Une Expression 6 vous donne les capacités de quelqu’un qui soigne et conseille\u202f: faire que les gens se sentent entourés, créer l’harmonie, la beauté, un sentiment de foyer. Vous donnez souvent le meilleur de vous-même au service des autres. Ce qui aide\u202f: dire non quand la charge devient trop lourde.",
    },
    7: {
      en: "An Expression 7 gives you an analytical, searching mind: research, expertise, getting to the bottom of things. You tend to excel where depth counts for more than speed. What helps: explaining your reasoning, so others can follow where you have gone.",
      fr: "Une Expression 7 vous donne un esprit analytique et chercheur\u202f: la recherche, l’expertise, aller au fond des choses. Vous excellez souvent là où la profondeur compte plus que la vitesse. Ce qui aide\u202f: expliquer votre raisonnement, pour que les autres puissent vous suivre.",
    },
    8: {
      en: "An Expression 8 gives you the abilities of a manager: judgement about money and people, organisation on a large scale, the confidence to take charge. You tend to do well where results are measured. What helps: remembering that people are not only a means to the result.",
      fr: "Une Expression 8 vous donne des capacités de dirigeant\u202f: le jugement en matière d’argent et de personnes, l’organisation à grande échelle, l’aplomb pour prendre les commandes. Vous réussissez souvent là où les résultats se mesurent. Ce qui aide\u202f: ne pas oublier que les gens ne sont pas seulement un moyen d’arriver au résultat.",
    },
    9: {
      en: "An Expression 9 gives you broad talents: a feel for art, people and ideas, generosity, the ability to see the whole picture. You often do your best work for a cause larger than yourself. What helps: finishing what you start, and letting go of what is done.",
      fr: "Une Expression 9 vous donne des talents larges\u202f: le sens de l’art, des gens et des idées, la générosité, la capacité de voir l’ensemble. Vous donnez souvent le meilleur de vous-même pour une cause qui vous dépasse. Ce qui aide\u202f: finir ce que vous commencez, et laisser partir ce qui est terminé.",
    },
    11: {
      en: "An Expression 11 gives you the abilities of the 2 raised to inspiration: intuition, idealism, the power to move people through what you say or make. It can feel intense and uneven. What helps: steady routines that keep the energy usable.",
      fr: "Une Expression 11 vous donne les capacités du 2 portées jusqu’à l’inspiration\u202f: l’intuition, l’idéalisme, le pouvoir de toucher les gens par ce que vous dites ou créez. Cela peut sembler intense et inégal. Ce qui aide\u202f: des routines régulières, pour garder cette énergie utilisable.",
    },
    22: {
      en: "An Expression 22 gives you the abilities of the 4 on a larger scale: the vision to see a big project whole and the practical sense to build it. You can organise people and means toward lasting results. What helps: breaking the vision into steps you can take this month.",
      fr: "Une Expression 22 vous donne les capacités du 4 à plus grande échelle\u202f: la vision pour voir un grand projet dans son ensemble et le sens pratique pour le bâtir. Vous savez organiser les gens et les moyens vers des résultats durables. Ce qui aide\u202f: découper la vision en étapes faisables dès ce mois-ci.",
    },
    33: {
      en: "An Expression 33 gives you the abilities of the 6 on a larger scale: teaching, healing, guiding and inspiring others by example. Your talents tend to show when you serve. What helps: caring for yourself as carefully as for those you help.",
      fr: "Une Expression 33 vous donne les capacités du 6 à plus grande échelle\u202f: enseigner, soigner, guider, inspirer par l’exemple. Vos talents se révèlent souvent quand vous servez. Ce qui aide\u202f: prendre soin de vous avec autant d’attention que de ceux que vous aidez.",
    },
  },
  soulurge: {
    1: {
      en: "A Soul Urge 1 wants independence: to be your own person, to lead your own life and to be first at something that matters to you. You feel most alive when you are starting and deciding. What helps: finding a field where your part is yours to run.",
      fr: "Un Élan de l’âme 1 veut l’indépendance\u202f: être vous-même, mener votre propre vie, être le premier dans quelque chose qui compte pour vous. Vous vous sentez le plus vivant quand vous lancez et décidez. Ce qui aide\u202f: trouver un domaine où votre part vous appartient.",
    },
    2: {
      en: "A Soul Urge 2 wants closeness and peace: a partner, a team, a home where people understand each other. You feel most at ease when things are in harmony. What helps: asking for what you need instead of waiting for it to be noticed.",
      fr: "Un Élan de l’âme 2 veut la proximité et la paix\u202f: un partenaire, une équipe, un foyer où l’on se comprend. Vous vous sentez le plus serein quand les choses sont en harmonie. Ce qui aide\u202f: demander ce dont vous avez besoin plutôt que d’attendre qu’on le remarque.",
    },
    3: {
      en: "A Soul Urge 3 wants to express itself and to enjoy life: to create, to talk, to laugh, to be seen for what you make. You feel most alive in company and when ideas flow. What helps: giving your creativity a regular place, not only when inspiration strikes.",
      fr: "Un Élan de l’âme 3 veut s’exprimer et goûter la vie\u202f: créer, parler, rire, être vu pour ce que vous faites. Vous vous sentez le plus vivant en compagnie et quand les idées coulent. Ce qui aide\u202f: donner à votre créativité une place régulière, pas seulement quand l’inspiration vient.",
    },
    4: {
      en: "A Soul Urge 4 wants security and order: a stable home, solid work, things done properly. You feel most at ease when you know where you stand. What helps: remembering that some change can make a foundation stronger, not weaker.",
      fr: "Un Élan de l’âme 4 veut la sécurité et l’ordre\u202f: un foyer stable, un travail solide, les choses bien faites. Vous vous sentez le plus serein quand vous savez où vous en êtes. Ce qui aide\u202f: vous rappeler qu’un peu de changement peut renforcer une fondation au lieu de l’affaiblir.",
    },
    5: {
      en: "A Soul Urge 5 wants freedom: variety, travel, new people and new sensations, room to move. You feel most alive when life is changing. What helps: building freedom into your commitments, so you don’t have to escape them.",
      fr: "Un Élan de l’âme 5 veut la liberté\u202f: la variété, les voyages, de nouvelles rencontres et de nouvelles sensations, de l’espace pour bouger. Vous vous sentez le plus vivant quand la vie change. Ce qui aide\u202f: prévoir de la liberté à l’intérieur de vos engagements, pour ne pas avoir à les fuir.",
    },
    6: {
      en: "A Soul Urge 6 wants to love and to be needed: a warm home, people to care for, a world made a little fairer and more beautiful. You feel most fulfilled when those around you are well. What helps: letting others care for you too.",
      fr: "Un Élan de l’âme 6 veut aimer et être utile\u202f: un foyer chaleureux, des personnes dont prendre soin, un monde un peu plus juste et plus beau. Vous vous sentez le plus comblé quand votre entourage va bien. Ce qui aide\u202f: laisser aussi les autres prendre soin de vous.",
    },
    7: {
      en: "A Soul Urge 7 wants to understand: time to think, quiet, books, nature, the answers behind appearances. You feel most at peace when you have a space of your own. What helps: sharing some of your inner world with a few people you trust.",
      fr: "Un Élan de l’âme 7 veut comprendre\u202f: du temps pour penser, le calme, les livres, la nature, les réponses derrière les apparences. Vous vous sentez le plus en paix quand vous avez un espace à vous. Ce qui aide\u202f: partager un peu de votre monde intérieur avec quelques personnes de confiance.",
    },
    8: {
      en: "A Soul Urge 8 wants to achieve: success you can see, recognition, the means to shape your life and others’. You feel most satisfied when effort turns into results. What helps: deciding what success means to you, beyond what others count.",
      fr: "Un Élan de l’âme 8 veut réaliser\u202f: une réussite visible, de la reconnaissance, les moyens de façonner votre vie et celle des autres. Vous vous sentez le plus satisfait quand l’effort devient résultat. Ce qui aide\u202f: décider ce que la réussite veut dire pour vous, au-delà de ce que les autres comptent.",
    },
    9: {
      en: "A Soul Urge 9 wants to give: to make a difference, to help people and causes beyond your own circle. You feel most fulfilled when your life serves something larger. What helps: accepting that you can’t carry everyone, and choosing where to give.",
      fr: "Un Élan de l’âme 9 veut donner\u202f: faire une différence, aider des gens et des causes au-delà de votre cercle. Vous vous sentez le plus comblé quand votre vie sert quelque chose de plus grand. Ce qui aide\u202f: accepter de ne pas pouvoir porter tout le monde, et choisir où donner.",
    },
    11: {
      en: "A Soul Urge 11 wants meaning and inspiration: to live by an ideal and to share a vision that touches others. You feel most alive when something beyond yourself guides you. What helps: gentle rhythms that calm the nerves, so the ideal doesn’t turn into strain.",
      fr: "Un Élan de l’âme 11 veut du sens et de l’inspiration\u202f: vivre selon un idéal et partager une vision qui touche les autres. Vous vous sentez le plus vivant quand quelque chose au-delà de vous vous guide. Ce qui aide\u202f: des rythmes doux qui apaisent les nerfs, pour que l’idéal ne devienne pas tension.",
    },
    22: {
      en: "A Soul Urge 22 wants to build something that outlasts you: a work, an organisation, a place that serves many. You feel most fulfilled when a large plan takes solid form. What helps: celebrating the steps, not only the finished building.",
      fr: "Un Élan de l’âme 22 veut bâtir quelque chose qui vous survive\u202f: une œuvre, une organisation, un lieu au service de beaucoup. Vous vous sentez le plus comblé quand un grand projet prend une forme solide. Ce qui aide\u202f: célébrer les étapes, pas seulement l’édifice achevé.",
    },
    33: {
      en: "A Soul Urge 33 wants to ease and to teach: to lighten others’ burdens and help them grow. You feel most fulfilled when your care reaches beyond your own family. What helps: receiving as well as giving.",
      fr: "Un Élan de l’âme 33 veut apaiser et enseigner\u202f: alléger le fardeau des autres et les aider à grandir. Vous vous sentez le plus comblé quand votre soin dépasse le cercle familial. Ce qui aide\u202f: recevoir autant que donner.",
    },
  },
  personality: {
    1: {
      en: "A Personality 1 comes across as confident and direct: someone who knows what they want. People may see you as a natural leader, sometimes as a little distant. What helps: a warm word early on, so strength reads as welcome.",
      fr: "Une Personnalité 1 donne une impression d’assurance et de franchise\u202f: quelqu’un qui sait ce qu’il veut. On peut vous voir comme un meneur naturel, parfois un peu distant. Ce qui aide\u202f: un mot chaleureux dès l’abord, pour que la force soit perçue comme accueillante.",
    },
    2: {
      en: "A Personality 2 comes across as gentle, modest and easy to approach. People often feel listened to around you. What helps: letting your views show, so kindness isn’t mistaken for having no opinion.",
      fr: "Une Personnalité 2 donne une impression de douceur, de modestie, d’accessibilité. Les gens se sentent souvent écoutés près de vous. Ce qui aide\u202f: laisser voir vos opinions, pour que la gentillesse ne passe pas pour une absence d’avis.",
    },
    3: {
      en: "A Personality 3 comes across as lively, witty and sociable: good company. People are drawn to your energy and humour. What helps: showing your serious side too, so you are taken as seriously as you deserve.",
      fr: "Une Personnalité 3 donne une impression de vivacité, d’esprit et de sociabilité\u202f: une bonne compagnie. Les gens sont attirés par votre énergie et votre humour. Ce qui aide\u202f: montrer aussi votre côté sérieux, pour être pris au sérieux autant que vous le méritez.",
    },
    4: {
      en: "A Personality 4 comes across as solid, serious and reliable: someone who does what they say. People trust you with practical matters. What helps: a little openness and humour, so reliability doesn’t read as rigidity.",
      fr: "Une Personnalité 4 donne une impression de solidité, de sérieux et de fiabilité\u202f: quelqu’un qui fait ce qu’il dit. On vous confie volontiers les questions pratiques. Ce qui aide\u202f: un peu d’ouverture et d’humour, pour que la fiabilité ne passe pas pour de la rigidité.",
    },
    5: {
      en: "A Personality 5 comes across as lively, curious and attractive: someone who brings movement and fun. People find you stimulating. What helps: keeping your promises, so trust follows the charm.",
      fr: "Une Personnalité 5 donne une impression de vivacité, de curiosité et de charme\u202f: quelqu’un qui apporte du mouvement et du plaisir. Les gens vous trouvent stimulant. Ce qui aide\u202f: tenir vos promesses, pour que la confiance suive le charme.",
    },
    6: {
      en: "A Personality 6 comes across as warm, responsible and caring: someone people turn to. You may look like the one who holds things together. What helps: letting people see your own needs, too.",
      fr: "Une Personnalité 6 donne une impression de chaleur, de responsabilité et de bienveillance\u202f: quelqu’un vers qui l’on se tourne. Vous avez l’air de celui qui tient les choses ensemble. Ce qui aide\u202f: laisser voir aussi vos propres besoins.",
    },
    7: {
      en: "A Personality 7 comes across as reserved, thoughtful and a little mysterious. People may sense depth before they know you well. What helps: small signs of warmth, so reserve isn’t read as coldness.",
      fr: "Une Personnalité 7 donne une impression de réserve, de réflexion et d’un peu de mystère. Les gens devinent une profondeur avant de bien vous connaître. Ce qui aide\u202f: de petits signes de chaleur, pour que la réserve ne passe pas pour de la froideur.",
    },
    8: {
      en: "A Personality 8 comes across as capable, assured and successful: someone with authority. People expect you to take charge. What helps: showing the person behind the competence.",
      fr: "Une Personnalité 8 donne une impression de compétence, d’assurance et de réussite\u202f: quelqu’un qui a de l’autorité. On attend de vous que vous preniez les choses en main. Ce qui aide\u202f: montrer la personne derrière la compétence.",
    },
    9: {
      en: "A Personality 9 comes across as generous, open and a little idealistic: someone with a wide view. People often feel accepted by you. What helps: clear limits, so your openness isn’t taken for granted.",
      fr: "Une Personnalité 9 donne une impression de générosité, d’ouverture et d’un certain idéalisme\u202f: quelqu’un qui voit large. Les gens se sentent souvent acceptés par vous. Ce qui aide\u202f: des limites claires, pour qu’on ne tienne pas votre ouverture pour acquise.",
    },
    11: {
      en: "A Personality 11 comes across as inspired and a little out of the ordinary: people may sense a fine sensitivity and an idealistic streak. You can make a strong impression without trying. What helps: a calm, simple way of putting things when you want to be understood.",
      fr: "Une Personnalité 11 donne une impression d’inspiration et d’originalité\u202f: on devine une sensibilité fine et une part d’idéalisme. Vous pouvez marquer les esprits sans le chercher. Ce qui aide\u202f: une façon calme et simple de dire les choses quand vous voulez être compris.",
    },
    22: {
      en: "A Personality 22 comes across as capable of big things: practical, steady and ambitious at once. People may see you as someone who could carry a large project. What helps: letting people come close, not only rely on you.",
      fr: "Une Personnalité 22 donne l’impression d’une personne capable de grandes choses\u202f: à la fois pratique, stable et ambitieuse. On peut vous voir comme quelqu’un qui porterait un grand projet. Ce qui aide\u202f: laisser les gens vous approcher, et pas seulement compter sur vous.",
    },
    33: {
      en: "A Personality 33 comes across as deeply caring, with a quiet wisdom: people may confide in you quickly. What helps: choosing whom you carry, so kindness doesn’t wear you out.",
      fr: "Une Personnalité 33 donne une impression de grande bienveillance et d’une sagesse tranquille\u202f: on se confie vite à vous. Ce qui aide\u202f: choisir qui vous portez, pour que la bonté ne vous épuise pas.",
    },
  },
  maturity: {
    1: {
      en: "A Maturity 1 points to a second half of life that asks for more independence: making your own decisions, perhaps starting something of your own. What you have learned about yourself becomes a base to act from.",
      fr: "Une Maturité 1 annonce une seconde moitié de vie qui demande plus d’indépendance\u202f: prendre vos propres décisions, peut-être lancer quelque chose à vous. Ce que vous avez appris sur vous-même devient une base pour agir.",
    },
    2: {
      en: "A Maturity 2 points to a second half of life that grows through sharing: closer relationships, cooperation, a gift for bringing people together. Patience and diplomacy count for more with time.",
      fr: "Une Maturité 2 annonce une seconde moitié de vie qui grandit par le partage\u202f: des relations plus proches, la coopération, un don pour rapprocher les gens. La patience et la diplomatie pèsent davantage avec le temps.",
    },
    3: {
      en: "A Maturity 3 points to a second half of life with more room for expression: creating, friends, speaking or writing, enjoying what you make. Many find their voice later rather than sooner.",
      fr: "Une Maturité 3 annonce une seconde moitié de vie qui laisse plus de place à l’expression\u202f: créer, les amis, parler ou écrire, prendre plaisir à ce que vous faites. Beaucoup trouvent leur voix plus tard plutôt que plus tôt.",
    },
    4: {
      en: "A Maturity 4 points to a second half of life that builds: order, security, work that lasts. Effort made steadily tends to show its worth with the years.",
      fr: "Une Maturité 4 annonce une seconde moitié de vie qui construit\u202f: l’ordre, la sécurité, un travail qui dure. L’effort fourni avec régularité montre souvent sa valeur avec les années.",
    },
    5: {
      en: "A Maturity 5 points to a second half of life with more freedom and variety: travel, new interests, perhaps a change of direction. Staying curious keeps this period open.",
      fr: "Une Maturité 5 annonce une seconde moitié de vie plus libre et plus variée\u202f: des voyages, de nouveaux intérêts, peut-être un changement de cap. Rester curieux garde cette période ouverte.",
    },
    6: {
      en: "A Maturity 6 points to a second half of life centred on care: family, home, community, the role of the one others rely on. It tends to bring deep satisfaction when you look after yourself as well.",
      fr: "Une Maturité 6 annonce une seconde moitié de vie centrée sur le soin\u202f: la famille, le foyer, la communauté, le rôle de celui sur qui l’on compte. Elle apporte souvent une profonde satisfaction quand vous prenez aussi soin de vous.",
    },
    7: {
      en: "A Maturity 7 points to a second half of life turned toward understanding: study, reflection, perhaps a spiritual or specialist path. Time alone becomes a resource rather than a lack.",
      fr: "Une Maturité 7 annonce une seconde moitié de vie tournée vers la compréhension\u202f: l’étude, la réflexion, peut-être une voie spirituelle ou une spécialité. Le temps seul devient une ressource plutôt qu’un manque.",
    },
    8: {
      en: "A Maturity 8 points to a second half of life of achievement: authority, financial ease earned by effort, the ability to organise on a larger scale. Using that power generously is the art of this number.",
      fr: "Une Maturité 8 annonce une seconde moitié de vie de réalisation\u202f: l’autorité, une aisance financière gagnée par l’effort, la capacité d’organiser à plus grande échelle. Exercer ce pouvoir avec générosité est tout l’art de ce nombre.",
    },
    9: {
      en: "A Maturity 9 points to a second half of life with a wider heart: generosity, service, interest in the world beyond your own life. Letting go of old stories makes room for it.",
      fr: "Une Maturité 9 annonce une seconde moitié de vie au cœur plus large\u202f: la générosité, le service, l’intérêt pour le monde au-delà de votre vie. Laisser partir les vieilles histoires lui fait de la place.",
    },
    11: {
      en: "A Maturity 11 points to a second half of life led by intuition and ideals: inspiring others, perhaps teaching, a more spiritual outlook. It asks for calm habits to carry its intensity.",
      fr: "Une Maturité 11 annonce une seconde moitié de vie guidée par l’intuition et les idéaux\u202f: inspirer les autres, peut-être enseigner, un regard plus spirituel. Elle demande des habitudes calmes pour porter son intensité.",
    },
    22: {
      en: "A Maturity 22 points to a second half of life able to build on a large scale: projects that outlast you, organisations, lasting structures. The practical steps matter as much as the vision.",
      fr: "Une Maturité 22 annonce une seconde moitié de vie capable de bâtir à grande échelle\u202f: des projets qui vous survivent, des organisations, des structures durables. Les étapes concrètes comptent autant que la vision.",
    },
    33: {
      en: "A Maturity 33 points to a second half of life of care on a larger scale: teaching, healing, guiding by example. Clear limits keep the giving possible.",
      fr: "Une Maturité 33 annonce une seconde moitié de vie de soin à plus grande échelle\u202f: enseigner, soigner, guider par l’exemple. Des limites claires rendent le don possible dans la durée.",
    },
  },
  birthday: {
    1: {
      en: "A Birthday 1 brings a talent for initiative: starting things, thinking for yourself, stepping forward when someone has to.",
      fr: "Un nombre d’Anniversaire 1 apporte un talent pour l’initiative\u202f: lancer les choses, penser par vous-même, vous avancer quand il faut que quelqu’un le fasse.",
    },
    2: {
      en: "A Birthday 2 brings a talent for tact and cooperation: sensing moods, smoothing things over, working well in pairs.",
      fr: "Un nombre d’Anniversaire 2 apporte un talent pour le tact et la coopération\u202f: sentir les humeurs, arrondir les angles, bien travailler à deux.",
    },
    3: {
      en: "A Birthday 3 brings a talent for expression: words, humour, drawing or music, the knack of putting people at ease.",
      fr: "Un nombre d’Anniversaire 3 apporte un talent pour l’expression\u202f: les mots, l’humour, le dessin ou la musique, l’art de mettre les gens à l’aise.",
    },
    4: {
      en: "A Birthday 4 brings a talent for organisation: method, care with detail, the patience to make something work properly.",
      fr: "Un nombre d’Anniversaire 4 apporte un talent pour l’organisation\u202f: la méthode, le soin du détail, la patience de faire fonctionner les choses comme il faut.",
    },
    5: {
      en: "A Birthday 5 brings a talent for adapting: quick learning, ease with change and with new people, a gift for communicating.",
      fr: "Un nombre d’Anniversaire 5 apporte un talent pour vous adapter\u202f: apprendre vite, être à l’aise avec le changement et les inconnus, un don pour communiquer.",
    },
    6: {
      en: "A Birthday 6 brings a talent for care: making a home, looking after people, a sense of harmony and fairness.",
      fr: "Un nombre d’Anniversaire 6 apporte un talent pour le soin\u202f: faire un foyer, veiller sur les gens, un sens de l’harmonie et de l’équité.",
    },
    7: {
      en: "A Birthday 7 brings a talent for analysis: a searching mind, intuition, the ability to study a subject in depth.",
      fr: "Un nombre d’Anniversaire 7 apporte un talent pour l’analyse\u202f: un esprit chercheur, de l’intuition, la capacité d’étudier un sujet en profondeur.",
    },
    8: {
      en: "A Birthday 8 brings a talent for managing: good judgement with money and people, the ability to organise and to lead.",
      fr: "Un nombre d’Anniversaire 8 apporte un talent pour la gestion\u202f: un bon jugement en matière d’argent et de personnes, la capacité d’organiser et de diriger.",
    },
    9: {
      en: "A Birthday 9 brings a talent for understanding people: generosity, a broad outlook, often an artistic streak.",
      fr: "Un nombre d’Anniversaire 9 apporte un talent pour comprendre les gens\u202f: la générosité, une vision large, souvent une fibre artistique.",
    },
    11: {
      en: "A Birthday 11 (the 11th or the 29th) brings a talent for intuition: sensing what goes unsaid, inspiring others, a fine sensitivity.",
      fr: "Un nombre d’Anniversaire 11 (le 11 ou le 29) apporte un talent pour l’intuition\u202f: sentir le non-dit, inspirer les autres, une sensibilité fine.",
    },
    22: {
      en: "A Birthday 22 brings a talent for practical vision: seeing how a large plan could work, and the method to make it real.",
      fr: "Un nombre d’Anniversaire 22 apporte un talent pour la vision concrète\u202f: voir comment un grand projet pourrait fonctionner, et la méthode pour le réaliser.",
    },
  },
};
