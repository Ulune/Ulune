/*
 * Ulune kept on this device (performance plan 1.14): a small service worker
 * (public/sw.js) that keeps the app's own files so it opens without waiting
 * and saved charts open offline. Asked once, and off until the visitor says
 * yes; they can change it in Settings → Your data. The answer stays in this
 * browser, like everything else.
 */

import { LEGACY_CACHE_PREFIX } from "@/lib/space/legacy";

const KEY = "ulune.offline.v1";
export type OfflineChoice = "on" | "off";

function supported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && window.isSecureContext;
}

export function offlineSupported(): boolean {
  return supported();
}

export function offlineChoice(): OfflineChoice | null {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "on" || v === "off" ? v : null;
  } catch {
    return "off";
  }
}

function remember(choice: OfflineChoice): void {
  try {
    window.localStorage.setItem(KEY, choice);
  } catch {
    /* private mode: asked again next time */
  }
}

async function register(): Promise<boolean> {
  if (!supported()) return false;
  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    return true;
  } catch {
    return false;
  }
}

async function unregister(): Promise<void> {
  if (!supported()) return;
  try {
    for (const reg of await navigator.serviceWorker.getRegistrations()) await reg.unregister();
    if ("caches" in window) {
      for (const key of await caches.keys()) {
        if (key.startsWith("ulune-") || key.startsWith(LEGACY_CACHE_PREFIX)) await caches.delete(key);
      }
    }
  } catch {
    /* nothing kept, or already gone */
  }
}

/** Yes: keep Ulune on this device from now on. */
export async function turnOfflineOn(): Promise<boolean> {
  remember("on");
  return register();
}

/** No (or no longer): nothing kept, the worker and its files gone. */
export async function turnOfflineOff(): Promise<void> {
  remember("off");
  await unregister();
}

/**
 * Each visit, keep the worker as the visitor chose: registered (which also
 * picks up a newer sw.js) when on, and gone when off (a choice made in
 * another tab, or a worker left from before).
 */
export function keepOfflineChoice(): void {
  if (!supported()) return;
  const choice = offlineChoice();
  if (choice === "on") void register();
  else if (navigator.serviceWorker.controller) void unregister();
}
