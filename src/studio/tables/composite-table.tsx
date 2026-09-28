import { useMemo } from "react";
import { DataTable } from "@/studio/tables/DataTable";
import { AspectGlyph, PlanetGlyph } from "@/components/glyphs";
import { compositeBodyOf, compositeRowTestId } from "@/lib/chart/composite";
import type { AspectLink, NatalChart, Placement } from "@/lib/chart/types";
import { aspectName, bodyTableLabel } from "@/lib/i18n/astro";
import { useI18n } from "@/lib/i18n/locale";
import {
  COMPOSITE_TABLE_COLUMN_KEYS,
  compositeTableColumns,
  compositeTableEmpty,
  compositeTableHint,
  compositeTableTitle,
} from "@/lib/i18n/composite-ui";
import { previewProps } from "@/lib/depth/preview-bus";
import { formatArc } from "@/lib/utils";

export function CompositeTable({
  chart,
  majors,
  selectedId,
  onSelect,
}: {
  chart: NatalChart;
  majors: AspectLink[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { locale } = useI18n();
  const columns = compositeTableColumns(locale);
  const rows = useMemo(() => majors, [majors]);

  return (
    <section data-testid="composite-table" className="ulune-panel min-w-0 overflow-hidden">
      <header className="flex flex-col gap-[var(--space-3)] border-b border-border px-[var(--space-4)] py-[var(--space-3)] md:px-[var(--space-5)]">
        <div className="min-w-0">
          <h2 className="font-display text-2xl leading-none text-fg">{compositeTableTitle(locale)}</h2>
          <p className="mt-[var(--space-2)] max-w-[61.8ch] text-sm text-fg-muted">{compositeTableHint(locale)}</p>
        </div>
      </header>
      <div className="min-w-0 px-[var(--space-4)] py-[var(--space-4)] md:px-[var(--space-5)]">
        {rows.length ? (
          <DataTable wide exportName="ulune-composite">
              <thead>
                <tr data-testid="composite-table-cols">
                  {columns.map((label, i) => {
                    const key = COMPOSITE_TABLE_COLUMN_KEYS[i] ?? label.toLowerCase();
                    return (
                      <th key={`${key}-${i}`} data-col={key} data-testid={`composite-col-${key}`}>
                        {label}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map((link) => (
                  <CompositeAspectRow
                    key={link.id}
                    link={link}
                    aBody={compositeBodyOf(chart, link.a)}
                    bBody={compositeBodyOf(chart, link.b)}
                    selected={selectedId === `aspect:${link.id}`}
                    locale={locale}
                    onSelect={() => onSelect(`aspect:${link.id}`)}
                    previewId={`aspect:${link.id}`}
                  />
                ))}
              </tbody>
            </DataTable>
        ) : (
          <p data-testid="composite-table-empty" className="text-sm text-fg-muted">
            {compositeTableEmpty(locale)}
          </p>
        )}
      </div>
    </section>
  );
}

function CompositeAspectRow({
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
  const orb = formatArc(link.orb);
  return (
    <tr
      {...previewProps(previewId)}
      data-testid={compositeRowTestId(link)}
      data-a={link.a}
      data-aspect={link.type}
      data-b={link.b}
      data-orb={String(link.orb)}
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
        <button
          type="button"
          onClick={onSelect}
          className="inline-flex h-11 min-w-0 items-center gap-2 text-left"
        >
          <span className="grid size-5 place-items-center text-fg">
            <PlanetGlyph id={link.b} size={14} />
          </span>
          <span className="min-w-0">
            <span className="block">{bodyTableLabel(link.b, locale)}</span>
            {bBody ? (
              <span className="block font-sans text-xs font-normal normal-case tracking-normal text-fg-subtle">
                {bBody.formatted}
              </span>
            ) : null}
          </span>
        </button>
      </td>
      <td data-col="orb" className="font-mono whitespace-nowrap">
        {orb}
      </td>
    </tr>
  );
}
