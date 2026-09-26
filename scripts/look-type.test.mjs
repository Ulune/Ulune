import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const look = readFileSync(join(ROOT, "src/lib/look.ts"), "utf8");
const css = readFileSync(join(ROOT, "src/styles.css"), "utf8");

test("Look pairings keep a display face and a different body face", () => {
  assert.match(look, /Fraunces/);
  assert.match(look, /Familjen Grotesk/);
  assert.match(look, /Source Serif 4/);
  assert.match(look, /Source Sans 3/);
  assert.match(look, /IBM Plex Serif/);
  assert.match(look, /IBM Plex Sans/);
  const block = look.slice(look.indexOf("PAIRING_FONTS"), look.indexOf("STROKE_SCALE"));
  assert.match(block, /classic:/);
  assert.match(block, /editorial:/);
  assert.match(block, /clean:/);
});

test("applyLook writes display and sans together", () => {
  // applyLook writes through put() (it also keeps the Look for the boot script).
  assert.match(look, /(?:setProperty|put)\("--font-display", fonts\.display\)/);
  assert.match(look, /(?:setProperty|put)\("--font-sans", fonts\.sans\)/);
  assert.doesNotMatch(look, /setProperty\("--font-cormorant"/);
  assert.doesNotMatch(look, /setProperty\("--font-noto"/);
});

test("outer aspect CSS tokens are solid oklch, not color-mix", () => {
  assert.match(css, /--aspect-outer-soft:\s*oklch\(/);
  assert.doesNotMatch(css, /--aspect-outer-\w+:\s*color-mix/);
});

test("CSS type roles: titles display, copy sans, data mono", () => {
  assert.doesNotMatch(css, /--font-cormorant/);
  assert.doesNotMatch(css, /--font-noto/);
  assert.match(css, /h1,\s*h2,\s*h3\s*\{[^}]*font-family:\s*var\(--font-display\)/s);
  assert.match(css, /body\s*\{[^}]*font-family:\s*var\(--font-sans\)/s);
  assert.match(css, /\.ulune-hello-title\s*\{[^}]*font-family:\s*var\(--font-display\)/s);
  assert.match(css, /\.ulune-hello-copy\s*\{[^}]*font-family:\s*var\(--font-sans\)/s);
  assert.doesNotMatch(css, /font-family:\s*var\(--font-cormorant\)/);
  assert.doesNotMatch(css, /font-family:\s*var\(--font-noto\)/);
});
