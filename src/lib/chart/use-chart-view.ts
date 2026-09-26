import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import type { AspectFilter } from "./aspect-filter";
import {
  cloneChartView,
  emptyStoredView,
  highlightPreset,
  isDirty,
  loadChartViewState,
  matchNamedPreset,
  NAMED_PRESETS,
  partsToView,
  saveChartViewState,
  viewToAspectFilter,
  viewToOverlays,
  type AspectLayer,
  type ChartView,
  type NamedPresetId,
  type PresetId,
  type ReadingDepth,
  type StoredChartView,
} from "./chart-view";
import type { FoldState } from "./folds";
import { cloneOverlays, type OverlayFilter, type OverlayId } from "./overlay-filter";
import type { AspectId, BodyId } from "./types";

/**
 * One live chart-view for the whole studio. BodiesTab, the wheel, and the
 * reading dock used to each call useState — toggles updated the mixer and
 * localStorage, but the wheel kept its own copy.
 */
type Snapshot = {
  stored: StoredChartView;
  hydrated: boolean;
};

const SERVER_SNAPSHOT: Snapshot = { stored: emptyStoredView(), hydrated: false };

let snapshot: Snapshot = SERVER_SNAPSHOT;
const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function getSnapshot(): Snapshot {
  return snapshot;
}

function getServerSnapshot(): Snapshot {
  return SERVER_SNAPSHOT;
}

function commit(next: StoredChartView) {
  const presetId: PresetId = matchNamedPreset(next.live) ?? "custom";
  snapshot = { stored: { ...next, presetId }, hydrated: true };
  emit();
  queueMicrotask(() => saveChartViewState(snapshot.stored));
}

function hydrateLocal() {
  if (snapshot.hydrated) return;
  snapshot = { stored: loadChartViewState(), hydrated: true };
  emit();
}

function liveParts(live: ChartView, configs: string[]) {
  return {
    aspectFilter: viewToAspectFilter(live),
    overlays: viewToOverlays(live, configs),
    stars: new Set(live.stars),
    mids: new Set(live.midpoints),
  };
}

/** The chart's view (bodies, aspects, overlays): a display setting, kept in this browser for everyone. */
export function useChartView() {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    hydrateLocal();
  }, []);

  const stored = snap.stored;
  const live = stored.live;

  // The sets keep their identity while their contents stand (an orb or an
  // aspect change leaves the bodies as they are: the wheel keeps its layout).
  const bodiesKey = live.bodies.join(",");
  const visible = useMemo(() => new Set(bodiesKey ? (bodiesKey.split(",") as BodyId[]) : []), [bodiesKey]);
  const aspectFilter = useMemo(() => viewToAspectFilter(live), [live]);
  const overlays = useMemo(
    () => viewToOverlays(live, stored.configs),
    [live, stored.configs],
  );
  const starsKey = live.stars.join(",");
  const midsKey = live.midpoints.join(",");
  const starVisible = useMemo(() => new Set(starsKey ? starsKey.split(",") : []), [starsKey]);
  const midpointVisible = useMemo(() => new Set(midsKey ? midsKey.split(",") : []), [midsKey]);
  const activePreset = highlightPreset(live, stored.custom);
  const dirty = isDirty(live, stored.custom);

  const setLive = useCallback((nextLive: ChartView, configs?: string[]) => {
    const prev = snapshot.stored;
    commit({
      presetId: matchNamedPreset(nextLive) ?? "custom",
      custom: prev.custom,
      live: nextLive,
      configs: configs ?? prev.configs,
      aspectLayer: prev.aspectLayer ?? "both",
    });
  }, []);

  const setVisible = useCallback((next: Set<BodyId>) => {
    const prev = snapshot.stored;
    const parts = liveParts(prev.live, prev.configs);
    setLive(
      partsToView(next, parts.aspectFilter, parts.overlays, parts.stars, parts.mids, prev.live.readingDepth, prev.live.folds),
    );
  }, [setLive]);

  const setAspectFilter = useCallback(
    (next: AspectFilter) => {
      const prev = snapshot.stored;
      const parts = liveParts(prev.live, prev.configs);
      setLive(
        partsToView(new Set(prev.live.bodies), next, parts.overlays, parts.stars, parts.mids, prev.live.readingDepth, prev.live.folds),
      );
    },
    [setLive],
  );

  const setOverlays = useCallback(
    (next: OverlayFilter) => {
      const prev = snapshot.stored;
      const cloned = cloneOverlays(next);
      const parts = liveParts(prev.live, prev.configs);
      setLive(
        partsToView(
          new Set(prev.live.bodies),
          parts.aspectFilter,
          cloned,
          parts.stars,
          parts.mids,
          prev.live.readingDepth,
          prev.live.folds,
        ),
        [...cloned.configs],
      );
    },
    [setLive],
  );

  const setStarVisible = useCallback(
    (next: Set<string>) => {
      const prev = snapshot.stored;
      const parts = liveParts(prev.live, prev.configs);
      setLive(
        partsToView(
          new Set(prev.live.bodies),
          parts.aspectFilter,
          parts.overlays,
          next,
          parts.mids,
          prev.live.readingDepth,
          prev.live.folds,
        ),
      );
    },
    [setLive],
  );

  const setMidpointVisible = useCallback(
    (next: Set<string>) => {
      const prev = snapshot.stored;
      const parts = liveParts(prev.live, prev.configs);
      setLive(
        partsToView(
          new Set(prev.live.bodies),
          parts.aspectFilter,
          parts.overlays,
          parts.stars,
          next,
          prev.live.readingDepth,
          prev.live.folds,
        ),
      );
    },
    [setLive],
  );

  const applyPreset = useCallback((id: NamedPresetId): Partial<FoldState> => {
    const next = cloneChartView(NAMED_PRESETS[id]);
    const prev = snapshot.stored;
    commit({
      presetId: id,
      custom: prev.custom,
      live: next,
      configs: id === "all" || id === "advanced" ? prev.configs : [],
      aspectLayer: prev.aspectLayer ?? "both",
    });
    return next.folds;
  }, []);

  const applyCustom = useCallback((): Partial<FoldState> | null => {
    const prev = snapshot.stored;
    if (!prev.custom) return null;
    const next = cloneChartView(prev.custom);
    commit({
      presetId: "custom",
      custom: prev.custom,
      live: next,
      configs: prev.configs,
      aspectLayer: prev.aspectLayer ?? "both",
    });
    return next.folds;
  }, []);

  const setAspectLayer = useCallback((aspectLayer: AspectLayer) => {
    const prev = snapshot.stored;
    commit({ ...prev, aspectLayer });
  }, []);

  const saveCustom = useCallback(() => {
    const prev = snapshot.stored;
    commit({
      presetId: matchNamedPreset(prev.live) ?? "custom",
      custom: cloneChartView(prev.live),
      live: prev.live,
      configs: prev.configs,
      aspectLayer: prev.aspectLayer ?? "both",
    });
  }, []);

  return {
    visible,
    setVisible,
    aspectFilter,
    setAspectFilter,
    overlays,
    setOverlays,
    starVisible,
    setStarVisible,
    midpointVisible,
    setMidpointVisible,
    readingDepth: live.readingDepth as ReadingDepth,
    activePreset: activePreset as PresetId,
    hasCustom: Boolean(stored.custom),
    dirty,
    aspectLayer: stored.aspectLayer ?? "both",
    setAspectLayer,
    applyPreset,
    applyCustom,
    saveCustom,
  };
}

