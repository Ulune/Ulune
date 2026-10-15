/*
 * One encyclopedia entry file, read: its front matter (a small subset of
 * YAML) and its body (a small subset of Markdown). No library: the format is
 * deliberately narrow, and every mistake is reported with its line so a
 * writer can find it at once.
 *
 * Front matter, between two `---` lines:
 *   key: value                 a plain value, or one in double quotes
 *   key: [a, b, "c, d"]        an inline list
 *   key:                       a block list, one `  - item` per line
 *     - item                   (an item may be quoted too: "Author: Title, 1981")
 *   # a comment, or a value followed by ` # a comment`
 * Quotes are taken off ("1" is the glyph 1); inside them \" \\ and \uXXXX are
 * read. Sources are free text, shown as written ("Claude Ptolémée,
 * Tétrabible, vers 150", "IIe siècle av. J.-C.", no author at all).
 *
 * A tradition's home text (`_home.<lang>.md`, part 23: parseHome) has the
 * keys tradition, lang and revised, and optionally its sources (a list, as an
 * entry's), and a body of paragraphs and lists with no heading.
 *
 * Body: `## ` headings (the fixed list in registry.mjs), paragraphs (lines
 * joined until a blank line), `- ` and `1. ` lists (an indented line goes on
 * with the item above), pipe tables, **bold**, *italic*, and links to other
 * entries written [[id]] (the entry’s title, in small letters inside a sentence for a common noun: build.mjs) or [[id|the words shown]], also
 * inside bold or italic and in table cells. Any other character is text as it
 * is (’ ′ ½ ~ # macrons and tones, U+202F); \* \[ \| and the like write the
 * sign itself. Nothing else: no raw HTML, no images, no other links, no code,
 * no quotes, no nested lists.
 */
import { HOME_KEYS, LIST_KEYS, OPTIONAL_KEYS, REQUIRED_KEYS, SECTIONS } from "./registry.mjs";

const KNOWN_KEYS = new Set([...REQUIRED_KEYS, ...OPTIONAL_KEYS]);
const KNOWN_HOME_KEYS = new Set(HOME_KEYS);

/**
 * Read a file's text. Returns `{ meta, metaLines, bodyStart, sections }`;
 * mistakes go to `errors` as `{ file, line, message }`.
 */
export function parseEntry(text, file, errors) {
  const report = (line, message) => errors.push({ file, line, message });
  const lines = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").split("\n");
  if (lines[0]?.trim() !== "---") {
    report(1, "the file must start with a `---` line, then the front matter");
    return { meta: {}, metaLines: {}, bodyStart: 1, sections: [] };
  }
  const end = lines.findIndex((l, i) => i > 0 && l.trim() === "---");
  if (end < 0) {
    report(1, "the front matter has no closing `---` line");
    return { meta: {}, metaLines: {}, bodyStart: 1, sections: [] };
  }
  const { meta, metaLines } = parseFrontMatter(lines.slice(1, end), 2, report);
  const sections = parseBody(lines.slice(end + 1), end + 2, meta.lang, report);
  return { meta, metaLines, bodyStart: end + 2, sections };
}

/**
 * A tradition's home text (part 23): `{ meta, metaLines, bodyStart, blocks }`,
 * its body read as one section of paragraphs and lists, with no heading.
 */
export function parseHome(text, file, errors) {
  const report = (line, message) => errors.push({ file, line, message });
  const lines = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").split("\n");
  const end = lines[0]?.trim() === "---" ? lines.findIndex((l, i) => i > 0 && l.trim() === "---") : -1;
  if (end < 0) {
    report(1, "the file must start with its front matter between two `---` lines (tradition, lang, revised, and sources if any)");
    return { meta: {}, metaLines: {}, bodyStart: 1, blocks: [] };
  }
  const { meta, metaLines } = parseFrontMatter(lines.slice(1, end), 2, report, KNOWN_HOME_KEYS);
  const [about] = parseBody(lines.slice(end + 1), end + 2, meta.lang, report, true);
  return { meta, metaLines, bodyStart: end + 2, blocks: about?.blocks ?? [] };
}

