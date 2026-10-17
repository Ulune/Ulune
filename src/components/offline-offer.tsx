/**
 * The one question Ulune asks about keeping itself on this device
 * (src/lib/offline.ts): on a return visit, once the reader has met the wheel
 * (its first-run hint is behind them), their chart has been on screen a
 * little while and they are not in the middle of something. It stands where
 * the first-run hint stood. An answer is kept for good (Settings → Your data
 * can change it); going on with the chart instead puts the question away
 * until another visit. Here, when to ask; the question itself
 * (offline-offer-card.tsx) loads when it is asked.
 */
import { Suspense, useCallback, useEffect, useState } from "react";
import { lazyNamed } from "@/lib/lazy-component";
import { offlineChoice, offlineSupported } from "@/lib/offline";
import { useTour } from "@/lib/tour/state";

/** The question itself, its own small download, fetched when it is asked (first-load review, 17 Oct 2026). */
const OfflineOfferCard = lazyNamed(() => import("./offline-offer-card"), "OfflineOfferCard");

/** Charts were saved here before this visit (the boot script's flag, read before the studio lifts it). */
const RETURNING =
  typeof document !== "undefined" && document.documentElement.hasAttribute("data-returning");

/** The wheel's first-run hint was pinned past or closed (wheel-hint.tsx). */
function hintSeen(): boolean {
  try {
    return window.localStorage.getItem("ulune.hint.wheel.v1") === "1";
  } catch {
    return false;
  }
}

const SETTLE_MS = 6000;
const QUIET_MS = 3000;

export function OfflineOffer() {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  // Ask once the chart has been up a while and nothing is being done.
  useEffect(() => {
    if (!RETURNING || !offlineSupported() || offlineChoice() !== null || !hintSeen()) return;
    const since = performance.now();
    let lastInput = since;
    const touched = () => {
      lastInput = performance.now();
    };
    const opts = { capture: true, passive: true } as const;
    window.addEventListener("pointerdown", touched, opts);
    window.addEventListener("keydown", touched, opts);
    window.addEventListener("wheel", touched, opts);
    const timer = window.setInterval(() => {
      const now = performance.now();
      if (now - since < SETTLE_MS || now - lastInput < QUIET_MS) return;
      // Not while the tour speaks.
      if (useTour.getState().active) return;
      window.clearInterval(timer);
      setOpen(true);
    }, 500);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pointerdown", touched, opts);
      window.removeEventListener("keydown", touched, opts);
      window.removeEventListener("wheel", touched, opts);
    };
  }, []);

  if (!open) return null;
  return (
    <Suspense fallback={null}>
      <OfflineOfferCard onClose={close} />
    </Suspense>
  );
}
