/**
 * Human Design engine — separate from natal astrology.
 *
 * Mandala: 64 gates × 5°37'30", each gate 6 lines of 0°56'15".
 * Gate 41 starts at 02°00'00" Aquarius (302° tropical). Wheel order is the
 * official Rave I Ching sequence, not 1–64 around the ecliptic.
 *
 * Nodes: HD bodygraphs that match Jovian / Genetic Matrix use the **mean**
 * node for gates, while natal Ulune stays on the **true** node. That fork is
 * deliberate and frozen in GOLDENS.md — it is not an astrology bug. Measured
 * over 240 monthly samples (1985–2004) the two nodes sit up to 1.88° apart,
 * a third of a 5.625° gate, and land the node on a *different gate* in 18% of
 * charts. So a reader comparing this bodygraph against the natal table will
 * periodically see the node in a neighbouring gate, and that is correct for
 * both. Mean node is applied only in `hdBodiesAt`; this file just maps
 * longitudes to gates.
 *
 * The user-facing sentence that says this out loud is still owed: it belongs in
 * `src/lib/i18n/hd-ui.json` (EN + FR), which the i18n slice owns, so it was
 * left for whoever lands next in that file rather than edited underneath them.
 */

export const HD_GATE_SIZE = 360 / 64; // 5.625° = 5°37'30"
export const HD_LINE_SIZE = HD_GATE_SIZE / 6; // 0.9375° = 0°56'15"
/** 02°00'00" Aquarius. Aquarius 0° = 300° tropical. */
export const HD_GATE_41_START = 302;

/**
 * Official HD I Ching wheel, starting at Gate 41 and advancing in increasing
 * ecliptic longitude.
 */
export const HD_GATE_WHEEL: readonly number[] = [
  41, 19, 13, 49, 30, 55, 37, 63, 22, 36, 25, 17, 21, 51, 42, 3, 27, 24, 2, 23, 8, 20, 16, 35, 45, 12, 15, 52,
  39, 53, 62, 56, 31, 33, 7, 4, 29, 59, 40, 64, 47, 6, 46, 18, 48, 57, 32, 50, 28, 44, 1, 43, 14, 34, 9, 5, 26,
  11, 10, 58, 38, 54, 61, 60,
];

export const HD_CENTER_IDS = [
  "head",
  "ajna",
  "throat",
  "g",
  "heart",
  "sacral",
  "solarPlexus",
  "spleen",
  "root",
] as const;

export type HdCenterId = (typeof HD_CENTER_IDS)[number];

export const HD_CENTER_LABEL: Record<HdCenterId, string> = {
  head: "Head",
  ajna: "Ajna",
  throat: "Throat",
  g: "G",
  heart: "Heart",
  sacral: "Sacral",
  solarPlexus: "Solar Plexus",
  spleen: "Spleen",
  root: "Root",
};

export const HD_MOTORS: ReadonlySet<HdCenterId> = new Set(["root", "solarPlexus", "sacral", "heart"]);

/** Body order used in classic HD (no Chiron). Earth is Sun + 180°. */
export const HD_BODY_IDS = [
  "sun",
  "earth",
  "moon",
  "northnode",
  "southnode",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
] as const;

export type HdBodyId = (typeof HD_BODY_IDS)[number];

export const HD_BODY_LABEL: Record<HdBodyId, string> = {
  sun: "Sun",
  earth: "Earth",
  moon: "Moon",
  northnode: "North Node",
  southnode: "South Node",
  mercury: "Mercury",
  venus: "Venus",
  mars: "Mars",
  jupiter: "Jupiter",
  saturn: "Saturn",
  uranus: "Uranus",
  neptune: "Neptune",
  pluto: "Pluto",
};

export type HdLayer = "personality" | "design";
export type HdView = "personality" | "design" | "both";

export type HdType = "Manifestor" | "Generator" | "Manifesting Generator" | "Projector" | "Reflector";

export type HdStrategy =
  | "Inform before acting"
  | "Wait to respond"
  | "Wait for the invitation"
  | "Wait a lunar cycle";

export type HdAuthority =
  | "Emotional"
  | "Sacral"
  | "Splenic"
  | "Ego"
  | "Self-Projected"
  | "Mental"
  | "Lunar";

export type HdDefinition = "None" | "Single" | "Split" | "Triple split" | "Quadruple split";

