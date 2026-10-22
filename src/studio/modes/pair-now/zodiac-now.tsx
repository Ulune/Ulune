import { AnimalGlyph } from "@/components/animal-glyph";
import type { ZodiacChart } from "@/lib/chinese/zodiac";
import { useChinesePrefs } from "@/lib/chinese/use-chinese-prefs";
import { animalOf, cnWord } from "@/lib/chinese/words";
import {
  ZKP_NOW,
  ZKP_NOW_MONTH,
  nowKindLine,
  nowPersonTitle,
  nowYearTitle,
  togetherLine,
  toneOfKind,
  zkpNowRef,
  type NowNames,
  type ZodiacPairNow,
} from "@/lib/chinese/zodiac-pair-now";
import { meetLine } from "@/lib/chinese/zodiac-time-reading";
import { useI18n } from "@/lib/i18n/locale";
import { NowList, NowRow, TwoNow } from "@/studio/modes/pair-now/now-parts";

/*
 * "You two, now" on Chinese astrology's Relationship page (share and compare
 * plan, feature 5e): the year's animal for both people (the year ahead of
 * part 11, lib/chinese/zodiac-pair-now.ts): how each one's year animal meets
 * it, the solar month we are in for both, and a line for the two. Beside the
 * wheel a choice lights and readies its reading; in the side panel it opens
 * it.
 */
export function ZodiacNow({ now, z, names, onFigure = false, ruled = false }: { now: ZodiacPairNow; z: Record<"a" | "b", ZodiacChart>; names: NowNames; onFigure?: boolean; ruled?: boolean }) {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const testId = onFigure ? "zodiac-pair-now-side" : "zodiac-pair-now";
  const month = now.month;
  const monthTitle = month ? cnWord(locale, "zkNowMonth", { animal: animalOf(month.pillar.branch, locale) }) : "";
  return (
    <TwoNow testId={testId} when={nowYearTitle(now, locale, prefs)} whenRef={ZKP_NOW} lead={togetherLine(now, names, locale)} ruled={ruled} side={onFigure}>
      <NowList testId={`${testId}-list`}>
        {(["a", "b"] as const).map((who) => (
          <NowRow
            key={who}
            refId={zkpNowRef(who)}
            testId={`${testId}-${who}`}
            onFigure={onFigure}
            mark={<AnimalGlyph animal={z[who].places[0]!.branch} size={20} />}
            title={nowPersonTitle(now, who, z[who], names, locale, prefs)}
            sub={nowKindLine(now, who, locale, prefs)}
            data={{ "data-tone": toneOfKind(now.kinds[who]) }}
          />
        ))}
        {month ? (
          <NowRow
            refId={ZKP_NOW_MONTH}
            testId={`${testId}-month`}
            onFigure={onFigure}
            mark={<AnimalGlyph animal={month.pillar.branch} size={20} />}
            title={`${monthTitle.charAt(0).toUpperCase()}${monthTitle.slice(1)}`}
            sub={(["a", "b"] as const).map((p) => `${names[p]}, ${meetLine(now.monthKinds[p], locale, prefs, true).toLowerCase()}`).join(locale === "fr" ? "\u202f; " : "; ")}
          />
        ) : null}
      </NowList>
    </TwoNow>
  );
}
