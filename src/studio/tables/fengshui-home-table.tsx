import { ChineseTermPieces, ChineseTermWord } from "@/encyclopedia/ChineseTermWord";
import { withTrigrams } from "@/components/trigram-mark";
import { chineseLabel } from "@/lib/chinese/prefs";
import { useChinesePrefs } from "@/lib/chinese/use-chinese-prefs";
import { cnWord } from "@/lib/chinese/words";
import { MOUNTAINS, norm360 } from "@/lib/chinese/fengshui-home";
import { FSH_FACING_REF, FSH_PERIOD_REF, edgeLine, facingLine, fmtDeg, fshHouseRef, fshMountainRef, houseLine, matchLines, mountainCode, periodLines, sourceLine, type HomeContext } from "@/lib/chinese/fengshui-home-reading";
import { homeTableCsv, homeTextParts } from "@/lib/chinese/fengshui-home-table";
import { FLIGHT } from "@/lib/chinese/fengshui-stars";
import { pairKey } from "@/lib/chinese/fengshui-pairs";
import { joinPieces } from "@/lib/chinese/term-pieces";
import { chartName, chartWord, formationName, fssChartRef, fssPalaceRef, pairName, palaceName, roomsChart } from "@/lib/chinese/fengshui-stars-reading";
import * as READING_TEXTS from "@/lib/chinese/fengshui-readings-texts";
import { AFFLICTION_IDS, FSY_MONTH_REF, FSY_YEAR_REF, afflictionName, afflictionPlace, fsyAffRef, monthLine, yearLine } from "@/lib/chinese/fengshui-years-reading";
import { roomsIn } from "@/lib/chinese/fengshui-rooms";
import { listWords, roomLines, roomName } from "@/lib/chinese/fengshui-rooms-reading";
import { countLabel, directionName } from "@/lib/chinese/fengshui-reading";
import { partRows } from "@/lib/csv";
import { useI18n } from "@/lib/i18n/locale";
import { DataTable } from "@/studio/tables/DataTable";
import { TableActions, TablePage, type TablePart } from "@/studio/tables/TablePage";

/**
 * Feng Shui's home page as a table (languages plan, part 22); Copy and CSV. Its stars, pairs and formations link to the
 * encyclopedia once written (part 29). The review's fixes (part 27): the rooms read against the chart picked on the
 * figure (FS30), the house's trigram drawn (FS7).
 */