export type HdActivation = {
  body: HdBodyId;
  layer: HdLayer;
  ecliptic: number;
  gate: number;
  line: number;
};

export type HdChannel = {
  id: string;
  gates: [number, number];
  centers: [HdCenterId, HdCenterId];
};

/** 36 channels. Ids use the conventional HD pair (not invented names). */
export const HD_CHANNELS: readonly HdChannel[] = [
  { id: "64–47", gates: [64, 47], centers: ["head", "ajna"] },
  { id: "61–24", gates: [61, 24], centers: ["head", "ajna"] },
  { id: "63–4", gates: [63, 4], centers: ["head", "ajna"] },
  { id: "17–62", gates: [17, 62], centers: ["ajna", "throat"] },
  { id: "43–23", gates: [43, 23], centers: ["ajna", "throat"] },
  { id: "11–56", gates: [11, 56], centers: ["ajna", "throat"] },
  { id: "16–48", gates: [16, 48], centers: ["throat", "spleen"] },
  { id: "20–57", gates: [20, 57], centers: ["throat", "spleen"] },
  { id: "34–20", gates: [34, 20], centers: ["sacral", "throat"] },
  { id: "10–20", gates: [10, 20], centers: ["g", "throat"] },
  { id: "31–7", gates: [31, 7], centers: ["throat", "g"] },
  { id: "8–1", gates: [8, 1], centers: ["throat", "g"] },
  { id: "33–13", gates: [33, 13], centers: ["throat", "g"] },
  { id: "45–21", gates: [45, 21], centers: ["throat", "heart"] },
  { id: "12–22", gates: [12, 22], centers: ["throat", "solarPlexus"] },
  { id: "35–36", gates: [35, 36], centers: ["throat", "solarPlexus"] },
  { id: "10–57", gates: [10, 57], centers: ["g", "spleen"] },
  { id: "10–34", gates: [10, 34], centers: ["g", "sacral"] },
  { id: "25–51", gates: [25, 51], centers: ["g", "heart"] },
  { id: "15–5", gates: [15, 5], centers: ["g", "sacral"] },
  { id: "2–14", gates: [2, 14], centers: ["g", "sacral"] },
  { id: "46–29", gates: [46, 29], centers: ["g", "sacral"] },
  { id: "44–26", gates: [44, 26], centers: ["spleen", "heart"] },
  { id: "40–37", gates: [40, 37], centers: ["heart", "solarPlexus"] },
  { id: "50–27", gates: [50, 27], centers: ["spleen", "sacral"] },
  { id: "32–54", gates: [32, 54], centers: ["spleen", "root"] },
  { id: "28–38", gates: [28, 38], centers: ["spleen", "root"] },
  { id: "18–58", gates: [18, 58], centers: ["spleen", "root"] },
  { id: "34–57", gates: [34, 57], centers: ["sacral", "spleen"] },
  { id: "59–6", gates: [59, 6], centers: ["sacral", "solarPlexus"] },
  { id: "9–52", gates: [9, 52], centers: ["sacral", "root"] },
  { id: "3–60", gates: [3, 60], centers: ["sacral", "root"] },
  { id: "42–53", gates: [42, 53], centers: ["sacral", "root"] },
  { id: "19–49", gates: [19, 49], centers: ["root", "solarPlexus"] },
  { id: "39–55", gates: [39, 55], centers: ["root", "solarPlexus"] },
  { id: "41–30", gates: [41, 30], centers: ["root", "solarPlexus"] },
];

export const HD_GATE_CENTER: Readonly<Record<number, HdCenterId>> = {
  64: "head",
  61: "head",
  63: "head",
  47: "ajna",
  24: "ajna",
  4: "ajna",
  17: "ajna",
  43: "ajna",
  11: "ajna",
  62: "throat",
  23: "throat",
  56: "throat",
  16: "throat",
  20: "throat",
  31: "throat",
  8: "throat",
  33: "throat",
  45: "throat",
  12: "throat",
  35: "throat",
  7: "g",
  1: "g",
  13: "g",
  10: "g",
  15: "g",
  2: "g",
  46: "g",
  25: "g",
  21: "heart",
  51: "heart",
  26: "heart",
  40: "heart",
  34: "sacral",
  5: "sacral",
  14: "sacral",
  29: "sacral",
  59: "sacral",
  9: "sacral",
  3: "sacral",
  42: "sacral",
  27: "sacral",
  36: "solarPlexus",
  22: "solarPlexus",
  37: "solarPlexus",
  6: "solarPlexus",
  49: "solarPlexus",
  55: "solarPlexus",
  30: "solarPlexus",
  48: "spleen",
  57: "spleen",
  44: "spleen",
  50: "spleen",
  32: "spleen",
  28: "spleen",
  18: "spleen",
  58: "root",
  38: "root",
  54: "root",
  53: "root",
  60: "root",
  52: "root",
  19: "root",
  39: "root",
  41: "root",
};

