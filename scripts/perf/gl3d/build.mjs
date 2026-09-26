// Transpile the 3D view's modules to plain ESM (into scripts/perf/.out/gl3d)
// for the counting harness: node scripts/perf/gl3d/build.mjs, then harness.mjs.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { ROOT, SRC, OUT } from "../paths.mjs";
const require = createRequire(path.join(ROOT, "package.json"));
const ts = require("typescript");
const R = SRC;
const DEST = path.join(OUT, "gl3d/src");
fs.mkdirSync(DEST, { recursive: true });
const files = {
  "wheel-view3d.js": "components/depth/wheel-view3d.ts",
  "gl-core.js": "components/depth/gl/gl-core.ts",
  "gl-instanced.js": "components/depth/gl/gl-instanced.ts",
  "raster.js": "components/depth/raster.ts",
  "gl-math.js": "lib/depth/gl-math.ts",
  "gl-meshes.js": "lib/depth/gl-meshes.ts",
  "math.js": "lib/depth/math.ts",
  "spring.js": "lib/depth/spring.ts",
  "camera.js": "components/depth/camera.ts",
  "support.js": "components/depth/gl/support.ts",
};
const rewrite = (s) =>
  s.replace(/from "@\/lib\/depth\/([\w-]+)"/g, 'from "./$1.js"')
   .replace(/from "\.\/gl\/gl-core"/g, 'from "./gl-core.js"')
   .replace(/from "\.\/gl\/gl-instanced"/g, 'from "./gl-instanced.js"')
   .replace(/from "\.\/gl-core"/g, 'from "./gl-core.js"')
   .replace(/from "\.\/raster"/g, 'from "./raster.js"')
   .replace(/from "\.\/math"/g, 'from "./math.js"')
   .replace(/from "\.\/camera"/g, 'from "./camera.js"')
   .replace(/from "\.\/support"/g, 'from "./support.js"')
   // The atlas's aspect marks come from the focus painter, which needs a real DOM: not drawn here.
   .replace(/from "@\/lib\/chart\/wheel-focus"/g, 'from "./wheel-focus-stub.js"');
for (const [out, src] of Object.entries(files)) {
  const code = fs.readFileSync(path.join(R, src), "utf8");
  const js = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, isolatedModules: true, verbatimModuleSyntax: false } }).outputText;
  fs.writeFileSync(path.join(DEST, out), rewrite(js));
}
fs.writeFileSync(
  path.join(DEST, "wheel-focus-stub.js"),
  "export function tempAspectMark() { return null; }\nexport function tempAspectMarks() { return new Map(); }\nexport function focusKeyOf() { return { hl: null }; }\nexport function inWheelFocus() { return false; }\n",
);
console.log("3D harness modules:", fs.readdirSync(DEST).join(", "));
