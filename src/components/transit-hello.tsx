import type { NatalChart, TransitSky } from "@/lib/chart/types";
import { tightestApplyingMajors } from "@/lib/chart/transit-exact";
import { planetPaint } from "@/lib/look";
import { useLookShape } from "@/lib/look-provider";
import { TRANSITS_HELLO, transitHelloEmpty, transitHelloLine } from "@/lib/i18n/transits-hello";
import { aspectLinkPhrase, bodyLabel } from "@/lib/i18n/astro";
import { useI18n } from "@/lib/i18n/locale";
import { cn, formatArc } from "@/lib/utils";
import { previewProps } from "@/lib/depth/preview-bus";
import { useChartHoverId } from "@/lib/depth/use-chart-hover";
import { PlanetGlyph } from "./glyphs";

/**
 * The Transits panel before anything is chosen: the three closest transits
 * still getting closer at the moment shown, in the same "at a glance" form
 * as the birth chart's panel.
 */
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
  const { locale, t } = useI18n();
  const chartHover = useChartHoverId();
  const look = useLookShape();
  const hits = tightestApplyingMajors(sky.aspects, 3);

  return (
    <section
      data-testid="transits-hello"
      data-hello-id={TRANSITS_HELLO.id}
      className="ob-glance"
      aria-labelledby="ob-transit-glance-h"
    >
      <h2 id="ob-transit-glance-h" className="ob-glance-h">
        {t("transitGlanceTitle")}
      </h2>
      {hits.length === 0 ? (
        <p data-testid="transits-hello-empty-0" data-hello-cell="empty" data-hello-copy className="ob-glance-copy">
          {transitHelloEmpty(locale)}
        </p>
      ) : (
        <div className="ob-glance-three ulune-hello">
          {hits.map((link, i) => {
            const moving = sky.planets.find((p) => p.id === link.a);
            const natal =
              link.b in chart.angles
                ? chart.angles[link.b as keyof NatalChart["angles"]]
                : chart.planets.find((p) => p.id === link.b);
            const selectId = `taspect:${link.id}`;
            const active = selectedId === selectId;
            const color = moving ? planetPaint(moving.id, moving.sign, look.planets) : "var(--color-fg-muted)";
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
                aria-pressed={active}
                aria-label={`${label}, ${formatArc(link.orb)}. ${sentence}`}
                className={cn("ob-glance-cell", active && "is-on")}
              >
                <span className="ob-glance-glyph" style={{ color }} aria-hidden>
                  <PlanetGlyph id={link.a} size={18} />
                </span>
                <span className="ob-glance-text">
                  <span className="ob-glance-line">
                    <span data-hello-title className="ulune-hello-title ob-glance-title">
                      {label}
                    </span>
                    <span className="ob-glance-place">
                      {formatArc(link.orb)}
                      {moving ? (
                        <span className="ob-glance-house">
                          · {bodyLabel(link.a, locale)} {moving.formatted}
                        </span>
                      ) : null}
                    </span>
                  </span>
                  <span data-hello-copy className="ob-glance-copy">
                    {sentence}
                  </span>
                  <span className="sr-only">
                    {moving ? moving.formatted : ""} {natal ? natal.formatted : ""}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
