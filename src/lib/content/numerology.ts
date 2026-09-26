import type { Bi } from "./types";

/**
 * Numerology reference texts (Pythagorean system, A=1 … I=9, masters 11/22/33).
 * General number texts are written in neutral third person; cycle texts
 * (Personal Year / Month / Day) address the reader directly.
 */

export type NumberKey = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 11 | 22 | 33;

export type NumberText = {
  /** 3–5 comma-separated keywords. */
  keywords: Bi;
  /** What the number stands for, with its traditional associations. */
  what: Bi;
  strengths: Bi;
  /** Honest but kind. */
  pitfalls: Bi;
  /** A concrete everyday example. */
  example: Bi;
};

export const NUMBER_TEXT: Record<NumberKey, NumberText> = {
  1: {
    keywords: {
      en: "independence, initiative, beginnings, self-reliance",
      fr: "indépendance, initiative, commencement, autonomie",
    },
    what: {
      en: "1 is the first number, the unit every other number is built from, so numerology links it to beginnings, will and the individual. It stands for acting on one’s own judgement: starting, deciding, standing apart when needed. A strong 1 points to someone who learns by doing things first and alone rather than waiting for permission.",
      fr: "Le 1 est le premier nombre, l’unité dont tous les autres sont faits ; la numérologie l’associe donc au commencement, à la volonté et à l’individu. Il représente le fait d’agir selon son propre jugement : lancer, trancher, se démarquer quand il le faut. Un 1 marqué désigne une personne qui apprend en agissant la première, et seule, plutôt qu’en attendant qu’on l’y autorise.",
    },
    strengths: {
      en: "Takes the initiative without being asked, decides quickly and holds a direction under pressure. Often good at starting the projects, businesses or habits that others only talk about.",
      fr: "Prend l’initiative sans qu’on le lui demande, décide vite et garde le cap sous la pression. Souvent doué pour lancer les projets, les entreprises ou les habitudes dont les autres se contentent de parler.",
    },
    pitfalls: {
      en: "Can confuse independence with doing everything alone, and hear advice as interference. Impatience with slower people is common. What helps: asking for input before the decision, not after it.",
      fr: "Peut confondre indépendance et tout faire seul, et prendre un conseil pour une ingérence. L’impatience envers les plus lents est fréquente. Ce qui aide : demander l’avis des autres avant de décider, pas après.",
    },
    example: {
      en: "At work, a 1 is often the person drafting a plan while the meeting is still debating whether a plan is needed. At home, the same trait looks like rearranging the whole flat without mentioning it first.",
      fr: "Au travail, le 1 est souvent celui qui rédige un plan pendant que la réunion se demande encore s’il en faut un. À la maison, le même trait consiste à réaménager tout l’appartement sans avoir prévenu personne.",
    },
  },
  2: {
    keywords: {
      en: "cooperation, sensitivity, partnership, diplomacy",
      fr: "coopération, sensibilité, association, diplomatie",
    },
    what: {
      en: "2 is the first pair, and it stands for relationship: two sides, two people and what happens between them. Numerology links it to cooperation, tact and receptiveness — noticing what others feel and adjusting to it. A 2 tends to work best in partnership, and its influence is often quiet: mediating, supporting and holding the details together rather than leading from the front.",
      fr: "Le 2 est la première paire, et il représente la relation : deux côtés, deux personnes et ce qui se passe entre elles. La numérologie l’associe à la coopération, au tact et à la réceptivité — percevoir ce que ressentent les autres et s’y ajuster. Un 2 donne souvent le meilleur de lui-même à deux, et son influence est discrète : il arbitre, soutient et tient les détails ensemble plutôt que de mener de front.",
    },
    strengths: {
      en: "Reads moods and undercurrents accurately, listens well and finds the compromise both sides can accept. Patient with detail and reliable in a supporting role.",
      fr: "Perçoit avec justesse les humeurs et les non-dits, écoute bien et trouve le compromis que chacun peut accepter. Patient avec les détails et fiable dans un rôle de soutien.",
    },
    pitfalls: {
      en: "Can avoid conflict for so long that resentment builds, or take criticism more personally than it was meant. Saying what it wants, early and plainly, usually works better than hinting.",
      fr: "Peut éviter le conflit si longtemps que la rancœur s’installe, ou prendre une critique plus personnellement qu’elle n’était voulue. Dire ce qu’il veut, tôt et clairement, marche en général mieux que les allusions.",
    },
    example: {
      en: "Two colleagues are arguing over a deadline. The 2 in the room notices that one of them is really worried about quality, not time, says so gently, and the argument is settled in ten minutes.",
      fr: "Deux collègues se disputent sur une échéance. Le 2 présent dans la pièce remarque que l’un d’eux s’inquiète en réalité de la qualité, pas du délai, le dit avec douceur, et le désaccord se règle en dix minutes.",
    },
  },
  3: {
    keywords: {
      en: "expression, creativity, sociability, communication, joy",
      fr: "expression, créativité, sociabilité, communication, joie",
    },
    what: {
      en: "3 is the first number with a beginning, a middle and an end, which is why many traditions treat it as a small complete whole. In numerology it stands for self-expression: words, humour, art and social ease. A 3 tends to think out loud, and feels most like itself when making something or sharing an idea with an audience.",
      fr: "Le 3 est le premier nombre qui ait un début, un milieu et une fin, et c’est pourquoi de nombreuses traditions y voient un petit tout achevé. En numérologie, il représente l’expression de soi : les mots, l’humour, l’art, l’aisance en société. Un 3 pense volontiers à voix haute, et se sent pleinement lui-même quand il crée quelque chose ou partage une idée devant un public.",
    },
    strengths: {
      en: "Communicates easily, lightens a tense room, and turns ideas into something others can see or hear: a story, a design, a talk, a meal.",
      fr: "Communique facilement, détend une atmosphère lourde et transforme les idées en quelque chose que les autres peuvent voir ou entendre : un récit, un dessin, une conférence, un repas.",
    },
    pitfalls: {
      en: "Spreads attention across too many projects and finishes few of them. Can use charm or jokes to dodge a serious conversation. A short list of priorities and one finished piece at a time help.",
      fr: "Disperse son attention sur trop de projets et en termine peu. Peut se servir du charme ou de l’humour pour esquiver une conversation sérieuse. Une courte liste de priorités, et une chose terminée à la fois, l’aident beaucoup.",
    },
    example: {
      en: "A 3 starts a group chat to plan a friend’s birthday. Within a day there is a theme, a playlist and three ideas nobody asked for — and the invitation still has not gone out.",
      fr: "Un 3 crée un groupe de discussion pour organiser l’anniversaire d’une amie. En une journée, il y a un thème, une playlist et trois idées que personne n’a demandées — et l’invitation n’est toujours pas partie.",
    },
  },
  4: {
    keywords: {
      en: "structure, work, stability, method, reliability",
      fr: "structure, travail, stabilité, méthode, fiabilité",
    },
    what: {
      en: "4 is the number of the square: four sides, four seasons, four directions. Numerology links it to foundations, order and effort. It stands for building things that last through method and patience — budgets, routines, systems, craft. A 4 tends to trust what can be checked and measured, and prefers a slow, sure result to a fast, risky one.",
      fr: "Le 4 est le nombre du carré : quatre côtés, quatre saisons, quatre points cardinaux. La numérologie l’associe aux fondations, à l’ordre et à l’effort. Il représente ce qui se construit pour durer, avec méthode et patience — budgets, routines, systèmes, savoir-faire. Un 4 fait confiance à ce qui se vérifie et se mesure, et préfère un résultat lent et sûr à un résultat rapide et risqué.",
    },
    strengths: {
      en: "Dependable, organised and thorough. Finishes what it starts, keeps its promises, and is often the one who knows where the documents are and how the process actually works.",
      fr: "Fiable, organisé et minutieux. Termine ce qu’il commence, tient parole, et c’est souvent lui qui sait où sont les papiers et comment la procédure fonctionne vraiment.",
    },
    pitfalls: {
      en: "Can become rigid and resist changes that would genuinely help, or judge its own worth only by hours worked. Leaving room in the plan for rest and surprises makes it stronger, not weaker.",
      fr: "Peut se rigidifier et refuser des changements qui aideraient vraiment, ou mesurer sa valeur aux seules heures travaillées. Prévoir dans le plan une place pour le repos et l’imprévu le rend plus solide, pas plus faible.",
    },
    example: {
      en: "When a family moves house, the 4 is the one with the spreadsheet: boxes numbered by room, electricity transferred on the right date, and a spare set of keys already cut.",
      fr: "Quand une famille déménage, le 4 est celui qui a le tableur : cartons numérotés par pièce, électricité transférée à la bonne date, et un double des clés déjà fait.",
    },
  },
  5: {
    keywords: {
      en: "freedom, change, curiosity, adaptability",
      fr: "liberté, changement, curiosité, adaptabilité",
    },
    what: {
      en: "5 sits in the middle of the digits 1 to 9 and is linked to the five senses, so numerology associates it with experience, movement and change. It stands for freedom: travel, variety, new people, learning by trying. A 5 tends to adapt quickly and grows restless when life becomes too predictable or too tightly controlled.",
      fr: "Le 5 se trouve au milieu des chiffres de 1 à 9 et renvoie aux cinq sens ; la numérologie l’associe donc à l’expérience, au mouvement et au changement. Il représente la liberté : voyager, varier, rencontrer, apprendre en essayant. Un 5 s’adapte vite et devient impatient quand la vie devient trop prévisible ou trop encadrée.",
    },
    strengths: {
      en: "Adaptable, quick-witted and at ease with strangers. Handles sudden change better than most, and brings back ideas and contacts from outside the usual circle.",
      fr: "Souple, vif d’esprit et à l’aise avec les inconnus. Encaisse les changements soudains mieux que la plupart, et rapporte des idées et des contacts venus d’en dehors du cercle habituel.",
    },
    pitfalls: {
      en: "Can drop commitments once they turn routine, or chase stimulation — spending, food, new plans — to escape boredom. Building variety into a commitment usually works better than leaving it.",
      fr: "Peut lâcher un engagement dès qu’il devient routinier, ou chercher la stimulation — dépenses, nourriture, nouveaux projets — pour fuir l’ennui. Introduire de la variété dans un engagement marche en général mieux que d’en sortir.",
    },
    example: {
      en: "A 5 who feels stuck in a job may not need a new one. Changing teams, taking on a project that involves travel, or learning a skill on the side often brings the interest back.",
      fr: "Un 5 qui se sent coincé dans son poste n’a pas forcément besoin d’en changer. Passer dans une autre équipe, prendre un projet qui fait voyager ou apprendre une compétence à côté suffit souvent à raviver l’intérêt.",
    },
  },
  6: {
    keywords: {
      en: "responsibility, care, home, harmony, service",
      fr: "responsabilité, soin, foyer, harmonie, service",
    },
    what: {
      en: "6 is the first perfect number — 1, 2 and 3 divide it and also add up to it — and numerology links it to balance and harmony. It stands for responsibility towards others: family, home, community and beauty in everyday surroundings. A 6 tends to feel accountable for the people nearby and is often the one others turn to when something needs fixing.",
      fr: "Le 6 est le premier nombre parfait — 1, 2 et 3 le divisent et, additionnés, le redonnent — et la numérologie l’associe à l’équilibre et à l’harmonie. Il représente la responsabilité envers les autres : la famille, le foyer, la communauté, la beauté du cadre quotidien. Un 6 se sent responsable de son entourage, et c’est souvent vers lui qu’on se tourne quand quelque chose est à réparer.",
    },
    strengths: {
      en: "Caring, loyal and steady in a crisis. Creates a welcoming home or team, notices who is being left out, and takes on responsibility without needing to be asked.",
      fr: "Attentionné, loyal et solide dans les moments difficiles. Crée un foyer ou une équipe où l’on se sent bien, remarque qui est mis à l’écart, et prend ses responsabilités sans qu’on ait à le lui demander.",
    },
    pitfalls: {
      en: "Can over-give and then feel unappreciated, or offer help nobody requested and call it care. Asking \"what do you need?\" before stepping in prevents much of this.",
      fr: "Peut trop donner puis se sentir mal aimé, ou apporter une aide que personne n’a demandée en l’appelant sollicitude. Demander « De quoi avez-vous besoin ? » avant d’intervenir évite une bonne partie de ces malentendus.",
    },
    example: {
      en: "Among friends, the 6 remembers every birthday, brings soup when someone is ill, and quietly pays to repair the shared washing machine — then feels hurt when nobody mentions it.",
      fr: "Dans un groupe d’amis, le 6 se souvient de chaque anniversaire, apporte de la soupe quand quelqu’un est malade et paie discrètement la réparation de la machine à laver commune — puis se sent blessé que personne n’en parle.",
    },
  },
  7: {
    keywords: {
      en: "analysis, introspection, knowledge, solitude, faith",
      fr: "analyse, introspection, connaissance, solitude, foi",
    },
    what: {
      en: "7 carries weight in many traditions: seven days of the week, seven classical planets, seven notes of the scale. In numerology it stands for the search for understanding — study, analysis and spiritual questioning. A 7 tends to need time alone to think, trusts what it has examined for itself, and prefers depth to breadth in ideas and friendships alike.",
      fr: "Le 7 occupe une place à part dans de nombreuses traditions : sept jours de la semaine, sept planètes classiques, sept notes de la gamme. En numérologie, il représente la quête de compréhension — l’étude, l’analyse, le questionnement spirituel. Un 7 a besoin de temps seul pour réfléchir, se fie à ce qu’il a examiné lui-même, et préfère la profondeur à l’étendue, dans les idées comme dans les amitiés.",
    },
    strengths: {
      en: "Observant, analytical and hard to fool. Asks the question beneath the question, researches thoroughly, and often builds real expertise or a well-considered inner life.",
      fr: "Observateur, analytique et difficile à duper. Pose la question qui se cache sous la question, se documente à fond, et développe souvent une véritable expertise ou une vie intérieure mûrement réfléchie.",
    },
    pitfalls: {
      en: "Can withdraw so far that others read it as coldness, or distrust whatever it cannot prove. Sharing half-formed thoughts with one trusted person helps keep isolation at bay.",
      fr: "Peut se retirer au point de paraître froid, ou se méfier de tout ce qu’il ne peut pas prouver. Partager des idées encore inabouties avec une personne de confiance l’aide à ne pas s’isoler.",
    },
    example: {
      en: "Before buying a laptop, a 7 reads the technical reviews, compares benchmarks and an old forum thread, then explains to friends why the popular model is not actually the best one.",
      fr: "Avant d’acheter un ordinateur portable, un 7 lit les tests techniques, compare les performances et un vieux fil de forum, puis explique à ses amis pourquoi le modèle à la mode n’est pas vraiment le meilleur.",
    },
  },
  8: {
    keywords: {
      en: "ambition, authority, money, achievement",
      fr: "ambition, autorité, argent, réussite",
    },
    what: {
      en: "8 is the first cube (2 × 2 × 2), and its symmetrical shape is often read as a balance between the material world and the inner one. In numerology it stands for power used in practical life: career, money, management, results. An 8 tends to think in terms of goals and resources, and is at ease with responsibility and large decisions.",
      fr: "Le 8 est le premier cube (2 × 2 × 2), et sa forme symétrique est souvent lue comme un équilibre entre le monde matériel et le monde intérieur. En numérologie, il représente le pouvoir exercé dans la vie concrète : carrière, argent, gestion, résultats. Un 8 raisonne en objectifs et en moyens, et se sent à l’aise avec les responsabilités et les grandes décisions.",
    },
    strengths: {
      en: "Ambitious, organised and decisive. Sees how money, people and time can be combined to get something done, and handles authority without being intimidated by it.",
      fr: "Ambitieux, organisé et décidé. Voit comment combiner argent, personnes et temps pour mener une chose à bien, et exerce l’autorité sans se laisser intimider par elle.",
    },
    pitfalls: {
      en: "Can measure everything, relationships included, by success or control, and overwork until health or family pay the price. Using power fairly is the lesson that keeps returning.",
      fr: "Peut tout mesurer, relations comprises, à l’aune de la réussite ou du contrôle, et travailler à l’excès jusqu’à ce que la santé ou la famille en paient le prix. Exercer le pouvoir avec équité est la leçon qui revient sans cesse.",
    },
    example: {
      en: "Asked to help with a charity event, an 8 also negotiates a sponsor, sets a fundraising target and tracks it weekly — and the evening raises twice what was planned.",
      fr: "Sollicité pour aider à une soirée caritative, un 8 négocie aussi un sponsor, fixe un objectif de collecte et le suit chaque semaine — et la soirée rapporte deux fois plus que prévu.",
    },
  },
  9: {
    keywords: {
      en: "compassion, completion, idealism, generosity",
      fr: "compassion, accomplissement, idéalisme, générosité",
    },
    what: {
      en: "9 is the last single digit, and any multiple of 9 reduces back to 9 (18, 27, 36…), so numerology links it to completion and to holding all the numbers before it. It stands for broad concern: humanitarian ideals, tolerance, art and letting go. A 9 tends to think beyond personal interest and is often drawn to causes larger than itself.",
      fr: "Le 9 est le dernier chiffre, et tout multiple de 9 se réduit à nouveau en 9 (18, 27, 36…) ; la numérologie l’associe donc à l’achèvement et à ce qui contient tous les nombres précédents. Il représente une préoccupation large : idéal humanitaire, tolérance, art, lâcher-prise. Un 9 pense au-delà de son intérêt personnel et se sent souvent attiré par des causes qui le dépassent.",
    },
    strengths: {
      en: "Generous, tolerant and able to see the wider picture. Often creative, and good at closing chapters — ending a project or a relationship with grace when its time has come.",
      fr: "Généreux, tolérant et capable de voir l’ensemble. Souvent créatif, et doué pour clore un chapitre — terminer un projet ou une relation avec élégance quand le moment est venu.",
    },
    pitfalls: {
      en: "Can give to the world while neglecting the people closest to it, or stay disappointed when others fall short of its ideals. Accepting ordinary, imperfect help is part of the work.",
      fr: "Peut donner au monde entier en négligeant ses proches, ou rester déçu quand les autres ne sont pas à la hauteur de ses idéaux. Accepter une aide ordinaire, imparfaite, fait partie du chemin.",
    },
    example: {
      en: "A 9 volunteers every Saturday at a food bank and knows each regular’s story, yet rarely tells anyone when they themselves are struggling and could use a hand.",
      fr: "Un 9 est bénévole chaque samedi dans une banque alimentaire et connaît l’histoire de chaque habitué, mais dit rarement à qui que ce soit quand c’est lui qui traverse une passe difficile et aurait besoin d’un coup de main.",
    },
  },
  11: {
    keywords: {
      en: "intuition, inspiration, sensitivity, vision",
      fr: "intuition, inspiration, sensibilité, vision",
    },
    what: {
      en: "11 is the first master number, kept whole instead of being reduced to 2 (1 + 1). It carries the receptive, cooperative qualities of 2 at a higher intensity: intuition, inspiration and a sense of purpose. An 11 is often described as someone whose ideas or example reach and move others. The same sensitivity can leave it tense and easily overwhelmed.",
      fr: "Le 11 est le premier nombre maître, conservé tel quel au lieu d’être réduit en 2 (1 + 1). Il porte les qualités réceptives et coopératives du 2 avec plus d’intensité : intuition, inspiration, sentiment d’une mission. On décrit souvent le 11 comme quelqu’un dont les idées ou l’exemple touchent les autres. Cette même sensibilité peut le rendre tendu et vite débordé.",
    },
    strengths: {
      en: "Highly intuitive, idealistic and able to inspire people through ideas, teaching or art. Often senses what a group needs before anyone has put it into words.",
      fr: "Très intuitif, idéaliste et capable d’inspirer par ses idées, son enseignement ou son art. Sent souvent ce dont un groupe a besoin avant que quiconque l’ait formulé.",
    },
    pitfalls: {
      en: "Can be anxious, self-critical and overloaded by other people’s moods, or wait for inspiration instead of acting. Steady routines — sleep, movement, a practical task — help keep it grounded.",
      fr: "Peut être anxieux, très critique envers lui-même et submergé par l’humeur des autres, ou attendre l’inspiration au lieu d’agir. Des routines régulières — sommeil, activité physique, une tâche concrète — l’aident à garder les pieds sur terre.",
    },
    example: {
      en: "An 11 teacher notices that a quiet pupil is having a hard time at home, finds exactly the right words to reach them, and then cannot switch off for the rest of the evening.",
      fr: "Une enseignante 11 remarque qu’un élève discret vit une période difficile à la maison, trouve exactement les mots qui le touchent, puis n’arrive plus à décrocher de toute la soirée.",
    },
  },
  22: {
    keywords: {
      en: "master builder, vision, pragmatism, large-scale work",
      fr: "maître bâtisseur, vision, pragmatisme, grande envergure",
    },
    what: {
      en: "22 is the master number usually called the master builder. It keeps the method and discipline of 4 (2 + 2) and adds the vision associated with 11: the capacity to turn a large idea into something real and lasting — an organisation, a building, a system that serves many people. A 22 tends to feel both the scale of what is possible and its pressure.",
      fr: "Le 22 est le nombre maître qu’on appelle en général le maître bâtisseur. Il garde la méthode et la discipline du 4 (2 + 2) et y ajoute la vision associée au 11 : la capacité à transformer une grande idée en quelque chose de réel et de durable — une organisation, un bâtiment, un système utile à beaucoup. Un 22 ressent à la fois l’ampleur de ce qui est possible et le poids qui l’accompagne.",
    },
    strengths: {
      en: "Combines big-picture thinking with patience for detail. Can plan over years, coordinate many people, and carry ambitious projects through where others stop at the idea.",
      fr: "Allie la vue d’ensemble et la patience du détail. Sait planifier sur des années, coordonner beaucoup de monde et mener à terme des projets ambitieux là où d’autres s’arrêtent à l’idée.",
    },
    pitfalls: {
      en: "The size of its own expectations can freeze it, or push it to control everything. Many 22s live as a 4 for years first; breaking a big aim into small, finished stages helps.",
      fr: "L’ampleur de ses propres attentes peut le paralyser, ou le pousser à tout contrôler. Beaucoup de 22 vivent d’abord en 4 pendant des années ; découper un grand objectif en petites étapes menées à terme l’aide.",
    },
    example: {
      en: "A 22 starts by fixing the booking system at a local clinic, then designs one that three clinics share, and ten years later runs the regional network built on it.",
      fr: "Un 22 commence par réparer le système de rendez-vous d’un cabinet médical du quartier, en conçoit ensuite un que trois cabinets partagent, et dix ans plus tard dirige le réseau régional qui s’appuie dessus.",
    },
  },
  33: {
    keywords: {
      en: "compassion, teaching, healing, devotion",
      fr: "compassion, enseignement, guérison, dévouement",
    },
    what: {
      en: "33 is the third master number, often called the master teacher. It carries the care and responsibility of 6 (3 + 3) on a larger scale: guidance, healing and service given out of love rather than duty. Some numerologists do not use it at all, and those who do usually read it as a 6 until the person has grown into its demands.",
      fr: "Le 33 est le troisième nombre maître, souvent appelé le maître enseignant. Il porte le soin et la responsabilité du 6 (3 + 3) à plus grande échelle : guider, soigner, servir par amour plutôt que par devoir. Certains numérologues ne l’utilisent pas du tout, et ceux qui l’emploient le lisent en général comme un 6 tant que la personne n’a pas grandi dans ce qu’il exige.",
    },
    strengths: {
      en: "Warm, patient and deeply supportive. Teaches by example, stays calm with people in difficulty, and can turn personal experience into practical help for others.",
      fr: "Chaleureux, patient et d’un grand soutien. Enseigne par l’exemple, reste calme auprès des personnes en difficulté, et sait faire de son expérience personnelle une aide concrète pour les autres.",
    },
    pitfalls: {
      en: "Can take on the problems of everyone nearby until exhausted, or become a martyr who cannot receive help. Clear limits on what it gives are part of doing the work well.",
      fr: "Peut porter les problèmes de tout son entourage jusqu’à l’épuisement, ou devenir un martyr incapable de recevoir de l’aide. Poser des limites claires à ce qu’il donne fait partie du travail bien fait.",
    },
    example: {
      en: "A 33 nurse stays late to explain a treatment plan to a frightened family in plain words, then offers to train new staff to do the same.",
      fr: "Un infirmier 33 reste après son service pour expliquer un traitement avec des mots simples à une famille inquiète, puis propose de former les nouveaux arrivants à faire de même.",
    },
  },
};

