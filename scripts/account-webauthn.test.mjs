// Passkeys on the synced account's server (src/lib/account/webauthn.server.ts; docs/sync-protocol.md,
// section 4.2; share and compare plan, feature 4), checked with credentials made by WebCrypto in the
// test, as a real authenticator would make them: ES256, RS256 and EdDSA registered and used;
// tampered signatures, other origins and RP ids, missing user verification, attestation formats
// other than "none", replayed and expired challenges and counters that go back, all refused.
import assert from "node:assert/strict";
import { test } from "node:test";
import { b64u, concat, fromB64u, randomBytes } from "../src/lib/account/encoding.ts";
import { newDeviceKey, passkeyKek, prfSalt, recoverySecrets, unwrapDataKey, wrapAad } from "../src/lib/account/keys.ts";
import { accountService } from "../src/lib/account/service.server.ts";
import { memoryStore } from "../src/lib/account/store-memory.server.ts";
import { WebAuthnError, derToP1363, verifyAssertion, verifyRegistration } from "../src/lib/account/webauthn.server.ts";
import { FLAGS, ORIGIN, call, cbor, createAccount, makeAuthenticator, newCode, p1363ToDer } from "./account-helpers.mjs";

const ORIGINS = [ORIGIN];
const challenge = () => b64u(randomBytes(32));
const reg = (r) => ({ clientDataJSON: fromB64u(r.clientDataJSON), attestationObject: fromB64u(r.attestationObject), origins: ORIGINS });
const asr = (a, key, counter = 0) => ({
  clientDataJSON: fromB64u(a.clientDataJSON),
  authenticatorData: fromB64u(a.authenticatorData),
  signature: fromB64u(a.signature),
  origins: ORIGINS,
  publicKey: key.publicKey,
  alg: key.alg,
  storedCounter: counter,
});
const refused = (why) => (err) => err instanceof WebAuthnError && err.message.includes(why);

