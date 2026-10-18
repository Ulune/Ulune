import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FigurePart } from "@/components/figure-keys";
import { ScopeCard } from "@/components/hd-card";
import { HumanDesignGraph, type HdPairFigure } from "@/components/humandesign-graph";
import { LoadingLines } from "@/components/loading-lines";
import { PickCard } from "@/components/pick-card";
import { useHdNames } from "@/components/use-hd-names";
import type { HdNames } from "@/lib/chart/hd-focus";
import {
  HD_PAIR_KINDS,
  HD_PAIR_PEOPLE,
  HDP_DEFINITION,
  HDP_OPEN,
  HDP_SUMMARY,
  hdPair,
  hdPairFocus,
  hdPairUncertain,
  hdpConditionRef,
  hdpKindRef,
  hdpPersonRef,
  parseHdpRef,
  type HdPairChannel,
  type HdPairContext,
  type HdPairKind,
  type HdPairPerson,
} from "@/lib/chart/hd-pair";
import { HD_CENTER_IDS, HD_GATE_CENTER, type HdCenterId, type HumanDesignChart } from "@/lib/chart/human-design";
import { chartDisplayName } from "@/lib/chart/library";
import type { NatalChart } from "@/lib/chart/types";
import { usePack } from "@/lib/content/packs";
import { previewProps } from "@/lib/depth/preview-bus";
import { door } from "@/lib/engine/door";
import { errorForState, localizeError } from "@/lib/i18n/errors";
import { hdCenterLabel, hdChannelCentersLine, hdDefinitionLabel, hdGateTitle, hdTypeLabel } from "@/lib/i18n/hd-ui";
import { hdPairWords, type HdPairWordKey } from "@/lib/i18n/catalog/hd-pair-words";
import { useI18n } from "@/lib/i18n/locale";
import type { AppLocale } from "@/lib/i18n/messages";
import { bookT } from "@/lib/i18n/words-book";
import { lazyNamed, prefetch } from "@/lib/lazy-component";
import { cn } from "@/lib/utils";
import { useModeData } from "@/studio/modes/data";
import { usePairPick } from "@/studio/modes/hooks/usePairPick";
import { hdKeyOf, keepHd, keptHd } from "@/studio/modes/hooks/useHumanDesign";
import { MODE_META } from "@/studio/modes/meta";
import { PairSelects, type PairPick } from "@/studio/modes/pair-selects";
import type { ModeDef, ModeRuntime } from "@/studio/modes/types";
import { useWheelView } from "@/studio/modes/wheel-view";
import { useKeptScroll } from "@/studio/return-parts";
import { useChartScope, useDomIds, useScopeKey, useScoped } from "@/studio/scope";
import { useReadingBeside, useScopedSelection } from "@/studio/scope-figure";
import { useStudioStore } from "@/studio/store";
import "@/studio/modes/styles/hd.css";
import "@/studio/modes/styles/first-read.css";
import "@/studio/modes/styles/pair.css";
import "@/studio/modes/styles/hd-pair.css";

/*
 * Human Design's Relationship lens, the connection chart (share and compare
 * plan, feature 5a), at /human-design/pair. A is the chart shown, B
 * synastry's partner (one second person for every Relationship page); Swap
 * and "Add someone" as on the others. Both bodygraphs are cast through the
 * door (on the device by default) and kept with the natal page's
 * (hooks/useHumanDesign.ts); lib/chart/hd-pair.ts reads them as one.
 *
 * The figure is the natal bodygraph's component given `pair`: each gate A's
 * (a filled disc), B's (a ring) or both's; the channels the two form, by
 * kind (A solid, B hollow, both cased; an electromagnetic channel's meeting
 * point marked with a spark); the centres defined between them filled, with
 * a mark for who defines them. One Tab stop and the arrows, as on the natal
 * page; on a phone a choice keeps the figure whole behind a one-line card.
 * Beside it: the two people, the four kinds (each a button that lights its
 * channels and opens its reading), the centres' key, the conditioning both
 * ways, the open ground and the definition together. The side panel's first
 * read takes the same steps; its readings come with their own reading
 * pack (pack-hd-pair.ts: lib/chart/interpret-hd-pair.ts and its texts),
 * so the bodygraph's own pack stays as it was. Worked out here; nothing is
 * sent beyond what the door allows.
 */

