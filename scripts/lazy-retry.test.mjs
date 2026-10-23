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

test("a code file that failed offline says the connection is back once it is, not that a new version is out", async () => {
  // The bug-fix round, item 6: Chromium keeps a failed download for the page's life, so after an offline
  // failure "Try again" fails again online, and used to read as a deploy ("A new version is out").
  const { chunkFailure, recoverFromStaleChunk } = await import("../src/lib/stale-chunks.ts");
  const was = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const connection = (onLine) => Object.defineProperty(globalThis, "navigator", { value: { onLine }, configurable: true, writable: true });
  try {
    const zodiac = new Error("Failed to fetch dynamically imported module: https://ulune.app/assets/zodiac-Ab12.js");
    connection(false);
    assert.equal(chunkFailure(zodiac), "offline");
    assert.equal(recoverFromStaleChunk(zodiac), false, "offline, no reload (it would bring the browser's offline page)");
    connection(true);
    assert.equal(chunkFailure(zodiac), "reconnected", "the same file, the connection back: a reload brings it");
    const bazi = new Error("Failed to fetch dynamically imported module: https://ulune.app/assets/bazi-Cd34.js");
    assert.equal(chunkFailure(bazi), "stale", "another file failing online: the files changed under the page");
    assert.equal(chunkFailure(new Error("syntax exploded")), null);
    // Safari names no file: after an offline failure, it reads as the connection back too.
    assert.equal(chunkFailure(new Error("Importing a module script failed.")), "reconnected");
  } finally {
    if (was) Object.defineProperty(globalThis, "navigator", was);
    else delete globalThis.navigator;
  }
});
