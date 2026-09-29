/**
 * Human Design reference texts (EN + FR): gates, channels, profiles, lines,
 * definition types and short explainers. Written for Ulune following
 * content-style.md. Gate → centre wording matches HD_GATE_CENTER, and channel
 * keys match HD_CHANNELS ids exactly (en dash "–", same gate order).
 */
import type { Bi } from "./types";
import type { HdDefinition } from "@/lib/chart/human-design";

export type HdText = { name: Bi; what: Bi };

/** All 64 gates, keyed 1..64. name = the commonly published gate name (short). */
export const HD_GATE_TEXT: Record<number, HdText> = {
  1: {
    name: { en: "Self-Expression", fr: "Expression de soi" },
    what: {
      en: "Gate 1 sits in the G centre (hexagram 1, The Creative). Its theme is expressing a direction or style that is genuinely one’s own, not shaped to please. Defined, it often shows as someone who rewrites the template instead of filling it in, and who feels flat in work that leaves no room for a personal signature.",
      fr: "La porte 1 se trouve dans le centre G et correspond à l’hexagramme 1, Le Créateur. Elle parle d’exprimer une direction ou un style vraiment personnels, sans chercher à plaire. Définie, elle se voit souvent chez quelqu’un qui réécrit le modèle au lieu de le remplir, et qui s’éteint dans un travail où il ne peut rien mettre de lui-même.",
    },
  },
  2: {
    name: { en: "Direction of the Self", fr: "Direction du soi" },
    what: {
      en: "Gate 2 is in the G centre (hexagram 2, The Receptive). It carries an inner sense of where things should go, and steers resources rather than producing them. Someone with it defined often knows which way a project or a household should head without being able to justify it, and others end up following that quiet certainty.",
      fr: "La porte 2 est dans le centre G et correspond à l’hexagramme 2, Le Réceptif. Elle porte un sens intérieur de la direction à prendre\u202f: elle oriente les ressources plus qu’elle ne les produit. Une personne qui l’a définie sait souvent où doit aller un projet ou un foyer sans pouvoir l’expliquer, et les autres finissent par suivre cette certitude tranquille.",
    },
  },
  3: {
    name: { en: "Ordering", fr: "Mise en ordre" },
    what: {
      en: "Gate 3 sits in the Sacral centre (hexagram 3, Difficulty at the Beginning). It is the energy to bring order to something new and chaotic, working in bursts rather than steadily. Defined, it can show as someone who tries setup after setup on a messy process, feels stuck for a while, then suddenly finds the arrangement that works.",
      fr: "La porte 3 se trouve dans le centre Sacral et correspond à l’hexagramme 3, La Difficulté initiale. C’est l’énergie qui met de l’ordre dans ce qui est nouveau et encore confus, par à-coups plutôt que de façon régulière. Définie, elle peut se voir chez quelqu’un qui essaie plusieurs organisations d’un processus désordonné, piétine un moment, puis trouve d’un coup celle qui fonctionne.",
    },
  },
  4: {
    name: { en: "Formulization", fr: "Formulation" },
    what: {
      en: "Gate 4 is in the Ajna (hexagram 4, Youthful Folly). It produces answers: logical formulas that explain why something happens. The answers are not automatically right and are meant to be tested. Someone with it defined usually has an explanation ready within seconds of hearing a problem, and does best when they check it against the facts before defending it.",
      fr: "La porte 4 est dans l’Ajna et correspond à l’hexagramme 4, La Folie juvénile. Elle produit des réponses\u202f: des formules logiques qui expliquent pourquoi une chose arrive. Ces réponses ne sont pas justes d’office, elles sont faites pour être vérifiées. Une personne qui l’a définie a souvent une explication prête en quelques secondes, et gagne à la confronter aux faits avant de la défendre.",
    },
  },
  5: {
    name: { en: "Fixed Rhythms", fr: "Rythmes fixes" },
    what: {
      en: "Gate 5 sits in the Sacral centre (hexagram 5, Waiting). Its theme is keeping a consistent rhythm: habits, routines and timing that repeat. Defined, it often shows as the person who eats, trains and sleeps at the same hours and works well that way, but who is thrown off for days when travel or a new job breaks the pattern.",
      fr: "La porte 5 se trouve dans le centre Sacral et correspond à l’hexagramme 5, L’Attente. Elle parle de garder un rythme constant\u202f: des habitudes, des routines, un timing qui se répète. Définie, elle se voit souvent chez quelqu’un qui mange, s’entraîne et dort aux mêmes heures et s’en porte bien, mais qu’un voyage ou un nouveau poste déstabilise pendant plusieurs jours.",
    },
  },
  6: {
    name: { en: "Friction", fr: "Friction" },
    what: {
      en: "Gate 6 is in the Solar Plexus (hexagram 6, Conflict). It regulates intimacy: the emotional mood decides whether someone opens up or keeps others at a distance. Defined, it can show in a negotiation or a relationship as a clear yes-or-no feeling about closeness. The friction it creates is often productive when the person lets the mood settle before deciding.",
      fr: "La porte 6 est dans le Plexus solaire et correspond à l’hexagramme 6, Le Conflit. Elle règle l’intimité\u202f: l’humeur émotionnelle décide si l’on s’ouvre ou si l’on garde les autres à distance. Définie, elle peut se voir dans une négociation ou une relation sous la forme d’un oui ou d’un non très net face au rapprochement. La friction qu’elle crée est souvent féconde si l’on laisse l’humeur se poser avant de trancher.",
    },
  },
  7: {
    name: { en: "The Role of the Self", fr: "Le rôle du soi" },
    what: {
      en: "Gate 7, fully called the Role of the Self in Interaction, sits in the G centre (hexagram 7, The Army). It is about guiding a group towards a future direction, often from just behind the visible leader. Defined, it can show as the advisor or deputy whose suggestions quietly end up setting the team’s course.",
      fr: "La porte 7, le Rôle du soi dans l’interaction, se trouve dans le centre G et correspond à l’hexagramme 7, L’Armée. Elle parle de guider un groupe vers une direction future, souvent depuis la place juste derrière le chef visible. Définie, elle peut se voir chez le conseiller ou l’adjoint dont les suggestions finissent, sans bruit, par fixer le cap de l’équipe.",
    },
  },
  8: {
    name: { en: "Contribution", fr: "Contribution" },
    what: {
      en: "Gate 8 is in the Throat centre (hexagram 8, Holding Together). Its theme is making a personal contribution visible to the group. Defined, it often shows as someone who wants their distinctive work to be seen — publishing, presenting, signing an idea — and who can feel invisible where individual input disappears into the team.",
      fr: "La porte 8 est dans le centre de la Gorge et correspond à l’hexagramme 8, La Solidarité. Elle parle de rendre visible sa contribution personnelle au groupe. Définie, elle se voit souvent chez quelqu’un qui a besoin que son travail singulier soit vu — publier, présenter, signer une idée — et qui se sent invisible dans un poste où l’apport individuel se dilue dans l’équipe.",
    },
  },
  9: {
    name: { en: "Focus", fr: "Focalisation" },
    what: {
      en: "Gate 9 sits in the Sacral centre (hexagram 9, The Taming Power of the Small). It is the energy to concentrate on details and stay with one thing. Defined, it can show as someone who spends a whole afternoon perfecting a spreadsheet or tracking down a single bug, and who struggles when the day is chopped into constant interruptions.",
      fr: "La porte 9 se trouve dans le centre Sacral et correspond à l’hexagramme 9, Le Pouvoir d’apprivoisement du petit. C’est l’énergie de se concentrer sur les détails et de rester sur une seule chose. Définie, elle peut se voir chez quelqu’un qui passe tout un après-midi à peaufiner un tableur ou à traquer un seul bug, et qui peine quand sa journée est hachée d’interruptions.",
    },
  },
  10: {
    name: { en: "Behavior of the Self", fr: "Comportement du soi" },
    what: {
      en: "Gate 10 is in the G centre (hexagram 10, Treading). Its theme is self-love in a practical sense: behaving as oneself and accepting that. Defined, it often shows as someone who acts the same way whoever is watching, and who would rather lose approval than put on a manner that isn’t theirs. Its challenge is not turning that into self-criticism.",
      fr: "La porte 10 est dans le centre G et correspond à l’hexagramme 10, La Marche. Elle parle d’amour de soi au sens concret\u202f: se comporter comme on est, et l’accepter. Définie, elle se voit souvent chez quelqu’un qui agit de la même façon quel que soit le public, et qui préfère perdre l’approbation que d’adopter une attitude qui ne lui ressemble pas. L’écueil est de retourner cette exigence contre soi.",
    },
  },
  11: {
    name: { en: "Ideas", fr: "Idées" },
    what: {
      en: "Gate 11 sits in the Ajna (hexagram 11, Peace). It holds a steady stream of ideas and images, many drawn from past experience, meant to be shared rather than all acted on. Defined, it can show as the friend with a new idea every dinner; the ideas work best as material that stimulates others, not as a personal to-do list.",
      fr: "La porte 11 se trouve dans l’Ajna et correspond à l’hexagramme 11, La Paix. Elle porte un flot continu d’idées et d’images, souvent tirées de l’expérience passée, faites pour être partagées plutôt que toutes réalisées. Définie, elle peut se voir chez l’ami qui arrive à chaque dîner avec une nouvelle idée\u202f; ces idées servent surtout à stimuler les autres, pas à remplir sa propre liste de tâches.",
    },
  },
  12: {
    name: { en: "Caution", fr: "Prudence" },
    what: {
      en: "Gate 12 is in the Throat centre (hexagram 12, Standstill). It gives voice to feeling, and its timing depends on mood. Defined, it often shows as someone who can move a room when they feel like speaking, and who sounds flat or stays silent when they don’t. Waiting for the right mood before an important conversation usually serves them well.",
      fr: "La porte 12 est dans le centre de la Gorge et correspond à l’hexagramme 12, La Stagnation. Elle donne une voix au ressenti, et son timing dépend de l’humeur. Définie, elle se voit souvent chez quelqu’un qui peut toucher toute une salle quand il a envie de parler, et qui paraît terne ou se tait quand ce n’est pas le cas. Attendre la bonne humeur avant une conversation importante lui réussit en général.",
    },
  },
  13: {
    name: { en: "The Listener", fr: "Celui qui écoute" },
    what: {
      en: "Gate 13 sits in the G centre (hexagram 13, Fellowship). It is the listener who collects other people’s experiences and secrets. Defined, it often shows as someone to whom strangers tell their life story on a train, or the colleague everyone confides in. What they hear is kept and understood over time, so discretion is part of the gift.",
      fr: "La porte 13 se trouve dans le centre G et correspond à l’hexagramme 13, La Communauté avec les hommes. C’est celle de l’écoute, qui recueille les expériences et les secrets des autres. Définie, elle se voit souvent chez la personne à qui des inconnus racontent leur vie dans le train, ou chez le collègue à qui tout le monde se confie. Ce qu’elle entend est gardé et mûri avec le temps\u202f: la discrétion fait partie du don.",
    },
  },
  14: {
    name: { en: "Power Skills", fr: "Compétences de puissance" },
    what: {
      en: "Gate 14 is in the Sacral centre (hexagram 14, Possession in Great Measure). It is the energy to put into work that generates resources. Defined, it can show as someone who works tirelessly on a project they believe in and finds that money or support tends to follow; the same energy drains fast in work done only for pay.",
      fr: "La porte 14 est dans le centre Sacral et correspond à l’hexagramme 14, Le Grand Avoir. C’est l’énergie à investir dans un travail qui produit des ressources. Définie, elle peut se voir chez quelqu’un qui travaille sans compter sur un projet auquel il croit, et constate que l’argent ou le soutien suivent\u202f; la même énergie s’épuise vite dans un travail fait seulement pour le salaire.",
    },
  },
  15: {
    name: { en: "Extremes", fr: "Extrêmes" },
    what: {
      en: "Gate 15 sits in the G centre (hexagram 15, Modesty). It carries a love of humanity that accepts a wide range of rhythms and people, while its own rhythm is irregular. Defined, it often shows as someone who sleeps late one week and rises at dawn the next, and who feels at ease with almost anyone, from any background.",
      fr: "La porte 15 se trouve dans le centre G et correspond à l’hexagramme 15, L’Humilité. Elle porte un amour de l’humanité qui accepte une grande diversité de rythmes et de personnes, alors que son propre rythme est irrégulier. Définie, elle se voit souvent chez quelqu’un qui se couche tard une semaine et se lève à l’aube la suivante, et qui est à l’aise avec à peu près tout le monde, d’où qu’il vienne.",
    },
  },
  16: {
    name: { en: "Skills", fr: "Talents" },
    what: {
      en: "Gate 16 is in the Throat centre (hexagram 16, Enthusiasm). Its theme is developing a skill through repetition and the enthusiasm that keeps the practice going. Defined, it can show as the musician who plays scales for years or the cook who makes the same dish until it is right. Enthusiasm without practice, though, can turn into overconfidence.",
      fr: "La porte 16 est dans le centre de la Gorge et correspond à l’hexagramme 16, L’Enthousiasme. Elle parle de développer un talent par la répétition, porté par l’enthousiasme qui fait durer la pratique. Définie, elle peut se voir chez le musicien qui fait des gammes pendant des années ou le cuisinier qui refait le même plat jusqu’à ce qu’il soit juste. Sans pratique, l’enthousiasme peut tourner à l’excès de confiance.",
    },
  },
  17: {
    name: { en: "Opinions", fr: "Opinions" },
    what: {
      en: "Gate 17 sits in the Ajna (hexagram 17, Following). It forms logical opinions about how things should be organised and where patterns lead. Defined, it often shows as a firm view on how a plan or a trip should be structured. Those opinions tend to land far better when someone has asked for them than when offered unprompted.",
      fr: "La porte 17 se trouve dans l’Ajna et correspond à l’hexagramme 17, La Suite. Elle forme des opinions logiques sur la façon d’organiser les choses et sur la direction que prennent les schémas. Définie, elle se voit souvent sous la forme d’un avis tranché sur la manière de structurer un projet ou un voyage. Ces opinions sont bien mieux reçues quand on les a demandées que quand elles arrivent sans invitation.",
    },
  },
  18: {
    name: { en: "Correction", fr: "Correction" },
    what: {
      en: "Gate 18 is in the Spleen (hexagram 18, Work on What Has Been Spoiled). It instinctively spots what is wrong in a pattern so it can be improved. Defined, it can show as someone who sees the flaw in a process within minutes — valuable in quality control or editing, harder on loved ones when the correction was not requested.",
      fr: "La porte 18 est dans la Rate et correspond à l’hexagramme 18, Le Travail sur ce qui est corrompu. Elle repère d’instinct ce qui cloche dans un schéma pour pouvoir l’améliorer. Définie, elle peut se voir chez quelqu’un qui voit le défaut d’un processus en quelques minutes — précieux en contrôle qualité ou en relecture, plus difficile pour les proches quand la correction n’était pas demandée.",
    },
  },
  19: {
    name: { en: "Wanting", fr: "Le besoin" },
    what: {
      en: "Gate 19 sits in the Root centre (hexagram 19, Approach). It is a pressure-driven sensitivity to basic needs — food, shelter, closeness, belonging. Defined, it often shows as someone who notices at once who is hungry or left out at a gathering and needs to belong; that sensitivity can also make them give up too much to stay included.",
      fr: "La porte 19 se trouve dans le centre Racine et correspond à l’hexagramme 19, L’Approche. C’est une sensibilité, sous pression, aux besoins de base\u202f: nourriture, abri, proximité, appartenance. Définie, elle se voit souvent chez quelqu’un qui remarque tout de suite qui a faim ou qui est mis à l’écart lors d’une réunion, et qui a besoin de faire partie d’un groupe\u202f; cette sensibilité peut aussi le pousser à trop céder pour rester inclus.",
    },
  },
  20: {
    name: { en: "The Now", fr: "Le présent" },
    what: {
      en: "Gate 20 is in the Throat centre (hexagram 20, Contemplation). Its theme is awareness expressed in the present moment. Defined, it can show as someone who reacts quickly and accurately to what is happening right now — in a meeting or an emergency — and who finds long-range planning less natural than naming what is in front of them.",
      fr: "La porte 20 est dans le centre de la Gorge et correspond à l’hexagramme 20, La Contemplation. Elle parle d’une conscience qui s’exprime dans l’instant présent. Définie, elle peut se voir chez quelqu’un qui réagit vite et juste à ce qui se passe maintenant — en réunion ou dans une urgence — et pour qui planifier loin est moins naturel que nommer ce qu’il a sous les yeux.",
    },
  },
  21: {
    name: { en: "The Hunter/Huntress", fr: "Le chasseur / la chasseresse" },
    what: {
      en: "Gate 21 sits in the Heart (Ego) centre (hexagram 21, Biting Through). Its theme is control over one’s own territory: money, work, food, space. Defined, it often shows as someone who wants to manage their own budget or schedule and does it well, but bristles at being managed; being given real authority usually settles that tension.",
      fr: "La porte 21 se trouve dans le Cœur (Ego) et correspond à l’hexagramme 21, Mordre au travers. Elle parle de garder la main sur son propre territoire\u202f: argent, travail, nourriture, espace. Définie, elle se voit souvent chez quelqu’un qui veut gérer lui-même son budget ou son emploi du temps et le fait bien, mais supporte mal d’être encadré\u202f; recevoir une vraie autorité apaise en général cette tension.",
    },
  },
  22: {
    name: { en: "Openness", fr: "Ouverture" },
    what: {
      en: "Gate 22 is in the Solar Plexus (hexagram 22, Grace). It carries social grace and attentive listening that depend on mood. Defined, it can show as someone who is warm and charming at a dinner when they feel good and who needs to be left alone when they don’t. Respecting those swings, rather than forcing sociability, keeps the grace genuine.",
      fr: "La porte 22 est dans le Plexus solaire et correspond à l’hexagramme 22, La Grâce. Elle porte une élégance sociale et une écoute attentive qui dépendent de l’humeur. Définie, elle peut se voir chez quelqu’un de chaleureux et charmant à un dîner quand il se sent bien, et qui a besoin qu’on le laisse tranquille dans le cas contraire. Respecter ces variations plutôt que se forcer garde cette grâce sincère.",
    },
  },
  23: {
    name: { en: "Assimilation", fr: "Assimilation" },
    what: {
      en: "Gate 23 sits in the Throat centre (hexagram 23, Splitting Apart). It is about putting an individual insight into simple words others can take in. Defined, it often shows as someone who says unusual things; explained clearly, the point sounds original; blurted out too fast or too abstractly, it sounds odd.",
      fr: "La porte 23 se trouve dans le centre de la Gorge et correspond à l’hexagramme 23, L’Éclatement. Elle parle de traduire une intuition personnelle en mots simples que les autres peuvent intégrer. Définie, elle se voit souvent chez quelqu’un qui dit des choses inhabituelles\u202f; bien expliquées, elles le font passer pour original, lâchées trop vite ou trop abstraites, pour bizarre.",
    },
  },
  24: {
    name: { en: "Rationalization", fr: "Rationalisation" },
    what: {
      en: "Gate 24 is in the Ajna (hexagram 24, Return). Its theme is the mind returning again and again to a thought until it makes sense. Defined, it can show as someone who replays a conversation for days until they understand it. That circling eventually produces real insight, though it can also become a loop that justifies an old habit.",
      fr: "La porte 24 est dans l’Ajna et correspond à l’hexagramme 24, Le Retour. Elle décrit un mental qui revient sans cesse sur une pensée jusqu’à ce qu’elle prenne sens. Définie, elle peut se voir chez quelqu’un qui repasse une conversation dans sa tête pendant des jours jusqu’à la comprendre. Ce va-et-vient finit par produire une vraie compréhension, mais peut aussi tourner en boucle pour justifier une vieille habitude.",
    },
  },
  25: {
    name: { en: "The Spirit of the Self", fr: "L’esprit du soi" },
    what: {
      en: "Gate 25 sits in the G centre (hexagram 25, Innocence). It carries an unconditional love that extends to all living things, and an innocence that gets tested by hard experiences. Defined, it often shows as a deep bond with animals or nature, and as someone who keeps trusting people after being let down.",
      fr: "La porte 25 se trouve dans le centre G et correspond à l’hexagramme 25, L’Innocence. Elle porte un amour sans condition qui s’étend à tout ce qui vit, et une innocence que les épreuves mettent à l’essai. Définie, elle se voit souvent dans un lien profond avec les animaux ou la nature, et chez quelqu’un qui continue de faire confiance après avoir été déçu.",
    },
  },
  26: {
    name: { en: "The Egoist", fr: "L’égoïste" },
    what: {
      en: "Gate 26 is in the Heart (Ego) centre (hexagram 26, The Taming Power of the Great). It is the gift of persuasion: memory, presentation and the ability to sell. Defined, it can show as someone who pitches an idea or a product so it sounds its best. The pitfall is overpromising, or bending the story too far.",
      fr: "La porte 26 est dans le Cœur (Ego) et correspond à l’hexagramme 26, Le Pouvoir d’apprivoisement du grand. C’est le don de persuader\u202f: mémoire, mise en valeur, sens de la vente. Définie, elle peut se voir chez quelqu’un qui présente une idée ou un produit sous son meilleur jour. L’écueil est de promettre plus qu’on ne peut tenir, ou d’arranger un peu trop l’histoire.",
    },
  },
  27: {
    name: { en: "Caring", fr: "Prendre soin" },
    what: {
      en: "Gate 27 sits in the Sacral centre (hexagram 27, Nourishment). It is the energy to care for, feed and protect others. Defined, it often shows as the person who cooks for everyone, looks after an ageing parent or checks that colleagues are coping. It works best when they also count themselves among the people who need looking after.",
      fr: "La porte 27 se trouve dans le centre Sacral et correspond à l’hexagramme 27, La Nourriture. C’est l’énergie de prendre soin des autres, de les nourrir et de les protéger. Définie, elle se voit souvent chez la personne qui cuisine pour tout le monde, s’occupe d’un parent âgé ou vérifie que ses collègues tiennent le coup. Elle fonctionne mieux quand cette personne se compte aussi parmi ceux dont il faut s’occuper.",
    },
  },
  28: {
    name: { en: "The Game Player", fr: "Le joueur" },
    what: {
      en: "Gate 28 is in the Spleen (hexagram 28, Preponderance of the Great). Its theme is the search for what makes life worth the struggle, with an instinctive fear that it might be meaningless. Defined, it can show as someone who takes on a risky venture or a hard cause to find out whether it is worth fighting for.",
      fr: "La porte 28 est dans la Rate et correspond à l’hexagramme 28, La Prépondérance du grand. Elle parle de chercher ce qui rend la vie digne d’efforts, avec la crainte instinctive qu’elle n’ait pas de sens. Définie, elle peut se voir chez quelqu’un qui se lance dans une aventure risquée ou une cause difficile pour savoir si elle vaut le combat.",
    },
  },
  29: {
    name: { en: "Saying Yes", fr: "Dire oui" },
    what: {
      en: "Gate 29 sits in the Sacral centre (hexagram 29, The Abysmal). It is the energy of commitment: saying yes and persevering through what follows. Defined, it often shows as someone who agrees to train for a marathon or join a new team and then sees it through. Because the commitment is so strong, what they say yes to matters.",
      fr: "La porte 29 se trouve dans le centre Sacral et correspond à l’hexagramme 29, L’Insondable. C’est l’énergie de l’engagement\u202f: dire oui et persévérer dans ce qui suit. Définie, elle se voit souvent chez quelqu’un qui accepte de préparer un marathon ou de rejoindre une nouvelle équipe, puis va jusqu’au bout. L’engagement étant très fort, le choix de ce à quoi l’on dit oui compte énormément.",
    },
  },
  30: {
    name: { en: "Recognition of Feelings", fr: "Reconnaissance des sentiments" },
    what: {
      en: "Gate 30 is in the Solar Plexus (hexagram 30, The Clinging Fire). Its theme is desire: intense feelings that push towards new experiences. Defined, it can show as a strong longing for a trip, a relationship or a change of life. The experience itself is the point; expectations about how it should turn out are what usually disappoint.",
      fr: "La porte 30 est dans le Plexus solaire et correspond à l’hexagramme 30, Ce qui s’attache (le Feu). Elle parle du désir\u202f: des sentiments intenses qui poussent vers de nouvelles expériences. Définie, elle peut se voir sous la forme d’une forte envie de voyage, de relation ou de changement de vie. C’est l’expérience elle-même qui compte\u202f; ce qui déçoit, en général, ce sont les attentes sur son issue.",
    },
  },
  31: {
    name: { en: "Influence", fr: "Influence" },
    what: {
      en: "Gate 31 sits in the Throat centre (hexagram 31, Influence). It is the voice of leadership that works when others recognise it. Defined, it often shows as the person the group turns to at the end of a meeting to say where things go next. Pushing to lead without that recognition tends to meet resistance.",
      fr: "La porte 31 se trouve dans le centre de la Gorge et correspond à l’hexagramme 31, L’Influence. C’est la voix du leadership, qui porte quand les autres la reconnaissent. Définie, elle se voit souvent chez la personne vers qui le groupe se tourne en fin de réunion pour savoir quelle suite donner. Vouloir diriger sans cette reconnaissance rencontre en général de la résistance.",
    },
  },
  32: {
    name: { en: "Continuity", fr: "Continuité" },
    what: {
      en: "Gate 32 is in the Spleen (hexagram 32, Duration). It is an instinct for what will last, paired with a fear of failure. Defined, it can show as someone who senses quickly whether a business idea or a new hire has a future. The same instinct can make them hold on to a safe option longer than necessary.",
      fr: "La porte 32 est dans la Rate et correspond à l’hexagramme 32, La Durée. C’est un instinct de ce qui va durer, doublé d’une peur de l’échec. Définie, elle peut se voir chez quelqu’un qui sent vite si une idée d’entreprise ou une nouvelle recrue a de l’avenir. Le même instinct peut le faire rester plus longtemps que nécessaire sur une option sûre.",
    },
  },
  33: {
    name: { en: "Privacy", fr: "Retrait" },
    what: {
      en: "Gate 33 sits in the Throat centre (hexagram 33, Retreat). Its theme is stepping back to digest an experience, then telling what was learned. Defined, it often shows as someone who needs time alone after a trip, a breakup or a big project before they can talk about it; once processed, their account is usually the clearest one.",
      fr: "La porte 33 se trouve dans le centre de la Gorge et correspond à l’hexagramme 33, La Retraite. Elle parle de prendre du recul pour digérer une expérience, puis de raconter ce qu’on en a tiré. Définie, elle se voit souvent chez quelqu’un qui a besoin d’être seul après un voyage, une rupture ou un gros projet avant d’en parler\u202f; une fois digéré, son récit est souvent le plus clair.",
    },
  },
  34: {
    name: { en: "Power", fr: "Puissance" },
    what: {
      en: "Gate 34 is in the Sacral centre (hexagram 34, The Power of the Great). It is raw, independent working power that wants to be busy. Defined, it can show as someone who works for hours on something that caught them without needing anyone else. Aimed at the wrong things, that power just becomes busyness.",
      fr: "La porte 34 est dans le centre Sacral et correspond à l’hexagramme 34, La Puissance du grand. C’est une puissance de travail brute et indépendante, qui veut être occupée. Définie, elle peut se voir chez quelqu’un qui travaille des heures sur ce qui l’a accroché, sans avoir besoin de personne. Mal dirigée, cette puissance devient une simple agitation.",
    },
  },
  35: {
    name: { en: "Change", fr: "Changement" },
    what: {
      en: "Gate 35 sits in the Throat centre (hexagram 35, Progress). It is a hunger for new experiences and the change they bring. Defined, it often shows as someone who tries a new job, city or hobby, loses interest once it becomes routine, and moves on. Over time that variety turns into broad practical knowledge worth sharing.",
      fr: "La porte 35 se trouve dans le centre de la Gorge et correspond à l’hexagramme 35, Le Progrès. C’est une faim d’expériences nouvelles et du changement qu’elles apportent. Définie, elle se voit souvent chez quelqu’un qui essaie un nouveau travail, une nouvelle ville ou un nouveau loisir, s’en lasse dès que la routine s’installe, et passe à autre chose. Avec le temps, cette variété devient un savoir pratique très large, bon à transmettre.",
    },
  },
  36: {
    name: { en: "Crisis", fr: "Crise" },
    what: {
      en: "Gate 36 is in the Solar Plexus (hexagram 36, Darkening of the Light). Its theme is emotional inexperience that seeks new experience, and learning to handle the crises that follow. Defined, it can show as someone who throws themselves into a new relationship or venture and grows through the upheaval; waiting for emotional clarity first spares much of the turbulence.",
      fr: "La porte 36 est dans le Plexus solaire et correspond à l’hexagramme 36, L’Obscurcissement de la lumière. Elle parle d’une inexpérience émotionnelle qui cherche du neuf, et de l’apprentissage des crises qui en découlent. Définie, elle peut se voir chez quelqu’un qui se jette dans une nouvelle relation ou un nouveau projet et grandit à travers les remous\u202f; attendre d’abord la clarté émotionnelle en évite une bonne part.",
    },
  },
  37: {
    name: { en: "Friendship", fr: "Amitié" },
    what: {
      en: "Gate 37 sits in the Solar Plexus (hexagram 37, The Family). Its theme is warmth and friendship built on fair bargains: loyalty given in return for support. Defined, it often shows as someone who seals agreements with a handshake and a meal, and who feels deeply hurt when the other side does not keep its part.",
      fr: "La porte 37 se trouve dans le Plexus solaire et correspond à l’hexagramme 37, La Famille. Elle parle d’une chaleur et d’une amitié fondées sur des accords équitables\u202f: la loyauté en échange du soutien. Définie, elle se voit souvent chez quelqu’un qui conclut un accord par une poignée de main et un repas, et qui est profondément blessé quand l’autre partie ne tient pas sa parole.",
    },
  },
  38: {
    name: { en: "The Fighter", fr: "Le combattant" },
    what: {
      en: "Gate 38 is in the Root centre (hexagram 38, Opposition). It is the pressure to fight for what gives life meaning. Defined, it can show as someone who takes on a bureaucracy for a neighbour or refuses to drop a cause. It is most satisfying when the fight is chosen for a purpose rather than out of stubbornness.",
      fr: "La porte 38 est dans le centre Racine et correspond à l’hexagramme 38, L’Opposition. C’est la pression de se battre pour ce qui donne un sens à la vie. Définie, elle peut se voir chez quelqu’un qui affronte l’administration pour un voisin ou refuse de lâcher une cause. Elle apporte le plus de satisfaction quand le combat est choisi pour un but, et non par simple entêtement.",
    },
  },
  39: {
    name: { en: "Provocation", fr: "Provocation" },
    what: {
      en: "Gate 39 sits in the Root centre (hexagram 39, Obstruction). It is the pressure to provoke a reaction that reveals what someone really feels. Defined, it often shows as teasing or challenging questions that test where people stand. Used with care it wakes people up; used carelessly it simply picks fights.",
      fr: "La porte 39 se trouve dans le centre Racine et correspond à l’hexagramme 39, L’Obstacle. C’est la pression de provoquer une réaction qui révèle ce que l’autre ressent vraiment. Définie, elle se voit souvent sous la forme de taquineries ou de questions piquantes qui testent la position de chacun. Utilisée avec soin, elle réveille\u202f; utilisée à la légère, elle cherche seulement la querelle.",
    },
  },
  40: {
    name: { en: "Aloneness", fr: "Solitude" },
    what: {
      en: "Gate 40 is in the Heart (Ego) centre (hexagram 40, Deliverance). It is the willpower to work for others, followed by a real need to be alone and rest. Defined, it can show as someone who provides for a family or a team all week and needs an evening to themselves; without appreciation or rest, resentment builds.",
      fr: "La porte 40 est dans le Cœur (Ego) et correspond à l’hexagramme 40, La Libération. C’est la volonté de travailler pour les autres, suivie d’un vrai besoin d’être seul et de se reposer. Définie, elle peut se voir chez quelqu’un qui subvient aux besoins d’une famille ou d’une équipe toute la semaine et a besoin d’une soirée à soi\u202f; sans reconnaissance ni repos, la rancœur s’installe.",
    },
  },
  41: {
    name: { en: "Contraction", fr: "Contraction" },
    what: {
      en: "Gate 41 sits in the Root centre (hexagram 41, Decrease); its start marks the beginning of the Human Design year. It is the pressure of imagination that seeds new experiences. Defined, it often shows as someone who daydreams about a different life or a long trip, and the fantasy is the first step towards trying something new.",
      fr: "La porte 41 se trouve dans le centre Racine et correspond à l’hexagramme 41, La Diminution\u202f; son début marque le commencement de l’année en Human Design. C’est la pression de l’imagination, qui prépare de nouvelles expériences. Définie, elle se voit souvent chez quelqu’un qui rêve d’une autre vie ou d’un long voyage, ce rêve étant le premier pas vers une expérience nouvelle.",
    },
  },
  42: {
    name: { en: "Growth", fr: "Croissance" },
    what: {
      en: "Gate 42 is in the Sacral centre (hexagram 42, Increase). It is the energy to bring a cycle to completion and grow from it. Defined, it can show as someone who finishes the book, the renovation or the degree they started, and finds it hard to walk away halfway. Starting the right cycles therefore matters.",
      fr: "La porte 42 est dans le centre Sacral et correspond à l’hexagramme 42, L’Augmentation. C’est l’énergie de mener un cycle à son terme et d’en grandir. Définie, elle peut se voir chez quelqu’un qui termine le livre, la rénovation ou le diplôme commencés, et qui a du mal à s’arrêter en chemin. D’où l’importance de commencer les bons cycles.",
    },
  },
  43: {
    name: { en: "Insight", fr: "Perspicacité" },
    what: {
      en: "Gate 43 sits in the Ajna (hexagram 43, Breakthrough). It produces sudden, individual insights that arrive already formed. Defined, it often shows as a solution that pops up in the shower, followed by the difficulty of explaining how they know. Waiting until someone is ready to listen gives the insight a much better reception.",
      fr: "La porte 43 se trouve dans l’Ajna et correspond à l’hexagramme 43, La Percée. Elle produit des intuitions soudaines et personnelles qui arrivent toutes formées. Définie, elle se voit souvent sous la forme d’une solution qui surgit sous la douche, suivie de la difficulté d’expliquer d’où elle vient. Attendre que l’autre soit prêt à écouter lui assure un bien meilleur accueil.",
    },
  },
  44: {
    name: { en: "Alertness", fr: "Vigilance" },
    what: {
      en: "Gate 44 is in the Spleen (hexagram 44, Coming to Meet). It is an instinctive memory for patterns, especially in people. Defined, it can show as someone who sizes up a candidate or a new acquaintance in minutes and is usually right about their potential. The same memory can make old wariness resurface where it no longer applies.",
      fr: "La porte 44 est dans la Rate et correspond à l’hexagramme 44, Venir à la rencontre. C’est une mémoire instinctive des schémas, surtout chez les gens. Définie, elle peut se voir chez quelqu’un qui cerne un candidat ou une nouvelle connaissance en quelques minutes et voit souvent juste sur son potentiel. La même mémoire peut faire resurgir une méfiance ancienne là où elle n’a plus lieu d’être.",
    },
  },
  45: {
    name: { en: "The Gatherer", fr: "Le rassembleur" },
    what: {
      en: "Gate 45 sits in the Throat centre (hexagram 45, Gathering Together). It is the voice that gathers people and decides how shared resources are used. Defined, it often shows as the one who handles the family finances or organises the group trip. It works well when those gathered also benefit, and poorly when it becomes simple possession.",
      fr: "La porte 45 se trouve dans le centre de la Gorge et correspond à l’hexagramme 45, Le Rassemblement. C’est la voix qui rassemble et décide de l’usage des ressources communes. Définie, elle se voit souvent chez la personne qui gère les finances de la famille ou organise le voyage du groupe. Cela fonctionne quand ceux qu’elle rassemble en profitent aussi, beaucoup moins quand cela devient simple possession.",
    },
  },
  46: {
    name: { en: "Determination of the Self", fr: "Détermination du soi" },
    what: {
      en: "Gate 46 is in the G centre (hexagram 46, Pushing Upward). Its theme is love of the body and being in the right place at the right time. Defined, it can show as someone who comes alive through dance or sport, and whose lucky breaks come from simply showing up fully where they are rather than from forcing plans.",
      fr: "La porte 46 est dans le centre G et correspond à l’hexagramme 46, La Poussée vers le haut. Elle parle de l’amour du corps et du fait d’être au bon endroit au bon moment. Définie, elle peut se voir chez quelqu’un qui s’épanouit par la danse ou le sport, et dont les coups de chance viennent d’une présence entière là où il est plutôt que de plans forcés.",
    },
  },
  47: {
    name: { en: "Realization", fr: "Réalisation" },
    what: {
      en: "Gate 47 sits in the Ajna (hexagram 47, Oppression). It works on making sense of past experience, which can feel like mental pressure until the answer comes. Defined, it often shows as an event that remained confusing for weeks and then suddenly makes sense. Trying to force that moment tends to deepen the frustration.",
      fr: "La porte 47 se trouve dans l’Ajna et correspond à l’hexagramme 47, L’Accablement. Elle cherche à donner un sens à l’expérience passée, ce qui peut peser sur le mental jusqu’à ce que la réponse arrive. Définie, elle se voit souvent quand un événement reste confus des semaines puis s’éclaire d’un coup. Vouloir forcer ce moment ne fait qu’augmenter la frustration.",
    },
  },
  48: {
    name: { en: "Depth", fr: "Profondeur" },
    what: {
      en: "Gate 48 is in the Spleen (hexagram 48, The Well). It is depth of knowledge, paired with a fear of not knowing enough. Defined, it can show as someone who studies a subject thoroughly and gives solid answers, yet hesitates to start teaching or applying until they feel ready. Often they are ready well before they feel it.",
      fr: "La porte 48 est dans la Rate et correspond à l’hexagramme 48, Le Puits. C’est la profondeur du savoir, doublée de la peur de ne pas en savoir assez. Définie, elle peut se voir chez quelqu’un qui étudie un sujet à fond et donne des réponses solides, mais hésite à enseigner ou à se lancer tant qu’il ne se sent pas prêt. Souvent, il l’est bien avant de le sentir.",
    },
  },
  49: {
    name: { en: "Principles", fr: "Principes" },
    what: {
      en: "Gate 49 sits in the Solar Plexus (hexagram 49, Revolution). Its theme is principles that decide who is accepted or rejected, and the change that follows when those principles are broken. Defined, it often shows as someone who ends a job or a relationship once a core value is crossed; waiting out the emotional wave keeps that decision fair.",
      fr: "La porte 49 se trouve dans le Plexus solaire et correspond à l’hexagramme 49, La Révolution. Elle parle de principes qui décident de qui est accepté ou rejeté, et du changement qui suit quand ces principes sont bafoués. Définie, elle se voit souvent chez quelqu’un qui quitte un poste ou une relation dès qu’une valeur essentielle est franchie\u202f; laisser passer la vague émotionnelle garde cette décision juste.",
    },
  },
  50: {
    name: { en: "Values", fr: "Valeurs" },
    what: {
      en: "Gate 50 is in the Spleen (hexagram 50, The Cauldron). It carries values and a sense of responsibility for the wellbeing of the group. Defined, it can show as the person who sets house rules, checks that everyone is safe, or keeps a team’s standards. The risk is taking responsibility for others who did not ask for it.",
      fr: "La porte 50 est dans la Rate et correspond à l’hexagramme 50, Le Chaudron. Elle porte des valeurs et un sens de la responsabilité envers le bien-être du groupe. Définie, elle peut se voir chez la personne qui fixe les règles de la maison, vérifie que chacun est en sécurité ou maintient les exigences d’une équipe. Le risque est de se charger de gens qui n’ont rien demandé.",
    },
  },
  51: {
    name: { en: "Shock", fr: "Choc" },
    what: {
      en: "Gate 51 sits in the Heart (Ego) centre (hexagram 51, The Arousing). Its theme is shock and the courage to be first. Defined, it often shows as someone who handles surprises well, enjoys competition, and occasionally jolts others awake with a blunt remark or a sudden move. The same trait can create unnecessary shocks when used for its own sake.",
      fr: "La porte 51 se trouve dans le Cœur (Ego) et correspond à l’hexagramme 51, L’Éveilleur. Elle parle du choc et du courage d’être le premier. Définie, elle se voit souvent chez quelqu’un qui encaisse bien les surprises, aime la compétition et secoue parfois les autres par une remarque franche ou un geste soudain. Utilisé pour lui-même, ce trait peut aussi créer des chocs inutiles.",
    },
  },
  52: {
    name: { en: "Stillness", fr: "Immobilité" },
    what: {
      en: "Gate 52 is in the Root centre (hexagram 52, Keeping Still). It is the pressure to stay still in order to concentrate. Defined, it can show as someone who sits for hours on a single task when focused, and who becomes restless and scattered when there is nothing clear to focus on.",
      fr: "La porte 52 est dans le centre Racine et correspond à l’hexagramme 52, L’Immobilisation. C’est la pression de rester immobile pour se concentrer. Définie, elle peut se voir chez quelqu’un qui reste des heures sur une seule tâche quand il est concentré, et qui devient agité et dispersé quand rien de clair ne retient son attention.",
    },
  },
  53: {
    name: { en: "Beginnings", fr: "Commencements" },
    what: {
      en: "Gate 53 sits in the Root centre (hexagram 53, Development). It is the pressure to start something new. Defined, it often shows as someone with several projects begun and few finished — a garden planned, a course enrolled in, a business sketched. They do best choosing starts carefully, or teaming with people who enjoy finishing.",
      fr: "La porte 53 se trouve dans le centre Racine et correspond à l’hexagramme 53, Le Développement progressif. C’est la pression de commencer quelque chose de neuf. Définie, elle se voit souvent chez quelqu’un qui a plusieurs projets entamés et peu d’achevés — un jardin prévu, une formation commencée, une entreprise esquissée. Mieux vaut choisir ses débuts avec soin, ou s’associer à des gens qui aiment finir.",
    },
  },
  54: {
    name: { en: "Ambition", fr: "Ambition" },
    what: {
      en: "Gate 54 is in the Root centre (hexagram 54, The Marrying Maiden). It is the drive to rise, materially and spiritually. Defined, it can show as someone who works their way up, networks with people who can open doors, and wants recognition for the effort. Their ambition goes further when others see and support it.",
      fr: "La porte 54 est dans le centre Racine et correspond à l’hexagramme 54, L’Épousée. C’est la poussée pour s’élever, matériellement comme spirituellement. Définie, elle peut se voir chez quelqu’un qui gravit les échelons, cultive les relations qui ouvrent des portes et veut que ses efforts soient reconnus. Son ambition va plus loin quand d’autres la voient et la soutiennent.",
    },
  },
  55: {
    name: { en: "Spirit", fr: "Esprit" },
    what: {
      en: "Gate 55 sits in the Solar Plexus (hexagram 55, Abundance). Its theme is moods that swing between fullness and emptiness, and a sense of abundance that does not depend on circumstances. Defined, it often shows as someone who feels rich one week and empty the next with little outward change; knowing the mood will shift again takes the edge off.",
      fr: "La porte 55 se trouve dans le Plexus solaire et correspond à l’hexagramme 55, L’Abondance. Elle parle d’humeurs qui oscillent entre plénitude et vide, et d’un sentiment d’abondance qui ne dépend pas des circonstances. Définie, elle se voit souvent chez quelqu’un qui se sent comblé une semaine et vide la suivante sans que rien n’ait changé autour\u202f; savoir que l’humeur tournera encore en adoucit l’effet.",
    },
  },
  56: {
    name: { en: "Stimulation", fr: "Stimulation" },
    what: {
      en: "Gate 56 is in the Throat centre (hexagram 56, The Wanderer). It is the storyteller, who stimulates others by sharing experiences and ideas. Defined, it can show as someone whose account of a trip grows livelier every time they tell it. The story is meant to engage and teach, not to be taken as a literal report.",
      fr: "La porte 56 est dans le centre de la Gorge et correspond à l’hexagramme 56, Le Voyageur. C’est le conteur, qui stimule les autres en partageant expériences et idées. Définie, elle peut se voir chez quelqu’un dont le récit de voyage devient plus vivant à chaque fois qu’il le raconte. L’histoire est là pour captiver et transmettre, pas pour servir de compte rendu à la lettre.",
    },
  },
  57: {
    name: { en: "Intuitive Clarity", fr: "Clarté intuitive" },
    what: {
      en: "Gate 57 sits in the Spleen (hexagram 57, The Gentle). It is intuition in the present moment, often felt as an inner hearing. Defined, it often shows as a quiet, one-time sense that something is off — don’t sign that lease, call that friend now. Because it speaks once and softly, it is easy to dismiss.",
      fr: "La porte 57 se trouve dans la Rate et correspond à l’hexagramme 57, Le Doux. C’est l’intuition de l’instant, souvent vécue comme une écoute intérieure. Définie, elle se voit souvent sous la forme d’un signal discret, qui ne se répète pas — ne pas signer ce bail, appeler un ami maintenant. Comme il ne parle qu’une fois et à voix basse, il est facile de s’en dissuader.",
    },
  },
  58: {
    name: { en: "Vitality", fr: "Vitalité" },
    what: {
      en: "Gate 58 is in the Root centre (hexagram 58, The Joyous). It is the joy of being alive, channelled into making things better. Defined, it can show as someone energised by improving a process, a recipe or a neighbourhood. That enthusiasm is contagious when it is invited and can feel like pressure when it is not.",
      fr: "La porte 58 est dans le centre Racine et correspond à l’hexagramme 58, Le Serein. C’est la joie de vivre, tournée vers l’amélioration des choses. Définie, elle peut se voir chez quelqu’un qu’améliorer un processus, une recette ou un quartier remplit d’énergie. Cet enthousiasme est communicatif quand il est bienvenu, et peut peser quand il ne l’est pas.",
    },
  },
  59: {
    name: { en: "Sexuality", fr: "Sexualité" },
    what: {
      en: "Gate 59 sits in the Sacral centre (hexagram 59, Dispersion). Despite its name, its theme is broader than sex: the energy that breaks down barriers so people can get close. Defined, it often shows as someone who builds rapport quickly and with whom others open up after one conversation, in friendship and at work as well as in love.",
      fr: "La porte 59 se trouve dans le centre Sacral et correspond à l’hexagramme 59, La Dissolution. Malgré son nom, son thème dépasse la sexualité\u202f: c’est l’énergie qui fait tomber les barrières pour permettre la proximité. Définie, elle se voit souvent chez quelqu’un qui crée vite un lien et avec qui les autres s’ouvrent dès la première conversation, en amitié et au travail autant qu’en amour.",
    },
  },
  60: {
    name: { en: "Acceptance", fr: "Acceptation" },
    what: {
      en: "Gate 60 is in the Root centre (hexagram 60, Limitation). Its theme is accepting limits as the ground from which something new can emerge. Defined, it can show as someone who works well within a tight budget or strict rules and waits for the moment when change becomes possible, rather than fighting every constraint.",
      fr: "La porte 60 est dans le centre Racine et correspond à l’hexagramme 60, La Limitation. Elle parle d’accepter les limites comme le terrain d’où quelque chose de neuf peut naître. Définie, elle peut se voir chez quelqu’un qui travaille bien avec un budget serré ou des règles strictes et attend le moment où le changement devient possible, au lieu de lutter contre chaque contrainte.",
    },
  },
  61: {
    name: { en: "Mystery", fr: "Mystère" },
    what: {
      en: "Gate 61 sits in the Head centre (hexagram 61, Inner Truth). It is the pressure to know what cannot be known: why we are here, what things really mean. Defined, it often shows as late-night questioning about life and existence. The questions inspire; demanding final answers from them tends to cause anxiety.",
      fr: "La porte 61 se trouve dans le centre de la Tête et correspond à l’hexagramme 61, La Vérité intérieure. C’est la pression de connaître l’inconnaissable\u202f: pourquoi nous sommes là, ce que les choses signifient vraiment. Définie, elle se voit souvent dans des questionnements nocturnes sur la vie et l’existence. Ces questions inspirent\u202f; exiger d’elles des réponses définitives crée plutôt de l’anxiété.",
    },
  },
  62: {
    name: { en: "Details", fr: "Détails" },
    what: {
      en: "Gate 62 is in the Throat centre (hexagram 62, Preponderance of the Small). It is the voice of facts and details, naming things precisely. Defined, it can show as someone who writes clear reports, remembers exact figures, or corrects an imprecise statement. Too many details can lose the listener, so knowing which ones matter is the skill.",
      fr: "La porte 62 est dans le centre de la Gorge et correspond à l’hexagramme 62, La Prépondérance du petit. C’est la voix des faits et des détails, qui nomme les choses avec précision. Définie, elle peut se voir chez quelqu’un qui rédige des rapports clairs, retient les chiffres exacts ou rectifie une affirmation approximative. Trop de détails perdent l’auditeur\u202f: tout l’art est de savoir lesquels comptent.",
    },
  },
  63: {
    name: { en: "Doubt", fr: "Doute" },
    what: {
      en: "Gate 63 sits in the Head centre (hexagram 63, After Completion). It is logical doubt: the pressure to question whether a pattern holds. Defined, it often shows as someone who asks the awkward what-if in a planning meeting, which makes plans sturdier. Turned inward on their own worth, the same doubt becomes a burden.",
      fr: "La porte 63 se trouve dans le centre de la Tête et correspond à l’hexagramme 63, Après l’accomplissement. C’est le doute logique\u202f: la pression de vérifier si un schéma tient. Définie, elle se voit souvent chez quelqu’un qui pose la question gênante «\u202fet si…\u202f?\u202f» en réunion, ce qui rend les plans plus solides. Retourné contre sa propre valeur, ce même doute devient un poids.",
    },
  },
  64: {
    name: { en: "Confusion", fr: "Confusion" },
    what: {
      en: "Gate 64 is in the Head centre (hexagram 64, Before Completion). It is the pressure to make sense of images and memories from the past. Defined, it can show as a mind that replays scenes and feels muddled for a while; clarity tends to arrive with time rather than through effort, often while doing something else.",
      fr: "La porte 64 est dans le centre de la Tête et correspond à l’hexagramme 64, Avant l’accomplissement. C’est la pression de donner un sens aux images et aux souvenirs du passé. Définie, elle peut se voir dans un mental qui repasse des scènes et reste embrouillé un moment\u202f; la clarté vient plutôt avec le temps qu’avec l’effort, souvent pendant qu’on fait autre chose.",
    },
  },
};

