import { useMemo } from "react";
import { chartNameOf } from "@/lib/chart/library";
import {
  progressedAngleRows,
  progressedGroups,
  progressedMoon,
  progressionAspectRows,
  type ProgressedRow,
} from "@/lib/chart/cross-table";
import {
  joinParts,
  natalSide,
  nextPhaseText,
  progressedMoonLines,
  progressedSide,
  progressionTableCsv,
  progressionTextParts,
} from "@/lib/chart/cross-export";
import { progressionRowTestId } from "@/lib/chart/progressions";
import type { NatalChart, ProgressedSky } from "@/lib/chart/types";
import { previewProps } from "@/lib/depth/preview-bus";
import { useI18n } from "@/lib/i18n/locale";
import { progressionTableEmpty } from "@/lib/i18n/progressions-ui";
import { aspectsWord, modesWord, pointsGroupLabel, pointsText } from "@/lib/i18n/table-ui";
import { cn } from "@/lib/utils";
import { Body, CrossAspects, Maybe, Position, UnknownNote } from "@/studio/tables/cross-parts";
import { DataTable } from "@/studio/tables/DataTable";
import { TableActions, TablePage, type TablePart } from "@/studio/tables/TablePage";

/**
 * The Progressions table (part 52 of the launch plan): the progressed
 * bodies' and angles' aspects to the birth chart with their orbs and the
 * day each is exact; each progressed body beside its birth place, how far it
 * has gone and how it moves in a year of life; the progressed angles; the
 * progressed Moon's phase.
 */