export type DesignPairState = {
  pick: PairPick | null;
  /** The two bodygraphs read together; null until both are cast (or without a second person). */
  ctx: HdPairContext | null;
  names: Record<HdPairPerson, string>;
  /** The two birth charts the bodygraphs are cast from. */
  charts: Record<HdPairPerson, NatalChart | null>;
  busy: boolean;
  error: string | null;
  retry: () => void;
  enabled: boolean;
};

type Say = (key: HdPairWordKey, vars?: Record<string, string | number>) => string;

/** The page's words: its book, then the app's catalog. */
function useWords(): Say {
  const { locale, t } = useI18n();
  return useMemo(() => bookT(hdPairWords, t, locale), [t, locale]);
}

/** A word of the book without the catalog (the empty studio's line, before any hook runs). */
const said = (key: HdPairWordKey, locale: string): string => hdPairWords[key][locale === "fr" ? 1 : 0];

/** French "de" before a name: "de Camille", "d’Anna". */
const deName = (name: string): string => (/^(?:[aeiouhéèêëàâîïôûœæ]|y(?![aeiouéèêëàâîïôû]))/iu.test(name) ? `d’${name}` : `de ${name}`);

const KIND_WORD: Record<HdPairKind, HdPairWordKey> = {
  electromagnetic: "hdpKindElectromagnetic",
  companionship: "hdpKindCompanionship",
  dominance: "hdpKindDominance",
  compromise: "hdpKindCompromise",
};
const KIND_LINE: Record<HdPairKind, HdPairWordKey> = {
  electromagnetic: "hdpKindElectromagneticLine",
  companionship: "hdpKindCompanionshipLine",
  dominance: "hdpKindDominanceLine",
  compromise: "hdpKindCompromiseLine",
};
const OTHER: Record<HdPairPerson, HdPairPerson> = { a: "b", b: "a" };
const NO_MOMENTS = { design: "", personality: "" };

/** "1 channel", "6 channels", "no channel". */
const channelsWord = (n: number, w: Say) => (n === 0 ? w("hdpChannelsNone") : n === 1 ? w("hdpChannelsOne") : w("hdpChannelsN", { n }));

/** "Throat, G" (or "none"). */
const centresWord = (list: readonly HdCenterId[], locale: AppLocale, w: Say) => (list.length ? list.map((c) => hdCenterLabel(locale, c)).join(", ") : w("hdpNone"));

/** "Single · 8–1". */
const definitionWord = (ctx: HdPairContext, locale: AppLocale) => `${hdDefinitionLabel(locale, ctx.pair.definition)} · ${ctx.pair.theme.defined}–${ctx.pair.theme.open}`;

/** What one person holds of a channel, in a few characters: "34–20", "20", "—". */
const holdShort = (ch: HdPairChannel, who: HdPairPerson) => (ch[who].whole ? `${ch.gates[0]}–${ch.gates[1]}` : ch[who].gates.length ? String(ch[who].gates[0]) : "—");

/** A centre between the two, in words. */
function centreState(ctx: HdPairContext, c: HdCenterId, w: Say): string {
  const by = ctx.pair.centres.find((x) => x.id === c)?.by ?? null;
  if (by === "both") return w("hdpStateBoth");
  if (by === "a" || by === "b") return w("hdpStateOne", { who: ctx.names[by], other: ctx.names[OTHER[by]] });
  if (by === "together") return w("hdpStateTogether");
  return w("hdpStateOpen");
}

