import { Columns2, Send, Tags, Undo2 } from "lucide-react";
import { useEffect, useId, useState, useSyncExternalStore, type ReactNode } from "react";
import { openAskSheet } from "@/components/share/share-state";
import { chartDisplayName, type SavedChart } from "@/lib/chart/library";
import { groupsNeedWords } from "@/lib/i18n/catalog/groups-need-words";
import { useI18n } from "@/lib/i18n/locale";
import { bookT } from "@/lib/i18n/words-book";
import { whenIdle } from "@/lib/lazy-component";
import { importWithRetry } from "@/lib/lazy-retry";
import { useSpace } from "@/lib/space/state";
import { enterCompare } from "@/studio/compare/gate";
import { NeedLine } from "@/studio/groups/need-line";
import { flipRow } from "@/studio/show/flip";
import { useStudioStore } from "@/studio/store";
import type { StudioPage } from "@/studio/url";

/*
 * Parts of the chart switcher (studio/shell/ChartPicker.tsx), their own download,
 * fetched once the page is idle (or as the switcher opens), so the first
 * page carries only the switcher: "Back to…", the chart open before this one
 * (share and compare plan, idea B3, as the P key does: flip.ts), at the top;
 * each row's "Compare with…" (feature 2, studio/compare); "Ask someone
 * for their chart" (idea B4), under "New"; and the charts' list itself, by
 * group once a private space is open, with the Groups row under Ask (idea
 * B5: studio/groups/picker-groups.tsx, fetched at idle once a space is open,
 * with its style sheet; without one, the row says where groups are kept).
 */

type Groups = typeof import("@/studio/groups/picker-groups");
let groupsMod: Groups | undefined;
let fetching = false;
const heard = new Set<() => void>();
function loadGroups(): void {
  if (groupsMod || fetching) return;
  fetching = true;
  void importWithRetry(() => import("@/studio/groups/picker-groups"), { attempts: 2 }).then(
    (m) => {
      groupsMod = m;
      heard.forEach((l) => l());
    },
    () => {
      fetching = false;
    },
  );
}
/** The groups' code once a space is open (now, as this code itself comes at idle, or when it opens): the switcher then opens with them. */
function wantGroups(): void {
  if (useSpace.getState().status === "open" && !groupsMod) whenIdle(loadGroups, 500);
}
if (typeof window !== "undefined") {
  wantGroups();
  useSpace.subscribe((s, prev) => {
    if (s.status !== prev.status) wantGroups();
  });
}
function useGroups(): Groups | undefined {
  return useSyncExternalStore(
    (l) => {
      heard.add(l);
      return () => heard.delete(l);
    },
    () => groupsMod,
    () => undefined,
  );
}

/**
 * The switcher's charts: by group once a private space is open (picker-groups.tsx), else the plain
 * list ChartPicker.tsx draws until this code is here. Chosen as the switcher opens, so the charts
 * never move under the pointer.
 */
export function PickerList({
  shown,
  rows,
  query,
  row,
}: {
  shown: SavedChart[];
  rows: SavedChart[];
  query: string;
  row: (r: SavedChart, more?: ReactNode) => ReactNode;
}) {
  const { t } = useI18n();
  const open = useSpace((s) => s.status === "open");
  const groups = useGroups();
  const [atOpen] = useState(() => (open ? groups : undefined));
  useEffect(() => {
    if (open) loadGroups();
  }, [open]);
  if (atOpen && open) return <atOpen.GroupedList shown={shown} rows={rows} query={query} row={row} />;
  return (
    <ul className="ob-picker-list">
      {shown.length === 0 ? <li className="ob-picker-none">{t("libraryNone")}</li> : null}
      {shown.map((r) => row(r))}
    </ul>
  );
}

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

/** The rows under New: the one that opens the request sheet, then Groups. */
export function PickerAsk({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  return (
    <>
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
      <PickerGroupsRow />
    </>
  );
}

/**
 * Groups (idea B5), once there is a chart to sort: with a space open, the groups' own row
 * (picker-groups.tsx); otherwise one that unfolds the quiet line saying where they are kept.
 */
function PickerGroupsRow() {
  const { t, locale } = useI18n();
  const status = useSpace((s) => s.status);
  const any = useStudioStore((s) => s.rows.length > 0);
  const groups = useGroups();
  const [open, setOpen] = useState(false);
  const lineId = useId();
  if (!any || status === "checking") return null;
  if (status === "open") return groups ? <groups.GroupsRow /> : null;
  return (
    <>
      <button
        type="button"
        className="ob-picker-new"
        style={{ marginTop: 0, borderTop: 0 }}
        data-testid="groups-row"
        aria-expanded={open}
        aria-controls={open ? lineId : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <Tags className="size-4" strokeWidth={1.75} aria-hidden />
        {bookT(groupsNeedWords, t, locale)("keptGroups")}
      </button>
      {open ? (
        <div id={lineId} style={{ padding: "0 10px 8px" }}>
          <NeedLine status={status} what="groups" testId="groups-need" />
        </div>
      ) : null}
    </>
  );
}
