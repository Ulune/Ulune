/*
 * The Calendar's layers, by language (page reorganisation plan, part R5):
 * what each language adds to the days. Astrology brings the sky (the same
 * for everyone) and your transits; numerology your personal day, month and
 * year. Each layer is a switch in the Calendar's View menu, kept on this
 * device only (calendar-prefs.ts), and every view follows the switches: the
 * day, the month, the year, the side panel, the events table and the
 * calendar file.
 *
 * The list below is a registry, read in order: the View menu groups its
 * switches by language as they come here, and each layer's default, whether
 * it needs a chart and which of the calendar's rows are its own all come
 * from it. The Chinese languages (languages plan, parts 6, 11 and 25) add
 * theirs at the end of CALENDAR_LAYERS, with a language of their own: the
 * solar terms (the only one on by default besides the sky and your
 * transits), the day's pillar, lunar dates and the year's flying stars; the
 * almanac's day officers follow in wave 2. Last, the charts you keep (share
 * and compare plan, idea B10): each kept person's birthday, solar return and
 * big returns, off by default, its rows the "people" kind, its names on the
 * page only (calendar-people.ts). Pure, no browser: the unit tests read it
 * as it is (scripts/calendar-layers.test.mjs).
 */
import type { CalendarWordKey } from "@/lib/i18n/calendar-layer-words";
import type { CalRow } from "./calendar-rows";

export type CalendarLayerId = "sky" | "transits" | "numerology" | "terms" | "animals" | "stars" | "people";

/** The language a layer belongs to: the View menu names it above its switches ("people": the charts you keep, B10). */
export type LayerLanguage = "astrology" | "numerology" | "chinese" | "people";

/** Who a row of the events table is for: everyone (the sky) or the chart's person. */
export type RowKind = CalRow["kind"];

export type CalendarLayer = {
  id: CalendarLayerId;
  language: LayerLanguage;
  /** On until the reader chooses (languages plan: off by default but the sky, your transits and the solar terms). */
  defaultOn: boolean;
  /** Read from a chart (a birth date at least): shown unavailable, with why, until one is cast. */
  needsChart: boolean;
  /** The kinds of the calendar's rows it owns, in the events table and the calendar file. */
  rows: readonly RowKind[];
  /** Its switch's name, and the line under it. */
  label: CalendarWordKey;
  hint: CalendarWordKey;
};

export const CALENDAR_LAYERS: readonly CalendarLayer[] = [
  {
    id: "sky",
    language: "astrology",
    defaultOn: true,
    needsChart: false,
    rows: ["sky"],
    label: "calLayerSky",
    hint: "calLayerSkyHint",
  },
  {
    id: "transits",
    language: "astrology",
    defaultOn: true,
    needsChart: true,
    rows: ["you"],
    label: "calLayerTransits",
    hint: "calLayerTransitsHint",
  },
  {
    id: "numerology",
    language: "numerology",
    defaultOn: false,
    needsChart: true,
    rows: ["num"],
    label: "calLayerNumerology",
    hint: "calLayerNumerologyHint",
  },
  // The Chinese calendar (languages plan, part 6): the 24 solar terms, the
  // same for everyone, on by default. They are sky events of their own kind
  // ("term", added on the device), so their rows are the sky's: calendar-rows.ts
  // gives them by this layer, not the sky's. The day's pillar, lunar dates and
  // the flying stars follow with their languages (parts 11 and 25).
  {
    id: "terms",
    language: "chinese",
    defaultOn: true,
    needsChart: false,
    rows: [],
    label: "calLayerTerms",
    hint: "calLayerTermsHint",
  },
  // The day's animal (languages plan, part 11): each day's pillar and animal,
  // and with a chart the days that clash with your year animal (the almanac's
  // clash). Off by default; it draws in the month and the day, no rows.
  {
    id: "animals",
    language: "chinese",
    defaultOn: false,
    needsChart: false,
    rows: [],
    label: "calLayerAnimals",
    hint: "calLayerAnimalsHint",
  },
  // Feng Shui's flying stars (languages plan, part 25): the month's star from
  // each month's opening solar term, the year's from Lichun, the same for
  // everyone. Off by default; it draws in the month and the day, no rows.
  {
    id: "stars",
    language: "chinese",
    defaultOn: false,
    needsChart: false,
    rows: [],
    label: "calLayerStars",
    hint: "calLayerStarsHint",
  },
  // Birthdays and returns of the charts you keep (share and compare plan, idea B10): each kept person's
  // birthday, solar return and big returns. Off by default; it needs a chart (the people are the kept
  // charts); its rows carry names, which never leave the page unless the reader puts them in a file.
  {
    id: "people",
    language: "people",
    defaultOn: false,
    needsChart: true,
    rows: ["people"],
    label: "calLayerPeople",
    hint: "calLayerPeopleHint",
  },
];

