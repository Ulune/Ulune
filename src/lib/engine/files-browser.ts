/**
 * The engine's files in a browser (on-device plan, step 2): fetched once from
 * Ulune's own address, never a third party's, and kept by the browser (the
 * Cache API, "ulune-engine-v1") so the next visit, and a visit without a
 * connection, starts at once. The WebAssembly is compiled as it downloads
 * when the browser can. Files whose address no longer appears in the
 * engine's list (a new deploy changed them) are let go.
 *
 * `fetch` and `caches` can be handed in, so Node's tests run this very code
 * against files served from the repository (scripts/engine-device.test.mjs).
 *
 * While files come over the network, `onProgress` hears how far they have got
 * (bytes arrived of those expected, eras.ts FILE_BYTES), so the page can show
 * the first chart's one-time download (on-device plan, step 5); files read
 * from the browser's copy are not counted.
 */
import { FILE_BYTES, STARTUP_FILES } from "./eras";
import type { EngineProgress } from "./protocol";
import type { EngineFiles } from "./swiss";

/** The cache the engine's files are kept in (public/sw.js keeps it, and serves from it). */
export const ENGINE_CACHE = "ulune-engine-v1";

/** Where each file is: the WebAssembly, and the ephemeris files by Swiss's names. */
export type EngineUrls = { wasm: string; files: Readonly<Record<string, string>> };

type CacheLike = {
  match(url: string): Promise<Response | undefined>;
  put(url: string, res: Response): Promise<void>;
  keys(): Promise<readonly { url: string }[]>;
  delete(url: string | { url: string }): Promise<boolean>;
};
type CachesLike = { open(name: string): Promise<CacheLike>; delete(name: string): Promise<boolean> };

export type BrowserFileOptions = {
  fetch?: (url: string, init?: RequestInit) => Promise<Response>;
  /** The Cache API (absent outside a secure context: the files then come from the network and the HTTP cache). */
  caches?: CachesLike | null;
  /** Absolute addresses for the cache's keys (a worker's own location by default). */
  base?: string;
  /** Told as files arrive from the network: bytes arrived and expected for those on their way; `done` when none is left. */
  onProgress?: (progress: EngineProgress) => void;
};

export type BrowserFiles = EngineFiles & {
  /** Let go of the kept copies (a damaged file is fetched again on the next start). */
  forget(): Promise<void>;
  /** Bytes fetched from the network, and those read from the browser's copy, since this source was made. */
  traffic(): { network: number; kept: number };
};

function defaultCaches(): CachesLike | null {
  try {
    return typeof caches === "undefined" ? null : (caches as unknown as CachesLike);
  } catch {
    return null;
  }
}

