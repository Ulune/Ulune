# Ulune's synced account: the protocol

Version 1 · written for Ulune 2.0 (share and compare plan, feature 4) · this document is public, like the code it describes.

Ulune's private space keeps a reader's charts, notes and settings sealed on their device. The synced account adds a copy of those sealed records on Ulune's server, so the reader's other devices can fetch them and open them with the same key. The server holds boxes it cannot open: it never receives a name, a birth date, a place, a note, a passphrase, a recovery code, a passkey's secret or the key that opens the records. This is end-to-end encryption, and this document says exactly how it works, so anyone can check it.

The server is `src/lib/account/*.server.ts` and the route `src/routes/api/account.v1.$.ts`; the device side's cryptography is `src/lib/account/keys.ts`; the database is `db/migrations/*.sql`. The tests that hold the server to this document are `scripts/account-*.test.mjs`.

Contents: 1. Principles · 2. Conventions · 3. The keys on the device · 4. Ways in and sessions · 5. Operations · 6. Records and sync · 7. Devices · 8. Adding a device by QR code · 9. Deleting · 10. Limits and abuse · 11. Errors · 12. Versions · 13. What the server stores · 14. Threat model · 15. Running it

---

## 1. Principles

- **No identity.** An account is a random 128-bit number. No email, no name, no phone number, nothing personal. (Decision A1: no email in 2.0.)
- **Nothing readable.** Every record is sealed on the device (AES-256-GCM) before it is sent; its name is replaced by a keyed hash; its size is rounded up to a bucket. The server sees that a record exists, its size bucket, its version and the day it changed.
- **Days, not times.** Every date the server keeps is a whole day (days since 1 January 1970, UTC). No time of day, no IP address, no user agent is ever stored by Ulune. Expiries finer than a day (a challenge's five minutes, a device link's ten) live inside signed tokens held by the devices, never in the database.
- **The server cannot sign in as the reader.** It keeps a passkey's public key (which can check a signature, not make one) and a slow hash of a key derived on the device from the passphrase or the recovery code (which can check that key, not recover it, and opens nothing).
- **Off by default.** A new private space stays on its device ("This device only"); syncing is one tap away (decision A4).
- **Deleting is immediate.** Turning sync off deletes the account and everything in it at once. An account unused for two years is deleted (decision A3).
- **In the EU.** The database is Neon's Postgres in Frankfurt (AWS eu-central-1); the account's functions run in Vercel's Frankfurt region, fra1 (decision A2).

## 2. Conventions

- **Transport.** HTTPS only. Every operation is `POST /api/account/v1/<operation>` on Ulune's own address (the same origin as the pages, so the pages' content security policy, `connect-src 'self'`, already allows it). The one exception is the daily clean-up, `GET /api/account/cleanup`, called by Vercel's scheduler only (section 9).
- **Requests.** `Content-Type: application/json`; the body is one JSON object (UTF-8) whose fields are exactly those listed for the operation: an unknown, missing or ill-formed field is refused. Nothing ever goes in the address: a request with a query string is refused. A browser's request from another site's page (`Sec-Fetch-Site` other than `same-origin`) is refused.
- **Sizes.** A body is at most 64 KiB, except `records/put`'s (1 MiB).
- **Authentication.** Operations marked *session* need `Authorization: Bearer <token>` (section 4.5).
- **Answers.** `200` with a JSON object, `Cache-Control: no-store`. An error is a status and exactly `{"error":"<code>"}` (section 11), never more.
- **Bytes** travel as base64url without padding (RFC 4648 §5), canonical (decoding then encoding gives back the same text). Lengths below are of the decoded bytes.
- **Ids** (account, device, way in, record) are 16 bytes, so 22 characters.
- **Days** are integers: `floor(unix milliseconds / 86 400 000)`. 22 October 2026 is day 20748.
- **Strings** in this document: `"ulune/account/v1/…"` are UTF-8 byte strings, `‖` is concatenation, `HKDF(ikm, salt, info, n)` is HKDF-SHA-256 giving n bytes (or an AES-256-GCM key when no n is given), `AES-GCM(key, iv, aad, plain)` gives the ciphertext followed by its 16-byte tag.

## 3. The keys on the device

Everything in this section happens on the device, with the browser's WebCrypto and @noble's Argon2id. `src/lib/account/keys.ts` implements it.

### 3.1 The data key

The private space's data key **K** (32 random bytes, `src/lib/space/crypto.ts`) opens everything. The account never changes it and never sends it, except wrapped (3.5) or sealed to a new device of the reader's (section 8). Two keys for the account are derived from it, with the account id (16 bytes) as salt:

- the **name key**: `HKDF(K, account, "ulune/account/v1/name-key", 32)`, an HMAC-SHA-256 key;
- the **record key**: `HKDF(K, account, "ulune/account/v1/record-key")`, an AES-256-GCM key.

### 3.2 Record names

The server never sees a record's name (`chart/<id>`, `note/<id>`, `state/library`…). It sees its **rid**: `HMAC-SHA-256(name key, utf8(name))`, first 16 bytes. The same name gives the same rid on every device of the account; the rid says nothing about the name.