export function FengShuiHomeTable({ ctx: given, name, selectedId, onSelect }: { ctx: HomeContext; name: string; selectedId: string | null; onSelect: (id: string) => void }) {
  // The pairs' names (part 27) come with the table, whether or not the page has its texts yet.
  const ctx: HomeContext = given.stars && !given.stars.texts ? { ...given, texts: READING_TEXTS, stars: { ...given.stars, texts: READING_TEXTS } } : given;
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
  // The rooms are read against the chart picked on the figure (FS30).
  const against = ctx.stars ? roomsChart(ctx.stars) : null;
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
        // Sentences in the last column: they wrap within the table (fengshui.css, .ulune-fs-prose).
        <DataTable className="ulune-zk-tbl ulune-fs-prose">
          <tbody>
            {rows.map(([id, k, v], i) => (
              <tr key={i} data-testid={`fengshui-home-row-${i}`} data-selected={selectedId === id ? "1" : undefined}>
                <th scope="row">{pick(id, k)}</th>
                {/* The house's trigram drawn, as on its card (FS7); the copy keeps the symbol. */}
                <td>{withTrigrams(v)}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      ),
    },
    {
      id: "stars",
      label: w("fssHead"),
      hint: w("fssPartHint"),
      copyText: partText("stars"),
      table: ctx.stars ? csvOf(["stars"]) : undefined,
      children: ctx.stars ? (
        <>
          {([["main", ctx.stars.main], ["ti", ctx.stars.ti]] as const).map(([v, chart]) =>
            chart ? (
              <DataTable key={v} className="ulune-zk-tbl" wide>
                <caption className="ulune-fss-caption">
                  {pick(fssChartRef(v), `${ctx.stars!.ti ? `${w(v === "ti" ? "fssTi" : "fssMain")} · ` : ""}${chartName(chart, locale, prefs)}`)}
                  {chart.formations.length ? (
                    <ChineseTermPieces
                      text={` · ${chart.formations.map((f) => formationName(f, locale, prefs)).join(", ")}`}
                      pieces={() => [{ text: " · " }, ...joinPieces(chart.formations.map((f) => ({ text: formationName(f, locale, prefs), family: "formation" as const, id: f })), ", ")]}
                    />
                  ) : (
                    ""
                  )}
                </caption>
                <thead>
                  <tr>
                    <th>{w("fssPalaceCol")}</th>
                    <th>{w("fssMountainStar")}</th>
                    <th>{w("fssWaterStar")}</th>
                    <th>{w("fssPeriodStar")}</th>
                    <th>{w("fssBaseCol")}</th>
                    <th>{w("fssPairCol")}</th>
                  </tr>
                </thead>
                <tbody>
                  {FLIGHT.map((p) => {
                    const x = chart.palaces[p];
                    const id = fssPalaceRef(v, p);
                    return (
                      <tr key={p} data-testid={`fengshui-stars-row-${v}-${p}`} data-selected={selectedId === id ? "1" : undefined}>
                        <th scope="row">{pick(id, palaceName(p, locale))}</th>
                        <td>
                          <ChineseTermWord family="flying-star" id={x.mountain}>
                            {x.mountain}
                          </ChineseTermWord>
                        </td>
                        <td>
                          <ChineseTermWord family="flying-star" id={x.water}>
                            {x.water}
                          </ChineseTermWord>
                        </td>
                        <td>
                          <ChineseTermWord family="flying-star" id={x.period}>
                            {x.period}
                          </ChineseTermWord>
                        </td>
                        <td>{x.base}</td>
                        <td>
                          <ChineseTermWord family="pairing" id={pairKey(x.mountain, x.water)}>
                            {pairName(x.mountain, x.water, READING_TEXTS, locale, { ...prefs, show: "names" })}
                          </ChineseTermWord>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </DataTable>
            ) : null,
          )}
        </>
      ) : (
        <p className="ulune-fsh-small">{w(ctx.home ? "fssNeedYear" : "fshNoFacing")}</p>
      ),
    },
    ...(ctx.rooms?.length
      ? [
          {
            id: "rooms",
            label: w("fsrHead"),
            hint: w("fsrPartHint"),
            copyText: partText("rooms"),
            table: csvOf(["room"]),
            children: (
              <>
                {/* Read against the chart picked on the figure, said near a mountain's edge (FS30). */}
                {ctx.stars?.ti && against ? (
                  <p className="ulune-fsh-small" data-testid="fengshui-rooms-table-against">
                    {cnWord(locale, "fsrAgainstPicked", { chart: chartWord(against.v, locale) })}
                  </p>
                ) : null}
                <DataTable className="ulune-zk-tbl ulune-fs-prose">
                  <thead>
                    <tr>
                      <th>{w("fssPalaceCol")}</th>
                      <th>{w("fsrRoomsCol")}</th>
                      {ctx.stars ? <th>{w("fsrReadCol")}</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {FLIGHT.filter((p) => roomsIn(ctx.rooms!, p).length).map((p) => {
                      const id = against ? fssPalaceRef(against.v, p) : null;
                      return (
                        <tr key={p} data-testid={`fengshui-rooms-row-${p}`} data-selected={id && selectedId === id ? "1" : undefined}>
                          <th scope="row">{id ? pick(id, palaceName(p, locale)) : palaceName(p, locale)}</th>
                          <td>{listWords(roomsIn(ctx.rooms!, p).map((r) => roomName(r.kind, locale)), locale)}</td>
                          {ctx.stars && against ? <td>{roomLines(against.chart, p, ctx.rooms!, ctx.stars.now, locale).slice(1).join(" ")}</td> : null}
                        </tr>
                      );
                    })}
                  </tbody>
                </DataTable>
              </>
            ),
          } satisfies TablePart,
        ]
      : []),
    ...(ctx.years
      ? [
          {
            id: "years",
            label: w("fsyHead"),
            hint: w("fsyPartHint"),
            copyText: partText("years"),
            table: csvOf(["years"]),
            children: (() => {
              const y = ctx.years!;
              const lead: [string, string, string][] = [
                [FSY_YEAR_REF, w("fsyYearStar"), yearLine(y, locale)],
                [FSY_MONTH_REF, w("fsyMonthStar"), monthLine(y, locale)],
                ...AFFLICTION_IDS.map((id) => [fsyAffRef(id), afflictionName(id, locale, prefs), afflictionPlace(y, id, locale, prefs)] as [string, string, string]),
              ];
              return (
                <>
                  <DataTable className="ulune-zk-tbl ulune-fs-prose">
                    <tbody>
                      {lead.map(([id, k, v], i) => (
                        <tr key={i} data-testid={`fengshui-years-row-${i}`} data-selected={selectedId === id ? "1" : undefined}>
                          <th scope="row">{pick(id, k)}</th>
                          <td>{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </DataTable>
                  <DataTable className="ulune-zk-tbl" wide>
                    <thead>
                      <tr>
                        <th>{w("fssPalaceCol")}</th>
                        <th>{w("fsyYearCol")}</th>
                        <th>{w("fsyMonthCol")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {FLIGHT.map((p) => (
                        <tr key={p} data-testid={`fengshui-years-prow-${p}`} data-five={y.afflictions.fiveYellow === p ? "1" : undefined}>
                          <th scope="row">{palaceName(p, locale)}</th>
                          <td>
                            <ChineseTermWord family="flying-star" id={y.yearChart[p]}>
                              {y.yearChart[p]}
                            </ChineseTermWord>
                          </td>
                          <td>
                            <ChineseTermWord family="flying-star" id={y.monthChart[p]}>
                              {y.monthChart[p]}
                            </ChineseTermWord>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </DataTable>
                </>
              );
            })(),
          } satisfies TablePart,
        ]
      : []),
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
