import { Suspense, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { LoadingLines } from "@/components/loading-lines";
import { BRANCHES, PHASES, STEMS } from "@/lib/chinese/names";
import { chineseLabel } from "@/lib/chinese/prefs";
import { useChinesePrefs } from "@/lib/chinese/use-chinese-prefs";
import { cnWord } from "@/lib/chinese/words";
import { DAY_MASTER_NAME, TEN_GODS, baziChart, tenGodById, type BaziChart, type BaziPillar } from "@/lib/chinese/bazi";
import { DAY_MASTER_IMAGES } from "@/lib/chinese/bazi-texts";
import { PILLAR_WORD, baziReading, branchCellRef, godRef, hiddenRef, stemRef } from "@/lib/chinese/bazi-reading";
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
 * sent. The life stages, Na Yin, empty branches and stars come with part 13.
 */

export type BaziState = {
  bazi: BaziChart | null;
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

function Column({ p }: { p: BaziPillar }) {
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
        className={cn("ulune-bz-cell is-stem", w.selectedId === sRef && "is-on")}
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
        className={cn("ulune-bz-cell is-branch", w.selectedId === bRef && "is-on")}
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
  const c = data?.bazi;
  if (!c) return null;
  // Hour to year (the year on the right), as the tradition writes them, or year to hour.
  const cols = [...c.pillars];
  const hour = cols.find((p) => p.id === "hour");
  const order = prefs.pillarOrder === "classical" ? ["hour", "day", "month", "year"] : ["year", "month", "day", "hour"];
  return (
    <div className="ulune-bz" data-testid="bazi" data-chart-pick>
      <div className="ulune-bz-board" role="group" aria-label={cnWord(locale, "bzBoard")} data-testid="bazi-board" data-order={prefs.pillarOrder}>
        {order.map((id) => {
          if (id === "hour" && !hour) return <MissingHour key="hour" />;
          const p = cols.find((x) => x.id === id)!;
          return <Column key={id} p={p} />;
        })}
      </div>
      <GodsList c={c} />
    </div>
  );
}

/** The side panel with nothing chosen: the Day Master and its image, the board in a sentence, the clock read. */
function BaziHello() {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const data = useModeData("bazi");
  const w = useWheelView();
  const c = data?.bazi;
  if (!c) return null;
  const dm = chineseLabel(STEMS[c.dayMaster]!, locale, prefs);
  const clock = cnWord(locale, prefs.clock === "true-solar" ? "cnClockSolar" : prefs.clock === "local-mean" ? "cnClockMean" : "cnClockCivil").toLowerCase();
  const day = cnWord(locale, prefs.dayBoundary === "23:00" ? "zkDayAt23" : prefs.dayBoundary === "split" ? "zkDaySplit" : "zkDayMidnight");
  return (
    <section className="ulune-zk-hello" data-testid="bazi-hello">
      <h2 className="ulune-zk-hello-h">{cnWord(locale, "bzTitle")}</h2>
      <p className="ulune-zk-hello-p">{cnWord(locale, "bzLead")}</p>
      <ol className="ulune-zk-hello-list">
        <li>
          <button type="button" className="ulune-zk-hello-row" data-testid="bazi-hello-dm" onClick={() => w.pick(stemRef("day"))}>
            <b>{chineseLabel(DAY_MASTER_NAME, locale, prefs).name}</b>
            <span>{dm.text}</span>
          </button>
        </li>
      </ol>
      <p className="ulune-zk-hello-p">{said(DAY_MASTER_IMAGES[c.dayMaster]!, locale)}</p>
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
  const c = data?.bazi;
  if (!c) return null;
  return (
    <Suspense fallback={<LoadingLines testId="table-loading" lines={6} />}>
      <BaziTable c={c} name={w.chart?.meta.name ?? ""} selectedId={w.selectedId} onSelect={w.pick} />
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
  const reading = useMemo(() => (bazi ? baziReading(bazi, selectedId, locale, prefs) : null), [bazi, selectedId, locale, prefs]);
  const data = useMemo(() => ({ bazi, enabled }), [bazi, enabled]);
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
