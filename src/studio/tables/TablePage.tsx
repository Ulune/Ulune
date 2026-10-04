import { useOverflowFade } from "@/lib/overflow-fade";
import { useExportSlot, useTableTabsSlot } from "@/studio/stage/stage-slots";
import { createPortal } from "react-dom";
import { Check, Copy, Download, Info } from "lucide-react";
import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { prefersReducedMotion } from "@/lib/depth/env";
import type { GlossaryId } from "@/lib/i18n/glossary";
import { lazyNamed, prefetch } from "@/lib/lazy-component";
import { useI18n } from "@/lib/i18n/locale";
import { tableBarText } from "@/lib/i18n/table-ui";
import { toast } from "@/lib/toast";
import { downloadText } from "@/lib/download-text";
import { copyTextAndTable, encodeCsv, htmlTable, parseCsv } from "@/lib/csv";
import { activePartIndex, barScrollFor, isAtEnd, scrollTargetFor } from "@/studio/tables/table-spy";
import "@/studio/modes/styles/tables.css";

export type TablePart = {
  id: string;
  /** The link's words in the bar, and the part's heading. */
  label: string;
  /** The heading when it says more than the link ("January 2026" for "Jan"). */
  heading?: string;
  hint?: string;
  /** The glossary's words for this part, folded under its hint. */
  terms?: GlossaryId[];
  /** The part's own text for its Copy button (no button without it). */
  copyText?: () => string;
  /**
   * The part as one table, header first, as it stands on screen (review 3 Oct,
   * B2, B3): its own CSV button, and a real table on the clipboard beside the text.
   */
  table?: () => string[][];
  children: ReactNode;
};

/** The part last read in each table, for this visit only: kept in memory, never stored. */
const lastRead = new Map<string, string>();

const partDomId = (id: string) => `table-part-${id}`;
const headDomId = (id: string) => `table-part-${id}-h`;

/** The nearest ancestor that scrolls (the stage's figure), else the page. */
function scrollerOf(el: HTMLElement | null): HTMLElement | null {
  if (typeof window === "undefined") return null;
  for (let at = el?.parentElement ?? null; at; at = at.parentElement) {
    const y = getComputedStyle(at).overflowY;
    if (y === "auto" || y === "scroll") return at;
  }
  return (document.scrollingElement as HTMLElement | null) ?? null;
}

function topOf(scroller: HTMLElement): number {
  return scroller === document.scrollingElement ? 0 : scroller.getBoundingClientRect().top;
}

/**
 * A table as one page: its parts one under the other in a single scroll,
 * with a bar of links pinned at the top. A link glides to its part (a jump
 * with reduced motion) and gives its heading the focus; as the page scrolls,
 * the link of the part being read is marked with aria-current. The bar holds
 * the whole table's Copy and download buttons; a part may have its own Copy.
 * Nothing here is stored: the part last read comes back within the visit.
 */