### 3.3 Sealed records

A record travels as a **blob**, made so:

1. The envelope `{"n": name, "t": milliseconds when the device wrote it, "v": the record's value}` as UTF-8 JSON.
2. A format byte before it: `1` (the JSON as is) or `2` (the JSON compressed with deflate-raw, `CompressionStream`). Devices should compress: a chart is about 20 KB of JSON and 4 KB compressed.
3. Padding: `0x80`, then `0x00` bytes, up to the bucket's plaintext size, `bucket − 28`, where the bucket is the smallest of **8 192, 16 384, 32 768, 65 536, 131 072 and 262 144 bytes** that holds the record plus at least one padding byte plus 28. A record too big for 262 144 cannot be synced.
4. `blob = iv ‖ AES-GCM(record key, iv, "ulune/account/v1/record/" ‖ account ‖ "/" ‖ rid, padded)`, with a fresh random 12-byte iv (`account` and `rid` in their base64url form).

So a blob's length is exactly one of the six buckets. The server refuses any other length; it cannot check what is inside. A chart and a note are both 8 KiB on the server.

Opening a blob reverses the steps: the tag must verify (a blob moved under another rid or another account fails), the padding is taken off (the last `0x80` and the zeros after it), and a device checks that the rid of `n` is the rid it was stored under.

### 3.4 Device names

A device's name ("Camille’s phone") is sealed too: `iv ‖ AES-GCM(record key, iv, "ulune/account/v1/device-name/" ‖ account ‖ "/" ‖ device, plain)`, where `plain` is the name's UTF-8 bytes (at most 99, cut at a character) padded with `0x80 0x00…` to 100 bytes. Every sealed name is 128 bytes.

### 3.5 Wraps: the data key, locked once per way in

Each way in stores on the server a **wrap**: `iv ‖ AES-GCM(kek, iv, aad, K)`, 60 bytes (the same bytes as WebCrypto's `wrapKey("raw", …)` with AES-GCM gives after the iv), where the key-encryption key `kek` and `aad` are:

| Way in | kek | aad |
| --- | --- | --- |
| Passphrase | `HKDF(master, account, "ulune/account/v1/passphrase/wrap")` | `"ulune/account/v1/wrap/" ‖ account ‖ "/passphrase"` |
| Recovery code | `HKDF(code, account, "ulune/account/v1/recovery/wrap")` | `"ulune/account/v1/wrap/" ‖ account ‖ "/recovery"` |
| Passkey | `HKDF(prf, account, "ulune/account/v1/passkey/wrap/" ‖ credential id)` | `"ulune/account/v1/wrap/" ‖ account ‖ "/passkey/" ‖ credential id` |

(`account` and the credential id in base64url.)

- **Passphrase.** `master = Argon2id(passphrase, salt, m, t, p, 32 bytes)`, the passphrase normalised as the space does (NFKC, spaces at either end removed, at least 12 characters). The salt is 16 random bytes chosen by the device when the passphrase is set; the settings are the space's (m = 19 456 KiB, t = 2, p = 1). The server keeps the salt and the settings, and gives them out before signing in (`passphrase/params`), to anyone who asks about any account (section 4.3).
- **Recovery code.** `code` is the 25 symbols of Crockford's base32 as the space reads them (`parseRecoveryCode`, upper case, 125 random bits).
- **Passkey.** `prf` is the passkey's PRF output (WebAuthn's `prf` extension) for the fixed salt `SHA-256("ulune/account/v1/prf")` = `0fb65ed0 9e6d03c5 e9095191 0eda9126 4545130b f586466f 75522bf5 ed8eea11`. One fixed salt lets a new device ask any of the reader's passkeys for its secret in the same touch that signs in, before anyone knows which account or passkey it is; the secret is still different for every passkey.

### 3.6 Authentication keys

The way in also gives the server something to check, which unlocks nothing:

- passphrase: `authKey = HKDF(master, account, "ulune/account/v1/passphrase/auth", 32)`;
- recovery code: `lookup = HKDF(code, "", "ulune/account/v1/recovery/lookup", 16)` and `authKey = HKDF(code, "", "ulune/account/v1/recovery/auth", 32)`. The lookup finds the account from the code alone (a reader who lost every device has only the code); the code's 125 random bits make both impossible to guess.

