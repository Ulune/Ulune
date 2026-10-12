import { Suspense, useMemo } from "react";
import { AnimalGlyph } from "@/components/animal-glyph";
import { LoadingLines } from "@/components/loading-lines";
import { chartDisplayName } from "@/lib/chart/library";
import { BRANCHES } from "@/lib/chinese/names";
import { chineseLabel } from "@/lib/chinese/prefs";
import { relationTone } from "@/lib/chinese/relations";
import { useChinesePrefs } from "@/lib/chinese/use-chinese-prefs";
import { cnWord } from "@/lib/chinese/words";
import type { ZodiacChart, ZodiacPlaceId } from "@/lib/chinese/zodiac";
import { PLACE_WORD, placeRef, zodiacReading } from "@/lib/chinese/zodiac-reading";
import { pairMeetings, type PairMeeting } from "@/lib/chinese/zodiac-time";
import { meetName, meetingLine, meetingRef, pairMeetingReading } from "@/lib/chinese/zodiac-time-reading";
import { previewProps } from "@/lib/depth/preview-bus";
import { useI18n } from "@/lib/i18n/locale";
import { lazyNamed, prefetch } from "@/lib/lazy-component";
import { cn } from "@/lib/utils";
import { useModeData } from "@/studio/modes/data";
import { useZodiacOf } from "@/studio/modes/hooks/useZodiac";
import { MODE_META } from "@/studio/modes/meta";
import { PairSelects, type PairPick } from "@/studio/modes/pair-selects";
import { usePairPick } from "@/studio/modes/hooks/usePairPick";
import type { ModeDef, ModeRuntime } from "@/studio/modes/types";
import { useWheelView } from "@/studio/modes/wheel-view";
import { AnimalWheel, type WheelBadge, type WheelLine } from "@/studio/modes/zodiac-wheel";
import { useStudioStore } from "@/studio/store";
import "@/studio/modes/styles/zodiac.css";
import "@/studio/modes/styles/zodiac-time.css";
import "@/studio/modes/styles/pair.css";

/*
 * Chinese astrology's Relationship lens (languages plan, part 11: "in the
 * Pair group, two charts' animals on one wheel, with each relation named and
 * read"), at /chinese-astrology/pair. The chart shown is A, the second person
 * B: the same second person as synastry's, chosen in the lists above the
 * figure. A's animals are filled badges, B's rings; the harmonies, trines and
 * clashes between A's and B's animals are drawn across; beside the wheel,
 * the year animals' meeting, the day animals' (the self with a partner) and
 * every other, each opening its reading. Worked out here; nothing is sent.
 */

export type ZodiacPairState = {
  pick: PairPick | null;
  a: ZodiacChart | null;
  b: ZodiacChart | null;
  names: { a: string; b: string };
  meetings: PairMeeting[];
  enabled: boolean;
};

/** A person's place on this page ("zkp:a:year", "zkp:b:day"). */
export const personRef = (person: "a" | "b", id: ZodiacPlaceId): string => `zkp:${person}:${id}`;

const initial = (word: string) => word.charAt(0).toUpperCase();

