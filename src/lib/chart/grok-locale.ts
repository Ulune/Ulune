import type { GrokReading } from "./types";
import type { AppLocale } from "@/lib/i18n/messages";

export function inferGrokLocale(reading: GrokReading): AppLocale | null {
  if (reading.locale === "en" || reading.locale === "fr") return reading.locale;
  const sample = `${reading.portraitTitle ?? ""} ${reading.portrait ?? ""} ${reading.sections?.[0]?.body ?? ""}`;
  const fr = (sample.match(/\b(vous|votre|vos|thème|maison|lune|soleil|maître)\b/gi) ?? []).length;
  const en = (sample.match(/\b(you|your|chart|house|moon|sun|rising)\b/gi) ?? []).length;
  if (fr >= 2 && fr > en) return "fr";
  if (en >= 2 && en > fr) return "en";
  return null;
}
