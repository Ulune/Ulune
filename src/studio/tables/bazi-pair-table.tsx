import { ChineseTermPieces, ChineseTermWord } from "@/encyclopedia/ChineseTermWord";
import { SIXTY } from "@/lib/chinese/names";
import { chineseLabel } from "@/lib/chinese/prefs";
import { useChinesePrefs } from "@/lib/chinese/use-chinese-prefs";
import { cnWord } from "@/lib/chinese/words";
import type { BaziChart } from "@/lib/chinese/bazi";
import { PILLAR_WORD } from "@/lib/chinese/bazi-reading";
import type { BaziPair } from "@/lib/chinese/bazi-pair";
import { PAIR_DM_REF, PAIR_GIFTS_REF, PAIR_PALACE_REF, dmLine, giftLines, meetRowLine, pairMeetRef, palaceLine, type PairNames } from "@/lib/chinese/bazi-pair-reading";
import { pairTableCsv, pairTextParts } from "@/lib/chinese/bazi-pair-table";
import { meetPieces } from "@/lib/chinese/bazi-term-pieces";
import { partRows } from "@/lib/csv";
import { useI18n } from "@/lib/i18n/locale";
import { DataTable } from "@/studio/tables/DataTable";
import { TableActions, TablePage, type TablePart } from "@/studio/tables/TablePage";

/** BaZi's Pair as a table (languages plan, part 19); Copy and CSV. Its terms link to the encyclopedia once written (part 29). */
export function BaziPairTable({ p, b, names, selectedId, onSelect }: { p: BaziPair; b: BaziChart; names: PairNames; selectedId: string | null; onSelect: (id: string) => void }) {
  const { locale, t } = useI18n();
  const prefs = useChinesePrefs();
  const w = (key: Parameters<typeof cnWord>[1]) => cnWord(locale, key);
  const text = () => pairTextParts(p, b, names, locale, prefs);
  const partText = (id: string) => () => text().find((x) => x.id === id)?.lines.join("\n") ?? "";
  const csvOf = (kinds: string[]) => () => partRows(pairTableCsv(p), kinds);
  const pick = (id: string, label: string) => (
    <button type="button" className="ulune-zk-table-pick" onClick={() => onSelect(id)}>
      {label}
    </button>
  );
  const main: [string, string, string][] = [
    [PAIR_DM_REF, w("bzpDmHead"), dmLine(p, names, locale, prefs)],
    [PAIR_PALACE_REF, w("bzpPalaceHead"), palaceLine(p, names, locale, prefs)],
    ...giftLines(p, names, locale).map((l) => [PAIR_GIFTS_REF, w("bzpPhasesHead"), l] as [string, string, string]),
  ];
  const parts: TablePart[] = [
    {
      id: "main",
      label: w("bzpPartMain"),
      hint: w("bzpPartMainHint"),
      copyText: partText("main"),
      table: csvOf(["dm", "palace", "gift"]),
      children: (
        <DataTable className="ulune-zk-tbl">
          <tbody>
            {main.map(([id, k, v], i) => (
              <tr key={i} data-testid={`bazi-pair-row-${i}`} data-selected={selectedId === id ? "1" : undefined}>
                <th scope="row">{pick(id, k)}</th>
                <td>{v}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      ),
    },
    {
      id: "meets",
      label: w("bzpPartMeets"),
      hint: w("bzpPartMeetsHint"),
      copyText: partText("meets"),
      table: csvOf(["meet"]),
      children: (
        <DataTable className="ulune-zk-tbl" wide>
          <thead>
            <tr>
              <th data-col="place">{w("zkPlace")}</th>
              <th>{w("zkPillar")}</th>
              <th>{w("bzlMeetsCol")}</th>
            </tr>
          </thead>
          <tbody>
            {b.pillars.map((q) => {
              const id = pairMeetRef(q.id);
              return (
                <tr key={q.id} data-testid={`bazi-pair-meetrow-${q.id}`} data-selected={selectedId === id ? "1" : undefined}>
                  <th scope="row">{pick(id, cnWord(locale, "bzpMeetFrom", { b: names.b, pillar: cnWord(locale, PILLAR_WORD[q.id]).toLowerCase() }))}</th>
                  <td>
                    <ChineseTermWord family="pillar" id={SIXTY[q.pillar.cycle]!.id}>
                      {chineseLabel(SIXTY[q.pillar.cycle]!, locale, prefs).text}
                    </ChineseTermWord>
                  </td>
                  <td>
                    <ChineseTermPieces text={meetRowLine(p, q.id, names, locale, prefs)} pieces={() => meetPieces(p.meetings.find((m) => m.from === q.id)?.meets ?? [], locale, prefs, "pillar")} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      ),
    },
  ];
  const file = `${names.a} ${names.b} bazi`;
  return (
    <div data-testid="bazi-pair-table" data-chart-pick data-selected={selectedId ?? ""} className="min-w-0">
      <TablePage name="bazi-pair" label={t("tableSections")} parts={parts} fileStem={file} actions={<TableActions text={() => text().map((x) => x.lines.join("\n")).join("\n\n")} csv={() => pairTableCsv(p)} fileName={file} />} />
    </div>
  );
}
