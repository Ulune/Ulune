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
import { useModeDef } from "@/studio/modes/registry";
import type { StudioPage } from "@/studio/url";
import { useWheelView } from "@/studio/modes/wheel-view";
import { rememberGroupPage } from "@/studio/shell/GroupBar";
import { useStudioUrl } from "@/studio/use-studio-url";
import { useStudioStore } from "@/studio/store";
import { useEffect, useRef, useState } from "react";

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
  const [trail, setTrail] = useState<{ id: string; title: string }[]>([]);
  const internal = useRef(false);
  const selectedId = reading?.id ?? null;
  useEffect(() => {
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
      rememberGroupPage("transits");
      useStudioStore.setState({ selectedId: null });
      setStudioPage("transits");
      return;
    }
    // Another system's reading of the same thing (review 3 Oct, R4):
    // "go:design:act:personality:sun" opens it on that page.
    const across = /^go:(natal|design|numerology):(.+)$/.exec(ref);
    if (across) {
      const [, target, id] = across as unknown as [string, StudioPage, string];
      rememberGroupPage(target);
      useStudioStore.setState({ selectedId: id, dock: "reading", dockOpen: true });
      setStudioPage(target);
      return;
    }
    // "calendar-year:2027": the Calendar's year view on that year.
    if (ref.startsWith("calendar-year:")) {
      const year = Number(ref.slice("calendar-year:".length));
      if (!Number.isInteger(year)) return;
      useStudioStore.setState({ calendarAt: { year }, selectedId: null });
      rememberGroupPage("timing");
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

  if (!chart) {
    return <p className="ulune-empty-body px-[var(--stage-pad)] py-4">{t("blankHint")}</p>;
  }

  return (
    <div className="ulune-dock-scroll flex flex-col gap-[var(--space-3)] px-[var(--stage-pad)] py-[var(--space-3)]">
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
            mode={page}
          />
        </div>
      ) : (
        <>
          <AiReadingFocus chart={chart} reading={natalRoot} />
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
          ) : isComposeMode(page) ? (
            <ModeCompose mode={page} chart={chart} />
          ) : null}
        </>
      )}
      <GlossaryDetails page={page} selectedId={selectedId0} />
    </div>
  );
}

function packKindOf(page: StudioPage): PackKind {
  if (page === "design") return "hd";
  if (page === "numerology") return "num";
  if (page === "timing") return "cal";
  return "astro";
}
