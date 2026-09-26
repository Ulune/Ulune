import type { HdAuthority, HdCenterId, HdStrategy, HdType } from "@/lib/chart/human-design";
import type { AppLocale } from "./messages";

type Pair = { en: string; fr: string };
const pick = (p: Pair, locale: AppLocale) => (locale === "fr" ? p.fr : p.en);

/**
 * What each centre governs, and how it tends to work defined or open.
 * Defined = coloured in the bodygraph, a consistent trait. Open = white,
 * receptive to (and amplifying) the people around you.
 */
const CENTER: Record<HdCenterId, { role: Pair; defined: Pair; open: Pair }> = {
  head: {
    role: {
      en: "The Head centre, at the top of the bodygraph, is a pressure centre: it creates the urge to think, question and make sense of things. It governs inspiration and doubt — the questions that keep coming back until they are answered.",
      fr: "Le centre de la Tête, en haut du bodygraph, est un centre de pression : il crée le besoin de penser, de questionner et de donner un sens aux choses. Il gouverne l’inspiration et le doute — les questions qui reviennent tant qu’elles n’ont pas de réponse.",
    },
    defined: {
      en: "Defined, it produces its own questions and inspiration at a steady rate. You tend to bring ideas into a group rather than pick up other people’s. Example: coming back to the same big question for years, each time from a new angle.",
      fr: "Défini, ce centre produit ses propres questions et inspirations à un rythme régulier. Vous apportez plutôt des idées dans un groupe que vous ne reprenez celles des autres. Exemple : revenir à la même grande question pendant des années, chaque fois sous un angle nouveau.",
    },
    open: {
      en: "Open, it takes in the mental pressure of the people around you, so you may end up chasing questions that are not really yours. The upside is a wide curiosity. A useful test: does this question still matter to me once I am on my own?",
      fr: "Ouvert, ce centre absorbe la pression mentale des personnes qui vous entourent : vous pouvez finir par courir après des questions qui ne sont pas vraiment les vôtres. L’avantage : une curiosité très large. Un test utile : cette question compte-t-elle encore pour moi une fois au calme, loin des autres ?",
    },
  },
  ajna: {
    role: {
      en: "The Ajna, just below the Head, is the awareness centre of the mind: it turns inspiration into concepts, opinions and theories, and sorts and stores information. It is good at analysing, but Human Design holds that it is not built to make life decisions.",
      fr: "L’Ajna, juste sous la Tête, est le centre de conscience du mental : il transforme l’inspiration en concepts, en opinions et en théories, et trie et range l’information. Il analyse bien, mais le Human Design considère qu’il n’est pas fait pour prendre les décisions de vie.",
    },
    defined: {
      en: "Defined, it gives you a fixed, consistent way of processing information — a method others can recognise and rely on, such as always thinking in lists, or always in pictures. The risk is assuming everyone thinks the same way.",
      fr: "Défini, ce centre vous donne une façon fixe et constante de traiter l’information — une méthode reconnaissable sur laquelle on peut compter, comme penser toujours en listes, ou toujours en images. Le risque : croire que tout le monde pense de la même manière.",
    },
    open: {
      en: "Open, it makes your thinking flexible: you can see a problem from many sides and follow very different kinds of minds. The common trap is pretending to be certain in order to seem reliable. Saying “I see several possibilities” is a perfectly good answer.",
      fr: "Ouvert, ce centre rend votre pensée souple : vous voyez un problème sous plusieurs angles et suivez des esprits très différents. Le piège courant : afficher des certitudes pour paraître fiable. Dire « je vois plusieurs possibilités » est une réponse tout à fait valable.",
    },
  },
  throat: {
    role: {
      en: "The Throat is the centre of communication and action: everything that is said or done passes through it. It is the only centre that turns energy into something others can see or hear, which is why the channels of the bodygraph lead towards it.",
      fr: "La Gorge est le centre de la communication et de l’action : tout ce qui se dit ou se fait passe par elle. C’est le seul centre qui transforme l’énergie en quelque chose que les autres peuvent voir ou entendre ; c’est pourquoi les canaux du bodygraph convergent vers elle.",
    },
    defined: {
      en: "Defined, it gives you a consistent way of expressing yourself: your voice and style stay recognisable in any company. The centres linked to it show what your voice carries — feelings if it connects to the Solar Plexus, ideas if it connects to the Ajna, and so on.",
      fr: "Défini, ce centre vous donne une façon constante de vous exprimer : votre voix et votre style restent reconnaissables en toute compagnie. Les centres qui y sont reliés montrent ce que porte votre voix — des émotions s’il est relié au Plexus solaire, des idées s’il est relié à l’Ajna, etc.",
    },
    open: {
      en: "Open, it lets your way of speaking change with the people around you, and you may feel pressure to talk to get attention or to fill a silence. What you say tends to land best when someone has asked for it or the moment clearly calls for it.",
      fr: "Ouvert, ce centre fait varier votre façon de parler selon l’entourage, et vous pouvez ressentir la pression de parler pour attirer l’attention ou combler un silence. Vos paroles portent le mieux quand on vous les demande ou que le moment s’y prête clairement.",
    },
  },
  g: {
    role: {
      en: "The G centre, in the middle of the bodygraph, holds identity, direction and love: the sense of who you are and where your life is heading. In Human Design it is also said to draw you towards the people and places that belong on your path.",
      fr: "Le centre G, au milieu du bodygraph, porte l’identité, la direction et l’amour : le sentiment de qui vous êtes et de la direction que prend votre vie. En Human Design, on dit aussi qu’il vous attire vers les personnes et les lieux qui ont leur place sur votre chemin.",
    },
    defined: {
      en: "Defined, it gives you a fixed sense of self and direction that depends little on where you are or who you are with. Other people can orient themselves by you: you are often the one who knows which way to go.",
      fr: "Défini, ce centre vous donne un sentiment fixe de vous-même et de votre direction, qui dépend peu du lieu ou de l’entourage. Les autres peuvent s’orienter grâce à vous : vous êtes souvent celui ou celle qui sait où aller.",
    },
    open: {
      en: "Open, it makes your sense of identity fluid and closely tied to your surroundings: the right places and people help you feel like yourself. Feeling unsure of your direction is normal here. A concrete test: notice how you feel in a new place — if it feels wrong, it probably is.",
      fr: "Ouvert, ce centre rend votre identité fluide et très liée à votre environnement : les bons lieux et les bonnes personnes vous aident à vous sentir vous-même. Douter de sa direction est normal ici. Un test concret : observez ce que vous ressentez dans un nouveau lieu — s’il vous semble mauvais, il l’est sans doute.",
    },
  },
  heart: {
    role: {
      en: "The Heart centre, also called the Ego, is the motor of willpower: making promises, keeping them, and the drive to earn, own and prove your worth. It is tied to the material world — work, money and what you can offer others.",
      fr: "Le centre du Cœur, aussi appelé Ego, est le moteur de la volonté : faire des promesses, les tenir, et l’élan pour gagner, posséder et prouver sa valeur. Il est lié au monde matériel — le travail, l’argent et ce que l’on peut offrir aux autres.",
    },
    defined: {
      en: "Defined, it gives you steady access to willpower: you can commit to something and see it through. It works in cycles of effort and rest, so promises are best made with the rest built in. Example: agreeing to a deadline because you really want it, then taking a proper break afterwards.",
      fr: "Défini, ce centre vous donne un accès constant à la volonté : vous pouvez vous engager et tenir jusqu’au bout. Il fonctionne par cycles d’effort et de repos : mieux vaut promettre en prévoyant ce repos. Exemple : accepter une échéance parce que vous la voulez vraiment, puis prendre une vraie pause ensuite.",
    },
    open: {
      en: "Open, it makes your willpower inconsistent, and you may feel you have to prove your worth — by overpromising, overworking or undercharging. There is nothing to prove. A useful habit: pause before agreeing to anything you are taking on mainly to impress.",
      fr: "Ouvert, ce centre rend votre volonté inégale, et vous pouvez ressentir le besoin de prouver votre valeur — en promettant trop, en travaillant trop ou en demandant trop peu. Vous n’avez rien à prouver. Une habitude utile : marquer une pause avant d’accepter un engagement pris surtout pour impressionner.",
    },
  },
  sacral: {
    role: {
      en: "The Sacral is the most powerful motor in the bodygraph: the life force behind sustained work, sexuality and fertility. Only Generators and Manifesting Generators have it defined. It speaks through gut responses — an immediate inner yes or no — rather than through thought.",
      fr: "Le Sacral est le moteur le plus puissant du bodygraph : la force vitale derrière le travail soutenu, la sexualité et la fertilité. Seuls les Générateurs et les Générateurs manifesteurs l’ont défini. Il s’exprime par des réponses du ventre — un oui ou un non intérieur immédiat — plutôt que par la pensée.",
    },
    defined: {
      en: "Defined, it gives you renewable energy for work you respond to, and your gut gives clear answers, often as a sound (“uh-huh” or “uhn-uhn”). The energy runs down when it goes into things you did not really want. Example: a yes-or-no question gets an instant reaction before your mind has an opinion.",
      fr: "Défini, ce centre vous donne une énergie renouvelable pour le travail auquel vous répondez, et votre ventre donne des réponses nettes, souvent sous forme de son (« hm-hm » ou « hm-mm »). Cette énergie s’épuise quand elle sert des choses que vous ne vouliez pas vraiment. Exemple : une question fermée provoque une réaction immédiate avant même que votre tête ait un avis.",
    },
    open: {
      en: "Open, it gives you no consistent work energy of your own: around people with a defined Sacral you can work hard, then crash. The key skill is knowing when enough is enough — stopping before exhaustion, and resting away from others so the borrowed energy can drain off.",
      fr: "Ouvert, ce centre ne vous donne pas d’énergie de travail constante : au contact de personnes au Sacral défini, vous pouvez beaucoup travailler, puis vous effondrer. La compétence clé : savoir quand c’est assez — s’arrêter avant l’épuisement, et se reposer à l’écart des autres pour évacuer l’énergie empruntée.",
    },
  },
  solarPlexus: {
    role: {
      en: "The Solar Plexus is the centre of emotions, and both a motor and an awareness centre. Its feelings move in a wave — hope and disappointment, excitement and calm — that rises and falls over hours or days. About half of all people have it defined.",
      fr: "Le Plexus solaire est le centre des émotions ; c’est à la fois un moteur et un centre de conscience. Ses ressentis évoluent en vague — espoir et déception, enthousiasme et calme — qui monte et descend sur des heures ou des jours. Environ la moitié des gens l’ont défini.",
    },
    defined: {
      en: "Defined, it gives you your own emotional wave, and your mood affects the people around you. Clarity does not come in the moment but over time, once you have felt a decision at both the high and the low of the wave. Example: waiting until the day after an exciting offer before accepting it.",
      fr: "Défini, ce centre vous donne votre propre vague émotionnelle, et votre humeur influence votre entourage. La clarté ne vient pas sur le moment mais avec le temps, une fois la décision ressentie au haut et au bas de la vague. Exemple : attendre le lendemain d’une offre enthousiasmante avant de l’accepter.",
    },
    open: {
      en: "Open, it takes in other people’s emotions, often feeling them more strongly than they do, which can make you avoid conflict or hard truths to keep the peace. Much of what you feel in a tense room is not yours. A useful habit: step away for a moment and see whether the feeling stays.",
      fr: "Ouvert, ce centre absorbe les émotions des autres, souvent plus fort qu’eux-mêmes ne les ressentent, ce qui peut vous pousser à éviter les conflits ou les vérités difficiles pour garder la paix. Une grande partie de ce que vous ressentez dans une pièce tendue ne vous appartient pas. Une habitude utile : vous éloigner un moment et voir si le ressenti reste.",
    },
  },
  spleen: {
    role: {
      en: "The Spleen is the oldest awareness centre: instinct, intuition, health and the immune system. It speaks quietly and only once, in the present moment, about what is safe or unsafe for you. It is also where fears linked to survival sit.",
      fr: "La Rate est le plus ancien centre de conscience : instinct, intuition, santé et système immunitaire. Elle parle doucement et une seule fois, dans l’instant, de ce qui est sûr ou non pour vous. C’est aussi là que se trouvent les peurs liées à la survie.",
    },
    defined: {
      en: "Defined, it gives you a consistent instinct and, usually, a steady sense of health and well-being. Its signals are quiet and do not repeat: a sudden feeling that you should leave a place, or not trust someone, is worth acting on straight away.",
      fr: "Défini, ce centre vous donne un instinct constant et, en général, un sentiment stable de santé et de bien-être. Ses signaux sont discrets et ne se répètent pas : l’impression soudaine qu’il faut quitter un lieu, ou ne pas faire confiance à quelqu’un, mérite d’être suivie tout de suite.",
    },
    open: {
      en: "Open, it makes you very sensitive to health and atmosphere, and you may hold on to people, jobs or habits because they feel familiar rather than because they are good for you. You often feel better around people with a defined Spleen. The main lesson is letting go of what no longer serves you.",
      fr: "Ouvert, ce centre vous rend très sensible à la santé et à l’atmosphère, et vous pouvez rester attaché à des personnes, à un emploi ou à des habitudes parce qu’ils sont familiers plutôt que bons pour vous. Vous vous sentez souvent mieux auprès de personnes à la Rate définie. La principale leçon : lâcher ce qui ne vous sert plus.",
    },
  },
  root: {
    role: {
      en: "The Root, at the bottom of the bodygraph, is both a pressure centre and a motor: it produces the adrenaline and stress that get things moving. It sets the pace — deadlines, urgency, the push to start or finish something.",
      fr: "La Racine, en bas du bodygraph, est à la fois un centre de pression et un moteur : elle produit l’adrénaline et le stress qui mettent les choses en mouvement. Elle donne le rythme — échéances, urgence, poussée pour commencer ou finir quelque chose.",
    },
    defined: {
      en: "Defined, it lets you handle pressure in your own consistent way and use it as fuel. You tend to work at your own pace, and may put pressure on others without meaning to.",
      fr: "Défini, ce centre vous permet de gérer la pression de façon constante et de vous en servir comme carburant. Vous travaillez à votre propre rythme, et pouvez mettre la pression aux autres sans le vouloir.",
    },
    open: {
      en: "Open, it absorbs and amplifies the pressure around you, so you may rush to finish things just to be rid of the stress. Not every deadline is urgent, or yours. Example: answering every message the moment it arrives, even when nothing requires it.",
      fr: "Ouvert, ce centre absorbe et amplifie la pression ambiante : vous pouvez vous dépêcher de finir les choses juste pour ne plus la sentir. Toutes les échéances ne sont pas urgentes, ni les vôtres. Exemple : répondre à chaque message dès qu’il arrive, même quand rien ne l’exige.",
    },
  },
};

