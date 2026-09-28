import { useMemo } from "react";
import { DataTable } from "@/studio/tables/DataTable";
import { AspectGlyph, PlanetGlyph } from "@/components/glyphs";
import { motionFlags, residualForType } from "@/lib/chart/transit-exact";
import { isProgressionTablePair, progressionRowTestId } from "@/lib/chart/progressions";
import type { AngleId, AspectLink, NatalChart, Placement, ProgressedSky } from "@/lib/chart/types";
import { aspectName, bodyTableLabel } from "@/lib/i18n/astro";
import { useI18n } from "@/lib/i18n/locale";
import {
  PROGRESSION_TABLE_COLUMN_KEYS,
  progressionApplyingTitle,
  progressionSeparatingTitle,
  progressionTableColumns,
  progressionTableEmpty,
  progressionTableHint,
  progressionTableTitle,
} from "@/lib/i18n/progressions-ui";
import { previewProps } from "@/lib/depth/preview-bus";
import { dateFormat } from "@/lib/intl-cache";
import { formatArc } from "@/lib/utils";

function formatExactUtc(iso: string, locale: "en" | "fr"): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const stamp = dateFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(d);
  return `${stamp} UTC`;
}

function natalOf(chart: NatalChart, id: AspectLink["b"]): Placement | undefined {
  if (id in chart.angles) return chart.angles[id as AngleId];
  return chart.planets.find((p) => p.id === id);
}

function progressedOf(sky: ProgressedSky, id: AspectLink["a"]): Placement | undefined {
  if (id in sky.angles) return sky.angles[id as AngleId];
  return sky.planets.find((p) => p.id === id);
}

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
  const { locale } = useI18n();
  const columns = progressionTableColumns(locale);
  const majors = useMemo(
    () =>
      sky.aspects.filter((a) => {
        const moving = progressedOf(sky, a.a);
        const natal = natalOf(chart, a.b);
        const pos =
          moving && natal
            ? { movingLon: moving.ecliptic, natalLon: natal.ecliptic }
            : undefined;
        return isProgressionTablePair(a, pos);
      }),
    [sky, chart],
  );

  return (
    <section data-testid="progressions-table" className="ulune-panel min-w-0 overflow-hidden">
      <header className="flex flex-col gap-[var(--space-3)] border-b border-border px-[var(--space-4)] py-[var(--space-3)] md:px-[var(--space-5)]">
        <div className="min-w-0">
          <h2 className="font-display text-2xl leading-none text-fg">{progressionTableTitle(locale)}</h2>
          <p className="mt-[var(--space-2)] max-w-[61.8ch] text-sm text-fg-muted">
            {progressionTableHint(locale)}
          </p>
        </div>
      </header>
      <div className="min-w-0 px-[var(--space-4)] py-[var(--space-4)] md:px-[var(--space-5)]">
        {majors.length ? (
          <DataTable wide exportName="ulune-progressions">
              <thead>
                <tr data-testid="progressions-table-cols">
                  {columns.map((label, i) => {
                    const key = PROGRESSION_TABLE_COLUMN_KEYS[i] ?? label.toLowerCase();
                    return (
                      <th key={key} data-col={key} data-testid={`progression-col-${key}`}>
                        {label}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {majors.map((a) => (
                  <ProgressionAspectRow
                    key={a.id}
                    link={a}
                    pending={Boolean(sky.meta.provisional)}
                    moving={progressedOf(sky, a.a)}
                    natal={natalOf(chart, a.b)}
                    selected={selectedId === `paspect:${a.id}`}
                    locale={locale}
                    onSelect={() => onSelect(`paspect:${a.id}`)}
                    previewId={`paspect:${a.id}`}
                  />
                ))}
              </tbody>
            </DataTable>
        ) : (
          <p data-testid="progressions-table-empty" className="text-sm text-fg-muted">
            {progressionTableEmpty(locale)}
          </p>
        )}
      </div>
    </section>
  );
}

function ProgressionAspectRow({
  link,
  pending,
  moving,
  natal,
  selected,
  locale,
  onSelect,
  previewId,
}: {
  link: AspectLink;
  /** The sky is provisional (the slider moving): the exact date comes with the exact cast. */
  pending?: boolean;
  moving: Placement | undefined;
  natal: Placement | undefined;
  selected: boolean;
  locale: "en" | "fr";
  onSelect: () => void;
  previewId?: string;
}) {
  const { t } = useI18n();
  const flags = moving ? motionFlags(moving.id, moving.speed ?? 0) : null;
  const motion = flags?.stationary ? t("motionSta") : flags?.fast ? t("motionSwift") : null;
  const applying = link.applying === true;
  const separating = link.applying === false;
  const shownOrb =
    moving && natal ? residualForType(moving.ecliptic, natal.ecliptic, link.type) : link.orb;
  const aspectLabel = `${aspectName(link.type, locale)} ${formatArc(shownOrb)}`;
  return (
    <tr
      {...previewProps(previewId)}
      data-testid={progressionRowTestId(link)}
      data-progressed={link.a}
      data-aspect={link.type}
      data-natal={link.b}
      data-selected={selected ? "1" : undefined}
      className={selected ? "bg-bg-subtle" : undefined}
    >
      <td>
        <button
          type="button"
          onClick={onSelect}
          className="inline-flex h-11 min-w-0 items-center gap-2 text-left"
        >
          <span className="grid size-5 shrink-0 place-items-center text-fg">
            <PlanetGlyph id={link.a} size={14} />
          </span>
          <span className="min-w-0">
            <span className="block">{bodyTableLabel(link.a, locale)}</span>
            {flags ? (
              <span className="block font-sans text-xs font-normal normal-case tracking-normal text-fg-subtle">
                {flags.retrograde ? t("dirRx") : t("dirDirect")}
                {motion ? ` · ${motion}` : ""}
              </span>
            ) : null}
          </span>
        </button>
      </td>
      <td data-col="aspect" data-orb={String(shownOrb)} title={aspectLabel}>
        <span className="inline-flex items-center gap-1.5">
          <AspectGlyph id={link.type} size={12} />
          {aspectName(link.type, locale)}
        </span>
      </td>
      <td data-col="natal">
        <span className="inline-flex items-center gap-2">
          <span className="grid size-5 place-items-center text-fg">
            <PlanetGlyph id={link.b} size={14} />
          </span>
          {bodyTableLabel(link.b, locale)}
        </span>
      </td>
      <td data-col="a" data-applying={link.id} className="ulune-as-cell">
        {applying ? (
          <span title={progressionApplyingTitle(locale)} aria-label={progressionApplyingTitle(locale)}>
            A
          </span>
        ) : (
          <span className="text-fg-subtle">—</span>
        )}
      </td>
      <td data-col="s" className="ulune-as-cell">
        {separating ? (
          <span title={progressionSeparatingTitle(locale)} aria-label={progressionSeparatingTitle(locale)}>
            S
          </span>
        ) : (
          <span className="text-fg-subtle">—</span>
        )}
      </td>
      <td className="font-mono whitespace-nowrap" data-exact={link.id} aria-busy={pending ? true : undefined}>
        {pending ? (
          <span className="text-fg-subtle" title={t("exactPending")}>
            …
          </span>
        ) : link.exactUtc ? (
          formatExactUtc(link.exactUtc, locale)
        ) : (
          t("exactUnknown")
        )}
      </td>
    </tr>
  );
}
