/**
 * How the chart answers the pointer, kept on this device only (like Look and
 * the 3D view): whether pointing at something highlights it, and whether every
 * aspect line shows its glyph without pointing. The two switches under the
 * chart (wheel-toggles.tsx) set them.
 */
import { useSyncExternalStore } from "react";

export type WheelPrefs = {
  /** Pointing at a body, a line, a sign or a house highlights it (a click always does). */
  hover: boolean;
  /** Every aspect line shows its glyph at rest (pointing or a click shows them either way). */
  marks: boolean;
};

const KEY = "ulune.wheel.v1";
const DEFAULTS: WheelPrefs = { hover: true, marks: false };

let current: WheelPrefs = DEFAULTS;
let loaded = false;
const listeners = new Set<() => void>();

function load(): WheelPrefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const v = JSON.parse(raw) as Partial<WheelPrefs>;
    return {
      hover: typeof v.hover === "boolean" ? v.hover : DEFAULTS.hover,
      marks: typeof v.marks === "boolean" ? v.marks : DEFAULTS.marks,
    };
  } catch {
    return DEFAULTS;
  }
}

export function getWheelPrefs(): WheelPrefs {
  if (!loaded && typeof window !== "undefined") {
    current = load();
    loaded = true;
  }
  return current;
}

export function setWheelPrefs(patch: Partial<WheelPrefs>) {
  const next = { ...getWheelPrefs(), ...patch };
  if (next.hover === current.hover && next.marks === current.marks) return;
  current = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(current));
    } catch {
      /* quota or blocked: keep it for this session */
    }
  }
  for (const fn of listeners) fn();
}

export function subscribeWheelPrefs(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const serverSnapshot = () => DEFAULTS;

export function useWheelPrefs(): WheelPrefs {
  return useSyncExternalStore(subscribeWheelPrefs, getWheelPrefs, serverSnapshot);
}
