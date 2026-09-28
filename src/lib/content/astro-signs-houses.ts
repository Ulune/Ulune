import type { Bi } from "./types";
import type { SignId } from "@/lib/chart/types";

/** What a sign is and how it colours whatever it touches (planets, house cusps, angles). */
export type SignText = {
  what: Bi;
  keywords: Bi;
  strengths: Bi;
  pitfalls: Bi;
  example: Bi;
  /** Template: {area} is replaced by HOUSE_TEXT[n].area (FR areas carry their own article). */
  onCusp: Bi;
  rising: Bi;
  midheaven: Bi;
};

export const SIGN_TEXT: Record<SignId, SignText> = {
  aries: {
    what: {
      en: "Aries is the first sign of the zodiac, cardinal fire, ruled by Mars; the Sun passes through it from about 21 March to 19 April, and its first degree marks the March equinox. It describes a direct, quick and independent way of acting: going first, testing things by doing them and meeting challenges head-on. In practice it favours starting over maintaining, and speed over caution.",
      fr: "Le Bélier est le premier signe du zodiaque, un signe de feu cardinal gouverné par Mars ; le Soleil le traverse du 21 mars au 19 avril environ, et son premier degré correspond à l’équinoxe de mars. Il décrit une manière d’agir directe, rapide et indépendante : passer en premier, tester les choses en les faisant, répondre de front aux défis. Concrètement, il préfère lancer plutôt qu’entretenir, et la vitesse plutôt que la prudence.",
    },
    keywords: {
      en: "direct, quick, independent, competitive, courageous, impatient",
      fr: "franchise, rapidité, indépendance, goût du défi, courage, impatience",
    },
    strengths: {
      en: "Aries brings initiative, courage and honesty. It is good at breaking a deadlock, starting projects others hesitate over and reacting fast in an emergency, and it rarely holds a grudge for long.",
      fr: "Le Bélier apporte l’initiative, le courage et la franchise. Il sait débloquer une situation, lancer un projet devant lequel les autres hésitent et réagir vite en cas d’urgence, et il garde rarement rancune longtemps.",
    },
    pitfalls: {
      en: "Impatience and haste are the usual problems: starting more than gets finished, or reacting before listening. A short pause before big decisions, and partners who enjoy follow-through, make a real difference.",
      fr: "L’impatience et la précipitation sont les écueils habituels : commencer plus de choses qu’on n’en termine, ou réagir avant d’avoir écouté. Une courte pause avant les grandes décisions, et des partenaires qui aiment finir, changent beaucoup de choses.",
    },
    example: {
      en: "Think of the colleague who volunteers to present the new idea before it is fully polished, or the friend who books the trip the same evening it is mentioned and sorts out the details on the way.",
      fr: "C’est le collègue qui se propose pour présenter la nouvelle idée avant qu’elle soit tout à fait au point, ou l’ami qui réserve le voyage le soir même où l’on en parle et règle les détails en chemin.",
    },
    onCusp: {
      en: "You tackle {area} head-on, acting first and adjusting later, with more drive for starting things than patience for keeping them going.",
      fr: "Vous abordez de front {area} : vous agissez d’abord, vous ajustez ensuite, avec plus d’élan pour lancer les choses que de patience pour les faire durer.",
    },
    rising: {
      en: "With Aries rising, you tend to come across as direct, energetic and ready to act, sometimes more abrupt than you intend. You meet new situations by jumping in and learning as you go. On the first day in a new job, you might be asking questions and suggesting changes before lunch.",
      fr: "Avec un Ascendant Bélier, vous donnez souvent une impression de franchise et d’énergie, parfois plus abrupte que vous ne le voudriez. Face à une situation nouvelle, vous vous lancez et apprenez en chemin. Le premier jour dans un nouvel emploi, vous posez peut-être déjà des questions et proposez des changements avant le déjeuner.",
    },
    midheaven: {
      en: "With Aries on the Midheaven, you tend to aim for a career where you lead, compete or open new ground, and to be known for initiative. You might launch a new department, or leave a safe job to start your own business.",
      fr: "Avec le Bélier au Milieu du Ciel, vous visez souvent une carrière où vous pouvez diriger, vous mesurer aux autres ou ouvrir de nouvelles voies, et vous tenez à ce que l’on remarque votre esprit d’initiative. Vous pourriez lancer un nouveau service, ou quitter un poste sûr pour créer votre entreprise.",
    },
  },
  taurus: {
    what: {
      en: "Taurus is the second sign, fixed earth, ruled by Venus; the Sun passes through it from about 20 April to 20 May. It describes a steady, sensory and patient way of doing things: building slowly, valuing comfort and quality, and keeping what has proved its worth. Once Taurus commits to a plan, a habit or a person, it tends to stay the course.",
      fr: "Le Taureau est le deuxième signe, un signe de terre fixe gouverné par Vénus ; le Soleil le traverse du 20 avril au 20 mai environ. Il décrit une manière de faire stable, sensorielle et patiente : construire lentement, apprécier le confort et la qualité, garder ce qui a fait ses preuves. Une fois engagé dans un projet, une habitude ou une relation, le Taureau tient le cap.",
    },
    keywords: {
      en: "steady, patient, sensual, practical, loyal, stubborn",
      fr: "stabilité, patience, sensualité, sens pratique, fidélité, entêtement",
    },
    strengths: {
      en: "Taurus is reliable, calm under pressure and has a sound sense of value and quality. It finishes what it starts, handles money sensibly, and knows how to make a home or a meal comfortable.",
      fr: "Le Taureau est fiable, calme sous la pression, et il a un sens sûr de la valeur et de la qualité. Il termine ce qu’il commence, gère l’argent avec bon sens et sait rendre un intérieur ou un repas vraiment agréable.",
    },
    pitfalls: {
      en: "Inertia and stubbornness: staying with a job, a habit or an opinion after it stops working, or confusing security with possessions. Trying changes on a small, reversible scale makes them far less threatening.",
      fr: "L’inertie et l’entêtement : garder un emploi, une habitude ou une opinion bien après qu’ils ont cessé de fonctionner, ou confondre sécurité et possessions. Tester un changement à petite échelle, de façon réversible, le rend beaucoup moins menaçant.",
    },
    example: {
      en: "Someone with this style researches a sofa for weeks, buys the well-made one and is still happily using it fifteen years later; they also keep the same savings routine through good years and bad ones.",
      fr: "Quelqu’un qui a ce style compare les canapés pendant des semaines, achète le mieux fabriqué et s’en sert encore avec plaisir quinze ans plus tard ; il garde aussi la même habitude d’épargne, que l’année soit bonne ou mauvaise.",
    },
    onCusp: {
      en: "You approach {area} steadily and practically, building slowly, paying for quality and keeping what works, sometimes for longer than you should.",
      fr: "Vous abordez {area} avec constance et sens pratique : vous construisez lentement, misez sur la qualité et gardez ce qui marche, parfois plus longtemps que nécessaire.",
    },
    rising: {
      en: "Taurus rising usually gives you a calm, pleasant and unhurried manner; you do not feel the need to fill silences. You approach new situations cautiously, watching before you commit. At a party where you know nobody, you might settle near the food and let people come to you.",
      fr: "Un Ascendant Taureau vous donne en général une allure calme, agréable et posée ; vous n’éprouvez pas le besoin de combler les silences. Face à l’inconnu, vous observez avant de vous engager. À une fête où vous ne connaissez personne, vous vous installez peut-être près du buffet en laissant les gens venir à vous.",
    },
    midheaven: {
      en: "Taurus on the Midheaven points you towards a career that is stable, tangible and fairly paid, and towards a reputation for reliability. Finance, food, design, building or crafts may appeal; you might become the maker whose work is booked months ahead.",
      fr: "Le Taureau au Milieu du Ciel vous oriente vers une carrière stable, concrète et correctement rémunérée, et vers une réputation de fiabilité. La finance, l’alimentation, le design, le bâtiment ou l’artisanat peuvent vous attirer ; votre savoir-faire sera peut-être si recherché qu’on le réserve des mois à l’avance.",
    },
  },
  gemini: {
    what: {
      en: "Gemini, the third sign, is mutable air ruled by Mercury, and the Sun moves through it from about 21 May to 20 June. It describes a curious, quick and adaptable style: gathering information, making connections, talking things through and keeping several options open. Gemini tends to learn by asking and comparing, and it loses interest once things become repetitive.",
      fr: "Troisième signe du zodiaque, les Gémeaux sont un signe d’air mutable gouverné par Mercure ; le Soleil les traverse du 21 mai au 20 juin environ. Ils décrivent un style curieux, vif et adaptable : recueillir des informations, faire des liens, discuter des choses et garder plusieurs options ouvertes. Les Gémeaux apprennent en questionnant et en comparant, et se lassent dès que les choses deviennent répétitives.",
    },
    keywords: {
      en: "curious, quick, adaptable, talkative, versatile, restless",
      fr: "curiosité, vivacité, adaptabilité, sens de l’échange, polyvalence, dispersion",
    },
    strengths: {
      en: "Gemini learns fast, is easy to talk to and good at explaining. It links people and ideas, adapts quickly to new tools and settings, and can see several sides of a question at once.",
      fr: "Les Gémeaux apprennent vite, ont le contact facile et savent expliquer. Ils relient les personnes et les idées, s’adaptent rapidement aux nouveaux outils et aux nouveaux milieux, et voient plusieurs aspects d’une question à la fois.",
    },
    pitfalls: {
      en: "Scattered attention and restlessness: many things started, few finished, and a habit of skimming. Choosing one project to see through each season, and writing commitments down before taking on new ones, keeps curiosity productive.",
      fr: "La dispersion et l’agitation : beaucoup de choses commencées, peu terminées, et l’habitude de survoler. Choisir chaque saison un projet à mener au bout, et noter ses engagements avant d’en prendre de nouveaux, rend la curiosité féconde.",
    },
    example: {
      en: "In a meeting, the Gemini style is the person who has read three articles on the topic, connects the marketing problem to something the IT team said last week, and has a new question before the answer arrives.",
      fr: "En réunion, le style Gémeaux, c’est la personne qui a lu trois articles sur le sujet, relie le problème du marketing à une remarque du service informatique la semaine précédente et a déjà une nouvelle question avant d’avoir reçu la réponse.",
    },
    onCusp: {
      en: "You handle {area} with curiosity and flexibility, gathering information, talking things over and keeping several options open rather than committing early.",
      fr: "Vous traitez {area} avec curiosité et souplesse : vous vous informez, vous en discutez autour de vous et gardez plusieurs options ouvertes plutôt que de vous engager trop tôt.",
    },
    rising: {
      en: "Gemini rising tends to make you seem lively, talkative and curious, quick with a question or a joke. You approach new situations by gathering information and chatting to whoever is nearby. Stuck on a delayed train, you may know half the carriage’s travel plans within twenty minutes.",
      fr: "Un Ascendant Gémeaux vous donne souvent un air vif, bavard et curieux, avec une question ou une plaisanterie toujours prête. Face à une situation nouvelle, vous recueillez des informations et engagez la conversation avec qui se trouve là. Dans un train en retard, vous connaissez peut-être au bout de vingt minutes les projets de voyage de la moitié du wagon.",
    },
    midheaven: {
      en: "With Gemini on the Midheaven, you tend to look for work built on words, information and contact: writing, teaching, sales, media or coordination. You may be known as a good communicator, and some people with this placement run two careers side by side.",
      fr: "Avec les Gémeaux au Milieu du Ciel, vous cherchez souvent un métier fondé sur les mots, l’information et le contact : écriture, enseignement, vente, médias ou coordination. On vous connaît peut-être comme quelqu’un qui communique bien, et certaines personnes avec cette position mènent deux activités de front.",
    },
  },
  cancer: {
    what: {
      en: "The fourth sign, Cancer, is cardinal water ruled by the Moon; the Sun is in Cancer from about 21 June to 22 July, starting at the June solstice. It describes a protective, responsive and caring way of acting: reading moods, looking after its own and creating a safe base. Cancer takes initiative through feeling, and it acts to defend what it is attached to.",
      fr: "Quatrième signe, le Cancer est un signe d’eau cardinal gouverné par la Lune ; le Soleil y séjourne du 21 juin au 22 juillet environ, à partir du solstice de juin. Il décrit une manière d’agir protectrice, réceptive et attentionnée : sentir les humeurs, veiller sur les siens, créer un lieu sûr. Le Cancer prend l’initiative par le sentiment, et il agit pour défendre ce à quoi il tient.",
    },
    keywords: {
      en: "protective, caring, sensitive, loyal, tenacious, moody",
      fr: "protection, attention aux autres, sensibilité, fidélité, ténacité, humeurs changeantes",
    },
    strengths: {
      en: "Cancer is attentive, loyal and emotionally perceptive. It remembers what matters to people, builds lasting bonds, and is often at its best when defending someone vulnerable or making a group feel at home.",
      fr: "Le Cancer est attentif, fidèle et fin sur le plan affectif. Il se souvient de ce qui compte pour les autres, tisse des liens durables et donne souvent le meilleur de lui-même quand il défend une personne fragile ou qu’il aide un groupe à se sentir chez lui.",
    },
    pitfalls: {
      en: "Taking things personally, retreating into hurt, or holding on to the past and to people too tightly. Asking a direct question before withdrawing, and accepting care in return, keeps relationships balanced.",
      fr: "Tout prendre personnellement, se replier sur sa blessure, ou s’accrocher trop fort au passé et aux personnes. Poser une question directe avant de se retirer, et accepter à son tour d’être soutenu, garde les relations équilibrées.",
    },
    example: {
      en: "Cancer’s way of caring shows in the friend who notices you are quiet at dinner, turns up with soup when you are ill, and still keeps the photos from a holiday ten years ago.",
      fr: "La façon dont le Cancer prend soin des autres, c’est l’ami qui remarque votre silence au dîner, arrive avec une soupe quand vous êtes malade et garde encore les photos d’un voyage d’il y a dix ans.",
    },
    onCusp: {
      en: "You approach {area} protectively, guided by feelings and memories, and you want the people involved to feel safe and looked after.",
      fr: "Vous abordez {area} avec un réflexe de protection, en vous fiant à vos émotions et à vos souvenirs, et vous tenez à ce que chacun s’y sente en sécurité.",
    },
    rising: {
      en: "With Cancer rising, you often seem gentle, approachable and a little reserved at first, reading the room before revealing much. You approach new situations by checking whether they feel safe. On a first date, you may ask about the other person’s family long before talking about yourself.",
      fr: "Avec un Ascendant Cancer, vous dégagez souvent au premier abord de la douceur et une certaine réserve, tout en restant accessible : vous sentez l’ambiance avant de vous livrer. Face à une situation nouvelle, vous vérifiez d’abord qu’elle est sûre. Lors d’un premier rendez-vous, vous posez peut-être des questions sur la famille de l’autre bien avant de parler de vous.",
    },
    midheaven: {
      en: "Cancer on the Midheaven often draws you to a career that involves caring for, feeding, housing or protecting people, and to a reputation for being dependable. Nursing, hospitality, property or running a family business are typical paths.",
      fr: "Le Cancer au Milieu du Ciel vous attire souvent vers un métier qui consiste à soigner, nourrir, loger ou protéger, et vers une réputation de personne sur qui l’on peut compter. Les soins infirmiers, l’hôtellerie, l’immobilier ou la reprise d’une entreprise familiale sont des voies typiques.",
    },
  },
  leo: {
    what: {
      en: "Leo is the fifth sign, fixed fire, ruled by the Sun, which passes through it from about 23 July to 22 August. It describes a warm, expressive and generous style that wants to create, to be seen and to put heart into what it does. Leo tends to lead through presence and loyalty rather than calculation, and it stands by its word once given.",
      fr: "Le Lion est le cinquième signe, un signe de feu fixe gouverné par le Soleil, qui le traverse du 23 juillet au 22 août environ. Il décrit un style chaleureux, expressif et généreux, qui veut créer, être vu et mettre du cœur dans ce qu’il fait. Le Lion mène par sa présence et sa loyauté plus que par le calcul, et il tient parole une fois qu’il s’est engagé.",
    },
    keywords: {
      en: "warm, generous, expressive, proud, loyal, dramatic",
      fr: "chaleur, générosité, expressivité, fierté, loyauté, sens du spectacle",
    },
    strengths: {
      en: "Leo brings warmth, courage and creative confidence. It encourages others, keeps its promises, lifts the mood of a group and is willing to take the visible role that others avoid.",
      fr: "Le Lion apporte la chaleur, le courage et une créativité sûre d’elle. Il encourage les autres, tient ses promesses, remonte le moral d’un groupe et accepte le rôle exposé que d’autres évitent.",
    },
    pitfalls: {
      en: "Pride and a need for recognition can make criticism hard to hear, or turn a disagreement into a matter of honour. Separating the work from the self, and asking for feedback early, eases this.",
      fr: "La fierté et le besoin de reconnaissance peuvent rendre la critique difficile à entendre, ou transformer un désaccord en question d’honneur. Distinguer le travail de sa personne, et demander un avis tôt, facilite les choses.",
    },
    example: {
      en: "At a family gathering, the Leo style plans the menu, makes the toast that gets everyone laughing and makes sure the shy cousin is included, while quietly hoping someone notices the effort.",
      fr: "Lors d’une réunion de famille, le style Lion prépare le menu, porte le toast qui fait rire tout le monde et veille à ce que le cousin timide soit de la partie, en espérant secrètement que quelqu’un remarquera l’effort.",
    },
    onCusp: {
      en: "You bring warmth and pride to {area}, wanting to do things generously and visibly, and the recognition you receive there matters to you.",
      fr: "Vous investissez {area} avec chaleur et fierté : vous voulez faire les choses généreusement et au grand jour, et la reconnaissance que vous y recevez compte beaucoup.",
    },
    rising: {
      en: "Leo rising tends to give you a warm, confident presence that people notice when you walk in, even when you feel nervous inside. You approach new situations openly and like to make a good impression. In a job interview, you may bring enthusiasm and a well-told story rather than a list of facts.",
      fr: "Un Ascendant Lion vous donne souvent une présence chaleureuse et assurée, que l’on remarque dès votre arrivée, même quand vous avez le trac. Vous abordez les situations nouvelles avec ouverture et aimez faire bonne impression. En entretien d’embauche, vous apportez peut-être de l’enthousiasme et une histoire bien racontée plutôt qu’une liste de faits.",
    },
    midheaven: {
      en: "With Leo on the Midheaven, you tend to want a visible career where your personal style counts: performing, teaching, leading a team or building your own brand. You aim to be respected for what you create, not only for what you manage.",
      fr: "Avec le Lion au Milieu du Ciel, vous recherchez souvent une carrière visible où votre style personnel compte : la scène, l’enseignement, la direction d’une équipe ou votre propre marque. Vous voulez qu’on vous respecte pour ce que vous créez, pas seulement pour ce que vous gérez.",
    },
  },
  virgo: {
    what: {
      en: "Virgo, the sixth sign, is mutable earth ruled by Mercury, with the Sun passing through it from about 23 August to 22 September. It describes a precise, practical and service-minded approach: noticing details, analysing what does not work and improving it step by step. Virgo tends to show care through usefulness, and it changes method readily when a better one appears.",
      fr: "La Vierge, sixième signe, est un signe de terre mutable gouverné par Mercure ; le Soleil la traverse du 23 août au 22 septembre environ. Elle décrit une approche précise, pratique et tournée vers le service : remarquer les détails, analyser ce qui ne fonctionne pas et l’améliorer pas à pas. La Vierge montre souvent son attention aux autres en se rendant utile, et elle change volontiers de méthode quand une meilleure se présente.",
    },
    keywords: {
      en: "precise, practical, analytical, modest, helpful, self-critical",
      fr: "précision, sens pratique, esprit d’analyse, modestie, serviabilité, autocritique",
    },
    strengths: {
      en: "Virgo is careful, competent and genuinely helpful. It spots the errors others miss, breaks complex tasks into workable steps, and keeps improving systems quietly without needing credit.",
      fr: "La Vierge est soigneuse, compétente et sincèrement serviable. Elle repère les erreurs qui échappent aux autres, découpe les tâches complexes en étapes réalisables et améliore les systèmes discrètement, sans chercher les honneurs.",
    },
    pitfalls: {
      en: "Perfectionism and worry: a standard that keeps rising, criticism turned inward or onto others, and trouble delegating. Setting a finish line for each task, and thanking people before correcting them, eases the pressure.",
      fr: "Le perfectionnisme et l’inquiétude : une exigence qui ne cesse de monter, une critique tournée contre soi ou contre les autres, du mal à déléguer. Fixer une ligne d’arrivée pour chaque tâche, et remercier avant de corriger, allège la pression.",
    },
    example: {
      en: "At work, Virgo’s style is the colleague who reads the contract down to the last clause, finds the error in the invoice, and quietly builds a spreadsheet that saves the team an hour every week.",
      fr: "Au travail, le style Vierge, c’est la collègue qui lit le contrat jusqu’à la dernière clause, trouve l’erreur dans la facture et met discrètement au point un tableau qui fait gagner une heure par semaine à l’équipe.",
    },
    onCusp: {
      en: "You handle {area} carefully and methodically, noticing what needs fixing, improving the details and wanting things done properly, sometimes to the point of worry.",
      fr: "Vous gérez {area} avec soin et méthode : vous repérez ce qui cloche, peaufinez les détails et voulez que tout soit bien fait, quitte à vous inquiéter plus que nécessaire.",
    },
    rising: {
      en: "Virgo rising tends to make you seem composed, observant and modest, neatly put together without fuss. You approach new situations by working out how things function and where you could be useful. At a friend’s party, you may end up helping in the kitchen within the first half hour.",
      fr: "Un Ascendant Vierge vous donne souvent une allure posée, observatrice et modeste, soignée sans ostentation. Face à une situation nouvelle, vous cherchez à comprendre comment les choses fonctionnent et où vous pourriez être utile. À une fête chez des amis, vous finissez peut-être par aider en cuisine dès la première demi-heure.",
    },
    midheaven: {
      en: "With Virgo on the Midheaven, you tend to seek a reputation for competence and precision in work where skill and detail matter: health care, editing, analysis, research or a technical trade. You may become the specialist people call when something must be done properly.",
      fr: "Avec la Vierge au Milieu du Ciel, vous recherchez souvent une réputation de compétence et de rigueur, dans un métier où le savoir-faire et le détail comptent : santé, édition, analyse, recherche ou métier technique. Vous devenez peut-être la personne qu’on appelle quand il faut que ce soit bien fait.",
    },
  },
  libra: {
    what: {
      en: "Libra is the seventh sign, cardinal air, ruled by Venus; the Sun passes through it from about 23 September to 22 October, beginning at the September equinox. It describes a relational, diplomatic and aesthetic way of acting: weighing options, considering others and looking for balance and fairness. Libra takes initiative through people, by proposing, negotiating and bringing others together.",
      fr: "La Balance est le septième signe, un signe d’air cardinal gouverné par Vénus ; le Soleil la traverse du 23 septembre au 22 octobre environ, à partir de l’équinoxe de septembre. Elle décrit une manière d’agir relationnelle, diplomate et sensible à l’esthétique : peser les options, tenir compte des autres, chercher l’équilibre et l’équité. La Balance prend l’initiative à travers les autres, en proposant, en négociant et en rassemblant.",
    },
    keywords: {
      en: "diplomatic, fair, sociable, graceful, considerate, indecisive",
      fr: "diplomatie, sens de l’équité, sociabilité, élégance, égards pour les autres, indécision",
    },
    strengths: {
      en: "Libra is tactful, fair-minded and good at seeing the other side of an argument. It makes people feel heard, calms conflicts, and has a sure sense of what is balanced, beautiful and appropriate.",
      fr: "La Balance a du tact, le sens de la justice et sait se mettre à la place de l’autre dans une discussion. Elle donne aux gens le sentiment d’être entendus, apaise les conflits et sent avec justesse ce qui est équilibré, beau et approprié.",
    },
    pitfalls: {
      en: "Indecision and people-pleasing: postponing choices to keep everyone happy, or agreeing aloud while disagreeing inside. Giving decisions a deadline, and voicing small disagreements early, keeps relationships honest.",
      fr: "L’indécision et le besoin de plaire : repousser les choix pour contenter tout le monde, ou approuver à voix haute en pensant le contraire. Fixer une échéance aux décisions, et exprimer tôt les petits désaccords, garde les relations sincères.",
    },
    example: {
      en: "Planning a group holiday, Libra’s way is to collect everyone’s preferences, find the destination that suits most people, and make sure the rented flat has good light and a table big enough for shared dinners.",
      fr: "Pour organiser des vacances entre amis, la Balance recueille les envies de chacun, trouve la destination qui convient au plus grand nombre et veille à ce que la location soit lumineuse, avec une table assez grande pour dîner tous ensemble.",
    },
    onCusp: {
      en: "When it comes to {area}, you look for balance and fairness, take other people’s views into account and prefer agreement to confrontation.",
      fr: "En ce qui concerne {area}, vous cherchez l’équilibre et l’équité, vous tenez compte de l’avis des autres et préférez l’accord à l’affrontement.",
    },
    rising: {
      en: "With Libra rising, you tend to come across as friendly, polite and easy to talk to, with an eye for how you and your surroundings look. You approach new situations by reading people and finding common ground. In a tense meeting, you may be the one who reframes the argument so that both sides can agree.",
      fr: "Avec un Ascendant Balance, vous apparaissez souvent comme une personne aimable, courtoise et facile d’accès, attentive à votre allure comme à votre cadre. Face à une situation nouvelle, vous observez les gens et cherchez un terrain d’entente. Dans une réunion tendue, c’est peut-être vous qui reformulez le débat pour que les deux camps puissent tomber d’accord.",
    },
    midheaven: {
      en: "Libra on the Midheaven often points you towards a public role built on relationships, fairness or aesthetics: law, mediation, diplomacy, design, fashion or client work. You may become known as the person who gets both parties to sign.",
      fr: "La Balance au Milieu du Ciel vous oriente souvent vers un rôle public fondé sur les relations, l’équité ou l’esthétique : droit, médiation, diplomatie, design, mode ou relation client. On vous connaîtra peut-être comme la personne qui amène les deux parties à signer.",
    },
  },
  scorpio: {
    what: {
      en: "Scorpio is the eighth sign, fixed water, traditionally ruled by Mars and, in modern astrology, by Pluto; the Sun passes through it from about 23 October to 21 November. It describes an intense, private and determined style that wants depth rather than surface. Scorpio tends to commit completely, notice hidden motives and hold on to its feelings and goals for a long time.",
      fr: "Le Scorpion est le huitième signe, un signe d’eau fixe gouverné traditionnellement par Mars et, en astrologie moderne, par Pluton ; le Soleil le traverse du 23 octobre au 21 novembre environ. Il décrit un style intense, discret et déterminé, qui cherche la profondeur plutôt que la surface. Le Scorpion s’engage entièrement, perçoit les motivations cachées et garde longtemps ses sentiments comme ses objectifs.",
    },
    keywords: {
      en: "intense, private, determined, perceptive, loyal, controlling",
      fr: "intensité, discrétion, détermination, perspicacité, loyauté, besoin de contrôle",
    },
    strengths: {
      en: "Scorpio is perceptive, resilient and loyal. It stays steady in a crisis, can face difficult truths that others avoid, and follows through on commitments with remarkable persistence.",
      fr: "Le Scorpion est perspicace, résistant et loyal. Il garde son sang-froid dans une crise, sait regarder en face les vérités difficiles que d’autres évitent et tient ses engagements avec une ténacité remarquable.",
    },
    pitfalls: {
      en: "Distrust, jealousy and a wish for control can harden into testing people or holding grudges. Saying directly what is feared or wanted, instead of watching and waiting, lowers the tension on both sides.",
      fr: "La méfiance, la jalousie et le besoin de contrôle peuvent se durcir en mises à l’épreuve ou en rancunes tenaces. Dire franchement ce que l’on craint ou ce que l’on veut, au lieu d’observer en silence, fait baisser la tension de part et d’autre.",
    },
    example: {
      en: "When a company is in trouble, the Scorpio style is the manager who reads every report, asks the uncomfortable question in the first meeting and has quietly reworked the budget before anyone else admits there is a problem.",
      fr: "Quand une entreprise traverse une mauvaise passe, le style Scorpion, c’est la responsable qui lit chaque rapport, pose la question qui dérange dès la première réunion et a déjà revu le budget en silence avant que quiconque admette qu’il y a un problème.",
    },
    onCusp: {
      en: "You approach {area} with intensity and caution, wanting to understand what lies beneath the surface and to keep control over what matters.",
      fr: "Vous abordez {area} avec intensité et prudence, en cherchant à comprendre ce qui se cache sous la surface et à garder la main sur ce qui compte.",
    },
    rising: {
      en: "Scorpio rising tends to give you a reserved, intense presence: people sense that you notice more than you show. You approach new situations cautiously and let trust build before opening up. In a new team, you might say little for the first weeks while working out exactly who holds the power.",
      fr: "Un Ascendant Scorpion vous donne souvent une présence réservée et intense : on sent que vous remarquez plus que vous ne le montrez. Face à une situation nouvelle, vous avancez avec prudence et laissez la confiance s’installer avant de vous ouvrir. Dans une nouvelle équipe, vous parlez peut-être peu les premières semaines, tout en repérant précisément qui détient le pouvoir.",
    },
    midheaven: {
      en: "With Scorpio on the Midheaven, you tend to seek work with depth or high stakes, such as research, psychology, surgery, investigation, finance or crisis management. You may want a reputation for being formidable, and for keeping confidences.",
      fr: "Avec le Scorpion au Milieu du Ciel, vous recherchez souvent un métier qui a de la profondeur ou des enjeux forts : recherche, psychologie, chirurgie, enquête, finance ou gestion de crise. Vous tenez peut-être à une réputation de personne redoutable, et capable de garder un secret.",
    },
  },
  sagittarius: {
    what: {
      en: "Sagittarius is the ninth sign, mutable fire, ruled by Jupiter; the Sun is in Sagittarius from about 22 November to 21 December. It describes an expansive, frank and freedom-loving style that looks for meaning, the big picture and the next horizon. Sagittarius tends to learn through experience and travel, to speak its mind, and to move on when a situation starts to feel confining.",
      fr: "Le Sagittaire est le neuvième signe, un signe de feu mutable gouverné par Jupiter ; le Soleil le traverse du 22 novembre au 21 décembre environ. Il décrit un style expansif, franc et épris de liberté, qui cherche le sens, la vue d’ensemble et le prochain horizon. Le Sagittaire apprend par l’expérience et le voyage, dit ce qu’il pense et passe à autre chose quand une situation devient étouffante.",
    },
    keywords: {
      en: "optimistic, frank, adventurous, philosophical, generous, restless",
      fr: "optimisme, franchise, goût de l’aventure, esprit philosophique, générosité, bougeotte",
    },
    strengths: {
      en: "Sagittarius is enthusiastic, honest and broad-minded. It inspires others with a sense of what is possible, learns eagerly, and copes well with uncertainty, often seeing opportunity where others see only risk.",
      fr: "Le Sagittaire est enthousiaste, honnête et ouvert d’esprit. Il donne aux autres le sentiment que tout est possible, apprend avec appétit et vit bien l’incertitude, voyant souvent une occasion là où d’autres ne voient qu’un risque.",
    },
    pitfalls: {
      en: "Overpromising, bluntness and restlessness: committing to more than time allows, or leaving before the difficult part. Putting plans on paper with dates and costs, and asking how a frank remark will land, helps.",
      fr: "Promettre trop, manquer de tact, ne pas tenir en place : s’engager au-delà du temps disponible, ou partir avant le passage difficile. Mettre ses projets sur papier avec des dates et des coûts, et se demander comment une remarque franche sera reçue, aide.",
    },
    example: {
      en: "The Sagittarius style shows in the student who signs up for a semester abroad almost on a whim, learns the language by talking to everyone, and comes back with a new idea of what to study.",
      fr: "Le style Sagittaire, c’est l’étudiant qui s’inscrit presque sur un coup de tête pour un semestre à l’étranger, apprend la langue en parlant à tout le monde et revient avec une nouvelle idée de ce qu’il veut étudier.",
    },
    onCusp: {
      en: "You treat {area} as room to explore and grow, bringing optimism and a wide view, though details and limits can get less attention.",
      fr: "Vous voyez dans {area} un terrain d’exploration : vous y mettez de l’optimisme et une vision large, quitte à accorder moins d’attention aux détails et aux limites.",
    },
    rising: {
      en: "Sagittarius rising tends to make you seem open, cheerful and unguarded, quick to laugh and to share an opinion. You approach new situations as adventures and trust that you will work things out. Arriving in an unfamiliar city, you may skip the guidebook and ask a stranger where to eat.",
      fr: "Un Ascendant Sagittaire vous donne souvent un air ouvert, jovial et spontané, avec le rire facile et une opinion toujours prête. Vous abordez les situations nouvelles comme des aventures, avec la conviction que vous trouverez la solution en route. En arrivant dans une ville inconnue, vous laissez peut-être le guide de côté pour demander à un passant où bien manger.",
    },
    midheaven: {
      en: "With Sagittarius on the Midheaven, you tend to want a career with scope, meaning and movement: teaching, publishing, law, travel, sport or work abroad. You aim to be known for your vision and principles, even if the path takes several turns.",
      fr: "Avec le Sagittaire au Milieu du Ciel, vous recherchez souvent une carrière qui offre de l’ampleur, du sens et du mouvement : enseignement, édition, droit, voyage, sport ou travail à l’étranger. Vous voulez qu’on vous connaisse pour votre vision et vos principes, même si le parcours fait plusieurs détours.",
    },
  },
  capricorn: {
    what: {
      en: "Capricorn, the tenth sign, is cardinal earth ruled by Saturn; the Sun passes through it from about 22 December to 19 January, starting at the December solstice. It describes a disciplined, strategic and responsible approach: setting long-term goals, respecting structure and working steadily towards results. Capricorn takes initiative by organising and planning, and it accepts delay if the outcome will last.",
      fr: "Le Capricorne, dixième signe, est un signe de terre cardinal gouverné par Saturne ; le Soleil le traverse du 22 décembre au 19 janvier environ, à partir du solstice de décembre. Il décrit une approche disciplinée, stratégique et responsable : se fixer des objectifs à long terme, respecter les structures, avancer régulièrement vers des résultats. Le Capricorne prend l’initiative en organisant et en planifiant, et il accepte d’attendre si le résultat doit durer.",
    },
    keywords: {
      en: "ambitious, disciplined, responsible, patient, reserved, pragmatic",
      fr: "ambition, discipline, sens des responsabilités, patience, réserve, pragmatisme",
    },
    strengths: {
      en: "Capricorn is dependable, patient and realistic. It can plan years ahead, carry responsibility under pressure, and turn a rough idea into a working organisation, budget or career.",
      fr: "Le Capricorne est fiable, patient et réaliste. Il sait planifier sur plusieurs années, porter des responsabilités sous pression et transformer une idée brute en organisation, en budget ou en carrière qui fonctionne.",
    },
    pitfalls: {
      en: "Overwork and rigidity: measuring worth by achievement alone, or postponing enjoyment until everything is secure. Treating rest as part of the plan, not a reward, and asking for help sooner, eases the load.",
      fr: "L’excès de travail et la rigidité : ne mesurer sa valeur qu’à ses réussites, ou remettre le plaisir au jour où tout sera assuré. Considérer le repos comme une partie du plan et non comme une récompense, et demander de l’aide plus tôt, allège la charge.",
    },
    example: {
      en: "A Capricorn approach is the person who opens a pension plan at twenty-five, takes the evening course that leads to a promotion three years later, and keeps a five-year plan pinned above the desk.",
      fr: "L’approche Capricorne, c’est la personne qui ouvre une épargne retraite à vingt-cinq ans, suit les cours du soir qui lui vaudront une promotion trois ans plus tard et garde un plan à cinq ans épinglé au-dessus de son bureau.",
    },
    onCusp: {
      en: "You take {area} seriously and plan for the long term, accepting responsibility, working within limits and expecting results to come from sustained effort.",
      fr: "Vous prenez au sérieux {area} et voyez loin : vous assumez vos responsabilités, composez avec les contraintes et attendez les résultats d’un effort soutenu.",
    },
    rising: {
      en: "Capricorn rising tends to make you seem composed, serious and capable, sometimes older than your years or hard to read at first. You approach new situations carefully, learning the rules before acting. Starting a new job, you might study the organisation chart and the unwritten norms before offering any opinion.",
      fr: "Un Ascendant Capricorne vous donne souvent une allure posée, sérieuse et compétente, qui peut sembler plus mûre que votre âge ou difficile à déchiffrer au début. Vous abordez les situations nouvelles avec prudence, en apprenant les règles avant d’agir. En arrivant dans un nouvel emploi, vous étudiez peut-être l’organigramme et les usages tacites avant de donner le moindre avis.",
    },
    midheaven: {
      en: "With Capricorn on the Midheaven, you tend to aim for status, authority and a career built step by step over years. You may want to run the organisation rather than simply work in it, and to be respected for reliability and results.",
      fr: "Avec le Capricorne au Milieu du Ciel, vous visez souvent le statut, l’autorité et une carrière construite pas à pas au fil des années. Vous voulez peut-être diriger l’organisation plutôt que simplement y travailler, et qu’on vous respecte pour votre fiabilité et vos résultats.",
    },
  },
  aquarius: {
    what: {
      en: "Aquarius is the eleventh sign, fixed air, traditionally ruled by Saturn and, in modern astrology, by Uranus; the Sun passes through it from about 20 January to 18 February. It describes an independent, inventive and group-minded style that questions conventions and thinks in terms of systems and principles. Aquarius tends to hold firmly to its ideals, value friendship and fairness, and keep a certain emotional distance.",
      fr: "Le Verseau est le onzième signe, un signe d’air fixe gouverné traditionnellement par Saturne et, en astrologie moderne, par Uranus ; le Soleil le traverse du 20 janvier au 18 février environ. Il décrit un style indépendant, inventif et tourné vers le groupe, qui remet en question les conventions et raisonne en termes de systèmes et de principes. Le Verseau tient fermement à ses idéaux, accorde beaucoup de prix à l’amitié et à l’équité, et garde une certaine distance affective.",
    },
    keywords: {
      en: "independent, inventive, principled, friendly, detached, unconventional",
      fr: "indépendance, inventivité, attachement aux principes, esprit amical, détachement, anticonformisme",
    },
    strengths: {
      en: "Aquarius is original, fair-minded and loyal to friends and causes. It sees how systems could work better, treats people as equals whatever their status, and is not easily swayed by fashion or pressure.",
      fr: "Le Verseau est original, juste et fidèle à ses amis comme à ses causes. Il voit comment un système pourrait mieux fonctionner, traite chacun d’égal à égal quel que soit son statut, et se laisse difficilement influencer par la mode ou la pression.",
    },
    pitfalls: {
      en: "Detachment and contrariness: arguing on principle when someone needs warmth, or resisting a good idea because it is popular. Naming feelings as well as opinions, and asking whether a rule really needs breaking, helps.",
      fr: "Le détachement et l’esprit de contradiction : argumenter sur les principes quand quelqu’un a besoin de chaleur, ou rejeter une bonne idée parce qu’elle est populaire. Nommer ses émotions et pas seulement ses opinions, et se demander si une règle mérite vraiment d’être enfreinte, aide.",
    },
    example: {
      en: "In a residents’ association, Aquarius style is the neighbour who sets up the shared group chat, proposes a tool-lending library, and calmly argues at the meeting for a rule change everyone else thought impossible.",
      fr: "Dans une association de quartier, le style Verseau, c’est la voisine qui crée la messagerie commune, propose une bibliothèque d’outils partagés et défend calmement en assemblée un changement de règlement que tous jugeaient impossible.",
    },
    onCusp: {
      en: "You approach {area} independently and a little unconventionally, questioning the usual rules and often involving friends, groups or new ideas.",
      fr: "Vous envisagez {area} en toute indépendance et de façon peu conventionnelle, en remettant en question les règles habituelles et en y associant volontiers des amis, un groupe ou des idées nouvelles.",
    },
    rising: {
      en: "Aquarius rising tends to make you seem friendly but slightly detached, curious and a little unusual, as if observing from one step away. You approach new situations with questions and your own way of doing things. In a new class, you might get on with everyone and belong to no clique.",
      fr: "Un Ascendant Verseau vous donne souvent un abord amical mais un peu distant, curieux et légèrement atypique, comme si vous observiez les choses d’un peu plus loin. Vous abordez les situations nouvelles avec des questions et votre propre façon de faire. Dans une nouvelle classe, vous vous entendez peut-être avec tout le monde sans appartenir à aucune bande.",
    },
    midheaven: {
      en: "With Aquarius on the Midheaven, you tend to want a career that is independent, forward-looking or collective, such as technology, science, activism, non-profit or network-based work. You may become known as someone who changes how things are done.",
      fr: "Avec le Verseau au Milieu du Ciel, vous recherchez souvent une carrière indépendante, tournée vers l’avenir ou collective : technologie, sciences, militantisme, associations ou travail en réseau. On vous connaîtra peut-être comme quelqu’un qui change la façon de faire les choses.",
    },
  },
  pisces: {
    what: {
      en: "Pisces is the twelfth and last sign, mutable water, traditionally ruled by Jupiter and, in modern astrology, by Neptune; the Sun is in Pisces from about 19 February to 20 March. It describes a receptive, imaginative and compassionate style that senses atmospheres and draws soft lines between self and others. Pisces tends to adapt to people and circumstances, and it often understands things intuitively before it can explain them.",
      fr: "Les Poissons sont le douzième et dernier signe, un signe d’eau mutable gouverné traditionnellement par Jupiter et, en astrologie moderne, par Neptune ; le Soleil les traverse du 19 février au 20 mars environ. Ils décrivent un style réceptif, imaginatif et compatissant, qui perçoit les ambiances et trace des frontières souples entre soi et les autres. Les Poissons s’adaptent aux personnes et aux circonstances, et comprennent souvent les choses intuitivement avant de pouvoir les expliquer.",
    },
    keywords: {
      en: "compassionate, imaginative, intuitive, adaptable, dreamy, sensitive",
      fr: "compassion, imagination, intuition, adaptabilité, rêverie, sensibilité",
    },
    strengths: {
      en: "Pisces is empathetic, creative and accepting. It senses what others need without being told, brings imagination to art, care or problem-solving, and forgives more easily than most signs.",
      fr: "Les Poissons sont empathiques, créatifs et accueillants. Ils sentent ce dont les autres ont besoin sans qu’on le leur dise, apportent de l’imagination à l’art, au soin ou à la résolution de problèmes, et pardonnent plus facilement que la plupart des signes.",
    },
    pitfalls: {
      en: "Weak boundaries and escapism: absorbing other people’s problems, avoiding hard decisions, or drifting when life feels harsh. Clear limits on the time and help given, plus some daily structure, protect that sensitivity.",
      fr: "Des limites floues et la tentation de la fuite : absorber les problèmes des autres, éviter les décisions difficiles, se laisser dériver quand la vie paraît dure. Des limites claires au temps et à l’aide que l’on donne, avec un peu de structure au quotidien, protègent cette sensibilité.",
    },
    example: {
      en: "A Pisces way of working shows in the nurse who can tell a patient is frightened before a word is spoken, or the musician who composes best late at night, following a mood rather than a plan.",
      fr: "Une manière d’être Poissons, c’est l’infirmier qui devine qu’un patient a peur avant qu’il ait dit un mot, ou la musicienne qui compose mieux tard le soir, en suivant une humeur plutôt qu’un plan.",
    },
    onCusp: {
      en: "You handle {area} intuitively and flexibly, guided by feeling and imagination, with a generosity that is real but boundaries that can blur.",
      fr: "Vous vivez {area} de façon intuitive et souple, en vous laissant guider par le ressenti et l’imagination, avec une générosité réelle mais des limites parfois floues.",
    },
    rising: {
      en: "Pisces rising tends to make you seem gentle, dreamy and easy to confide in; people often see in you what they hope to see. You approach new situations by sensing the mood before deciding anything. At a new workplace, colleagues may be telling you their problems within a week.",
      fr: "Un Ascendant Poissons vous donne souvent un abord doux, rêveur et propice aux confidences ; les autres voient volontiers en vous ce qu’ils espèrent y voir. Face à une situation nouvelle, vous sentez l’ambiance avant de décider quoi que ce soit. Dans un nouveau travail, vos collègues vous confient peut-être leurs soucis dès la première semaine.",
    },
    midheaven: {
      en: "With Pisces on the Midheaven, you tend to look for a vocation more than a career: art, music, film, healing, spiritual work or charity. Your reputation may rest on compassion or imagination, and your path may change direction more than once.",
      fr: "Avec les Poissons au Milieu du Ciel, vous cherchez souvent une vocation plus qu’une carrière : art, musique, cinéma, soin, spiritualité ou action caritative. Votre réputation peut reposer sur votre compassion ou votre imagination, et votre parcours changer de direction plus d’une fois.",
    },
  },
};

