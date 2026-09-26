import type { NumerologyChart } from "@/lib/chart/numerology";
import { formatNumerologyNumber, NUMEROLOGY_DASH } from "@/lib/chart/numerology";
import { numerologyHelloCells, NUMEROLOGY_HELLO, type NumerologyHelloId } from "@/lib/i18n/numerology-hello";
import { useI18n } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import { previewProps } from "@/lib/depth/preview-bus";
import { useChartHoverId } from "@/lib/depth/use-chart-hover";

const SELECT_ID: Record<NumerologyHelloId, string> = {
  lifepath: "core:lifepath",
  expression: "core:expression",
  soulurge: "core:soulurge",
};

const TEST_ID: Record<NumerologyHelloId, string> = {
  lifepath: "numerology-hello-lifepath",
  expression: "numerology-hello-expression",
  soulurge: "numerology-hello-soulurge",
};

function titleOf(chart: NumerologyChart, id: NumerologyHelloId): string {
  if (id === "lifepath") return formatNumerologyNumber(chart.lifePath);
  if (id === "expression") return formatNumerologyNumber(chart.expression, NUMEROLOGY_DASH);
  return formatNumerologyNumber(chart.soulUrge, NUMEROLOGY_DASH);
}

function hasNumber(chart: NumerologyChart, id: NumerologyHelloId): boolean {
  if (id === "lifepath") return chart.lifePath.number != null;
  if (id === "expression") return chart.expression.number != null;
  return chart.soulUrge.number != null;
}

export function NumerologyHello({
  chart,
  selectedId,
  onSelect,
}: {
  chart: NumerologyChart;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { locale } = useI18n();
  const chartHover = useChartHoverId();

  return (
    <section
      data-testid="numerology-hello"
      data-hello-id={NUMEROLOGY_HELLO.id}
      className="ulune-hello ulune-panel"
      aria-label={NUMEROLOGY_HELLO.title}
    >
      {numerologyHelloCells(locale).map((cell) => {
        const selectId = SELECT_ID[cell.id];
        const active = selectedId === selectId;
        const title = titleOf(chart, cell.id);
        const clickable = hasNumber(chart, cell.id);
        return (
          <button
            key={cell.id}
            type="button"
            data-testid={TEST_ID[cell.id]}
            data-hello-cell={cell.id}
            {...previewProps(clickable ? selectId : null)}
            data-previewed={chartHover === selectId ? "1" : undefined}
            onClick={() => {
              if (clickable) onSelect(selectId);
            }}
            aria-label={`${cell.label} ${title}. ${cell.sentence}`}
            className={cn("ulune-hello-cell", active && "bg-bg-subtle")}
          >
            <span className="ulune-hello-head">
              <span data-hello-label className="ulune-hello-label">
                {cell.label}
              </span>
              <span data-hello-title className="ulune-hello-title">
                {title}
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
