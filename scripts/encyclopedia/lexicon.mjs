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
 *     then reads as an everyday phrase (NO_LOWER: "a whole sign").
 *
 * A tradition's list holds its own entries; Human Design's also holds the
 * planets and the signs, which its gate and activation texts name; "all"
 * holds every tradition's, for the guide.
 * scripts/encyclopedia/link-review.mjs runs the list over every text Ulune
 * has and prints what it would link, for review.
 */

/** Single words never linked by themselves, in either case (a writer may still mark them). */
export const GENERIC = {
  en: new Set(
    `House Houses Sign Signs Aspect Aspects Orb Orbs Station Fall Face Faces Term Terms Bound Bounds Exact Lot Lots Ruler
    Rulership Reception Equal Season Sect Composite Latitude Type Types Strategy Authority Profile Profiles Definition Variable
    Arrows Gate Gates Line Lines Channel Channels Centres Centers Cross Signature Conscious Unconscious Activation Bridge
    Challenge Essence Balance Attitude Planes Fire Earth Air Water Fixed Cardinal Mutable Destiny Window Transit Transits Determination Environment Perspective Motivation`
      .split(/\s+/)
      .filter(Boolean),
  ),
  fr: new Set(
    `Maison Maisons Signe Signes Aspect Aspects Orbe Orbes Station Chute Face Faces Terme Termes Exact Lot Lots Maître
    Maîtrise Réception Saison Secte Composite Latitude Type Types Stratégie Autorité Profil Profils Définition Variable
    Flèches Porte Portes Ligne Lignes Canal Canaux Centres Croix Signature Conscient Inconscient Activation Pont Défi Défis
    Essence Équilibre Attitude Plans Feu Terre Air Eau Fixe Cardinal Mutable Destinée Fenêtre Transit Transits Réalisation Détermination Environnement Perspective Motivation`
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
]);

/** Human Design's texts also name these astrology families. */
const BORROWED = { "human-design": ["astrology/planets", "astrology/signs"] };

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
 * with a page are linked.
 */
export function buildLexicon(entries, lang) {
  const forms = (e) => {
    const m = e[lang].meta;
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
  const traditions = [...new Set(entries.map((e) => e.tradition))];
  // "all": every tradition at once, for the guide (a name two traditions share stays plain).
  for (const t of [...traditions, "all"]) {
    const own = entries.filter(
      (e) => e.page && (t === "all" || e.tradition === t || (BORROWED[t] ?? []).includes(`${e.tradition}/${e.family}`)),
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
      if (!/\s/.test(f) || !/^\p{Lu}/u.test(f) || NO_LOWER.has(f)) continue;
      const low = f.charAt(0).toLowerCase() + f.slice(1);
      if (!seen.has(low)) seen.set(low, [low, row[1], row[2]]);
    }
    lexicon[t] = [...seen.values()].filter(Boolean).sort((a, b) => [...b[0]].length - [...a[0]].length || a[0].localeCompare(b[0]));
  }
  return lexicon;
}
