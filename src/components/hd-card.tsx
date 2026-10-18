import { X } from "lucide-react";
import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { hdHeroOf, hdSay } from "@/lib/chart/hd-focus";
import { parseHdActId } from "@/lib/chart/hd-rows";
import type { HdView, HumanDesignChart } from "@/lib/chart/human-design";
import { useI18n } from "@/lib/i18n/locale";
import { useChartScope, useScoped, type ChartScope } from "@/studio/scope";
import { PickCard } from "./pick-card";
import { useHdNames } from "./use-hd-names";

/**
 * On a phone, a piece chosen on the chart: one line and a button that opens
 * its reading (pick-card.tsx). In a Compare pane (studio/scope.tsx) the card
 * is that pane's: in the place its view keeps for it, its Read the scope's.
 */
export function HdCard({ chart, view }: { chart: HumanDesignChart; view: HdView }) {
  const { locale } = useI18n();
  const names = useHdNames(locale);
  const scope = useChartScope();
  const selectedId = useScoped((s) => s.selectedId);
  const hero =
    selectedId && /^(gate|channel|center|act):/.test(selectedId)
      ? hdHeroOf(selectedId, chart)
      : null;
  // A row of the columns is named by its body first.
  const sayId = hero && selectedId && parseHdActId(selectedId) ? selectedId : hero;
  const text = hero ? hdSay(chart, view, sayId ?? hero, locale, names) : null;
  return scope ? <ScopeCard scope={scope} text={text} /> : <PickCard testId="hd-card" text={text} />;
}

/** The pick card of a Compare pane: as pick-card.tsx draws it, in the pane's own place (data-scope-pick-host). Also the connection chart's (modes/design-pair.tsx). */
export function ScopeCard({ scope, text, testId = "hd-card" }: { scope: ChartScope; text: string | null; testId?: string }) {
  const { t } = useI18n();
  const [host, setHost] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    setHost(document.querySelector<HTMLElement>(`[data-scope-pick-host="${scope.id}"]`));
  }, [scope.id]);
  if (!text || !scope.state.selectedId || !host) return null;
  return createPortal(
    <div className="ulune-pick-card" data-testid={testId} role="status" data-chart-pick>
      <span className="ulune-pick-card-text" onClick={scope.openReading}>
        {text}
      </span>
      {scope.openReading ? (
        <button type="button" className="ulune-pick-card-read" data-testid={`${testId}-read`} onClick={scope.openReading}>
          {t("pickRead")}
        </button>
      ) : null}
      <button
        type="button"
        className="ulune-pick-card-close"
        data-testid={`${testId}-close`}
        aria-label={t("pickClose")}
        onClick={() => scope.state.clear()}
      >
        <X className="size-4" strokeWidth={1.75} aria-hidden />
      </button>
    </div>,
    host,
  );
}
