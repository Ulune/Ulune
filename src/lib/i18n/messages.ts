import { CATALOG, type CatalogKey } from "./catalog";

export type MessageKey = CatalogKey;
export type AppLocale = "en" | "fr";

function column(i: 0 | 1): Record<MessageKey, string> {
  const out = {} as Record<MessageKey, string>;
  for (const key of Object.keys(CATALOG) as MessageKey[]) out[key] = CATALOG[key][i];
  return out;
}

export const MESSAGES: Record<AppLocale, Record<MessageKey, string>> = {
  en: column(0),
  fr: column(1),
};

export function translate(
  locale: AppLocale,
  key: MessageKey,
  vars?: Record<string, string | number>,
): string {
  const table = MESSAGES[locale] ?? MESSAGES.en;
  let text = table[key] ?? MESSAGES.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}
