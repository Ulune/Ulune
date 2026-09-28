/**
 * The sky's own events, the calendar's sky layer: the Moon's phases, the
 * Moon's and the planets' sign changes, stations, the Moon's void-of-course
 * spans, exact aspects between the Sun … Pluto (the Moon's included) and
 * eclipses. The server finds them with Swiss Ephemeris (sky-search.ts,
 * calculate.server.ts) and ships them inside each 32-day sky chunk
 * (sky-window.ts): the same for everyone, no personal data.
 *
 * Times are UTC milliseconds; longitudes are ecliptic degrees of date.
 */

/** Bodies whose events the calendar follows. */
export const SKY_BODIES = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
  "chiron",
  "northnode",
] as const;
export type SkyBody = (typeof SKY_BODIES)[number];

/** Bodies that aspect each other in the calendar (and the Moon's partners). */
export const SKY_ASPECT_BODIES = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
] as const satisfies readonly SkyBody[];

/** Bodies that turn retrograde and direct (the nodes wobble without stations of their own). */
export const SKY_STATION_BODIES = [
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
  "chiron",
] as const satisfies readonly SkyBody[];

/** The five Ptolemaic aspects, by their angle. */
export const SKY_ASPECTS = [
  ["conjunction", 0],
  ["sextile", 60],
  ["square", 90],
  ["trine", 120],
  ["opposition", 180],
] as const;
export type SkyAspect = (typeof SKY_ASPECTS)[number][0];

export type EclipseType = "total" | "annular" | "hybrid" | "partial" | "penumbral";

/** New Moon, first quarter, full Moon, last quarter: the Moon 0°, 90°, 180°, 270° past the Sun. */
export type PhaseIndex = 0 | 1 | 2 | 3;

export type SkyEvent =
  /** An exact phase; `lon` is the Moon's. */
  | { k: "phase"; t: number; phase: PhaseIndex; lon: number }
  /** A body enters `sign` (0 = Aries); `rx` when it backs into it. The Sun's into 0, 3, 6, 9 are the equinoxes and solstices. */
  | { k: "ingress"; t: number; body: SkyBody; sign: number; rx?: 1 }
  /** A body turns retrograde (`rx`) or direct, at `lon`. */
  | { k: "station"; t: number; body: SkyBody; turn: "rx" | "direct"; lon: number }
  /** An exact aspect; `a` is the Moon when it takes part, else the faster-listed body. */
  | { k: "aspect"; t: number; a: SkyBody; b: SkyBody; type: SkyAspect }
  /**
   * The Moon void of course: from its last exact aspect to the Sun … Pluto
   * (`last`, none when it made no aspect in that sign) until it enters `sign`
   * at `end`. Listed in the chunk that holds its end.
   */
  | { k: "void"; t: number; end: number; sign: number; last?: { body: SkyBody; type: SkyAspect } }
  /** Greatest eclipse; `lon` is the Sun's (solar) or the Moon's (lunar); `mag` is NASA's magnitude (umbral for a lunar eclipse, penumbral when it has no umbral phase). */
  | { k: "eclipse"; t: number; kind: "solar" | "lunar"; type: EclipseType; lon: number; mag: number };

export type SkyEventKind = SkyEvent["k"];

/** The season a Sun ingress opens, or null (0 = March equinox, 1 = June solstice, 2 = September equinox, 3 = December solstice). */
export function seasonOf(ev: SkyEvent): 0 | 1 | 2 | 3 | null {
  if (ev.k !== "ingress" || ev.body !== "sun" || ev.sign % 3 !== 0) return null;
  return (ev.sign / 3) as 0 | 1 | 2 | 3;
}

/** A stable id for an event (selection, list keys, the calendar file). */
export function skyEventId(ev: SkyEvent): string {
  switch (ev.k) {
    case "phase":
      return `phase-${ev.phase}-${ev.t}`;
    case "ingress":
      return `ingress-${ev.body}-${ev.sign}-${ev.t}`;
    case "station":
      return `station-${ev.body}-${ev.turn}-${ev.t}`;
    case "aspect":
      return `aspect-${ev.a}-${ev.type}-${ev.b}-${ev.t}`;
    case "void":
      return `void-${ev.end}`;
    case "eclipse":
      return `eclipse-${ev.kind}-${ev.t}`;
  }
}