type CycleKey = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 11 | 22;

/** Personal Year 1–9 (and 11, 22 when kept): the typical theme of the year in a nine-year cycle, with a concrete suggestion. */
export const PERSONAL_YEAR_TEXT: Record<CycleKey, Bi> = {
  1: {
    en: "A Personal Year 1 opens a new nine-year cycle. It is typically a year for starting things: a job, a project, a habit, a new way of presenting yourself. Choices made now tend to set the tone for the years that follow. A concrete step: write down one thing you want to have begun by December, and take its first action this month.",
    fr: "Une Année personnelle 1 ouvre un nouveau cycle de neuf ans. C’est en général une année pour commencer : un emploi, un projet, une habitude, une nouvelle façon de vous présenter. Les choix faits maintenant donnent souvent le ton des années suivantes. Un pas concret : notez une chose que vous voulez avoir lancée d’ici décembre, et faites-en la première démarche ce mois-ci.",
  },
  2: {
    en: "A Personal Year 2 is slower and more relational. What you started last year now needs patience, cooperation and small adjustments rather than force. Partnerships, negotiations and details tend to matter more than bold moves. A concrete step: identify the one relationship, at work or at home, that most affects your plans, and spend deliberate time strengthening it.",
    fr: "Une Année personnelle 2 est plus lente et plus tournée vers les autres. Ce que vous avez lancé l’an dernier demande maintenant de la patience, de la coopération et de petits ajustements plutôt que de la force. Les associations, les négociations et les détails comptent davantage que les coups d’éclat. Un pas concret : repérez la relation, au travail ou à la maison, qui pèse le plus sur vos projets, et prenez délibérément le temps de la consolider.",
  },
  3: {
    en: "A Personal Year 3 tends to bring more social contact, creativity and visibility. It is a good year to express yourself: write, perform, present your work, meet new people. The risk is scattering your attention across too many invitations and ideas. A concrete step: choose one creative or social project and give it a fixed slot in your week.",
    fr: "Une Année personnelle 3 apporte souvent plus de vie sociale, de créativité et de visibilité. C’est une bonne année pour vous exprimer : écrire, vous produire, présenter votre travail, rencontrer du monde. Le risque est de disperser votre attention entre trop d’invitations et d’idées. Un pas concret : choisissez un projet créatif ou social et réservez-lui un créneau fixe dans votre semaine.",
  },
  4: {
    en: "A Personal Year 4 is about work and foundations. It often feels heavier: routines, paperwork, money plans and practical tasks ask for attention. Effort made now tends to pay off in the years that follow. A concrete step: pick one area — finances, home, health habits or skills — and set up a simple system you can keep all year.",
    fr: "Une Année personnelle 4 est consacrée au travail et aux fondations. Elle paraît souvent plus lourde : routines, démarches administratives, budget et tâches pratiques réclament votre attention. Les efforts fournis maintenant portent en général leurs fruits les années suivantes. Un pas concret : choisissez un domaine — finances, logement, hygiène de vie ou compétences — et mettez en place un système simple que vous pourrez tenir toute l’année.",
  },
  5: {
    en: "A Personal Year 5 brings movement and change: travel, new people, a shift at work or in where you live. After the discipline of the 4, there is room to experiment, and change you choose is easier than change forced on you. A concrete step: plan one real break from routine — a trip, a course, a new role — and keep one anchoring habit steady.",
    fr: "Une Année personnelle 5 apporte du mouvement et du changement : voyages, nouvelles rencontres, évolution au travail ou dans votre lieu de vie. Après la discipline du 4, vous avez de la place pour expérimenter, et un changement choisi se vit mieux qu’un changement subi. Un pas concret : prévoyez une vraie rupture avec la routine — un voyage, une formation, un nouveau rôle — et gardez une habitude stable qui vous ancre.",
  },
  6: {
    en: "A Personal Year 6 turns attention to home, family and responsibility. Relationships may deepen, commitments may be made, and people close to you may need more care. It is also a good year for making your surroundings more comfortable. A concrete step: have one honest conversation about how responsibilities are shared at home, and change what is not working.",
    fr: "Une Année personnelle 6 tourne l’attention vers le foyer, la famille et les responsabilités. Des relations peuvent s’approfondir, des engagements se prendre, et vos proches avoir besoin de plus d’attention. C’est aussi une bonne année pour rendre votre cadre de vie plus agréable. Un pas concret : ayez une conversation franche sur le partage des responsabilités à la maison, et changez ce qui ne fonctionne pas.",
  },
  7: {
    en: "A Personal Year 7 is quieter and more inward. It suits study, reflection, research and questions of meaning more than expansion. Outer results can seem slower, and that is often the point. A concrete step: set aside regular time alone — a weekly walk, a course, a journal — to work out what you actually want from the next two years.",
    fr: "Une Année personnelle 7 est plus calme et plus intérieure. Elle se prête à l’étude, à la réflexion, à la recherche et aux questions de sens plutôt qu’à l’expansion. Les résultats visibles peuvent sembler plus lents, et c’est souvent le but. Un pas concret : réservez-vous des moments seul — une marche hebdomadaire, une formation, un journal — pour clarifier ce que vous voulez vraiment pour les deux années à venir.",
  },
  8: {
    en: "A Personal Year 8 tends to focus on career, money and authority. Effort from earlier years can turn into recognition, promotion or important financial decisions. It is a year for asking what your work is worth and managing resources carefully. A concrete step: review your income, debts and goals, then make one clear request — a raise, a new price, a new role.",
    fr: "Une Année personnelle 8 se concentre souvent sur la carrière, l’argent et l’autorité. Les efforts des années précédentes peuvent se traduire en reconnaissance, en promotion ou en décisions financières importantes. C’est une année pour faire valoir ce que vaut votre travail et gérer vos ressources avec soin. Un pas concret : faites le point sur vos revenus, vos dettes et vos objectifs, puis formulez une demande claire — une augmentation, un nouveau tarif, un nouveau poste.",
  },
  9: {
    en: "A Personal Year 9 closes the nine-year cycle. It is typically a year of completion: finishing projects, clearing out, ending what no longer fits. Launching large new ventures often feels premature. A concrete step: list what you have outgrown — objects, commitments, habits — and deliberately let go of a few, to make room for the Personal Year 1 that follows.",
    fr: "Une Année personnelle 9 referme le cycle de neuf ans. C’est en général une année d’achèvement : terminer des projets, faire le tri, mettre fin à ce qui ne vous correspond plus. Lancer de grandes entreprises paraît souvent prématuré. Un pas concret : dressez la liste de ce qui ne vous va plus — objets, engagements, habitudes — et séparez-vous volontairement de quelques-uns, pour faire de la place à l’Année personnelle 1 qui suit.",
  },
  11: {
    en: "When the Personal Year is kept as 11, it is read as an intensified 2: a year of intuition, inspiration and heightened sensitivity, alongside the 2’s patience and cooperation. Ideas may arrive quickly, and so may nervous tension. A concrete step: keep a notebook for the insights that come, and give yourself more rest and fewer commitments than usual.",
    fr: "Quand l’Année personnelle est conservée en 11, on la lit comme un 2 intensifié : une année d’intuition, d’inspiration et de sensibilité accrue, en plus de la patience et de la coopération du 2. Les idées peuvent venir vite, la tension nerveuse aussi. Un pas concret : tenez un carnet pour noter les intuitions qui surgissent, et accordez-vous plus de repos et moins d’engagements que d’habitude.",
  },
  22: {
    en: "When the Personal Year is kept as 22, it is read as an intensified 4: a year for building something substantial and long-term, with more ambition behind the usual hard work. The workload can feel large. A concrete step: name the one project you want to lay foundations for, and break it into monthly stages you can actually complete.",
    fr: "Quand l’Année personnelle est conservée en 22, on la lit comme un 4 intensifié : une année pour bâtir quelque chose de solide et de durable, avec plus d’ambition derrière le travail habituel. La charge peut sembler lourde. Un pas concret : nommez le projet dont vous voulez poser les fondations, et découpez-le en étapes mensuelles que vous pouvez réellement mener à bien.",
  },
};

