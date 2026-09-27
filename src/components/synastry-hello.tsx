import type { AspectLink, NatalChart, Placement } from "@/lib/chart/types";
import { meetingAspect } from "@/lib/chart/synastry";
import { planetPaint } from "@/lib/look";
import { useLookShape } from "@/lib/look-provider";
import {
  SYNASTRY_HELLO,
  synastryHelloCells,
  synastryHelloEmpty,
  synastryHelloLine,
  type MeetingCellId,
} from "@/lib/i18n/synastry-hello";
import { formatOrb, signName } from "@/lib/i18n/astro";
import { useI18n } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import { previewProps } from "@/lib/depth/preview-bus";
import { useChartHoverId } from "@/lib/depth/use-chart-hover";
import { PlanetGlyph, SignGlyph } from "./glyphs";

const TEST_ID: Record<MeetingCellId, string> = {
  sun: "synastry-hello-sun",
  moon: "synastry-hello-moon",
  ascendant: "synastry-hello-asc",
};

function placeIn(chart: NatalChart | undefined, id: MeetingCellId): Placement | undefined {
  if (!chart) return undefined;
  return id === "ascendant" ? chart.angles.ascendant : chart.planets.find((p) => p.id === id);
}

/**
 * The Synastry panel before anything is chosen: how the two Suns, Moons and
 * Ascendants meet (their signs side by side, the aspect between them), in
 * the same "at a glance" form as the birth chart's panel.
 */
export function SynastryHello({
  a,
  b,
  majors,
  selectedId,
  onSelect,
}: {
  a: NatalChart;
  b?: NatalChart;
  majors: AspectLink[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { locale, t } = useI18n();
  const chartHover = useChartHoverId();
  const look = useLookShape();

  return (
    <section
      data-testid="synastry-hello"
      data-hello-id={SYNASTRY_HELLO.id}
      className="ob-glance"
      aria-labelledby="ob-syn-glance-h"
    >
      <h2 id="ob-syn-glance-h" className="ob-glance-h">
        {t("synastryGlanceTitle")}
      </h2>
      <div className="ob-glance-three ulune-hello">
        {synastryHelloCells(locale).map((cell) => {
          const link = meetingAspect(majors, cell.id);
          const selectId = link ? `saspect:${link.id}` : null;
          const active = Boolean(selectId && selectedId === selectId);
          const aBody = placeIn(a, cell.id);
          const bBody = placeIn(b, cell.id);
          const color = aBody ? planetPaint(cell.id, aBody.sign, look.planets) : "var(--color-fg-muted)";
          const sentence = link
            ? synastryHelloLine(locale, link.type, `${formatOrb(link.orb, locale)}°`)
            : synastryHelloEmpty(locale, cell.id);
          const signs = [aBody, bBody].filter((p): p is Placement => Boolean(p));
          const body = (
            <>
              <span className="ob-glance-glyph" style={{ color }} aria-hidden>
                <PlanetGlyph id={cell.id} size={18} />
              </span>
              <span className="ob-glance-text">
                <span className="ob-glance-line">
                  <span data-hello-title className="ulune-hello-title ob-glance-title">
                    {cell.label}
                  </span>
                  {signs.length ? (
                    <span className="ob-glance-place">
                      {signs.map((p, i) => (
                        <span key={i} className="inline-flex items-baseline gap-[5px]">
                          {i ? <span className="ob-glance-house">·</span> : null}
                          <span className="ob-glance-sign" aria-hidden>
                            <SignGlyph id={p.sign} size={13} />
                          </span>
                          {signName(p.sign, locale)}
                        </span>
                      ))}
                    </span>
                  ) : null}
                </span>
                <span data-hello-copy className="ob-glance-copy">
                  {sentence}
                </span>
              </span>
            </>
          );
          const aria = `${cell.label}${signs.length ? `, ${signs.map((p) => signName(p.sign, locale)).join(" · ")}` : ""}. ${sentence}`;
          return link && selectId ? (
            <button
              key={cell.id}
              type="button"
              data-testid={TEST_ID[cell.id]}
              data-hello-cell={cell.id}
              data-hello-aspect={link.id}
              data-orb={String(link.orb)}
              onClick={() => onSelect(selectId)}
              {...previewProps(selectId)}
              data-previewed={chartHover === selectId ? "1" : undefined}
              aria-pressed={active}
              aria-label={aria}
              className={cn("ob-glance-cell", active && "is-on")}
            >
              {body}
            </button>
          ) : (
            <div
              key={cell.id}
              data-testid={TEST_ID[cell.id]}
              data-hello-cell={cell.id}
              aria-label={aria}
              role="group"
              className="ob-glance-cell ob-glance-cell--still"
            >
              {body}
            </div>
          );
        })}
      </div>
    </section>
  );
}
