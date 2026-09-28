import { hdCrossGates, hdCrossOf } from "@/lib/chart/hd-cross";
import type { HumanDesignChart } from "@/lib/chart/human-design";
import { previewProps } from "@/lib/depth/preview-bus";
import { hdAngleLabel, hdAuthorityLabel, hdDefinitionLabel, hdFactLabel, hdGraphText, hdStrategyLabel, hdTypeLabel } from "@/lib/i18n/hd-ui";
import { useI18n } from "@/lib/i18n/locale";

type Fact = { key: "type" | "strategy" | "authority" | "profile" | "definition" | "cross"; value: string; sub?: string };

/**
 * The five keys of a bodygraph and its cross, in the order Human Design reads
 * them, in one row of small cards above the chart. Each opens its reading.
 */
export function HdFacts({
  chart,
  selectedId,
  onSelect,
}: {
  chart: HumanDesignChart;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { locale } = useI18n();
  const cross = hdCrossOf(chart);
  const facts: Fact[] = [
    { key: "type", value: hdTypeLabel(locale, chart.type) },
    { key: "strategy", value: hdStrategyLabel(locale, chart.strategy) },
    { key: "authority", value: hdAuthorityLabel(locale, chart.authority) },
    { key: "profile", value: chart.profile },
    { key: "definition", value: hdDefinitionLabel(locale, chart.definition) },
  ];
  if (cross) facts.push({ key: "cross", value: hdCrossGates(cross), sub: cross.angle ? hdAngleLabel(locale, cross.angle) : undefined });
  return (
    <div className="ulune-hd-facts" data-testid="hd-facts">
      {facts.map((f) => {
        const id = `hello:${f.key}`;
        const label = hdFactLabel(locale, f.key);
        const value = f.sub ? `${f.sub} · ${f.value}` : f.value;
        return (
          <button
            key={f.key}
            type="button"
            className="ulune-hd-fact"
            data-testid={`hd-fact-${f.key}`}
            data-fact={f.key}
            aria-pressed={selectedId === id}
            aria-label={hdGraphText(locale, "factOpen", { label, value })}
            onClick={() => onSelect(id)}
            {...previewProps(id)}
          >
            <span className="ulune-hd-fact-k">{label}</span>
            <span className="ulune-hd-fact-v" data-mono={f.key === "profile" || f.key === "cross" ? "1" : undefined}>
              {f.value}
            </span>
            {f.sub ? <span className="ulune-hd-fact-sub">{f.sub}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
