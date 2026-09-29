/**
 * The calendar's rows for a period (part 57 of the launch plan): the sky's
 * events and your exacts in time order, filtered, for the events table and
 * the calendar file; with your numerology's long cycles changing on
 * birthdays (part 62), yours too.
 */
import type { NumerologyCalendar } from "./numerology-calendar";
import { skyEventId, type SkyEvent } from "./sky-events";
import type { TimingHit } from "./types";

/** A long cycle changing on a birthday, with the start of that day (ms UTC, in the calendar's clock). */
export type NumRow = { kind: "num"; t: number; id: string; change: NumerologyCalendar["changes"][number] };

export type CalRow =
  | { kind: "sky"; t: number; id: string; ev: SkyEvent }
  | { kind: "you"; t: number; id: string; hit: TimingHit }
  | NumRow;

/** The Moon's own events (its sign changes, aspects and void-of-course spans): many, and the day view's. */
export function isMoonOwn(ev: SkyEvent): boolean {
  return (ev.k === "ingress" && ev.body === "moon") || ev.k === "void" || (ev.k === "aspect" && (ev.a === "moon" || ev.b === "moon"));
}

export function calendarRows(
  events: readonly SkyEvent[],
  hits: readonly TimingHit[],
  from: number,
  to: number,
  opts: { sky: boolean; yours: boolean; moon: boolean },
  /** Numerology's changes, already placed in the calendar's clock. */
  num: readonly NumRow[] = [],
): CalRow[] {
  const rows: CalRow[] = [];
  if (opts.sky) {
    for (const ev of events) {
      if (ev.t < from || ev.t >= to) continue;
      if (!opts.moon && isMoonOwn(ev)) continue;
      rows.push({ kind: "sky", t: ev.t, id: `sky:${skyEventId(ev)}`, ev });
    }
  }
  if (opts.yours) {
    const seen = new Set<string>();
    for (const hit of hits) {
      const t = Date.parse(hit.exactUtc);
      if (t < from || t >= to || seen.has(hit.id)) continue;
      if (!opts.moon && hit.moving === "moon") continue;
      seen.add(hit.id);
      rows.push({ kind: "you", t, id: `timing:${hit.id}`, hit });
    }
  }
  if (opts.yours) for (const r of num) if (r.t >= from && r.t < to) rows.push(r);
  const rank = { sky: 0, you: 1, num: 2 } as const;
  return rows.sort((a, b) => a.t - b.t || rank[a.kind] - rank[b.kind]);
}
