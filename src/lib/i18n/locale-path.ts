/*
 * The address's say in the interface's language, applied by LocaleProvider
 * (src/lib/i18n/locale.tsx) and by the server's <html lang>
 * (src/routes/__root.tsx). The pages that have an address in each language
 * open in their address's language when the reader has saved no choice:
 * /encyclopedie… and /calendrier in French, /encyclopedia… and /calendar in
 * English. Other addresses say nothing, and the browser's language decides.
 * A choice the reader saved always wins. Pure, so the unit tests read it as
 * it is (scripts/locale-path.test.mjs).
 */
import { CALENDAR_PATHS, ENCYCLOPEDIA_PATHS } from "@/studio/map";

type Lang = "en" | "fr";

/** An address's own language (`/encyclopedie/saturne` → "fr"), or null when it has none. */
export function localeOfPath(pathname: string): Lang | null {
  const p = pathname.toLowerCase().replace(/\/+$/, "");
  for (const lang of ["en", "fr"] as const) {
    if (p === CALENDAR_PATHS[lang]) return lang;
    if (p === ENCYCLOPEDIA_PATHS[lang] || p.startsWith(`${ENCYCLOPEDIA_PATHS[lang]}/`)) return lang;
  }
  return null;
}

/** The interface's language: the reader's saved choice, else the address's, else the browser's. */
export function pickLocale(saved: string | null | undefined, pathLocale: Lang | null, browser: string | null | undefined): Lang {
  if (saved === "en" || saved === "fr") return saved;
  if (pathLocale) return pathLocale;
  return (browser || "en").toLowerCase().startsWith("fr") ? "fr" : "en";
}
