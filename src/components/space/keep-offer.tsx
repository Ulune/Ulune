import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/locale";
import { openSpaceSheet, useSpace } from "@/lib/space/state";

export const KEEP_NOTE_KEY = "ulune.hint.keep.v1";

/** Shown on this visit already: it stays for the visit, whatever page. */
let shownThisVisit = false;

function seenBefore(): boolean {
  try {
    return window.localStorage.getItem(KEEP_NOTE_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Under the chart while nothing is kept (just looking, or a private space
 * locked): one quiet line saying so, and the way to keep it. It shows on the
 * visit of a first chart only (UI plan, part 95); after that the top bar's
 * Sign in (or Unlock) carries a small dot while the chart on screen isn't
 * kept (space-button.tsx). No pop-up, no second reminder.
 */
export function KeepOffer() {
  const { t } = useI18n();
  const status = useSpace((s) => s.status);
  const [show, setShow] = useState(shownThisVisit);
  const unkept = status === "none" || status === "locked";
  useEffect(() => {
    if (!unkept || shownThisVisit || seenBefore()) return;
    shownThisVisit = true;
    setShow(true);
    try {
      window.localStorage.setItem(KEEP_NOTE_KEY, "1");
    } catch {
      /* this visit only */
    }
  }, [unkept]);
  if (!unkept || !show) return null;
  const locked = status === "locked";
  return (
    <span className="ob-keep" data-testid="keep-offer">
      {t("keepNotKept")}{" "}
      <button
        type="button"
        className="ob-keep-link"
        data-testid="keep-sign-in"
        onClick={() => openSpaceSheet(locked ? "unlock" : "create")}
      >
        {t(locked ? "keepUnlock" : "keepSignIn")}
      </button>
    </span>
  );
}
