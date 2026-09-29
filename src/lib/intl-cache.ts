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
    // French writes the first of a month "1er" before the month's name (1er octobre, 1er oct.).
    if (locale?.startsWith("fr") && options.day === "numeric" && (options.month === "long" || options.month === "short")) {
      format = withPremier(format);
    }
    dateFormats.set(key, format);
  }
  return format;
}

/** The same formatter, "1" before a month's name read as "1er" by its format(). */
function withPremier(base: Intl.DateTimeFormat): Intl.DateTimeFormat {
  const format = (date?: Date | number) =>
    base
      .formatToParts(date)
      .map((part, i, parts) =>
        part.type === "day" && part.value === "1" && parts.slice(i + 1).some((p) => p.type === "month") ? "1er" : part.value,
      )
      .join("");
  return new Proxy(base, {
    get(target, prop) {
      if (prop === "format") return format;
      const value = Reflect.get(target, prop, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
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
