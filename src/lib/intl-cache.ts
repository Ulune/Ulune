/**
 * Shared Intl formatters. Building an `Intl.DateTimeFormat` costs about as
 * much as formatting hundreds of dates with one, and several views used to
 * build one per row or per hit on every render (a Timing year grid took
 * 250 ms that way). One formatter per locale and options, kept for the page.
 */
const dateFormats = new Map<string, Intl.DateTimeFormat>();
const numberFormats = new Map<string, Intl.NumberFormat>();
const LIMIT = 256;

function keyOf(locale: string | undefined, options: object): string {
  return `${locale ?? ""}|${JSON.stringify(options)}`;
}

export function dateFormat(locale: string | undefined, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = keyOf(locale, options);
  let format = dateFormats.get(key);
  if (!format) {
    if (dateFormats.size >= LIMIT) dateFormats.clear();
    format = new Intl.DateTimeFormat(locale, options);
    dateFormats.set(key, format);
  }
  return format;
}

export function numberFormat(locale: string | undefined, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = keyOf(locale, options);
  let format = numberFormats.get(key);
  if (!format) {
    if (numberFormats.size >= LIMIT) numberFormats.clear();
    format = new Intl.NumberFormat(locale, options);
    numberFormats.set(key, format);
  }
  return format;
}
