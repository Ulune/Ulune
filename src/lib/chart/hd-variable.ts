/**
 * Below the line: each of the 384 lines holds 6 colours, each colour 6
 * tones, each tone 5 bases (69,120 bases around the wheel), and the four
 * arrows of Variable read from them. Gate and line agree with
 * eclipticToGate (human-design.ts) on every longitude; the checks derive all
 * five again on their own (scripts/hd-variable.test.mjs).
 */
import { HD_GATE_41_START, HD_GATE_WHEEL, wrap360, type HdArrowId, type HdLayer, type HumanDesignChart } from "./human-design";

export type { HdArrowId };

/** 64 gates x 6 lines x 6 colours x 6 tones x 5 bases. */
export const HD_BASES = 64 * 6 * 6 * 6 * 5;
export const HD_BASE_SIZE = 360 / HD_BASES;

export type HdFine = { gate: number; line: number; color: number; tone: number; base: number };

/** Gate, line, colour, tone and base of an ecliptic longitude. */
export function hdFineOf(ecliptic: number): HdFine {
  const adjusted = wrap360(ecliptic - HD_GATE_41_START);
  // Counted in bases, the smallest step, so every level is cut from one integer.
  const k = Math.min(HD_BASES - 1, Math.max(0, Math.floor(adjusted / HD_BASE_SIZE + 1e-9)));
  const base = (k % 5) + 1;
  const tone = (Math.floor(k / 5) % 6) + 1;
  const color = (Math.floor(k / 30) % 6) + 1;
  const line = (Math.floor(k / 180) % 6) + 1;
  const gate = HD_GATE_WHEEL[Math.floor(k / 1080)];
  return { gate, line, color, tone, base };
}

/**
 * The four arrows: the Design Sun (Determination) and Design Node
 * (Environment) on the left, the Personality Sun (Motivation) and
 * Personality Node (Perspective) on the right. The Earth shares the Sun's
 * colour and tone, the South Node the North Node's (both exactly opposite).
 */
export const HD_ARROWS: readonly { id: HdArrowId; layer: HdLayer; body: "sun" | "northnode" }[] = [
  { id: "determination", layer: "design", body: "sun" },
  { id: "environment", layer: "design", body: "northnode" },
  { id: "motivation", layer: "personality", body: "sun" },
  { id: "perspective", layer: "personality", body: "northnode" },
];

export type HdArrow = {
  id: HdArrowId;
  layer: HdLayer;
  body: "sun" | "northnode";
  color: number;
  tone: number;
  base: number;
  /** Tones 1 to 3 point left, 4 to 6 right. */
  left: boolean;
  /** False when its colour or side changes within half an hour of the birth time. */
  steady: boolean;
};

/** Tones 1 to 3 point left, 4 to 6 right. */
export function hdArrowLeft(tone: number): boolean {
  return tone <= 3;
}

/** The chart's four arrows; none without a birth time (the tone changes every few minutes to hours). */
export function hdArrowsOf(chart: HumanDesignChart): HdArrow[] {
  if (chart.uncertain) return [];
  const out: HdArrow[] = [];
  for (const a of HD_ARROWS) {
    const row = chart.activations.find((r) => r.layer === a.layer && r.body === a.body);
    if (!row) continue;
    const fine = hdFineOf(row.ecliptic);
    out.push({
      ...a,
      color: fine.color,
      tone: fine.tone,
      base: fine.base,
      left: hdArrowLeft(fine.tone),
      steady: chart.toneSteady?.[a.id] ?? true,
    });
  }
  return out;
}
