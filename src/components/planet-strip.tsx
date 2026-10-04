import { decanOf } from "@/lib/chart/constants";
import type { BodyId, NatalChart, PlanetId, SignId } from "@/lib/chart/types";
import { faceLabelLocale, planetAbbr, planetName, signAbbr } from "@/lib/i18n/astro";
import { useI18n } from "@/lib/i18n/locale";
import { planetPaint } from "@/lib/look";
import { useLookShape } from "@/lib/look-provider";
import { PlanetGlyph } from "./glyphs";

export function PlanetStrip({
  chart,
  selectedId,
  visible,
  onSelect,
}: {
  chart: NatalChart;
  selectedId: string | null;
  visible: Set<string>;
  onSelect: (id: string) => void;
}) {
  const { locale } = useI18n();
  const look = useLookShape();
  return (
    <ul data-testid="planet-strip" className="flex flex-wrap justify-center gap-1.5" data-chart-pick>
      {chart.planets.filter((p) => visible.has(p.id)).map((p) => {
        const id = `planet:${p.id}`;
        const active = selectedId === id;
        const color = planetPaint(p.id, p.sign as SignId, look.planets);
        const decan = decanOf(p.ecliptic);
        return (
          <li key={p.id}>
            <button
              type="button"
              data-strip={p.id}
              onClick={() => onSelect(id)}
              className={`inline-flex h-[var(--ctl-h)] min-w-[var(--ctl-h)] items-center justify-center gap-2 ulune-chip-radius border leading-none px-2.5 text-left text-xs transition-[border-color,background-color,color,transform] duration-[var(--motion-ui)] ease-[var(--ease-out)] active:scale-[0.96] ${
                active
                  ? "border-border-strong bg-bg-subtle text-fg"
                  : "border-border bg-bg-elevated text-fg-muted hover:text-fg"
              }`}
            >
              <span style={{ color }} className="grid size-5 shrink-0 place-items-center">
                <PlanetGlyph id={p.id as BodyId} size={16} />
              </span>
              <span className="hidden sm:flex sm:flex-col">
                <span className="font-medium text-fg">
                  {planetName(p.id as PlanetId, locale)}
                  {p.retrograde ? " ℞" : ""}
                </span>
                <span className="ulune-micro tabular-nums text-fg-subtle">
                  {p.formatted} {signAbbr(p.sign, locale)} · {faceLabelLocale(decan.face, locale)}{" "}
                  {planetAbbr(decan.ruler, locale)}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
