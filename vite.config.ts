import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
// @ts-expect-error JS plugin alongside the TS vite config
import { contentPacksPlugin } from "./scripts/content-packs-plugin.mjs";
// @ts-expect-error JS plugin alongside the TS vite config
import { qaSelftestPlugin } from "./scripts/qa-selftest/plugin.mjs";
import { SECURITY_HEADERS } from "./src/lib/security-headers";

// The development server answers this machine only (127.0.0.1), on the
// launcher's port; `vite preview` serves the built output on 8081.
export default defineConfig(({ command, isPreview }) => ({
  server: {
    host: "127.0.0.1",
    port: 8097,
    strictPort: true,
    // The measurement harnesses write their builds here: not the app's files
    // (a rebuilt harness page used to reload every open tab).
    watch: { ignored: ["**/scripts/perf/.out/**", "**/.qa-selftest/**"] },
  },
  preview: {
    host: "127.0.0.1",
    port: 8081,
    strictPort: true,
  },
  ssr: {
    external: [
      "moment",
      "moment-timezone",
      "tz-lookup",
      "geo-tz",
      "geo-tz/all",
      "sweph-wasm",
      "sweph-wasm/wasm/swisseph",
      "date-fns-tz",
    ],
  },
  optimizeDeps: {
    exclude: [
      "moment",
      "moment-timezone",
      "tz-lookup",
      "geo-tz",
      "geo-tz/all",
      "sweph-wasm",
      "sweph-wasm/wasm/swisseph",
    ],
  },
  resolve: { tsconfigPaths: true },
  environments: {
    client: {
      build: {
        rollupOptions: {
          output: {
            // React and the router in chunks of their own: an app deploy
            // leaves their files (and the browser's cached copies) unchanged.
            // Then the app in files the page names up front: the server lists
            // a page's chunks and their direct imports only (TanStack Start's
            // manifest), and Rolldown does not hoist deeper ones, so a chunk
            // two imports down was fetched only once its parent ran — the UI
            // text, and most of the natal wheel, a round trip late.
            codeSplitting: {
              groups: [
                { name: "vendor-react", test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 4 },
                {
                  name: "vendor-router",
                  test: /node_modules[\\/]@tanstack[\\/](router-core|react-router|history|store|react-store)[\\/]/,
                  priority: 3,
                },
                // Everything the entry itself needs (root, providers, UI text).
                { name: "app", tags: ["$initial"], test: /[\\/]src[\\/]/, priority: 2 },
                // The natal wheel and all it imports (the studio's first figure),
                // with the studio's URL state.
                {
                  name: "wheel",
                  test: /[\\/]src[\\/](components[\\/]chart-wheel\.tsx|studio[\\/]modes[\\/]natal\.tsx|studio[\\/]use-studio-url\.ts)/,
                  priority: 1,
                },
              ],
            },
          },
        },
      },
    },
  },
  plugins: [
    // Reading text in one language per download (src/lib/content/packs.ts).
    contentPacksPlugin(),
    // Development only: where `?qa=<suite>` runs send their reports.
    qaSelftestPlugin(),
    tailwindcss(),
    tanstackStart(),
    ...(command === "build" || isPreview
      ? [
          nitro({
            preset: "vercel",
            vercel: {
              // The security headers on every answer, static files included
              // (lib/security-headers.ts); `continue` lets routing go on.
              config: {
                routes: [{ src: "/(.*)", headers: { ...SECURITY_HEADERS }, continue: true }],
              },
              functions: {
                // A stuck call is cut after 90 s (the AI relay waits up to 85 s;
                // a cast takes well under one). Vercel's default is 300 s.
                maxDuration: 90,
                // Paris: the calculations and the relay run in the EU.
                regions: ["cdg1"],
              },
            },
          }),
        ]
      : []),
    viteReact(),
  ],
}));
