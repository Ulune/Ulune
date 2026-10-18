import { useMemo, type ReactNode } from "react";
import { useHdNames } from "@/components/use-hd-names";
import { HD_PAIR_KINDS, HD_PAIR_PEOPLE, type HdPairContext } from "@/lib/chart/hd-pair";
import { KIND_WORD, betweenState, conditionCell, hdPairTableCsv, hdPairTextParts, holdCell, ownState, tableChannels, tableGates } from "@/lib/chart/hd-pair-table";
import { HD_CENTER_IDS, HD_GATE_CENTER } from "@/lib/chart/human-design";
import { partRows } from "@/lib/csv";
import { previewProps } from "@/lib/depth/preview-bus";
import { hdActivationLabel, hdCenterLabel, hdGateTitle } from "@/lib/i18n/hd-ui";
import { hdPairWords } from "@/lib/i18n/catalog/hd-pair-words";
import { useI18n } from "@/lib/i18n/locale";
import { bookT } from "@/lib/i18n/words-book";
import { cn } from "@/lib/utils";
import { DataTable } from "@/studio/tables/DataTable";
import { TableActions, TablePage, type TablePart } from "@/studio/tables/TablePage";

const upper = (s: string) => (s ? s.charAt(0).toLocaleUpperCase() + s.slice(1) : s);

/**
 * Human Design's connection chart as a table (share and compare plan,
 * feature 5a): the channels the two form, by kind, then those with a single
 * gate between them; the nine centres in each chart and between them, with
 * who conditions whom; every gate either person activates. Everything on the
 * figure exists here as text, with Copy and CSV (lib/chart/hd-pair-table.ts).
 */
