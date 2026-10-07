import { encyclopedia } from "@/lib/i18n/catalog/encyclopedia";
import { translate, type MessageKey } from "@/lib/i18n/messages";
import type { Lang } from "./types";

/*
 * The encyclopedia's interface words (src/lib/i18n/catalog/encyclopedia.ts),
 * read here rather than through the app's catalog: everything that says them
 * (its pages, the card, the palette's section, the Settings card) is
 * downloaded when used, so they stay out of every page's first download. The
 * app's own words (catalog/index.ts) are read as usual.
 */

export type EncKey = keyof typeof encyclopedia;
const WORDS: Record<string, readonly [string, string]> = encyclopedia;

/** A word in a page's language (its address says which: /encyclopedie/… is French for everyone), not the reader's. */
export function tr(lang: Lang, key: EncKey | MessageKey, vars?: Record<string, string | number>): string {
  const pair = Object.hasOwn(WORDS, key) ? WORDS[key] : undefined;
  if (!pair) return translate(lang, key as MessageKey, vars);
  let text = pair[lang === "fr" ? 1 : 0];
  if (vars) for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, String(v));
  return text;
}
