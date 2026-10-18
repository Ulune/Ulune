/**
 * Human Design's connection chart, its reading text in English and French
 * (share and compare plan, feature 5a; the reading builder is
 * src/lib/chart/interpret-hd-pair.ts, the engine src/lib/chart/hd-pair.ts).
 * Written for Ulune in the tone of the other readings: what two people form
 * and how they tend to meet, with an everyday example and a suggestion,
 * never a verdict on the relationship or a prediction. Placeholders in
 * braces are filled by the builder: names ({a}, {b}, {giver}, {receiver},
 * {lead}, {other}, {who}), French "de" forms ({deGiver}…), gates, channels.
 */
import type { Bi } from "./types";
import type { HdPairKind } from "@/lib/chart/hd-pair";
import type { HdCenterId, HdDefinition } from "@/lib/chart/human-design";

/** The four kinds: their names, a line for the legend, what each means for two, and its first sentence for one channel. */
export const HDP_KIND_TEXT: Record<HdPairKind, { name: Bi; line: Bi; what: Bi; here: Bi }> = {
  electromagnetic: {
    name: { en: "Electromagnetic", fr: "Électromagnétique" },
    line: { en: "One gate each: together you complete the channel", fr: "Une porte chacun\u202f: ensemble, vous complétez le canal" },
    what: {
      en: "An electromagnetic channel forms when each of you has one of its two gates and neither has the whole of it. Neither of you lives this channel alone: it switches on between you. Human Design sees here the spark of a relationship, the pull to come together, and also its push and pull, since each of you holds only half of the theme. Example: one of you brings the urge, the other the means, and the energy flows when you are in the same room.",
      fr: "Un canal électromagnétique se forme quand chacun de vous a l’une de ses deux portes et qu’aucun ne l’a en entier. Ce canal n’est complet chez aucun de vous\u202f: il s’allume entre vous. Le Human Design y voit l’étincelle d’une relation, l’attirance qui rapproche, et aussi son va-et-vient, puisque chacun ne tient que la moitié du thème. Exemple\u202f: l’un apporte l’élan, l’autre les moyens, et l’énergie circule quand vous êtes dans la même pièce.",
    },
    here: {
      en: "{a} brings gate {ga} and {b} gate {gb}: this channel is whole in neither of you, and together you complete it. When you are together it works for both of you; apart, each keeps only their half.",
      fr: "{a} apporte la porte {ga} et {b} la porte {gb}\u202f: ce canal n’est complet chez aucun de vous, et ensemble vous le complétez. Quand vous êtes ensemble, il fonctionne pour vous deux\u202f; séparés, chacun n’en garde que sa moitié.",
    },
  },
  companionship: {
    name: { en: "Companionship", fr: "Compagnonnage" },
    line: { en: "Both of you have it whole: shared ground", fr: "Vous l’avez tous les deux en entier\u202f: un terrain commun" },
    what: {
      en: "Companionship is a channel you both have whole. Here you are alike: the same steady way of working, which tends to feel easy and familiar between you, somewhere to rest in each other’s company. Since neither of you brings the other anything new here, it is ground you share more than ground you grow on. Example: two people with the same channel of focus can work side by side for hours without needing to explain themselves.",
      fr: "Le compagnonnage est un canal que vous avez tous les deux en entier. Ici, vous vous ressemblez\u202f: la même façon constante de fonctionner, qui paraît souvent facile et familière entre vous, un endroit où se reposer l’un auprès de l’autre. Comme aucun de vous n’apporte ici de nouveauté à l’autre, c’est un terrain que vous partagez plus qu’un terrain où vous grandissez. Exemple\u202f: deux personnes qui ont le même canal de concentration peuvent travailler côte à côte des heures sans avoir à s’expliquer.",
    },
    here: {
      en: "You both have the whole channel, gates {g1} and {g2}: here you work the same way, each on your own, and meet as equals.",
      fr: "Vous avez tous les deux le canal entier, portes {g1} et {g2}\u202f: ici, vous fonctionnez de la même façon, chacun de votre côté, et vous vous retrouvez d’égal à égal.",
    },
  },
  dominance: {
    name: { en: "Dominance", fr: "Dominance" },
    line: { en: "One has it whole, the other neither gate", fr: "L’un l’a en entier, l’autre aucune de ses portes" },
    what: {
      en: "Dominance is a channel one of you has whole while the other has neither of its gates. The one who has it carries the theme in a steady, fixed way; the other meets it only through them, and tends to take it in and follow its lead. This is not better or worse for either of you: it shows where one naturally sets the way and the other learns it, sometimes amplified. Example: the one with the channel sets the rhythm of shared work, and the other discovers that rhythm through them.",
      fr: "La dominance est un canal que l’un de vous a en entier et dont l’autre n’a aucune porte. Celui ou celle qui l’a porte le thème de façon constante et fixe\u202f; l’autre ne le rencontre qu’à son contact, et tend à l’accueillir et à suivre son mouvement. Ce n’est ni mieux ni moins bien pour l’un ou pour l’autre\u202f: cela montre où l’un de vous donne naturellement la direction et où l’autre l’apprend, parfois en l’amplifiant. Exemple\u202f: celui ou celle qui a le canal donne le rythme d’un travail commun, et l’autre découvre ce rythme à son contact.",
    },
    here: {
      en: "{lead} has the whole channel, gates {g1} and {g2}, and {other} neither gate: here {lead} sets the way, and {other} takes this channel in through {lead}.",
      fr: "{lead} a le canal entier, portes {g1} et {g2}, et {other} aucune des deux\u202f: ici, {lead} donne la direction, et {other} vit ce canal au contact {deLead}.",
    },
  },
  compromise: {
    name: { en: "Compromise", fr: "Compromis" },
    line: { en: "One has it whole, the other one gate", fr: "L’un l’a en entier, l’autre une seule porte" },
    what: {
      en: "Compromise is a channel one of you has whole while the other has just one of its gates. The one with a single gate has their own way of using it, and next to the whole channel that way tends to give way. Human Design calls it compromise because this is where one of you most often adapts, sometimes without noticing; it can bring friction, and it eases once it is named. Example: one of you likes to act on a feeling at once, the other carries the whole emotional wave and sets its pace.",
      fr: "Le compromis est un canal que l’un de vous a en entier alors que l’autre n’en a qu’une porte. Celui ou celle qui n’a qu’une porte a sa propre façon de l’utiliser, et à côté du canal entier, cette façon tend à s’effacer. Le Human Design parle de compromis parce que c’est là que l’un de vous s’adapte le plus souvent, parfois sans s’en rendre compte\u202f; cela peut créer des frottements, qui s’apaisent une fois nommés. Exemple\u202f: l’un aime agir tout de suite sur un sentiment, l’autre porte toute la vague émotionnelle et en donne le rythme.",
    },
    here: {
      en: "{lead} has the whole channel, gates {g1} and {g2}, and {other} gate {g} only: here {other} tends to adapt to {lead}’s way of using it. Saying so out loud helps you both.",
      fr: "{lead} a le canal entier, portes {g1} et {g2}, et {other} la seule porte {g}\u202f: ici, {other} tend à s’adapter à la façon de faire {deLead}. Le dire à voix haute vous aide tous les deux.",
    },
  },
};