/** All 36 channels, keyed exactly like HD_CHANNELS ids (en dash "–", same gate order). */
export const HD_CHANNEL_TEXT: Record<string, HdText> = {
  "64–47": {
    name: { en: "Abstraction", fr: "Abstraction" },
    what: {
      en: "The channel of Abstraction links the Head (gate 64) to the Ajna (gate 47). It makes a consistent way of thinking: sorting through past images and experiences until they form a meaningful story. Someone with it defined often reflects on what happened last year and slowly draws a clear lesson from it. Confusion is part of the process and usually resolves with time.",
      fr: "Le canal de l’Abstraction relie la Tête (porte 64) à l’Ajna (porte 47). Il installe une façon constante de penser\u202f: trier les images et les expériences passées jusqu’à en tirer une histoire qui a du sens. Une personne qui l’a défini revient souvent sur ce qui s’est passé l’an dernier et en dégage peu à peu une leçon claire. La confusion fait partie du processus et se dissipe en général avec le temps.",
    },
  },
  "61–24": {
    name: { en: "Awareness", fr: "Prise de conscience" },
    what: {
      en: "The channel of Awareness links the Head (gate 61) to the Ajna (gate 24). It gives a steady inner pressure to understand the unknown, and a mind that keeps turning a question over until an original answer appears. Someone with it defined may spend days on a philosophical or technical puzzle before a sudden, personal insight arrives, which then needs careful explaining.",
      fr: "Le canal de la Prise de conscience relie la Tête (porte 61) à l’Ajna (porte 24). Il donne une pression constante à comprendre l’inconnu, et un mental qui retourne une question jusqu’à ce qu’une réponse originale apparaisse. Une personne qui l’a défini peut passer des jours sur une énigme philosophique ou technique avant qu’une intuition soudaine et personnelle ne surgisse, qu’il faudra ensuite expliquer avec soin.",
    },
  },
  "63–4": {
    name: { en: "Logic", fr: "Logique" },
    what: {
      en: "The channel of Logic links the Head (gate 63) to the Ajna (gate 4). It makes questioning and answering constant: doubt raises the question, and the mind proposes a formula to test. Someone with it defined tends to check claims, spot weak reasoning and suggest a better explanation, which is useful in science or planning but tiring when applied to every personal decision.",
      fr: "Le canal de la Logique relie la Tête (porte 63) à l’Ajna (porte 4). Il rend constants la question et la réponse\u202f: le doute soulève la question, le mental propose une formule à vérifier. Une personne qui l’a défini a tendance à contrôler les affirmations, repérer les raisonnements fragiles et proposer une meilleure explication — précieux en science ou en planification, épuisant s’il s’applique à chaque décision personnelle.",
    },
  },
  "17–62": {
    name: { en: "Acceptance", fr: "Acceptation" },
    what: {
      en: "The channel of Acceptance links the Ajna (gate 17) to the Throat (gate 62). It gives a consistent ability to turn an opinion into an organised, detailed explanation. Someone with it defined can lay out a plan step by step, with the facts to back it up, and is often the one who writes the proposal. It works best when others have asked for that view.",
      fr: "Le canal de l’Acceptation relie l’Ajna (porte 17) à la Gorge (porte 62). Il donne une capacité constante à transformer une opinion en explication organisée et détaillée. Une personne qui l’a défini sait exposer un plan étape par étape, faits à l’appui, et c’est souvent elle qui rédige la proposition. Cela fonctionne mieux quand les autres ont demandé son avis.",
    },
  },
  "43–23": {
    name: { en: "Structuring", fr: "Structuration" },
    what: {
      en: "The channel of Structuring links the Ajna (gate 43) to the Throat (gate 23). It makes a person consistently able to voice original insights that can change how others think. Someone with it defined often says something ahead of its time; explained at the right moment and in simple terms it is recognised as brilliant, blurted out too early it sounds strange.",
      fr: "Le canal de la Structuration relie l’Ajna (porte 43) à la Gorge (porte 23). Il rend une personne constamment capable d’exprimer des intuitions originales qui peuvent changer la façon de penser des autres. Une personne qui l’a défini dit souvent des choses en avance sur leur temps\u202f; expliquées au bon moment et simplement, elles passent pour brillantes, lâchées trop tôt, pour étranges.",
    },
  },
  "11–56": {
    name: { en: "Curiosity", fr: "Curiosité" },
    what: {
      en: "The channel of Curiosity links the Ajna (gate 11) to the Throat (gate 56). It gives a steady flow of ideas turned into stories that stimulate others. Someone with it defined is often a natural teacher, writer or dinner-table storyteller who searches for new experiences to talk about. The ideas are there to inspire, not all to be acted on.",
      fr: "Le canal de la Curiosité relie l’Ajna (porte 11) à la Gorge (porte 56). Il donne un flot régulier d’idées transformées en récits qui stimulent les autres. Une personne qui l’a défini est souvent enseignant, auteur ou conteur de tablée par nature, toujours en quête d’expériences nouvelles à raconter. Ces idées sont là pour inspirer, pas toutes pour être réalisées.",
    },
  },
  "16–48": {
    name: { en: "The Wavelength", fr: "La longueur d’onde" },
    what: {
      en: "The channel of the Wavelength links the Spleen (gate 48) to the Throat (gate 16). It makes talent consistent: depth of understanding combined with enthusiasm for practice. Someone with it defined often reaches real mastery in a craft — music, cooking, code — through years of repetition. The talent needs that practice; without it, depth stays hidden behind a fear of not being ready.",
      fr: "Le canal de la Longueur d’onde relie la Rate (porte 48) à la Gorge (porte 16). Il rend le talent constant\u202f: une compréhension profonde alliée à l’enthousiasme pour la pratique. Une personne qui l’a défini atteint souvent une vraie maîtrise dans un art — musique, cuisine, code — au fil d’années de répétition. Ce talent a besoin de pratique\u202f; sans elle, la profondeur reste cachée derrière la peur de ne pas être prêt.",
    },
  },
  "20–57": {
    name: { en: "The Brain Wave", fr: "L’onde cérébrale" },
    what: {
      en: "The channel of the Brain Wave links the Throat (gate 20) to the Spleen (gate 57). It makes intuition speak in the moment: a quiet knowing that can be put into words right away. Someone with it defined may say in a meeting that a deal feels wrong before any evidence appears. The intuition is quick and speaks once, so trusting it takes practice.",
      fr: "Le canal de l’Onde cérébrale relie la Gorge (porte 20) à la Rate (porte 57). Il fait parler l’intuition dans l’instant\u202f: un savoir discret qui peut être formulé aussitôt. Une personne qui l’a défini peut dire en réunion qu’un accord sonne faux avant toute preuve. Cette intuition est rapide et ne parle qu’une fois\u202f; lui faire confiance demande de l’entraînement.",
    },
  },
  "34–20": {
    name: { en: "Charisma", fr: "Charisme" },
    what: {
      en: "The channel of Charisma links the Sacral (gate 34) directly to the Throat (gate 20). A motor connected to the Throat, it turns impulse into immediate action, so someone with it defined can always act and, in Human Design, is a Manifesting Generator. It often shows as a busy, effective person moving from task to task; the risk is doing a lot without checking it is the right thing.",
      fr: "Le canal du Charisme relie directement le Sacral (porte 34) à la Gorge (porte 20). Moteur relié à la Gorge, il transforme la pensée en action immédiate\u202f: une personne qui l’a défini est toujours capable d’agir et, en Human Design, c’est un Générateur manifesteur. Cela se voit souvent chez quelqu’un d’occupé et d’efficace, qui enchaîne les tâches\u202f; le risque est d’en faire beaucoup sans vérifier que c’est la bonne chose.",
    },
  },
  "10–20": {
    name: { en: "Awakening", fr: "Éveil" },
    what: {
      en: "The channel of Awakening links the G centre (gate 10) to the Throat (gate 20). It makes a person consistently express their own way of being in the present, and act from their convictions. Someone with it defined often says exactly what they think and behaves true to it, which can inspire others to do the same. It needs to be recognised to have real influence.",
      fr: "Le canal de l’Éveil relie le centre G (porte 10) à la Gorge (porte 20). Il permet à une personne d’exprimer en permanence sa façon d’être dans l’instant et d’agir selon ses convictions. Une personne qui l’a défini dit souvent exactement ce qu’elle pense et s’y conforme, ce qui peut inciter les autres à en faire autant. Pour avoir une vraie influence, elle a besoin d’être reconnue.",
    },
  },
  "31–7": {
    name: { en: "The Alpha", fr: "L’alpha" },
    what: {
      en: "The channel of the Alpha links the Throat (gate 31) to the G centre (gate 7). It gives a consistent voice for leadership that points a group towards the future. Someone with it defined is often asked to lead — a class representative, a team lead, a spokesperson. In Human Design this leadership works when it is recognised or elected, not when it is simply claimed.",
      fr: "Le canal de l’Alpha relie la Gorge (porte 31) au centre G (porte 7). Il donne une voix constante au leadership qui oriente un groupe vers l’avenir. Une personne qui l’a défini est souvent sollicitée pour diriger — délégué de classe, chef d’équipe, porte-parole. En Human Design, ce leadership fonctionne quand il est reconnu ou choisi, pas quand il est simplement revendiqué.",
    },
  },
  "8–1": {
    name: { en: "Inspiration", fr: "Inspiration" },
    what: {
      en: "The channel of Inspiration links the Throat (gate 8) to the G centre (gate 1). It makes creative self-expression consistent: a distinctive style that others notice and are influenced by. Someone with it defined often becomes an example simply by doing things their own way, as an artist, designer or colleague with a recognisable touch. Recognition from others helps the contribution reach further.",
      fr: "Le canal de l’Inspiration relie la Gorge (porte 8) au centre G (porte 1). Il rend constante l’expression créative de soi\u202f: un style singulier que les autres remarquent et qui les influence. Une personne qui l’a défini devient souvent un exemple simplement en faisant les choses à sa façon, comme artiste, designer ou collègue à la patte reconnaissable. La reconnaissance des autres aide cette contribution à porter plus loin.",
    },
  },
  "33–13": {
    name: { en: "The Prodigal", fr: "Le prodigue" },
    what: {
      en: "The channel of the Prodigal links the Throat (gate 33) to the G centre (gate 13). It makes someone a consistent witness: they absorb experiences and secrets, retreat to digest them, then tell what they learned. Someone with it defined may keep a journal for years or become the family memory. Their stories carry most weight after time alone to process.",
      fr: "Le canal du Prodigue relie la Gorge (porte 33) au centre G (porte 13). Il fait d’une personne un témoin constant\u202f: elle recueille expériences et confidences, se retire pour les digérer, puis raconte ce qu’elle en a appris. Une personne qui l’a défini tient parfois un journal pendant des années ou devient la mémoire de la famille. Ses récits ont le plus de poids après un temps de retrait.",
    },
  },
  "45–21": {
    name: { en: "Money", fr: "Argent" },
    what: {
      en: "The channel of Money links the Throat (gate 45) to the Heart (gate 21). A motor connected to the Throat, it gives consistent willpower to manage and direct material resources, and the ability to act on it. Someone with it defined often wants to run their own business or control the household budget. Being in charge suits them; being micromanaged does not.",
      fr: "Le canal de l’Argent relie la Gorge (porte 45) au Cœur (porte 21). Moteur relié à la Gorge, il donne une volonté constante de gérer et d’orienter les ressources matérielles, et la capacité d’agir en ce sens. Une personne qui l’a défini veut souvent diriger sa propre affaire ou tenir le budget du foyer. Être aux commandes lui convient\u202f; être surveillée de près, beaucoup moins.",
    },
  },
  "12–22": {
    name: { en: "Openness", fr: "Ouverture" },
    what: {
      en: "The channel of Openness links the Throat (gate 12) to the Solar Plexus (gate 22). A motor connected to the Throat, it makes emotional expression and social grace a consistent part of a person, always coloured by mood. Someone with it defined can be deeply moving when they speak or perform in the right mood, and is best left to their silence when they are not.",
      fr: "Le canal de l’Ouverture relie la Gorge (porte 12) au Plexus solaire (porte 22). Moteur relié à la Gorge, il fait de l’expression émotionnelle et de l’aisance sociale une part constante de la personne, toujours teintée par l’humeur. Une personne qui l’a défini peut être très touchante quand elle parle ou se produit dans la bonne humeur, et mieux vaut respecter son silence dans le cas contraire.",
    },
  },
  "35–36": {
    name: { en: "Transitoriness", fr: "Éphémère" },
    what: {
      en: "The channel of Transitoriness links the Throat (gate 35) to the Solar Plexus (gate 36). A motor connected to the Throat, it gives a consistent emotional drive for new experiences and the ability to act on it. Someone with it defined often changes jobs, cities or passions several times and gains broad life experience. Waiting for emotional clarity before jumping in avoids many of the crises.",
      fr: "Le canal de l’Éphémère relie la Gorge (porte 35) au Plexus solaire (porte 36). Moteur relié à la Gorge, il donne une poussée émotionnelle constante vers de nouvelles expériences et la capacité d’y aller. Une personne qui l’a défini change souvent plusieurs fois de travail, de ville ou de passion et acquiert une large expérience de la vie. Attendre la clarté émotionnelle avant de se lancer évite bien des crises.",
    },
  },
  "10–57": {
    name: { en: "Perfected Form", fr: "Forme parfaite" },
    what: {
      en: "The channel of Perfected Form links the G centre (gate 10) to the Spleen (gate 57). It makes survival instinct and authentic behaviour work together: acting true to oneself while intuitively sensing what keeps one safe and well. Someone with it defined often has an eye for form — in design, in their own posture, in how a space is arranged — and trusts their gut about people.",
      fr: "Le canal de la Forme parfaite relie le centre G (porte 10) à la Rate (porte 57). Il fait travailler ensemble l’instinct de survie et un comportement authentique\u202f: agir selon soi tout en sentant intuitivement ce qui protège et fait du bien. Une personne qui l’a défini a souvent l’œil pour la forme — en design, dans sa posture, dans l’agencement d’un lieu — et se fie à son instinct au sujet des gens.",
    },
  },
  "10–34": {
    name: { en: "Exploration", fr: "Exploration" },
    what: {
      en: "The channel of Exploration links the G centre (gate 10) to the Sacral (gate 34). It gives consistent Sacral power to follow one’s own convictions. Someone with it defined tends to do things their way with a lot of energy, and does not easily follow instructions they have not agreed to. It works best when that independence responds to what life presents rather than pushing against it.",
      fr: "Le canal de l’Exploration relie le centre G (porte 10) au Sacral (porte 34). Il donne une puissance sacrale constante pour suivre ses propres convictions. Une personne qui l’a défini a tendance à faire les choses à sa manière avec beaucoup d’énergie, et suit mal les consignes auxquelles elle n’a pas adhéré. Cela fonctionne mieux quand cette indépendance répond à ce que la vie propose plutôt que de lutter contre.",
    },
  },
  "25–51": {
    name: { en: "Initiation", fr: "Initiation" },
    what: {
      en: "The channel of Initiation links the G centre (gate 25) to the Heart (gate 51). It gives a consistent drive to be first and to leap into the unknown, often through shocks that deepen a person’s spirit. Someone with it defined may take up extreme sports, launch into a risky venture or face a crisis head-on, and come out with a stronger sense of meaning.",
      fr: "Le canal de l’Initiation relie le centre G (porte 25) au Cœur (porte 51). Il donne une poussée constante à être le premier et à sauter dans l’inconnu, souvent à travers des chocs qui approfondissent l’esprit. Une personne qui l’a défini peut se lancer dans un sport extrême ou une aventure risquée, ou affronter une crise de face, et en ressortir avec un sens plus fort de ce qui compte.",
    },
  },
  "15–5": {
    name: { en: "Rhythm", fr: "Rythme" },
    what: {
      en: "The channel of Rhythm links the G centre (gate 15) to the Sacral (gate 5). It makes a person consistently attuned to natural rhythms and able to set a pace others fall into. Someone with it defined often keeps steady routines that ground a family or a team; disrupted schedules, night shifts or constant travel can throw them off more than most.",
      fr: "Le canal du Rythme relie le centre G (porte 15) au Sacral (porte 5). Il accorde en permanence une personne aux rythmes naturels et lui permet de donner un tempo que les autres suivent. Une personne qui l’a défini a souvent des routines régulières qui stabilisent une famille ou une équipe\u202f; horaires décousus, travail de nuit ou voyages incessants la dérèglent plus que d’autres.",
    },
  },
  "2–14": {
    name: { en: "The Beat", fr: "Le battement" },
    what: {
      en: "The channel of the Beat links the G centre (gate 2) to the Sacral (gate 14). It is often called the Keeper of Keys: a consistent sense of direction combined with the energy to generate resources. Someone with it defined often ends up steering money or projects towards what they believe in; the resources follow when the direction feels right to them.",
      fr: "Le canal du Battement relie le centre G (porte 2) au Sacral (porte 14). On l’appelle souvent le Gardien des clés\u202f: un sens constant de la direction allié à l’énergie de produire des ressources. Une personne qui l’a défini finit souvent par orienter l’argent ou les projets vers ce en quoi elle croit\u202f; les ressources suivent quand la direction lui semble juste.",
    },
  },
  "46–29": {
    name: { en: "Discovery", fr: "Découverte" },
    what: {
      en: "The channel of Discovery links the G centre (gate 46) to the Sacral (gate 29). It gives consistent energy to commit fully to an experience and discover things along the way. Someone with it defined may succeed where others gave up, because they keep going once committed. The key is committing to the right things, since they will follow through either way.",
      fr: "Le canal de la Découverte relie le centre G (porte 46) au Sacral (porte 29). Il donne une énergie constante pour s’engager pleinement dans une expérience et faire des découvertes en route. Une personne qui l’a défini réussit parfois là où d’autres ont renoncé, parce qu’une fois engagée elle continue. L’essentiel est de s’engager dans les bonnes choses, puisqu’elle ira au bout de toute façon.",
    },
  },
  "44–26": {
    name: { en: "Surrender", fr: "Abandon" },
    what: {
      en: "The channel of Surrender links the Spleen (gate 44) to the Heart (gate 26). It combines an instinctive memory for people and patterns with the willpower to persuade. Someone with it defined is often good at sales, recruiting or marketing: they know what people need and how to present it. Honesty about what is actually offered keeps that talent trusted.",
      fr: "Le canal de l’Abandon relie la Rate (porte 44) au Cœur (porte 26). Il associe une mémoire instinctive des gens et des schémas à la volonté de convaincre. Une personne qui l’a défini est souvent douée pour la vente, le recrutement ou le marketing\u202f: elle sait ce dont les gens ont besoin et comment le présenter. L’honnêteté sur ce qui est réellement proposé garde ce talent digne de confiance.",
    },
  },
  "40–37": {
    name: { en: "Community", fr: "Communauté" },
    what: {
      en: "The channel of Community links the Heart (gate 40) to the Solar Plexus (gate 37). It makes bargains and belonging consistent: work and support given in exchange for loyalty and care. Someone with it defined often holds a family, a club or a small business together. The arrangement works when both sides keep their part, and rest is part of the deal.",
      fr: "Le canal de la Communauté relie le Cœur (porte 40) au Plexus solaire (porte 37). Il rend constants le marché et l’appartenance\u202f: travail et soutien donnés en échange de loyauté et d’attention. Une personne qui l’a défini tient souvent ensemble une famille, un club ou une petite entreprise. L’accord fonctionne quand chacun tient sa part, et le repos fait partie du contrat.",
    },
  },
  "50–27": {
    name: { en: "Preservation", fr: "Préservation" },
    what: {
      en: "The channel of Preservation links the Spleen (gate 50) to the Sacral (gate 27). It gives consistent energy to care for others, guided by instinctive values about what keeps a group healthy. Someone with it defined is often the one who looks after children, elders or colleagues, and sets standards for how things are done. Caring for themselves belongs in that picture too.",
      fr: "Le canal de la Préservation relie la Rate (porte 50) au Sacral (porte 27). Il donne une énergie constante pour prendre soin des autres, guidée par des valeurs instinctives sur ce qui garde un groupe en bonne santé. Une personne qui l’a défini est souvent celle qui s’occupe des enfants, des aînés ou des collègues, et fixe la manière de bien faire. Prendre soin d’elle-même fait aussi partie du tableau.",
    },
  },
  "32–54": {
    name: { en: "Transformation", fr: "Transformation" },
    what: {
      en: "The channel of Transformation links the Spleen (gate 32) to the Root (gate 54). It gives consistent drive and ambition to rise, paired with an instinct for what will last. Someone with it defined often works steadily towards a better position or a stronger business, and senses which opportunities are sound. Recognition from people who can help them rise matters a lot.",
      fr: "Le canal de la Transformation relie la Rate (porte 32) à la Racine (porte 54). Il donne une ambition et une poussée constantes à s’élever, doublées d’un instinct de ce qui va durer. Une personne qui l’a défini travaille souvent avec régularité vers une meilleure position ou une entreprise plus solide, et sent quelles occasions sont saines. La reconnaissance de ceux qui peuvent l’aider à monter compte beaucoup.",
    },
  },
  "28–38": {
    name: { en: "Struggle", fr: "Lutte" },
    what: {
      en: "The channel of Struggle links the Spleen (gate 28) to the Root (gate 38). It gives a consistent drive to fight for a life that has meaning. Someone with it defined may take on hard causes, long training or difficult people rather than settle for an easy option. The struggle feels worthwhile when it serves a purpose they chose; without one, it turns into plain stubbornness.",
      fr: "Le canal de la Lutte relie la Rate (porte 28) à la Racine (porte 38). Il donne une poussée constante à se battre pour une vie qui a du sens. Une personne qui l’a défini peut s’attaquer à des causes difficiles, à un long entraînement ou à des gens compliqués plutôt que de choisir la facilité. La lutte vaut la peine quand elle sert un but choisi\u202f; sans lui, elle tourne à l’entêtement.",
    },
  },
  "18–58": {
    name: { en: "Judgment", fr: "Jugement" },
    what: {
      en: "The channel of Judgment links the Spleen (gate 18) to the Root (gate 58). It gives a consistent drive to see what is wrong and improve it, fuelled by a real joy in making things better. Someone with it defined is often an excellent editor, tester or coach. Offered where it was invited, the critique helps; offered everywhere, it strains relationships.",
      fr: "Le canal du Jugement relie la Rate (porte 18) à la Racine (porte 58). Il donne une poussée constante à voir ce qui ne va pas et à l’améliorer, nourrie par une vraie joie de rendre les choses meilleures. Une personne qui l’a défini est souvent excellente en relecture, en test ou en accompagnement. Là où elle a été invitée, la critique aide\u202f; distribuée partout, elle abîme les relations.",
    },
  },
  "34–57": {
    name: { en: "Power", fr: "Pouvoir" },
    what: {
      en: "The channel of Power links the Sacral (gate 34) to the Spleen (gate 57). It combines strong Sacral energy with intuition in the moment, giving quick, instinctive responses to what happens. Someone with it defined often reacts fast and well in sport, emergencies or negotiations, sensing what to do before thinking it through. The body’s timing is usually more reliable than their afterthoughts.",
      fr: "Le canal du Pouvoir relie le Sacral (porte 34) à la Rate (porte 57). Il associe une forte énergie sacrale à l’intuition de l’instant, ce qui donne des réponses rapides et instinctives aux événements. Une personne qui l’a défini réagit souvent vite et bien en sport, en urgence ou en négociation, et sent quoi faire avant d’y avoir réfléchi. Le timing du corps est en général plus fiable que les réflexions après coup.",
    },
  },
  "59–6": {
    name: { en: "Mating", fr: "Accouplement" },
    what: {
      en: "The channel of Mating, also called Intimacy, links the Sacral (gate 59) to the Solar Plexus (gate 6). It gives a consistent drive to create closeness, filtered by emotional mood. Someone with it defined often builds bonds easily, in love, friendship or teamwork, and others feel drawn in. Whether to go deeper is best decided after the emotional wave has settled.",
      fr: "Le canal de l’Accouplement, aussi appelé canal de l’Intimité, relie le Sacral (porte 59) au Plexus solaire (porte 6). Il donne une poussée constante à créer de la proximité, filtrée par l’humeur émotionnelle. Une personne qui l’a défini noue souvent des liens facilement, en amour, en amitié ou en équipe, et les autres se sentent attirés. Mieux vaut décider d’aller plus loin une fois la vague émotionnelle retombée.",
    },
  },
  "9–52": {
    name: { en: "Concentration", fr: "Concentration" },
    what: {
      en: "The channel of Concentration links the Sacral (gate 9) to the Root (gate 52). It gives consistent energy to focus on one thing and stay with it. Someone with it defined can study, build or practise for long stretches without losing the thread, which serves research, crafts and detailed work. Without something worth focusing on, the same pressure turns into restlessness.",
      fr: "Le canal de la Concentration relie le Sacral (porte 9) à la Racine (porte 52). Il donne une énergie constante pour se concentrer sur une chose et y rester. Une personne qui l’a défini peut étudier, construire ou s’exercer longtemps sans perdre le fil, ce qui sert la recherche, l’artisanat et le travail minutieux. Sans objet digne d’attention, la même pression devient de l’agitation.",
    },
  },
  "3–60": {
    name: { en: "Mutation", fr: "Mutation" },
    what: {
      en: "The channel of Mutation links the Sacral (gate 3) to the Root (gate 60). It makes a person consistently able to bring something new into form, but in pulses rather than steadily. Someone with it defined may go through flat or melancholic stretches followed by sudden creative change, in their work or their life. Accepting the quiet phases as part of the process helps.",
      fr: "Le canal de la Mutation relie le Sacral (porte 3) à la Racine (porte 60). Il permet en permanence de donner forme à quelque chose de neuf, mais par impulsions plutôt que de façon régulière. Une personne qui l’a défini traverse parfois des périodes plates ou mélancoliques suivies d’un changement créatif soudain, dans son travail ou sa vie. Accepter les phases calmes comme une partie du processus aide.",
    },
  },
  "42–53": {
    name: { en: "Maturation", fr: "Maturation" },
    what: {
      en: "The channel of Maturation links the Sacral (gate 42) to the Root (gate 53). It gives consistent energy to start a cycle and carry it through to completion, gaining experience at each stage. Someone with it defined tends to live in clear chapters — a degree, a job, a relationship — each finished before the next. Entering cycles by responding, rather than on impulse, matters.",
      fr: "Le canal de la Maturation relie le Sacral (porte 42) à la Racine (porte 53). Il donne une énergie constante pour commencer un cycle et le mener à terme, en gagnant de l’expérience à chaque étape. Une personne qui l’a défini vit souvent par chapitres nets — des études, un poste, une relation — chacun bouclé avant le suivant. Entrer dans un cycle en répondant, plutôt que sur un coup de tête, compte beaucoup.",
    },
  },
  "19–49": {
    name: { en: "Synthesis", fr: "Synthèse" },
    what: {
      en: "The channel of Synthesis links the Root (gate 19) to the Solar Plexus (gate 49). It makes a person consistently sensitive to needs and principles within relationships and groups. Someone with it defined often notices what a partner or a community needs before it is said, and has firm views on who belongs. Emotional clarity keeps their decisions about people fair.",
      fr: "Le canal de la Synthèse relie la Racine (porte 19) au Plexus solaire (porte 49). Il rend une personne constamment sensible aux besoins et aux principes au sein des relations et des groupes. Une personne qui l’a défini remarque souvent ce dont un partenaire ou une communauté a besoin avant que ce soit dit, et a des vues fermes sur qui a sa place. La clarté émotionnelle garde ses décisions sur les gens justes.",
    },
  },
  "39–55": {
    name: { en: "Emoting", fr: "Émotivité" },
    what: {
      en: "The channel of Emoting links the Root (gate 39) to the Solar Plexus (gate 55). It gives a consistent, rich emotional life with marked moods, and the ability to stir feelings in others. Someone with it defined often has creative depth — music, writing, art — that draws on those moods. Big decisions tend to go better when made over several days rather than at a peak or a low.",
      fr: "Le canal de l’Émotivité relie la Racine (porte 39) au Plexus solaire (porte 55). Il donne une vie émotionnelle riche et constante, aux humeurs marquées, et la capacité d’éveiller des sentiments chez les autres. Une personne qui l’a défini a souvent une profondeur créative — musique, écriture, art — qui puise dans ces humeurs. Les grandes décisions se prennent mieux sur plusieurs jours qu’au sommet ou au creux d’une vague.",
    },
  },
  "41–30": {
    name: { en: "Recognition", fr: "Reconnaissance" },
    what: {
      en: "The channel of Recognition links the Root (gate 41) to the Solar Plexus (gate 30). It gives consistent pressure to imagine new experiences and feel strong desire for them. Someone with it defined often has vivid plans — a move abroad, a new career — and needs to live them to learn. Letting feelings settle before committing helps separate a lasting desire from a passing fantasy.",
      fr: "Le canal de la Reconnaissance relie la Racine (porte 41) au Plexus solaire (porte 30). Il donne une pression constante à imaginer de nouvelles expériences et à les désirer fortement. Une personne qui l’a défini a souvent des projets très vivants — partir à l’étranger, changer de métier — et a besoin de les vivre pour apprendre. Laisser les sentiments se poser avant de s’engager aide à distinguer un désir durable d’un fantasme passager.",
    },
  },
};

