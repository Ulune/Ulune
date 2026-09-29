/**
 * Finds the sky's own events (sky-events.ts) between two moments from a
 * position provider: the server's is Swiss Ephemeris itself
 * (calculate.server.ts), so every event is polished on the ephemeris, never
 * on an approximation. Pure: no engine here.
 *
 * Every search samples its function every 12 hours (the chunk grid; the Moon
 * moves at most 7.6° in that time) and splits the samples at the stations of
 * the bodies involved, so a planet that crosses a line and back around a
 * station is seen twice; each sign change is then polished by Newton's method
 * inside its bracket down to the millisecond. Stations are halved down to
 * half a second on the speed.
 */
import {
  SKY_ASPECT_BODIES,
  SKY_ASPECTS,
  SKY_BODIES,
  SKY_STATION_BODIES,
  type PhaseIndex,
  type SkyAspect,
  type SkyBody,
  type SkyEvent,
} from "./sky-events";

export type SkyPos = { lon: number; speed: number };
/** Longitude (degrees of date) and speed (degrees a day) of a body at a UTC moment in ms. */
export type SkyProvider = (body: SkyBody, ms: number) => SkyPos;

const DAY_MS = 86_400_000;
/** Samples every 12 hours, as the chunks. */
export const SKY_STEP_MS = 12 * 3_600_000;
/**
 * How far before the window the Moon is followed: a void-of-course span
 * ending in the window starts at the Moon's last aspect since its previous
 * sign change, at most about 2.5 days earlier.
 */
export const MOON_LOOKBACK_MS = 3 * DAY_MS;

const wrap180 = (x: number) => ((((x + 180) % 360) + 360) % 360) - 180;
const wrap360 = (x: number) => ((x % 360) + 360) % 360;
const r6 = (x: number) => Math.round(x * 1e6) / 1e6;

type Residual = (ms: number) => { v: number; dv: number };

/** Sample moments: every `step` from `from`, the end, and each break inside. */
function grid(from: number, to: number, step: number, breaks: readonly number[]): number[] {
  const ts: number[] = [];
  for (let t = from; t < to; t += step) ts.push(t);
  ts.push(to);
  for (const b of breaks) if (b > from && b < to) ts.push(b);
  ts.sort((x, y) => x - y);
  return ts.filter((t, i) => i === 0 || t !== ts[i - 1]);
}

/**
 * Newton's method inside a sign-change bracket, bisecting whenever a step
 * would leave it; `dv` is in degrees a day. Stops below a millisecond.
 */
function refine(g: Residual, a: number, b: number, va: number, vb: number): number {
  let lo = a;
  let hi = b;
  let vlo = va;
  let t = a + ((b - a) * va) / (va - vb);
  for (let i = 0; i < 64; i += 1) {
    const r = g(t);
    if (r.v === 0) return t;
    if (r.v < 0 === vlo < 0) {
      lo = t;
      vlo = r.v;
    } else hi = t;
    let next = r.dv !== 0 && Number.isFinite(r.dv) ? t - (r.v / r.dv) * DAY_MS : Number.NaN;
    if (!(next > lo && next < hi)) next = (lo + hi) / 2;
    if (Math.abs(next - t) < 0.5 || hi - lo < 1) return next;
    t = next;
  }
  return (lo + hi) / 2;
}

/**
 * Moments in [from, to) where an angular residual (wrapped to ±180°) crosses
 * zero. A sign change counts only between samples within 90° of zero, so the
 * wrap at ±180° is never taken for a crossing.
 */
export function crossings(g: Residual, from: number, to: number, step: number, breaks: readonly number[] = []): number[] {
  const ts = grid(from, to, step, breaks);
  const out: number[] = [];
  let a = ts[0]!;
  let ra = g(a);
  if (ra.v === 0) out.push(a);
  for (let i = 1; i < ts.length; i += 1) {
    const b = ts[i]!;
    const rb = g(b);
    if (rb.v === 0) out.push(b);
    else if (ra.v !== 0 && ra.v < 0 !== rb.v < 0 && Math.abs(ra.v) < 90 && Math.abs(rb.v) < 90) {
      out.push(refine(g, a, b, ra.v, rb.v));
    }
    a = b;
    ra = rb;
  }
  return out.filter((t) => t >= from && t < to);
}

/** Where a speed changes sign between two samples, halved down to half a second. */
function speedZero(speed: (ms: number) => number, a: number, b: number, va: number): number {
  let lo = a;
  let hi = b;
  let vlo = va;
  while (hi - lo > 500) {
    const m = (lo + hi) / 2;
    const vm = speed(m);
    if (vm === 0) return m;
    if (vm < 0 === vlo < 0) {
      lo = m;
      vlo = vm;
    } else hi = m;
  }
  return (lo + hi) / 2;
}