The server stores `scrypt(authKey, its own random 16-byte salt, N = 32 768, r = 8, p = 1, 32 bytes)` (Node's built-in scrypt; 32 MiB, about a tenth of a second) and compares in constant time. The authKey is a hash of the same secret the kek comes from, through HKDF with another label: knowing it gives neither the kek nor the passphrase.

### 3.7 Device keys

Each device of the account makes an ECDSA P-256 key pair when it joins: the private half non-extractable in the browser's own storage, the public half (SPKI, 91 bytes) sent to the server. It renews the device's sessions (4.5) and proves the device in a device link (section 8). Signatures are IEEE P1363 (`r ‖ s`, 64 bytes, as WebCrypto makes them) over a context string, a zero byte and the token being signed:

- renewing a session: `"ulune/account/v1/renew" ‖ 0x00 ‖ challenge`;
- taking a device link: `"ulune/account/v1/link-take" ‖ 0x00 ‖ link`.

## 4. Ways in and sessions

### 4.1 Creating an account

1. `account/begin` gives a new account id and a challenge for it.
2. The device builds the first ways in (at least a passkey or a passphrase, and always a recovery code: the same rule as the private space) and its device key, and sends them with `account/create`. For a passkey, it registers one with WebAuthn (4.2) and gets its PRF secret, at once if the authenticator gives it while registering, otherwise with a second touch (`navigator.credentials.get` with that credential and the PRF salt; the server takes no part in that one).
3. The answer is a session token for the new device, fresh (4.5).

### 4.2 Passkeys (WebAuthn)

**Registering** (`account/create`, `ways/add`): `navigator.credentials.create` with

- `challenge`: the challenge from `account/begin` or `ways/begin` (its bytes);
- `rp`: `{ id: rpId, name: "Ulune" }` (`rpId` as the begin answered: the page's host name);
- `user.id`: the account id's 16 bytes, the same for all the account's passkeys (registering a second passkey with the same user id in the same password manager replaces the first there; `ways/begin` lists the account's credentials for `excludeCredentials`);
- `pubKeyCredParams`: ES256 (−7), EdDSA (−8), RS256 (−257);
- `authenticatorSelection`: `{ residentKey: "required", userVerification: "required" }`, `attestation: "none"`;
- `extensions: { prf: { eval: { first: PRF salt } } }`.

The server checks, with WebCrypto only:

- `clientDataJSON`: `type` is `webauthn.create`, `challenge` is the challenge it signed for this purpose and account, unexpired and never used, `origin` is one of Ulune's (15), `crossOrigin` is not true;
- the attestation object (CBOR): format `"none"` with an empty statement. **Only "none" is accepted**: an attestation statement says which make and model of authenticator the reader uses, which Ulune has no reason to know (it identifies people across sites when combined with other data), and checking one means trusting vendors' certificate lists that Ulune has no use for. A passkey is trusted for what it proves (that the same authenticator signs again later), not for who made it;
- the authenticator data: the RP id hash is `SHA-256(rpId)`, user present and user verified are set, a credential is attested; the public key (COSE) is P-256 with ES256, RSA (2048 to 4096 bits) with RS256, or Ed25519 with EdDSA; nothing is left over;
- the credential id (at most 1 023 bytes) is not registered to any account yet.

It stores the credential id, the public key as SPKI, the algorithm and the signature counter. The PRF secret never leaves the device: it only makes the wrap.

**Signing in** (`passkey/begin`, `passkey/finish`): `navigator.credentials.get` with the challenge, `rpId`, `userVerification: "required"`, no `allowCredentials` on a new device (the password manager offers the reader's passkeys for Ulune; a device that knows its account lists its credentials), and `extensions: { prf: { eval: { first: PRF salt } } }`. The server finds the credential by its id and checks `clientDataJSON` (`webauthn.get`, its challenge, origin, not cross-origin), the authenticator data (RP id hash, user present, user verified), the signature over `authenticatorData ‖ SHA-256(clientDataJSON)` (ES256 in DER, RS256, EdDSA), the user handle when the authenticator gives one (it must be the account id), and the counter: if the stored counter or the new one is not zero, the new one must be greater (a clone or a replay otherwise; synced passkeys count nothing and always say 0). The challenge is then spent: a second use fails. The answer holds the account id and this passkey's wrap; the device derives the kek from its PRF secret and opens K.

### 4.3 Passphrase

`passphrase/params` answers the salt and settings for any well-formed account id. For an account that does not exist, or has no passphrase, it answers a made-up salt (an HMAC of the account id with a server secret: the same each time) and the usual settings, so the answer says nothing about whether the account exists. The device then derives `authKey` and sends it with `passphrase/sign-in`. A new device needs the account id with the passphrase, so the device side shows the account id in Settings and beside the recovery code. Finding an account by its passphrase alone would mean one salt for every account, which would let anyone holding a copy of the database try each guessed passphrase against every account at once.

### 4.4 Recovery code

`recovery/sign-in` sends `lookup` and `authKey`; the code alone is enough, on any device.

### 4.5 Sessions

A session token is `0x01 ‖ 0x01 ‖ account ‖ device ‖ expiry ‖ fresh-until ‖ tag` (expiry and fresh-until as unsigned 32-bit seconds since 1970, big-endian; the tag is the first 16 bytes of HMAC-SHA-256 under a key derived from the server's secret, `ACCOUNT_SESSION_SECRET`, section 15). It lasts **one hour** and is bound to the account and the device. The server keeps no list of sessions: each request checks the tag, the expiry and that the device still belongs to the account, so removing a device ends its sessions at once.

- **Renewing.** Before or after a token runs out, the device asks `session/begin` for a challenge and signs it with its device key (`session/renew`): a new token. The private key never leaves the browser, so a stolen token works for an hour at most, and changing the server's secret only makes every device renew.
- **Kept where.** A device keeps its account id, its device id and its device key (non-extractable, in IndexedDB, as the space keeps its own key); the session token stays in the page's memory only, and a reloaded page renews.
- **Fresh sign-ins.** A token made by `account/create` or by a way in (passkey, passphrase, recovery code) is fresh for **five minutes**. Changing the ways in, removing another device and deleting the account need a fresh token: someone who finds a device signed in cannot take the account over. A device that is already signed in proves it again by signing in with its token in the `Authorization` header: the same device gets a fresh token.
- **Challenges** are tokens too (`0x01 ‖ purpose ‖ nonce ‖ expiry ‖ bound ids ‖ tag`): five minutes (fifteen for creating an account), bound to their purpose and, where there is one, to the account and device. They cost the server nothing until used; using one writes its 16-byte nonce with the day, and a second use fails. Spent nonces are deleted after two days, long after the challenge expired.

## 5. Operations

All are `POST /api/account/v1/<operation>`. Ids are base64url (16 bytes) unless said otherwise.

| Operation | Needs | Request | Answer |
| --- | --- | --- | --- |
| `account/begin` | — | `{}` | `{ account, challenge, rpId, ttl }` |
| `account/create` | — | `{ account, challenge, device: { key }, passkey?, passphrase?, recovery }` | `{ account, device, token, ttl, freshFor, ways: [{ id, kind }] }` |
| `account/status` | session | `{}` | `{ account, created, seen, latest, usage: { bytes, records }, quota: { bytes, records } }` |
| `account/delete` | fresh session | `{ confirm: "delete-everything" }` | `{ deleted: true }` |
| `passkey/begin` | — | `{}` | `{ challenge, rpId, ttl }` |
| `passkey/finish` | — (or session: again) | `{ credential: { id, clientDataJSON, authenticatorData, signature, userHandle? }, device?: { key } }` | sign-in answer |
| `passphrase/params` | — | `{ account }` | `{ salt, m, t, p }` |
| `passphrase/sign-in` | — (or session: again) | `{ account, authKey, device?: { key } }` | sign-in answer |
| `recovery/sign-in` | — (or session: again) | `{ lookup, authKey, device?: { key } }` | sign-in answer |
| `session/begin` | — | `{ account, device }` | `{ challenge, ttl }` |
| `session/renew` | device key | `{ account, device, challenge, signature }` | `{ token, ttl }` |
| `ways/list` | session | `{}` | `{ ways: [{ id, kind, created, used, credential? }] }` |
| `ways/begin` | session | `{}` | `{ challenge, rpId, ttl, exclude: [credential ids] }` |
| `ways/add` | fresh session | `{ challenge, passkey }`, `{ passphrase }` or `{ recovery }` | `{ way: { id, kind } }` |
| `ways/remove` | fresh session | `{ way }` | `{}` |
| `devices/list` | session | `{}` | `{ devices: [{ id, name, created, seen, current }] }` |
| `devices/rename` | session | `{ device, name }` | `{}` |
| `devices/remove` | session (fresh for another device) | `{ device }` | `{}` |
| `records/put` | session | `{ puts: [{ rid, base, blob } or { rid, base, deleted: true }] }` | `{ applied: [{ rid, version }], conflicts: [{ rid, version, blob? , deleted? }] }` |
| `records/changes` | session | `{ cursor, limit? }` | `{ changes: [{ rid, version, blob } or { rid, version, deleted: true }], cursor, more, reset? }` |
| `link/open` | — or session | `{ epk, device?: { key } }` | `{ link, ttl }` |
| `link/join` | — or session | `{ link, epk, device?: { key } }` | `{ peer }` |
| `link/state` | — | `{ link }` | `{ state, giver?, taker? }` |
| `link/give` | session | `{ link, sealed }` | `{ device }` |
| `link/take` | device key | `{ link, signature }` | `{ account, device, sealed, token, ttl }` |
| `link/close` | — | `{ link }` | `{}` |

The parts:

- **Ways in, as sent:**
  - `passkey`: `{ credential: { id, clientDataJSON, attestationObject }, wrap }`;
  - `passphrase`: `{ salt (16 bytes), m, t, p, authKey (32), wrap }`, with 19 456 ≤ m ≤ 262 144, 2 ≤ t ≤ 16, 1 ≤ p ≤ 8;
  - `recovery`: `{ lookup (16), authKey (32), wrap }`;
  - every `wrap` is 40 to 256 bytes (60 as section 3.5 makes it).
- **Device:** `{ key }`, the device key's public half, SPKI (section 3.7). When a sign-in carries no session, it must carry `device`: the device joins the account and gets its id.
- **The sign-in answer:** `{ account, device, token, ttl, freshFor, way: { id, kind, wrap } }`, the wrap of the way just used.
- **Tokens and times:** `token` is the session (bearer); `ttl` and `freshFor` are seconds; `created`, `seen` and `used` are days; `latest` is the account's latest version.
- **`credential`** (in `ways/list`) is a passkey's credential id, for `allowCredentials`. **`name`** (in `devices/*`) is 128 sealed bytes (3.4) or `null` until a device names itself. **`current`** marks the device asking.
- `ways/add` with a passphrase or a recovery code **replaces** the one there; passkeys are added (at most ten). `ways/remove` never removes the recovery code (it can only be replaced) nor the last passkey or passphrase.
- `devices/remove` of the device asking is signing out.
- Removing a way in or a device that is already gone answers `{}`: it is done.
- `passphrase/sign-in`, `recovery/sign-in` and `passkey/finish` sent with a session (`Authorization`) sign the same device in again, fresh, without `device`; the way in must be of the session's account.

## 6. Records and sync

- **Versions.** Each account has a counter. Every record written takes the next value as its version, so versions only grow, across all the account's records. Writes to one account are applied one batch at a time (a lock on the account), so a version never appears after a larger one.
- **Writing** (`records/put`, at most 64 records and 640 KiB of blobs a batch). Each put names the version the device last saw for that record, `base` (0 for a record it believes new). The server applies a put only if the record's version is still `base` (a record never written, or purged, has version 0). The puts that apply get their new versions in `applied`; the others come back in `conflicts` with the server's version and its blob (or `deleted: true`, or neither when the record does not exist). The device opens the server's version, merges, and puts again with that version as `base`. The puts of a batch that can apply are applied in one transaction; if they would take the account over its quota, none is (507).
- **Deleting** a record is a put with `deleted: true`: the record becomes a **tombstone** (no blob), so the other devices learn of it. Tombstones are purged 90 days after they were written, and beyond the 5 000 newest of an account.
- **Reading** (`records/changes`). `cursor` is the last version the device has seen (0 the first time). The answer lists the records written after it, in version order, at most `limit` (1 to 200, 100 by default) and about 640 KiB of blobs (a page ends before the first record that starts past 640 KiB, and always holds at least one), with the new `cursor` (the last version in the page, or the cursor sent when there is nothing new); `more: true` says to ask again at once. With cursor 0, only live records come (no tombstones): a full listing.
- **Reset.** When tombstones the device has not seen may have been purged (its cursor is older than the account's purge mark), the answer is `{ reset: true, changes: [], cursor: 0, more: true }`. The device then lists everything from cursor 0, and every record it holds from an earlier sync that is not in the listing was deleted elsewhere.
- **A batch lost on the way** (the network failed after sending): the device sends it again; a conflict whose blob is the one it sent means the first attempt applied.

**What devices do (guidance for the device side; the server does not depend on it).** Ulune's own device side is `src/lib/account/client/` (`merge.ts` the rules below, `engine.ts` a round of sync, `runner.ts` when it runs), held to them by `scripts/account-client.test.mjs` and `scripts/e2e/sync.mjs`:

- Sync everything in the space except what belongs to one device: `sys/check`, `view/first`, `inbox/key`, `state/backup`, the AI keys `state/ai` (never synced: the owner's decision), the partners and Compare as left on that device (`state/pair`, `state/compare`), the encyclopedia's pages read (`enc/recent`) and the device's own sync state (`sync/…`). The space's description travels too, as the record `space/ways`: its id, its passkeys' user and its ways in, wrapped (lib/space/crypto.ts), so the same passphrase, passkeys and recovery code open the space on every device.
- The latest write wins for a record (by the envelope's `t`, checked on the device: a server that offered an older blob in place of a newer one is ignored, and the device's copy is sent again); a device never writes a `t` earlier than the copy it replaces, so a clock behind still writes after what it saw. A change beats a deletion: a record changed on one device and deleted on another comes back. Lists (the library's order, the groups, the homes, the bookmarks, the ways in) are merged item by item against the copy both devices started from, which the device keeps: an item added on either side stays, an item deleted on one side and unchanged on the other goes (a deleted group stays deleted), a name changed on one side wins; what belongs to one device inside a list (the chart open, the home open) stays that device's.
- Ask for changes when Ulune opens or comes back into view, after writing, and at most every 30 seconds while in view (Ulune: every two minutes); send changes a couple of seconds after they are made; wait as `Retry-After` says after a 429 or a 503.
- On screen, the account id is the same 16 bytes in Crockford's base32 in groups of four (`8D4Q-X3K2-…`), read back in either spelling.

## 7. Devices

- A device joins by creating the account, by signing in with a way in, or through a device link (section 8). It then names itself (`devices/rename`, sealed).
- `devices/list` shows each device's sealed name, the day it joined and the day it was last seen, so the reader can tell an old one and remove it.
- An account has at most **30 devices**. When one more joins a full account, the device seen longest ago leaves (it signs in again if it comes back).
- Removing a device ends its sessions at once and forgets its key. It does not take back what the device already holds: on a lost phone, the space is still sealed by its lock and its ways in.

## 8. Adding a device by QR code

A device already signed in (the **giver**) hands the data key to a new device (the **taker**) through a short-lived mailbox on the server, sealed so the server cannot open it, and confirmed by a code the reader compares on both screens.

1. One side **opens** the mailbox with a fresh ECDH P-256 key, `epk` (65 bytes, uncompressed): the giver with its session, or the taker with `device: { key }`, its new device key. The answer is a `link` token valid for **ten minutes**.
2. That side shows a QR code with the link and its own epk: `https://ulune.app/link#<base64url(link ‖ epk)>`. The camera of the other device opens it in Ulune. Whichever device has the camera scans: a signed-in computer shows its code to a new phone, a new computer shows its code to a signed-in phone.
3. The other side **joins** with its own epk (and `device`, if it is the taker), and gets the opener's epk as the server has it: if it is not the one in the QR code, it stops. The opener learns the joiner's epk from `link/state`.
4. Both compute the ECDH secret `Z` and the transcript `T = giver's epk ‖ taker's epk`, then
   - the **code**: `HKDF(Z, link id, "ulune/account/v1/link/code" ‖ T, 4)` read as a big-endian number, modulo 1 000 000, shown as six digits (`123 456`);
   - the **key**: `HKDF(Z, link id, "ulune/account/v1/link/key" ‖ T)`, AES-256-GCM.

   (The link id is the 16-byte nonce inside the link token, its bytes 2 to 17.) Each screen shows its code and asks "Same code on both screens?"; each side goes on only after its own Yes.
5. The giver **gives**: `sealed = iv ‖ AES-GCM(key, iv, "ulune/account/v1/link/" ‖ link id in base64url, payload)`, the payload being `{"v":1,"account":"<id>","key":"<K in base64url>"}` (64 to 2 048 bytes in all). The server adds the taker's device key to the giver's account and keeps the sealed payload.
6. The taker **takes** with a signature by its device key (3.7). The answer is the account id, its device id, the sealed payload and a session token; the mailbox is deleted. The taker checks that the payload's account is the one in the answer.

Either side may **close** the mailbox; it also goes when it expires (and from the database the next day). A mailbox is joined once, given once and taken once.

Why the code: the epk in the QR code reaches the scanning device untouched, but the scanning device's epk reaches the opener through the server. A server that put its own key there would share one secret with each device, and the two codes would differ. It cannot choose its key so that the codes agree, because it never learns the code on the screen it did not reach: one in a million, each time the reader looks.

## 9. Deleting

- **Delete everything** (`account/delete`, fresh session, `confirm: "delete-everything"`): the account, its ways in, devices, records, tombstones and open device links are deleted at once, in one transaction. There is no undo and no copy kept; the devices keep their own private space.
- **Unused for two years** (decision A3, stated in the terms): an account whose devices have not been seen for 730 days is deleted by the daily clean-up. Without an email it cannot be announced; the app says so and shows the rule.
- **The daily clean-up** (`GET /api/account/cleanup`, at 03:17 UTC, sent by Vercel's scheduler with `Authorization: Bearer <CRON_SECRET>`; refused without the secret, and never run when none is set) also purges tombstones older than 90 days, spent challenges older than two days and device links older than a day. It answers counts only.
- **Kept for how long:** a record until it is deleted or replaced (a replaced blob is overwritten, not kept); a tombstone 90 days; a spent challenge two days; a device link until taken or closed, at most a day; the account until it is deleted or unused for two years.

## 10. Limits and abuse

| Limit | Value |
| --- | --- |
| Records of an account (live) | 2 000 |
| Blob bytes of an account (live) | 16 MiB (16 777 216) |
| Tombstones of an account | 5 000 (older ones purged) |
| Blob sizes | 8, 16, 32, 64, 128, 256 KiB exactly |
| A `records/put` batch | 64 records, 640 KiB of blobs, a 1 MiB body |
| A `records/changes` page | 200 records, 640 KiB of blobs |
| Other bodies | 64 KiB |
| Passkeys / passphrase / recovery codes | 10 / 1 / 1 |
| Devices | 30 (the device seen longest ago leaves) |
| New accounts, whole server | 1 000 a day |

**Rate limits** are counted in the server's memory, per account and per address, and never stored. On Vercel each function instance counts on its own and forgets when it stops, so they are best effort: the firewall below is the real limit.

| What | Limit (per instance) |
| --- | --- |
| Any operation, per address | 240 a minute |
| Signing in (`passkey/finish`, `passphrase/sign-in`, `recovery/sign-in`, `session/renew`, `link/take`), per address | 30 in 5 minutes |
| Failed sign-ins, per account or recovery lookup | 10 in 15 minutes |
| `account/begin` and `account/create`, per address | 20 an hour |
| `link/open` and `link/join`, per address | 30 in 10 minutes |
| `records/put`, per account | 120 a minute |
| `records/changes` and `account/status`, per account | 240 a minute |

Addresses are hashed in memory with a key the instance makes when it starts; the hash is forgotten with the counter. Nothing about an address is written anywhere by Ulune.

**Vercel Firewall rules to add for production** (not created yet; section 15):

1. Rate limit `/api/account/v1/` (path starts with), 120 requests per 60 seconds per IP, then deny (429).
2. Rate limit the sign-in paths (`/api/account/v1/passkey/finish`, `/api/account/v1/passphrase/sign-in`, `/api/account/v1/recovery/sign-in`, `/api/account/v1/session/renew`, `/api/account/v1/link/take`), 20 per 60 seconds per IP, deny.
3. Rate limit `/api/account/v1/account/begin` and `/api/account/v1/account/create`, 10 per 10 minutes per IP, deny.
4. Rate limit `/api/account/v1/link/` (starts with), 30 per 60 seconds per IP, deny.
5. Deny `/api/account/cleanup` unless the request comes from Vercel's cron (user agent `vercel-cron/1.0`); the secret is checked anyway.

Other defences: every comparison of a secret is constant-time; a failed sign-in takes as long whether the account exists or not (the server hashes the key against a stand-in); every failure to sign in is the same `401 denied`.

## 11. Errors

Every error is a status and exactly `{"error":"<code>"}`:

| Status | Code | When |
| --- | --- | --- |
| 400 | `bad-request` | Not JSON, not an object, a field unknown, missing or outside its rules (lengths, encodings, sizes, a blob not of a bucket's size), a query string, a body that is not `application/json`. Every operation answers garbage this way. |
| 401 | `denied` | No session, or one that is wrong, expired or whose device was removed; a sign-in that failed for any reason (no such account, credential or lookup; a wrong key; a bad signature; a challenge wrong, expired or spent; a counter that went back). One answer for all, so it says nothing about what exists. |
| 403 | `fresh-sign-in` | The operation needs a sign-in from the last five minutes. |
| 403 | `cross-site` | The browser says the request came from another site's page. |
| 404 | `not-found` | No such operation. |
| 405 | `method` | Not a POST (`Allow: POST`). |
| 409 | `conflict` | The state does not allow it: a passkey already registered, a device to rename that is not in the account, a link already joined, not given yet, or opened by the other kind of device. |
| 409 | `last-way-in` | It would remove the recovery code or the last passkey or passphrase. |
| 409 | `limit` | Ten passkeys already. |
| 410 | `gone` | The device link expired, was used, or never was. |
| 413 | `too-large` | The body is over its limit. |
| 429 | `slow-down` | Too many requests; `Retry-After` says when to try again. |
| 503 | `unavailable` | Accounts are not set up on this server, or its database cannot be reached; `Retry-After`. |
| 507 | `quota` | The account's records or bytes would go over its quota; nothing in the batch was applied. |

## 12. Versions

- **This is version 1**: its addresses start with `/api/account/v1/`. A change older devices could not follow will be version 2, at `/api/account/v2/`, both served while devices move over.
- The cryptography is versioned by its labels (`ulune/account/v1/…`) and the tokens by their first byte; a record's format byte leaves room for new encodings; a new wrap or record format comes with a new label, never by changing the meaning of an old one.
- The database changes only by new numbered files in `db/migrations/`, applied in order and never edited once applied.
- Not in version 1, and possible later without breaking it: changing the data key (re-sealing every record), an optional email for notices only (it could never recover data), and a proof of work for creating accounts.

## 13. What the server stores

The schema is `db/migrations/0001_accounts.sql`. In full:

| Table | Columns |
| --- | --- |
| `accounts` | id (16 random bytes), created day, last-seen day, the version counter, the purge mark, live bytes and records, quotas |
| `ways` | account, way id, kind (passkey, passphrase, recovery), for a passkey its credential id, public key (SPKI), algorithm and counter; for a passphrase the device's Argon2id salt and settings; for a passphrase or a recovery code the lookup (recovery), the server's salt and the scrypt hash; the wrap; created and last-used days |
| `devices` | account, device id (16 random bytes), the device key's public half (SPKI), the sealed name (128 bytes or none), created and last-seen days |
| `records` | account, rid (16 bytes), version, deleted or not, the blob (a bucket's size), its size, the day it changed |
| `spent` | a used challenge's 16-byte nonce, the day |
| `links` | link id, the day, who opened it, the giver's account once known, the two epks, the taker's device key, the sealed payload, the new device's id |

**Never stored:** names of people or devices in clear, birth dates, times or places, notes, groups, record names, passphrases, recovery codes, PRF secrets, the data key or anything derived from it, authentication keys (only their scrypt hashes), IP addresses, user agents, times of day, request logs. Nothing about a request is written to the server's log either; a database failure logs its error class only.

## 14. Threat model

**Someone with a full copy of the database** (every table, every backup) learns:

- that each account exists, the day it was created and the day it was last seen;
- how many devices it has and when each joined and was last seen (not their names); how many passkeys, and whether it has a passphrase;
- how many records it has (live, and deleted in the last 90 days), each one's size bucket, the order they were written in and the day each changed;
- the passkeys' public keys and credential ids, which sign nothing and open nothing.

They do not learn any chart, name, birth date, time, place, note, group, device name or record name. To read anything they must guess a passphrase: the passphrase's wrap and its Argon2id salt are in the copy, so they can try passphrases offline, each guess costing an Argon2id run of 19 MiB. A long passphrase (four or more random words) makes that hopeless; the recovery code (125 random bits) and the passkeys' secrets (held by the authenticators) cannot be guessed.

**Ulune's server itself, turned malicious** (an insider, or an attacker who controls it), can do more than read the database:

- **Send different app code.** A web app is code sent by the server at each visit, so a compromised server could send code that reads the key when the reader unlocks. This is the limit of every web app with end-to-end encryption; the code is public so anyone can compare, and the service worker keeps each version and is to warn when the app's code changes outside a release.
- **Withhold or roll back** records: it can leave out a change or offer an older blob for a record (it cannot make a blob, change one, or move one to another record or account: the tag fails). Devices keep the newer copy by the envelope's time, and a record they hold is not deleted by a listing that merely leaves it out unless their cursor was reset.
- **Try to get in the middle of a device link:** the six-digit codes stop it (section 8).
- **See activity:** when each account syncs, from which addresses (Vercel's request logs keep IP addresses for a short time, outside Ulune's control; Ulune's own code keeps none), and how many records change.
- **Lock a reader out or delete their data**: the reader's devices keep their own copy.

**Someone on the network** sees TLS traffic to ulune.app: its timing and sizes, nothing else.

**Someone with one of the reader's devices** has what that device holds: the space is sealed when locked; while it stays signed in on that device, it is as open as the device. The reader removes the device from another one, which ends its access to the account; it cannot take back what the device already held.

**Known limits of version 1:** no change of the data key (a device that was removed keeps K; a new K would mean re-sealing every record); rate limits are per instance (the firewall is the real one); the server sees record counts and sizes in buckets; `passphrase/params` answers any account id alike only while devices use the space's own Argon2id settings (an account set up with others would stand out), and an account id lets anyone try passphrases online, slowly (the rate limits), so an account id shown on a screen is still best kept private.

## 15. Running it

**Production needs, in this order** (done for ulune.app on 27 October 2026; sync went live with Ulune 2.0.3):

1. **The database:** in Vercel's Marketplace, a Neon Postgres database in **Frankfurt (AWS eu-central-1)**, connected to the Ulune project with the environment variable prefix `ACCOUNT_` (so it sets `ACCOUNT_DATABASE_URL`). The prototype's old database stays apart (and is still to delete).
2. **The tables:** run `db/migrations/0001_accounts.sql` once, either pasted into Neon's SQL editor or with `ACCOUNT_DATABASE_URL=… npm run account:migrate` from a computer with the repository.
3. **Environment variables** in the Vercel project (Production; Preview only if previews should sync, with a database of their own):
   - `ACCOUNT_DATABASE_URL`: set by the integration;
   - `ACCOUNT_SESSION_SECRET`: 32 random bytes, `openssl rand -base64 32`; marked Sensitive;
   - `CRON_SECRET`: another 32 random bytes; Vercel sends it with the daily clean-up;
   - `ACCOUNT_ORIGINS` (optional): the pages allowed to use passkeys, comma-separated; by default `https://ulune.app` in production, the preview's own address on a preview.
4. **Firewall:** the five rules of section 10.
5. **The documents:** the privacy notice, the legal notice and the terms already describe the account (the two-year rule, Frankfurt, what the server holds, Vercel's logs), saying it isn't available yet (2.0's release, `src/lib/legal`): at launch they drop "not available yet" and take a new date, and What's new takes the lines held back in `src/lib/changes-sync-draft.ts`, with the version that turns sync on.

The build already asks Vercel for the rest: the account's functions in Frankfurt (`vite.config.ts`, `vercel.functionRules`, region `fra1`) and the daily clean-up (`vercel.config.crons`). Without `ACCOUNT_DATABASE_URL` and `ACCOUNT_SESSION_SECRET`, production answers every account operation `503 unavailable` (after checking the request's shape) and nothing else changes.

**Before the database exists**, the app says so instead of offering what would fail: where it offers the account (the private space's choice when it is made, Settings' sync part, a new device signing in), it first sends `passkey/begin` with an empty body, once a visit (`src/lib/account/client/available.ts`). A 503 `unavailable` (with `Retry-After: 3600`) or no account route at all means "not set up": the choice of where the space is kept is not shown, Settings says sync is "not available yet" with nothing to press, and a new device is told so plainly, a sealed file from the other device still bringing its space. Offline, or a passing trouble, the account is offered as before and asked about again next time. `ULUNE_ACCOUNT_STORE=none` turns accounts off on any server, whatever else is set (`ULUNE_ACCOUNT_STORE=none npm run dev`; `scripts/e2e/sync-unavailable.mjs` checks the app this way, and against the production build with no variables at all).

**On a developer's computer**, `npm run dev` keeps accounts in `.data/account-store.json` and makes a session secret in `.env.local` the first time (both ignored by git). Passkeys need `http://localhost:8097` (WebAuthn does not accept an IP address such as 127.0.0.1 as an RP id). `.env.example` lists the variables.

**Tests:** `scripts/account-*.test.mjs` run in `npm run test:unit`; the store's tests also run against a real Postgres when one is installed (`initdb` on the PATH or in `/usr/lib/postgresql`), through a stand-in for Neon's HTTP endpoint, and say so when they skip it. `npm run check:deploy` posts garbage to every operation of the built server and checks the one uniform answer, then creates, uses and deletes an account.