export function browserFiles(urls: EngineUrls, options: BrowserFileOptions = {}): BrowserFiles {
  const doFetch = options.fetch ?? ((url: string, init?: RequestInit) => fetch(url, init));
  const store = options.caches === undefined ? defaultCaches() : options.caches;
  const base = options.base ?? (typeof location === "undefined" ? "http://localhost/" : location.href);
  const abs = (url: string) => new URL(url, base).href;
  const known = new Set([urls.wasm, ...Object.values(urls.files)].map(abs));
  let opened: Promise<CacheLike | null> | null = null;
  const traffic = { network: 0, kept: 0 };

  // What the network is bringing now: the bytes expected of each file on its way, and those arrived.
  const expected = new Map<string, number>([
    [abs(urls.wasm), FILE_BYTES["swisseph.wasm"] ?? 0],
    ...Object.entries(urls.files).map(([name, url]) => [abs(url), FILE_BYTES[name] ?? 0] as [string, number]),
  ]);
  const onProgress = options.onProgress;
  const batch = { loaded: 0, total: 0, open: 0 };
  const report = (done: boolean) => onProgress?.({ loaded: batch.loaded, total: Math.max(batch.total, batch.loaded), done });
  const started = (key: string) => {
    batch.total += expected.get(key) ?? 0;
    batch.open += 1;
    report(false);
  };
  const arrived = (n: number) => {
    batch.loaded += n;
    report(false);
  };
  const finished = () => {
    batch.open -= 1;
    if (batch.open > 0) return;
    report(true);
    batch.loaded = 0;
    batch.total = 0;
  };

  /** A response's bytes, counted as they arrive when someone is listening. */
  async function readCounting(res: Response): Promise<Uint8Array> {
    if (!onProgress || !res.body) return new Uint8Array(await res.arrayBuffer());
    const reader = res.body.getReader();
    const parts: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value);
      size += value.length;
      arrived(value.length);
    }
    const out = new Uint8Array(size);
    let at = 0;
    for (const part of parts) {
      out.set(part, at);
      at += part.length;
    }
    return out;
  }

  /** The same answer, its body counted as it streams (for the engine, compiled as it downloads). */
  function counted(res: Response): Response {
    if (!onProgress || !res.body || typeof TransformStream !== "function") return res;
    const count = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, out) {
        arrived(chunk.byteLength);
        out.enqueue(chunk);
      },
    });
    return new Response(res.body.pipeThrough(count), { headers: res.headers });
  }

  const cache = () =>
    (opened ??= (async () => {
      if (!store) return null;
      try {
        const c = await store.open(ENGINE_CACHE);
        // Files a newer deploy no longer names go (in the background).
        void c
          .keys()
          .then((keys) => Promise.all(keys.filter((k) => !known.has(k.url)).map((k) => c.delete(k))))
          .catch(() => {});
        return c;
      } catch {
        return null;
      }
    })());

  /**
   * A file's answer: the kept copy, or the network's (then kept). A file from the network is
   * counted in the download under way until `finished` is called for it.
   */
  async function get(url: string): Promise<{ res: Response; kept: boolean }> {
    const key = abs(url);
    const c = await cache();
    const hit = await c?.match(key).catch(() => undefined);
    if (hit) return { res: hit, kept: true };
    started(key);
    let res: Response;
    try {
      res = await doFetch(key, { credentials: "same-origin" });
    } catch {
      finished();
      throw new Error("E:engine.offline");
    }
    if (!res.ok) {
      finished();
      throw new Error(`E:engine.files|${res.status}`);
    }
    // Kept before it is read; a full disk only means no copy.
    if (c) await c.put(key, res.clone()).catch(() => {});
    return { res, kept: false };
  }

  async function bytesOf(url: string): Promise<Uint8Array> {
    const { res, kept } = await get(url);
    if (kept) {
      const bytes = new Uint8Array(await res.arrayBuffer());
      traffic.kept += bytes.length;
      return bytes;
    }
    try {
      const bytes = await readCounting(res);
      traffic.network += bytes.length;
      return bytes;
    } finally {
      finished();
    }
  }

  const files: BrowserFiles = {
    startup: STARTUP_FILES,
    async names() {
      return Object.keys(urls.files);
    },
    async wasm() {
      const { res, kept } = await get(urls.wasm);
      traffic[kept ? "kept" : "network"] += Number(res.headers.get("content-length") ?? 0);
      try {
        // Compiled while it streams in, when the answer says it is WebAssembly.
        if (typeof WebAssembly.compileStreaming === "function" && /application\/wasm/.test(res.headers.get("content-type") ?? "")) {
          const whole = res.clone();
          try {
            return await WebAssembly.compileStreaming(kept ? res : counted(res));
          } catch {
            return new Uint8Array(await whole.arrayBuffer());
          }
        }
        return kept ? new Uint8Array(await res.arrayBuffer()) : await readCounting(res);
      } finally {
        if (!kept) finished();
      }
    },
    async read(name) {
      const url = urls.files[name];
      if (!url) throw new Error(`Ephemeris file ${name} not found.`);
      return bytesOf(url);
    },
    async readMany(names) {
      return Promise.all(names.map((name) => files.read(name)));
    },
    async forget() {
      opened = null;
      await store?.delete(ENGINE_CACHE).catch(() => false);
    },
    traffic: () => ({ ...traffic }),
  };
  return files;
}
