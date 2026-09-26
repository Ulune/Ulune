// Build the wheel harness into scripts/perf/.out/wheel: chart fixtures (QA
// chart A, Paris 15 Jun 1990 12:00, and its transits on 24 Sep and 24 Oct 2026), the
// app's CSS compiled by Tailwind, and the page bundled with rolldown.
// node --experimental-strip-types --import ./scripts/register-ts.mjs scripts/perf/wheel/build.mjs
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { PERF, ROOT, SRC, OUT } from "../paths.mjs";

const HERE = join(PERF, "wheel");
const DIST = join(OUT, "wheel");
mkdirSync(DIST, { recursive: true });
const require = createRequire(join(ROOT, "package.json"));

// 1. Fixtures (once). sky2: the same transits a month on (a time jump, glide.mjs).
if (!existsSync(join(DIST, "sky2.json")) || process.argv.includes("--fixtures")) {
  const { calculateNatal, calculateTransits } = await import("../../../src/lib/chart/calculate.server.ts");
  const natal = await calculateNatal({
    name: "TraceQA", date: "1990-06-15", time: "12:00",
    latitude: 48.8566, longitude: 2.3522, placeLabel: "Paris, France", houseSystem: "placidus",
  });
  const bodies = [...natal.planets, ...Object.values(natal.angles)].map((p) => ({ id: p.id, name: p.name, ecliptic: p.ecliptic }));
  const sky = await calculateTransits({
    utc: new Date("2026-09-24T12:00:00Z"), latitude: 48.8566, longitude: 2.3522,
    natalCusps: natal.houses.map((x) => x.ecliptic), natalBodies: bodies, houseSystem: "placidus",
  });
  const sky2 = await calculateTransits({
    utc: new Date("2026-10-24T12:00:00Z"), latitude: 48.8566, longitude: 2.3522,
    natalCusps: natal.houses.map((x) => x.ecliptic), natalBodies: bodies, houseSystem: "placidus",
  });
  writeFileSync(join(DIST, "natal.json"), JSON.stringify(natal));
  writeFileSync(join(DIST, "sky.json"), JSON.stringify(sky));
  writeFileSync(join(DIST, "sky2.json"), JSON.stringify(sky2));
}

// 2. CSS: the app's own, through Tailwind.
const { compile } = require("@tailwindcss/node");
const { Scanner } = require("@tailwindcss/oxide");
const css = readFileSync(join(SRC, "styles.css"), "utf8");
const compiler = await compile(css, { base: SRC, onDependency() {} });
const scanner = new Scanner({ sources: [{ base: SRC, pattern: "**/*", negated: false }] });
writeFileSync(join(DIST, "styles.css"), compiler.build(scanner.scan()));
copyFileSync(join(SRC, "shell.css"), join(DIST, "shell.css"));
copyFileSync(join(HERE, "index.html"), join(DIST, "index.html"));

// 3. The page.
const { rolldown } = require("rolldown");
const STUBS = [
  [/(^|\/)look-provider(\.tsx)?$/, join(HERE, "stubs/look-provider.tsx")],
];
const bundle = await rolldown({
  input: join(HERE, "main.tsx"),
  platform: "browser",
  resolve: { alias: { "@": SRC } },
  tsconfig: false,
  plugins: [
    {
      name: "stubs",
      resolveId(source, importer) {
        if (importer && importer.includes("/stubs/")) return null;
        for (const [re, to] of STUBS) if (re.test(source)) return to;
        return null;
      },
    },
  ],
  transform: {
    jsx: { runtime: "automatic" },
    define: {
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV_BUILD ?? "production"),
      "import.meta.env.DEV": "false",
      "import.meta.env.PROD": "true",
      "import.meta.env.SSR": "false",
    },
  },
  logLevel: "warn",
});
// One file: the lazy parts (the 3D view) are inlined, as the harness serves one script.
await bundle.write({ file: join(DIST, "app.js"), format: "esm", sourcemap: false, minify: false, codeSplitting: false });
console.log("wheel harness built:", DIST);
