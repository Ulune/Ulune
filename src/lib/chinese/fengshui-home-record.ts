/*
 * The home record (languages plan, part 26): what the reader gave on Feng
 * Shui's home page, kept in the private space when they choose to keep it.
 * The facing as typed and where it was read, the year it was built, the
 * rooms. Sealed in the space like a chart (lib/space/vault.ts) under one
 * record, `fs/homes`; never in the browser's plain storage, never sent.
 * Everything else (the mountains, the period, the stars) is worked out again
 * from it, never stored.
 *
 * A home without its rooms, and the rules a home is read back by, are in
 * fengshui-home-core.ts (reorganisation plan, R9): the chart switcher lists
 * the homes from those alone.
 *
 * Pure; tested in scripts/chinese-fengshui-rooms.test.mjs.
 */
import { cleanHomeCore, cleanHomeList, HOMES_MAX, type HomeCore } from "./fengshui-home-core";
import { cleanRooms, type HomeRoom } from "./fengshui-rooms";

export { HOMES_MAX, HOME_NAME_MAX, cleanName, type KeptSource } from "./fengshui-home-core";

export type KeptHome = HomeCore & { rooms: HomeRoom[] };

export type HomesRecord = { homes: KeptHome[]; activeId: string | null };

export const EMPTY_HOMES: HomesRecord = { homes: [], activeId: null };

/** One home as read back from the space or a backup, or null if it is not one. */
export function cleanHome(v: unknown): KeptHome | null {
  const core = cleanHomeCore(v);
  return core ? { ...core, rooms: cleanRooms((v as Record<string, unknown>).rooms) } : null;
}

/** The record as read back: well-formed homes only, each id once, at most HOMES_MAX. */
export function cleanHomes(v: unknown): HomesRecord {
  return cleanHomeList(v, cleanHome);
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
