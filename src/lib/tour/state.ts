import { create } from "zustand";
import { TOUR_DONE_ATTR, TOUR_KEY } from "./keys";

/**
 * The tour (components/tour/Tour.tsx, its own download): whether it runs, and
 * the one thing it remembers on this device, that it was finished or skipped
 * (`ulune.tour.v1` = "done"), so the first screen stops offering it under the
 * form. The boot script marks <html data-tour-done> from the same value before
 * the page paints. Nothing else is kept, and nothing is counted or sent.
 */

// What the guide's page (/guide) asks the studio to do when it sends a reader
// back: start the tour, or open the sample chart. Kept in the history's state,
// never in the address (components/tour/TourHost.tsx).
declare module "@tanstack/react-router" {
  interface HistoryState {
    tour?: boolean;
    sample?: boolean;
  }
}

type TourState = {
  active: boolean;
  /** Where focus goes back to when the tour ends. */
  returnFocus: HTMLElement | null;
};

export const useTour = create<TourState>(() => ({ active: false, returnFocus: null }));

/** Open the tour (from a link, the guide or the menu; never by itself). */
export function startTour(): void {
  if (useTour.getState().active) return;
  const focus = typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null;
  useTour.setState({ active: true, returnFocus: focus });
}

/** Close it; `remember` when it was finished or skipped, not when the reader simply left the chart. */
export function endTour(remember: boolean): void {
  const { returnFocus } = useTour.getState();
  useTour.setState({ active: false, returnFocus: null });
  if (remember) {
    try {
      window.localStorage.setItem(TOUR_KEY, "done");
    } catch {
      /* private mode: the link under the form simply stays */
    }
    document.documentElement.setAttribute(TOUR_DONE_ATTR, "");
  }
  if (returnFocus && returnFocus.isConnected) returnFocus.focus({ preventScroll: true });
}
