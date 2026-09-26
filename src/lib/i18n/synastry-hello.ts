import type { AppLocale } from "./messages";
import { aspectName } from "./astro";
import type { AspectId } from "@/lib/chart/types";
import source from "./synastry-hello.json" with { type: "json" };
import { pick } from "./pick";

export const SYNASTRY_HELLO = source;

export type MeetingCellId = "sun" | "moon" | "ascendant";


export function synastryHelloLine(locale: AppLocale, aspect: AspectId, orb: string): string {
  const template = source.line[locale] || source.line.en;
  return template.replaceAll("{aspect}", aspectName(aspect, locale)).replaceAll("{orb}", orb);
}

export function synastryHelloEmpty(locale: AppLocale, id: MeetingCellId): string {
  return pick(source.empty[id], locale);
}

export function synastryHelloCells(
  locale: AppLocale = "en",
): { id: MeetingCellId; label: string }[] {
  return source.cells.flatMap((cell) => {
    if (cell.id !== "sun" && cell.id !== "moon" && cell.id !== "ascendant") return [];
    const row = cell as Record<string, string | undefined>;
    return [
      {
        id: cell.id as MeetingCellId,
        label: (locale === "fr" ? row.labelFr : cell.label) || cell.label,
      },
    ];
  });
}
