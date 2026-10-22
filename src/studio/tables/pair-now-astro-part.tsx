import { LoadingLines } from "@/components/loading-lines";
import { NOW_REF, type NowContact } from "@/lib/chart/pair-now";
import type { SkyAspect } from "@/lib/chart/sky-events";
import { pnWord } from "@/lib/i18n/catalog/pair-now-words";
import { pnwWord } from "@/lib/i18n/catalog/pair-now-west-words";
import { nowDay, nowMotion, nowPhrase, nowRows, nowTextLines, nowToday } from "@/lib/i18n/pair-now-astro";
import { formatArc } from "@/lib/utils";
import { DataTable } from "@/studio/tables/DataTable";
import type { TablePart } from "@/studio/tables/TablePage";
import { NowPairIcon } from "@/studio/modes/pair-now/now-icon";

/** What the table's part reads: today's contacts, the moment they were cast for, whether the sky is here yet or could not be had. */
export type AstroNowTable = { contacts: readonly NowContact[]; at: number; ready: boolean; failed: boolean };

/**
 * "You two, now" as a part of Synastry's and Composite's tables (share and
 * compare plan, feature 5e): today's contacts of the sky with the
 * relationship's chart, each with its orb, its motion and when it is exact,
 * each opening its reading; Copy and CSV like the other parts. The part is
 * there as soon as both people are, so the table's bar does not change under
 * the reader: its lines while the sky is cast, or why it could not be.
 */
export function astroNowPart(now: AstroNowTable, locale: string, selectedId: string | null, onSelect: (id: string) => void): TablePart {
  const pick = (id: string, label: string) => (
    <button type="button" className="ulune-row-pick" aria-pressed={selectedId === id} onClick={() => onSelect(id)}>
      {label}
    </button>
  );
  return {
    id: "now",
    label: pnWord(locale, "ptnHead"),
    heading: `${pnWord(locale, "ptnHead")} · ${nowToday(now.at, locale)}`,
    hint: pnwWord(locale, "ptnPartAstroHint"),
    copyText: () => (now.ready ? nowTextLines(now.contacts, now.at, locale).join("\n") : ""),
    table: () => nowRows(now.ready ? now.contacts : [], now.at),
    children: !now.ready ? (
      now.failed ? (
        <p className="text-sm text-fg-muted" data-testid="pair-now-table-error">
          {pnwWord(locale, "ptnAstroFailed")}
        </p>
      ) : (
        <LoadingLines testId="pair-now-table-loading" lines={3} />
      )
    ) : now.contacts.length ? (
      <DataTable stickyFirst={false} className="ulune-two-now-tbl">
        <thead>
          <tr>
            <th data-col="contact">{pnwWord(locale, "ptnColContact")}</th>
            <th data-col="orb">{pnwWord(locale, "ptnColOrb")}</th>
            <th data-col="motion">{pnwWord(locale, "ptnColMotion")}</th>
            <th data-col="exact">{pnwWord(locale, "ptnColExact")}</th>
          </tr>
        </thead>
        <tbody data-testid="pair-now-table">
          {now.contacts.map((c) => {
            const exact = c.link.exactUtc ? Date.parse(c.link.exactUtc) : Number.NaN;
            return (
              <tr key={c.ref} data-testid="pair-now-table-row" data-ref={c.ref} data-selected={selectedId === c.ref ? "1" : undefined}>
                <td data-col="contact">
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-flex shrink-0 text-fg-muted" aria-hidden>
                      <NowPairIcon a={c.link.a} type={c.link.type as SkyAspect} b={c.link.b} size={14} />
                    </span>
                    {pick(c.ref, nowPhrase(c.link, locale))}
                  </span>
                </td>
                <td data-col="orb" className="font-mono tabular-nums">
                  {formatArc(c.link.orb)}
                </td>
                <td data-col="motion">{nowMotion(c.link.applying, locale) || "—"}</td>
                <td data-col="exact" className="whitespace-nowrap">
                  {Number.isFinite(exact) ? nowDay(exact, locale) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </DataTable>
    ) : (
      <p className="text-sm text-fg-muted" data-testid="pair-now-table-quiet">
        {pick(NOW_REF, pnwWord(locale, "ptnAstroQuiet"))}
      </p>
    ),
  };
}
