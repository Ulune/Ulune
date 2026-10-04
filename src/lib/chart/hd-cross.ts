/**
 * The Incarnation Cross: the gates of the Sun and the Earth at birth
 * (Personality) and in the Design, written "38/39 | 48/21", with its angle
 * set by the profile. The names of the 192 crosses: hd-cross-names.ts.
 */
import type { HumanDesignChart } from "./human-design";

export type HdAngle = "right" | "juxtaposition" | "left";

/** Right Angle for profiles 1/3 to 4/6, Juxtaposition for 4/1, Left Angle for 5/1 to 6/3. */
export function hdAngleOf(profile: string): HdAngle | null {
  if (profile === "4/1") return "juxtaposition";
  const first = Number(profile.split("/")[0]);
  if (first >= 1 && first <= 4) return "right";
  if (first === 5 || first === 6) return "left";
  return null;
}

export type HdCross = {
  angle: HdAngle | null;
  /** Personality Sun, Personality Earth. */
  personality: [number, number];
  /** Design Sun, Design Earth. */
  design: [number, number];
};

export function hdCrossOf(chart: HumanDesignChart): HdCross | null {
  const gate = (layer: "personality" | "design", body: "sun" | "earth") =>
    chart.activations.find((a) => a.layer === layer && a.body === body)?.gate;
  const ps = gate("personality", "sun");
  const pe = gate("personality", "earth");
  const ds = gate("design", "sun");
  const de = gate("design", "earth");
  if (!ps || !pe || !ds || !de) return null;
  return { angle: hdAngleOf(chart.profile), personality: [ps, pe], design: [ds, de] };
}

/** "38/39 | 48/21". */
export function hdCrossGates(cross: HdCross): string {
  return `${cross.personality[0]}/${cross.personality[1]} | ${cross.design[0]}/${cross.design[1]}`;
}

/** The four gates, Personality Sun and Earth, then Design Sun and Earth. */
export function hdCrossGateList(cross: HdCross): number[] {
  return [...cross.personality, ...cross.design];
}
