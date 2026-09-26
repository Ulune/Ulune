import type { AppLocale } from "./messages";
import source from "./reading-ai.json" with { type: "json" };
import { pick } from "./pick";

export const READING_AI = source;


/** Accessible name for the reading-header star — must match the top-bar star. */
export function readingAiLabel(locale: AppLocale): string {
  return pick(source.label, locale);
}
