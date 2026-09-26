/** Transient failures loading a Vite/Rollup async chunk (404, timeout, MIME fallback). */
export function isChunkLoadError(error: unknown): boolean {
  const name = error instanceof Error ? error.name : "";
  const msg = error instanceof Error ? error.message : String(error ?? "");
  if (name === "ChunkLoadError") return true;
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Loading chunk .+ failed|Failed to load module script|Unable to preload CSS|Loading CSS chunk|MIME type of ['"]text\/html['"]|net::ERR_|Load failed/i.test(
    msg,
  );
}

export type ImportRetryOptions = {
  attempts?: number;
  delayMs?: number;
  sleep?: (ms: number) => Promise<void>;
};

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Retry a dynamic `import()`. React.lazy caches the first rejection, so callers
 * must also remount a fresh `lazy()` factory after these attempts fail.
 */
export async function importWithRetry<T>(
  importer: () => Promise<T>,
  options: ImportRetryOptions = {},
): Promise<T> {
  const attempts = Math.max(1, options.attempts ?? 3);
  const delayMs = options.delayMs ?? 200;
  const sleep = options.sleep ?? defaultSleep;
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await importer();
    } catch (error) {
      lastError = error;
      if (attempt + 1 >= attempts || !isChunkLoadError(error)) throw error;
      await sleep(delayMs * (attempt + 1));
    }
  }
  throw lastError;
}

function defaultStorage(): Pick<Storage, "getItem" | "setItem" | "removeItem"> | null {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

/** One guarded full reload — recovers stale hashed chunk URLs after a preview deploy. */
export function reloadStaleChunkOnce(
  key: string,
  storage: Pick<Storage, "getItem" | "setItem"> | null = defaultStorage(),
  reload: () => void = () => {
    if (typeof window !== "undefined") window.location.reload();
  },
): boolean {
  if (!storage) return false;
  try {
    if (storage.getItem(key)) return false;
    storage.setItem(key, "1");
    reload();
    return true;
  } catch {
    return false;
  }
}

export function clearReloadGuard(
  key: string,
  storage: Pick<Storage, "removeItem"> | null = defaultStorage(),
): void {
  try {
    storage?.removeItem(key);
  } catch {
    /* private mode */
  }
}
