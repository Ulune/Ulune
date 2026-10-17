/*
 * Whether this browser can keep a private space at all (IndexedDB, WebCrypto,
 * a secure page). Its own small file: every page's SpaceGate asks it as it
 * opens, and the space's store (store.ts, with the inbox's since the share
 * plan, feature 1) then loads only with the space's engine, out of the first
 * download (first-load review, 17 Oct 2026).
 */

export function spaceSupported(): boolean {
  return (
    typeof indexedDB !== "undefined" &&
    typeof crypto !== "undefined" &&
    typeof crypto.subtle !== "undefined" &&
    typeof window !== "undefined" &&
    window.isSecureContext !== false
  );
}
