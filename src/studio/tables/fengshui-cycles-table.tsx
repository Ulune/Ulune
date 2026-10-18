import { ChineseTermWord } from "@/encyclopedia/ChineseTermWord";
import { TrigramGlyph } from "@/components/trigram-mark";
import { chineseLabel } from "@/lib/chinese/prefs";
import { useChinesePrefs } from "@/lib/chinese/use-chinese-prefs";
import { cnWord } from "@/lib/chinese/words";
import { fscWord, type FscWordKey } from "@/lib/chinese/fsc-words";
import { MANSIONS, directionById, trigramOfDirection } from "@/lib/chinese/fengshui";
import { countLabel } from "@/lib/chinese/fengshui-reading";
import { afflictionName, afflictionPlace, yearLine } from "@/lib/chinese/fengshui-years-reading";
import { CYCLE_AFFLICTIONS, personDirection } from "@/lib/chinese/fengshui-cycles";
import { FSC_MONTH_REF, FSC_YEAR_REF, fscAffRef, fscDirRef, fscYouRef, low, monthFiveLine, monthLine, practiceLines, starName, stateWord, type CyclesContext } from "@/lib/chinese/fengshui-cycles-reading";
import { cyclesTableCsv, cyclesTextParts } from "@/lib/chinese/fengshui-cycles-table";
import { partRows } from "@/lib/csv";
import { useI18n } from "@/lib/i18n/locale";
import { DataTable } from "@/studio/tables/DataTable";
import { TableActions, TablePage, type TablePart } from "@/studio/tables/TablePage";

/**
 * Feng Shui's Cycles as a table (share and compare plan, feature 5d): the year and the month on the
 * dial with the year's afflictions, the eight directions under them with your mansion and what the
 * year makes of it, and the year in practice; Copy and CSV. Each row opens its reading.
 */
