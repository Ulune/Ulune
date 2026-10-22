import { Maximize2, X } from "lucide-react";
import type { RefObject } from "react";
import { compareWords } from "@/lib/i18n/catalog/compare-words";
import { useI18n } from "@/lib/i18n/locale";
import { bookT } from "@/lib/i18n/words-book";
import { cn } from "@/lib/utils";
import { languageOf } from "@/studio/map";
import { PAGE_LABEL } from "@/studio/modes/meta";
import type { ScopeMoment } from "@/studio/scope";
import { LANGUAGE_WORDS } from "@/studio/shell/map-ui";
import type { StudioPage } from "@/studio/url";
import { comparableByLanguage, cyclesPagesOf, type CompareMode } from "@/studio/compare/compare-modes";
import { momentWords, pageWords } from "@/studio/compare/pane-words";
import type { Who } from "@/studio/compare/linked";

/*
 * A Compare pane's label (share and compare plan, feature 2, ideas B7 and
 * B8): its mark, letter and person ("C · Camille"); with one person in two
 * languages, the pane's language and page, chosen in a compact list; with one
 * chart at two moments, the page and the moment each pane shows (B's page
 * chosen where its language has two Cycles pages: astrology's Transits and
 * Progressions). Held upright on a phone, the person's name shows the chart
 * full size for a moment. In Show mode the lists give way to their words.
 */

/** The pages Compare shows, language by language, in a compact list; the other pane's language is not offered. */
function PagePick({ who, page, otherPage, onPick }: { who: Who; page: StudioPage; otherPage: StudioPage; onPick: (page: StudioPage) => void }) {
  const { locale, t } = useI18n();
  const T = bookT(compareWords, t, locale);
  const taken = languageOf(otherPage);
  return (
    <select
      className="ob-compare-pick"
      data-testid={`compare-page-${who}`}
      aria-label={T("cmpPagePick", { letter: who.toUpperCase() })}
      title={T("cmpPagePick", { letter: who.toUpperCase() })}
      value={page}
      onChange={(e) => onPick(e.target.value as StudioPage)}
    >
      {comparableByLanguage().map((g) => (
        <optgroup key={g.lang} label={t(LANGUAGE_WORDS[g.lang].name)}>
          {g.pages.map((p) => (
            <option key={p} value={p} disabled={g.lang === taken}>
              {pageWords(p, t, T)}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

/** B's Cycles page where its language has more than one (astrology's Transits and Progressions). */
function MomentPick({ page, onPick }: { page: StudioPage; onPick: (page: StudioPage) => void }) {
  const { locale, t } = useI18n();
  const T = bookT(compareWords, t, locale);
  const pages = cyclesPagesOf(languageOf(page));
  return (
    <select className="ob-compare-pick" data-testid="compare-moment-page" aria-label={T("cmpMomentPick")} title={T("cmpMomentPick")} value={page} onChange={(e) => onPick(e.target.value as StudioPage)}>
      {pages.map((p) => (
        <option key={p} value={p}>
          {t(PAGE_LABEL[p])}
        </option>
      ))}
    </select>
  );
}

export type PaneLabelProps = {
  who: Who;
  /** "C · Camille". */
  title: string;
  mode: CompareMode;
  page: StudioPage;
  /** The other pane's page (one person in two languages: its language is not offered here). */
  otherPage: StudioPage;
  /** B's own moment (two moments). */
  moment?: ScopeMoment;
  /** Pick another page for this pane (two languages; B's Cycles page in two moments). */
  onPage?: (page: StudioPage) => void;
  /** Lists give way to their words (Show mode). */
  plain: boolean;
  stacked: boolean;
  /** One person in a narrow pane (two languages, two moments on a phone): the letter alone, the person being the bar's. */
  short?: boolean;
  full: boolean;
  onFull: (who: Who | null) => void;
  labelRef: (el: HTMLButtonElement | null) => void;
  closeRef?: RefObject<HTMLButtonElement | null>;
};

export function PaneLabel({ who, title, mode, page, otherPage, moment, onPage, plain, stacked, short = false, full, onFull, labelRef, closeRef }: PaneLabelProps) {
  const { locale, t } = useI18n();
  const T = bookT(compareWords, t, locale);
  const mark = <span className={cn("ob-compare-mark", `is-${who}`)} aria-hidden />;
  // Short, the person's name stays for a screen reader (the pane's region and this button say it).
  const name = <span className="ob-compare-name">{short && !full ? who.toUpperCase() : title}</span>;
  // Who the pane shows: a button to see it full size held upright on a phone, its words otherwise.
  const person = full ? (
    <span className="ob-compare-person">
      {mark}
      {name}
    </span>
  ) : stacked ? (
    <button
      ref={labelRef}
      type="button"
      className="ob-compare-person is-button"
      data-testid={`compare-label-${who}`}
      aria-label={T("cmpFullOpen", { name: title })}
      title={T("cmpFullOpen", { name: title })}
      onClick={() => onFull(who)}
    >
      {mark}
      {name}
      <Maximize2 className="ob-compare-grow size-3.5" strokeWidth={1.75} aria-hidden />
    </button>
  ) : (
    <span className="ob-compare-person" data-testid={`compare-label-${who}`}>
      {mark}
      {name}
    </span>
  );
  let what = null;
  if (mode === "languages") {
    what = plain || !onPage ? <span className="ob-compare-what">{pageWords(page, t, T)}</span> : <PagePick who={who} page={page} otherPage={otherPage} onPick={onPage} />;
  } else if (mode === "moments") {
    const many = cyclesPagesOf(languageOf(page)).length > 1;
    what = (
      <>
        {who === "b" && many && !plain && onPage ? <MomentPick page={page} onPick={onPage} /> : <span className="ob-compare-what">{pageWords(page, t, T)}</span>}
        {moment ? (
          <span className="ob-compare-when" data-testid="compare-moment-b">
            {momentWords(page, moment, locale, T)}
          </span>
        ) : null}
      </>
    );
  }
  return (
    <span className={cn("ob-compare-label", full && "is-full")} data-mode={mode}>
      {person}
      {what}
      {full ? (
        <button
          ref={closeRef}
          type="button"
          className="ob-icon-btn ob-compare-full-close"
          data-testid="compare-full-close"
          aria-label={T("cmpFullClose")}
          title={T("cmpFullClose")}
          onClick={() => onFull(null)}
        >
          <X className="size-4" strokeWidth={1.75} aria-hidden />
        </button>
      ) : null}
    </span>
  );
}
