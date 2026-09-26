import type { NatalChart } from "@/lib/chart/types";
import { planetPaint } from "@/lib/look";
import { useLookShape } from "@/lib/look-provider";
import { helloCells, NATAL_HELLO, type HelloCellId } from "@/lib/i18n/natal-hello";
import { useI18n } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import { previewProps } from "@/lib/depth/preview-bus";
import { useChartHoverId } from "@/lib/depth/use-chart-hover";
import { PlanetGlyph } from "./glyphs";

const SELECT_ID: Record<HelloCellId, string> = {
  sun: "planet:sun",
  moon: "planet:moon",
  ascendant: "angle:ascendant",
};

const TEST_ID: Record<HelloCellId, string> = {
  sun: "composite-hello-sun",
  moon: "composite-hello-moon",
  ascendant: "composite-hello-asc",
};

export function CompositeHello({
  chart,
  selectedId,
  onSelect,
}: {
  chart: NatalChart;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { locale } = useI18n();
  const chartHover = useChartHoverId();
  const look = useLookShape();
  const sun = chart.planets.find((p) => p.id === "sun");
  const moon = chart.planets.find((p) => p.id === "moon");
  const asc = chart.angles.ascendant;
  const signByBody: Record<HelloCellId, NatalChart["planets"][number]["sign"] | null> = {
    sun: sun?.sign ?? null,
    moon: moon?.sign ?? null,
    ascendant: asc?.sign ?? null,
  };

  return (
    <section
      data-testid="composite-hello"
      data-hello-id={NATAL_HELLO.id}
      className="ulune-hello ulune-panel"
      aria-label={NATAL_HELLO.title}
    >
      {helloCells(locale).map((cell) => {
        const selectId = SELECT_ID[cell.id];
        const active = selectedId === selectId;
        const sign = signByBody[cell.id];
        const color = sign
          ? planetPaint(cell.id === "ascendant" ? "ascendant" : cell.id, sign, look.planets)
          : "var(--color-fg-muted)";
        return (
          <button
            key={cell.id}
            type="button"
            data-testid={TEST_ID[cell.id]}
            data-hello-cell={cell.id}
            onClick={() => onSelect(selectId)}
            {...previewProps(selectId)}
            data-previewed={chartHover === selectId ? "1" : undefined}
            aria-label={`${cell.label}. ${cell.sentence}`}
            className={cn("ulune-hello-cell", active && "bg-bg-subtle")}
          >
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
              {cell.sentence}
            </span>
          </button>
        );
      })}
    </section>
  );
}
