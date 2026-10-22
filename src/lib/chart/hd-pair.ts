/**
 * Human Design's connection chart (share and compare plan, feature 5a): two
 * people's bodygraphs read as one, at /human-design/pair. Pure functions, no
 * browser; scripts/hd-pair.test.mjs checks them on pairs worked out by hand.
 *
 * Each person's gates are the union of their two layers, Personality and
 * Design: a connection chart asks who activates a gate, not on which side.
 * Every one of the 36 channels is then one of the four kinds of connection,
 * or not formed:
 *
 *   electromagnetic  each has one gate of the channel, the other gate than
 *                    the other person's, and neither has the whole of it:
 *                    together they complete it;
 *   companionship    both have the whole channel;
 *   dominance        one has the whole channel, the other neither gate;
 *   compromise       one has the whole channel, the other exactly one of
 *                    its gates.
 *
 * A channel stays unformed when only one of its gates is active between the
 * two (in one person or in both), or neither is.
 *
 * Centres: each person's own definition is their natal chart's (the centres
 * their whole channels join). A centre one defines and the other has open
 * (undefined, with or without active gates) is where the first conditions
 * the second, read in both directions. A centre neither defines alone may
 * still be defined between them, through an electromagnetic channel
 * ("together"); the centres no channel between them defines are the open
 * ground of the relationship. The pair's definition counts the groups of
 * centres its channels join, as a natal chart's does (single, split, triple
 * split, quadruple split, or none), and its "connection theme" is the count
 * of centres it defines and leaves open (7–2). When one person's own
 * definition is split, the channels formed with the other that join its
 * parts are its bridges, and the other's gates in them the bridging gates.
 *
 * Sources, read again for this page (Ulune draws and words its own chart;
 * no picture or text is taken from them):
 *   - Ra Uru Hu's teaching of the connection chart, as Jovian Archive
 *     publishes it: the four kinds of connection between two charts
 *     (electromagnetic, companionship, dominance, compromise), the
 *     conditioning of one person's open centres by the other's definition,
 *     and the connection theme of defined and open centres (9–0 to 0–9);
 *   - Ra Uru Hu and Lynda Bunnell, The Definitive Book of Human Design
 *     (2011): definition (single, split, triple split, quadruple split) and
 *     the gates that bridge a split definition.
 * Penta (three to five people) is later (the plan's decision R1).
 */
import { hdLitOf, type HdFocus } from "./hd-focus";
import { hdActId } from "./hd-rows";
import { HD_BODY_IDS, HD_CENTER_IDS, HD_CHANNELS, type HdActivation, type HdCenterId, type HdChannel, type HdDefinition, type HumanDesignChart } from "./human-design";

export type HdPairPerson = "a" | "b";
export const HD_PAIR_PEOPLE: readonly HdPairPerson[] = ["a", "b"];

export type HdPairKind = "electromagnetic" | "companionship" | "dominance" | "compromise";
/** The four kinds, in the order the page and the table list them. */
export const HD_PAIR_KINDS: readonly HdPairKind[] = ["electromagnetic", "companionship", "dominance", "compromise"];

/** Whose a gate is between the two. */
export type HdPairTone = "a" | "b" | "both" | "off";

/** What one person holds of a channel: the gates of it they activate (none, one, or both: the whole channel). */
export type HdPairHold = { gates: number[]; whole: boolean };

export type HdPairChannel = HdChannel & {
  /** Its kind between the two, or null when they do not form it. */
  kind: HdPairKind | null;
  /** Dominance and compromise: who has the whole channel. */
  lead: HdPairPerson | null;
  a: HdPairHold;
  b: HdPairHold;
};

/** Who defines a centre between the two: one, both, only the two together, or nobody (open). */
export type HdPairBy = "a" | "b" | "both" | "together";

