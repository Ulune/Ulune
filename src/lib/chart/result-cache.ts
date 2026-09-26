/**
 * Small in-memory caches for calculation results (a mode's sky at a moment,
 * a timing window): coming back to a mode, a language switch or a view that
 * asks for the same numbers again shows them at once instead of asking the
 * server. Memory only, per tab; the key holds every input and the calculation
 * version, so a stale answer can't be served.
 */
export type Lru<V> = {
  get(key: string): V | undefined;
  set(key: string, value: V): void;
  clear(): void;
};

export function lru<V>(max: number): Lru<V> {
  const map = new Map<string, V>();
  return {
    get(key) {
      const v = map.get(key);
      if (v === undefined) return undefined;
      map.delete(key);
      map.set(key, v);
      return v;
    },
    set(key, value) {
      map.delete(key);
      map.set(key, value);
      while (map.size > max) {
        const oldest = map.keys().next().value;
        if (oldest === undefined) break;
        map.delete(oldest);
      }
    },
    clear() {
      map.clear();
    },
  };
}

/** Whether an error is an aborted request (a newer one replaced it). */
export function isAbort(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === "AbortError") ||
    (err instanceof Error && (err.name === "AbortError" || /aborted/i.test(err.message)))
  );
}
