// What an error report may hold (src/lib/report-shape.ts): what failed and
// where in Ulune's code, never a date, a place, a number, a link or a query.
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildReport, cleanReport, codeFrames, engineOf, maskMessage, maskPath } from "../src/lib/report-shape.ts";

test("every digit, link and address is masked", () => {
  assert.equal(maskMessage("Bad date 1990-06-15 at 14:30, 48.85, 2.35"), "Bad date ####-##-## at ##:##, ##.##, #.##");
  assert.equal(maskMessage("see https://ulune.app/?c=1990 now"), "see <link> now");
  assert.equal(maskMessage("from someone@example.org"), "from <email>");
  assert.equal(maskMessage("x".repeat(1000)).length, 300);
});

test("only frames in Ulune's own files, as file:line:column", () => {
  const stack = [
    "TypeError: x is undefined",
    "    at a (https://ulune.app/assets/app-3fA2b.js:1:2345)",
    "    at b (chrome-extension://abc/content.js:10:5)",
    "    at https://ulune.app/assets/wheel-9Zx.js:1:77",
  ].join("\n");
  assert.deepEqual(codeFrames(stack), ["app-3fA2b.js:1:2345", "wheel-9Zx.js:1:77"]);
  assert.deepEqual(codeFrames(undefined), []);
});

test("the page is its path, the browser its engine", () => {
  assert.equal(maskPath("/settings?x=1#y"), "/settings");
  assert.equal(maskPath("/weird path<script>"), "/");
  assert.equal(engineOf("Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Safari/605.1.15"), "webkit");
  assert.equal(engineOf("Mozilla/5.0 (X11) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36"), "blink");
  assert.equal(engineOf("Mozilla/5.0 (X11; rv:140.0) Gecko/20100101 Firefox/140.0"), "gecko");
});

test("a report built in the page is one the server keeps, field for field", () => {
  const err = new TypeError("Cannot read 12 of undefined");
  err.stack = "TypeError: Cannot read 12 of undefined\n    at f (https://ulune.app/assets/app-1.js:1:99)";
  const report = buildReport("render", err, { version: "1.0", path: "/privacy?q=1", userAgent: "Firefox/140.0" });
  assert.deepEqual(report, {
    v: "1.0",
    kind: "render",
    message: "TypeError: Cannot read ## of undefined",
    // Code positions are not personal: they stay as they are.
    where: ["app-1.js:1:99"],
    path: "/privacy",
    engine: "gecko",
  });
  assert.deepEqual(cleanReport(JSON.stringify(report)), report);
});

test("the server refuses anything else, and masks again", () => {
  const good = { v: "1.0", kind: "error", message: "E 1", where: [], path: "/", engine: "blink" };
  assert.equal(cleanReport("not json"), null);
  assert.equal(cleanReport("[]"), null);
  assert.equal(cleanReport(JSON.stringify({ ...good, kind: "anything" })), null);
  assert.equal(cleanReport(JSON.stringify({ ...good, where: ["../../etc/passwd"] })), null);
  assert.equal(cleanReport(JSON.stringify({ ...good, engine: "Mozilla/5.0 (…)" })), null);
  assert.equal(cleanReport(JSON.stringify({ ...good, v: "1.0; rm -rf" })), null);
  // Extra fields are dropped; digits sent unmasked are masked here.
  const kept = cleanReport(JSON.stringify({ ...good, message: "born 1990", ip: "203.0.113.9", chart: { sun: 84 } }));
  assert.deepEqual(kept, { ...good, message: "born ####" });
});