export function TablePage({
  name,
  label,
  parts,
  actions,
  intro,
  fileStem,
  startAt,
}: {
  /** Which table (one memory of the part last read per table). */
  name: string;
  /** The bar's name for screen readers. */
  label: string;
  parts: TablePart[];
  actions?: ReactNode;
  /** Before the parts, under the bar: what applies to all of them (the calendar's filters). */
  intro?: ReactNode;
  /** The start of each part's file name (the chart's name). */
  fileStem?: string;
  /** The part to open on when none was read yet this visit (the calendar's: the one with today, review 3 Oct T10). */
  startAt?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLElement>(null);
  // In the studio the links stand in the stage's toolbar and Copy / CSV in its
  // Export menu (UI plan, part 97); elsewhere the page keeps its own bar.
  const tabsSlot = useTableTabsSlot();
  const exportSlot = useExportSlot();
  const inBar = tabsSlot != null;
  const list = useRef<HTMLOListElement>(null);
  // The parts' row scrolls: its far edge fades while parts are past it (review 3 Oct, C13).
  useOverflowFade(list);
  const ids = parts.map((p) => p.id).join("|");
  const [active, setActive] = useState(() => {
    const last = lastRead.get(name) ?? startAt;
    return last && parts.some((p) => p.id === last) ? last : (parts[0]?.id ?? "");
  });
  // barH: the bar's height; gliding: a link's scroll is under way; pinned: the
  // part a link chose, held until the reader scrolls (a short last part never
  // reaches the top, and would lose its mark to the part below it).
  const state = useRef({ barH: 0, gliding: false, pinned: null as string | null, endTimer: 0, frame: 0 });

  const mark = useCallback(
    (id: string) => {
      lastRead.set(name, id);
      setActive((prev) => (prev === id ? prev : id));
    },
    [name],
  );

  // The bar's height sets where a heading lands and where column headers pin.
  useLayoutEffect(() => {
    const el = root.current;
    const b = bar.current;
    if (!el || !b) return;
    const apply = () => {
      // Out in the toolbar the bar takes no room over the parts.
      const h = inBar ? 0 : Math.round(b.getBoundingClientRect().height);
      state.current.barH = h;
      el.style.setProperty("--tbar-h", `${h}px`);
    };
    apply();
    if (inBar || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(apply);
    ro.observe(b);
    return () => ro.disconnect();
  }, [inBar]);

  // Follow the scroll.
  useEffect(() => {
    const el = root.current;
    const scroller = scrollerOf(el);
    if (!el || !scroller) return;
    const order = ids.split("|");
    const s = state.current;
    const target: EventTarget = scroller === document.scrollingElement ? window : scroller;
    const compute = () => {
      s.frame = 0;
      if (s.gliding || s.pinned) return;
      const line = topOf(scroller) + s.barH + 2;
      const tops = order.map((id) => document.getElementById(partDomId(id))?.getBoundingClientRect().top ?? Infinity);
      const max = scroller.scrollHeight - scroller.clientHeight;
      const at = order[activePartIndex(tops, line, isAtEnd(scroller.scrollTop, max))];
      if (at) mark(at);
    };
    const endGlide = () => {
      window.clearTimeout(s.endTimer);
      s.gliding = false;
    };
    const onScroll = () => {
      if (s.gliding) {
        // A moment without scrolling ends the glide (Safari before 26.2 has no scrollend).
        window.clearTimeout(s.endTimer);
        s.endTimer = window.setTimeout(endGlide, 160);
        return;
      }
      // The reader scrolls: the part a link chose is no longer held.
      s.pinned = null;
      if (!s.frame) s.frame = requestAnimationFrame(compute);
    };
    target.addEventListener("scroll", onScroll, { passive: true });
    target.addEventListener("scrollend", endGlide);
    // The part last read comes back with the table (after the stage has
    // put its scroll back to the top).
    const want = lastRead.get(name) ?? startAt;
    let restore = 0;
    if (want && want !== order[0] && order.includes(want)) {
      restore = requestAnimationFrame(() => {
        const part = document.getElementById(partDomId(want));
        if (!part) return;
        const max = scroller.scrollHeight - scroller.clientHeight;
        const top = scrollTargetFor(part.getBoundingClientRect().top, scroller.scrollTop, topOf(scroller), s.barH, max);
        s.pinned = want;
        if (Math.abs(top - scroller.scrollTop) < 1) return;
        s.gliding = true;
        scroller.scrollTo({ top, behavior: "auto" });
        window.clearTimeout(s.endTimer);
        s.endTimer = window.setTimeout(endGlide, 160);
      });
    } else {
      s.frame = requestAnimationFrame(compute);
    }
    return () => {
      target.removeEventListener("scroll", onScroll);
      target.removeEventListener("scrollend", endGlide);
      cancelAnimationFrame(restore);
      cancelAnimationFrame(s.frame);
      s.frame = 0;
      window.clearTimeout(s.endTimer);
      s.gliding = false;
    };
  }, [ids, name, mark, startAt]);

  // On a narrow bar, slide it sideways to keep the marked link in view.
  useEffect(() => {
    const ol = list.current;
    const link = ol?.querySelector<HTMLElement>(`[data-part="${active}"]`);
    if (!ol || !link || ol.scrollWidth <= ol.clientWidth + 1) return;
    const left = barScrollFor(link.offsetLeft, link.offsetWidth, ol.scrollLeft, ol.clientWidth);
    if (Math.abs(left - ol.scrollLeft) > 1) ol.scrollTo({ left, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [active]);

  const go = (id: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    // A new tab or window keeps the browser's own way.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    const scroller = scrollerOf(root.current);
    const part = document.getElementById(partDomId(id));
    if (!scroller || !part) return;
    const s = state.current;
    const max = scroller.scrollHeight - scroller.clientHeight;
    const top = scrollTargetFor(part.getBoundingClientRect().top, scroller.scrollTop, topOf(scroller), s.barH, max);
    s.pinned = id;
    mark(id);
    document.getElementById(headDomId(id))?.focus({ preventScroll: true });
    if (Math.abs(top - scroller.scrollTop) < 1) return;
    s.gliding = true;
    window.clearTimeout(s.endTimer);
    // Should no scroll event come at all, the glide still ends.
    s.endTimer = window.setTimeout(() => {
      s.gliding = false;
    }, 1200);
    scroller.scrollTo({ top, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  };

  return (
    <div ref={root} className="ulune-tpage" data-testid="table-page">
      {(() => {
        const nav = (
      <nav ref={bar} className="ulune-tbar" aria-label={label} data-testid="table-bar">
        <ol ref={list} className="ulune-tbar-list">
          {parts.map((p) => (
            <li key={p.id}>
              <a
                href={`#${partDomId(p.id)}`}
                className="ulune-tbar-link"
                data-part={p.id}
                data-testid={`table-section-${p.id}`}
                aria-current={active === p.id ? "true" : undefined}
                onClick={go(p.id)}
              >
                {p.label}
              </a>
            </li>
          ))}
        </ol>
        {actions && !inBar ? <div className="ulune-tbar-act">{actions}</div> : null}
      </nav>
        );
        return tabsSlot ? createPortal(nav, tabsSlot) : nav;
      })()}
      {actions && inBar && exportSlot
        ? createPortal(
            <div role="group" aria-label={label} className="ob-menu-table" data-testid="table-export">
              {actions}
            </div>,
            exportSlot,
          )
        : null}
      {intro}
      {parts.map((p) => (
        <section
          key={p.id}
          id={partDomId(p.id)}
          className="ulune-tpart"
          data-testid={`table-${p.id}`}
          aria-labelledby={headDomId(p.id)}
        >
          <header className="ulune-tpart-head">
            <div className="min-w-0">
              <h2 id={headDomId(p.id)} className="ulune-tpart-h" tabIndex={-1}>
                {p.heading ?? p.label}
              </h2>
              {p.hint || p.terms?.length ? (
                <PartAbout id={p.id} label={p.heading ?? p.label}>
                  {p.hint ? <p className="ulune-tpart-hint">{p.hint}</p> : null}
                  {p.terms?.length ? <PartTerms ids={p.terms} testId={`table-terms-${p.id}`} /> : null}
                </PartAbout>
              ) : null}
            </div>
            <div className="ulune-tpart-acts">
              {p.copyText ? <PartCopy label={p.heading ?? p.label} text={p.copyText} table={p.table} testId={`table-copy-${p.id}`} /> : null}
              {p.table ? <PartCsv label={p.heading ?? p.label} table={p.table} file={`${slugOf(fileStem ?? name)}-${p.id}`} testId={`table-csv-${p.id}`} /> : null}
            </div>
          </header>
          {p.children}
        </section>
      ))}
    </div>
  );
}

/**
 * A part's explanation and its words. On a phone they fold behind an ⓘ by
 * the heading (review 3 Oct, B4), so the first screen shows the table; on a
 * wider screen they stand open and the button is hidden (tables.css).
 */
export function PartAbout({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  const box = `table-part-${id}-about`;
  return (
    <>
      <button
        type="button"
        className="ulune-tpart-info"
        data-testid={`table-info-${id}`}
        aria-expanded={open}
        aria-controls={box}
        aria-label={tableBarText(locale, "aboutPart", { part: label })}
        onClick={() => setOpen(!open)}
      >
        <Info className="size-4" aria-hidden />
      </button>
      <div id={box} className="ulune-tpart-about" data-open={open ? "1" : undefined}>
        {children}
      </div>
    </>
  );
}

const loadTerms = () => import("@/components/glossary-list");
const GlossaryTerms = lazyNamed(loadTerms, "GlossaryTerms");

/** "Words used here": the part's glossary words, downloaded when it opens. */
function PartTerms({ ids, testId }: { ids: GlossaryId[]; testId: string }) {
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <details className="ob-rc-about ulune-tpart-terms" data-testid={testId} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary onPointerEnter={() => prefetch(loadTerms)} onFocus={() => prefetch(loadTerms)}>
        {tableBarText(locale, "wordsHere")}
      </summary>
      {open ? (
        <Suspense fallback={null}>
          <GlossaryTerms ids={ids} />
        </Suspense>
      ) : null}
    </details>
  );
}

function slugOf(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "") || "table"
  );
}

/** A part's own CSV: one table with its header, as filtered on screen, for the reader's spreadsheet. */
function PartCsv({ label, table, file, testId }: { label: string; table: () => string[][]; file: string; testId: string }) {
  const { locale } = useI18n();
  return (
    <button
      type="button"
      className="ulune-tpart-copy ulune-tpart-csv"
      data-testid={testId}
      aria-label={tableBarText(locale, "csvPartNamed", { part: label })}
      title={tableBarText(locale, "csvPart")}
      onClick={() => downloadText(`${file}.csv`, encodeCsv(table(), locale))}
    >
      <Download className="size-4" aria-hidden />
    </button>
  );
}

function PartCopy({ label, text, table, testId }: { label: string; text: () => string; table?: () => string[][]; testId: string }) {
  const { locale, t } = useI18n();
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="ulune-tpart-copy"
      data-testid={testId}
      aria-label={tableBarText(locale, "copyPartNamed", { part: label })}
      title={tableBarText(locale, "copyPart")}
      onClick={async () => {
        try {
          const rows = table?.();
          await copyTextAndTable(text(), rows?.length ? htmlTable(rows, label) : null);
          setDone(true);
          toast(t("tableCopied"));
          window.setTimeout(() => setDone(false), 1600);
        } catch {
          setDone(false);
        }
      }}
    >
      {done ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
    </button>
  );
}

/**
 * The whole table's Copy (as text) and CSV, at the right end of the bar.
 * Both are made on this device when asked for; nothing is sent.
 */
export function TableActions({
  text,
  csv,
  fileName,
  extra,
  disabled = false,
}: {
  text: () => string;
  csv: () => string;
  fileName: string;
  /** What they would export is still arriving. */
  disabled?: boolean;
  /** More buttons after Copy and CSV (the calendar's file). */
  extra?: ReactNode;
}) {
  const { t, locale } = useI18n();
  const [copied, setCopied] = useState(false);
  const slug = slugOf(fileName);
  return (
    <>
      <button
        type="button"
        role="menuitem"
        className="ob-menu-item"
        data-testid="table-copy"
        disabled={disabled}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text());
            setCopied(true);
            toast(t("tableCopied"));
            window.setTimeout(() => setCopied(false), 1600);
          } catch {
            setCopied(false);
          }
        }}
      >
        <Copy className="size-3.5" aria-hidden />
        <span className="ulune-tbar-act-label" aria-live="polite">
          {copied ? t("tableCopied") : t("tableCopy")}
        </span>
      </button>
      <button
        type="button"
        role="menuitem"
        className="ob-menu-item"
        data-testid="table-csv"
        disabled={disabled}
        onClick={() => downloadText(`${slug}.csv`, encodeCsv(parseCsv(csv()), locale))}
      >
        <Download className="size-3.5" aria-hidden />
        <span className="ulune-tbar-act-label">{t("tableExportCsv")}</span>
      </button>
      {extra}
    </>
  );
}