/** About the four kinds (the "About" of a channel's and a kind's reading). */
export const HDP_KINDS_ABOUT: Bi = {
  en: "A connection chart sorts the channels two people form into four kinds: electromagnetic (one gate each), companionship (both have the channel whole), dominance (one has it whole, the other neither gate) and compromise (one has it whole, the other one gate). They describe how two people meet in a theme, never whether they suit each other.",
  fr: "Une carte de connexion range les canaux que deux personnes forment en quatre catégories\u202f: électromagnétique (une porte chacun), compagnonnage (le canal entier chez les deux), dominance (l’un l’a en entier, l’autre aucune porte) et compromis (l’un l’a en entier, l’autre une porte). Elles décrivent la façon dont deux personnes se rencontrent dans un thème, jamais si elles se conviennent.",
};

/** About the connection chart itself. */
export const HDP_ABOUT: Bi = {
  en: "A connection chart, Human Design’s name for two bodygraphs read together, shows what two people form between them: the channels each completes for the other, the centres one defines for the other, and what stays open. Human Design offers it as a way to notice how two people meet, not as a judgement of the relationship.",
  fr: "Une carte de connexion, le nom que le Human Design donne à deux bodygraphs lus ensemble, montre ce que deux personnes forment entre elles\u202f: les canaux que chacune complète pour l’autre, les centres que l’une définit pour l’autre, et ce qui reste ouvert. Le Human Design la propose pour remarquer la façon dont deux personnes se rencontrent, non pour juger la relation.",
};

/** A channel the two do not form. */
export const HDP_UNFORMED: { one: Bi; same: Bi; none: Bi } = {
  one: {
    en: "Not formed between you: {who} has gate {g}, and neither of you has gate {h}. The channel stays open between you, its other end left to someone else, or to a transit.",
    fr: "Non formé entre vous\u202f: {who} a la porte {g}, et aucun de vous n’a la porte {h}. Le canal reste ouvert entre vous, son autre extrémité laissée à quelqu’un d’autre, ou à un transit.",
  },
  same: {
    en: "Not formed between you: you both have gate {g}, and neither of you has gate {h}. The same half twice does not complete it.",
    fr: "Non formé entre vous\u202f: vous avez tous les deux la porte {g}, et aucun de vous n’a la porte {h}. La même moitié deux fois ne le complète pas.",
  },
  none: {
    en: "Neither of you activates this channel: it is open between you.",
    fr: "Aucun de vous n’active ce canal\u202f: il est ouvert entre vous.",
  },
};

/** Who activates a gate. */
export const HDP_GATE: { one: Bi; both: Bi; none: Bi; formed: Bi; loose: Bi } = {
  one: { en: "{who} activates it: {acts}.", fr: "{who} l’active\u202f: {acts}." },
  both: { en: "You both activate it: {a} with {actsA}, {b} with {actsB}.", fr: "Vous l’activez tous les deux\u202f: {a} avec {actsA}, {b} avec {actsB}." },
  none: { en: "Neither of you activates it.", fr: "Aucun de vous ne l’active." },
  formed: { en: "Between you it is part of {list}.", fr: "Entre vous, elle fait partie de {list}." },
  loose: { en: "It completes no channel between you.", fr: "Elle ne complète aucun canal entre vous." },
};