/** 12 profiles. First number = Personality (conscious) line, second = Design (unconscious) line. */
export const HD_PROFILE_TEXT: Record<string, HdText> = {
  "1/3": {
    name: { en: "Investigator / Martyr", fr: "Investigateur / Martyr" },
    what: {
      en: "The 1/3 profile combines a conscious need to research (line 1) with an unconscious habit of learning through trial and error (line 3). The person consciously wants solid foundations and studies before acting, while their life keeps testing those foundations in practice. For example, someone who reads everything about starting a business, then learns the most from the first attempt that fails. Mistakes are part of the method, not a verdict.",
      fr: "Le profil 1/3 associe un besoin conscient d’approfondir (ligne 1) à une tendance inconsciente à apprendre par essais et erreurs (ligne 3). La personne veut consciemment des bases solides et étudie avant d’agir, tandis que sa vie ne cesse de mettre ces bases à l’épreuve. Par exemple, quelqu’un qui lit tout sur la création d’entreprise, puis apprend surtout de la première tentative qui échoue. Les erreurs font partie de la méthode, elles ne sont pas un verdict.",
    },
  },
  "1/4": {
    name: { en: "Investigator / Opportunist", fr: "Investigateur / Opportuniste" },
    what: {
      en: "The 1/4 profile combines a conscious drive to research (line 1) with an unconscious reliance on a network of close relationships (line 4). The person builds knowledge carefully, and their opportunities tend to come through people they already know. For example, a nurse who becomes the reference on a topic and is then recommended by a former colleague for a new role. Sharing knowledge within their circle is how it spreads.",
      fr: "Le profil 1/4 associe un besoin conscient d’approfondir (ligne 1) à un appui inconscient sur un réseau de relations proches (ligne 4). La personne construit son savoir avec soin, et ses occasions viennent en général de gens qu’elle connaît déjà. Par exemple, une infirmière qui devient la référence sur un sujet, puis se voit recommandée par une ancienne collègue pour un nouveau poste. C’est en partageant dans son cercle que son savoir circule.",
    },
  },
  "2/4": {
    name: { en: "Hermit / Opportunist", fr: "Ermite / Opportuniste" },
    what: {
      en: "The 2/4 profile combines a conscious need for time alone to practise natural talents (line 2) with an unconscious ability to connect through friends and acquaintances (line 4). The person often doesn’t see their own gifts, but others do and call them out. For example, someone who plays guitar alone in their room until a friend asks them to play at a wedding. Accepting the right calls, not all of them, matters.",
      fr: "Le profil 2/4 associe un besoin conscient de solitude pour cultiver des talents naturels (ligne 2) à une capacité inconsciente à se lier par les amis et connaissances (ligne 4). La personne voit rarement ses propres dons, mais les autres les voient et viennent la chercher. Par exemple, quelqu’un qui joue de la guitare seul dans sa chambre jusqu’à ce qu’un ami lui demande de jouer à un mariage. L’enjeu est d’accepter les bons appels, pas tous.",
    },
  },
  "2/5": {
    name: { en: "Hermit / Heretic", fr: "Ermite / Hérétique" },
    what: {
      en: "The 2/5 profile combines a conscious need for retreat (line 2) with an unconscious projection field (line 5): others expect practical solutions from them. The person wants to be left alone with their talents, yet strangers often call on them to fix problems. For example, a quiet programmer asked to rescue a failing project. Choosing which calls to answer protects both their privacy and their reputation.",
      fr: "Le profil 2/5 associe un besoin conscient de retrait (ligne 2) à un champ de projection inconscient (ligne 5)\u202f: les autres attendent de cette personne des solutions pratiques. Elle veut qu’on la laisse tranquille avec ses talents, mais des inconnus font souvent appel à elle pour régler un problème. Par exemple, une développeuse discrète appelée pour sauver un projet en perdition. Choisir les appels auxquels répondre protège à la fois sa tranquillité et sa réputation.",
    },
  },
  "3/5": {
    name: { en: "Martyr / Heretic", fr: "Martyr / Hérétique" },
    what: {
      en: "The 3/5 profile combines conscious trial and error (line 3) with an unconscious projection that they can fix things for others (line 5). The person learns by bumping into what doesn’t work, and others then look to them for practical answers drawn from that experience. For example, someone who has changed careers three times becomes the friend everyone asks for job advice. Their failures become their credibility.",
      fr: "Le profil 3/5 associe une démarche consciente d’essais et d’erreurs (ligne 3) à une projection inconsciente selon laquelle cette personne sait réparer les choses pour les autres (ligne 5). Elle apprend en se heurtant à ce qui ne marche pas, et les autres viennent ensuite lui demander des réponses pratiques tirées de cette expérience. Par exemple, quelqu’un qui a changé trois fois de métier devient l’ami à qui tout le monde demande conseil. Ses échecs font sa crédibilité.",
    },
  },
  "3/6": {
    name: { en: "Martyr / Role Model", fr: "Martyr / Modèle" },
    what: {
      en: "The 3/6 profile combines conscious trial and error (line 3) with an unconscious sixth-line path that, in Human Design, unfolds in three phases: experimenting, stepping back to observe, then embodying what was learned. Early life can feel eventful, with several jobs or relationships tried and left. For example, someone who later guides others through the same mistakes, with a mix of experience and perspective.",
      fr: "Le profil 3/6 associe une démarche consciente d’essais et d’erreurs (ligne 3) au parcours inconscient de la ligne 6 qui, en Human Design, se déroule en trois phases\u202f: expérimenter, prendre du recul pour observer, puis incarner ce qui a été appris. La première partie de la vie peut être mouvementée, avec plusieurs emplois ou relations essayés puis quittés. Par exemple, quelqu’un qui guide plus tard les autres à travers les mêmes erreurs, avec à la fois l’expérience et la distance.",
    },
  },
  "4/6": {
    name: { en: "Opportunist / Role Model", fr: "Opportuniste / Modèle" },
    what: {
      en: "The 4/6 profile combines a conscious focus on relationships and networks (line 4) with the unconscious three-phase path of the sixth line. The person builds a stable circle of friends and colleagues, and over time becomes someone others look to as an example. For example, a manager whose early career was full of changes, and who later becomes a trusted mentor in their field.",
      fr: "Le profil 4/6 associe une attention consciente aux relations et au réseau (ligne 4) au parcours inconscient en trois phases de la ligne 6. La personne construit un cercle stable d’amis et de collègues, et devient avec le temps quelqu’un que les autres prennent pour exemple. Par exemple, une responsable dont le début de carrière a été fait de changements, et qui devient ensuite une mentore de confiance dans son domaine.",
    },
  },
  "4/1": {
    name: { en: "Opportunist / Investigator", fr: "Opportuniste / Investigateur" },
    what: {
      en: "The 4/1 profile combines a conscious reliance on close relationships (line 4) with an unconscious need for a solid foundation (line 1). In Human Design it is the only juxtaposition profile, describing a fixed, steady path that does not bend easily. For example, someone who holds the same values and friendships for decades and influences their circle through that consistency. Forcing a change of course rarely works for them.",
      fr: "Le profil 4/1 associe un appui conscient sur les relations proches (ligne 4) à un besoin inconscient de fondations solides (ligne 1). En Human Design, c’est le seul profil de juxtaposition\u202f: il décrit une trajectoire fixe et régulière, qui plie difficilement. Par exemple, quelqu’un qui garde les mêmes valeurs et les mêmes amitiés pendant des décennies et influence son entourage par cette constance. Forcer un changement de cap lui réussit rarement.",
    },
  },
  "5/1": {
    name: { en: "Heretic / Investigator", fr: "Hérétique / Investigateur" },
    what: {
      en: "The 5/1 profile combines a conscious projection field (line 5) with an unconscious need to research (line 1). Others tend to see this person as the one who can solve their problem, and the solid knowledge underneath is what lets them deliver. For example, a consultant brought in to rescue a situation. If the solution fails, the projection can flip quickly, so a sound foundation is their protection.",
      fr: "Le profil 5/1 associe un champ de projection conscient (ligne 5) à un besoin inconscient d’approfondir (ligne 1). Les autres voient souvent cette personne comme celle qui va résoudre leur problème, et le savoir solide qu’elle a en dessous lui permet de tenir parole. Par exemple, une consultante appelée pour redresser une situation. Si la solution échoue, la projection peut vite se retourner\u202f: des bases solides sont sa protection.",
    },
  },
  "5/2": {
    name: { en: "Heretic / Hermit", fr: "Hérétique / Ermite" },
    what: {
      en: "The 5/2 profile combines a conscious projection field (line 5) with an unconscious need for retreat and natural talent (line 2). Others project practical solutions onto this person, while they would often rather be left alone. For example, someone who quietly develops a skill at home and is suddenly asked to lead a community project because of it. Selecting carefully which calls to accept keeps that balance workable.",
      fr: "Le profil 5/2 associe un champ de projection conscient (ligne 5) à un besoin inconscient de retrait et de talent naturel (ligne 2). Les autres projettent sur cette personne des solutions pratiques, alors qu’elle préférerait souvent qu’on la laisse tranquille. Par exemple, quelqu’un qui développe un savoir-faire chez lui en toute discrétion et se voit soudain demander de mener un projet associatif pour cette raison. Bien choisir les appels acceptés rend cet équilibre vivable.",
    },
  },
  "6/2": {
    name: { en: "Role Model / Hermit", fr: "Modèle / Ermite" },
    what: {
      en: "The 6/2 profile combines the conscious three-phase path of the sixth line with an unconscious hermit line full of natural talent. The person often experiments intensely when young, withdraws to observe in mid-life, then becomes an example for others. For example, someone with a gift for design who steps back from the scene for years and later returns as a respected voice.",
      fr: "Le profil 6/2 associe le parcours conscient en trois phases de la ligne 6 à une ligne d’Ermite inconsciente, riche en talents naturels. La personne expérimente souvent intensément dans sa jeunesse, se retire pour observer au milieu de sa vie, puis devient un exemple pour les autres. Par exemple, quelqu’un de doué pour le design qui s’éloigne du milieu pendant des années et y revient plus tard comme une voix respectée.",
    },
  },
  "6/3": {
    name: { en: "Role Model / Martyr", fr: "Modèle / Martyr" },
    what: {
      en: "The 6/3 profile combines the conscious three-phase path of the sixth line with unconscious trial and error (line 3). The person seeks a wise, detached perspective, yet life keeps pulling them into hands-on experiments. For example, someone who aims for a calm, balanced life but goes through several moves and relationships before settling. That mix of wisdom and bruises tends to make their advice realistic rather than idealistic.",
      fr: "Le profil 6/3 associe le parcours conscient en trois phases de la ligne 6 à une démarche inconsciente d’essais et d’erreurs (ligne 3). La personne recherche un regard sage et détaché, mais la vie la ramène sans cesse à l’expérimentation concrète. Par exemple, quelqu’un qui aspire à une vie calme et équilibrée mais traverse plusieurs déménagements et relations avant de se poser. Ce mélange de sagesse et de bleus rend ses conseils réalistes plutôt qu’idéalistes.",
    },
  },
};

