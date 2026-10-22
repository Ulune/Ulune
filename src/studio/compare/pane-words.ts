import type { compareWords } from "@/lib/i18n/catalog/compare-words";
import { dateFormat } from "@/lib/intl-cache";
import type { MessageKey } from "@/lib/i18n/messages";
import type { bookT } from "@/lib/i18n/words-book";
import { languageOf, lensOf, pagesOf } from "@/studio/map";
import { PAGE_LABEL } from "@/studio/modes/meta";
import type { ScopeMoment } from "@/studio/scope";
import { LANGUAGE_WORDS, LENS_LABEL } from "@/studio/shell/map-ui";
import type { StudioPage } from "@/studio/url";

/*
 * What a Compare pane shows, in words (share and compare plan, idea B7): its
 * page by its language and lens, and its moment. Its label (pane-label.tsx),
 * its name for a screen reader (CompareView.tsx) and the reading's headings
 * (CompareReading.tsx) say it alike.
 */

type T = ReturnType<typeof bookT<typeof compareWords>>;

/** A page's words in a pane: its language and lens ("Human Design · Natal"), astrology's Cycles by its page ("Astrology · Transits"). */
export function pageWords(page: StudioPage, t: (key: MessageKey) => string, T: T): string {
  const lang = languageOf(page);
  const lens = lensOf(page);
  if (!lang || !lens) return t(PAGE_LABEL[page]);
  const which = pagesOf(lang, lens).length > 1 ? t(PAGE_LABEL[page]) : t(LENS_LABEL[lens]);
  return T("cmpPageOption", { language: t(LANGUAGE_WORDS[lang].name), page: which });
}

/** The moment a pane shows, in a few words: "now", a date (Transits, Progressions, Human Design's Cycles) or a year (the other Cycles pages). */
export function momentWords(page: StudioPage, m: ScopeMoment, locale: string, T: T): string {
  const day = (ms: number) => dateFormat(locale === "fr" ? "fr-FR" : "en-GB", { day: "numeric", month: "short", year: "numeric" }).format(ms);
  // The pages read at a moment (astrology's and Human Design's transits), at a date, or in a year.
  if (page === "transits" || page === "design-cycles") return m.live ? T("cmpNow") : day(m.at);
  if (page === "progressions") return Math.abs(m.progressionTarget - Date.now()) < 86_400_000 ? T("cmpNow") : day(m.progressionTarget);
  return m.year == null ? T("cmpNow") : String(m.year);
}

