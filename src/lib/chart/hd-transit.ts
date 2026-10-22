/**
 * Human Design's Cycles, the moment over a bodygraph (share and compare plan,
 * feature 5b; studio/modes/design-cycles.tsx): where the Sun, the Earth, the
 * Moon, the true nodes and the planets from Mercury to Pluto stand at a
 * moment, each in its gate and line, read against a person's own gates the
 * way Human Design reads a transit: as a connection chart between the person
 * and the moment (lib/chart/hd-pair.ts), A the person, B the moment. Pure, no
 * browser: the positions come in (the sky's chunks or a cast, through the
 * "calculate" door); scripts/hd-cycles.test.mjs checks it.
 *
 *   - What the moment completes: a channel one of whose gates is yours and
 *     the other the moment's (electromagnetic between you and the moment). It
 *     is whole in you for as long as the planet stays in its gate: a
 *     temporary definition.
 *   - The moment's own channels: both gates the moment's (dominance or
 *     compromise led by the moment), the day's definition, the same for
 *     everyone (the transit field).
 *   - The centres it conditions: open in your chart, defined by the moment's
 *     own channels or only together with your gates.
 *   - The gate of the week: the Sun's (about 5.7 days a gate), the Earth's
 *     opposite it; the Moon's, about ten hours a gate.
 *
 * The same moment feeds "You two, now" on Human Design's Relationship page
 * (feature 5e): hdMomentOf's rows, through studio/modes/hooks/useHdMoment.ts,
 * read over the connection chart by lib/chart/hd-pair.ts (hdPairNow).
 *
 * Sources, read again for this page (Ulune draws and words its own chart):
 * Ra Uru Hu's teaching of transits as Jovian Archive publishes it, the
 * transit field as the conditioning of the moment that everyone lives in,
 * read through the four kinds of connection; the Sun's gate as the theme of
 * the week (the Sun carries most of the neutrino stream, Earth its ground).
 */
import { hdLitOf, type HdFocus } from "./hd-focus";
import { hdPair, type HdPair, type HdPairChannel } from "./hd-pair";
import {
  eclipticToGate,
  HD_BODY_IDS,
  HD_GATE_41_START,
  HD_GATE_SIZE,
  HD_GATE_WHEEL,
  wrap360,
  type HdActivation,
  type HdBodyId,
  type HdCenterId,
  type HdChannel,
} from "./human-design";

/** The bodies the sky gives (the Earth and the South Node are the Sun's and the North Node's opposites). */
export type HdSkyBody = "sun" | "moon" | "mercury" | "venus" | "mars" | "jupiter" | "saturn" | "uranus" | "neptune" | "pluto" | "northnode";
export const HD_SKY_BODIES: readonly HdSkyBody[] = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "northnode"];

/** A longitude (degrees) and its daily motion (degrees a day). */
export type SkyPoint = { lon: number; speed: number };

/** One body of the moment, in its gate and line. */
export type HdMomentRow = {
  body: HdBodyId;
  ecliptic: number;
  /** Degrees a day. */
  speed: number;
  gate: number;
  line: number;
  /** Moving backwards (Mercury to Pluto only: the nodes always do, the Sun, Earth and Moon never). */
  retrograde: boolean;
};

/** The sky at a moment, as Human Design reads it: the 13 bodies of a bodygraph's column. */
export type HdMoment = { at: number; rows: HdMomentRow[] };

const wrap180 = (x: number) => ((((x + 180) % 360) + 360) % 360) - 180;
const PLANETS: ReadonlySet<HdBodyId> = new Set(["mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"]);

/**
 * The moment from the sky's bodies (null when one is missing): the Earth
 * from the Sun and the South Node from the North, exactly opposite, as the
 * bodygraph's own cast does (calculate.ts, hdBodiesAt).
 */