/** Lines 1–6. */
export const HD_LINE_TEXT: Record<1 | 2 | 3 | 4 | 5 | 6, HdText> = {
  1: {
    name: { en: "Investigator", fr: "Investigateur" },
    what: {
      en: "Line 1 is the foundation line. It needs to understand how something works before feeling secure, so it researches, reads and checks. In practice, someone with a first-line profile often prepares thoroughly before a job interview or a move, and feels anxious when forced to act without enough information.",
      fr: "La ligne 1 est la ligne des fondations. Elle a besoin de comprendre comment une chose fonctionne pour se sentir en sécurité\u202f: elle cherche, lit, vérifie. Concrètement, une personne dont le profil comporte la ligne 1 prépare souvent à fond un entretien d’embauche ou un déménagement, et s’inquiète quand elle doit agir sans assez d’informations.",
    },
  },
  2: {
    name: { en: "Hermit", fr: "Ermite" },
    what: {
      en: "Line 2 carries natural talents that develop best in private. It wants to be left alone to do its thing, and is often called out by others who spot the talent. For example, someone who sings only at home until a friend overhears and invites them to perform.",
      fr: "La ligne 2 porte des talents naturels qui se développent mieux à l’abri des regards. Elle veut qu’on la laisse faire tranquillement, et d’autres viennent souvent la chercher après avoir repéré son talent. Par exemple, quelqu’un qui ne chante que chez lui jusqu’à ce qu’un ami l’entende et l’invite à se produire.",
    },
  },
  3: {
    name: { en: "Martyr", fr: "Martyr" },
    what: {
      en: "Line 3 learns through trial and error: it discovers what works by running into what doesn’t. The name sounds heavy, but the result is resilient, practical knowledge. Someone with a third line may try several jobs before finding the right one, and can later explain why the others failed.",
      fr: "La ligne 3 apprend par essais et erreurs\u202f: elle découvre ce qui marche en se heurtant à ce qui ne marche pas. Le nom semble lourd, mais le résultat est un savoir pratique et résistant. Une personne qui a une ligne 3 essaie parfois plusieurs métiers ou recettes avant de trouver le bon, et peut ensuite expliquer précisément pourquoi les autres ont échoué.",
    },
  },
  4: {
    name: { en: "Opportunist", fr: "Opportuniste" },
    what: {
      en: "Line 4 works through its network. Its opportunities come mainly through people it already knows, and it influences others through friendship rather than strangers. For example, someone who gets most of their jobs by recommendation and feels unsettled when a long friendship ends without a clear replacement.",
      fr: "La ligne 4 passe par son réseau. Ses occasions viennent surtout de personnes qu’elle connaît déjà, et elle influence les autres par l’amitié plutôt qu’auprès d’inconnus. Par exemple, quelqu’un qui trouve la plupart de ses emplois par recommandation et se sent désemparé quand une longue amitié se termine sans relais.",
    },
  },
  5: {
    name: { en: "Heretic", fr: "Hérétique" },
    what: {
      en: "Line 5 attracts projections: others see it as the one who can solve their problem. When it delivers a practical solution, its reputation grows; when it doesn’t, it can be blamed. For example, a new colleague expected to fix everything in their first month. Choosing which calls to answer helps.",
      fr: "La ligne 5 attire les projections\u202f: les autres y voient celle qui va résoudre leur problème. Quand elle apporte une solution pratique, sa réputation grandit\u202f; sinon, on peut le lui reprocher. Par exemple, une nouvelle recrue dont on attend qu’elle règle tout en un mois. Savoir à quels appels répondre aide beaucoup.",
    },
  },
  6: {
    name: { en: "Role Model", fr: "Modèle" },
    what: {
      en: "In Human Design, line 6 has three phases: until about 30 it experiments like a third line, until about 50 it steps back, then it embodies what it learned. For example, after an eventful youth and a quieter middle stretch, someone becomes the person others ask for grounded advice.",
      fr: "En Human Design, la ligne 6 se vit en trois phases\u202f: jusqu’à 30 ans environ, elle expérimente comme une ligne 3\u202f; jusque vers 50 ans, elle prend du recul pour observer\u202f; ensuite, elle incarne ce qu’elle a appris. Par exemple, quelqu’un qui, après une jeunesse mouvementée et un milieu de vie plus calme, devient la personne à qui l’on demande un conseil posé.",
    },
  },
};

