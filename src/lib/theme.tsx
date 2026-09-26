import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";

export type Theme = "light" | "dark";

const STORAGE_KEY = "ulune.theme";
const LIGHT_THEME_COLOR = "#f8f3e9";
const DARK_THEME_COLOR = "#111111";

export const THEME_BOOT = `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}");if(t!=="light"&&t!=="dark")t="dark";var r=document.documentElement;r.classList.add(t);r.style.colorScheme=t}catch(e){document.documentElement.classList.add("dark")}})();`;

export function readTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* ignore */
  }
  return "dark";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme);
  root.style.colorScheme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "light" ? LIGHT_THEME_COLOR : DARK_THEME_COLOR);
}

type ThemeApi = {
  theme: Theme;
  setTheme: (next: Theme) => void;
};

/**
 * Run in the same update as a theme switch, inside its cross-fade: whatever
 * else the theme colours (the Look's day and night swatches) is repainted in
 * the new picture, not after it.
 */
const appliedListeners = new Set<(theme: Theme) => void>();

export function onThemeApplied(fn: (theme: Theme) => void): () => void {
  appliedListeners.add(fn);
  return () => {
    appliedListeners.delete(fn);
  };
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { finished: Promise<void> };
};

const ThemeContext = createContext<ThemeApi | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readTheme);

  useEffect(() => {
    const next = readTheme();
    setThemeState(next);
    applyTheme(next);
    const id = window.requestAnimationFrame(() => {
      document.documentElement.classList.add("theme-ready");
    });
    return () => window.cancelAnimationFrame(id);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    const root = document.documentElement;
    const update = () => {
      flushSync(() => setThemeState(next));
      applyTheme(next);
      for (const fn of appliedListeners) fn(next);
    };
    // One soft cross-fade of the whole page, which the compositor runs: the
    // old picture fades into the new one while nothing underneath animates.
    // (The colours of the whole document used to transition instead,
    // restyling every element on every frame for 200 ms.)
    root.classList.add("theme-switching");
    const done = () => root.classList.remove("theme-switching");
    const doc = document as ViewTransitionDocument;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (doc.startViewTransition && !reduced) {
      try {
        void doc.startViewTransition(update).finished.finally(done);
        return;
      } catch {
        /* no transition here: switch at once */
      }
    }
    update();
    window.requestAnimationFrame(() => window.requestAnimationFrame(done));
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeApi {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return { theme: "dark", setTheme: () => {} };
  }
  return ctx;
}
