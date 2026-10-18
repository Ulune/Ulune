import { Suspense, useLayoutEffect, useRef, type ReactNode } from "react";
import { LoadingLines } from "@/components/loading-lines";
import { SegmentedToggle } from "@/components/segmented-toggle";
import type { BaziChart } from "@/lib/chinese/bazi";
import type { NumerologyChart } from "@/lib/chart/numerology";
import { compareWords } from "@/lib/i18n/catalog/compare-words";
import { useI18n } from "@/lib/i18n/locale";
import { bookT } from "@/lib/i18n/words-book";
import { lazyNamed } from "@/lib/lazy-component";
import type { ChartScope } from "@/studio/scope";
import { useStudioStore } from "@/studio/store";
import { chooseBoth, letGo, useCompare, useScopeData } from "@/studio/compare/compare-store";

/*
 * Compare's tables (share and compare plan, feature 2): two tables side by
 * side, each pane its page's own; and where one table reads more clearly with
 * an A column and a B column, numerology's core numbers and BaZi's four
 * pillars, that table as well, chosen above the panes. Its rows choose in
 * both charts. That table's code (merged-numerology.tsx, merged-bazi.tsx)
 * comes when it is shown.
 */

const NumerologyCoresMerged = lazyNamed(() => import("@/studio/compare/merged-numerology"), "NumerologyCoresMerged");
const BaziPillarsMerged = lazyNamed(() => import("@/studio/compare/merged-bazi"), "BaziPillarsMerged");

/** A merged table's rows: chosen in both charts, the one chosen marked. */
export type MergedPick = { selectedId: string | null; onSelect: (id: string) => void };

/**
 * The pages' table frame (studio/tables/DataTable.tsx, its styles loaded with the panes' tables),
 * drawn here rather than shared, for the reason chinese-ids.ts gives: narrower than 640 px, each
 * row is two lines, its cells named by their column.
 */
export function TableFrame({ className, stickyFirst = true, children }: { className: string; stickyFirst?: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const table = ref.current?.querySelector("table");
    const head = table?.tHead?.rows[0];
    if (!table || !head) return;
    Array.from(head.cells).forEach((cell, i) => {
      const text = (cell.textContent ?? "").replace(/\s+/g, " ").trim();
      if (i > 0 && text) table.style.setProperty(`--col-label-${i + 1}`, `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`);
    });
  });
  return (
    <div ref={ref} className="ob-table-block">
      <div className="ulune-table-wrap">
        <table className={`ulune-data-table ${className}`} data-sticky-first={stickyFirst ? "1" : "0"}>
          {children}
        </table>
      </div>
    </div>
  );
}

/** Two tables, or one with A and B columns: above the panes, on those pages' table view. */
export function TablesChoice() {
  const { locale, t } = useI18n();
  const T = bookT(compareWords, t, locale);
  const merged = useCompare((s) => s.merged);
  return (
    <div className="ob-compare-tables" data-testid="compare-tables" data-chart-pick>
      <SegmentedToggle
        ariaLabel={T("cmpTables")}
        value={merged ? "one" : "two"}
        onChange={(v) => useCompare.setState({ merged: v === "one" })}
        options={[
          { value: "two", testId: "compare-tables-two", label: T("cmpTablesTwo") },
          { value: "one", testId: "compare-tables-one", label: T("cmpTablesOne") },
        ]}
      />
    </div>
  );
}

/** The one table, A and B side by side in its columns. */
export function MergedTable({ a, b, nameA, nameB }: { a: ChartScope; b: ChartScope; nameA: string; nameB: string }) {
  const { locale, t } = useI18n();
  const T = bookT(compareWords, t, locale);
  const page = useStudioStore((s) => s.page);
  const sel = useCompare((s) => s.sel);
  const da = useScopeData(a, page) as { numbers?: NumerologyChart | null; bazi?: BaziChart | null } | undefined;
  const db = useScopeData(b, page) as { numbers?: NumerologyChart | null; bazi?: BaziChart | null } | undefined;
  // A row is both charts' element: chosen in both, or let go when chosen again.
  const onSelect = (id: string) => (sel.a === id && sel.b === id ? letGo() : chooseBoth({ a: id, b: id }));
  const selectedId = sel.a === sel.b ? sel.a : null;
  let table = null;
  if (page === "numerology" && da?.numbers && db?.numbers) {
    table = <NumerologyCoresMerged a={da.numbers} b={db.numbers} nameA={nameA} nameB={nameB} selectedId={selectedId} onSelect={onSelect} />;
  } else if (page === "bazi" && da?.bazi && db?.bazi) {
    table = <BaziPillarsMerged a={da.bazi} b={db.bazi} nameA={nameA} nameB={nameB} selectedId={selectedId} onSelect={onSelect} />;
  }
  return (
    <section className="ob-compare-merged" data-testid="compare-merged" aria-labelledby="ob-cmp-merged-h">
      <h2 id="ob-cmp-merged-h" className="ob-compare-h">
        {page === "bazi" ? T("cmpMergedPillars") : T("cmpMergedCore")}
      </h2>
      <Suspense fallback={<LoadingLines testId="table-loading" lines={5} />}>{table ?? <LoadingLines lines={5} />}</Suspense>
    </section>
  );
}
