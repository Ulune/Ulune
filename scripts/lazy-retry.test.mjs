import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clearReloadGuard,
  importWithRetry,
  isChunkLoadError,
  reloadStaleChunkOnce,
} from "../src/lib/lazy-retry.ts";

test("isChunkLoadError matches Vite / browser module-script failures", () => {
  assert.equal(
    isChunkLoadError(new Error("Failed to fetch dynamically imported module: /assets/transit-page-abc.js")),
    true,
  );
  assert.equal(isChunkLoadError(Object.assign(new Error("boom"), { name: "ChunkLoadError" })), true);
  assert.equal(
    isChunkLoadError(new Error('Failed to load module script: MIME type of "text/html"')),
    true,
  );
  assert.equal(isChunkLoadError(new Error("net::ERR_ABORTED")), true);
  assert.equal(isChunkLoadError(new Error("something else entirely")), false);
});

test("importWithRetry recovers after transient chunk failures", async () => {
  let calls = 0;
  const value = await importWithRetry(
    async () => {
      calls += 1;
      if (calls < 3) throw new Error("Failed to fetch dynamically imported module: transit-page.js");
      return { ok: true };
    },
    { delayMs: 1, sleep: async () => {} },
  );
  assert.deepEqual(value, { ok: true });
  assert.equal(calls, 3);
});

test("importWithRetry does not retry non-chunk errors", async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      importWithRetry(async () => {
        calls += 1;
        throw new Error("syntax exploded");
      }),
    /syntax exploded/,
  );
  assert.equal(calls, 1);
});

test("reloadStaleChunkOnce fires once per session key", () => {
  const store = new Map();
  const storage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => void store.set(k, v),
    removeItem: (k) => void store.delete(k),
  };
  let reloads = 0;
  assert.equal(
    reloadStaleChunkOnce("k", storage, () => {
      reloads += 1;
    }),
    true,
  );
  assert.equal(
    reloadStaleChunkOnce("k", storage, () => {
      reloads += 1;
    }),
    false,
  );
  assert.equal(reloads, 1);
  clearReloadGuard("k", storage);
  assert.equal(
    reloadStaleChunkOnce("k", storage, () => {
      reloads += 1;
    }),
    true,
  );
  assert.equal(reloads, 2);
});
