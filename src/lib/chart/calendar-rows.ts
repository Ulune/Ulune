/**
 * The calendar's rows for a period (part 57 of the launch plan): the sky's
 * events, your exacts and numerology's long cycles changing on birthdays
 * (part 62), in time order, for the events table and the calendar file; and
 * the birthdays and returns of the charts you keep (share and compare plan,
 * idea B10), which a calendar file holds only when the reader says so. Each
 * kind of row comes from a layer (calendar-layers.ts): only the layers shown
 * give theirs.
 */
import { rowShown, type ShownLayers } from "./calendar-layers";
import type { PersonEvent } from "./calendar-people";
import type { NumerologyCalendar } from "./numerology-calendar";
import { skyEventId, type SkyEvent } from "./sky-events";
import type { TimingHit } from "./types";

/** A long cycle changing on a birthday, with the start of that day (ms UTC, in the calendar's clock). */
export type NumRow = { kind: "num"; t: number; id: string; change: NumerologyCalendar["changes"][number] };

/** A kept person's birthday or return (idea B10): its moment (a birthday's day start), its id. */
export type PeopleRow = { kind: "people"; t: number; id: string; ev: PersonEvent };

export type CalRow =
  | { kind: "sky"; t: number; id: string; ev: SkyEvent }
  | { kind: "you"; t: number; id: string; hit: TimingHit }
  | NumRow
  | PeopleRow;

/** The Moon's own events (its sign changes, aspects and void-of-course spans): many, and the day view's. */
export function isMoonOwn(ev: SkyEvent): boolean {
  return (ev.k === "ingress" && ev.body === "moon") || ev.k === "void" || (ev.k === "aspect" && (ev.a === "moon" || ev.b === "moon"));
}

export function calendarRows(
  events: readonly SkyEvent[],
  hits: readonly TimingHit[],
  from: number,
  to: number,
  /** The layers shown (a layer left out is off), and whether the Moon's own events come too. */
  opts: { layers: Partial<ShownLayers>; moon: boolean },
  /** Numerology's changes, already placed in the calendar's clock. */
  num: readonly NumRow[] = [],
  /** The kept charts' birthdays and returns (idea B10), with their layer on. */
  people: readonly PeopleRow[] = [],
): CalRow[] {
  const rows: CalRow[] = [];
  const sky = rowShown("sky", opts.layers);
  // The solar terms are sky rows, everyone's, but by their own layer (languages plan, part 6).
  const terms = Boolean(opts.layers.terms);
  if (sky || terms) {
    for (const ev of events) {
      if (ev.t < from || ev.t >= to) continue;
      if (!(ev.k === "term" ? terms : sky)) continue;
      if (!opts.moon && isMoonOwn(ev)) continue;
      rows.push({ kind: "sky", t: ev.t, id: `sky:${skyEventId(ev)}`, ev });
    }
  }
  if (rowShown("you", opts.layers)) {
    const seen = new Set<string>();
    for (const hit of hits) {
      const t = Date.parse(hit.exactUtc);
      if (t < from || t >= to || seen.has(hit.id)) continue;
      if (!opts.moon && hit.moving === "moon") continue;
      seen.add(hit.id);
      rows.push({ kind: "you", t, id: `timing:${hit.id}`, hit });
    }
  }
  if (rowShown("num", opts.layers)) for (const r of num) if (r.t >= from && r.t < to) rows.push(r);
  if (rowShown("people", opts.layers)) for (const r of people) if (r.t >= from && r.t < to) rows.push(r);
  const rank = { sky: 0, you: 1, num: 2, people: 3 } as const;
  return rows.sort((a, b) => a.t - b.t || rank[a.kind] - rank[b.kind]);
}