/* ------------------------------------------------------------------ front matter */

function parseFrontMatter(lines, first, report, known = KNOWN_KEYS) {
  const meta = {};
  const metaLines = {};
  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    const ln = first + i;
    i += 1;
    if (!raw.trim() || /^\s*#/.test(raw)) continue;
    if (/^\s*-/.test(raw)) {
      report(ln, "a list item with no `key:` line above it");
      continue;
    }
    const m = /^([A-Za-z][\w-]*)\s*:(.*)$/.exec(raw);
    if (!m) {
      report(ln, "not a `key: value` line");
      continue;
    }
    const key = m[1];
    if (/^\s/.test(raw)) report(ln, `\`${key}\` is indented: keys start at the beginning of the line`);
    if (!known.has(key)) report(ln, `unknown key \`${key}\` (known: ${[...known].join(", ")})`);
    if (key in meta) report(ln, `\`${key}\` is given twice`);
    const rest = m[2];
    if (rest && !/^\s/.test(rest)) report(ln, `\`${key}:\` must be followed by a space`);
    const valueText = rest.trim();
    let value;
    if (valueText === "" || valueText.startsWith("#")) {
      // A block list may follow: `  - item` lines (blank lines and comments between them are skipped).
      const items = [];
      while (i < lines.length) {
        const next = lines[i];
        if (!next.trim() || /^\s*#/.test(next)) {
          i += 1;
          continue;
        }
        const item = /^\s*-(\s+(.*))?$/.exec(next);
        if (!item) break;
        const itemLn = first + i;
        i += 1;
        const itemText = (item[2] ?? "").trim();
        if (!itemText) {
          report(itemLn, `an empty item in \`${key}\``);
          continue;
        }
        const scalar = parseScalar(itemText, itemLn, report);
        if (scalar != null) items.push(scalar);
      }
      value = items.length ? items : "";
      if (items.length && !LIST_KEYS.includes(key)) report(ln, `\`${key}\` takes one value, not a list`);
    } else if (valueText.startsWith("[")) {
      value = parseInlineList(valueText, ln, report);
      if (value && !LIST_KEYS.includes(key)) report(ln, `\`${key}\` takes one value, not a list`);
    } else {
      value = parseScalar(valueText, ln, report);
      if (value != null && LIST_KEYS.includes(key) && value !== "") {
        report(ln, `\`${key}\` is a list: write [a, b] or one \`  - item\` per line`);
      }
    }
    if (value == null) continue;
    meta[key] = value;
    metaLines[key] = ln;
  }
  return { meta, metaLines };
}