export function hdMomentOf(at: number, sky: (body: HdSkyBody) => SkyPoint | null | undefined): HdMoment | null {
  const got = new Map<HdSkyBody, SkyPoint>();
  for (const b of HD_SKY_BODIES) {
    const p = sky(b);
    if (!p || !Number.isFinite(p.lon) || !Number.isFinite(p.speed)) return null;
    got.set(b, p);
  }
  const rows: HdMomentRow[] = [];
  for (const body of HD_BODY_IDS) {
    const from: HdSkyBody = body === "earth" ? "sun" : body === "southnode" ? "northnode" : (body as HdSkyBody);
    const p = got.get(from)!;
    const lon = wrap360(body === "earth" || body === "southnode" ? p.lon + 180 : p.lon);
    const { gate, line } = eclipticToGate(lon);
    rows.push({ body, ecliptic: lon, speed: p.speed, gate, line, retrograde: PLANETS.has(body) && p.speed < 0 });
  }
  return { at, rows };
}

/** The moment's rows as a bodygraph's activations (one layer: a moment has no Design), for the readers of activations. */
export function momentActivations(m: HdMoment): HdActivation[] {
  return m.rows.map((r) => ({ body: r.body, layer: "personality", ecliptic: r.ecliptic, gate: r.gate, line: r.line }));
}

/** The moment's rows on a gate. */
export function momentOnGate(m: HdMoment, gate: number): HdMomentRow[] {
  return m.rows.filter((r) => r.gate === gate);
}

export type HdTransit = {
  moment: HdMoment;
  /** You (A) and the moment (B) read as one. */
  pair: HdPair;
  /** The channels the moment completes with your gates: one gate yours, the other the moment's. */
  completes: HdPairChannel[];
  /** The channels the moment defines on its own (both gates the moment's), which you do not have whole. */
  field: HdPairChannel[];
  /** The centres open in your chart that the moment defines (by its own channels, or only with your gates), in HD_CENTER_IDS's order. */
  conditioned: HdCenterId[];
  /** For each centre the moment conditions: the channels that define it now. */
  through: ReadonlyMap<HdCenterId, HdPairChannel[]>;
};

/** A person's bodygraph under the moment (A the person, B the moment). */
export function hdTransit(natal: { activations: readonly Pick<HdActivation, "gate">[] }, moment: HdMoment): HdTransit {
  const pair = hdPair(natal, { activations: moment.rows });
  const completes = pair.formed.filter((ch) => ch.kind === "electromagnetic");
  const field = pair.formed.filter((ch) => ch.lead === "b");
  const conditioned = pair.centres.filter((c) => c.by === "b" || c.by === "together").map((c) => c.id);
  const through = new Map<HdCenterId, HdPairChannel[]>();
  for (const c of conditioned) {
    through.set(
      c,
      pair.formed.filter((ch) => ch.centers.includes(c) && !ch.a.whole),
    );
  }
  return { moment, pair, completes, field, conditioned, through };
}

/* ── The page's own parts, chosen as `hdc:…` beside the bodygraph's gate:, channel: and center: ── */

export const HDC_MOMENT = "hdc:moment";
export const HDC_WEEK = "hdc:week";
export const HDC_MOON = "hdc:moon";
export const HDC_COMPLETES = "hdc:completes";
export const HDC_CENTRES = "hdc:centres";
export const HDC_SOLAR = "hdc:solar";
export const hdcBodyRef = (body: HdBodyId): string => `hdc:body:${body}`;

export type LifeCycleRefId = "saturn1" | "uranus" | "chiron" | "saturn2";
const LIFE_IDS: readonly LifeCycleRefId[] = ["saturn1", "uranus", "chiron", "saturn2"];
export const hdcLifeRef = (id: LifeCycleRefId): string => `hdc:life:${id}`;

export type HdcRef =
  | { kind: "moment" }
  | { kind: "week" }
  | { kind: "moon" }
  | { kind: "completes" }
  | { kind: "centres" }
  | { kind: "solar" }
  | { kind: "body"; body: HdBodyId }
  | { kind: "life"; id: LifeCycleRefId };

/** A page part's id, read back; null for anything else. */
export function parseHdcRef(id: string | null | undefined): HdcRef | null {
  if (!id?.startsWith("hdc:")) return null;
  if (id === HDC_MOMENT) return { kind: "moment" };
  if (id === HDC_WEEK) return { kind: "week" };
  if (id === HDC_MOON) return { kind: "moon" };
  if (id === HDC_COMPLETES) return { kind: "completes" };
  if (id === HDC_CENTRES) return { kind: "centres" };
  if (id === HDC_SOLAR) return { kind: "solar" };
  const [, what, value] = id.split(":");
  if (what === "body" && (HD_BODY_IDS as readonly string[]).includes(value ?? "")) return { kind: "body", body: value as HdBodyId };
  if (what === "life" && (LIFE_IDS as readonly string[]).includes(value ?? "")) return { kind: "life", id: value as LifeCycleRefId };
  return null;
}