export function ProgressionsTable({
  sky,
  chart,
  selectedId,
  onSelect,
}: {
  sky: ProgressedSky;
  chart: NatalChart;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { locale, t } = useI18n();
  const unknown = chart.meta.timeUnknown === true;
  const name = chartNameOf(chart, t("untitled"));
  const rows = useMemo(() => progressionAspectRows(sky, chart), [sky, chart]);
  const groups = useMemo(() => progressedGroups(sky, chart, locale), [sky, chart, locale]);
  const angles = useMemo(() => progressedAngleRows(sky, chart, locale), [sky, chart, locale]);
  const text = () => progressionTextParts(sky, chart, name, locale);
  const partText = (id: string) => () => text().find((p) => p.id === id)?.lines.join("\n") ?? "";
  const byId = new Map([...sky.planets, ...Object.values(sky.angles)].map((p) => [p.id as string, p]));
  const movingNote = (id: string) => {
    const p = byId.get(id);
    return p?.retrograde && p.kind !== "angle" ? pointsText(locale, "retrograde") : "";
  };

  const parts: TablePart[] = [
    {
      id: "aspects",
      label: modesWord(locale, "partAspects"),
      hint: modesWord(locale, "hintProgAspects"),
      terms: ["progression", "aspect", "orb", "applying", "exact"],
      copyText: partText("aspects"),
      children: (
        <>
          {unknown ? <UnknownNote>{modesWord(locale, "unknownProgressions")}</UnknownNote> : null}
          <CrossAspects
            rows={rows}
            columns={{ a: { key: "progressed", label: modesWord(locale, "progressed") }, b: { key: "natal", label: modesWord(locale, "natal") } }}
            sides={{ a: progressedSide(locale), b: natalSide(locale) }}
            exact={{ kind: "day", pending: Boolean(sky.meta.provisional), birthMs: Date.parse(sky.meta.natalUtc) }}
            selectPrefix="paspect:"
            rowTestId={progressionRowTestId}
            rowData={(l) => ({ "data-progressed": l.a, "data-aspect": l.type, "data-natal": l.b })}
            movingNote={(l) => movingNote(l.a)}
            colTestPrefix="progression"
            empty={progressionTableEmpty(locale)}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        </>
      ),
    },
    {
      id: "positions",
      label: modesWord(locale, "partPositions"),
      hint: modesWord(locale, "hintPositions"),
      terms: ["progression", "retrograde", "station"],
      copyText: partText("positions"),
      children: (
        <ProgressedTable
          groups={groups.map((g) => ({ id: g.id, label: pointsGroupLabel(locale, g.id), rows: g.rows }))}
          motion
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ),
    },
    {
      id: "angles",
      label: modesWord(locale, "partAngles"),
      hint: modesWord(locale, "hintAngles"),
      terms: ["ascendant", "midheaven"],
      copyText: partText("angles"),
      children: <ProgressedTable groups={[{ id: "angles", label: "", rows: angles }]} selectedId={selectedId} onSelect={onSelect} />,
    },
    {
      id: "moon",
      label: modesWord(locale, "partMoon"),
      hint: modesWord(locale, "hintMoon"),
      terms: ["moonPhase"],
      copyText: partText("moon"),
      children: <MoonPart sky={sky} chart={chart} />,
    },
  ];

  return (
    <div data-testid="progressions-table" data-chart-pick data-selected={selectedId ?? ""} className="min-w-0">
      <TablePage
        name="progressions"
        label={t("tableSections")}
        parts={parts}
        actions={
          <TableActions text={() => joinParts(text())} csv={() => progressionTableCsv(sky, chart, locale)} fileName={`${name} progressions`} />
        }
      />
    </div>
  );
}

/** Progressed bodies (or angles) beside their birth places. */
function ProgressedTable({
  groups,
  motion = false,
  selectedId,
  onSelect,
}: {
  groups: { id: string; label: string; rows: ProgressedRow[] }[];
  motion?: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { locale } = useI18n();
  const cols = motion ? 6 : 5;
  return (
    <DataTable className="ulune-points ulune-progressed" stickyFirst={false}>
      <thead>
        <tr>
          <th data-col="body">{pointsText(locale, "body")}</th>
          <th data-col="position">{modesWord(locale, "progressed")}</th>
          <th data-col="natal">{modesWord(locale, "atBirth")}</th>
          <th data-col="moved">{modesWord(locale, "moved")}</th>
          {motion ? <th data-col="motion">{modesWord(locale, "motionYear")}</th> : null}
          <th data-col="house">{modesWord(locale, "yourHouse")}</th>
        </tr>
      </thead>
      {groups.map((g) => (
        <tbody key={g.id} data-group={g.id}>
          {g.label ? (
            <tr className="ulune-group-row">
              <th colSpan={cols} scope="colgroup">
                {g.label}
              </th>
            </tr>
          ) : null}
          {g.rows.map((r) => {
            const p = r.point;
            const id = `progressed:${p.id}`;
            const on = selectedId === id;
            return (
              <tr
                key={p.id}
                data-body={p.id}
                data-selected={on ? "1" : undefined}
                data-uncertain={r.position.uncertain ? "1" : undefined}
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
                  <Position cell={r.position} sign={p.sign} />
                </td>
                <td data-col="natal">{r.natal && r.natalPosition ? <Position cell={r.natalPosition} sign={r.natal.sign} /> : null}</td>
                <td data-col="moved">{r.moved ? <Maybe cell={r.moved} mono /> : null}</td>
                {motion ? (
                  <td data-col="motion">
                    {r.motion ? (
                      <>
                        <span className="font-mono">{r.motion.speed}</span>
                        {r.motion.words.length ? <span className="ulune-cell-sub ulune-cell-words">{r.motion.words.join(" · ")}</span> : null}
                      </>
                    ) : null}
                  </td>
                ) : null}
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

/** The progressed lunation: the phase, how far past the progressed Sun, where the progressed Moon is. */
function MoonPart({ sky, chart }: { sky: ProgressedSky; chart: NatalChart }) {
  const { locale } = useI18n();
  const moon = progressedMoon(sky, chart);
  if (!moon) return null;
  const [phase, where] = progressedMoonLines(sky, chart, locale);
  const next = nextPhaseText(moon, sky.meta.yearsOfLife, locale);
  return (
    <dl className="grid gap-x-[var(--space-5)] gap-y-[var(--space-3)] sm:grid-cols-2" data-testid="progressed-moon" data-phase={moon.phase}>
      <div>
        <dt className="ulune-kicker text-fg-muted">{aspectsWord(locale, "phase")}</dt>
        <dd className={cn("mt-1 text-fg", moon.uncertain && "ulune-uncertain")}>{phase}</dd>
      </div>
      <div>
        <dt className="ulune-kicker text-fg-muted">{pointsText(locale, "position")}</dt>
        <dd className={cn("mt-1 text-fg", moon.uncertain && "ulune-uncertain")}>{where}</dd>
      </div>
      {next ? (
        <div>
          <dt className="ulune-kicker text-fg-muted">{modesWord(locale, "nextWord")}</dt>
          <dd className={cn("mt-1 text-fg", moon.uncertain && "ulune-uncertain")} data-testid="progressed-moon-next">
            {moon.uncertain ? "~" : ""}
            {next}
          </dd>
        </div>
      ) : null}
    </dl>
  );
}