/** Definition types: how the defined centres connect to each other. */
export const HD_DEFINITION_TEXT: Record<HdDefinition, Bi> = {
  None: {
    en: "No definition means no centre is defined: this is the Reflector design, found in roughly 1% of people. Everything is open, so the person samples and reflects the people and places around them. In practice, the same person can feel quite different in two workplaces, which makes choosing the right environment especially important.",
    fr: "L’absence de définition signifie qu’aucun centre n’est défini\u202f: c’est le design du Réflecteur, qui concerne environ 1 % des gens. Tout est ouvert, si bien que la personne capte et reflète les gens et les lieux qui l’entourent. Concrètement, elle peut se sentir très différente d’un lieu de travail à l’autre, d’où l’importance particulière de bien choisir son environnement.",
  },
  Single: {
    en: "Single definition means all defined centres are connected in one continuous flow. The person tends to process things on their own and feel self-sufficient, without needing someone else to complete their thinking. For example, they can reach a decision alone and may be puzzled when others need to talk things through first.",
    fr: "Une définition simple signifie que tous les centres définis sont reliés en un seul ensemble continu. La personne a tendance à traiter les choses seule et à se sentir autonome, sans avoir besoin d’un autre pour compléter sa réflexion. Par exemple, elle peut arriver seule à une décision et s’étonner que d’autres aient besoin d’en parler d’abord.",
  },
  Split: {
    en: "Split definition means the defined centres form two separate groups that are not connected to each other. The person often feels something is missing and is drawn to people whose gates bridge the gap. In practice, they may think most clearly after talking with a friend, a partner or a colleague; taking time before deciding also helps both parts come together.",
    fr: "Une définition scindée signifie que les centres définis forment deux groupes séparés, non reliés entre eux. La personne a souvent l’impression qu’il lui manque quelque chose et se sent attirée par ceux dont les portes font le pont. Concrètement, elle réfléchit souvent plus clairement après avoir parlé avec un ami, un partenaire ou un collègue\u202f; prendre du temps avant de décider aide aussi les deux parties à se rejoindre.",
  },
  "Triple split": {
    en: "Triple split definition means the defined centres form three separate groups. The person usually needs variety in their contacts, because different people connect different parts. For example, they may think best in public places such as cafés or open offices, and decide better after some time moving between people rather than under pressure.",
    fr: "Une triple définition signifie que les centres définis forment trois groupes séparés. La personne a en général besoin de variété dans ses contacts, parce que des personnes différentes relient des parties différentes. Par exemple, elle réfléchit souvent mieux dans des lieux publics comme les cafés ou les espaces ouverts, et décide mieux après avoir circulé parmi les gens que sous la pression.",
  },
  "Quadruple split": {
    en: "Quadruple split definition, which is rare, means the defined centres form four separate groups. The person tends to be fixed in their own way of working and needs a lot of time and many different contacts before things come together. In practice, rushing a decision rarely works for them; letting it mature over time usually does.",
    fr: "Une quadruple définition, rare, signifie que les centres définis forment quatre groupes séparés. La personne a tendance à tenir à sa propre façon de fonctionner et a besoin de beaucoup de temps et de contacts variés avant que tout se rassemble. Concrètement, précipiter une décision lui réussit rarement\u202f; la laisser mûrir, en général, si.",
  },
};

