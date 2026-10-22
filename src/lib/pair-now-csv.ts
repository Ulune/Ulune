/**
 * "You two, now" in the Relationship pages' tables (share and compare plan,
 * feature 5e): its rows as CSV text, the tables' way (commas, RFC 4180
 * quoting), which Export rewrites for the reader's spreadsheet (lib/csv.ts).
 * A file of its own so that every page's table can use it without the
 * astrology words that come with the astrology part.
 */

const cell = (v: string) => (/[",\n\r;]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);

/** Rows as CSV text. */
export function rowsCsv(rows: readonly (readonly string[])[]): string {
  return rows.map((r) => r.map(cell).join(",")).join("\n");
}
