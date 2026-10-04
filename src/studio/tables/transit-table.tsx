import { useMemo, useRef } from "react";
import { partRows } from "@/lib/csv";
import { chartNameOf } from "@/lib/chart/library";
import { GRID_BODIES, skyGroups, transitAspectRows, transitCheck, type SkyRow } from "@/lib/chart/cross-table";
import { gridParts, joinParts, natalSide, transitSide, transitTableCsv, transitTextParts } from "@/lib/chart/cross-export";
import { motionFlags, transitRowTestId } from "@/lib/chart/transit-exact";
import type { NatalChart, TransitSky } from "@/lib/chart/types";
import { previewProps } from "@/lib/depth/preview-bus";
import { useI18n } from "@/lib/i18n/locale";
import { modesWord, pointsGroupLabel, pointsText } from "@/lib/i18n/table-ui";
import { transitTableEmpty } from "@/lib/i18n/transits-ui";
import { cn, formatDegreeSeconds } from "@/lib/utils";
import { Body, CrossAspects, CrossGrid, Maybe, Position, UnknownNote, shownKeep } from "@/studio/tables/cross-parts";
import type { CrossAspectRow } from "@/lib/chart/cross-table";
import { DataTable } from "@/studio/tables/DataTable";
import { TableActions, TablePage, type TablePart } from "@/studio/tables/TablePage";

/**
 * The Transits table (part 52 of the launch plan): the moving planets'
 * aspects to the birth chart with their orbs and exact moments, where each
 * body stands now and which house of the chart it crosses, and the grid of
 * every moving body against every natal one.
 */
