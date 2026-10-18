import { ComposeToolbar, FullReading, ReadingPanel } from "@/components/reading-panel";
import { AiReadingFocus } from "@/components/ai-reading-focus";
import { ModeCompose, isComposeMode } from "@/studio/dock/ModeCompose";
import { natalRootReading } from "@/lib/chart/dossier";
import { AI_ENABLED } from "@/lib/features";
import { LoadingLines } from "@/components/loading-lines";
import { GlossaryDetails } from "@/components/glossary-details";
import { packNow, usePack, type PackKind } from "@/lib/content/packs";
import { useI18n } from "@/lib/i18n/locale";
import { useModeReading } from "@/studio/modes/data";
import { MODE_META } from "@/studio/modes/meta";
import { useModeDef } from "@/studio/modes/registry";
import type { StudioPage } from "@/studio/url";
import { languageById, languageOf } from "@/studio/map";
import { useWheelView } from "@/studio/modes/wheel-view";
import { useStudioUrl } from "@/studio/use-studio-url";
import { useStudioStore } from "@/studio/store";
import { useEffect, useRef, useState } from "react";
import { keptOr, useKeep, useKeptScroll } from "@/studio/return-parts";

export function ReadingTab() {
  const { locale, t } = useI18n();
  const page = useStudioStore((s) => s.page);
  const chart = useStudioStore((s) => s.chart);
  const dossier = useStudioStore((s) => s.dossier);
  const grok = useStudioStore((s) => s.grok);
  const compose = useStudioStore((s) => s.compose);
  const composing = useStudioStore((s) => s.composing);
  const composeError = useStudioStore((s) => s.composeError);
  const { readingDepth } = useWheelView();
  const { setPage: setStudioPage } = useStudioUrl({ hydrate: false });
  const reading = useModeReading();
  const { def } = useModeDef(page);
  const selectedId0 = useStudioStore((s) => s.selectedId);
  // A reading asked for before its text has arrived: a quiet stand-in.
  const kind = packKindOf(page);
  const packReady = usePack(kind, locale, Boolean(selectedId0));
  const textMissing = !packReady && !packNow(kind, locale);
  // (The natal readings are built from the text once it lands: one more beat.)
  const readingPending =
    Boolean(selectedId0) && !reading && (textMissing || (page === "natal" && !dossier));
  const natalRoot = natalRootReading(dossier);
  // Back trail: readings opened from a fact or row inside another reading.
  // Any other change of selection (wheel, table, hello) starts a new trail.
  // Kept, with where the panel was scrolled, when the reader leaves the studio and comes back (R6).
  const [trail, setTrail] = useState<{ id: string; title: string }[]>(() => keptOr("reading-trail", []));
  useKeep("reading-trail", trail);
  const scroller = useRef<HTMLDivElement>(null);
  useKeptScroll(scroller, "dock-reading");
  const internal = useRef(false);
  const selectedId = reading?.id ?? null;
  const firstRun = useRef(true);
  useEffect(() => {
    // The trail a return brought back stays; later changes of selection start a new one.
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (internal.current) {
      internal.current = false;
      return;
    }
    // Only when there is a trail to clear: an empty one stays as it is (no extra render).
    setTrail((tr) => (tr.length ? [] : tr));
  }, [selectedId, page]);
  const go = (ref: string) => {
    if (!reading || ref === reading.id) return;
    // "See the sky at that moment": Transits, its clock pinned to that minute.
    if (ref.startsWith("transits-at:")) {
      const at = Number(ref.slice("transits-at:".length));
      if (!Number.isFinite(at)) return;
      useStudioStore.getState().pin(at);
      useStudioStore.setState({ selectedId: null });
      setStudioPage("transits");
      return;
    }
    // Another system's reading of the same thing (review 3 Oct, R4):
    // "go:design:act:personality:sun" opens it on that page.
    const across = /^go:(natal|design|numerology):(.+)$/.exec(ref);
    if (across) {
      const [, target, id] = across as unknown as [string, StudioPage, string];
      useStudioStore.setState({ selectedId: id, dock: "reading", dockOpen: true });
      setStudioPage(target);
      return;
    }
    // "calendar-year:2027": the Calendar's year view on that year.
    if (ref.startsWith("calendar-year:")) {
      const year = Number(ref.slice("calendar-year:".length));
      if (!Number.isInteger(year)) return;
      useStudioStore.setState({ calendarAt: { year }, selectedId: null });
      setStudioPage("timing");
      return;
    }
    internal.current = true;
    setTrail((tr) => [...tr, { id: reading.id, title: reading.title }].slice(-12));
    useStudioStore.setState({ selectedId: ref, dock: "reading", dockOpen: true });
  };
  const back = () => {
    const prev = trail[trail.length - 1];
    if (!prev) return;
    internal.current = true;
    setTrail((tr) => tr.slice(0, -1));
    useStudioStore.setState({ selectedId: prev.id });
  };

  // The Calendar reads the sky without a chart (reorganisation plan, R5), Feng Shui's Home a home
  // (FS13); the other pages wait for one.
  if (!chart && MODE_META[page].needsChart) {
    return <p className="ulune-empty-body px-[var(--stage-pad)] py-4">{t("blankHint")}</p>;
  }

  return (
    <div ref={scroller} className="ulune-dock-scroll flex flex-col gap-[var(--space-3)] px-[var(--stage-pad)] py-[var(--space-3)]">
      {readingPending ? (
        <LoadingLines testId="reading-loading" lines={5} />
      ) : reading ? (
        <div data-testid="click-note">
          <ReadingPanel
            reading={reading}
            grokPending={composing}
            chart={chart}
            depth={readingDepth}
            onGo={go}
            back={trail.length ? trail[trail.length - 1].title : null}
            onBack={back}
            mode={page === "numerology-cycles" || page === "numerology-pair" ? "numerology" : page === "design-pair" ? undefined : page === "zodiac" || page === "zodiac-years" || page === "zodiac-pair" || page === "bazi" || page === "bazi-luck" || page === "bazi-pair" || page === "fengshui" || page === "fengshui-pair" || page === "fengshui-home" || page === "fengshui-cycles" ? undefined : page}
            tradition={languageOf(page) ?? "astrology"}
          />
        </div>
      ) : (
        <>
          {/* What Your AI reads about, while AI readings are on (lib/features.ts): off, none of it is downloaded. */}
          {AI_ENABLED ? <AiReadingFocus chart={chart} reading={natalRoot} /> : null}
          <div data-testid="click-reading-empty">
            {def ? <def.HelloEmpty /> : <LoadingLines lines={3} />}
          </div>
          {!AI_ENABLED ? null : page === "natal" ? (
            <section className="ob-portrait" data-testid="natal-portrait" style={{ order: grok ? -1 : 0 }}>
              <FullReading grok={grok} pending={composing} error={composing ? null : composeError} />
              <ComposeToolbar
                grok={grok}
                pending={composing}
                error={composing ? null : composeError}
                onCompose={() => void compose(locale)}
              />
            </section>
          ) : isComposeMode(page) && chart ? (
            <ModeCompose mode={page} chart={chart} />
          ) : null}
        </>
      )}
      {/* The glossary's words are astrology's, Human Design's and numerology's: not a Chinese page's (languages plan, part 29); its terms come with the encyclopedia. */}
      {chinesePage(page) ? null : <GlossaryDetails page={page} selectedId={selectedId0} />}
    </div>
  );
}

function chinesePage(page: StudioPage): boolean {
  const lang = languageOf(page);
  return lang != null && languageById(lang).group === "chinese";
}

function packKindOf(page: StudioPage): PackKind {
  if (page === "design") return "hd";
  // Human Design's connection chart (feature 5a): its readings come from a pack of their own.
  if (page === "design-pair") return "hdpair";
  if (page === "numerology" || page === "numerology-cycles") return "num";
  // Numerology's Relationship (feature 5c): its pairs' texts, a pack of their own.
  if (page === "numerology-pair") return "numpair";
  if (page === "timing") return "cal";
  return "astro";
}
