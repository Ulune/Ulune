import { useEffect, useSyncExternalStore } from "react";
import { importWithRetry } from "@/lib/lazy-retry";
import type { AppLocale } from "@/lib/i18n/messages";

/*
 * The reading text loads apart from the studio, one language at a time:
 * the wheel and panels come first, the pack of the reader's language right
 * after (or as soon as a reading is asked for). Each pack holds the builders
 * of its readings with their text (see scripts/content-packs-plugin.mjs).
 *
 * The packs of one page only (a Relationship page's, a Cycles page's) are not
 * named here: their page registers its loaders as its code arrives
 * (registerPack), so their imports and the files they list stay out of the
 * first download (the 2.0 week 4 review: each named here added about 0.1 KB
 * gz to the wheel's chunk). A pack asked for before its page has registered
 * it waits for it.
 */

export type AstroPack = typeof import("./pack-astro");
export type HdPack = typeof import("./pack-hd");
export type NumPack = typeof import("./pack-num");
export type CalPack = typeof import("./pack-cal");
/** Numerology's Relationship (share and compare plan, feature 5c): its pairs' texts, registered by that page (numerology-pair.tsx). */
export type NumPairPack = typeof import("./pack-num-pair");
/** Human Design's connection chart (feature 5a) and its "You two, now": registered by that page (design-pair.tsx). */
export type HdPairPack = typeof import("./pack-hd-pair");
/** "You two, now" on Synastry and Composite (feature 5e): registered by those pages (synastry.tsx, composite.tsx). */
export type PairNowPack = typeof import("./pack-pair-now");
/** Human Design's Cycles (feature 5b): the moment's, the life cycles' and the solar return's texts, registered by that page (design-cycles.tsx). */
export type HdCyclesPack = typeof import("./pack-hd-cycles");
type Packs = { astro: AstroPack; hd: HdPack; num: NumPack; cal: CalPack; numpair: NumPairPack; hdpair: HdPairPack; pairnow: PairNowPack; hdcycles: HdCyclesPack };
export type PackKind = keyof Packs;
/** The packs a page registers (registerPack). */
type PagePackKind = "numpair" | "hdpair" | "pairnow" | "hdcycles";
type Loaders<K extends PackKind> = Record<AppLocale, () => Promise<Packs[K]>>;

/** The language variants have no types of their own: they are the pack's. */
const as = <T,>(load: Promise<unknown>) => load as Promise<T>;

const LOADERS: { [K in Exclude<PackKind, PagePackKind>]: Loaders<K> } = {
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
  cal: {
    en: () => as<CalPack>(import("@/lib/content/pack-cal?lang=en")),
    fr: () => as<CalPack>(import("@/lib/content/pack-cal?lang=fr")),
  },
};

/** The page packs' loaders, as their pages register them; and who waits for one not registered yet. */
const registered = new Map<PackKind, Record<AppLocale, () => Promise<unknown>>>();
const waiting = new Map<PackKind, (() => void)[]>();

/**
 * A page's own pack: its loaders (`import("@/lib/content/pack-…?lang=en")` and
 * `…?lang=fr`), given once as the page's code arrives; usePack gives it its type.
 */
export function registerPack(kind: PagePackKind, loaders: Record<AppLocale, () => Promise<unknown>>): void {
  if (registered.has(kind)) return;
  registered.set(kind, loaders);
  for (const go of waiting.get(kind) ?? []) go();
  waiting.delete(kind);
}

function loaderOf<K extends PackKind>(kind: K, locale: AppLocale): Promise<() => Promise<Packs[K]>> {
  const named = (LOADERS as Partial<Record<PackKind, Record<AppLocale, () => Promise<unknown>>>>)[kind] ?? registered.get(kind);
  if (named) return Promise.resolve(named[locale] as () => Promise<Packs[K]>);
  return new Promise((resolve) => {
    waiting.set(kind, [...(waiting.get(kind) ?? []), () => resolve(registered.get(kind)![locale] as () => Promise<Packs[K]>)]);
  });
}

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
  const job = loaderOf(kind, locale).then((load) => importWithRetry(load, { attempts: 2 })).then(
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
