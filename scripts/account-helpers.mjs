// Helpers for the synced account's tests (scripts/account-*.test.mjs; docs/sync-protocol.md): a
// CBOR writer, a software authenticator that makes passkeys with WebCrypto (ES256, RS256, EdDSA)
// and signs as a real one would, a way to call the service as a page does, and a device that uses
// the device side's own cryptography (src/lib/account/keys.ts). Nothing here reaches a network.
import { webcrypto } from "node:crypto";
import { b64u, concat, fromB64u, randomBytes, utf8 } from "../src/lib/account/encoding.ts";
import {
  linkQr,
  linkSecrets,
  newDeviceKey,
  newLinkKey,
  openLinkPayload,
  passkeyKek,
  passphraseSecrets,
  readLinkQr,
  recoveryKek,
  recoverySecrets,
  sealDeviceName,
  sealLinkPayload,
  sealRecord,
  recordId,
  signWithDevice,
  syncKeys,
  wrapAad,
  wrapDataKey,
} from "../src/lib/account/keys.ts";
import { ARGON_DEFAULT, BUCKETS } from "../src/lib/account/protocol.ts";

const subtle = webcrypto.subtle;
export const ORIGIN = "http://localhost:8097";
export const RP_ID = "localhost";

/* ------------------------------------------------------------ CBOR, written */

export function cbor(value) {
  const out = [];
  const head = (major, n) => {
    if (n < 24) out.push((major << 5) | n);
    else if (n < 256) out.push((major << 5) | 24, n);
    else if (n < 65536) out.push((major << 5) | 25, n >> 8, n & 255);
    else out.push((major << 5) | 26, (n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255);
  };
  const enc = (v) => {
    if (typeof v === "number") {
      if (v >= 0) head(0, v);
      else head(1, -1 - v);
    } else if (v instanceof Uint8Array) {
      head(2, v.length);
      for (const b of v) out.push(b);
    } else if (typeof v === "string") {
      const b = utf8(v);
      head(3, b.length);
      for (const x of b) out.push(x);
    } else if (Array.isArray(v)) {
      head(4, v.length);
      v.forEach(enc);
    } else if (v instanceof Map) {
      head(5, v.size);
      for (const [k, x] of v) {
        enc(k);
        enc(x);
      }
    } else if (v === false) out.push(0xf4);
    else if (v === true) out.push(0xf5);
    else if (v === null) out.push(0xf6);
    else throw new Error(`cbor: ${typeof v}`);
  };
  enc(value);
  return new Uint8Array(out);
}

/* ------------------------------------------------------------ a software authenticator */

export async function sha256(bytes) {
  return new Uint8Array(await subtle.digest("SHA-256", bytes));
}

const u32 = (n) => new Uint8Array([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]);
const u16 = (n) => new Uint8Array([(n >> 8) & 255, n & 255]);

/** WebCrypto's ECDSA signature (r ‖ s) as WebAuthn sends it: DER. */
export function p1363ToDer(sig) {
  const int = (b) => {
    let i = 0;
    while (i < b.length - 1 && b[i] === 0) i += 1;
    let v = b.slice(i);
    if (v[0] & 0x80) v = concat(new Uint8Array([0]), v);
    return concat(new Uint8Array([0x02, v.length]), v);
  };
  const r = int(sig.slice(0, 32));
  const s = int(sig.slice(32));
  return concat(new Uint8Array([0x30, r.length + s.length]), r, s);
}

export const FLAGS = { UP: 0x01, UV: 0x04, BE: 0x08, BS: 0x10, AT: 0x40, ED: 0x80 };

/**
 * A passkey made in software: `register` answers navigator.credentials.create's result for a
 * challenge, `assert` navigator.credentials.get's. `prf` is its PRF secret for the fixed salt.
 */
export async function makeAuthenticator({ alg = -7, origin = ORIGIN, rpId = RP_ID, counting = false } = {}) {
  let pair;
  let cose;
  if (alg === -7) {
    pair = await subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
    const jwk = await subtle.exportKey("jwk", pair.publicKey);
    cose = new Map([
      [1, 2],
      [3, -7],
      [-1, 1],
      [-2, fromB64u(jwk.x)],
      [-3, fromB64u(jwk.y)],
    ]);
  } else if (alg === -257) {
    pair = await subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, [
      "sign",
      "verify",
    ]);
    const jwk = await subtle.exportKey("jwk", pair.publicKey);
    cose = new Map([
      [1, 3],
      [3, -257],
      [-1, fromB64u(jwk.n)],
      [-2, fromB64u(jwk.e)],
    ]);
  } else if (alg === -8) {
    pair = await subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
    const jwk = await subtle.exportKey("jwk", pair.publicKey);
    cose = new Map([
      [1, 1],
      [3, -8],
      [-1, 6],
      [-2, fromB64u(jwk.x)],
    ]);
  } else throw new Error(`alg ${alg}`);

  const credentialId = randomBytes(32);
  const auth = {
    alg,
    credentialId,
    id: b64u(credentialId),
    counter: 0,
    prf: randomBytes(32),
    cose,

    async register(challenge, options = {}) {
      const {
        fmt = "none",
        attStmt = new Map(),
        flags = FLAGS.UP | FLAGS.UV | FLAGS.AT,
        rp = rpId,
        from = origin,
        type = "webauthn.create",
        crossOrigin = false,
        extra = new Uint8Array(0),
        key = cose,
      } = options;
      const clientDataJSON = utf8(JSON.stringify({ type, challenge, origin: from, crossOrigin }));
      const authData = concat(await sha256(utf8(rp)), new Uint8Array([flags]), u32(auth.counter), new Uint8Array(16), u16(credentialId.length), credentialId, cbor(key), extra);
      const attestationObject = cbor(new Map([["fmt", fmt], ["attStmt", attStmt], ["authData", authData]]));
      return { id: b64u(credentialId), clientDataJSON: b64u(clientDataJSON), attestationObject: b64u(attestationObject) };
    },

    async assert(challenge, options = {}) {
      const { flags = FLAGS.UP | FLAGS.UV, rp = rpId, from = origin, type = "webauthn.get", userHandle, counter, tamper = false } = options;
      if (counting) auth.counter += 1;
      const clientDataJSON = utf8(JSON.stringify({ type, challenge, origin: from, crossOrigin: false }));
      const authData = concat(await sha256(utf8(rp)), new Uint8Array([flags]), u32(counter ?? auth.counter));
      const signed = concat(authData, await sha256(clientDataJSON));
      let signature;
      if (alg === -7) signature = p1363ToDer(new Uint8Array(await subtle.sign({ name: "ECDSA", hash: "SHA-256" }, pair.privateKey, signed)));
      else if (alg === -257) signature = new Uint8Array(await subtle.sign({ name: "RSASSA-PKCS1-v1_5" }, pair.privateKey, signed));
      else signature = new Uint8Array(await subtle.sign({ name: "Ed25519" }, pair.privateKey, signed));
      if (tamper) signature[signature.length - 5] ^= 1;
      return {
        id: b64u(credentialId),
        clientDataJSON: b64u(clientDataJSON),
        authenticatorData: b64u(authData),
        signature: b64u(signature),
        ...(userHandle ? { userHandle } : {}),
      };
    },
  };
  return auth;
}