/** Personal Month: one short sentence per number. */
export const PERSONAL_MONTH_TEXT: Record<CycleKey, Bi> = {
  1: {
    en: "A month to start something: make the call, send the application, or take the first real step on a plan.",
    fr: "Un mois pour commencer : passez l’appel, envoyez la candidature ou faites le premier vrai pas d’un projet.",
  },
  2: {
    en: "A month for patience and cooperation; listen more than usual, handle the details, and let things develop at their own pace.",
    fr: "Un mois de patience et de coopération ; écoutez plus que d’habitude, occupez-vous des détails et laissez les choses mûrir à leur rythme.",
  },
  3: {
    en: "A month for company and self-expression; accept an invitation and share an idea or piece of work you have been holding back.",
    fr: "Un mois pour voir du monde et vous exprimer ; acceptez une invitation et montrez une idée ou un travail que vous gardiez pour vous.",
  },
  4: {
    en: "A month for steady work: catch up on admin, fix what is broken, and keep to a routine even when it feels dull.",
    fr: "Un mois de travail régulier : rattrapez les démarches en retard, réparez ce qui est cassé et tenez votre routine même quand elle vous ennuie.",
  },
  5: {
    en: "A month of movement and change; expect plans to shift, and leave some room in your schedule for the unexpected.",
    fr: "Un mois de mouvement et de changement ; attendez-vous à ce que les plans bougent, et laissez de la place à l’imprévu dans votre agenda.",
  },
  6: {
    en: "A month centred on home, family and commitments; give time to the people who rely on you and to your surroundings.",
    fr: "Un mois centré sur le foyer, la famille et les engagements ; consacrez du temps aux personnes qui comptent sur vous et à votre cadre de vie.",
  },
  7: {
    en: "A quieter month for thinking, reading and rest; step back from the noise before you make any important decision.",
    fr: "Un mois plus calme, propice à la réflexion, à la lecture et au repos ; prenez du recul avant toute décision importante.",
  },
  8: {
    en: "A month for practical results: deal with money, negotiate, and take charge of a decision you have been putting off.",
    fr: "Un mois tourné vers les résultats concrets : occupez-vous de l’argent, négociez et prenez enfin la décision que vous repoussez.",
  },
  9: {
    en: "A month for finishing and clearing out; tie up loose ends and let go of something that has run its course.",
    fr: "Un mois pour terminer et faire le tri ; bouclez ce qui traîne et laissez partir ce qui a fait son temps.",
  },
  11: {
    en: "A month of sharper intuition and sensitivity; write down the ideas that come to you, and protect your rest.",
    fr: "Un mois d’intuition et de sensibilité plus vives ; notez les idées qui vous viennent et préservez votre repos.",
  },
  22: {
    en: "A month for concrete progress on a large goal; turn one big idea into a specific plan with dates attached.",
    fr: "Un mois pour avancer concrètement vers un grand objectif ; transformez une grande idée en plan précis, avec des dates.",
  },
};

