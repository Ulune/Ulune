import { ChineseTermWord } from "@/encyclopedia/ChineseTermWord";
import type { BaziChart, BaziPlaceId } from "@/lib/chinese/bazi";
import { PILLAR_WORD, stemRef } from "@/lib/chinese/bazi-reading";
import { SIXTY } from "@/lib/chinese/names";
import { chineseLabel } from "@/lib/chinese/prefs";
import { useChinesePrefs } from "@/lib/chinese/use-chinese-prefs";
import { cnWord } from "@/lib/chinese/words";
import { useI18n } from "@/lib/i18n/locale";
import { pillarGod } from "@/studio/compare/shared-bazi";
import { TableFrame, type MergedPick } from "@/studio/compare/merged";

/*
 * Compare's one BaZi table for two people (merged.tsx): the four pillars,
 * each person's with the god of its stem (as the page's table gives them,
 * studio/tables/bazi-table.tsx), an A column and a B column; a row chooses its
 * pillar in both charts. BaZi's helpers come with shared-bazi.ts's (it says
 * why).
 */

export function BaziPillarsMerged({ a, b, nameA, nameB, selectedId, onSelect }: { a: BaziChart; b: BaziChart; nameA: string; nameB: string } & MergedPick) {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const cell = (c: BaziChart, place: BaziPlaceId) => {
    const pl = c.pillars.find((x) => x.id === place);
    if (!pl) return <span className="ulune-num-none">—</span>;
    return (
      <>
        <ChineseTermWord family="pillar" id={SIXTY[pl.pillar.cycle]!.id}>
          {chineseLabel(SIXTY[pl.pillar.cycle]!, locale, prefs).text}
        </ChineseTermWord>
        <span className="ulune-cell-sub">{chineseLabel(pillarGod(pl), locale, prefs).text}</span>
      </>
    );
  };
  return (
    <TableFrame className="ulune-zk-tbl ulune-bz-merged">
      <thead>
        <tr>
          <th data-col="place">{cnWord(locale, "zkPillar")}</th>
          <th data-col="a">{`A · ${nameA}`}</th>
          <th data-col="b">{`B · ${nameB}`}</th>
        </tr>
      </thead>
      <tbody>
        {(["year", "month", "day", "hour"] as const).map((place) => {
          const ref = stemRef(place);
          const on = selectedId === ref;
          return (
            <tr key={place} data-testid={`bazi-merged-${place}`} data-selected={on ? "1" : undefined} className={on ? "bg-bg-subtle" : undefined}>
              <th scope="row">
                <button type="button" className="ulune-zk-table-pick" aria-pressed={on} onClick={() => onSelect(ref)}>
                  {cnWord(locale, PILLAR_WORD[place])}
                </button>
              </th>
              <td>{cell(a, place)}</td>
              <td>{cell(b, place)}</td>
            </tr>
          );
        })}
      </tbody>
    </TableFrame>
  );
}