/** What makes each type, how its energy works, and its signature and not-self theme. */
const TYPE: Record<HdType, Pair> = {
  Manifestor: {
    en: "Manifestors are the only type built to start things on their own, without waiting for something outside to set them off: a motor centre is connected to their Throat, and their Sacral is undefined. Their energy comes in bursts rather than steadily, and they have a strong impact on others. Informing people before acting lowers the resistance they often meet. Human Design names peace as the sign they are on track, and anger as the sign they are not.",
    fr: "Les Manifesteurs sont le seul type fait pour lancer les choses de lui-même, sans attendre qu’un élément extérieur les déclenche : un centre moteur est relié à leur Gorge, et leur Sacral est indéfini. Leur énergie vient par poussées plutôt que de façon régulière, et ils ont un fort impact sur les autres. Informer avant d’agir diminue les résistances qu’ils rencontrent souvent. Le Human Design voit la paix comme le signe qu’ils sont sur la bonne voie, et la colère comme le signe inverse.",
  },
  Generator: {
    en: "Generators have a defined Sacral centre, which gives them steady, renewable energy for work they enjoy; they are the most common type, a little over a third of people. Their energy is designed to respond to what life brings rather than to start things from the mind. Used well, it brings satisfaction; forced, it leads to frustration. Example: a job that began with saying yes to an offer tends to energise them more than one chased on principle.",
    fr: "Les Générateurs ont un centre Sacral défini, qui leur donne une énergie régulière et renouvelable pour le travail qu’ils aiment ; c’est le type le plus courant, un peu plus d’un tiers des gens. Leur énergie est faite pour répondre à ce que la vie apporte plutôt que pour lancer les choses depuis la tête. Bien employée, elle donne de la satisfaction ; forcée, elle mène à la frustration. Exemple : un travail accepté en réponse à une offre les porte souvent mieux qu’un poste recherché par principe.",
  },
  "Manifesting Generator": {
    en: "Manifesting Generators have a defined Sacral, like Generators, and a motor connected to the Throat, like Manifestors. They respond first, then can move very fast, often running several things at once and skipping steps they come back to later. Telling the people involved what they are doing keeps that speed from causing friction. Example: agreeing to help a friend move, then having half the boxes packed before anyone has made a plan.",
    fr: "Les Générateurs manifesteurs ont un Sacral défini, comme les Générateurs, et un moteur relié à la Gorge, comme les Manifesteurs. Ils répondent d’abord, puis peuvent aller très vite, souvent en menant plusieurs choses de front et en sautant des étapes qu’ils reprennent ensuite. Prévenir les personnes concernées évite que cette vitesse ne crée des frictions. Exemple : accepter d’aider un ami à déménager, et avoir rempli la moitié des cartons avant que quiconque ait fait un plan.",
  },
  Projector: {
    en: "Projectors have an undefined Sacral and no motor connected to the Throat, so they lack steady work energy of their own; about one person in five is a Projector. Their strength is seeing how people and systems work, which makes them natural guides, advisers and managers. That guidance lands when it is recognised and invited. Human Design names success as the sign they are on track, and bitterness as the sign they are not.",
    fr: "Les Projecteurs ont un Sacral indéfini et aucun moteur relié à la Gorge : ils n’ont donc pas d’énergie de travail régulière qui leur soit propre ; environ une personne sur cinq est Projecteur. Leur force est de voir comment fonctionnent les personnes et les systèmes, ce qui en fait des guides, des conseillers et des managers naturels. Ce regard porte quand il est reconnu et invité. Le Human Design voit le succès comme le signe qu’ils sont sur la bonne voie, et l’amertume comme le signe inverse.",
  },
  Reflector: {
    en: "Reflectors have no defined centres at all, which makes them the rarest type, about one person in a hundred. They take in and reflect the energy of the people and places around them, so their environment matters more than for anyone else. Big decisions ripen over a full lunar cycle of about 29 days. Human Design names surprise as the sign they are on track, and disappointment as the sign they are not.",
    fr: "Les Réflecteurs n’ont aucun centre défini, ce qui en fait le type le plus rare, environ une personne sur cent. Ils absorbent et reflètent l’énergie des personnes et des lieux qui les entourent : leur environnement compte plus que pour quiconque. Les grandes décisions mûrissent sur un cycle lunaire complet, environ 29 jours. Le Human Design voit la surprise comme le signe qu’ils sont sur la bonne voie, et la déception comme le signe inverse.",
  },
};

