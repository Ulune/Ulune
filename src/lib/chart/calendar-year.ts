/**
 * The calendar's year (part 57 of the launch plan), laid out from the year
 * files: the new and full Moons, eclipses and seasons; each planet's signs
 * and retrograde stretches from Mercury out to the North Node; your big
 * transits as their stretches within 1° with a tick per exact pass. Pure,
 * shared by the laptop timeline, the phone's months and the year's panel.
 */
import { windowWeight } from "./calendar-sky";
import type { TransitWindow } from "./personal-transits";
import type { SkyEvent } from "./sky-events";
import { SKY_SLOW_BODIES, slowAt, yearCovers, type SkyYear, type SlowBody } from "./sky-year";
import { utcFromCivil } from "./timing-window";

/** The rows of the timeline, fastest first. */
export const YEAR_BODIES = ["mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron", "northnode"] as const;
export type YearBody = (typeof YEAR_BODIES)[number];

export type YearSegment = { from: number; to: number; sign: number };
export type YearSpan = { from: number; to: number };

export type YearTransit = {
  key: string;
  moving: TransitWindow["moving"];
  type: TransitWindow["type"];
  natal: TransitWindow["natal"];
  /** Its stretches within 1° that touch the year. */
  windows: TransitWindow[];
  /** The exact passes inside the year. */
  passes: number[];
  weight: number;
};

export type YearLayout = {
  year: number;
  from: number;
  to: number;
  /** The first moment of each month in the clock shown, and the next 1 January. */
  months: number[];
  /** New and full Moons (exact), eclipses, seasons of the year. */
  phases: Extract<SkyEvent, { k: "phase" }>[];
  eclipses: Extract<SkyEvent, { k: "eclipse" }>[];
  seasons: Extract<SkyEvent, { k: "ingress" }>[];
  /** Per body: its signs through the year and its retrograde stretches. */
  bodies: Array<{ body: YearBody; segments: YearSegment[]; retro: YearSpan[] }>;
  /** Stations and sign changes (the Moon's aside) inside the year. */
  stations: Extract<SkyEvent, { k: "station" }>[];
  ingresses: Extract<SkyEvent, { k: "ingress" }>[];
  /** Your transits of the slow bodies within 1° during the year, weightiest first. */
  transits: YearTransit[];
  /** The year's own sky file is here (until then its signs, stretches and transits wait). */
  ready: boolean;
};

/** Your points that weigh more: the lights and the angles, then the quick planets. */
const NATAL_WEIGHT: Record<string, number> = { sun: 1, moon: 1, ascendant: 1, midheaven: 1, mercury: 0.5, venus: 0.5, mars: 0.5 };

const isSlow = (b: string): b is SlowBody => (SKY_SLOW_BODIES as readonly string[]).includes(b);

function signAt(body: YearBody, ms: number, events: readonly SkyEvent[], years: readonly SkyYear[]): number | null {
  if (isSlow(body)) {
    const file = years.find((y) => yearCovers(y, ms));
    const at = file ? slowAt(file, body, ms) : null;
    if (at) return Math.floor((((at.lon % 360) + 360) % 360) / 30);
  }
  let sign: number | null = null;
  for (const ev of events) {
    if (ev.t > ms) break;
    if (ev.k === "ingress" && ev.body === body) sign = ev.sign;
  }
  return sign;
}

export function yearLayout(
  year: number,
  tz: string,
  events: readonly SkyEvent[],
  years: readonly SkyYear[],
  windows: readonly TransitWindow[],
): YearLayout {
  const months = Array.from({ length: 13 }, (_, i) =>
    utcFromCivil({ year: year + Math.floor(i / 12), month: (i % 12) + 1, day: 1, hour: 0, minute: 0 }, tz).getTime(),
  );
  const from = months[0]!;
  const to = months[12]!;
  const inYear = (t: number) => t >= from && t < to;
  const phases: YearLayout["phases"] = [];
  const eclipses: YearLayout["eclipses"] = [];
  const seasons: YearLayout["seasons"] = [];
  const stations: YearLayout["stations"] = [];
  const ingresses: YearLayout["ingresses"] = [];
  for (const ev of events) {
    if (!inYear(ev.t)) continue;
    if (ev.k === "phase" && (ev.phase === 0 || ev.phase === 2)) phases.push(ev);
    else if (ev.k === "eclipse") eclipses.push(ev);
    else if (ev.k === "station") stations.push(ev);
    else if (ev.k === "ingress" && ev.body !== "moon") {
      if (ev.body === "sun" && ev.sign % 3 === 0) seasons.push(ev);
      ingresses.push(ev);
    }
  }

  // Until the year's own file is here, the events at hand end before the year: its signs and
  // retrograde stretches wait for it rather than stretching the last ones known over the whole year.
  const ready = years.some((file) => file.y === year);
  const bodies = YEAR_BODIES.map((body) => {
    if (!ready) return { body, segments: [] as YearSegment[], retro: [] as YearSpan[] };
    const segments: YearSegment[] = [];
    let sign = signAt(body, from, events, years);
    let start = from;
    for (const ev of ingresses) {
      if (ev.body !== body) continue;
      if (sign != null && ev.t > start) segments.push({ from: start, to: ev.t, sign });
      sign = ev.sign;
      start = ev.t;
    }
    if (sign != null) segments.push({ from: start, to, sign });
    // Retrograde stretches: from each station retrograde to the next station direct (the node's
    // true motion swings back and forth all year: none drawn for it).
    const retro: YearSpan[] = [];
    if (body !== "northnode") {
      let rxFrom: number | null = null;
      for (const ev of events) {
        if (ev.k !== "station" || ev.body !== body) continue;
        if (ev.turn === "rx") rxFrom = ev.t;
        else if (ev.t > from) {
          const a = Math.max(rxFrom ?? from, from);
          if (a < to) retro.push({ from: a, to: Math.min(ev.t, to) });
          rxFrom = null;
        }
        if (ev.t >= to) break;
      }
      if (rxFrom != null && rxFrom < to) retro.push({ from: Math.max(rxFrom, from), to });
    }
    return { body, segments, retro };
  });

  const groups = new Map<string, YearTransit>();
  for (const w of windows) {
    if (w.to < from || w.from >= to) continue;
    const key = `${w.moving}|${w.type}|${w.natal}`;
    let g = groups.get(key);
    if (!g) {
      g = { key, moving: w.moving, type: w.type, natal: w.natal, windows: [], passes: [], weight: windowWeight(w) + (NATAL_WEIGHT[w.natal] ?? 0) };
      groups.set(key, g);
    }
    g.windows.push(w);
    for (const p of w.passes) if (inYear(p)) g.passes.push(p);
  }
  const transits = [...groups.values()]
    .map((g) => ({ ...g, windows: g.windows.sort((a, b) => a.from - b.from), passes: g.passes.sort((a, b) => a - b) }))
    .sort((a, b) => b.weight - a.weight || (a.passes[0] ?? a.windows[0]!.from) - (b.passes[0] ?? b.windows[0]!.from));

  return { year, from, to, months, phases, eclipses, seasons, bodies, stations, ingresses, transits, ready };
}

/** The weightiest dozen (not the North Node's), then in time order: the timeline's default. */
export function headlineTransits(transits: readonly YearTransit[], n = 12): YearTransit[] {
  const first = (t: YearTransit) => t.passes[0] ?? t.windows[0]!.from;
  return transits
    .filter((t) => t.moving !== "northnode")
    .slice(0, n)
    .sort((a, b) => first(a) - first(b));
}