/** Personal Day: one short sentence per number. */
export const PERSONAL_DAY_TEXT: Record<CycleKey, Bi> = {
  1: {
    en: "A good day to begin something or make a decision on your own, rather than waiting for everyone to agree.",
    fr: "Une bonne journée pour commencer quelque chose ou trancher seul, sans attendre que tout le monde soit d’accord.",
  },
  2: {
    en: "A day for listening, cooperating and small gestures; results come more easily through other people than through pushing.",
    fr: "Une journée d’écoute, de coopération et de petites attentions ; les résultats viennent plus facilement par les autres qu’en forçant.",
  },
  3: {
    en: "A day to talk, write, create or see friends; a light touch will get you further than a heavy one.",
    fr: "Une journée pour parler, écrire, créer ou voir des amis ; la légèreté vous mènera plus loin que l’insistance.",
  },
  4: {
    en: "A day for focused, practical work — the list, the bills, the repairs — taken one task at a time.",
    fr: "Une journée de travail concret et concentré — la liste, les factures, les réparations — une tâche après l’autre.",
  },
  5: {
    en: "A day open to change: try a new route, a new idea, or a conversation with someone you don’t know yet.",
    fr: "Une journée ouverte au changement : essayez un autre trajet, une nouvelle idée ou une conversation avec quelqu’un que vous ne connaissez pas encore.",
  },
  6: {
    en: "A day to look after your home and the people close to you; a small act of care goes further than usual.",
    fr: "Une journée pour prendre soin de votre intérieur et de vos proches ; un petit geste d’attention porte plus loin que d’habitude.",
  },
  7: {
    en: "A day for reflection, study or time alone; avoid rushing into commitments and give your second thoughts a hearing.",
    fr: "Une journée de réflexion, d’étude ou de solitude ; évitez de vous engager dans la précipitation et écoutez vos seconds avis.",
  },
  8: {
    en: "A day to handle money, work matters or a negotiation, and to speak with clear authority when it counts.",
    fr: "Une journée pour régler une question d’argent, de travail ou une négociation, et parler avec assurance quand cela compte.",
  },
  9: {
    en: "A day to finish, tidy up and forgive; close something off rather than starting something new.",
    fr: "Une journée pour finir, ranger et pardonner ; refermez quelque chose plutôt que d’en commencer une nouvelle.",
  },
  11: {
    en: "A day when intuition runs high; pay attention to your hunches, and take breaks if you start to feel overstimulated.",
    fr: "Une journée où l’intuition est forte ; soyez attentif à vos pressentiments, et faites des pauses si vous vous sentez surstimulé.",
  },
  22: {
    en: "A day to make real progress on a long-term project by doing the one practical step that matters most.",
    fr: "Une journée pour faire vraiment avancer un projet de long terme, en accomplissant l’étape concrète qui compte le plus.",
  },
};

