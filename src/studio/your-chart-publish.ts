/*
 * "In your chart" (encyclopedia plan, part 18), the studio's side: the
 * library's charts summed up for the encyclopedia's pages, published for this
 * tab only (src/encyclopedia/your-chart.ts) as the studio changes. Nothing is
 * stored, nothing leaves the browser. The bodygraph is added when the Human
 * Design page has cast it in this tab (useHumanDesign notes it in the bridge);
 * numerology's numbers once its code has loaded (its own download).
 */
import type { BirthInput, NatalChart } from "@/lib/chart/types";
import type { HumanDesignChart } from "@/lib/chart/human-design";
import { bodygraphOf, onBodygraphs, setYourCharts, type YourChart, type YourNumber } from "@/encyclopedia/your-chart";
import { aspectsOf, bodiesOf, hdOf, numbersOf } from "@/studio/your-chart-summary";
import { useStudioStore } from "@/studio/store";

const hdKeyOf = (chart: NatalChart) => `${chart.meta.utc}|${chart.meta.timeUnknown ? 720 : ""}`;

type Numerology = typeof import("@/lib/chart/numerology");
let numerology: Numerology | null = null;
let loadingNumerology = false;

function summary(id: string, chart: NatalChart, input: BirthInput | undefined): YourChart {
  const bodies = bodiesOf(chart);
  let numbers: YourNumber[] | null = null;
  if (numerology) {
    try {
      const opts = input ? numerology.numerologyOptionsOf(input, chart) : undefined;
      const n = numerology.castNumerology(chart, opts ?? undefined);
      numbers = n ? numbersOf(n) : null;
    } catch {
      numbers = null;
    }
  }
  const hd = bodygraphOf(hdKeyOf(chart)) as HumanDesignChart | undefined;
  return {
    id,
    label: (input?.name ?? chart.meta.name ?? "").trim(),
    timeUnknown: Boolean(chart.meta.timeUnknown),
    isDay: Boolean(chart.patterns?.isDay),
    bodies,
    cusps: chart.meta.timeUnknown || !chart.houses?.length ? null : chart.houses.slice(0, 12).map((h) => h.sign),
    aspects: aspectsOf(chart, bodies),
    numbers,
    hd: hd ? hdOf(hd) : null,
  };
}

/** Publishes the studio's charts now. */
export function publishYourCharts(): void {
  const s = useStudioStore.getState();
  const charts: YourChart[] = [];
  const seen = new Set<NatalChart>();
  for (const row of s.rows) {
    const chart = row.id === s.activeId && s.chart ? s.chart : row.chart;
    if (!chart || seen.has(chart)) continue;
    seen.add(chart);
    charts.push(summary(row.id, chart, row.id === s.activeId ? s.input : row.input));
  }
  // A chart on screen not saved yet (a first chart being read).
  if (s.chart && !seen.has(s.chart) && !s.creating) charts.unshift(summary(s.activeId ?? "open", s.chart, s.input));
  setYourCharts(charts.length ? { active: s.chart && !s.creating ? (s.activeId ?? "open") : null, charts } : null);
  if (charts.length && !numerology && !loadingNumerology) {
    loadingNumerology = true;
    void import("@/lib/chart/numerology")
      .then((m) => {
        numerology = m;
        publishYourCharts();
      })
      .catch(() => {
        loadingNumerology = false;
      });
  }
}

let watching = false;

/** From the studio's first page on: the charts follow the library, the open chart, its names. */
export function watchYourCharts(): void {
  if (watching) return;
  watching = true;
  onBodygraphs(publishYourCharts);
  publishYourCharts();
  useStudioStore.subscribe((s, prev) => {
    if (s.rows !== prev.rows || s.chart !== prev.chart || s.activeId !== prev.activeId || s.input !== prev.input || s.creating !== prev.creating) publishYourCharts();
  });
}
