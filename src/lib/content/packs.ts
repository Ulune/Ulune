import { useEffect, useSyncExternalStore } from "react";
import { importWithRetry } from "@/lib/lazy-retry";
import type { AppLocale } from "@/lib/i18n/messages";

/*
 * The reading text loads apart from the studio, one language at a time:
 * the wheel and panels come first, the pack of the reader's language right
 * after (or as soon as a reading is asked for). Each pack holds the builders
 * of its readings with their text (see scripts/content-packs-plugin.mjs).
 */

export type AstroPack = typeof import("./pack-astro");
export type HdPack = typeof import("./pack-hd");
export type NumPack = typeof import("./pack-num");
type Packs = { astro: AstroPack; hd: HdPack; num: NumPack };
export type PackKind = keyof Packs;

/** The language variants have no types of their own: they are the pack's. */
const as = <T,>(load: Promise<unknown>) => load as Promise<T>;

const LOADERS: { [K in PackKind]: Record<AppLocale, () => Promise<Packs[K]>> } = {
  astro: {
    en: () => as<AstroPack>(import("@/lib/content/pack-astro?lang=en")),
    fr: () => as<AstroPack>(import("@/lib/content/pack-astro?lang=fr")),
  },
  hd: {
    en: () => as<HdPack>(import("@/lib/content/pack-hd?lang=en")),
    fr: () => as<HdPack>(import("@/lib/content/pack-hd?lang=fr")),
  },
  num: {
    en: () => as<NumPack>(import("@/lib/content/pack-num?lang=en")),
    fr: () => as<NumPack>(import("@/lib/content/pack-num?lang=fr")),
  },
};

const ready = new Map<string, unknown>();
const inflight = new Map<string, Promise<unknown>>();
const subs = new Set<() => void>();

function subscribe(fn: () => void) {
  subs.add(fn);
  return () => {
    subs.delete(fn);
  };
}

export function loadPack<K extends PackKind>(kind: K, locale: AppLocale): Promise<Packs[K]> {
  const key = `${kind}:${locale}`;
  const have = ready.get(key);
  if (have) return Promise.resolve(have as Packs[K]);
  const pending = inflight.get(key);
  if (pending) return pending as Promise<Packs[K]>;
  const job = importWithRetry(LOADERS[kind][locale], { attempts: 2 }).then(
    (pack) => {
      inflight.delete(key);
      ready.set(key, pack);
      for (const fn of subs) fn();
      return pack;
    },
    (err: unknown) => {
      inflight.delete(key);
      throw err;
    },
  );
  inflight.set(key, job);
  return job;
}

/** The pack if it has loaded already (null otherwise). */
export function packNow<K extends PackKind>(kind: K, locale: AppLocale): Packs[K] | null {
  return (ready.get(`${kind}:${locale}`) as Packs[K] | undefined) ?? null;
}

/** Fetch ahead of use; errors wait for the real use. */
export function preloadPack(kind: PackKind, locale: AppLocale): void {
  loadPack(kind, locale).catch(() => {});
}

/**
 * The pack for this language once loaded (null meanwhile). While `enabled`,
 * rendering starts the download (after the frame is painted).
 */
export function usePack<K extends PackKind>(kind: K, locale: AppLocale, enabled = true): Packs[K] | null {
  const key = `${kind}:${locale}`;
  const pack = useSyncExternalStore(
    subscribe,
    () => (ready.get(key) as Packs[K] | undefined) ?? null,
    () => null,
  );
  useEffect(() => {
    if (!enabled || pack) return;
    loadPack(kind, locale).catch((err: unknown) => {
      console.warn(`[ulune] the ${kind} reading pack did not load`, err);
    });
  }, [kind, locale, enabled, pack]);
  return pack;
}
