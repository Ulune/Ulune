/**
 * The table page's arithmetic, kept apart from the DOM so it can be tested:
 * which part is being read, and where the page must scroll to show a part.
 */

/**
 * The part being read: the last one whose top has reached the line under
 * the pinned bar. At the very end of the page the last part is the one being
 * read, even when it is too short to reach that line. `tops` are the parts'
 * tops in document order, in the same coordinates as `line`.
 */
export function activePartIndex(tops: readonly number[], line: number, atEnd: boolean): number {
  if (!tops.length) return -1;
  if (atEnd) return tops.length - 1;
  let at = 0;
  for (let i = 0; i < tops.length; i += 1) {
    const top = tops[i] ?? Infinity;
    if (top <= line + 1) at = i;
    else break;
  }
  return at;
}

/** At the end of the page: scrolled to the bottom of a page that scrolls at all. */
export function isAtEnd(scrollTop: number, maxScroll: number): boolean {
  return maxScroll > 4 && scrollTop >= maxScroll - 2;
}

/**
 * The scroll position that puts a part's top just under the pinned bar,
 * within what the page can scroll. `partTop` and `scrollerTop` are viewport
 * coordinates (getBoundingClientRect), `scrollTop` the scroller's position.
 */
export function scrollTargetFor(
  partTop: number,
  scrollTop: number,
  scrollerTop: number,
  barHeight: number,
  maxScroll: number,
): number {
  const target = scrollTop + (partTop - scrollerTop) - barHeight;
  return Math.max(0, Math.min(Math.max(0, maxScroll), Math.round(target)));
}

/**
 * How far to slide the bar sideways so its current link is in view, with a
 * margin on either side; unchanged when it already is.
 */
export function barScrollFor(
  linkLeft: number,
  linkWidth: number,
  barScroll: number,
  barWidth: number,
  margin = 24,
): number {
  if (linkLeft - margin < barScroll) return Math.max(0, linkLeft - margin);
  if (linkLeft + linkWidth + margin > barScroll + barWidth) return linkLeft + linkWidth + margin - barWidth;
  return barScroll;
}
