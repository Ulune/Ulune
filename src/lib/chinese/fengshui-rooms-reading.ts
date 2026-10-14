/*
 * What a palace's reading says of the rooms placed in it (languages plan,
 * part 26): "In this palace: your kitchen and your bathroom.", then, for
 * each kind of room, how the schools read it against the palace's stars.
 */
import type { PeriodId } from "./fengshui-home";
import { starOf, starState, type FlyingChart, type PalaceId } from "./fengshui-stars";
import { roomFit, roomsIn, type HomeRoom, type RoomKind } from "./fengshui-rooms";
import { ROOMS_HERE, ROOM_FIT_TEXTS, ROOM_NAMES } from "./fengshui-rooms-texts";
import { cnWord } from "./words";
import { said } from "./both";

export const roomName = (kind: RoomKind, locale: string): string => said(ROOM_NAMES[kind].name, locale);
export const roomShort = (kind: RoomKind, locale: string): string => said(ROOM_NAMES[kind].short, locale);
export const roomYours = (kind: RoomKind, locale: string): string => said(ROOM_NAMES[kind].yours, locale);

/** "your kitchen and your bathroom", « votre cuisine et votre salle d’eau ». */
export function listWords(items: readonly string[], locale: string): string {
  return new Intl.ListFormat(locale === "fr" ? "fr" : "en-GB", { type: "conjunction" }).format(items);
}

/** The rooms of a palace for its label on the figure: "Bedroom ×2 · Bath", the first two kinds and how many more. */
export function roomsLabel(rooms: readonly HomeRoom[], palace: PalaceId, locale: string): string {
  const counts = new Map<RoomKind, number>();
  for (const r of roomsIn(rooms, palace)) counts.set(r.kind, (counts.get(r.kind) ?? 0) + 1);
  const parts = [...counts].map(([k, n]) => `${roomShort(k, locale)}${n > 1 ? ` ×${n}` : ""}`);
  return parts.length > 2 ? `${parts[0]} +${parts.length - 1}` : parts.join(" · ");
}

const starWord = (n: number, locale: string) => (locale === "fr" ? starOf(n).fr : starOf(n).en);

function stateWord(n: number, now: PeriodId, locale: string): string {
  const s = starState(n as 1, now);
  return cnWord(locale, s.state === "timely" ? (s.current ? "fssStateCurrent" : "fssStateComing") : s.state === "waning" ? "fssStateWaning" : "fssStateDormant");
}

/** The lines a palace's reading gains from its rooms: who is here, then one line per kind of room. Empty without rooms. */
export function roomLines(c: FlyingChart, palace: PalaceId, rooms: readonly HomeRoom[], now: PeriodId, locale: string): string[] {
  const here = roomsIn(rooms, palace);
  if (!here.length) return [];
  const kinds = [...new Set(here.map((r) => r.kind))];
  const named = kinds.map((k) => {
    const n = here.filter((r) => r.kind === k).length;
    return n > 1 ? said(ROOM_NAMES[k].yoursMany, locale).replace("{n}", String(n)) : roomYours(k, locale);
  });
  const out = [said(ROOMS_HERE, locale).replace("{list}", listWords(named, locale))];
  for (const kind of kinds) {
    const f = roomFit(kind, c, palace, now);
    const text = ROOM_FIT_TEXTS[`${f.use}-${f.fit}`];
    if (!text) continue;
    out.push(
      said(text, locale)
        .replace("{room}", roomYours(kind, locale))
        .replace("{star}", starWord(f.n, locale))
        .replace("{state}", stateWord(f.n, now, locale))
        .replace("{other}", f.other == null ? "" : starWord(f.other, locale))
        .replace("{now}", String(now)),
    );
  }
  return out;
}
