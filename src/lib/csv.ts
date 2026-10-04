/**
 * CSV for spreadsheets (review 3 Oct, B2, B3). The tables build their CSV
 * with commas and decimal points; here it is read back into rows, cut into
 * its sections (each one table with its own header, one blank line between
 * them), and written for the reader's spreadsheet: a byte-order mark so
 * Excel reads the degree signs and accents, and in French ";" between cells
 * and a decimal comma, as French Excel expects. The same rows become an HTML
 * table for the clipboard, which pastes as a table in Sheets, Excel and Docs.
 */

export type CsvLocale = "en" | "fr";

/** RFC 4180 rows from CSV text (quoted cells may hold commas, quotes and line breaks). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  let i = 0;
  const src = text.replace(/^\uFEFF/, "");
  while (i < src.length) {
    const ch = src[i]!;
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i += 1;
        continue;
      }
      cell += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      quoted = true;
      i += 1;
      continue;
    }
    if (ch === ",") {
      row.push(cell);
      cell = "";
      i += 1;
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      row.push(cell);
      rows.push(row.length === 1 && row[0] === "" ? [] : row);
      row = [];
      cell = "";
      i += ch === "\r" && src[i + 1] === "\n" ? 2 : 1;
      continue;
    }
    cell += ch;
    i += 1;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row.length === 1 && row[0] === "" ? [] : row);
  }
  return rows;
}

/** One table of a CSV: its kind (the first cell of its header) and its rows, header first. */
export type CsvSection = { kind: string; rows: string[][] };

/** The CSV's tables, cut at its blank lines. */
export function csvSections(rows: readonly string[][]): CsvSection[] {
  const out: CsvSection[] = [];
  let cur: string[][] = [];
  const flush = () => {
    if (cur.length) out.push({ kind: cur[0]![0] ?? "", rows: cur });
    cur = [];
  };
  for (const r of rows) {
    if (!r.length) flush();
    else cur.push(r);
  }
  flush();
  return out;
}

/** A plain decimal number, as the tables write them ("12.5000", "-0.25"). */
const DECIMAL = /^-?\d+\.\d+$/;

/** CSV text for the reader's spreadsheet: BOM, and ";" with decimal commas in French. */
export function encodeCsv(rows: readonly string[][], locale: CsvLocale): string {
  const sep = locale === "fr" ? ";" : ",";
  const needsQuote = new RegExp(`["\\n\\r${sep}]`);
  const cell = (v: string) => {
    const x = locale === "fr" && DECIMAL.test(v) ? v.replace(".", ",") : v;
    return needsQuote.test(x) ? `"${x.replaceAll('"', '""')}"` : x;
  };
  return `\uFEFF${rows.map((r) => r.map(cell).join(sep)).join("\r\n")}\r\n`;
}

/**
 * One part's table: the sections of the given kinds, without the column that
 * names the section (one table, one header). `keep` narrows the rows to those
 * on screen, read by their header's names.
 */
export function partRows(text: string, kinds: readonly string[], keep?: (row: Record<string, string>) => boolean): string[][] {
  const out: string[][] = [];
  for (const sec of csvSections(parseCsv(text))) {
    if (!kinds.includes(sec.kind)) continue;
    const [head, ...body] = sec.rows;
    if (!head) continue;
    if (out.length) out.push([]);
    out.push(head.slice(1));
    for (const r of body) {
      if (keep) {
        const rec: Record<string, string> = {};
        head.forEach((k, i) => (rec[k] = r[i] ?? ""));
        if (!keep(rec)) continue;
      }
      out.push(r.slice(1));
    }
  }
  return out;
}

const esc = (v: string) => v.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

/** The rows as an HTML table (its first row the header), for the clipboard. */
export function htmlTable(rows: readonly string[][], caption?: string): string {
  const tables: string[][][] = [[]];
  for (const r of rows) {
    if (!r.length) tables.push([]);
    else tables[tables.length - 1]!.push(r);
  }
  const one = (t: string[][], i: number) => {
    if (!t.length) return "";
    const [head, ...body] = t;
    const cap = caption && i === 0 ? `<caption>${esc(caption)}</caption>` : "";
    const th = `<tr>${head!.map((c) => `<th>${esc(c)}</th>`).join("")}</tr>`;
    const tds = body.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("");
    return `<table>${cap}<thead>${th}</thead><tbody>${tds}</tbody></table>`;
  };
  return tables.map(one).filter(Boolean).join("<br>");
}

/**
 * Text and a table on the clipboard together: a spreadsheet or a document
 * takes the table, a message takes the text. Text alone where the browser
 * cannot hold both.
 */
export async function copyTextAndTable(text: string, html: string | null): Promise<void> {
  const Item = typeof window !== "undefined" ? (window as Window & { ClipboardItem?: typeof ClipboardItem }).ClipboardItem : undefined;
  if (html && Item && navigator.clipboard?.write) {
    try {
      await navigator.clipboard.write([
        new Item({
          "text/plain": new Blob([text], { type: "text/plain" }),
          "text/html": new Blob([`<meta charset="utf-8">${html}`], { type: "text/html" }),
        }),
      ]);
      return;
    } catch {
      /* text alone below */
    }
  }
  await navigator.clipboard.writeText(text);
}
