import { useMemo, type ReactNode } from "react";
import { useHdNames } from "@/components/use-hd-names";
import { ageAt, cycleStatus, LIFE_CYCLES, type HdCyclesContext } from "@/lib/chart/hd-cycles";
import {
  actsCell,
  bodiesCell,
  centreNowWord,
  centreOwnWord,
  channelStateWord,
  CYCLE_WORD,
  cycleDate,
  cycleDateTime,
  hdCyclesTableCsv,
  hdCyclesTextParts,
  tableChannels,
  transitOrEmpty,
} from "@/lib/chart/hd-cycles-table";
import { hdcBodyRef, hdcLifeRef, HDC_SOLAR } from "@/lib/chart/hd-transit";
import { HD_CENTER_IDS, HD_GATE_CENTER } from "@/lib/chart/human-design";
import { partRows } from "@/lib/csv";
import { previewProps } from "@/lib/depth/preview-bus";
import { hdCyclesWords } from "@/lib/i18n/catalog/hd-cycles-words";
import { hdBodyLabel, hdCenterLabel, hdGateTitle } from "@/lib/i18n/hd-ui";
import { useI18n } from "@/lib/i18n/locale";
import { bookT } from "@/lib/i18n/words-book";
import { cn } from "@/lib/utils";
import { DataTable } from "@/studio/tables/DataTable";
import { TableActions, TablePage, type TablePart } from "@/studio/tables/TablePage";

const upper = (s: string) => (s ? s.charAt(0).toLocaleUpperCase() + s.slice(1) : s);

/**
 * Human Design's Cycles as a table (share and compare plan, feature 5b): the
 * moment's thirteen bodies and what each meets in your chart; the channels
 * the moment completes with your gates, then those it defines on its own;
 * the nine centres in your chart and under the moment; every exact passage
 * of the life cycles; the year's solar return. Everything on the page exists
 * here as text, with Copy and CSV (lib/chart/hd-cycles-table.ts).
 */
