import { useEffect, useState } from "react";

/**
 * A how-to line shown until it has been used once (UI plan, part 95): the
 * first time the pointer finds something on the figure, the hint goes for
 * good on this device. Kept in this browser only; read after mounting, so
 * the server's page and the first paint agree.
 */
export function useFirstHint(key: string, used: boolean): boolean {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      setShow(window.localStorage.getItem(key) !== "1");
    } catch {
      setShow(true);
    }
  }, [key]);
  useEffect(() => {
    if (!used || !show) return;
    setShow(false);
    try {
      window.localStorage.setItem(key, "1");
    } catch {
      /* this visit only */
    }
  }, [used, show, key]);
  return show;
}