/** Stations in [from, to): moments where the body's speed changes sign. */
function turnsOf(at: SkyProvider, body: SkyBody, from: number, to: number, step: number): Array<{ t: number; rx: boolean }> {
  const out: Array<{ t: number; rx: boolean }> = [];
  const ts = grid(from, to, step, []);
  let a = ts[0]!;
  let va = at(body, a).speed;
  for (let i = 1; i < ts.length; i += 1) {
    const b = ts[i]!;
    const vb = at(body, b).speed;
    if (va !== 0 && vb !== 0 && va < 0 !== vb < 0) {
      const t = speedZero((ms) => at(body, ms).speed, a, b, va);
      if (t >= from && t < to) out.push({ t, rx: vb < 0 });
    }
    a = b;
    va = vb;
  }
  return out;
}

/** The phase of an elongation's crossing: 0 new, 1 first quarter, 2 full, 3 last quarter. */
const PHASES: readonly PhaseIndex[] = [0, 1, 2, 3];

/**
 * Every sky event in [from, to) except eclipses (Swiss's own searches, on the
 * server). Bodies whose ephemeris is missing are left out, as the casts leave
 * them out. `moon: false` leaves out the Moon's sign changes, aspects and
 * void-of-course spans (the year's file), keeping the phases.
 */
export function findSkyEvents(
  provider: SkyProvider,
  from: number,
  to: number,
  opts: { step?: number; moon?: boolean } = {},
): SkyEvent[] {
  const step = opts.step ?? SKY_STEP_MS;
  const withMoon = opts.moon !== false;
  const memo = new Map<string, SkyPos>();
  const at: SkyProvider = (body, ms) => {
    const key = `${body}:${ms}`;
    let hit = memo.get(key);
    if (!hit) {
      hit = provider(body, ms);
      memo.set(key, hit);
    }
    return hit;
  };
  const usable = new Set<SkyBody>();
  for (const body of SKY_BODIES) {
    try {
      const p = at(body, from);
      if (Number.isFinite(p.lon) && Number.isFinite(p.speed)) usable.add(body);
    } catch {
      /* no ephemeris for it here */
    }
  }
  const events: SkyEvent[] = [];
  const lookback = from - MOON_LOOKBACK_MS;
  const margin = step;

  // Stations, and where each body turns (the node's wobbles split its searches but are not events).
  const turns = new Map<SkyBody, number[]>();
  for (const body of [...SKY_STATION_BODIES, "northnode"] as const) {
    if (!usable.has(body)) continue;
    const list = turnsOf(at, body, from - margin, to + margin, step);
    turns.set(
      body,
      list.map((x) => x.t),
    );
    if (body === "northnode") continue;
    for (const x of list) {
      if (x.t < from || x.t >= to) continue;
      events.push({ k: "station", t: Math.round(x.t), body, turn: x.rx ? "rx" : "direct", lon: r6(wrap360(at(body, x.t).lon)) });
    }
  }
  const breaksOf = (...bodies: SkyBody[]) => bodies.flatMap((b) => turns.get(b) ?? []);

  // Phases.
  if (usable.has("sun") && usable.has("moon")) {
    for (const phase of PHASES) {
      const g: Residual = (ms) => {
        const m = at("moon", ms);
        const s = at("sun", ms);
        return { v: wrap180(m.lon - s.lon - 90 * phase), dv: m.speed - s.speed };
      };
      for (const t of crossings(g, from, to, step)) {
        events.push({ k: "phase", t: Math.round(t), phase, lon: r6(wrap360(at("moon", t).lon)) });
      }
    }
  }

  // Sign changes (the Moon's from the look-back, for the void-of-course spans).
  const moonIngress: Array<{ t: number; sign: number }> = [];
  for (const body of SKY_BODIES) {
    if (!usable.has(body) || (body === "moon" && !withMoon)) continue;
    const start = body === "moon" ? lookback : from;
    for (let s = 0; s < 12; s += 1) {
      const g: Residual = (ms) => {
        const p = at(body, ms);
        return { v: wrap180(p.lon - 30 * s), dv: p.speed };
      };
      for (const t of crossings(g, start, to, step, breaksOf(body))) {
        const rx = at(body, t).speed < 0;
        const sign = rx ? (s + 11) % 12 : s;
        if (body === "moon") moonIngress.push({ t, sign });
        if (t < from) continue;
        events.push(rx ? { k: "ingress", t: Math.round(t), body, sign, rx: 1 } : { k: "ingress", t: Math.round(t), body, sign });
      }
    }
  }

  // Exact aspects: the Moon's to the Sun … Pluto (from the look-back), and between the planets.
  const moonAspects: Array<{ t: number; body: SkyBody; type: SkyAspect }> = [];
  const bodies = SKY_ASPECT_BODIES.filter((b) => usable.has(b) && (withMoon || b !== "moon"));
  for (let i = 0; i < bodies.length; i += 1) {
    for (let j = i + 1; j < bodies.length; j += 1) {
      const moonPair = bodies[i] === "moon" || bodies[j] === "moon";
      const a: SkyBody = moonPair ? "moon" : bodies[i]!;
      const b: SkyBody = moonPair ? (bodies[i] === "moon" ? bodies[j]! : bodies[i]!) : bodies[j]!;
      const start = moonPair ? lookback : from;
      const breaks = breaksOf(a, b);
      for (const [type, angle] of SKY_ASPECTS) {
        for (const signed of angle === 0 || angle === 180 ? [angle] : [angle, -angle]) {
          const g: Residual = (ms) => {
            const pa = at(a, ms);
            const pb = at(b, ms);
            return { v: wrap180(pa.lon - pb.lon - signed), dv: pa.speed - pb.speed };
          };
          for (const t of crossings(g, start, to, step, breaks)) {
            if (moonPair) moonAspects.push({ t, body: b, type });
            if (t < from) continue;
            // The Moon's conjunction, squares and opposition to the Sun are the phases.
            if (moonPair && b === "sun" && type !== "sextile" && type !== "trine") continue;
            events.push({ k: "aspect", t: Math.round(t), a, b, type });
          }
        }
      }
    }
  }

  // The Moon void of course: from its last aspect in a sign until it leaves it.
  moonIngress.sort((x, y) => x.t - y.t);
  moonAspects.sort((x, y) => x.t - y.t);
  for (let i = 1; i < moonIngress.length; i += 1) {
    const end = moonIngress[i]!;
    if (end.t < from || end.t >= to) continue;
    const prev = moonIngress[i - 1]!;
    let last: (typeof moonAspects)[number] | undefined;
    for (const asp of moonAspects) {
      if (asp.t >= end.t) break;
      if (asp.t >= prev.t) last = asp;
    }
    const start = last ? last.t : prev.t;
    events.push(
      last
        ? { k: "void", t: Math.round(start), end: Math.round(end.t), sign: end.sign, last: { body: last.body, type: last.type } }
        : { k: "void", t: Math.round(start), end: Math.round(end.t), sign: end.sign },
    );
  }

  return sortSkyEvents(events);
}