/** The heading each language's switches stand under. */
export const LAYER_LANGUAGE_LABEL: Record<LayerLanguage, CalendarWordKey> = {
  astrology: "calLayerLangAstrology",
  numerology: "calLayerLangNumerology",
  chinese: "calLayerLangChinese",
  people: "calLayerLangPeople",
};

/** The reader's switches, as kept: a layer never switched follows its default. */
export type LayerChoices = Partial<Record<CalendarLayerId, boolean>>;

/** What the views draw: each layer, on or off. */
export type ShownLayers = Readonly<Record<CalendarLayerId, boolean>>;

export function isLayerId(value: unknown): value is CalendarLayerId {
  return CALENDAR_LAYERS.some((l) => l.id === value);
}

export function layerById(id: CalendarLayerId): CalendarLayer {
  const hit = CALENDAR_LAYERS.find((l) => l.id === id);
  if (!hit) throw new Error(`unknown calendar layer ${id}`);
  return hit;
}

/** The switches kept in this browser, read with care: unknown layers and anything not a yes or no are dropped. */
export function cleanChoices(raw: unknown): LayerChoices {
  const out: LayerChoices = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [id, on] of Object.entries(raw as Record<string, unknown>)) {
    if (isLayerId(id) && typeof on === "boolean") out[id] = on;
  }
  return out;
}

/** Whether each switch is on: the reader's choice, else the layer's default. */
export function layersOn(choices: LayerChoices = {}): ShownLayers {
  const out = {} as Record<CalendarLayerId, boolean>;
  for (const l of CALENDAR_LAYERS) out[l.id] = choices[l.id] ?? l.defaultOn;
  return out;
}

/** Whether a layer can show now: one read from a chart waits for a chart. */
export function layerAvailable(layer: CalendarLayer, hasChart: boolean): boolean {
  return hasChart || !layer.needsChart;
}

/**
 * What the views show: a layer switched on and, for one read from a chart, a
 * chart cast. Without a chart the Calendar is the sky alone; the reader's
 * choices stay as they were, for when a chart comes.
 */
export function shownLayers(choices: LayerChoices, hasChart: boolean): ShownLayers {
  const on = layersOn(choices);
  const out = {} as Record<CalendarLayerId, boolean>;
  for (const l of CALENDAR_LAYERS) out[l.id] = on[l.id] && layerAvailable(l, hasChart);
  return out;
}

/** The layers by language, in the registry's order: the View menu's groups. */
export function layerGroups(): { language: LayerLanguage; layers: CalendarLayer[] }[] {
  const groups: { language: LayerLanguage; layers: CalendarLayer[] }[] = [];
  for (const l of CALENDAR_LAYERS) {
    const group = groups.find((g) => g.language === l.language);
    if (group) group.layers.push(l);
    else groups.push({ language: l.language, layers: [l] });
  }
  return groups;
}

/** The layer a row of the events table or the calendar file comes from. */
export function layerOfRow(kind: RowKind): CalendarLayer | undefined {
  return CALENDAR_LAYERS.find((l) => l.rows.includes(kind));
}

/** Whether a row's layer is shown. */
export function rowShown(kind: RowKind, shown: Partial<ShownLayers>): boolean {
  const layer = layerOfRow(kind);
  return Boolean(layer && shown[layer.id]);
}

/** Whether any layer read from a chart is shown (the "For you" parts, the table's filter). */
export function anyPersonalShown(shown: ShownLayers): boolean {
  return CALENDAR_LAYERS.some((l) => l.needsChart && shown[l.id]);
}

/**
 * The events table's "for whom" over the layers shown: the sky's (layers
 * that need no chart), yours (those read from your chart), or all of them.
 */
export function layersForWhom(shown: ShownLayers, who: "all" | "sky" | "yours"): ShownLayers {
  if (who === "all") return shown;
  const out = {} as Record<CalendarLayerId, boolean>;
  for (const l of CALENDAR_LAYERS) out[l.id] = shown[l.id] && (who === "yours" ? l.needsChart : !l.needsChart);
  return out;
}
