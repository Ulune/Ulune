import { translate, type AppLocale } from "@/lib/i18n/messages";
import { HOUSE_SYSTEM_LABEL } from "@/lib/chart/constants";
import { HOUSE_SYSTEM_IDS, type HouseSystemId } from "@/lib/chart/types";

/*
 * "Ask about this": the question's prompt, built on the reader's device (it
 * used to be built on the server). The chart goes out as positions only
 * (lib/chart/dump.ts): no name, birth date, time or place.
 */

export const ASK_MODE_IDS = ["natal", "transits", "timing", "progressions", "synastry", "composite", "design", "numerology"] as const;
export type AskModeId = (typeof ASK_MODE_IDS)[number];
type ModeId = AskModeId;

export type AskTurn = { q: string; a: string };

export type AskInput = {
  locale: AppLocale;
  dump: string;
  focus: {
    id: string;
    kind: "planet" | "house" | "sign" | "aspect" | "angle" | "decan" | "mode";
    title: string;
    kicker: string;
    paragraphs: string[];
  };
  mode?: ModeId;
  houseSystem?: HouseSystemId;
  question: string;
  history?: AskTurn[];
};

/** FNV-1a — cheap content hash so cache keys reflect the actual chart + thread. */
export function fnv1a(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

export function toProse(raw: string): string {
  return raw
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/^[*-]\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function modeQuestion(locale: AppLocale, mode: ModeId | undefined): string {
  const fr = locale === "fr";
  switch (mode) {
    case "transits":
      return fr
        ? "Écrivez une perspective pour les prochaines semaines à partir des transits listés : les deux ou trois contacts qui comptent le plus, ce qu’ils demandent, et comment les traverser."
        : "Write an outlook for the coming weeks from the listed transits: the two or three contacts that matter most, what they ask for, and how to move through them.";
    case "progressions":
      return fr
        ? "Décrivez le chapitre de vie que montrent ces progressions : ce qui mûrit, ce qui se termine, ce qui commence."
        : "Describe the life chapter these progressions show: what is ripening, what is ending, what is beginning.";
    case "synastry":
      return fr
        ? "Décrivez la dynamique de cette relation à partir des aspects listés : où elle coule, où elle frotte, et ce que chacun apporte à l’autre."
        : "Describe the dynamic of this relationship from the listed aspects: where it flows, where it rubs, and what each brings the other.";
    case "composite":
      return fr
        ? "Faites le portrait de la relation elle-même d’après ce thème composite : son but, son style, son défi."
        : "Portray the relationship itself from this composite chart: its purpose, its style, its challenge.";
    default:
      return fr ? "Faites une synthèse de ce qui est listé." : "Summarise what is listed.";
  }
}

export function defaultQuestion(locale: AppLocale, title: string, deeper: boolean): string {
  if (locale === "fr") {
    return deeper
      ? `Allez plus loin sur ${title}. Ne répétez pas la réponse précédente. Faites entrer une autre pièce du thème (aspect serré, autre planète intérieure, axe de maisons) que vous n’avez pas encore utilisée.`
      : `Approfondissez ${title}. La note au clic couvre déjà le basique. Ce que je veux : comment le RESTE de CE thème natal le colore — aspects serrés, planètes intérieures (surtout Mars, Vénus, Lune, Mercure), l’axe des maisons, et ce que la note locale a sauté. Soyez précis à CE ciel.`;
  }
  return deeper
    ? `Go deeper on ${title}. Do not repeat the previous answer. Bring in another part of this natal (a tight aspect, another inner planet, a house axis) you have not used yet.`
    : `Elaborate on ${title}. The click-note already covers the basics. What I want is how the REST of THIS natal chart colours it — tight aspects, the other inner planets (especially Mars, Venus, Moon, Mercury), the house axis, and anything the local note skipped. Be specific to THIS sky.`;
}

function housesPhrase(locale: AppLocale, houseSystem?: HouseSystemId): string {
  const id = houseSystem && (HOUSE_SYSTEM_IDS as readonly string[]).includes(houseSystem) ? houseSystem : "placidus";
  const name = translate(locale, HOUSE_SYSTEM_LABEL[id]);
  return locale === "fr" ? `maisons ${name}` : `${name} houses`;
}

/** One line telling the model which surface the question comes from. */
function modeContext(locale: AppLocale, mode?: ModeId): string {
  const fr = locale === "fr";
  switch (mode) {
    case "transits":
      return fr
        ? "Contexte : transits — le ciel d’aujourd’hui (ou de la date choisie) sur le thème natal. Parle de période, de rythme, de ce qui s’ouvre et se referme ; jamais de prédiction ferme."
        : "Context: transits — today's sky (or the chosen date) over the natal chart. Talk about a season, pacing, what opens and closes; never a firm prediction.";
    case "timing":
      return fr
        ? "Contexte : moments — les dates où des transits deviennent exacts. Relie chaque date à ce qu’elle touche dans le thème."
        : "Context: timing — the dates when transits perfect. Tie each date to what it touches in the chart.";
    case "progressions":
      return fr
        ? "Contexte : progressions secondaires — un jour après la naissance pour une année de vie. Parle de chapitre intérieur, lent."
        : "Context: secondary progressions — one day after birth for each year of life. Speak of a slow inner chapter.";
    case "synastry":
      return fr
        ? "Contexte : synastrie — les aspects entre deux thèmes. Décris la dynamique entre deux personnes, avec respect pour les deux, sans verdict de compatibilité."
        : "Context: synastry — aspects between two charts. Describe the dynamic between two people, fair to both, with no compatibility verdict.";
    case "composite":
      return fr
        ? "Contexte : thème composite — les points médians de deux thèmes, le portrait de la relation elle-même."
        : "Context: composite chart — the midpoints of two charts, a portrait of the relationship itself.";
    case "design":
      return fr
        ? "Contexte : Human Design — type, stratégie, autorité, centres, canaux et portes. Reste dans ce vocabulaire ; n’invente pas de porte ou de canal absent."
        : "Context: Human Design — type, strategy, authority, centres, channels and gates. Stay in that vocabulary; do not invent gates or channels that are not present.";
    case "numerology":
      return fr
        ? "Contexte : numérologie pythagoricienne — nombres du nom et de la date. Pas d’astrologie sauf si la question le demande."
        : "Context: Pythagorean numerology — numbers from the name and date. No astrology unless the question asks for it.";
    default:
      return fr ? "Contexte : thème natal." : "Context: natal chart.";
  }
}

export function askSystem(locale: AppLocale, mode?: ModeId, houseSystem?: HouseSystemId): string {
  const houses = housesPhrase(locale, houseSystem);
  const ctx = modeContext(locale, mode);
  if (locale === "fr") {
    return `Tu es un astrologue natal précis. Tu réponds à UNE question sur UN point cliqué dans un thème, en tenant compte du ciel entier.

Zodiaque tropical, ${houses}. ${ctx} Psychologique et symbolique — pas de voyance, pas de médical, pas de moralisme. Vouvoiement. Français de locuteur natif.

Règles :
- 2 à 4 paragraphes. Pas de listes, pas de titres markdown, pas de JSON.
- Nomme les signes, maisons, orbes RÉELS de ce thème. Si la question mentionne une autre planète, va la chercher dans le dump et décris la relation concrète (aspect, réception, maison).
- Ne recopie pas la note locale déjà fournie. Ajoute ce qu’elle ne dit pas.
- Interdit : « tapisserie cosmique », « l’univers veut », jumeaux célèbres, voyance, médical.
- Aspects en français : « Vénus au carré de Mars », jamais « Vénus square Mars ».`;
  }
  return `You are a natal astrologer answering ONE question about ONE clicked point, using the whole chart.

Tropical zodiac, ${houses}. ${ctx} Psychological and symbolic — not fortune-telling, not medical, not moralising. Second person.

Rules:
- 2 to 4 paragraphs. No lists, no markdown headings, no JSON.
- Name the actual signs, houses, and orbs of THIS chart. If the question mentions another planet, look it up in the dump and describe the concrete relationship (aspect, reception, house).
- Do not restate the local click-note. Add what it left out.
- Forbidden: "cosmic tapestry", "the universe wants", celebrity twins, fortune-telling, medical claims.
- Aspects as "Venus square Mars" in a sentence: "Venus in square to Mars".`;
}

export function askUser(input: AskInput, question: string): string {
  const fr = input.locale === "fr";
  const paras = input.focus.paragraphs.filter(Boolean).join("\n");
  const hist = (input.history ?? [])
    .map((t, i) => `${fr ? "Q" : "Q"}${i + 1}: ${t.q}\n${fr ? "R" : "A"}${i + 1}: ${t.a.slice(0, 900)}`)
    .join("\n\n");
  return [
    fr ? "THÈME (dump)" : "CHART DUMP",
    input.dump,
    "",
    fr ? "POINT CLIQUÉ" : "CLICKED FOCUS",
    `${input.focus.kind} · ${input.focus.title}`,
    input.focus.kicker,
    paras ? `${fr ? "Note déjà affichée" : "Note already on screen"}:\n${paras}` : "",
    hist ? `\n${fr ? "ÉCHANGES PRÉCÉDENTS SUR CE POINT" : "EARLIER TURNS ON THIS FOCUS"}\n${hist}` : "",
    "",
    fr ? "QUESTION" : "QUESTION",
    question,
  ]
    .filter((line) => line !== "")
    .join("\n");
}
