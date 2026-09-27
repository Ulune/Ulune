// Ulune's code is public (GNU AGPL 3.0 or later, as the Swiss Ephemeris asks),
// and nothing private goes with it: one public name on every commit, no
// personal address, path or e-mail in any file. Run before every push.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const ROOT = new URL("..", import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");
const IDENTITY = "Limiel <limiel.ulune@protonmail.com>";
const tracked = () =>
  execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" }).split("\n").filter(Boolean);

test("the licence is the GNU AGPL 3.0, and the package says so", () => {
  const licence = read("LICENSE");
  // The Free Software Foundation's text, unchanged (agpl-3.0.txt, 661 lines).
  assert.equal(createHash("sha256").update(licence).digest("hex"), "8486a10c4393cee1c25392769ddd3b2d6c242d6ec7928e1414efff7dfb2f07ef");
  assert.match(licence, /^\s+GNU AFFERO GENERAL PUBLIC LICENSE\n\s+Version 3, 19 November 2007/);
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.license, "AGPL-3.0-or-later");
  assert.equal(pkg.author, IDENTITY);
  const source = /export const SOURCE_URL = "([^"]+)"/.exec(read("src/lib/app-identity.ts"))?.[1];
  assert.match(source ?? "", /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/);
  assert.equal(pkg.repository?.url, source, "package.json and the site name the same source address");
  assert.match(read("README.md"), /GNU Affero General Public License/);
});

test("no personal path or e-mail address in any published file", () => {
  // Third-party credits keep their authors' addresses (licence texts, the star catalogue).
  const credits = /^(ephe\/|src\/assets\/fonts\/.*(OFL|COPYING)\.txt$)/;
  const allowed = new Set(["limiel.ulune@protonmail.com", "someone@example.org", "someone@example.com"]);
  const binary = /\.(png|jpe?g|webp|gif|ico|woff2?|ttf|otf|se1|pdf|zip|gz|bin|wasm)$/i;
  const found = [];
  for (const rel of tracked()) {
    if (binary.test(rel) || credits.test(rel)) continue;
    const text = read(rel);
    for (const m of text.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g)) {
      if (!allowed.has(m[0]) && !/@example\.|@users\.noreply\.github\.com$/.test(m[0])) found.push(`${rel}: ${m[0]}`);
    }
    for (const m of text.matchAll(/(?:\/Users\/|\/home\/(?!claude\b)|C:\\Users\\)[^\s'"`)]+/g)) found.push(`${rel}: ${m[0]}`);
  }
  assert.deepEqual(found, []);
});

test("the notes from before the name Ulune stay out of the repository", () => {
  assert.deepEqual(tracked().filter((rel) => rel.startsWith("docs/archive/")), []);
});

test("every commit carries the one public name", { skip: !existsSync(join(ROOT, ".git")) }, () => {
  const people = execFileSync("git", ["log", "--format=%an <%ae>%n%cn <%ce>"], { cwd: ROOT, encoding: "utf8" })
    .split("\n")
    .filter(Boolean);
  assert.deepEqual([...new Set(people)], [IDENTITY]);
});
