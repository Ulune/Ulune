import type { TimingHit, TimingScope } from "@/lib/chart/transit-exact";
import { planetPaint } from "@/lib/look";
import { useLookShape } from "@/lib/look-provider";
import { TIMING_HELLO, timingHelloEmpty, timingHelloLine } from "@/lib/i18n/timing-hello";
import { bodyLabel } from "@/lib/i18n/astro";
import { timingWhen } from "@/lib/chart/timing-window";
import { useI18n } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import { previewProps } from "@/lib/depth/preview-bus";
import { useChartHoverId } from "@/lib/depth/use-chart-hover";
import { PlanetGlyph } from "./glyphs";

export function TimingHello({
  hits,
  scope,
  tz,
  selectedId,
  onSelect,
}: {
  hits: Array<TimingHit | null>;
  scope: TimingScope;
  tz: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { locale } = useI18n();
  const chartHover = useChartHoverId();
  const look = useLookShape();
  const cells: Array<TimingHit | null> = [hits[0] ?? null, hits[1] ?? null, hits[2] ?? null];
  const whenKind = scope === "day" ? "time" : "day";

  return (
    <section
      data-testid="timing-hello"
      data-hello-id={TIMING_HELLO.id}
      className="ulune-hello ulune-panel"
      aria-label={TIMING_HELLO.title}
    >
      {cells.map((hit, i) => {
        if (!hit) {
          return (
            <div
              key={`empty-${i}`}
              data-testid={`timing-hello-empty-${i}`}
              data-hello-cell="empty"
              className="ulune-hello-cell"
            >
              <span data-hello-copy className="ulune-hello-copy">
                {timingHelloEmpty(locale, scope)}
              </span>
            </div>
          );
        }
        const selectId = `timing:${hit.id}`;
        const active = selectedId === selectId;
        const color = planetPaint(hit.moving, "aries", look.planets);
        const when = timingWhen(hit.exactUtc, tz, locale, whenKind);
        const sentence = timingHelloLine(locale, hit.type, hit.natal, when);
        const label = bodyLabel(hit.moving, locale);
        return (
          <button
            key={hit.id}
            type="button"
            data-testid={`timing-hello-${i}`}
            data-hello-cell={hit.moving}
            data-hello-aspect={hit.id}
            onClick={() => onSelect(selectId)}
            {...previewProps(selectId)}
            data-previewed={chartHover === selectId ? "1" : undefined}
            aria-label={`${label}. ${sentence}`}
            className={cn("ulune-hello-cell", active && "bg-bg-subtle")}
          >
            <span className="ulune-hello-head">
              <span className="ulune-hello-glyph" style={{ color }} aria-hidden>
                <PlanetGlyph id={hit.moving} size={14} />
              </span>
              <span data-hello-title className="ulune-hello-title">
                {label}
              </span>
            </span>
            <span data-hello-copy className="ulune-hello-copy">
              {sentence}
            </span>
          </button>
        );
      })}
    </section>
  );
}
