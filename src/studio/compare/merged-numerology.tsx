import type { NumerologyChart } from "@/lib/chart/numerology";
import { wholeText, type NumerologyValue } from "@/lib/chart/numerology-reduce";
import { previewProps } from "@/lib/depth/preview-bus";
import { useI18n } from "@/lib/i18n/locale";
import type { AppLocale } from "@/lib/i18n/messages";
import { numerologyPageText as p } from "@/lib/i18n/numerology-ui";
import { cn } from "@/lib/utils";
import { TABLE_CORES, tableCoreLabel, tableCoreValue, valueNote, type TableCoreId } from "@/studio/compare/shared-numerology";
import { TableFrame, type MergedPick } from "@/studio/compare/merged";

/*
 * Compare's one numerology table for two people (merged.tsx): the page's core
 * numbers (its table's first part, studio/tables/numerology-table.tsx), an A
 * column and a B column; a row chooses that number in both charts.
 */

/** "13/4" with "karmic debt 13" under it (as numerology-table.tsx's ValueCell). */
function ValueCell({ value, locale }: { value: NumerologyValue; locale: AppLocale }) {
  if (value.number == null) return <span className="ulune-num-none">—</span>;
  const note = valueNote(locale, value);
  return (
    <>
      <span className="font-mono tabular-nums">{wholeText(value)}</span>
      {note ? <span className="ulune-cell-sub">{note}</span> : null}
    </>
  );
}

export function NumerologyCoresMerged({ a, b, nameA, nameB, selectedId, onSelect }: { a: NumerologyChart; b: NumerologyChart; nameA: string; nameB: string } & MergedPick) {
  const { locale } = useI18n();
  const refOf = (id: TableCoreId) => (id === "attitude" || id === "rationalThought" ? `detail:${id}` : `core:${id}`);
  return (
    <TableFrame className="ulune-num-core ulune-num-merged" stickyFirst={false}>
      <thead>
        <tr>
          <th data-col="number">{p(locale, "col_number")}</th>
          <th data-col="a">{`A · ${nameA}`}</th>
          <th data-col="b">{`B · ${nameB}`}</th>
        </tr>
      </thead>
      <tbody>
        {TABLE_CORES.map((id) => {
          const ref = refOf(id);
          const live = tableCoreValue(a, id).number != null || tableCoreValue(b, id).number != null;
          const on = selectedId === ref;
          return (
            <tr
              key={id}
              data-testid={`num-merged-${id}`}
              data-selected={on ? "1" : undefined}
              className={cn(live && "cursor-pointer", on && "bg-bg-subtle")}
              onClick={live ? () => onSelect(ref) : undefined}
              {...(live ? previewProps(ref) : {})}
            >
              <td data-col="number">
                {live ? (
                  <button type="button" className="ulune-row-pick" aria-pressed={on}>
                    {tableCoreLabel(locale, id)}
                  </button>
                ) : (
                  tableCoreLabel(locale, id)
                )}
              </td>
              <td data-col="a">
                <ValueCell value={tableCoreValue(a, id)} locale={locale} />
              </td>
              <td data-col="b">
                <ValueCell value={tableCoreValue(b, id)} locale={locale} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </TableFrame>
  );
}
