/*
 * The map of Ulune 2.0 (page reorganisation plan, part R1): three sections,
 * the languages inside Charts, the lenses inside each language, and the path
 * of every studio page. Pure data and functions, no browser, so the unit
 * tests read it as it is (scripts/studio-map.test.mjs).
 *
 *   Charts        a language (Astrology, Human Design, Numerology…), then a
 *                 lens (Natal, Cycles, Relationship) with its sub-modes.
 *   Calendar      every language's days in one place (`/calendar`, `/calendrier`).
 *   Encyclopedia  every word's page (filled by the encyclopedia plan).
 *
 * Addresses are paths (your decision 7): `/astrology/transits`, `/human-design`…
 * `/` stays the first screen (Astrology › Natal). The 1.x addresses
 * (`/?studio=transits`) are redirected to these by `legacyStudioPath`.
 */
import type { StudioPage, StudioView } from "./url";

export type SectionId = "charts" | "calendar" | "encyclopedia";
export type LanguageId = "astrology" | "human-design" | "numerology" | "chinese-astrology";
export type LensId = "natal" | "cycles" | "relationship";
/** The traditions the language picker groups its cards under, in order. */
export type TraditionId = "western" | "chinese";

export const SECTIONS: readonly SectionId[] = ["charts", "calendar", "encyclopedia"];
export const LENSES: readonly LensId[] = ["natal", "cycles", "relationship"];
export const TRADITIONS: readonly TraditionId[] = ["western", "chinese"];

export type Language = {
  id: LanguageId;
  /** The path of its Natal page; its other pages hang under it. */
  path: string;
  /** The tradition whose heading it stands under in the picker (western when left out). */
  group?: TraditionId;
  /** Its home in the encyclopedia, under ENCYCLOPEDIA_PATHS, in each interface language (none until its pages are written). */
  home?: { en: string; fr: string };
  /** Its lenses in order, each with its sub-modes (the first is the default). A lens it lacks is absent, never shown. */
  lenses: Partial<Record<LensId, readonly StudioPage[]>>;
};

export const LANGUAGES: readonly Language[] = [
  {
    id: "astrology",
    path: "/astrology",
    home: { en: "astrology", fr: "astrologie" },
    lenses: {
      natal: ["natal"],
      cycles: ["transits", "progressions"],
      relationship: ["synastry", "composite"],
    },
  },
  {
    id: "human-design",
    path: "/human-design",
    home: { en: "human-design", fr: "design-humain" },
    lenses: { natal: ["design"] },
  },
  {
    id: "numerology",
    path: "/numerology",
    home: { en: "numerology", fr: "numerologie" },
    lenses: { natal: ["numerology"], cycles: ["numerology-cycles"] },
  },
  // The first Chinese language (languages plan, part 7), with its Cycles (the
  // year ahead) and Relationship (two people's animals) since part 11. Its
  // home in the encyclopedia comes with its pages (encyclopedia plan, part 24).
  {
    id: "chinese-astrology",
    path: "/chinese-astrology",
    group: "chinese",
    lenses: { natal: ["zodiac"], cycles: ["zodiac-years"], relationship: ["zodiac-pair"] },
  },
];

/** The Calendar's path in each interface language. */
export const CALENDAR_PATHS = { en: "/calendar", fr: "/calendrier" } as const;
export const ENCYCLOPEDIA_PATHS = { en: "/encyclopedia", fr: "/encyclopedie" } as const;

/** A language's home in the encyclopedia (`/encyclopedia/astrology`, `/encyclopedie/astrologie`), or null before it has one. */
export function languageHomePath(id: LanguageId, locale: string = "en"): string | null {
  const fr = locale === "fr";
  const home = languageById(id).home;
  if (!home) return null;
  return `${fr ? ENCYCLOPEDIA_PATHS.fr : ENCYCLOPEDIA_PATHS.en}/${fr ? home.fr : home.en}`;
}

/**
 * The picker's headings, in order, each with its languages in the registry's
 * order; a tradition with no language yet is left out (Chinese traditions
 * appear once the registry has one).
 */
