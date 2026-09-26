import { hdHelloCells, HD_HELLO, type HdHelloId } from "@/lib/i18n/hd-hello";
import {
  hdAuthorityLabel,
  hdStrategyLabel,
  hdTypeLabel,
} from "@/lib/i18n/hd-ui";
import type { HumanDesignChart } from "@/lib/chart/human-design";
import { useI18n } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import { previewProps } from "@/lib/depth/preview-bus";
import { useChartHoverId } from "@/lib/depth/use-chart-hover";

const SELECT_ID: Record<HdHelloId, string> = {
  type: "hello:type",
  strategy: "hello:strategy",
  authority: "hello:authority",
};

const TEST_ID: Record<HdHelloId, string> = {
  type: "hd-hello-type",
  strategy: "hd-hello-strategy",
  authority: "hd-hello-authority",
};

function titleOf(chart: HumanDesignChart, id: HdHelloId, locale: "en" | "fr"): string {
  if (id === "type") return hdTypeLabel(locale, chart.type);
  if (id === "strategy") return hdStrategyLabel(locale, chart.strategy);
  return hdAuthorityLabel(locale, chart.authority);
}

export function HumanDesignHello({
  chart,
  selectedId,
  onSelect,
}: {
  chart: HumanDesignChart;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { locale } = useI18n();
  const chartHover = useChartHoverId();

  return (
    <section
      data-testid="hd-hello"
      data-hello-id={HD_HELLO.id}
      className="ulune-hello ulune-panel"
      aria-label={HD_HELLO.title}
    >
      {hdHelloCells(locale).map((cell) => {
        const selectId = SELECT_ID[cell.id];
        const active = selectedId === selectId;
        const title = titleOf(chart, cell.id, locale);
        return (
          <button
            key={cell.id}
            type="button"
            data-testid={TEST_ID[cell.id]}
            data-hello-cell={cell.id}
            onClick={() => onSelect(selectId)}
            {...previewProps(selectId)}
            data-previewed={chartHover === selectId ? "1" : undefined}
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
