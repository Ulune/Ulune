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
export type ModeGroupId = "chart" | "time" | "pair" | "systems";

export const MODE_GROUPS = [
  { id: "chart", pages: ["natal"] },
  { id: "time", pages: ["transits", "timing", "progressions"] },
  { id: "pair", pages: ["synastry", "composite"] },
  { id: "systems", pages: ["design", "numerology"] },
] as const satisfies readonly { id: ModeGroupId; pages: readonly StudioPage[] }[];

export type StudioSearch = {
  studio?: StudioPage;
  view?: StudioView;
  bodies?: string;
  look?: string;
  num?: string;
  numa?: string;
  numb?: string;
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

export function groupOf(page: StudioPage): ModeGroupId {
  const hit = MODE_GROUPS.find((g) => (g.pages as readonly string[]).includes(page));
  return hit?.id ?? "chart";
}

/** `?studio=table` aliases natal + view=table. Unknown studio → natal. */
export function parseStudioSearch(search: Record<string, unknown>): StudioSearch {
  const view = isStudioView(search.view) ? search.view : undefined;
  // A test hook for the stage's error slot (scripts/e2e/shell.mjs): development only.
  const thrown = import.meta.env.DEV && search.__throw === "stage" ? ("stage" as const) : undefined;
  const bodies = typeof search.bodies === "string" ? search.bodies : undefined;
  const look = typeof search.look === "string" ? search.look : undefined;
  const num = typeof search.num === "string" ? search.num : undefined;
  const numa = typeof search.numa === "string" ? search.numa : undefined;
  const numb = typeof search.numb === "string" ? search.numb : undefined;
  const extra: StudioSearch = {};
  if (thrown) extra.__throw = thrown;
  if (bodies) extra.bodies = bodies;
  if (look) extra.look = look;
  if (num) extra.num = num;
  if (numa) extra.numa = numa;
  if (numb) extra.numb = numb;
  if (search.studio === "table") {
    return { studio: "natal", view: view ?? "table", ...extra };
  }
  if (isStudioPage(search.studio)) {
    return view ? { studio: search.studio, view, ...extra } : { studio: search.studio, ...extra };
  }
  if (view) return { view, ...extra };
  return extra;
}

export function studioSearch(
  page: StudioPage,
  view: StudioView,
  thrown?: "stage",
  bodies?: string,
  look?: string,
  num?: string,
  numa?: string,
  numb?: string,
): StudioSearch {
  const search: StudioSearch = {};
  if (page !== "natal") search.studio = page;
  if (view === "table") search.view = "table";
  if (thrown) search.__throw = thrown;
  if (bodies) search.bodies = bodies;
  if (look) search.look = look;
  if (num) search.num = num;
  if (numa) search.numa = numa;
  if (numb) search.numb = numb;
  return search;
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
