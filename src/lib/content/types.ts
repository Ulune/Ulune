/** One text in English and French. */
export type Bi = { en: string; fr: string };

export function pickBi(b: Bi | undefined, locale: "en" | "fr"): string {
  if (!b) return "";
  return (locale === "fr" ? b.fr : b.en) || b.en;
}
