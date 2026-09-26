import type { AppLocale } from "./messages";
import source from "./natal-hello.json" with { type: "json" };

export const NATAL_HELLO = source;

export type HelloCellId = "sun" | "moon" | "ascendant";

export type HelloCell = {
  id: HelloCellId;
  label: string;
  sentence: string;
};

function isHelloCellId(id: string): id is HelloCellId {
  return id === "sun" || id === "moon" || id === "ascendant";
}

export function helloCells(locale: AppLocale): HelloCell[] {
  return NATAL_HELLO.cells.flatMap((cell) => {
    if (!isHelloCellId(cell.id)) return [];
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
