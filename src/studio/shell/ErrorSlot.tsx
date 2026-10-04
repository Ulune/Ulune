import { Component, type ReactNode } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { reportError } from "@/lib/error-report";
import { useI18n } from "@/lib/i18n/locale";
import { isStaleVersion, recoverFromStaleChunk } from "@/lib/stale-chunks";
import { studioSearch } from "@/studio/url";
import { useStudioStore } from "@/studio/store";

function StageThrower(): ReactNode {
  if (typeof window === "undefined") return null;
  throw new Error("stage throw");
}

class ErrorSlotBoundary extends Component<
  {
    title: string;
    body: string;
    details: string;
    retryLabel: string;
    staleTitle: string;
    staleBody: string;
    reloadLabel: string;
    armThrow: boolean;
    onRetry: () => void;
    children: ReactNode;
  },
  { error: Error | null; suppress: boolean }
> {
  state = { error: null as Error | null, suppress: false };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    // A code file gone after a deploy: one reload brings the new version.
    if (!recoverFromStaleChunk(error)) reportError("slot", error);
  }

  render() {
    if (this.state.error) {
      // A code file gone after a deploy, with charts a reload would lose: say so, and let the visitor reload.
      const stale = isStaleVersion(this.state.error);
      return (
        <section
          data-testid="error-slot"
          data-stale={stale ? "1" : undefined}
          className="ulune-panel min-w-0 overflow-hidden px-5 py-10 md:px-8 md:py-14"
        >
          <p className="font-display text-2xl leading-none text-fg">{stale ? this.props.staleTitle : this.props.title}</p>
          <p className="mt-[var(--space-2)] text-sm text-fg-muted">{stale ? this.props.staleBody : this.props.body}</p>
          {this.state.error.message ? (
            <details className="mt-[var(--space-2)] text-xs text-fg-subtle">
              <summary className="cursor-pointer">{this.props.details}</summary>
              <p className="mt-1 font-mono break-words">{this.state.error.message}</p>
            </details>
          ) : null}
          <div className="mt-[var(--space-4)] flex flex-wrap gap-2">
            {stale ? (
              <button
                type="button"
                data-testid="error-slot-reload"
                className="inline-flex min-h-[var(--btn-h)] items-center rounded-md border border-border-strong px-3 text-sm text-fg hover:border-fg"
                onClick={() => window.location.reload()}
              >
                {this.props.reloadLabel}
              </button>
            ) : null}
            <button
              type="button"
              data-testid="error-slot-retry"
              className="inline-flex min-h-[var(--btn-h)] items-center rounded-md border border-border px-3 text-sm text-fg hover:border-border-strong"
              onClick={() => {
                this.props.onRetry();
                this.setState({ error: null, suppress: true });
              }}
            >
              {this.props.retryLabel}
            </button>
          </div>
        </section>
      );
    }
    return (
      <>
        {this.props.armThrow && !this.state.suppress ? <StageThrower /> : null}
        {this.props.children}
      </>
    );
  }
}

export function ErrorSlot({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const navigate = useNavigate({ from: "/" });
  const search = useSearch({ from: "/" });
  return (
    <ErrorSlotBoundary
      title={t("errorSlotTitle")}
      body={t("errorSlotBody")}
      details={t("appErrorDetails")}
      retryLabel={t("errorSlotRetry")}
      staleTitle={t("staleVersionTitle")}
      staleBody={t("staleVersionBody")}
      reloadLabel={t("appErrorReload")}
      armThrow={import.meta.env.DEV && search.__throw === "stage"}
      onRetry={() => {
        const page = useStudioStore.getState().page;
        const view = useStudioStore.getState().view;
        void navigate({
          to: "/",
          search: studioSearch(page, view),
          replace: true,
        });
      }}
    >
      {children}
    </ErrorSlotBoundary>
  );
}