/** Short intro texts. */
export const HD_ABOUT: {
  system: Bi;
  gate: Bi;
  channel: Bi;
  profile: Bi;
  definition: Bi;
  personalityDesign: Bi;
} = {
  system: {
    en: "Human Design is a system created by Ra Uru Hu in 1987 that combines astrology, the I Ching, the Kabbalah Tree of Life and the chakras. It uses the planets' positions at birth and about 88° of solar arc before birth — roughly three months — to draw a bodygraph of nine centres. In Human Design, that chart describes how a person is built to make decisions and use their energy; it is a framework for self-observation, not a scientific finding.",
    fr: "Le Human Design est un système créé par Ra Uru Hu en 1987, qui combine astrologie, Yi King, Arbre de vie de la Kabbale et chakras. Il s’appuie sur la position des planètes à la naissance et environ 88° d’arc solaire avant la naissance — trois mois à peu près — pour tracer un schéma corporel à neuf centres. En Human Design, ce schéma décrit la façon dont une personne est faite pour décider et utiliser son énergie\u202f; c’est un cadre d’observation de soi, pas un résultat scientifique.",
  },
  gate: {
    en: "A gate is one of the 64 hexagrams of the I Ching, placed around the zodiac so that each covers about 5.6° of the ecliptic. Each gate belongs to one centre, and a planet in that section at birth or in the Design period activates it. An activated gate is a theme you carry consistently, even when the gate across from it is not active.",
    fr: "Une porte est l’un des 64 hexagrammes du Yi King, répartis autour du zodiaque de sorte que chacun couvre environ 5,6° de l’écliptique. Chaque porte appartient à un centre, et une planète située dans ce secteur à la naissance ou pendant la période du Design l’active. Une porte activée est un thème que vous portez de façon constante, même quand la porte qui lui fait face n’est pas active.",
  },
  channel: {
    en: "A channel joins two gates in two different centres. When both gates are activated, the channel is defined and both centres become defined too. In Human Design, a defined channel is an always-on trait, a consistent way of functioning that others can rely on.",
    fr: "Un canal relie deux portes situées dans deux centres différents. Quand les deux portes sont activées, le canal est défini et les deux centres le deviennent aussi. En Human Design, un canal défini est un trait toujours actif, une façon de fonctionner constante sur laquelle les autres peuvent compter.",
  },
  profile: {
    en: "The profile combines two lines: the line of the Personality Sun (conscious) and the line of the Design Sun (unconscious); the Earth always shares the Sun’s line. There are 12 profiles, from 1/3 to 6/3. They describe the role a person tends to play and how they learn and relate to others.",
    fr: "Le profil associe deux lignes\u202f: celle du Soleil de la Personnalité (conscient) et celle du Soleil du Design (inconscient)\u202f; la Terre partage toujours la ligne du Soleil. Il existe 12 profils, de 1/3 à 6/3. Ils décrivent le rôle qu’une personne a tendance à jouer, sa façon d’apprendre et d’entrer en relation.",
  },
  definition: {
    en: "Definition describes how the defined centres connect to each other through channels. They can form one continuous group (single), two or more separate groups (split, triple split, quadruple split), or there can be none at all. It shows whether someone tends to feel whole on their own or finds that certain people help their parts connect.",
    fr: "La définition décrit la façon dont les centres définis sont reliés entre eux par des canaux. Ils peuvent former un seul ensemble continu (définition simple), deux groupes séparés ou plus (scindée, triple, quadruple), ou il peut n’y en avoir aucun. Elle indique si une personne tend à se sentir complète seule, ou si certaines personnes l’aident à relier ses différentes parties.",
  },
  personalityDesign: {
    en: "Each chart has two layers. The Personality, shown in black, uses the planets at the moment of birth and describes what you are conscious of in yourself. The Design, shown in red, uses the planets when the Sun was about 88° earlier — roughly three months before birth — and describes traits others often see in you more clearly than you do.",
    fr: "Chaque schéma comporte deux couches. La Personnalité, en noir, utilise les planètes au moment de la naissance et décrit ce dont vous avez conscience en vous. Le Design, en rouge, utilise les planètes quand le Soleil se trouvait environ 88° plus tôt — trois mois avant la naissance à peu près — et décrit des traits que les autres voient souvent en vous plus clairement que vous-même.",
  },
};