export function HdCyclesTable({ ctx, selectedId, onSelect }: { ctx: HdCyclesContext; selectedId: string | null; onSelect: (id: string) => void }) {
  const { locale, t } = useI18n();
  const w = useMemo(() => bookT(hdCyclesWords, t, locale), [t, locale]);
  const names = useHdNames(locale);
  const tr = transitOrEmpty(ctx);
  const text = () => hdCyclesTextParts(ctx, locale, w, names);
  const partText = (id: string) => () => text().find((p) => p.id === id)?.lines.join("\n") ?? "";
  const csvOf = (kinds: string[]) => () => partRows(hdCyclesTableCsv(ctx), kinds);
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
  const channels = tableChannels(tr);
  const sun = ctx.hd.activations.find((a) => a.layer === "personality" && a.body === "sun");
  const earth = ctx.hd.activations.find((a) => a.layer === "personality" && a.body === "earth");
  const parts: TablePart[] = [
    {
      id: "moment",
      label: w("hdcPartMoment"),
      hint: w("hdcPartMomentHint"),
      copyText: partText("moment"),
      table: csvOf(["moment"]),
      children: (
        <DataTable stickyFirst={false}>
          <thead>
            <tr>
              <th data-col="body">{w("hdcColBody")}</th>
              <th data-col="gate">{w("hdcColGate")}</th>
              <th data-col="centre">{w("hdcColCentre")}</th>
              <th data-col="yours">{w("hdcColYours")}</th>
              <th data-col="completes">{w("hdcColCompletes")}</th>
            </tr>
          </thead>
          <tbody>
            {tr.moment.rows.map((r) => {
              const id = hdcBodyRef(r.body);
              const name = names?.gate(r.gate);
              const centre = HD_GATE_CENTER[r.gate];
              const completes = tr.completes.filter((ch) => ch.b.gates.includes(r.gate)).map((ch) => ch.id);
              return row(
                id,
                `hd-cycles-row-body-${r.body}`,
                <>
                  <td data-col="body" className="whitespace-nowrap">
                    {pickCell(
                      id,
                      <>
                        {upper(hdBodyLabel(locale, r.body))}
                        {r.retrograde ? <span className="text-fg-muted"> ℞</span> : null}
                      </>,
                    )}
                  </td>
                  <td data-col="gate" className="whitespace-nowrap">
                    <span className="font-mono tabular-nums">
                      {r.gate}.{r.line}
                    </span>
                    {name ? <span className="text-fg-muted"> · {name}</span> : null}
                  </td>
                  <td data-col="centre">{centre ? hdCenterLabel(locale, centre) : ""}</td>
                  <td data-col="yours">{actsCell(ctx, r.gate, locale) || "—"}</td>
                  <td data-col="completes">{completes.join(", ") || "—"}</td>
                </>,
                { "data-gate": String(r.gate) },
              );
            })}
          </tbody>
        </DataTable>
      ),
    },
    {
      id: "channels",
      label: w("hdcPartChannels"),
      hint: w("hdcPartChannelsHint"),
      copyText: partText("channels"),
      table: csvOf(["channel"]),
      children: (
        <DataTable stickyFirst={false}>
          <thead>
            <tr>
              <th data-col="channel">{w("hdcColChannel")}</th>
              <th data-col="state">{w("hdcColState")}</th>
              <th data-col="yours">{w("hdcColYourGate")}</th>
              <th data-col="moment">{w("hdcColMomentGate")}</th>
            </tr>
          </thead>
          <tbody>
            {channels.length === 0 ? (
              <tr data-testid="hd-cycles-row-none">
                <td colSpan={4}>{w("hdcCompletesNone")}</td>
              </tr>
            ) : null}
            {channels.map((ch) => {
              const id = `channel:${ch.id}`;
              const name = names?.channel(ch.id);
              return row(
                id,
                `hd-cycles-row-${ch.gates[0]}-${ch.gates[1]}`,
                <>
                  <td data-col="channel">
                    {pickCell(
                      id,
                      <>
                        <span className="font-mono tabular-nums">{ch.id}</span>
                        {name ? <span className="text-fg-muted"> · {name}</span> : null}
                      </>,
                    )}
                  </td>
                  <td data-col="state">{upper(channelStateWord(ch, w))}</td>
                  <td data-col="yours" className="whitespace-nowrap">
                    {ch.a.gates.map((g) => hdGateTitle(locale, g)).join(", ") || "—"}
                  </td>
                  <td data-col="moment">{ch.b.gates.map((g) => `${hdGateTitle(locale, g)} (${bodiesCell(tr, g, locale)})`).join(", ") || "—"}</td>
                </>,
                { "data-state": ch.kind === "electromagnetic" ? "temporary" : "moment" },
              );
            })}
          </tbody>
        </DataTable>
      ),
    },
    {
      id: "centres",
      label: w("hdcPartCentres"),
      hint: w("hdcPartCentresHint"),
      copyText: partText("centres"),
      table: csvOf(["centre"]),
      children: (
        <DataTable stickyFirst={false}>
          <thead>
            <tr>
              <th data-col="centre">{w("hdcColCentre")}</th>
              <th data-col="yours">{w("hdcColYours")}</th>
              <th data-col="now">{w("hdcColState")}</th>
            </tr>
          </thead>
          <tbody>
            {HD_CENTER_IDS.map((c) => {
              const id = `center:${c}`;
              return row(
                id,
                `hd-cycles-row-centre-${c}`,
                <>
                  <td data-col="centre">{pickCell(id, hdCenterLabel(locale, c))}</td>
                  <td data-col="yours">{centreOwnWord(tr, c, locale)}</td>
                  <td data-col="now">{upper(centreNowWord(tr, c, w))}</td>
                </>,
                { "data-by": tr.pair.centres.find((x) => x.id === c)?.by ?? "open" },
              );
            })}
          </tbody>
        </DataTable>
      ),
    },
    {
      id: "life",
      label: w("hdcPartLife"),
      hint: w("hdcPartLifeHint"),
      copyText: partText("life"),
      table: csvOf(["cycle"]),
      children: (
        <DataTable stickyFirst={false}>
          <thead>
            <tr>
              <th data-col="cycle">{w("hdcColCycle")}</th>
              <th data-col="passage">{w("hdcColPassage")}</th>
              <th data-col="direction">{w("hdcColDirection")}</th>
              <th data-col="age">{w("hdcColAge")}</th>
              <th data-col="point">{w("hdcColPoint")}</th>
              <th data-col="status">{w("hdcColStatus")}</th>
            </tr>
          </thead>
          <tbody>
            {!ctx.cycles ? (
              <tr data-testid="hd-cycles-row-life-working">
                <td colSpan={6}>{w("hdcWorking")}</td>
              </tr>
            ) : null}
            {LIFE_CYCLES.flatMap((def) => {
              const c = ctx.cycles?.find((x) => x.id === def.id);
              if (!c) return [];
              const id = hdcLifeRef(def.id);
              const status = cycleStatus(c, ctx.at);
              const statusWord = status === "past" ? w("hdcPast") : status === "now" ? w("hdcNow") : status === "coming" ? w("hdcComing") : "";
              if (!c.passages.length) {
                return [
                  row(
                    id,
                    `hd-cycles-row-life-${def.id}`,
                    <>
                      <td data-col="cycle">{pickCell(id, w(CYCLE_WORD[def.id]))}</td>
                      <td data-col="passage" colSpan={5}>
                        {c.beyond ? w("hdcLifeBeyond") : w("hdcLifeNone")}
                      </td>
                    </>,
                  ),
                ];
              }
              return c.passages.map((p, i) =>
                row(
                  id,
                  `hd-cycles-row-life-${def.id}-${i}`,
                  <>
                    <td data-col="cycle">{i === 0 ? pickCell(id, w(CYCLE_WORD[def.id])) : <span className="sr-only">{w(CYCLE_WORD[def.id])}</span>}</td>
                    <td data-col="passage" className="whitespace-nowrap">
                      {ctx.timeUnknown ? cycleDate(p.at, ctx, locale) : cycleDateTime(p.at, ctx, locale)}
                    </td>
                    <td data-col="direction">{p.retrograde ? `℞ ${w("hdcRetrograde")}` : w("hdcDirect")}</td>
                    <td data-col="age" className="whitespace-nowrap">
                      {w("hdcYears", { n: ageAt(ctx.birth, p.at).years })}
                    </td>
                    <td data-col="point" className="whitespace-nowrap">
                      <span className="font-mono tabular-nums">
                        {c.gate.gate}.{c.gate.line}
                      </span>
                    </td>
                    <td data-col="status">{i === 0 ? upper(statusWord) : ""}</td>
                  </>,
                  { "data-cycle": def.id, "data-direction": p.retrograde ? "retrograde" : "direct" },
                ),
              );
            })}
          </tbody>
        </DataTable>
      ),
    },
    {
      id: "solar",
      label: w("hdcPartSolar"),
      hint: w("hdcPartSolarHint"),
      copyText: partText("solar"),
      table: csvOf(["solar"]),
      children: (
        <DataTable stickyFirst={false}>
          <thead>
            <tr>
              <th data-col="year">{w("hdcSolarHead")}</th>
              <th data-col="when">{w("hdcColWhen")}</th>
              <th data-col="sun">{upper(hdBodyLabel(locale, "sun"))}</th>
              <th data-col="earth">{upper(hdBodyLabel(locale, "earth"))}</th>
              <th data-col="completes">{w("hdcColCompletes")}</th>
            </tr>
          </thead>
          <tbody>
            {ctx.solar
              ? row(
                  HDC_SOLAR,
                  "hd-cycles-row-solar",
                  <>
                    <td data-col="year">{pickCell(HDC_SOLAR, String(ctx.solar.year))}</td>
                    <td data-col="when" className="whitespace-nowrap">
                      {ctx.solar.at == null ? w("hdcSolarNone") : ctx.timeUnknown ? cycleDate(ctx.solar.at, ctx, locale) : cycleDateTime(ctx.solar.at, ctx, locale)}
                    </td>
                    <td data-col="sun" className="font-mono tabular-nums">
                      {sun ? `${sun.gate}.${sun.line}` : "—"}
                    </td>
                    <td data-col="earth" className="font-mono tabular-nums">
                      {earth ? `${earth.gate}.${earth.line}` : "—"}
                    </td>
                    <td data-col="completes">{(ctx.solar.transit?.completes ?? []).map((ch) => ch.id).join(", ") || "—"}</td>
                  </>,
                )
              : null}
          </tbody>
        </DataTable>
      ),
    },
  ];
  const file = `${ctx.name} human design cycles`;
  return (
    <div data-testid="hd-cycles-table" data-chart-pick data-selected={selectedId ?? ""} className="min-w-0">
      <TablePage
        name="design-cycles"
        label={t("tableSections")}
        parts={parts}
        fileStem={file}
        actions={<TableActions text={() => text().map((p) => p.lines.join("\n")).join("\n\n")} csv={() => hdCyclesTableCsv(ctx)} fileName={file} />}
      />
    </div>
  );
}
