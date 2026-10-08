/*
 * "In your chart" (encyclopedia plan, part 18): a chart of the studio summed
 * up as the encyclopedia's pages read it (src/encyclopedia/your-chart.ts),
 * every id an entry's. Pure, for scripts/in-your-chart.test.mjs.
 */
import type { NatalChart } from "@/lib/chart/types";
import type { HumanDesignChart } from "@/lib/chart/human-design";
import type { NumerologyChart, NumerologyValue } from "@/lib/chart/numerology";
import { termId } from "@/encyclopedia/term-ids";
import type { YourAspect, YourBody, YourDignity, YourHd, YourNumber } from "@/encyclopedia/your-chart";

const DIGNITY: Record<string, YourDignity> = { domicile: "domicile", exalted: "exaltation", detriment: "detriment", fall: "fall" };

/** The bodies a page can speak of: those with an entry. */
export function bodiesOf(chart: NatalChart): YourBody[] {
  const unknown = Boolean(chart.meta.timeUnknown);
  const out: YourBody[] = [];
  for (const p of chart.planets) {
    const id = termId("body", p.id);
    if (!id || p.uncertain) continue;
    const dignity = chart.patterns?.flags?.[p.id]?.dignity;
    out.push({
      id,
      ref: `planet:${p.id}`,
      sign: p.sign,
      deg: p.signDegree,
      house: unknown || !p.house ? null : p.house,
      retro: p.retrograde,
      dignity: (dignity && DIGNITY[dignity]) || null,
      angle: false,
    });
  }
  if (!unknown) {
    for (const [a, p] of Object.entries(chart.angles)) {
      const id = termId("body", a);
      if (!id || !p || p.uncertain) continue;
      out.push({ id, ref: `angle:${a}`, sign: p.sign, deg: p.signDegree, house: null, retro: false, dignity: null, angle: true });
    }
  }
  return out;
}

export function aspectsOf(chart: NatalChart, bodies: YourBody[]): YourAspect[] {
  const known = new Set(bodies.map((b) => b.id));
  const out: YourAspect[] = [];
  for (const x of chart.aspects ?? []) {
    const a = termId("body", x.a);
    const b = termId("body", x.b);
    const type = termId("aspect", x.type);
    if (!a || !b || !type || !known.has(a) || !known.has(b)) continue;
    out.push({ a, b, type, orb: Math.abs(x.orb), applying: x.applying, ref: `aspect:${x.id}` });
  }
  return out.sort((p, q) => p.orb - q.orb);
}

const PLACES: [keyof NumerologyChart, string, string][] = [
  ["lifePath", "life-path", "core:lifepath"],
  ["expression", "expression", "core:expression"],
  ["soulUrge", "soul-urge", "core:soulurge"],
  ["personality", "personality-number", "core:personality"],
  ["birthday", "birthday", "core:birthday"],
  ["maturity", "maturity", "core:maturity"],
  ["attitude", "attitude-number", "detail:attitude"],
  ["personalYear", "personal-year", "core:personalYear"],
];

export function numbersOf(n: NumerologyChart): YourNumber[] {
  const out: YourNumber[] = [];
  for (const [key, place, ref] of PLACES) {
    const v = n[key] as NumerologyValue | undefined;
    if (!v || v.number == null) continue;
    out.push({ place, value: v.number, ref, debt: v.debt ?? null });
  }
  return out;
}

const slugOf = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export function hdOf(hd: HumanDesignChart): YourHd {
  return {
    type: `hd-${slugOf(hd.type)}`,
    authority: `hd-authority-${slugOf(hd.authority)}`,
    profile: `hd-profile-${hd.profile.replace("/", "-")}`,
    definition: hd.definition,
    centres: hd.definedCenters.map((c) => `hd-centre-${c === "solarPlexus" ? "solar-plexus" : c}`),
    gates: hd.activations.map((a) => ({ gate: a.gate, line: a.line, layer: a.layer, body: a.body })),
    channels: hd.definedChannels.map((c) => ({ id: `hd-channel-${c.id.replace("–", "-")}`, personality: c.personality, design: c.design })),
  };
}

