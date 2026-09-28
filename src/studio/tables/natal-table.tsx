import { ChevronRight, Copy, Download } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { AspectGlyph, PlanetGlyph, SignGlyph } from "@/components/glyphs";
import { hydratePatterns } from "@/lib/chart/anatomy";
import { birthZoneLine, julianDayLine, universalTimeLine } from "@/lib/chart/birth-time-label";
import { HOUSE_SYSTEM_LABEL, SIGN_IDS, SIGN_META } from "@/lib/chart/constants";
import { CONFIG_LABEL } from "@/lib/chart/overlay-filter";
import { chartPoints, chartTextParts, formatChartTableCsv, formatChartTableText, type ChartTextPartId } from "@/lib/chart/table-export";
import { ANGLE_IDS, type BodyFlags, type ChartPatterns, type NatalChart, type Placement } from "@/lib/chart/types";
import {
  aspectName,
  bodyLabel,
  dignityName,
  elementName,
  houseName,
  modalityName,
  planetName,
  signName,
} from "@/lib/i18n/astro";
import { useI18n } from "@/lib/i18n/locale";
import { pointsText, tablePartHint, tablePartLabel, type TablePartId } from "@/lib/i18n/table-ui";
import { cn, formatDegreeSeconds, formatSignedDmsSeconds } from "@/lib/utils";
import { DataTable } from "@/studio/tables/DataTable";
import { TablePage, type TablePart } from "@/studio/tables/TablePage";
import { toast } from "@/lib/toast";
import { previewProps } from "@/lib/depth/preview-bus";

type Translate = ReturnType<typeof useI18n>["t"];
type Locale = ReturnType<typeof useI18n>["locale"];

/** The parts of the natal table, in reading order. */
const PARTS: TablePartId[] = ["identity", "points", "houses", "aspects", "grid", "patterns", "balance", "ranking"];

/** Points that have no motion of their own to show: the angles, Vertex and the lots. */
const STILL = new Set<string>(["vertex", "antivertex", "fortune", "spirit"]);

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, "");
}

function pointSelectId(id: string): string {
  return (ANGLE_IDS as readonly string[]).includes(id) ? `angle:${id}` : `planet:${id}`;
}