/** A centre's name with its article, and its theme in a few words. */
export const HDP_CENTRE: Record<HdCenterId, { the: Bi; The: Bi; theme: Bi }> = {
  head: { the: { en: "the Head", fr: "la Tête" }, The: { en: "The Head", fr: "La Tête" }, theme: { en: "inspiration and questions", fr: "l’inspiration et les questions" } },
  ajna: { the: { en: "the Ajna", fr: "l’Ajna" }, The: { en: "The Ajna", fr: "L’Ajna" }, theme: { en: "thinking things through", fr: "la réflexion" } },
  throat: { the: { en: "the Throat", fr: "la Gorge" }, The: { en: "The Throat", fr: "La Gorge" }, theme: { en: "speaking and acting", fr: "la parole et l’action" } },
  g: { the: { en: "the G centre", fr: "le centre G" }, The: { en: "The G centre", fr: "Le centre G" }, theme: { en: "identity and direction", fr: "l’identité et la direction" } },
  heart: { the: { en: "the Heart", fr: "le Cœur" }, The: { en: "The Heart", fr: "Le Cœur" }, theme: { en: "willpower and worth", fr: "la volonté et l’estime de soi" } },
  sacral: { the: { en: "the Sacral", fr: "le Sacral" }, The: { en: "The Sacral", fr: "Le Sacral" }, theme: { en: "life force and work", fr: "la force vitale et le travail" } },
  solarPlexus: {
    the: { en: "the Solar Plexus", fr: "le Plexus solaire" },
    The: { en: "The Solar Plexus", fr: "Le Plexus solaire" },
    theme: { en: "emotions in waves", fr: "les émotions en vagues" },
  },
  spleen: { the: { en: "the Spleen", fr: "la Rate" }, The: { en: "The Spleen", fr: "La Rate" }, theme: { en: "instinct, timing and wellbeing", fr: "l’instinct, le bon moment et le bien-être" } },
  root: { the: { en: "the Root", fr: "la Racine" }, The: { en: "The Root", fr: "La Racine" }, theme: { en: "pressure and drive", fr: "la pression et l’élan" } },
};

/** A centre between the two, in a word (the kicker of its reading). */
export const HDP_CENTRE_STATE: { both: Bi; one: Bi; together: Bi; open: Bi } = {
  both: { en: "Defined by both of you", fr: "Centre défini chez vous deux" },
  one: { en: "Defined by {who}, open for {other}", fr: "Centre défini chez {who}, ouvert chez {other}" },
  together: { en: "Defined only together", fr: "Centre défini seulement à deux" },
  open: { en: "Open between you", fr: "Centre ouvert entre vous" },
};

/** Both define a centre; neither does, but the two together. */
export const HDP_CENTRE_BOTH: Bi = {
  en: "You both define {the}. Each of you lives its theme ({theme}) steadily, in your own way: here neither takes it in from the other, and differences between you are two fixed ways side by side, easier to name than to smooth over.",
  fr: "Vous définissez tous les deux {the}. Chacun de vous en vit le thème ({theme}) de façon stable, à sa manière\u202f: ici, aucun ne le reçoit de l’autre, et vos différences sont deux façons fixes côte à côte, plus simples à nommer qu’à effacer.",
};
export const HDP_CENTRE_TOGETHER: Bi = {
  en: "{The} is defined in neither of you on your own, but between you it is, through {channels}. Its theme ({theme}) comes alive mostly when you are together: something the two of you make, which neither brings alone.",
  fr: "Chez aucun de vous {the} n’est un centre défini, mais entre vous c’en est un, grâce à {channels}. Son thème ({theme}) prend vie surtout quand vous êtes ensemble\u202f: quelque chose que vous faites à deux, que ni l’un ni l’autre n’apporte de son côté.",
};

/**
 * Conditioning, centre by centre: {giver} defines it and {receiver} has it
 * open (undefined), written for two, with what helps both.
 */
