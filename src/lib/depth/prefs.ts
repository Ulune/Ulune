/**
 * Depth preferences, kept on this device only (like Look): whether elements
 * lift when you point at them, and whether the 3D view is on.
 */
import { useSyncExternalStore } from "react";

export type DepthView = "flat" | "3d";

export type DepthPrefs = {
  lift: boolean;
  view: DepthView;
};

const KEY = "ulune.depth.v1";
const DEFAULTS: DepthPrefs = { lift: true, view: "flat" };

let current: DepthPrefs = DEFAULTS;
let loaded = false;
const listeners = new Set<() => void>();

function load(): DepthPrefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const v = JSON.parse(raw) as Partial<DepthPrefs>;
    return {
      lift: typeof v.lift === "boolean" ? v.lift : DEFAULTS.lift,
      view: v.view === "3d" ? "3d" : "flat",
    };
  } catch {
    return DEFAULTS;
  }
}

export function getDepthPrefs(): DepthPrefs {
  if (!loaded && typeof window !== "undefined") {
    current = load();
    loaded = true;
  }
  return current;
}

export function setDepthPrefs(patch: Partial<DepthPrefs>) {
  const next = { ...getDepthPrefs(), ...patch };
  if (next.lift === current.lift && next.view === current.view) return;
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

export function subscribeDepthPrefs(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const serverSnapshot = () => DEFAULTS;

export function useDepthPrefs(): DepthPrefs {
  return useSyncExternalStore(subscribeDepthPrefs, getDepthPrefs, serverSnapshot);
}

const resetListeners = new Set<() => void>();

/** "Fit" asks every 3D chart to put its camera back. */
export function requestDepthReset() {
  for (const fn of resetListeners) fn();
}

export function onDepthReset(fn: () => void): () => void {
  resetListeners.add(fn);
  return () => resetListeners.delete(fn);
}