export type HdPairCentre = {
  id: HdCenterId;
  /** Defined in each person's own chart. */
  a: boolean;
  b: boolean;
  /** Defined in the connection chart. */
  pair: boolean;
  by: HdPairBy | null;
};

export type HdPairBridge = {
  /** Whose split definition. */
  who: HdPairPerson;
  /** Its parts in their own chart (2 to 4). */
  parts: number;
  /** How many of them are still apart in the connection chart (1: all joined). */
  apart: number;
  /** The channels formed with the other person that join the parts. */
  channels: string[];
  /** The other person's gates in those channels, which the split person lacks: the bridging gates. */
  gates: number[];
};

export type HdPair = {
  /** Each person's gates, both layers. */
  gates: Record<HdPairPerson, ReadonlySet<number>>;
  /** Whose each gate is (1 to 64). */
  tones: ReadonlyMap<number, HdPairTone>;
  /** The 36 channels, in HD_CHANNELS's order. */
  channels: HdPairChannel[];
  /** The channels they form, by kind (HD_PAIR_KINDS's order), then in HD_CHANNELS's order. */
  formed: HdPairChannel[];
  /** The nine centres, in HD_CENTER_IDS's order. */
  centres: HdPairCentre[];
  /** The centres each person defines and the other has open: where `a` conditions `b`, and `b` conditions `a`. */
  conditioning: Record<HdPairPerson, HdCenterId[]>;
  /** The centres both define. */
  both: HdCenterId[];
  /** The centres neither defines alone that the two define together. */
  together: HdCenterId[];
  /** The centres no channel between them defines: the open ground of the relationship. */
  open: HdCenterId[];
  /** Each person's own definition. */
  definitions: Record<HdPairPerson, HdDefinition>;
  /** The connection chart's definition, and its groups of centres. */
  definition: HdDefinition;
  parts: HdCenterId[][];
  /** For each person whose own definition is split: what the other's gates join. */
  bridges: HdPairBridge[];
  /** The connection theme: centres defined and open between them. */
  theme: { defined: number; open: number };
};

/** What the page reads: the pair, both bodygraphs, the two names, and the channels whose kind could differ (no birth time). */
export type HdPairContext = {
  pair: HdPair;
  charts: Record<HdPairPerson, HumanDesignChart>;
  names: Record<HdPairPerson, string>;
  uncertain: ReadonlySet<string>;
};

/** A person's gates, both layers together. */
export function gatesOfPerson(activations: readonly Pick<HdActivation, "gate">[]): Set<number> {
  return new Set(activations.map((a) => a.gate));
}

/** What a person holds of a channel. */
function holdOf(ch: HdChannel, gates: ReadonlySet<number>): HdPairHold {
  const held = ch.gates.filter((g) => gates.has(g));
  return { gates: held, whole: held.length === 2 };
}

/**
 * A channel's kind between two people, from what each holds of it (the
 * classical rules above). `lead` names who has the whole channel in
 * dominance and compromise.
 */
export function pairKindOf(a: HdPairHold, b: HdPairHold): { kind: HdPairKind | null; lead: HdPairPerson | null } {
  if (a.whole && b.whole) return { kind: "companionship", lead: null };
  if (a.whole) return { kind: b.gates.length ? "compromise" : "dominance", lead: "a" };
  if (b.whole) return { kind: a.gates.length ? "compromise" : "dominance", lead: "b" };
  // One gate each, and not the same one: together they complete it.
  if (a.gates.length === 1 && b.gates.length === 1 && a.gates[0] !== b.gates[0]) return { kind: "electromagnetic", lead: null };
  return { kind: null, lead: null };
}

