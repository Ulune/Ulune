import { X } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { hdHeroOf, hdSay } from "@/lib/chart/hd-focus";
import { parseHdActId } from "@/lib/chart/hd-rows";
import type { HdView, HumanDesignChart } from "@/lib/chart/human-design";
import { hdGraphText } from "@/lib/i18n/hd-ui";
import { useI18n } from "@/lib/i18n/locale";
import { useStudioStore } from "@/studio/store";
import { useHdNames } from "./use-hd-names";

/** On a phone, a piece chosen on the chart: one line and a button that opens its reading. */
export function HdCard({ chart, view }: { chart: HumanDesignChart; view: HdView }) {
  const { locale } = useI18n();
  const names = useHdNames(locale);
  const selectedId = useStudioStore((s) => s.selectedId);
  const dockOpen = useStudioStore((s) => s.dockOpen);
  const hero =
    selectedId && /^(gate|channel|center|act):/.test(selectedId)
      ? hdHeroOf(selectedId, chart)
      : null;
  // A row of the columns is named by its body first.
  const sayId = hero && selectedId && parseHdActId(selectedId) ? selectedId : hero;
  // The card stands just above the sheet, over the stage (which scrolls under it).
  const anchor = useRef<HTMLSpanElement>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    setHost((anchor.current?.closest(".ob-body") as HTMLElement | null) ?? null);
  }, []);
  const card =
    !hero || dockOpen ? null : (
      <div className="ulune-hd-card" data-testid="hd-card" role="status">
        <span className="ulune-hd-card-text">{hdSay(chart, view, sayId ?? hero, locale, names)}</span>
        <button
          type="button"
          className="ulune-hd-card-read"
          data-testid="hd-card-read"
          onClick={() => useStudioStore.getState().openDock("reading")}
        >
          {hdGraphText(locale, "read")}
        </button>
        <button
          type="button"
          className="ulune-hd-card-close"
          data-testid="hd-card-close"
          aria-label={hdGraphText(locale, "close")}
          onClick={() => useStudioStore.getState().clear()}
        >
          <X className="size-4" strokeWidth={1.75} aria-hidden />
        </button>
      </div>
    );
  return (
    <>
      <span ref={anchor} hidden />
      {card ? (host ? createPortal(card, host) : card) : null}
    </>
  );
}
