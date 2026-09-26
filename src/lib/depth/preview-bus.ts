/**
 * Cross-highlight between panels and charts. Pointing at a Hello cell, a
 * table row or a reading link sends its chart id (`planet:sun`,
 * `aspect:…`, `gate:34`…); the chart on stage lifts that element. The chart
 * in turn announces what the pointer is on, so companions can light up.
 */

type Listener = (id: string | null) => void;

const previewListeners = new Set<Listener>();
const chartListeners = new Set<Listener>();
let lastPreview: string | null = null;
let lastChart: string | null = null;

/** A panel asks the chart to preview `id` (null clears). */
export function previewChartId(id: string | null) {
  if (id === lastPreview) return;
  lastPreview = id;
  for (const fn of previewListeners) fn(id);
}

export function onChartPreview(fn: Listener): () => void {
  previewListeners.add(fn);
  return () => previewListeners.delete(fn);
}

export function currentChartPreview(): string | null {
  return lastPreview;
}

/** The chart reports the element under the pointer (null when none). */
export function announceChartHover(id: string | null) {
  if (id === lastChart) return;
  lastChart = id;
  for (const fn of chartListeners) fn(id);
}

export function onChartHover(fn: Listener): () => void {
  chartListeners.add(fn);
  return () => chartListeners.delete(fn);
}

export function currentChartHover(): string | null {
  return lastChart;
}

/**
 * The pointer has to rest on a source this long before the chart answers, so
 * sweeping across rows (or scrolling a table under a still pointer) doesn't
 * flash one element after another. Moving straight from one source to the
 * next hands over without a blank in between.
 */
const DWELL_MS = 90;
let pendingTimer = 0;

function schedulePreview(id: string | null, delayMs: number) {
  if (typeof window === "undefined") return;
  if (pendingTimer) window.clearTimeout(pendingTimer);
  pendingTimer = 0;
  if (delayMs <= 0) {
    previewChartId(id);
    return;
  }
  pendingTimer = window.setTimeout(() => {
    pendingTimer = 0;
    previewChartId(id);
  }, delayMs);
}

/** Props that make any element a preview source for `id`. */
export function previewProps(id: string | null | undefined) {
  if (!id) return {};
  return {
    onPointerEnter: (e: { pointerType?: string }) => {
      if (e.pointerType === "touch") return;
      schedulePreview(id, DWELL_MS);
    },
    onPointerLeave: () => schedulePreview(null, DWELL_MS),
    // A click usually swaps the panel's content: the hovered source may be
    // gone before it can report a leave, so let go of the preview now.
    onPointerDown: () => schedulePreview(null, 0),
    onFocus: () => schedulePreview(id, 0),
    onBlur: () => schedulePreview(null, 0),
  };
}
