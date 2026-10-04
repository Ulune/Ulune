/**
 * Safari in a tab, where a site's data may go after seven days of browsing
 * without a visit (not once Ulune is in the Dock or on the Home Screen,
 * which Safari keeps: webkit.org/blog/14403).
 */
export function inSafariTab(): boolean {
  if (typeof navigator === "undefined" || typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  const safari = /Safari\//.test(ua) && !/(Chrome|Chromium|CriOS|FxiOS|EdgiOS|Edg|OPR|Firefox)\//.test(ua);
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  return safari && !standalone;
}
