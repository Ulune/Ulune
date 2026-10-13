import { Suspense, useMemo, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { LoadingLines } from "@/components/loading-lines";
import { BRANCHES, PHASES, SIXTY, STEMS, type PhaseId } from "@/lib/chinese/names";
import { chineseLabel } from "@/lib/chinese/prefs";
import { useChinesePrefs } from "@/lib/chinese/use-chinese-prefs";
import { cnWord } from "@/lib/chinese/words";
import { DAY_MASTER_NAME, TEN_GODS, baziChart, tenGodById, type BaziChart, type BaziPillar } from "@/lib/chinese/bazi";
import { DAY_MASTER_IMAGES } from "@/lib/chinese/bazi-texts";
import {
  BALANCE_REF,
  EMPTY_REF,
  FAVOURABLE_REF,
  PILLAR_WORD,
  STRENGTH_REF,
  STRUCTURE_REF,
  baziReading,
  branchCellRef,
  fmtPoints,
  godRef,
  hiddenRef,
  ixRef,
  ixStatus,
  naYinRef,
  phaseList,
  phaseRef,
  stageRef,
  starRef,
  stemRef,
  strengthWord,
} from "@/lib/chinese/bazi-reading";
import { STRUCTURE_NAMES, baziBalance, type BaziBalance } from "@/lib/chinese/bazi-balance";
import { STRENGTH_TEXTS, STRUCTURE_TEXTS } from "@/lib/chinese/bazi-balance-texts";
import { LUCK_GOD_TEXTS } from "@/lib/chinese/bazi-readings-texts";
import { flowYear, flowYearOf, luckAt, luckPillars, type Luck, type LuckCount } from "@/lib/chinese/bazi-luck";
import { ageWords, countWord, luckReading, luckRef } from "@/lib/chinese/bazi-luck-reading";
import "@/studio/modes/styles/first-read.css";
import { INTERACTION_NAMES, baziInteractions, interactionTone, type Interaction } from "@/lib/chinese/bazi-interactions";
import { STARS, baziSigns, type BaziSigns, type PillarSigns } from "@/lib/chinese/bazi-signs";
import { PLACE_WORD } from "@/lib/chinese/zodiac-places";
import { said } from "@/lib/chinese/zodiac-texts";
import { hanziLang } from "@/lib/chinese/animal-chars";
import { previewProps } from "@/lib/depth/preview-bus";
import { useI18n } from "@/lib/i18n/locale";
import { lazyNamed, prefetch } from "@/lib/lazy-component";
import { cn } from "@/lib/utils";
import { useModeData } from "@/studio/modes/data";
import { MODE_META } from "@/studio/modes/meta";
import type { ModeDef, ModeRuntime } from "@/studio/modes/types";
import { useWheelView } from "@/studio/modes/wheel-view";
import { useKeptScroll } from "@/studio/return-parts";
import { useStudioStore } from "@/studio/store";
import "@/studio/modes/styles/zodiac.css";
import "@/studio/modes/styles/bazi.css";

/*
 * BaZi, the Four Pillars (languages plan, language 2, part 12: "the pillar
 * board: stems, branches, hidden stems, Ten Gods"), at /bazi. Four columns,
 * hour to year as the tradition writes them (the year on the right), or year
 * to hour (Settings → Chinese traditions): in each, the stem's god (or "Day
 * Master" for the day's), the stem, the branch, and the branch's hidden
 * stems with their weights and gods, every cell in its phase's colour and
 * saying its phase in words. Beside the board, the Ten Gods with how often
 * each stands in the chart. Every cell opens its reading. Worked out here
 * from the cast chart, on the reader's clock and day boundary; nothing is
 * sent. Part 13 adds under each column the Day Master's life stage in its
 * branch, the pillar's Na Yin, an empty branch's mark and the symbolic stars
 * that fall there; beside the board, the stars and the empty branches.
 * Part 14 adds under the board the interactions between the pillars
 * (combinations, clashes, harms, punishments, destructions), each saying
 * whether it transforms; choosing one outlines the cells it joins.
 * Part 15 adds, first beside the board, the five phases counted (with the
 * method one tap away), the Day Master's strength, the structure and the
 * favourable phases, each opening the reading that shows its working.
 */

export type BaziState = {
  bazi: BaziChart | null;
  signs: BaziSigns | null;
  interactions: Interaction[];
  balance: BaziBalance | null;
  /** The luck pillars, one per count given (both without one), for the first read. */
  lucks: Luck[];
  enabled: boolean;
};

/** A term as the reader writes it: the characters big, or the pinyin, or the name. */
function Term({ name, big }: { name: { name: string; pinyin: string | null; hanzi: string | null }; big?: boolean }) {
  const prefs = useChinesePrefs();
  return (
    <>
      {name.hanzi ? (
        <span className={cn("ulune-bz-hanzi", big && "is-big")} lang={hanziLang(prefs.script)}>
          {name.hanzi}
        </span>
      ) : null}
      <span className={cn("ulune-bz-name", !name.hanzi && big && "is-big")}>{name.name}</span>
      {name.pinyin ? <span className="ulune-bz-py">{name.pinyin}</span> : null}
    </>
  );
}

function Column({ p, signs, linked }: { p: BaziPillar; signs: PillarSigns | undefined; linked: Interaction | null }) {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const w = useWheelView();
  const stem = STEMS[p.stem]!;
  const branch = BRANCHES[p.branch]!;
  const dm = p.id === "day";
  const god = p.god ? tenGodById(p.god) : null;
  const sRef = stemRef(p.id);
  const bRef = branchCellRef(p.id);
  const godName = dm ? chineseLabel(DAY_MASTER_NAME, locale, prefs).name : chineseLabel(god!, locale, prefs).name;
  return (
    <section className={cn("ulune-bz-col", dm && "is-dm")} data-place={p.id} data-testid={`bazi-col-${p.id}`} data-uncertain={p.uncertain ? "1" : undefined}>
      <h3 className="ulune-bz-place">
        {cnWord(locale, PILLAR_WORD[p.id])}
        {p.uncertain ? <span className="ulune-bz-tilde"> ~</span> : null}
      </h3>
      <button
        type="button"
        className={cn("ulune-bz-god", dm && "is-dm", !dm && w.selectedId === godRef(god!.id) && "is-on")}
        data-testid={`bazi-god-of-${p.id}`}
        data-god={god?.id ?? "day-master"}
        onClick={() => w.choose(dm ? sRef : godRef(god!.id))}
      >
        {godName}
      </button>
      <button
        type="button"
        className={cn("ulune-bz-cell is-stem", w.selectedId === sRef && "is-on", linked?.level === "stem" && linked.places.includes(p.id) && "is-linked")}
        data-phase={stem.phase}
        data-testid={`bazi-stem-${p.id}`}
        aria-pressed={w.selectedId === sRef}
        aria-label={`${cnWord(locale, PILLAR_WORD[p.id])}, ${cnWord(locale, "zkStem")}: ${chineseLabel(stem, locale, prefs).text}, ${godName}`}
        onClick={() => w.choose(sRef)}
        {...previewProps(sRef)}
      >
        <Term name={chineseLabel(stem, locale, prefs)} big />
      </button>
      <button
        type="button"
        className={cn("ulune-bz-cell is-branch", w.selectedId === bRef && "is-on", linked?.level === "branch" && linked.places.includes(p.id) && "is-linked")}
        data-phase={branch.phase}
        data-testid={`bazi-branch-${p.id}`}
        aria-pressed={w.selectedId === bRef}
        aria-label={`${cnWord(locale, PILLAR_WORD[p.id])}, ${cnWord(locale, "zkBranch")}: ${chineseLabel(branch, locale, prefs).text}`}
        onClick={() => w.choose(bRef)}
        {...previewProps(bRef)}
      >
        <Term name={chineseLabel(branch, locale, prefs)} big />
        <span className="ulune-bz-ph">{(locale === "fr" ? PHASES.find((x) => x.id === branch.phase)!.fr : PHASES.find((x) => x.id === branch.phase)!.en).toLowerCase()}</span>
      </button>
      <ul className="ulune-bz-hidden" aria-label={cnWord(locale, "zkHidden")}>
        {p.hidden.map((h, i) => {
          const ref = hiddenRef(p.id, i);
          const s = chineseLabel(STEMS[h.stem]!, locale, prefs);
          return (
            <li key={i}>
              <button
                type="button"
                className={cn("ulune-bz-hid", w.selectedId === ref && "is-on")}
                data-phase={STEMS[h.stem]!.phase}
                data-testid={`bazi-hidden-${p.id}-${i}`}
                aria-pressed={w.selectedId === ref}
                onClick={() => w.choose(ref)}
                {...previewProps(ref)}
              >
                <span className="ulune-bz-hid-stem">
                  {s.hanzi ? <span lang={hanziLang(prefs.script)}>{s.hanzi}</span> : null}
                  <span>{s.name}</span>
                  <span className="ulune-bz-weight">{h.weight}</span>
                </span>
                <span className="ulune-bz-hid-god">{chineseLabel(tenGodById(h.god), locale, prefs).name}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {signs ? <Signs place={p.id} s={signs} /> : null}
    </section>
  );
}

/** Under a column: the Day Master's stage in its branch, its Na Yin, an empty branch, its stars. */
function Signs({ place, s }: { place: BaziPillar["id"]; s: PillarSigns }) {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const w = useWheelView();
  const stage = chineseLabel(s.stage, locale, prefs);
  const ny = chineseLabel(s.naYin, locale, prefs);
  const sRef = stageRef(place);
  const nRef = naYinRef(place);
  return (
    <div className="ulune-bz-signs">
      <button
        type="button"
        className={cn("ulune-bz-sign", w.selectedId === sRef && "is-on")}
        data-testid={`bazi-stage-${place}`}
        data-stage={s.stage.id}
        aria-pressed={w.selectedId === sRef}
        onClick={() => w.choose(sRef)}
        {...previewProps(sRef)}
      >
        <span className="ulune-bz-sign-k">{cnWord(locale, "bzStage")}</span>
        <span className="ulune-bz-sign-v">
          {stage.hanzi ? <span lang={hanziLang(prefs.script)}>{stage.hanzi} </span> : null}
          {stage.name}
        </span>
      </button>
      <button
        type="button"
        className={cn("ulune-bz-sign", w.selectedId === nRef && "is-on")}
        data-testid={`bazi-nayin-${place}`}
        data-phase={s.naYin.phase}
        aria-pressed={w.selectedId === nRef}
        onClick={() => w.choose(nRef)}
        {...previewProps(nRef)}
      >
        <span className="ulune-bz-sign-k">{cnWord(locale, "zkNaYin")}</span>
        <span className="ulune-bz-sign-v">
          {ny.hanzi ? <span lang={hanziLang(prefs.script)}>{ny.hanzi} </span> : null}
          {ny.name}
        </span>
      </button>
      {s.empty ? (
        <button
          type="button"
          className={cn("ulune-bz-emptymark", w.selectedId === EMPTY_REF && "is-on")}
          data-testid={`bazi-empty-${place}`}
          onClick={() => w.choose(EMPTY_REF)}
        >
          {cnWord(locale, "bzEmptyBadge")}
        </button>
      ) : null}
      {s.stars.length ? (
        <ul className="ulune-bz-chips" aria-label={cnWord(locale, "bzStarsHead")}>
          {s.stars.map((id) => {
            const ref = starRef(id);
            return (
              <li key={id}>
                <button
                  type="button"
                  className={cn("ulune-bz-chip", w.selectedId === ref && "is-on")}
                  data-testid={`bazi-star-${place}-${id}`}
                  aria-pressed={w.selectedId === ref}
                  onClick={() => w.choose(ref)}
                >
                  {chineseLabel(STARS.find((x) => x.id === id)!, locale, { ...prefs, show: "names" }).name}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

/** Beside the board, under the gods: the stars in the chart and the empty branches. */
function StarsList({ c, signs }: { c: BaziChart; signs: BaziSigns }) {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const w = useWheelView();
  const [a, b] = signs.empty;
  const br = (i: number) => {
    const l = chineseLabel(BRANCHES[i]!, locale, prefs);
    return [l.hanzi, l.name].filter(Boolean).join(" ");
  };
  const order = c.pillars.map((p) => p.id);
  return (
    <section className="ulune-bz-gods ulune-bz-stars" aria-labelledby="bz-stars-h" data-testid="bazi-stars">
      <h2 id="bz-stars-h" className="ulune-bz-h">
        {cnWord(locale, "bzStarsHead")}
      </h2>
      {signs.stars.length ? (
        <ul>
          {signs.stars.map((hit) => {
            const ref = starRef(hit.id);
            const star = STARS.find((x) => x.id === hit.id)!;
            return (
              <li key={hit.id}>
                <button
                  type="button"
                  className={cn("ulune-bz-godrow", w.selectedId === ref && "is-on")}
                  data-testid={`bazi-starrow-${hit.id}`}
                  aria-pressed={w.selectedId === ref}
                  onClick={() => w.choose(ref)}
                  {...previewProps(ref)}
                >
                  <span className="ulune-bz-godrow-name">{chineseLabel(star, locale, prefs).text}</span>
                  <span className="ulune-bz-starrow-at">{order.filter((p) => hit.places.includes(p)).map((p) => cnWord(locale, PLACE_WORD[p])).join(" · ")}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="ulune-bz-none">{cnWord(locale, "bzStarsNone")}</p>
      )}
      <button
        type="button"
        className={cn("ulune-bz-godrow ulune-bz-emptyrow", w.selectedId === EMPTY_REF && "is-on")}
        data-testid="bazi-empty"
        aria-pressed={w.selectedId === EMPTY_REF}
        onClick={() => w.choose(EMPTY_REF)}
        {...previewProps(EMPTY_REF)}
      >
        <span className="ulune-bz-godrow-name">{cnWord(locale, "bzEmptyHead")}</span>
        <span className="ulune-bz-starrow-at" lang={prefs.show === "full" ? hanziLang(prefs.script) : undefined}>
          {br(a)} · {br(b)}
        </span>
      </button>
    </section>
  );
}

/** Beside the board, first: the five phases counted, then the strength, the structure and the favourable phases. */
function BalancePanel({ b }: { b: BaziBalance }) {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const w = useWheelView();
  const max = Math.max(...b.phases.map((p) => p.points), 1);
  const row = (ref: string, testId: string, k: string, v: string) => (
    <li>
      <button
        type="button"
        className={cn("ulune-bz-godrow ulune-bz-sumrow", w.selectedId === ref && "is-on")}
        data-testid={testId}
        aria-pressed={w.selectedId === ref}
        onClick={() => w.choose(ref)}
        {...previewProps(ref)}
      >
        <span className="ulune-bz-sumrow-k">{k}</span>
        <span className="ulune-bz-sumrow-v">{v}</span>
      </button>
    </li>
  );
  const fav = phaseList(b.favourable.good, locale);
  const climate = b.favourable.climate ? ` · ${cnWord(locale, "bzFavClimate").toLowerCase()} ${phaseList([b.favourable.climate], locale)}` : "";
  return (
    <section className="ulune-bz-gods ulune-bz-bal" aria-labelledby="bz-bal-h" data-testid="bazi-balance">
      <h2 id="bz-bal-h" className="ulune-bz-h ulune-bz-bal-h">
        <span>{cnWord(locale, "bzBalHead")}</span>
        <button type="button" className="ulune-bz-how" data-testid="bazi-balance-how" aria-pressed={w.selectedId === BALANCE_REF} onClick={() => w.choose(BALANCE_REF)}>
          {cnWord(locale, "bzBalHow")}
        </button>
      </h2>
      <ul className="ulune-bz-bars">
        {b.phases.map((p) => {
          const ref = phaseRef(p.phase);
          const label = chineseLabel(PHASES.find((x) => x.id === p.phase)!, locale, { ...prefs, show: prefs.show === "full" ? "full" : "names" });
          return (
            <li key={p.phase}>
              <button
                type="button"
                className={cn("ulune-bz-bar", w.selectedId === ref && "is-on", p.phase === b.dmPhase && "is-dm")}
                data-phase={p.phase}
                data-testid={`bazi-phase-${p.phase}`}
                aria-pressed={w.selectedId === ref}
                aria-label={`${label.name}: ${cnWord(locale, "bzPoints", { n: fmtPoints(p.points, locale), total: fmtPoints(b.total, locale) })}`}
                onClick={() => w.choose(ref)}
                {...previewProps(ref)}
              >
                <span className="ulune-bz-bar-label">
                  {label.hanzi ? <span lang={hanziLang(prefs.script)}>{label.hanzi} </span> : null}
                  {label.name}
                </span>
                <span className="ulune-bz-bar-track" aria-hidden>
                  <span className="ulune-bz-bar-fill" style={{ width: `${(p.points / max) * 100}%` }} />
                </span>
                <span className="ulune-bz-bar-n">{fmtPoints(p.points, locale)}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <ul className="ulune-bz-sum">
        {row(STRENGTH_REF, "bazi-strength", cnWord(locale, "bzStrength"), strengthWord(b, locale))}
        {row(
          STRUCTURE_REF,
          "bazi-structure",
          cnWord(locale, "bzStructure"),
          `${chineseLabel(STRUCTURE_NAMES[b.structure.id], locale, { ...prefs, show: "names" }).name}${b.special ? ` · ${cnWord(locale, "bzSpecialFlag").toLowerCase()} ${chineseLabel(STRUCTURE_NAMES[b.special], locale, { ...prefs, show: "names" }).name}` : ""}`,
        )}
        {row(FAVOURABLE_REF, "bazi-favourable", cnWord(locale, "bzFav"), `${fav}${climate}`)}
      </ul>
    </section>
  );
}

/** Under the board: the interactions between the pillars, the meetings first. */
function InteractionsList({ list }: { list: Interaction[] }) {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const w = useWheelView();
  const item = (ix: Interaction, n: number) => {
    const l = chineseLabel(ix.level === "stem" ? STEMS[n]! : BRANCHES[n]!, locale, { ...prefs, show: prefs.show === "full" ? "full" : "names" });
    return [l.hanzi, l.name].filter(Boolean).join(" ");
  };
  return (
    <section className="ulune-bz-ix" aria-labelledby="bz-ix-h" data-testid="bazi-interactions">
      <h2 id="bz-ix-h" className="ulune-bz-h">
        {cnWord(locale, "bzIxHead")}
      </h2>
      {list.length ? (
        <ul>
          {list.map((ix) => {
            const ref = ixRef(ix.id);
            return (
              <li key={ix.id}>
                <button
                  type="button"
                  className={cn("ulune-bz-ixrow", w.selectedId === ref && "is-on")}
                  data-testid={`bazi-ix-${ix.id}`}
                  data-tone={interactionTone(ix.kind)}
                  data-transforms={ix.transforms ? "1" : undefined}
                  aria-pressed={w.selectedId === ref}
                  onClick={() => w.choose(ref)}
                  {...previewProps(ref)}
                >
                  <span className="ulune-bz-ixrow-top">
                    <span className="ulune-bz-ixrow-kind">{chineseLabel(INTERACTION_NAMES[ix.kind], locale, prefs).text}</span>
                    <span className="ulune-bz-ixrow-status" data-testid={`bazi-ix-status-${ix.id}`}>
                      {ixStatus(ix, locale)}
                    </span>
                  </span>
                  <span className="ulune-bz-ixrow-sub">
                    <span lang={prefs.show === "full" ? hanziLang(prefs.script) : undefined}>{ix.items.map((n) => item(ix, n)).join(" · ")}</span>
                    <span className="ulune-bz-ixrow-at">{ix.places.map((p) => cnWord(locale, PLACE_WORD[p])).join(" · ")}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="ulune-bz-none">{cnWord(locale, "bzIxNone")}</p>
      )}
    </section>
  );
}

/** Without a birth time, the hour's column says what it would add. */
function MissingHour() {
  const { locale } = useI18n();
  return (
    <section className="ulune-bz-col is-missing" data-place="hour" data-testid="bazi-col-hour-missing">
      <h3 className="ulune-bz-place">{cnWord(locale, "bzPillarHour")}</h3>
      <p className="ulune-bz-missing">{cnWord(locale, "bzNoHour")}</p>
    </section>
  );
}

function GodsList({ c }: { c: BaziChart }) {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const w = useWheelView();
  return (
    <section className="ulune-bz-gods" aria-labelledby="bz-gods-h" data-testid="bazi-gods">
      <h2 id="bz-gods-h" className="ulune-bz-h">
        {cnWord(locale, "bzGodsHead")} <span className="ulune-bz-gods-key">{cnWord(locale, "bzGodsKey")}</span>
      </h2>
      <ul>
        {TEN_GODS.map((g) => {
          const n = c.gods[g.id];
          const ref = godRef(g.id);
          return (
            <li key={g.id}>
              <button
                type="button"
                className={cn("ulune-bz-godrow", w.selectedId === ref && "is-on", !n.shown && !n.hidden && "is-none")}
                data-testid={`bazi-god-${g.id}`}
                data-family={g.family}
                aria-pressed={w.selectedId === ref}
                onClick={() => w.choose(ref)}
                {...previewProps(ref)}
              >
                <span className="ulune-bz-godrow-name">{chineseLabel(g, locale, prefs).text}</span>
                <span className="ulune-bz-godrow-n">
                  {n.shown} · {n.hidden}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function BaziFigure() {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const data = useModeData("bazi");
  const w = useWheelView();
  const c = data?.bazi;
  // Its own scroll comes back where it was when the studio does (reorganisation R6; part 28).
  const scroller = useRef<HTMLDivElement>(null);
  useKeptScroll(scroller, "bazi-scroll", Boolean(c));
  if (!c) return null;
  // Hour to year (the year on the right), as the tradition writes them, or year to hour.
  const cols = [...c.pillars];
  const hour = cols.find((p) => p.id === "hour");
  const order = prefs.pillarOrder === "classical" ? ["hour", "day", "month", "year"] : ["year", "month", "day", "hour"];
  const interactions = data?.interactions ?? [];
  const linked = w.selectedId?.startsWith("bz:ix:") ? (interactions.find((x) => ixRef(x.id) === w.selectedId) ?? null) : null;
  return (
    <div ref={scroller} className="ulune-bz" data-testid="bazi" data-chart-pick>
      <div className="ulune-bz-main">
        <div className="ulune-bz-board" role="group" aria-label={cnWord(locale, "bzBoard")} data-testid="bazi-board" data-order={prefs.pillarOrder}>
        {order.map((id) => {
          if (id === "hour" && !hour) return <MissingHour key="hour" />;
          const p = cols.find((x) => x.id === id)!;
          return <Column key={id} p={p} signs={data?.signs?.pillars.find((x) => x.place === id)} linked={linked} />;
        })}
        </div>
        <InteractionsList list={interactions} />
      </div>
      <div className="ulune-bz-side">
        {data?.balance ? <BalancePanel b={data.balance} /> : null}
        <GodsList c={c} />
        {data?.signs ? <StarsList c={c} signs={data.signs} /> : null}
      </div>
    </div>
  );
}

/** A text's first sentence, for the first read's steps. */
const firstSentence = (t: string) => t.split(/(?<=[.!?])\s/)[0] ?? t;

/**
 * The first read (languages plan, part 19: "a guided path through Day
 * Master, balance, strength and the current luck pillar"), in the side panel
 * with nothing chosen, as Human Design's: numbered steps, each a line or two
 * and opening its reading, then where to go next.
 */
function BaziHello() {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const data = useModeData("bazi");
  const w = useWheelView();
  const c = data?.bazi;
  if (!c || !data) return null;
  const b = data.balance;
  const dm = chineseLabel(STEMS[c.dayMaster]!, locale, prefs);
  const clock = cnWord(locale, prefs.clock === "true-solar" ? "cnClockSolar" : prefs.clock === "local-mean" ? "cnClockMean" : "cnClockCivil").toLowerCase();
  const day = cnWord(locale, prefs.dayBoundary === "23:00" ? "zkDayAt23" : prefs.dayBoundary === "split" ? "zkDaySplit" : "zkDayMidnight");
  type Step = { id: string; ref: string; label: string; value: string; text: string };
  const steps: Step[] = [{ id: "dm", ref: stemRef("day"), label: chineseLabel(DAY_MASTER_NAME, locale, prefs).name, value: dm.text, text: firstSentence(said(DAY_MASTER_IMAGES[c.dayMaster]!, locale)) }];
  if (b) {
    const sorted = [...b.phases].sort((x, y) => y.points - x.points);
    const most = sorted.filter((x) => x.points === sorted[0]!.points);
    const least = sorted.at(-1)!;
    const names = (ids: readonly { phase: PhaseId }[]) => phaseList(ids.map((x) => x.phase), locale);
    steps.push(
      {
        id: "phases",
        ref: BALANCE_REF,
        label: cnWord(locale, "bzBalHead"),
        value: cnWord(locale, "bzFirstMostLeast", { most: names(most), least: names([least]) }),
        text: cnWord(locale, "bzFirstPhases", { most: names(most), mostN: fmtPoints(most[0]!.points, locale), total: fmtPoints(b.total, locale), least: names([least]), leastN: fmtPoints(least.points, locale) }),
      },
      { id: "strength", ref: STRENGTH_REF, label: cnWord(locale, "bzStrength"), value: strengthWord(b, locale), text: firstSentence(said(STRENGTH_TEXTS[b.strength], locale)) },
      {
        id: "structure",
        ref: STRUCTURE_REF,
        label: cnWord(locale, "bzStructure"),
        value: chineseLabel(STRUCTURE_NAMES[b.structure.id], locale, { ...prefs, show: "names" }).name,
        text: firstSentence(said(STRUCTURE_TEXTS[b.structure.id], locale)),
      },
      {
        id: "favourable",
        ref: FAVOURABLE_REF,
        label: cnWord(locale, "bzFav"),
        value: `${phaseList(b.favourable.good, locale)}${b.favourable.climate ? ` · ${cnWord(locale, "bzFavClimate").toLowerCase()} ${phaseList([b.favourable.climate], locale)}` : ""}`,
        text: cnWord(locale, "bzFavLead").split(/(?<=[.!?])\s/)[0] ?? "",
      },
    );
  }
  for (const l of data.lucks) {
    const now = luckAt(l, Date.now());
    const label = `${cnWord(locale, "bzlInLuck")}${data.lucks.length > 1 ? ` · ${countWord(l.count, locale)}` : ""}`;
    steps.push(
      now
        ? {
            id: `luck-${l.count}`,
            ref: luckRef(l.count, now.index),
            label,
            value: `${chineseLabel(SIXTY[now.pillar.cycle]!, locale, { ...prefs, show: "names" }).name} · ${cnWord(locale, "bzlAges", { from: Math.floor(now.fromAge), to: Math.floor(now.toAge) })}`,
            text: said(LUCK_GOD_TEXTS[now.god], locale),
          }
        : { id: `luck-${l.count}`, ref: luckRef(l.count, 1), label, value: "", text: cnWord(locale, "bzFirstLuckBefore", { age: ageWords(l.start, locale) }) },
    );
  }
  return (
    <section className="ulune-hd-first ulune-bz-first" data-testid="bazi-hello" aria-labelledby="ulune-bz-first-title">
      <h3 id="ulune-bz-first-title" className="ulune-kicker ulune-hd-first-title">
        {cnWord(locale, "bzFirstTitle")}
      </h3>
      <p className="ulune-zk-hello-p">{cnWord(locale, "bzLead")}</p>
      <ol className="ulune-hd-steps">
        {steps.map((st, i) => (
          <li key={st.id}>
            <button
              type="button"
              data-testid={`bazi-hello-${st.id}`}
              className={cn("ulune-hd-step", w.selectedId === st.ref && "is-on")}
              aria-label={`${i + 1}. ${st.label}${st.value ? `: ${st.value}` : ""}. ${st.text}`}
              onClick={() => w.pick(st.ref)}
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
                <span className="ulune-hd-step-text">{st.text}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
      <p className="ulune-hd-first-next" data-testid="bazi-first-next">
        {cnWord(locale, "bzFirstNext")}{" "}
        <Link to="/bazi/cycles" className="ob-keep-link" data-testid="bazi-first-cycles">
          {cnWord(locale, "bzFirstCycles")}
        </Link>
      </p>
      {c.timeUnknown ? <p className="ulune-zk-hello-p">{cnWord(locale, "bzNoHour")}</p> : null}
      <p className="ulune-zk-hello-note" data-testid="bazi-clock">
        {cnWord(locale, "zkClockLine", { clock, day })}{" "}
        <Link to="/settings" hash="chinese" className="ob-keep-link" data-testid="bazi-settings-link">
          {cnWord(locale, "zkSettingsLink")}
        </Link>
      </p>
    </section>
  );
}

const loadTable = () => import("@/studio/tables/bazi-table");
const BaziTable = lazyNamed(loadTable, "BaziTable");

function BaziData() {
  const data = useModeData("bazi");
  const w = useWheelView();
  const count = useStudioStore((s) => s.input.chineseCount);
  const c = data?.bazi;
  if (!c) return null;
  return (
    <Suspense fallback={<LoadingLines testId="table-loading" lines={6} />}>
      <BaziTable c={c} name={w.chart?.meta.name ?? ""} count={count === "yang" || count === "yin" ? count : undefined} selectedId={w.selectedId} onSelect={w.pick} />
    </Suspense>
  );
}

function useBaziRuntime(): ModeRuntime<BaziState> {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const chart = useStudioStore((s) => s.chart);
  const page = useStudioStore((s) => s.page);
  const selectedId = useStudioStore((s) => s.selectedId);
  const enabled = page === "bazi" && Boolean(chart);
  const bazi = useMemo(
    () =>
      enabled && chart
        ? baziChart(
            { utc: chart.meta.utc, date: chart.meta.date, time: chart.meta.time, longitude: chart.meta.longitude, timeUnknown: chart.meta.timeUnknown },
            { clock: prefs.clock, dayBoundary: prefs.dayBoundary },
          )
        : null,
    [enabled, chart, prefs.clock, prefs.dayBoundary],
  );
  const signs = useMemo(() => (bazi ? baziSigns(bazi) : null), [bazi]);
  const interactions = useMemo(() => (bazi ? baziInteractions(bazi) : []), [bazi]);
  const balance = useMemo(() => (bazi ? baziBalance(bazi) : null), [bazi]);
  const count = useStudioStore((s) => s.input.chineseCount);
  const lucks = useMemo(() => {
    if (!bazi) return [];
    const counts: LuckCount[] = count === "yang" || count === "yin" ? [count] : ["yang", "yin"];
    return counts.map((n) => luckPillars(bazi, n));
  }, [bazi, count]);
  const reading = useMemo(() => {
    if (!bazi) return null;
    // The first read's luck pillar opens its reading here, as on the Cycles page.
    if (selectedId?.startsWith("bz:luck:")) {
      const year = flowYear(bazi, flowYearOf(Date.now()), lucks);
      return luckReading({ c: bazi, lucks, year, day: null, tz: chart?.meta.timezone }, selectedId, locale, prefs);
    }
    return baziReading(bazi, selectedId, locale, prefs);
  }, [bazi, lucks, selectedId, locale, prefs, chart]);
  const data = useMemo(() => ({ bazi, signs, interactions, balance, lucks, enabled }), [bazi, signs, interactions, balance, lucks, enabled]);
  return useMemo(() => ({ data, reading }), [data, reading]);
}

export const baziMode: ModeDef = {
  ...MODE_META.bazi,
  emptyText: (locale) => cnWord(locale, "bzEmpty"),
  Figure: BaziFigure,
  HelloEmpty: BaziHello,
  Data: BaziData,
  preloadData: () => prefetch(loadTable),
  useRuntime: useBaziRuntime,
};
