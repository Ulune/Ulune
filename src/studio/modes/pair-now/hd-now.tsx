import { LoadingLines } from "@/components/loading-lines";
import { HDP_NOW, hdpNowRef, type HdNowChannel, type HdPairNow, type HdPairPerson } from "@/lib/chart/hd-pair";
import type { HdNames } from "@/lib/chart/hd-focus";
import { pnwWord } from "@/lib/i18n/catalog/pair-now-west-words";
import { hdChannelCentersLine } from "@/lib/i18n/hd-ui";
import { useI18n } from "@/lib/i18n/locale";
import { hdNowCentresLine, hdNowTime, hdNowTitle, hdNowWith } from "@/studio/modes/pair-now/hd-now-words";
import { NowList, NowQuiet, NowRow, TwoNow } from "@/studio/modes/pair-now/now-parts";

/*
 * "You two, now" on Human Design's connection chart (share and compare plan,
 * feature 5e): the planets' gates at this moment over the two bodygraphs, the
 * slot the connection chart's first read left for it (design-pair.tsx). The
 * channels the moment completes for the two, each by what it meets (one
 * person's gate, a gate both hold, or the moment alone), and the centres it
 * defines between them; each row opens its reading and lights its channel on
 * the figure. The same part stands beside the figure on a wide screen.
 */

/** Whose gate the moment meets, as the page marks the two people: A's dot, B's ring, both, or the moment's spark. */
function ByMark({ by }: { by: HdNowChannel["by"] }) {
  if (by === "sky") return <span className="ulune-two-now-spark">✦</span>;
  return (
    <span className="ulune-two-now-who" data-by={by}>
      {by === "a" || by === "both" ? <span className="ulune-hdp-dot" /> : null}
      {by === "b" || by === "both" ? <span className="ulune-hdp-dot is-b" /> : null}
    </span>
  );
}

export function HdNow({
  now,
  at,
  people,
  names,
  failed,
  onFigure = false,
  ruled = false,
}: {
  now: HdPairNow | null;
  at: number;
  people: Record<HdPairPerson, string>;
  names: HdNames | null;
  failed: boolean;
  /** Beside the figure (a choice lights it) rather than in the side panel (a choice opens its reading). */
  onFigure?: boolean;
  ruled?: boolean;
}) {
  const { locale } = useI18n();
  const testId = onFigure ? "hd-pair-now-side" : "hd-pair-now";
  const centres = now ? hdNowCentresLine(now, locale) : "";
  return (
    <TwoNow testId={testId} when={hdNowTime(at, locale)} whenRef={HDP_NOW} lead={onFigure ? undefined : pnwWord(locale, "ptnHdLead")} ruled={ruled} side={onFigure}>
      {!now ? (
        failed ? <NowQuiet testId={`${testId}-error`}>{pnwWord(locale, "ptnHdFailed")}</NowQuiet> : <LoadingLines testId={`${testId}-loading`} lines={2} />
      ) : now.channels.length ? (
        <NowList testId={`${testId}-list`}>
          {now.channels.map((c) => (
            <NowRow
              key={c.channel.id}
              refId={hdpNowRef(c.channel.id)}
              testId={`${testId}-row`}
              onFigure={onFigure}
              mark={<ByMark by={c.by} />}
              title={hdNowTitle(c, names)}
              sub={`${hdNowWith(c, now.moment, people, locale)} · ${hdChannelCentersLine(locale, c.channel.centers[0], c.channel.centers[1])}`}
              data={{ "data-by": c.by, "data-channel": c.channel.id }}
            />
          ))}
        </NowList>
      ) : (
        <NowQuiet testId={`${testId}-quiet`}>{pnwWord(locale, "ptnHdQuiet")}</NowQuiet>
      )}
      {centres ? <NowQuiet testId={`${testId}-centres`}>{centres}</NowQuiet> : null}
    </TwoNow>
  );
}