export function HdPairTable({ ctx, selectedId, onSelect }: { ctx: HdPairContext; selectedId: string | null; onSelect: (id: string) => void }) {
  const { locale, t } = useI18n();
  const w = useMemo(() => bookT(hdPairWords, t, locale), [t, locale]);
  const names = useHdNames(locale);
  const { pair, charts } = ctx;
  const who = ctx.names;
  const text = () => hdPairTextParts(ctx, locale, w, names);
  const partText = (id: string) => () => text().find((p) => p.id === id)?.lines.join("\n") ?? "";
  const csvOf = (kinds: string[]) => () => partRows(hdPairTableCsv(ctx), kinds);
  const { formed, half } = tableChannels(ctx);
  const channelName = (id: string) => names?.channel(id);
  const row = (id: string, testId: string, children: ReactNode, extra?: Record<string, string | undefined>) => {
    const on = selectedId === id;
    return (
      <tr key={testId} data-testid={testId} data-selected={on ? "1" : undefined} className={cn("cursor-pointer", on && "bg-bg-subtle")} onClick={() => onSelect(id)} {...previewProps(id)} {...extra}>
        {children}
      </tr>
    );
  };
  const pickCell = (id: string, label: ReactNode) => (
    <button type="button" className="ulune-row-pick" aria-pressed={selectedId === id}>
      {label}
    </button>
  );
  const parts: TablePart[] = [
    {
      id: "channels",
      label: w("hdpKindsHead"),
      hint: w("hdpPartChannelsHint"),
      copyText: partText("channels"),
      table: csvOf(["channel"]),
      children: (
        <DataTable stickyFirst={false}>
          <thead>
            <tr>
              <th data-col="channel">{w("hdpColChannel")}</th>
              <th data-col="kind">{w("hdpColKind")}</th>
              <th data-col="a">{who.a}</th>
              <th data-col="b">{who.b}</th>
              <th data-col="centres">{w("hdpColCentres")}</th>
            </tr>
          </thead>
          <tbody>
            {formed.length === 0 ? (
              <tr data-testid="hd-pair-row-none">
                <td colSpan={5}>{w("hdpChannelsNone")}</td>
              </tr>
            ) : null}
            {[...HD_PAIR_KINDS.flatMap((k) => formed.filter((ch) => ch.kind === k)), ...half].map((ch) => {
              const id = `channel:${ch.id}`;
              const name = channelName(ch.id);
              return row(
                id,
                `hd-pair-row-${ch.gates[0]}-${ch.gates[1]}`,
                <>
                  <td data-col="channel">
                    {pickCell(
                      id,
                      <>
                        <span className={cn("font-mono tabular-nums", ctx.uncertain.has(ch.id) && "ulune-uncertain")}>
                          {ctx.uncertain.has(ch.id) ? "~" : ""}
                          {ch.id}
                        </span>
                        {name ? <span className="text-fg-muted"> · {name}</span> : null}
                      </>,
                    )}
                  </td>
                  <td data-col="kind">{ch.kind ? w(KIND_WORD[ch.kind]) : upper(w("hdpNotFormed"))}</td>
                  {HD_PAIR_PEOPLE.map((p) => (
                    <td key={p} data-col={p} className="whitespace-nowrap">
                      {holdCell(ch, p, locale, w)}
                    </td>
                  ))}
                  <td data-col="centres">
                    {hdCenterLabel(locale, ch.centers[0])} · {hdCenterLabel(locale, ch.centers[1])}
                  </td>
                </>,
                { "data-kind": ch.kind ?? "none" },
              );
            })}
          </tbody>
        </DataTable>
      ),
    },
    {
      id: "centres",
      label: w("hdpColCentres"),
      hint: w("hdpPartCentresHint"),
      copyText: partText("centres"),
      table: csvOf(["centre"]),
      children: (
        <DataTable stickyFirst={false}>
          <thead>
            <tr>
              <th data-col="centre">{w("hdpColCentre")}</th>
              <th data-col="a">{who.a}</th>
              <th data-col="b">{who.b}</th>
              <th data-col="between">{w("hdpColBetween")}</th>
              <th data-col="conditioning">{w("hdpColConditioning")}</th>
            </tr>
          </thead>
          <tbody>
            {HD_CENTER_IDS.map((c) => {
              const id = `center:${c}`;
              const by = pair.centres.find((x) => x.id === c)?.by;
              return row(
                id,
                `hd-pair-row-centre-${c}`,
                <>
                  <td data-col="centre">{pickCell(id, hdCenterLabel(locale, c))}</td>
                  {HD_PAIR_PEOPLE.map((p) => (
                    <td key={p} data-col={p}>
                      {ownState(ctx, c, p, locale)}
                    </td>
                  ))}
                  <td data-col="between">{betweenState(ctx, c, w)}</td>
                  <td data-col="conditioning">{conditionCell(ctx, c, w) || "—"}</td>
                </>,
                { "data-by": by ?? "open" },
              );
            })}
          </tbody>
        </DataTable>
      ),
    },
    {
      id: "gates",
      label: w("hdpPartGates"),
      hint: w("hdpPartGatesHint"),
      copyText: partText("gates"),
      table: csvOf(["gate"]),
      children: (
        <DataTable stickyFirst={false}>
          <thead>
            <tr>
              <th data-col="gate">{w("hdpColGate")}</th>
              <th data-col="centre">{w("hdpColCentre")}</th>
              <th data-col="a">{who.a}</th>
              <th data-col="b">{who.b}</th>
            </tr>
          </thead>
          <tbody>
            {tableGates(ctx).map((g) => {
              const id = `gate:${g}`;
              const name = names?.gate(g);
              const centre = HD_GATE_CENTER[g];
              return row(
                id,
                `hd-pair-row-gate-${g}`,
                <>
                  <td data-col="gate" className="whitespace-nowrap">
                    {pickCell(
                      id,
                      <>
                        {hdGateTitle(locale, g)}
                        {name ? <span className="text-fg-muted"> · {name}</span> : null}
                      </>,
                    )}
                  </td>
                  <td data-col="centre">{centre ? hdCenterLabel(locale, centre) : ""}</td>
                  {HD_PAIR_PEOPLE.map((p) => (
                    <td key={p} data-col={p}>
                      {charts[p].activations
                        .filter((x) => x.gate === g)
                        .map((x) => hdActivationLabel(locale, x))
                        .join(", ") || "—"}
                    </td>
                  ))}
                </>,
                { "data-tone": pair.tones.get(g) },
              );
            })}
          </tbody>
        </DataTable>
      ),
    },
  ];
  const file = `${who.a} ${who.b} human design`;
  return (
    <div data-testid="hd-pair-table" data-chart-pick data-selected={selectedId ?? ""} className="min-w-0">
      <TablePage
        name="design-pair"
        label={t("tableSections")}
        parts={parts}
        fileStem={file}
        actions={<TableActions text={() => text().map((p) => p.lines.join("\n")).join("\n\n")} csv={() => hdPairTableCsv(ctx)} fileName={file} />}
      />
    </div>
  );
}