/** The one line that names a piece of the connection chart (under it, in the keyboard's list, on the phone's card). */
function pairSay(ctx: HdPairContext, id: string, locale: AppLocale, w: Say, names: HdNames | null): string {
  const { pair } = ctx;
  const gateName = (n: number) => {
    const name = names?.gate(n);
    return name ? `${hdGateTitle(locale, n)} · ${name}` : hdGateTitle(locale, n);
  };
  const channelName = (cid: string) => {
    const name = names?.channel(cid);
    return name ? `${cid} · ${name}` : cid;
  };
  const ref = parseHdpRef(id);
  if (ref) {
    if (ref.kind === "kind") return `${w(KIND_WORD[ref.value])} · ${channelsWord(pair.formed.filter((ch) => ch.kind === ref.value).length, w)}`;
    if (ref.kind === "conditioning") return `${w("hdpConditioning", { giver: ctx.names[ref.who], receiver: ctx.names[OTHER[ref.who]] })} · ${centresWord(pair.conditioning[ref.who], locale, w)}`;
    if (ref.kind === "open") return `${w("hdpOpenGround")} · ${centresWord(pair.open, locale, w)}`;
    if (ref.kind === "definition") return `${w("hdpDefinitionTogether")} · ${definitionWord(ctx, locale)}`;
    if (ref.kind === "person") return `${ctx.names[ref.who]} · ${hdTypeLabel(locale, ctx.charts[ref.who].type)} · ${ctx.charts[ref.who].profile}`;
    return `${ctx.names.a} · ${ctx.names.b} · ${channelsWord(pair.formed.length, w)}`;
  }
  const sep = id.indexOf(":");
  const kind = id.slice(0, sep);
  const key = id.slice(sep + 1);
  if (kind === "gate") {
    const n = Number(key);
    const tone = pair.tones.get(n) ?? "off";
    const centre = HD_GATE_CENTER[n];
    const whose = tone === "both" ? w("hdpSayBoth") : tone === "off" ? w("hdpSayNeither") : ctx.names[tone];
    return [gateName(n), centre ? hdCenterLabel(locale, centre) : "", whose].filter(Boolean).join(" · ");
  }
  if (kind === "channel") {
    const ch = pair.channels.find((c) => c.id === key);
    if (!ch) return key;
    const state = ch.kind ? `${w(KIND_WORD[ch.kind])} · ${HD_PAIR_PEOPLE.map((p) => `${ctx.names[p]} ${holdShort(ch, p)}`).join(" · ")}` : w("hdpNotFormed");
    return [channelName(ch.id), hdChannelCentersLine(locale, ch.centers[0], ch.centers[1]), state].join(" · ");
  }
  if (kind === "center") return `${hdCenterLabel(locale, key as HdCenterId)} · ${centreState(ctx, key as HdCenterId, w)}`;
  return "";
}

/** What the bodygraph draws of the connection chart, and how it names its pieces. */
function usePairFigure(ctx: HdPairContext | null, w: Say, locale: AppLocale, names: HdNames | null): HdPairFigure | null {
  return useMemo(() => {
    if (!ctx) return null;
    const { pair } = ctx;
    const say = (id: string) => pairSay(ctx, id, locale, w, names);
    const parts: FigurePart[] = [];
    const centres = [...HD_CENTER_IDS].sort((x, y) => Number(pair.centres.find((c) => c.id === y)!.pair) - Number(pair.centres.find((c) => c.id === x)!.pair));
    for (const c of centres) parts.push({ id: `center:${c}`, label: say(`center:${c}`), kind: "center" });
    for (const ch of pair.formed) parts.push({ id: `channel:${ch.id}`, label: say(`channel:${ch.id}`), kind: "channel" });
    const gates = [...pair.tones.keys()];
    for (const g of gates.filter((n) => pair.tones.get(n) !== "off")) parts.push({ id: `gate:${g}`, label: say(`gate:${g}`), kind: "gate" });
    for (const ch of pair.channels.filter((c) => !c.kind)) parts.push({ id: `channel:${ch.id}`, label: say(`channel:${ch.id}`), kind: "channel-open" });
    for (const g of gates.filter((n) => pair.tones.get(n) === "off")) parts.push({ id: `gate:${g}`, label: say(`gate:${g}`), kind: "gate-off" });
    return {
      tones: pair.tones,
      kinds: new Map(pair.formed.map((ch) => [ch.id, ch.kind!] as const)),
      uncertain: ctx.uncertain,
      centres: new Map(pair.centres.filter((c) => c.by).map((c) => [c.id, c.by!] as const)),
      focusOf: (id) => hdPairFocus(pair, id),
      say,
      parts,
      label: w("hdpAria", { a: ctx.names.a, b: ctx.names.b, deA: deName(ctx.names.a), deB: deName(ctx.names.b) }),
    };
  }, [ctx, w, locale, names]);
}