/** What each house covers. `area` is a noun phrase used inside SignText.onCusp templates. */
export type HouseText = {
  what: Bi;
  area: Bi;
  example: Bi;
  empty: Bi;
};

export const HOUSE_TEXT: Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12, HouseText> = {
  1: {
    what: {
      en: "The 1st house describes the self: the body, vitality, appearance and the way someone meets life and starts things. Traditionally called the house of life, it begins at the Ascendant in most house systems. It is angular, the strongest type of house, so planets here are prominent and visible in behaviour. Its opposite is the 7th, forming the axis of self and other.",
      fr: "La Maison I décrit le soi : le corps, la vitalité, l’apparence et la manière d’aborder la vie et de commencer les choses. Appelée traditionnellement maison de la vie, elle commence à l’Ascendant dans la plupart des systèmes de maisons. C’est une maison angulaire, le type de maison le plus puissant : les planètes qui s’y trouvent sont mises en avant et se voient dans le comportement. Elle fait face à la Maison VII, avec laquelle elle forme l’axe du soi et de l’autre.",
    },
    area: {
      en: "identity, the body and first impressions",
      fr: "l’identité, le corps et les premières impressions",
    },
    example: {
      en: "Mars in the 1st often shows someone who walks fast, speaks plainly and is quick to take the lead; with the Moon here instead, moods tend to show on the face, and others read them easily.",
      fr: "Mars en Maison I se traduit souvent par une démarche rapide, un parler franc et une tendance à prendre les devants ; avec la Lune à cette place, les humeurs se lisent plutôt sur le visage, et l’entourage les perçoit facilement.",
    },
    empty: {
      en: "An empty 1st house is common and does not mean a faint personality. The rising sign, and the house and sign of its ruler, the chart ruler, describe how someone comes across.",
      fr: "Une Maison I sans planète est fréquente et ne signifie pas une personnalité effacée. Le signe de l’Ascendant, ainsi que la maison et le signe de son maître, le maître du thème, décrivent la façon dont on se présente.",
    },
  },
  2: {
    what: {
      en: "The 2nd house covers money, possessions, earning ability and self-worth: what someone has, uses and values. Traditionally it is the house of livelihood. It is succedent: it follows an angle, and succedent houses are about building up and keeping resources. It faces the 8th: together they form the axis of what is one’s own and what is shared.",
      fr: "La Maison II concerne l’argent, les biens, la capacité à gagner sa vie et l’estime de soi : ce que l’on possède, ce que l’on utilise et ce à quoi l’on tient. On l’appelait traditionnellement la maison des moyens d’existence. C’est une maison succédente : elle suit un angle, et les maisons de ce type servent à accumuler et à conserver. La Maison VIII lui fait face : ensemble, elles forment l’axe de ce qui est à soi et de ce qui est partagé.",
    },
    area: {
      en: "money, possessions and self-worth",
      fr: "l’argent, les biens et l’estime de soi",
    },
    example: {
      en: "Venus in the 2nd often points to someone who earns through pleasant or artistic work and enjoys spending on beautiful things; with Saturn here, money may feel tight early on, and patient saving tends to build lasting security.",
      fr: "Vénus en Maison II indique souvent quelqu’un qui gagne sa vie par un travail agréable ou artistique et aime dépenser pour de belles choses ; avec Saturne à cette place, l’argent peut sembler rare au début, et une épargne patiente construit souvent une sécurité durable.",
    },
    empty: {
      en: "An empty 2nd house says nothing about being short of money. The sign on its cusp shows how earning and spending are handled, and its ruler’s placement shows where income often comes from.",
      fr: "Une Maison II vide ne dit rien d’un éventuel manque d’argent. Le signe sur sa cuspide montre la manière de gagner et de dépenser, et la position de son maître indique d’où viennent souvent les revenus.",
    },
  },
  3: {
    what: {
      en: "The 3rd house covers everyday communication, early learning, siblings, neighbours and short trips: the local world someone moves through each day. Traditionally it is the house of brothers and sisters, and the Moon was said to rejoice here. It is cadent, falling away from an angle, which links it to learning, adjusting and exchanging information. Opposite lies the 9th, and together they span near and distant knowledge.",
      fr: "La Maison III concerne la communication de tous les jours, les premiers apprentissages, les frères et sœurs, le voisinage et les petits déplacements : le monde proche que l’on parcourt chaque jour. C’est traditionnellement la maison de la fratrie, et la tradition dit que la Lune s’y plaît particulièrement. C’est une maison cadente, qui « tombe » après un angle, ce qui la lie à l’apprentissage, à l’adaptation et à l’échange d’informations. En face se trouve la Maison IX : ensemble, elles relient le savoir proche et le savoir lointain.",
    },
    area: {
      en: "communication, learning, siblings and short trips",
      fr: "la communication, l’apprentissage, les frères et sœurs et les petits déplacements",
    },
    example: {
      en: "Mercury in the 3rd often shows someone who is always messaging, reading or explaining, and who may write or teach with ease; with Mars here, arguments flare quickly and end quickly, and a sibling rivalry may have sharpened the wits early.",
      fr: "Mercure en Maison III montre souvent quelqu’un qui écrit des messages, lit ou explique sans arrêt, et qui peut écrire ou enseigner avec aisance ; avec Mars à cette place, les discussions s’enflamment vite et retombent aussi vite, et une rivalité entre frères et sœurs a parfois aiguisé l’esprit très tôt.",
    },
    empty: {
      en: "When the 3rd house is empty, communication and learning are not missing. The sign on its cusp describes the everyday way of thinking and talking, and its ruler shows where that curiosity goes.",
      fr: "Une Maison III vide ne signifie pas que la communication ou l’apprentissage fassent défaut. Le signe sur sa cuspide décrit la façon de penser et de parler au quotidien, et son maître montre où se porte cette curiosité.",
    },
  },
  4: {
    what: {
      en: "The 4th house covers home, family, roots and a parent; traditionally it also shows how matters end. In most house systems its cusp is the IC, the point at the bottom of the chart. It is angular, so planets here are strong, though they show more in private than in public. Its opposite is the 10th, forming the axis of private and public life.",
      fr: "La Maison IV concerne le foyer, la famille, les racines et l’un des parents ; traditionnellement, elle montre aussi comment les choses se terminent. Dans la plupart des systèmes de maisons, sa cuspide est le Fond du Ciel, le point situé en bas du thème. C’est une maison angulaire : les planètes y sont fortes, même si elles se manifestent davantage dans la vie privée qu’en public. Elle fait face à la Maison X, avec laquelle elle forme l’axe de la vie privée et de la vie publique.",
    },
    area: {
      en: "home, family and roots",
      fr: "le foyer, la famille et les racines",
    },
    example: {
      en: "The Moon in the 4th often shows someone for whom home is a real refuge, who cooks family recipes and stays close to relatives; with Uranus here, the family may have moved often or lived in an unconventional way.",
      fr: "La Lune en Maison IV montre souvent quelqu’un pour qui le foyer est un vrai refuge, qui cuisine les recettes de famille et reste proche des siens ; avec Uranus à cette place, la famille a peut-être souvent déménagé ou vécu de façon peu conventionnelle.",
    },
    empty: {
      en: "Without planets in the 4th, home and family still matter. The sign on the IC describes the feel of home and roots, and its ruler shows where the need for a base plays out.",
      fr: "Sans planète en Maison IV, le foyer et la famille comptent tout autant. Le signe du Fond du Ciel décrit l’atmosphère du foyer et des origines, et son maître montre où se joue le besoin d’une base solide.",
    },
  },
  5: {
    what: {
      en: "The 5th house covers creativity, pleasure, romance, children and play: what someone does for joy rather than duty. Traditionally it was the house of good fortune, and Venus was thought to be at her happiest here. It is succedent, a house of building up, here through what is made and enjoyed. Across the chart lies the 11th, and together they balance personal expression and group life.",
      fr: "La Maison V concerne la créativité, le plaisir, les amours, les enfants et le jeu : ce que l’on fait par goût plutôt que par devoir. On l’appelait traditionnellement la maison de la bonne fortune, et Vénus était censée y être particulièrement heureuse. C’est une maison succédente, qui fait fructifier, ici à travers ce que l’on crée et ce que l’on savoure. À l’opposé se trouve la Maison XI : ensemble, elles équilibrent expression personnelle et vie collective.",
    },
    area: {
      en: "creativity, pleasure, romance and children",
      fr: "la créativité, le plaisir, les amours et les enfants",
    },
    example: {
      en: "Several planets in the 5th often show someone who needs a creative outlet, such as a stage, a hobby or a sports team, to feel fully alive; with Jupiter here, generosity towards children and a taste for fun and games are common.",
      fr: "Plusieurs planètes en Maison V montrent souvent quelqu’un qui a besoin d’un exutoire créatif, une scène, un loisir ou une équipe de sport, pour se sentir pleinement vivant ; avec Jupiter à cette place, la générosité envers les enfants et le goût du jeu sont fréquents.",
    },
    empty: {
      en: "Having no planets in the 5th does not rule out creativity, romance or children. The sign on its cusp shows the style of play and affection, and its ruler shows where enjoyment is found.",
      fr: "Une Maison V sans planète n’exclut ni la créativité, ni les amours, ni les enfants. Le signe sur sa cuspide montre la manière de jouer et d’aimer, et son maître indique où se trouve le plaisir.",
    },
  },
  6: {
    what: {
      en: "The 6th house covers daily work, routines, health habits, pets and service: how someone organises ordinary days and looks after the body. Traditionally it was the house of illness and toil, and Mars was said to rejoice here. It is cadent, a house of adjustment, which fits its focus on skills, maintenance and improvement. It pairs with the 12th opposite, on the axis of daily order and retreat.",
      fr: "La Maison VI concerne le travail quotidien, les routines, l’hygiène de vie, les animaux domestiques et le service rendu : la façon d’organiser les journées ordinaires et de prendre soin du corps. On l’appelait traditionnellement la maison de la maladie et de la peine, et l’on disait que Mars s’y réjouissait. C’est une maison cadente, une maison d’ajustement, ce qui correspond bien à son souci du savoir-faire, de l’entretien et de l’amélioration. Elle forme avec la Maison XII, située en face, l’axe de l’ordre quotidien et du retrait.",
    },
    area: {
      en: "daily work, routines and health habits",
      fr: "le travail quotidien, les routines et l’hygiène de vie",
    },
    example: {
      en: "Several planets in the 6th often point to someone whose job, routines and work habits take up much of their attention; with Saturn here, a firm daily schedule may be what helps them feel well and get things done.",
      fr: "Plusieurs planètes en Maison VI désignent souvent quelqu’un dont le travail, les routines et les habitudes occupent une grande part de l’attention ; avec Saturne à cette place, un emploi du temps rigoureux est peut-être ce qui l’aide à se sentir bien et à avancer.",
    },
    empty: {
      en: "An empty 6th house does not mean poor health or a weak work ethic. The sign on its cusp describes how routines and tasks are handled, and its ruler shows where daily effort goes.",
      fr: "Une Maison VI vide ne signifie ni une santé fragile ni un manque de sérieux au travail. Le signe sur sa cuspide décrit la manière de gérer routines et tâches, et son maître montre où va l’effort quotidien.",
    },
  },
  7: {
    what: {
      en: "The 7th house, traditionally the house of marriage, covers partners of every kind: spouses, close collaborators and open rivals, anyone met one to one. In most house systems its cusp is the Descendant, the degree setting in the west. It is angular, so planets here are strong and often experienced through other people. It faces the 1st, and this axis is about self and other.",
      fr: "La Maison VII, traditionnellement celle du mariage, concerne les partenaires de toutes sortes : conjoints, proches collaborateurs et adversaires déclarés, toutes les personnes que l’on rencontre en face à face. Dans la plupart des systèmes de maisons, sa cuspide est le Descendant, le degré qui se couche à l’ouest. C’est une maison angulaire : les planètes y sont fortes et se vivent souvent à travers les autres. Elle fait face à la Maison I, et cet axe est celui du soi et de l’autre.",
    },
    area: {
      en: "partnership, marriage and close collaboration",
      fr: "la vie de couple, le mariage et les associations",
    },
    example: {
      en: "Venus in the 7th often shows someone who thrives in partnership and tends to attract considerate, sociable partners; with Mars here, relationships are lively and sometimes combative, and partners are often energetic or competitive people.",
      fr: "Vénus en Maison VII montre souvent quelqu’un qui s’épanouit à deux et attire volontiers des partenaires attentionnés et sociables ; avec Mars à cette place, les relations sont vivantes, parfois combatives, et les partenaires sont souvent des personnes énergiques ou compétitives.",
    },
    empty: {
      en: "Plenty of charts have an empty 7th; this does not mean staying single. The sign on the Descendant describes what is sought in a partner, and its ruler shows where relationships often begin.",
      fr: "Beaucoup de thèmes ont une Maison VII vide, ce qui ne signifie pas une vie sans couple. Le signe du Descendant décrit ce que l’on cherche chez un partenaire, et son maître montre où les relations se nouent souvent.",
    },
  },
  8: {
    what: {
      en: "The 8th house covers shared resources, debt, inheritance, taxes and other people’s money, along with intimacy, crises and deep change. Traditionally it was the house of death, which modern astrology reads more broadly as endings and transformation. As a succedent house, it deals with what is held jointly and what is exchanged. Its opposite, the 2nd, completes the axis of own and shared resources.",
      fr: "La Maison VIII concerne les ressources partagées, les dettes, les héritages, les impôts et l’argent des autres, ainsi que l’intimité, les crises et les changements profonds. On l’appelait traditionnellement la maison de la mort, que l’astrologie moderne lit plus largement comme celle des fins et des transformations. En tant que maison succédente, elle concerne ce que l’on détient en commun et ce que l’on échange. La Maison II, en face, complète l’axe des ressources propres et des ressources partagées.",
    },
    area: {
      en: "shared resources, intimacy and times of crisis",
      fr: "les ressources partagées, l’intimité et les périodes de crise",
    },
    example: {
      en: "Jupiter in the 8th often shows someone who handles other people’s money well or benefits from a partner’s resources, a loan or an investment; with the Moon here, emotional bonds tend to be intense and very private.",
      fr: "Jupiter en Maison VIII montre souvent quelqu’un qui gère bien l’argent des autres ou bénéficie des ressources d’un partenaire, d’un prêt ou d’un placement ; avec la Lune à cette place, les liens affectifs sont souvent intenses et très secrets.",
    },
    empty: {
      en: "With no planets in the 8th, intimacy and joint finances still play their part. The sign on its cusp describes how trust, debts and crises are handled, and its ruler shows where they arise.",
      fr: "Une Maison VIII vide n’empêche ni l’intimité ni les finances partagées. Le signe sur sa cuspide décrit la façon de vivre la confiance, les dettes et les crises, et son maître montre où ces questions se posent.",
    },
  },
  9: {
    what: {
      en: "The 9th house covers higher learning, long journeys, beliefs, philosophy, law and publishing: everything that widens someone’s view of the world. Traditionally it was the house of religion and travel, and the Sun was said to be happiest here. Being cadent, it deals with learning and understanding more than with action. The 3rd lies opposite, forming the axis of local and far-reaching knowledge.",
      fr: "La Maison IX concerne les études supérieures, les grands voyages, les croyances, la philosophie, le droit et l’édition : tout ce qui élargit la vision du monde. On l’appelait traditionnellement la maison de la religion et des voyages, et le Soleil passait pour s’y trouver le mieux. Maison cadente, elle relève de l’apprentissage et de la compréhension plus que de l’action. La Maison III lui fait face, formant l’axe du savoir proche et du savoir lointain.",
    },
    area: {
      en: "higher learning, long journeys and beliefs",
      fr: "les études supérieures, les grands voyages et les convictions",
    },
    example: {
      en: "Jupiter in the 9th often shows someone who studies for years, travels widely or teaches, and holds strong but generous beliefs; with Mercury here, languages, writing and debating ideas across cultures tend to come easily.",
      fr: "Jupiter en Maison IX montre souvent quelqu’un qui étudie longtemps, voyage beaucoup ou enseigne, avec des convictions fortes mais généreuses ; avec Mercure à cette place, les langues, l’écriture et le débat d’idées entre cultures viennent souvent facilement.",
    },
    empty: {
      en: "Travel and ideas can matter greatly even with an empty 9th house. The sign on its cusp describes the approach to study and belief, and its ruler shows where the search for meaning leads.",
      fr: "Les voyages et les idées peuvent compter énormément, même avec une Maison IX vide. Le signe sur sa cuspide décrit le rapport aux études et aux croyances, et son maître montre où mène la quête de sens.",
    },
  },
  10: {
    what: {
      en: "The 10th house covers career, reputation, public role and authority: what someone is known for and how they relate to bosses and status. Its cusp is usually the Midheaven, the top of the chart. It is angular, and traditionally the house of rank and action, so planets here tend to shape public life. Opposite is the 4th; together they form the axis of public and private life.",
      fr: "La Maison X concerne la carrière, la réputation, le rôle public et l’autorité : ce pour quoi l’on est connu, et le rapport aux supérieurs et au statut. Dans la plupart des systèmes de maisons, sa cuspide est le Milieu du Ciel, le sommet du thème. C’est une maison angulaire, traditionnellement celle du rang et de l’action : les planètes qui s’y trouvent marquent souvent la vie publique. En face se trouve la Maison IV ; ensemble, elles forment l’axe de la vie publique et de la vie privée.",
    },
    area: {
      en: "career, reputation and public standing",
      fr: "la carrière, la réputation et la position sociale",
    },
    example: {
      en: "The Sun in the 10th often shows someone who wants recognition for their work and may end up in a leading or visible role; with Neptune here, the career may involve art, care or several changes of direction.",
      fr: "Le Soleil en Maison X montre souvent quelqu’un qui tient à la reconnaissance de son travail et accède parfois à un rôle de direction ou très exposé ; avec Neptune à cette place, la carrière passe volontiers par l’art, le soin ou plusieurs changements de cap.",
    },
    empty: {
      en: "Career and ambition are not missing when the 10th house is empty. The sign on the Midheaven describes the reputation someone aims for, and its ruler shows where professional effort tends to go.",
      fr: "Une Maison X vide ne signifie ni absence de carrière ni manque d’ambition. Le signe du Milieu du Ciel décrit la réputation recherchée, et son maître montre où se porte l’effort professionnel.",
    },
  },
  11: {
    what: {
      en: "The 11th house covers friends, groups, networks, allies and hopes for the future: the people someone chooses to build things with. Traditionally it was the house of the Good Spirit and of benefactors, and Jupiter was said to rejoice here. It is succedent, building up support and resources through connections. It faces the 5th, forming the axis of personal expression and collective life.",
      fr: "La Maison XI concerne les amis, les groupes, les réseaux, les alliés et les espoirs pour l’avenir : les personnes avec qui l’on choisit de construire. On l’appelait traditionnellement la maison du Bon Génie et des bienfaiteurs, et la tradition dit que Jupiter s’y plaît particulièrement. C’est une maison succédente, qui accumule soutiens et ressources grâce aux relations. Elle fait face à la Maison V, formant l’axe de l’expression personnelle et de la vie collective.",
    },
    area: {
      en: "friends, groups and hopes for the future",
      fr: "les amitiés, les groupes et les projets d’avenir",
    },
    example: {
      en: "Planets gathered in the 11th often show someone whose friendships, clubs or online communities are central, and who achieves more through networks than alone; with Saturn here, friends may be few but loyal, and often older.",
      fr: "Des planètes réunies en Maison XI montrent souvent quelqu’un pour qui les amitiés, les clubs ou les communautés en ligne sont essentiels, et qui accomplit davantage en réseau que seul ; avec Saturne à cette place, les amis sont parfois peu nombreux mais fidèles, et souvent plus âgés.",
    },
    empty: {
      en: "Having friends does not depend on planets in the 11th. The sign on its cusp describes how someone fits into groups, and its ruler shows where allies and future plans are found.",
      fr: "Avoir des amis ne dépend pas de la présence de planètes en Maison XI. Le signe sur sa cuspide décrit la façon de trouver sa place dans un groupe, et son maître montre où se trouvent les alliés et les projets d’avenir.",
    },
  },
  12: {
    what: {
      en: "The 12th house covers solitude, rest, retreat, what is hidden or behind the scenes, and institutions such as hospitals or monasteries. Traditionally it was the house of confinement and self-undoing, and Saturn was said to rejoice here. It is cadent, so planets here tend to work quietly, through the inner life or out of sight. Its opposite is the 6th, completing the axis of daily order and withdrawal.",
      fr: "La Maison XII concerne la solitude, le repos, le retrait, ce qui est caché ou se passe en coulisses, et les institutions comme les hôpitaux ou les monastères. On l’appelait traditionnellement la maison de l’enfermement et des épreuves que l’on se crée soi-même, et Saturne était censé s’y plaire. C’est une maison cadente : les planètes y agissent souvent en silence, par la vie intérieure ou loin des regards. La Maison VI, en face, complète l’axe de l’ordre quotidien et du retrait.",
    },
    area: {
      en: "solitude, rest and life behind the scenes",
      fr: "la solitude, le repos et les coulisses de la vie",
    },
    example: {
      en: "Several planets in the 12th often show someone who needs regular time alone and may work behind the scenes, in research, hospitals or backstage; with Neptune here, music, meditation or dreams tend to matter a great deal.",
      fr: "Plusieurs planètes en Maison XII montrent souvent quelqu’un qui a besoin de moments de solitude réguliers et travaille parfois en coulisses, dans la recherche, à l’hôpital ou dans l’ombre d’une scène ; avec Neptune à cette place, la musique, la méditation ou les rêves comptent beaucoup.",
    },
    empty: {
      en: "An empty 12th house is common and simply puts less emphasis here. The sign on its cusp describes how someone rests and withdraws, and its ruler shows where private or hidden matters surface.",
      fr: "Une Maison XII vide est fréquente et indique simplement que ce domaine est moins souligné. Le signe sur sa cuspide décrit la manière de se reposer et de se retirer, et son maître montre où les questions intimes ou cachées refont surface.",
    },
  },
};

