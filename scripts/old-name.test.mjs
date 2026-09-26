import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

/*
 * Ulune was built under the working name Orbis. The old name may stay only in
 * the archive (docs/archive/) and where the code reads what the prototype
 * wrote in visitors' browsers: src/lib/space/legacy.ts, the storage names
 * listed there, and lines marked "legacy names" (on the line or the one
 * before). Anything else fails here.
 */

const ROOT = new URL("..", import.meta.url).pathname;
const OLD = ["or", "bis"].join("");
const BINARY = /\.(png|jpe?g|webp|gif|ico|woff2?|ttf|otf|se1|pdf|zip|gz|bin|wasm)$/i;
const LEGACY_FILE = "src/lib/space/legacy.ts";
const SELF = "scripts/old-name.test.mjs";

function legacyNames() {
  const text = readFileSync(join(ROOT, LEGACY_FILE), "utf8");
  return [...text.matchAll(/"([a-z]+\.[a-z.]+[a-z0-9.]*)"/g)].map((m) => m[1]).filter((n) => n.toLowerCase().startsWith(OLD));
}

test("the old name is left only in the archive and the legacy reads", () => {
  const names = legacyNames();
  assert.ok(names.length >= 6, "the legacy storage names are listed in legacy.ts");
  const files = execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" }).split("\n").filter(Boolean);
  const found = [];
  for (const rel of files) {
    if (rel.startsWith("docs/archive/") || rel === LEGACY_FILE || rel === SELF || BINARY.test(rel)) continue;
    let text;
    try {
      text = readFileSync(join(ROOT, rel), "utf8");
    } catch {
      continue;
    }
    if (!text.toLowerCase().includes(OLD)) continue;
    const lines = text.split("\n");
    lines.forEach((line, i) => {
      const low = line.toLowerCase();
      if (!low.includes(OLD) || !low.replace(/vorbis/g, "").includes(OLD)) return;
      if (names.some((n) => line.includes(n))) return;
      const marked = /legacy name/i.test(line) || /legacy name/i.test(lines[i - 1] ?? "");
      if (marked) return;
      found.push(`${rel}:${i + 1}: ${line.trim().slice(0, 120)}`);
    });
  }
  assert.deepEqual(found, [], `the old name is still here:\n${found.join("\n")}`);
});