for (const alg of [-7, -257, -8]) {
  test(`a passkey (${alg === -7 ? "ES256" : alg === -257 ? "RS256" : "EdDSA"}) registers with format "none" and signs in; a tampered signature does not`, async () => {
    const auth = await makeAuthenticator({ alg });
    const c = challenge();
    const key = await verifyRegistration(reg(await auth.register(c)));
    assert.equal(key.alg, alg);
    assert.equal(b64u(key.challenge), c);
    assert.deepEqual(key.credentialId, auth.credentialId);
    assert.equal(key.origin, ORIGIN);
    // Kept as SPKI: it imports as a public key, and only for checking.
    const imported = await crypto.subtle.importKey(
      "spki",
      key.publicKey,
      alg === -7 ? { name: "ECDSA", namedCurve: "P-256" } : alg === -8 ? { name: "Ed25519" } : { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      true,
      ["verify"],
    );
    assert.equal(imported.type, "public");
    const c2 = challenge();
    const ok = await verifyAssertion(asr(await auth.assert(c2), key));
    assert.equal(b64u(ok.challenge), c2);
    await assert.rejects(async () => verifyAssertion(asr(await auth.assert(challenge(), { tamper: true }), key)), refused("signature"));
    // Signed by another passkey: refused.
    const other = await makeAuthenticator({ alg });
    await assert.rejects(async () => verifyAssertion(asr(await other.assert(challenge()), key)), refused("signature"));
  });
}

test("another origin, another RP id, a frame of another site, the wrong ceremony: refused", async () => {
  const auth = await makeAuthenticator();
  await assert.rejects(async () => verifyRegistration(reg(await auth.register(challenge(), { from: "https://evil.example" }))), refused("origin"));
  await assert.rejects(async () => verifyRegistration(reg(await auth.register(challenge(), { rp: "evil.example" }))), refused("rp id"));
  await assert.rejects(async () => verifyRegistration(reg(await auth.register(challenge(), { crossOrigin: true }))), refused("cross-origin"));
  await assert.rejects(async () => verifyRegistration(reg(await auth.register(challenge(), { type: "webauthn.get" }))), refused("type"));
  const key = await verifyRegistration(reg(await auth.register(challenge())));
  await assert.rejects(async () => verifyAssertion(asr(await auth.assert(challenge(), { from: "http://127.0.0.1:8097" }), key)), refused("origin"));
  await assert.rejects(async () => verifyAssertion(asr(await auth.assert(challenge(), { rp: "ulune.app" }), key)), refused("rp id"));
  await assert.rejects(async () => verifyAssertion(asr(await auth.assert(challenge(), { type: "webauthn.create" }), key)), refused("type"));
  // ulune.app's own pages: its RP id is its host name.
  const prod = await makeAuthenticator({ origin: "https://ulune.app", rpId: "ulune.app" });
  const r = await prod.register(challenge());
  await verifyRegistration({ ...reg(r), origins: ["https://ulune.app"] });
  await assert.rejects(() => verifyRegistration({ ...reg(r), origins: ["https://www.ulune.app"] }), refused("origin"));
});

test("user verification and presence are required", async () => {
  const auth = await makeAuthenticator();
  await assert.rejects(async () => verifyRegistration(reg(await auth.register(challenge(), { flags: FLAGS.UP | FLAGS.AT }))), refused("user not verified"));
  await assert.rejects(async () => verifyRegistration(reg(await auth.register(challenge(), { flags: FLAGS.UV | FLAGS.AT }))), refused("user not verified"));
  const key = await verifyRegistration(reg(await auth.register(challenge())));
  await assert.rejects(async () => verifyAssertion(asr(await auth.assert(challenge(), { flags: FLAGS.UP }), key)), refused("user not verified"));
  await assert.rejects(async () => verifyAssertion(asr(await auth.assert(challenge(), { flags: FLAGS.UV }), key)), refused("user not verified"));
  // Synced passkeys say so (backup eligible and backed up): accepted, never required.
  const synced = await verifyRegistration(reg(await auth.register(challenge(), { flags: FLAGS.UP | FLAGS.UV | FLAGS.AT | FLAGS.BE | FLAGS.BS })));
  assert.equal(synced.backedUp, true);
});

test('only the "none" attestation is accepted: no make, model or certificate', async () => {
  const auth = await makeAuthenticator();
  const sig = new Map([
    ["alg", -7],
    ["sig", randomBytes(70)],
  ]);
  await assert.rejects(async () => verifyRegistration(reg(await auth.register(challenge(), { fmt: "packed", attStmt: sig }))), refused("attestation format"));
  await assert.rejects(async () => verifyRegistration(reg(await auth.register(challenge(), { fmt: "fido-u2f", attStmt: sig }))), refused("attestation format"));
  await assert.rejects(async () => verifyRegistration(reg(await auth.register(challenge(), { attStmt: sig }))), refused("attestation statement"));
  await assert.rejects(() => verifyRegistration({ ...reg({ clientDataJSON: b64u(new TextEncoder().encode("{}")), attestationObject: b64u(randomBytes(40)) }) }));
});

test("the authenticator data must be whole: extensions read, nothing left over, keys of the three algorithms only", async () => {
  const auth = await makeAuthenticator();
  // With extensions (the ED flag): read past, accepted.
  const ext = cbor(new Map([["credProtect", 2]]));
  await verifyRegistration(reg(await auth.register(challenge(), { flags: FLAGS.UP | FLAGS.UV | FLAGS.AT | FLAGS.ED, extra: ext })));
  // Bytes after the key with no extension flag: refused.
  await assert.rejects(async () => verifyRegistration(reg(await auth.register(challenge(), { extra: new Uint8Array([0]) }))), refused("trailing"));
  // ES384, or a P-256 key said to be another curve, or RSA with a short modulus: refused.
  const es384 = new Map([...auth.cose].map(([k, v]) => [k, k === 3 ? -35 : v]));
  await assert.rejects(async () => verifyRegistration(reg(await auth.register(challenge(), { key: es384 }))), refused("algorithm"));
  const p384 = new Map([...auth.cose].map(([k, v]) => [k, k === -1 ? 2 : v]));
  await assert.rejects(async () => verifyRegistration(reg(await auth.register(challenge(), { key: p384 }))), refused("curve"));
  const offCurve = new Map([...auth.cose].map(([k, v]) => [k, k === -3 ? randomBytes(32) : v]));
  await assert.rejects(async () => verifyRegistration(reg(await auth.register(challenge(), { key: offCurve }))));
  const small = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 1024, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign"]);
  const jwk = await crypto.subtle.exportKey("jwk", small.publicKey);
  const rsa1024 = new Map([
    [1, 3],
    [3, -257],
    [-1, fromB64u(jwk.n)],
    [-2, fromB64u(jwk.e)],
  ]);
  await assert.rejects(async () => verifyRegistration(reg(await auth.register(challenge(), { key: rsa1024 }))), refused("rsa size"));
  // An assertion carrying an attested credential: refused.
  const key = await verifyRegistration(reg(await auth.register(challenge())));
  await assert.rejects(async () => verifyAssertion(asr(await auth.assert(challenge(), { flags: FLAGS.UP | FLAGS.UV | FLAGS.AT }), key)), refused("attested"));
});

test("the counter: if either is not zero, the new one must be greater", async () => {
  const auth = await makeAuthenticator();
  const key = await verifyRegistration(reg(await auth.register(challenge())));
  await verifyAssertion(asr(await auth.assert(challenge(), { counter: 0 }), key, 0));
  await verifyAssertion(asr(await auth.assert(challenge(), { counter: 6 }), key, 5));
  await assert.rejects(async () => verifyAssertion(asr(await auth.assert(challenge(), { counter: 5 }), key, 5)), refused("counter"));
  await assert.rejects(async () => verifyAssertion(asr(await auth.assert(challenge(), { counter: 0 }), key, 3)), refused("counter"));
});

test("ECDSA signatures: DER to r ‖ s and back, malformed ones refused", async () => {
  for (let i = 0; i < 40; i += 1) {
    const raw = randomBytes(64);
    if (i % 3 === 0) raw.fill(0, 0, 2);
    if (i % 5 === 0) raw[32] = 0x80;
    assert.deepEqual(derToP1363(p1363ToDer(raw)), raw);
  }
  const good = p1363ToDer(randomBytes(64));
  for (const bad of [good.slice(1), concat(good, new Uint8Array([0])), new Uint8Array([0x30, 2, 2, 0]), new Uint8Array([0x31, ...good.slice(1)])]) {
    assert.throws(() => derToP1363(bad), WebAuthnError);
  }
  // A negative integer (high bit set without a leading zero) is not a signature.
  const neg = new Uint8Array(good);
  neg[4] = 0x80;
  assert.throws(() => derToP1363(new Uint8Array([0x30, 6, 0x02, 1, 0x80, 0x02, 1, 0x01])), WebAuthnError);
});

/* ------------------------------------------------------------ through the service */

function service(now = () => Date.UTC(2026, 9, 22, 12)) {
  return accountService({ store: memoryStore(), secret: randomBytes(32), origins: ORIGINS, now, rules: false });
}

async function passkeySignIn(svc, auth, options = {}) {
  const begin = await call(svc, "passkey/begin", {});
  const assertion = await auth.assert(begin.body.challenge, options);
  const device = await newDeviceKey();
  return await call(svc, "passkey/finish", { credential: assertion, device: { key: b64u(device.publicKey) } }, { token: options.token });
}

test("an account made with a passkey: a new device signs in with it and opens the data key with its PRF secret", async () => {
  const svc = service();
  const auth = await makeAuthenticator();
  const who = await createAccount(svc, { authenticator: auth, fast: true });
  assert.deepEqual(
    who.answer.ways.map((w) => w.kind),
    ["passkey", "passphrase", "recovery"],
  );
  const res = await passkeySignIn(svc, auth, { userHandle: who.account });
  assert.equal(res.status, 200, res.text);
  assert.equal(res.body.account, who.account);
  assert.notEqual(res.body.device, who.device);
  assert.equal(res.body.way.kind, "passkey");
  assert.equal(res.body.freshFor, 300);
  const kek = await passkeyKek(auth.prf, res.body.account, auth.id);
  assert.deepEqual(await unwrapDataKey(fromB64u(res.body.way.wrap), kek, wrapAad(res.body.account, "passkey", auth.id)), who.dataKey);
  // The fixed PRF salt is what every account passkey is asked with.
  assert.equal((await prfSalt()).byteLength, 32);
  // Signing in again from a device already signed in: the same device, fresh.
  const again = await passkeySignIn(svc, auth, { token: res.body.token });
  assert.equal(again.status, 200);
  assert.equal(again.body.device, res.body.device);
});

test("a challenge is used once, within its five minutes, for its own purpose; a counter that goes back is refused", async () => {
  let clock = Date.UTC(2026, 9, 22, 12);
  const svc = service(() => clock);
  // A synced passkey counts nothing (always 0): only the spent challenge stops a replay.
  const synced = await makeAuthenticator();
  await createAccount(svc, { authenticator: synced, fast: true });
  const device = { key: b64u((await newDeviceKey()).publicKey) };
  const first = await call(svc, "passkey/begin", {});
  const signed = await synced.assert(first.body.challenge);
  assert.equal((await call(svc, "passkey/finish", { credential: signed, device })).status, 200);
  const replayed = await call(svc, "passkey/finish", { credential: signed, device });
  assert.equal(replayed.status, 401);
  assert.deepEqual(replayed.body, { error: "denied" });
  // An authenticator that counts: the same, and its counter must grow.
  const auth = await makeAuthenticator({ counting: true });
  await createAccount(svc, { authenticator: auth, fast: true });
  const begin = await call(svc, "passkey/begin", {});
  const assertion = await auth.assert(begin.body.challenge);
  assert.equal((await call(svc, "passkey/finish", { credential: assertion, device })).status, 200);
  // Replayed: the same assertion again.
  const replay = await call(svc, "passkey/finish", { credential: assertion, device });
  assert.equal(replay.status, 401);
  assert.deepEqual(replay.body, { error: "denied" });
  // Expired: signed six minutes after the challenge was made.
  const late = await call(svc, "passkey/begin", {});
  clock += 6 * 60_000;
  const lateAssertion = await auth.assert(late.body.challenge);
  assert.equal((await call(svc, "passkey/finish", { credential: lateAssertion, device })).status, 401);
  // A challenge made for something else (a session renewal): refused.
  const other = await call(svc, "session/begin", { account: b64u(randomBytes(16)), device: b64u(randomBytes(16)) });
  assert.equal((await call(svc, "passkey/finish", { credential: await auth.assert(other.body.challenge), device })).status, 401);
  // A counter that goes back (a cloned authenticator).
  const fresh = await call(svc, "passkey/begin", {});
  const back = await auth.assert(fresh.body.challenge, { counter: 1 });
  assert.equal((await call(svc, "passkey/finish", { credential: back, device })).status, 401);
});

test("every failed passkey sign-in is the same 401, whether the passkey exists or not", async () => {
  const svc = service();
  const auth = await makeAuthenticator();
  const who = await createAccount(svc, { authenticator: auth, fast: true });
  const stranger = await makeAuthenticator();
  const answers = [
    await passkeySignIn(svc, stranger),
    await passkeySignIn(svc, auth, { tamper: true }),
    await passkeySignIn(svc, auth, { from: "https://evil.example" }),
    await passkeySignIn(svc, auth, { userHandle: b64u(randomBytes(16)) }),
    await passkeySignIn(svc, auth, { flags: FLAGS.UP }),
  ];
  for (const a of answers) {
    assert.equal(a.status, 401);
    assert.equal(a.text, '{"error":"denied"}');
  }
  // The right one still works.
  assert.equal((await passkeySignIn(svc, auth, { userHandle: who.account })).status, 200);
});

test("registering: the challenge is the account's, used once; a passkey of another account is refused", async () => {
  const svc = service();
  const auth = await makeAuthenticator();
  const who = await createAccount(svc, { authenticator: auth, fast: true });
  // The same creation sent again: its challenge is spent.
  assert.equal((await call(svc, "account/create", who.sent)).status, 401);
  // A challenge given for one account, used for another id: refused.
  const begin = await call(svc, "account/begin", {});
  const forged = { ...who.sent, account: begin.body.account };
  assert.equal((await call(svc, "account/create", forged)).status, 401);
  // The same passkey for a second account (with a recovery code of its own): refused as a conflict, nothing made.
  const begin2 = await call(svc, "account/begin", {});
  const rec = await recoverySecrets(newCode());
  const second = {
    ...who.sent,
    account: begin2.body.account,
    challenge: begin2.body.challenge,
    passkey: { ...who.sent.passkey, credential: await auth.register(begin2.body.challenge) },
    recovery: { ...who.sent.recovery, lookup: b64u(rec.lookup), authKey: b64u(rec.authKey) },
  };
  const res = await call(svc, "account/create", second);
  assert.equal(res.status, 409);
  assert.deepEqual(res.body, { error: "conflict" });
  // A registration made for another challenge: refused.
  const begin3 = await call(svc, "account/begin", {});
  const mismatched = { ...who.sent, account: begin3.body.account, challenge: begin3.body.challenge, passkey: { ...who.sent.passkey, credential: await (await makeAuthenticator()).register(challenge()) } };
  assert.equal((await call(svc, "account/create", mismatched)).status, 401);
});
