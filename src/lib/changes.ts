/*
 * What's new: the versions of Ulune and what each one brought, in English and
 * French, rendered like the legal pages (components/legal-page.tsx). When a
 * version ships, add it at the top, set APP_VERSION (lib/app-identity.ts) and
 * change the date.
 */
import type { LegalText } from "@/lib/legal/pages";

export const CHANGES_UPDATED = "2026-10-02";

export const CHANGES: Record<"en" | "fr", LegalText> = {
  en: {
    title: "What’s new",
    updated: "Updated {date}",
    blocks: [
      {
        h: "Ulune 1.0.2",
        p: "The chart’s look, and motion throughout:",
        list: [
          "A choice in Look for the planets’ colours: plain, by element as before, or their traditional colours, now the default.",
          "Bigger planet glyphs, and each degree written along its planet’s line, in the size and style of the axes’ degrees; retrograde marked beside the glyph.",
          "The aspect glyphs in the strip under the chart are twice as big on a computer.",
          "Every press, switch and page change moves softly and quickly: presses that let go gently, switches whose colour follows the sliding pill, menus and the search that close with a fade, pages and modes that cross-fade, the side panel that slides on a computer.",
          "A chart builds itself the first time you see it in a visit and simply settles in after that; Human Design builds its bodygraph too, centre by centre.",
          "No hover highlight left behind after a tap on a phone.",
          "Richer colours on screens that can show more than the usual range, as on iPhones and recent Macs.",
          "The planet glyphs stand bare on the chart, each on a thin margin of the chart’s own colour in its shape so the lines under it stop just short, and the one you point at or choose glows in its own colour; in a stellium they sit a pixel or two apart, and their degrees start below the brackets that join conjunctions. The aspect glyphs on the lines stand bare too, the lines parting around their shapes, and the conjunction has its traditional mark.",
          "Clean, bright planet colours on the light theme, instead of dark and muddy ones.",
          "Aspect lines end in smooth points, with no stepped or lighter patches where they meet a planet, dimmed or not; thinner lines on phones.",
          "Switching quickly between charts no longer makes them flash or play their entrance twice.",
          "The calendar stays on today: the year view and back, or the arrows, no longer send it to 1 January.",
          "A precise arrow over the chart instead of an open hand, with the pointing hand over anything you can choose; the closed hand shows only while you drag a zoomed chart.",
          "On transits, progressions and a partner’s chart, the outer planets are as big as your own, a little closer to the wheel, and their degrees are in each planet’s colour, with the retrograde mark on a phone too.",
          "New time controls for transits and progressions, as in the desktop programs: a step from a minute to a year, ‹ › to take one (Shift for ten, or the arrow keys), play forward or backward, and a tape of dates to drag, flick or scroll that moves by whole steps; a month on keeps the day, a day on keeps the time, and transits go anywhere from 1800 to 2399.",
          "Switching pages no longer flashes dark or freezes for a moment: the bar answers the press at once and the page eases in.",
          "Synastry, transits and progressions open on the aspects between the two charts (each page keeps its own choice); with one person only, synastry asks for the second.",
          "Fixes: a coloured Human Design channel opens its own reading; 3D turns off with a second press; the calendar file and the table's Copy and CSV wait until the period has loaded; a void of course ending on another day says which; the calendar's UTC offset is the period's; on a phone the day and year views open at their top; a composite keeps Mercury and Venus beside its Sun and shows no motion or dignity of its own; the first-time hint no longer covers the chart.",
          "On the chart: an orb of its own for each aspect, with two degrees more for the Sun and the Moon if you like; anything you pick that the chart's filters hide says why, with one press to show it; a planet's reading lists its aspects on the wheel first and the others under their own heading, without angle-to-angle repeats, major ones first, each saying whether it is applying or separating.",
          "The search finds planets with their sign, degree and house, aspects, signs, houses, chart presets, 3D and the glossary's words.",
          "The birth form says everything that is missing at once, each under its field; the date and time show how to write them.",
          "Images of the chart can carry the name and birth details in a band below, if you tick it (off by default); dates are written day/month/year everywhere.",
          "Smaller things: the aspect grid beside the chart lists every planet shown; tab rows that do not fit fade at the edge to say there is more; Look opens on its first page; French names of the true node and true Lilith.",
          "Readings: a transit's card starts with what it means for you (the textbook part moves to About), is named as it is felt, “Venus sextile your Uranus”, and says when it is exact and about when it is within a degree; the closest transits give the sign and the exact moment. On a phone, anything you tap on a chart, the bodygraph or the numerology wheel shows the same card in the closed sheet, with Read, and covers nothing.",
          "The systems point at each other: a planet's reading gives its Human Design gate and opens it there; a Personality activation gives the planet's place in your chart; the personal year opens that year in the Calendar.",
          "Tables: every aspects table sorts by orb, by either side's body or by aspect, and keeps to within 1° or 3° if you like; each part has its own CSV of what it shows (one table, one header, the aspects with the same columns everywhere), ready for Excel (accents and degree signs intact, “;” and decimal commas in French); Copy puts a real table on the clipboard beside the text, which pastes as a table in Sheets, Excel or Docs; the grids get a Copy too, and their symbols take each aspect's colour.",
          "On a phone, tables show more at once: explanations wait behind an ⓘ, the chart's facts take one line each, aspect and calendar rows are about half as tall, and the grids show the symbols alone in cells big enough to tap. The midpoints list all 78 of the planets, the node and the two angles, in zodiac order, with a choice of body; the calendar says where both planets stand in an aspect between them.",
        ],
      },
      {
        h: "Ulune 1.0.1",
        p: "On phones:",
        list: [
          "A birth time always reaches the chart: the form no longer jumps to the next field by itself on a touch screen (the keyboard could stay behind, and the time was lost), what is typed while the page is still starting is kept, and a form with no time and “I don’t know the time” unticked asks for one instead of casting for an unknown time.",
          "Tapping the chart no longer opens its reading over it: the chart stays whole, the Reading tab takes the name of what you chose, and you open the reading when you want it.",
          "The panel slides up and down smoothly, and the chart above it grows and shrinks with it instead of jumping; a flick carries the panel on.",
          "The 3D view tips in from the flat chart, with no jump at the start.",
          "Thinner aspect lines on a small chart.",
        ],
      },
      {
        h: "Ulune 1.0",
        p: "The first public version:",
        list: [
          "Your birth chart as a wheel or a table, flat or in 3D, with a reading for each planet, point, house, sign and aspect.",
          "Each chart’s table on one page: positions to the second, houses and their rulers, aspects with the orb they are allowed, dignities, patterns, fixed stars and midpoints; the tables of transits, progressions, synastry, the composite and Human Design the same way; each to copy as text or as CSV.",
          "Transits with a time slider; a calendar of the sky day by day (the Moon’s phases and signs, eclipses, retrograde planets, void-of-course hours) with your transits, found on your device, and a calendar file; secondary progressions.",
          "Synastry and the composite chart of two people.",
          "Human Design with its bodygraph and a guided first read. Numerology as Hans Decoz teaches it: the numbers of the birth date and of the full name at birth on a wheel of nine, a table of every number, the cycles of a life, your personal year, month and day in the calendar, and a reading for each.",
          "Positions from the Swiss Ephemeris; birth times read with each place’s full time-zone history; ten house systems.",
          "No account, and nothing kept on the server; to keep charts, a private space on your device, encrypted.",
          "English and French; a guide, a one-minute tour and a glossary; each chart’s tables by keyboard and screen reader.",
        ],
      },
    ],
  },
  fr: {
    title: "Nouveautés",
    updated: "Mis à jour le {date}",
    blocks: [
      {
        h: "Ulune 1.0.2",
        p: "L’allure du thème, et le mouvement partout\u202f:",
        list: [
          "Un choix dans Style pour la couleur des planètes\u202f: unies, par élément comme avant, ou leurs couleurs traditionnelles, désormais par défaut.",
          "Des glyphes de planètes plus grands, et chaque degré écrit le long de la ligne de sa planète, à la taille et dans le style des degrés des axes\u202f; la rétrogradation marquée à côté du glyphe.",
          "Les glyphes d’aspect de la bande sous le thème sont deux fois plus grands sur ordinateur.",
          "Chaque pression, chaque bascule et chaque changement de page bouge avec douceur et vivacité\u202f: des pressions qui relâchent en souplesse, des bascules dont la couleur suit la pastille qui glisse, des menus et la recherche qui se ferment en fondu, des pages et des modes en fondu enchaîné, le panneau latéral qui glisse sur ordinateur.",
          "Un thème se construit la première fois que vous le voyez dans une visite, puis il apparaît simplement\u202f; le Human Design construit aussi son bodygraph, centre après centre.",
          "Plus de survol qui reste allumé après un toucher sur téléphone.",
          "Des couleurs plus riches sur les écrans capables d’en montrer davantage, comme ceux des iPhone et des Mac récents.",
          "Les glyphes des planètes se tiennent seuls sur le thème, chacun sur une fine marge de la couleur du thème qui suit sa forme, pour que les lignes en dessous s’arrêtent juste avant, et celui que vous désignez ou choisissez rayonne de sa propre couleur\u202f; dans un stellium ils se serrent à un ou deux pixels, et leurs degrés commencent sous les crochets qui relient les conjonctions. Les glyphes d’aspect sur les lignes se tiennent seuls aussi, les lignes s’écartant autour de leur forme, et la conjonction a son signe traditionnel.",
          "Des couleurs de planètes nettes et claires sur le thème clair, au lieu de teintes sombres et ternes.",
          "Les lignes d’aspect finissent en pointes lisses, sans marches ni taches plus claires là où elles rejoignent une planète, estompées ou non\u202f; des lignes plus fines sur téléphone.",
          "Passer vite d’un thème à l’autre ne les fait plus clignoter ni rejouer leur entrée.",
          "Le calendrier reste sur aujourd’hui\u202f: la vue de l’année puis le retour, ou les flèches, ne le renvoient plus au 1er janvier.",
          "Une flèche précise sur le thème au lieu d’une main ouverte, et la main qui pointe sur tout ce que vous pouvez choisir\u202f; la main fermée n’apparaît que lorsque vous faites glisser un thème agrandi.",
          "En transits, en progressions et avec le thème d’un partenaire, les planètes extérieures sont aussi grandes que les vôtres, un peu plus près de la roue, et leurs degrés ont la couleur de chaque planète, avec la marque de rétrogradation sur téléphone aussi.",
          "De nouvelles commandes du temps pour les transits et les progressions, comme dans les logiciels de bureau\u202f: un pas d’une minute à un an, ‹ › pour en faire un (Maj pour dix, ou les flèches du clavier), la lecture en avant ou en arrière, et une règle de dates à faire glisser, lancer ou défiler qui avance de pas entiers\u202f; un mois plus tard garde le jour, un jour plus tard garde l’heure, et les transits vont de 1800 à 2399.",
          "Changer de page ne fait plus d’éclair sombre ni de pause\u202f: la barre répond à l’instant et la page apparaît en douceur.",
          "La synastrie, les transits et les progressions s’ouvrent sur les aspects entre les deux thèmes (chaque page garde son choix)\u202f; avec une seule personne, la synastrie demande la seconde.",
          "Corrections\u202f: un canal coloré du Human Design ouvre sa propre lecture\u202f; la 3D se coupe d’un second appui\u202f; le fichier agenda, la copie et le CSV du tableau attendent que la période soit chargée\u202f; une Lune vide de course qui finit un autre jour dit lequel\u202f; le décalage UTC du calendrier est celui de la période\u202f; sur téléphone, les vues jour et année s’ouvrent en haut\u202f; un composite garde Mercure et Vénus près de son Soleil et n’affiche ni mouvement ni dignité propres\u202f; l’astuce de départ ne cache plus le thème.",
          "Sur le thème : un orbe propre à chaque aspect, avec deux degrés de plus pour le Soleil et la Lune si vous le souhaitez ; ce que vous choisissez et que les filtres du thème cachent dit pourquoi, avec un appui pour le montrer ; la lecture d’une planète donne d’abord ses aspects tracés sur la roue, puis les autres sous leur propre titre, sans doublons d’axe, les majeurs d’abord, chacun applicatif ou séparatif.",
          "La recherche trouve les planètes avec leur signe, leur degré et leur maison, les aspects, les signes, les maisons, les préréglages, la 3D et les mots du glossaire.",
          "Le formulaire de naissance dit tout ce qui manque d’un coup, sous chaque champ ; la date et l’heure montrent comment les écrire.",
          "Les images du thème peuvent porter le nom et les données de naissance dans un bandeau, si vous cochez la case (décochée par défaut) ; les dates s’écrivent jour/mois/année partout.",
          "Plus discret : la grille d’aspects à côté du thème liste toutes les planètes affichées ; les rangées d’onglets trop longues s’estompent au bord pour dire qu’il y en a d’autres ; Style s’ouvre sur sa première page ; les noms français du nœud vrai et de la Lilith vraie.",
          "Lectures : la carte d’un transit commence par ce qu’il signifie pour vous (la partie de manuel passe dans À propos), se nomme comme il se vit, « Vénus en sextile à votre Uranus », et dit quand il est exact et à peu près quand il est à moins d’un degré ; les transits les plus serrés donnent le signe et le moment exact. Sur téléphone, ce que vous touchez sur un thème, le bodygraph ou la roue de numérologie montre la même carte dans le panneau fermé, avec Lire, sans rien cacher.",
          "Les systèmes se répondent : la lecture d’une planète donne sa porte du Human Design et l’y ouvre ; une activation de la Personnalité donne la place de la planète dans votre thème ; l’année personnelle ouvre cette année dans le Calendrier.",
          "Tableaux : chaque tableau d’aspects se trie par orbe, par le corps de l’un ou l’autre côté ou par aspect, et peut se limiter à 1° ou 3° ; chaque partie a son propre CSV de ce qu’elle montre (un tableau, une ligne d’en-tête, les aspects avec les mêmes colonnes partout), prêt pour Excel (accents et signes de degré intacts, « ; » et virgule décimale en français) ; Copier met un vrai tableau dans le presse-papiers à côté du texte, qui se colle en tableau dans Sheets, Excel ou Docs ; les grilles ont aussi leur Copier, et leurs symboles prennent la couleur de chaque aspect.",
          "Sur téléphone, les tableaux en montrent plus d’un coup : les explications attendent derrière un ⓘ, les données du thème tiennent sur une ligne chacune, les lignes d’aspects et du calendrier sont environ deux fois moins hautes, et les grilles montrent les symboles seuls dans des cases assez grandes pour le doigt. Les mi-points listent les 78 des planètes, du nœud et des deux angles, dans l’ordre du zodiaque, avec un choix de corps ; le calendrier dit où se trouvent les deux planètes d’un aspect entre elles.",
        ],
      },
      {
        h: "Ulune 1.0.1",
        p: "Sur téléphone\u202f:",
        list: [
          "L’heure de naissance arrive toujours jusqu’au thème\u202f: sur un écran tactile, le formulaire ne passe plus seul au champ suivant (le clavier pouvait rester en arrière, et l’heure se perdait), ce qui est tapé pendant que la page démarre est gardé, et un formulaire sans heure, «\u202fJe ne connais pas l’heure\u202f» non coché, la demande au lieu de calculer pour une heure inconnue.",
          "Toucher le thème n’ouvre plus sa lecture par-dessus\u202f: le thème reste entier, l’onglet Lecture prend le nom de ce que vous avez choisi, et vous ouvrez la lecture quand vous le voulez.",
          "Le panneau monte et descend en douceur, et le thème au-dessus grandit et rapetisse avec lui au lieu de sauter\u202f; un geste rapide emporte le panneau.",
          "La vue 3D s’incline depuis le thème à plat, sans saut au départ.",
          "Des lignes d’aspect plus fines sur un petit thème.",
        ],
      },
      {
        h: "Ulune 1.0",
        p: "La première version publique\u202f:",
        list: [
          "Votre thème natal en roue ou en tableau, à plat ou en 3D, avec une lecture pour chaque planète, point, maison, signe et aspect.",
          "Le tableau de chaque thème sur une seule page\u202f: les positions à la seconde, les maisons et leurs maîtres, les aspects avec l’orbe permis, les dignités, les figures, les étoiles fixes et les mi-points\u202f; de même les tableaux des transits, des progressions, de la synastrie, du composite et du Human Design\u202f; chacun à copier en texte ou en CSV.",
          "Les transits avec un curseur de temps\u202f; un calendrier du ciel jour après jour (les phases et les signes de la Lune, les éclipses, les planètes rétrogrades, les heures de Lune vide de course) avec vos transits, calculés sur votre appareil, et un fichier agenda\u202f; les progressions secondaires.",
          "La synastrie et le thème composite de deux personnes.",
          "Le Human Design avec son bodygraph et une première lecture guidée. La numérologie telle que l’enseigne Hans Decoz\u202f: les nombres de la date de naissance et du nom complet de naissance sur une roue de neuf, un tableau de tous les nombres, les cycles d’une vie, votre année, votre mois et votre jour personnels dans le calendrier, et une lecture pour chacun.",
          "Des positions de la Swiss Ephemeris\u202f; les heures de naissance lues avec tout l’historique du fuseau de chaque lieu\u202f; dix systèmes de maisons.",
          "Pas de compte, et rien de gardé sur le serveur\u202f; pour garder des thèmes, un espace privé sur votre appareil, chiffré.",
          "En anglais et en français\u202f; un guide, une visite d’une minute et un lexique\u202f; les tableaux de chaque thème au clavier et au lecteur d’écran.",
        ],
      },
    ],
  },
};
