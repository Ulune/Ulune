import { translate, type AppLocale } from "@/lib/i18n/messages";
import { HOUSE_SYSTEM_LABEL } from "@/lib/chart/constants";
import { parseGrokJson } from "@/lib/chart/parse-grok-json";
import { HOUSE_SYSTEM_IDS, type GrokReading, type HouseSystemId } from "@/lib/chart/types";

/*
 * The full natal reading's prompt and the parsing of its answer, built on the
 * reader's device (they used to be built on the server). The chart goes out
 * as positions only (lib/chart/dump.ts): no name, birth date, time or place.
 */

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeReading(raw: unknown, locale: AppLocale): GrokReading | null {
  const obj = asRecord(raw);
  const portrait = asText(obj.portrait);
  if (!portrait) return null;
  const sectionsIn = Array.isArray(obj.sections) ? obj.sections : [];
  const planets: GrokReading["planets"] = {};
  for (const [k, v] of Object.entries(asRecord(obj.planets))) {
    const row = asRecord(v);
    planets[k] = {
      headline: asText(row.headline),
      body: asText(row.body),
      aspects: asText(row.aspects),
    };
  }
  const houses: GrokReading["houses"] = {};
  for (const [k, v] of Object.entries(asRecord(obj.houses))) {
    const row = asRecord(v);
    houses[k] = { headline: asText(row.headline), body: asText(row.body) };
  }
  const signs: GrokReading["signs"] = {};
  for (const [k, v] of Object.entries(asRecord(obj.signs))) {
    signs[k] = { body: asText(asRecord(v).body) };
  }
  const angles: GrokReading["angles"] = {};
  for (const [k, v] of Object.entries(asRecord(obj.angles))) {
    const row = asRecord(v);
    angles[k] = { headline: asText(row.headline), body: asText(row.body) };
  }
  const aspects: GrokReading["aspects"] = {};
  for (const [k, v] of Object.entries(asRecord(obj.aspects))) {
    aspects[k] = { body: asText(asRecord(v).body) };
  }
  const sections = sectionsIn
    .map((s) => {
      const row = asRecord(s);
      return { title: asText(row.title), body: asText(row.body) };
    })
    .filter((s) => s.title && s.body);
  if (!portrait) return null;
  if (sections.length === 0 && portrait.length < 120) return null;
  return {
    locale,
    portraitTitle: asText(obj.portraitTitle) || translate(locale, "chartInFull"),
    portrait,
    planets,
    houses,
    signs,
    angles,
    aspects,
    sections,
  };
}

function houseSystemPhrase(locale: AppLocale, houseSystem?: HouseSystemId): string {
  const id =
    houseSystem && (HOUSE_SYSTEM_IDS as readonly string[]).includes(houseSystem)
      ? houseSystem
      : "placidus";
  const name = translate(locale, HOUSE_SYSTEM_LABEL[id]);
  return locale === "fr" ? `maisons ${name}` : `${name} houses`;
}

export function composeSystem(locale: AppLocale, houseSystem?: HouseSystemId): string {
  const houses = houseSystemPhrase(locale, houseSystem);
  if (locale === "fr") {
    return `Tu es un astrologue natal précis. Tu écris pour deux lecteurs à la fois : quelqu’un qui n’a jamais entendu parler d’une maison, et quelqu’un qui veut orbes, dignités, maîtres.

Zodiaque tropical, ${houses}. Psychologique et symbolique — pas de voyance, pas de médical, pas de moralisme. Vouvoiement. Français de locuteur natif, jamais calqué.

Règles de langue :
- Chaque mot technique gagne sa place : la première fois que tu dis « carré », « domicile », « maître du thème », « décan », « intercepté », tu dis ce que c’est en une proposition.
- Traduis le symbole en vie. Pas « votre Lune a besoin de sécurité » comme slogan — dis ce que cela fait à 23 h, dans une cuisine, dans une conversation.
- Nomme les signes, maisons, orbes, applicatif/séparatif DE CE thème. Pas un blurb générique de Soleil en X.
- Garde la couche savante : dignité, élément, modalité, interception, stellium, maître du thème. Après la phrase claire, la phrase précise.
- Interdit : « tapisserie cosmique », « l’univers veut », listes de jumeaux célèbres, voyance, médical.
- Aspects : « le Soleil en opposition à la Lune », jamais « Soleil opposition Lune ». Lexique : le Soleil, la Lune, Mercure, Vénus, Mars, Jupiter, Saturne, Uranus, Neptune, Pluton, Chiron, le Nœud Nord réel, le Nœud Sud, Lilith réelle, le Vertex, l’Ascendant, le Milieu du Ciel.

Réponds UNIQUEMENT avec les balises ci-dessous. Pas de JSON. Pas de markdown. Pas de texte hors balises.`;
  }
  return `You are a natal astrologer writing for two readers at once: someone who has never heard of a house, and someone who wants orbs, dignities, and rulers.

Tropical zodiac, ${houses}. Psychological and symbolic — not fortune-telling, not medical, not moralising. Second person.

Language rules:
- Every technical word earns its keep: the first time you use "square", "domicile", "chart ruler", "decan", "intercepted", say what it is in one clause.
- Translate symbol into life. Not "your Moon needs security" as a slogan — say what that looks like at 11pm, in a kitchen, in a conversation.
- Name the actual signs, houses, orbs, applying/separating of THIS chart. Do not write a generic Sun-in-X blurb.
- Keep the scholarly layer: dignity, element, modality, interception, stellium, chart ruler. After the plain sentence, the precise one.
- Forbidden: "cosmic tapestry", "the universe wants", celebrity twins, fortune-telling, medical claims.
- Aspects as "the Sun in opposition to the Moon", never "Sun opposition Moon".

Return ONLY the tagged blocks below. No JSON. No markdown. No text outside the tags.`;
}

