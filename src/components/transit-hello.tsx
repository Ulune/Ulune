import type { AspectLink, NatalChart, TransitSky } from "@/lib/chart/types";
import { tightestApplyingMajors } from "@/lib/chart/transit-exact";
import { planetPaint } from "@/lib/look";
import { useLookShape } from "@/lib/look-provider";
import {
  TRANSITS_HELLO,
  transitHelloEmpty,
  transitHelloLine,
} from "@/lib/i18n/transits-hello";
import { aspectLinkPhrase, bodyLabel, formatOrb } from "@/lib/i18n/astro";
import { useI18n } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import { previewProps } from "@/lib/depth/preview-bus";
import { useChartHoverId } from "@/lib/depth/use-chart-hover";
import { PlanetGlyph } from "./glyphs";

export function TransitHello({
  sky,
  chart,
  selectedId,
  onSelect,
}: {
  sky: TransitSky;
  chart: NatalChart;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { locale } = useI18n();
  const chartHover = useChartHoverId();
  const look = useLookShape();
  const hits = tightestApplyingMajors(sky.aspects, 3);
  const cells: Array<AspectLink | null> = [hits[0] ?? null, hits[1] ?? null, hits[2] ?? null];

  return (
    <section
      data-testid="transits-hello"
      data-hello-id={TRANSITS_HELLO.id}
      className="ulune-hello ulune-panel"
      aria-label={TRANSITS_HELLO.title}
    >
      {cells.map((link, i) => {
        if (!link) {
          return (
            <div
              key={`empty-${i}`}
              data-testid={`transits-hello-empty-${i}`}
              data-hello-cell="empty"
              className="ulune-hello-cell"
            >
              <span data-hello-copy className="ulune-hello-copy">
                {transitHelloEmpty(locale)}
              </span>
            </div>
          );
        }
        const moving = sky.planets.find((p) => p.id === link.a);
        const natal =
          link.b in chart.angles
            ? chart.angles[link.b as keyof NatalChart["angles"]]
            : chart.planets.find((p) => p.id === link.b);
        const selectId = `taspect:${link.id}`;
        const active = selectedId === selectId;
        const color = moving
          ? planetPaint(moving.id, moving.sign, look.planets)
          : "var(--color-fg-muted)";
        const sentence = transitHelloLine(locale, link.type, link.b);
        const label = aspectLinkPhrase(link.a, link.type, link.b, locale);
        return (
          <button
            key={link.id}
            type="button"
            data-testid={`transits-hello-${i}`}
            data-hello-cell={link.a}
            data-hello-aspect={link.id}
            onClick={() => onSelect(selectId)}
            {...previewProps(selectId)}
            data-previewed={chartHover === selectId ? "1" : undefined}
            aria-label={`${label}. ${sentence}`}
            className={cn("ulune-hello-cell", active && "bg-bg-subtle")}
          >
            <span className="ulune-hello-head">
              <span className="ulune-hello-glyph" style={{ color }} aria-hidden>
                <PlanetGlyph id={link.a} size={14} />
              </span>
              <span data-hello-title className="ulune-hello-title">
                {label}
              </span>
              <span className="ob-glance-place">
                {formatOrb(link.orb, locale)}°
                {moving ? <span className="ob-glance-house">· {bodyLabel(link.a, locale)} {moving.formatted}</span> : null}
              </span>
            </span>
            <span data-hello-copy className="ulune-hello-copy">
              {sentence}
            </span>
            <span className="sr-only">
              {moving ? moving.formatted : ""} {natal ? natal.formatted : ""}
            </span>
          </button>
        );
      })}
    </section>
  );
}
