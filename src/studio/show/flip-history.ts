/*
 * The last two charts open (share and compare plan, idea B3): the one on
 * screen and the one before it, for a quick back and forth (the P key, the
 * switcher's "Back to…" row, ⌘K, Show mode's bar). Pure, so the unit tests
 * read it as it is (scripts/show-mode.test.mjs); studio/show/flip.ts follows
 * the studio's store with it. Whether a chart is still kept is asked when the
 * flip is offered, not as charts come and go, so the history itself is two
 * ids and these few lines (they come with every page's first download). Held
 * in memory, and with a private space open in its sealed library record
 * (studio/space-sync.ts): never in plain storage.
 */

export type FlipHistory = { current: string | null; previous: string | null };

export const NO_HISTORY: FlipHistory = { current: null, previous: null };

/**
 * The history once `activeId` is on screen: a new chart pushes the one
 * before it back (unless that one is no longer kept: the older one stays);
 * the same chart, or none (a form open, the space locked), changes nothing.
 */
export function moveFlip(history: FlipHistory, activeId: string | null, ids: ReadonlySet<string>): FlipHistory {
  if (!activeId || activeId === history.current) return history;
  return { current: activeId, previous: history.current && ids.has(history.current) ? history.current : history.previous };
}

/** The chart to flip to: the previous one, while it is still kept and not the one on screen. */
export function flipTarget(history: FlipHistory, activeId: string | null, ids: ReadonlySet<string>): string | null {
  const { previous } = history;
  return previous && previous !== activeId && ids.has(previous) ? previous : null;
}

/**
 * A previous chart remembered by the private space, taken when the tab has
 * none of its own to offer (a tab's own back and forth is newer): only a
 * chart the space keeps, and not the one on screen.
 */
export function adoptFlip(history: FlipHistory, remembered: string | null | undefined, activeId: string | null, ids: ReadonlySet<string>): FlipHistory {
  if (flipTarget(history, activeId, ids) || !remembered || remembered === activeId || !ids.has(remembered)) return history;
  return { current: activeId, previous: remembered };
}