/** Which centre sets the authority, and how to use it, with an example. */
const AUTHORITY: Record<HdAuthority, Pair> = {
  Emotional: {
    en: "Emotional authority (defined Solar Plexus, about half of people): there is no truth in the moment. Your feelings about a choice rise and fall, so clarity comes from waiting until they settle — after a night’s sleep, sometimes several days. Example: an offer that still feels right after both a low mood and a high one is usually a real yes.",
    fr: "Autorité émotionnelle (Plexus solaire défini, environ la moitié des gens) : pas de vérité dans l’instant. Votre ressenti face à un choix monte et descend ; la clarté vient en attendant qu’il se stabilise — après une nuit, parfois plusieurs jours. Exemple : une offre qui vous semble toujours juste après un moment de creux et un moment d’élan est en général un vrai oui.",
  },
  Sacral: {
    en: "Sacral authority (defined Sacral, undefined Solar Plexus): decide in the moment, with your gut. The Sacral answers yes-or-no questions with an immediate feeling or sound, before the mind has time to argue. Example: asking a friend to put the choice to you as a yes-or-no question, and trusting your very first reaction.",
    fr: "Autorité sacrale (Sacral défini, Plexus solaire indéfini) : décidez sur le moment, avec le ventre. Le Sacral répond aux questions fermées par un ressenti ou un son immédiat, avant que le mental n’ait le temps d’argumenter. Exemple : demander à un ami de vous poser le choix sous forme de question fermée, et vous fier à votre toute première réaction.",
  },
  Splenic: {
    en: "Splenic authority (defined Spleen, with the Solar Plexus and Sacral undefined): a quiet instinct in the present moment. It speaks once, often as a faint sense of safe or unsafe, and does not repeat itself. Example: a sudden feeling not to take a particular road home, which you follow without needing a reason.",
    fr: "Autorité splénique (Rate définie, Plexus solaire et Sacral indéfinis) : un instinct discret, dans l’instant. Il parle une seule fois, souvent comme une légère impression de sécurité ou de danger, et ne se répète pas. Exemple : l’envie soudaine de ne pas prendre tel chemin pour rentrer, que vous suivez sans avoir besoin de raison.",
  },
  Ego: {
    en: "Ego authority (defined Heart, with no emotional, sacral or splenic authority): decide from what you really want and are willing to put your will behind. Listen to what you hear yourself say — “I want this” or “I don’t” — rather than to what you think you should do. Example: noticing that you keep saying you want to go back to studying.",
    fr: "Autorité de l’Ego (Cœur défini, sans autorité émotionnelle, sacrale ni splénique) : décidez à partir de ce que vous voulez vraiment soutenir de votre volonté. Écoutez ce que vous vous entendez dire — « je veux ça » ou « je n’en veux pas » — plutôt que ce que vous pensez devoir faire. Exemple : remarquer que vous répétez sans cesse vouloir reprendre des études.",
  },
  "Self-Projected": {
    en: "Self-projected authority (G centre connected to the Throat, found only in Projectors): your truth comes out when you hear yourself speak. Talk a decision through with people you trust — not for their advice, but to hear what you say and how it sounds. Example: describing two job offers to a friend and realising halfway through which one you talk about with more life.",
    fr: "Autorité auto-projetée (centre G relié à la Gorge, seulement chez les Projecteurs) : votre vérité apparaît quand vous vous entendez parler. Parlez de la décision à des personnes de confiance — non pour leurs conseils, mais pour entendre ce que vous dites et comment vous le dites. Exemple : décrire deux offres d’emploi à un ami et comprendre en chemin de laquelle vous parlez avec le plus d’élan.",
  },
  Mental: {
    en: "Mental, or environmental, authority (Projectors whose definition lies only in the Head, Ajna and Throat): there is no inner authority, so clarity comes from outside — from being in the right place and talking things over with trusted sounding boards. Example: noticing that you think more clearly about a big decision in one particular café, or with one particular friend.",
    fr: "Autorité mentale, ou environnementale (Projecteurs dont la définition se limite à la Tête, à l’Ajna et à la Gorge) : il n’y a pas d’autorité intérieure, la clarté vient donc de l’extérieur — du bon lieu et de personnes de confiance avec qui en parler. Exemple : remarquer que vous réfléchissez plus clairement à une grande décision dans tel café, ou avec tel ami.",
  },
  Lunar: {
    en: "Lunar authority (Reflectors, no defined centres): take about 29 days, one full Moon cycle, before an important decision. Over that month the Moon passes through every gate in turn, so you get to feel the decision from every angle. Example: talking about a possible move with different people through the month and noting what stays constant.",
    fr: "Autorité lunaire (Réflecteurs, aucun centre défini) : prenez environ 29 jours, un cycle lunaire complet, avant une décision importante. Pendant ce mois, la Lune traverse tour à tour chaque porte : vous ressentez ainsi la décision sous tous les angles. Exemple : parler d’un éventuel déménagement à différentes personnes au fil du mois, et noter ce qui reste constant.",
  },
};

