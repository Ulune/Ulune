import type { AspectLink, NatalChart } from "@/lib/chart/types";
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
import { formatOrb } from "@/lib/i18n/astro";
import { useI18n } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import { previewProps } from "@/lib/depth/preview-bus";
import { useChartHoverId } from "@/lib/depth/use-chart-hover";
import { PlanetGlyph } from "./glyphs";

const TEST_ID: Record<MeetingCellId, string> = {
  sun: "synastry-hello-sun",
  moon: "synastry-hello-moon",
  ascendant: "synastry-hello-asc",
};

export function SynastryHello({
  a,
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
  const { locale } = useI18n();
  const chartHover = useChartHoverId();
  const look = useLookShape();

  return (
    <section
      data-testid="synastry-hello"
      data-hello-id={SYNASTRY_HELLO.id}
      className="ulune-hello ulune-panel"
      aria-label={SYNASTRY_HELLO.title}
    >
      {synastryHelloCells(locale).map((cell) => {
        const link = meetingAspect(majors, cell.id);
        const selectId = link ? `saspect:${link.id}` : null;
        const active = Boolean(selectId && selectedId === selectId);
        const aBody =
          cell.id === "ascendant"
            ? a.angles.ascendant
            : a.planets.find((p) => p.id === cell.id);
        const color = aBody
          ? planetPaint(cell.id === "ascendant" ? "ascendant" : cell.id, aBody.sign, look.planets)
          : "var(--color-fg-muted)";
        const sentence = link
          ? synastryHelloLine(locale, link.type, `${formatOrb(link.orb, locale)}°`)
          : synastryHelloEmpty(locale, cell.id);
        const head = (
          <>
            <span className="ulune-hello-head">
              <span className="ulune-hello-glyph" style={{ color }} aria-hidden>
                <PlanetGlyph id={cell.id === "ascendant" ? "ascendant" : cell.id} size={14} />
              </span>
              <span data-hello-label className="ulune-hello-label">
                <span data-hello-title className="ulune-hello-title">
                  {cell.label}
                </span>
              </span>
            </span>
            <span data-hello-copy className="ulune-hello-copy">
              {sentence}
            </span>
          </>
        );
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
            aria-label={`${cell.label}. ${sentence}`}
            className={cn("ulune-hello-cell", active && "bg-bg-subtle")}
          >
            {head}
          </button>
        ) : (
          <div
            key={cell.id}
            data-testid={TEST_ID[cell.id]}
            data-hello-cell={cell.id}
            className="ulune-hello-cell"
          >
            {head}
          </div>
        );
      })}
    </section>
  );
}
