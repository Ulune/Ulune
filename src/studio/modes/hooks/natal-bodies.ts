import type { NatalChart } from "@/lib/chart/types";

export function natalBodiesOf(chart: NatalChart) {
  return [
    ...chart.planets.map((p) => ({ id: p.id, name: p.name, ecliptic: p.ecliptic })),
    ...Object.values(chart.angles).map((a) => ({ id: a.id, name: a.name, ecliptic: a.ecliptic })),
  ];
}
