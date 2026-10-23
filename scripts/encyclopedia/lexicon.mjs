/*
 * The words a reading's running text may link (encyclopedia plan, part 16:
 * "unmarked text is linked at build time … ambiguous words are never
 * auto-linked"). Built here from the entries' own names, once per language
 * and tradition, so the browser only matches a short, reviewed list:
 *
 *   - an entry's title (the part before " · " for "Gate 41 · Contraction",
 *     without a bracket: "Lune noire (Lilith)" gives "Lune noire");
 *   - its aliases only in the families whose aliases are names, not
 *     everyday phrases (a house's "10th house", a centre's "Sacral", a
 *     numerology position's "Expression"…);
 *   - never a single word with an everyday meaning (GENERIC: "House",
 *     "Line", "Type", "Fall", "Face", "Exact"…), never a number or a glyph;
 *   - case kept: a single word links only as written ("Mars" the planet,
 *     not French "mars" the month); a name of two words or more also links
 *     with a small first letter ("tenth house", "grand trine"), unless it
 *     then reads as an everyday phrase (NO_LOWER: "a whole sign"; AS_WRITTEN:
 *     the solar terms, "grand froid", "début du printemps").
 *
 * A tradition's list holds its own entries; Human Design's also holds the
 * planets and the signs, which its gate and activation texts name; "all"
 * holds every tradition's, for the guide. The Chinese languages (part 23)
 * each hold the shared Chinese foundations (the phases, stems, branches,
 * pillars, solar terms, relations, trigrams and their ideas) and what they
 * name of each other: BaZi and Feng Shui the zodiac's animals, the zodiac
 * BaZi's pillars. Every tradition holds the shared ideas (yin and yang).
 * The phases' single names (Wood, Fire…) are everyday words in both
 * languages: they link in the tables, which know their term, and where a
 * writer marks them, never by themselves in running text; so do the stems'
 * and branches' own syllables (Jia, Zi, Yin, You), which other Chinese
 * words and English share (part 23's second batch). A Chinese term's name
 * that holds another entry's (the star "Travelling Horse", the animal
 * "Horse") is matched first, and links its own page or nothing (part 24).
 * scripts/encyclopedia/link-review.mjs runs the list over every text Ulune
 * has and prints what it would link, for review.
 */

/** Single words never linked by themselves, in either case (a writer may still mark them). */
export const GENERIC = {
  en: new Set(
    `House Houses Sign Signs Aspect Aspects Orb Orbs Station Fall Face Faces Term Terms Bound Bounds Exact Lot Lots Ruler
    Rulership Reception Equal Season Sect Composite Latitude Type Types Strategy Authority Profile Profiles Definition Variable
    Arrows Gate Gates Line Lines Channel Channels Centres Centers Cross Signature Conscious Unconscious Activation Bridge
    Challenge Essence Balance Attitude Planes Fire Earth Air Water Fixed Cardinal Mutable Destiny Window Transit Transits Determination Environment Perspective Motivation
    Wood Metal`
      .split(/\s+/)
      .filter(Boolean),
  ),
  fr: new Set(
    `Maison Maisons Signe Signes Aspect Aspects Orbe Orbes Station Chute Face Faces Terme Termes Exact Lot Lots Maître
    Maîtrise Réception Saison Secte Composite Latitude Type Types Stratégie Autorité Profil Profils Définition Variable
    Flèches Porte Portes Ligne Lignes Canal Canaux Centres Croix Signature Conscient Inconscient Activation Pont Défi Défis
    Essence Équilibre Attitude Plans Feu Terre Air Eau Fixe Cardinal Mutable Destinée Fenêtre Transit Transits Réalisation Détermination Environnement Perspective Motivation
    Bois Métal`
      .split(/\s+/)
      .filter(Boolean),
  ),
};

/** Names of two words that also read as an everyday phrase in small letters: linked only as written ("a whole sign", "votre jour de naissance"). */
const NO_LOWER = new Set(["Whole sign", "Equal houses", "Jour de naissance", "Day chart", "Night chart"]);

