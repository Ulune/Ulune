import { LoadingLines } from "@/components/loading-lines";
import { NOW_REF } from "@/lib/chart/pair-now";
import type { SkyAspect } from "@/lib/chart/sky-events";
import { localizeError } from "@/lib/i18n/errors";
import { pnwWord } from "@/lib/i18n/catalog/pair-now-west-words";
import { useI18n } from "@/lib/i18n/locale";
import { nowDetail, nowPhrase, nowToday } from "@/lib/i18n/pair-now-astro";
import type { PairNowSky } from "@/studio/modes/hooks/usePairNowSky";
import { NowList, NowQuiet, NowRow, TwoNow } from "@/studio/modes/pair-now/now-parts";
import { NowPairIcon } from "@/studio/modes/pair-now/now-icon";

/*
 * "You two, now" on astrology's Relationship pages (share and compare plan,
 * feature 5e): under the side panel's first read on Synastry and Composite,
 * today's contacts of the sky with the relationship's own chart (the
 * composite or the Davison), the slow planets first, each opening its
 * reading; the day itself opens the part's. A chunk of its own, with its
 * style sheet, fetched once both people are there (synastry.tsx and
 * composite.tsx are fetched at idle with the first page, so this stays out of
 * them). The sky comes from the page's runtime (hooks/usePairNowSky.ts).
 */
export function AstroNow({ page, now, davison }: { page: "synastry" | "composite"; now: PairNowSky; davison: boolean }) {
  const { locale } = useI18n();
  const testId = `${page}-now`;
  return (
    <TwoNow testId={testId} when={nowToday(now.at, locale)} whenRef={NOW_REF} lead={pnwWord(locale, "ptnAstroLead")} ruled>
      {now.error ? (
        <>
          <NowQuiet testId={`${testId}-error`}>{localizeError(now.error, locale, "couldNotCastSky") || pnwWord(locale, "ptnAstroFailed")}</NowQuiet>
          <button type="button" className="ulune-two-now-retry" onClick={now.retry}>
            {pnwWord(locale, "ptnRetry")}
          </button>
        </>
      ) : !now.sky ? (
        <LoadingLines testId={`${testId}-loading`} lines={2} />
      ) : now.contacts.length ? (
        <NowList testId={`${testId}-list`}>
          {now.contacts.map((c) => (
            <NowRow
              key={c.ref}
              refId={c.ref}
              testId={`${testId}-row`}
              mark={<NowPairIcon a={c.link.a} type={c.link.type as SkyAspect} b={c.link.b} size={14} />}
              title={nowPhrase(c.link, locale)}
              sub={nowDetail(c, locale)}
              data={{ "data-slow": c.slow ? "1" : undefined, "data-chart": davison ? "davison" : "composite" }}
            />
          ))}
        </NowList>
      ) : (
        <NowQuiet testId={`${testId}-quiet`}>{pnwWord(locale, "ptnAstroQuiet")}</NowQuiet>
      )}
    </TwoNow>
  );
}
