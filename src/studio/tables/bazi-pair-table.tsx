import { ChineseTermPieces, ChineseTermWord } from "@/encyclopedia/ChineseTermWord";
import { SIXTY } from "@/lib/chinese/names";
import { chineseLabel } from "@/lib/chinese/prefs";
import { useChinesePrefs } from "@/lib/chinese/use-chinese-prefs";
import { cnWord } from "@/lib/chinese/words";
import { tenGodById, type BaziChart } from "@/lib/chinese/bazi";
import { LUCK_HOW_REF, countWord, luckRef } from "@/lib/chinese/bazi-luck-reading";
import type { BaziPair } from "@/lib/chinese/bazi-pair";
import {
  PAIR_DM_REF,
  PAIR_GIFTS_REF,
  PAIR_LUCK_REF,
  PAIR_PALACE_REF,
  dmLine,
  giftLines,
  luckRows,
  meetFromLabel,
  meetRowLine,
  pairCellRef,
  pairMeetRef,
  palaceLine,
  type PairNames,
} from "@/lib/chinese/bazi-pair-reading";
import { pairTableCsv, pairTextParts } from "@/lib/chinese/bazi-pair-table";
import { meetPieces } from "@/lib/chinese/bazi-term-pieces";
import { partRows } from "@/lib/csv";
import { useI18n } from "@/lib/i18n/locale";
import { pnWord } from "@/lib/i18n/catalog/pair-now-words";
import { DataTable } from "@/studio/tables/DataTable";
import { TableActions, TablePage, type TablePart } from "@/studio/tables/TablePage";

/** BaZi's Pair as a table (languages plan, part 19); Copy and CSV. Its terms link to the encyclopedia once written (part 29); part 20 adds the luck pillars of the moment. */
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
      table: csvOf(["section", "palace", "gift"]),
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
                  <th scope="row">{pick(id, meetFromLabel(names, q.id, locale))}</th>
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
  // The luck pillars of the moment (part 20): each person's decade by each count shown, its god for them and for the other; then how the two meet.
  const L = p.luck;
  if (L) {
    const meets = luckRows(p, names, locale, prefs).find((r) => r.id === "meets");
    parts.push({
      id: "luck",
      // BaZi's "You two, now" (share and compare plan, feature 5e): the heading every Relationship page gives its time.
      label: pnWord(locale, "ptnHead"),
      heading: `${pnWord(locale, "ptnHead")} · ${w("bzpLuckHead")}`,
      hint: w("bzpPartLuckHint"),
      copyText: partText("luck"),
      table: csvOf(["luck", "luckmeet"]),
      children: (
        <DataTable className="ulune-zk-tbl" wide>
          <thead>
            <tr>
              <th>{w("bzpPersonCol")}</th>
              <th>{w("zkPillar")}</th>
              <th>{w("bzlAgesCol")}</th>
              <th>{w("bzGod")}</th>
              <th>{w("bzpForOtherCol")}</th>
            </tr>
          </thead>
          <tbody>
            {(["a", "b"] as const).flatMap((who) =>
              L[who].map((d) => {
                const id = pairCellRef(who, d.pillar ? luckRef(d.count, d.pillar.index) : LUCK_HOW_REF);
                const person = d.given ? names[who] : `${names[who]} · ${countWord(d.count, locale)}`;
                return (
                  <tr key={`${who}-${d.count}`} data-testid={`bazi-pair-luckrow-${who}-${d.count}`} data-selected={selectedId === id ? "1" : undefined}>
                    <th scope="row">{pick(id, person)}</th>
                    {d.pillar ? (
                      <>
                        <td>
                          <ChineseTermWord family="pillar" id={SIXTY[d.pillar.pillar.cycle]!.id}>
                            {chineseLabel(SIXTY[d.pillar.pillar.cycle]!, locale, prefs).text}
                          </ChineseTermWord>
                        </td>
                        <td>{cnWord(locale, "bzlAges", { from: Math.floor(d.pillar.fromAge), to: Math.floor(d.pillar.toAge) })}</td>
                        <td>
                          <ChineseTermWord family="ten-god" id={d.pillar.god}>
                            {chineseLabel(tenGodById(d.pillar.god), locale, prefs).text}
                          </ChineseTermWord>
                        </td>
                        <td>
                          <ChineseTermWord family="ten-god" id={d.godForOther}>
                            {chineseLabel(tenGodById(d.godForOther!), locale, prefs).text}
                          </ChineseTermWord>
                        </td>
                      </>
                    ) : (
                      <td colSpan={4}>{w("bzlBeforeLuck")}</td>
                    )}
                  </tr>
                );
              }),
            )}
            {meets ? (
              <tr data-testid="bazi-pair-luckrow-meets" data-selected={selectedId === PAIR_LUCK_REF ? "1" : undefined}>
                <th scope="row">{pick(PAIR_LUCK_REF, meets.kind)}</th>
                <td colSpan={4}>{meets.sub}</td>
              </tr>
            ) : null}
          </tbody>
        </DataTable>
      ),
    });
  }
  const file = `${names.a} ${names.b} bazi`;
  return (
    <div data-testid="bazi-pair-table" data-chart-pick data-selected={selectedId ?? ""} className="min-w-0">
      <TablePage name="bazi-pair" label={t("tableSections")} parts={parts} fileStem={file} actions={<TableActions text={() => text().map((x) => x.lines.join("\n")).join("\n\n")} csv={() => pairTableCsv(p)} fileName={file} />} />
    </div>
  );
}
