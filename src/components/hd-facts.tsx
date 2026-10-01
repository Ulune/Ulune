import type { HumanDesignChart } from "@/lib/chart/human-design";
import { hdKeyRows } from "@/lib/chart/hd-keys";
import { previewProps } from "@/lib/depth/preview-bus";
import { hdGraphText, hdUnknownText } from "@/lib/i18n/hd-ui";
import { useI18n } from "@/lib/i18n/locale";

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
  return (
    <div className="ulune-hd-facts" data-testid="hd-facts">
      {hdKeyRows(chart, locale).map((f, fi) => {
        const id = `hello:${f.key}`;
        // Without a birth time, a key that differs at another hour is marked ~.
        const maybe = f.uncertain;
        const value = `${f.sub ? `${f.sub} · ${f.value}` : f.value}${maybe ? ` (${hdUnknownText(locale, "mark")})` : ""}`;
        return (
          <button
            key={f.key}
            type="button"
            className="ulune-hd-fact"
            // Its place in the bodygraph's entrance (hd.css).
            style={{ ["--enter" as string]: fi }}
            data-testid={`hd-fact-${f.key}`}
            data-fact={f.key}
            data-uncertain={maybe ? "1" : undefined}
            title={maybe ? hdUnknownText(locale, "mark") : undefined}
            aria-pressed={selectedId === id}
            aria-label={hdGraphText(locale, "factOpen", { label: f.label, value })}
            onClick={() => onSelect(id)}
            {...previewProps(id)}
          >
            <span className="ulune-kicker ulune-hd-fact-k">{f.label}</span>
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