export function composeUser(dump: string, locale: AppLocale, compact = false): string {
  if (locale === "fr") {
    const length = compact
      ? "Chaque section : 3 à 5 phrases. Portrait : 2 paragraphes."
      : "Chaque section : 4 à 6 phrases. Portrait : 2 paragraphes denses.";
    return `Interprétation natale de ce thème.

${dump}

Dans chaque section :
1. Commence en langue ordinaire (ce que cela fait dans une vie).
2. Puis le fait du thème (planète, signe, maison, orbe).
3. Puis une image vécue qui n’appartient qu’à CETTE combinaison — pas une phrase qu’on pourrait coller sur n’importe quel thème.

Couvre les aspects majeurs les plus serrés un par un dans « Tensions et dons » : pour chacun, dis ce qu’est l’aspect (carré = 90°, même rythme, buts différents, etc.), nomme les deux fonctions en langage clair, puis l’image.

Format exact :

@@TITLE@@
courte épithète
@@PORTRAIT@@
ascendant, Soleil/Lune, maître du thème, le motif saillant DE CE thème — d’abord en clair, puis le ciel
@@SECTION@@ Identité — le Soleil, la Lune, l'Ascendant
texte
@@SECTION@@ Le maître du thème
texte
@@SECTION@@ Esprit et appétit — Mercure, Vénus, Mars
texte
@@SECTION@@ Les planètes sociales — Jupiter et Saturne
texte
@@SECTION@@ Le climat extérieur — Uranus, Neptune, Pluton
texte
@@SECTION@@ Maisons de vie
texte
@@SECTION@@ Tensions et dons majeurs
texte
@@SECTION@@ Synthèse
texte
@@END@@

${length} Nommez signes, maisons et orbes réels. Interdit : JSON, accolades, blocs de code.`;
  }
  const length = compact
    ? "Each section: 3-5 sentences. Portrait: 2 paragraphs."
    : "Each section: 4-6 sentences. Portrait: 2 dense paragraphs.";
  return `Natal interpretation for this chart.

${dump}

In each section:
1. Start in ordinary language (what this does in a life).
2. Then the chart fact (planet, sign, house, orb).
3. Then one lived image that could only belong to THIS combination — not a sentence you could paste onto any chart.

Cover the tightest major aspects one by one in "Major tensions and gifts": for each, say what the aspect is (square = 90°, same pace, different aims, etc.), name both functions in plain language, then the image.

Exact format:

@@TITLE@@
short epithet
@@PORTRAIT@@
rising, sun/moon, chart ruler, the standout pattern of THIS chart — first in plain speech, then the sky
@@SECTION@@ Identity — Sun, Moon, Rising
text
@@SECTION@@ The chart ruler
text
@@SECTION@@ Mind and appetite — Mercury, Venus, Mars
text
@@SECTION@@ The social planets — Jupiter and Saturn
text
@@SECTION@@ The outer weather — Uranus, Neptune, Pluto
text
@@SECTION@@ Houses of life
text
@@SECTION@@ Major tensions and gifts
text
@@SECTION@@ Synthesis
text
@@END@@

${length} Name the actual signs, houses, and orbs. No JSON, no braces, no code fences.`;
}

export function readingFromText(text: string, locale: AppLocale): GrokReading | null {
  try {
    return normalizeReading(parseGrokJson(text), locale);
  } catch {
    return null;
  }
}
