import { directionName, mansionName } from "@/lib/chinese/fengshui-reading";
import { stateWord } from "@/lib/chinese/fengshui-cycles-reading";
import { personDirection } from "@/lib/chinese/fengshui-cycles";
import { FSP_NOW, fsNowDirLine, fsNowLead, fsNowMansions, fsNowRest, fsNowRows, fsNowWhen, fspNowRef, type FsNowNames, type FsPairNow } from "@/lib/chinese/fengshui-pair-now";
import { useI18n } from "@/lib/i18n/locale";
import { NowList, NowQuiet, NowRow, TwoNow } from "@/studio/modes/pair-now/now-parts";

/*
 * "You two, now" on Feng Shui's Relationship page (share and compare plan,
 * feature 5e): the year's and the month's flying stars over the directions
 * the two share (lib/chinese/fengshui-pair-now.ts, Feng Shui's Cycles read for
 * two): the direction to face together this year, each shared direction's
 * state under the year, those to rest. Two people of two groups share none:
 * each one's own direction to face this year. Beside the compass a choice
 * readies its reading; in the side panel it opens it.
 */
export function FsNow({ now, names, onFigure = false, ruled = false }: { now: FsPairNow; names: FsNowNames; onFigure?: boolean; ruled?: boolean }) {
  const { locale } = useI18n();
  const testId = onFigure ? "fengshui-pair-now-side" : "fengshui-pair-now";
  const rest = fsNowRest(now, locale);
  return (
    <TwoNow testId={testId} when={fsNowWhen(now, locale)} whenRef={FSP_NOW} lead={fsNowLead(now, names, locale)} ruled={ruled} side={onFigure}>
      <NowList testId={`${testId}-list`}>
        {fsNowRows(now).map((r) => {
          const shared = now.shared.find((s) => s.direction === r.direction);
          const own = r.who ? personDirection(now.people[r.who], r.direction) : null;
          return (
            <NowRow
              key={`${r.who ?? "both"}-${r.direction}`}
              refId={fspNowRef(r.direction)}
              testId={`${testId}-row`}
              onFigure={onFigure}
              mark={<span>★{(shared?.x ?? own)?.year}</span>}
              title={shared ? `${directionName(r.direction, locale)} · ${fsNowMansions(shared, locale)}` : `${names[r.who!]} · ${directionName(r.direction, locale)}`}
              sub={shared ? fsNowDirLine(shared, locale) : own ? `${mansionName(own.mansion, locale)} · ${stateWord(own.state, locale)}` : ""}
              data={{ "data-dir": r.direction, "data-state": (shared?.a ?? own)?.state, "data-face": now.face === r.direction ? "1" : undefined }}
            />
          );
        })}
      </NowList>
      {rest ? <NowQuiet testId={`${testId}-rest`}>{rest}</NowQuiet> : null}
    </TwoNow>
  );
}
