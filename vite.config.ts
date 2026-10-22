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

/*
 * A lazy part's preload list (the files Vite fetches beside it, `__vite__mapDeps`) leaves out the files
 * its importer has already loaded: the importer's own static imports, which always run before its code
 * can ask for anything. The lists are written into the chunks that ask, the first download's among them;
 * every name left out was a preload that could never be needed (2.0 week 4 review: 0.4 KB gz of "/"). CSS
 * files are never in what Vite hands over, so a part's style sheets still come with it.
 */
let written: Record<string, { imports?: string[] }> = {};
const alreadyLoaded = new Map<string, Set<string>>();
function loadedBefore(host: string): Set<string> {
  const hit = alreadyLoaded.get(host);
  if (hit) return hit;
  const seen = new Set<string>();
  const walk = (file: string) => {
    for (const dep of written[file]?.imports ?? []) {
      if (seen.has(dep)) continue;
      seen.add(dep);
      walk(dep);
    }
  };
  walk(host);
  alreadyLoaded.set(host, seen);
  return seen;
}
const preloadLists = {
  name: "ulune:preload-lists",
  apply: "build" as const,
  generateBundle: {
    order: "pre" as const,
    handler(this: { environment?: { name: string } }, _options: unknown, bundle: Record<string, { imports?: string[] }>) {
      if (this.environment?.name !== "client") return;
      written = bundle;
      alreadyLoaded.clear();
    },
  },
};

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
        // (See preloadLists above.)
        modulePreload: {
          resolveDependencies: (_file: string, deps: string[], { hostId }: { hostId: string }) => {
            const have = loadedBefore(hostId);
            return deps.filter((dep) => !have.has(dep));
          },
        },
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
                // The calculations on the device (src/lib/engine, on-device plan, steps 2–5): the engine's
                // page side in a chunk of their own, loaded with the first calculation, never with a page.
                // A group takes along everything its modules import, so four stay out of it: the
                // "calculate" door (door.ts, whose dynamic imports would bring Vite's preload helper, which
                // every page imports, and the first load with it), the setting's few lines (choice.ts, read
                // by Settings, which needs none of the engine) and the server calls (zone-lookup.ts and
                // server-calls.ts, whose client is TanStack Start's own). The door gets a chunk of its own.
                { name: "engine-client", test: /[\\/]src[\\/]lib[\\/]engine[\\/](?!choice\.ts|zone-lookup\.ts|server-calls\.ts|door\.ts)/, priority: 5 },
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
    preloadLists,
    // (The calculations' worker, the engine and the ephemeris files are built into /assets/ because
    // the "calculate" door's engine side, src/lib/engine/client.ts, names the worker: on-device
    // plan, step 4. Week 1's "ulune:engine" plugin, which shipped them before any page did, is gone.)
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
