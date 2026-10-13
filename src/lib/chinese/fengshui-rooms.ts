/*
 * The rooms of a home on Feng Shui's home page (languages plan, part 26:
 * "rooms and the home record"): which room stands in which of the nine
 * palaces, and how the schools read a room against its palace's stars.
 *
 *   - A quiet room (a bedroom, a child's room) is read by its palace's
 *     mountain star, which the classics tie to the people of the home,
 *     their rest and their bonds.
 *   - A room of activity (the entrance, the living room, the dining room,
 *     the kitchen, an office) is read by the water star, tied to what flows
 *     in: work, exchanges, income.
 *   - A room of passage (a bathroom, storage, a garage) is one the schools
 *     are glad to find where the stars are out of season, keeping the timely
 *     ones for the rooms that are lived in.
 *
 * A star "in its season" is a timely one (fengshui-stars.ts, starState).
 * What Ulune says of it is a suggestion with its reason, never a rule.
 * Pure; tested in scripts/chinese-fengshui-rooms.test.mjs.
 */
import type { PeriodId } from "./fengshui-home";
import { FLIGHT, starState, type FlyingChart, type PalaceId, type StarNumber } from "./fengshui-stars";

export type RoomKind = "entrance" | "living" | "dining" | "kitchen" | "office" | "bedroom" | "children" | "bathroom" | "storage";
export type RoomUse = "quiet" | "active" | "passage";

export const ROOM_KINDS: readonly { id: RoomKind; use: RoomUse }[] = [
  { id: "entrance", use: "active" },
  { id: "living", use: "active" },
  { id: "dining", use: "active" },
  { id: "kitchen", use: "active" },
  { id: "office", use: "active" },
  { id: "bedroom", use: "quiet" },
  { id: "children", use: "quiet" },
  { id: "bathroom", use: "passage" },
  { id: "storage", use: "passage" },
];

const USE = new Map(ROOM_KINDS.map((k) => [k.id, k.use]));
export const roomUse = (kind: RoomKind): RoomUse => USE.get(kind)!;
export const isRoomKind = (v: unknown): v is RoomKind => typeof v === "string" && USE.has(v as RoomKind);
export const isPalace = (v: unknown): v is PalaceId => typeof v === "string" && (FLIGHT as readonly string[]).includes(v);

/** A room placed in a palace; `id` tells two rooms of a kind apart. */
export type HomeRoom = { id: string; kind: RoomKind; palace: PalaceId };

/** Enough for a large home; more is most likely a mistake. */
export const ROOMS_MAX = 40;

/**
 * How a room sits with its palace's stars:
 *   - "suits": the star that reads it is timely;
 *   - "elsewhere": it is not, but the palace's other star is (a quiet room
 *     where the water star is timely, a busy one where the mountain star is);
 *   - "neither": neither star is timely;
 *   - for a room of passage, "free" (no timely star spent on it) or "spends"
 *     (a timely star the schools would keep for a lived-in room).
 */
export type RoomFit = {
  use: RoomUse;
  /** The star that reads the room (for a room of passage, the timely one if any, the mountain first). */
  reads: "mountain" | "water";
  n: StarNumber;
  /** The palace's other star, when the fit turns on it. */
  other: StarNumber | null;
  fit: "suits" | "elsewhere" | "neither" | "free" | "spends";
};

export function roomFit(kind: RoomKind, chart: FlyingChart, palace: PalaceId, now: PeriodId): RoomFit {
  const x = chart.palaces[palace];
  const timely = (n: StarNumber) => starState(n, now).state === "timely";
  const use = roomUse(kind);
  if (use === "passage") {
    if (timely(x.mountain)) return { use, reads: "mountain", n: x.mountain, other: null, fit: "spends" };
    if (timely(x.water)) return { use, reads: "water", n: x.water, other: null, fit: "spends" };
    return { use, reads: "mountain", n: x.mountain, other: null, fit: "free" };
  }
  const reads = use === "quiet" ? "mountain" : "water";
  const n = reads === "mountain" ? x.mountain : x.water;
  const other = reads === "mountain" ? x.water : x.mountain;
  if (timely(n)) return { use, reads, n, other: null, fit: "suits" };
  if (timely(other)) return { use, reads, n, other, fit: "elsewhere" };
  return { use, reads, n, other: null, fit: "neither" };
}

/** The rooms in a palace, in the order they were placed. */
export const roomsIn = (rooms: readonly HomeRoom[], palace: PalaceId): HomeRoom[] => rooms.filter((r) => r.palace === palace);

/** A room's id: short, random, from the browser's secure generator. */
export function newRoomId(): string {
  const b = new Uint8Array(6);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

/** Rooms as read back from the private space or a backup: only well-formed ones, at most ROOMS_MAX, each id once. */
export function cleanRooms(v: unknown): HomeRoom[] {
  if (!Array.isArray(v)) return [];
  const out: HomeRoom[] = [];
  for (const r of v) {
    if (!r || typeof r !== "object") continue;
    const { id, kind, palace } = r as Record<string, unknown>;
    if (typeof id !== "string" || !/^[\w-]{1,40}$/.test(id) || !isRoomKind(kind) || !isPalace(palace)) continue;
    if (out.some((o) => o.id === id)) continue;
    out.push({ id, kind, palace });
    if (out.length >= ROOMS_MAX) break;
  }
  return out;
}
