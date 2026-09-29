import { useMemo, useState } from "react";
import { chartNameOf } from "@/lib/chart/library";
import {
  bothGroups,
  GRID_BODIES,
  isMainPair,
  overlayRows,
  synastryAspectRows,
  synastryCheck,
  type BothRow,
  type OverlayRow,
} from "@/lib/chart/cross-table";
import { joinParts, ofName, overlaysTitle, personSide, synastryTableCsv, synastryTextParts } from "@/lib/chart/cross-export";
import { synastryRowTestId } from "@/lib/chart/synastry";
import { pointSelectId } from "@/lib/chart/table-cells";
import type { NatalChart, SynastryPair } from "@/lib/chart/types";
import { previewProps } from "@/lib/depth/preview-bus";
import { useI18n } from "@/lib/i18n/locale";
import { synastryTableEmpty } from "@/lib/i18n/synastry-ui";
import { aspectsWord, modesWord, pointsGroupLabel, pointsText } from "@/lib/i18n/table-ui";
import { cn } from "@/lib/utils";
import { Body, CrossAspects, CrossGrid, Maybe, Position, ToolCheck, UnknownNote } from "@/studio/tables/cross-parts";
import { DataTable } from "@/studio/tables/DataTable";
import { TableActions, TablePage, type TablePart } from "@/studio/tables/TablePage";

/** Whether the asteroids, the Vertex and the lots are listed: kept for the visit only (in memory, never stored). */
let withMinorBodies = false;

/** The first person's bodies are read as theirs (planet:, angle:), the second's as the partner's. */
const partnerId = (id: string) => `partner:${id}`;

/**
 * The Synastry table (part 52 of the launch plan): each body of one chart
 * in aspect to a body of the other, where each person's bodies fall in the
 * other's houses, the two charts side by side, and the grid of every body
 * of one against every body of the other.
 */
