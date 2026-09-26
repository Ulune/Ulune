import type { AppLocale } from "./messages";
import source from "./numerology-hello.json" with { type: "json" };

export const NUMEROLOGY_HELLO = source;

export type NumerologyHelloId = "lifepath" | "expression" | "soulurge";

export type NumerologyHelloCell = {
  id: NumerologyHelloId;
  label: string;
  sentence: string;
};

function isHelloId(id: string): id is NumerologyHelloId {
  return id === "lifepath" || id === "expression" || id === "soulurge";
}

export function numerologyHelloCells(locale: AppLocale): NumerologyHelloCell[] {
  return NUMEROLOGY_HELLO.cells.flatMap((cell) => {
    if (!isHelloId(cell.id)) return [];
    const row = cell as Record<string, string | undefined>;
    return [
      {
        id: cell.id,
        label: (locale === "fr" ? row.labelFr : cell.label) || cell.label,
        sentence: row[locale] || cell.en,
      },
    ];
  });
}
