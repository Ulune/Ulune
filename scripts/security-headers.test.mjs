// The security headers (src/lib/security-headers.ts) and each page's content
// security policy (src/lib/csp.ts). `npm run check:deploy` serves a build with
// them and fails on anything the policy blocks.
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { AI_ORIGINS, contentSecurityPolicy, makeNonce } from "../src/lib/csp.ts";
import { ENGINE_WORKER_CSP, ENGINE_WORKER_PATH, SECURITY_HEADERS } from "../src/lib/security-headers.ts";

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

test("the browser may call Ulune only (and the AI providers it reaches directly while AI is on)", () => {
  const d = directives(contentSecurityPolicy("n"));
  const aiOn = /export const AI_ENABLED = true;/.test(readFileSync(new URL("../src/lib/features.ts", import.meta.url), "utf8"));
  assert.deepEqual(d["connect-src"], aiOn ? ["'self'", ...AI_ORIGINS] : ["'self'"]);
  // src/lib/ai/chat.ts calls these, and Grok's api.x.ai from the relay only.
  const chat = readFileSync(new URL("../src/lib/ai/chat.ts", import.meta.url), "utf8");
  // Which provider the page calls directly is kept with the providers (lib/ai/providers.ts, read by lib/ai/call.ts).
  const direct = readFileSync(new URL("../src/lib/ai/providers.ts", import.meta.url), "utf8");
  const called = new Set([...chat.matchAll(/https:\/\/[a-z0-9.-]+/g)].map((m) => m[0]));
  assert.deepEqual([...called].sort(), [...AI_ORIGINS, "https://api.x.ai"].sort());
  assert.match(direct, /grok: false/);
  assert.match(direct, /claude: true,\s+chatgpt: true,\s+gemini: true/);
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
  for (const feature of ["microphone", "geolocation", "payment", "usb"]) {
    assert.match(h["Permissions-Policy"], new RegExp(`(^|, )${feature}=\\(\\)`));
  }
  // The camera for Ulune's own pages only: scanning a device link's QR code (the synced account, feature 4).
  assert.match(h["Permissions-Policy"], /(^|, )camera=\(self\)/);
  // Passkeys and the clipboard keep the browser's defaults.
  assert.doesNotMatch(h["Permissions-Policy"], /publickey|clipboard/);
});

test("the compass's sensors stay allowed for Ulune's own pages (Feng Shui, languages plan, part 30)", () => {
  // Feng Shui's compass (src/studio/modes/hooks/useCompass.ts) listens to `deviceorientation`, which
  // Chrome sends only where the accelerometer and the gyroscope are allowed, and to
  // `deviceorientationabsolute` (Android's heading), which needs the magnetometer too. Their
  // default allowlist is the page's own origin: left out of the policy, or allowed to `self`, they
  // work on ulune.app and nowhere else; `feature=()` would silence the compass without an error.
  const policy = Object.fromEntries(
    SECURITY_HEADERS["Permissions-Policy"].split(/,\s*/).map((entry) => {
      const [feature, allow] = entry.split("=");
      return [feature.trim(), allow.replace(/^\(|\)$/g, "").split(/\s+/).filter(Boolean)];
    }),
  );
  for (const sensor of ["accelerometer", "gyroscope", "magnetometer"]) {
    const allow = policy[sensor];
    assert.ok(allow === undefined || allow.includes("self"), `${sensor}=(${allow?.join(" ")}) would block the compass`);
    assert.ok(!allow?.includes("*"), `${sensor} is open to every site`);
  }
  // The device's location stays off: the compass reads a heading, never a position.
  assert.deepEqual(policy.geolocation, []);
});

test("the build puts them first in Vercel's routes, and lets routing go on", () => {
  const vite = readFileSync(new URL("../vite.config.ts", import.meta.url), "utf8");
  assert.match(vite, /routes: \[\s*\{ src: "\/\(\.\*\)", headers: \{ \.\.\.SECURITY_HEADERS \}, continue: true \},/);
  const root = readFileSync(new URL("../src/routes/__root.tsx", import.meta.url), "utf8");
  // Every inline script of the root carries the nonce.
  assert.doesNotMatch(root, /<script dangerouslySetInnerHTML/);
  assert.match(root, /"Content-Security-Policy": contentSecurityPolicy\(ssr\.nonce/);
});

test("the calculations' worker may compile WebAssembly and reach Ulune only; the pages still may not (on-device plan, step 2)", () => {
  const d = directives(ENGINE_WORKER_CSP);
  assert.deepEqual(d["default-src"], ["'none'"]);
  assert.deepEqual(d["script-src"], ["'self'", "'wasm-unsafe-eval'"]);
  assert.deepEqual(d["connect-src"], ["'self'"]);
  for (const [name, values] of Object.entries(d)) {
    assert.ok(!values.includes("'unsafe-eval'"), `${name} allows eval`);
    assert.ok(!values.includes("'unsafe-inline'"), `${name} allows inline code`);
    assert.ok(!values.includes("*"), `${name} allows anything`);
  }
  // No page compiles WebAssembly: their policy keeps refusing it.
  assert.ok(!contentSecurityPolicy("n").includes("wasm-unsafe-eval"));
  // The route takes the worker's script as vite.config.ts names it, and none of the app's own.
  const route = new RegExp(`^${ENGINE_WORKER_PATH}$`);
  assert.ok(route.test("/assets/engine-worker-B4x_9kQz.js"));
  for (const other of ["/assets/app-B4x_9kQz.js", "/assets/engine-worker-B4x.js.map", "/engine-worker-B4x.js"]) assert.ok(!route.test(other), other);
  const vite = readFileSync(new URL("../vite.config.ts", import.meta.url), "utf8");
  assert.match(vite, /"assets\/engine-worker-\[hash\]\.js"/);
  assert.match(vite, /\{ src: ENGINE_WORKER_PATH, headers: \{ "Content-Security-Policy": ENGINE_WORKER_CSP \}, continue: true \}/);
});
