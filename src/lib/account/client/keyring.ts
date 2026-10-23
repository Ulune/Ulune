import { b64u, fromB64u, utf8 } from "../encoding";
import { hkdfBytes, type SyncKeys } from "../keys";
import { LABEL } from "../protocol";

/*
 * The account's two keys on this device (share and compare plan, feature 4; docs/sync-protocol.md,
 * 3.1): the name key and the record key, derived once from the space's data key when sync starts
 * here (keys.ts derives the same, as non-extractable keys, from the same labels), then kept as
 * bytes inside the space's own sealed record (sync/account), so a space that opens by itself on
 * this device ("stay signed in", where the data key cannot be read out) still syncs. They open the
 * account's records and nothing else, and they are only ever on the page while the space is open.
 */

/** The two keys' bytes, base64url: n the name key (HMAC-SHA-256), r the record key (AES-256-GCM). */
export type KeyBytes = { n: string; r: string };

function accountSalt(account: string): Uint8Array<ArrayBuffer> {
  const salt = fromB64u(account);
  if (!salt || salt.byteLength !== 16) throw new Error("bad-id");
  return salt;
}

/** The account's keys' bytes from the data key's (keys.ts, syncKeys, makes the same keys). */
export async function syncKeyBytes(dataKey: Uint8Array, account: string): Promise<KeyBytes> {
  const salt = accountSalt(account);
  const n = await hkdfBytes(dataKey, salt, utf8(`${LABEL}/name-key`), 32);
  const r = await hkdfBytes(dataKey, salt, utf8(`${LABEL}/record-key`), 32);
  try {
    return { n: b64u(n), r: b64u(r) };
  } finally {
    n.fill(0);
    r.fill(0);
  }
}

/** The keys themselves, for the engine: not extractable. */
export async function syncKeysFrom(account: string, bytes: KeyBytes): Promise<SyncKeys> {
  const n = fromB64u(bytes.n);
  const r = fromB64u(bytes.r);
  if (!n || !r || n.byteLength !== 32 || r.byteLength !== 32) throw new Error("bad-keys");
  try {
    const nameKey = await crypto.subtle.importKey("raw", n, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const recordKey = await crypto.subtle.importKey("raw", r, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    return { account, nameKey, recordKey };
  } finally {
    n.fill(0);
    r.fill(0);
  }
}
