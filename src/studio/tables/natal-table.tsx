import { ChevronRight, Copy, Download } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { AspectGlyph, PlanetGlyph, SignGlyph } from "@/components/glyphs";
import { Button } from "@/components/ui/button";
import { hydratePatterns } from "@/lib/chart/anatomy";
import { birthZoneLine, julianDayLine, universalTimeLine } from "@/lib/chart/birth-time-label";
import { HOUSE_SYSTEM_LABEL, SIGN_IDS, SIGN_META } from "@/lib/chart/constants";
import { CONFIG_LABEL } from "@/lib/chart/overlay-filter";
import { chartPoints, formatChartTableCsv, formatChartTableText } from "@/lib/chart/table-export";
import { ANGLE_IDS, type BodyFlags, type NatalChart } from "@/lib/chart/types";
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
import type { MessageKey } from "@/lib/i18n/messages";
import { cn, formatDegreeSeconds, formatSignedDmsSeconds, formatSpeed } from "@/lib/utils";
import { DataTable, TableFrame, TableGroupBar } from "@/studio/tables/DataTable";
import { toast } from "@/lib/toast";
import { previewProps } from "@/lib/depth/preview-bus";
import { onTablistKeyDown } from "@/lib/a11y/tablist";

const SECTIONS = ["identity", "points", "houses", "aspects", "grid", "patterns", "balance", "ranking"] as const;
type SectionId = (typeof SECTIONS)[number];
type ColGroup = "position" | "motion" | "condition";

const SECTION_LABEL: Record<SectionId, MessageKey> = {
  identity: "tableIdentity",
  points: "tablePoints",
  houses: "tableHouses",
  aspects: "tableAspects",
  grid: "tableGrid",
  patterns: "tablePatterns",
  balance: "tableBalance",
  ranking: "tableRanking",
};

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, "");
}

function pointSelectId(id: string): string {
  return (ANGLE_IDS as readonly string[]).includes(id) ? `angle:${id}` : `planet:${id}`;
}

