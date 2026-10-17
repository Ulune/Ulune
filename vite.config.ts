import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
// @ts-expect-error JS plugin alongside the TS vite config
import { contentPacksPlugin } from "./scripts/content-packs-plugin.mjs";
// @ts-expect-error JS plugin alongside the TS vite config
import { qaSelftestPlugin } from "./scripts/qa-selftest/plugin.mjs";
// @ts-expect-error JS plugin alongside the TS vite config
import { encyclopediaPlugin } from "./scripts/encyclopedia/vite-plugin.mjs";
import { ENGINE_WORKER_CSP, ENGINE_WORKER_PATH, SECURITY_HEADERS } from "./src/lib/security-headers";

/** The build's chunk that names the calculations' worker (the "ulune:engine" plugin below). */
const ENGINE_SHIP = "\0ulune-engine-ship";

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
  // The calculations' worker (src/lib/engine/worker.ts, on-device plan, step 2) is an ES module:
  // the engine's WebAssembly glue reads import.meta.url. Its script is named engine-worker-<hash>.js,
  // which the routes below give a policy of its own; its files (the engine, the ephemeris) are
  // /assets/ files named by their content, kept a year like the rest (Nitro's /assets route).
  worker: {
    format: "es",
    rolldownOptions: {
      output: {
        entryFileNames: (chunk) =>
          /[\\/]lib[\\/]engine[\\/]worker\.ts$/.test(chunk.facadeModuleId ?? "") ? "assets/engine-worker-[hash].js" : "assets/[name]-[hash].js",
      },
    },
  },
  environments: {
    client: {
      build: {
        // ULUNE_MAPS=1 npm run build: with source maps, to see what each chunk holds (the first-load trim, 13 Oct 2026).
        sourcemap: process.env.ULUNE_MAPS === "1",
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
                // The calculations on the device (src/lib/engine, on-device plan, step 2): a chunk of
                // their own, loaded only when a chart is calculated on the device, never with a page.
                { name: "engine-client", test: /[\\/]src[\\/]lib[\\/]engine[\\/]/, priority: 5 },
                { name: "vendor-react", test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 4 },
                {
                  name: "vendor-router",
                  test: /node_modules[\\/]@tanstack[\\/](router-core|react-router|history|store|react-store)[\\/]/,
                  priority: 3,
                },
                // Everything the entry itself needs (root, providers, UI text).
                { name: "app", tags: ["$initial"], test: /[\\/]src[\\/]/, priority: 2 },
                // TanStack Start's client side (its server-function calls), after the
                // app's own: the entry needs it, and left to the wheel's group it made
                // every page, the encyclopedia's too, download the wheel (R6, 7 Oct 2026).
                { name: "vendor-start", test: /node_modules[\\/]@tanstack[\\/]start-client-core[\\/]/, priority: 1.8 },
                // Small helpers the pages outside the studio share with the wheel (the
                // top bar's class names, the private-space button's motion check and
                // tour, the footer's loading lines): a chunk of their own, so the
                // encyclopedia's, the guide's and the settings' pages leave the wheel alone.
                // The AI keys' store too: the private space's runtime holds them, and
                // in the wheel's group it made a reader with a space download the
                // wheel on every page (encyclopedia plan, part 22, 8 Oct 2026).
                {
                  name: "shared",
                  test: /[\\/]src[\\/](lib[\\/](utils|depth[\\/]env|tour[\\/](state|keys)|ai[\\/]use-ai-account)\.ts|components[\\/]loading-lines\.tsx)|node_modules[\\/]clsx[\\/]/,
                  priority: 1.5,
                },
                // The natal wheel and all it imports (the studio's first figure),
                // with the studio's URL state. Also the share sheet's state, which the
                // studio shares with a share link's arrival on /s (share plan, feature 1,
                // which imports the studio's store): left out, it became a chunk of its
                // own in "/"'s first download (first-load review, 17 Oct 2026).
                {
                  name: "wheel",
                  test: /[\\/]src[\\/](components[\\/]chart-wheel\.tsx|studio[\\/]modes[\\/]natal\.tsx|studio[\\/]use-studio-url\.ts|components[\\/]share[\\/]share-state\.ts)/,
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
    // The calculations on the device ship with every build (on-device plan, step 2), before any
    // page uses them: a chunk of the client's build names the engine's worker (Vite's ?worker&url),
    // so the worker, the engine and the ephemeris files are built into /assets/ under names that
    // change with their content. No page loads that chunk: it is emitted here and marked a chunk to
    // be imported later rather than an entry (TanStack Start's manifest takes the app's one entry).
    // The "calculate" door (step 4) will import the engine's page side (src/lib/engine/client.ts),
    // which names the same worker; this plugin can go then.
    {
      name: "ulune:engine",
      apply: "build",
      applyToEnvironment: (environment) => environment.name === "client",
      buildStart() {
        this.emitFile({ type: "chunk", id: ENGINE_SHIP, name: "engine-ship", preserveSignature: "strict" });
      },
      resolveId: (id) => (id === ENGINE_SHIP ? id : null),
      load(id) {
        if (id !== ENGINE_SHIP) return null;
        const worker = fileURLToPath(new URL("./src/lib/engine/worker.ts", import.meta.url));
        return `export { default as engineWorker } from ${JSON.stringify(`${worker}?worker&url`)};`;
      },
      generateBundle(_options, bundle) {
        for (const chunk of Object.values(bundle)) {
          if (chunk.type === "chunk" && chunk.name === "engine-ship" && chunk.isEntry) {
            chunk.isEntry = false;
            chunk.isDynamicEntry = true;
          }
        }
      },
    },
    // Reading text in one language per download (src/lib/content/packs.ts).
    contentPacksPlugin(),
    // Development only: where `?qa=<suite>` runs send their reports.
    qaSelftestPlugin(),
    // The encyclopedia's entries, checked and cut into the pieces the site loads one at a time.
    encyclopediaPlugin(),
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
                routes: [
                  { src: "/(.*)", headers: { ...SECURITY_HEADERS }, continue: true },
                  // The calculations' worker: WebAssembly and Ulune's own address only.
                  { src: ENGINE_WORKER_PATH, headers: { "Content-Security-Policy": ENGINE_WORKER_CSP }, continue: true },
                ],
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
