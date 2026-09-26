import type { AppLocale } from "./messages";
import source from "./natal-empty.json";

export const NATAL_EMPTY = source;

export function emptyReading(locale: AppLocale): string {
  const localized = (source as Record<string, string | undefined>)[locale];
  return localized || source.en;
}
