import { Check, ChevronDown } from "lucide-react";
import { Suspense, useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { AnchoredPopover } from "@/components/anchored-popover";
import { onTablistKeyDown } from "@/lib/a11y/tablist";
import { useI18n } from "@/lib/i18n/locale";
import { lazyNamed, prefetch } from "@/lib/lazy-component";
import { useTour } from "@/lib/tour/state";
import { cn } from "@/lib/utils";
import {
  LENSES,
  chipLanguages,
  languageOf,
  lensOf,
  lensesOf,
  pageFor,
  pagesOf,
  recentLanguages,
  type LanguageId,
  type LensId,
} from "@/studio/map";
import { PAGE_LABEL } from "@/studio/modes/meta";
import { preloadMode } from "@/studio/modes/registry";
import { langHintDone, langHintDue } from "@/studio/shell/lang-hint";
import { LanguageMark } from "@/studio/shell/language-mark";
import { bindLanguagePicker } from "@/studio/shell/language-open";
import { LANGUAGE_WORDS, LENS_LABEL, LENS_SHORT } from "@/studio/shell/map-ui";
import { useStudioStore } from "@/studio/store";
import { useStudioUrl } from "@/studio/use-studio-url";
import type { StudioPage } from "@/studio/url";

// The picker is its own download, fetched when the button is pointed at,
// focused or pressed (as the dock's Bodies and Look tabs are).
const loadPicker = () => import("@/studio/shell/LanguagePicker");
const LanguagePicker = lazyNamed(loadPicker, "LanguagePicker");
// The one-time hint for readers who knew 1.x (lang-hint.ts): its own download, for them only.
const LanguageHint = lazyNamed(() => import("@/studio/shell/LanguageHint"), "LanguageHint");

/**
 * Where you are in Charts, at the start of the stage's toolbar (page
 * reorganisation, parts R3 and R4): the language button (its picker of
 * cards), the two other languages last used as chips (a computer's wide
 * toolbar), the lens tabs (only the lenses the language has, none when it
 * has one), and the lens's sub-modes when it has several. A narrow toolbar
 * folds the sub-modes into their lens's tab ("Cycles: Transits ▾"), as
 * shell.css says by the stage's width. Above the form too, before any chart
 * (the first screen is Astrology › Natal, the picker one press away);
 * nothing on the Calendar, which keeps its own toolbar.
 */
export function ChartsNav() {
  // The page pressed shows at once, before it is drawn (store.navPage).
  const page = useStudioStore((s) => s.navPage ?? s.page);
  const { setPage } = useStudioUrl({ hydrate: false });
  const lang = languageOf(page);
  const lens = lensOf(page);
  if (!lang || !lens) return null;
  const subs = pagesOf(lang, lens);
  return (
    <div className="ob-nav" data-testid="charts-nav">
      <LanguageButton lang={lang} go={setPage} />
      <LanguageChips lang={lang} go={setPage} />
      {lensesOf(lang).length > 1 ? <LensTabs lang={lang} lens={lens} page={page} go={setPage} /> : null}
      {subs.length > 1 ? <SubModes lens={lens} pages={subs} page={page} go={setPage} /> : null}
    </div>
  );
}

type Go = (page: StudioPage) => void;

function LanguageButton({ lang, go }: { lang: LanguageId; go: Go }) {
  const { t } = useI18n();
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  // Kept once opened, so the panel can leave with its motion.
  const [loaded, setLoaded] = useState(false);
  // The one-time hint (R8), looked at once mounted: the server's page has none.
  const [hint, setHint] = useState(false);
  useEffect(() => setHint(langHintDue()), []);
  const hintId = useId();
  const touring = useTour((s) => s.active);
  const endHint = useCallback(() => {
    langHintDone();
    setHint(false);
  }, []);
  // "Got it": the focus, if it was there, goes back to the button (the hint goes).
  const gotIt = useCallback(() => {
    const inHint = document.activeElement?.closest(".ob-lang-hint");
    endHint();
    if (inHint) ref.current?.focus({ preventScroll: true });
  }, [endHint]);
  const show = useCallback(() => {
    // Opening the picker is what the hint asks for: it has done its work.
    endHint();
    setLoaded(true);
    setOpen(true);
  }, [endHint]);
  const close = useCallback(() => setOpen(false), []);
  // L, pressed anywhere on the page (CommandPalette.tsx).
  useEffect(() => bindLanguagePicker(show), [show]);
  const words = LANGUAGE_WORDS[lang];
  const name = t(words.name);
  const ahead = () => prefetch(loadPicker);
  // (Not over the tour, which shows the same place in its own words.)
  const hinted = hint && !touring && !open;
  return (
    <>
      <button
        ref={ref}
        type="button"
        className="ob-lang"
        data-testid="lang-button"
        data-language={lang}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t("langButton", { name })}
        aria-describedby={hinted ? hintId : undefined}
        aria-keyshortcuts="L"
        title={`${t("langPicker")} (L)`}
        onPointerEnter={ahead}
        onPointerDown={ahead}
        onFocus={ahead}
        onClick={() => (open ? close() : show())}
      >
        <LanguageMark id={lang} className="size-3.5 shrink-0" />
        <span className="ob-lang-name">{name}</span>
        <span className="ob-lang-short">{t(words.short)}</span>
        <ChevronDown className="ob-lang-caret size-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
      </button>
      {hinted ? (
        <Suspense fallback={null}>
          <LanguageHint id={hintId} onDone={gotIt} />
        </Suspense>
      ) : null}
      {loaded ? (
        <Suspense fallback={null}>
          <LanguagePicker
            open={open}
            anchor={ref}
            current={lang}
            onClose={close}
            onPick={(id) => {
              close();
              if (id !== lang) go(pageFor(id));
            }}
          />
        </Suspense>
      ) : null}
    </>
  );
}

