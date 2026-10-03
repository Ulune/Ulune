import { useCallback, useSyncExternalStore } from "react";
import { isAspectLayer, type AspectLayer } from "@/lib/chart/chart-view";

/**
 * Which aspects a bi-wheel draws (the layer switch over it), kept for each
 * kind of bi-wheel on its own (review 3 Oct, P1). They open on the aspects
 * between the two charts, the point of a transit, progression or synastry
 * chart: the shared choice used to open all three on "Both", each chart's
 * own aspects, with none between them.
 */
export type BiWheelKind = "transit" | "progressions" | "synastry";

const KEY = "ulune.aspect-layer";
export const DEFAULT_LAYER: AspectLayer = "cross";

type Prefs = Partial<Record<BiWheelKind, AspectLayer>>;

let prefs: Prefs | null = null;
const listeners = new Set<() => void>();

function read(): Prefs {
  if (prefs) return prefs;
  prefs = {};
  if (typeof window === "undefined") return prefs;
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Record<string, unknown>;
    for (const k of ["transit", "progressions", "synastry"] as const) {
      if (isAspectLayer(raw?.[k])) prefs[k] = raw[k] as AspectLayer;
    }
  } catch {
    /* none kept */
  }
  return prefs;
}

export function layerFor(kind: BiWheelKind): AspectLayer {
  return read()[kind] ?? DEFAULT_LAYER;
}

export function setLayerFor(kind: BiWheelKind, layer: AspectLayer): void {
  prefs = { ...read(), [kind]: layer };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* this visit only */
  }
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useAspectLayer(kind: BiWheelKind | null): [AspectLayer, (next: AspectLayer) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => (kind ? layerFor(kind) : DEFAULT_LAYER),
    () => DEFAULT_LAYER,
  );
  const set = useCallback((next: AspectLayer) => {
    if (kind) setLayerFor(kind, next);
  }, [kind]);
  return [value, set];
}
