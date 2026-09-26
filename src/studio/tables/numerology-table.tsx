import type { NumerologyChart } from "@/lib/chart/numerology";
import { DataTable } from "@/studio/tables/DataTable";
import { formatNumerologyDigit, formatNumerologyNumber, valueOfCore } from "@/lib/chart/numerology";
import type { NumerologyFromId } from "@/lib/i18n/numerology-ui";
import {
  NUMEROLOGY_TABLE_COLUMN_KEYS,
  numerologyFromLabel,
  numerologyMissingMark,
  numerologyTableColumns,
  numerologyTableHint,
  numerologyTableTitle,
} from "@/lib/i18n/numerology-ui";
import { useI18n } from "@/lib/i18n/locale";

const ROWS: Array<{ id: NumerologyFromId; core: "birthday" | "personality" | "maturity" | "personalYear" }> = [
  { id: "birthday", core: "birthday" },
  { id: "personality", core: "personality" },
  { id: "maturity", core: "maturity" },
  { id: "personalYear", core: "personalYear" },
];

export function NumerologyTable({
  chart,
  selectedId,
  onSelect,
}: {
  chart: NumerologyChart;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { locale } = useI18n();
  const columns = numerologyTableColumns(locale);
  const dash = numerologyMissingMark(locale);

  return (
    <section data-testid="numerology-table" className="ulune-panel min-w-0 overflow-hidden">
      <header className="flex flex-col gap-[var(--space-3)] border-b border-border px-[var(--space-4)] py-[var(--space-3)] md:px-[var(--space-5)]">
        <div className="min-w-0">
          <h2 className="font-display text-2xl leading-none text-fg">{numerologyTableTitle(locale)}</h2>
          <p className="mt-[var(--space-2)] max-w-[61.8ch] text-sm text-fg-muted">{numerologyTableHint(locale)}</p>
        </div>
      </header>
      <div className="min-w-0 px-[var(--space-4)] py-[var(--space-4)] md:px-[var(--space-5)]">
        <DataTable wide exportName="ulune-numerology">
            <thead>
              <tr data-testid="numerology-table-cols">
                {columns.map((label, i) => {
                  const key = NUMEROLOGY_TABLE_COLUMN_KEYS[i] ?? label.toLowerCase();
                  return (
                    <th key={key} data-col={key} data-testid={`numerology-col-${key}`}>
                      {label}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => {
                const value = valueOfCore(chart, row.core);
                const selectId = `core:${row.core}`;
                const from = numerologyFromLabel(locale, row.id, chart.calendarYear);
                const clickable = value.number != null;
                return (
                  <tr
                    key={row.id}
                    data-testid={`numerology-row-${row.id}`}
                    data-selected={selectedId === selectId ? "1" : undefined}
                    data-year={row.id === "personalYear" ? String(chart.calendarYear) : undefined}
                    onClick={() => {
                      if (clickable) onSelect(selectId);
                    }}
                    className={clickable ? "cursor-pointer" : undefined}
                  >
                    <td data-col="number">{formatNumerologyNumber(value, dash)}</td>
                    <td data-col="digit">{formatNumerologyDigit(value, dash)}</td>
                    <td data-col="from">{from}</td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
      </div>
    </section>
  );
}
