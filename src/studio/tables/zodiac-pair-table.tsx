import { AnimalGlyph } from "@/components/animal-glyph";
import { ChineseTermWord } from "@/encyclopedia/ChineseTermWord";
import { ANIMALS, BRANCHES } from "@/lib/chinese/names";
import { chineseLabel } from "@/lib/chinese/prefs";
import { relationTone } from "@/lib/chinese/relations";
import { useChinesePrefs } from "@/lib/chinese/use-chinese-prefs";
import { cnWord } from "@/lib/chinese/words";
import { PLACE_WORD } from "@/lib/chinese/zodiac-reading";
import type { PairMeeting } from "@/lib/chinese/zodiac-time";
import { meetingLine, meetingRef, meetName } from "@/lib/chinese/zodiac-time-reading";
import { pairTableCsv } from "@/lib/chinese/zodiac-time-table";
import { useI18n } from "@/lib/i18n/locale";
import { DataTable } from "@/studio/tables/DataTable";
import { TableActions, TablePage, type TablePart } from "@/studio/tables/TablePage";

/**
 * Chinese astrology's Pair as a table (languages plan, part 11): every
 * meeting of one person's animal with the other's, place by place, each row
 * opening its reading; Copy and CSV. Each animal links to its encyclopedia
 * entry once the entry is written (part 29).
 */
export function ZodiacPairTable({
  meetings,
  names,
  selectedId,
  onSelect,
}: {
  meetings: readonly PairMeeting[];
  names: { a: string; b: string };
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { locale, t } = useI18n();
  const prefs = useChinesePrefs();
  const w = (key: Parameters<typeof cnWord>[1]) => cnWord(locale, key);
  const text = () => [`${names.a} – ${names.b}`, ...meetings.map((m) => meetingLine(m, names, locale, prefs))].join("\n");
  const who = (person: string, place: PairMeeting["a"], branch: number) => (
    <span className="ulune-zk-table-animal">
      {prefs.animals === "drawings" ? <AnimalGlyph animal={branch} size={16} /> : null}
      {person} · {w(PLACE_WORD[place]).toLowerCase()} (
      <ChineseTermWord family="animal" id={ANIMALS[branch]!.id}>
        {chineseLabel(BRANCHES[branch]!, locale, prefs).name}
      </ChineseTermWord>
      )
    </span>
  );
  const parts: TablePart[] = [
    {
      id: "meetings",
      label: w("zkPairBetween"),
      hint: w("zkPartPairHint"),
      copyText: text,
      children: meetings.length ? (
        <DataTable className="ulune-zk-tbl" wide>
          <thead>
            <tr>
              <th data-col="kind">{w("zkRelKind")}</th>
              <th>{names.a}</th>
              <th>{names.b}</th>
            </tr>
          </thead>
          <tbody>
            {meetings.map((m) => {
              const id = meetingRef(m);
              return (
                <tr key={id} data-testid={`zodiac-pair-row-${m.a}-${m.b}`} data-tone={m.kinds[0] === "same" ? "same" : relationTone(m.kinds[0]!)} data-selected={selectedId === id ? "1" : undefined}>
                  <th scope="row">
                    <button type="button" className="ulune-zk-table-pick" onClick={() => onSelect(id)}>
                      {m.kinds.map((k) => chineseLabel(meetName(k, false), locale, prefs).text).join(", ")}
                    </button>
                  </th>
                  <td>{who(names.a, m.a, m.branchA)}</td>
                  <td>{who(names.b, m.b, m.branchB)}</td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      ) : (
        <p className="ulune-zk-hello-p">{w("zkPairNone")}</p>
      ),
    },
  ];
  const file = `${names.a} ${names.b} chinese astrology`;
  return (
    <div data-testid="zodiac-pair-table" data-chart-pick data-selected={selectedId ?? ""} className="min-w-0">
      <TablePage name="zodiac-pair" label={t("tableSections")} parts={parts} fileStem={file} actions={<TableActions text={text} csv={() => pairTableCsv(meetings)} fileName={file} />} />
    </div>
  );
}