/** The groups of centres a set of channels joins, each in HD_CENTER_IDS's order, the groups in the order of their first centre. */
export function partsOf(channels: readonly Pick<HdChannel, "centers">[]): HdCenterId[][] {
  const next = new Map<HdCenterId, Set<HdCenterId>>();
  const link = (x: HdCenterId, y: HdCenterId) => {
    if (!next.has(x)) next.set(x, new Set());
    next.get(x)!.add(y);
  };
  for (const ch of channels) {
    link(ch.centers[0], ch.centers[1]);
    link(ch.centers[1], ch.centers[0]);
  }
  const seen = new Set<HdCenterId>();
  const out: HdCenterId[][] = [];
  for (const id of HD_CENTER_IDS) {
    if (!next.has(id) || seen.has(id)) continue;
    const part = new Set<HdCenterId>();
    const stack: HdCenterId[] = [id];
    while (stack.length) {
      const c = stack.pop()!;
      if (part.has(c)) continue;
      part.add(c);
      seen.add(c);
      for (const n of next.get(c) ?? []) if (!part.has(n)) stack.push(n);
    }
    out.push(HD_CENTER_IDS.filter((c) => part.has(c)));
  }
  return out;
}

const DEFINITION_BY_PARTS: readonly HdDefinition[] = ["None", "Single", "Split", "Triple split", "Quadruple split"];

/** A definition by its number of groups (nine centres make four groups at most). */
export function definitionOfParts(parts: number): HdDefinition {
  return DEFINITION_BY_PARTS[Math.min(Math.max(parts, 0), 4)]!;
}

/**
 * What the other person's gates join of one person's split definition: the
 * channels formed between them, not that person's own, that lie on a path
 * from one of their groups of centres to another (through centres they do
 * not define), and the other person's gates in them.
 */
function bridgeOf(who: HdPairPerson, channels: readonly HdPairChannel[], formed: readonly HdPairChannel[], gates: Record<HdPairPerson, ReadonlySet<number>>): HdPairBridge | null {
  const own = channels.filter((ch) => ch[who].whole);
  const parts = partsOf(own);
  if (parts.length < 2) return null;
  const groupOf = new Map<HdCenterId, number>();
  parts.forEach((p, i) => p.forEach((c) => groupOf.set(c, i)));
  // A group stands as one node; the centres outside the person's definition as themselves.
  const node = (c: HdCenterId) => (groupOf.has(c) ? `#${groupOf.get(c)}` : c);
  const edges = formed
    .filter((ch) => !ch[who].whole)
    .map((ch) => ({ id: ch.id, u: node(ch.centers[0]), v: node(ch.centers[1]) }))
    .filter((e) => e.u !== e.v);
  const groups = parts.map((_, i) => `#${i}`);
  const used = new Set<string>();
  // Every simple path from one group to another, its inner nodes outside the person's definition.
  const walk = (from: string, at: string, seen: Set<string>, path: string[]) => {
    for (const e of edges) {
      const to = e.u === at ? e.v : e.v === at ? e.u : null;
      if (to === null || seen.has(to)) continue;
      if (groups.includes(to)) {
        if (to !== from) for (const id of [...path, e.id]) used.add(id);
        continue;
      }
      seen.add(to);
      walk(from, to, seen, [...path, e.id]);
      seen.delete(to);
    }
  };
  for (const g of groups) walk(g, g, new Set([g]), []);
  const joined = partsOf(formed);
  const apart = new Set(parts.map((p) => joined.findIndex((q) => q.includes(p[0]!)))).size;
  const other: HdPairPerson = who === "a" ? "b" : "a";
  const bridging = channels.filter((ch) => used.has(ch.id));
  const bridgeGates = [...new Set(bridging.flatMap((ch) => ch.gates.filter((g) => gates[other].has(g) && !gates[who].has(g))))].sort((x, y) => x - y);
  return { who, parts: parts.length, apart, channels: bridging.map((ch) => ch.id), gates: bridgeGates };
}