export function languageGroups(
  list: readonly Language[] = LANGUAGES,
): { group: TraditionId; languages: Language[] }[] {
  return TRADITIONS.map((group) => ({ group, languages: list.filter((l) => (l.group ?? "western") === group) })).filter(
    (g) => g.languages.length > 0,
  );
}

/**
 * Every page in the order the bars show them, each language's lenses and
 * sub-modes, then the Calendar: a switch comes from the side it moves toward.
 */
export const PAGE_ORDER: readonly StudioPage[] = [
  ...LANGUAGES.flatMap((l) => LENSES.flatMap((lens) => l.lenses[lens] ?? [])),
  "timing",
];

/** Every studio page's path (the Calendar's in English; `pagePath` gives the French one). */
export const PAGE_PATHS: Readonly<Record<StudioPage, string>> = {
  natal: "/astrology",
  transits: "/astrology/transits",
  progressions: "/astrology/progressions",
  synastry: "/astrology/synastry",
  composite: "/astrology/composite",
  design: "/human-design",
  numerology: "/numerology",
  "numerology-cycles": "/numerology/cycles",
  zodiac: "/chinese-astrology",
  "zodiac-years": "/chinese-astrology/cycles",
  "zodiac-pair": "/chinese-astrology/pair",
  timing: CALENDAR_PATHS.en,
};

export function pagePath(page: StudioPage, locale: string = "en"): string {
  if (page === "timing") return locale === "fr" ? CALENDAR_PATHS.fr : CALENDAR_PATHS.en;
  return PAGE_PATHS[page];
}

/** A path without its trailing slash, lower case (`/Astrology/` → `/astrology`). */
function norm(pathname: string): string {
  const p = pathname.toLowerCase().replace(/\/+$/, "");
  return p === "" ? "/" : p;
}

/** The studio page a path shows; `/` and other paths give undefined (the first screen restores the last page). */
export function pageFromPath(pathname: string): StudioPage | undefined {
  const p = norm(pathname);
  if (p === CALENDAR_PATHS.en || p === CALENDAR_PATHS.fr) return "timing";
  for (const [page, path] of Object.entries(PAGE_PATHS) as [StudioPage, string][]) {
    if (path === p) return page;
  }
  return undefined;
}

/** True for `/` and every studio page's path: the pages that draw the studio. */
export function isStudioPath(pathname: string): boolean {
  return norm(pathname) === "/" || pageFromPath(pathname) !== undefined;
}

export function sectionOf(page: StudioPage): SectionId {
  return page === "timing" ? "calendar" : "charts";
}

export function languageOf(page: StudioPage): LanguageId | undefined {
  return LANGUAGES.find((l) => Object.values(l.lenses).some((pages) => pages?.includes(page)))?.id;
}

/** Numerology's pages (its numbers wheel, its cycles): they share its data, its texts and its dock. */
export function isNumerologyPage(page: StudioPage): boolean {
  return languageOf(page) === "numerology";
}

export function lensOf(page: StudioPage): LensId | undefined {
  for (const l of LANGUAGES) {
    for (const lens of LENSES) if (l.lenses[lens]?.includes(page)) return lens;
  }
  return undefined;
}

export function languageById(id: LanguageId): Language {
  const hit = LANGUAGES.find((l) => l.id === id);
  if (!hit) throw new Error(`unknown language ${id}`);
  return hit;
}

/** The lenses a language has, in order. */
export function lensesOf(id: LanguageId): LensId[] {
  const l = languageById(id);
  return LENSES.filter((lens) => (l.lenses[lens]?.length ?? 0) > 0);
}

/** The sub-modes of a lens in a language (empty when it lacks the lens). */
export function pagesOf(id: LanguageId, lens: LensId): readonly StudioPage[] {
  return languageById(id).lenses[lens] ?? [];
}

/* What is remembered, on the device only: the last page in each lens of each
   language, and the order the languages were last used in. */

export const REMEMBER_KEY = "ulune.studio.last.v2";
type Remembered = {
  lang?: LanguageId;
  /** The languages used, the most recent first (the chips beside the language button, the phone's picker). */
  recent?: LanguageId[];
  lens?: Partial<Record<LanguageId, LensId>>;
  pages?: Partial<Record<string, StudioPage>>;
};
type Store = Pick<Storage, "getItem" | "setItem">;

