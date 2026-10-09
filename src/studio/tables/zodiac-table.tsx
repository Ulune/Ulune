import { chineseLabel } from "@/lib/chinese/prefs";
import { RELATION_NAMES, relationTone } from "@/lib/chinese/relations";
import { useChinesePrefs } from "@/lib/chinese/use-chinese-prefs";
import { cnWord } from "@/lib/chinese/words";
import type { ZodiacChart } from "@/lib/chinese/zodiac";
import { PLACE_WORD, placeAnimal, placeRef, relationRef } from "@/lib/chinese/zodiac-reading";
import { zodiacAnimalRows, zodiacTableCsv, zodiacTextParts } from "@/lib/chinese/zodiac-table";
import { partRows } from "@/lib/csv";
import { useI18n } from "@/lib/i18n/locale";
import { DataTable } from "@/studio/tables/DataTable";
import { TableActions, TablePage, type TablePart } from "@/studio/tables/TablePage";

/**
 * Chinese astrology's table (languages plan, part 8): the four animals with
 * every layer (pillar, stem, branch, phase, polarity, Na Yin, hidden stems)
 * and the relations between them, each row opening its reading; Copy and
 * CSV for the whole and for each part, as the other tables have.
 */
export function ZodiacTable({
  z,
  name = "",
  selectedId,
  onSelect,
}: {
  z: ZodiacChart;
  name?: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { locale, t } = useI18n();
  const prefs = useChinesePrefs();
  const w = (key: Parameters<typeof cnWord>[1]) => cnWord(locale, key);
  const text = () => zodiacTextParts(z, locale, prefs, name);
  const partText = (id: string) => () => text().find((p) => p.id === id)?.lines.join("\n") ?? "";
  const csvOf = (kinds: string[]) => () => partRows(zodiacTableCsv(z), kinds);
  const parts: TablePart[] = [
    {
      id: "animals",
      label: w("zkPartAnimals"),
      hint: w("zkPartAnimalsHint"),
      copyText: partText("animals"),
      table: csvOf(["animal"]),
      children: (
        <DataTable className="ulune-zk-tbl" wide>
          <thead>
            <tr>
              <th data-col="place">{w("zkPlace")}</th>
              <th>{w("zkPillar")}</th>
              <th>{w("zkStem")}</th>
              <th>{w("zkBranch")}</th>
              <th>{w("zkAnimalPhase")}</th>
              <th>{w("zkPolarity")}</th>
              <th>{w("zkNaYin")}</th>
              <th title={w("zkHiddenHint")}>{w("zkHidden")}</th>
            </tr>
          </thead>
          <tbody>
            {zodiacAnimalRows(z, locale, prefs).map((r) => {
              const id = placeRef(r.place.id);
              return (
                <tr key={id} data-testid={`zodiac-row-${r.place.id}`} data-selected={selectedId === id ? "1" : undefined}>
                  <th scope="row">
                    <button type="button" className="ulune-zk-table-pick" onClick={() => onSelect(id)}>
                      {w(PLACE_WORD[r.place.id])}
                      {r.place.uncertain ? " ~" : ""}
                    </button>
                  </th>
                  <td>{r.pillar}</td>
                  <td>{r.stem}</td>
                  <td>{r.branch}</td>
                  <td>{r.phase}</td>
                  <td>{r.polarity}</td>
                  <td>{r.naYin}</td>
                  <td data-testid={`zodiac-hidden-${r.place.id}`}>{r.hidden}</td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      ),
    },
    {
      id: "relations",
      label: w("zkPartRelations"),
      hint: w("zkPartRelationsHint"),
      copyText: partText("relations"),
      table: csvOf(["relation"]),
      children: z.relations.length ? (
        <DataTable className="ulune-zk-tbl">
          <thead>
            <tr>
              <th data-col="kind">{w("zkRelKind")}</th>
              <th>{w("zkRelBetween")}</th>
            </tr>
          </thead>
          <tbody>
            {z.relations.map((r) => {
              const id = relationRef(r);
              return (
                <tr key={id} data-testid={`zodiac-relrow-${r.kind}-${r.places.join("-")}`} data-tone={relationTone(r.kind)} data-selected={selectedId === id ? "1" : undefined}>
                  <th scope="row">
                    <button type="button" className="ulune-zk-table-pick" onClick={() => onSelect(id)}>
                      {chineseLabel(RELATION_NAMES[r.kind], locale, prefs).text}
                    </button>
                  </th>
                  <td>
                    {placeAnimal(z, r.places[0], locale)} – {placeAnimal(z, r.places[1], locale)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      ) : (
        <p className="ulune-zk-hello-p" data-testid="zodiac-relrows-none">
          {w("zkRelationsNone")}
        </p>
      ),
    },
  ];
  const file = `${name || "chinese astrology"} chinese astrology`;
  return (
    <div data-testid="zodiac-table" data-chart-pick data-selected={selectedId ?? ""} className="min-w-0">
      <TablePage
        name="zodiac"
        label={t("tableSections")}
        parts={parts}
        fileStem={file}
        actions={<TableActions text={() => text().map((p) => p.lines.join("\n")).join("\n\n")} csv={() => zodiacTableCsv(z)} fileName={file} />}
      />
    </div>
  );
}
