import { ChineseTermPieces, ChineseTermWord } from "@/encyclopedia/ChineseTermWord";
import { BRANCHES, SIXTY } from "@/lib/chinese/names";
import { chineseLabel } from "@/lib/chinese/prefs";
import { useChinesePrefs } from "@/lib/chinese/use-chinese-prefs";
import { cnWord } from "@/lib/chinese/words";
import { TEN_GODS, type BaziChart } from "@/lib/chinese/bazi";
import { EMPTY_REF, PILLAR_WORD, godRef, ixRef, ixStatus, naYinRef, stageRef, starRef, stemRef } from "@/lib/chinese/bazi-reading";
import { INTERACTION_NAMES, baziInteractions } from "@/lib/chinese/bazi-interactions";
import { STARS, baziSigns } from "@/lib/chinese/bazi-signs";
import { balanceRows, baziTableCsv, baziTextParts, hiddenGodsLine, ixItemShort, starPlaces, stemGodName } from "@/lib/chinese/bazi-table";
import { baziFullRows, type FullRow, type FullTime } from "@/lib/chinese/bazi-full";
import { flowYear, flowYearOf, luckAt, luckPillars, type LuckCount } from "@/lib/chinese/bazi-luck";
import { baziBalance } from "@/lib/chinese/bazi-balance";
import { branchPhasePieces, emptyPieces, hiddenGodPieces, ixItemPieces, ixResultPieces, meetPieces, natalLinkPieces, pointPieces, starPieces, summaryPieces } from "@/lib/chinese/bazi-term-pieces";
import type { StarId } from "@/lib/chinese/bazi-signs";
import { partRows } from "@/lib/csv";
import { useMemo } from "react";
import { useI18n } from "@/lib/i18n/locale";
import { DataTable } from "@/studio/tables/DataTable";
import { TableActions, TablePage, type TablePart } from "@/studio/tables/TablePage";

/**
 * BaZi's table (languages plan, parts 12–17): first the full table (part
 * 17), every pillar, the luck pillar running now and this year's included,
 * by every layer; then the four pillars with their gods and hidden stems,
 * the Ten Gods by how often they stand in the chart, the stages, Na Yin,
 * empty branches and symbolic stars, the interactions, the balance and
 * strength; Copy and CSV. Each term links to its encyclopedia entry once
 * the entry is written (part 29).
 */