/** The connection chart of two people, from their activations (a HumanDesignChart, or any list of gates). */
export function hdPair(a: { activations: readonly Pick<HdActivation, "gate">[] }, b: { activations: readonly Pick<HdActivation, "gate">[] }): HdPair {
  const gates: Record<HdPairPerson, ReadonlySet<number>> = { a: gatesOfPerson(a.activations), b: gatesOfPerson(b.activations) };
  const tones = new Map<number, HdPairTone>();
  for (let g = 1; g <= 64; g += 1) {
    const inA = gates.a.has(g);
    const inB = gates.b.has(g);
    tones.set(g, inA && inB ? "both" : inA ? "a" : inB ? "b" : "off");
  }
  const channels: HdPairChannel[] = HD_CHANNELS.map((ch) => {
    const ha = holdOf(ch, gates.a);
    const hb = holdOf(ch, gates.b);
    return { ...ch, ...pairKindOf(ha, hb), a: ha, b: hb };
  });
  const formed = HD_PAIR_KINDS.flatMap((k) => channels.filter((ch) => ch.kind === k));
  const definedBy = (who: HdPairPerson) => new Set(partsOf(channels.filter((ch) => ch[who].whole)).flat());
  const ownA = definedBy("a");
  const ownB = definedBy("b");
  const parts = partsOf(formed);
  const inPair = new Set(parts.flat());
  const centres: HdPairCentre[] = HD_CENTER_IDS.map((id) => {
    const da = ownA.has(id);
    const db = ownB.has(id);
    const dp = inPair.has(id);
    const by: HdPairBy | null = da && db ? "both" : da ? "a" : db ? "b" : dp ? "together" : null;
    return { id, a: da, b: db, pair: dp, by };
  });
  const where = (test: (c: HdPairCentre) => boolean) => centres.filter(test).map((c) => c.id);
  const bridges = HD_PAIR_PEOPLE.map((who) => bridgeOf(who, channels, formed, gates)).filter((x): x is HdPairBridge => Boolean(x));
  return {
    gates,
    tones,
    channels,
    formed,
    centres,
    conditioning: { a: where((c) => c.a && !c.b), b: where((c) => c.b && !c.a) },
    both: where((c) => c.by === "both"),
    together: where((c) => c.by === "together"),
    open: where((c) => !c.pair),
    definitions: { a: definitionOfParts(partsOf(channels.filter((ch) => ch.a.whole)).length), b: definitionOfParts(partsOf(channels.filter((ch) => ch.b.whole)).length) },
    definition: definitionOfParts(parts.length),
    parts,
    bridges,
    theme: { defined: inPair.size, open: HD_CENTER_IDS.length - inPair.size },
  };
}

/** The pair's channel by id ("34–20"). */
export function pairChannel(pair: HdPair, id: string): HdPairChannel | undefined {
  return pair.channels.find((ch) => ch.id === id);
}

/** The centre in the pair. */
export function pairCentre(pair: HdPair, id: HdCenterId): HdPairCentre {
  return pair.centres.find((c) => c.id === id)!;
}

/**
 * Without a birth time a bodygraph is cast at noon and what could differ at
 * another hour is marked (hd-uncertain.ts): the channels between the two
 * whose kind rests on such a gate, or that one person's chart could define
 * or not, may be another kind (or none) at another hour.
 */
export function hdPairUncertain(a: Pick<HumanDesignChart, "activations" | "uncertain">, b: Pick<HumanDesignChart, "activations" | "uncertain">): Set<string> {
  const out = new Set<string>();
  for (const c of [a, b]) {
    const u = c.uncertain;
    if (!u) continue;
    const loose = (x: HdActivation) => u.rows.includes(hdActId(x.layer, x.body));
    const sure = new Set(c.activations.filter((x) => !loose(x)).map((x) => x.gate));
    const unsure = new Set(c.activations.filter((x) => loose(x) && !sure.has(x.gate)).map((x) => x.gate));
    for (const ch of HD_CHANNELS) if (ch.gates.some((g) => unsure.has(g)) || u.channels.includes(ch.id)) out.add(ch.id);
  }
  return out;
}

