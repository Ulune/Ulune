/**
 * The stage following the bottom sheet (compact layout). Opening the sheet
 * gives the stage half the screen, closing it gives it back: the wheel and the
 * rows under it used to jump to their new size at once (on opening) or once
 * the sheet had gone (on closing), a snap while the sheet slid. Now they move
 * with the sheet: their places are read before the change and after it, and
 * each is played back from where it stood (a FLIP, transforms only, on the
 * compositor) in the sheet's own time and curve.
 *
 * Nothing here touches the chart's hover or focus painting: the moving pieces
 * are the figure's frame and the footer's rows, and a transform keeps the
 * pointer mapping right (the wheel maps the pointer through its own box).
 */
import { prefersReducedMotion } from "@/lib/depth/env";

/** The sheet's slide (shell.css --sheet-move, --sheet-ease): the stage moves with it. */
export const SHEET_MOVE_MS = 280;
export const SHEET_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

type Box = { left: number; top: number; width: number; height: number };
type Snapshot = {
  at: number;
  stage: Element;
  figure: Element | null;
  /** The wheel's own square in the figure (the figure is wider than the wheel). */
  wheel: Box | null;
  figureBox: Box | null;
  rows: Map<Element, Box>;
  foot: Element | null;
};

let pending: Snapshot | null = null;
/** A change is drawn within a frame or two of being asked for. */
const STALE_MS = 400;
const running = new Set<Animation>();

function boxOf(el: Element): Box | null {
  const r = el.getBoundingClientRect();
  if (r.width < 1 || r.height < 1) return null;
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

function wheelOf(figure: Element | null): Element | null {
  return figure?.querySelector(".ulune-wheel-zoom-inner") ?? null;
}

/** The rows under the figure (aspect strip, controls, caption) that move with it. */
function rowsOf(stage: Element): Element[] {
  return [...stage.querySelectorAll(":scope > .ob-foot > *")];
}

/** Ask the wheel to size itself for the new stage now, not on its next frame. */
function refitNow(figure: Element | null) {
  const port = figure?.querySelector(".ulune-wheel-zoom-port");
  port?.dispatchEvent(new CustomEvent("ulune:refit"));
}

/** Read where things stand, before the sheet changes (the first read is kept until played). */
export function captureStage() {
  if (typeof document === "undefined" || prefersReducedMotion()) return;
  // A reading no change followed (the sheet was told to move and did not) is stale.
  if (pending && performance.now() - pending.at < STALE_MS) return;
  const stage = document.querySelector(".ob-body .ob-stage");
  if (!stage) return;
  // A move still under way is read where it is on screen, then let go.
  const figure = stage.querySelector(":scope > .ob-figure");
  const wheelEl = wheelOf(figure);
  const rows = new Map<Element, Box>();
  for (const row of rowsOf(stage)) {
    const b = boxOf(row);
    if (b) rows.set(row, b);
  }
  pending = {
    at: performance.now(),
    stage,
    figure,
    wheel: wheelEl ? boxOf(wheelEl) : null,
    figureBox: figure ? boxOf(figure) : null,
    rows,
    foot: stage.querySelector(":scope > .ob-foot"),
  };
  for (const a of running) a.cancel();
  running.clear();
}

/** Forget a reading that no change followed. */
export function dropStage() {
  pending = null;
}

function play(el: Element, frames: Keyframe[], delay = 0, after?: () => void) {
  if (!(el instanceof HTMLElement) || typeof el.animate !== "function") return;
  const a = el.animate(frames, { duration: SHEET_MOVE_MS, easing: SHEET_EASE, delay, fill: "backwards" });
  running.add(a);
  const done = () => {
    running.delete(a);
    after?.();
  };
  a.onfinish = done;
  a.oncancel = done;
}

/** After the change (a layout effect: before the new layout is painted), play each piece from where it stood. */
export function playStage() {
  const snap = pending;
  pending = null;
  if (!snap || !snap.stage.isConnected || performance.now() - snap.at > STALE_MS) return;
  const { stage, figure } = snap;
  // The figure: the wheel's square goes from its old box to its new one
  // (scale and move), the figure's frame carried along with it.
  if (figure && figure.isConnected && stage.querySelector(":scope > .ob-figure") === figure) {
    refitNow(figure);
    const wheelEl = wheelOf(figure);
    const fig = boxOf(figure);
    const now = wheelEl ? boxOf(wheelEl) : null;
    if (fig && snap.figureBox) {
      let s = 1;
      let dx = snap.figureBox.left - fig.left;
      let dy = snap.figureBox.top - fig.top;
      if (now && snap.wheel) {
        s = snap.wheel.width / now.width;
        dx = snap.wheel.left - fig.left - s * (now.left - fig.left);
        dy = snap.wheel.top - fig.top - s * (now.top - fig.top);
      }
      if (Math.abs(s - 1) > 0.004 || Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        // The wheel measures its room on screen: while its frame is scaled it
        // waits (wheel-zoom.tsx), and looks again once the move is over.
        figure.setAttribute("data-flipping", "");
        play(
          figure,
          [
            { transformOrigin: "0 0", transform: `translate(${dx}px, ${dy}px) scale(${s})` },
            { transformOrigin: "0 0", transform: "none" },
          ],
          0,
          () => {
            figure.removeAttribute("data-flipping");
            refitNow(figure);
          },
        );
      }
    }
  }
  // The rows: each slides from where it stood; one that just appeared fades in
  // as the wheel makes room for it.
  const footSame = snap.foot !== null && snap.foot === stage.querySelector(":scope > .ob-foot");
  for (const row of rowsOf(stage)) {
    const was = snap.rows.get(row);
    const now = boxOf(row);
    if (!now) continue;
    if (!was) {
      if (footSame) play(row, [{ opacity: 0 }, { opacity: 1 }], SHEET_MOVE_MS * 0.35);
      continue;
    }
    const dx = was.left - now.left;
    const dy = was.top - now.top;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
    play(row, [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }]);
  }
}
