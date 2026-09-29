/**
 * One day of the calendar (part 56 of the launch plan): the Moon, its sign
 * and void-of-course hours, the day's events and your exacts in time order,
 * and your slow transits in effect. Pure, shared by the day view and the
 * day's reading.
 */
import { moonAt, windowWeight, type MoonState } from "./calendar-sky";
import type { TransitWindow } from "./personal-transits";
import { skyEventId, type SkyEvent } from "./sky-events";
import type { SkyWindow } from "./sky-window";
import type { TimingHit } from "./types";

export type DayRow =
  | { kind: "sky"; t: number; id: string; ev: SkyEvent }
  | { kind: "you"; t: number; id: string; hit: TimingHit };

export type DayOverview = {
  /** The day's bounds, ms UTC (23 or 25 hours when the clocks change). */
  from: number;
  to: number;
  /** The Moon at local noon, or now on today. */
  moon: MoonState | null;
  /** The Moon's sign as the day begins. */
  signAtStart: number | null;
  /** The Moon's sign changes during the day (one at most). */
  ingresses: Extract<SkyEvent, { k: "ingress" }>[];
  /** The void-of-course spans that touch the day. */
  voids: Extract<SkyEvent, { k: "void" }>[];
  /** The day's own exact phase, or the next one. */
  phase: Extract<SkyEvent, { k: "phase" }> | null;
  /** The sky's events and your exacts of the day, in time order. */
  rows: DayRow[];
  /** Your slow transits within 1° at some point of the day, heaviest first. */
  effect: TransitWindow[];
};

/** Rarest first among events at the same minute; yours after the sky's. */
const ORDER: Record<string, number> = { eclipse: 0, phase: 1, station: 2, ingress: 3, aspect: 4, void: 5 };

export function dayOverview(
  day: { from: number; to: number; noon: number },
  events: readonly SkyEvent[],
  wins: readonly SkyWindow[],
  hits: readonly TimingHit[],
  windows: readonly TransitWindow[],
  nowMs: number,
): DayOverview {
  const { from, to } = day;
  const today = nowMs >= from && nowMs < to;
  const rows: DayRow[] = [];
  const ingresses: Extract<SkyEvent, { k: "ingress" }>[] = [];
  const voids: Extract<SkyEvent, { k: "void" }>[] = [];
  let phase: Extract<SkyEvent, { k: "phase" }> | null = null;
  for (const ev of events) {
    if (ev.k === "void" && ev.t < to && ev.end > from) voids.push(ev);
    if (ev.k === "phase" && ev.t >= from && !phase) phase = ev;
    if (ev.t < from || ev.t >= to) continue;
    if (ev.k === "ingress" && ev.body === "moon") ingresses.push(ev);
    rows.push({ kind: "sky", t: ev.t, id: `sky:${skyEventId(ev)}`, ev });
  }
  for (const hit of hits) {
    const t = Date.parse(hit.exactUtc);
    if (t >= from && t < to) rows.push({ kind: "you", t, id: `timing:${hit.id}`, hit });
  }
  const rank = (r: DayRow) => (r.kind === "you" ? 9 : (ORDER[r.ev.k] ?? 8));
  rows.sort((a, b) => a.t - b.t || rank(a) - rank(b));
  const start = moonAt(wins, from + 1);
  return {
    from,
    to,
    moon: moonAt(wins, today ? nowMs : day.noon),
    signAtStart: start ? start.sign : null,
    ingresses,
    voids,
    phase,
    rows,
    effect: windows.filter((w) => w.from < to && w.to >= from).sort((a, b) => windowWeight(b) - windowWeight(a)),
  };
}