export const HDP_CONDITION: Record<HdCenterId, Bi> = {
  head: {
    en: "{giver} defines the Head and {receiver} has it open. {giver}’s questions and inspiration come at a steady rate, and around {giver}, {receiver}’s mind can fill with them, sometimes more intensely than {giver}’s own. Useful for both: {receiver} can enjoy the stimulus and still ask whether a question is really theirs to answer.",
    fr: "{giver} définit la Tête, que {receiver} a ouverte. Les questions et l’inspiration {deGiver} arrivent à un rythme régulier, et auprès {deGiver}, l’esprit {deReceiver} peut s’en remplir, parfois plus intensément que celui {deGiver}. Utile à tous les deux\u202f: {receiver} peut profiter de cette stimulation tout en se demandant si une question est vraiment la sienne.",
  },
  ajna: {
    en: "{giver} defines the Ajna and {receiver} has it open. {giver} has a fixed way of thinking things through; around {giver}, {receiver} takes that way in and may find themselves reasoning the same way, or feeling they must be as certain. Useful for both: {giver}’s method is one way among many, and {receiver}’s open mind is a strength, not something missing.",
    fr: "{giver} définit l’Ajna, que {receiver} a ouvert. {giver} a une façon fixe de réfléchir\u202f; auprès {deGiver}, {receiver} l’absorbe et peut se surprendre à raisonner de la même manière, ou à croire qu’il faut avoir autant de certitudes. Utile à tous les deux\u202f: la méthode {deGiver} est une façon parmi d’autres, et l’ouverture d’esprit {deReceiver} est une force, pas un manque.",
  },
  throat: {
    en: "{giver} defines the Throat and {receiver} has it open. {giver} has a consistent voice and a recognisable way of acting; around {giver}, {receiver} may speak more, or differently, and feel a pull to fill silences. Useful for both: leave {receiver} room to speak when the moment calls for it, rather than to keep pace.",
    fr: "{giver} définit la Gorge, que {receiver} a ouverte. {giver} a une voix constante et une façon d’agir reconnaissable\u202f; auprès {deGiver}, {receiver} peut parler davantage, ou autrement, et sentir l’envie de combler les silences. Utile à tous les deux\u202f: laisser à {receiver} la place de parler quand le moment s’y prête, plutôt que pour suivre le rythme.",
  },
  g: {
    en: "{giver} defines the G centre and {receiver} has it open. {giver} has a fixed sense of identity and direction; with {giver}, {receiver} can see more clearly where to go, and may borrow that direction. Useful for both: {receiver} can enjoy it and check, on their own, whether the direction is really theirs; the places you choose together count here.",
    fr: "{giver} définit le centre G, que {receiver} a ouvert. {giver} a un sens fixe de son identité et de sa direction\u202f; avec {giver}, {receiver} peut voir plus clairement où aller, et emprunter cette direction. Utile à tous les deux\u202f: {receiver} peut en profiter et vérifier, de son côté, si cette direction est vraiment la sienne\u202f; les lieux que vous choisissez ensemble comptent ici.",
  },
  heart: {
    en: "{giver} defines the Heart and {receiver} has it open. {giver} has steady willpower; around {giver}, {receiver} may feel driven to prove something, or to promise more than usual. Useful for both: {giver} can keep their own commitments without expecting the same force from {receiver}, and {receiver} has nothing to prove.",
    fr: "{giver} définit le Cœur, que {receiver} a ouvert. {giver} a une volonté constante\u202f; auprès {deGiver}, {receiver} peut ressentir le besoin de faire ses preuves, ou de promettre davantage qu’à son habitude. Utile à tous les deux\u202f: {giver} peut tenir ses propres engagements sans attendre la même force {deReceiver}, et {receiver} n’a rien à prouver.",
  },
  sacral: {
    en: "{giver} defines the Sacral and {receiver} has it open. {giver} has a steady life force for work and response; around {giver}, {receiver} can feel energised and do more than their own body would choose, then tire. Useful for both: {receiver} rests before being worn out, and {giver} remembers that {receiver}’s energy comes and goes.",
    fr: "{giver} définit le Sacral, que {receiver} a ouvert. {giver} a une force vitale constante pour le travail et la réponse\u202f; auprès {deGiver}, {receiver} peut sentir son énergie décupler et en faire plus que son corps ne le choisirait, puis se fatiguer. Utile à tous les deux\u202f: {receiver} se repose avant l’épuisement, et {giver} se souvient que l’énergie {deReceiver} va et vient.",
  },
  solarPlexus: {
    en: "{giver} defines the Solar Plexus and {receiver} has it open. {giver}’s emotions rise and fall in waves; {receiver} feels those waves, often amplified, and may take them for their own. Useful for both: {giver} can name the wave (“this is my mood, not about you”), and {receiver} can let it pass without needing to fix it.",
    fr: "{giver} définit le Plexus solaire, que {receiver} a ouvert. Les émotions {deGiver} montent et descendent en vagues\u202f; {receiver} les ressent, souvent amplifiées, et peut les prendre pour les siennes. Utile à tous les deux\u202f: {giver} peut nommer la vague («\u202fc’est mon humeur, pas toi\u202f»), et {receiver} peut la laisser passer sans chercher à la régler.",
  },
  spleen: {
    en: "{giver} defines the Spleen and {receiver} has it open. {giver} has a steady sense of instinct, timing and wellbeing; around {giver}, {receiver} can feel safer and better, and may want to hold on to that feeling, or to habits that no longer serve. Useful for both: {receiver} notices what does them good on their own as well as together.",
    fr: "{giver} définit la Rate, que {receiver} a ouverte. {giver} a un sens constant de l’instinct, du bon moment et du bien-être\u202f; auprès {deGiver}, {receiver} peut se sentir plus en sécurité et mieux, et vouloir garder ce sentiment, ou des habitudes qui ne servent plus. Utile à tous les deux\u202f: {receiver} remarque ce qui lui fait du bien de son côté comme à deux.",
  },
  root: {
    en: "{giver} defines the Root and {receiver} has it open. {giver} has a steady pressure to get things moving; {receiver} feels that pressure, often amplified, and may rush to be done. Useful for both: {receiver} can let the pressure pass rather than act on it, and {giver} can keep their pace without hurrying {receiver}.",
    fr: "{giver} définit la Racine, que {receiver} a ouverte. {giver} a une pression constante pour mettre les choses en mouvement\u202f; {receiver} la ressent, souvent amplifiée, et peut se presser d’en finir. Utile à tous les deux\u202f: {receiver} peut laisser passer la pression au lieu d’y répondre, et {giver} peut garder son rythme sans presser {receiver}.",
  },
};

