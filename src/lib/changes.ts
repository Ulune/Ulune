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
