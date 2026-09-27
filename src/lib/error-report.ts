/**
 * When the page breaks, a short anonymous report to Ulune's server, so what
 * breaks can be fixed (what a report holds: lib/report-shape.ts). On by
 * default, off with one switch in Settings → Your data (kept as a display
 * setting, `ulune.reports`). Production only; at most 5 a visit, each
 * failure once; nothing when the reader cancelled something or when the
 * failure is not in Ulune's code (an extension, a cross-site script).
 */
import { APP_VERSION } from "@/lib/app-identity";
import { buildReport, type ReportKind } from "@/lib/report-shape";

export const REPORTS_KEY = "ulune.reports";
const MAX_PER_VISIT = 5;

let sent = 0;
const seen = new Set<string>();
/** Turned off where storage is blocked: the choice lasts the visit. */
let optedOut = false;

export function reportsOn(): boolean {
  if (optedOut) return false;
  try {
    return window.localStorage.getItem(REPORTS_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setReportsOn(on: boolean): void {
  try {
    if (on) window.localStorage.removeItem(REPORTS_KEY);
    else window.localStorage.setItem(REPORTS_KEY, "off");
  } catch {
    optedOut = !on;
  }
}

/** Failures no one needs to hear about. */
export function ignorable(error: unknown): boolean {
  if (error == null) return true;
  const name = error instanceof Error ? error.name : "";
  const msg = error instanceof Error ? error.message : String(error);
  if (name === "AbortError" || name === "TimeoutError") return true;
  // A cross-site script's error arrives as this, with nothing to act on.
  if (/^Script error\.?$/.test(msg)) return true;
  // The browser's own noise, harmless.
  if (/ResizeObserver loop/.test(msg)) return true;
  // An extension's code, not Ulune's.
  const stack = error instanceof Error ? (error.stack ?? "") : "";
  if (/(?:chrome|moz|safari(?:-web)?)-extension:\/\//.test(stack)) return true;
  return false;
}

export function reportError(kind: ReportKind, error: unknown): void {
  if (!import.meta.env.PROD || typeof window === "undefined") return;
  if (!reportsOn() || sent >= MAX_PER_VISIT || ignorable(error)) return;
  const report = buildReport(kind, error, {
    version: APP_VERSION,
    path: window.location.pathname,
    userAgent: navigator.userAgent,
  });
  const key = `${report.kind}|${report.message}|${report.where[0] ?? ""}`;
  if (seen.has(key)) return;
  seen.add(key);
  sent += 1;
  const body = JSON.stringify(report);
  try {
    if (navigator.sendBeacon?.("/api/report", new Blob([body], { type: "application/json" }))) return;
  } catch {
    /* fall back to fetch */
  }
  void fetch("/api/report", {
    method: "POST",
    body,
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    credentials: "omit",
  }).catch(() => {});
}

let installed = false;

/** Uncaught errors and unhandled promise rejections, once per page. */
export function installErrorReports(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("error", (event) => reportError("error", event.error ?? event.message));
  window.addEventListener("unhandledrejection", (event) => reportError("rejection", event.reason));
}