export function SynastryTable({
  a,
  b,
  pair,
  selectedId,
  onSelect,
}: {
  a: NatalChart;
  b: NatalChart;
  pair: SynastryPair;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { locale, t } = useI18n();
  const aName = chartNameOf(a, t("untitled"));
  const bName = chartNameOf(b, t("untitled"));
  const names = { a: aName, b: bName };
  const [minor, setMinorState] = useState(withMinorBodies);
  const setMinor = (on: boolean) => {
    withMinorBodies = on;
    setMinorState(on);
  };
  const all = useMemo(() => synastryAspectRows(pair, a, b), [pair, a, b]);
  const rows = minor ? all : all.filter((r) => isMainPair(r.link));
  const total = pair.majors.length;
  const shown = minor ? total : pair.majors.filter(isMainPair).length;
  const folded = rows.reduce((n, r) => n + r.twins.length, 0);
  const count = [
    shown === total ? aspectsWord(locale, "countAll", { total: String(total) }) : aspectsWord(locale, "countSome", { shown: String(shown), total: String(total) }),
    folded === 1 ? aspectsWord(locale, "foldedOne") : folded > 1 ? aspectsWord(locale, "folded", { n: String(folded) }) : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const aInB = useMemo(() => overlayRows(a, b), [a, b]);
  const bInA = useMemo(() => overlayRows(b, a), [a, b]);
  const both = useMemo(() => bothGroups(a, b), [a, b]);
  const check = useMemo(() => synastryCheck(a, b), [a, b]);
  const text = () => synastryTextParts(pair, a, b, names, locale);
  const partText = (id: string) => () => text().find((p) => p.id === id)?.lines.join("\n") ?? "";
  const unknownNames = [a.meta.timeUnknown ? aName : "", b.meta.timeUnknown ? bName : ""].filter(Boolean);
  const note = unknownNames.length ? (
    <UnknownNote>{modesWord(locale, "unknownSynastry", { names: unknownNames.join(modesWord(locale, "and")) })}</UnknownNote>
  ) : null;
  const ids = (chart: NatalChart) => [...GRID_BODIES.filter((id) => chart.planets.some((p) => p.id === id)), "ascendant", "midheaven"];

  const parts: TablePart[] = [
    {
      id: "aspects",
      label: modesWord(locale, "partAspects"),
      hint: modesWord(locale, "hintSynAspects"),
      terms: ["synastry", "aspect", "orb", "applying"],
      copyText: partText("aspects"),
      children: (
        <>
          {note}
          <div className="ulune-part-tools" data-testid="synastry-tools">
            <ToolCheck checked={minor} onChange={setMinor} testId="synastry-minor-bodies">
              {modesWord(locale, "minorBodies")}
            </ToolCheck>
          </div>
          <p className="ulune-part-count" data-testid="synastry-count" aria-live="polite">
            {count}
          </p>
          <CrossAspects
            rows={rows}
            columns={{ a: { key: "a", label: aName }, b: { key: "b", label: bName } }}
            sides={{ a: personSide(aName, locale), b: personSide(bName, locale) }}
            selectPrefix="saspect:"
            rowTestId={synastryRowTestId}
            rowData={(l) => ({ "data-a": l.a, "data-aspect": l.type, "data-b": l.b })}
            colTestPrefix="synastry"
            empty={synastryTableEmpty(locale)}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        </>
      ),
    },
    {
      id: "overlays",
      label: modesWord(locale, "partOverlays"),
      hint: modesWord(locale, "hintOverlays"),
      terms: ["house"],
      copyText: partText("overlays"),
      children: (
        <>
          {note}
          <OverlayTable rows={aInB} owner={aName} host={bName} pick={pointSelectId} testId="overlays-a" first selectedId={selectedId} onSelect={onSelect} />
          <OverlayTable rows={bInA} owner={bName} host={aName} pick={partnerId} testId="overlays-b" selectedId={selectedId} onSelect={onSelect} />
        </>
      ),
    },
    {
      id: "both",
      label: modesWord(locale, "partBoth"),
      hint: modesWord(locale, "hintBoth"),
      terms: ["sign", "house"],
      copyText: partText("both"),
      children: <BothTable groups={both} names={names} selectedId={selectedId} onSelect={onSelect} />,
    },
    {
      id: "grid",
      label: modesWord(locale, "partGrid"),
      hint: modesWord(locale, "hintSynGrid", { a: aName, b: bName }),
      terms: ["aspect", "orb", "applying"],
      children: (
        <CrossGrid
          links={pair.aspects}
          rowIds={ids(a)}
          colIds={ids(b)}
          selectPrefix="saspect:"
          uncertain={(l) => check(l).uncertain}
          axes={modesWord(locale, "gridAxes", { rows: aName, cols: bName })}
          label={modesWord(locale, "partGrid")}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ),
    },
  ];

  return (
    <div data-testid="synastry-table" data-chart-pick data-selected={selectedId ?? ""} className="min-w-0">
      <TablePage
        name="synastry"
        label={t("tableSections")}
        parts={parts}
        actions={<TableActions text={() => joinParts(text())} csv={() => synastryTableCsv(pair, a, b, names)} fileName={`${aName} ${bName} synastry`} />}
      />
    </div>
  );
}

/** One person's bodies in the other's houses. */
function OverlayTable({
  rows,
  owner,
  host,
  pick,
  testId,
  first = false,
  selectedId,
  onSelect,
}: {
  rows: OverlayRow[];
  owner: string;
  host: string;
  pick: (id: string) => string;
  testId: string;
  first?: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { locale } = useI18n();
  return (
    <div className={cn("ulune-subpart", first && "ulune-subpart-first")} data-testid={testId}>
      <h3 className="ulune-subpart-h">{overlaysTitle(owner, host, locale)}</h3>
      {rows.length ? (
        <DataTable className="ulune-overlays" stickyFirst={false}>
          <thead>
            <tr>
              <th data-col="body">{pointsText(locale, "body")}</th>
              <th data-col="position">{pointsText(locale, "position")}</th>
              <th data-col="house">{pointsText(locale, "house")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const p = r.point;
              const id = pick(p.id);
              const on = selectedId === id;
              return (
                <tr
                  key={p.id}
                  data-body={p.id}
                  data-house={r.house}
                  data-selected={on ? "1" : undefined}
                  data-uncertain={r.uncertain ? "1" : undefined}
                  className={cn("cursor-pointer", on && "bg-bg-subtle")}
                  onClick={() => onSelect(id)}
                  {...previewProps(id)}
                >
                  <td data-col="body">
                    <button type="button" className="ulune-row-pick" aria-pressed={on}>
                      <Body id={p.id} />
                    </button>
                  </td>
                  <td data-col="position">
                    <Position cell={{ text: p.formatted, uncertain: false }} sign={p.sign} />
                  </td>
                  <td data-col="house" className="ulune-house-num tabular-nums">
                    <Maybe cell={{ text: String(r.house), uncertain: r.uncertain }} mono />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      ) : (
        <p className="text-sm text-fg-muted">{modesWord(locale, "noOverlays", { b: host, ofB: ofName(host) })}</p>
      )}
    </div>
  );
}

/** The two charts side by side, body by body. */
function BothTable({
  groups,
  names,
  selectedId,
  onSelect,
}: {
  groups: { id: Parameters<typeof pointsGroupLabel>[1]; rows: BothRow[] }[];
  names: { a: string; b: string };
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { locale } = useI18n();
  const side = (r: BothRow, who: "a" | "b") => {
    const p = who === "a" ? r.a : r.b;
    const pos = who === "a" ? r.aPosition : r.bPosition;
    const house = who === "a" ? r.aHouse : r.bHouse;
    if (!p || !pos || !house) return <span className="text-fg-subtle">—</span>;
    const id = who === "a" ? pointSelectId(p.id) : partnerId(p.id);
    const on = selectedId === id;
    return (
      <button
        type="button"
        className={cn("ulune-both-pick", on && "is-on")}
        aria-pressed={on}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(id);
        }}
        {...previewProps(id)}
      >
        <Position cell={pos} sign={p.sign} />
        <span className="ulune-cell-sub">
          <Maybe cell={{ text: modesWord(locale, "houseN", { n: house.text }), uncertain: house.uncertain }} />
        </span>
      </button>
    );
  };
  return (
    <DataTable className="ulune-grouped ulune-both" stickyFirst={false}>
      <thead>
        <tr>
          <th data-col="body">{pointsText(locale, "body")}</th>
          <th data-col="a">{names.a}</th>
          <th data-col="b">{names.b}</th>
        </tr>
      </thead>
      {groups.map((g) => (
        <tbody key={g.id} data-group={g.id}>
          <tr className="ulune-group-row">
            <th colSpan={3} scope="colgroup">
              {pointsGroupLabel(locale, g.id)}
            </th>
          </tr>
          {g.rows.map((r) => (
            <tr key={r.id} data-body={r.id}>
              <td data-col="body">
                <Body id={r.id} />
              </td>
              <td data-col="a">{side(r, "a")}</td>
              <td data-col="b">{side(r, "b")}</td>
            </tr>
          ))}
        </tbody>
      ))}
    </DataTable>
  );
}
