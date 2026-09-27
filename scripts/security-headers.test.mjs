// The security headers (src/lib/security-headers.ts) and each page's content
// security policy (src/lib/csp.ts). `npm run check:deploy` serves a build with
// them and fails on anything the policy blocks.
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { AI_ORIGINS, contentSecurityPolicy, makeNonce } from "../src/lib/csp.ts";
import { SECURITY_HEADERS } from "../src/lib/security-headers.ts";

const directives = (policy) =>
  Object.fromEntries(policy.split("; ").map((d) => [d.split(" ")[0], d.split(" ").slice(1)]));

test("a nonce is 32 hex characters, new each time", () => {
  const a = makeNonce();
  const b = makeNonce();
  assert.match(a, /^[0-9a-f]{32}$/);
  assert.notEqual(a, b);
});

test("scripts come only from Ulune or carry the page's nonce", () => {
  const d = directives(contentSecurityPolicy("abc123"));
  assert.deepEqual(d["script-src"], ["'self'", "'nonce-abc123'"]);
  assert.deepEqual(d["default-src"], ["'self'"]);
  assert.deepEqual(d["object-src"], ["'none'"]);
  assert.deepEqual(d["frame-ancestors"], ["'none'"]);
  assert.deepEqual(d["base-uri"], ["'self'"]);
  assert.deepEqual(d["form-action"], ["'self'"]);
  for (const [name, values] of Object.entries(d)) {
    assert.ok(!values.includes("'unsafe-eval'"), `${name} allows eval`);
    assert.ok(!values.includes("*"), `${name} allows anything`);
    if (name !== "style-src") assert.ok(!values.includes("'unsafe-inline'"), `${name} allows inline code`);
  }
});

test("the browser may call Ulune and the AI providers it reaches directly, only", () => {
  const d = directives(contentSecurityPolicy("n"));
  assert.deepEqual(d["connect-src"], ["'self'", ...AI_ORIGINS]);
  // src/lib/ai/chat.ts calls these, and Grok's api.x.ai from the relay only.
  const chat = readFileSync(new URL("../src/lib/ai/chat.ts", import.meta.url), "utf8");
  const call = readFileSync(new URL("../src/lib/ai/call.ts", import.meta.url), "utf8");
  const called = new Set([...chat.matchAll(/https:\/\/[a-z0-9.-]+/g)].map((m) => m[0]));
  assert.deepEqual([...called].sort(), [...AI_ORIGINS, "https://api.x.ai"].sort());
  assert.match(call, /grok: false/);
  assert.match(call, /claude: true,\s+chatgpt: true,\s+gemini: true/);
});

test("a preview deployment also allows Vercel's toolbar, production does not", () => {
  const prod = contentSecurityPolicy("n");
  const preview = contentSecurityPolicy("n", { preview: true });
  assert.ok(!prod.includes("vercel"));
  assert.match(directives(preview)["script-src"].join(" "), /https:\/\/vercel\.live/);
  assert.match(directives(preview)["connect-src"].join(" "), /wss:\/\/ws-us3\.pusher\.com/);
});

test("every answer's headers: HTTPS only, no sniffing, no framing, no device access", () => {
  const h = SECURITY_HEADERS;
  assert.match(h["Strict-Transport-Security"], /^max-age=(\d+); includeSubDomains$/);
  assert.ok(Number(/max-age=(\d+)/.exec(h["Strict-Transport-Security"])[1]) >= 31536000);
  assert.equal(h["X-Content-Type-Options"], "nosniff");
  assert.equal(h["X-Frame-Options"], "DENY");
  assert.equal(h["Referrer-Policy"], "same-origin");
  assert.equal(h["Cross-Origin-Opener-Policy"], "same-origin");
  for (const feature of ["camera", "microphone", "geolocation", "payment", "usb"]) {
    assert.match(h["Permissions-Policy"], new RegExp(`(^|, )${feature}=\\(\\)`));
  }
  // Passkeys and the clipboard keep the browser's defaults.
  assert.doesNotMatch(h["Permissions-Policy"], /publickey|clipboard/);
});

test("the build puts them first in Vercel's routes, and lets routing go on", () => {
  const vite = readFileSync(new URL("../vite.config.ts", import.meta.url), "utf8");
  assert.match(vite, /routes: \[\{ src: "\/\(\.\*\)", headers: \{ \.\.\.SECURITY_HEADERS \}, continue: true \}\]/);
  const root = readFileSync(new URL("../src/routes/__root.tsx", import.meta.url), "utf8");
  // Every inline script of the root carries the nonce.
  assert.doesNotMatch(root, /<script dangerouslySetInnerHTML/);
  assert.match(root, /"Content-Security-Policy": contentSecurityPolicy\(ssr\.nonce/);
});