/** A kind's line, as the figure draws it (the legend's sample). */
function KindSample({ kind }: { kind: HdPairKind }) {
  const left = "M3 6H15";
  const right = "M15 6H27";
  const half = (tone: "a" | "b" | "both", d: string) =>
    tone === "a" ? (
      <path className="is-a" d={d} />
    ) : tone === "b" ? (
      <>
        <path className="is-b" d={d} />
        <path className="is-core-bg" d={d} />
      </>
    ) : (
      <>
        <path className="is-b is-wide" d={d} />
        <path className="is-a is-core" d={d} />
      </>
    );
  const [l, r]: ["a" | "b" | "both", "a" | "b" | "both"] =
    kind === "electromagnetic" ? ["a", "b"] : kind === "companionship" ? ["both", "both"] : kind === "dominance" ? ["a", "a"] : ["both", "a"];
  return (
    <svg className="ulune-hdp-sample" viewBox="0 0 30 12" width="30" height="12" aria-hidden data-kind={kind}>
      {half(l, left)}
      {half(r, right)}
      {kind === "electromagnetic" ? <path className="is-spark" d="M15 1.6L16.4 4.6L19.4 6L16.4 7.4L15 10.4L13.6 7.4L10.6 6L13.6 4.6Z" /> : null}
    </svg>
  );
}

/** A centre's mark, as the figure draws it (the centres' key). */
function MarkSample({ by }: { by: "a" | "b" | "both" | "together" | "open" }) {
  return (
    <svg className="ulune-hdp-mark" viewBox="0 0 22 12" width="22" height="12" aria-hidden data-by={by}>
      {by === "open" ? (
        <rect className="is-open" x={4} y={1} width={14} height={10} rx={2} />
      ) : (
        <>
          <rect className="is-fill" x={1} y={0.5} width={20} height={11} rx={2.5} />
          <rect className="is-pill" x={by === "both" ? 2 : 5} y={1.5} width={by === "both" ? 18 : 12} height={9} rx={4.5} />
          {by === "together" ? <path className="is-spark" d="M11 2L12.3 4.7L15 6L12.3 7.3L11 10L9.7 7.3L7 6L9.7 4.7Z" /> : null}
          {by === "a" || by === "both" ? <circle className="is-a" cx={by === "both" ? 7 : 11} cy={6} r={2.8} /> : null}
          {by === "b" || by === "both" ? <circle className="is-b" cx={by === "both" ? 15 : 11} cy={6} r={2.3} /> : null}
        </>
      )}
    </svg>
  );
}

