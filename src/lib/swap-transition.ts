/**
 * Switches between places (the motion plan): a mode, the wheel and the
 * table, a panel tab. The place that arrives is drawn at once and eases in
 * from a little transparency (shell.css, .ob-swap, on the newly keyed
 * element); the bars around it never move.
 *
 * Until part 87e this ran the browser's view transition, which keeps a
 * picture of the whole page and blends it into the new one. The blend went
 * through a darker frame (the old picture left faster than the new one came,
 * and Safari can paint the gap black), the page froze on that picture while
 * the new place was drawn, and the bars' pill jumped instead of gliding. A
 * plain swap has none of that.
 */
export type SwapPart = "figure" | "pane";

export function swapTransition(update: () => void, _opts: { part: SwapPart; dir?: -1 | 0 | 1 }) {
  update();
}
