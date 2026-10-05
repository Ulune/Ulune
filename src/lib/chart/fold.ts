/** Case, accents and outer spaces taken off: how two spellings of a name are compared. */
export function foldPlaceQuery(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

/**
 * A name as people write it, for comparing: no accents or case, hyphens,
 * apostrophes, dots and other signs read as spaces, and "St" / "Ste" as
 * Saint / Sainte ("St-Étienne", "Saint Etienne" and "saint-étienne" agree).
 */
export function placeKey(value: string): string {
  return foldPlaceQuery(value)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((word) => (word === "st" ? "saint" : word === "ste" ? "sainte" : word))
    .join(" ");
}
