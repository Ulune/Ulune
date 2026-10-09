/*
 * "Keep the encyclopedia on this device" (encyclopedia plan, part 21; decision
 * 11: offered as a setting): with Ulune kept on this device (lib/offline.ts),
 * the reader may keep the whole encyclopedia in one language or both, about a
 * few MB each, so every page opens without a connection. The list of its
 * files comes from the build (/encyclopedia-offline.json, scripts/
 * encyclopedia/vite-plugin.mjs); the service worker (public/sw.js) fetches
 * and keeps them. What is kept is a choice in this browser, nothing personal;
 * a new deploy's list replaces the old one the next time a page opens.
 */

const KEY = "ulune.encyclopedia.offline";
const VERSION_KEY = "ulune.encyclopedia.offline.version";
export type EncLangs = "en" | "fr" | "both";

export type EncManifest = {
  version: string;
  files: { en: string[]; fr: string[]; shared: string[] };
  bytes: { en: number; fr: number; shared: number };
  pages: { en: string[]; fr: string[] };
};

export type EncProgress = { lang: "en" | "fr"; done: number; total: number; failed: number };

export function keptEncyclopedia(): EncLangs | null {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "en" || v === "fr" || v === "both" ? v : null;
  } catch {
    return null;
  }
}

function remember(langs: EncLangs | null, version: string | null): void {
  try {
    if (langs) window.localStorage.setItem(KEY, langs);
    else window.localStorage.removeItem(KEY);
    if (version) window.localStorage.setItem(VERSION_KEY, version);
    else window.localStorage.removeItem(VERSION_KEY);
  } catch {
    /* this visit only */
  }
}

export async function encManifest(): Promise<EncManifest | null> {
  try {
    const res = await fetch("/encyclopedia-offline.json", { cache: "no-cache" });
    return res.ok ? ((await res.json()) as EncManifest) : null;
  } catch {
    return null;
  }
}

const langsOf = (langs: EncLangs): ("en" | "fr")[] => (langs === "both" ? ["en", "fr"] : [langs]);

/** About how much a choice downloads, in MB (compressed, as served). */
export function encSize(m: EncManifest, langs: EncLangs): number {
  const bytes = langsOf(langs).reduce((n, l) => n + m.bytes[l], m.bytes.shared);
  return Math.round(bytes / 100_000) / 10;
}

async function worker(): Promise<ServiceWorker | null> {
  if (!("serviceWorker" in navigator)) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.active;
}

/** Keeps a choice of languages: the files fetched by the worker, the progress told as it goes. */
export async function keepEncyclopedia(langs: EncLangs, onProgress?: (p: EncProgress) => void): Promise<boolean> {
  const m = await encManifest();
  const sw = await worker();
  if (!m || !sw) return false;
  const want = langsOf(langs);
  const ok = await new Promise<boolean>((resolve) => {
    const left = new Set(want);
    let fine = true;
    const on = (event: MessageEvent) => {
      const d = event.data as { type?: string; lang?: "en" | "fr"; done?: number; total?: number; failed?: number };
      if (d?.type === "enc-progress" && d.lang) onProgress?.({ lang: d.lang, done: d.done ?? 0, total: d.total ?? 0, failed: d.failed ?? 0 });
      if (d?.type === "enc-kept" && d.lang) {
        if (d.failed) fine = false;
        left.delete(d.lang);
        if (!left.size) {
          navigator.serviceWorker.removeEventListener("message", on);
          resolve(fine);
        }
      }
    };
    navigator.serviceWorker.addEventListener("message", on);
    for (const lang of want) sw.postMessage({ type: "enc-keep", lang, files: m.files[lang], shared: m.files.shared, pages: m.pages[lang] });
  });
  // A language no longer chosen: let go.
  for (const lang of ["en", "fr"] as const) if (!want.includes(lang)) sw.postMessage({ type: "enc-drop", lang });
  remember(langs, ok ? m.version : null);
  return ok;
}

/** Nothing of the encyclopedia kept whole any more. */
export async function dropEncyclopedia(): Promise<void> {
  remember(null, null);
  const sw = await worker();
  sw?.postMessage({ type: "enc-drop" });
}

/** On an encyclopedia page, online: a new deploy's files kept in place of the old ones, quietly. */
export async function refreshKeptEncyclopedia(): Promise<void> {
  const langs = keptEncyclopedia();
  if (!langs || !navigator.onLine || !navigator.serviceWorker?.controller) return;
  const m = await encManifest();
  let version: string | null = null;
  try {
    version = window.localStorage.getItem(VERSION_KEY);
  } catch {
    /* none */
  }
  if (m && m.version !== version) await keepEncyclopedia(langs);
}
