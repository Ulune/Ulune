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
import type { ZodiacChart } from "@/lib/chinese/zodiac";
import { ZKP_NOW, ZKP_NOW_MONTH, nowKindLine, nowMonthLine, nowYearTitle, togetherLine, zkpNowRef, type ZodiacPairNow } from "@/lib/chinese/zodiac-pair-now";
import { meetLine } from "@/lib/chinese/zodiac-time-reading";
import { pnWord } from "@/lib/i18n/catalog/pair-now-words";
import { rowsCsv } from "@/lib/pair-now-csv";
import { useI18n } from "@/lib/i18n/locale";
import { DataTable } from "@/studio/tables/DataTable";
import { TableActions, TablePage, type TablePart } from "@/studio/tables/TablePage";

/**
 * Chinese astrology's Pair as a table (languages plan, part 11): every
 * meeting of one person's animal with the other's, place by place, each row
 * opening its reading; Copy and CSV. Each animal links to its encyclopedia
 * entry once the entry is written (part 29). "You two, now" (share and
 * compare plan, feature 5e): the year's animal for both, and the month.
 */
export function ZodiacPairTable({
  meetings,
  names,
  selectedId,
  onSelect,
  now = null,
  z = null,
}: {
  meetings: readonly PairMeeting[];
  names: { a: string; b: string };
  selectedId: string | null;
  onSelect: (id: string) => void;
  now?: ZodiacPairNow | null;
  z?: { a: ZodiacChart; b: ZodiacChart } | null;
}) {
  const { locale, t } = useI18n();
  const prefs = useChinesePrefs();
  const w = (key: Parameters<typeof cnWord>[1]) => cnWord(locale, key);
  const colon = locale === "fr" ? "\u202f: " : ": ";
  // "You two, now" (feature 5e) as text and rows: the year for both, then the month.
  const nowLines = () =>
    now && z
      ? [
          `${pnWord(locale, "ptnHead")}${colon}${nowYearTitle(now, locale, prefs)}`,
          togetherLine(now, names, locale),
          ...(["a", "b"] as const).map((p) => `${names[p]} · ${chineseLabel(BRANCHES[z[p].places[0]!.branch]!, locale, prefs).name}${colon}${nowKindLine(now, p, locale, prefs)}`),
          ...(now.month ? [nowMonthLine(now, names, locale, prefs)] : []),
        ]
      : [];
  // Plain ids, as the table's other rows: each person by their role (a, b), never a name.
  const nowRows = (): string[][] =>
    now && z
      ? [
          ["now", "period", "year", "person", "animal", "against", "meets"],
          ...(["a", "b"] as const).map((p) => ["now", "year", String(now.year), p, ANIMALS[z[p].places[0]!.branch]!.id, ANIMALS[now.ahead.a.pillar.branch]!.id, now.kinds[p] ?? ""]),
          ...(now.month ? (["a", "b"] as const).map((p) => ["now", "month", String(now.year), p, ANIMALS[z[p].places[0]!.branch]!.id, ANIMALS[now.month!.pillar.branch]!.id, now.monthKinds[p].join("|")]) : []),
        ]
      : [];
  const text = () => [[`${names.a} – ${names.b}`, ...meetings.map((m) => meetingLine(m, names, locale, prefs))].join("\n"), ...(now ? [nowLines().join("\n")] : [])].join("\n\n");
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
    ...(now && z
      ? [
          {
            id: "now",
            label: pnWord(locale, "ptnHead"),
            heading: `${pnWord(locale, "ptnHead")} · ${nowYearTitle(now, locale, prefs)}`,
            hint: pnWord(locale, "ptnPartZodiacHint"),
            copyText: () => nowLines().join("\n"),
            table: nowRows,
            children: (
              <>
                <p className="ulune-zk-hello-p" data-testid="zodiac-pair-now-table-together">
                  {togetherLine(now, names, locale)}
                </p>
                <DataTable className="ulune-zk-tbl">
                  <thead>
                    <tr>
                      <th data-col="who">{pnWord(locale, "ptnColWho")}</th>
                      <th data-col="animal">{w("zkPairWhich")}</th>
                      <th data-col="meets">{pnWord(locale, "ptnColMeets")}</th>
                    </tr>
                  </thead>
                  <tbody data-testid="zodiac-pair-now-table">
                    {(["a", "b"] as const).map((p) => {
                      const id = zkpNowRef(p);
                      return (
                        <tr key={p} data-testid={`zodiac-pair-now-row-${p}`} data-selected={selectedId === id ? "1" : undefined}>
                          <th scope="row">
                            <button type="button" className="ulune-zk-table-pick" onClick={() => onSelect(id)}>
                              {names[p]}
                            </button>
                          </th>
                          <td>
                            <span className="ulune-zk-table-animal">
                              {prefs.animals === "drawings" ? <AnimalGlyph animal={z[p].places[0]!.branch} size={16} /> : null}
                              <ChineseTermWord family="animal" id={ANIMALS[z[p].places[0]!.branch]!.id}>
                                {chineseLabel(BRANCHES[z[p].places[0]!.branch]!, locale, prefs).name}
                              </ChineseTermWord>
                            </span>
                          </td>
                          <td>{nowKindLine(now, p, locale, prefs)}</td>
                        </tr>
                      );
                    })}
                    {now.month
                      ? (["a", "b"] as const).map((p) => (
                          <tr key={`m-${p}`} data-testid={`zodiac-pair-now-month-${p}`} data-selected={selectedId === ZKP_NOW_MONTH ? "1" : undefined}>
                            <th scope="row">
                              <button type="button" className="ulune-zk-table-pick" onClick={() => onSelect(ZKP_NOW_MONTH)}>
                                {w("zkMonth")}
                              </button>
                            </th>
                            <td>
                              {names[p]} · {chineseLabel(BRANCHES[now.month!.pillar.branch]!, locale, prefs).name}
                            </td>
                            <td>{meetLine(now.monthKinds[p], locale, prefs, true)}</td>
                          </tr>
                        ))
                      : null}
                  </tbody>
                </DataTable>
                <p className="mt-2">
                  <button type="button" className="ulune-zk-table-pick" data-testid="zodiac-pair-now-table-year" onClick={() => onSelect(ZKP_NOW)}>
                    {nowYearTitle(now, locale, prefs)}
                  </button>
                </p>
              </>
            ),
          } satisfies TablePart,
        ]
      : []),
  ];
  const file = `${names.a} ${names.b} chinese astrology`;
  return (
    <div data-testid="zodiac-pair-table" data-chart-pick data-selected={selectedId ?? ""} className="min-w-0">
      <TablePage name="zodiac-pair" label={t("tableSections")} parts={parts} fileStem={file} actions={<TableActions text={text} csv={() => [pairTableCsv(meetings), ...(now ? [rowsCsv(nowRows())] : [])].join("\n\n")} fileName={file} />} />
    </div>
  );
}