export type HdDefinedChannel = HdChannel & {
  personality: boolean;
  design: boolean;
  mixed: boolean;
};

export type HumanDesignChart = {
  personalityUtc: string;
  designUtc: string;
  personalitySun: number;
  designSun: number;
  activations: HdActivation[];
  type: HdType;
  strategy: HdStrategy;
  authority: HdAuthority;
  profile: string;
  definition: HdDefinition;
  definedChannels: HdDefinedChannel[];
  definedCenters: HdCenterId[];
};

export function wrap360(n: number): number {
  return ((n % 360) + 360) % 360;
}

export function eclipticToGate(lon: number): { gate: number; line: number } {
  const adjusted = wrap360(lon - HD_GATE_41_START);
  const raw = adjusted / HD_GATE_SIZE;
  const index = Math.min(63, Math.max(0, Math.floor(raw + 1e-12)));
  const rem = adjusted - index * HD_GATE_SIZE;
  const line = Math.min(6, Math.max(1, Math.floor(rem / HD_LINE_SIZE + 1e-12) + 1));
  const gate = HD_GATE_WHEEL[index];
  if (gate == null) throw new Error("Human Design wheel index is out of range.");
  return { gate, line };
}

export function activationOf(body: HdBodyId, layer: HdLayer, ecliptic: number): HdActivation {
  const { gate, line } = eclipticToGate(ecliptic);
  return { body, layer, ecliptic: wrap360(ecliptic), gate, line };
}

function gatesOf(activations: HdActivation[], layer?: HdLayer): Set<number> {
  const out = new Set<number>();
  for (const row of activations) {
    if (layer && row.layer !== layer) continue;
    out.add(row.gate);
  }
  return out;
}

export function definedChannelsFrom(gateSet: Set<number>, personality: Set<number>, design: Set<number>): HdDefinedChannel[] {
  const rows: HdDefinedChannel[] = [];
  for (const ch of HD_CHANNELS) {
    const [a, b] = ch.gates;
    if (!gateSet.has(a) || !gateSet.has(b)) continue;
    const p = personality.has(a) && personality.has(b);
    const d = design.has(a) && design.has(b);
    rows.push({ ...ch, personality: p, design: d, mixed: !p && !d });
  }
  return rows;
}

export function definedCentersFrom(channels: readonly HdDefinedChannel[]): HdCenterId[] {
  const set = new Set<HdCenterId>();
  for (const ch of channels) {
    set.add(ch.centers[0]);
    set.add(ch.centers[1]);
  }
  return HD_CENTER_IDS.filter((id) => set.has(id));
}

function centerGraph(channels: readonly HdDefinedChannel[]): Map<HdCenterId, Set<HdCenterId>> {
  const graph = new Map<HdCenterId, Set<HdCenterId>>();
  for (const id of HD_CENTER_IDS) graph.set(id, new Set());
  for (const ch of channels) {
    graph.get(ch.centers[0])?.add(ch.centers[1]);
    graph.get(ch.centers[1])?.add(ch.centers[0]);
  }
  return graph;
}

function reachable(graph: Map<HdCenterId, Set<HdCenterId>>, start: HdCenterId): Set<HdCenterId> {
  const seen = new Set<HdCenterId>();
  const stack: HdCenterId[] = [start];
  while (stack.length) {
    const cur = stack.pop();
    if (!cur || seen.has(cur)) continue;
    seen.add(cur);
    for (const next of graph.get(cur) ?? []) {
      if (!seen.has(next)) stack.push(next);
    }
  }
  return seen;
}

function motorToThroat(channels: readonly HdDefinedChannel[]): boolean {
  const graph = centerGraph(channels);
  const fromThroat = reachable(graph, "throat");
  for (const motor of HD_MOTORS) {
    if (fromThroat.has(motor)) return true;
  }
  return false;
}

