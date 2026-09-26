import { CATALOG } from "./catalog";
import { translate, type AppLocale, type MessageKey } from "./messages";

/**
 * Server and parser errors travel as codes (`E:birth.date.missing|detail`).
 * Turn one into the reader's language; technical failures become a plain
 * fallback instead of an engine message.
 */
export function localizeError(raw: string | null | undefined, locale: AppLocale, fallback: MessageKey = "couldNotCast"): string {
  if (!raw) return translate(locale, fallback);
  const m = /(?:^|\s)E:([a-z]+(?:\.[a-z]+)+)(?:\|(.*))?$/.exec(raw);
  if (m) {
    const key = `err_${m[1].replace(/\./g, "_")}`;
    if (key in CATALOG) return translate(locale, key as MessageKey, { raw: m[2] ?? "" });
    return translate(locale, fallback);
  }
  if (/swiss|ephemeris|engine|wasm|mount|initiali[sz]e|longitude|failed to fetch|network/i.test(raw)) {
    return translate(locale, fallback);
  }
  return raw;
}
