import type { MessageKey } from "@/lib/i18n/messages";

/*
 * A book of words kept out of the app's catalog (the first-load trim, 13 Oct
 * 2026): the space sheet's and settings' (catalog/space-words.ts), Your
 * data's (data-words.ts), the AI accounts' (ai-words.ts). Each loads with the
 * code that says it. `bookT` gives that code one `t` for both: the book's
 * own words first, the catalog's for the rest, the same `{name}` variables.
 */
export type WordBook = Readonly<Record<string, readonly [string, string]>>;

export function bookT<B extends WordBook>(
  book: B,
  t: (key: MessageKey, vars?: Record<string, string | number>) => string,
  locale: string,
): (key: MessageKey | (keyof B & string), vars?: Record<string, string | number>) => string {
  return (key, vars) => {
    const pair = (book as WordBook)[key];
    if (!pair) return t(key as MessageKey, vars);
    let text: string = pair[locale === "fr" ? 1 : 0];
    if (vars) for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, String(v));
    return text;
  };
}
