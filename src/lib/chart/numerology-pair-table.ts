/**
 * Numerology's Relationship as a table (share and compare plan, feature 5c):
 * the six numbers side by side with their gaps, the ten pairs, the
 * relationship number and the shared digits, and the two of you this year.
 * As text for Copy (each pair with how the two tend to work together, when
 * the texts are here) and as CSV with ids, the same in every language. The
 * numerology table's former "Compare" (two people side by side) is this.
 */
import { npWord } from "@/lib/i18n/catalog/numerology-pair-words";
import type { AppLocale } from "@/lib/i18n/messages";
import { numerologyCoreLabel } from "@/lib/i18n/numerology-ui";
import { digitLine, pairLabel, yearLine, type PairContext } from "./interpret-numerology-pair";
import type { PairRow } from "./numerology-pair";
import { stepsText, wholeText, type NumerologyValue } from "./numerology-reduce";

const whole = (v: NumerologyValue) => (v.number == null ? "—" : wholeText(v));
const gapText = (r: Pick<PairRow, "gap" | "same">, locale: AppLocale) => (r.gap ? (r.same ? npWord(locale, "npSame") : npWord(locale, "npGap", { n: r.gap.number ?? 0 })) : "—");

/** The table as text, part by part (Copy); `dynamic` gives a pair's first line once the texts are here. */
export function numerologyPairTextParts(ctx: PairContext, locale: AppLocale, dynamic?: (r: PairRow) => string | null): { id: string; lines: string[] }[] {
  const colon = locale === "fr" ? "\u202f: " : ": ";
  const { pair, names } = ctx;
  return [
    {
      id: "side",
      lines: [
        npWord(locale, "npPartSide"),
        `${names.a} · ${names.b}`,
        ...pair.cores.map((c) => `${numerologyCoreLabel(locale, c.id)}${colon}${whole(c.a)} · ${whole(c.b)} · ${gapText({ gap: c.gap, same: c.a.number != null && c.a.number === c.b.number }, locale)}`),
      ],
    },
    {
      id: "pairs",
      lines: [
        npWord(locale, "npPartPairs"),
        ...pair.rows.map((r) => {
          const line = dynamic?.(r) ?? null;
          return `${pairLabel(r, names, locale)}${colon}${whole(r.a.value)} · ${whole(r.b.value)}${line ? ` — ${line}` : ""}`;
        }),
      ],
    },
    {
      id: "shared",
      lines: [
        npWord(locale, "npPartShared"),
        `${npWord(locale, "npRelHead")}${colon}${whole(pair.relationship)} (${stepsText(pair.relationship)})`,
        ...(pair.shared.length ? pair.shared.map((s) => digitLine(s, names, locale)) : [npWord(locale, "npSharedNone")]),
      ],
    },
    {
      id: "now",
      lines: [npWord(locale, "npPartNow"), yearLine(ctx, locale), `${npWord(locale, "npYearTogether")}${colon}${stepsText(pair.year.together)}`],
    },
  ];
}

const cell = (v: string) => (/[",\n\r;]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);
const num = (v: NumerologyValue) => (v.number == null ? "" : String(v.number));

/** The whole as CSV: plain ids and numbers. */
export function numerologyPairCsv(ctx: PairContext): string {
  const { pair, names } = ctx;
  const rows: string[][] = [["pair", "field", "value"]];
  rows.push(["pair", "a", names.a]);
  rows.push(["pair", "b", names.b]);
  rows.push(["pair", "relationship", num(pair.relationship)]);
  rows.push(["pair", "relationshipSteps", stepsText(pair.relationship)]);
  rows.push(["pair", "method", "pythagorean-decoz"]);
  rows.push([]);
  rows.push(["core", "id", "a", "b", "gap"]);
  for (const c of pair.cores) rows.push(["core", c.id, num(c.a), num(c.b), c.gap ? num(c.gap) : ""]);
  rows.push([]);
  rows.push(["dyn", "id", "aCore", "a", "bCore", "b", "key", "text", "gap"]);
  for (const r of pair.rows) rows.push(["dyn", r.id, r.a.core, num(r.a.value), r.b.core, num(r.b.value), r.key ?? "", r.text ?? "", r.gap ? num(r.gap) : ""]);
  rows.push([]);
  rows.push(["digit", "digit", "a", "b"]);
  for (const s of pair.shared) rows.push(["digit", String(s.digit), s.a.join("|"), s.b.join("|")]);
  rows.push([]);
  rows.push(["year", "year", "a", "b", "together"]);
  rows.push(["year", String(pair.year.year), num(pair.year.a), num(pair.year.b), num(pair.year.together)]);
  return rows.map((r) => r.map(cell).join(",")).join("\n");
}