export function FengShuiCyclesTable({ ctx, name, selectedId, onSelect }: { ctx: CyclesContext; name: string; selectedId: string | null; onSelect: (id: string) => void }) {
  const { locale, t } = useI18n();
  const prefs = useChinesePrefs();
  const w = (key: Parameters<typeof cnWord>[1]) => cnWord(locale, key);
  const v = (key: FscWordKey) => fscWord(locale, key);
  const both = ctx.people.length > 1;
  const { y } = ctx;
  const text = () => cyclesTextParts(ctx, name, locale, prefs);
  const partText = (id: string) => () => text().find((x) => x.id === id)?.lines.join("\n") ?? "";
  const csvOf = (kinds: string[]) => () => partRows(cyclesTableCsv(ctx), kinds);
  const pick = (id: string, label: string) => (
    <button type="button" className="ulune-zk-table-pick" onClick={() => onSelect(id)}>
      {label}
    </button>
  );
  const parts: TablePart[] = [
    {
      id: "year",
      label: v("fscPartYear"),
      hint: w("fsyPartHint"),
      copyText: partText("year"),
      table: csvOf(["year", "aff"]),
      children: (
        <DataTable className="ulune-zk-tbl ulune-fs-prose">
          <tbody>
            <tr data-testid="fengshui-cycles-row-year" data-selected={selectedId === FSC_YEAR_REF ? "1" : undefined}>
              <th scope="row">{pick(FSC_YEAR_REF, w("fsyYearStar"))}</th>
              <td>{yearLine(y, locale)}</td>
            </tr>
            <tr data-testid="fengshui-cycles-row-month" data-selected={selectedId === FSC_MONTH_REF ? "1" : undefined}>
              <th scope="row">{pick(FSC_MONTH_REF, w("fsyMonthStar"))}</th>
              <td>{`${monthLine(y, locale)} ${monthFiveLine(y, locale)}`}</td>
            </tr>
            {CYCLE_AFFLICTIONS.map((id) => (
              <tr key={id} data-testid={`fengshui-cycles-row-aff-${id}`} data-selected={selectedId === fscAffRef(id) ? "1" : undefined}>
                <th scope="row">{pick(fscAffRef(id), afflictionName(id, locale, prefs))}</th>
                <td>{afflictionPlace(y, id, locale, prefs)}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      ),
    },
    {
      id: "dirs",
      label: w("fsPartDirs"),
      hint: v("fscPartDirsHint"),
      copyText: partText("dirs"),
      table: csvOf(["dir", "you"]),
      children: (
        <DataTable className="ulune-zk-tbl" wide>
          <thead>
            <tr>
              <th>{w("fsDirection")}</th>
              <th>{w("fsTrigram")}</th>
              <th>{w("fsyYearStar")}</th>
              <th>{w("fsyMonthStar")}</th>
              <th>{v("fscQuietCol")}</th>
              {ctx.people.map((p) => (
                <th key={p.fs.count}>{both ? `${v("fscStateCol")} · ${countLabel(p.fs.count, locale)}` : v("fscStateCol")}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ctx.dirs.map((x) => {
              const d = x.direction;
              const tri = trigramOfDirection(d);
              const marks = [...x.afflictions.map((id) => low(afflictionName(id, locale, prefs))), ...(x.monthFive ? [v("fscMonthFiveMark")] : [])];
              const refs = ctx.people.length ? ctx.people.map((p) => fscDirRef(p.fs.count, d)) : [fscDirRef(null, d)];
              return (
                <tr key={d} data-testid={`fengshui-cycles-row-dir-${d}`} data-selected={refs.includes(selectedId ?? "") ? "1" : undefined}>
                  <th scope="row">{pick(refs[0]!, chineseLabel(directionById(d), locale, prefs).text)}</th>
                  <td>
                    <TrigramGlyph symbol={tri.symbol} />{" "}
                    <ChineseTermWord family="trigram" id={tri.id}>
                      {chineseLabel(tri, locale, { ...prefs, show: "names" }).name}
                    </ChineseTermWord>
                  </td>
                  <td>{starName(x.year, locale)}</td>
                  <td>{starName(x.month, locale)}</td>
                  <td>{marks.length ? marks.join(", ") : "—"}</td>
                  {ctx.people.map((p) => {
                    const own = personDirection(p, d);
                    return (
                      <td key={p.fs.count} data-state={own.state} data-supportive={own.supportive ? "1" : "0"}>
                        {pick(fscDirRef(p.fs.count, d), chineseLabel(MANSIONS[own.mansion], locale, prefs).text)}{" "}
                        <span className="ulune-fs-tbl-kind">({stateWord(own.state, locale)})</span>
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
  if (ctx.people.length) {
    parts.push({
      id: "you",
      label: v("fscPartYou"),
      hint: v("fscPartYouHint"),
      copyText: partText("you"),
      table: csvOf(["best"]),
      children: (
        <DataTable className="ulune-zk-tbl ulune-fs-prose">
          <tbody>
            {ctx.people.flatMap((p) =>
              practiceLines(p, locale).map((line, i) => (
                <tr key={`${p.fs.count}-${i}`} data-testid={`fengshui-cycles-row-you-${p.fs.count}-${i}`} data-selected={selectedId === fscYouRef(p.fs.count) ? "1" : undefined}>
                  <th scope="row">{pick(fscYouRef(p.fs.count), `${v("fscPracticeTitle")}${both ? ` · ${countLabel(p.fs.count, locale)}` : ""}`)}</th>
                  <td>{line}</td>
                </tr>
              )),
            )}
          </tbody>
        </DataTable>
      ),
    });
  }
  const file = `${name || "ulune"} feng shui ${y.solarYear}`;
  return (
    <div data-testid="fengshui-cycles-table" data-chart-pick data-selected={selectedId ?? ""} className="min-w-0">
      <TablePage name="fengshui-cycles" label={t("tableSections")} parts={parts} fileStem={file} actions={<TableActions text={() => text().map((x) => x.lines.join("\n")).join("\n\n")} csv={() => cyclesTableCsv(ctx)} fileName={file} />} />
    </div>
  );
}