/** The two other languages last used, one press away (hidden on a phone and on a narrow toolbar). */
function LanguageChips({ lang, go }: { lang: LanguageId; go: Go }) {
  const { t } = useI18n();
  // This device's order, read once mounted: the server's page has the registry's.
  const [recent, setRecent] = useState<LanguageId[]>([]);
  useEffect(() => setRecent(recentLanguages()), [lang]);
  const chips = chipLanguages(lang, recent);
  if (!chips.length) return null;
  return (
    <div className="ob-lang-chips">
      {chips.map((id) => {
        const ahead = () => preloadMode(pageFor(id));
        const name = t(LANGUAGE_WORDS[id].name);
        const short = t(LANGUAGE_WORDS[id].short);
        return (
          <button
            key={id}
            type="button"
            className="ob-lang-chip"
            data-testid={`lang-chip-${id}`}
            // A narrower toolbar shows the short name: the label holds both.
            aria-label={short === name ? name : `${name} (${short})`}
            title={name}
            onPointerEnter={ahead}
            onPointerDown={ahead}
            onFocus={ahead}
            onClick={() => go(pageFor(id))}
          >
            <LanguageMark id={id} className="size-3.5 shrink-0" />
            <span className="ob-lang-name">{name}</span>
            <span className="ob-lang-short">{short}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Whether an element is drawn (shell.css hides the fold on a wide toolbar), followed as the stage's width changes. */
function useDrawn(ref: RefObject<Element | null>, key: string): boolean {
  const [drawn, setDrawn] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) {
      setDrawn(false);
      return;
    }
    const check = () => setDrawn(el.getClientRects().length > 0);
    check();
    const stage = el.closest(".ob-stage");
    if (!stage || typeof ResizeObserver === "undefined") return;
    const watch = new ResizeObserver(check);
    watch.observe(stage);
    return () => watch.disconnect();
  }, [ref, key]);
  return drawn;
}

function LensTabs({ lang, lens, page, go }: { lang: LanguageId; lens: LensId; page: StudioPage; go: Go }) {
  const { t } = useI18n();
  const subs = pagesOf(lang, lens);
  const activeRef = useRef<HTMLButtonElement>(null);
  const caretRef = useRef<SVGSVGElement>(null);
  // Folded, the chosen lens's tab carries its sub-mode and opens their menu.
  const folded = useDrawn(caretRef, `${lens}:${page}`);
  const [menu, setMenu] = useState(false);
  const closeMenu = useCallback(() => setMenu(false), []);
  useEffect(() => setMenu(false), [page]);
  const foldOpen = () => Boolean(caretRef.current?.getClientRects().length);
  return (
    <>
      <div role="tablist" aria-label={t("lensesLabel")} className="ob-lenses" onKeyDown={(e) => onTablistKeyDown(e)}>
        {lensesOf(lang).map((id) => {
          const on = id === lens;
          const fold = on && subs.length > 1;
          const label = t(LENS_LABEL[id]);
          // A phone's tab shows the short name where the lens has one; the full one stays its name.
          const shortKey = LENS_SHORT[id];
          const short = shortKey ? t(shortKey) : label;
          const ahead = () => {
            if (!on) preloadMode(pageFor(lang, id));
          };
          return (
            <button
              key={id}
              ref={on ? activeRef : undefined}
              type="button"
              role="tab"
              data-testid={`lens-${id}`}
              aria-selected={on}
              tabIndex={on ? 0 : -1}
              aria-keyshortcuts={`Alt+${LENSES.indexOf(id) + 1}`}
              aria-label={fold ? t("lensFold", { lens: label, page: t(PAGE_LABEL[page]) }) : short !== label ? label : undefined}
              aria-haspopup={fold && folded ? "menu" : undefined}
              aria-expanded={fold && folded ? menu : undefined}
              className={cn("ob-lens", on && "is-on")}
              onPointerEnter={ahead}
              onPointerDown={ahead}
              onFocus={ahead}
              onClick={() => {
                if (!on) go(pageFor(lang, id));
                else if (fold && foldOpen()) setMenu((v) => !v);
              }}
              onKeyDown={(e) => {
                if (fold && e.key === "ArrowDown" && foldOpen()) {
                  e.preventDefault();
                  setMenu(true);
                }
              }}
            >
              <span className="ob-lens-word">
                {short === label ? (
                  label
                ) : (
                  <>
                    <span className="ob-lens-long">{label}</span>
                    <span className="ob-lens-short">{short}</span>
                  </>
                )}
              </span>
              {fold ? (
                <span className="ob-lens-more">
                  <span className="ob-lens-colon">{t("lensColon")}</span>
                  {t(PAGE_LABEL[page])}
                  <ChevronDown ref={caretRef} className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {subs.length > 1 ? (
        <AnchoredPopover
          open={menu}
          anchorRef={activeRef}
          onClose={closeMenu}
          role="menu"
          aria-label={t(LENS_LABEL[lens])}
          hideLabel={t("hidePanel")}
          width={220}
          testId="lens-menu"
        >
          <div className="ob-menu">
            {subs.map((id) => (
              <button
                key={id}
                type="button"
                role="menuitemradio"
                aria-checked={id === page}
                data-testid={`lens-menu-${id}`}
                data-autofocus={id === page || undefined}
                className="ob-menu-item"
                onPointerEnter={() => preloadMode(id)}
                onClick={() => {
                  closeMenu();
                  if (id !== page) go(id);
                }}
              >
                <Check className="size-4" strokeWidth={2} aria-hidden style={{ visibility: id === page ? "visible" : "hidden" }} />
                <span>{t(PAGE_LABEL[id])}</span>
              </button>
            ))}
          </div>
        </AnchoredPopover>
      ) : null}
    </>
  );
}

/** A lens's sub-modes, side by side (shell.css folds them into the lens's tab when the toolbar is narrow). */
function SubModes({ lens, pages, page, go }: { lens: LensId; pages: readonly StudioPage[]; page: StudioPage; go: Go }) {
  const { t } = useI18n();
  const index = Math.max(0, pages.indexOf(page));
  return (
    <div
      className="ob-submodes"
      role="tablist"
      aria-label={t(LENS_LABEL[lens])}
      data-testid="submode-switch"
      onKeyDown={(e) => onTablistKeyDown(e)}
      style={{ ["--ob-i" as string]: String(index), ["--ob-n" as string]: String(pages.length) }}
    >
      <span className="ob-submodes-ind" aria-hidden />
      {pages.map((id) => {
        const on = id === page;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            data-page={id}
            data-testid={`studio-page-${id}`}
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            onPointerEnter={() => preloadMode(id)}
            onPointerDown={() => preloadMode(id)}
            onFocus={() => preloadMode(id)}
            onClick={() => {
              if (!on) go(id);
            }}
            className={cn("ob-submode", on && "is-on")}
          >
            <span className="ob-submode-label">{t(PAGE_LABEL[id])}</span>
          </button>
        );
      })}
    </div>
  );
}
