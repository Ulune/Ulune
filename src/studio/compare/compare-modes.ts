import type { CompareMoment, CompareRecord } from "@/lib/space/records";
import { LANGUAGES, languageOf, lensOf, lensesOf, pagesOf, type LanguageId } from "@/studio/map";
import { STUDIO_PAGES, type StudioPage } from "@/studio/url";
import { comparablePage } from "@/studio/compare/comparable";
import { WHO, type Who } from "@/studio/compare/linked";

/*
 * Compare's three ways (share and compare plan, ideas B7 and B8), chosen in
 * its bar: people (A, the chart shown, with one to three others: "Two
 * people" became "People"), one person in two languages (A's chart beside
 * itself in another language), and one chart at two moments (A's chart
 * beside its language's Cycles page at a moment of B's own). Which panes
 * each way shows, which page and moment B draws, how a kept record is read
 * back (sealed in the space with the rest of Compare, state/compare, it is
 * still read with care), and how the panes stand on the screen. Pure, no
 * browser: the view and the unit tests (scripts/compare.test.mjs) read it.
 */

export type CompareMode = "people" | "languages" | "moments";
export const MODES: readonly CompareMode[] = ["people", "languages", "moments"];

/** At most this many charts side by side (idea B8): A and three others. */
export const MAX_PEOPLE = 4;

/** The way kept, read with care (a record from before ideas B7 and B8 has none: people). */
export function modeOf(raw: unknown): CompareMode {
  return MODES.includes(raw as CompareMode) ? (raw as CompareMode) : "people";
}

/** C and D as kept: chart ids, at most two, none twice, never A or B, each still among the charts. */
export function morePeople(raw: unknown, ids: readonly string[], aId: string | null, bId: string | null): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const id of raw) {
    if (typeof id !== "string" || id === aId || id === bId || out.includes(id) || !ids.includes(id)) continue;
    out.push(id);
    if (out.length === MAX_PEOPLE - 2) break;
  }
  return out;
}

/** The panes a way shows, in order: A and B, with C and D for three or four people. */
export function panesOf(mode: CompareMode, more: number): Who[] {
  return mode === "people" ? WHO.slice(0, 2 + Math.max(0, Math.min(MAX_PEOPLE - 2, more))) : ["a", "b"];
}

/** The pages Compare shows in a language, in its lenses' order: its Natal and Cycles pages. */
export function comparablePagesOf(lang: LanguageId): StudioPage[] {
  return lensesOf(lang)
    .flatMap((lens) => pagesOf(lang, lens))
    .filter(comparablePage);
}

/** Every page Compare shows, language by language (the picker of the two languages' panes). */
export function comparableByLanguage(): { lang: LanguageId; pages: StudioPage[] }[] {
  return LANGUAGES.map((l) => ({ lang: l.id, pages: comparablePagesOf(l.id) })).filter((g) => g.pages.length > 0);
}

/**
 * One person, two languages: B's page beside A's. The one kept, when it is a
 * page Compare shows in another language than A's; else Human Design beside
 * astrology, and astrology's Natal beside every other language.
 */
export function languagesPageOf(aPage: StudioPage, kept: unknown): StudioPage {
  const lang = languageOf(aPage);
  if (typeof kept === "string" && (STUDIO_PAGES as readonly string[]).includes(kept)) {
    const page = kept as StudioPage;
    if (comparablePage(page) && languageOf(page) !== lang) return page;
  }
  return lang === "astrology" ? "design" : "natal";
}

/** A language's Cycles pages Compare shows: none, no two moments in it. */
export function cyclesPagesOf(lang: LanguageId | undefined): StudioPage[] {
  return lang ? pagesOf(lang, "cycles").filter(comparablePage) : [];
}

/** One chart, two moments: B's page, its language's Cycles page (the one kept, if it is one of them), or null where the language has none. */
export function momentsPageOf(aPage: StudioPage, kept: unknown): StudioPage | null {
  const pages = cyclesPagesOf(languageOf(aPage));
  if (!pages.length) return null;
  if (pages.includes(kept as StudioPage)) return kept as StudioPage;
  // Beside a Cycles page, the same page at another moment; beside the Natal page, the first Cycles page.
  return pages.includes(aPage) ? aPage : pages[0]!;
}

/** The two moments can be shown from this page: its language has a Cycles page. */
export const canMoments = (page: StudioPage): boolean => momentsPageOf(page, null) != null;