function read(store: Store | undefined): Remembered {
  if (!store) return {};
  try {
    const raw = JSON.parse(store.getItem(REMEMBER_KEY) ?? "{}");
    return raw && typeof raw === "object" ? (raw as Remembered) : {};
  } catch {
    return {};
  }
}

export function rememberPage(page: StudioPage, store: Store | undefined = globalThis.localStorage): void {
  const lang = languageOf(page);
  const lens = lensOf(page);
  if (!store || !lang || !lens) return;
  const r = read(store);
  const next: Remembered = {
    lang,
    recent: [lang, ...recentOf(r).filter((id) => id !== lang)],
    lens: { ...r.lens, [lang]: lens },
    pages: { ...r.pages, [`${lang}/${lens}`]: page },
  };
  try {
    store.setItem(REMEMBER_KEY, JSON.stringify(next));
  } catch {
    /* quota / private */
  }
}

/** Where a press on a lens (or a language, with no lens) leads: its last sub-mode, else its first. */
export function pageFor(
  id: LanguageId,
  lens?: LensId,
  store: Store | undefined = globalThis.localStorage,
): StudioPage {
  const r = read(store);
  const lenses = lensesOf(id);
  // A language opens on the lens last used in it, else its first (Natal).
  const kept = r.lens?.[id];
  const lastLens = lens ?? (kept && lenses.includes(kept) ? kept : lenses[0]);
  const pages = pagesOf(id, lastLens);
  const last = r.pages?.[`${id}/${lastLens}`];
  return last && pages.includes(last) ? last : (pages[0] ?? "natal");
}

export function lastLanguage(store: Store | undefined = globalThis.localStorage): LanguageId {
  const id = read(store).lang;
  return id && LANGUAGES.some((l) => l.id === id) ? id : "astrology";
}

/** The languages of the registry in a remembered list, once each, in its order (a record from before `recent`: its last language). */
function recentOf(r: Remembered): LanguageId[] {
  const list: unknown[] = Array.isArray(r.recent) ? r.recent : r.lang ? [r.lang] : [];
  return list.filter(
    (id, i): id is LanguageId => LANGUAGES.some((l) => l.id === id) && list.indexOf(id) === i,
  );
}

/** The languages used on this device, the most recent first. */
export function recentLanguages(store: Store | undefined = globalThis.localStorage): LanguageId[] {
  return recentOf(read(store));
}

/**
 * The other languages offered as chips beside the language button: the last
 * used first, then the registry's order, so a first visit already shows
 * where Human Design and numerology are.
 */
export function chipLanguages(
  current: LanguageId,
  recent: readonly LanguageId[],
  count = 2,
): LanguageId[] {
  const used = recent.filter((id) => id !== current);
  const rest = LANGUAGES.map((l) => l.id).filter((id) => id !== current && !used.includes(id));
  return [...used, ...rest].slice(0, count);
}

/**
 * The picker's cards within one heading: in the registry's order, or (on a
 * phone, whose sheet shows the last two used first) the two used last first.
 */
export function pickerOrder(
  ids: readonly LanguageId[],
  recent: readonly LanguageId[],
  recentFirst: boolean,
): LanguageId[] {
  if (!recentFirst) return [...ids];
  const first = recent.filter((id) => ids.includes(id)).slice(0, 2);
  return [...first, ...ids.filter((id) => !first.includes(id))];
}

/** The 1.x address `/?studio=…&view=…` as a 2.0 path with its query (or undefined when it names no page). */
export function legacyStudioPath(
  search: { studio?: unknown; view?: unknown },
  locale: string = "en",
): { path: string; view?: StudioView } | undefined {
  const studio = search.studio;
  const view = search.view === "table" || search.view === "wheel" ? (search.view as StudioView) : undefined;
  if (studio === "table") return { path: PAGE_PATHS.natal, view: view ?? "table" };
  if (typeof studio !== "string" || !(studio in PAGE_PATHS)) return undefined;
  return { path: pagePath(studio as StudioPage, locale), view };
}
