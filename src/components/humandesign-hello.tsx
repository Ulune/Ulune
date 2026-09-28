import { hdHelloCells, HD_HELLO } from "@/lib/i18n/hd-hello";
import {
  hdAuthorityLabel,
  hdCenterLabel,
  hdDefinitionLabel,
  hdFactLabel,
  hdGraphText,
  hdStrategyLabel,
  hdTypeLabel,
} from "@/lib/i18n/hd-ui";
import { hdAuthoritySeat } from "@/lib/chart/hd-focus";
import type { HumanDesignChart } from "@/lib/chart/human-design";
import { usePack } from "@/lib/content/packs";
import { useI18n } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import { previewProps } from "@/lib/depth/preview-bus";
import { useChartHoverId } from "@/lib/depth/use-chart-hover";

type StepId = "type" | "strategy" | "authority" | "profile" | "definition";
const STEPS: readonly StepId[] = ["type", "strategy", "authority", "profile", "definition"];

/**
 * The first read, in the side panel before anything is chosen: the five
 * keys in the order Human Design teaches them (type, strategy, authority,
 * profile, definition), each in two or three lines and opening its reading,
 * then where to look next. Its words come with the reading pack; until then
 * each step keeps its one-line definition.
 */
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
  const pack = usePack("hd", locale, true);
  const read = pack ? pack.hdFirstRead(chart, locale) : null;
  const cells = hdHelloCells(locale);
  const seat = hdAuthoritySeat(chart.authority);

  const valueOf = (id: StepId): string => {
    if (id === "type") return hdTypeLabel(locale, chart.type);
    if (id === "strategy") return hdStrategyLabel(locale, chart.strategy);
    if (id === "authority") {
      const label = hdAuthorityLabel(locale, chart.authority);
      return seat ? `${label} · ${hdCenterLabel(locale, seat)}` : label;
    }
    if (id === "profile") return read?.profileName ? `${chart.profile} · ${read.profileName}` : chart.profile;
    return hdDefinitionLabel(locale, chart.definition);
  };

  return (
    <section data-testid="hd-hello" data-hello-id={HD_HELLO.id} className="ulune-hd-first" aria-labelledby="ulune-hd-first-title">
      <h3 id="ulune-hd-first-title" className="ulune-hd-first-title">
        {hdGraphText(locale, "firstTitle")}
      </h3>
      <ol className="ulune-hd-steps">
        {STEPS.map((id, i) => {
          const selectId = `hello:${id}`;
          const step = read?.steps.find((s) => s.id === id);
          const fallback = cells.find((c) => c.id === id)?.sentence ?? "";
          const text = step?.text ?? fallback;
          const label = hdFactLabel(locale, id);
          const value = valueOf(id);
          return (
            <li key={id}>
              <button
                type="button"
                data-testid={`hd-hello-${id}`}
                data-hello-cell={id}
                onClick={() => onSelect(selectId)}
                {...previewProps(selectId)}
                data-previewed={chartHover === selectId ? "1" : undefined}
                aria-label={`${i + 1}. ${label}: ${value}. ${text}`}
                className={cn("ulune-hd-step", selectedId === selectId && "is-on")}
              >
                <span className="ulune-hd-step-n" aria-hidden>
                  {i + 1}
                </span>
                <span className="ulune-hd-step-body">
                  <span className="ulune-hd-step-head">
                    <span data-hello-label className="ulune-hd-step-k">
                      {label}
                    </span>
                    <span data-hello-title className="ulune-hd-step-v">
                      {value}
                    </span>
                  </span>
                  <span data-hello-copy className="ulune-hd-step-text">
                    {text}
                  </span>
                  {step?.extra ? <span className="ulune-hd-step-extra">{step.extra}</span> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {read?.next ? <p className="ulune-hd-first-next">{read.next}</p> : null}
    </section>
  );
}