/** Conditioning in general, and when one person's definition meets nothing open in the other. */
export const HDP_CONDITIONING: { what: Bi; none: Bi } = {
  what: {
    en: "Where {giver} defines a centre that {receiver} has open, {receiver} takes in {giver}’s steady way there, often amplified: Human Design calls this conditioning. It is how two people learn from each other; it helps {receiver} to know which feelings come from {giver}, and {giver} to know they are felt more strongly than they show.",
    fr: "Là où {giver} définit un centre que {receiver} a ouvert, {receiver} reçoit la façon constante {deGiver}, souvent amplifiée\u202f: le Human Design appelle cela le conditionnement. C’est ainsi que deux personnes apprennent l’une de l’autre\u202f; il est utile à {receiver} de savoir quels ressentis viennent {deGiver}, et à {giver} de savoir qu’ils sont ressentis plus fort qu’ils ne paraissent.",
  },
  none: {
    en: "No centre {giver} defines is open in {receiver}: here, {giver}’s definition does not condition {receiver}’s.",
    fr: "Aucun centre que {giver} définit n’est ouvert chez {receiver}\u202f: ici, la définition {deGiver} ne conditionne pas celle {deReceiver}.",
  },
};

/** The open ground: the centres nothing between the two defines. */
export const HDP_OPEN: { what: Bi; none: Bi } = {
  what: {
    en: "The centres no channel between you defines are the open ground of your relationship: there, the world around you (friends, family, the place, the day) comes in and shapes how the two of you feel. Human Design sees this as room more than a lack.",
    fr: "Les centres qu’aucun canal entre vous ne définit sont le terrain ouvert de votre relation\u202f: là, le monde autour de vous (amis, famille, lieu, journée) entre et colore ce que vous ressentez à deux. Le Human Design y voit de l’espace plutôt qu’un manque.",
  },
  none: {
    en: "No centre is open between you: every one is defined in your connection. Human Design says such a pair can feel self-contained; time with others brings in fresh air.",
    fr: "Aucun centre n’est ouvert entre vous\u202f: tous sont définis dans votre connexion. Le Human Design dit qu’un tel duo peut se suffire à lui-même\u202f; du temps avec d’autres apporte de l’air frais.",
  },
};

/** Each centre open between the two. */
export const HDP_OPEN_CENTRE: Record<HdCenterId, Bi> = {
  head: {
    en: "The Head is open between you: neither of you defines it, and nothing you form does. Questions and inspiration reach you both from outside, from friends, books or the day’s news. Between you there is little pressure to figure things out, which can be restful; you may find you think most together after time with others.",
    fr: "La Tête est ouverte entre vous\u202f: aucun de vous ne la définit, et rien de ce que vous formez non plus. Les questions et l’inspiration vous viennent du dehors, des amis, des livres ou de l’actualité. Entre vous, peu de pression pour tout comprendre, ce qui peut reposer\u202f; vous remarquerez peut-être que vous réfléchissez le mieux ensemble après du temps passé avec d’autres.",
  },
  ajna: {
    en: "The Ajna is open between you: no fixed way of thinking holds sway. You can explore ideas freely and change your minds; certainty, when you need it, tends to come from outside, or from time.",
    fr: "L’Ajna est ouvert entre vous\u202f: aucune façon fixe de penser ne domine. Vous pouvez explorer les idées librement et changer d’avis\u202f; la certitude, quand il vous en faut, vient plutôt du dehors, ou du temps.",
  },
  throat: {
    en: "The Throat is open between you. Speaking and acting take their cue from the moment and from others; silences between you are natural, and an outside voice or project often gets you both moving.",
    fr: "La Gorge est ouverte entre vous. La parole et l’action prennent leur élan dans le moment et chez les autres\u202f; les silences entre vous sont naturels, et une voix ou un projet du dehors vous met souvent en mouvement tous les deux.",
  },
  g: {
    en: "The G centre is open between you. Your sense of direction as two comes from the places and the people around you: the right surroundings matter to you both, and choosing them together is a good habit.",
    fr: "Le centre G est ouvert entre vous. Votre sens de la direction à deux vient des lieux et des personnes qui vous entourent\u202f: le bon environnement compte pour vous deux, et le choisir ensemble est une bonne habitude.",
  },
  heart: {
    en: "The Heart is open between you: there is nothing to prove between you. Promises are best kept small and real, and questions of work or money do well with an outside rhythm.",
    fr: "Le Cœur est ouvert entre vous\u202f: il n’y a rien à prouver entre vous. Mieux vaut des promesses modestes et réelles, et les questions de travail ou d’argent gagnent à suivre un rythme venu du dehors.",
  },
  sacral: {
    en: "The Sacral is open between you: no steady work energy is held between you. Rest matters for you both; you may take on other people’s energy when together, and a plan that leaves room to stop serves you both.",
    fr: "Le Sacral est ouvert entre vous\u202f: aucune énergie de travail constante n’est tenue entre vous. Le repos compte pour vous deux\u202f; ensemble, vous pouvez prendre l’énergie des autres, et un projet qui laisse la place de s’arrêter vous sert tous les deux.",
  },
  solarPlexus: {
    en: "The Solar Plexus is open between you: between you there is emotional calm, and the moods of others can sweep through you both. Noticing whose feeling it is helps.",
    fr: "Le Plexus solaire est ouvert entre vous\u202f: entre vous règne un calme émotionnel, et les humeurs des autres peuvent vous traverser tous les deux. Remarquer à qui appartient un sentiment aide.",
  },
  spleen: {
    en: "The Spleen is open between you: instinct and timing are open ground. Habits of wellbeing are worth deciding together, and letting go of what no longer serves can be easier as two.",
    fr: "La Rate est ouverte entre vous\u202f: l’instinct et le bon moment sont un terrain ouvert. Les habitudes de bien-être gagnent à être décidées ensemble, et lâcher ce qui ne sert plus peut être plus facile à deux.",
  },
  root: {
    en: "The Root is open between you: no shared pressure pushes you. Deadlines and stress come from outside, and you can choose together which ones to answer.",
    fr: "La Racine est ouverte entre vous\u202f: aucune pression commune ne vous pousse. Les échéances et le stress viennent du dehors, et vous pouvez choisir ensemble ceux auxquels répondre.",
  },
};

