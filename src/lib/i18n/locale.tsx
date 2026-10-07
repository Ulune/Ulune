import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import { useRouterState } from "@tanstack/react-router";
import { localeOfPath, pickLocale } from "./locale-path";
import { translate, type MessageKey } from "./messages";

export type Locale = "en" | "fr";

const STORAGE_KEY = "ulune.locale";

export const LOCALE_BOOT = `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}");if(t==="en"||t==="fr")document.documentElement.lang=t}catch(e){}})();`;

/*
 * The interface's language (locale-path.ts holds the rule): the reader's
 * saved choice; else the address's own language (/encyclopedie… and
 * /calendrier open in French, /encyclopedia… and /calendar in English); else
 * the browser's. The server knows only the address, so it draws a page and
 * its <html lang> in the address's language, else in English; the page then
 * switches to the reader's language before its first paint.
 */

function savedLocale(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function detectLocale(pathLocale: Locale | null): Locale {
  if (typeof window === "undefined") return pathLocale ?? "en";
  return pickLocale(savedLocale(), pathLocale, navigator.language);
}

/** The language of the address on screen, or null (inside the router: the root route reads it). */
export function usePathLocale(): Locale | null {
  return useRouterState({ select: (s) => localeOfPath(s.location.pathname) });
}

/**
 * The `lang` of <html> as the server writes it: the address's language, else
 * English. It keeps its first value, so React never writes over what
 * LocaleProvider sets once the page runs.
 */
export function useDocumentLang(pathLocale: Locale | null): Locale {
  const [first] = useState<Locale>(() => pathLocale ?? "en");
  return first;
}

/** Language swaps are instant — no page-wide transition. */
function runLocaleSwap(apply: () => void) {
  apply();
}

type I18n = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  subscribeUserLocale: (fn: (locale: Locale) => void) => () => void;
};

const I18nContext = createContext<I18n | null>(null);

/**
 * `pathLocale`: the language of the address on screen (`localeOfPath`), or
 * null; the root route gives it, so the server and the page agree on it.
 */
export function LocaleProvider({ children, pathLocale = null }: { children: ReactNode; pathLocale?: Locale | null }) {
  // The page is served in the address's language, else in English: hydrate
  // in that one, then switch to the reader's language before the first paint.
  // (Reading it during hydration made French pages mismatch the server's
  // HTML, which React threw away and rendered again from scratch.)
  const [locale, setLocaleState] = useState<Locale>(() => pathLocale ?? "en");
  const localeRef = useRef(locale);
  localeRef.current = locale;
  const listenersRef = useRef(new Set<(next: Locale) => void>());
  const shown = useRef(false);

  useLayoutEffect(() => {
    // Before the first paint; then on each move to an address with a language
    // of its own (the encyclopedia's twin page, the Calendar). A move to an
    // address without one keeps the language on screen.
    if (shown.current && !pathLocale) return;
    shown.current = true;
    const next = detectLocale(pathLocale);
    if (next !== localeRef.current) setLocaleState(next);
    document.documentElement.lang = next;
  }, [pathLocale]);

  const subscribeUserLocale = useCallback((fn: (next: Locale) => void) => {
    listenersRef.current.add(fn);
    return () => {
      listenersRef.current.delete(fn);
    };
  }, []);

  const setLocale = useCallback((next: Locale) => {
    const save = () => {
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
    };
    // The language on screen may come from the address: choosing it keeps it on every page.
    if (next === localeRef.current) {
      save();
      return;
    }
    const apply = () => {
      flushSync(() => {
        setLocaleState(next);
      });
      document.documentElement.lang = next;
      save();
      listenersRef.current.forEach((fn) => fn(next));
    };
    runLocaleSwap(apply);
  }, []);

  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t, subscribeUserLocale }),
    [locale, setLocale, t, subscribeUserLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return {
      locale: "en",
      setLocale: () => {},
      t: (key, vars) => translate("en", key, vars),
      subscribeUserLocale: () => () => {},
    };
  }
  return ctx;
}
