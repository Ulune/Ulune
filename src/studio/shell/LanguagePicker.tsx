import { Check, Info, X } from "lucide-react";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { AnchoredPopover } from "@/components/anchored-popover";
import { PathLink } from "@/components/path-link";
import { hanziLang } from "@/lib/chinese/animal-chars";
import { LANGUAGE_NAMES } from "@/lib/chinese/language-names";
import { chineseLabel, readChinesePrefs, type ChinesePrefs } from "@/lib/chinese/prefs";
import { useChinesePrefs } from "@/lib/chinese/use-chinese-prefs";
import { useI18n } from "@/lib/i18n/locale";
import { usePresence } from "@/lib/presence";
import { cn } from "@/lib/utils";
import { isWide } from "@/studio/dock/dock-layout";
import { LANGUAGES, languageGroups, languageHomePath, pickerOrder, recentLanguages, type LanguageId } from "@/studio/map";
import { isNewLanguage, pickerSeen } from "@/studio/new-languages";
import { LanguageMark } from "@/studio/shell/language-mark";
import { LANGUAGE_WORDS, TRADITION_LABEL } from "@/studio/shell/map-ui";
import { pickerWord } from "@/studio/shell/picker-words";
import "./language-picker.css";

type Props = {
  open: boolean;
  anchor: RefObject<HTMLButtonElement | null>;
  current: LanguageId;
  onClose: () => void;
  onPick: (id: LanguageId) => void;
};

/**
 * The language picker (page reorganisation, part R3): one card per language,
 * under its tradition's heading, read from the registry (src/studio/map.ts),
 * so Chinese traditions get their heading when the registry has them. Each
 * card says what the language reads and what it needs, the current one is
 * ticked, and ⓘ leads to its home in the encyclopedia. A panel under the
 * button on a computer; a bottom sheet of two columns on a phone, the two
 * languages used last first. The arrows move between the cards, Enter opens
 * one, Escape closes and the focus goes back to the button.
 *
 * Since languages plan part 28, a Chinese language's card also gives its own
 * name, its pinyin and characters as Settings → Chinese traditions says
 * (bāzì 八字), and 2.0's languages say "new" for the reader's first four
 * weeks with 2.0 (new-languages.ts).
 */
export function LanguagePicker({ open, anchor, current, onClose, onPick }: Props) {
  const { t } = useI18n();
  // Decided as it opens: a computer's panel or a phone's sheet, the order the languages were used in, and
  // which are new (the first opening since 2.0 is kept, as a date: new-languages.ts).
  const [wide, setWide] = useState(isWide);
  const [recent, setRecent] = useState(() => recentLanguages());
  const [news, setNews] = useState<ReadonlySet<LanguageId>>(() => new Set());
  useLayoutEffect(() => {
    if (!open) return;
    setWide(isWide());
    setRecent(recentLanguages());
    const now = Date.now();
    const seen = pickerSeen(now);
    setNews(new Set(LANGUAGES.filter((l) => isNewLanguage(l.id, seen, now)).map((l) => l.id)));
  }, [open]);
  // The reader's Chinese settings, followed live. The picker is drawn on a press, never on the server,
  // so its first frame reads them at once (the hook's own first frame has the defaults).
  const live = useChinesePrefs();
  const [first] = useState(readChinesePrefs);
  const [settled, setSettled] = useState(false);
  useEffect(() => setSettled(true), []);
  const prefs = settled ? live : first;
  const body = (
    <Cards current={current} recent={recent} recentFirst={!wide} news={news} prefs={prefs} onPick={onPick} onLeave={onClose} />
  );
  if (wide) {
    return (
      <AnchoredPopover
        open={open}
        anchorRef={anchor}
        onClose={onClose}
        role="dialog"
        aria-label={t("langPicker")}
        hideLabel={t("hidePanel")}
        // Two columns of cards wide enough for a Chinese name's line ("shēngxiào 生肖 Nouveau") in either language.
        width={520}
        testId="lang-picker"
      >
        <div className="ob-pop ob-langs-pop">{body}</div>
      </AnchoredPopover>
    );
  }
  return (
    <Sheet open={open} anchor={anchor} onClose={onClose}>
      {body}
    </Sheet>
  );
}