/* ------------------------------------------------------------ calling the service */

/** One request as a page sends it; the answer's status and JSON. */
export async function call(service, op, body, options = {}) {
  const headers = {
    "content-type": "application/json",
    "x-forwarded-for": options.ip ?? "203.0.113.7",
    "user-agent": "Mozilla/5.0 (TestAgent 1.0)",
    "sec-fetch-site": "same-origin",
    origin: ORIGIN,
    ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
    ...options.headers,
  };
  const request = new Request(`${ORIGIN}/api/account/v1/${op}${options.query ?? ""}`, {
    method: options.method ?? "POST",
    headers,
    body: options.method && options.method !== "POST" ? undefined : (options.raw ?? JSON.stringify(body)),
  });
  const res = await service.handle(op, request);
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* not JSON */
  }
  return { status: res.status, body: json, text, headers: res.headers };
}

/* ------------------------------------------------------------ a device */

/** 32 bytes standing in for the private space's data key. */
export function newDataKey() {
  return randomBytes(32);
}

/** A recovery code as the space makes them (25 Crockford symbols). */
export function newCode() {
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  const bytes = randomBytes(25);
  return [...bytes].map((b) => alphabet[b & 31]).join("");
}

/**
 * A device that creates an account with a passphrase (and a passkey, when given one) and the
 * recovery code, as the device side will: everything derived and sealed with keys.ts.
 * `fast`: the passphrase's Argon2id is skipped (random keys the server cannot tell apart).
 */