/** How many years on B starts when both panes show the same Cycles page: one, or a luck pillar's ten in BaZi. */
const STEP_YEARS: Partial<Record<StudioPage, number>> = { "bazi-luck": 10 };
const YEAR_MS = 365.2425 * 86_400_000;

/** B's moment as two moments start: now (beside the Natal page), or a step on beside the same Cycles page, so the two differ. */
export function startMoment(aPage: StudioPage, bPage: StudioPage, now: number): CompareMoment {
  const years = aPage === bPage ? (STEP_YEARS[bPage] ?? 1) : 0;
  const at = years ? Math.round(now + years * YEAR_MS) : now;
  return { page: bPage, at, live: years === 0, progressionTarget: at, year: years ? new Date(now).getFullYear() + years : null, month: null };
}

/** The years a kept moment may hold (the ephemeris's span). */
const FIRST_YEAR = 1800;
const LAST_YEAR = 2399;
const SPAN = { min: Date.UTC(FIRST_YEAR, 0, 1), max: Date.UTC(LAST_YEAR, 11, 31) };

const instant = (raw: unknown, fallback: number): number => (typeof raw === "number" && Number.isFinite(raw) && raw >= SPAN.min && raw <= SPAN.max ? raw : fallback);

/**
 * A kept moment, read with care: its page must be a Cycles page Compare
 * shows, its instants within the ephemeris's years, its year a whole year in
 * them and its month one of the twelve; else none (B starts afresh).
 */
export function momentOf(raw: unknown, now: number): CompareMoment | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  const page = m.page as StudioPage;
  if (!(STUDIO_PAGES as readonly string[]).includes(page as string) || !comparablePage(page) || lensOf(page) !== "cycles") return null;
  const year = Number.isInteger(m.year) && (m.year as number) >= FIRST_YEAR && (m.year as number) <= LAST_YEAR ? (m.year as number) : null;
  const month = Number.isInteger(m.month) && (m.month as number) >= 0 && (m.month as number) <= 11 ? (m.month as number) : null;
  const live = m.live === true;
  return { page, at: live ? now : instant(m.at, now), live, progressionTarget: instant(m.progressionTarget, now), year, month: year == null ? null : month };
}

/** Compare as kept, its way's choices read with care (the view's; a choice that no longer holds is dropped). */
export type CompareWay = { mode: CompareMode; more: string[]; langPage: StudioPage; momentPage: StudioPage | null };

export function wayOf(record: CompareRecord, page: StudioPage, ids: readonly string[], aId: string | null, bId: string | null): CompareWay {
  const mode = modeOf(record.mode);
  return {
    // Two moments where A's language has no Cycles page: two people.
    mode: mode === "moments" && !canMoments(page) ? "people" : mode,
    more: morePeople(record.more, ids, aId, bId),
    langPage: languagesPageOf(page, record.langPage),
    momentPage: momentsPageOf(page, record.moment?.page),
  };
}

/* ---- How the panes stand: the arrangement that draws each chart largest ---- */

/** Each chart keeps at least this much beside the side panel, three or four of them drawn small (the owner's rule keeps 420 px for two). */
export const SMALL_MIN = 300;

export type Arrangement = { cols: number; rows: number; cell: number };

/**
 * Three or four charts in a box of w × h: a row (three or four side by side)
 * or a grid of two by two, whichever draws each larger (a wide, low screen
 * takes the row, a laptop the grid); a third chart in the grid takes its
 * row's width. Two charts stand side by side, as before.
 */
export function arrange(n: number, w: number, h: number): Arrangement {
  const size = (cols: number, rows: number) => Math.min(w / cols, h / rows);
  if (n <= 2) return { cols: Math.max(1, n), rows: 1, cell: size(Math.max(1, n), 1) };
  const row = size(n, 1);
  const grid = size(2, 2);
  return row > grid ? { cols: n, rows: 1, cell: row } : { cols: 2, rows: 2, cell: grid };
}

/**
 * Whether the reading stays in the side panel (each chart keeps its room
 * beside it) or comes up from the bottom: two charts keep about 490 px of
 * pane each (the owner's 420 px of figure), three or four SMALL_MIN. `was`:
 * where it stood, kept within a few pixels of the line so that it does not
 * go to and fro.
 */
export function readingBeside(n: number, bodyW: number, h: number, panelW: number, paneMin: number, was?: boolean): boolean {
  if (n <= 2) return (bodyW - panelW) / 2 >= paneMin;
  return arrange(n, bodyW - panelW, h).cell >= SMALL_MIN - (was ? 16 : 0);
}
