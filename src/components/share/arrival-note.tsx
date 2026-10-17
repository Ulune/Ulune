import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/lib/i18n/locale";
import { shareWords } from "@/lib/i18n/catalog/share-words";
import { bookT } from "@/lib/i18n/words-book";
import { openSpaceSheet, useSpace } from "@/lib/space/state";
import { showArrivalNote, type ArrivalNote } from "./share-state";
import "./share.css";

/*
 * After a shared chart arrives (share plan, feature 1), when keeping it needs
 * the reader: with no private space, the offer to create one ("Keep this
 * chart: create your private space, free, on this device, encrypted"), the
 * keep note's offer made once more for a chart that came to stay; with a
 * locked space that could not hold it, the way to unlock it. One quiet card
 * at the foot of the page, until it is answered or put away; it goes by
 * itself once the space is open.
 */
export function ArrivalNoteCard({ note }: { note: ArrivalNote }) {
  const { t: tc, locale } = useI18n();
  const t = bookT(shareWords, tc, locale);
  const status = useSpace((s) => s.status);

  useEffect(() => {
    if (status === "open") showArrivalNote(null);
  }, [status]);

  if (typeof document === "undefined" || status === "open") return null;
  const offer = note.kind === "offer";
  return createPortal(
    <div className="ob-share-note" role="region" aria-label={t("shareNoteLabel")} data-testid="share-note" data-kind={note.kind}>
      <div className="ob-share-note-words" aria-live="polite">
        <p className="ob-share-note-main">{offer ? t(note.both ? "shareOfferBoth" : "shareOffer") : t(note.both ? "shareUnlockToKeepBoth" : "shareUnlockToKeep")}</p>
        {offer ? <p className="ob-share-note-sub">{t("shareOfferNote")}</p> : null}
      </div>
      <div className="ob-share-note-actions">
        <button
          type="button"
          className="ob-btn ob-btn--primary"
          data-testid="share-note-act"
          onClick={() => openSpaceSheet(offer ? "create" : "unlock")}
        >
          <span>{offer ? t("shareOfferCreate") : t("shareUnlock")}</span>
        </button>
        <button type="button" className="ob-btn ob-btn--ghost" data-testid="share-note-later" onClick={() => showArrivalNote(null)}>
          <span>{t("shareNotNow")}</span>
        </button>
      </div>
    </div>,
    document.body,
  );
}
