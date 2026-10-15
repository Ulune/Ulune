import { ChineseTermWord } from "@/encyclopedia/ChineseTermWord";
import { TrigramGlyph } from "@/components/trigram-mark";
import { chineseLabel } from "@/lib/chinese/prefs";
import { useChinesePrefs } from "@/lib/chinese/use-chinese-prefs";
import { cnWord } from "@/lib/chinese/words";
import { DIRECTION_IDS, MANSIONS, directionById } from "@/lib/chinese/fengshui";
import { countLabel, groupLabel } from "@/lib/chinese/fengshui-reading";
import { pairDirection, type PairPerson } from "@/lib/chinese/fengshui-pair";
import { FSP_PRACTICE_REF, fspDirRef, fspKuaRef, kindLabel, pairPracticeLines, practiceHead, type FsPairContext } from "@/lib/chinese/fengshui-pair-reading";
import { fsPairTableCsv, fsPairTextParts } from "@/lib/chinese/fengshui-pair-table";
import { partRows } from "@/lib/csv";
import { useI18n } from "@/lib/i18n/locale";
import { DataTable } from "@/studio/tables/DataTable";
import { TableActions, TablePage, type TablePart } from "@/studio/tables/TablePage";

const PEOPLE: readonly PairPerson[] = ["a", "b"];

/** Feng Shui's Relationship lens as a table (review items FS5 and FS32): the two Kua, the eight directions for two, the practical lines; Copy and CSV. */
export function FengShuiPairTable({ ctx, selectedId, onSelect }: { ctx: FsPairContext; selectedId: string | null; onSelect: (id: string) => void }) {
  const { locale, t } = useI18n();
  const prefs = useChinesePrefs();
  const w = (key: Parameters<typeof cnWord>[1]) => cnWord(locale, key);
  const { pair: p, names, lists } = ctx;
  const text = () => fsPairTextParts(ctx, locale, prefs);
  const partText = (id: string) => () => text().find((x) => x.id === id)?.lines.join("\n") ?? "";
  const csvOf = (kinds: string[]) => () => partRows(fsPairTableCsv(ctx), kinds);
  const pick = (id: string, label: string) => (
    <button type="button" className="ulune-zk-table-pick" onClick={() => onSelect(id)}>
      {label}
    </button>
  );
  const kind = (supportive: boolean) => cnWord(locale, supportive ? "fsSupportive" : "fsChallenging").toLowerCase();
  const parts: TablePart[] = [
    {
      id: "kua",
      label: w("fspPartKua"),
      hint: w("fspPartKuaHint"),
      copyText: partText("kua"),
      table: csvOf(["kua"]),
      children: (
        <DataTable className="ulune-zk-tbl" wide>
          <thead>
            <tr>
              <th>{w("fspPerson")}</th>
              <th>{w("bzlCountCol")}</th>
              <th>{w("fsKuaHead")}</th>
              <th>{w("fsTrigram")}</th>
              <th>{w("fsGroup")}</th>
              <th>{w("fspOnCompass")}</th>
            </tr>
          </thead>
          <tbody>
            {PEOPLE.flatMap((who) =>
              lists[who].map((fs) => {
                const id = fspKuaRef(who);
                const shown = fs.count === p[who].count;
                return (
                  <tr key={`${who}-${fs.count}`} data-testid={`fengshui-pair-row-kua-${who}-${fs.count}`} data-compass={shown ? "1" : undefined} data-selected={selectedId === id && shown ? "1" : undefined}>
                    <th scope="row">{pick(id, names[who])}</th>
                    <td>{lists[who].length > 1 ? countLabel(fs.count, locale) : "—"}</td>
                    <td>{cnWord(locale, "fsKuaN", { n: fs.kua })}</td>
                    <td>
                      <TrigramGlyph symbol={fs.trigram.symbol} />{" "}
                      <ChineseTermWord family="trigram" id={fs.trigram.id}>
                        {chineseLabel(fs.trigram, locale, prefs).text}
                      </ChineseTermWord>
                    </td>
                    <td>{groupLabel(fs, locale)}</td>
                    <td>{shown ? "✓" : ""}</td>
                  </tr>
                );
              }),
            )}
          </tbody>
        </DataTable>
      ),
    },
    {
      id: "dirs",
      label: w("fspPartDirs"),
      hint: w("fspPartDirsHint"),
      copyText: partText("dirs"),
      table: csvOf(["dir"]),
      children: (
        <DataTable className="ulune-zk-tbl" wide>
          <thead>
            <tr>
              <th>{w("fsDirection")}</th>
              <th>{names.a}</th>
              <th>{names.b}</th>
              <th>{w("fspForTwo")}</th>
            </tr>
          </thead>
          <tbody>
            {DIRECTION_IDS.map((d) => {
              const x = pairDirection(p, d);
              const id = fspDirRef(d);
              return (
                <tr key={d} data-testid={`fengshui-pair-row-dir-${d}`} data-kind={x.kind} data-selected={selectedId === id ? "1" : undefined}>
                  <th scope="row">{pick(id, chineseLabel(directionById(d), locale, prefs).text)}</th>
                  {PEOPLE.map((who) => (
                    <td key={who} data-supportive={x[who].supportive ? "1" : "0"}>
                      {chineseLabel(MANSIONS[x[who].mansion], locale, prefs).text} <span className="ulune-fs-tbl-kind">({kind(x[who].supportive)})</span>
                    </td>
                  ))}
                  <td>{kindLabel(x, names, locale)}</td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      ),
    },
    {
      id: "practice",
      label: w("fspPracticeHead"),
      hint: w("fspPartPracticeHint"),
      copyText: partText("practice"),
      children: (
        <DataTable className="ulune-zk-tbl">
          <tbody>
            {pairPracticeLines(ctx, locale).map((l) => (
              <tr key={l.id} data-testid={`fengshui-pair-row-practice-${l.id}`} data-selected={selectedId === FSP_PRACTICE_REF ? "1" : undefined}>
                <th scope="row">{pick(FSP_PRACTICE_REF, practiceHead(l.id, locale))}</th>
                <td>{l.text}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      ),
    },
  ];
  const file = `${names.a} ${names.b} feng shui`;
  return (
    <div data-testid="fengshui-pair-table" data-chart-pick data-selected={selectedId ?? ""} className="min-w-0">
      <TablePage name="fengshui-pair" label={t("tableSections")} parts={parts} fileStem={file} actions={<TableActions text={() => text().map((x) => x.lines.join("\n")).join("\n\n")} csv={() => fsPairTableCsv(ctx)} fileName={file} />} />
    </div>
  );
}
