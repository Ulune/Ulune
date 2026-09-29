import { Check, Copy } from "lucide-react";
import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { prefersReducedMotion } from "@/lib/depth/env";
import type { GlossaryId } from "@/lib/i18n/glossary";
import { lazyNamed, prefetch } from "@/lib/lazy-component";
import { useI18n } from "@/lib/i18n/locale";
import { tableBarText } from "@/lib/i18n/table-ui";
import { toast } from "@/lib/toast";
import { activePartIndex, barScrollFor, isAtEnd, scrollTargetFor } from "@/studio/tables/table-spy";
import "@/studio/modes/styles/tables.css";

export type TablePart = {
  id: string;
  /** The link's words in the bar, and the part's heading. */
  label: string;
  hint?: string;
  /** The glossary's words for this part, folded under its hint. */
  terms?: GlossaryId[];
  /** The part's own text for its Copy button (no button without it). */
  copyText?: () => string;
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
}: {
  /** Which table (one memory of the part last read per table). */
  name: string;
  /** The bar's name for screen readers. */
  label: string;
  parts: TablePart[];
  actions?: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const ids = parts.map((p) => p.id).join("|");
  const [active, setActive] = useState(() => {
    const last = lastRead.get(name);
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
      const h = Math.round(b.getBoundingClientRect().height);
      state.current.barH = h;
      el.style.setProperty("--tbar-h", `${h}px`);
    };
    apply();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(apply);
    ro.observe(b);
    return () => ro.disconnect();
  }, []);

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
    const want = lastRead.get(name);
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
  }, [ids, name, mark]);

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
        {actions ? <div className="ulune-tbar-act">{actions}</div> : null}
      </nav>
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
                {p.label}
              </h2>
              {p.hint ? <p className="ulune-tpart-hint">{p.hint}</p> : null}
              {p.terms?.length ? <PartTerms ids={p.terms} testId={`table-terms-${p.id}`} /> : null}
            </div>
            {p.copyText ? <PartCopy label={p.label} text={p.copyText} testId={`table-copy-${p.id}`} /> : null}
          </header>
          {p.children}
        </section>
      ))}
    </div>
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

function PartCopy({ label, text, testId }: { label: string; text: () => string; testId: string }) {
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
          await navigator.clipboard.writeText(text());
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
