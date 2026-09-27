import type { AngleId, NatalChart, Placement, ProgressedSky } from "@/lib/chart/types";
import { planetPaint } from "@/lib/look";
import { useLookShape } from "@/lib/look-provider";
import { houseName, signName } from "@/lib/i18n/astro";
import { NATAL_HELLO } from "@/lib/i18n/natal-hello";
import { progressedLine, progressedTitle, type ModeHelloId } from "@/lib/i18n/mode-hello";
import { useI18n } from "@/lib/i18n/locale";
import { numberFormat } from "@/lib/intl-cache";
import { cn } from "@/lib/utils";
import { previewProps } from "@/lib/depth/preview-bus";
import { useChartHoverId } from "@/lib/depth/use-chart-hover";
import { PlanetGlyph, SignGlyph } from "./glyphs";

const CELLS: ModeHelloId[] = ["sun", "moon", "ascendant"];

const SELECT_ID: Record<ModeHelloId, string> = {
  sun: "progressed:sun",
  moon: "progressed:moon",
  ascendant: "progressed:ascendant",
};

const TEST_ID: Record<ModeHelloId, string> = {
  sun: "progressions-hello-sun",
  moon: "progressions-hello-moon",
  ascendant: "progressions-hello-asc",
};

function placeIn(sky: { planets: Placement[]; angles: Record<AngleId, Placement> }, id: ModeHelloId): Placement | undefined {
  return id === "ascendant" ? sky.angles.ascendant : sky.planets.find((p) => p.id === id);
}

/**
 * The Progressions panel before anything is chosen: where the progressed
 * Sun, Moon and Ascendant stand now, since when, and when they move on —
 * what only progressions can say (the natal sentences only repeated the
 * birth chart).
 */
export function ProgressionsHello({
  sky,
  natal,
  selectedId,
  onSelect,
}: {
  sky: ProgressedSky;
  natal: NatalChart | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { locale, t } = useI18n();
  const chartHover = useChartHoverId();
  const look = useLookShape();
  const years = sky.meta.yearsOfLife;

  return (
    <section
      data-testid="progressions-hello"
      data-hello-id={NATAL_HELLO.id}
      className="ob-glance"
      aria-labelledby="ob-prog-glance-h"
    >
      <h2 id="ob-prog-glance-h" className="ob-glance-h">
        {t("progressedGlanceTitle", {
          n: numberFormat(locale === "fr" ? "fr-FR" : "en-GB", { maximumFractionDigits: 1 }).format(years),
        })}
      </h2>
      <div className="ob-glance-three ulune-hello">
        {CELLS.map((id) => {
          const place = placeIn(sky, id);
          const selectId = SELECT_ID[id];
          const active = selectedId === selectId;
          const title = progressedTitle(id, locale);
          const sentence = place ? progressedLine(place, natal ? placeIn(natal, id) : undefined, years, locale) : "";
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
