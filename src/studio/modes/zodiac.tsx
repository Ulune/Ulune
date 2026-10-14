import { Suspense, useMemo, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { BRANCHES, SIXTY, phaseWord } from "@/lib/chinese/names";
import { chineseLabel } from "@/lib/chinese/prefs";
import { useChinesePrefs } from "@/lib/chinese/use-chinese-prefs";
import { cnWord, animalOf, theAnimal } from "@/lib/chinese/words";
import { zodiacChart, ZODIAC_PLACES, type ZodiacChart } from "@/lib/chinese/zodiac";
import { PLACE_ANIMAL, PLACE_WORD, placeRef, relationLine, relationRef, zodiacReading } from "@/lib/chinese/zodiac-reading";
import { relationTone } from "@/lib/chinese/relations";
import { lazyNamed, prefetch } from "@/lib/lazy-component";
import { AnimalGlyph } from "@/components/animal-glyph";
import { LoadingLines } from "@/components/loading-lines";
import { AnimalWheel, type WheelBadge } from "@/studio/modes/zodiac-wheel";
import { HowUluneCalculates, MethodNotes } from "@/studio/modes/chinese-notes";
import { useMethodNotes } from "@/studio/modes/hooks/useMethodNotes";
import { animalChar, hanziLang } from "@/lib/chinese/animal-chars";
import { previewProps } from "@/lib/depth/preview-bus";
import { useI18n } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import { useModeData } from "@/studio/modes/data";
import { MODE_META } from "@/studio/modes/meta";
import type { ModeDef, ModeRuntime } from "@/studio/modes/types";
import { useWheelView } from "@/studio/modes/wheel-view";
import { useKeptScroll } from "@/studio/return-parts";
import { useStudioStore } from "@/studio/store";
import "@/studio/modes/styles/zodiac.css";

/*
 * Chinese astrology (languages plan, language 1, part 7, at /chinese-astrology):
 * the four animals of a birth on the wheel of the twelve, each in its compass
 * place (the Rat at the north, at the top; the Rabbit east, the Horse south,
 * the Rooster west), in its branch's phase colour, with the reader's year,
 * month, day and hour marked, and this year's and this month's animals on
 * the rim. Below or beside it, the four animals as cards. Everything is
 * worked out here from the cast chart, on the reader's clock and day
 * boundary (Settings → Chinese traditions); nothing is sent. The relations
 * between the animals (part 8) are drawn across it; each animal is Ulune's
 * drawing of it (part 9), or its character if the reader prefers. Their
 * readings (part 10), Pair and the year ahead (part 11) follow. Part 29 adds
 * the method notes to the side panel's first read (chinese-notes.tsx).
 */

export type ZodiacState = {
  zodiac: ZodiacChart | null;
  enabled: boolean;
};

/** A place's initial on its badge: Y, M, D, H (A, M, J, H in French). */
const initial = (word: string) => word.charAt(0).toUpperCase();

/** The reader's wheel: the four animals as badges, the relations between them as lines, the year's pillar in the centre. */
function ZodiacWheel({ z }: { z: ZodiacChart }) {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const badges = useMemo<WheelBadge[]>(
    () =>
      z.places.map((p) => ({
        key: p.id,
        branch: p.branch,
        initial: initial(cnWord(locale, PLACE_WORD[p.id])),
        ref: placeRef(p.id),
        place: p.id,
        testId: `zodiac-badge-${p.id}`,
        uncertain: p.uncertain,
      })),
    [z, locale],
  );
  const lines = useMemo(() => linesOf(z), [z]);
  const yearPair = chineseLabel(SIXTY[z.places[0]!.pillar.cycle]!, locale, prefs);
  const mine = (branch: number) => {
    const places = z.places.filter((p) => p.branch === branch).map((p) => cnWord(locale, PLACE_WORD[p.id]).toLowerCase());
    return places.length ? cnWord(locale, "zkSectorYours", { places: places.join(", ") }) : "";
  };
  return (
    <AnimalWheel
      badges={badges}
      lines={lines}
      mine={mine}
      stopBranch={z.places[0]!.branch}
      nowYearBranch={z.now.year.branch}
      nowMonthBranch={z.now.month.branch}
      centre={{ hanzi: yearPair.hanzi, name: yearPair.name, sub: cnWord(locale, "zkYearAnimal") }}
      label={cnWord(locale, "zkWheel")}
    />
  );
}

/**
 * The lines the wheel draws between the reader's animals, one a pair of
 * different animals: a clash dashed straight across, a harmony or a trine
 * solid (the plan: "harmonies and trines drawn as lines and clashes as
 * dashed lines across"). Harms, punishments and destructions are in the
 * table and the readings, where words can say them.
 */
function linesOf(z: ZodiacChart): { ref: string; kind: "harmony" | "trine" | "clash"; a: number; b: number }[] {
  const seen = new Set<string>();
  const out: { ref: string; kind: "harmony" | "trine" | "clash"; a: number; b: number }[] = [];
  for (const r of z.relations) {
    if (r.kind !== "harmony" && r.kind !== "trine" && r.kind !== "clash") continue;
    const key = [...r.branches].sort((x, y) => x - y).join("-");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ref: relationRef(r), kind: r.kind, a: r.branches[0], b: r.branches[1] });
  }
  return out;
}

