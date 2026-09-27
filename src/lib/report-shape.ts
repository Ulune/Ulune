/**
 * An error report: what the page sends when it breaks (lib/error-report.ts)
 * and what the server accepts (routes/api/report.ts). It says what failed
 * and where in Ulune's code, never who or what for: every digit of the
 * message is masked (so no date, time, coordinate or number survives), links
 * and email addresses are cut, the page is its path alone, the browser only
 * its engine. The server cleans a report again before its one log line.
 */

export const REPORT_KINDS = ["error", "rejection", "render", "slot", "chunk"] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];

export const ENGINES = ["blink", "webkit", "gecko", "other"] as const;
export type Engine = (typeof ENGINES)[number];

export type ErrorReport = {
  /** The app's version. */
  v: string;
  kind: ReportKind;
  /** "Name: message", masked, at most 300 characters. */
  message: string;
  /** Up to 6 frames in Ulune's own files: "app-3f2a.js:1:2345". */
  where: string[];
  /** The page's path, nothing after it. */
  path: string;
  engine: Engine;
};

export const REPORT_LIMITS = { bytes: 2048, message: 300, frames: 6, path: 100 } as const;

/** Every digit masked, links and email addresses cut, spaces folded, cut short. */
export function maskMessage(text: string): string {
  return text
    .replace(/[a-z][a-z0-9+.-]*:\/\/[^\s)'"<>]+/gi, "<link>")
    .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, "<email>")
    .replace(/\d/g, "#")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, REPORT_LIMITS.message);
}

const FRAME = /^[\w.-]{1,80}\.js:\d{1,7}:\d{1,7}$/;

/** Where in Ulune's own code (its /assets/ files): "file.js:line:column", the first 6. */
export function codeFrames(stack: string | undefined | null): string[] {
  if (!stack) return [];
  const out: string[] = [];
  for (const m of stack.matchAll(/\/assets\/([\w.-]+\.js):(\d+):(\d+)/g)) {
    const frame = `${m[1]}:${m[2]}:${m[3]}`;
    if (FRAME.test(frame)) out.push(frame);
    if (out.length >= REPORT_LIMITS.frames) break;
  }
  return out;
}

/** The browser's engine, nothing finer. */
export function engineOf(userAgent: string): Engine {
  if (/Firefox\//.test(userAgent)) return "gecko";
  if (/Chrome\/|Chromium\/|Edg\//.test(userAgent)) return "blink";
  if (/AppleWebKit\//.test(userAgent)) return "webkit";
  return "other";
}

/** A page's path, without query or fragment, digits masked. */
export function maskPath(path: string): string {
  const bare = path.split(/[?#]/)[0] || "/";
  const clean = /^\/[\w/.-]*$/.test(bare) ? bare : "/";
  return clean.replace(/\d/g, "#").slice(0, REPORT_LIMITS.path);
}

export function buildReport(
  kind: ReportKind,
  error: unknown,
  context: { version: string; path: string; userAgent: string },
): ErrorReport {
  const err = error instanceof Error ? error : null;
  const text = err ? `${err.name}: ${err.message}` : typeof error === "string" ? error : "Unknown error";
  return {
    v: context.version,
    kind,
    message: maskMessage(text),
    where: codeFrames(err?.stack),
    path: maskPath(context.path),
    engine: engineOf(context.userAgent),
  };
}

/** A report as the server keeps it: exactly these fields, cleaned again; null if it isn't one. */
export function cleanReport(body: string): ErrorReport | null {
  let raw: unknown;
  try {
    raw = JSON.parse(body);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.v !== "string" || !/^[\w.-]{1,16}$/.test(r.v)) return null;
  if (typeof r.kind !== "string" || !(REPORT_KINDS as readonly string[]).includes(r.kind)) return null;
  if (typeof r.message !== "string" || r.message.length > REPORT_LIMITS.message * 2) return null;
  if (!Array.isArray(r.where) || r.where.length > REPORT_LIMITS.frames) return null;
  if (!r.where.every((f) => typeof f === "string" && FRAME.test(f))) return null;
  if (typeof r.path !== "string" || r.path.length > REPORT_LIMITS.path * 2) return null;
  if (typeof r.engine !== "string" || !(ENGINES as readonly string[]).includes(r.engine)) return null;
  return {
    v: r.v,
    kind: r.kind as ReportKind,
    message: maskMessage(r.message),
    where: r.where as string[],
    path: maskPath(r.path),
    engine: r.engine as Engine,
  };
}