/* What a reading of the page is chosen as, beside the bodygraph's own
   gate:, channel: and center: (which keep their natal meaning). */

/** The connection at a glance. */
export const HDP_SUMMARY = "hdp:summary";
/** The centres open between the two. */
export const HDP_OPEN = "hdp:open";
/** The pair's definition, its theme and its bridges. */
export const HDP_DEFINITION = "hdp:definition";
export const hdpKindRef = (k: HdPairKind): string => `hdp:kind:${k}`;
/** Where one person's definition meets the other's open centres. */
export const hdpConditionRef = (who: HdPairPerson): string => `hdp:conditioning:${who}`;
/** One person's own bodygraph, as the pair reads it. */
export const hdpPersonRef = (who: HdPairPerson): string => `hdp:person:${who}`;

export type HdpRef =
  | { kind: "summary" }
  | { kind: "open" }
  | { kind: "definition" }
  | { kind: "kind"; value: HdPairKind }
  | { kind: "conditioning"; who: HdPairPerson }
  | { kind: "person"; who: HdPairPerson };

/** A page reading's id, read back; null for anything else. */
export function parseHdpRef(id: string | null | undefined): HdpRef | null {
  if (!id?.startsWith("hdp:")) return null;
  if (id === HDP_SUMMARY) return { kind: "summary" };
  if (id === HDP_OPEN) return { kind: "open" };
  if (id === HDP_DEFINITION) return { kind: "definition" };
  const [, what, value] = id.split(":");
  if (what === "kind" && (HD_PAIR_KINDS as readonly string[]).includes(value ?? "")) return { kind: "kind", value: value as HdPairKind };
  if ((what === "conditioning" || what === "person") && (value === "a" || value === "b")) return { kind: what, who: value };
  return null;
}

/**
 * What a choice (or the pointer) lights on the connection chart: a gate, a
 * channel or a centre as on a natal chart (itself and what it joins); a
 * kind its channels; the conditioning one person's defined centres where
 * the other is open; the open ground its centres; the definition and the
 * summary every channel formed; a person their own channels and centres.
 */
export function hdPairFocus(pair: HdPair, id: string | null): HdFocus | null {
  if (!id) return null;
  if (/^(gate|channel|center):/.test(id)) return { hero: id, lit: hdLitOf(id), rows: new Set() };
  const ref = parseHdpRef(id);
  if (!ref) return null;
  const lit = new Set<string>();
  const channel = (ch: HdPairChannel) => {
    lit.add(`channel:${ch.id}`);
    for (const g of ch.gates) lit.add(`gate:${g}`);
    for (const c of ch.centers) lit.add(`center:${c}`);
  };
  if (ref.kind === "kind") pair.formed.filter((ch) => ch.kind === ref.value).forEach(channel);
  else if (ref.kind === "summary" || ref.kind === "definition") pair.formed.forEach(channel);
  else if (ref.kind === "open") for (const c of pair.open) lit.add(`center:${c}`);
  else if (ref.kind === "conditioning") {
    const at = new Set(pair.conditioning[ref.who]);
    for (const c of at) lit.add(`center:${c}`);
    // The giver's own channels into those centres.
    for (const ch of pair.channels) if (ch[ref.who].whole && ch.centers.some((c) => at.has(c))) channel(ch);
  } else if (ref.kind === "person") {
    for (const ch of pair.channels) if (ch[ref.who].whole) channel(ch);
    for (const g of pair.gates[ref.who]) lit.add(`gate:${g}`);
  }
  return lit.size ? { hero: null, lit, rows: new Set() } : null;
}

