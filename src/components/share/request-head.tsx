import { X } from "lucide-react";
import { useI18n } from "@/lib/i18n/locale";
import { shareWords } from "@/lib/i18n/catalog/share-words";
import { bookT } from "@/lib/i18n/words-book";
import { holdRequest, useShareUi } from "./share-state";
import "./share.css";

/*
 * Above the birth form, when it opened for a request (share and compare
 * plan, idea B4): who asked, if they said ("Camille asked for your chart",
 * else "Someone asked you for your chart"), and what happens next. The
 * request can be set aside here; the form stays, for a chart of one's own.
 */
export function RequestHead() {
  const { t: tc, locale } = useI18n();
  const t = bookT(shareWords, tc, locale);
  const request = useShareUi((s) => s.request);
  if (!request) return null;
  return (
    <div className="ob-request-head" role="note" data-testid="request-head">
      <div className="ob-request-words">
        <p className="ob-request-title font-display" data-testid="request-title">
          {request.asker ? t("requestHead", { name: request.asker }) : t("requestHeadAnon")}
        </p>
        <p className="ob-request-line">{t("requestHeadLine")}</p>
      </div>
      <button
        type="button"
        className="ob-icon-btn ob-icon-btn--quiet ob-request-dismiss"
        data-testid="request-dismiss"
        aria-label={t("requestDismiss")}
        title={t("requestDismiss")}
        onClick={() => holdRequest(null)}
      >
        <X className="size-4" strokeWidth={1.75} aria-hidden />
      </button>
    </div>
  );
}
