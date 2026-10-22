import type { ReactNode } from "react";
import { previewProps } from "@/lib/depth/preview-bus";
import { pnWord } from "@/lib/i18n/catalog/pair-now-words";
import { useI18n } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import { useWheelView } from "@/studio/modes/wheel-view";
import { useDomIds } from "@/studio/scope";
import "@/studio/modes/styles/pair-now-head.css";
import "@/studio/modes/styles/pair-now.css";

/*
 * "You two, now" (share and compare plan, feature 5e, decision R5), the part
 * every Relationship page ends its reading with: one heading, "You two, now"
 * (« Vous deux, maintenant »), the moment it reads beside it (the part's own
 * reading when pressed), a line on what it shows, then its rows, each opening
 * its reading. The same look and the same words on every page; each page
 * brings its rows (astrology's contacts, Human Design's channels, the
 * Chinese pages' year and directions). In the chart scope around it, like the
 * rest of the page.
 */

/** The part: its heading and moment, a line, its rows. */
export function TwoNow({
  testId,
  when,
  whenRef,
  lead,
  ruled = false,
  side = false,
  children,
}: {
  testId: string;
  /** The moment read, said ("Today, 18 October 2026", "2026, the Fire Horse year"). */
  when: string;
  /** The part's own reading: the moment becomes its button. */
  whenRef?: string;
  lead?: string;
  /** A rule above it, where it follows other parts in one column. */
  ruled?: boolean;
  /** Beside the figure, at the end of its column: room left under it for the figure's zoom bar. */
  side?: boolean;
  children?: ReactNode;
}) {
  const { locale } = useI18n();
  const view = useWheelView();
  const domId = useDomIds();
  const head = domId(`${testId}-h`);
  const on = Boolean(whenRef && view.selectedId === whenRef);
  return (
    <section className={cn("ulune-two-now", ruled && "is-ruled", side && "is-side")} data-testid={testId} aria-labelledby={head}>
      <div className="ulune-two-now-head">
        <h3 id={head} className="ulune-kicker ulune-two-now-h">
          {pnWord(locale, "ptnHead")}
        </h3>
        {whenRef ? (
          <button type="button" className={cn("ulune-two-now-when", on && "is-on")} data-testid={`${testId}-when`} aria-pressed={on} onClick={() => view.pick(whenRef)} {...previewProps(whenRef)}>
            {when}
          </button>
        ) : (
          <span className="ulune-two-now-when" data-testid={`${testId}-when`}>
            {when}
          </span>
        )}
      </div>
      {lead ? <p className="ulune-two-now-lead">{lead}</p> : null}
      {children}
    </section>
  );
}

/** One row of the part: a mark, a title, a line under it; it opens its reading (in the panel: `pick`; on the figure's side: `choose`). */
export function NowRow({
  refId,
  testId,
  mark,
  title,
  sub,
  aria,
  onFigure = false,
  data,
}: {
  refId: string;
  testId: string;
  mark?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  aria?: string;
  /** On the page beside the figure: the choice lights the figure and readies the reading, as the page's other rows do. */
  onFigure?: boolean;
  data?: Record<`data-${string}`, string | undefined>;
}) {
  const view = useWheelView();
  const on = view.selectedId === refId;
  return (
    <li>
      <button
        type="button"
        className={cn("ulune-two-now-row", on && "is-on")}
        data-testid={testId}
        data-ref={refId}
        aria-pressed={on}
        aria-label={aria}
        onClick={() => (onFigure ? view.choose(refId) : view.pick(refId))}
        {...previewProps(refId)}
        {...data}
      >
        <span className="ulune-two-now-mark" aria-hidden>
          {mark}
        </span>
        <span className="ulune-two-now-text">
          <span className="ulune-two-now-title">{title}</span>
          {sub ? <span className="ulune-two-now-sub">{sub}</span> : null}
        </span>
      </button>
    </li>
  );
}

/** The rows' list. */
export function NowList({ children, testId }: { children: ReactNode; testId?: string }) {
  return (
    <ul className="ulune-two-now-list" data-testid={testId}>
      {children}
    </ul>
  );
}

/** A line in place of the rows (nothing to show, or why not). */
export function NowQuiet({ children, testId }: { children: ReactNode; testId?: string }) {
  return (
    <p className="ulune-two-now-quiet" data-testid={testId}>
      {children}
    </p>
  );
}
