/** Pull a natal reading out of a model reply. JSON is a fallback, not required. */

function stripFences(text: string): string {
  return text
    .replace(/^\uFEFF/, "")
    .replace(/```(?:json|text|markdown)?\s*/gi, "")
    .replace(/```/g, "")
    .trim();
}

function unescapeField(value: string): string {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\")
    .trim();
}

function extractObject(text: string): string {
  const raw = stripFences(text);
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0) return raw;
  return raw.slice(start, end >= start ? end + 1 : raw.length);
}

function tidy(s: string): string {
  let out = s
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/,\s*([}\]])/g, "$1");
  out = out.replace(/}\s*{/g, "},{");
  out = out.replace(/]\s*\[/g, "],[");
  out = out.replace(/([}\]])\s*"/g, '$1,"');
  out = out.replace(/("(?:[^"\\]|\\.)*"|true|false|null|-?\d+(?:\.\d+)?)\s*\n\s*"/g, '$1,\n"');
  return out;
}

function closeOpen(s: string): string {
  let inStr = false;
  let esc = false;
  const stack: string[] = [];
  for (const ch of s) {
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') {
      inStr = true;
      continue;
    }
    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") stack.pop();
  }
  let out = s;
  if (inStr) out += '"';
  while (stack.length) out += stack.pop();
  return out;
}

function field(text: string, key: string): string {
  const re = new RegExp(`"${key}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`);
  const m = re.exec(text);
  if (m?.[1]) return unescapeField(m[1]);
  const open = new RegExp(`"${key}"\\s*:\\s*"`).exec(text);
  if (!open) return "";
  const from = open.index + open[0].length;
  let chunk = text.slice(from);
  chunk = chunk.replace(/"\s*,\s*"(?:title|body|portraitTitle|portrait|sections)".*$/s, "");
  chunk = chunk.replace(/"\s*[,}\\]].*$/s, "");
  return chunk.replace(/\\n/g, "\n").trim();
}

function salvageJson(text: string): Record<string, unknown> | null {
  const portrait = field(text, "portrait");
  const portraitTitle = field(text, "portraitTitle");
  const sections: { title: string; body: string }[] = [];
  const re =
    /\{\s*"title"\s*:\s*"((?:\\.|[^"\\])*)"\s*,\s*"body"\s*:\s*"((?:\\.|[^"\\])*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const title = unescapeField(m[1] ?? "");
    const body = unescapeField(m[2] ?? "");
    if (title && body) sections.push({ title, body });
  }
  if (!portrait && sections.length === 0) return null;
  return { portraitTitle, portrait, sections };
}

function parseJsonLoose(text: string): unknown {
  const extracted = extractObject(text);
  if (!extracted.includes("{")) return null;
  const candidates = [extracted, tidy(extracted), closeOpen(tidy(extracted))];
  for (const c of candidates) {
    try {
      return JSON.parse(c);
    } catch {
      /* try next */
    }
  }
  return salvageJson(extracted);
}

type ReadingShape = {
  portraitTitle: string;
  portrait: string;
  sections: { title: string; body: string }[];
};

function asReading(title: string, portrait: string, sections: { title: string; body: string }[]): ReadingShape | null {
  const cleanSections = sections.filter((s) => s.title && s.body);
  if (!portrait && cleanSections.length === 0) return null;
  return {
    portraitTitle: title.trim(),
    portrait: portrait.trim(),
    sections: cleanSections,
  };
}

function parseTagged(text: string): ReadingShape | null {
  const src = stripFences(text).replace(/\r/g, "");
  if (!/@@(TITLE|PORTRAIT|SECTION)@@/i.test(src)) return null;
  const title = /@@TITLE@@\s*([\s\S]*?)(?=@@|$)/i.exec(src)?.[1] ?? "";
  const portrait = /@@PORTRAIT@@\s*([\s\S]*?)(?=@@|$)/i.exec(src)?.[1] ?? "";
  const sections: { title: string; body: string }[] = [];
  const parts = src.split(/@@SECTION@@/i).slice(1);
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i] ?? "";
    const nl = part.search(/\n/);
    const heading = (nl >= 0 ? part.slice(0, nl) : part).replace(/@@END@@/gi, "").trim();
    const body = (nl >= 0 ? part.slice(nl + 1) : "")
      .replace(/@@END@@[\s\S]*$/i, "")
      .replace(/@@[A-Z]+@@[\s\S]*$/i, "")
      .trim();
    if (!heading || !body) continue;
    const complete = /[.!?…»"')\]]\s*$/.test(body) || body.length >= 80 || i < parts.length - 1;
    if (complete) sections.push({ title: heading, body });
  }
  return asReading(title, portrait, sections);
}

function parseMarkdown(text: string): ReadingShape | null {
  const src = stripFences(text).replace(/\r/g, "").trim();
  if (!/^#{1,3}\s+\S/m.test(src)) return null;
  const chunks = src.split(/\n(?=#{1,3}\s+)/);
  let title = "";
  let portrait = "";
  const sections: { title: string; body: string }[] = [];
  for (const chunk of chunks) {
    const m = /^(#{1,3})\s+(.+?)\s*\n([\s\S]*)$/.exec(chunk.trim());
    if (!m) continue;
    const depth = m[1].length;
    const heading = m[2].trim();
    const body = (m[3] ?? "").trim();
    if (depth === 1 && !title) {
      title = heading;
      portrait = body;
    } else if (body) {
      sections.push({ title: heading, body });
    }
  }
  if (!portrait && sections.length === 0) return null;
  return asReading(title, portrait, sections);
}

export function parseGrokJson(text: string): unknown {
  const tagged = parseTagged(text);
  if (tagged) return tagged;
  const md = parseMarkdown(text);
  if (md) return md;
  const json = parseJsonLoose(text);
  if (json) return json;
  throw new SyntaxError("Could not parse the model reading.");
}

export function isRawModelParseError(message: string): boolean {
  return /JSON|Unexpected token|Unexpected end|Expected ','|Expected property|position \d+|SyntaxError|Could not parse the model/i.test(
    message,
  );
}