export function BaziTable({
  c,
  name = "",
  count,
  selectedId,
  onSelect,
}: {
  c: BaziChart;
  name?: string;
  /** The birth's yin or yang count, if given: one luck pillar row, else one per count. */
  count?: LuckCount;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { locale, t } = useI18n();
  const prefs = useChinesePrefs();
  const w = (key: Parameters<typeof cnWord>[1]) => cnWord(locale, key);
  const time = useMemo<FullTime>(() => {
    const nowMs = Date.now();
    const lucks = (count ? [count] : (["yang", "yin"] as const)).map((n) => luckPillars(c, n));
    return { lucks, year: flowYear(c, flowYearOf(nowMs), lucks), nowMs };
  }, [c, count]);
  const full = baziFullRows(c, locale, prefs, time);
  const text = () => baziTextParts(c, locale, prefs, name, time);
  const partText = (id: string) => () => text().find((p) => p.id === id)?.lines.join("\n") ?? "";
  const csvOf = (kinds: string[]) => () => partRows(baziTableCsv(c, time), kinds);
  const signs = baziSigns(c);
  const interactions = baziInteractions(c);
  const bal = balanceRows(c, locale, prefs);
  const pick = (id: string, label: string) => (
    <button type="button" className="ulune-zk-table-pick" onClick={() => onSelect(id)}>
      {label}
    </button>
  );
  // The full table's rows name their terms by id (bazi-full.ts): its pillar, its stem's god, its branch, its stage.
  const branchOf = (r: FullRow) => BRANCHES.findIndex((b) => b.id === r.ids[5]);
  const timeMeets = (r: FullRow) => {
    if (r.kind === "year") return time.year.meets;
    const luck = time.lucks.find((l) => `luck-${l.count}` === r.id);
    return (luck && luckAt(luck, time.nowMs)?.meets) || [];
  };
  const parts: TablePart[] = [
    {
      id: "full",
      label: w("bzPartFull"),
      hint: w("bzPartFullHint"),
      copyText: partText("full"),
      table: csvOf(["full"]),
      children: (
        <DataTable className="ulune-zk-tbl ulune-bz-full" wide>
          <thead>
            <tr>
              <th data-col="place">{w("zkPlace")}</th>
              <th>{w("zkPillar")}</th>
              <th>{w("bzGod")}</th>
              <th>{w("zkBranch")}</th>
              <th>{w("zkHidden")}</th>
              <th>{w("bzStage")}</th>
              <th>{w("zkNaYin")}</th>
              <th>{w("bzEmptyBadge")}</th>
              <th>{w("bzStarsHead")}</th>
              <th>{w("bzLinksCol")}</th>
              <th>{w("bzPointsCol")}</th>
            </tr>
          </thead>
          <tbody>
            {full.map((r) => (
              <tr key={r.id} data-testid={`bazi-full-${r.id}`} data-kind={r.kind} data-selected={r.place && selectedId === stemRef(r.place) ? "1" : undefined}>
                <th scope="row">{r.place ? pick(stemRef(r.place), r.label) : <span className="ulune-zk-table-pick ulune-bz-static-row">{r.label}</span>}</th>
                <td>
                  <ChineseTermWord family="pillar" id={r.ids[2]}>
                    {r.pillar}
                  </ChineseTermWord>
                </td>
                <td>
                  {r.ids[4] === "day-master" ? (
                    <ChineseTermWord family="bazi-concept" id="day-master">
                      {r.stemGod}
                    </ChineseTermWord>
                  ) : (
                    <ChineseTermWord family="ten-god" id={r.ids[4]}>
                      {r.stemGod}
                    </ChineseTermWord>
                  )}
                </td>
                <td>
                  <ChineseTermPieces text={r.branch} pieces={() => branchPhasePieces(branchOf(r), locale, prefs)} />
                </td>
                <td>
                  <ChineseTermPieces text={r.hidden} pieces={() => hiddenGodPieces(c.dayMaster, branchOf(r), locale, prefs)} />
                </td>
                <td>
                  <ChineseTermWord family="life-stage" id={r.ids[7]}>
                    {r.stage}
                  </ChineseTermWord>
                </td>
                <td>
                  <ChineseTermWord family="na-yin" id={Math.floor(SIXTY.findIndex((x) => x.id === r.ids[2]) / 2)}>
                    {r.naYin}
                  </ChineseTermWord>
                </td>
                <td>{r.empty}</td>
                <td>
                  <ChineseTermPieces text={r.stars} pieces={() => starPieces((r.ids[10] ? r.ids[10].split("|") : []) as StarId[], locale, prefs)} />
                </td>
                <td>
                  <ChineseTermPieces text={r.links} pieces={() => (r.place ? natalLinkPieces(interactions, r.place, locale, prefs) : meetPieces(timeMeets(r), locale, prefs, "place"))} />
                </td>
                <td>{r.place ? <ChineseTermPieces text={r.points} pieces={() => pointPieces(baziBalance(c), r.place!, locale, prefs)} /> : r.points}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      ),
    },
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
                  <td>
                    <ChineseTermWord family="pillar" id={SIXTY[p.pillar.cycle]!.id}>
                      {chineseLabel(SIXTY[p.pillar.cycle]!, locale, prefs).text}
                    </ChineseTermWord>
                  </td>
                  <td>
                    {p.god ? (
                      <ChineseTermWord family="ten-god" id={p.god}>
                        {stemGodName(p, locale, prefs)}
                      </ChineseTermWord>
                    ) : (
                      <ChineseTermWord family="bazi-concept" id="day-master">
                        {stemGodName(p, locale, prefs)}
                      </ChineseTermWord>
                    )}
                  </td>
                  <td data-testid={`bazi-hidden-cell-${p.id}`}>
                    <ChineseTermPieces text={hiddenGodsLine(p, locale, prefs)} pieces={() => hiddenGodPieces(c.dayMaster, p.branch, locale, prefs)} />
                  </td>
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
              <td colSpan={3}>
                <ChineseTermPieces text={signs.empty.map((b) => chineseLabel(BRANCHES[b]!, locale, prefs).text).join(" · ")} pieces={() => emptyPieces(signs.empty, locale, prefs)} />
              </td>
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
                <td>
                  <ChineseTermPieces text={ix.items.map((n) => ixItemShort(ix, n, locale, prefs)).join(" · ")} pieces={() => ixItemPieces(ix, locale, prefs)} />
                </td>
                <td>
                  <ChineseTermPieces text={ixStatus(ix, locale)} pieces={() => ixResultPieces(ix, locale)} />
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      ) : (
        <p className="text-sm text-fg-muted">{w("bzIxNone")}</p>
      ),
    },
    {
      id: "balance",
      label: w("bzPartBalance"),
      hint: w("bzPartBalanceHint"),
      copyText: partText("balance"),
      table: csvOf(["phase", "analysis"]),
      children: (
        <>
          <DataTable className="ulune-zk-tbl">
            <thead>
              <tr>
                <th data-col="phase">{w("bzPhase")}</th>
                <th>{w("bzPointsCol")}</th>
                <th>{w("bzShareCol")}</th>
                <th>{w("bzToDm")}</th>
              </tr>
            </thead>
            <tbody>
              {bal.phases.map((p, i) => (
                <tr key={i} data-testid={`bazi-phaserow-${i}`}>
                  <th scope="row">
                    <ChineseTermPieces text={p.phase} pieces={() => [{ text: p.phase, family: "phase", id: baziBalance(c).phases[i]?.phase }]} />
                  </th>
                  <td>{p.points}</td>
                  <td>{p.share}</td>
                  <td>{p.family}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
          <DataTable className="ulune-zk-tbl">
            <tbody>
              {bal.summary.map(([k, v], i) => (
                <tr key={i} data-testid={`bazi-sumrow-${i}`}>
                  <th scope="row">{k}</th>
                  <td>
                    <ChineseTermPieces text={v} pieces={() => summaryPieces(c, k, locale, prefs) ?? [{ text: v }]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </>
      ),
    },
  ];
  const file = `${name || "bazi"} bazi`;
  return (
    <div data-testid="bazi-table" data-chart-pick data-selected={selectedId ?? ""} className="min-w-0">
      <TablePage name="bazi" label={t("tableSections")} parts={parts} fileStem={file} actions={<TableActions text={() => text().map((p) => p.lines.join("\n")).join("\n\n")} csv={() => baziTableCsv(c, time)} fileName={file} />} />
    </div>
  );
}
