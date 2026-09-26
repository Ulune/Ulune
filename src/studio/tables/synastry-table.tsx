import { useMemo } from "react";
import { DataTable } from "@/studio/tables/DataTable";
import { AspectGlyph, PlanetGlyph } from "@/components/glyphs";
import { synastryRowTestId } from "@/lib/chart/synastry";
import type { AngleId, AspectLink, NatalChart, Placement } from "@/lib/chart/types";
import { aspectName, bodyTableLabel, formatOrb } from "@/lib/i18n/astro";
import { useI18n } from "@/lib/i18n/locale";
import {
  SYNASTRY_TABLE_COLUMN_KEYS,
  synastryApplyingTitle,
  synastrySeparatingTitle,
  synastryTableColumns,
  synastryTableEmpty,
  synastryTableHint,
  synastryTableTitle,
} from "@/lib/i18n/synastry-ui";
import { chartDisplayName } from "@/lib/chart/library";
import { previewProps } from "@/lib/depth/preview-bus";

function bodyOf(chart: NatalChart, id: AspectLink["a"]): Placement | undefined {
  if (id in chart.angles) return chart.angles[id as AngleId];
  return chart.planets.find((p) => p.id === id);
}

export function SynastryTable({
  a,
  b,
  majors,
  selectedId,
  onSelect,
}: {
  a: NatalChart;
  b: NatalChart;
  majors: AspectLink[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { locale, t } = useI18n();
  const aName = chartDisplayName({ name: a.meta.name, date: a.meta.date, time: a.meta.time, latitude: a.meta.latitude, longitude: a.meta.longitude, placeLabel: a.meta.placeLabel }, t("untitled"));
  const bName = chartDisplayName({ name: b.meta.name, date: b.meta.date, time: b.meta.time, latitude: b.meta.latitude, longitude: b.meta.longitude, placeLabel: b.meta.placeLabel }, t("untitled"));
  const columns = synastryTableColumns(locale, aName, bName);
  const rows = useMemo(() => majors, [majors]);

  return (
    <section data-testid="synastry-table" className="ulune-panel min-w-0 overflow-hidden">
      <header className="flex flex-col gap-[var(--space-3)] border-b border-border px-[var(--space-4)] py-[var(--space-3)] md:px-[var(--space-5)]">
        <div className="min-w-0">
          <h2 className="font-display text-2xl leading-none text-fg">{synastryTableTitle(locale)}</h2>
          <p className="mt-[var(--space-2)] max-w-[61.8ch] text-sm text-fg-muted">{synastryTableHint(locale)}</p>
        </div>
      </header>
      <div className="min-w-0 px-[var(--space-4)] py-[var(--space-4)] md:px-[var(--space-5)]">
        {rows.length ? (
          <DataTable wide exportName="ulune-synastry">
              <thead>
                <tr data-testid="synastry-table-cols">
                  {columns.map((label, i) => {
                    const key = SYNASTRY_TABLE_COLUMN_KEYS[i] ?? label.toLowerCase();
                    return (
                      <th key={`${key}-${i}`} data-col={key} data-testid={`synastry-col-${key}`}>
                        {label}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map((link) => (
                  <SynastryAspectRow
                    key={link.id}
                    link={link}
                    aBody={bodyOf(a, link.a)}
                    bBody={bodyOf(b, link.b)}
                    selected={selectedId === `saspect:${link.id}`}
                    locale={locale}
                    onSelect={() => onSelect(`saspect:${link.id}`)}
                    previewId={`saspect:${link.id}`}
                  />
                ))}
              </tbody>
            </DataTable>
        ) : (
          <p data-testid="synastry-table-empty" className="text-sm text-fg-muted">
            {synastryTableEmpty(locale)}
          </p>
        )}
      </div>
    </section>
  );
}

function SynastryAspectRow({
  link,
  aBody,
  bBody,
  selected,
  locale,
  onSelect,
  previewId,
}: {
  link: AspectLink;
  aBody: Placement | undefined;
  bBody: Placement | undefined;
  selected: boolean;
  locale: "en" | "fr";
  onSelect: () => void;
  previewId?: string;
}) {
  const applying = link.applying === true;
  const separating = link.applying === false;
  const orb = formatOrb(link.orb, locale);
  return (
    <tr
      {...previewProps(previewId)}
      data-testid={synastryRowTestId(link)}
      data-a={link.a}
      data-aspect={link.type}
      data-b={link.b}
      data-orb={String(link.orb)}
      data-applying={link.applying === true ? "1" : link.applying === false ? "0" : ""}
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
            {aBody ? (
              <span className="block font-sans text-xs font-normal normal-case tracking-normal text-fg-subtle">
                {aBody.formatted}
              </span>
            ) : null}
          </span>
        </button>
      </td>
      <td data-col="aspect">
        <span className="inline-flex items-center gap-1.5">
          <AspectGlyph id={link.type} size={12} />
          {aspectName(link.type, locale)}
        </span>
      </td>
      <td data-col="b">
        <span className="inline-flex items-center gap-2">
          <span className="grid size-5 place-items-center text-fg">
            <PlanetGlyph id={link.b} size={14} />
          </span>
          {bodyTableLabel(link.b, locale)}
        </span>
      </td>
      <td data-col="orb" className="font-mono whitespace-nowrap">
        {orb}°
      </td>
      <td data-col="as-a" className="ulune-as-cell">
        {applying ? (
          <span title={synastryApplyingTitle(locale)} aria-label={synastryApplyingTitle(locale)}>
            A
          </span>
        ) : (
          <span className="text-fg-subtle">—</span>
        )}
      </td>
      <td data-col="as-s" className="ulune-as-cell">
        {separating ? (
          <span title={synastrySeparatingTitle(locale)} aria-label={synastrySeparatingTitle(locale)}>
            S
          </span>
        ) : (
          <span className="text-fg-subtle">—</span>
        )}
      </td>
    </tr>
  );
}