/* ── "You two, now" (share and compare plan, feature 5e) ─────────────────────
   The planets' gates at a moment laid over the connection chart: the
   channels the moment completes for the two, each by what it meets (one
   person's gate, a gate both hold, or the moment alone, as it does for
   everyone), and the centres it defines that the two leave open. The moment's
   bodies are the bodygraph's thirteen, the Earth and the South Node opposite
   the Sun and the true North Node, as a birth's are cast (calculate.ts,
   hdBodiesAt), read as Human Design's Cycles page reads them (hd-transit.ts,
   hooks/useHdMoment.ts). */

export type HdMomentBody = (typeof HD_BODY_IDS)[number];
/** One body of the moment in its gate (hd-transit.ts's HdMomentRow, as the Cycles page reads it, fits it). */
export type HdMomentGate = { body: HdMomentBody; gate: number; line: number };

/** What a channel the moment completes meets: one person's gate, a gate both hold, or nothing of theirs (the moment alone). */
export type HdNowBy = HdPairPerson | "both" | "sky";

export type HdNowChannel = {
  channel: HdPairChannel;
  by: HdNowBy;
  /** The gate (or gates) the moment brings, and the bodies on them. */
  brings: number[];
  bodies: HdMomentBody[];
  /** The pair's gate in it (none when the moment brings both). */
  held: number | null;
};

export type HdPairNow = {
  moment: HdMomentGate[];
  /** The channels the moment completes that the two do not form: the pair's own first (A's, B's, both's), then the moment's alone. */
  channels: HdNowChannel[];
  /** The centres the moment defines between the two that their connection leaves open. */
  centres: HdCenterId[];
};

const NOW_BY_ORDER: Record<HdNowBy, number> = { a: 0, b: 1, both: 2, sky: 3 };

/** The moment over the connection chart. */
export function hdPairNow(pair: HdPair, moment: readonly HdMomentGate[]): HdPairNow {
  const now = new Set(moment.map((m) => m.gate));
  const channels: HdNowChannel[] = [];
  for (const ch of pair.channels) {
    if (ch.kind) continue;
    const held = ch.gates.filter((g) => pair.gates.a.has(g) || pair.gates.b.has(g));
    const missing = ch.gates.filter((g) => !held.includes(g));
    if (!missing.length || !missing.every((g) => now.has(g))) continue;
    const g = held[0] ?? null;
    const by: HdNowBy = g == null ? "sky" : pair.gates.a.has(g) && pair.gates.b.has(g) ? "both" : pair.gates.a.has(g) ? "a" : "b";
    channels.push({ channel: ch, by, brings: missing, bodies: moment.filter((m) => missing.includes(m.gate)).map((m) => m.body), held: g });
  }
  channels.sort((x, y) => NOW_BY_ORDER[x.by] - NOW_BY_ORDER[y.by]);
  const before = new Set(pair.centres.filter((c) => c.pair).map((c) => c.id));
  const after = new Set(partsOf([...pair.formed, ...channels.map((c) => c.channel)]).flat());
  return { moment: [...moment], channels, centres: HD_CENTER_IDS.filter((c) => after.has(c) && !before.has(c)) };
}

/** The part as a whole, and one channel the moment completes. */
export const HDP_NOW = "hdp:now";
export const hdpNowRef = (channel: string): string => `hdp:now:${channel}`;

/** What "You two, now" lights on the connection chart: the channels the moment completes (their gates and centres), or one of them. */
export function hdPairNowFocus(now: HdPairNow | null, id: string | null): HdFocus | null {
  if (!now || !id || !id.startsWith(HDP_NOW)) return null;
  const one = id === HDP_NOW ? null : id.slice(HDP_NOW.length + 1);
  const lit = new Set<string>();
  for (const c of now.channels) {
    if (one && c.channel.id !== one) continue;
    lit.add(`channel:${c.channel.id}`);
    for (const g of c.channel.gates) lit.add(`gate:${g}`);
    for (const x of c.channel.centers) lit.add(`center:${x}`);
  }
  if (!one) for (const c of now.centres) lit.add(`center:${c}`);
  return lit.size ? { hero: null, lit, rows: new Set() } : null;
}
