/**
 * Cross-highlight between panels and charts. Pointing at a Hello cell, a
 * table row or a reading link sends its chart id (`planet:sun`,
 * `aspect:…`, `gate:34`…); the chart on stage lifts that element. The chart
 * in turn announces what the pointer is on, so companions can light up.
 *
 * Each message belongs to a chart scope (studio/scope.tsx): "main", the
 * studio as it is, or a Compare pane's "a" or "b" (share and compare plan,
 * feature 2). A source's scope is the region marked data-chart-scope around
 * it (none: the main one); a chart and its companions listen to their own
 * scope only, so pointing in one pane never lights the other, nor the main chart.
 */

type Listener = (id: string | null) => void;
type Entry = { fn: Listener; scope: string };

const previewListeners = new Set<Entry>();
const chartListeners = new Set<Entry>();
const lastPreview = new Map<string, string | null>();
const lastChart = new Map<string, string | null>();

/** The chart scope of a node of the page: the data-chart-scope region around it, else the main one. */
export function scopeOf(target: unknown): string {
  return (target instanceof Element && target.closest("[data-chart-scope]")?.getAttribute("data-chart-scope")) || "main";
}

function listen(set: Set<Entry>, fn: Listener, scope: string): () => void {
  const entry = { fn, scope };
  set.add(entry);
  return () => set.delete(entry);
}

/** A panel asks the chart to preview `id` (null clears). */
export function previewChartId(id: string | null, scope = "main") {
  if (id === (lastPreview.get(scope) ?? null)) return;
  lastPreview.set(scope, id);
  for (const e of previewListeners) if (e.scope === scope) e.fn(id);
}

export function onChartPreview(fn: Listener, scope = "main"): () => void {
  return listen(previewListeners, fn, scope);
}

export function currentChartPreview(scope = "main"): string | null {
  return lastPreview.get(scope) ?? null;
}

/** The chart reports the element under the pointer (null when none). */
export function announceChartHover(id: string | null, scope = "main") {
  if (id === (lastChart.get(scope) ?? null)) return;
  lastChart.set(scope, id);
  for (const e of chartListeners) if (e.scope === scope) e.fn(id);
}

export function onChartHover(fn: Listener, scope = "main"): () => void {
  return listen(chartListeners, fn, scope);
}

export function currentChartHover(scope = "main"): string | null {
  return lastChart.get(scope) ?? null;
}

/**
 * The pointer has to rest on a source this long before the chart answers, so
 * sweeping across rows (or scrolling a table under a still pointer) doesn't
 * flash one element after another. Moving straight from one source to the
 * next hands over without a blank in between (each scope on its own clock).
 */
const DWELL_MS = 90;
const pending = new Map<string, number>();

type SourceEvent = { pointerType?: string; currentTarget?: EventTarget | null };

function schedulePreview(id: string | null, delayMs: number, e?: SourceEvent) {
  if (typeof window === "undefined") return;
  const scope = scopeOf(e?.currentTarget);
  window.clearTimeout(pending.get(scope));
  pending.delete(scope);
  if (delayMs <= 0) {
    previewChartId(id, scope);
    return;
  }
  pending.set(
    scope,
    window.setTimeout(() => {
      pending.delete(scope);
      previewChartId(id, scope);
    }, delayMs),
  );
}

/** Props that make any element a preview source for `id` (in the scope of the region it stands in). */
export function previewProps(id: string | null | undefined) {
  if (!id) return {};
  return {
    onPointerEnter: (e?: SourceEvent) => {
      if (e?.pointerType === "touch") return;
      schedulePreview(id, DWELL_MS, e);
    },
    onPointerLeave: (e?: SourceEvent) => schedulePreview(null, DWELL_MS, e),
    // A click usually swaps the panel's content: the hovered source may be
    // gone before it can report a leave, so let go of the preview now.
    onPointerDown: (e?: SourceEvent) => schedulePreview(null, 0, e),
    onFocus: (e?: SourceEvent) => schedulePreview(id, 0, e),
    onBlur: (e?: SourceEvent) => schedulePreview(null, 0, e),
  };
}
