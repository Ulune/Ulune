import { useEffect, useState } from "react";
import { CHINESE_PREFS_EVENT, CHINESE_PREFS_KEY, DEFAULT_CHINESE_PREFS, readChinesePrefs, type ChinesePrefs } from "./prefs";

/**
 * The reader's Chinese settings (prefs.ts), followed live: a change in
 * Settings, or in another tab, redraws the views that say Chinese terms. The
 * server's page and the first frame show the defaults.
 */
export function useChinesePrefs(): ChinesePrefs {
  const [prefs, setPrefs] = useState<ChinesePrefs>(DEFAULT_CHINESE_PREFS);
  useEffect(() => {
    setPrefs(readChinesePrefs());
    const again = () => setPrefs(readChinesePrefs());
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === CHINESE_PREFS_KEY) again();
    };
    window.addEventListener(CHINESE_PREFS_EVENT, again);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CHINESE_PREFS_EVENT, again);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return prefs;
}
