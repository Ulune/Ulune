/**
 * Headers every answer carries on Vercel, static files included: vite.config.ts
 * puts them in the build's first route (.vercel/output/config.json), and
 * `npm run check:deploy` reads them back. The content security policy is
 * per page (it holds a nonce), so the server sends it (lib/csp.ts).
 *
 * - HSTS: HTTPS only, for two years, subdomains too (.app is on the browsers'
 *   HTTPS-only list already).
 * - nosniff: a file is only ever read as the type it is sent as.
 * - Referrer: other sites never learn which Ulune page a link came from.
 * - No framing (and frame-ancestors 'none' in the policy): no other site can
 *   show Ulune inside its own page.
 * - COOP: a window Ulune opens, or that opens Ulune, cannot reach into it.
 * - Permissions: no microphone, location, payment or device access, which
 *   Ulune never asks for (passkeys and the clipboard keep their defaults); the
 *   camera for Ulune's own pages only, asked for when the reader taps "Scan"
 *   to read another device's QR code (the synced account, feature 4: the
 *   browser reads the code on the device, nothing is recorded or sent).
 */
/**
 * The calculations' worker (src/lib/engine/worker.ts, on-device plan, step 2)
 * gets a policy of its own, sent with its script: it may compile
 * WebAssembly (the Swiss Ephemeris engine) and fetch from Ulune's own address,
 * nothing else, so the engine can never reach another site. A worker's
 * policy is the one its script arrives with, not the page's; the pages' own
 * (lib/csp.ts) is unchanged and still refuses WebAssembly, which no page
 * compiles. vite.config.ts names the worker's script so (ENGINE_WORKER_PATH)
 * and puts the policy in the build's routes.
 */
export const ENGINE_WORKER_CSP = "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'";
/** The worker's script in a build (Vercel's route pattern). */
export const ENGINE_WORKER_PATH = "/assets/engine-worker-(.*)\\.js";

export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "same-origin",
  "X-Frame-Options": "DENY",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Permissions-Policy":
    "camera=(self), microphone=(), geolocation=(), payment=(), usb=(), serial=(), hid=(), midi=(), display-capture=()",
};
