import type { AppLocale } from "./messages";
import { aspectName, bodyLabel, bodyPrep } from "./astro";
import type { AspectId, BodyId } from "@/lib/chart/types";
import type { TimingScope } from "@/lib/chart/transit-exact";
import source from "./timing-hello.json" with { type: "json" };

export const TIMING_HELLO = source;

export function timingHelloLine(
  locale: AppLocale,
  aspect: AspectId,
  natalBody: BodyId,
  when: string,
): string {
  const template = source.line[locale] || source.line.en;
  const aspectWord = aspectName(aspect, locale);
  // French needs the contracted preposition inside the name ("au Soleil", "à la
  // Lune"), and "avec" for a conjunction — same rule as aspectLinkPhrase.
  const body =
    locale === "fr"
      ? bodyPrep(natalBody, aspect === "conjunction" ? "avec" : "à")
      : bodyLabel(natalBody, locale);
  return template
    .replaceAll("{aspect}", aspectWord)
    .replaceAll("{body}", body)
    .replaceAll("{when}", when);
}

export function timingHelloEmpty(locale: AppLocale, scope: TimingScope): string {
  const pair = source.empty[scope];
  return (locale === "fr" ? pair.fr : pair.en) || pair.en;
}