/** The two people above the figure, each opening their bodygraph as the pair reads it. */
function People({ ctx }: { ctx: HdPairContext }) {
  const { locale } = useI18n();
  const w = useWords();
  const view = useWheelView();
  return (
    <div className="ulune-hdp-people" role="group" aria-label={w("hdpPeople")} data-testid="hd-pair-people">
      {HD_PAIR_PEOPLE.map((who) => {
        const chart = ctx.charts[who];
        const ref = hdpPersonRef(who);
        const on = view.selectedId === ref;
        const type = hdTypeLabel(locale, chart.type);
        const definition = hdDefinitionLabel(locale, chart.definition);
        return (
          <button
            key={who}
            type="button"
            className={cn("ulune-hdp-person", on && "is-on")}
            data-person={who}
            data-testid={`hd-pair-person-${who}`}
            aria-pressed={on}
            aria-label={w("hdpPersonAria", { name: ctx.names[who], type, profile: chart.profile, definition })}
            onClick={() => view.pick(ref)}
            {...previewProps(ref)}
          >
            <span className="ulune-hdp-who">
              <span className={cn("ulune-hdp-dot", who === "b" && "is-b")} aria-hidden /> {ctx.names[who]}
            </span>
            <span className="ulune-hdp-person-line">
              {type} · {chart.profile} · {definition}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** One row of the side column: a label, its value, its reading. */
function SideRow({ refId, testId, label, value, aria }: { refId: string; testId: string; label: string; value: string; aria?: string }) {
  const view = useWheelView();
  const on = view.selectedId === refId;
  return (
    <button type="button" className={cn("ulune-hdp-row", on && "is-on")} data-testid={testId} aria-pressed={on} aria-label={aria} onClick={() => view.pick(refId)} {...previewProps(refId)}>
      <span className="ulune-hdp-row-k">{label}</span>
      <span className="ulune-hdp-row-v">{value}</span>
    </button>
  );
}

/** Beside the figure: whose gates are whose, the four kinds, the centres' key, the conditioning both ways, the open ground, the definition together. */
function Side({ ctx }: { ctx: HdPairContext }) {
  const { locale } = useI18n();
  const w = useWords();
  const view = useWheelView();
  const domId = useDomIds();
  const { pair, names } = ctx;
  return (
    <div className="ulune-hdp-side">
      <section className="ulune-hdp-legend" aria-labelledby={domId("hdp-kinds-h")} data-testid="hd-pair-legend">
        <h3 id={domId("hdp-kinds-h")} className="ulune-hdp-h">
          {w("hdpKindsHead")}
        </h3>
        {/* Whose gate is whose, as drawn: the figure's keyboard list says it of each gate in words. */}
        <p className="ulune-hdp-whose" data-testid="hd-pair-whose" aria-hidden>
          <span className="ulune-hdp-whose-item">
            <span className="ulune-hdp-gate is-a" aria-hidden /> {names.a}
          </span>
          <span className="ulune-hdp-whose-item">
            <span className="ulune-hdp-gate is-b" aria-hidden /> {names.b}
          </span>
          <span className="ulune-hdp-whose-item">
            <span className="ulune-hdp-gate is-both" aria-hidden /> {w("hdpBoth")}
          </span>
        </p>
        <ul className="ulune-hdp-kinds">
          {HD_PAIR_KINDS.map((k) => {
            const n = pair.formed.filter((ch) => ch.kind === k).length;
            const ref = hdpKindRef(k);
            const on = view.selectedId === ref;
            return (
              <li key={k}>
                <button
                  type="button"
                  className={cn("ulune-hdp-kind", on && "is-on")}
                  data-kind={k}
                  data-count={n}
                  data-testid={`hd-pair-kind-${k}`}
                  aria-pressed={on}
                  aria-label={w("hdpKindAria", { kind: w(KIND_WORD[k]), count: channelsWord(n, w), line: w(KIND_LINE[k]) })}
                  onClick={() => view.pick(ref)}
                  {...previewProps(ref)}
                >
                  <KindSample kind={k} />
                  <span className="ulune-hdp-kind-name">{w(KIND_WORD[k])}</span>
                  <span className="ulune-hdp-kind-n">{n}</span>
                  <span className="ulune-hdp-kind-line">{w(KIND_LINE[k])}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
      <section className="ulune-hdp-centres" aria-labelledby={domId("hdp-centres-h")} data-testid="hd-pair-centres">
        <h3 id={domId("hdp-centres-h")} className="ulune-hdp-h">
          {w("hdpCentresHead")}
        </h3>
        <ul className="ulune-hdp-key">
          <li>
            <MarkSample by="a" /> {w("hdpMarkOne", { name: names.a })}
          </li>
          <li>
            <MarkSample by="b" /> {w("hdpMarkOne", { name: names.b })}
          </li>
          <li>
            <MarkSample by="both" /> {w("hdpMarkBoth")}
          </li>
          <li>
            <MarkSample by="together" /> {w("hdpMarkTogether")}
          </li>
          <li>
            <MarkSample by="open" /> {w("hdpMarkOpen")}
          </li>
        </ul>
        <div className="ulune-hdp-rows">
          {HD_PAIR_PEOPLE.map((giver) => {
            const list = centresWord(pair.conditioning[giver], locale, w);
            const vars = { giver: names[giver], receiver: names[OTHER[giver]] };
            return (
              <SideRow
                key={giver}
                refId={hdpConditionRef(giver)}
                testId={`hd-pair-cond-${giver}`}
                label={w("hdpConditioning", vars)}
                value={list}
                aria={w("hdpConditioningAria", { ...vars, list })}
              />
            );
          })}
          <SideRow refId={HDP_OPEN} testId="hd-pair-open" label={w("hdpOpenGround")} value={centresWord(pair.open, locale, w)} />
          <SideRow refId={HDP_DEFINITION} testId="hd-pair-definition" label={w("hdpDefinitionTogether")} value={definitionWord(ctx, locale)} />
        </div>
      </section>
    </div>
  );
}

/** On a phone, a piece chosen on the figure: one line and Read (pick-card.tsx); a Compare pane's in its own place. */
function PairCard({ figure }: { figure: HdPairFigure }) {
  const scope = useChartScope();
  const selectedId = useScoped((s) => s.selectedId);
  const text = selectedId && /^(gate|channel|center|hdp):/.test(selectedId) ? figure.say(selectedId) : null;
  return scope ? <ScopeCard scope={scope} text={text} testId="hd-pair-card" /> : <PickCard testId="hd-pair-card" text={text} />;
}

function DesignPairFigure() {
  const { locale, t } = useI18n();
  const w = useWords();
  const view = useWheelView();
  // Wide screens read beside the figure; on a phone a choice keeps it whole behind the card.
  const wide = useReadingBeside();
  const sel = useScopedSelection();
  const data = useModeData("design-pair");
  const partnerBirth = useScoped((s) => s.pair.addingPartnerFor === "design-pair");
  const hdNames = useHdNames(locale);
  const figure = usePairFigure(data?.ctx ?? null, w, locale, hdNames);
  // Its own scroll comes back where it was when the studio does (reorganisation R6).
  const scroller = useRef<HTMLDivElement>(null);
  useKeptScroll(scroller, useScopeKey("design-pair-scroll"), Boolean(data?.ctx));
  if (!data?.charts.a) return null;
  if (!data.charts.b) {
    if (partnerBirth) return <div data-testid="hd-pair-need-second" className="hidden" />;
    return (
      <div data-testid="hd-pair-need-second" className="grid min-h-[12rem] place-items-center px-4 text-center">
        <button
          type="button"
          data-testid="hd-pair-add-second"
          onClick={() => data.pick?.addSecond()}
          className="inline-flex min-h-[var(--btn-h)] items-center justify-center rounded-md px-4 font-display text-2xl leading-none text-fg hover:text-fg-muted"
        >
          {w("hdpAdd")}
        </button>
      </div>
    );
  }
  if (data.error) {
    return (
      <div className="px-5 py-10" role="alert" data-testid="hd-pair-error">
        <p className="font-display text-2xl text-fg">{localizeError(data.error, locale)}</p>
        <button type="button" className="mt-2 text-sm underline" onClick={data.retry}>
          {t("errorSlotRetry")}
        </button>
      </div>
    );
  }
  if (!data.ctx || !figure) {
    return (
      <section data-testid="hd-pair-loading" className="px-6 py-16 text-center" aria-busy="true">
        <span className="mx-auto block size-8 animate-pulse rounded-full bg-bg-subtle" />
      </section>
    );
  }
  const ctx = data.ctx;
  const select = (id: string) => (wide ? view.choose(id) : sel.quiet(id));
  const noTime = HD_PAIR_PEOPLE.filter((who) => ctx.charts[who].uncertain).map((who) => ctx.names[who]);
  return (
    <div ref={scroller} className="ulune-hdp" data-testid="hd-pair" data-chart-pick data-definition={ctx.pair.definition}>
      <People ctx={ctx} />
      {noTime.length ? (
        <p className="ulune-hdp-unknown" role="note" data-testid="hd-pair-unknown">
          {w("hdpUnknown", { name: noTime.join(w("hdpAnd")) })}
        </p>
      ) : null}
      <div className="ulune-hdp-body">
        <div className="ulune-hdp-figure">
          <HumanDesignGraph chart={ctx.charts.a} view="both" selectedId={view.selectedId} onSelect={select} onClear={sel.clear} moments={NO_MOMENTS} pair={figure} />
        </div>
        <Side ctx={ctx} />
      </div>
      {wide ? null : <PairCard figure={figure} />}
    </div>
  );
}

function DesignPairControls() {
  const data = useModeData("design-pair");
  if (!data?.pick) return null;
  return <PairSelects mode="synastry" pair={data.pick} prefix="design-pair" page="design-pair" />;
}

/** "How Ulune reads a connection chart": what it is and is not (with the reading pack). */
function Method() {
  const { locale } = useI18n();
  const pack = usePack("hdpair", locale, true);
  if (!pack) return null;
  const how = pack.hdPairMethod(locale);
  return (
    <details className="ob-rc-about ulune-hdp-how" data-testid="hd-pair-method">
      <summary>{how.title}</summary>
      <ul className="ulune-hdp-how-list">
        {how.items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </details>
  );
}

/**
 * "You two, now" (share and compare plan, 5e, next week): where both people
 * are in time, for Human Design today's gates over the connection chart and
 * what the day completes for the two. Its place is here, under the first
 * read's steps, fed by the same context (the pair and both bodygraphs) and
 * the day's activations from the door; until then it draws nothing.
 */
function YouTwoNow(): null {
  return null;
}

/** The side panel with nothing chosen: the connection in steps, each opening its reading and lighting its part of the figure. */
function DesignPairHello() {
  const { locale } = useI18n();
  const w = useWords();
  const view = useWheelView();
  const domId = useDomIds();
  const data = useModeData("design-pair");
  const pack = usePack("hdpair", locale, Boolean(data?.ctx));
  if (!data?.charts.a) return null;
  const ctx = data.ctx;
  if (!ctx) {
    return (
      <section className="ulune-hdp-hello" data-testid="hd-pair-hello" data-empty="1">
        {!data.charts.b ? (
          <button
            type="button"
            data-testid="hd-pair-add-second-panel"
            onClick={() => data.pick?.addSecond()}
            className="inline-flex min-h-11 items-center rounded-md font-display text-xl leading-tight text-fg hover:text-fg-muted"
          >
            {w("hdpAdd")}
          </button>
        ) : (
          <LoadingLines lines={3} />
        )}
        <p className="ulune-hdp-p">{w("hdpLead")}</p>
        <Method />
      </section>
    );
  }
  const { pair, names } = ctx;
  const first = pack ? pack.hdPairFirstRead(ctx, locale) : null;
  const colon = locale === "fr" ? "\u202f: " : ": ";
  type Step = { id: string; ref: string; label: string; value: string; text: string };
  const steps: Step[] = [
    { id: "summary", ref: HDP_SUMMARY, label: w("hdpStepSummary"), value: `${channelsWord(pair.formed.length, w)} · ${pair.theme.defined}–${pair.theme.open}`, text: first?.texts.summary ?? "" },
    ...HD_PAIR_KINDS.map((k) => ({
      id: k,
      ref: hdpKindRef(k),
      label: w(KIND_WORD[k]),
      value: String(pair.formed.filter((ch) => ch.kind === k).length),
      text: first?.texts[k] ?? w(KIND_LINE[k]),
    })),
    ...HD_PAIR_PEOPLE.map((giver) => ({
      id: `conditioning-${giver}`,
      ref: hdpConditionRef(giver),
      label: w("hdpConditioning", { giver: names[giver], receiver: names[OTHER[giver]] }),
      value: centresWord(pair.conditioning[giver], locale, w),
      text: first?.texts[`conditioning-${giver}`] ?? "",
    })),
    { id: "open", ref: HDP_OPEN, label: w("hdpOpenGround"), value: centresWord(pair.open, locale, w), text: first?.texts.open ?? "" },
    { id: "definition", ref: HDP_DEFINITION, label: w("hdpDefinitionTogether"), value: definitionWord(ctx, locale), text: first?.texts.definition ?? "" },
  ];
  return (
    <section className="ulune-hd-first ulune-hdp-hello" data-testid="hd-pair-hello" aria-labelledby={domId("ulune-hdp-first-title")}>
      <h3 id={domId("ulune-hdp-first-title")} className="ulune-kicker ulune-hd-first-title">
        {w("hdpFirstTitle")}
      </h3>
      <p className="ulune-hdp-p">{first?.lead ?? w("hdpLead")}</p>
      <ol className="ulune-hd-steps">
        {steps.map((st, i) => (
          <li key={st.id}>
            <button
              type="button"
              data-testid={`hd-pair-hello-${st.id}`}
              className={cn("ulune-hd-step", view.selectedId === st.ref && "is-on")}
              aria-label={`${i + 1}. ${st.label}${st.value ? `${colon}${st.value}` : ""}. ${st.text}`}
              onClick={() => view.pick(st.ref)}
              {...previewProps(st.ref)}
            >
              <span className="ulune-hd-step-n" aria-hidden>
                {i + 1}
              </span>
              <span className="ulune-hd-step-body">
                <span className="ulune-hd-step-head">
                  <span className="ulune-kicker ulune-hd-step-k">{st.label}</span>
                  {st.value ? <span className="ulune-hd-step-v">{st.value}</span> : null}
                </span>
                {st.text ? <span className="ulune-hd-step-text">{st.text}</span> : null}
              </span>
            </button>
          </li>
        ))}
      </ol>
      <YouTwoNow />
      {first?.next ? <p className="ulune-hd-first-next">{first.next}</p> : null}
      <Method />
    </section>
  );
}

const loadTable = () => import("@/studio/tables/hd-pair-table");
const HdPairTable = lazyNamed(loadTable, "HdPairTable");

function DesignPairData() {
  const data = useModeData("design-pair");
  const view = useWheelView();
  if (!data?.ctx) return null;
  return (
    <Suspense fallback={<LoadingLines testId="table-loading" lines={6} />}>
      <HdPairTable ctx={data.ctx} selectedId={view.selectedId} onSelect={view.pick} />
    </Suspense>
  );
}

/**
 * The two bodygraphs, through the door (this device or Ulune's server, as
 * Settings says), each kept in the tab's memory of bodygraphs that the
 * natal page and Compare share: coming back draws them at once.
 */
function useBodygraphs(enabled: boolean, a: NatalChart | null, b: NatalChart | null) {
  const keyA = a ? hdKeyOf(a.meta.utc, a.meta.timeUnknown) : "";
  const keyB = b ? hdKeyOf(b.meta.utc, b.meta.timeUnknown) : "";
  const [cast, setCast] = useState<Readonly<Record<string, HumanDesignChart>>>({});
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let gone = false;
    setError(null);
    for (const [key, chart] of [
      [keyA, a],
      [keyB, b],
    ] as const) {
      if (!key || !chart) continue;
      const kept = keptHd(key);
      if (kept) {
        setCast((c) => (c[key] === kept ? c : { ...c, [key]: kept }));
        continue;
      }
      const span = chart.meta.timeUnknown ? 720 : undefined;
      void door
        .castHumanDesign({ data: span ? { natalUtc: chart.meta.utc, spanMinutes: span } : { natalUtc: chart.meta.utc } })
        .then((hd) => {
          keepHd(key, hd);
          if (!gone) setCast((c) => ({ ...c, [key]: hd }));
        })
        .catch((err: unknown) => {
          if (!gone) setError(errorForState(err));
        });
    }
    return () => {
      gone = true;
    };
    // The charts are read through their keys: the same birth gives the same bodygraph.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, keyA, keyB, tick]);
  const hdA = (keyA && (cast[keyA] ?? keptHd(keyA))) || null;
  const hdB = (keyB && (cast[keyB] ?? keptHd(keyB))) || null;
  const retry = useCallback(() => setTick((n) => n + 1), []);
  return { a: hdA, b: hdB, error, retry };
}

function useDesignPairRuntime(): ModeRuntime<DesignPairState> {
  const { locale, t } = useI18n();
  const page = useStudioStore((s) => s.page);
  const chart = useScoped((s) => s.chart);
  const creating = useScoped((s) => s.creating);
  const selectedId = useScoped((s) => s.selectedId);
  const enabled = page === "design-pair" && Boolean(chart);
  const { pick, inner, chartB } = usePairPick(enabled, "design-pair");
  const hd = useBodygraphs(enabled && !creating, inner, chartB);
  const names = useMemo(
    () => ({ a: inner ? chartDisplayName(inner.meta, t("untitled")) : "A", b: chartB ? chartDisplayName(chartB.meta, t("untitled")) : "B" }),
    [inner, chartB, t],
  );
  const hdA = chartB ? hd.a : null;
  const hdB = chartB ? hd.b : null;
  const ctx = useMemo<HdPairContext | null>(
    () => (hdA && hdB ? { pair: hdPair(hdA, hdB), charts: { a: hdA, b: hdB }, names, uncertain: hdPairUncertain(hdA, hdB) } : null),
    [hdA, hdB, names],
  );
  // The readings come with the connection chart's reading pack (its own download, one language at a time).
  const pack = usePack("hdpair", locale, enabled);
  const reading = useMemo(() => (enabled && pack && ctx ? pack.hdPairReading(ctx, selectedId, locale) : null), [enabled, pack, ctx, selectedId, locale]);
  const busy = Boolean(inner && chartB && !ctx && !hd.error);
  const data = useMemo(
    () => ({ pick, ctx, names, charts: { a: inner, b: chartB }, busy, error: chartB ? hd.error : null, retry: hd.retry, enabled }),
    [pick, ctx, names, inner, chartB, busy, hd.error, hd.retry, enabled],
  );
  return useMemo(() => ({ data, reading }), [data, reading]);
}

export const designPairMode: ModeDef = {
  ...MODE_META["design-pair"],
  emptyText: (locale) => said("hdpEmpty", locale),
  Controls: DesignPairControls,
  Figure: DesignPairFigure,
  HelloEmpty: DesignPairHello,
  Data: DesignPairData,
  preloadData: () => prefetch(loadTable),
  useRuntime: useDesignPairRuntime,
};
