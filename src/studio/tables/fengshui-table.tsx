import { chineseLabel } from "@/lib/chinese/prefs";
import { useChinesePrefs } from "@/lib/chinese/use-chinese-prefs";
import { cnWord } from "@/lib/chinese/words";
import { DIRECTION_IDS, MANSIONS, directionById, trigramOfDirection, type FengShui } from "@/lib/chinese/fengshui";
import { countLabel, fsDirRef, fsKuaRef, fsPracticeRef, groupLabel, kuaSteps, practiceLines } from "@/lib/chinese/fengshui-reading";
import { fengShuiTableCsv, fengShuiTextParts } from "@/lib/chinese/fengshui-table";
import { partRows } from "@/lib/csv";
import { useI18n } from "@/lib/i18n/locale";
import { DataTable } from "@/studio/tables/DataTable";
import { TableActions, TablePage, type TablePart } from "@/studio/tables/TablePage";

/** Feng Shui's personal page as a table (languages plan, part 21); Copy and CSV. */
export function FengShuiTable({ list, name, selectedId, onSelect }: { list: readonly FengShui[]; name: string; selectedId: string | null; onSelect: (id: string) => void }) {
  const { locale, t } = useI18n();
  const prefs = useChinesePrefs();
  const w = (key: Parameters<typeof cnWord>[1]) => cnWord(locale, key);
  const both = list.length > 1;
  const text = () => fengShuiTextParts(list, name, locale, prefs);
  const partText = (id: string) => () => text().find((x) => x.id === id)?.lines.join("\n") ?? "";
  const csvOf = (kinds: string[]) => () => partRows(fengShuiTableCsv(list), kinds);
  const pick = (id: string, label: string) => (
    <button type="button" className="ulune-zk-table-pick" onClick={() => onSelect(id)}>
      {label}
    </button>
  );
  const parts: TablePart[] = [
    {
      id: "kua",
      label: w("fsKuaHead"),
      hint: w("fsPartKuaHint"),
      copyText: partText("kua"),
      table: csvOf(["kua"]),
      children: (
        <DataTable className="ulune-zk-tbl" wide>
          <thead>
            <tr>
              {both ? <th>{w("bzlCountCol")}</th> : null}
              <th>{w("fsKuaHead")}</th>
              <th>{w("fsTrigram")}</th>
              <th>{w("fsGroup")}</th>
              <th>{w("fsHowHead")}</th>
            </tr>
          </thead>
          <tbody>
            {list.map((fs) => {
              const id = fsKuaRef(fs.count);
              return (
                <tr key={fs.count} data-testid={`fengshui-row-kua-${fs.count}`} data-selected={selectedId === id ? "1" : undefined}>
                  {both ? <td>{countLabel(fs.count, locale)}</td> : null}
                  <th scope="row">{pick(id, cnWord(locale, "fsKuaN", { n: fs.kua }))}</th>
                  <td>
                    {fs.trigram.symbol} {chineseLabel(fs.trigram, locale, prefs).text}
                  </td>
                  <td>{groupLabel(fs, locale)}</td>
                  <td>{kuaSteps(fs, locale).join(" ")}</td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      ),
    },
    {
      id: "dirs",
      label: w("fsPartDirs"),
      hint: w("fsPartDirsHint"),
      copyText: partText("dirs"),
      table: csvOf(["dir"]),
      children: (
        <DataTable className="ulune-zk-tbl" wide>
          <thead>
            <tr>
              <th>{w("fsDirection")}</th>
              <th>{w("fsTrigram")}</th>
              {list.map((fs) => (
                <th key={fs.count}>{both ? `${w("fsMansion")} · ${countLabel(fs.count, locale)}` : w("fsMansion")}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DIRECTION_IDS.map((d) => {
              const tri = trigramOfDirection(d);
              return (
                <tr key={d} data-testid={`fengshui-row-dir-${d}`} data-selected={list.some((fs) => selectedId === fsDirRef(fs.count, d)) ? "1" : undefined}>
                  <th scope="row">{chineseLabel(directionById(d), locale, prefs).text}</th>
                  <td>
                    {tri.symbol} {chineseLabel(tri, locale, { ...prefs, show: "names" }).name}
                  </td>
                  {list.map((fs) => {
                    const row = fs.directions.find((x) => x.direction === d)!;
                    return (
                      <td key={fs.count} data-supportive={row.supportive ? "1" : "0"}>
                        {pick(fsDirRef(fs.count, d), chineseLabel(MANSIONS[row.mansion], locale, prefs).text)}{" "}
                        <span className="ulune-fs-tbl-kind">({cnWord(locale, row.supportive ? "fsSupportive" : "fsChallenging").toLowerCase()})</span>
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
    {
      id: "practice",
      label: w("fsPracticeHead"),
      hint: w("fsPartPracticeHint"),
      copyText: partText("practice"),
      children: (
        <DataTable className="ulune-zk-tbl">
          <tbody>
            {list.flatMap((fs) =>
              practiceLines(fs, locale).map((l) => (
                <tr key={`${fs.count}-${l.id}`} data-testid={`fengshui-row-practice-${fs.count}-${l.id}`} data-selected={selectedId === fsPracticeRef(fs.count) ? "1" : undefined}>
                  <th scope="row">{pick(fsPracticeRef(fs.count), `${cnWord(locale, l.id === "desk" ? "fsDeskHead" : l.id === "bed" ? "fsBedHead" : l.id === "door" ? "fsDoorHead" : "fsAvoidHead")}${both ? ` · ${countLabel(fs.count, locale)}` : ""}`)}</th>
                  <td>{l.text}</td>
                </tr>
              )),
            )}
          </tbody>
        </DataTable>
      ),
    },
  ];
  const file = `${name || "ulune"} feng shui`;
  return (
    <div data-testid="fengshui-table" data-chart-pick data-selected={selectedId ?? ""} className="min-w-0">
      <TablePage name="fengshui" label={t("tableSections")} parts={parts} fileStem={file} actions={<TableActions text={() => text().map((x) => x.lines.join("\n")).join("\n\n")} csv={() => fengShuiTableCsv(list)} fileName={file} />} />
    </div>
  );
}
