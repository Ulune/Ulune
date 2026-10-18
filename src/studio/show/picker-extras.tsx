import { Columns2, Send, Undo2 } from "lucide-react";
import { openAskSheet } from "@/components/share/share-state";
import { chartDisplayName } from "@/lib/chart/library";
import { useI18n } from "@/lib/i18n/locale";
import { enterCompare } from "@/studio/compare/gate";
import { flipRow } from "@/studio/show/flip";
import { useStudioStore } from "@/studio/store";
import type { StudioPage } from "@/studio/url";

/*
 * Parts of the chart switcher (studio/shell/ChartPicker.tsx), their own download,
 * fetched once the page is idle (or as the switcher opens), so the first
 * page carries only the switcher: "Back to…", the chart open before this one
 * (share and compare plan, idea B3, as the P key does: flip.ts), at the top;
 * each row's "Compare with…" (feature 2, studio/compare); and "Ask someone
 * for their chart" (idea B4), under "New".
 */

/** A row's "Compare with…": that chart side by side with the one shown (Compare, studio/compare/gate.ts). */
export function RowCompare({ id, name, go, onClose }: { id: string; name: string; go: (page: StudioPage) => void; onClose: () => void }) {
  const { t } = useI18n();
  const label = t("compareWith", { name });
  return (
    <button
      type="button"
      data-testid="chart-compare"
      title={label}
      aria-label={label}
      onClick={() => {
        enterCompare(id, go);
        onClose();
      }}
      className="ob-icon-btn ob-icon-btn--quiet"
    >
      <Columns2 className="size-4" strokeWidth={1.75} aria-hidden />
    </button>
  );
}

/** The row back to the chart open before (none while there is none, or a chart is being made). */
export function PickerBack({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const back = useStudioStore((s) => flipRow(s));
  if (!back) return null;
  const label = t("flipBack", { name: chartDisplayName(back.input, t("untitled")) });
  return (
    <button
      type="button"
      data-testid="chart-previous"
      aria-keyshortcuts="P"
      title={`${label} (P)`}
      onClick={() => {
        useStudioStore.getState().select(back.id);
        // Opened from the switcher: no longer "Shared with you" (as a row of the list).
        if (back.sharedAt) useStudioStore.setState((s) => ({ rows: s.rows.map((r) => (r.id === back.id ? { ...r, sharedAt: undefined } : r)) }));
        onClose();
      }}
      className="ob-picker-new"
      style={{ marginTop: 0, borderTop: 0, borderBottom: "1px solid var(--color-border)", borderRadius: 0 }}
    >
      <Undo2 className="size-4" strokeWidth={1.75} aria-hidden />
      <span className="truncate">{label}</span>
      {/* The key, where there is a keyboard to press it. */}
      {window.matchMedia("(pointer: fine)").matches ? <kbd className="ob-kbd">P</kbd> : null}
    </button>
  );
}

/** The row that opens the request sheet. */
export function PickerAsk({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      data-testid="ask-chart"
      onClick={() => {
        onClose();
        openAskSheet();
      }}
      className="ob-picker-new"
      style={{ marginTop: 0, borderTop: 0 }}
    >
      <Send className="size-4" strokeWidth={1.75} aria-hidden />
      {t("askChart")}
    </button>
  );
}
