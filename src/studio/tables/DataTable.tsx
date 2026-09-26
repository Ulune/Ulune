import { Check, Copy, Download } from "lucide-react";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import "@/studio/modes/styles/tables.css";

function cellText(el: Element) {
  return (el.textContent ?? "").replace(/\s+/g, " ").trim();
}

/** Columns 2…16 can carry a phone label (see `.ulune-data-table` in styles.css). */
const LABELLED_COLUMNS = 16;

/** A CSS string literal for `content:`. */
function cssString(text: string): string {
  return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/[\n\r]+/g, " ")}"`;
}

/** Every column, hidden or not, as rows of text. */
export function tableRows(table: HTMLTableElement): string[][] {
  const rows: string[][] = [];
  const head = table.tHead?.rows[0];
  if (head) rows.push(Array.from(head.cells).map(cellText));
  for (const body of Array.from(table.tBodies)) {
    for (const tr of Array.from(body.rows)) rows.push(Array.from(tr.cells).map(cellText));
  }
  return rows;
}

function toCsv(rows: string[][]) {
  return rows.map((r) => r.map((c) => (/[",\n;]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(",")).join("\n");
}

function toText(rows: string[][]) {
  return rows.map((r) => r.join("\t")).join("\n");
}

export function downloadText(name: string, text: string, type = "text/csv;charset=utf-8") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Copy / CSV for the table rendered inside `target`. `beforeExport` lets a
 * table still filling in (the Timing year) put its last rows in first.
 */
export function TableExport({
  name,
  target,
  beforeExport,
}: {
  name: string;
  target: React.RefObject<HTMLElement | null>;
  beforeExport?: () => void;
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const rows = () => {
    beforeExport?.();
    const table = target.current?.querySelector("table");
    return table ? tableRows(table) : [];
  };
  const slug = name.replace(/\s+/g, "-").toLowerCase() || "table";
  return (
    <div className="ob-table-export">
      <button
        type="button"
        className="ob-table-export-btn"
        data-testid="table-copy"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(toText(rows()));
            setCopied(true);
            toast(t("tableCopied"));
            window.setTimeout(() => setCopied(false), 1600);
          } catch {
            setCopied(false);
          }
        }}
      >
        {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
        <span aria-live="polite">{copied ? t("tableCopied") : t("tableCopy")}</span>
      </button>
      <button
        type="button"
        className="ob-table-export-btn"
        data-testid="table-csv"
        onClick={() => downloadText(`${slug}.csv`, toCsv(rows()))}
      >
        <Download className="size-3.5" aria-hidden />
        <span>{t("tableExportCsv")}</span>
      </button>
    </div>
  );
}

/**
 * A data table. On phones each row becomes a two-line item (first cell,
 * then the others labelled by their column), so nothing scrolls sideways.
 * `exportName` adds Copy / CSV.
 */
export function DataTable({
  wide = false,
  stickyFirst = true,
  group,
  exportName,
  beforeExport,
  children,
}: {
  wide?: boolean;
  stickyFirst?: boolean;
  group?: "position" | "motion" | "condition";
  exportName?: string;
  /** Called before Copy / CSV read the rows (see TableExport). */
  beforeExport?: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Phone rows label their cells by column. The labels live on the table as
  // one CSS variable per column (read by `td:nth-child(n)::before`), so a
  // render touches a dozen properties instead of every cell (17k on a Timing
  // year table).
  useLayoutEffect(() => {
    const table = ref.current?.querySelector("table");
    const head = table?.tHead?.rows[0];
    if (!table || !head) return;
    for (let i = 1; i < LABELLED_COLUMNS; i += 1) {
      const cell = head.cells[i];
      const text = cell ? cellText(cell) : "";
      const name = `--col-label-${i + 1}`;
      const value = text ? cssString(text) : "";
      if (table.style.getPropertyValue(name) === value) continue;
      if (value) table.style.setProperty(name, value);
      else table.style.removeProperty(name);
    }
  });
  return (
    <div ref={ref} className="ob-table-block">
      {exportName ? <TableExport name={exportName} target={ref} beforeExport={beforeExport} /> : null}
      <div className="ulune-table-wrap" data-testid="table-wrap">
        <table
          className="ulune-data-table"
          data-wide={wide ? "1" : undefined}
          data-sticky-first={stickyFirst ? "1" : "0"}
          data-group={group}
        >
          {children}
        </table>
      </div>
    </div>
  );
}

export function TableFrame({
  testId,
  title,
  hint,
  actions,
  children,
}: {
  testId?: string;
  title: string;
  hint?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section data-testid={testId} className="ulune-panel flex min-h-0 min-w-0 flex-col overflow-hidden">
      <header className="flex shrink-0 flex-col gap-[var(--space-3)] border-b border-border px-[var(--space-4)] py-[var(--space-3)] sm:flex-row sm:items-start sm:justify-between md:px-[var(--space-5)]">
        <div className="min-w-0">
          <h2 className="font-display text-2xl leading-none text-fg">{title}</h2>
          {hint ? <p className="mt-[var(--space-2)] max-w-[61.8ch] text-sm text-fg-muted">{hint}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-[var(--space-2)]">{actions}</div> : null}
      </header>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-[var(--space-4)] py-[var(--space-4)] md:px-[var(--space-5)]">
        {children}
      </div>
    </section>
  );
}

export function TableGroupBar({
  group,
  onGroup,
  labels,
}: {
  group: "position" | "motion" | "condition";
  onGroup: (next: "position" | "motion" | "condition") => void;
  labels: { position: string; motion: string; condition: string };
}) {
  return (
    <div className="ulune-table-groups mb-[var(--space-3)] flex md:hidden" role="tablist">
      {(["position", "motion", "condition"] as const).map((id) => (
        <button
          key={id}
          type="button"
          role="tab"
          data-testid={`table-group-${id}`}
          aria-selected={group === id}
          onClick={() => onGroup(id)}
          className={cn(
            "min-h-11 min-w-0 flex-1 px-2 text-xs",
            group === id ? "ob-subtab-on" : "text-fg-muted",
          )}
        >
          {labels[id]}
        </button>
      ))}
    </div>
  );
}