/** Universal Year 1–9: the collective theme of a calendar year. */
export const UNIVERSAL_YEAR_TEXT: Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9, Bi> = {
  1: {
    en: "A Universal Year 1 is read as a collective year of beginnings: new initiatives, new leaders and fresh starts in many areas at once. Its general theme is independence and setting a direction for the next nine years.",
    fr: "Une Année universelle 1 se lit comme une année collective de commencements : nouvelles initiatives, nouveaux dirigeants, nouveaux départs dans de nombreux domaines à la fois. Son thème général est l’indépendance et le choix d’une direction pour les neuf années à venir.",
  },
  2: {
    en: "A Universal Year 2 is associated with cooperation, negotiation and slower progress. Collectively, the emphasis tends to fall on alliances, agreements and the balance between opposing sides, with patience rewarded more than speed.",
    fr: "Une Année universelle 2 est associée à la coopération, à la négociation et à des progrès plus lents. Collectivement, l’accent porte souvent sur les alliances, les accords et l’équilibre entre des camps opposés, la patience payant davantage que la vitesse.",
  },
  3: {
    en: "A Universal Year 3 is associated with communication, culture and creativity. The collective mood is often more expressive and social, with attention on media, the arts and new ways of sharing ideas.",
    fr: "Une Année universelle 3 est associée à la communication, à la culture et à la créativité. L’humeur collective est souvent plus expressive et plus sociable, avec une attention portée aux médias, aux arts et aux nouvelles façons de partager les idées.",
  },
  4: {
    en: "A Universal Year 4 is associated with work, structure and consolidation. Collectively, the theme is building foundations — institutions, infrastructure, rules — and dealing with practical problems methodically.",
    fr: "Une Année universelle 4 est associée au travail, à la structure et à la consolidation. Collectivement, le thème est de poser des fondations — institutions, infrastructures, règles — et de traiter les problèmes concrets avec méthode.",
  },
  5: {
    en: "A Universal Year 5 is associated with change, movement and freedom. It is often read as a restless, fast-moving year, with shifts in travel, trade, technology or social habits.",
    fr: "Une Année universelle 5 est associée au changement, au mouvement et à la liberté. On la lit souvent comme une année agitée et rapide, marquée par des évolutions dans les voyages, le commerce, la technologie ou les habitudes sociales.",
  },
  6: {
    en: "A Universal Year 6 is associated with responsibility, family and community. The collective focus tends to turn to care, education, housing and questions of what people owe one another.",
    fr: "Une Année universelle 6 est associée à la responsabilité, à la famille et à la communauté. L’attention collective se tourne souvent vers le soin, l’éducation, le logement et ce que chacun doit aux autres.",
  },
  7: {
    en: "A Universal Year 7 is associated with reflection, research and the search for meaning. Collectively, it is read as a year for questioning, analysis and looking beneath the surface of events.",
    fr: "Une Année universelle 7 est associée à la réflexion, à la recherche et à la quête de sens. Collectivement, on la lit comme une année de remise en question, d’analyse et de regard sous la surface des événements.",
  },
  8: {
    en: "A Universal Year 8 is associated with power, money and authority. Its collective themes are largely economic, with attention on business, institutions and how power and resources are used.",
    fr: "Une Année universelle 8 est associée au pouvoir, à l’argent et à l’autorité. Ses thèmes collectifs sont surtout économiques, avec une attention portée aux entreprises, aux institutions et à l’usage du pouvoir et des ressources.",
  },
  9: {
    en: "A Universal Year 9 is associated with endings and completion. It closes the nine-year collective cycle, and is read as a time of review, letting go and preparing for a new beginning.",
    fr: "Une Année universelle 9 est associée aux fins et à l’achèvement. Elle referme le cycle collectif de neuf ans, et se lit comme un temps de bilan, de lâcher-prise et de préparation à un nouveau départ.",
  },
};

