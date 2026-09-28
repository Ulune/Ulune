import { useMemo } from "react";
import { DataTable } from "@/studio/tables/DataTable";
import { AspectGlyph, PlanetGlyph } from "@/components/glyphs";
import { isTransitTablePair, motionFlags, residualForType, transitRowTestId } from "@/lib/chart/transit-exact";
import type { AngleId, AspectLink, NatalChart, Placement, TransitSky } from "@/lib/chart/types";
import { aspectName, bodyTableLabel, formatOrb } from "@/lib/i18n/astro";
import { useI18n } from "@/lib/i18n/locale";
import {
  TRANSIT_TABLE_COLUMN_KEYS,
  transitApplyingTitle,
  transitSeparatingTitle,
  transitTableColumns,
  transitTableEmpty,
} from "@/lib/i18n/transits-ui";
import { previewProps } from "@/lib/depth/preview-bus";
import { dateFormat } from "@/lib/intl-cache";

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
  const columns = transitTableColumns(locale);
  const byId = useMemo(() => new Map(sky.planets.map((p) => [p.id, p])), [sky.planets]);
  const majors = useMemo(
    () =>
      sky.aspects.filter((a) => {
        const moving = byId.get(a.a);
        const natal = natalOf(chart, a.b);
        const pos =
          moving && natal
            ? { movingLon: moving.ecliptic, natalLon: natal.ecliptic }
            : undefined;
        return isTransitTablePair(a, pos);
      }),
    [sky.aspects, byId, chart],
  );

  return (
    <section data-testid="transit-table" className="ulune-panel min-w-0 overflow-hidden">
      <header className="flex flex-col gap-[var(--space-3)] border-b border-border px-[var(--space-4)] py-[var(--space-3)] md:px-[var(--space-5)]">
        <div className="min-w-0">
          <h2 className="font-display text-2xl leading-none text-fg">{t("transitTable")}</h2>
          <p className="mt-[var(--space-2)] max-w-[61.8ch] text-sm text-fg-muted">{t("transitTableHint")}</p>
        </div>
      </header>
      <div className="min-w-0 px-[var(--space-4)] py-[var(--space-4)] md:px-[var(--space-5)]">
        {majors.length ? (
          <DataTable wide exportName="ulune-transits">
              <thead>
                <tr data-testid="transit-table-cols">
                  {columns.map((label, i) => {
                    const key = TRANSIT_TABLE_COLUMN_KEYS[i] ?? label.toLowerCase();
                    return (
                      <th key={key} data-col={key} data-testid={`transit-col-${key}`}>
                        {label}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {majors.map((a) => (
                  <TransitAspectRow
                    key={a.id}
                    link={a}
                    pending={Boolean(sky.meta.provisional)}
                    moving={byId.get(a.a)}
                    natal={natalOf(chart, a.b)}
                    selected={selectedId === `taspect:${a.id}`}
                    locale={locale}
                    onSelect={() => onSelect(`taspect:${a.id}`)}
                    previewId={`taspect:${a.id}`}
                  />
                ))}
              </tbody>
            </DataTable>
        ) : (
          <p data-testid="transit-table-empty" className="text-sm text-fg-muted">
            {transitTableEmpty(locale)}
          </p>
        )}
      </div>
    </section>
  );
}

function TransitAspectRow({
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
  /** The sky is provisional (time moving): the exact time comes with the exact cast. */
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
  const aspectLabel = `${aspectName(link.type, locale)} ${formatOrb(shownOrb, locale)}°`;
  return (
    <tr
      {...previewProps(previewId)}
      data-testid={transitRowTestId(link)}
      data-transit={link.a}
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
          <span title={transitApplyingTitle(locale)} aria-label={transitApplyingTitle(locale)}>
            A
          </span>
        ) : (
          <span className="text-fg-subtle">—</span>
        )}
      </td>
      <td data-col="s" className="ulune-as-cell">
        {separating ? (
          <span title={transitSeparatingTitle(locale)} aria-label={transitSeparatingTitle(locale)}>
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
