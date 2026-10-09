import { SIXTY } from "@/lib/chinese/names";
import { chineseLabel } from "@/lib/chinese/prefs";
import { useChinesePrefs } from "@/lib/chinese/use-chinese-prefs";
import { cnWord } from "@/lib/chinese/words";
import { TEN_GODS, type BaziChart } from "@/lib/chinese/bazi";
import { PILLAR_WORD, godRef, stemRef } from "@/lib/chinese/bazi-reading";
import { baziTableCsv, baziTextParts, hiddenGodsLine, stemGodName } from "@/lib/chinese/bazi-table";
import { partRows } from "@/lib/csv";
import { useI18n } from "@/lib/i18n/locale";
import { DataTable } from "@/studio/tables/DataTable";
import { TableActions, TablePage, type TablePart } from "@/studio/tables/TablePage";

/**
 * BaZi's table (languages plan, part 12; the full one with every layer is
 * part 17): the four pillars with their gods and hidden stems, and the Ten
 * Gods by how often they stand in the chart; Copy and CSV.
 */
export function BaziTable({ c, name = "", selectedId, onSelect }: { c: BaziChart; name?: string; selectedId: string | null; onSelect: (id: string) => void }) {
  const { locale, t } = useI18n();
  const prefs = useChinesePrefs();
  const w = (key: Parameters<typeof cnWord>[1]) => cnWord(locale, key);
  const text = () => baziTextParts(c, locale, prefs, name);
  const partText = (id: string) => () => text().find((p) => p.id === id)?.lines.join("\n") ?? "";
  const csvOf = (kinds: string[]) => () => partRows(baziTableCsv(c), kinds);
  const parts: TablePart[] = [
    {
      id: "pillars",
      label: w("bzPartPillars"),
      hint: w("bzPartPillarsHint"),
      copyText: partText("pillars"),
      table: csvOf(["pillar"]),
      children: (
        <DataTable className="ulune-zk-tbl" wide>
          <thead>
            <tr>
              <th data-col="place">{w("zkPlace")}</th>
              <th>{w("zkPillar")}</th>
              <th>{w("bzGod")}</th>
              <th>{w("zkHidden")}</th>
            </tr>
          </thead>
          <tbody>
            {c.pillars.map((p) => {
              const id = stemRef(p.id);
              return (
                <tr key={p.id} data-testid={`bazi-row-${p.id}`} data-selected={selectedId === id ? "1" : undefined}>
                  <th scope="row">
                    <button type="button" className="ulune-zk-table-pick" onClick={() => onSelect(id)}>
                      {w(PILLAR_WORD[p.id])}
                      {p.uncertain ? " ~" : ""}
                    </button>
                  </th>
                  <td>{chineseLabel(SIXTY[p.pillar.cycle]!, locale, prefs).text}</td>
                  <td>{stemGodName(p, locale, prefs)}</td>
                  <td data-testid={`bazi-hidden-cell-${p.id}`}>{hiddenGodsLine(p, locale, prefs)}</td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      ),
    },
    {
      id: "gods",
      label: w("bzPartGods"),
      hint: w("bzPartGodsHint"),
      copyText: partText("gods"),
      table: csvOf(["god"]),
      children: (
        <DataTable className="ulune-zk-tbl">
          <thead>
            <tr>
              <th data-col="god">{w("bzGod")}</th>
              <th>{w("bzShownCol")}</th>
              <th>{w("bzHiddenCol")}</th>
            </tr>
          </thead>
          <tbody>
            {TEN_GODS.map((g) => {
              const id = godRef(g.id);
              return (
                <tr key={g.id} data-testid={`bazi-godrow-${g.id}`} data-selected={selectedId === id ? "1" : undefined}>
                  <th scope="row">
                    <button type="button" className="ulune-zk-table-pick" onClick={() => onSelect(id)}>
                      {chineseLabel(g, locale, prefs).text}
                    </button>
                  </th>
                  <td>{c.gods[g.id].shown}</td>
                  <td>{c.gods[g.id].hidden}</td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      ),
    },
  ];
  const file = `${name || "bazi"} bazi`;
  return (
    <div data-testid="bazi-table" data-chart-pick data-selected={selectedId ?? ""} className="min-w-0">
      <TablePage name="bazi" label={t("tableSections")} parts={parts} fileStem={file} actions={<TableActions text={() => text().map((p) => p.lines.join("\n")).join("\n\n")} csv={() => baziTableCsv(c)} fileName={file} />} />
    </div>
  );
}
