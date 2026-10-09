import { useMemo } from "react";
import { AnimalGlyph } from "@/components/animal-glyph";
import { SIXTY } from "@/lib/chinese/names";
import { chineseLabel } from "@/lib/chinese/prefs";
import { useChinesePrefs } from "@/lib/chinese/use-chinese-prefs";
import { cnWord } from "@/lib/chinese/words";
import { PLACE_WORD } from "@/lib/chinese/zodiac-reading";
import { ZODIAC_PLACES } from "@/lib/chinese/zodiac";
import type { YearAhead } from "@/lib/chinese/zodiac-time";
import { meetLine, monthRef } from "@/lib/chinese/zodiac-time-reading";
import { yearsTableCsv, yearsTextLines } from "@/lib/chinese/zodiac-time-table";
import { useI18n } from "@/lib/i18n/locale";
import { DataTable } from "@/studio/tables/DataTable";
import { TableActions, TablePage, type TablePart } from "@/studio/tables/TablePage";

/**
 * Chinese astrology's Cycles as a table (languages plan, part 11): the
 * year's twelve solar months, their dates, pillars and animals, and how
 * each of the reader's animals meets each one; Copy and CSV.
 */
export function ZodiacYearsTable({
  y,
  name = "",
  tz,
  selectedId,
  onSelect,
}: {
  y: YearAhead;
  name?: string;
  tz?: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { locale, t } = useI18n();
  const prefs = useChinesePrefs();
  const w = (key: Parameters<typeof cnWord>[1], vars?: Record<string, string | number>) => cnWord(locale, key, vars);
  const day = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", { timeZone: tz || "UTC", day: "numeric", month: "short", year: "numeric" });
    return (ms: number) => fmt.format(new Date(ms));
  }, [locale, tz]);
  const places = ZODIAC_PLACES.filter((id) => y.yours.some((m) => m.place === id));
  const text = () => yearsTextLines(y, locale, prefs, name, day).join("\n");
  const parts: TablePart[] = [
    {
      id: "months",
      label: w("zkMonthsHead", { year: y.year }),
      hint: w("zkPartMonthsHint"),
      copyText: text,
      children: (
        <DataTable className="ulune-zk-tbl" wide>
          <thead>
            <tr>
              <th data-col="month">{w("zkMonth")}</th>
              <th>{w("zkPillar")}</th>
              {places.map((id) => (
                <th key={id}>{w(PLACE_WORD[id])}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {y.months.map((m) => {
              const id = monthRef(m.index);
              return (
                <tr key={id} data-testid={`zodiac-years-row-${m.index}`} data-selected={selectedId === id ? "1" : undefined}>
                  <th scope="row">
                    <button type="button" className="ulune-zk-table-pick" onClick={() => onSelect(id)}>
                      {day(m.fromMs)} – {day(m.toMs)}
                    </button>
                  </th>
                  <td>
                    <span className="ulune-zk-table-animal">
                      {prefs.animals === "drawings" ? <AnimalGlyph animal={m.pillar.branch} size={16} /> : null}
                      {chineseLabel(SIXTY[m.pillar.cycle]!, locale, prefs).text}
                    </span>
                  </td>
                  {places.map((p) => {
                    const meet = m.yours.find((x) => x.place === p)!;
                    return (
                      <td key={p} data-testid={`zodiac-years-cell-${m.index}-${p}`}>
                        {meet.kinds.length ? meetLine(meet.kinds, locale, prefs, true) : "·"}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      ),
    },
  ];
  const file = `${name || "chinese astrology"} ${y.year}`;
  return (
    <div data-testid="zodiac-years-table" data-chart-pick data-selected={selectedId ?? ""} className="min-w-0">
      <TablePage name="zodiac-years" label={t("tableSections")} parts={parts} fileStem={file} actions={<TableActions text={text} csv={() => yearsTableCsv(y)} fileName={file} />} />
    </div>
  );
}