export function TransitTable({
  sky,
  chart,
  selectedId,
  onSelect,
}: {
  sky: TransitSky;
  chart: NatalChart;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { locale, t } = useI18n();
  const unknown = chart.meta.timeUnknown === true;
  const name = chartNameOf(chart, t("untitled"));
  const rows = useMemo(() => transitAspectRows(sky, chart), [sky, chart]);
  const groups = useMemo(() => skyGroups(sky, chart, locale), [sky, chart, locale]);
  const check = useMemo(() => transitCheck(sky, chart), [sky, chart]);
  const moving = useMemo(() => new Map(sky.planets.map((p) => [p.id as string, p])), [sky.planets]);
  const text = () => transitTextParts(sky, chart, name, locale);
  const partText = (id: string) => () => text().find((p) => p.id === id)?.lines.join("\n") ?? "";

  const movingNote = (id: string) => {
    const p = moving.get(id);
    if (!p || p.speed == null) return "";
    const f = motionFlags(p.id, p.speed);
    return [f.retrograde ? pointsText(locale, "retrograde") : "", f.stationary ? pointsText(locale, "stationary") : ""].filter(Boolean).join(" · ");
  };

  const rowIds = GRID_BODIES.filter((id) => moving.has(id));
  const colIds = [...GRID_BODIES.filter((id) => chart.planets.some((p) => p.id === id)), "ascendant", "midheaven"];
  // Each part as its own table (review 3 Oct, B2, B3); the aspects as filtered on screen.
  const shown = useRef<CrossAspectRow[] | null>(null);
  const csvOf = (kinds: string[], keep?: (r: Record<string, string>) => boolean) => () => partRows(transitTableCsv(sky, chart, locale), kinds, keep);
  const grid = () => gridParts(sky.aspects, rowIds, colIds, modesWord(locale, "partGrid"), locale);

  const parts: TablePart[] = [
    {
      id: "aspects",
      label: modesWord(locale, "partAspects"),
      hint: modesWord(locale, "hintTransitAspects"),
      terms: ["transit", "aspect", "orb", "applying", "exact"],
      copyText: partText("aspects"),
      table: csvOf(["aspect"], shownKeep(shown)),
      children: (
        <>
          {unknown ? <UnknownNote>{modesWord(locale, "unknownTransits")}</UnknownNote> : null}
          <CrossAspects
            rows={rows}
            columns={{ a: { key: "transit", label: modesWord(locale, "transit") }, b: { key: "natal", label: modesWord(locale, "natal") } }}
            sides={{ a: transitSide(locale), b: natalSide(locale) }}
            exact={{ kind: "moment", pending: Boolean(sky.meta.provisional) }}
            selectPrefix="taspect:"
            rowTestId={transitRowTestId}
            rowData={(l) => ({ "data-transit": l.a, "data-aspect": l.type, "data-natal": l.b })}
            movingNote={(l) => movingNote(l.a)}
            colTestPrefix="transit"
            shownRef={shown}
            empty={transitTableEmpty(locale)}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        </>
      ),
    },
    {
      id: "sky",
      label: modesWord(locale, "partSky"),
      hint: modesWord(locale, "hintSky"),
      terms: ["retrograde", "station", "house"],
      copyText: partText("sky"),
      table: csvOf(["position"]),
      children: <SkyPart groups={groups} selectedId={selectedId} onSelect={onSelect} />,
    },
    {
      id: "grid",
      label: modesWord(locale, "partGrid"),
      hint: modesWord(locale, "hintTransitGrid"),
      terms: ["aspect", "orb", "applying"],
      copyText: () => grid().lines.join("\n"),
      table: () => grid().table,
      children: (
        <CrossGrid
          links={sky.aspects}
          rowIds={rowIds}
          colIds={colIds}
          selectPrefix="taspect:"
          uncertain={(l) => check(l).uncertain}
          axes={modesWord(locale, "gridAxes", { rows: modesWord(locale, "transits"), cols: modesWord(locale, "yourChart") })}
          label={modesWord(locale, "partGrid")}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ),
    },
  ];

  return (
    <div data-testid="transit-table" data-chart-pick data-selected={selectedId ?? ""} className="min-w-0">
      <TablePage
        name="transits"
        label={t("tableSections")}
        parts={parts}
        fileStem={`${name} transits`}
        actions={<TableActions text={() => joinParts(text())} csv={() => transitTableCsv(sky, chart, locale)} fileName={`${name} transits`} />}
      />
    </div>
  );
}

/** Where each moving body stands, how it moves, and the house of the birth chart it is crossing. */
function SkyPart({
  groups,
  selectedId,
  onSelect,
}: {
  groups: { id: Parameters<typeof pointsGroupLabel>[1]; rows: SkyRow[] }[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { locale } = useI18n();
  return (
    <DataTable className="ulune-points ulune-transit-sky" stickyFirst={false}>
      <thead>
        <tr>
          <th data-col="body">{pointsText(locale, "body")}</th>
          <th data-col="position">{pointsText(locale, "position")}</th>
          <th data-col="motion">{pointsText(locale, "motion")}</th>
          <th data-col="house">{modesWord(locale, "yourHouse")}</th>
        </tr>
      </thead>
      {groups.map((g) => (
        <tbody key={g.id} data-group={g.id}>
          <tr className="ulune-group-row">
            <th colSpan={4} scope="colgroup">
              {pointsGroupLabel(locale, g.id)}
            </th>
          </tr>
          {g.rows.map((r) => {
            const p = r.point;
            const id = `transit:${p.id}`;
            const on = selectedId === id;
            return (
              <tr
                key={p.id}
                data-body={p.id}
                data-selected={on ? "1" : undefined}
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
                  <Position cell={{ text: formatDegreeSeconds(p.ecliptic), uncertain: false }} sign={p.sign} />
                </td>
                <td data-col="motion">
                  {r.motion ? (
                    <>
                      <span className="font-mono">{r.motion.speed}</span>
                      {r.motion.words.length ? <span className="ulune-cell-sub ulune-cell-words">{r.motion.words.join(" · ")}</span> : null}
                    </>
                  ) : null}
                </td>
                <td data-col="house" className="ulune-house-num tabular-nums">
                  <Maybe cell={r.house} mono />
                </td>
              </tr>
            );
          })}
        </tbody>
      ))}
    </DataTable>
  );
}