export const ELEMENT_TEXT: Record<"fire" | "earth" | "air" | "water", Bi> = {
  fire: {
    en: "Fire describes action driven by enthusiasm, confidence and the need to express oneself. The fire signs are Aries, Leo and Sagittarius. A chart strong in fire often belongs to someone who acts on inspiration, saying yes to a new project before checking the calendar.",
    fr: "Le feu décrit une action portée par l’enthousiasme, la confiance et le besoin de s’exprimer. Les signes de feu sont le Bélier, le Lion et le Sagittaire. Un thème riche en feu appartient souvent à quelqu’un qui agit sur l’inspiration du moment et accepte un nouveau projet avant d’avoir consulté son agenda.",
  },
  earth: {
    en: "Earth describes a practical, concrete approach centred on results, the body, money and material security. The earth signs are Taurus, Virgo and Capricorn. With plenty of earth, people tend to trust what can be tested, for example getting three quotes before any repair to the house.",
    fr: "La terre décrit une approche pratique et concrète, centrée sur les résultats, le corps, l’argent et la sécurité matérielle. Les signes de terre sont le Taureau, la Vierge et le Capricorne. Avec beaucoup de terre, on se fie à ce qui peut être vérifié : par exemple, demander trois devis avant les moindres travaux dans la maison.",
  },
  air: {
    en: "Air describes thinking, communication and relationships: making sense of things through ideas, words and exchange. The air signs are Gemini, Libra and Aquarius. Someone with a strong air emphasis often needs to talk a decision through, calling a few friends about a job offer before choosing.",
    fr: "L’air décrit la pensée, la communication et les relations : comprendre les choses par les idées, les mots et l’échange. Les signes d’air sont les Gémeaux, la Balance et le Verseau. Une personne à dominante air a souvent besoin de parler d’une décision, et appelle quelques amis au sujet d’une offre d’emploi avant de choisir.",
  },
  water: {
    en: "Water describes feeling, sensitivity and attachment: understanding situations through emotion, memory and empathy. The water signs are Cancer, Scorpio and Pisces. When water dominates, someone often senses tension in a room at once and decides by what feels right rather than by a list of pros and cons.",
    fr: "L’eau décrit le sentiment, la sensibilité et l’attachement : comprendre les situations par l’émotion, la mémoire et l’empathie. Les signes d’eau sont le Cancer, le Scorpion et les Poissons. Quand l’eau domine, on perçoit souvent tout de suite la tension dans une pièce, et l’on décide selon ce que l’on ressent plutôt qu’en pesant le pour et le contre.",
  },
};

