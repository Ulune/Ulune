import { b64u, fromB64u } from "../encoding";

/*
 * The account id as a reader sees and types it (share and compare plan, feature 4): the protocol's
 * id is 16 random bytes in base64url (22 characters, upper and lower case), which is easy to
 * mistype. On screen it is the same 128 bits in Crockford's base32, the recovery code's alphabet,
 * in groups of four (26 symbols: "8D4Q-X3K2-…"); typing it back forgives case, spaces, dashes, and
 * O, I or L for 0 and 1. Either spelling is read: a pasted base64url id too.
 */

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** The id shown: base32 in groups of four. */
export function formatAccountId(account: string): string {
  const bytes = fromB64u(account);
  if (!bytes || bytes.byteLength !== 16) return account;
  let out = "";
  let value = 0;
  let bits = 0;
  for (const byte of bytes) {
    value = ((value << 8) | byte) & 0xffff;
    bits += 8;
    while (bits >= 5) {
      out += CROCKFORD[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += CROCKFORD[(value << (5 - bits)) & 31];
  return (out.match(/.{1,4}/g) ?? []).join("-");
}

/** The id typed or pasted, in either spelling, as the protocol's base64url; null when it can't be one. */
export function readAccountId(typed: string): string | null {
  const plain = typed.replace(/\s+/g, "");
  const direct = fromB64u(plain);
  if (direct && direct.byteLength === 16) return plain;
  const symbols = plain.toUpperCase().replace(/[-_.]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
  if (symbols.length !== 26) return null;
  const bytes = new Uint8Array(16);
  let value = 0;
  let bits = 0;
  let at = 0;
  for (const ch of symbols) {
    const n = CROCKFORD.indexOf(ch);
    if (n < 0) return null;
    value = ((value << 5) | n) & 0xffff;
    bits += 5;
    if (bits >= 8 && at < 16) {
      bytes[at] = (value >>> (bits - 8)) & 0xff;
      at += 1;
      bits -= 8;
    }
  }
  // 130 bits for 128: the last two must be zero, or it is not an id.
  if (at !== 16 || (value & ((1 << bits) - 1)) !== 0) return null;
  return b64u(bytes);
}
