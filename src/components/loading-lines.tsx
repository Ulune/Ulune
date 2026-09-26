import { useI18n } from "@/lib/i18n/locale";

/**
 * A quiet stand-in for a part of the studio that is still downloading (a
 * table, a mode, a reading): a few soft lines, announced as loading.
 */
export function LoadingLines({ testId, lines = 3 }: { testId?: string; lines?: number }) {
  const { t } = useI18n();
  return (
    <div className="ob-loading" data-testid={testId} role="status" aria-busy="true" aria-label={t("loadingPart")}>
      {Array.from({ length: lines }, (_, i) => (
        <span key={i} aria-hidden />
      ))}
    </div>
  );
}

/** The same place when the download failed: one line and a way to try again. */
export function LoadFailed({ onRetry, testId }: { onRetry: () => void; testId?: string }) {
  const { t } = useI18n();
  return (
    <div className="ob-loading-failed" data-testid={testId} role="alert">
      <p>{t("loadingPartFailed")}</p>
      <button type="button" className="ob-btn" onClick={onRetry}>
        {t("errorSlotRetry")}
      </button>
    </div>
  );
}
