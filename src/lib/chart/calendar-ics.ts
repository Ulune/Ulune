/**
 * A calendar file (.ics, RFC 5545) of the calendar's events, made in the
 * browser (part 57 of the launch plan): nothing is sent anywhere and there is
 * no feed to subscribe to, which would need a server that knows your chart.
 * Times are UTC; each calendar app shows them in its own time zone.
 */
export type IcsItem = {
  /** Stable across exports, so a second import updates instead of doubling. */
  uid: string;
  /** ms UTC. */
  start: number;
  /** ms UTC, for a span (a void-of-course Moon); a moment has none. */
  end?: number;
  /** A span of whole days, YYYY-MM-DD, the end excluded (a slow transit within 1°). */
  days?: { from: string; to: string };
  summary: string;
  description?: string;
};

const pad = (n: number) => String(n).padStart(2, "0");

/** 20260928T024800Z */
export function icsUtc(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

/** Text with its commas, semicolons, backslashes and line breaks escaped. */
export function icsText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** A content line folded at 75 octets (a space opens each continuation), never inside a UTF-8 character. */
export function icsFold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let chunk = "";
  let size = 0;
  let limit = 75;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    if (size + n > limit) {
      out.push(chunk);
      chunk = "";
      size = 0;
      limit = 74; // the leading space of a continuation counts
    }
    chunk += ch;
    size += n;
  }
  out.push(chunk);
  return out.join("\r\n ");
}

export function buildIcs(items: readonly IcsItem[], name: string, now = Date.now()): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ulune//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${icsText(name)}`,
  ];
  const stamp = icsUtc(now);
  for (const it of items) {
    lines.push("BEGIN:VEVENT", `UID:${icsText(it.uid)}`, `DTSTAMP:${stamp}`);
    if (it.days) {
      lines.push(`DTSTART;VALUE=DATE:${it.days.from.replace(/-/g, "")}`, `DTEND;VALUE=DATE:${it.days.to.replace(/-/g, "")}`);
    } else {
      lines.push(`DTSTART:${icsUtc(it.start)}`);
      if (it.end != null && it.end > it.start) lines.push(`DTEND:${icsUtc(it.end)}`);
    }
    lines.push(`SUMMARY:${icsText(it.summary)}`);
    if (it.description) lines.push(`DESCRIPTION:${icsText(it.description)}`);
    lines.push("TRANSP:TRANSPARENT", "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return `${lines.map(icsFold).join("\r\n")}\r\n`;
}
