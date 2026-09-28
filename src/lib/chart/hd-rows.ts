/**
 * The two columns of a bodygraph: the 13 bodies of the Design (left, red)
 * and of the Personality (right, ink), each with the gate and line it
 * activates. A row is chosen as `act:<layer>:<body>`.
 */
import type { HdActivation, HdBodyId, HdLayer, HumanDesignChart } from "./human-design";

/** Top to bottom, as Jovian Archive's current charts list them (older ones put the Moon before the Nodes). */
export const HD_COLUMN_ORDER: readonly HdBodyId[] = [
  "sun",
  "earth",
  "northnode",
  "southnode",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
];

export function hdActId(layer: HdLayer, body: HdBodyId): string {
  return `act:${layer}:${body}`;
}

/** `act:design:mars` → { layer, body }; anything else → null. */
export function parseHdActId(id: string | null | undefined): { layer: HdLayer; body: HdBodyId } | null {
  if (!id?.startsWith("act:")) return null;
  const [, layer, body] = id.split(":");
  if (layer !== "personality" && layer !== "design") return null;
  if (!(HD_COLUMN_ORDER as readonly string[]).includes(body)) return null;
  return { layer, body: body as HdBodyId };
}

/** One column's rows, top to bottom (a body the engine could not place is left out). */
export function hdColumnRows(chart: HumanDesignChart, layer: HdLayer): HdActivation[] {
  const out: HdActivation[] = [];
  for (const body of HD_COLUMN_ORDER) {
    const row = chart.activations.find((a) => a.layer === layer && a.body === body);
    if (row) out.push(row);
  }
  return out;
}

export function hdActivationOf(chart: HumanDesignChart, layer: HdLayer, body: HdBodyId): HdActivation | undefined {
  return chart.activations.find((a) => a.layer === layer && a.body === body);
}
