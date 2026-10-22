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
import { chooseAll, letGo, useCompare, useScopeData } from "@/studio/compare/compare-store";
import type { Who } from "@/studio/compare/linked";

/*
 * Compare's tables (share and compare plan, feature 2, and idea B8): a table
 * for each pane, its page's own; and where one table reads more clearly with
 * a column for each person, numerology's core numbers and BaZi's four
 * pillars, that table as well, chosen above the panes (two to four columns).
 * Its rows choose in every chart. That table's code (merged-numerology.tsx,
 * merged-bazi.tsx) comes when it is shown.
 */

const NumerologyCoresMerged = lazyNamed(() => import("@/studio/compare/merged-numerology"), "NumerologyCoresMerged");
const BaziPillarsMerged = lazyNamed(() => import("@/studio/compare/merged-bazi"), "BaziPillarsMerged");

/** A merged table's rows: chosen in every chart, the one chosen marked. */
export type MergedPick = { selectedId: string | null; onSelect: (id: string) => void };

/** One person's column of a merged table: their letter and name, and their page's chart. */
export type MergedColumn<C> = { who: Who; name: string; chart: C };

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

/** A table for each pane, or one with a column for each person: above the panes, on those pages' table view. */
export function TablesChoice() {
  const { locale, t } = useI18n();
  const T = bookT(compareWords, t, locale);
  const merged = useCompare((s) => s.merged);
  const n = useCompare((s) => s.shown.length);
  return (
    <div className="ob-compare-tables" data-testid="compare-tables" data-chart-pick>
      <SegmentedToggle
        ariaLabel={T("cmpTables")}
        value={merged ? "one" : "two"}
        onChange={(v) => useCompare.setState({ merged: v === "one" })}
        options={[
          { value: "two", testId: "compare-tables-two", label: n > 2 ? T("cmpTablesEach") : T("cmpTablesTwo") },
          { value: "one", testId: "compare-tables-one", label: n > 2 ? T("cmpTablesOneMany") : T("cmpTablesOne") },
        ]}
      />
    </div>
  );
}

type Person = { who: Who; scope: ChartScope; name: string };

/** The one table, each person's column side by side. */
export function MergedTable({ people }: { people: Person[] }) {
  const { locale, t } = useI18n();
  const T = bookT(compareWords, t, locale);
  const page = useStudioStore((s) => s.page);
  const sel = useCompare((s) => s.sel);
  type Data = { numbers?: NumerologyChart | null; bazi?: BaziChart | null } | undefined;
  // Four reads, always made (hooks keep their order); the people shown pick theirs.
  const data: Record<Who, Data> = {
    a: useScopeData(people.find((p) => p.who === "a")?.scope ?? null, page) as Data,
    b: useScopeData(people.find((p) => p.who === "b")?.scope ?? null, page) as Data,
    c: useScopeData(people.find((p) => p.who === "c")?.scope ?? null, page) as Data,
    d: useScopeData(people.find((p) => p.who === "d")?.scope ?? null, page) as Data,
  };
  const ids = people.map((p) => p.who);
  // A row is every chart's element: chosen in all, or let go when chosen again.
  const same = (id: string) => ids.every((w) => sel[w] === id);
  const onSelect = (id: string) => (same(id) ? letGo() : chooseAll(Object.fromEntries(ids.map((w) => [w, id]))));
  const first = ids[0] ? sel[ids[0]] : null;
  const selectedId = first && same(first) ? first : null;
  let table = null;
  if (page === "numerology") {
    const cols = people.map((p) => ({ who: p.who, name: p.name, chart: data[p.who]?.numbers ?? null }));
    if (cols.every((c) => c.chart)) table = <NumerologyCoresMerged people={cols as MergedColumn<NumerologyChart>[]} selectedId={selectedId} onSelect={onSelect} />;
  } else if (page === "bazi") {
    const cols = people.map((p) => ({ who: p.who, name: p.name, chart: data[p.who]?.bazi ?? null }));
    if (cols.every((c) => c.chart)) table = <BaziPillarsMerged people={cols as MergedColumn<BaziChart>[]} selectedId={selectedId} onSelect={onSelect} />;
  }
  return (
    <section className="ob-compare-merged" data-testid="compare-merged" data-count={people.length} aria-labelledby="ob-cmp-merged-h">
      <h2 id="ob-cmp-merged-h" className="ob-compare-h">
        {page === "bazi" ? T("cmpMergedPillars") : T("cmpMergedCore")}
      </h2>
      <Suspense fallback={<LoadingLines testId="table-loading" lines={5} />}>{table ?? <LoadingLines lines={5} />}</Suspense>
    </section>
  );
}

