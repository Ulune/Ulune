import { useMemo } from "react";
import type { HdNames } from "@/lib/chart/hd-focus";
import { usePack } from "@/lib/content/packs";
import type { AppLocale } from "@/lib/i18n/messages";

/** The pack's names once it has loaded (the chart draws before its text arrives). */
export function useHdNames(locale: AppLocale): HdNames | null {
  const pack = usePack("hd", locale, true);
  return useMemo(
    () => (pack ? { gate: (n: number) => pack.hdGateName(locale, n), channel: (id: string) => pack.hdChannelName(locale, id) } : null),
    [pack, locale],
  );
}