/** Families whose aliases are names a text uses (only these aliases are linked). */
const ALIAS_FAMILIES = new Set([
  "astrology/points",
  "astrology/houses",
  "human-design/types",
  "human-design/centres",
  "numerology/positions",
  "numerology/cycles",
  // The solar terms' own names, which the readings use ("at Lichun"), and their other English names (part 23's third batch).
  "chinese/solar-terms",
  // The sixty-cycle by the names BaZi's readings give it ("a step of the sixty-cycle", « du cycle de soixante »), part 25.
  "chinese/pillars",
  // The Eight Mansions by the names Feng Shui's readings give them ("your Growth direction", « votre Stabilité »), part 26;
  // Yan Nian's "Harmony" is also BaZi's relation, so in Feng Shui's texts it stays plain (a form two entries share).
  "feng-shui/mansions",
]);

/**
 * Entries whose names are names only with their capital: a solar term's ("Grand froid", "Rosée blanche",
 * "Début du printemps") reads in small letters as an everyday phrase, so it links only as written; the
 * family's own entry ("solar terms", "termes solaires") still links in small letters. So does a period of
 * Feng Shui's ("Period 9", « Période 9 »): in small letters « l’étoile de la période 1 » is a palace's
 * period star, not Period 1 (part 26).
 */
const AS_WRITTEN = /^solar-term-|^period-\d$/;

/**
 * The families whose entries go by one syllable of pinyin (Jia, Zi, Yin, You): a syllable other Chinese
 * words share (yin and yang, Wu Gui, Fu Wei, Huo Hai, Shen Sha) and English too ("You"). Like the phases'
 * everyday names, they link in the tables, which know their term, and where a writer marks them, never by
 * themselves in running text (encyclopedia part 23, the writers' guide, section 8).
 */
const SYLLABLE_FAMILIES = new Set(["chinese/stems", "chinese/branches"]);

/** The lexicons whose texts name Chinese terms: their terms' longer names are matched first (`buildLexicon`, `terms`). */
const CHINESE_LEXICONS = new Set(["chinese", "chinese-astrology", "bazi", "feng-shui"]);

/** Whether a name holds a form as a whole word, as the linker matches it (src/encyclopedia/linker.ts). */
const holds = (name, form) =>
  new RegExp(`(?<![\\p{L}\\p{N}-])${form.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}-])`, "u").test(name);

/** The shared Chinese foundations (part 23, registry: chinese.mjs), and the ideas every tradition shares. */
const CHINESE_FOUNDATIONS = ["phases", "stems", "branches", "pillars", "na-yin", "solar-terms", "relations", "trigrams", "ideas"].map((f) => `chinese/${f}`);
const SHARED = ["shared/ideas"];

/** The families of other traditions each tradition's texts also name (Human Design's gates name planets and signs). */
export const BORROWED = {
  astrology: SHARED,
  "human-design": ["astrology/planets", "astrology/signs", ...SHARED],
  numerology: SHARED,
  chinese: ["chinese-astrology/animals", ...SHARED],
  "chinese-astrology": [...CHINESE_FOUNDATIONS, "bazi/ideas", ...SHARED],
  bazi: [...CHINESE_FOUNDATIONS, "chinese-astrology/animals", "chinese-astrology/ideas", ...SHARED],
  "feng-shui": [...CHINESE_FOUNDATIONS, "chinese-astrology/animals", ...SHARED],
};

const clean = (form) =>
  form
    .split(" · ")[0]
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim();

/** A form worth matching: a name of letters, three characters or more, not an everyday word. */
function keep(form, lang) {
  if ([...form].length < 3 || !/\p{L}{2}/u.test(form)) return false;
  if (/^[\d\s/.–-]+$/.test(form)) return false;
  const words = form.split(/\s+/);
  if (words.length === 1 && GENERIC[lang].has(form)) return false;
  return true;
}