export const MODALITY_TEXT: Record<"cardinal" | "fixed" | "mutable", Bi> = {
  cardinal: {
    en: "Cardinal describes initiative: starting things, setting direction and meeting change by acting. The cardinal signs, Aries, Cancer, Libra and Capricorn, begin at the equinoxes and solstices, when each season starts. A cardinal emphasis often shows as someone who launches projects easily but may leave the upkeep to others.",
    fr: "Le mode cardinal décrit l’initiative : lancer les choses, donner une direction, répondre au changement par l’action. Les signes cardinaux, Bélier, Cancer, Balance et Capricorne, commencent aux équinoxes et aux solstices, au début de chaque saison. Une dominante cardinale se traduit souvent par une personne qui lance facilement des projets mais laisse parfois aux autres le soin de les entretenir.",
  },
  fixed: {
    en: "Fixed describes persistence: stabilising, maintaining and seeing things through. Taurus, Leo, Scorpio and Aquarius are fixed; they fall in mid-season, when it is most settled. A fixed emphasis often shows as staying power, such as keeping the same job and friends for decades, and as reluctance to change course.",
    fr: "Le mode fixe décrit la persévérance : stabiliser, entretenir, mener les choses à terme. Le Taureau, le Lion, le Scorpion et le Verseau sont fixes ; ils se situent au milieu de chaque saison, quand elle est la mieux installée. Une dominante fixe se traduit souvent par de la constance, comme garder le même emploi et les mêmes amis pendant des décennies, et par une réticence à changer de cap.",
  },
  mutable: {
    en: "Mutable describes adaptability: adjusting, learning and preparing for what comes next. Gemini, Virgo, Sagittarius and Pisces are mutable; they end each season. A mutable emphasis often shows as someone who handles changing plans well, rewriting a schedule on the fly, but finds it harder to commit.",
    fr: "Le mode mutable décrit l’adaptabilité : s’ajuster, apprendre, préparer la suite. Les Gémeaux, la Vierge, le Sagittaire et les Poissons sont mutables ; ils terminent chaque saison. Une dominante mutable se traduit souvent par une personne à l’aise avec les changements de programme, capable de refaire un planning au pied levé, mais qui a plus de mal à s’engager.",
  },
};

