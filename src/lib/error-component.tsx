import { Link, type ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";
import { useEffect } from "react";
import { problemMailto } from "@/lib/contact";
import { reportError } from "@/lib/error-report";
import { useI18n } from "@/lib/i18n/locale";
import { recoverFromStaleChunk } from "@/lib/stale-chunks";

/**
 * The page a reader sees when the app itself fails: what happened in plain
 * words, a way on (reload, back to the chart, write to Ulune), and the
 * technical detail folded away for a report. The failure is reported (lib/error-report.ts);
 * a code file gone after a deploy reloads the page once instead.
 */
export function AppErrorComponent({ error }: ErrorComponentProps) {
  const { t } = useI18n();
  useEffect(() => {
    if (!recoverFromStaleChunk(error)) reportError("render", error);
  }, [error]);
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg px-6 text-center text-fg"
      data-testid="app-error"
    >
      <span className="text-danger" aria-hidden="true">
        <TriangleAlert className="size-10" strokeWidth={2} />
      </span>
      <h1 className="text-lg font-semibold">{t("appErrorTitle")}</h1>
      <p className="max-w-md text-sm text-fg-muted">{t("appErrorBody")}</p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          className="rounded-md border border-border px-3 py-2 text-sm text-fg hover:border-border-strong"
          data-testid="app-error-reload"
          onClick={() => window.location.reload()}
        >
          {t("appErrorReload")}
        </button>
        <Link to="/" className="rounded-md border border-border px-3 py-2 text-sm text-fg hover:border-border-strong">
          {t("backToChart")}
        </Link>
        <a
          href={problemMailto(t)}
          className="rounded-md px-3 py-2 text-sm text-fg-muted underline underline-offset-2 hover:text-fg"
          data-testid="app-error-report"
        >
          {t("reportProblem")}
        </a>
      </div>
      {error?.message ? (
        <details className="mt-2 max-w-md text-xs text-fg-subtle">
          <summary className="cursor-pointer">{t("appErrorDetails")}</summary>
          <p className="mt-1 font-mono break-words">{error.message}</p>
        </details>
      ) : null}
    </main>
  );
}
