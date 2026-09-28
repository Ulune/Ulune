import type { AppLocale } from "./messages";
import source from "./hd-hello.json" with { type: "json" };

export const HD_HELLO = source;

export type HdHelloId = "type" | "strategy" | "authority" | "profile" | "definition";

export type HdHelloCell = {
  id: HdHelloId;
  label: string;
  sentence: string;
};

const HELLO_IDS: readonly string[] = ["type", "strategy", "authority", "profile", "definition"];

function isHelloId(id: string): id is HdHelloId {
  return HELLO_IDS.includes(id);
}

export function hdHelloCells(locale: AppLocale): HdHelloCell[] {
  return HD_HELLO.cells.flatMap((cell) => {
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