const KIND_ORDER: Record<SkyEvent["k"], number> = { eclipse: 0, phase: 1, station: 2, ingress: 3, aspect: 4, void: 5 };

/** In time order (a void by its start), eclipses before the phase they fall on. */
export function sortSkyEvents(events: SkyEvent[]): SkyEvent[] {
  return events.sort((x, y) => x.t - y.t || KIND_ORDER[x.k] - KIND_ORDER[y.k]);
}

export type MoonCourse = {
  /** The Moon's next exact Ptolemaic aspect to the Sun … Pluto before it leaves its sign; null when void of course. */
  next: { t: number; body: SkyBody; type: SkyAspect } | null;
  /** When it leaves its sign, and the sign it enters (0 = Aries). */
  leaves: { t: number; sign: number };
};

/**
 * The Moon's course from a moment: its next exact aspect (conjunction,
 * sextile, square, trine, opposition) to the Sun … Pluto after that moment,
 * if it comes before the Moon leaves its sign, and when it leaves it. An
 * aspect exact at the moment itself is not the next one. Null when the
 * provider cannot place the Moon.
 */
export function moonCourse(provider: SkyProvider, from: number, step = SKY_STEP_MS): MoonCourse | null {
  const memo = new Map<string, SkyPos>();
  const at: SkyProvider = (body, ms) => {
    const key = `${body}:${ms}`;
    let hit = memo.get(key);
    if (!hit) {
      hit = provider(body, ms);
      memo.set(key, hit);
    }
    return hit;
  };
  const moon = at("moon", from);
  if (!Number.isFinite(moon.lon) || !(moon.speed > 0)) return null;
  const sign = Math.floor(wrap360(moon.lon) / 30);
  const edge = 30 * ((sign + 1) % 12);
  const horizon = from + 3 * DAY_MS;
  const leave = crossings(
    (ms) => {
      const p = at("moon", ms);
      return { v: wrap180(p.lon - edge), dv: p.speed };
    },
    from,
    horizon,
    step,
  ).find((t) => t > from);
  if (leave == null) return null;
  let next: MoonCourse["next"] = null;
  for (const body of SKY_ASPECT_BODIES) {
    if (body === "moon") continue;
    try {
      const p = at(body, from);
      if (!Number.isFinite(p.lon)) continue;
    } catch {
      continue;
    }
    for (const [type, angle] of SKY_ASPECTS) {
      for (const signed of angle === 0 || angle === 180 ? [angle] : [angle, -angle]) {
        const hits = crossings(
          (ms) => {
            const m = at("moon", ms);
            const b = at(body, ms);
            return { v: wrap180(m.lon - b.lon - signed), dv: m.speed - b.speed };
          },
          from,
          leave,
          step,
        );
        for (const t of hits) {
          if (t <= from + 1000) continue;
          if (!next || t < next.t) next = { t: Math.round(t), body, type };
        }
      }
    }
  }
  return { next, leaves: { t: Math.round(leave), sign: (sign + 1) % 12 } };
}
