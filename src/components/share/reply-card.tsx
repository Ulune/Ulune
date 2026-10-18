import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/lib/i18n/locale";
import { shareWords } from "@/lib/i18n/catalog/share-words";
import { bookT } from "@/lib/i18n/words-book";
import { useStudioStore } from "@/studio/store";
import { holdRequest, openShareSheet, useShareUi } from "./share-state";
import "./share.css";

/*
 * Send it back (share and compare plan, idea B4): once the reader has cast
 * the chart someone asked for, a card at the foot of the page says it is
 * ready and opens the share sheet already set to share it (that chart, its
 * name in, the page the asker chose): the asker receives an ordinary share
 * link, which arrives as any does (kept in their space, its inbox if it is
 * locked). The answer is a chart kept since the request came, on screen; a
 * chart the reader had before, or one being made, is not offered. Once the
 * sheet has been used and closed, or "Not now" is pressed, the request goes:
 * Share and export can always share the chart again.
 */
export function ReplyCard() {
  const { t: tc, locale } = useI18n();
  const t = bookT(shareWords, tc, locale);
  const request = useShareUi((s) => s.request);
  const sheet = useShareUi((s) => s.sheet);
  const answered = useStudioStore((s) => {
    if (!request || s.creating || s.pair.addingPartnerFor || !s.chart) return false;
    const row = s.rows.find((r) => r.id === s.activeId);
    return Boolean(row && row.savedAt >= request.at);
  });
  // The share sheet opened from here, then closed: the request is answered.
  const sent = useRef(false);
  useEffect(() => {
    if (sheet || !sent.current) return;
    sent.current = false;
    holdRequest(null);
  }, [sheet]);

  if (typeof document === "undefined" || !request || !answered || sheet) return null;
  return createPortal(
    <div className="ob-share-note ob-reply" role="region" aria-label={t("replyLabel")} data-testid="reply-card">
      <div className="ob-share-note-words" aria-live="polite">
        <p className="ob-share-note-main">{request.asker ? t("replyMain", { name: request.asker }) : t("replyMainAnon")}</p>
        <p className="ob-share-note-sub">{t("replyNote")}</p>
      </div>
      <div className="ob-share-note-actions">
        <button
          type="button"
          className="ob-btn ob-btn--primary"
          data-testid="reply-send"
          onClick={() => {
            sent.current = true;
            openShareSheet({ asker: request.asker });
          }}
        >
          <span>{t("replySend")}</span>
        </button>
        <button type="button" className="ob-btn ob-btn--ghost" data-testid="reply-later" onClick={() => holdRequest(null)}>
          <span>{t("shareNotNow")}</span>
        </button>
      </div>
    </div>,
    document.body,
  );
}
