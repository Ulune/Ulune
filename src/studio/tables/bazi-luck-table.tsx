import { ChineseTermPieces, ChineseTermWord } from "@/encyclopedia/ChineseTermWord";
import { SIXTY } from "@/lib/chinese/names";
import { chineseLabel } from "@/lib/chinese/prefs";
import { useChinesePrefs } from "@/lib/chinese/use-chinese-prefs";
import { cnWord } from "@/lib/chinese/words";
import { tenGodById } from "@/lib/chinese/bazi";
import type { FlowYear, Luck } from "@/lib/chinese/bazi-luck";
import { FLOW_YEAR_REF, countWord, dateIn, flowMonthRef, luckRef, meetingShort } from "@/lib/chinese/bazi-luck-reading";
import { luckTableCsv, luckTextParts } from "@/lib/chinese/bazi-luck-table";
import { meetPieces } from "@/lib/chinese/bazi-term-pieces";
import { semicolon } from "@/lib/chinese/both";
import { partRows } from "@/lib/csv";
import { useI18n } from "@/lib/i18n/locale";
import { DataTable } from "@/studio/tables/DataTable";
import { TableActions, TablePage, type TablePart } from "@/studio/tables/TablePage";

/**
 * BaZi's Cycles as a table (languages plan, part 16): the luck pillars for
 * each count given, and the year shown with its months; Copy and CSV. Each
 * term links to its encyclopedia entry once the entry is written (part 29).
 */
export function BaziLuckTable({ lucks, year, name = "", tz, selectedId, onSelect }: { lucks: Luck[]; year: FlowYear; name?: string; tz?: string; selectedId: string | null; onSelect: (id: string) => void }) {
  const { locale, t } = useI18n();
  const prefs = useChinesePrefs();
  const w = (key: Parameters<typeof cnWord>[1]) => cnWord(locale, key);
  const text = () => luckTextParts(lucks, year, locale, prefs, name, tz);
  const partText = (id: string) => () => text().find((p) => p.id === id)?.lines.join("\n") ?? "";
  const csvOf = (kinds: string[]) => () => partRows(luckTableCsv(lucks, year), kinds);
  const god = (id: Parameters<typeof tenGodById>[0]) => (
    <ChineseTermWord family="ten-god" id={id}>
      {chineseLabel(tenGodById(id), locale, prefs).name}
    </ChineseTermWord>
  );
  const meets = (list: Luck["pillars"][number]["meets"]) => (
    <ChineseTermPieces text={list.length ? list.map((m) => meetingShort(m, locale, prefs)).join(semicolon(locale)) : "–"} pieces={() => meetPieces(list, locale, prefs, "pillar")} />
  );
  const pillar = (cycle: number) => (
    <ChineseTermWord family="pillar" id={SIXTY[cycle]!.id}>
      {chineseLabel(SIXTY[cycle]!, locale, prefs).text}
    </ChineseTermWord>
  );
  const pick = (id: string, label: string) => (
    <button type="button" className="ulune-zk-table-pick" onClick={() => onSelect(id)}>
      {label}
    </button>
  );
  const both = lucks.length > 1;
  const parts: TablePart[] = [
    {
      id: "luck",
      label: w("bzlPartLuck"),
      hint: w("bzlPartLuckHint"),
      copyText: partText("luck"),
      table: csvOf(["luckStart", "luck"]),
      children: (
        <DataTable className="ulune-zk-tbl" wide>
          <thead>
            <tr>
              {both ? <th>{w("bzlCountCol")}</th> : null}
              <th data-col="ages">{w("bzlAgesCol")}</th>
              <th>{w("bzlFromCol")}</th>
              <th>{w("zkPillar")}</th>
              <th>{w("bzGod")}</th>
              <th>{w("bzlBranchGodCol")}</th>
              <th>{w("bzlMeetsCol")}</th>
            </tr>
          </thead>
          <tbody>
            {lucks.flatMap((l) =>
              l.pillars.map((p) => {
                const id = luckRef(l.count, p.index);
                return (
                  <tr key={id} data-testid={`bazi-luck-row-${l.count}-${p.index}`} data-selected={selectedId === id ? "1" : undefined}>
                    {both ? <td>{countWord(l.count, locale)}</td> : null}
                    <th scope="row">{pick(id, w("bzlAges").replace("{from}", String(Math.floor(p.fromAge))).replace("{to}", String(Math.floor(p.toAge))))}</th>
                    <td>{new Date(p.fromMs).getUTCFullYear()}</td>
                    <td>{pillar(p.pillar.cycle)}</td>
                    <td>{god(p.god)}</td>
                    <td>{god(p.branchGod)}</td>
                    <td>{meets(p.meets)}</td>
                  </tr>
                );
              }),
            )}
          </tbody>
        </DataTable>
      ),
    },
    {
      id: "year",
      label: w("bzlPartYear"),
      hint: w("bzlPartYearHint"),
      copyText: partText("year"),
      table: csvOf(["flow"]),
      children: (
        <DataTable className="ulune-zk-tbl" wide>
          <thead>
            <tr>
              <th data-col="when">{w("bzlFromCol")}</th>
              <th>{w("zkPillar")}</th>
              <th>{w("bzGod")}</th>
              <th>{w("bzlBranchGodCol")}</th>
              <th>{w("bzlMeetsCol")}</th>
            </tr>
          </thead>
          <tbody>
            <tr data-testid="bazi-flow-row-year" data-selected={selectedId === FLOW_YEAR_REF ? "1" : undefined}>
              <th scope="row">{pick(FLOW_YEAR_REF, String(year.year))}</th>
              <td>{pillar(year.pillar.cycle)}</td>
              <td>{god(year.god)}</td>
              <td>{god(year.branchGod)}</td>
              <td>{meets(year.meets)}</td>
            </tr>
            {year.months.map((m) => {
              const id = flowMonthRef(m.index);
              return (
                <tr key={m.index} data-testid={`bazi-flow-row-${m.index}`} data-selected={selectedId === id ? "1" : undefined}>
                  <th scope="row">{pick(id, dateIn(m.fromMs, locale, tz, { day: "numeric", month: "short" }))}</th>
                  <td>{pillar(m.pillar.cycle)}</td>
                  <td>{god(m.god)}</td>
                  <td>{god(m.branchGod)}</td>
                  <td>{meets(m.meets)}</td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      ),
    },
  ];
  const file = `${name || "bazi"} luck pillars`;
  return (
    <div data-testid="bazi-luck-table" data-chart-pick data-selected={selectedId ?? ""} className="min-w-0">
      <TablePage name="bazi-luck" label={t("tableSections")} parts={parts} fileStem={file} actions={<TableActions text={() => text().map((p) => p.lines.join("\n")).join("\n\n")} csv={() => luckTableCsv(lucks, year)} fileName={file} />} />
    </div>
  );
}
