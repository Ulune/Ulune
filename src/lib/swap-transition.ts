import { flushSync } from "react-dom";
import { prefersReducedMotion } from "@/lib/depth/env";

/**
 * Switches between places (the motion plan): a mode, the wheel and the
 * table, a panel tab. The browser's own view transition keeps a picture of
 * what was there and blends it into what comes, on the compositor, so the
 * part that changes cross-fades while the bars around it stay still
 * (shell.css, html[data-vt]). Browsers without view transitions, reduced
 * motion and a hidden page switch at once, as before.
 */
type VT = { finished: Promise<void>; skipTransition: () => void };
type VTDocument = Document & { startViewTransition?: (cb: () => void) => VT };

export type SwapPart = "figure" | "pane";

let running: VT | null = null;

export function swapTransition(update: () => void, opts: { part: SwapPart; dir?: -1 | 0 | 1 }) {
  const doc = typeof document !== "undefined" ? (document as VTDocument) : null;
  const root = doc?.documentElement;
  if (!doc?.startViewTransition || !root || prefersReducedMotion() || doc.hidden || root.classList.contains("theme-switching")) {
    update();
    return;
  }
  // A second switch during one: the running one ends at once, this one starts.
  running?.skipTransition();
  root.dataset.vt = opts.part;
  root.dataset.vtDir = String(opts.dir ?? 0);
  const clear = () => {
    delete root.dataset.vt;
    delete root.dataset.vtDir;
  };
  try {
    // The new place is drawn inside the callback (React renders at once), so
    // the picture taken after it is the place as it arrives.
    const vt = doc.startViewTransition(() => flushSync(update));
    running = vt;
    vt.finished.then(
      () => {
        if (running === vt) {
          running = null;
          clear();
        }
      },
      () => {
        if (running === vt) {
          running = null;
          clear();
        }
      },
    );
  } catch {
    clear();
    update();
  }
}
