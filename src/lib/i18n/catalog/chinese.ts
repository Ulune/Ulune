/**
 * chinese: [English, French]. The Chinese traditions' interface words
 * (languages plan, part 6 onwards): their Settings card, the birth form's yin
 * or yang count, the solar terms in the Calendar and on the wheel. The terms'
 * own names come with the engine (src/lib/chinese/names.ts).
 *
 * Read by src/lib/chinese/words.ts, not spread into this folder's index:
 * everything that says them is downloaded when used, so they stay out of every
 * page's first download. scripts/i18n-catalog.test.mjs checks them as it
 * checks the others.
 */
export const chinese = {
  // Settings → Chinese traditions (decisions 2, 3 and 5).
  cnSettings: ["Chinese traditions", "Traditions chinoises"],
  cnSettingsLead: [
    "How Chinese terms are written and the Chinese calendar is read. Kept on this device only.",
    "Comment les termes chinois s’écrivent et comment le calendrier chinois se lit. Gardé sur cet appareil uniquement.",
  ],
  cnShow: ["Chinese terms", "Termes chinois"],
  cnShowFull: ["Name, pinyin and characters", "Nom, pinyin et caractères"],
  cnShowPinyin: ["Name and pinyin", "Nom et pinyin"],
  cnShowNames: ["Name only", "Le nom seul"],
  cnShowSample: ["For example: {term}", "Par exemple\u202f: {term}"],
  cnScript: ["Characters", "Caractères"],
  cnScriptHant: ["Traditional", "Traditionnels"],
  cnScriptHantHint: ["As in the classical texts and most Feng Shui practice", "Comme dans les textes classiques et la plupart des pratiques du Feng Shui"],
  cnScriptHans: ["Simplified", "Simplifiés"],
  cnScriptHansHint: ["As mainland China writes them today", "Comme on les écrit aujourd’hui en Chine continentale"],
  cnAnimals: ["The twelve animals", "Les douze animaux"],
  cnAnimalsDrawings: ["Ulune’s drawings", "Les dessins d’Ulune"],
  cnAnimalsDrawingsHint: ["Drawn for Ulune, in the same line as the planets", "Dessinés pour Ulune, du même trait que les planètes"],
  cnAnimalsCharacters: ["Their characters", "Leurs caractères"],
  cnAnimalsCharactersHint: ["As Chinese writes them: 鼠, 牛, 虎…", "Comme le chinois les écrit\u202f: 鼠, 牛, 虎…"],
  cnClock: ["The clock for the hour of birth", "L’horloge de l’heure de naissance"],
  cnClockLead: [
    "Only the day and hour pillars depend on it, and only near the edge of an hour. The year and the month follow the solar terms, which no clock moves.",
    "Seuls les piliers du jour et de l’heure en dépendent, et seulement près du bord d’une heure. L’année et le mois suivent les termes solaires, qu’aucune horloge ne déplace.",
  ],
  cnClockSolar: ["True solar time", "Temps solaire vrai"],
  cnClockSolarHint: [
    "The Sun’s own hour at the birthplace: its longitude and the time of year",
    "L’heure du Soleil au lieu de naissance\u202f: sa longitude et le moment de l’année",
  ],
  cnClockMean: ["Local mean time", "Temps moyen local"],
  cnClockMeanHint: ["The birthplace’s longitude only, 4 minutes a degree", "La longitude du lieu seule, 4 minutes par degré"],
  cnClockCivil: ["The clock on the wall", "L’heure de la pendule"],
  cnClockCivilHint: ["The legal time of the birth, as the certificate gives it", "L’heure légale de la naissance, celle de l’acte"],
  cnDay: ["When the day turns", "Quand le jour change"],
  cnDayLead: [
    "Schools disagree for births between 23:00 and 01:00; a chart born then says so.",
    "Les écoles divergent pour les naissances entre 23\u202fh et 1\u202fh\u202f; un thème né à ce moment-là le signale.",
  ],
  cnDay23: ["At 23:00", "À 23\u202fh"],
  cnDay23Hint: ["The Rat hour opens the next day (the Zi Ping rule)", "L’heure du Rat ouvre le jour suivant (la règle du Zi Ping)"],
  cnDaySplit: ["Split Rat hour", "Heure du Rat partagée"],
  cnDaySplitHint: [
    "From 23:00 to midnight, the next day’s hour within the same day",
    "De 23\u202fh à minuit, l’heure du jour suivant dans le même jour",
  ],
  cnDayMidnight: ["At midnight", "À minuit"],
  cnDayMidnightHint: ["As the civil calendar turns", "Comme le calendrier civil"],

  // The birth form's yin or yang count (decision 4): used by three calculations only.
  cnCount: ["Yin or yang count (Chinese traditions)", "Compte yin ou yang (traditions chinoises)"],
  cnCountNone: ["Not given", "Non indiqué"],
  cnCountYang: ["Yang: the tradition’s count for a man", "Yang\u202f: le compte de la tradition pour un homme"],
  cnCountYin: ["Yin: the tradition’s count for a woman", "Yin\u202f: le compte de la tradition pour une femme"],
  cnCountNote: [
    "Classical Chinese traditions count a birth as yang or yin by sex. Only three calculations read it: the direction of BaZi’s luck pillars, Feng Shui’s Kua number and Zi Wei Dou Shu. Left empty, both versions are shown. Kept with the chart on this device, never sent.",
    "Les traditions chinoises classiques comptent une naissance comme yang ou yin selon le sexe. Trois calculs seulement le lisent\u202f: le sens des piliers de chance du BaZi, le nombre Kua du Feng Shui et le Zi Wei Dou Shu. Laissé vide, les deux versions sont montrées. Gardé avec le thème sur cet appareil, jamais envoyé.",
  ],

  // The solar terms, in the Calendar (its layer) and on the wheel (a Look switch).
  cnTerm: ["Solar term", "Terme solaire"],
  cnTerms: ["Solar terms", "Termes solaires"],
  cnTermSun: ["The Sun at {degree}", "Le Soleil à {degree}"],
  cnTermOpens: ["Opens the {animal} month", "Ouvre le mois {animal}"],
  cnTermMiddle: ["The middle of the {animal} month", "Le milieu du mois {animal}"],
  cnTermNext: ["Next solar term", "Prochain terme solaire"],
  cnTermLead: [
    "One of the twenty-four solar terms of the Chinese calendar: the Sun reaches another 15° of its path, and the season turns a step. The twelve that open a solar month set the month in the Four Pillars, and the first of them, Lichun, starts the year; the twelve principal terms name the lunar months.",
    "Un des vingt-quatre termes solaires du calendrier chinois\u202f: le Soleil atteint 15° de plus sur sa route, et la saison avance d’un pas. Les douze qui ouvrent un mois solaire fixent le mois des Quatre Piliers, et le premier d’entre eux, Lichun, ouvre l’année\u202f; les douze termes principaux nomment les mois lunaires.",
  ],
  cnTermSunLabel: ["The Sun", "Le Soleil"],
  cnTermRing: ["The ring of the terms", "L’anneau des termes"],
  cnTermRingHint: [
    "The 24 Chinese solar terms round the zodiac: the Sun’s own steps through the year",
    "Les 24 termes solaires chinois autour du zodiaque\u202f: les pas du Soleil dans l’année",
  ],
  // Chinese astrology's page (languages plan, part 7): the four animals and their wheel.
  zkTitle: ["Your four animals", "Vos quatre animaux"],
  zkLead: [
    "Chinese astrology reads a birth through four animals: the year’s, which most people know, then the month’s, the day’s and the hour’s.",
    "L’astrologie chinoise lit une naissance à travers quatre animaux\u202f: celui de l’année, que l’on connaît le plus souvent, puis ceux du mois, du jour et de l’heure.",
  ],
  zkYear: ["Year", "Année"],
  zkMonth: ["Month", "Mois"],
  zkDay: ["Day", "Jour"],
  zkHour: ["Hour", "Heure"],
  zkYearAnimal: ["Year animal", "Animal de l’année"],
  zkMonthAnimal: ["Month animal", "Animal du mois"],
  zkDayAnimal: ["Day animal", "Animal du jour"],
  zkHourAnimal: ["Hour animal", "Animal de l’heure"],
  zkRoleYear: [
    "In the tradition, the year animal is how others see you, and your roots: your family and the generation you share it with.",
    "Dans la tradition, l’animal de l’année est la façon dont les autres vous voient, et vos racines\u202f: votre famille et la génération qui le partage.",
  ],
  zkRoleMonth: [
    "The month animal is the inner animal: your temperament, the self you grow into. The tradition also reads the parents here.",
    "L’animal du mois est l’animal intérieur\u202f: votre tempérament, la personne que vous devenez. La tradition y lit aussi les parents.",
  ],
  zkRoleDay: [
    "The day animal is the self: who you are with those closest to you, and with a partner above all.",
    "L’animal du jour, c’est soi\u202f: qui vous êtes avec vos proches, et d’abord avec un partenaire.",
  ],
  zkRoleHour: [
    "The hour animal is the secret animal: the private self, shown to few. The tradition also reads the children here.",
    "L’animal de l’heure est l’animal secret\u202f: la part intime, montrée à peu de gens. La tradition y lit aussi les enfants.",
  ],
  zkNoHour: [
    "Without a birth time the hour animal stays unknown: the time adds the fourth.",
    "Sans heure de naissance, l’animal de l’heure reste inconnu\u202f: l’heure ajoute le quatrième.",
  ],
  zkNewYear: [
    "Counted from Chinese New Year, as most people learned it, your year animal would be {theAnimal}. Ulune counts from Lichun, the start of spring, as the Four Pillars and Feng Shui do: births between the two dates get two answers.",
    "Compté depuis le Nouvel An chinois, comme on l’apprend le plus souvent, votre animal de l’année serait {theAnimal}. Ulune compte depuis Lichun, le début du printemps, comme les Quatre Piliers et le Feng Shui\u202f: les naissances entre les deux dates ont deux réponses.",
  ],
  zkUncertainNear: [
    "Your birth falls within a few minutes of this animal’s change: a birth time a little off would give the next one.",
    "Votre naissance tombe à quelques minutes du changement de cet animal\u202f: une heure un peu différente donnerait le suivant.",
  ],
  zkUncertainDay: [
    "Without a birth time, this animal may be the next one: it changes during your birth day.",
    "Sans heure de naissance, cet animal peut être le suivant\u202f: il change pendant votre jour de naissance.",
  ],
  zkClockLine: ["The hour on {clock}; the day turns {day}.", "L’heure en {clock}\u202f; le jour change {day}."],
  zkDayAt23: ["at 23:00", "à 23\u202fh"],
  zkDaySplit: ["at midnight, the Rat hour split", "à minuit, l’heure du Rat partagée"],
  zkDayMidnight: ["at midnight", "à minuit"],
  zkSettingsLink: ["Change in Settings", "Modifier dans les Réglages"],
  zkNowYear: ["The year of the {animal}", "L’année {animal}"],
  zkNowMonth: ["the {animal} month", "le mois {animal}"],
  zkNowLine: ["{year}, {month}: marked on the wheel’s rim.", "{year}, {month}\u202f: marqués au bord de la roue."],
  zkStem: ["Heavenly Stem", "Tronc céleste"],
  zkBranch: ["Earthly Branch", "Branche terrestre"],
  zkAnimalPhase: ["The animal’s phase", "Phase de l’animal"],
  zkNaYin: ["Na Yin", "Na Yin"],
  zkPolarity: ["Yin or yang", "Yin ou yang"],
  zkPillar: ["Pillar", "Pilier"],
  zkPlace: ["Place", "Place"],
  zkAnimal: ["Animal", "Animal"],
  zkWheel: [
    "The twelve animals in their compass places, the Rat at the north, at the top",
    "Les douze animaux à leur place sur la boussole, le Rat au nord, en haut",
  ],
  zkSectorYours: ["yours: {places}", "les vôtres\u202f: {places}"],
  zkSectorNow: ["this year’s", "celui de l’année en cours"],
  zkSectorNowMonth: ["this month’s", "celui du mois en cours"],
  zkEmpty: ["Cast a birth chart to see your four animals.", "Calculez un thème natal pour voir vos quatre animaux."],
  zkBranchLead: [
    "{TheAnimal} is the branch {branch}, of the phase {phase}: its double hour runs from {from} to {to}, and its month is the solar month that opens at {term}.",
    "{TheAnimal} est la branche {branch}, de la phase {phase}\u202f: sa double heure va de {from} à {to}, et son mois est le mois solaire qui s’ouvre à {term}.",
  ],
  zkAboutTitle: ["About the four animals", "À propos des quatre animaux"],
  zkAbout1: [
    "Each pillar of a birth is a Heavenly Stem over an Earthly Branch, and each branch has its animal. The year turns at Lichun, the start of spring (around 4 February), each month at its solar term, the day and the hour on the birthplace’s clock.",
    "Chaque pilier d’une naissance est un Tronc céleste au-dessus d’une Branche terrestre, et chaque branche a son animal. L’année change à Lichun, le début du printemps (vers le 4 février), chaque mois à son terme solaire, le jour et l’heure à l’horloge du lieu de naissance.",
  ],
  zkAbout2: [
    "Where the words come from: the four places, the phases and the relations between animals are the tradition’s, as the Four Pillars read them. The portraits of the animals and of their pairs with a phase are modern: what popular books in Chinese, English and French commonly say of each, in Ulune’s words, to be read as a mirror rather than a verdict.",
    "D’où viennent les mots\u202f: les quatre places, les phases et les relations entre animaux sont celles de la tradition, telle que la lisent les Quatre Piliers. Les portraits des animaux et de leurs couples avec une phase sont modernes\u202f: ce que les livres populaires en chinois, en anglais et en français disent couramment de chacun, dans les mots d’Ulune, à lire comme un miroir plutôt qu’un verdict.",
  ],
  // In time and between two people (languages plan, part 11).
  zkMeetNone: ["No relation", "Aucune relation"],
  zkTaiSui: ["Tai Sui (the year’s ruler)", "Tai Sui (maître de l’année)"],
  zkTaiSuiText: [
    "The tradition names the year’s animal its ruler, the Tai Sui (太歲): this year, {theAnimal}. Each animal meets it in its own way: as its own year, in a clash, a harm, a punishment or a destruction, or in harmony or a trine.",
    "La tradition fait de l’animal de l’année son maître, le Tai Sui (太歲)\u202f: cette année, {theAnimal}. Chaque animal le rencontre à sa manière\u202f: comme sa propre année, en choc, en nuisance, en punition ou en destruction, ou en harmonie ou en trigone.",
  ],
  zkYearTitle: ["{year}, {animal}", "{year}, {animal}"],
  zkYearsPage: ["The year ahead", "L’année à venir"],
  zkYearOthersTitle: ["Your other animals", "Vos autres animaux"],
  zkYearOther: ["Your {place}: {kinds}.", "Votre {place}\u202f: {kinds}."],
  zkAboutTimeTitle: ["About the year ahead", "À propos de l’année à venir"],
  zkAboutTime1: [
    "The year turns at Lichun, the start of spring (around 4 February), and each month at its solar term, as the Four Pillars count them: the year’s and the month’s animals are the same for everyone, and each person’s animals meet them in their own way.",
    "L’année change à Lichun, le début du printemps (vers le 4 février), et chaque mois à son terme solaire, comme les comptent les Quatre Piliers\u202f: les animaux de l’année et du mois sont les mêmes pour tous, et ceux de chacun les rencontrent à leur manière.",
  ],
  zkAboutTime2: [
    "The relations are the tradition’s; the sentences that say them are Ulune’s, to be read like a forecast you dress for rather than a fate.",
    "Les relations sont celles de la tradition\u202f; les phrases qui les disent sont d’Ulune, à lire comme une météo pour laquelle on s’habille plutôt qu’un destin.",
  ],
  zkPairWhich: ["Which animals", "Quels animaux"],
  zkPairYears: [
    "Your year animals: the pair most people know, and the tradition’s first look at two people.",
    "Vos animaux de l’année\u202f: le duo que la plupart des gens connaissent, et le premier regard de la tradition sur deux personnes.",
  ],
  zkPairDays: [
    "Your day animals: the self with a partner, the closest look at two people.",
    "Vos animaux du jour\u202f: soi avec un partenaire, le regard le plus proche sur deux personnes.",
  ],
  zkAboutPairTitle: ["About two people’s animals", "À propos des animaux de deux personnes"],
  zkAboutPair1: [
    "Two people’s animals are compared place by place: the year animals first, as most people know them, then the day animals, the self with a partner, then every other pair of places.",
    "Les animaux de deux personnes se comparent place par place\u202f: d’abord les animaux de l’année, tels que la plupart des gens les connaissent, puis ceux du jour, soi avec un partenaire, puis toutes les autres paires de places.",
  ],
  zkDayTitle: ["Day of the {animal}", "Jour {animal}"],
  zkDayClashes: ["Clashes with", "En choc avec"],
  zkCalClash: ["a clash day for your year animal", "un jour de choc pour votre animal de l’année"],
  zkYearYours: ["Your animals and the year", "Vos animaux et l’année"],
  zkMonthsHead: ["Month by month, {year}", "Mois par mois, {year}"],
  zkPartMonthsHint: [
    "Each solar month from its term, its pillar, and how each of your animals meets it.",
    "Chaque mois solaire depuis son terme, son pilier, et la façon dont chacun de vos animaux le rencontre.",
  ],
  zkYearPrev: ["Previous year", "Année précédente"],
  zkYearNext: ["Next year", "Année suivante"],
  zkYearBack: ["{year}: back to this year", "{year}\u202f: revenir à cette année"],
  zkPairTitle: ["Two people’s animals", "Les animaux de deux personnes"],
  zkPairCentre: ["year animals", "animaux de l’année"],
  zkPairAdd: ["Choose or add a second person", "Choisir ou ajouter une deuxième personne"],
  zkPairYearsHead: ["Your year animals", "Vos animaux de l’année"],
  zkPairDaysHead: ["Your day animals", "Vos animaux du jour"],
  zkPairOthersHead: ["Your other animals", "Vos autres animaux"],
  zkPairYearsNone: [
    "Your year animals neither meet nor oppose each other: the bond is what you make of it.",
    "Vos animaux de l’année ne se rencontrent ni ne s’opposent\u202f: le lien est ce que vous en faites.",
  ],
  zkPairDaysNone: [
    "Your day animals neither meet nor oppose each other.",
    "Vos animaux du jour ne se rencontrent ni ne s’opposent.",
  ],
  zkPairNone: ["No relation joins your animals: each stands on its own.", "Aucune relation ne relie vos animaux\u202f: chacun se tient seul."],
  zkPairBetween: ["Between you", "Entre vous"],
  zkPartPairHint: [
    "Each of one person’s animals with each of the other’s, where the tradition names a relation.",
    "Chaque animal de l’un avec chaque animal de l’autre, là où la tradition nomme une relation.",
  ],
  zkPortrait: ["A modern portrait", "Portrait moderne"],
  zkTradition: ["In the tradition", "Dans la tradition"],
  zkInPractice: ["In practice", "En pratique"],
  zkYears: ["Its years", "Ses années"],
  zkUncertainTitle: ["Depends on the birth time", "Dépend de l’heure de naissance"],
  // BaZi, the Four Pillars (languages plan, part 12).
  bzTitle: ["Your four pillars", "Vos quatre piliers"],
  bzLead: [
    "BaZi reads a birth as eight characters: four pillars, each a Heavenly Stem over an Earthly Branch. The day’s stem is you, the Day Master; every other stem, shown or hidden in a branch, is one of the Ten Gods.",
    "Le BaZi lit une naissance en huit caractères\u202f: quatre piliers, chacun un Tronc céleste au-dessus d’une Branche terrestre. Le tronc du jour, c’est vous, le Maître du jour\u202f; chaque autre tronc, visible ou caché dans une branche, est l’un des Dix Dieux.",
  ],
  bzEmpty: ["Cast a birth chart to see your four pillars.", "Calculez un thème natal pour voir vos quatre piliers."],
  bzNoHour: [
    "Without a birth time, three pillars: the time adds the hour’s.",
    "Sans heure de naissance, trois piliers\u202f: l’heure ajoute le sien.",
  ],
  bzBoard: ["The four pillars: hour, day, month and year", "Les quatre piliers\u202f: heure, jour, mois et année"],
  bzPillarYear: ["Year pillar", "Pilier de l’année"],
  bzPillarMonth: ["Month pillar", "Pilier du mois"],
  bzPillarDay: ["Day pillar", "Pilier du jour"],
  bzPillarHour: ["Hour pillar", "Pilier de l’heure"],
  bzGod: ["Ten God", "Dieu"],
  bzGodsHead: ["The Ten Gods in your chart", "Les Dix Dieux de votre thème"],
  bzGodsKey: ["shown · hidden", "visibles · cachés"],
  bzQiMain: ["Main qi", "Qi principal"],
  bzQiMiddle: ["Middle qi", "Qi médian"],
  bzQiResidual: ["Residual qi", "Qi résiduel"],
  bzShown: ["shown", "visible"],
  bzHiddenOne: ["hidden", "caché"],
  bzWhy: ["Why this god", "Pourquoi ce dieu"],
  bzInChart: ["In your chart", "Dans votre thème"],
  bzSamePolarity: ["of the same polarity", "de la même polarité"],
  bzOtherPolarity: ["of the other polarity", "de l’autre polarité"],
  bzWhyPeer: [
    "{stem} is {phase}, like your Day Master {dm}, and {polarity}: the tradition calls it {god}.",
    "{stem} est {somePhase}, comme votre Maître du jour {dm}, et {polarity}\u202f: la tradition l’appelle {god}.",
  ],
  bzWhyOutput: [
    "Your Day Master {dm} ({dmPhase}) produces {thePhase}, and {stem} is {polarity}: the tradition calls it {god}.",
    "Votre Maître du jour {dm} ({dmPhase}) produit {thePhase}, et {stem} est {polarity}\u202f: la tradition l’appelle {god}.",
  ],
  bzWhyWealth: [
    "Your Day Master {dm} ({dmPhase}) controls {thePhase}, and {stem} is {polarity}: the tradition calls it {god}.",
    "Votre Maître du jour {dm} ({dmPhase}) contrôle {thePhase}, et {stem} est {polarity}\u202f: la tradition l’appelle {god}.",
  ],
  bzWhyPower: [
    "{ThePhase} controls your Day Master {dm} ({dmPhase}), and {stem} is {polarity}: the tradition calls it {god}.",
    "{ThePhase} contrôle votre Maître du jour {dm} ({dmPhase}), et {stem} est {polarity}\u202f: la tradition l’appelle {god}.",
  ],
  bzWhyResource: [
    "{ThePhase} produces your Day Master {dm} ({dmPhase}), and {stem} is {polarity}: the tradition calls it {god}.",
    "{ThePhase} produit votre Maître du jour {dm} ({dmPhase}), et {stem} est {polarity}\u202f: la tradition l’appelle {god}.",
  ],
  bzDayMasterRole: [
    "The Day Master is the day’s stem: the self, around which the whole chart is read. Every other stem, shown or hidden in a branch, is one of the Ten Gods by how its phase meets this one, and whether their polarities agree.",
    "Le Maître du jour est le tronc du jour\u202f: soi, autour de quoi tout le thème se lit. Chaque autre tronc, visible ou caché dans une branche, est l’un des Dix Dieux selon la façon dont sa phase rencontre celle-ci, et selon que leurs polarités s’accordent.",
  ],
  bzBranchLead: [
    "The branch {branch}, the {animal}, holds {list}: its hidden stems, the main qi first. Each is one of the Ten Gods too, read more quietly than a stem that shows.",
    "La branche {branch} ({animal}) contient {list}\u202f: ses troncs cachés, le qi principal d’abord. Chacun est aussi l’un des Dix Dieux, lu plus discrètement qu’un tronc visible.",
  ],
  bzHiddenNote: [
    "A hidden stem is a phase held inside a branch: its main qi is the branch’s own, the middle and residual qi are smaller. The tradition counts them by their weight.",
    "Un tronc caché est une phase contenue dans une branche\u202f: son qi principal est celui de la branche, les qi médian et résiduel sont plus petits. La tradition les compte selon leur poids.",
  ],
  bzGodNone: [
    "It stands nowhere in your chart, shown or hidden: the tradition reads an absence too, as a quality to find around you or to grow.",
    "Il ne figure nulle part dans votre thème, ni visible ni caché\u202f: la tradition lit aussi une absence, comme une qualité à trouver autour de soi ou à faire grandir.",
  ],
  bzAboutTitle: ["About the four pillars", "À propos des quatre piliers"],
  bzAbout1: [
    "BaZi (八字, “eight characters”) reads a birth as four pillars, the year, the month, the day and the hour, each a Heavenly Stem over an Earthly Branch, with the stems each branch holds hidden. The Day Master, the day’s stem, is the self; every other stem is one of the Ten Gods.",
    "Le BaZi (八字, «\u202fhuit caractères\u202f») lit une naissance en quatre piliers, l’année, le mois, le jour et l’heure, chacun un Tronc céleste au-dessus d’une Branche terrestre, avec les troncs que chaque branche tient cachés. Le Maître du jour, tronc du jour, c’est soi\u202f; chaque autre tronc est l’un des Dix Dieux.",
  ],
  bzAbout2: [
    "Where the words come from: the pillars, the hidden stems and the Ten Gods are the tradition’s, as the Zi Ping school reads them (after the Song-dynasty master Xu Ziping); the images of the ten stems follow the Di Tian Sui’s verses, in Ulune’s words.",
    "D’où viennent les mots\u202f: les piliers, les troncs cachés et les Dix Dieux sont ceux de la tradition, telle que la lit l’école Zi Ping (d’après le maître Xu Ziping, sous les Song)\u202f; les images des dix troncs suivent les vers du Di Tian Sui, dans les mots d’Ulune.",
  ],
  bzOrder: ["The four pillars", "Les quatre piliers"],
  bzOrderClassical: ["Hour to year", "De l’heure à l’année"],
  bzOrderClassicalHint: ["As the tradition writes them: the year on the right", "Comme les écrit la tradition\u202f: l’année à droite"],
  bzOrderYearFirst: ["Year to hour", "De l’année à l’heure"],
  bzOrderYearFirstHint: ["Read left to right from the year", "Lus de gauche à droite depuis l’année"],
  bzPartPillars: ["The four pillars", "Les quatre piliers"],
  bzPartPillarsHint: [
    "Each pillar’s stem and its god, its branch and the stems it holds hidden, with their gods.",
    "Le tronc de chaque pilier et son dieu, sa branche et les troncs qu’elle cache, avec leurs dieux.",
  ],
  bzPartGods: ["The Ten Gods", "Les Dix Dieux"],
  bzShownCol: ["Shown", "Visibles"],
  bzHiddenCol: ["Hidden", "Cachés"],
  bzPartGodsHint: ["How often each god stands in the chart, shown and hidden.", "Combien de fois chaque dieu figure dans le thème, visible et caché."],
  // BaZi's stages, Na Yin, empty branches and stars (languages plan, part 13).
  bzStage: ["Life stage", "Stade de vie"],
  bzStagesTitle: ["The twelve stages", "Les douze stades"],
  bzStageWhy: ["Why this stage", "Pourquoi ce stade"],
  bzPhase: ["Phase", "Phase"],
  bzEmptyWhyTitle: ["Why these branches", "Pourquoi ces branches"],
  bzStageWhyYang: [
    "Your Day Master {dm} is born in {birth} and, being yang, goes forward round the branches: in {branch} it is at its {stage} stage.",
    "Votre Maître du jour {dm} naît en {birth} et, étant yang, avance dans l’ordre des branches\u202f: en {branch}, il est au stade «\u202f{stage}\u202f».",
  ],
  bzStageWhyYin: [
    "Your Day Master {dm} is born in {birth} and, being yin, goes backward round the branches: in {branch} it is at its {stage} stage.",
    "Votre Maître du jour {dm} naît en {birth} et, étant yin, recule dans l’ordre des branches\u202f: en {branch}, il est au stade «\u202f{stage}\u202f».",
  ],
  bzStagesNote: [
    "The twelve stages follow the Day Master’s phase round the twelve branches as a year follows its seasons, from a seed to the harvest and back to a seed. Their names are the tradition’s; they say how strong the phase is in each branch, not what will happen, and nothing about health.",
    "Les douze stades suivent la phase du Maître du jour à travers les douze branches comme une année suit ses saisons, de la graine à la moisson et de nouveau à la graine. Leurs noms sont ceux de la tradition\u202f; ils disent la force de la phase dans chaque branche, non ce qui arrivera, et rien de la santé.",
  ],
  bzNaYinLead: [
    "The Na Yin (納音, “received sound”) gives each two pairs of the sixty-cycle one of thirty images, each with its phase: an older layer of the tradition, which the Zi Ping school keeps as a nuance. A pillar’s Na Yin is its tone, heard beside its stem and branch.",
    "Le Na Yin (納音, «\u202fson reçu\u202f») donne à chaque couple de paires du cycle de soixante l’une de trente images, chacune avec sa phase\u202f: une strate plus ancienne de la tradition, que l’école Zi Ping garde comme une nuance. Le Na Yin d’un pilier est sa tonalité, entendue à côté de son tronc et de sa branche.",
  ],
  bzToDm: ["To your Day Master", "Pour votre Maître du jour"],
  bzEmptyHead: ["Empty branches", "Branches vides"],
  bzEmptyBadge: ["Empty branch", "Branche vide"],
  bzEmptyLead: [
    "Each ten-day week of the sixty-cycle pairs its ten stems with ten of the twelve branches and leaves two out: the empty branches (空亡, kōngwáng), counted from the week your day pillar is in. A pillar on an empty branch is read as quieter, its promise slower to show: more inward than outward.",
    "Chaque décade du cycle de soixante associe ses dix troncs à dix des douze branches et en laisse deux de côté\u202f: les branches vides (空亡, kōngwáng), comptées depuis la décade de votre pilier du jour. Un pilier sur une branche vide se lit plus discret, sa promesse plus lente à paraître\u202f: plus intérieure qu’extérieure.",
  ],
  bzEmptyWhy: [
    "Your day pillar {day} is in the week that begins with {first}: its stems meet the branches from {from} to {to}, and leave out {a} and {b}.",
    "Votre pilier du jour {day} appartient à la décade qui commence par {first}\u202f: ses troncs rencontrent les branches de {from} à {to}, et laissent de côté {a} et {b}.",
  ],
  bzWeek: ["Ten-day week", "Décade"],
  bzEmptyPillars: ["On an empty branch", "Sur une branche vide"],
  bzEmptyNone: ["None of your pillars", "Aucun de vos piliers"],
  bzStarsHead: ["Symbolic stars", "Étoiles symboliques"],
  bzStarsNone: [
    "None of the fourteen stars Ulune reads falls in your chart.",
    "Aucune des quatorze étoiles que lit Ulune ne tombe dans votre thème.",
  ],
  bzStarsNote: [
    "The stars are secondary signs: most schools read them after the Day Master, the gods and the balance of the phases, as nuances rather than verdicts.",
    "Les étoiles sont des signes secondaires\u202f: la plupart des écoles les lisent après le Maître du jour, les dieux et l’équilibre des phases, comme des nuances plutôt que des verdicts.",
  ],
  bzStarHow: ["How it is found", "Comment on la trouve"],
  bzStarFromDm: [
    "From your Day Master {dm}, the tradition looks for this star in {targets}.",
    "Depuis votre Maître du jour {dm}, la tradition cherche cette étoile dans {targets}.",
  ],
  bzStarFromBranch: [
    "From the branch {branch} of your {pillar}, the tradition looks for this star in {targets}.",
    "Depuis la branche {branch} de votre {pillar}, la tradition cherche cette étoile dans {targets}.",
  ],
  bzStarFromTrine: [
    "From the branch {branch} of your {pillar}, of the {phase} trine, the tradition looks for this star in {targets}.",
    "Depuis la branche {branch} de votre {pillar}, du trigone {somePhase}, la tradition cherche cette étoile dans {targets}.",
  ],
  bzStarWonders: [
    "{list} follow each other in this order on three pillars side by side ({places}): one of the three orders the tradition calls the Three Wonders.",
    "{list} se suivent dans cet ordre sur trois piliers voisins ({places})\u202f: l’un des trois ordres que la tradition appelle les Trois Merveilles.",
  ],
  bzInBranch: ["the branch {list}", "la branche {list}"],
  bzInStem: ["the stem {list}", "le tronc {list}"],
  bzOr: ["or", "ou"],
  bzBaseDm: ["Read from the Day Master", "Lue depuis le Maître du jour"],
  bzBaseBranches: ["Read from the year and day branches", "Lue depuis les branches de l’année et du jour"],
  bzBaseMonth: ["Read from the month branch", "Lue depuis la branche du mois"],
  bzBaseYear: ["Read from the year branch", "Lue depuis la branche de l’année"],
  bzBaseStems: ["Read from the stems in order", "Lue dans l’ordre des troncs"],
  bzAbout3: [
    "The life stages, the Na Yin and the empty branches are counted as the Zi Ping school counts them, Earth’s stages following Fire’s. The stars are found as most books give them, the Sword Edge for the yang Day Masters only, the yin stems’ being disputed; Ulune reads them as secondary signs.",
    "Les stades de vie, le Na Yin et les branches vides sont comptés comme les compte l’école Zi Ping, les stades de la Terre suivant ceux du Feu. Les étoiles sont trouvées comme la plupart des livres les donnent, la Lame pour les Maîtres du jour yang seulement, celle des troncs yin étant discutée\u202f; Ulune les lit comme des signes secondaires.",
  ],
  bzPartSigns: ["Stages, Na Yin and empty branches", "Stades, Na Yin et branches vides"],
  bzPartSignsHint: [
    "The Day Master’s stage in each pillar’s branch, each pillar’s Na Yin, and the branches left empty by the day’s week.",
    "Le stade du Maître du jour dans la branche de chaque pilier, le Na Yin de chaque pilier, et les branches que laisse vides la décade du jour.",
  ],
  bzPartStarsHint: ["Each star in your chart and the pillars it falls in.", "Chaque étoile de votre thème et les piliers où elle tombe."],
  bzStarCol: ["Star", "Étoile"],
  bzPlacesCol: ["Pillars", "Piliers"],
  // The relations between animals (languages plan, part 8).
  zkRelations: ["Between your animals", "Entre vos animaux"],
  zkRelationsNone: [
    "No harmony, trine, clash, harm, punishment or destruction joins your animals: each stands on its own.",
    "Aucune harmonie, trigone, choc, nuisance, punition ou destruction ne relie vos animaux\u202f: chacun se tient seul.",
  ],
  zkTrineFull: [
    "Your {places} animals make a whole trine of {phase}: three allies on one wheel.",
    "Vos animaux {places} forment un trigone entier de {phase}\u202f: trois alliés sur une même roue.",
  ],
  zkRelHarmony: [
    "Two animals the tradition pairs as natural partners, the six harmonies: they combine, and what one lacks the other brings.",
    "Deux animaux que la tradition associe en partenaires naturels, les six harmonies\u202f: ils s’assemblent, et ce qui manque à l’un, l’autre l’apporte.",
  ],
  zkRelTrine: [
    "Animals four places apart, of one of the four trines that share a phase: allies, at ease with each other and pulling the same way.",
    "Des animaux à quatre places l’un de l’autre, d’un des quatre trigones qui partagent une phase\u202f: des alliés, à l’aise ensemble et tirant dans le même sens.",
  ],
  zkRelClash: [
    "Opposite animals on the wheel: the tradition reads movement and friction between them, energy that asks to be put to use rather than a bad sign.",
    "Des animaux opposés sur la roue\u202f: la tradition y lit du mouvement et des frottements, une énergie à employer plutôt qu’un mauvais présage.",
  ],
  zkRelHarm: [
    "One of the six harms: a pair that can misread each other or get in each other’s way in small things.",
    "Une des six nuisances\u202f: un duo qui peut se méprendre l’un sur l’autre ou se gêner dans les petites choses.",
  ],
  zkRelPunishment: [
    "One of the three punishments: a pair the tradition watches for pressure and for overdoing things, best met with patience and clear agreements.",
    "Une des trois punitions\u202f: un duo où la tradition guette la pression et l’excès, à aborder avec patience et des accords clairs.",
  ],
  zkRelDestruction: [
    "One of the six destructions: a mild tension that can unsettle what the two build, more often by small changes than by a break.",
    "Une des six destructions\u202f: une tension légère qui peut ébranler ce que les deux construisent, par de petits changements plus que par une rupture.",
  ],
  zkRelSelf: [
    "The Dragon, the Horse, the Rooster and the Pig punish themselves when they meet their own kind: the animal’s own habit, pushed too far.",
    "Le Dragon, le Cheval, le Coq et le Cochon se punissent eux-mêmes lorsqu’ils rencontrent leur semblable\u202f: l’habitude propre à l’animal, poussée trop loin.",
  ],
  zkRelKind: ["Relation", "Relation"],
  zkRelBetween: ["Between", "Entre"],
  zkHidden: ["Hidden stems", "Troncs cachés"],
  zkHiddenHint: [
    "The stems each branch holds, the main one first, weighted as a common method counts them.",
    "Les troncs que porte chaque branche, le principal d’abord, pondérés comme une méthode courante les compte.",
  ],
  zkPartAnimals: ["The four animals", "Les quatre animaux"],
  zkPartAnimalsHint: [
    "Each pillar: its stem over its branch, the animal’s phase, its polarity, its Na Yin and its hidden stems.",
    "Chaque pilier\u202f: son tronc sur sa branche, la phase de l’animal, sa polarité, son Na Yin et ses troncs cachés.",
  ],
  zkPartRelations: ["Relations", "Relations"],
  zkPartRelationsHint: [
    "The classical relations between your animals, pair by pair: harmonies and trines bring together, the others rub.",
    "Les relations classiques entre vos animaux, deux à deux\u202f: harmonies et trigones rapprochent, les autres frottent.",
  ],
} as const satisfies Record<string, readonly [string, string]>;
