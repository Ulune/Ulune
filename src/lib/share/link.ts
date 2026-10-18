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
 * Version 2, the typed link (share and compare plan, idea B4), has the same
 * shape, `#2.<key>.<sealed>`, and its sealed bytes start with their type:
 * 1, a request for someone's chart (lib/share/request.ts). Version 1 stays
 * the share link, written and read as it always was, so every link made
 * before reads the same. A reader that knows only version 1 says a version-2
 * link comes from a newer Ulune, and so does this one for a version or a
 * type it does not know: a new kind of link takes the next type, never a
 * byte of an old one.
 *
 * Reading one is strict: its shape, the version, the key's and the sealed
 * part's lengths, the seal itself (a changed or cut-off link fails it), the
 * type, then every field (format.ts, request.ts). About 100 to 160
 * characters for one chart, about 70 for a request.
 */
import { ShareLinkError, fromB64u, toB64u, utf8 } from "./bytes";
import { packShare, unpackShare, type SharePayload } from "./format";
import { REQUEST_TYPE, packRequest, unpackRequest, type ChartRequest } from "./request";

/** The share link's version (one or two charts). */
export const LINK_VERSION = 1;
/** The typed link's version: a type byte, then that type's payload. */
export const TYPED_VERSION = 2;
/** The path the link opens; the server sees only this. */
export const SHARE_PATH = "/s";

const KEY_BYTES = 16;
const TAG_BYTES = 16;
/** The smallest payload (one chart with no text) and more than the largest one any link can hold. */
const MIN_PLAIN = 16;
const MAX_PLAIN = 2400;
/** A typed link's: its type and a request's two bytes; at most a type and a few short fields. */
const MIN_TYPED = 3;
const MAX_TYPED = 320;
/** Longer than any link Ulune makes: a longer fragment is refused before anything else. */
export const MAX_FRAGMENT = 4096;

const AAD = utf8(`ulune/share/v${LINK_VERSION}`);
const AAD_TYPED = utf8(`ulune/link/v${TYPED_VERSION}`);

/** What a link holds, by kind. */
export type ReadLink = { kind: "share"; share: SharePayload } | { kind: "request"; request: ChartRequest };

function nonce(): Uint8Array<ArrayBuffer> {
  return new Uint8Array(new ArrayBuffer(12));
}

async function seal(origin: string, version: number, aad: Uint8Array<ArrayBuffer>, plain: Uint8Array<ArrayBuffer>): Promise<string> {
  const raw = new Uint8Array(new ArrayBuffer(KEY_BYTES));
  crypto.getRandomValues(raw);
  const key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt"]);
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce(), additionalData: aad }, key, plain));
  const fragment = `${version}.${toB64u(raw)}.${toB64u(sealed)}`;
  raw.fill(0);
  return `${origin.replace(/\/+$/, "")}${SHARE_PATH}#${fragment}`;
}

/** The link for a payload, on this origin. */
export async function makeShareLink(origin: string, payload: SharePayload): Promise<string> {
  return seal(origin, LINK_VERSION, AAD, packShare(payload));
}

/** The link asking for someone's chart (idea B4), on this origin. */
export async function makeRequestLink(origin: string, request: ChartRequest): Promise<string> {
  const body = packRequest(request);
  const plain = new Uint8Array(new ArrayBuffer(body.length + 1));
  plain[0] = REQUEST_TYPE;
  plain.set(body, 1);
  return seal(origin, TYPED_VERSION, AAD_TYPED, plain);
}

/** What a link's fragment holds (with or without its "#"): a shared chart or a request; throws ShareLinkError saying why not. */
export async function readLink(fragment: string): Promise<ReadLink> {
  const text = fragment.startsWith("#") ? fragment.slice(1) : fragment;
  if (!text) throw new ShareLinkError("empty");
  if (text.length > MAX_FRAGMENT) throw new ShareLinkError("long");
  const parts = text.split(".");
  if (parts.length !== 3) throw new ShareLinkError("shape");
  const [version, keyText, sealedText] = parts;
  // Exactly "1" or "2": a larger number is a link from a newer Ulune, anything else is no link of Ulune's.
  const typed = version === String(TYPED_VERSION);
  if (version !== String(LINK_VERSION) && !typed) {
    throw new ShareLinkError(/^[1-9]\d{0,2}$/.test(version) && Number(version) > TYPED_VERSION ? "newer" : "version");
  }
  const raw = fromB64u(keyText);
  if (!raw || raw.length !== KEY_BYTES) throw new ShareLinkError("key");
  const sealed = fromB64u(sealedText);
  const [min, max] = typed ? [MIN_TYPED, MAX_TYPED] : [MIN_PLAIN, MAX_PLAIN];
  if (!sealed || sealed.length < TAG_BYTES + min || sealed.length > TAG_BYTES + max) throw new ShareLinkError("size");
  let plain: Uint8Array;
  try {
    const key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]);
    plain = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce(), additionalData: typed ? AAD_TYPED : AAD }, key, sealed));
  } catch {
    throw new ShareLinkError("sealed");
  } finally {
    raw.fill(0);
  }
  if (!typed) return { kind: "share", share: unpackShare(plain) };
  const type = plain[0];
  // Type 0 was never given; a type after the last this version knows is a newer Ulune's.
  if (type === REQUEST_TYPE) return { kind: "request", request: unpackRequest(plain.subarray(1)) };
  throw new ShareLinkError(type === 0 ? "type" : "newer");
}

/** The shared charts of a link's fragment (with or without its "#"); throws ShareLinkError saying why not (a request is not one: "type"). */
export async function readShareFragment(fragment: string): Promise<SharePayload> {
  const link = await readLink(fragment);
  if (link.kind !== "share") throw new ShareLinkError("type");
  return link.share;
}