export async function createAccount(service, options = {}) {
  const { passphrase = "correct horse battery staple", dataKey = newDataKey(), code = newCode(), authenticator = null, ip, fast = false, withPassphrase = true } = options;
  const begin = await call(service, "account/begin", {}, { ip });
  if (begin.status !== 200) throw new Error(`begin ${begin.status} ${begin.text}`);
  const { account, challenge } = begin.body;
  const body = { account, challenge };
  const device = await newDeviceKey();
  body.device = { key: b64u(device.publicKey) };
  let salt = null;
  if (withPassphrase) {
    salt = randomBytes(16);
    const { authKey, kek } = fast
      ? { authKey: randomBytes(32), kek: await subtle.importKey("raw", randomBytes(32), "AES-GCM", false, ["encrypt", "decrypt"]) }
      : await passphraseSecrets(passphrase, account, salt);
    body.passphrase = { salt: b64u(salt), ...ARGON_DEFAULT, authKey: b64u(authKey), wrap: b64u(await wrapDataKey(dataKey, kek, wrapAad(account, "passphrase"))) };
    if (fast) body._authKey = authKey;
  }
  if (authenticator) {
    const credential = await authenticator.register(challenge);
    const kek = await passkeyKek(authenticator.prf, account, authenticator.id);
    body.passkey = { credential, wrap: b64u(await wrapDataKey(dataKey, kek, wrapAad(account, "passkey", authenticator.id))) };
  }
  const rec = await recoverySecrets(code);
  body.recovery = { lookup: b64u(rec.lookup), authKey: b64u(rec.authKey), wrap: b64u(await wrapDataKey(dataKey, await recoveryKek(code, account), wrapAad(account, "recovery"))) };
  const fastKey = body._authKey;
  delete body._authKey;
  const res = await call(service, "account/create", body, { ip });
  if (res.status !== 200) throw new Error(`create ${res.status} ${res.text}`);
  return {
    account,
    device: res.body.device,
    token: res.body.token,
    deviceKey: device.privateKey,
    devicePublic: device.publicKey,
    dataKey,
    code,
    passphrase,
    salt,
    fastAuthKey: fastKey ?? null,
    keys: await syncKeys(dataKey, account),
    sent: body,
    answer: res.body,
  };
}

/** A new device key, and a session renewed with it. */
export async function renew(service, who) {
  const begin = await call(service, "session/begin", { account: who.account, device: who.device });
  const signature = await signWithDevice(who.deviceKey, "renew", begin.body.challenge);
  return await call(service, "session/renew", { account: who.account, device: who.device, challenge: begin.body.challenge, signature });
}

/** A record sealed for the account, as a put. */
export async function sealedPut(who, name, value, base = 0, t = Date.now()) {
  const rid = await recordId(who.keys, name);
  const blob = await sealRecord(who.keys, rid, { n: name, t, v: value });
  return { rid, base, blob: b64u(blob) };
}

/* ------------------------------------------------------------ adding a device by QR code */

/**
 * A device added through a device link (docs/sync-protocol.md, section 8), as the two devices do
 * it: `opener` "giver" (the signed-in device shows the QR code) or "taker" (the new one does). Both
 * codes are compared before the giver gives; the taker checks the payload's account.
 */
