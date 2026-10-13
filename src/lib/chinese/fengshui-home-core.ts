/*
 * What a kept home is, without its rooms (reorganisation plan, R9, with the
 * languages plan's part 26): its id, its name, its facing as typed and where
 * it was read, the year it was built. The home record
 * (fengshui-home-record.ts) adds the rooms; the chart switcher and ⌘K list
 * the homes from this alone (studio/modes/fengshui-home-list.ts), so showing
 * a name never downloads the rooms' readings and the Flying Stars. One set of
 * rules for both: the same homes, in the same order, are read back either way.
 *
 * Pure; tested in scripts/chinese-fengshui-rooms.test.mjs.
 */

export type KeptSource = "compass" | "map" | "phone";

export type HomeCore = {
  id: string;
  /** The reader's name for it ("Home", "The cabin"); never empty. */
  name: string;
  /** The facing as typed ("172.5"), or "". */
  typed: string;
  source: KeptSource;
  /** The year as typed ("1998"), or "". */
  year: string;
  savedAt: number;
};

export const HOMES_MAX = 12;
export const HOME_NAME_MAX = 60;

const SOURCES: readonly KeptSource[] = ["compass", "map", "phone"];

/** A name as kept: one line, trimmed, at most HOME_NAME_MAX characters; the fallback when empty. */
export function cleanName(v: unknown, fallback: string): string {
  const s = typeof v === "string" ? v.replace(/\p{Cc}+/gu, " ").replace(/\s+/g, " ").trim() : "";
  return [...(s || fallback)].slice(0, HOME_NAME_MAX).join("");
}

/** One home as read back from the space or a backup, rooms aside, or null if it is not one. */
export function cleanHomeCore(v: unknown): HomeCore | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (typeof o.id !== "string" || !/^[\w-]{1,40}$/.test(o.id)) return null;
  return {
    id: o.id,
    name: cleanName(o.name, "—"),
    typed: typeof o.typed === "string" ? o.typed.slice(0, 12) : "",
    source: SOURCES.includes(o.source as KeptSource) ? (o.source as KeptSource) : "compass",
    year: typeof o.year === "string" ? o.year.slice(0, 4) : "",
    savedAt: typeof o.savedAt === "number" && Number.isFinite(o.savedAt) ? o.savedAt : 0,
  };
}

/**
 * The record's homes as read back, each by `clean`: well-formed ones only,
 * each id once, at most HOMES_MAX; and the home last open, if it is one of them.
 */
export function cleanHomeList<H extends { id: string }>(v: unknown, clean: (home: unknown) => H | null): { homes: H[]; activeId: string | null } {
  if (!v || typeof v !== "object") return { homes: [], activeId: null };
  const o = v as Record<string, unknown>;
  const homes: H[] = [];
  for (const h of Array.isArray(o.homes) ? o.homes : []) {
    const home = clean(h);
    if (home && !homes.some((x) => x.id === home.id)) homes.push(home);
    if (homes.length >= HOMES_MAX) break;
  }
  const activeId = typeof o.activeId === "string" && homes.some((h) => h.id === o.activeId) ? o.activeId : null;
  return { homes, activeId };
}