function Cards({
  current,
  recent,
  recentFirst,
  news,
  prefs,
  onPick,
  onLeave,
}: {
  current: LanguageId;
  recent: LanguageId[];
  recentFirst: boolean;
  news: ReadonlySet<LanguageId>;
  prefs: ChinesePrefs;
  onPick: (id: LanguageId) => void;
  onLeave: () => void;
}) {
  const { t, locale } = useI18n();
  const home = (id: LanguageId) => languageHomePath(id, locale);
  const uid = useId();
  return (
    <div className="ob-langs" onKeyDown={moveBetweenCards}>
      {languageGroups().map(({ group, languages }) => {
        const head = `${uid}-${group}`;
        return (
          <section key={group} className="ob-langs-group" aria-labelledby={head}>
            <h2 id={head} className="ob-langs-head">
              {pickerWord(locale, TRADITION_LABEL[group])}
            </h2>
            <ul className="ob-langs-grid">
              {pickerOrder(
                languages.map((l) => l.id),
                recent,
                recentFirst,
              ).map((id) => {
                const words = LANGUAGE_WORDS[id];
                const on = id === current;
                const name = t(words.name);
                const ids = `${uid}-${id}`;
                // A Chinese language's own name, as the reader chose to see Chinese terms (none with "Name only").
                const own = LANGUAGE_NAMES[id] ? chineseLabel(LANGUAGE_NAMES[id], locale, prefs) : null;
                const hasOwn = Boolean(own?.pinyin || own?.hanzi);
                // "New" on 2.0's languages, for the reader's first weeks with it; said after the name ("BaZi, New").
                const fresh = news.has(id) ? pickerWord(locale, "langNew") : null;
                const tag = fresh ? (
                  <span className="ob-langs-new" data-testid={`lang-new-${id}`}>
                    {fresh}
                  </span>
                ) : null;
                return (
                  <li key={id} className={cn("ob-langs-card", on && "is-on", home(id) != null && "has-info")}>
                    <button
                      type="button"
                      className="ob-langs-main"
                      data-testid={`lang-card-${id}`}
                      data-lang-card
                      data-autofocus={on || undefined}
                      aria-current={on ? "true" : undefined}
                      aria-labelledby={fresh ? undefined : `${ids}-name`}
                      aria-label={fresh ? `${name}, ${fresh}` : undefined}
                      aria-describedby={`${ids}-line ${ids}-needs`}
                      onClick={() => onPick(id)}
                    >
                      <span className="ob-langs-top">
                        <LanguageMark id={id} className="ob-langs-mark" />
                        <span className="ob-langs-title">
                          <span className="ob-langs-nameline">
                            <span id={`${ids}-name`} className="ob-langs-name">
                              {name}
                            </span>
                            {on ? <Check className="ob-langs-tick" strokeWidth={2.25} aria-hidden /> : null}
                            {hasOwn ? null : tag}
                          </span>
                          {/* Its pinyin and characters, each marked with its language; the button's own name stays the reader's word. */}
                          {own && hasOwn ? (
                            <span className="ob-langs-own" data-testid={`lang-own-${id}`}>
                              {own.pinyin ? (
                                <span className="ob-langs-pinyin" lang="zh-Latn-pinyin">
                                  {own.pinyin}
                                </span>
                              ) : null}{" "}
                              {own.hanzi ? (
                                <span className="ob-langs-hanzi" lang={hanziLang(prefs.script)}>
                                  {own.hanzi}
                                </span>
                              ) : null}
                              {tag}
                            </span>
                          ) : null}
                        </span>
                      </span>
                      <span id={`${ids}-line`} className="ob-langs-line">
                        {pickerWord(locale, words.line)}
                      </span>
                      <span id={`${ids}-needs`} className="ob-langs-needs">
                        {pickerWord(locale, words.needs)}
                      </span>
                    </button>
                    {/* Its home in the encyclopedia (another page: the picker closes), once it has one. */}
                    {home(id) == null ? null : (
                      <PathLink
                        href={home(id)!}
                        className="ob-langs-info"
                        data-testid={`lang-info-${id}`}
                        aria-label={pickerWord(locale, "langAbout", { name })}
                        title={pickerWord(locale, "langAbout", { name })}
                        onClick={onLeave}
                      >
                        <Info className="size-4" strokeWidth={1.75} aria-hidden />
                      </PathLink>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/**
 * The arrows between the cards, as they stand on screen: left and right
 * along the order, up and down to the nearest card of the row above or
 * below, Home and End to either end. A card is opened with Enter or Space;
 * Tab also reaches each card's ⓘ.
 */
function moveBetweenCards(e: ReactKeyboardEvent<HTMLElement>) {
  if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
  const cards = [...e.currentTarget.querySelectorAll<HTMLElement>("[data-lang-card]")];
  const at = cards.indexOf(document.activeElement as HTMLElement);
  if (at < 0) return;
  let next: number;
  if (e.key === "ArrowRight") next = Math.min(cards.length - 1, at + 1);
  else if (e.key === "ArrowLeft") next = Math.max(0, at - 1);
  else if (e.key === "Home") next = 0;
  else if (e.key === "End") next = cards.length - 1;
  else if (e.key === "ArrowDown" || e.key === "ArrowUp") next = nearestRow(cards, at, e.key === "ArrowDown" ? 1 : -1);
  else return;
  e.preventDefault();
  // The panel's own arrows (anchored-popover.tsx) would walk the ⓘ links too.
  e.stopPropagation();
  cards[next]?.focus();
}

function nearestRow(cards: HTMLElement[], at: number, dir: 1 | -1): number {
  const from = cards[at].getBoundingClientRect();
  let best = at;
  let score = Infinity;
  cards.forEach((card, i) => {
    const r = card.getBoundingClientRect();
    const gap = dir > 0 ? r.top - from.bottom : from.top - r.bottom;
    if (gap < -1) return;
    // The nearest row first, then the card nearest the same column.
    const s = gap * 1000 + Math.abs(r.left - from.left);
    if (s < score) {
      score = s;
      best = i;
    }
  });
  return best;
}

/** A phone's bottom sheet: over a dimmed page, held to the focus, closed by Escape, a tap outside or a swipe down. */
function Sheet({
  open,
  anchor,
  onClose,
  children,
}: {
  open: boolean;
  anchor: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const { shown, leaving } = usePresence(open);
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [drag, setDrag] = useState(0);
  const start = useRef<{ y: number; at: number } | null>(null);

  // In: the current card takes the focus. Out: it goes back to the button.
  useEffect(() => {
    if (!open) return;
    const box = ref.current;
    const frame = requestAnimationFrame(() => {
      if (!box || box.contains(document.activeElement)) return;
      (box.querySelector<HTMLElement>("[data-autofocus]") ?? box.querySelector<HTMLElement>("[data-lang-card]"))?.focus({
        preventScroll: true,
      });
    });
    const button = anchor.current;
    return () => {
      cancelAnimationFrame(frame);
      const at = document.activeElement;
      if (!at || at === document.body || box?.contains(at)) button?.focus({ preventScroll: true });
    };
  }, [open, anchor]);

  const onKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      // This sheet only: the dock's sheet under it stays as it is.
      e.preventDefault();
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;
    // The focus stays in the sheet while it is open.
    const stops = [...e.currentTarget.querySelectorAll<HTMLElement>("button, a[href]")].filter((el) => el.getClientRects().length);
    const first = stops[0];
    const last = stops[stops.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  };

  // A swipe down on its head closes it; a short one lets it settle back.
  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || (e.target as Element).closest("button")) return;
    start.current = { y: e.clientY, at: performance.now() };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (start.current) setDrag(Math.max(0, e.clientY - start.current.y));
  };
  const onUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const s = start.current;
    start.current = null;
    if (!s) return;
    const dy = Math.max(0, e.clientY - s.y);
    const fast = dy / Math.max(1, performance.now() - s.at) > 0.5;
    setDrag(0);
    if (dy > 80 || (fast && dy > 24)) onClose();
  };

  if (!shown || typeof document === "undefined") return null;
  return createPortal(
    <div
      className="ob-langsheet-scrim"
      data-leaving={leaving ? "" : undefined}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className="ob-langsheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid={leaving ? undefined : "lang-picker"}
        data-dragging={drag ? "" : undefined}
        inert={leaving || undefined}
        style={drag ? { transform: `translateY(${drag}px)` } : undefined}
        onKeyDown={onKey}
      >
        <div className="ob-langsheet-head" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <span className="ob-langsheet-grip" aria-hidden />
          <h2 id={titleId} className="ob-langsheet-title">
            {t("langPicker")}
          </h2>
          <button type="button" className="ob-icon-btn ob-icon-btn--quiet" aria-label={t("hidePanel")} onClick={onClose}>
            <X className="size-4" strokeWidth={1.75} aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
