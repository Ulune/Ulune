import type { AppLocale } from "./messages";

type ColumnBundle = { en: readonly string[]; fr?: readonly string[] };

/**
 * Header row for a data table. `count` is the table's committed column count —
 * `data-col` keys come from the matching `*_TABLE_COLUMN_KEYS`, so a translation
 * only ships when it fills every column. Anything short, long, or blank falls
 * back to English rather than leaving a header cell empty.
 */
export function localizedColumns(
  bundle: ColumnBundle,
  locale: AppLocale,
  count: number,
): readonly string[] {
  const cols = (locale === "fr" ? bundle.fr : bundle.en) ?? bundle.en;
  if (cols.length === count && cols.every((c) => typeof c === "string" && c.trim() !== "")) {
    return cols;
  }
  return bundle.en;
}
