import { useI18n } from "@/lib/i18n/locale";
import { isStaleVersion } from "@/lib/stale-chunks";

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

/**
 * The same place when the download failed: one line and a way to try again.
 * A code file gone after a deploy (with charts a reload would lose, see
 * lib/stale-chunks.ts) says a new version is out, and offers the reload.
 */
export function LoadFailed({ onRetry, testId, error }: { onRetry: () => void; testId?: string; error?: unknown }) {
  const { t } = useI18n();
  const stale = error !== undefined && isStaleVersion(error);
  return (
    <div className="ob-loading-failed" data-testid={testId} data-stale={stale ? "1" : undefined} role="alert">
      {stale ? (
        <>
          <p>{t("staleVersionTitle")}</p>
          <p>{t("staleVersionBody")}</p>
          <button type="button" className="ob-btn" data-testid="load-failed-reload" onClick={() => window.location.reload()}>
            {t("appErrorReload")}
          </button>
        </>
      ) : (
        <p>{t("loadingPartFailed")}</p>
      )}
      <button type="button" className="ob-btn" onClick={onRetry}>
        {t("errorSlotRetry")}
      </button>
    </div>
  );
}