/** The four animals as cards: the place, the animal, its pillar's name and characters. */
function ZodiacCards({ z }: { z: ZodiacChart }) {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const w = useWheelView();
  return (
    <ul className="ulune-zk-cards" data-testid="zodiac-cards">
      {ZODIAC_PLACES.map((id) => {
        const p = z.places.find((x) => x.id === id);
        if (!p) {
          return (
            <li key={id} className="ulune-zk-card is-missing" data-testid={`zodiac-card-${id}`}>
              <span className="ulune-zk-card-k">{cnWord(locale, PLACE_ANIMAL[id])}</span>
              <span className="ulune-zk-card-note">{cnWord(locale, "zkNoHour")}</span>
            </li>
          );
        }
        const pair = chineseLabel(SIXTY[p.pillar.cycle]!, locale, prefs);
        const animal = chineseLabel(BRANCHES[p.branch]!, locale, prefs);
        const ref = placeRef(id);
        const on = w.selectedId === ref;
        return (
          <li key={id} className="ulune-zk-card-li">
            <button
              type="button"
              className={cn("ulune-zk-card", on && "is-on")}
              data-testid={`zodiac-card-${id}`}
              data-phase={p.branchPhase}
              data-uncertain={p.uncertain ? "1" : undefined}
              aria-pressed={on}
              onClick={() => w.pick(ref)}
              {...previewProps(ref)}
            >
              <span className="ulune-zk-card-k">
                {cnWord(locale, PLACE_ANIMAL[id])}
                {p.uncertain ? <span className="ulune-zk-card-tilde"> ~</span> : null}
              </span>
              <span className="ulune-zk-card-animal">
                {prefs.animals === "drawings" ? <AnimalGlyph animal={p.branch} size={24} className="ulune-zk-card-glyph" /> : null}
                {prefs.show === "full" ? (
                  <span className="ulune-zk-card-hanzi" lang={hanziLang(prefs.script)}>
                    {animalChar(p.branch, prefs.script)}
                  </span>
                ) : null}
                <span>{animal.name}</span>
                {/* The card's colour is its animal's phase: said in words too (part 30). */}
                <span className="sr-only">, {phaseWord(p.branchPhase, locale)}</span>
              </span>
              <span className="ulune-zk-card-pair">
                {pair.name}
                {pair.pinyin ? <span className="ulune-zk-card-py"> · {pair.pinyin}</span> : null}
                {pair.hanzi ? (
                  <span className="ulune-zk-card-py" lang={hanziLang(prefs.script)}>
                    {" "}
                    {pair.hanzi}
                  </span>
                ) : null}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function ZodiacFigure() {
  const data = useModeData("zodiac");
  const z = data?.zodiac;
  // Its own scroll comes back where it was when the studio does (reorganisation R6; part 28).
  // The last argument wakes the hook when the page is first drawn.
  const scroller = useRef<HTMLDivElement>(null);
  useKeptScroll(scroller, "zodiac-scroll", Boolean(z));
  if (!z) return null;
  return (
    <div ref={scroller} className="ulune-zk" data-testid="zodiac" data-chart-pick>
      <div className="ulune-zk-wheel-box">
        <ZodiacWheel z={z} />
      </div>
      <ZodiacCards z={z} />
    </div>
  );
}

/**
 * The side panel with nothing chosen: what the four animals are, the clock read, the New Year note, now;
 * first the notes the birth calls for, last how Ulune calculates (part 29, chinese-notes.tsx).
 */
function ZodiacHello() {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const data = useModeData("zodiac");
  const w = useWheelView();
  const notes = useMethodNotes("zodiac", w.chart);
  const z = data?.zodiac;
  if (!z) return null;
  const clock = cnWord(locale, prefs.clock === "true-solar" ? "cnClockSolar" : prefs.clock === "local-mean" ? "cnClockMean" : "cnClockCivil").toLowerCase();
  const day = cnWord(locale, prefs.dayBoundary === "23:00" ? "zkDayAt23" : prefs.dayBoundary === "split" ? "zkDaySplit" : "zkDayMidnight");
  return (
    <section className="ulune-zk-hello" data-testid="zodiac-hello">
      <MethodNotes notes={notes} />
      <h2 className="ulune-zk-hello-h">{cnWord(locale, "zkTitle")}</h2>
      <p className="ulune-zk-hello-p">{cnWord(locale, "zkLead")}</p>
      <ol className="ulune-zk-hello-list">
        {z.places.map((p) => {
          const pair = chineseLabel(SIXTY[p.pillar.cycle]!, locale, prefs);
          return (
            <li key={p.id}>
              <button type="button" className="ulune-zk-hello-row" data-testid={`zodiac-hello-${p.id}`} onClick={() => w.pick(placeRef(p.id))}>
                <b>{cnWord(locale, PLACE_WORD[p.id])}</b>
                <span>{pair.text}</span>
              </button>
            </li>
          );
        })}
      </ol>
      {z.timeUnknown ? <p className="ulune-zk-hello-p">{cnWord(locale, "zkNoHour")}</p> : null}
      <h3 className="ulune-zk-hello-h3">{cnWord(locale, "zkRelations")}</h3>
      {z.relations.length ? (
        <ul className="ulune-zk-hello-list" data-testid="zodiac-relations">
          {z.relations.map((r) => (
            <li key={relationRef(r)}>
              <button
                type="button"
                className="ulune-zk-hello-row is-rel"
                data-tone={relationTone(r.kind)}
                data-testid={`zodiac-rel-${r.kind}-${r.places.join("-")}`}
                onClick={() => w.pick(relationRef(r))}
              >
                <span>{relationLine(z, r, locale, prefs)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="ulune-zk-hello-p" data-testid="zodiac-relations-none">
          {cnWord(locale, "zkRelationsNone")}
        </p>
      )}
      {z.newYearAnimal != null ? (
        <p className="ulune-zk-hello-p" data-testid="zodiac-newyear">
          {cnWord(locale, "zkNewYear", { theAnimal: theAnimal(z.newYearAnimal, locale) })}
        </p>
      ) : null}
      <p className="ulune-zk-hello-p">
        {cnWord(locale, "zkNowLine", {
          year: cnWord(locale, "zkNowYear", { animal: animalOf(z.now.year.branch, locale) }),
          month: cnWord(locale, "zkNowMonth", { animal: animalOf(z.now.month.branch, locale) }),
        })}
      </p>
      <p className="ulune-zk-hello-note" data-testid="zodiac-clock">
        {cnWord(locale, "zkClockLine", { clock, day })}{" "}
        <Link to="/settings" hash="chinese" className="ob-keep-link" data-testid="zodiac-settings-link">
          {cnWord(locale, "zkSettingsLink")}
        </Link>
      </p>
      <HowUluneCalculates page="zodiac" />
    </section>
  );
}

const loadTable = () => import("@/studio/tables/zodiac-table");
const ZodiacTable = lazyNamed(loadTable, "ZodiacTable");

/** The table view (part 8): the four animals with every layer, and the relations between them. */
function ZodiacData() {
  const data = useModeData("zodiac");
  const w = useWheelView();
  const z = data?.zodiac;
  if (!z) return null;
  return (
    <Suspense fallback={<LoadingLines testId="table-loading" lines={6} />}>
      <ZodiacTable z={z} name={w.chart?.meta.name ?? ""} selectedId={w.selectedId} onSelect={w.pick} />
    </Suspense>
  );
}

function useZodiacRuntime(): ModeRuntime<ZodiacState> {
  const { locale } = useI18n();
  const prefs = useChinesePrefs();
  const chart = useStudioStore((s) => s.chart);
  const page = useStudioStore((s) => s.page);
  const selectedId = useStudioStore((s) => s.selectedId);
  const enabled = page === "zodiac" && Boolean(chart);
  const zodiac = useMemo(
    () =>
      enabled && chart
        ? zodiacChart(
            { utc: chart.meta.utc, date: chart.meta.date, time: chart.meta.time, longitude: chart.meta.longitude, timeUnknown: chart.meta.timeUnknown },
            { clock: prefs.clock, dayBoundary: prefs.dayBoundary },
          )
        : null,
    [enabled, chart, prefs.clock, prefs.dayBoundary],
  );
  const reading = useMemo(
    () => (zodiac ? zodiacReading(zodiac, selectedId, locale, prefs, chart?.meta.timezone) : null),
    [zodiac, selectedId, locale, prefs, chart],
  );
  const data = useMemo(() => ({ zodiac, enabled }), [zodiac, enabled]);
  return useMemo(() => ({ data, reading }), [data, reading]);
}

export const zodiacMode: ModeDef = {
  ...MODE_META.zodiac,
  emptyText: (locale) => cnWord(locale, "zkEmpty"),
  Figure: ZodiacFigure,
  HelloEmpty: ZodiacHello,
  Data: ZodiacData,
  preloadData: () => prefetch(loadTable),
  useRuntime: useZodiacRuntime,
};
