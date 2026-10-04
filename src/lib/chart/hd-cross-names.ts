/**
 * The names of the 192 Incarnation Crosses (review 3 Oct, H3), by the
 * Personality Sun's gate and the angle: Right Angle (with its quarter's
 * number), Juxtaposition, Left Angle (1 or 2). Each name was checked
 * against Jovian Archive's books (the Incarnation Crosses by Profile, the
 * four quarters' tables of contents) and at least one other published
 * table; the French names follow the French Human Design sources, except
 * the Left Angle Cross of Upheaval, which has none we could find and is
 * translated here ("du bouleversement").
 */
import type { HdAngle, HdCross } from "./hd-cross";

type Names = { r: [string, number]; j: string; l: [string, number]; fr: [string, string, string] };

const CROSS: Record<number, Names> = {
  1: { r: ["the Sphinx", 4], j: "Self-Expression", l: ["Defiance", 2], fr: ["Croix de l’angle droit du Sphinx", "Croix de juxtaposition de l’expression de soi", "Croix de l’angle ouvert du défi"] },
  2: { r: ["the Sphinx", 2], j: "the Driver", l: ["Defiance", 1], fr: ["Croix de l’angle droit du Sphinx", "Croix de juxtaposition du conducteur", "Croix de l’angle ouvert du défi"] },
  3: { r: ["Laws", 1], j: "Mutation", l: ["Wishes", 1], fr: ["Croix de l’angle droit des lois", "Croix de juxtaposition de la mutation", "Croix de l’angle ouvert des souhaits"] },
  4: { r: ["Explanation", 3], j: "Formulization", l: ["Revolution", 2], fr: ["Croix de l’angle droit de l’explication", "Croix de juxtaposition de l’expression des formules", "Croix de l’angle ouvert de la révolution"] },
  5: { r: ["Consciousness", 4], j: "Habits", l: ["Separation", 2], fr: ["Croix de l’angle droit de la conscience", "Croix de juxtaposition des habitudes", "Croix de l’angle ouvert de la séparation"] },
  6: { r: ["Eden", 3], j: "Conflict", l: ["the Plane", 2], fr: ["Croix de l’angle droit de l’Éden", "Croix de juxtaposition du conflit", "Croix de l’angle ouvert du plan matériel"] },
  7: { r: ["the Sphinx", 3], j: "Interaction", l: ["Masks", 2], fr: ["Croix de l’angle droit du Sphinx", "Croix de juxtaposition de l’interaction", "Croix de l’angle ouvert des masques"] },
  8: { r: ["Contagion", 2], j: "Contribution", l: ["Uncertainty", 1], fr: ["Croix de l’angle droit de la contagion", "Croix de juxtaposition de la contribution", "Croix de l’angle ouvert de l’incertitude"] },
  9: { r: ["Planning", 4], j: "Focus", l: ["Identification", 2], fr: ["Croix de l’angle droit de la planification", "Croix de juxtaposition de la focalisation", "Croix de l’angle ouvert de l’identification"] },
  10: { r: ["the Vessel of Love", 4], j: "Behavior", l: ["Prevention", 2], fr: ["Croix de l’angle droit du vaisseau de l’amour", "Croix de juxtaposition du comportement", "Croix de l’angle ouvert de la prévention"] },
  11: { r: ["Eden", 4], j: "Ideas", l: ["Education", 2], fr: ["Croix de l’angle droit de l’Éden", "Croix de juxtaposition des idées", "Croix de l’angle ouvert de l’éducation"] },
  12: { r: ["Eden", 2], j: "Articulation", l: ["Education", 1], fr: ["Croix de l’angle droit de l’Éden", "Croix de juxtaposition de l’éloquence", "Croix de l’angle ouvert de l’éducation"] },
  13: { r: ["the Sphinx", 1], j: "Listening", l: ["Masks", 1], fr: ["Croix de l’angle droit du Sphinx", "Croix de juxtaposition de l’écoute", "Croix de l’angle ouvert des masques"] },
  14: { r: ["Contagion", 4], j: "Empowering", l: ["Uncertainty", 2], fr: ["Croix de l’angle droit de la contagion", "Croix de juxtaposition de l’autonomisation", "Croix de l’angle ouvert de l’incertitude"] },
  15: { r: ["the Vessel of Love", 2], j: "Extremes", l: ["Prevention", 1], fr: ["Croix de l’angle droit du vaisseau de l’amour", "Croix de juxtaposition des extrêmes", "Croix de l’angle ouvert de la prévention"] },
  16: { r: ["Planning", 2], j: "Experimentation", l: ["Identification", 1], fr: ["Croix de l’angle droit de la planification", "Croix de juxtaposition de l’expérimentation", "Croix de l’angle ouvert de l’identification"] },
  17: { r: ["Service", 1], j: "Opinions", l: ["Upheaval", 1], fr: ["Croix de l’angle droit du service", "Croix de juxtaposition des opinions", "Croix de l’angle ouvert du bouleversement"] },
  18: { r: ["Service", 3], j: "Correction", l: ["Upheaval", 2], fr: ["Croix de l’angle droit du service", "Croix de juxtaposition de la correction", "Croix de l’angle ouvert du bouleversement"] },
  19: { r: ["the Four Ways", 4], j: "Need", l: ["Refinement", 2], fr: ["Croix de l’angle droit des quatre chemins", "Croix de juxtaposition du besoin", "Croix de l’angle ouvert du raffinement"] },
  20: { r: ["the Sleeping Phoenix", 2], j: "the Now", l: ["Duality", 1], fr: ["Croix de l’angle droit du phoenix dormant", "Croix de juxtaposition du moment présent", "Croix de l’angle ouvert de la dualité"] },
  21: { r: ["Tension", 1], j: "Control", l: ["Endeavor", 1], fr: ["Croix de l’angle droit de la tension", "Croix de juxtaposition du contrôle", "Croix de l’angle ouvert de l’effort"] },
  22: { r: ["Rulership", 1], j: "Grace", l: ["Informing", 1], fr: ["Croix de l’angle droit de la dominance", "Croix de juxtaposition de la grâce", "Croix de l’angle ouvert de la divulgation"] },
  23: { r: ["Explanation", 2], j: "Assimilation", l: ["Dedication", 1], fr: ["Croix de l’angle droit de l’explication", "Croix de juxtaposition de l’intégration", "Croix de l’angle ouvert du dévouement"] },
  24: { r: ["the Four Ways", 1], j: "Rationalization", l: ["Incarnation", 1], fr: ["Croix de l’angle droit des quatre chemins", "Croix de juxtaposition de la rationalisation", "Croix de l’angle ouvert de l’incarnation"] },
  25: { r: ["the Vessel of Love", 1], j: "Innocence", l: ["Healing", 1], fr: ["Croix de l’angle droit du vaisseau de l’amour", "Croix de juxtaposition de l’innocence", "Croix de l’angle ouvert de la guérison"] },
  26: { r: ["Rulership", 4], j: "the Trickster", l: ["Confrontation", 2], fr: ["Croix de l’angle droit de la dominance", "Croix de juxtaposition du tricheur", "Croix de l’angle ouvert de la confrontation"] },
  27: { r: ["the Unexpected", 1], j: "Caring", l: ["Alignment", 1], fr: ["Croix de l’angle droit de l’imprévu", "Croix de juxtaposition de la bienveillance", "Croix de l’angle ouvert de l’alignement"] },
  28: { r: ["the Unexpected", 3], j: "Risks", l: ["Alignment", 2], fr: ["Croix de l’angle droit de l’imprévu", "Croix de juxtaposition des risques", "Croix de l’angle ouvert de l’alignement"] },
  29: { r: ["Contagion", 3], j: "Commitment", l: ["Industry", 2], fr: ["Croix de l’angle droit de la contagion", "Croix de juxtaposition de l’engagement", "Croix de l’angle ouvert de l’industrie"] },
  30: { r: ["Contagion", 1], j: "Fates", l: ["Industry", 1], fr: ["Croix de l’angle droit de la contagion", "Croix de juxtaposition du destin", "Croix de l’angle ouvert de l’industrie"] },
  31: { r: ["the Unexpected", 2], j: "Influence", l: ["the Alpha", 1], fr: ["Croix de l’angle droit de l’imprévu", "Croix de juxtaposition de l’influence", "Croix de l’angle ouvert de l’alpha"] },
  32: { r: ["Maya", 3], j: "Conservation", l: ["Limitation", 2], fr: ["Croix de l’angle droit de maya", "Croix de juxtaposition de la conservation", "Croix de l’angle ouvert de la limitation"] },
  33: { r: ["the Four Ways", 2], j: "Retreat", l: ["Refinement", 1], fr: ["Croix de l’angle droit des quatre chemins", "Croix de juxtaposition de la retraite", "Croix de l’angle ouvert du raffinement"] },
  34: { r: ["the Sleeping Phoenix", 4], j: "Power", l: ["Duality", 2], fr: ["Croix de l’angle droit du phoenix dormant", "Croix de juxtaposition du pouvoir", "Croix de l’angle ouvert de la dualité"] },
  35: { r: ["Consciousness", 2], j: "Experience", l: ["Separation", 1], fr: ["Croix de l’angle droit de la conscience", "Croix de juxtaposition de l’expérience", "Croix de l’angle ouvert de la séparation"] },
  36: { r: ["Eden", 1], j: "Crisis", l: ["the Plane", 1], fr: ["Croix de l’angle droit de l’Éden", "Croix de juxtaposition de la crise", "Croix de l’angle ouvert du plan matériel"] },
  37: { r: ["Planning", 1], j: "Bargains", l: ["Migration", 1], fr: ["Croix de l’angle droit de la planification", "Croix de juxtaposition des négociations", "Croix de l’angle ouvert de la migration"] },
  38: { r: ["Tension", 4], j: "Opposition", l: ["Individualism", 2], fr: ["Croix de l’angle droit de la tension", "Croix de juxtaposition de l’opposition", "Croix de l’angle ouvert de l’individualisme"] },
  39: { r: ["Tension", 2], j: "Provocation", l: ["Individualism", 1], fr: ["Croix de l’angle droit de la tension", "Croix de juxtaposition de la provocation", "Croix de l’angle ouvert de l’individualisme"] },
  40: { r: ["Planning", 3], j: "Denial", l: ["Migration", 2], fr: ["Croix de l’angle droit de la planification", "Croix de juxtaposition du démenti", "Croix de l’angle ouvert de la migration"] },
  41: { r: ["the Unexpected", 4], j: "Fantasy", l: ["the Alpha", 2], fr: ["Croix de l’angle droit de l’imprévu", "Croix de juxtaposition de la fantaisie", "Croix de l’angle ouvert de l’alpha"] },
  42: { r: ["Maya", 1], j: "Completion", l: ["Limitation", 1], fr: ["Croix de l’angle droit de maya", "Croix de juxtaposition de l’accomplissement", "Croix de l’angle ouvert de la limitation"] },
  43: { r: ["Explanation", 4], j: "Insight", l: ["Dedication", 2], fr: ["Croix de l’angle droit de l’explication", "Croix de juxtaposition de la perspicacité", "Croix de l’angle ouvert du dévouement"] },
  44: { r: ["the Four Ways", 3], j: "Alertness", l: ["Incarnation", 2], fr: ["Croix de l’angle droit des quatre chemins", "Croix de juxtaposition de la vigilance", "Croix de l’angle ouvert de l’incarnation"] },
  45: { r: ["Rulership", 2], j: "Possession", l: ["Confrontation", 1], fr: ["Croix de l’angle droit de la dominance", "Croix de juxtaposition de la possession", "Croix de l’angle ouvert de la confrontation"] },
  46: { r: ["the Vessel of Love", 3], j: "Serendipity", l: ["Healing", 2], fr: ["Croix de l’angle droit du vaisseau de l’amour", "Croix de juxtaposition de la coïncidence", "Croix de l’angle ouvert de la guérison"] },
  47: { r: ["Rulership", 3], j: "Oppression", l: ["Informing", 2], fr: ["Croix de l’angle droit de la dominance", "Croix de juxtaposition de l’oppression", "Croix de l’angle ouvert de la divulgation"] },
  48: { r: ["Tension", 3], j: "Depth", l: ["Endeavor", 2], fr: ["Croix de l’angle droit de la tension", "Croix de juxtaposition de la profondeur", "Croix de l’angle ouvert de l’effort"] },
  49: { r: ["Explanation", 1], j: "Principles", l: ["Revolution", 1], fr: ["Croix de l’angle droit de l’explication", "Croix de juxtaposition des principes", "Croix de l’angle ouvert de la révolution"] },
  50: { r: ["Laws", 3], j: "Values", l: ["Wishes", 2], fr: ["Croix de l’angle droit des lois", "Croix de juxtaposition des valeurs", "Croix de l’angle ouvert des souhaits"] },
  51: { r: ["Penetration", 1], j: "Shock", l: ["the Clarion", 1], fr: ["Croix de l’angle droit de la pénétration", "Croix de juxtaposition du choc", "Croix de l’angle ouvert du clairon"] },
  52: { r: ["Service", 2], j: "Stillness", l: ["Demands", 1], fr: ["Croix de l’angle droit du service", "Croix de juxtaposition de l’immobilité", "Croix de l’angle ouvert des demandes"] },
  53: { r: ["Penetration", 2], j: "Beginnings", l: ["Cycles", 1], fr: ["Croix de l’angle droit de la pénétration", "Croix de juxtaposition des commencements", "Croix de l’angle ouvert des cycles"] },
  54: { r: ["Penetration", 4], j: "Ambition", l: ["Cycles", 2], fr: ["Croix de l’angle droit de la pénétration", "Croix de juxtaposition de l’ambition", "Croix de l’angle ouvert des cycles"] },
  55: { r: ["the Sleeping Phoenix", 1], j: "Moods", l: ["Spirit", 1], fr: ["Croix de l’angle droit du phoenix dormant", "Croix de juxtaposition des humeurs", "Croix de l’angle ouvert de l’état d’âme"] },
  56: { r: ["Laws", 2], j: "Stimulation", l: ["Distraction", 1], fr: ["Croix de l’angle droit des lois", "Croix de juxtaposition de la stimulation", "Croix de l’angle ouvert de la distraction"] },
  57: { r: ["Penetration", 3], j: "Intuition", l: ["the Clarion", 2], fr: ["Croix de l’angle droit de la pénétration", "Croix de juxtaposition de l’intuition", "Croix de l’angle ouvert du clairon"] },
  58: { r: ["Service", 4], j: "Vitality", l: ["Demands", 2], fr: ["Croix de l’angle droit du service", "Croix de juxtaposition de la vitalité", "Croix de l’angle ouvert des demandes"] },
  59: { r: ["the Sleeping Phoenix", 3], j: "Strategy", l: ["Spirit", 2], fr: ["Croix de l’angle droit du phoenix dormant", "Croix de juxtaposition de la stratégie", "Croix de l’angle ouvert de l’état d’âme"] },
  60: { r: ["Laws", 4], j: "Limitation", l: ["Distraction", 2], fr: ["Croix de l’angle droit des lois", "Croix de juxtaposition de la limitation", "Croix de l’angle ouvert de la distraction"] },
  61: { r: ["Maya", 4], j: "Thinking", l: ["Obscuration", 2], fr: ["Croix de l’angle droit de Maya", "Croix de juxtaposition de la pensée", "Croix de l’angle ouvert de l’obscurantisme"] },
  62: { r: ["Maya", 2], j: "Detail", l: ["Obscuration", 1], fr: ["Croix de l’angle droit de Maya", "Croix de juxtaposition du détail", "Croix de l’angle ouvert de l’obscuratisme"] },
  63: { r: ["Consciousness", 1], j: "Doubts", l: ["Dominion", 1], fr: ["Croix de l’angle droit de la conscience", "Croix de juxtaposition des doutes", "Croix de l’angle ouvert de dominion"] },
  64: { r: ["Consciousness", 3], j: "Confusion", l: ["Dominion", 2], fr: ["Croix de l’angle droit de la conscience", "Croix de juxtaposition de la confusion", "Croix de l’angle ouvert de dominion"] },
};

/** "Right Angle Cross of the Sphinx 4", "Juxtaposition Cross of the Driver", "Croix de l'angle droit du Sphinx 4". */
export function hdCrossName(cross: Pick<HdCross, "angle" | "personality">, locale: "en" | "fr"): string | null {
  const names = CROSS[cross.personality[0]];
  if (!names || !cross.angle) return null;
  return hdCrossNameOf(names, cross.angle, locale);
}

function hdCrossNameOf(n: Names, angle: HdAngle, locale: "en" | "fr"): string {
  if (locale === "fr") {
    if (angle === "right") return `${n.fr[0]} ${n.r[1]}`;
    if (angle === "left") return `${n.fr[2]} ${n.l[1]}`;
    return n.fr[1];
  }
  if (angle === "right") return `Right Angle Cross of ${n.r[0]} ${n.r[1]}`;
  if (angle === "left") return `Left Angle Cross of ${n.l[0]} ${n.l[1]}`;
  return `Juxtaposition Cross of ${n.j}`;
}

/** The whole table, for the tests. */
export function hdCrossTable(): Record<number, Names> {
  return CROSS;
}
