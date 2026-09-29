import { Check, Copy, Download } from "lucide-react";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { downloadText } from "@/lib/download-text";
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
 * A data table. Where the table is narrow (under 640 px: a phone, or a stage
 * squeezed by the side panel) each row becomes a two-line item (first cell,
 * then the others labelled by their column), so nothing scrolls sideways.
 * `exportName` adds Copy / CSV.
 */
export function DataTable({
  wide = false,
  stickyFirst = true,
  className,
  exportName,
  beforeExport,
  children,
}: {
  wide?: boolean;
  stickyFirst?: boolean;
  /** Names the table for its own styles (the natal points: `ulune-points`). */
  className?: string;
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
          className={cn("ulune-data-table", className)}
          data-wide={wide ? "1" : undefined}
          data-sticky-first={stickyFirst ? "1" : "0"}
        >
          {children}
        </table>
      </div>
    </div>
  );
}
