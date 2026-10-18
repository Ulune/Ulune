/**
 * Where charts are calculated (on-device plan, step 5): on this device, the default on every
 * device, or on Ulune's server, as Settings › "Where charts are calculated" sets it. A display
 * setting kept in this browser's plain storage: it says nothing about anyone. The "calculate"
 * door (door.ts) reads it before each calculation, Settings and Your data to say where charts go
 * (the birth form's note reads the same key itself, from the first load).
 *
 * "Use the server once", answered when this device can't calculate, holds for this visit only
 * and leaves the setting as it was.
 *
 * Small and read by Settings, so it stays out of the engine's own chunk (vite.config.ts, the
 * "engine-client" group).
 */
export type CalculateOn = "device" | "server";

/** The setting's key in plain storage (the privacy suite's DISPLAY_KEYS lists it). */
export const CALCULATE_KEY = "ulune.calculate";

/** Where this module is served from: the offline worker keeps it with the engine's code (door.ts). */
export const CHOICE_FILE = import.meta.url;

let forNow: CalculateOn | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());

/** The reader's setting: the device unless Ulune's server was chosen. */
export function chosenCalculateOn(): CalculateOn {
  try {
    return globalThis.localStorage?.getItem(CALCULATE_KEY) === "server" ? "server" : "device";
  } catch {
    return "device";
  }
}

/** Where the next calculation goes: the setting, or the server for this visit after "Use the server once". */
export function calculateOn(): CalculateOn {
  return forNow ?? chosenCalculateOn();
}

/** Settings' choice, or "Always use the server": kept in this browser. */
export function setCalculateOn(next: CalculateOn): void {
  forNow = null;
  try {
    globalThis.localStorage?.setItem(CALCULATE_KEY, next);
  } catch {
    /* private mode: for this visit only */
    forNow = next;
  }
  emit();
}

/** "Use the server once": the server until this page is left, the setting unchanged. */
export function calculateOnServerForNow(): void {
  forNow = "server";
  emit();
}

/** Told when the place changes (Settings, the device's answer); returns the way to stop. */
export function onCalculateOn(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
