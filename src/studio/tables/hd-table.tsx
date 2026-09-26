import type { HdView, HumanDesignChart } from "@/lib/chart/human-design";
import { DataTable } from "@/studio/tables/DataTable";
import { graphForView } from "@/lib/chart/human-design";
import {
  HD_TABLE_COLUMN_KEYS,
  hdCenterLabel,
  hdEmptyChannels,
  hdTableColumns,
} from "@/lib/i18n/hd-ui";
import { useI18n } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import { previewProps } from "@/lib/depth/preview-bus";

export function HumanDesignTable({
  chart,
  view,
  selectedId,
  onSelect,
}: {
  chart: HumanDesignChart;
  view: HdView;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { locale } = useI18n();
  const columns = hdTableColumns(locale);
  const rows = graphForView(chart, view).channels;

  return (
    <section data-testid="hd-table" className="ulune-panel min-w-0 overflow-hidden">
      <div className="min-w-0 px-[var(--space-4)] py-[var(--space-4)] md:px-[var(--space-5)]">
        <DataTable wide exportName="ulune-human-design">
            <thead>
              <tr data-testid="hd-table-cols">
                {columns.map((label, i) => {
                  const key = HD_TABLE_COLUMN_KEYS[i] ?? label.toLowerCase();
                  return (
                    <th key={key} data-col={key} data-testid={`hd-col-${key}`}>
                      {label}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr data-testid="hd-table-empty">
                  <td colSpan={3} data-col="channel">
                    {hdEmptyChannels(locale)}
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const selectId = `channel:${row.id}`;
                  return (
                    <tr
                      key={row.id}
                      data-testid={`hd-row-${row.gates[0]}-${row.gates[1]}`}
                      data-selected={selectedId === selectId ? "1" : undefined}
                      onClick={() => onSelect(selectId)}
                      {...previewProps(selectId)}
                      className={cn("cursor-pointer", selectedId === selectId && "bg-bg-subtle")}
                    >
                      <td data-col="channel">{row.id}</td>
                      <td data-col="gates">
                        {row.gates[0]} · {row.gates[1]}
                      </td>
                      <td data-col="centers">
                        {hdCenterLabel(locale, row.centers[0])} · {hdCenterLabel(locale, row.centers[1])}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </DataTable>
      </div>
    </section>
  );
}
