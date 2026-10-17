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
 */
import { STARTUP_FILES } from "./eras";
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

  /** A file's answer: the kept copy, or the network's (then kept). */
  async function get(url: string): Promise<{ res: Response; kept: boolean }> {
    const key = abs(url);
    const c = await cache();
    const hit = await c?.match(key).catch(() => undefined);
    if (hit) return { res: hit, kept: true };
    let res: Response;
    try {
      res = await doFetch(key, { credentials: "same-origin" });
    } catch {
      throw new Error("E:engine.offline");
    }
    if (!res.ok) throw new Error(`E:engine.files|${res.status}`);
    // Kept before it is read; a full disk only means no copy.
    if (c) await c.put(key, res.clone()).catch(() => {});
    return { res, kept: false };
  }

  async function bytesOf(url: string): Promise<Uint8Array> {
    const { res, kept } = await get(url);
    const bytes = new Uint8Array(await res.arrayBuffer());
    traffic[kept ? "kept" : "network"] += bytes.length;
    return bytes;
  }

  const files: BrowserFiles = {
    startup: STARTUP_FILES,
    async names() {
      return Object.keys(urls.files);
    },
    async wasm() {
      const { res, kept } = await get(urls.wasm);
      traffic[kept ? "kept" : "network"] += Number(res.headers.get("content-length") ?? 0);
      // Compiled while it streams in, when the answer says it is WebAssembly.
      if (typeof WebAssembly.compileStreaming === "function" && /application\/wasm/.test(res.headers.get("content-type") ?? "")) {
        try {
          return await WebAssembly.compileStreaming(res.clone());
        } catch {
          /* read whole below */
        }
      }
      return new Uint8Array(await res.arrayBuffer());
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
