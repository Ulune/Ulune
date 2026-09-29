import type { HdView, HumanDesignChart } from "@/lib/chart/human-design";
import { graphForView, HD_GATE_CENTER } from "@/lib/chart/human-design";
import { hdActId } from "@/lib/chart/hd-rows";
import { hdActivationRows, hdCentreRows, hdKeyRows, hdTableCsv, hdTextParts } from "@/lib/chart/hd-table";
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
  hdUnknownText,
} from "@/lib/i18n/hd-ui";
import { useI18n } from "@/lib/i18n/locale";
import { modesWord } from "@/lib/i18n/table-ui";
import { cn } from "@/lib/utils";
import { previewProps } from "@/lib/depth/preview-bus";
import { PlanetGlyph } from "@/components/glyphs";
import { useHdNames } from "@/components/use-hd-names";
import { DataTable } from "@/studio/tables/DataTable";
import { TableActions, TablePage, type TablePart } from "@/studio/tables/TablePage";
import { UnknownNote } from "@/studio/tables/cross-parts";

/**
 * The Human Design table (part 52 of the launch plan): the five keys and
 * the Incarnation Cross, the activations the bodygraph is built from
 * (Personality, then Design), the defined channels and the nine centres
 * with their gates. Everything on the chart exists here as text, with Copy
 * and CSV.
 */
