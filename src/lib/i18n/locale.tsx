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
import { translate, type MessageKey } from "./messages";

export type Locale = "en" | "fr";

const STORAGE_KEY = "ulune.locale";

export const LOCALE_BOOT = `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}");if(t==="en"||t==="fr")document.documentElement.lang=t}catch(e){}})();`;

function detectLocale(): Locale {
  if (typeof window === "undefined") return "en";
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "fr") return saved;
  } catch {
    /* ignore */
  }
  const nav = (navigator.language || "en").toLowerCase();
  return nav.startsWith("fr") ? "fr" : "en";
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

export function LocaleProvider({ children }: { children: ReactNode }) {
  // The page is served in English: hydrate in English, then switch to the
  // reader's language before the first paint. (Reading it during hydration
  // made French pages mismatch the server's HTML, which React threw away and
  // rendered again from scratch.)
  const [locale, setLocaleState] = useState<Locale>("en");
  const localeRef = useRef(locale);
  localeRef.current = locale;
  const listenersRef = useRef(new Set<(next: Locale) => void>());

  useLayoutEffect(() => {
    const next = detectLocale();
    if (next !== localeRef.current) setLocaleState(next);
    document.documentElement.lang = next;
  }, []);

  const subscribeUserLocale = useCallback((fn: (next: Locale) => void) => {
    listenersRef.current.add(fn);
    return () => {
      listenersRef.current.delete(fn);
    };
  }, []);

  const setLocale = useCallback((next: Locale) => {
    if (next === localeRef.current) return;
    const apply = () => {
      flushSync(() => {
        setLocaleState(next);
      });
      document.documentElement.lang = next;
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
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