/**
 * What a choice (or the pointer) lights on the figure: a gate, channel or
 * centre as on any bodygraph; the moment its gates and what it completes; the
 * week the Sun's and the Earth's gates; the Moon its gate; a body its gate;
 * what the moment completes those channels; the centres it conditions the
 * centres and the channels into them; a life cycle the gate of the planet's
 * place in your chart (`lifeGates`); the solar return your Sun's and Earth's.
 */
export function hdTransitFocus(t: HdTransit, id: string | null, extra: { lifeGates?: Partial<Record<LifeCycleRefId, number>>; sunEarth?: readonly number[] } = {}): HdFocus | null {
  if (!id) return null;
  if (/^(gate|channel|center):/.test(id)) return { hero: id, lit: hdLitOf(id), rows: new Set() };
  const ref = parseHdcRef(id);
  if (!ref) return null;
  const lit = new Set<string>();
  const gate = (g: number) => {
    lit.add(`gate:${g}`);
  };
  const channel = (ch: Pick<HdChannel, "id" | "gates" | "centers">) => {
    lit.add(`channel:${ch.id}`);
    for (const g of ch.gates) gate(g);
    for (const c of ch.centers) lit.add(`center:${c}`);
  };
  const bodies = (...ids: HdBodyId[]) => {
    for (const r of t.moment.rows) if (ids.includes(r.body)) gate(r.gate);
  };
  if (ref.kind === "moment") {
    for (const r of t.moment.rows) gate(r.gate);
    t.completes.forEach(channel);
  } else if (ref.kind === "week") bodies("sun", "earth");
  else if (ref.kind === "moon") bodies("moon");
  else if (ref.kind === "body") bodies(ref.body);
  else if (ref.kind === "completes") t.completes.forEach(channel);
  else if (ref.kind === "centres") {
    for (const c of t.conditioned) {
      lit.add(`center:${c}`);
      for (const ch of t.through.get(c) ?? []) channel(ch);
    }
  } else if (ref.kind === "life") {
    const g = extra.lifeGates?.[ref.id];
    if (g) gate(g);
  } else if (ref.kind === "solar") for (const g of extra.sunEarth ?? []) gate(g);
  return lit.size ? { hero: null, lit, rows: new Set() } : null;
}

/* ── How long a body stays in its gate ── */

/** Where a gate starts on the ecliptic (degrees): gate 41 at 2° Aquarius, then the wheel's order. */
export function gateStart(gate: number): number {
  const i = HD_GATE_WHEEL.indexOf(gate);
  return wrap360(HD_GATE_41_START + i * HD_GATE_SIZE);
}

/**
 * When a body that only moves forward (the Sun, the Moon) came into its gate
 * and when it leaves it, ms, from a sky that can say where it is at any
 * moment around `at` (the chunks' curve): null where that sky is missing.
 */
export function gateSpan(lonAt: (ms: number) => SkyPoint | null, at: number): { gate: number; line: number; from: number; to: number } | null {
  const here = lonAt(at);
  if (!here || !(here.speed > 0)) return null;
  const { gate, line } = eclipticToGate(here.lon);
  const start = gateStart(gate);
  const cross = (target: number, guess: number): number | null => {
    let t = guess;
    for (let i = 0; i < 12; i += 1) {
      const p = lonAt(t);
      if (!p || !(p.speed > 0)) return null;
      const r = wrap180(p.lon - target);
      const dt = (-r / p.speed) * 86_400_000;
      t += dt;
      if (Math.abs(dt) < 500) return Math.round(t);
    }
    return Math.round(t);
  };
  const from = cross(start, at - (wrap180(here.lon - start) / here.speed) * 86_400_000);
  const to = cross(wrap360(start + HD_GATE_SIZE), at + (wrap180(start + HD_GATE_SIZE - here.lon) / here.speed) * 86_400_000);
  if (from == null || to == null || !(from <= at && at <= to)) return null;
  return { gate, line, from, to };
}
