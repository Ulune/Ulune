/**
 * "You two, now" on astrology's Relationship pages (share and compare plan,
 * feature 5e): a contact said in one line, "Saturn square the relationship’s
 * Sun" (« Saturne en carré au Soleil de la relation »), its orb, motion and
 * exact date, and the part as the table's text and CSV. The readings
 * themselves come with the pair-now reading pack (interpret-pair-now.ts).
 */
import type { NowContact } from "@/lib/chart/pair-now";
import type { AspectId } from "@/lib/chart/types";
import { pnWord } from "@/lib/i18n/catalog/pair-now-words";
import { pnwWord } from "@/lib/i18n/catalog/pair-now-west-words";
import { rowsCsv } from "@/lib/pair-now-csv";
import { bodyLabel, bodyPrep, bodyBare } from "@/lib/i18n/astro";
import { dateFormat } from "@/lib/intl-cache";
import { formatArc } from "@/lib/utils";

const EN_WORD: Record<string, string> = { conjunction: "conjunct", opposition: "opposite", square: "square", trine: "trine", sextile: "sextile" };
const FR_WORD: Record<string, string> = { conjunction: "en conjonction", opposition: "en opposition", square: "en carré", trine: "en trigone", sextile: "en sextile" };

/** "Saturn square the relationship’s Sun", « Saturne en carré au Soleil de la relation ». */
export function nowPhrase(link: { a: string; type: AspectId; b: string }, locale: string): string {
  if (locale === "fr") {
    const to = bodyPrep(link.b, link.type === "conjunction" ? "avec" : "à");
    return `${bodyBare(link.a, "fr")} ${FR_WORD[link.type] ?? link.type} ${to} de la relation`;
  }
  return `${bodyLabel(link.a, "en")} ${EN_WORD[link.type] ?? link.type} ${pnwWord("en", "ptnPoint", { point: bodyLabel(link.b, "en") })}`;
}

/** "3 Nov" (with the year when it is not this one), in the reader's clock. */
export function nowDay(ms: number, locale: string, tz?: string, now = Date.now()): string {
  const loc = locale === "fr" ? "fr-FR" : "en-GB";
  const year = new Date(ms).getUTCFullYear() !== new Date(now).getUTCFullYear();
  return dateFormat(loc, { timeZone: tz, day: "numeric", month: "short", ...(year ? { year: "numeric" } : {}) }).format(new Date(ms));
}

/** "Today, 18 October 2026", in the reader's clock. */
export function nowToday(ms: number, locale: string, tz?: string): string {
  const loc = locale === "fr" ? "fr-FR" : "en-GB";
  return pnwWord(locale, "ptnToday", { date: dateFormat(loc, { timeZone: tz, day: "numeric", month: "long", year: "numeric" }).format(new Date(ms)) });
}

/** Applying or separating, in words ("" when the engine does not say). */
export function nowMotion(applying: boolean | null | undefined, locale: string): string {
  return applying === true ? pnwWord(locale, "ptnApplying") : applying === false ? pnwWord(locale, "ptnSeparating") : "";
}

/** A contact's second line: "0°42' · applying · exact 3 Nov". */
export function nowDetail(c: NowContact, locale: string, tz?: string): string {
  const exact = c.link.exactUtc ? Date.parse(c.link.exactUtc) : Number.NaN;
  return [formatArc(c.link.orb), nowMotion(c.link.applying, locale), Number.isFinite(exact) ? pnwWord(locale, "ptnExactOn", { date: nowDay(exact, locale, tz) }) : ""].filter(Boolean).join(" · ");
}

/** The part as text, for Copy: its heading, its day, a line per contact (or why there is none). */
export function nowTextLines(contacts: readonly NowContact[], at: number, locale: string, tz?: string): string[] {
  const colon = locale === "fr" ? "\u202f: " : ": ";
  return [
    `${pnWord(locale, "ptnHead")}${colon}${nowToday(at, locale, tz)}`,
    ...(contacts.length ? contacts.map((c) => `${nowPhrase(c.link, locale)} · ${nowDetail(c, locale, tz)}`) : [pnwWord(locale, "ptnAstroQuiet")]),
  ];
}


/** The part as rows for the table's CSV: plain ids and numbers, the same in every language. */
export function nowRows(contacts: readonly NowContact[], at: number): string[][] {
  return [
    ["now", "at", "moving", "type", "point", "orb", "applying", "exactUtc"],
    ...contacts.map((c) => ["now", new Date(at).toISOString(), c.link.a, c.link.type, c.link.b, c.link.orb.toFixed(4), c.link.applying == null ? "" : String(c.link.applying), c.link.exactUtc ?? ""]),
  ];
}

/** The same rows as CSV text. */
export function nowCsv(contacts: readonly NowContact[], at: number): string {
  return rowsCsv(nowRows(contacts, at));
}
