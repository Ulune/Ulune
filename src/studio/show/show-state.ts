import { create } from "zustand";

/*
 * Show mode's switch (share and compare plan, idea B2): the page as a
 * presentation, for a laptop on a table or a TV. Here only what the first
 * page needs: whether it is on, the way in and out, and the full screen,
 * asked for within the press or key that wants it (a browser grants it only
 * then). Everything else (the layout, the bar, the keys, Escape) comes with
 * show-mode.tsx when it is first used (ExtrasHost, host.tsx; show-load.ts).
 *
 * For Compare (studio/compare): `useShowMode((s) => s.on)` says whether the
 * panes are shown large, and html[data-show] is set while it is on (its
 * stylesheet can size the panes under it); Show mode's bar has Compare's
 * toggle (show-mode.tsx).
 */

export const useShowMode = create<{ on: boolean }>(() => ({ on: false }));

const on = () => useShowMode.getState().on;

/**
 * Into Show mode: the full screen where the browser grants one to a page
 * (not an iPhone, nor Safari before 16.4), else the window as it is. Show
 * mode leaves it with itself (show-mode.tsx); one granted only after Show
 * mode was left goes at once.
 */
export function enterShowMode(): void {
  if (on()) return;
  if (!document.fullscreenElement) {
    try {
      document.documentElement.requestFullscreen?.({ navigationUI: "hide" }).then(
        () => void (on() || document.exitFullscreen().catch(() => {})),
        () => {},
      );
    } catch {
      /* the window as it is */
    }
  }
  useShowMode.setState({ on: true });
}

export const leaveShowMode = (): void => useShowMode.setState({ on: false });

export const toggleShowMode = (): void => (on() ? leaveShowMode() : enterShowMode());