/** The pair's definition, read for two. */
export const HDP_DEFINITION_TEXT: Record<HdDefinition, Bi> = {
  None: {
    en: "No channel forms between you, so your connection chart has no definition of its own: what you share comes from each of you and from the people and places around you.",
    fr: "Aucun canal ne se forme entre vous\u202f: votre carte de connexion n’a donc pas de définition propre, et ce que vous partagez vient de chacun de vous et des personnes et des lieux qui vous entourent.",
  },
  Single: {
    en: "Between you, every defined centre joins one connected whole: a single definition. Human Design reads it as a connection where, together, nothing seems to be missing in the flow from one theme to the next.",
    fr: "Entre vous, tous les centres définis forment un seul ensemble relié\u202f: une définition simple. Le Human Design y lit une connexion où, ensemble, rien ne semble manquer dans le passage d’un thème à l’autre.",
  },
  Split: {
    en: "Between you, the defined centres form two groups that no channel joins: a split definition. You may feel the gap between those two themes; a third person, a transit or simply time can bridge it.",
    fr: "Entre vous, les centres définis forment deux groupes qu’aucun canal ne relie\u202f: une définition double. Vous pouvez sentir l’écart entre ces deux thèmes\u202f; une troisième personne, un transit ou simplement le temps peuvent faire le pont.",
  },
  "Triple split": {
    en: "Between you, the defined centres form three separate groups: a triple split. Your connection tends to come together over time, and with other people around.",
    fr: "Entre vous, les centres définis forment trois groupes séparés\u202f: une triple définition. Votre connexion se rassemble plutôt avec le temps, et avec d’autres personnes autour de vous.",
  },
  "Quadruple split": {
    en: "Between you, the defined centres form four separate groups, a quadruple split, rare for two people: the parts of your connection meet slowly, and need no rush.",
    fr: "Entre vous, les centres définis forment quatre groupes séparés, une quadruple définition, rare pour deux personnes\u202f: les parties de votre connexion se rejoignent lentement, sans qu’il faille se presser.",
  },
};

/** What the other's gates join of a split definition. */
export const HDP_BRIDGE: { joined: Bi; partly: Bi; apart: Bi; gatesOf: Bi; short: Bi } = {
  joined: {
    en: "{who}’s own definition is in {parts} parts, and with {other} they join up, bridged by {gates} ({channels}). Human Design notes that someone whose definition is split often feels more whole beside a person who bridges it: a pull worth knowing as such.",
    fr: "La définition propre {deWho} est en {parts} parties, et avec {other} elles se rejoignent, reliées par {gates} ({channels}). Le Human Design remarque qu’une personne à la définition partagée se sent souvent plus entière auprès de quelqu’un qui fait le pont\u202f: une attirance bonne à connaître comme telle.",
  },
  partly: {
    en: "{who}’s own definition is in {parts} parts; with {other}, {apart} groups remain, some of them bridged by {gates} ({channels}).",
    fr: "La définition propre {deWho} est en {parts} parties\u202f; avec {other}, il en reste {apart}, certaines reliées par {gates} ({channels}).",
  },
  apart: {
    en: "{who}’s own definition is in {parts} parts, and {other}’s gates do not bridge them: they keep their own way of coming together, through time and other people.",
    fr: "La définition propre {deWho} est en {parts} parties, et les portes {deOther} ne font pas le pont\u202f: elles gardent leur propre façon de se rejoindre, avec le temps et d’autres personnes.",
  },
  /** "Sample B’s gate 62", "la porte 62 de Sample B". */
  gatesOf: { en: "{name}’s {gates}", fr: "{gates} {deName}" },
  short: { en: "{who}’s split is bridged by {gates}.", fr: "La définition partagée {deWho} est reliée par {gates}." },
};

/** The connection theme: centres defined and open between the two. */
export const HDP_THEME: { what: Bi; full: Bi } = {
  what: {
    en: "Your connection theme is {defined}–{open}: the centres defined between you, then those left open, where the world around you comes in.",
    fr: "Votre thème de connexion est {defined}–{open}\u202f: les centres définis entre vous, puis ceux qui restent ouverts, par où le monde autour de vous entre.",
  },
  full: {
    en: "With no centre open between you, Human Design says the two of you can feel self-contained; time with others brings in fresh air.",
    fr: "Sans aucun centre ouvert entre vous, le Human Design dit que vous pouvez vous suffire à vous-mêmes\u202f; du temps avec d’autres apporte de l’air frais.",
  },
};

