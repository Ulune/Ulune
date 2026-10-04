/**
 * On a phone, what was chosen on a figure, in one line in the reading
 * sheet's closed row (over its tabs, until it is read or let go), with a
 * button that opens its reading (review 3 Oct, R3). The same card on the
 * chart's wheels, numerology and Human Design: a tap keeps the figure whole,
 * covers none of its controls, and answers the same way everywhere.
 */
import { X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/lib/i18n/locale";
import { WIDE_QUERY } from "@/studio/dock/dock-layout";
import { useStudioStore } from "@/studio/store";

/** True on a wide screen, where the reading stands beside the figure. */
export function useWideLayout(): boolean {
  const [wide, setWide] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia(WIDE_QUERY);
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return wide;
}

export function PickCard({ text, testId = "pick-card" }: { text: string | null; testId?: string }) {
  const { t } = useI18n();
  const dockOpen = useStudioStore((s) => s.dockOpen);
  const selectedId = useStudioStore((s) => s.selectedId);
  // The card lies over the closed sheet's tab row.
  const anchor = useRef<HTMLSpanElement>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    setHost(document.querySelector<HTMLElement>(".ob-body .ob-panel-head"));
  }, []);
  const card =
    !text || !selectedId || dockOpen ? null : (
      <div className="ulune-pick-card" data-testid={testId} role="status" data-chart-pick>
        {/* The words open the reading too (the Read button is the one the keyboard reaches). */}
        <span className="ulune-pick-card-text" onClick={() => useStudioStore.getState().openDock("reading")}>
          {text}
        </span>
        <button
          type="button"
          className="ulune-pick-card-read"
          data-testid={`${testId}-read`}
          onClick={() => useStudioStore.getState().openDock("reading")}
        >
          {t("pickRead")}
        </button>
        <button
          type="button"
          className="ulune-pick-card-close"
          data-testid={`${testId}-close`}
          aria-label={t("pickClose")}
          onClick={() => useStudioStore.getState().clear()}
        >
          <X className="size-4" strokeWidth={1.75} aria-hidden />
        </button>
      </div>
    );
  return (
    <>
      <span ref={anchor} hidden />
      {card && host ? createPortal(card, host) : null}
    </>
  );
}