/**
 * `{ [tradition]: [form, id, slug][] }` for a language, the longest forms
 * first (so "Manifesting Generator" wins over "Generator"). Only entries
 * with a page are linked. `traditions`: the lists to make (every tradition
 * of the registry, so a language with no entry of its own yet still links
 * what it borrows); by default those with an entry.
 *
 * `terms`: the Chinese manifest's terms, written or not (part 24). A name
 * of one of them (title or alias) that holds another entry's form, as the
 * star "Travelling Horse" holds the animal "Horse", joins the Chinese
 * lexicons as a longer form, matched first: it links its own entry once that
 * is written, with a page, in a family the lexicon holds, and until then it
 * is a row without an id, which the linker leaves as plain words, so the
 * word inside never leads to the wrong page.
 */
export function buildLexicon(entries, lang, traditions = [...new Set(entries.map((e) => e.tradition))], terms = []) {
  const byId = new Map(entries.map((e) => [e.id, e]));
  const forms = (e) => {
    const m = e[lang].meta;
    // A stem's or a branch's own syllable stays plain in running text (the family's own entry, "Heavenly Stems", links).
    if (SYLLABLE_FAMILIES.has(`${e.tradition}/${e.family}`) && !/\s/.test(clean(m.title))) return [];
    const out = [clean(m.title)];
    if (ALIAS_FAMILIES.has(`${e.tradition}/${e.family}`)) {
      for (const a of m.aliases ?? []) {
        // A house by its number only ("10th house", "maison 10"), not "house of money".
        if (e.family === "houses" && !/\d/.test(a)) continue;
        out.push(clean(a));
      }
    }
    return out.filter((f) => keep(f, lang));
  };
  const lexicon = {};
  // "all": every tradition at once, for the guide (a name two traditions share stays plain).
  for (const t of [...traditions, "all"]) {
    const own = entries.filter(
      (e) =>
        e.page &&
        e.kind !== "combination" &&
        (t === "all" || e.tradition === t || (BORROWED[t] ?? []).includes(`${e.tradition}/${e.family}`)),
    );
    const seen = new Map();
    for (const e of own) {
      for (const f of forms(e)) {
        // A form two entries share is no one's: it stays plain.
        if (seen.has(f) && seen.get(f)[1] !== e.id) seen.set(f, null);
        else if (!seen.has(f)) seen.set(f, [f, e.id, e[lang].meta.slug]);
      }
    }
    // A name of two words or more also links with a small first letter ("tenth house", "grand trine").
    for (const row of [...seen.values()].filter(Boolean)) {
      const [f] = row;
      if (!/\s/.test(f) || !/^\p{Lu}/u.test(f) || NO_LOWER.has(f) || AS_WRITTEN.test(row[1])) continue;
      const low = f.charAt(0).toLowerCase() + f.slice(1);
      if (!seen.has(low)) seen.set(low, [low, row[1], row[2]]);
    }
    // A Chinese term's name that holds another entry's form ("Travelling Horse", "Horse"): its own entry's, or plain.
    if (CHINESE_LEXICONS.has(t)) {
      const rows = [...seen.values()].filter(Boolean);
      for (const term of terms) {
        const e = byId.get(term.id);
        const linked = e?.page && (e.tradition === t || (BORROWED[t] ?? []).includes(`${e.tradition}/${e.family}`));
        for (const name of new Set([term.title?.[lang], ...(term.aliases?.[lang] ?? [])].filter(Boolean).map(clean))) {
          if (!/\s/.test(name) || seen.has(name) || !rows.some(([f, id]) => id !== term.id && holds(name, f))) continue;
          seen.set(name, linked ? [name, e.id, e[lang].meta.slug] : [name, "", ""]);
        }
      }
    }
    lexicon[t] =[...seen.values()].filter(Boolean).sort((a, b) => [...b[0]].length - [...a[0]].length || a[0].localeCompare(b[0]));
  }
  return lexicon;
}
