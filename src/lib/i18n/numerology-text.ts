import { NUMBER_TEXT, type NumberKey } from "@/lib/content/numerology";
import { pickBi } from "@/lib/content/types";
import type { AppLocale } from "./messages";

/*
 * Numerology prose that comes from the reading text (src/lib/content), kept
 * apart from numerology-ui.ts so the studio's labels do not pull the text in.
 * Loaded through the numerology pack (src/lib/content/pack-num.ts).
 */

export function numerologyNumberParagraphs(locale: AppLocale, value: number): string[] {
  const row = NUMBER_TEXT[value as NumberKey];
  if (!row) return [];
  return [row.what, row.strengths, row.pitfalls, row.example].map((b) => pickBi(b, locale));
}
