/**
 * The calendar's sky, day by day (part 55 of the launch plan): the events of
 * the chunks at hand, the Moon as it looks at a moment, the void-of-course
 * span in force, and which events a day cell shows first. Pure: the chunks
 * come from window-cache.ts.
 */
import type { TransitWindow } from "./personal-transits";
import { seasonOf, skyEventId, type SkyEvent } from "./sky-events";
import { bodyAt, covers, type SkyWindow } from "./sky-window";

const wrap360 = (x: number) => ((x % 360) + 360) % 360;

/** Every event of the chunks, once each, in time order. */
export function eventsOf(wins: readonly SkyWindow[]): SkyEvent[] {
  const seen = new Set<string>();
  const out: SkyEvent[] = [];
  for (const w of wins) {
    for (const ev of w.events ?? []) {
      const id = skyEventId(ev);
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(ev);
    }
  }
  return out.sort((a, b) => a.t - b.t);
}

export type MoonState = {
  /** The Moon's distance past the Sun along the ecliptic, 0–360°. */
  elong: number;
  /** Share of its disc lit, 0–1 (from the elongation). */
  lit: number;
  /** Its sign, 0 = Aries. */
  sign: number;
};

/** The Moon at a moment, from the chunks' curve; null when no chunk holds it. */
export function moonAt(wins: readonly SkyWindow[], ms: number): MoonState | null {
  const w = wins.find((x) => covers(x, ms));
  if (!w) return null;
  const m = bodyAt(w, "moon", ms);
  const s = bodyAt(w, "sun", ms);
  if (!m || !s) return null;
  const elong = wrap360(m.lon - s.lon);
  return { elong, lit: (1 - Math.cos((elong * Math.PI) / 180)) / 2, sign: Math.floor(wrap360(m.lon) / 30) };
}

/** The void-of-course span in force at `ms`, if any. */
export function voidAt(events: readonly SkyEvent[], ms: number): Extract<SkyEvent, { k: "void" }> | null {
  for (const ev of events) if (ev.k === "void" && ev.t <= ms && ms < ev.end) return ev;
  return null;
}

/** The Moon's next sign change after `ms`. */
export function nextMoonIngress(events: readonly SkyEvent[], ms: number): Extract<SkyEvent, { k: "ingress" }> | null {
  for (const ev of events) if (ev.k === "ingress" && ev.body === "moon" && ev.t > ms) return ev;
  return null;
}

/** Slowest first, for sign changes on the same day. */
const SLOWEST = ["pluto", "neptune", "uranus", "saturn", "jupiter", "chiron", "northnode", "mars", "venus", "sun", "mercury"];

/** The events a day cell and the Now panel name (not the Moon's own, nor aspects and void spans). */
export function isHeadline(ev: SkyEvent): boolean {
  return ev.k === "eclipse" || ev.k === "station" || ev.k === "phase" || (ev.k === "ingress" && ev.body !== "moon");
}

/** Rarest first: eclipse, station, equinox or solstice, phase, then sign changes, slowest planet first. */
export function headlineRank(ev: SkyEvent): number {
  if (ev.k === "eclipse") return 0;
  if (ev.k === "station") return 1;
  if (seasonOf(ev) != null) return 2;
  if (ev.k === "phase") return 3;
  if (ev.k === "ingress") return 4 + Math.max(0, SLOWEST.indexOf(ev.body));
  return 99;
}

const SLOW_WEIGHT: Record<string, number> = { pluto: 6, neptune: 5, uranus: 5, saturn: 4, chiron: 3, jupiter: 2, northnode: 1 };
const ASPECT_WEIGHT: Record<string, number> = { conjunction: 3, opposition: 2.5, square: 2, trine: 1, sextile: 0.5 };

/** The selection id of a slow transit's window. */
export function windowId(w: Pick<TransitWindow, "moving" | "type" | "natal" | "from">): string {
  return `win:${w.moving}:${w.type}:${w.natal}:${w.from}`;
}

/** Heavier first, for the slow transits in effect: the slower body, the harder contact. */
export function windowWeight(w: Pick<TransitWindow, "moving" | "type">): number {
  return (SLOW_WEIGHT[w.moving] ?? 0) + (ASPECT_WEIGHT[w.type] ?? 0);
}

/**
 * Several event lists as one, in time order, each event once: the same event
 * found in a chunk and in a year file (the two searches can land a
 * millisecond apart) counts once.
 */
export function mergeEvents(...lists: ReadonlyArray<readonly SkyEvent[]>): SkyEvent[] {
  const all = lists.flat().sort((a, b) => a.t - b.t);
  const last = new Map<string, number>();
  const out: SkyEvent[] = [];
  for (const ev of all) {
    const id = skyEventId(ev);
    const key = ev.k === "void" ? id : id.slice(0, id.lastIndexOf("-"));
    const seen = last.get(key);
    if (seen != null && ev.t - seen < 60_000) continue;
    last.set(key, ev.t);
    out.push(ev);
  }
  return out;
}

/** The first event after `ms` that passes `test` (events in time order). */
export function nextEvent<K extends SkyEvent["k"]>(
  events: readonly SkyEvent[],
  ms: number,
  kind: K,
  test: (ev: Extract<SkyEvent, { k: K }>) => boolean = () => true,
): Extract<SkyEvent, { k: K }> | null {
  for (const ev of events) {
    if (ev.t <= ms || ev.k !== kind) continue;
    const e = ev as Extract<SkyEvent, { k: K }>;
    if (test(e)) return e;
  }
  return null;
}