export function typeFromGraph(definedCenters: readonly HdCenterId[], channels: readonly HdDefinedChannel[]): HdType {
  const set = new Set(definedCenters);
  if (set.size === 0) return "Reflector";
  const sacral = set.has("sacral");
  const motorThroat = motorToThroat(channels);
  if (sacral && motorThroat) return "Manifesting Generator";
  if (sacral) return "Generator";
  if (motorThroat) return "Manifestor";
  return "Projector";
}

export function strategyOf(type: HdType): HdStrategy {
  if (type === "Manifestor") return "Inform before acting";
  if (type === "Projector") return "Wait for the invitation";
  if (type === "Reflector") return "Wait a lunar cycle";
  return "Wait to respond";
}

export function authorityFromGraph(definedCenters: readonly HdCenterId[], type: HdType): HdAuthority {
  const set = new Set(definedCenters);
  if (set.has("solarPlexus")) return "Emotional";
  if (set.has("sacral")) return "Sacral";
  if (set.has("spleen")) return "Splenic";
  if (set.has("heart")) return "Ego";
  if (set.has("g") && set.has("throat")) return "Self-Projected";
  if (type === "Reflector") return "Lunar";
  return "Mental";
}

export function definitionFromChannels(channels: readonly HdDefinedChannel[]): HdDefinition {
  const defined = definedCentersFrom(channels);
  if (defined.length === 0) return "None";
  const graph = centerGraph(channels);
  const seen = new Set<HdCenterId>();
  let parts = 0;
  for (const id of defined) {
    if (seen.has(id)) continue;
    const cluster = reachable(graph, id);
    for (const c of cluster) {
      if (defined.includes(c)) seen.add(c);
    }
    parts += 1;
  }
  if (parts <= 1) return "Single";
  if (parts === 2) return "Split";
  if (parts === 3) return "Triple split";
  return "Quadruple split";
}

export function profileFromActivations(activations: readonly HdActivation[]): string {
  const p = activations.find((a) => a.layer === "personality" && a.body === "sun");
  const d = activations.find((a) => a.layer === "design" && a.body === "sun");
  if (!p || !d) return "—";
  return `${p.line}/${d.line}`;
}

export function buildHumanDesignChart(input: {
  personalityUtc: string;
  designUtc: string;
  personalitySun: number;
  designSun: number;
  activations: HdActivation[];
}): HumanDesignChart {
  const personality = gatesOf(input.activations, "personality");
  const design = gatesOf(input.activations, "design");
  const both = new Set([...personality, ...design]);
  const definedChannels = definedChannelsFrom(both, personality, design);
  const definedCenters = definedCentersFrom(definedChannels);
  const type = typeFromGraph(definedCenters, definedChannels);
  return {
    personalityUtc: input.personalityUtc,
    designUtc: input.designUtc,
    personalitySun: input.personalitySun,
    designSun: input.designSun,
    activations: input.activations,
    type,
    strategy: strategyOf(type),
    authority: authorityFromGraph(definedCenters, type),
    profile: profileFromActivations(input.activations),
    definition: definitionFromChannels(definedChannels),
    definedChannels,
    definedCenters,
  };
}

export function activationsForView(chart: HumanDesignChart, view: HdView): HdActivation[] {
  if (view === "both") return chart.activations;
  return chart.activations.filter((row) => row.layer === view);
}

export function graphForView(chart: HumanDesignChart, view: HdView): {
  activations: HdActivation[];
  channels: HdDefinedChannel[];
  centers: HdCenterId[];
  gates: Set<number>;
} {
  const activations = activationsForView(chart, view);
  const personality = gatesOf(activations, "personality");
  const design = gatesOf(activations, "design");
  const both = new Set([...personality, ...design]);
  const channels = definedChannelsFrom(both, personality, design);
  return {
    activations,
    channels,
    centers: definedCentersFrom(channels),
    gates: both,
  };
}

export function channelById(id: string): HdChannel | undefined {
  return HD_CHANNELS.find((ch) => ch.id === id);
}

export function bodiesOnGate(chart: HumanDesignChart, gate: number, view: HdView = "both"): HdActivation[] {
  return activationsForView(chart, view).filter((row) => row.gate === gate);
}