export const DIGNITY_TEXT: Record<"domicile" | "exaltation" | "detriment" | "fall" | "peregrine", Bi> = {
  domicile: {
    en: "A planet is in domicile when it is in a sign it rules. Its function works in a familiar setting and can act on its own terms. Venus in Taurus is an example: the side of Venus that seeks pleasure and builds relationships finds an easy, sensual outlet.",
    fr: "Une planète est en domicile quand elle se trouve dans un signe qu’elle gouverne. Sa fonction s’exerce alors en terrain familier et peut agir selon ses propres règles. Vénus en Taureau en est un exemple : le côté de Vénus qui recherche le plaisir et tisse des liens y trouve une expression facile et sensuelle.",
  },
  exaltation: {
    en: "A planet is exalted in a sign where, by tradition, its best qualities are raised and honoured, though it is a guest there rather than at home. The Sun is exalted in Aries, where the will to act and to lead finds a strong, direct expression.",
    fr: "Une planète est en exaltation dans un signe où, selon la tradition, ses meilleures qualités sont élevées et mises à l’honneur, même si elle y est une invitée plutôt que chez elle. Le Soleil est en exaltation en Bélier, où la volonté d’agir et de mener trouve une expression forte et directe.",
  },
  detriment: {
    en: "A planet is in detriment in the sign opposite one it rules. Its function works outside its comfort zone and needs more effort, which can build unusual skill. Mars in Libra is an example: assertion has to pass through diplomacy, which may show as hesitation or as skilled negotiation.",
    fr: "Une planète est en exil dans le signe opposé à l’un de ceux qu’elle gouverne. Sa fonction agit hors de son terrain habituel et demande plus d’effort, ce qui peut aussi développer un savoir-faire peu commun. Mars en Balance en est un exemple : l’affirmation de soi doit passer par la diplomatie, ce qui peut se traduire par de l’hésitation ou par un vrai talent pour la négociation.",
  },
  fall: {
    en: "A planet is in fall in the sign opposite its exaltation. Its function gets less support there and may work hesitantly or indirectly, though not necessarily badly. The Moon in Scorpio is an example: the need for comfort meets intensity, so feelings run deep and are often kept hidden.",
    fr: "Une planète est en chute dans le signe opposé à celui de son exaltation. Sa fonction y est moins soutenue et peut s’exprimer avec hésitation ou de façon détournée, sans pour autant mal fonctionner. La Lune en Scorpion en est un exemple : le besoin de réconfort rencontre l’intensité, si bien que les émotions sont profondes et souvent gardées secrètes.",
  },
  peregrine: {
    en: "A planet is peregrine (Latin for foreigner) when it holds no dignity where it stands, neither domicile, exaltation, triplicity, term nor face, and is not in its detriment or fall either. Like a traveller, it relies on its aspects and on the ruler of its sign; the Moon in Gemini, for example, leans on Mercury’s condition.",
    fr: "Une planète est pérégrine (du latin peregrinus, étranger) quand elle n’a aucune dignité là où elle se trouve, ni domicile, ni exaltation, ni triplicité, ni terme, ni face, sans être non plus en exil ou en chute. Comme une voyageuse, elle s’appuie sur ses aspects et sur le maître de son signe ; la Lune en Gémeaux, par exemple, dépend de l’état de Mercure.",
  },
};