/**
 * Show or hide one aspect type (the count strip under the wheel), outside
 * React: the same commit as the Aspects controls.
 */
export function toggleAspectType(type: AspectId) {
  hydrateLocal();
  const prev = snapshot.stored;
  const parts = liveParts(prev.live, prev.configs);
  const types = new Set(parts.aspectFilter.types);
  if (types.has(type)) types.delete(type);
  else types.add(type);
  const live = partsToView(
    new Set(prev.live.bodies),
    { ...parts.aspectFilter, types },
    parts.overlays,
    parts.stars,
    parts.mids,
    prev.live.readingDepth,
    prev.live.folds,
  );
  commit({
    presetId: matchNamedPreset(live) ?? "custom",
    custom: prev.custom,
    live,
    configs: prev.configs,
    aspectLayer: prev.aspectLayer ?? "both",
  });
}

/**
 * How much of the aspect web the wheel draws (the density switch by the count
 * strip): the aspect types and widest orb of the Minimal, Classic and Advanced
 * views, leaving the bodies, points and overlays as they are.
 */
export type AspectDensity = "simple" | "standard" | "detailed";
export const ASPECT_DENSITY_ORDER: AspectDensity[] = ["simple", "standard", "detailed"];
const DENSITY_VIEW: Record<AspectDensity, NamedPresetId> = { simple: "minimal", standard: "classic", detailed: "advanced" };

/** The density the aspect filter matches now (null when it is set by hand). */
export function currentAspectDensity(): AspectDensity | null {
  const live = snapshot.stored.live;
  const types = [...live.aspects].sort().join(",");
  for (const d of ASPECT_DENSITY_ORDER) {
    const v = NAMED_PRESETS[DENSITY_VIEW[d]];
    if ([...v.aspects].sort().join(",") === types && Math.abs(v.maxOrb - live.maxOrb) < 1e-9) return d;
  }
  return null;
}

/** Draw the aspects of a density: its types and widest orb, nothing else changed. */
export function applyAspectDensity(d: AspectDensity) {
  hydrateLocal();
  const prev = snapshot.stored;
  const v = NAMED_PRESETS[DENSITY_VIEW[d]];
  const parts = liveParts(prev.live, prev.configs);
  const live = partsToView(
    new Set(prev.live.bodies),
    { ...parts.aspectFilter, types: new Set(v.aspects), maxOrb: v.maxOrb },
    parts.overlays,
    parts.stars,
    parts.mids,
    prev.live.readingDepth,
    prev.live.folds,
  );
  commit({
    presetId: matchNamedPreset(live) ?? "custom",
    custom: prev.custom,
    live,
    configs: prev.configs,
    aspectLayer: prev.aspectLayer ?? "both",
  });
}

/** The named view the chart matches now (null when customised). */
export function currentNamedPreset(): NamedPresetId | null {
  return matchNamedPreset(snapshot.stored.live);
}

/** Subscribe to chart-view changes outside React hooks. */
export function subscribeChartView(fn: () => void): () => void {
  return subscribe(fn);
}

/** Apply a named view (the density chip): the same commit as the presets menu. */
export function applyNamedPreset(id: NamedPresetId) {
  hydrateLocal();
  const next = cloneChartView(NAMED_PRESETS[id]);
  const prev = snapshot.stored;
  commit({
    presetId: id,
    custom: prev.custom,
    live: next,
    configs: id === "all" || id === "advanced" ? prev.configs : [],
    aspectLayer: prev.aspectLayer ?? "both",
  });
}

export type { OverlayId, AspectId, BodyId };
