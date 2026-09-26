/*
 * Whether this page can offer a passkey as a way into the private space.
 * Light enough for the settings page: the passkey code itself
 * (lib/space/passkey.ts) comes with the sheet.
 */

/**
 * Whether passkeys can be offered here at all: a secure page on a domain name
 * (an address like 127.0.0.1 can't hold passkeys), with WebAuthn.
 */
export function passkeysPossible(): boolean {
  if (typeof window === "undefined" || !window.isSecureContext) return false;
  if (typeof PublicKeyCredential === "undefined" || !navigator.credentials) return false;
  const host = window.location.hostname;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":") || host.startsWith("[")) return false;
  return true;
}

async function prfLikely(): Promise<boolean> {
  if (!passkeysPossible()) return false;
  const pkc = PublicKeyCredential as unknown as {
    getClientCapabilities?: () => Promise<Record<string, boolean>>;
    isUserVerifyingPlatformAuthenticatorAvailable?: () => Promise<boolean>;
  };
  try {
    const caps = await pkc.getClientCapabilities?.();
    if (caps && typeof caps["extension:prf"] === "boolean") return caps["extension:prf"];
  } catch {
    /* not said */
  }
  try {
    return (await pkc.isUserVerifyingPlatformAuthenticatorAvailable?.()) ?? false;
  } catch {
    return false;
  }
}

let likely: Promise<boolean> | null = null;

/**
 * Whether this browser can give a passkey's secret, so that a new passkey
 * would open the space. Browsers that can tell say so (getClientCapabilities);
 * for the others, a platform authenticator (Face ID, Touch ID, Windows Hello)
 * is taken as a yes, and making the passkey checks for real. Asked once per
 * page; a browser that doesn't answer within a moment is taken as a no.
 */
export function passkeyPrfLikely(): Promise<boolean> {
  likely ??= Promise.race([
    prfLikely(),
    new Promise<boolean>((resolve) => window.setTimeout(() => resolve(false), 1500)),
  ]);
  return likely;
}