export const RETROGRADE_TEXT: {
  general: Bi;
  byPlanet: Record<"mercury" | "venus" | "mars" | "jupiter" | "saturn" | "uranus" | "neptune" | "pluto" | "chiron", Bi>;
} = {
  general: {
    en: "A planet is retrograde when, seen from Earth, it appears to move backwards through the zodiac. This comes from the relative motion of Earth and the planet; the planet never really reverses. In a birth chart it is read as a function that turns inward: reviewed, questioned and developed in its own way, less automatic but not weaker.",
    fr: "Une planète est dite rétrograde quand, vue depuis la Terre, elle semble reculer dans le zodiaque. C’est un effet du mouvement relatif de la Terre et de la planète : celle-ci ne fait jamais réellement demi-tour. Dans un thème natal, on y lit une fonction qui se tourne vers l’intérieur : revue, questionnée et développée à sa manière, moins automatique mais pas plus faible.",
  },
  byPlanet: {
    mercury: {
      en: "Mercury is retrograde about three times a year, three weeks each time, so roughly one person in five has it natally. It often shows as thinking before speaking, learning in an unusual order, and a gift for revising and research.",
      fr: "Mercure est rétrograde environ trois fois par an, trois semaines à chaque fois : à peu près une personne sur cinq l’a dans son thème natal. Cela se traduit souvent par un besoin de réfléchir avant de parler, une façon d’apprendre dans un ordre inhabituel et un talent pour la relecture et la recherche.",
    },
    venus: {
      en: "Venus is retrograde about every 19 months for some six weeks, so only about 7% of people are born with it. It often means tastes and values formed apart from fashion, and affection that takes time to express but lasts.",
      fr: "Vénus est rétrograde tous les 19 mois environ, pendant près de six semaines : à peine 7 % des gens naissent avec cette position. Elle indique souvent des goûts et des valeurs forgés à l’écart des modes, et une affection qui met du temps à s’exprimer mais qui dure.",
    },
    mars: {
      en: "Mars is retrograde about every two years for roughly ten weeks, so around one person in ten has it natally. Drive and anger tend to be processed inwardly first, then used with strategy rather than on impulse.",
      fr: "Mars est rétrograde environ tous les deux ans, pendant une dizaine de semaines : à peu près une personne sur dix l’a dans son thème natal. L’élan et la colère sont d’abord travaillés à l’intérieur, puis utilisés avec stratégie plutôt que sur un coup de tête.",
    },
    jupiter: {
      en: "Jupiter is retrograde for about four months out of every thirteen, so nearly a third of people have it natally. It often shows as beliefs and confidence built from one’s own experience rather than borrowed, and growth through reflection.",
      fr: "Jupiter est rétrograde environ quatre mois sur treize : près d’un tiers des gens l’ont dans leur thème natal. Cela se traduit souvent par des convictions et une confiance bâties sur l’expérience personnelle plutôt qu’empruntées, et par une croissance qui passe par la réflexion.",
    },
    saturn: {
      en: "Saturn is retrograde about four and a half months each year, so over a third of people have it natally. It often shows as strict inner standards and rules made for oneself, with authority questioned before it is accepted.",
      fr: "Saturne est rétrograde environ quatre mois et demi par an : plus d’un tiers des gens l’ont dans leur thème natal. Cela se traduit souvent par des exigences intérieures strictes et des règles que l’on se fixe soi-même, l’autorité étant remise en question avant d’être acceptée.",
    },
    uranus: {
      en: "Uranus is retrograde about five months each year, so many people share it; it matters mainly when Uranus is prominent. It tends to show as independence expressed quietly, with inner change coming before outward rebellion.",
      fr: "Uranus est rétrograde environ cinq mois par an : beaucoup de gens partagent cette position, qui compte surtout quand Uranus occupe une place forte dans le thème. Elle se traduit souvent par une indépendance vécue discrètement, le changement intérieur précédant la rébellion visible.",
    },
    neptune: {
      en: "Neptune is retrograde over five months each year, so this is common and matters most when Neptune is prominent. It tends to turn imagination and idealism inward, into a private spiritual life, art, or a sharp eye for illusions.",
      fr: "Neptune est rétrograde plus de cinq mois par an : c’est donc fréquent, et cela compte surtout quand Neptune est en vue dans le thème. L’imagination et l’idéalisme se tournent alors vers l’intérieur, vers une vie spirituelle intime, l’art, ou un œil aiguisé pour repérer les illusions.",
    },
    pluto: {
      en: "Pluto spends over five months of each year retrograde, so many people have it; it matters most when Pluto is prominent. Questions of power and control tend to be worked through privately, and change begins inside before it shows.",
      fr: "Pluton passe plus de cinq mois par an en rétrogradation : beaucoup de gens l’ont ainsi, et cela compte surtout quand Pluton est mis en avant dans le thème. Les questions de pouvoir et de contrôle se travaillent alors en privé, et le changement commence à l’intérieur avant de se voir.",
    },
    chiron: {
      en: "Chiron is retrograde about five months a year, so this is common. An old hurt, or a sense of not quite fitting in, tends to be worked on privately, and what is learned may later help others.",
      fr: "Chiron est rétrograde environ cinq mois par an : c’est donc fréquent. Une vieille blessure, ou le sentiment de ne pas tout à fait trouver sa place, se travaille plutôt en privé, et ce que l’on en apprend peut ensuite aider les autres.",
    },
  },
};

