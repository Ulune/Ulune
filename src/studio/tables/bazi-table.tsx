import { BRANCHES, SIXTY } from "@/lib/chinese/names";
import { chineseLabel } from "@/lib/chinese/prefs";
import { useChinesePrefs } from "@/lib/chinese/use-chinese-prefs";
import { cnWord } from "@/lib/chinese/words";
import { TEN_GODS, type BaziChart } from "@/lib/chinese/bazi";
import { EMPTY_REF, PILLAR_WORD, godRef, ixRef, ixStatus, naYinRef, stageRef, starRef, stemRef } from "@/lib/chinese/bazi-reading";
import { INTERACTION_NAMES, baziInteractions } from "@/lib/chinese/bazi-interactions";
import { STARS, baziSigns } from "@/lib/chinese/bazi-signs";
import { baziTableCsv, baziTextParts, hiddenGodsLine, ixItemShort, starPlaces, stemGodName } from "@/lib/chinese/bazi-table";
import { partRows } from "@/lib/csv";
import { useI18n } from "@/lib/i18n/locale";
import { DataTable } from "@/studio/tables/DataTable";
import { TableActions, TablePage, type TablePart } from "@/studio/tables/TablePage";

/**
 * BaZi's table (languages plan, part 12; the full one with every layer is
 * part 17): the four pillars with their gods and hidden stems, the Ten
 * Gods by how often they stand in the chart, and (part 13) the stages, Na
 * Yin, empty branches and symbolic stars; Copy and CSV.
 */
export function BaziTable({ c, name = "", selectedId, onSelect }: { c: BaziChart; name?: string; selectedId: string | null; onSelect: (id: string) => void }) {
  const { locale, t } = useI18n();
  const prefs = useChinesePrefs();
  const w = (key: Parameters<typeof cnWord>[1]) => cnWord(locale, key);
  const text = () => baziTextParts(c, locale, prefs, name);
  const partText = (id: string) => () => text().find((p) => p.id === id)?.lines.join("\n") ?? "";
  const csvOf = (kinds: string[]) => () => partRows(baziTableCsv(c), kinds);
  const signs = baziSigns(c);
  const interactions = baziInteractions(c);
  const pick = (id: string, label: string) => (
    <button type="button" className="ulune-zk-table-pick" onClick={() => onSelect(id)}>
      {label}
    </button>
  );
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
    {
      id: "signs",
      label: w("bzPartSigns"),
      hint: w("bzPartSignsHint"),
      copyText: partText("signs"),
      table: csvOf(["signs"]),
      children: (
        <DataTable className="ulune-zk-tbl" wide>
          <thead>
            <tr>
              <th data-col="place">{w("zkPlace")}</th>
              <th>{w("bzStage")}</th>
              <th>{w("zkNaYin")}</th>
              <th>{w("bzEmptyBadge")}</th>
            </tr>
          </thead>
          <tbody>
            {signs.pillars.map((s) => (
              <tr key={s.place} data-testid={`bazi-signrow-${s.place}`} data-selected={selectedId === stageRef(s.place) || selectedId === naYinRef(s.place) ? "1" : undefined}>
                <th scope="row">{w(PILLAR_WORD[s.place])}</th>
                <td>{pick(stageRef(s.place), chineseLabel(s.stage, locale, prefs).text)}</td>
                <td>{pick(naYinRef(s.place), chineseLabel(s.naYin, locale, prefs).text)}</td>
                <td>{s.empty ? pick(EMPTY_REF, w("bzEmptyBadge")) : "–"}</td>
              </tr>
            ))}
            <tr data-testid="bazi-signrow-empty" data-selected={selectedId === EMPTY_REF ? "1" : undefined}>
              <th scope="row">{pick(EMPTY_REF, w("bzEmptyHead"))}</th>
              <td colSpan={3}>{signs.empty.map((b) => chineseLabel(BRANCHES[b]!, locale, prefs).text).join(" · ")}</td>
            </tr>
          </tbody>
        </DataTable>
      ),
    },
    {
      id: "stars",
      label: w("bzStarsHead"),
      hint: w("bzPartStarsHint"),
      copyText: partText("stars"),
      table: csvOf(["star"]),
      children: signs.stars.length ? (
        <DataTable className="ulune-zk-tbl">
          <thead>
            <tr>
              <th data-col="star">{w("bzStarCol")}</th>
              <th>{w("bzPlacesCol")}</th>
            </tr>
          </thead>
          <tbody>
            {signs.stars.map((h) => (
              <tr key={h.id} data-testid={`bazi-starrow-t-${h.id}`} data-selected={selectedId === starRef(h.id) ? "1" : undefined}>
                <th scope="row">{pick(starRef(h.id), chineseLabel(STARS.find((x) => x.id === h.id)!, locale, prefs).text)}</th>
                <td>{starPlaces(h.places, locale)}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      ) : (
        <p className="text-sm text-fg-muted">{w("bzStarsNone")}</p>
      ),
    },
    {
      id: "interactions",
      label: w("bzPartIx"),
      hint: w("bzPartIxHint"),
      copyText: partText("interactions"),
      table: csvOf(["ix"]),
      children: interactions.length ? (
        <DataTable className="ulune-zk-tbl" wide>
          <thead>
            <tr>
              <th data-col="kind">{w("bzIxKindCol")}</th>
              <th>{w("bzPlacesCol")}</th>
              <th>{w("bzIxItemsCol")}</th>
              <th>{w("bzIxResult")}</th>
            </tr>
          </thead>
          <tbody>
            {interactions.map((ix) => (
              <tr key={ix.id} data-testid={`bazi-ixrow-${ix.id}`} data-selected={selectedId === ixRef(ix.id) ? "1" : undefined}>
                <th scope="row">{pick(ixRef(ix.id), chineseLabel(INTERACTION_NAMES[ix.kind], locale, prefs).text)}</th>
                <td>{starPlaces(ix.places, locale)}</td>
                <td>{ix.items.map((n) => ixItemShort(ix, n, locale, prefs)).join(" · ")}</td>
                <td>{ixStatus(ix, locale)}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      ) : (
        <p className="text-sm text-fg-muted">{w("bzIxNone")}</p>
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