/** The lines across: harmonies and trines solid, clashes dashed, once for each pair of animals. */
function linesOf(meetings: readonly PairMeeting[]): WheelLine[] {
  const seen = new Set<string>();
  const out: WheelLine[] = [];
  for (const m of meetings) {
    const kind = m.kinds.find((k) => k === "harmony" || k === "trine" || k === "clash");
    if (!kind || m.branchA === m.branchB) continue;
    const key = `${Math.min(m.branchA, m.branchB)}-${Math.max(m.branchA, m.branchB)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ref: meetingRef(m), kind: kind as WheelLine["kind"], a: m.branchA, b: m.branchB });
  }
  return out;
}

function PairWheel({ a, b, names, meetings }: { a: ZodiacChart; b: ZodiacChart; names: { a: string; b: string }; meetings: PairMeeting[] }) {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const badges = useMemo<WheelBadge[]>(
    () =>
      (["a", "b"] as const).flatMap((person) =>
        (person === "a" ? a : b).places.map((p) => ({
          key: `${person}-${p.id}`,
          branch: p.branch,
          initial: initial(cnWord(locale, PLACE_WORD[p.id])),
          ref: personRef(person, p.id),
          place: p.id,
          testId: `zodiac-pair-badge-${person}-${p.id}`,
          uncertain: p.uncertain,
          person,
        })),
      ),
    [a, b, locale],
  );
  const lines = useMemo(() => linesOf(meetings), [meetings]);
  const ya = a.places[0]!;
  const yb = b.places[0]!;
  const mine = (branch: number) =>
    (["a", "b"] as const)
      .flatMap((person) =>
        (person === "a" ? a : b).places
          .filter((p) => p.branch === branch)
          .map((p) => `${names[person]}: ${cnWord(locale, PLACE_WORD[p.id]).toLowerCase()}`),
      )
      .join(", ");
  return (
    <AnimalWheel
      badges={badges}
      lines={lines}
      mine={mine}
      stopBranch={ya.branch}
      nowYearBranch={a.now.year.branch}
      nowMonthBranch={a.now.month.branch}
      centre={{
        hanzi: null,
        name: `${chineseLabel(BRANCHES[ya.branch]!, locale, prefs).name} · ${chineseLabel(BRANCHES[yb.branch]!, locale, prefs).name}`,
        sub: cnWord(locale, "zkPairCentre"),
      }}
      label={cnWord(locale, "zkWheel")}
    />
  );
}

/** One meeting as a row: its kinds, A's animal and B's. */
function MeetingRow({ m, names, big }: { m: PairMeeting; names: { a: string; b: string }; big?: boolean }) {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const w = useWheelView();
  const ref = meetingRef(m);
  const on = w.selectedId === ref;
  const first = m.kinds[0]!;
  return (
    <button
      type="button"
      className={cn("ulune-zkp-row", big && "is-big", on && "is-on")}
      data-testid={`zodiac-pair-${m.a}-${m.b}`}
      data-tone={first === "same" ? "same" : relationTone(first)}
      aria-pressed={on}
      onClick={() => w.choose(ref)}
      {...previewProps(ref)}
    >
      <span className="ulune-zkp-kinds">{m.kinds.map((k) => chineseLabel(meetName(k, false), locale, prefs).name).join(", ")}</span>
      <span className="ulune-zkp-pair">
        <span className="ulune-zkp-who">
          <AnimalGlyph animal={m.branchA} size={big ? 26 : 18} />
          <span>
            {names.a} · {cnWord(locale, PLACE_WORD[m.a]).toLowerCase()}
          </span>
        </span>
        <span aria-hidden>–</span>
        <span className="ulune-zkp-who is-b">
          <AnimalGlyph animal={m.branchB} size={big ? 26 : 18} />
          <span>
            {names.b} · {cnWord(locale, PLACE_WORD[m.b]).toLowerCase()}
          </span>
        </span>
      </span>
    </button>
  );
}

function PairFigure() {
  const { locale } = useI18n();
  const data = useModeData("zodiac-pair");
  const partnerBirth = useStudioStore((s) => s.pair.addingPartnerFor === "zodiac-pair");
  if (!data?.a) return null;
  if (!data.b) {
    if (partnerBirth) return <div data-testid="zodiac-pair-need-second" className="hidden" />;
    return (
      <div data-testid="zodiac-pair-need-second" className="grid min-h-[12rem] place-items-center px-4 text-center">
        <button
          type="button"
          data-testid="zodiac-pair-add-second-wheel"
          onClick={() => data.pick?.addSecond()}
          className="inline-flex min-h-[var(--btn-h)] items-center justify-center rounded-md px-4 font-display text-2xl leading-none text-fg hover:text-fg-muted"
        >
          {cnWord(locale, "zkPairAdd")}
        </button>
      </div>
    );
  }
  const { a, b, names, meetings } = data;
  const years = meetings.find((m) => m.a === "year" && m.b === "year");
  const days = meetings.find((m) => m.a === "day" && m.b === "day");
  const rest = meetings.filter((m) => m !== years && m !== days);
  return (
    <div className="ulune-zk ulune-zkp" data-testid="zodiac-pair" data-chart-pick>
      <div className="ulune-zk-wheel-box">
        <PairWheel a={a} b={b} names={names} meetings={meetings} />
      </div>
      <div className="ulune-zkp-list">
        <p className="ulune-zkp-key" data-testid="zodiac-pair-key">
          <span className="ulune-zkp-dot" aria-hidden /> {names.a} <span className="ulune-zkp-dot is-b" aria-hidden /> {names.b}
        </p>
        <h2 className="ulune-zky-h">{cnWord(locale, "zkPairYearsHead")}</h2>
        {years ? <MeetingRow m={years} names={names} big /> : <p className="ulune-zkp-none" data-testid="zodiac-pair-years-none">{cnWord(locale, "zkPairYearsNone")}</p>}
        <h2 className="ulune-zky-h">{cnWord(locale, "zkPairDaysHead")}</h2>
        {days ? <MeetingRow m={days} names={names} big /> : <p className="ulune-zkp-none" data-testid="zodiac-pair-days-none">{cnWord(locale, "zkPairDaysNone")}</p>}
        {rest.length ? (
          <>
            <h2 className="ulune-zky-h">{cnWord(locale, "zkPairOthersHead")}</h2>
            <ul className="ulune-zkp-rows" data-testid="zodiac-pair-others">
              {rest.map((m) => (
                <li key={meetingRef(m)}>
                  <MeetingRow m={m} names={names} />
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </div>
  );
}

function PairControls() {
  const data = useModeData("zodiac-pair");
  if (!data?.pick) return null;
  return <PairSelects mode="synastry" pair={data.pick} prefix="zodiac-pair" page="zodiac-pair" />;
}

/** The side panel with nothing chosen: what the page compares, then every meeting as a line. */
function PairHello() {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const w = useWheelView();
  const data = useModeData("zodiac-pair");
  if (!data?.a) return null;
  if (!data.b) {
    return (
      <section className="ulune-zk-hello" data-testid="zodiac-pair-hello" data-empty="1">
        <button type="button" data-testid="zodiac-pair-add-second-panel" onClick={() => data.pick?.addSecond()} className="inline-flex min-h-11 items-center rounded-md font-display text-xl leading-tight text-fg hover:text-fg-muted">
          {cnWord(locale, "zkPairAdd")}
        </button>
      </section>
    );
  }
  return (
    <section className="ulune-zk-hello" data-testid="zodiac-pair-hello">
      <h2 className="ulune-zk-hello-h">{cnWord(locale, "zkPairTitle")}</h2>
      <p className="ulune-zk-hello-p">{cnWord(locale, "zkAboutPair1")}</p>
      <ul className="ulune-zk-hello-list">
        {data.meetings.map((m) => (
          <li key={meetingRef(m)}>
            <button type="button" className="ulune-zk-hello-row is-rel" data-tone={m.kinds[0] === "same" ? "same" : relationTone(m.kinds[0]!)} onClick={() => w.pick(meetingRef(m))}>
              <span>{meetingLine(m, data.names, locale, prefs)}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

const loadTable = () => import("@/studio/tables/zodiac-pair-table");
const ZodiacPairTable = lazyNamed(loadTable, "ZodiacPairTable");

function PairData() {
  const data = useModeData("zodiac-pair");
  const w = useWheelView();
  if (!data?.a || !data.b) return null;
  return (
    <Suspense fallback={<LoadingLines testId="table-loading" lines={6} />}>
      <ZodiacPairTable meetings={data.meetings} names={data.names} selectedId={w.selectedId} onSelect={w.pick} />
    </Suspense>
  );
}

function usePairRuntime(): ModeRuntime<ZodiacPairState> {
  const { locale, t } = useI18n();
  const prefs = useChinesePrefs();
  const page = useStudioStore((s) => s.page);
  const chart = useStudioStore((s) => s.chart);
  const selectedId = useStudioStore((s) => s.selectedId);
  const enabled = page === "zodiac-pair" && Boolean(chart);
  const { pick, inner, chartB } = usePairPick(enabled, "zodiac-pair");
  const a = useZodiacOf(inner, prefs, enabled);
  const b = useZodiacOf(chartB, prefs, enabled);
  const names = useMemo(
    () => ({
      a: inner ? chartDisplayName(inner.meta, t("untitled")) : "A",
      b: chartB ? chartDisplayName(chartB.meta, t("untitled")) : "B",
    }),
    [inner, chartB, t],
  );
  const meetings = useMemo(() => (a && b ? pairMeetings(a, b) : []), [a, b]);
  const reading = useMemo(() => {
    if (!a || !selectedId) return null;
    const meet = meetings.find((m) => meetingRef(m) === selectedId);
    if (meet && b) return pairMeetingReading(meet, a, b, names, locale, prefs);
    const who = /^zkp:(a|b):(year|month|day|hour)$/.exec(selectedId);
    if (who) {
      const z = who[1] === "a" ? a : b;
      if (!z) return null;
      const r = zodiacReading(z, placeRef(who[2] as ZodiacPlaceId), locale, prefs, (who[1] === "a" ? inner : chartB)?.meta.timezone);
      return r ? { ...r, id: selectedId, kicker: `${names[who[1] as "a" | "b"]} · ${r.kicker}` } : null;
    }
    // An animal of the wheel: read against A's animals, as on the natal page.
    return selectedId.startsWith("zk:branch:") ? zodiacReading(a, selectedId, locale, prefs) : null;
  }, [a, b, meetings, selectedId, names, locale, prefs, inner, chartB]);
  const data = useMemo(() => ({ pick, a, b, names, meetings, enabled }), [pick, a, b, names, meetings, enabled]);
  return useMemo(() => ({ data, reading }), [data, reading]);
}

export const zodiacPairMode: ModeDef = {
  ...MODE_META["zodiac-pair"],
  emptyText: (locale) => cnWord(locale, "zkEmpty"),
  Controls: PairControls,
  Figure: PairFigure,
  HelloEmpty: PairHello,
  Data: PairData,
  preloadData: () => prefetch(loadTable),
  useRuntime: usePairRuntime,
};