export const BASICS_TEXT: {
  signs: Bi;
  houses: Bi;
  planets: Bi;
  aspects: Bi;
  decans: Bi;
  angles: Bi;
  chartRuler: Bi;
  intercepted: Bi;
  stellium: Bi;
  sect: Bi;
  timeUnknown: Bi;
} = {
  signs: {
    en: "The twelve signs are equal 30° sections of the ecliptic, the Sun’s apparent yearly path through the sky. Western astrology usually uses the tropical zodiac, which starts at the March equinox and follows the seasons; it no longer lines up with the constellations of the same names, because precession has shifted the equinox by nearly a whole sign against the stars over some two thousand years. In a chart, a planet’s sign describes its style: how that function tends to work.",
    fr: "Les douze signes sont des secteurs égaux de 30° découpés sur l’écliptique, la trajectoire apparente du Soleil dans le ciel au fil de l’année. L’astrologie occidentale utilise en général le zodiaque tropical, qui commence à l’équinoxe de mars et suit les saisons ; il ne coïncide plus avec les constellations du même nom, car la précession a décalé l’équinoxe de presque un signe entier par rapport aux étoiles en deux mille ans environ. Dans un thème, le signe d’une planète décrit son style : la manière dont sa fonction tend à s’exprimer.",
  },
  houses: {
    en: "Houses divide the chart into twelve sections based on the Earth’s daily rotation, starting from the Ascendant, the degree rising on the eastern horizon at birth. Because the wheel of houses turns once a day, shifting by roughly one sign every two hours, houses need an accurate birth time and place. A planet’s house shows where its function tends to play out: the area of life, such as money, home, work or relationships.",
    fr: "Les maisons divisent le thème en douze secteurs fondés sur la rotation quotidienne de la Terre, à partir de l’Ascendant, le degré qui se lève à l’horizon est au moment de la naissance. Comme la roue des maisons fait un tour complet en une journée, à raison d’un signe toutes les deux heures environ, elles exigent une heure et un lieu de naissance précis. La maison d’une planète montre où sa fonction tend à s’exercer : le domaine de vie concerné, comme l’argent, le foyer, le travail ou les relations.",
  },
  planets: {
    en: "Planets stand for functions or drives: the Moon for emotional needs, Mercury for thinking and talking, Mars for drive and assertion, and so on. A simple way to read any placement is that the planet says what, the sign says how and the house says where. Aspects, the angles between planets, show how these functions interact: whether they blend, support or strain each other.",
    fr: "Les planètes représentent des fonctions ou des besoins : la Lune les besoins affectifs, Mercure la pensée et la parole, Mars l’élan et l’affirmation de soi, et ainsi de suite. Pour lire une position, une règle simple : la planète dit quoi, le signe dit comment, la maison dit où. Les aspects, c’est-à-dire les angles entre planètes, montrent comment ces fonctions interagissent : si elles fusionnent, se soutiennent ou se contrarient.",
  },
  aspects: {
    en: "Aspects are set angles between two points in the chart, such as the conjunction (0°), sextile (60°), square (90°), trine (120°) and opposition (180°). Each aspect is allowed an orb, a margin of a few degrees around the exact angle, and the tighter the orb, the more strongly it tends to be felt. An aspect is applying while the faster planet is still moving towards the exact angle and separating once it has passed it; applying aspects are traditionally considered the more active.",
    fr: "Les aspects sont des angles précis entre deux points du thème, comme la conjonction (0°), le sextile (60°), le carré (90°), le trigone (120°) et l’opposition (180°). Chaque aspect admet un orbe, une marge de quelques degrés autour de l’angle exact, et plus l’orbe est serré, plus l’aspect se fait sentir. Un aspect est applicatif tant que la planète la plus rapide se rapproche de l’angle exact, et séparatif une fois qu’elle l’a dépassé ; la tradition considère l’aspect applicatif comme le plus actif.",
  },
  decans: {
    en: "Each sign is divided into three decans of 10°. This app uses the element-based decans: the first decan belongs to the sign itself, the second and third to the next signs of the same element, each with that sign’s ruler as sub-ruler. A planet at 25° Taurus, for example, is in the third decan, the Capricorn decan ruled by Saturn, which adds patience and seriousness to the Taurus style.",
    fr: "Chaque signe se divise en trois décans de 10°. Cette application utilise les décans par élément : le premier décan appartient au signe lui-même, le deuxième et le troisième aux signes suivants du même élément, avec le maître de ce signe comme sous-maître. Une planète à 25° Taureau, par exemple, se trouve dans le troisième décan, celui du Capricorne gouverné par Saturne, qui ajoute de la patience et du sérieux au style du Taureau.",
  },
  angles: {
    en: "The four angles come from the horizon and the meridian at the place and moment of birth: the Ascendant (ASC) and Descendant (DSC) are where the zodiac crosses the eastern and western horizon, and the Midheaven (MC) and IC are where it crosses the meridian, above and below the horizon. Because the sky turns about one degree every four minutes, the angles depend on an exact birth time. In most house systems they mark the cusps of the 1st, 7th, 10th and 4th houses, and planets close to them tend to stand out.",
    fr: "Les quatre angles viennent de l’horizon et du méridien au lieu et au moment de la naissance : l’Ascendant (AS) et le Descendant (DS) sont les points où le zodiaque croise l’horizon à l’est et à l’ouest, le Milieu du Ciel (MC) et le Fond du Ciel (FC) ceux où il croise le méridien, au-dessus et au-dessous de l’horizon. Comme le ciel tourne d’environ un degré toutes les quatre minutes, les angles dépendent d’une heure de naissance exacte. Dans la plupart des systèmes de maisons, ils marquent les cuspides des Maisons I, VII, X et IV, et les planètes qui en sont proches ressortent nettement.",
  },
  chartRuler: {
    en: "The chart ruler is the planet that rules the sign on the Ascendant: Mars for Aries rising, Venus for Libra rising, and so on; for Scorpio, Aquarius and Pisces rising, traditional astrology uses Mars, Saturn and Jupiter, and modern astrology Pluto, Uranus and Neptune. Because the Ascendant describes how someone approaches life, the chart ruler’s sign, house and aspects show where that approach is directed and how easily it flows. With Virgo rising, for example, Mercury rules the chart, and Mercury in the 10th house turns much of that attention towards work and public life.",
    fr: "Le maître du thème est la planète qui gouverne le signe de l’Ascendant : Mars pour un Ascendant Bélier, Vénus pour un Ascendant Balance, et ainsi de suite ; pour les Ascendants Scorpion, Verseau et Poissons, l’astrologie traditionnelle retient Mars, Saturne et Jupiter, l’astrologie moderne Pluton, Uranus et Neptune. Comme l’Ascendant décrit la façon d’aborder la vie, le signe, la maison et les aspects du maître du thème montrent où cette approche se dirige et avec quelle aisance elle s’exprime. Avec un Ascendant Vierge, par exemple, Mercure gouverne le thème, et un Mercure en Maison X tourne une grande partie de cette attention vers le travail et la vie publique.",
  },
  intercepted: {
    en: "An intercepted sign lies wholly inside a house without touching any cusp; in exchange, some other sign occupies two consecutive cusps, and interceptions always come in opposite pairs. It happens only in unequal house systems such as Placidus or Koch, more often the further from the equator someone is born, and never with Equal or Whole Sign houses. A common reading is that the intercepted sign’s qualities take longer to reach and express, and develop with experience.",
    fr: "Un signe intercepté se trouve entièrement à l’intérieur d’une maison sans toucher aucune cuspide ; en contrepartie, un autre signe occupe deux cuspides consécutives, et les interceptions vont toujours par paires de signes opposés. Cela n’arrive que dans les systèmes de maisons inégales comme Placidus ou Koch, d’autant plus souvent qu’on naît loin de l’équateur, et jamais en maisons égales ou en signes entiers. Une lecture courante veut que les qualités du signe intercepté soient plus longues à atteindre et à exprimer, et se développent avec l’expérience.",
  },
  stellium: {
    en: "A stellium is a group of three or more planets in one sign or one house; some astrologers ask for four, or for the planets to be linked by conjunction. It concentrates attention on that sign’s style or that house’s area, which tends to become a major theme of the life. Four planets in the 10th house, for example, often go with a strong investment in career and reputation.",
    fr: "Un stellium est un groupe d’au moins trois planètes dans un même signe ou une même maison ; certains astrologues en exigent quatre, ou demandent qu’elles soient reliées par conjonction. Il concentre l’attention sur le style de ce signe ou le domaine de cette maison, qui devient souvent un thème majeur de la vie. Quatre planètes en Maison X, par exemple, vont souvent de pair avec un fort investissement dans la carrière et la réputation.",
  },
  sect: {
    en: "Sect distinguishes day charts, where the Sun is above the horizon at birth, from night charts, where it is below. Traditional astrology uses it to judge which planets work more easily: Jupiter and Saturn are more at ease by day, Venus and Mars by night, while Mercury depends on whether it rises before or after the Sun. In a day chart, for example, Saturn is considered more constructive and Mars harder to handle, and in a night chart the reverse.",
    fr: "La secte distingue les thèmes de jour, où le Soleil est au-dessus de l’horizon à la naissance, des thèmes de nuit, où il est en dessous. L’astrologie traditionnelle s’en sert pour juger quelles planètes agissent le plus facilement : Jupiter et Saturne sont plus à l’aise de jour, Vénus et Mars de nuit, tandis que Mercure dépend de son lever avant ou après le Soleil. Dans un thème de jour, par exemple, Saturne est jugé plus constructif et Mars plus difficile à vivre, et l’inverse dans un thème de nuit.",
  },
  timeUnknown: {
    en: "Without a birth time, the chart is cast for noon, so the Ascendant and houses are only a rough guess and the Moon’s degree is approximate: the Ascendant changes sign roughly every two hours, and the Moon moves about 13° a day. The signs of the Sun and planets, most aspects between them and the overall balance of elements and modalities stay reliable, unless a planet, usually the Moon, changed sign that day.",
    fr: "Sans heure de naissance, le thème est calculé pour midi : l’Ascendant et les maisons ne sont alors qu’une estimation grossière et le degré de la Lune reste approximatif, car l’Ascendant change de signe toutes les deux heures environ et la Lune avance d’environ 13° par jour. Les signes du Soleil et des planètes, la plupart des aspects entre elles et l’équilibre des éléments et des modes restent fiables, sauf si une planète, le plus souvent la Lune, a changé de signe ce jour-là.",
  },
};