function pointCondition(
  p: NatalChart["planets"][number],
  flag: BodyFlags | undefined,
  t: (key: MessageKey, vars?: Record<string, string | number>) => string,
) {
  const motion = flag?.stationary ? t("motionSta") : flag?.fast ? t("motionFast") : t("motionOk");
  const sun = flag?.cazimi ? t("flagCazimi") : flag?.combust ? t("flagCombust") : t("flagNo");
  const sect =
    flag?.inSect === true ? t("inSect") : flag?.inSect === false ? t("outOfSect") : t("flagNo");
  return {
    motion,
    sun,
    sect,
    dir: p.retrograde ? t("dirRx") : t("dirDirect"),
    rx: p.retrograde ? t("flagYes") : t("flagNo"),
    speed: p.speed != null ? formatSpeed(p.speed) : t("flagNo"),
    dec: p.declination != null ? formatSignedDmsSeconds(p.declination) : t("flagNo"),
    oob: flag?.oob ? t("flagYes") : t("flagNo"),
    angular: flag?.angular ? t("flagYes") : t("flagNo"),
    anaretic: flag?.anaretic ? t("flagYes") : t("flagNo"),
    aries: flag?.ariesPoint ? t("flagYes") : t("flagNo"),
    peregrine: flag?.dignity === "peregrine" ? t("flagYes") : t("flagNo"),
  };
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
  const [section, setSection] = useState<SectionId>("points");
  const [group, setGroup] = useState<ColGroup>("position");
  const patterns = useMemo(() => hydratePatterns(chart), [chart]);
  const points = useMemo(() => chartPoints(chart), [chart]);
  const system = t(HOUSE_SYSTEM_LABEL[chart.meta.houseSystem] ?? "housePlacidus");

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

  const ruler = chart.planets.find((p) => p.id === patterns.chartRuler);
  const rulerAspects = chart.aspects.filter(
    (a) => a.level === "major" && (a.a === patterns.chartRuler || a.b === patterns.chartRuler),
  );
  const unaspected = chart.planets.filter((p) => patterns.flags[p.id]?.unaspected);
  const w = patterns.weights;

  const exportActions = (
    <>
      <Button
        type="button"
        data-testid="table-copy"
        variant="ghost"
        size="compact"
        className="min-w-0"
        onClick={() => void copyText()}
      >
        <Copy className="size-3.5" />
        {copied ? t("tableCopied") : t("tableCopy")}
      </Button>
      <Button
        type="button"
        data-testid="table-csv"
        variant="ghost"
        size="compact"
        className="min-w-0"
        onClick={downloadCsv}
      >
        <Download className="size-3.5" />
        {t("tableExportCsv")}
      </Button>
    </>
  );

  let body: ReactNode = null;
  if (section === "identity") {
    body = (
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
  } else if (section === "points") {
    body = (
      <>
        <TableGroupBar
          group={group}
          onGroup={setGroup}
          labels={{
            position: t("colGroupPosition"),
            motion: t("colGroupMotion"),
            condition: t("colGroupCondition"),
          }}
        />
        <DataTable wide group={group}>
          <thead>
            <tr>
              <th>{t("colName")}</th>
              <th data-group="position">{t("colSign")}</th>
              <th data-group="position">{t("colHouse")}</th>
              <th data-group="position">{t("colDegree")}</th>
              <th data-group="motion">{t("colSpeed")}</th>
              <th data-group="motion">{t("colDir")}</th>
              <th data-group="motion">{t("colMotion")}</th>
              <th data-group="motion">{t("colRx")}</th>
              <th data-group="motion">{t("colDec")}</th>
              <th data-group="motion">{t("colOob")}</th>
              <th data-group="condition">{t("colDignity")}</th>
              <th data-group="condition">{t("colPeregrine")}</th>
              <th data-group="condition">{t("colSun")}</th>
              <th data-group="condition">{t("colAngular")}</th>
              <th data-group="condition">{t("colAnaretic")}</th>
              <th data-group="condition">{t("colAries")}</th>
              <th data-group="condition">{t("colSect")}</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => {
              const flag = patterns.flags[p.id];
              const c = pointCondition(p, flag, t);
              const id = pointSelectId(p.id);
              const on = selectedId === id;
              return (
                <tr
                  key={p.id}
                  data-body={p.id}
                  data-selected={on ? "1" : undefined}
                  className={cn(onSelect && "cursor-pointer", on && "bg-bg-subtle")}
                  onClick={() => onSelect?.(id)}
                  {...previewProps(id)}
                >
                  <td>
                    <span className="inline-flex items-center gap-2">
                      <span className="grid size-5 place-items-center text-fg">
                        <PlanetGlyph id={p.id} size={14} />
                      </span>
                      {bodyLabel(p.id, locale)}
                    </span>
                  </td>
                  <td data-group="position">
                    <span className="inline-flex items-center gap-1.5">
                      <SignGlyph id={p.sign} size={12} />
                      {signName(p.sign, locale)}
                    </span>
                  </td>
                  <td data-group="position" className="ulune-house-num font-mono tabular-nums">
                    {p.house}
                  </td>
                  <td data-group="position" className="font-mono whitespace-nowrap">
                    {formatDegreeSeconds(p.ecliptic)}
                  </td>
                  <td data-group="motion" className="font-mono whitespace-nowrap">
                    {c.speed}
                  </td>
                  <td data-group="motion" className="font-mono">
                    {c.dir}
                  </td>
                  <td data-group="motion">{c.motion}</td>
                  <td data-group="motion">{c.rx}</td>
                  <td data-group="motion" className="font-mono whitespace-nowrap">
                    {c.dec}
                  </td>
                  <td data-group="motion">{c.oob}</td>
                  <td data-group="condition">{flag?.dignity ? dignityName(flag.dignity, locale) : t("flagNo")}</td>
                  <td data-group="condition">{c.peregrine}</td>
                  <td data-group="condition">{c.sun}</td>
                  <td data-group="condition">{c.angular}</td>
                  <td data-group="condition">{c.anaretic}</td>
                  <td data-group="condition">{c.aries}</td>
                  <td data-group="condition">{c.sect}</td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      </>
    );
  } else if (section === "houses") {
    body = (
      <DataTable stickyFirst={false}>
        <thead>
          <tr>
            <th>{t("colHouse")}</th>
            <th>{t("colSign")}</th>
            <th>{t("colDegree")}</th>
          </tr>
        </thead>
        <tbody>
          {chart.houses.map((h) => (
            <tr
              key={h.id}
              data-house={h.id}
              data-selected={selectedId === `house:${h.id}` ? "1" : undefined}
              className={cn(onSelect && "cursor-pointer")}
              onClick={() => onSelect?.(`house:${h.id}`)}
              {...previewProps(`house:${h.id}`)}
            >
              <td className="ulune-house-id" data-house={h.id}>
                <span className="ulune-house-id-n">{h.id}</span>
              </td>
              <td>
                <span className="inline-flex items-center gap-1.5">
                  <SignGlyph id={h.sign} size={12} />
                  {signName(h.sign, locale)}
                </span>
              </td>
              <td className="font-mono">{formatDegreeSeconds(h.ecliptic)}</td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    );
  } else if (section === "aspects") {
    body = (
      <DataTable>
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
          {chart.aspects.map((a) => (
            <tr
              key={a.id}
              data-aspect={a.id}
              data-selected={selectedId === `aspect:${a.id}` ? "1" : undefined}
              className={cn(onSelect && "cursor-pointer")}
              onClick={() => onSelect?.(`aspect:${a.id}`)}
              {...previewProps(`aspect:${a.id}`)}
            >
              <td>
                {bodyLabel(a.a, locale)} · {bodyLabel(a.b, locale)}
              </td>
              <td>
                <span className="inline-flex items-center gap-1.5">
                  <AspectGlyph id={a.type} size={12} />
                  {aspectName(a.type, locale)}
                </span>
              </td>
              <td>{a.level === "major" ? t("tableAspectMajor") : t("tableAspectMinor")}</td>
              <td className="font-mono">{a.orb.toFixed(2)}°</td>
              <td>
                {a.applying === true ? t("applying") : a.applying === false ? t("separating") : t("flagNo")}
              </td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    );
  } else if (section === "grid") {
    body = <AspectGrid chart={chart} selectedId={selectedId} onSelect={onSelect} />;
  } else if (section === "patterns") {
    body = (
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
  } else if (section === "balance") {
    body = (
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
  } else {
    body = (
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
                    sect:
                      row.inSect === true ? `, ${t("inSect")}` : row.inSect === false ? `, ${t("outOfSect")}` : "",
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

  return (
    <div
      data-testid="studio-table"
      data-chart-pick
      data-selected={selectedId ?? ""}
      className="flex min-h-0 min-w-0 flex-col gap-[var(--space-3)]"
    >
      <div
        className="ulune-wrap-tabs min-w-0"
        role="tablist"
        aria-label={t("tableSections")}
        onKeyDown={(e) => onTablistKeyDown(e, true)}
      >
        {SECTIONS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            data-testid={`table-section-${id}`}
            aria-selected={section === id}
            tabIndex={section === id ? 0 : -1}
            onClick={() => setSection(id)}
            className={cn(
              "min-h-11 px-3 text-sm",
              section === id ? "ob-subtab-on" : "text-fg-muted",
            )}
          >
            {t(SECTION_LABEL[id])}
          </button>
        ))}
      </div>
      <TableFrame
        testId={`table-${section}`}
        title={t(SECTION_LABEL[section])}
        hint={t(`${SECTION_LABEL[section]}Hint` as MessageKey)}
        actions={exportActions}
      >
        {body}
      </TableFrame>
    </div>
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
