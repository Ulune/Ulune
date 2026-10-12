import { chineseLabel } from "@/lib/chinese/prefs";
import { useChinesePrefs } from "@/lib/chinese/use-chinese-prefs";
import { cnWord } from "@/lib/chinese/words";
import { MOUNTAINS, norm360 } from "@/lib/chinese/fengshui-home";
import { FSH_FACING_REF, FSH_PERIOD_REF, edgeLine, facingLine, fmtDeg, fshHouseRef, fshMountainRef, houseLine, matchLines, mountainCode, periodLines, sourceLine, type HomeContext } from "@/lib/chinese/fengshui-home-reading";
import { homeTableCsv, homeTextParts } from "@/lib/chinese/fengshui-home-table";
import { countLabel, directionName } from "@/lib/chinese/fengshui-reading";
import { partRows } from "@/lib/csv";
import { useI18n } from "@/lib/i18n/locale";
import { DataTable } from "@/studio/tables/DataTable";
import { TableActions, TablePage, type TablePart } from "@/studio/tables/TablePage";

/** Feng Shui's home page as a table (languages plan, part 22); Copy and CSV. */
export function FengShuiHomeTable({ ctx, name, selectedId, onSelect }: { ctx: HomeContext; name: string; selectedId: string | null; onSelect: (id: string) => void }) {
  const { locale, t } = useI18n();
  const prefs = useChinesePrefs();
  const w = (key: Parameters<typeof cnWord>[1]) => cnWord(locale, key);
  const text = () => homeTextParts(ctx, name, locale, prefs);
  const partText = (id: string) => () => text().find((x) => x.id === id)?.lines.join("\n") ?? "";
  const csvOf = (kinds: string[]) => () => partRows(homeTableCsv(ctx), kinds);
  const pick = (id: string, label: string) => (
    <button type="button" className="ulune-zk-table-pick" onClick={() => onSelect(id)}>
      {label}
    </button>
  );
  const home = ctx.home;
  const rows: [string, string, string][] = home
    ? [
        [FSH_FACING_REF, w("fshFacingHead"), facingLine(home, locale, prefs)],
        [FSH_FACING_REF, w("fshMountainsHead"), edgeLine(home, locale, prefs)],
        [FSH_FACING_REF, w("fshHowHead"), sourceLine(home, locale)],
        ...ctx.people.map((fs) => [fshHouseRef(fs.count), `${w("fshHouseHead")}${ctx.people.length > 1 ? ` · ${countLabel(fs.count, locale)}` : ""}`, [houseLine(home, locale, prefs), ...matchLines(home, fs, locale)].join(" ")] as [string, string, string]),
      ]
    : [[FSH_FACING_REF, w("fshFacingHead"), w("fshNoFacing")]];
  rows.push([FSH_PERIOD_REF, w("fshPeriodHead"), periodLines(ctx, locale).join(" ")]);
  const parts: TablePart[] = [
    {
      id: "facing",
      label: w("fshFacingHead"),
      hint: w("fshPartFacingHint"),
      copyText: partText("facing"),
      table: csvOf(["facing"]),
      children: (
        <DataTable className="ulune-zk-tbl">
          <tbody>
            {rows.map(([id, k, v], i) => (
              <tr key={i} data-testid={`fengshui-home-row-${i}`} data-selected={selectedId === id ? "1" : undefined}>
                <th scope="row">{pick(id, k)}</th>
                <td>{v}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      ),
    },
    {
      id: "mountains",
      label: w("fshMountainsHead"),
      hint: w("fshPartMountainsHint"),
      copyText: partText("mountains"),
      table: csvOf(["mountain"]),
      children: (
        <DataTable className="ulune-zk-tbl" wide>
          <thead>
            <tr>
              <th>{w("fshMountainCol")}</th>
              <th data-col="code">{w("fsDirection")}</th>
              <th>{w("fshFromCol")}</th>
              <th>{w("fshToCol")}</th>
              <th>{w("fshHomeCol")}</th>
            </tr>
          </thead>
          <tbody>
            {MOUNTAINS.map((m) => {
              const id = fshMountainRef(m.id);
              const here = home?.facingMountain.id === m.id ? w("fshDialFacing") : home?.sittingMountain.id === m.id ? w("fshDialSitting") : "";
              return (
                <tr key={m.id} data-testid={`fengshui-home-mrow-${m.id}`} data-home={here ? "1" : undefined} data-selected={selectedId === id ? "1" : undefined}>
                  <th scope="row">{pick(id, chineseLabel(m, locale, prefs).text)}</th>
                  <td>
                    {mountainCode(m, locale)} · {directionName(m.direction, locale)}
                  </td>
                  <td>{fmtDeg(norm360(m.degrees - 7.5), locale)}</td>
                  <td>{fmtDeg(norm360(m.degrees + 7.5), locale)}</td>
                  <td>{here}</td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      ),
    },
  ];
  const file = `${name || "ulune"} feng shui home`;
  return (
    <div data-testid="fengshui-home-table" data-chart-pick data-selected={selectedId ?? ""} className="min-w-0">
      <TablePage name="fengshui-home" label={t("tableSections")} parts={parts} fileStem={file} actions={<TableActions text={() => text().map((x) => x.lines.join("\n")).join("\n\n")} csv={() => homeTableCsv(ctx)} fileName={file} />} />
    </div>
  );
}
