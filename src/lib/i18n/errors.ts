import { CATALOG } from "./catalog";
import { translate, type AppLocale, type MessageKey } from "./messages";

const CODED = /(?:^|\s)E:([a-z]+(?:\.[a-z]+)+)(?:\|(.*))?$/;

/**
 * What a failed request becomes in the page's state: a code the reader's
 * language turns into a sentence (`E:…`, with what the reader typed after a
 * `|` when the sentence quotes it). Engine and framework messages ("Internal Server Error", "Invariant
 * failed", a validator's list of issues) never reach the screen: they become
 * "offline", "took too long", "out of range" or the surface's own fallback.
 */
export function errorForState(err: unknown): string {
  const name = err instanceof Error ? err.name : "";
  const msg = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  const coded = CODED.exec(msg);
  if (coded) return `E:${coded[1]}${coded[2] !== undefined ? `|${coded[2]}` : ""}`;
  if (name === "TimeoutError" || /\btimed? ?out\b|timeout/i.test(msg)) return "E:net.timeout";
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  if (offline || /failed to fetch|networkerror|network error|load failed|fetch failed|err_internet|err_network/i.test(msg)) {
    return "E:net.offline";
  }
  if (name === "ZodError" || /^\s*\[\s*\{/.test(msg) || /invalid_type|too_big|too_small|invalid_string/.test(msg)) {
    return "E:input.range";
  }
  return "E:server.failed";
}

/**
 * A code or a reader's message, in the reader's language. An unknown code
 * becomes the surface's fallback ("Could not cast the chart."); so does
 * anything that still looks like an engine's words.
 */
export function localizeError(raw: string | null | undefined, locale: AppLocale, fallback: MessageKey = "couldNotCast"): string {
  if (!raw) return translate(locale, fallback);
  const m = CODED.exec(raw);
  if (m) {
    const key = `err_${m[1].replace(/\./g, "_")}`;
    if (key in CATALOG) return translate(locale, key as MessageKey, { raw: m[2] ?? "" });
    return translate(locale, fallback);
  }
  if (
    /swiss|ephemeris|engine|wasm|mount|initiali[sz]e|longitude|failed to fetch|network|internal server|invariant|undefined|null\b|cannot read|is not a function|unexpected|zod|^\s*\[\s*\{/i.test(
      raw,
    )
  ) {
    return translate(locale, fallback);
  }
  return raw;
}
