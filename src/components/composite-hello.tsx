import type { NatalChart, Placement } from "@/lib/chart/types";
import { planetPaint } from "@/lib/look";
import { useLookShape } from "@/lib/look-provider";
import { houseName, signName } from "@/lib/i18n/astro";
import { NATAL_HELLO } from "@/lib/i18n/natal-hello";
import { compositeLine, compositeTitle, type ModeHelloId } from "@/lib/i18n/mode-hello";
import { useI18n } from "@/lib/i18n/locale";
import { usePack } from "@/lib/content/packs";
import { cn } from "@/lib/utils";
import { previewProps } from "@/lib/depth/preview-bus";
import { useChartHoverId } from "@/lib/depth/use-chart-hover";
import { PlanetGlyph, SignGlyph } from "./glyphs";

const CELLS: ModeHelloId[] = ["sun", "moon", "ascendant"];

const SELECT_ID: Record<ModeHelloId, string> = {
  sun: "planet:sun",
  moon: "planet:moon",
  ascendant: "angle:ascendant",
};

const TEST_ID: Record<ModeHelloId, string> = {
  sun: "composite-hello-sun",
  moon: "composite-hello-moon",
  ascendant: "composite-hello-asc",
};

function placeIn(chart: NatalChart, id: ModeHelloId): Placement | undefined {
  return id === "ascendant" ? chart.angles.ascendant : chart.planets.find((p) => p.id === id);
}

/**
 * The Composite panel before anything is chosen: the relationship's own Sun,
 * Moon and Ascendant — what each means for a pair, then its sign's style
 * (the natal sentences, "Your core identity…", spoke to one person).
 */
export function CompositeHello({
  chart,
  selectedId,
  onSelect,
}: {
  chart: NatalChart;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { locale, t } = useI18n();
  const chartHover = useChartHoverId();
  const look = useLookShape();
  const astro = usePack("astro", locale);

  return (
    <section
      data-testid="composite-hello"
      data-hello-id={NATAL_HELLO.id}
      className="ob-glance"
      aria-labelledby="ob-comp-glance-h"
    >
      <h2 id="ob-comp-glance-h" className="ob-glance-h">
        {t("compositeGlanceTitle")}
      </h2>
      <div className="ob-glance-three ulune-hello">
        {CELLS.map((id) => {
          const place = placeIn(chart, id);
          const selectId = SELECT_ID[id];
          const active = selectedId === selectId;
          const title = compositeTitle(id, locale);
          const style = place && astro ? astro.signKeywords(place.sign, locale) : "";
          const sentence = place ? compositeLine(id, place, locale, style) : "";
          const color = place ? planetPaint(id, place.sign, look.planets) : "var(--color-fg-muted)";
          return (
            <button
              key={id}
              type="button"
              data-testid={TEST_ID[id]}
              data-hello-cell={id}
              onClick={() => onSelect(selectId)}
              {...previewProps(selectId)}
              data-previewed={chartHover === selectId ? "1" : undefined}
              aria-pressed={active}
              aria-label={`${title}${place ? `, ${place.formatted} ${signName(place.sign, locale)}` : ""}. ${sentence}`}
              className={cn("ob-glance-cell", active && "is-on")}
            >
              <span className="ob-glance-glyph" style={{ color }} aria-hidden>
                <PlanetGlyph id={id} size={18} />
              </span>
              <span className="ob-glance-text">
                <span className="ob-glance-line">
                  <span data-hello-title className="ulune-hello-title ob-glance-title">
                    {title}
                  </span>
                  {place ? (
                    <span className="ob-glance-place">
                      <span className="ob-glance-sign" aria-hidden>
                        <SignGlyph id={place.sign} size={13} />
                      </span>
                      {place.formatted} {signName(place.sign, locale)}
                      <span className="ob-glance-house">· {houseName(place.house, locale)}</span>
                    </span>
                  ) : null}
                </span>
                <span data-hello-copy className="ob-glance-copy">
                  {sentence}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