/** A definition in a sentence: "with a split definition", « avec une définition double ». */
export const HDP_DEFINITION_PHRASE: Record<HdDefinition, Bi> = {
  None: { en: "with no definition", fr: "sans définition" },
  Single: { en: "with a single definition", fr: "avec une définition simple" },
  Split: { en: "with a split definition", fr: "avec une définition double" },
  "Triple split": { en: "with a triple split definition", fr: "avec une triple définition" },
  "Quadruple split": { en: "with a quadruple split definition", fr: "avec une quadruple définition" },
};

/** One person's bodygraph as the pair reads it. */
export const HDP_PERSON: { who: Bi; defines: Bi; definesNone: Bi; brings: Bi; bringsNone: Bi } = {
  who: {
    en: "{name} is a {type}, profile {profile}, {definition}.",
    fr: "{name} est de type {type}, de profil {profile}, {definition}.",
  },
  defines: { en: "On their own, {name} defines {centres}.", fr: "De son côté, {name} définit {centres}." },
  definesNone: {
    en: "On their own, {name} defines no centre, as a Reflector: every centre is open, and {name} samples {other}’s definition.",
    fr: "De son côté, {name} ne définit aucun centre, comme un Réflecteur\u202f: tous ses centres sont ouverts, et {name} goûte à la définition {deOther}.",
  },
  brings: {
    en: "Between you, {name} brings the whole of {list}.",
    fr: "Entre vous, {name} apporte en entier {list}.",
  },
  bringsNone: { en: "Between you, {name} brings no whole channel: only gates.", fr: "Entre vous, {name} n’apporte aucun canal entier\u202f: seulement des portes." },
};

/** Words the builder puts sentences together with. */
export const HDP_WORDS: {
  and: Bi;
  more: Bi;
  gateOne: Bi;
  gateMany: Bi;
  channelOne: Bi;
  channelMany: Bi;
  channelNone: Bi;
  kindCount: Record<HdPairKind, { one: Bi; many: Bi }>;
  leads: Bi;
  between: Bi;
  theChannel: Bi;
  theGate: Bi;
  theCentre: Bi;
  whoBrings: Bi;
  bridges: Bi;
  theme: Bi;
  ofKind: Bi;
  noneOfKind: Bi;
  kindWord: Bi;
  centresWord: Bi;
  stateWord: Bi;
  aboutKinds: Bi;
  aboutChart: Bi;
  aboutConditioning: Bi;
  aboutOpen: Bi;
  whole: Bi;
  uncertain: Bi;
  unknownTitle: Bi;
  conditionTitle: Bi;
  openTitle: Bi;
  definitionTitle: Bi;
  summaryTitle: Bi;
  summary: Bi;
  summaryNone: Bi;
  notFormed: Bi;
} = {
  and: { en: " and ", fr: " et " },
  more: { en: "and {n} more", fr: "et {n} autres" },
  gateOne: { en: "gate {list}", fr: "la porte {list}" },
  gateMany: { en: "gates {list}", fr: "les portes {list}" },
  channelOne: { en: "1 channel", fr: "1 canal" },
  channelMany: { en: "{n} channels", fr: "{n} canaux" },
  channelNone: { en: "no channel", fr: "aucun canal" },
  kindCount: {
    electromagnetic: { one: { en: "{n} electromagnetic", fr: "{n} électromagnétique" }, many: { en: "{n} electromagnetic", fr: "{n} électromagnétiques" } },
    companionship: { one: { en: "{n} of companionship", fr: "{n} en compagnonnage" }, many: { en: "{n} of companionship", fr: "{n} en compagnonnage" } },
    dominance: { one: { en: "{n} of dominance", fr: "{n} en dominance" }, many: { en: "{n} of dominance", fr: "{n} en dominance" } },
    compromise: { one: { en: "{n} of compromise", fr: "{n} en compromis" }, many: { en: "{n} of compromise", fr: "{n} en compromis" } },
  },
  leads: { en: "{name} leads: {list}", fr: "{name} mène\u202f: {list}" },
  between: { en: "Between you", fr: "Entre vous" },
  theChannel: { en: "The channel", fr: "Le canal" },
  theGate: { en: "The gate", fr: "La porte" },
  theCentre: { en: "The centre", fr: "Le centre" },
  whoBrings: { en: "Who brings what", fr: "Qui apporte quoi" },
  bridges: { en: "Bridges", fr: "Les ponts" },
  theme: { en: "Connection theme", fr: "Thème de connexion" },
  ofKind: { en: "Channels of this kind", fr: "Les canaux de cette nature" },
  noneOfKind: { en: "No channel between you is of this kind.", fr: "Aucun canal entre vous n’est de cette nature." },
  kindWord: { en: "Kind", fr: "Nature" },
  centresWord: { en: "Centres", fr: "Centres" },
  stateWord: { en: "Between you", fr: "Entre vous" },
  aboutKinds: { en: "About the four kinds", fr: "À propos des quatre catégories" },
  aboutChart: { en: "About the connection chart", fr: "À propos de la carte de connexion" },
  aboutConditioning: { en: "About conditioning", fr: "À propos du conditionnement" },
  aboutOpen: { en: "About open centres", fr: "À propos des centres ouverts" },
  whole: { en: "whole", fr: "en entier" },
  uncertain: {
    en: "Without a birth time for one of you, this could be another kind, or not formed, at another hour of that day.",
    fr: "Sans heure de naissance pour l’un de vous, ce pourrait être une autre nature, ou ne pas se former, à une autre heure de ce jour-là.",
  },
  unknownTitle: { en: "Without a birth time", fr: "Sans heure de naissance" },
  conditionTitle: { en: "Where {giver} conditions {receiver}", fr: "Là où {giver} conditionne {receiver}" },
  openTitle: { en: "Open between you", fr: "Ouvert entre vous" },
  definitionTitle: { en: "Definition together · {definition}", fr: "Définition à deux · {definition}" },
  summaryTitle: { en: "The two of you", fr: "Vous deux" },
  summary: {
    en: "Between you: {channels} ({kinds}). Your connection defines {defined} of the nine centres ({theme}), {definition}.",
    fr: "Entre vous\u202f: {channels} ({kinds}). Votre connexion définit {defined} des neuf centres ({theme}), {definition}.",
  },
  summaryNone: {
    en: "No channel forms between you: every centre is open in your connection, and each of you brings only their own definition.",
    fr: "Aucun canal ne se forme entre vous\u202f: tous les centres sont ouverts dans votre connexion, et chacun n’apporte que sa propre définition.",
  },
  notFormed: { en: "not formed", fr: "non formé" },
};

