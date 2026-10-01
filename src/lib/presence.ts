import { useEffect, useState } from "react";
import { prefersReducedMotion } from "@/lib/depth/env";

/** How long a closing panel stays for its exit (shell.css --dur-out, a little over). */
export const EXIT_MS = 130;

/**
 * Something that opens and closes with a motion (the motion plan): it stays
 * on screen for its exit, `leaving`, and only then goes. Opening again while
 * it leaves takes it back at once. With reduced motion it simply goes.
 */
export function usePresence(open: boolean, ms = EXIT_MS): { shown: boolean; leaving: boolean } {
  const [shown, setShown] = useState(open);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    if (open) {
      setShown(true);
      setLeaving(false);
      return;
    }
    if (!shown) return;
    if (prefersReducedMotion()) {
      setShown(false);
      setLeaving(false);
      return;
    }
    setLeaving(true);
    const id = window.setTimeout(() => {
      setShown(false);
      setLeaving(false);
    }, ms);
    return () => window.clearTimeout(id);
    // `shown` is read as it was when the panel was told to close.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ms]);
  return { shown: open || shown, leaving: !open && shown && leaving };
}