/** Short explainers (2–3 sentences each). */
export const NUMEROLOGY_ABOUT: { system: Bi; reduction: Bi; masters: Bi; cycle: Bi; compare: Bi } = {
  system: {
    en: "Pythagorean numerology is a symbolic system that turns the letters of a name and the digits of a birth date into single numbers, each with a traditional meaning. It is named after Pythagoras, the Greek philosopher whose school saw number as a key to the order of the world, but the method used today took shape mostly in the early 20th century, through writers such as L. Dow Balliett and, later, Juno Jordan. It is a language for reflection, not a science.",
    fr: "La numérologie pythagoricienne est un système symbolique qui ramène les lettres d’un nom et les chiffres d’une date de naissance à des nombres simples, chacun porteur d’une signification traditionnelle. Elle doit son nom à Pythagore, le philosophe grec dont l’école voyait dans le nombre une clé de l’ordre du monde, mais la méthode pratiquée aujourd’hui s’est surtout formée au début du XXe siècle, avec des auteurs comme L. Dow Balliett puis Juno Jordan. C’est un langage de réflexion, pas une science.",
  },
  reduction: {
    en: "Numbers are reduced by adding their digits until a single digit remains. For a birth date of 15 June 1990, the day gives 1 + 5 = 6, the month is 6, and the year gives 1 + 9 + 9 + 0 = 19, then 1 + 9 = 10, then 1 + 0 = 1; adding 6 + 6 + 1 = 13 and 1 + 3 = 4 gives a Life Path of 4. Names work the same way, with each letter given a value from A = 1 to I = 9, then J = 1 again.",
    fr: "On réduit un nombre en additionnant ses chiffres jusqu’à n’en garder qu’un. Pour une naissance le 15 juin 1990, le jour donne 1 + 5 = 6, le mois vaut 6, et l’année donne 1 + 9 + 9 + 0 = 19, puis 1 + 9 = 10, puis 1 + 0 = 1 ; en additionnant 6 + 6 + 1 = 13, puis 1 + 3 = 4, on obtient un Chemin de vie 4. Les noms suivent le même principe, chaque lettre recevant une valeur de A = 1 à I = 9, puis J = 1 de nouveau.",
  },
  masters: {
    en: "11, 22 and 33 are called master numbers and are left unreduced when they appear, because the tradition reads them as a stronger, more demanding form of their root. They are also read as 2, 4 and 6 (1 + 1, 2 + 2, 3 + 3), which is why they are written 11/2, 22/4 and 33/6. Many people are said to live the root number first and grow into the master number over time.",
    fr: "11, 22 et 33 sont appelés nombres maîtres et ne sont pas réduits quand ils apparaissent, car la tradition y voit une forme plus intense et plus exigeante de leur racine. On les lit aussi comme 2, 4 et 6 (1 + 1, 2 + 2, 3 + 3), d’où l’écriture 11/2, 22/4 et 33/6. On dit souvent qu’une personne vit d’abord le nombre racine, puis grandit peu à peu dans le nombre maître.",
  },
  cycle: {
    en: "Personal Years run in a nine-year cycle, from 1 (beginnings) to 9 (completion), and then start again. The Personal Year adds your birth month and birth day to the current calendar year and reduces the total: for someone born on 15 June, 2026 gives 6 + 15 + 2026 = 2047, then 2 + 0 + 4 + 7 = 13, then 1 + 3 = 4. The next year, 2027, is a Personal Year 5.",
    fr: "Les Années personnelles suivent un cycle de neuf ans, de 1 (commencement) à 9 (achèvement), puis recommencent. L’Année personnelle additionne votre mois et votre jour de naissance à l’année civile en cours, puis réduit le total : pour une personne née un 15 juin, 2026 donne 6 + 15 + 2026 = 2047, puis 2 + 0 + 4 + 7 = 13, puis 1 + 3 = 4. L’année suivante, 2027, est une Année personnelle 5.",
  },
  compare: {
    en: "Comparing two people’s numbers shows which themes they share and where they differ — for example, two 4s who both value routine, or a 5 who needs change sharing a home with a 6 who needs stability. It is not a compatibility score: no pair of numbers is good or bad, and the useful question is how each person’s needs can be understood and met.",
    fr: "Comparer les nombres de deux personnes montre les thèmes qu’elles partagent et ceux qui les distinguent — par exemple deux 4 qui tiennent tous deux à la routine, ou un 5 en quête de changement qui vit avec un 6 en quête de stabilité. Ce n’est pas un score de compatibilité : aucune paire de nombres n’est bonne ou mauvaise, et la vraie question est de savoir comment comprendre et respecter les besoins de chacun.",
  },
};