export function NatalTable({
  chart,
  selectedId = null,
  onSelect,
}: {
  chart: NatalChart;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  const { locale, t } = useI18n();
  const [copied, setCopied] = useState(false);
  const patterns = useMemo(() => hydratePatterns(chart), [chart]);

  function downloadCsv() {
    const csv = formatChartTableCsv(chart, locale);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${chart.meta.name.replace(/\s+/g, "-").toLowerCase() || "natal"}-table.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyText() {
    const text = formatChartTableText(chart, locale);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast(t("tableCopied"));
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  const actions = (
    <>
      <button type="button" className="ob-table-export-btn" data-testid="table-copy" onClick={() => void copyText()}>
        <Copy className="size-3.5" aria-hidden />
        <span className="ulune-tbar-act-label" aria-live="polite">
          {copied ? t("tableCopied") : t("tableCopy")}
        </span>
      </button>
      <button type="button" className="ob-table-export-btn" data-testid="table-csv" onClick={downloadCsv}>
        <Download className="size-3.5" aria-hidden />
        <span className="ulune-tbar-act-label">{t("tableExportCsv")}</span>
      </button>
    </>
  );

  const textOf = (id: ChartTextPartId) => () =>
    chartTextParts(chart, locale)
      .find((p) => p.id === id)
      ?.lines.join("\n") ?? "";

  const content: Record<TablePartId, ReactNode> = {
    identity: <IdentityPart chart={chart} patterns={patterns} />,
    points: <PointsPart chart={chart} patterns={patterns} selectedId={selectedId} onSelect={onSelect} />,
    houses: <HousesPart chart={chart} selectedId={selectedId} onSelect={onSelect} />,
    aspects: <AspectsPart chart={chart} selectedId={selectedId} onSelect={onSelect} />,
    grid: <AspectGrid chart={chart} selectedId={selectedId} onSelect={onSelect} />,
    patterns: <PatternsPart chart={chart} patterns={patterns} onSelect={onSelect} />,
    balance: <BalancePart patterns={patterns} />,
    ranking: <RankingPart chart={chart} patterns={patterns} onSelect={onSelect} />,
  };

  const parts: TablePart[] = PARTS.map((id) => ({
    id,
    label: tablePartLabel(locale, id),
    hint: tablePartHint(locale, id),
    copyText: id === "grid" ? undefined : textOf(id),
    children: content[id],
  }));

  return (
    <div data-testid="studio-table" data-chart-pick data-selected={selectedId ?? ""} className="min-w-0">
      <TablePage name="natal" label={t("tableSections")} parts={parts} actions={actions} />
    </div>
  );
}

function IdentityPart({ chart, patterns }: { chart: NatalChart; patterns: ChartPatterns }) {
  const { locale, t } = useI18n();
  const system = t(HOUSE_SYSTEM_LABEL[chart.meta.houseSystem] ?? "housePlacidus");
  return (
    <dl className="grid gap-x-[var(--space-5)] gap-y-[var(--space-3)] sm:grid-cols-2">
      <div>
        <dt className="ulune-kicker text-fg-muted">{t("name")}</dt>
        <dd className="mt-1 text-fg">{chart.meta.name}</dd>
      </div>
      <div>
        <dt className="ulune-kicker text-fg-muted">{t("date")}</dt>
        <dd className="mt-1 font-mono text-sm text-fg">
          {chart.meta.date} {chart.meta.time}
          <span className="mt-0.5 block text-xs text-fg-muted" data-testid="table-zone">
            {birthZoneLine(chart.meta, locale)}
            {chart.meta.birthTime?.calendar === "julian" ? ` · ${t("tzJulianShort")}` : ""}
          </span>
        </dd>
      </div>
      <div>
        <dt className="ulune-kicker text-fg-muted">{t("tableUniversalTime")}</dt>
        <dd className="mt-1 font-mono text-sm text-fg" data-testid="table-ut">
          {universalTimeLine(chart.meta)}
          {julianDayLine(chart.meta) ? (
            <span className="mt-0.5 block text-xs text-fg-muted">{julianDayLine(chart.meta)}</span>
          ) : null}
        </dd>
      </div>
      <div>
        <dt className="ulune-kicker text-fg-muted">{t("place")}</dt>
        <dd className="mt-1 text-fg">
          {chart.meta.placeLabel}
          <span className="mt-0.5 block font-mono text-xs text-fg-muted">
            {chart.meta.latitude.toFixed(4)}, {chart.meta.longitude.toFixed(4)}
          </span>
        </dd>
      </div>
      <div>
        <dt className="ulune-kicker text-fg-muted">{t("houseSystem")}</dt>
        <dd className="mt-1 text-fg">{system}</dd>
      </div>
      <div>
        <dt className="ulune-kicker text-fg-muted">{t("overlaySect")}</dt>
        <dd className="mt-1 text-fg">
          {patterns.isDay ? t("tableDay") : t("tableNight")}
          <span className="mt-0.5 block text-sm text-fg-muted">
            {patterns.isDay ? t("tableSunAbove") : t("tableSunBelow")}
          </span>
        </dd>
      </div>
    </dl>
  );
}

/** The motion line under a body's daily speed: retrograde, stationary or fast. */
function motionWords(p: Placement, flag: BodyFlags | undefined, t: Translate, locale: Locale): string {
  const words: string[] = [];
  if (p.retrograde) words.push(pointsText(locale, "retrograde"));
  if (flag?.stationary) words.push(t("motionSta"));
  else if (flag?.fast) words.push(t("motionFast"));
  return words.join(" · ");
}

/** What else is true of a body, as short notes. */
function pointNotes(p: Placement, flag: BodyFlags | undefined, t: Translate, locale: Locale): string[] {
  const notes: string[] = [];
  if (flag?.cazimi) notes.push(t("flagCazimi"));
  else if (flag?.combust) notes.push(t("flagCombust"));
  if (flag?.angular && p.kind !== "angle") notes.push(pointsText(locale, "angular"));
  if (flag?.anaretic) notes.push(pointsText(locale, "anaretic"));
  if (flag?.ariesPoint) notes.push(pointsText(locale, "ariesPoint"));
  if (flag?.inSect === true) notes.push(t("inSect"));
  else if (flag?.inSect === false) notes.push(t("outOfSect"));
  if (flag?.unaspected) notes.push(pointsText(locale, "unaspected"));
  return notes;
}

function PointsPart({
  chart,
  patterns,
  selectedId,
  onSelect,
}: {
  chart: NatalChart;
  patterns: ChartPatterns;
  selectedId: string | null;
  onSelect?: (id: string) => void;
}) {
  const { locale, t } = useI18n();
  const points = useMemo(() => chartPoints(chart), [chart]);
  return (
    <DataTable className="ulune-points" stickyFirst={false}>
      <thead>
        <tr>
          <th data-col="body">{pointsText(locale, "body")}</th>
          <th data-col="position">{pointsText(locale, "position")}</th>
          <th data-col="house">{pointsText(locale, "house")}</th>
          <th data-col="motion">{pointsText(locale, "motion")}</th>
          <th data-col="latitude">{pointsText(locale, "latitude")}</th>
          <th data-col="declination">{pointsText(locale, "declination")}</th>
          <th data-col="dignity">{pointsText(locale, "dignity")}</th>
          <th data-col="notes">{pointsText(locale, "notes")}</th>
        </tr>
      </thead>
      <tbody>
        {points.map((p) => {
          const flag = patterns.flags[p.id];
          const id = pointSelectId(p.id);
          const on = selectedId === id;
          const moving = p.kind !== "angle" && !STILL.has(p.id) && p.speed != null;
          const words = moving ? motionWords(p, flag, t, locale) : "";
          const hasLatitude = p.kind !== "angle" && p.latitude != null;
          const notes = pointNotes(p, flag, t, locale);
          return (
            <tr
              key={p.id}
              data-body={p.id}
              data-selected={on ? "1" : undefined}
              className={cn(onSelect && "cursor-pointer", on && "bg-bg-subtle")}
              onClick={() => onSelect?.(id)}
              {...previewProps(id)}
            >
              <td data-col="body">
                <button type="button" className="ulune-row-pick" aria-pressed={on}>
                  <span className="grid size-5 place-items-center text-fg">
                    <PlanetGlyph id={p.id} size={14} />
                  </span>
                  {bodyLabel(p.id, locale)}
                </button>
              </td>
              <td data-col="position" className="whitespace-nowrap">
                <span className="font-mono">{formatDegreeSeconds(p.ecliptic)}</span>{" "}
                <span className="inline-flex items-center gap-1.5 align-[-1px]">
                  <SignGlyph id={p.sign} size={12} />
                  {signName(p.sign, locale)}
                </span>
              </td>
              <td data-col="house" className="ulune-house-num font-mono tabular-nums">
                {p.house}
              </td>
              <td data-col="motion">
                {moving && p.speed != null ? (
                  <>
                    <span className="font-mono">{formatSignedDmsSeconds(p.speed)}</span>
                    {words ? <span className="ulune-cell-sub">{words}</span> : null}
                  </>
                ) : null}
              </td>
              <td data-col="latitude" className="font-mono whitespace-nowrap">
                {hasLatitude && p.latitude != null ? formatSignedDmsSeconds(p.latitude) : null}
              </td>
              <td data-col="declination">
                {p.declination != null ? <span className="font-mono">{formatSignedDmsSeconds(p.declination)}</span> : null}
                {flag?.oob ? <span className="ulune-cell-sub">{pointsText(locale, "oob")}</span> : null}
                {hasLatitude && p.latitude != null ? (
                  <span className="ulune-lat-inline">
                    {pointsText(locale, "latShort")} <span className="font-mono">{formatSignedDmsSeconds(p.latitude)}</span>
                  </span>
                ) : null}
              </td>
              <td data-col="dignity">{flag?.dignity ? dignityName(flag.dignity, locale) : null}</td>
              <td data-col="notes">
                {notes.map((n) => (
                  <span key={n} className="ulune-note">
                    {n}
                  </span>
                ))}
              </td>
            </tr>
          );
        })}
      </tbody>
    </DataTable>
  );
}

function HousesPart({
  chart,
  selectedId,
  onSelect,
}: {
  chart: NatalChart;
  selectedId: string | null;
  onSelect?: (id: string) => void;
}) {
  const { locale, t } = useI18n();
  return (
    <DataTable stickyFirst={false}>
      <thead>
        <tr>
          <th>{t("colHouse")}</th>
          <th>{t("colSign")}</th>
          <th>{t("colDegree")}</th>
        </tr>
      </thead>
      <tbody>
        {chart.houses.map((h) => {
          const on = selectedId === `house:${h.id}`;
          return (
            <tr
              key={h.id}
              data-house={h.id}
              data-selected={on ? "1" : undefined}
              className={cn(onSelect && "cursor-pointer")}
              onClick={() => onSelect?.(`house:${h.id}`)}
              {...previewProps(`house:${h.id}`)}
            >
              <td className="ulune-house-id" data-house={h.id}>
                <button type="button" className="ulune-row-pick" aria-pressed={on} aria-label={houseName(h.id, locale)}>
                  <span className="ulune-house-id-n">{h.id}</span>
                </button>
              </td>
              <td>
                <span className="inline-flex items-center gap-1.5">
                  <SignGlyph id={h.sign} size={12} />
                  {signName(h.sign, locale)}
                </span>
              </td>
              <td className="font-mono">{formatDegreeSeconds(h.ecliptic)}</td>
            </tr>
          );
        })}
      </tbody>
    </DataTable>
  );
}

function AspectsPart({
  chart,
  selectedId,
  onSelect,
}: {
  chart: NatalChart;
  selectedId: string | null;
  onSelect?: (id: string) => void;
}) {
  const { locale, t } = useI18n();
  return (
    <DataTable stickyFirst={false}>
      <thead>
        <tr>
          <th>{t("tablePair")}</th>
          <th>{t("tableType")}</th>
          <th>{t("tableLevel")}</th>
          <th>{t("tableOrb")}</th>
          <th>{t("tableAppSep")}</th>
        </tr>
      </thead>
      <tbody>
        {chart.aspects.map((a) => {
          const on = selectedId === `aspect:${a.id}`;
          return (
            <tr
              key={a.id}
              data-aspect={a.id}
              data-selected={on ? "1" : undefined}
              className={cn(onSelect && "cursor-pointer")}
              onClick={() => onSelect?.(`aspect:${a.id}`)}
              {...previewProps(`aspect:${a.id}`)}
            >
              <td>
                <button type="button" className="ulune-row-pick" aria-pressed={on}>
                  {bodyLabel(a.a, locale)} · {bodyLabel(a.b, locale)}
                </button>
              </td>
              <td>
                <span className="inline-flex items-center gap-1.5">
                  <AspectGlyph id={a.type} size={12} />
                  {aspectName(a.type, locale)}
                </span>
              </td>
              <td>{a.level === "major" ? t("tableAspectMajor") : t("tableAspectMinor")}</td>
              <td className="font-mono">{a.orb.toFixed(2)}°</td>
              <td>{a.applying === true ? t("applying") : a.applying === false ? t("separating") : t("flagNo")}</td>
            </tr>
          );
        })}
      </tbody>
    </DataTable>
  );
}

function PatternsPart({
  chart,
  patterns,
  onSelect,
}: {
  chart: NatalChart;
  patterns: ChartPatterns;
  onSelect?: (id: string) => void;
}) {
  const { locale, t } = useI18n();
  const unaspected = chart.planets.filter((p) => patterns.flags[p.id]?.unaspected);
  return (
    <div className="grid gap-[var(--space-4)]">
      <div>
        <h3 className="ulune-kicker text-fg-muted">{t("patternConfigs")}</h3>
        {patterns.configurations.length ? (
          <ul className="mt-2 grid gap-2">
            {patterns.configurations.map((c) => (
              <li key={c.id}>
                <PickRow onClick={onSelect ? () => onSelect(pointSelectId(c.apex ?? c.members[0])) : undefined}>
                  {CONFIG_LABEL[c.type][locale]} · {c.members.map((id) => bodyLabel(id, locale)).join(", ")}
                  {c.apex ? ` · ${t("configApex", { name: bodyLabel(c.apex, locale) })}` : ""}
                </PickRow>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-fg-muted">{t("noConfigs")}</p>
        )}
      </div>
      <div>
        <h3 className="ulune-kicker text-fg-muted">{t("patternReceptions")}</h3>
        {patterns.receptions.length ? (
          <ul className="mt-2 grid gap-2">
            {patterns.receptions.map((r) => (
              <li key={`${r.a}-${r.b}`}>
                <PickRow onClick={onSelect ? () => onSelect(pointSelectId(r.a)) : undefined}>
                  {bodyLabel(r.a, locale)} ⇄ {bodyLabel(r.b, locale)}
                </PickRow>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-fg-muted">{t("noReceptions")}</p>
        )}
      </div>
      <div>
        <h3 className="ulune-kicker text-fg-muted">{t("patternStelliums")}</h3>
        {patterns.stelliums.length ? (
          <ul className="mt-2 grid gap-2">
            {patterns.stelliums.map((s) => (
              <li key={s.place}>
                <PickRow
                  onClick={
                    onSelect
                      ? () => {
                          const n = /^House (\d+)$/.exec(s.place)?.[1];
                          onSelect(n ? `house:${n}` : pointSelectId(s.members[0]));
                        }
                      : undefined
                  }
                >
                  {stelliumPlace(s.place, locale)}: {s.members.map((id) => bodyLabel(id, locale)).join(", ")}
                </PickRow>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-fg-muted">{t("noStelliums")}</p>
        )}
      </div>
      <div>
        <h3 className="ulune-kicker text-fg-muted">{t("patternUnaspected")}</h3>
        <p className="mt-2 text-sm text-fg">
          {unaspected.length ? unaspected.map((p) => bodyLabel(p.id, locale)).join(", ") : t("noUnaspected")}
        </p>
      </div>
      <div>
        <h3 className="ulune-kicker text-fg-muted">{t("patternVoc")}</h3>
        <p className="mt-2 text-sm text-fg">{patterns.vocMoon ? t("vocYes") : t("vocNo")}</p>
      </div>
      <div>
        <h3 className="ulune-kicker text-fg-muted">{t("patternRx")}</h3>
        <p className="mt-2 text-sm text-fg">
          {patterns.retrogrades.length
            ? `${patterns.retrogrades.length} · ${patterns.retrogrades.map((id) => bodyLabel(id, locale)).join(", ")}`
            : t("noRx")}
        </p>
      </div>
    </div>
  );
}

function BalancePart({ patterns }: { patterns: ChartPatterns }) {
  const { locale, t } = useI18n();
  const w = patterns.weights;
  return (
    <div className="ob-balance-grid">
      <BarGroup
        title={t("lookElements")}
        rows={(["fire", "earth", "air", "water"] as const).map((e) => ({
          id: e,
          label: elementName(e, locale),
          value: w.elements[e],
          color: `var(--el-${e})`,
        }))}
      />
      <BarGroup
        title={t("tableModalities")}
        rows={(["cardinal", "fixed", "mutable"] as const).map((m) => ({
          id: m,
          label: modalityName(m, locale),
          value: w.modalities[m],
        }))}
      />
      <BarGroup
        title={t("tablePolarity")}
        rows={[
          { id: "pos", label: t("polarityPositive"), value: w.polarity.positive },
          { id: "neg", label: t("polarityNegative"), value: w.polarity.negative },
        ]}
      />
      <BarGroup
        title={t("overlayHemisphere")}
        rows={[
          { id: "e", label: t("hemiEast"), value: w.hemisphere.east },
          { id: "w", label: t("hemiWest"), value: w.hemisphere.west },
          { id: "n", label: t("hemiNorth"), value: w.hemisphere.north },
          { id: "s", label: t("hemiSouth"), value: w.hemisphere.south },
        ]}
      />
      <BarGroup
        title={t("overlayQuadrant")}
        rows={[t("quad1"), t("quad2"), t("quad3"), t("quad4")].map((label, i) => ({
          id: `q${i}`,
          label,
          value: w.quadrants[i],
        }))}
      />
      <BarGroup
        title={t("overlayAngularity")}
        rows={[
          { id: "a", label: t("tempoAngular"), value: w.angularity.angular },
          { id: "s", label: t("tempoSuccedent"), value: w.angularity.succedent },
          { id: "c", label: t("tempoCadent"), value: w.angularity.cadent },
        ]}
      />
    </div>
  );
}

function RankingPart({
  chart,
  patterns,
  onSelect,
}: {
  chart: NatalChart;
  patterns: ChartPatterns;
  onSelect?: (id: string) => void;
}) {
  const { locale, t } = useI18n();
  const ruler = chart.planets.find((p) => p.id === patterns.chartRuler);
  const rulerAspects = chart.aspects.filter(
    (a) => a.level === "major" && (a.a === patterns.chartRuler || a.b === patterns.chartRuler),
  );
  return (
    <dl className="grid gap-[var(--space-4)]">
      <div>
        <dt className="ulune-kicker text-fg-muted">{t("chartRulerHead")}</dt>
        <dd className="mt-2 text-sm text-fg">
          {ruler
            ? `${t("chartRulerDetail", {
                planet: planetName(patterns.chartRuler, locale),
                sign: signName(ruler.sign, locale),
                house: String(ruler.house),
              })} · ${patterns.flags[ruler.id]?.dignity ? dignityName(patterns.flags[ruler.id]!.dignity!, locale) : t("flagNo")}${
                patterns.flags[ruler.id]?.inSect === true
                  ? ` · ${t("inSect")}`
                  : patterns.flags[ruler.id]?.inSect === false
                    ? ` · ${t("outOfSect")}`
                    : ""
              }`
            : t("flagNo")}
          {rulerAspects.length ? (
            <span className="mt-1 block text-fg-muted">
              {rulerAspects
                .map(
                  (a) =>
                    `${aspectName(a.type, locale)} ${bodyLabel(a.a === patterns.chartRuler ? a.b : a.a, locale)} ${a.orb.toFixed(2)}°`,
                )
                .join(" · ")}
            </span>
          ) : null}
        </dd>
      </div>
      <div>
        <dt className="ulune-kicker text-fg-muted">{t("tightestHead")}</dt>
        <dd className="mt-2 text-sm text-fg">
          {patterns.tightest
            ? `${t("tightestLine", {
                a: bodyLabel(patterns.tightest.a, locale),
                aspect: aspectName(patterns.tightest.type, locale),
                b: bodyLabel(patterns.tightest.b, locale),
                orb: patterns.tightest.orb.toFixed(2),
              })} · ${
                patterns.tightest.applying === true
                  ? t("applying")
                  : patterns.tightest.applying === false
                    ? t("separating")
                    : t("flagNo")
              }`
            : t("flagNo")}
        </dd>
      </div>
      <div>
        <dt className="ulune-kicker text-fg-muted">{t("rankingHead")}</dt>
        <dd className="mt-2">
          <ol className="grid gap-1">
            {patterns.ranking.map((row, i) => (
              <li key={row.id}>
                <PickRow onClick={onSelect ? () => onSelect(pointSelectId(row.id)) : undefined}>
                  {i + 1}.{" "}
                  {t("rankingLine", {
                    planet: bodyLabel(row.id, locale),
                    score: String(row.score),
                    dignity: row.dignity ? dignityName(row.dignity, locale) : t("flagNo"),
                    sect: row.inSect === true ? `, ${t("inSect")}` : row.inSect === false ? `, ${t("outOfSect")}` : "",
                  })}
                </PickRow>
              </li>
            ))}
          </ol>
        </dd>
      </div>
      <div>
        <dt className="ulune-kicker text-fg-muted">{t("dominantHead")}</dt>
        <dd className="mt-2 text-sm text-fg">
          {patterns.dominant
            ? t("dominantLine", {
                shape: CONFIG_LABEL[patterns.dominant.type][locale],
                planet: patterns.dominant.apex ? bodyLabel(patterns.dominant.apex, locale) : "—",
              })
            : t("dominantNone")}
        </dd>
      </div>
    </dl>
  );
}

function PickRow({ onClick, children }: { onClick?: () => void; children: ReactNode }) {
  if (!onClick) return <span className="block py-1 text-sm text-fg">{children}</span>;
  return (
    <button type="button" className="ob-pick-row" onClick={onClick}>
      <span>{children}</span>
      <ChevronRight className="size-4 shrink-0 text-fg-subtle" aria-hidden />
    </button>
  );
}

function stelliumPlace(place: string, locale: "en" | "fr") {
  const n = /^House (\d+)$/.exec(place)?.[1];
  if (n) return houseName(Number(n), locale);
  const sign = SIGN_IDS.find((id) => SIGN_META[id].name === place);
  return sign ? signName(sign, locale) : place;
}

function BarGroup({
  title,
  rows,
}: {
  title: string;
  rows: { id: string; label: string; value: number; color?: string }[];
}) {
  const max = Math.max(1e-6, ...rows.map((r) => r.value));
  return (
    <div className="ob-bal" role="group" aria-label={title}>
      <p className="ob-rc-h">{title}</p>
      <ul className="ob-bal-rows">
        {rows.map((r) => (
          <li key={r.id} className="ob-bal-row" aria-label={`${r.label}: ${fmt(r.value)}`}>
            <span className="ob-bal-label">{r.label}</span>
            <span className="ob-bal-track" aria-hidden>
              <span
                className="ob-bal-fill"
                style={{ width: `${(r.value / max) * 100}%`, background: r.color ?? "var(--color-fg-muted)" }}
              />
            </span>
            <span className="ob-bal-n">{fmt(r.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The classic triangular aspectarian: one cell per pair, tap to read it. */
function AspectGrid({
  chart,
  selectedId,
  onSelect,
}: {
  chart: NatalChart;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  const { locale, t } = useI18n();
  const CORE = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron", "northnode"];
  const ids = [
    ...chart.planets.filter((p) => CORE.includes(p.id)).map((p) => p.id as string),
    ...(["ascendant", "midheaven"] as const).filter((a) => chart.angles[a]),
  ];
  const byPair = new Map<string, NatalChart["aspects"][number]>();
  for (const a of chart.aspects) {
    byPair.set(`${a.a}|${a.b}`, a);
    byPair.set(`${a.b}|${a.a}`, a);
  }
  return (
    <div className="ob-agrid-wrap" data-testid="aspect-grid">
      <table className="ob-agrid" aria-label={t("tableGrid")}>
        <tbody>
          {ids.map((row, r) => (
            <tr key={row}>
              {ids.slice(0, r).map((col) => {
                const a = byPair.get(`${row}|${col}`);
                if (!a) return <td key={col} />;
                const id = `aspect:${a.id}`;
                return (
                  <td key={col} data-on={selectedId === id ? "1" : undefined} data-level={a.level}>
                    <button
                      type="button"
                      onClick={() => onSelect?.(id)}
                      {...previewProps(id)}
                      aria-label={`${bodyLabel(a.a, locale)} ${aspectName(a.type, locale)} ${bodyLabel(a.b, locale)}, ${a.orb.toFixed(1)}°`}
                      title={`${aspectName(a.type, locale)} · ${a.orb.toFixed(1)}°`}
                    >
                      <AspectGlyph id={a.type} size={12} />
                    </button>
                  </td>
                );
              })}
              <th scope="row" className="ob-agrid-diag" title={bodyLabel(row, locale)}>
                <PlanetGlyph id={row} size={13} />
                <span className="sr-only">{bodyLabel(row, locale)}</span>
              </th>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { NatalTable as ChartTable };
