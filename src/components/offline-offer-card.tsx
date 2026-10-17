/**
 * The question of keeping Ulune on this device, as offline-offer.tsx asks it
 * once the moment is right: its own small download, fetched only then, out of
 * the studio's first one (first-load review, 17 Oct 2026). An answer is kept
 * for good (Settings → Your data can change it); going on with the chart
 * instead puts the question away until another visit.
 */
import { useEffect, useId, useRef } from "react";
import { useI18n } from "@/lib/i18n/locale";
import { turnOfflineOff, turnOfflineOn } from "@/lib/offline";
import { toast } from "@/lib/toast";

export function OfflineOfferCard({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const titleId = useId();
  const ref = useRef<HTMLElement>(null);

  // Going on with the chart puts the question away for this visit.
  useEffect(() => {
    const away = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("pointerdown", away, true);
    return () => window.removeEventListener("pointerdown", away, true);
  }, [onClose]);

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
            onClose();
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
            onClose();
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