/** The first read, in the side panel with nothing chosen. */
export const HDP_FIRST: { lead: Bi; summary: Bi; condition: Bi; conditionNone: Bi; openShort: Bi; openNone: Bi; next: Bi; kindNone: Bi } = {
  lead: {
    en: "One bodygraph for the two of you: what your gates complete together, what one brings to the other’s open centres, and what stays open between you.",
    fr: "Un seul bodygraph pour vous deux\u202f: ce que vos portes complètent ensemble, ce que l’un apporte aux centres ouverts de l’autre, et ce qui reste ouvert entre vous.",
  },
  summary: {
    en: "{channels} between you, {defined} of the nine centres defined in your connection.",
    fr: "{channels} entre vous, {defined} des neuf centres définis dans votre connexion.",
  },
  condition: {
    en: "Centres {giver} defines and {receiver} has open: {receiver} takes them in, often amplified.",
    fr: "Les centres que {giver} définit et que {receiver} a ouverts\u202f: {receiver} les reçoit, souvent amplifiés.",
  },
  conditionNone: {
    en: "None: {giver}’s definition meets no open centre in {receiver}.",
    fr: "Aucun\u202f: la définition {deGiver} ne rencontre aucun centre ouvert chez {receiver}.",
  },
  openShort: { en: "Where the world around you comes in.", fr: "Par où le monde autour de vous entre." },
  openNone: { en: "None: every centre is defined between you.", fr: "Aucun\u202f: tous les centres sont définis entre vous." },
  next: {
    en: "Then the chart itself: choose any channel, centre or gate to read what it is between you.",
    fr: "Puis le schéma lui-même\u202f: choisissez un canal, un centre ou une porte pour lire ce qu’il est entre vous.",
  },
  kindNone: { en: "None between you.", fr: "Aucun entre vous." },
};

/** "How Ulune reads a connection chart": what it is and what it is not (the method notes, folded). */
export const HDP_METHOD: Bi[] = [
  {
    en: "A connection chart lays two bodygraphs over each other: each person’s gates from both layers, Personality and Design, and the channels and centres they define between them.",
    fr: "Une carte de connexion superpose deux bodygraphs\u202f: les portes de chaque personne, de ses deux couches, Personnalité et Design, et les canaux et les centres qu’elles définissent entre elles.",
  },
  {
    en: "Each channel between you is one of four kinds, by Ra Uru Hu’s rules: electromagnetic (one gate each), companionship (both have it whole), dominance (one has it whole, the other neither gate) and compromise (one has it whole, the other one gate).",
    fr: "Chaque canal entre vous relève de l’une des quatre catégories, selon les règles de Ra Uru Hu\u202f: électromagnétique (une porte chacun), compagnonnage (le canal entier chez les deux), dominance (l’un l’a en entier, l’autre aucune porte) et compromis (l’un l’a en entier, l’autre une porte).",
  },
  {
    en: "It reads dynamics, not verdicts: no channel or centre makes two people right or wrong for each other, and nothing here says how a relationship will go.",
    fr: "Elle lit des dynamiques, pas des verdicts\u202f: aucun canal ni aucun centre ne rend deux personnes faites ou non l’une pour l’autre, et rien ici ne dit comment une relation se passera.",
  },
  {
    en: "It is not a third person’s chart: no type, strategy or authority belongs to the pair, and each of you keeps your own.",
    fr: "Ce n’est pas le schéma d’une troisième personne\u202f: aucun type, aucune stratégie ni aucune autorité n’appartient au duo, et chacun de vous garde les siens.",
  },
  {
    en: "Both bodygraphs are calculated as each one is on its own page (on your device, by default); for a birth without a time, what could differ at another hour of that day is marked ~. It reads two people; Human Design’s reading of a group of three to five is another one.",
    fr: "Les deux bodygraphs sont calculés comme chacun l’est sur sa propre page (sur votre appareil, par défaut)\u202f; pour une naissance sans heure, ce qui pourrait changer à une autre heure de ce jour-là est marqué ~. Elle lit deux personnes\u202f; la lecture d’un groupe de trois à cinq, en Human Design, en est une autre.",
  },
];

/** The method notes' title. */
export const HDP_METHOD_TITLE: Bi = { en: "How Ulune reads a connection chart", fr: "Comment Ulune lit une carte de connexion" };