export async function linkDevice(service, giver, { opener = "giver", ip } = {}) {
  const takerDevice = await newDeviceKey();
  const g = await newLinkKey();
  const t = await newLinkKey();
  let link;
  let giverCode;
  let takerCode;
  let takerKey;
  let giverKey;
  if (opener === "giver") {
    const open = await call(service, "link/open", { epk: b64u(g.epk) }, { token: giver.token, ip });
    if (open.status !== 200) throw new Error(`open ${open.status} ${open.text}`);
    const qr = readLinkQr(linkQr(open.body.link, g.epk));
    link = qr.link;
    const join = await call(service, "link/join", { link, epk: b64u(t.epk), device: { key: b64u(takerDevice.publicKey) } }, { ip });
    if (join.status !== 200 || join.body.peer !== b64u(qr.epk)) throw new Error(`join ${join.status} ${join.text}`);
    ({ code: takerCode, key: takerKey } = await linkSecrets(t.privateKey, qr.epk, link, qr.epk, t.epk));
    const state = await call(service, "link/state", { link }, { ip });
    const seen = fromB64u(state.body.taker);
    ({ code: giverCode, key: giverKey } = await linkSecrets(g.privateKey, seen, link, g.epk, seen));
  } else {
    const open = await call(service, "link/open", { epk: b64u(t.epk), device: { key: b64u(takerDevice.publicKey) } }, { ip });
    if (open.status !== 200) throw new Error(`open ${open.status} ${open.text}`);
    const qr = readLinkQr(linkQr(open.body.link, t.epk));
    link = qr.link;
    const join = await call(service, "link/join", { link, epk: b64u(g.epk) }, { token: giver.token, ip });
    if (join.status !== 200 || join.body.peer !== b64u(qr.epk)) throw new Error(`join ${join.status} ${join.text}`);
    ({ code: giverCode, key: giverKey } = await linkSecrets(g.privateKey, qr.epk, link, g.epk, qr.epk));
    const state = await call(service, "link/state", { link }, { ip });
    const seen = fromB64u(state.body.giver);
    ({ code: takerCode, key: takerKey } = await linkSecrets(t.privateKey, seen, link, seen, t.epk));
  }
  if (giverCode !== takerCode) throw new Error("the codes differ");
  const sealed = await sealLinkPayload(giverKey, link, { v: 1, account: giver.account, key: b64u(giver.dataKey) });
  const give = await call(service, "link/give", { link, sealed: b64u(sealed) }, { token: giver.token, ip });
  if (give.status !== 200) throw new Error(`give ${give.status} ${give.text}`);
  const signature = await signWithDevice(takerDevice.privateKey, "link-take", link);
  const take = await call(service, "link/take", { link, signature }, { ip });
  if (take.status !== 200) throw new Error(`take ${take.status} ${take.text}`);
  const payload = await openLinkPayload(takerKey, link, fromB64u(take.body.sealed));
  if (payload.account !== take.body.account) throw new Error("the payload names another account");
  const dataKey = fromB64u(payload.key);
  return {
    account: take.body.account,
    device: take.body.device,
    token: take.body.token,
    deviceKey: takerDevice.privateKey,
    dataKey,
    keys: await syncKeys(dataKey, take.body.account),
    code: giverCode,
    link,
  };
}

/* ------------------------------------------------------------ a realistic session, and what a thief would find */

/** The test fixtures (scripts/e2e/_lib.mjs, FIXTURE_A and FIXTURE_B): never anyone's real birth. */
export const PEOPLE = [
  { id: "fixture-a", input: { name: "TraceQA", date: "15/06/1990", time: "12:00", placeLabel: "Paris, France", latitude: 48.8566, longitude: 2.3522 } },
  { id: "fixture-b", input: { name: "Sample B", date: "03/11/1987", time: "23:10", placeLabel: "Oslo, Norway", latitude: 59.9139, longitude: 10.7522 } },
];

/** What must never be found on the server, in any form a device wrote it. */
export const SECRETS_IN_SESSION = [
  "TraceQA",
  "Camille",
  "15/06/1990",
  "Paris",
  "Sample B",
  "03/11/1987",
  "Oslo",
  "48.8566",
  "59.9139",
  "Read on 12 Oct",
  "asked about work",
  "Family",
  "Camille’s iPhone",
  "iPhone",
  "laptop",
  "chart/",
  "note/",
  "state/",
  "fs/homes",
  "correct horse battery staple",
  "203.0.113",
  "Mozilla",
  "TestAgent",
];

/**
 * A reader's week with the account, through the service only: an account made with a passphrase
 * and a passkey, a second device by the recovery code, a third by a QR code, charts, a note, a
 * group, a home, devices named, a note deleted, a chart changed on two devices (a conflict merged).
 */
