import type { HdView, HumanDesignChart } from "@/lib/chart/human-design";
import { DataTable } from "@/studio/tables/DataTable";
import { graphForView, HD_GATE_CENTER } from "@/lib/chart/human-design";
import { hdActId, hdColumnRows } from "@/lib/chart/hd-rows";
import {
  HD_ACTIVATION_COLUMN_KEYS,
  HD_TABLE_COLUMN_KEYS,
  hdActivationColumns,
  hdBodyLabel,
  hdCenterLabel,
  hdEmptyChannels,
  hdGraphText,
  hdLayerLabel,
  hdTableColumns,
} from "@/lib/i18n/hd-ui";
import { useI18n } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import { previewProps } from "@/lib/depth/preview-bus";
import { PlanetGlyph } from "@/components/glyphs";
import { useHdNames } from "@/components/use-hd-names";

/**
 * The Human Design table: the 26 activations the bodygraph is built from
 * (Personality, then Design, in the columns' order), then the defined
 * channels. Everything on the chart exists here as text, with Copy and CSV.
 */
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
  const names = useHdNames(locale);
  const columns = hdTableColumns(locale);
  const actColumns = hdActivationColumns(locale);
  const graph = graphForView(chart, view);
  const rows = graph.channels;
  const layers = (view === "both" ? (["personality", "design"] as const) : ([view] as const)) as readonly ("personality" | "design")[];
  const acts = layers.flatMap((layer) => hdColumnRows(chart, layer));
  const channelsOf = (gate: number) =>
    rows
      .filter((ch) => ch.gates.includes(gate))
      .map((ch) => ch.id)
      .join(", ");

  return (
    <section data-testid="hd-table" className="ulune-panel min-w-0 overflow-hidden">
      <div className="flex min-w-0 flex-col gap-[var(--space-5)] px-[var(--space-4)] py-[var(--space-4)] md:px-[var(--space-5)]">
        <div className="min-w-0" data-testid="hd-acts">
          <h3 className="ulune-kicker mb-[var(--space-2)] text-fg-muted">{hdGraphText(locale, "activations")}</h3>
          <DataTable wide exportName="ulune-human-design-activations">
            <thead>
              <tr data-testid="hd-acts-cols">
                {actColumns.map((label, i) => {
                  const key = HD_ACTIVATION_COLUMN_KEYS[i] ?? label.toLowerCase();
                  return (
                    <th key={key} data-col={key}>
                      {label}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {acts.map((row) => {
                const selectId = hdActId(row.layer, row.body);
                const centre = HD_GATE_CENTER[row.gate];
                const gateName = names?.gate(row.gate);
                const on = selectedId === selectId;
                return (
                  <tr
                    key={selectId}
                    data-testid={`hd-act-${row.layer}-${row.body}`}
                    data-layer={row.layer}
                    data-selected={on ? "1" : undefined}
                    onClick={() => onSelect(selectId)}
                    {...previewProps(selectId)}
                    className={cn("cursor-pointer", on && "bg-bg-subtle")}
                  >
                    <td data-col="layer">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="ulune-hd-layer-dot" data-layer={row.layer} aria-hidden />
                        {hdLayerLabel(locale, row.layer)}
                      </span>
                    </td>
                    <td data-col="body">
                      <span className="inline-flex items-center gap-2">
                        <span className="grid size-5 place-items-center text-fg">
                          <PlanetGlyph id={row.body} size={14} />
                        </span>
                        {hdBodyLabel(locale, row.body)}
                      </span>
                    </td>
                    <td data-col="gate" className="whitespace-nowrap">
                      <span className="font-mono tabular-nums">
                        {chart.uncertain?.rows.includes(selectId) ? "~" : ""}
                        {row.gate}
                      </span>
                      {gateName ? <span className="text-fg-muted"> · {gateName}</span> : null}
                    </td>
                    <td data-col="line" className="font-mono tabular-nums">
                      {row.line}
                    </td>
                    <td data-col="centre">{centre ? hdCenterLabel(locale, centre) : ""}</td>
                    <td data-col="channel" className="font-mono whitespace-nowrap">
                      {channelsOf(row.gate) || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
        </div>
        <div className="min-w-0" data-testid="hd-channels">
          <h3 className="ulune-kicker mb-[var(--space-2)] text-fg-muted">{hdGraphText(locale, "definedChannels")}</h3>
          <DataTable wide exportName="ulune-human-design-channels">
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
                  const name = names?.channel(row.id);
                  return (
                    <tr
                      key={row.id}
                      data-testid={`hd-row-${row.gates[0]}-${row.gates[1]}`}
                      data-selected={selectedId === selectId ? "1" : undefined}
                      onClick={() => onSelect(selectId)}
                      {...previewProps(selectId)}
                      className={cn("cursor-pointer", selectedId === selectId && "bg-bg-subtle")}
                    >
                      <td data-col="channel">
                        <span className="font-mono tabular-nums">
                          {chart.uncertain?.channels.includes(row.id) ? "~" : ""}
                          {row.id}
                        </span>
                        {name ? <span className="text-fg-muted"> · {name}</span> : null}
                      </td>
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
      </div>
    </section>
  );
}
