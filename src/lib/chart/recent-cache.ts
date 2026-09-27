/**
 * A small cache in the server's memory: the most recent `max` entries, each
 * for `ttlMs`, the least recently used going first. Nothing is written
 * anywhere; a new server instance starts empty.
 */
export class RecentCache<V> {
  readonly #entries = new Map<string, { value: V; at: number }>();
  readonly #max: number;
  readonly #ttlMs: number;
  readonly #now: () => number;

  constructor(max: number, ttlMs: number, now: () => number = Date.now) {
    this.#max = max;
    this.#ttlMs = ttlMs;
    this.#now = now;
  }

  get(key: string): V | undefined {
    const entry = this.#entries.get(key);
    if (!entry) return undefined;
    if (this.#now() - entry.at > this.#ttlMs) {
      this.#entries.delete(key);
      return undefined;
    }
    // Most recently used last, so the first key is always the one to drop.
    this.#entries.delete(key);
    this.#entries.set(key, entry);
    return entry.value;
  }

  set(key: string, value: V): void {
    this.#entries.delete(key);
    this.#entries.set(key, { value, at: this.#now() });
    while (this.#entries.size > this.#max) {
      const oldest = this.#entries.keys().next().value;
      if (oldest === undefined) break;
      this.#entries.delete(oldest);
    }
  }

  clear(): void {
    this.#entries.clear();
  }

  get size(): number {
    return this.#entries.size;
  }
}
