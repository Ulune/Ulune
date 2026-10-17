/*
 * The share link itself (share plan, feature 1):
 *
 *   https://ulune.app/s#1.<key>.<sealed>
 *
 * Everything after "#" stays in the browser: it is never sent to a server,
 * Ulune's included, nor in a Referer. The payload (lib/share/format.ts) is
 * sealed with AES-128-GCM under a random key that travels in the same
 * fragment, so nothing in the link is readable (no "1990", no "Paris") in a
 * message preview, a log or a screenshot of the address bar. It is no lock
 * against whoever holds the link, which is the link's purpose; there is no
 * password, ever (S4). Each link has its own key, used once, so a fixed
 * nonce is safe; the version is bound in as associated data.
 *
 * Reading one is strict: its shape, the version, the key's and the sealed
 * part's lengths, the seal itself (a changed or cut-off link fails it), then
 * every field (format.ts). About 100 to 160 characters for one chart.
 */
import { ShareLinkError, fromB64u, toB64u, utf8 } from "./bytes";
import { packShare, unpackShare, type SharePayload } from "./format";

export const LINK_VERSION = 1;
/** The path the link opens; the server sees only this. */
export const SHARE_PATH = "/s";

const KEY_BYTES = 16;
const TAG_BYTES = 16;
/** The smallest payload (one chart with no text) and more than the largest one any link can hold. */
const MIN_PLAIN = 16;
const MAX_PLAIN = 2400;
/** Longer than any link Ulune makes: a longer fragment is refused before anything else. */
export const MAX_FRAGMENT = 4096;

const AAD = utf8(`ulune/share/v${LINK_VERSION}`);

function nonce(): Uint8Array<ArrayBuffer> {
  return new Uint8Array(new ArrayBuffer(12));
}

/** The link for a payload, on this origin. */
export async function makeShareLink(origin: string, payload: SharePayload): Promise<string> {
  const plain = packShare(payload);
  const raw = new Uint8Array(new ArrayBuffer(KEY_BYTES));
  crypto.getRandomValues(raw);
  const key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt"]);
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce(), additionalData: AAD }, key, plain));
  const fragment = `${LINK_VERSION}.${toB64u(raw)}.${toB64u(sealed)}`;
  raw.fill(0);
  return `${origin.replace(/\/+$/, "")}${SHARE_PATH}#${fragment}`;
}

/** The payload of a link's fragment (with or without its "#"); throws ShareLinkError saying why not. */
export async function readShareFragment(fragment: string): Promise<SharePayload> {
  const text = fragment.startsWith("#") ? fragment.slice(1) : fragment;
  if (!text) throw new ShareLinkError("empty");
  if (text.length > MAX_FRAGMENT) throw new ShareLinkError("long");
  const parts = text.split(".");
  if (parts.length !== 3) throw new ShareLinkError("shape");
  const [version, keyText, sealedText] = parts;
  // Exactly "1": a newer number is a link from a newer Ulune, anything else is no link of Ulune's.
  if (version !== String(LINK_VERSION)) throw new ShareLinkError(/^[1-9]\d{0,2}$/.test(version) && Number(version) > LINK_VERSION ? "newer" : "version");
  const raw = fromB64u(keyText);
  if (!raw || raw.length !== KEY_BYTES) throw new ShareLinkError("key");
  const sealed = fromB64u(sealedText);
  if (!sealed || sealed.length < TAG_BYTES + MIN_PLAIN || sealed.length > TAG_BYTES + MAX_PLAIN) throw new ShareLinkError("size");
  let plain: Uint8Array;
  try {
    const key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]);
    plain = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce(), additionalData: AAD }, key, sealed));
  } catch {
    throw new ShareLinkError("sealed");
  } finally {
    raw.fill(0);
  }
  return unpackShare(plain);
}
