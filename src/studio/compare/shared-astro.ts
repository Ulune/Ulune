import { bodyLabel, signName } from "@/lib/i18n/astro";
import type { NatalChart } from "@/lib/chart/types";
import type { StudioPage } from "@/studio/url";
import { both, type SharedItem, type SharedSay, type SharedSide } from "@/studio/compare/shared";

/*
 * What two birth charts share, in astrology (idea B9; shared.ts): the
 * luminaries and the Ascendant first, then each planet that stands in the
 * same sign in both. The same on Natal, Transits and Progressions: the natal
 * planets are the ones both pages draw inside.
 */

/** The bodies read for a shared sign, in the order a reading starts with them. */
const BODIES = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron", "northnode"] as const;

function signOf(chart: NatalChart, id: string) {
  return chart.planets.find((p) => p.id === id)?.sign ?? null;
}

export function sharedItems(_page: StudioPage, a: SharedSide, b: SharedSide, locale: "en" | "fr", say: SharedSay): SharedItem[] {
  const out: SharedItem[] = [];
  const add = (id: string, body: string, sign: Parameters<typeof signName>[0]) =>
    out.push(both(id, say("cmpInSign", { body: bodyLabel(body, locale), sign: signName(sign, locale) }), id));
  for (const body of BODIES.slice(0, 2)) {
    const sign = signOf(a.chart, body);
    if (sign && sign === signOf(b.chart, body)) add(`planet:${body}`, body, sign);
  }
  // The Ascendant only with both birth times.
  const ascA = a.chart.meta.timeUnknown ? null : a.chart.angles.ascendant?.sign;
  const ascB = b.chart.meta.timeUnknown ? null : b.chart.angles.ascendant?.sign;
  if (ascA && ascA === ascB) add("angle:ascendant", "ascendant", ascA);
  for (const body of BODIES.slice(2)) {
    const sign = signOf(a.chart, body);
    if (sign && sign === signOf(b.chart, body)) add(`planet:${body}`, body, sign);
  }
  return out;
}
