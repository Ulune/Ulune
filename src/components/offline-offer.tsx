/**
 * The one question Ulune asks about keeping itself on this device
 * (src/lib/offline.ts): on a return visit, once the reader has met the wheel
 * (its first-run hint is behind them), their chart has been on screen a
 * little while and they are not in the middle of something. It stands where
 * the first-run hint stood. An answer is kept for good (Settings → Your data
 * can change it); going on with the chart instead puts the question away
 * until another visit.
 */
import { useEffect, useId, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/locale";
import { offlineChoice, offlineSupported, turnOfflineOff, turnOfflineOn } from "@/lib/offline";
import { toast } from "@/lib/toast";
import { useTour } from "@/lib/tour/state";

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
  const { t } = useI18n();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLElement>(null);

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

  // Going on with the chart puts the question away for this visit.
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", away, true);
    return () => window.removeEventListener("pointerdown", away, true);
  }, [open]);

  if (!open) return null;
  return (
    <section ref={ref} className="ob-offline-offer" aria-labelledby={titleId} data-testid="offline-offer">
      <p id={titleId} className="ob-offline-title">
        {t("offlineOfferTitle")}
      </p>
      <p className="ob-offline-body">{t("offlineOfferBody")}</p>
      <div className="ob-offline-actions">
        <button
          type="button"
          className="ob-btn ob-btn--ghost"
          data-testid="offline-no"
          onClick={() => {
            setOpen(false);
            void turnOfflineOff();
          }}
        >
          {t("offlineOfferNo")}
        </button>
        <button
          type="button"
          className="ob-btn ob-btn--primary"
          data-testid="offline-yes"
          onClick={() => {
            setOpen(false);
            void turnOfflineOn().then((ok) => {
              if (ok) toast(t("offlineOn"));
            });
          }}
        >
          {t("offlineOfferYes")}
        </button>
      </div>
    </section>
  );
}
