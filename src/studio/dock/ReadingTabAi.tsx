import { ComposeToolbar, FullReading } from "@/components/reading-ai";
import type { GrokReading, NatalChart } from "@/lib/chart/types";
import { ModeCompose, isComposeMode } from "@/studio/dock/ModeCompose";
import type { StudioPage } from "@/studio/url";

/*
 * The Reading tab's composed readings while AI readings are on (lib/features.ts): the natal portrait with
 * its button, or a mode's own composer (transits, progressions, synastry, composite). Its own download,
 * fetched by ReadingTab only while AI readings are on (the 2.0 fixes, item 3): off, none of it is in a
 * page's first download.
 */
export function AiCompose({
  page,
  chart,
  grok,
  composing,
  composeError,
  onCompose,
}: {
  page: StudioPage;
  chart: NatalChart | null;
  grok: GrokReading | null;
  composing: boolean;
  composeError: string | null;
  onCompose: () => void;
}) {
  if (page === "natal") {
    return (
      <section className="ob-portrait" data-testid="natal-portrait" style={{ order: grok ? -1 : 0 }}>
        <FullReading grok={grok} pending={composing} error={composing ? null : composeError} />
        <ComposeToolbar grok={grok} pending={composing} error={composing ? null : composeError} onCompose={onCompose} />
      </section>
    );
  }
  return isComposeMode(page) && chart ? <ModeCompose mode={page} chart={chart} /> : null;
}