/** A plain or double-quoted value, with an optional ` # comment` after it. */
function parseScalar(text, ln, report) {
  if (text.startsWith('"')) {
    const q = readQuoted(text, 0, ln, report);
    if (!q) return null;
    const after = text.slice(q.end).trim();
    if (after && !after.startsWith("#")) report(ln, `text after the closing quote: "${after}"`);
    return q.value;
  }
  if (text.startsWith("'")) {
    report(ln, "values are quoted with double quotes (\"…\"), not single ones");
    return null;
  }
  if (/^[|>{&!%@`*]/.test(text)) {
    report(ln, `a value may not start with "${text[0]}" (multi-line values and other YAML forms are not part of the format)`);
    return null;
  }
  const hash = text.search(/\s#/);
  return (hash >= 0 ? text.slice(0, hash) : text).trim();
}

/** A double-quoted string from `start`; `\"`, `\\` and `\uXXXX` are read. */
function readQuoted(text, start, ln, report) {
  let value = "";
  for (let i = start + 1; i < text.length; i += 1) {
    const c = text[i];
    if (c === "\\") {
      const n = text[i + 1];
      if (n === '"' || n === "\\") {
        value += n;
        i += 1;
      } else if (n === "u" && /^[0-9a-fA-F]{4}$/.test(text.slice(i + 2, i + 6))) {
        value += String.fromCharCode(parseInt(text.slice(i + 2, i + 6), 16));
        i += 5;
      } else {
        report(ln, `an unknown escape "\\${n ?? ""}" in a quoted value`);
        return null;
      }
    } else if (c === '"') {
      return { value, end: i + 1 };
    } else value += c;
  }
  report(ln, "a quoted value is not closed");
  return null;
}

/** `[a, "b, c", d]`: commas inside quotes stay. */
function parseInlineList(text, ln, report) {
  const items = [];
  let i = 1;
  let current = "";
  let quoted = null;
  const push = () => {
    const t = current.trim();
    if (quoted != null) {
      if (t) report(ln, `text next to a quoted item: "${t}"`);
      items.push(quoted);
    } else if (t) items.push(t);
    else if (items.length || text.slice(1).trim() !== "]") report(ln, "an empty item in a list");
    current = "";
    quoted = null;
  };
  for (; i < text.length; i += 1) {
    const c = text[i];
    if (c === '"' && !current.trim() && quoted == null) {
      const q = readQuoted(text, i, ln, report);
      if (!q) return null;
      quoted = q.value;
      i = q.end - 1;
    } else if (c === ",") push();
    else if (c === "]") {
      if (current.trim() || quoted != null || items.length) push();
      const after = text.slice(i + 1).trim();
      if (after && !after.startsWith("#")) report(ln, `text after the list's closing bracket: "${after}"`);
      return items;
    } else if (c === "[") {
      report(ln, "a list inside a list is not part of the format");
      return null;
    } else current += c;
  }
  report(ln, "a list is not closed with `]`");
  return null;
}

/* ------------------------------------------------------------------ body */

const LIST_ITEM = /^(-|\d+\.)\s+(.*)$/;

/**
 * The body as sections of blocks. Each section: `{ key, heading, line,
 * blocks }`; each block keeps its first line, each inline link its own line.
 * A home's body (`home`) is one section, "about", with no heading.
 */
function parseBody(lines, first, lang, report, home = false) {
  const headings = SECTIONS.map((s) => (lang === "fr" ? s.fr : s.en));
  const sections = [];
  let section = home ? { key: "about", heading: "", line: first, blocks: [] } : null;
  if (section) sections.push(section);
  let lastIndex = -1;
  /** The block being read: a paragraph's lines, a list's items, a table's rows. */
  let open = null;

  const close = () => {
    if (!open) return;
    const block = finishBlock(open, report);
    if (block && section) section.blocks.push(block);
    open = null;
  };

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    const ln = first + i;
    const text = raw.trimEnd();
    if (!text.trim()) {
      // A blank line ends a paragraph or a table; a list goes on if its next item follows.
      if (open?.kind === "list") {
        let j = i + 1;
        while (j < lines.length && !lines[j].trim()) j += 1;
        const next = LIST_ITEM.exec(lines[j] ?? "");
        if (next && listType(next[1]) === open.type) continue;
      }
      close();
      continue;
    }
    const heading = /^(#{1,6})(\s+(.*))?$/.exec(text);
    if (heading) {
      close();
      const words = (heading[3] ?? "").trim();
      if (home) {
        report(ln, "a tradition's home text has no heading: its paragraphs follow the introduction");
        continue;
      }
      if (heading[1] !== "##") {
        report(ln, `only \`## \` headings are part of the format (found "${heading[1]}")`);
        continue;
      }
      if (words.includes("[[")) report(ln, "no link in a heading");
      const index = headings.indexOf(words);
      if (index < 0) {
        report(ln, `"${words}" is not one of the headings: ${headings.map((h) => `## ${h}`).join(" · ")}`);
        continue;
      }
      if (sections.some((s) => s.key === SECTIONS[index].key)) {
        report(ln, `"## ${words}" is used twice`);
        continue;
      }
      if (index < lastIndex) report(ln, `"## ${words}" is out of order: the sections go ${headings.join(" · ")}`);
      lastIndex = Math.max(lastIndex, index);
      section = { key: SECTIONS[index].key, heading: words, line: ln, blocks: [] };
      sections.push(section);
      continue;
    }
    if (!section) {
      report(ln, "text before the first section heading (the summary and the rest come from the front matter)");
      continue;
    }
    const stripped = text.trimStart();
    const indented = stripped.length !== text.length;
    const refused = /^>/.test(stripped)
      ? "quotes (`>`) are not part of the format"
      : /^(```|~~~)/.test(stripped)
        ? "code blocks are not part of the format"
        : /^([-*_])(\s*\1){2,}$/.test(stripped)
          ? "horizontal rules are not part of the format"
          : /^[*+]\s/.test(stripped)
            ? "list items start with `- ` (or `1. ` when numbered)"
            : null;
    if (refused) {
      report(ln, refused);
      close();
      continue;
    }

    const item = LIST_ITEM.exec(stripped);
    if (item) {
      if (indented) {
        report(ln, "nested lists are not part of the format");
        continue;
      }
      const type = listType(item[1]);
      if (open?.kind !== "list" || open.type !== type) {
        close();
        open = { kind: "list", type, start: type === "ol" ? Number(item[1].slice(0, -1)) : 1, line: ln, items: [] };
      }
      open.items.push([{ text: item[2], line: ln }]);
      continue;
    }
    if (indented && open?.kind === "list") {
      // An indented line goes on with the item above.
      open.items[open.items.length - 1].push({ text: stripped, line: ln });
      continue;
    }
    if (stripped.startsWith("|")) {
      if (open?.kind !== "table") {
        close();
        open = { kind: "table", line: ln, rows: [] };
      }
      open.rows.push({ text: stripped, line: ln });
      continue;
    }
    if (open?.kind !== "paragraph") {
      close();
      open = { kind: "paragraph", line: ln, parts: [] };
    }
    open.parts.push({ text: stripped, line: ln });
  }
  close();
  for (const s of sections) if (!s.blocks.length) report(s.line, home ? "the home text is empty" : `"## ${s.heading}" has nothing under it`);
  return sections;
}

const listType = (marker) => (marker === "-" ? "ul" : "ol");

function finishBlock(open, report) {
  if (open.kind === "paragraph") return { t: "p", line: open.line, c: parseInline(open.parts, report) };
  if (open.kind === "list") {
    const items = open.items.map((parts) => ({ line: parts[0].line, c: parseInline(parts, report) }));
    return open.type === "ul" ? { t: "ul", line: open.line, items } : { t: "ol", line: open.line, start: open.start, items };
  }
  return parseTable(open, report);
}

/** A row's cells: split on `|`, except inside [[id|words]] and after a backslash. */
function splitRow(text) {
  let s = text.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|") && !s.endsWith("\\|")) s = s.slice(0, -1);
  const cells = [];
  let current = "";
  let depth = 0;
  for (let i = 0; i < s.length; i += 1) {
    if (s[i] === "\\" && i + 1 < s.length) {
      current += s[i] + s[i + 1];
      i += 1;
    } else if (s.startsWith("[[", i)) {
      depth += 1;
      current += "[[";
      i += 1;
    } else if (s.startsWith("]]", i) && depth > 0) {
      depth -= 1;
      current += "]]";
      i += 1;
    } else if (s[i] === "|" && depth === 0) {
      cells.push(current);
      current = "";
    } else current += s[i];
  }
  cells.push(current);
  return cells.map((c) => c.trim());
}

function parseTable(open, report) {
  const [head, sep, ...rows] = open.rows;
  if (!sep) {
    report(open.line, "a table needs a header row and a separator row (| --- | --- |)");
    return null;
  }
  const headCells = splitRow(head.text);
  const sepCells = splitRow(sep.text);
  if (!sepCells.every((c) => /^:?-+:?$/.test(c))) {
    report(sep.line, "the table's second row must be its separator (| --- | --- |)");
    return null;
  }
  if (sepCells.length !== headCells.length) report(sep.line, `the separator has ${sepCells.length} cells, the header ${headCells.length}`);
  const align = sepCells.map((c) => (c.startsWith(":") && c.endsWith(":") ? "c" : c.endsWith(":") ? "r" : c.startsWith(":") ? "l" : ""));
  const cellsOf = (row) => {
    const cells = splitRow(row.text);
    if (cells.length !== headCells.length) report(row.line, `this row has ${cells.length} cells, the header ${headCells.length}`);
    return cells.map((cell) => parseInline([{ text: cell, line: row.line }], report));
  };
  if (!rows.length) report(open.line, "a table with no row under its header");
  return {
    t: "table",
    line: open.line,
    align,
    head: headCells.map((cell) => parseInline([{ text: cell, line: head.line }], report)),
    rows: rows.map((row) => ({ line: row.line, cells: cellsOf(row) })),
  };
}

/**
 * Inline text from its lines (joined with a space): plain text, **bold**,
 * *italic*, [[id]] and [[id|words]]. Links carry the line they are on.
 */
function parseInline(parts, report) {
  let s = "";
  const starts = [];
  for (const p of parts) {
    if (s) s += " ";
    starts.push([s.length, p.line]);
    s += p.text;
  }
  const lineAt = (pos) => {
    let line = parts[0].line;
    for (const [at, l] of starts) if (at <= pos) line = l;
    return line;
  };
  const root = { kind: "root", children: [] };
  const stack = [root];
  let buf = "";
  const top = () => stack[stack.length - 1];
  const flush = () => {
    if (buf) top().children.push(buf);
    buf = "";
  };
  for (let i = 0; i < s.length; ) {
    const c = s[i];
    if (c === "\\" && i + 1 < s.length && /[\\*[\]|_`#<>!]/.test(s[i + 1])) {
      buf += s[i + 1];
      i += 2;
      continue;
    }
    if (s.startsWith("[[", i)) {
      const end = s.indexOf("]]", i + 2);
      if (end < 0) {
        report(lineAt(i), "a [[link]] is not closed with ]]");
        buf += s.slice(i);
        break;
      }
      const inner = s.slice(i + 2, end);
      const bar = inner.indexOf("|");
      const id = (bar < 0 ? inner : inner.slice(0, bar)).trim();
      const words = bar < 0 ? null : inner.slice(bar + 1).trim();
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) report(lineAt(i), `"[[${inner}]]": "${id}" is not an entry id (lowercase words joined by hyphens)`);
      else if (words === "") report(lineAt(i), `"[[${inner}]]": no words after the |`);
      else if (words && /[*[\]]/.test(words)) report(lineAt(i), `"[[${inner}]]": a link's words are plain text`);
      else {
        flush();
        top().children.push({ l: id, w: words, line: lineAt(i) });
      }
      i = end + 2;
      continue;
    }
    if (s.startsWith("**", i)) {
      flush();
      if (top().kind === "strong") {
        const node = stack.pop();
        if (node.children.length) top().children.push({ b: node.children });
      } else stack.push({ kind: "strong", children: [], pos: i });
      i += 2;
      continue;
    }
    if (c === "*") {
      flush();
      if (top().kind === "em") {
        const node = stack.pop();
        if (node.children.length) top().children.push({ i: node.children });
      } else stack.push({ kind: "em", children: [], pos: i });
      i += 1;
      continue;
    }
    if (c === "`") report(lineAt(i), "code (`) is not part of the format");
    else if (c === "<" && /[A-Za-z/!?]/.test(s[i + 1] ?? "")) report(lineAt(i), "raw HTML is not part of the format");
    else if (c === "!" && s[i + 1] === "[") report(lineAt(i), "images are not part of the format");
    else if (c === "[") {
      const close = s.indexOf("]", i + 1);
      if (close > 0 && s[close + 1] === "(") report(lineAt(i), "links to other pages are written [[id]] or [[id|words]]");
    }
    buf += c;
    i += 1;
  }
  flush();
  while (stack.length > 1) {
    const node = stack.pop();
    report(lineAt(node.pos), `"${node.kind === "strong" ? "**" : "*"}" is not closed (write \\* for a plain asterisk)`);
    top().children.push(...node.children);
  }
  return root.children;
}
