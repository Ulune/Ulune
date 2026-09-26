import { Component, type ReactNode } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n/locale";
import { studioSearch } from "@/studio/url";
import { useStudioStore } from "@/studio/store";

function StageThrower(): ReactNode {
  if (typeof window === "undefined") return null;
  throw new Error("stage throw");
}

class ErrorSlotBoundary extends Component<
  {
    title: string;
    retryLabel: string;
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

  render() {
    if (this.state.error) {
      return (
        <section
          data-testid="error-slot"
          className="ulune-panel min-w-0 overflow-hidden px-5 py-10 md:px-8 md:py-14"
        >
          <p className="font-display text-2xl leading-none text-fg">{this.props.title}</p>
          <p className="mt-[var(--space-2)] font-mono text-sm text-fg-muted">
            {this.state.error.message}
          </p>
          <button
            type="button"
            data-testid="error-slot-retry"
            className="mt-[var(--space-4)] inline-flex min-h-11 items-center rounded-md border border-border px-3 text-sm text-fg hover:border-border-strong"
            onClick={() => {
              this.props.onRetry();
              this.setState({ error: null, suppress: true });
            }}
          >
            {this.props.retryLabel}
          </button>
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
      retryLabel={t("errorSlotRetry")}
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
