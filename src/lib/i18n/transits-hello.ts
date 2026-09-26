import type { AppLocale } from "./messages";
import { aspectName, bodyLabel, bodyPrep } from "./astro";
import type { AspectId, BodyId } from "@/lib/chart/types";
import source from "./transits-hello.json" with { type: "json" };

export const TRANSITS_HELLO = source;

export function transitHelloLine(
  locale: AppLocale,
  aspect: AspectId,
  natalBody: BodyId,
): string {
  const template = source.line[locale] || source.line.en;
  const aspectWord = aspectName(aspect, locale).toLowerCase();
  // "Square to your Saturn" / "Conjunction with your Sun". French needs the
  // contracted preposition inside the name ("au Soleil", "à la Lune"), and
  // "avec" for a conjunction — same rule as aspectLinkPhrase.
  const body =
    locale === "fr"
      ? bodyPrep(natalBody, aspect === "conjunction" ? "avec" : "à")
      : `${aspect === "conjunction" ? "with" : "to"} your ${bodyLabel(natalBody, locale)}`;
  const line = template.replaceAll("{aspect}", aspectWord).replaceAll("{body}", body);
  return line.charAt(0).toUpperCase() + line.slice(1);
}

export function transitHelloEmpty(locale: AppLocale): string {
  return source.empty[locale] || source.empty.en;
}
