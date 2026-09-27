/**
 * The content security policy of every page the server renders, in
 * production: scripts only from Ulune itself or carrying this page's nonce,
 * connections only to Ulune and to the AI providers a reader's own key talks
 * to from the browser (src/lib/ai/call.ts), no plugins,
 * no framing, forms and <base> kept to Ulune.
 *
 * The nonce is made per page on the server (router.tsx) and reaches every
 * inline script: TanStack's own (<Scripts />, <HeadContent />, ScriptOnce)
 * and the boot scripts in __root.tsx. Styles stay 'unsafe-inline': React
 * writes style attributes into the server's HTML. The home page is kept at
 * the edge for an hour, its header with it, so page and header always share
 * one nonce; nothing on that page comes from a visitor.
 *
 * The other security headers (HSTS, nosniff, framing, referrer, permissions)
 * are the same for every answer, static files included, so the Vercel
 * routes set them (vite.config.ts, SECURITY_HEADERS).
 */

/**
 * Origins the browser calls with a reader's own AI key (lib/ai/call.ts,
 * DIRECT). Grok goes through Ulune's relay, so api.x.ai is not among them.
 */
export const AI_ORIGINS = [
  "https://api.anthropic.com",
  "https://api.openai.com",
  "https://generativelanguage.googleapis.com",
] as const;

/**
 * On a preview deployment Vercel adds its toolbar (vercel.live) for the team;
 * Vercel's own list of what it needs (docs: "Managing the toolbar").
 */
const PREVIEW_TOOLBAR = {
  script: ["https://vercel.live"],
  connect: ["https://vercel.live", "wss://ws-us3.pusher.com"],
  img: ["https://vercel.live", "https://vercel.com"],
  frame: ["https://vercel.live"],
  style: ["https://vercel.live"],
  font: ["https://vercel.live", "https://assets.vercel.com"],
};

export function contentSecurityPolicy(nonce: string, options: { preview?: boolean } = {}): string {
  const extra = (kind: keyof typeof PREVIEW_TOOLBAR) => (options.preview ? PREVIEW_TOOLBAR[kind] : []);
  const directives: [string, ...string[]][] = [
    ["default-src", "'self'"],
    ["script-src", "'self'", `'nonce-${nonce}'`, ...extra("script")],
    ["style-src", "'self'", "'unsafe-inline'", ...extra("style")],
    ["img-src", "'self'", "data:", "blob:", ...extra("img")],
    ["font-src", "'self'", "data:", ...extra("font")],
    ["connect-src", "'self'", ...AI_ORIGINS, ...extra("connect")],
    ["frame-src", "'self'", ...extra("frame")],
    ["worker-src", "'self'"],
    ["manifest-src", "'self'"],
    ["media-src", "'self'"],
    ["object-src", "'none'"],
    ["base-uri", "'self'"],
    ["form-action", "'self'"],
    ["frame-ancestors", "'none'"],
  ];
  return directives.map((d) => d.join(" ")).join("; ");
}

/** A fresh nonce: 16 random bytes, hex (safe in any attribute quoting). */
export function makeNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let hex = "";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return hex;
}

/** True on a Vercel preview deployment (the server's environment). */
export function isVercelPreview(): boolean {
  return typeof process !== "undefined" && process.env?.VERCEL_ENV === "preview";
}