export function hdCenterProse(locale: AppLocale, id: HdCenterId, defined: boolean) {
  const c = CENTER[id];
  return { role: pick(c.role, locale), state: pick(defined ? c.defined : c.open, locale) };
}
export function hdTypeProse(locale: AppLocale, type: HdType) {
  return pick(TYPE[type], locale);
}
export function hdAuthorityProse(locale: AppLocale, a: HdAuthority) {
  return pick(AUTHORITY[a], locale);
}

const STRATEGY: Record<HdStrategy, Pair> = {
  "Inform before acting": {
    en: "Inform before acting: before you start something that affects other people, tell them what you are about to do. You do not need permission — the point is that people are less likely to resist or feel blindsided. Example: telling your team you will restructure a project before you do it.",
    fr: "Informer avant d’agir : avant de lancer quelque chose qui touche d’autres personnes, dites-leur ce que vous allez faire. Il ne s’agit pas de demander la permission — les autres résistent simplement moins quand ils ne sont pas pris de court. Exemple : prévenir votre équipe que vous allez réorganiser un projet avant de le faire.",
  },
  "Wait to respond": {
    en: "Wait to respond: instead of starting things from your head, let life bring you something to react to — a question, an offer, an idea you come across — and notice your gut response. A clear inner yes gives you lasting energy; a no saves you from work that drains you. Example: saying yes to a project because it excites you when it is offered, not because you planned to look for one.",
    fr: "Attendre pour répondre : au lieu de lancer les choses depuis la tête, laissez la vie vous apporter de quoi réagir — une question, une proposition, une idée croisée — et observez la réponse de votre ventre. Un oui intérieur net donne une énergie durable ; un non vous épargne un travail qui vous vide. Exemple : accepter un projet parce qu’il vous enthousiasme quand on vous le propose, pas parce que vous aviez prévu d’en chercher un.",
  },
  "Wait for the invitation": {
    en: "Wait for the invitation: your guidance works best when someone has recognised it and asked for it, especially for the big things — work, relationships, where to live. Unasked advice tends to be ignored, however accurate. Example: a colleague who asks for your view on a problem will actually use it; volunteering the same view in a meeting often goes nowhere.",
    fr: "Attendre l’invitation : vos conseils portent le mieux quand quelqu’un les a reconnus et demandés, surtout pour les grandes choses — travail, relations, lieu de vie. Un conseil non sollicité est souvent ignoré, même juste. Exemple : un collègue qui vous demande votre avis sur un problème s’en servira vraiment ; le même avis lancé en réunion passe souvent à la trappe.",
  },
  "Wait a lunar cycle": {
    en: "Wait a lunar cycle: for important decisions, take about 29 days — one full Moon cycle — before committing. Talking the decision over with different people during that month lets you see it from every angle. Example: living with the idea of a move for a month before signing a lease.",
    fr: "Attendre un cycle lunaire : pour les décisions importantes, prenez environ 29 jours — un cycle complet de la Lune — avant de vous engager. En parler à différentes personnes pendant ce mois permet de la voir sous tous les angles. Exemple : vivre un mois avec l’idée d’un déménagement avant de signer un bail.",
  },
};

export function hdStrategyProse(locale: AppLocale, s: HdStrategy) {
  return pick(STRATEGY[s], locale);
}
