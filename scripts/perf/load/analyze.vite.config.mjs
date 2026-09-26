// The app's own Vite config plus one plugin that writes, for the client build,
// every chunk with the modules inside it (rendered bytes, before minifying).
// npx vite build --config scripts/perf/load/analyze.vite.config.mjs
// → scripts/perf/.out/load/client-chunks.json; then node scripts/perf/load/chunk-report.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import base from "../../../vite.config.ts";
import { OUT, ROOT } from "../paths.mjs";

function chunkMap() {
  return {
    name: "ulune:chunk-map",
    apply: "build",
    generateBundle(_options, bundle) {
      const env = this.environment?.name ?? "client";
      if (env !== "client") return;
      const chunks = [];
      for (const out of Object.values(bundle)) {
        if (out.type !== "chunk") continue;
        const modules = Object.entries(out.modules)
          .map(([id, m]) => ({ id: id.startsWith(ROOT) ? relative(ROOT, id) : id, bytes: m.renderedLength }))
          .filter((m) => m.bytes > 0)
          .sort((a, b) => b.bytes - a.bytes);
        chunks.push({
          file: out.fileName,
          name: out.name,
          isEntry: out.isEntry,
          isDynamicEntry: out.isDynamicEntry,
          facade: out.facadeModuleId ? relative(ROOT, out.facadeModuleId) : null,
          imports: out.imports,
          dynamicImports: out.dynamicImports,
          code: out.code.length,
          modules,
        });
      }
      mkdirSync(join(OUT, "load"), { recursive: true });
      writeFileSync(join(OUT, "load/client-chunks.json"), JSON.stringify(chunks, null, 1));
    },
  };
}

export default async (env) => {
  const cfg = typeof base === "function" ? await base(env) : base;
  return { ...cfg, plugins: [...cfg.plugins, chunkMap()] };
};