export function HumanDesignTable({
  chart,
  view,
  name = "",
  selectedId,
  onSelect,
}: {
  chart: HumanDesignChart;
  view: HdView;
  /** The birth chart's name, for the copied text and the file. */
  name?: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { locale, t } = useI18n();
  const names = useHdNames(locale);
  const text = () => hdTextParts(chart, view, locale, names, name);
  const partText = (id: string) => () => text().find((p) => p.id === id)?.lines.join("\n") ?? "";
  const note = chart.uncertain ? <UnknownNote>{hdUnknownText(locale, "line")}</UnknownNote> : null;

  const parts: TablePart[] = [
    {
      id: "keys",
      label: modesWord(locale, "partKeys"),
      hint: modesWord(locale, "hintKeys"),
      terms: ["hdType", "hdStrategy", "hdAuthority", "hdProfile", "hdDefinition", "hdCross"],
      copyText: partText("keys"),
      children: (
        <>
          {note}
          <KeysPart chart={chart} selectedId={selectedId} onSelect={onSelect} />
        </>
      ),
    },
    {
      id: "activations",
      label: modesWord(locale, "partActivations"),
      hint: modesWord(locale, "hintActivations"),
      terms: ["hdLayers", "hdGate", "hdLine"],
      copyText: partText("activations"),
      children: <ActivationsPart chart={chart} view={view} names={names} selectedId={selectedId} onSelect={onSelect} />,
    },
    {
      id: "channels",
      label: modesWord(locale, "partChannels"),
      hint: modesWord(locale, "hintChannels"),
      terms: ["hdChannel"],
      copyText: partText("channels"),
      children: <ChannelsPart chart={chart} view={view} names={names} selectedId={selectedId} onSelect={onSelect} />,
    },
    {
      id: "centres",
      label: modesWord(locale, "partCentres"),
      hint: modesWord(locale, "hintCentres"),
      terms: ["hdCentres", "hdGate"],
      copyText: partText("centres"),
      children: <CentresPart chart={chart} view={view} selectedId={selectedId} onSelect={onSelect} />,
    },
  ];

  return (
    <div data-testid="hd-table" data-chart-pick data-selected={selectedId ?? ""} className="min-w-0">
      <TablePage
        name="design"
        label={t("tableSections")}
        parts={parts}
        actions={<TableActions text={() => text().map((p) => p.lines.join("\n")).join("\n\n")} csv={() => hdTableCsv(chart, view)} fileName={`${name || "human design"} human design`} />}
      />
    </div>
  );
}

const upper = (s: string) => (s ? s.charAt(0).toLocaleUpperCase() + s.slice(1) : s);

type Pick = { selectedId: string | null; onSelect: (id: string) => void };

/** The five keys and the cross: each opens its reading. */
function KeysPart({ chart, selectedId, onSelect }: { chart: HumanDesignChart } & Pick) {
  const { locale } = useI18n();
  return (
    <DataTable className="ulune-hd-keys" stickyFirst={false}>
      <thead>
        <tr>
          <th data-col="key">{modesWord(locale, "keyWord")}</th>
          <th data-col="value">{modesWord(locale, "valueWord")}</th>
        </tr>
      </thead>
      <tbody>
        {hdKeyRows(chart, locale).map((k) => {
          const id = `hello:${k.key}`;
          const on = selectedId === id;
          return (
            <tr
              key={k.key}
              data-testid={`hd-key-${k.key}`}
              data-selected={on ? "1" : undefined}
              data-uncertain={k.uncertain ? "1" : undefined}
              className={cn("cursor-pointer", on && "bg-bg-subtle")}
              onClick={() => onSelect(id)}
              {...previewProps(id)}
            >
              <td data-col="key">
                <button type="button" className="ulune-row-pick" aria-pressed={on}>
                  {k.label}
                </button>
              </td>
              <td data-col="value">
                <span className={cn(k.uncertain && "ulune-uncertain", (k.key === "profile" || k.key === "cross") && "font-mono")}>
                  {k.uncertain ? "~" : ""}
                  {k.value}
                </span>
                {k.sub ? <span className="ulune-cell-sub">{k.sub}</span> : null}
              </td>
            </tr>
          );
        })}
      </tbody>
    </DataTable>
  );
}

type Names = ReturnType<typeof useHdNames>;

/** The activations, Personality then Design (the layers the view shows). */
function ActivationsPart({ chart, view, names, selectedId, onSelect }: { chart: HumanDesignChart; view: HdView; names: Names } & Pick) {
  const { locale } = useI18n();
  const columns = hdActivationColumns(locale);
  const graph = graphForView(chart, view);
  const channelsOf = (gate: number) =>
    graph.channels
      .filter((ch) => ch.gates.includes(gate))
      .map((ch) => ch.id)
      .join(", ");
  return (
    <div className="min-w-0" data-testid="hd-acts">
      <DataTable stickyFirst={false}>
        <thead>
          <tr data-testid="hd-acts-cols">
            {columns.map((label, i) => {
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
          {hdActivationRows(chart, view).map((row) => {
            const selectId = hdActId(row.layer, row.body);
            const centre = HD_GATE_CENTER[row.gate];
            const gateName = names?.gate(row.gate);
            const on = selectedId === selectId;
            const maybe = chart.uncertain?.rows.includes(selectId) ?? false;
            return (
              <tr
                key={selectId}
                data-testid={`hd-act-${row.layer}-${row.body}`}
                data-layer={row.layer}
                data-selected={on ? "1" : undefined}
                data-uncertain={maybe ? "1" : undefined}
                onClick={() => onSelect(selectId)}
                {...previewProps(selectId)}
                className={cn("cursor-pointer", on && "bg-bg-subtle")}
              >
                <td data-col="layer">
                  <button type="button" className="ulune-row-pick" aria-pressed={on}>
                    <span className="ulune-hd-layer-dot" data-layer={row.layer} aria-hidden />
                    {hdLayerLabel(locale, row.layer)}
                  </button>
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
                  <span className={cn("font-mono tabular-nums", maybe && "ulune-uncertain")}>
                    {maybe ? "~" : ""}
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
  );
}

/** The defined channels, each with the two centres it joins. */
function ChannelsPart({ chart, view, names, selectedId, onSelect }: { chart: HumanDesignChart; view: HdView; names: Names } & Pick) {
  const { locale } = useI18n();
  const columns = hdTableColumns(locale);
  const rows = graphForView(chart, view).channels;
  return (
    <div className="min-w-0" data-testid="hd-channels">
      <DataTable stickyFirst={false}>
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
              const on = selectedId === selectId;
              const maybe = chart.uncertain?.channels.includes(row.id) ?? false;
              return (
                <tr
                  key={row.id}
                  data-testid={`hd-row-${row.gates[0]}-${row.gates[1]}`}
                  data-selected={on ? "1" : undefined}
                  data-uncertain={maybe ? "1" : undefined}
                  onClick={() => onSelect(selectId)}
                  {...previewProps(selectId)}
                  className={cn("cursor-pointer", on && "bg-bg-subtle")}
                >
                  <td data-col="channel">
                    <button type="button" className="ulune-row-pick" aria-pressed={on}>
                      <span className={cn("font-mono tabular-nums", maybe && "ulune-uncertain")}>
                        {maybe ? "~" : ""}
                        {row.id}
                      </span>
                      {name ? <span className="text-fg-muted"> · {name}</span> : null}
                    </button>
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
  );
}

/** The nine centres from the head down: defined or open, and the gates activated in each. */
function CentresPart({ chart, view, selectedId, onSelect }: { chart: HumanDesignChart; view: HdView } & Pick) {
  const { locale } = useI18n();
  return (
    <DataTable className="ulune-hd-centres" stickyFirst={false}>
      <thead>
        <tr>
          <th data-col="centre">{hdGraphText(locale, "centreWord")}</th>
          <th data-col="state">{modesWord(locale, "stateWord")}</th>
          <th data-col="gates">{hdGraphText(locale, "gatesWord")}</th>
        </tr>
      </thead>
      <tbody>
        {hdCentreRows(chart, view).map((c) => {
          const id = `center:${c.id}`;
          const on = selectedId === id;
          return (
            <tr
              key={c.id}
              data-testid={`hd-centre-${c.id}`}
              data-defined={c.defined ? "1" : "0"}
              data-selected={on ? "1" : undefined}
              data-uncertain={c.uncertain ? "1" : undefined}
              className={cn("cursor-pointer", on && "bg-bg-subtle")}
              onClick={() => onSelect(id)}
              {...previewProps(id)}
            >
              <td data-col="centre">
                <button type="button" className="ulune-row-pick" aria-pressed={on}>
                  <span className={cn("ulune-hd-centre-dot", c.defined && "is-defined")} aria-hidden />
                  {hdCenterLabel(locale, c.id)}
                </button>
              </td>
              <td data-col="state">
                <span className={cn(c.uncertain && "ulune-uncertain")}>
                  {c.uncertain ? "~" : ""}
                  {upper(hdGraphText(locale, c.defined ? "defined" : "open"))}
                </span>
              </td>
              <td data-col="gates" className="font-mono tabular-nums">
                {c.gates.length ? c.gates.join(", ") : <span className="font-sans text-fg-subtle">{modesWord(locale, "noGates")}</span>}
              </td>
            </tr>
          );
        })}
      </tbody>
    </DataTable>
  );
}
