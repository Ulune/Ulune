import { LoadingLines } from "@/components/loading-lines";
import { HDP_NOW, hdpNowRef, type HdPairNow, type HdPairPerson } from "@/lib/chart/hd-pair";
import type { HdNames } from "@/lib/chart/hd-focus";
import { pnWord } from "@/lib/i18n/catalog/pair-now-words";
import { pnwWord } from "@/lib/i18n/catalog/pair-now-west-words";
import { hdChannelCentersLine } from "@/lib/i18n/hd-ui";
import type { AppLocale } from "@/lib/i18n/messages";
import { hdNowCentresLine, hdNowTime, hdNowTitle, hdNowWith } from "@/studio/modes/pair-now/hd-now-words";
import { DataTable } from "@/studio/tables/DataTable";
import type { TablePart } from "@/studio/tables/TablePage";

/** "You two, now" as text, for Copy: its heading and moment, a line per channel, the centres. */
export function hdNowTextLines(now: HdPairNow, at: number, people: Record<HdPairPerson, string>, names: HdNames | null, locale: AppLocale): string[] {
  const colon = locale === "fr" ? "\u202f: " : ": ";
  return [
    `${pnWord(locale, "ptnHead")}${colon}${hdNowTime(at, locale)}`,
    ...(now.channels.length ? now.channels.map((c) => `${hdNowTitle(c, names)} · ${hdNowWith(c, now.moment, people, locale)} · ${hdChannelCentersLine(locale, c.channel.centers[0], c.channel.centers[1])}`) : [pnwWord(locale, "ptnHdQuiet")]),
    ...(now.centres.length ? [hdNowCentresLine(now, locale)] : []),
  ];
}

/** "You two, now" as rows for CSV: plain ids, the same in every language. */
export function hdNowRows(now: HdPairNow, at: number): string[][] {
  return [
    ["now", "at", "channel", "by", "held", "brings", "bodies"],
    ...now.channels.map((c) => ["now", new Date(at).toISOString(), c.channel.id, c.by, c.held == null ? "" : String(c.held), c.brings.join("|"), [...new Set(c.bodies)].join("|")]),
    ...now.centres.map((c) => ["nowcentre", new Date(at).toISOString(), c]),
  ];
}

/**
 * "You two, now" as a part of the connection chart's table (share and compare
 * plan, feature 5e): the channels the moment completes for the two, what each
 * meets and the moment's gates in it, and the centres it defines between them;
 * each row opens its reading; Copy and CSV like the other parts. It is there
 * with the connection chart, its lines while the moment's gates come (or why
 * they could not), so the table's bar does not change under the reader.
 */
export function hdNowPart(
  now: HdPairNow | null,
  failed: boolean,
  at: number,
  people: Record<HdPairPerson, string>,
  names: HdNames | null,
  locale: AppLocale,
  selectedId: string | null,
  onSelect: (id: string) => void,
): TablePart {
  const pick = (id: string, label: string) => (
    <button type="button" className="ulune-row-pick" aria-pressed={selectedId === id} onClick={() => onSelect(id)}>
      {label}
    </button>
  );
  return {
    id: "now",
    label: pnWord(locale, "ptnHead"),
    heading: `${pnWord(locale, "ptnHead")} · ${hdNowTime(at, locale)}`,
    hint: pnwWord(locale, "ptnPartHdHint"),
    copyText: () => (now ? hdNowTextLines(now, at, people, names, locale).join("\n") : ""),
    table: () => (now ? hdNowRows(now, at) : hdNowRows({ moment: [], channels: [], centres: [] }, at)),
    children: !now ? (
      failed ? (
        <p className="text-sm text-fg-muted" data-testid="hd-pair-now-table-error">
          {pnwWord(locale, "ptnHdFailed")}
        </p>
      ) : (
        <LoadingLines testId="hd-pair-now-table-loading" lines={3} />
      )
    ) : (
      <>
        {now.channels.length ? (
          <DataTable stickyFirst={false} className="ulune-two-now-tbl">
            <thead>
              <tr>
                <th data-col="channel">{pnwWord(locale, "ptnColChannel")}</th>
                <th data-col="with">{pnwWord(locale, "ptnColWith")}</th>
                <th data-col="centres">{pnwWord(locale, "ptnColCentres")}</th>
              </tr>
            </thead>
            <tbody data-testid="hd-pair-now-table">
              {now.channels.map((c) => {
                const id = hdpNowRef(c.channel.id);
                return (
                  <tr key={c.channel.id} data-testid="hd-pair-now-table-row" data-by={c.by} data-selected={selectedId === id ? "1" : undefined}>
                    <td data-col="channel">{pick(id, hdNowTitle(c, names))}</td>
                    <td data-col="with">{hdNowWith(c, now.moment, people, locale)}</td>
                    <td data-col="centres">{hdChannelCentersLine(locale, c.channel.centers[0], c.channel.centers[1])}</td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
        ) : (
          <p className="text-sm text-fg-muted" data-testid="hd-pair-now-table-quiet">
            {pick(HDP_NOW, pnwWord(locale, "ptnHdQuiet"))}
          </p>
        )}
        {now.centres.length ? (
          <p className="mt-2 text-sm text-fg-muted" data-testid="hd-pair-now-table-centres">
            {hdNowCentresLine(now, locale)}
          </p>
        ) : null}
      </>
    ),
  };
}
