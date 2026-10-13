/*
 * The home record (languages plan, part 26): what the reader gave on Feng
 * Shui's home page, kept in the private space when they choose to keep it.
 * The facing as typed and where it was read, the year it was built, the
 * rooms. Sealed in the space like a chart (lib/space/vault.ts) under one
 * record, `fs/homes`; never in the browser's plain storage, never sent.
 * Everything else (the mountains, the period, the stars) is worked out again
 * from it, never stored.
 *
 * Pure; tested in scripts/chinese-fengshui-rooms.test.mjs.
 */
import { cleanRooms, type HomeRoom } from "./fengshui-rooms";

export type KeptSource = "compass" | "map" | "phone";

export type KeptHome = {
  id: string;
  /** The reader's name for it ("Home", "The cabin"); never empty. */
  name: string;
  /** The facing as typed ("172.5"), or "". */
  typed: string;
  source: KeptSource;
  /** The year as typed ("1998"), or "". */
  year: string;
  rooms: HomeRoom[];
  savedAt: number;
};

export type HomesRecord = { homes: KeptHome[]; activeId: string | null };

export const HOMES_MAX = 12;
export const HOME_NAME_MAX = 60;
export const EMPTY_HOMES: HomesRecord = { homes: [], activeId: null };

const SOURCES: readonly KeptSource[] = ["compass", "map", "phone"];

/** A name as kept: one line, trimmed, at most HOME_NAME_MAX characters; the fallback when empty. */
export function cleanName(v: unknown, fallback: string): string {
  const s = typeof v === "string" ? v.replace(/\p{Cc}+/gu, " ").replace(/\s+/g, " ").trim() : "";
  return [...(s || fallback)].slice(0, HOME_NAME_MAX).join("");
}

/** One home as read back from the space or a backup, or null if it is not one. */
export function cleanHome(v: unknown): KeptHome | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (typeof o.id !== "string" || !/^[\w-]{1,40}$/.test(o.id)) return null;
  const typed = typeof o.typed === "string" ? o.typed.slice(0, 12) : "";
  const year = typeof o.year === "string" ? o.year.slice(0, 4) : "";
  return {
    id: o.id,
    name: cleanName(o.name, "—"),
    typed,
    source: SOURCES.includes(o.source as KeptSource) ? (o.source as KeptSource) : "compass",
    year,
    rooms: cleanRooms(o.rooms),
    savedAt: typeof o.savedAt === "number" && Number.isFinite(o.savedAt) ? o.savedAt : 0,
  };
}

/** The record as read back: well-formed homes only, each id once, at most HOMES_MAX. */
export function cleanHomes(v: unknown): HomesRecord {
  if (!v || typeof v !== "object") return EMPTY_HOMES;
  const o = v as Record<string, unknown>;
  const homes: KeptHome[] = [];
  for (const h of Array.isArray(o.homes) ? o.homes : []) {
    const home = cleanHome(h);
    if (home && !homes.some((x) => x.id === home.id)) homes.push(home);
    if (homes.length >= HOMES_MAX) break;
  }
  const activeId = typeof o.activeId === "string" && homes.some((h) => h.id === o.activeId) ? o.activeId : null;
  return { homes, activeId };
}

/**
 * A backup's homes joining the space's: those it doesn't hold, and those it
 * holds in an older state (a home is the same home by its id). This space's
 * choice of home stays. Returns null when nothing changes.
 */
export function joinHomes(ours: HomesRecord, theirs: HomesRecord): HomesRecord | null {
  const homes = [...ours.homes];
  let changed = false;
  for (const h of theirs.homes) {
    const i = homes.findIndex((x) => x.id === h.id);
    if (i < 0) {
      if (homes.length >= HOMES_MAX) continue;
      homes.push(h);
      changed = true;
    } else if (homes[i]!.savedAt < h.savedAt) {
      homes[i] = h;
      changed = true;
    }
  }
  return changed ? { homes, activeId: ours.activeId } : null;
}

/** A home put in the record (added, or replacing the one with its id), and made the one open. */
export function putHome(rec: HomesRecord, home: KeptHome): HomesRecord {
  const i = rec.homes.findIndex((h) => h.id === home.id);
  const homes = i < 0 ? [...rec.homes, home].slice(-HOMES_MAX) : rec.homes.map((h, j) => (j === i ? home : h));
  return { homes, activeId: home.id };
}

/** A home taken out of the record. */
export function dropHome(rec: HomesRecord, id: string): HomesRecord {
  return { homes: rec.homes.filter((h) => h.id !== id), activeId: rec.activeId === id ? null : rec.activeId };
}
