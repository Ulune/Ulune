import { pagePath } from "./map";

export const STUDIO_PAGES = [
  "natal",
  "transits",
  "timing",
  "synastry",
  "composite",
  "progressions",
  "numerology",
  "design",
] as const;

export type StudioPage = (typeof STUDIO_PAGES)[number];
export type StudioView = "wheel" | "table";

export type StudioSearch = {
  studio?: StudioPage;
  view?: StudioView;
  bodies?: string;
  look?: string;
  __throw?: "stage";
};

const KEY = "ulune.studio.page";
const VIEW_KEY = "ulune.studio.view";

export function isStudioPage(value: unknown): value is StudioPage {
  return typeof value === "string" && (STUDIO_PAGES as readonly string[]).includes(value);
}

export function isStudioView(value: unknown): value is StudioView {
  return value === "wheel" || value === "table";
}

/** `?studio=table` aliases natal + view=table. Unknown studio → natal. */
export function parseStudioSearch(search: Record<string, unknown>): StudioSearch {
  const view = isStudioView(search.view) ? search.view : undefined;
  // A test hook for the stage's error slot (scripts/e2e/shell.mjs): development only.
  const thrown = import.meta.env.DEV && search.__throw === "stage" ? ("stage" as const) : undefined;
  const bodies = typeof search.bodies === "string" ? search.bodies : undefined;
  const look = typeof search.look === "string" ? search.look : undefined;
  const extra: StudioSearch = {};
  if (thrown) extra.__throw = thrown;
  if (bodies) extra.bodies = bodies;
  if (look) extra.look = look;
  if (search.studio === "table") {
    return { studio: "natal", view: view ?? "table", ...extra };
  }
  if (isStudioPage(search.studio)) {
    return view ? { studio: search.studio, view, ...extra } : { studio: search.studio, ...extra };
  }
  if (view) return { view, ...extra };
  return extra;
}

/**
 * A studio page's address: its path (src/studio/map.ts) and what the query
 * still carries (the Table view, the dock's pages, a test hook). Natal stays
 * on `/` when that is where the reader is: the first screen keeps its address.
 */
export function studioHref(
  page: StudioPage,
  view: StudioView,
  opts: { locale?: string; here?: string; bodies?: string; look?: string; thrown?: "stage" } = {},
): string {
  const atRoot = (opts.here ?? "").replace(/\/+$/, "") === "";
  const path = page === "natal" && atRoot ? "/" : pagePath(page, opts.locale);
  const q = new URLSearchParams();
  if (view === "table") q.set("view", "table");
  if (opts.thrown) q.set("__throw", opts.thrown);
  if (opts.bodies) q.set("bodies", opts.bodies);
  if (opts.look) q.set("look", opts.look);
  const query = q.toString();
  return query ? `${path}?${query}` : path;
}

export function loadStudioPage(): StudioPage {
  if (typeof window === "undefined") return "natal";
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === "table") return "natal";
    if (isStudioPage(raw)) return raw;
  } catch {
    /* ignore */
  }
  return "natal";
}

export function saveStudioPage(page: StudioPage) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, page);
  } catch {
    /* quota / private */
  }
}

export function loadStudioView(): StudioView {
  if (typeof window === "undefined") return "wheel";
  try {
    const raw = window.localStorage.getItem(VIEW_KEY);
    if (isStudioView(raw)) return raw;
  } catch {
    /* ignore */
  }
  return "wheel";
}

export function saveStudioView(view: StudioView) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(VIEW_KEY, view);
  } catch {
    /* quota / private */
  }
}
