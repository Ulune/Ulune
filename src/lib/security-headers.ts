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
 * - Permissions: no camera, microphone, location, payment or device access,
 *   which Ulune never asks for (passkeys and the clipboard keep their defaults).
 */
export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "same-origin",
  "X-Frame-Options": "DENY",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), hid=(), midi=(), display-capture=()",
};