export async function realisticSession(service, options = {}) {
  const auth = await makeAuthenticator();
  const a = await createAccount(service, { authenticator: auth, fast: options.fast ?? false });
  const put = async (who, puts) => {
    const res = await call(service, "records/put", { puts }, { token: who.token });
    if (res.status !== 200) throw new Error(`put ${res.status} ${res.text}`);
    return res.body;
  };
  const [first, second] = PEOPLE;
  const chartA = { ...first, chart: { planets: Array.from({ length: 30 }, (_, i) => ({ id: i, lon: (i * 37.1) % 360 })) }, savedAt: 1 };
  const chartB = { ...second, chart: { planets: Array.from({ length: 30 }, (_, i) => ({ id: i, lon: (i * 11.3) % 360 })) }, savedAt: 2 };
  const done = await put(a, [
    await sealedPut(a, `chart/${first.id}`, chartA),
    await sealedPut(a, `chart/${second.id}`, chartB),
    await sealedPut(a, `note/${first.id}`, { text: "Read on 12 Oct; asked about work", at: 3 }),
    await sealedPut(a, "state/groups", { groups: [{ id: "g1", name: "Family", members: [first.id, second.id], at: 4 }] }),
    await sealedPut(a, "state/library", { order: [first.id, second.id], activeId: first.id }),
    await sealedPut(a, "fs/homes", { homes: [{ name: "Camille’s flat in Paris", facing: 180 }] }),
  ]);
  const versions = new Map(done.applied.map((x) => [x.rid, x.version]));
  await call(service, "devices/rename", { device: a.device, name: b64u(await sealDeviceName(a.keys, a.device, "Camille’s iPhone")) }, { token: a.token });
  // A second device, by the recovery code.
  const rec = await recoverySecrets(a.code);
  const key2 = await newDeviceKey();
  const signIn = await call(service, "recovery/sign-in", { lookup: b64u(rec.lookup), authKey: b64u(rec.authKey), device: { key: b64u(key2.publicKey) } }, { ip: "203.0.113.42" });
  if (signIn.status !== 200) throw new Error(`recovery ${signIn.status}`);
  const b = { ...a, device: signIn.body.device, token: signIn.body.token, deviceKey: key2.privateKey };
  await call(service, "devices/rename", { device: b.device, name: b64u(await sealDeviceName(b.keys, b.device, "Sample B’s laptop")) }, { token: b.token });
  // A third, by a QR code.
  const c = await linkDevice(service, a, { opener: "taker" });
  // The note deleted on the second device; the chart changed on both (the second one conflicts, merges, puts again).
  const noteRid = await recordId(b.keys, `note/${first.id}`);
  await put(b, [{ rid: noteRid, base: versions.get(noteRid), deleted: true }]);
  const chartRid = await recordId(a.keys, `chart/${first.id}`);
  const one = await put(a, [await sealedPut(a, `chart/${first.id}`, { ...chartA, savedAt: 5 }, versions.get(chartRid))]);
  const two = await put(c, [await sealedPut(c, `chart/${first.id}`, { ...chartA, savedAt: 6 }, versions.get(chartRid))]);
  if (two.conflicts.length !== 1) throw new Error("expected a conflict");
  await put(c, [await sealedPut(c, `chart/${first.id}`, { ...chartA, savedAt: 6 }, one.applied[0].version)]);
  return { a, b, c, auth };
}

/** Every row a store's tables hold, checked as a thief would read them: nothing readable, days only, bucket sizes. */
export function checkStolenRows(tables, secrets = SECRETS_IN_SESSION) {
  const found = [];
  let values = 0;
  const look = (where, value) => {
    values += 1;
    if (value === null || value === undefined || typeof value === "boolean") return;
    if (typeof value === "number") {
      if (!Number.isFinite(value)) found.push(`${where}: ${value}`);
      return;
    }
    const texts = value instanceof Uint8Array ? [Buffer.from(value).toString("latin1"), Buffer.from(value).toString("utf8")] : [String(value)];
    for (const text of texts) for (const secret of secrets) if (text.includes(secret)) found.push(`${where}: "${secret}"`);
  };
  for (const [table, rows] of Object.entries(tables)) {
    for (const [i, row] of rows.entries()) {
      for (const [column, value] of Object.entries(row)) {
        look(`${table}[${i}].${column}`, value);
        if (/day$/i.test(column) && value !== null && !(Number.isInteger(value) && value > 19_000 && value < 40_000)) found.push(`${table}.${column} is not a day: ${value}`);
        if (table === "records" && column === "blob" && value && !BUCKETS.includes(value.byteLength)) found.push(`records.blob of ${value.byteLength} bytes`);
        if (table === "devices" && column === "name" && value && value.byteLength !== 128) found.push(`devices.name of ${value.byteLength} bytes`);
      }
    }
  }
  return { found, values };
}
