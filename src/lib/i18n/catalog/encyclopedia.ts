/**
 * encyclopedia: [English, French]. The encyclopedia's own words (src/encyclopedia):
 * its pages, its search, the short card and the link setting. The names of the
 * traditions and families come with its data (scripts/encyclopedia/registry.mjs).
 *
 * Read by src/encyclopedia/words.ts, not spread into this folder's index:
 * everything that says them is downloaded when used, so they stay out of every
 * page's first download (about 1 KB). scripts/encyclopedia.test.mjs checks
 * them as i18n-catalog.test.mjs checks the others.
 */
export const encyclopedia = {
  encTitle: ["Encyclopedia", "Encyclopédie"],
  encLead: ["Every word of Ulune’s traditions, explained.", "Chaque mot des traditions d’Ulune, expliqué."],
  encSearch: ["Search the encyclopedia", "Chercher dans l’encyclopédie"],
  encSearchHint: ["A name, a glyph or a few words, in English or French.", "Un nom, un glyphe ou quelques mots, en français ou en anglais."],
  encSearchGo: ["Search", "Chercher"],
  encSearchNone: ["Nothing found for “{q}”.", "Rien trouvé pour «\u202f{q}\u202f»."],
  encSearchOne: ["1 result", "1 résultat"],
  encSearchMany: ["{n} results", "{n} résultats"],
  encTraditions: ["Traditions", "Traditions"],
  encEntries: ["{n} entries", "{n} entrées"],
  encAZ: ["A to Z", "De A à Z"],
  encLetters: ["Letters", "Lettres"],
  encBreadcrumb: ["Where you are", "Vous êtes ici"],
  encRelated: ["Related", "Voir aussi"],
  encSources: ["Sources", "Sources"],
  encRevised: ["Last revised on {date}.", "Dernière révision le {date}."],
  encReport: ["Report an error", "Signaler une erreur"],
  encReportSubject: ["Ulune {version}: “{title}” in the encyclopedia", "Ulune {version}\u202f: «\u202f{title}\u202f» dans l’encyclopédie"],
  // The link to the same page in the other language, written in that language.
  encTwin: ["En français", "In English"],
  encFamilyNav: ["In this family", "Dans cette famille"],
  encPrev: ["Previous", "Précédent"],
  encNext: ["Next", "Suivant"],
  encLicence: ["Text under {licence}: share it with credit, not for profit.", "Texte sous licence {licence}\u202f: à partager en citant la source, sans usage commercial."],
  encReadFull: ["Read the full page", "Lire la page entière"],
  encClose: ["Close", "Fermer"],
  encLinks: ["Links to the encyclopedia", "Liens vers l’encyclopédie"],
  encLinksLead: ["How words with an entry are marked. They are links in every case.", "Le marquage des mots qui ont une entrée. Ce sont des liens dans tous les cas."],
  encLinksSubtle: ["Subtle", "Discrets"],
  encLinksSubtleHint: ["A fine dotted underline", "Un fin pointillé"],
  encLinksUnderline: ["Clearly underlined", "Bien soulignés"],
  encLinksUnderlineHint: ["A solid underline", "Un trait plein"],
  encLinksNone: ["No mark", "Sans marque"],
  encLinksNoneHint: ["Underlined only on pointing or focus", "Soulignés seulement au survol ou au clavier"],
  encLinksSample: ["For example: Mercury turns {word} three or four times a year.", "Par exemple\u202f: Mercure devient {word} trois ou quatre fois par an."],
  encLinksWord: ["retrograde", "rétrograde"],
} as const satisfies Record<string, readonly [string, string]>;
