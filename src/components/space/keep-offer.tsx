import { useI18n } from "@/lib/i18n/locale";
import { openSpaceSheet, useSpace } from "@/lib/space/state";

/**
 * Under the chart while nothing is kept (just looking, or a private space
 * locked): one quiet line saying so, and the way to keep it. No pop-up, no
 * second reminder.
 */
export function KeepOffer() {
  const { t } = useI18n();
  const status = useSpace((s) => s.status);
  if (status !== "none" && status !== "locked") return null;
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
