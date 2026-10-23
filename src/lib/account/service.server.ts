import { ARGON_DEFAULT, API_BASE, ERRORS, KEEP_DAYS, LIMITS, OPERATIONS, TTL, dayOf, type ErrorCode, type Operation, type WayKind } from "./protocol";
import { b64u, concat, own, randomBytes, sameBytes, utf8 } from "./encoding";
import { SCHEMAS, bodyLimit, type Input } from "./input.server";
import { RateLimiter, type Rule, type RuleName } from "./limits.server";
import { StoreUnavailable, type AccountStore, type CleanupResult, type DeviceRow, type WayRow } from "./store.server";
import {
  PURPOSE,
  deriveSecrets,
  addressKey,
  isFresh,
  issueChallenge,
  issueSession,
  readChallenge,
  readSession,
  sameSecret,
  scryptHash,
  standIn,
  type Secrets,
  type Session,
} from "./tokens.server";
import { WebAuthnError, rpIdOf, verifyAssertion, verifyRegistration, type CoseAlg } from "./webauthn.server";

/*
 * The synced account's server (docs/sync-protocol.md; share and compare plan, feature 4): every
 * operation of version 1, from a Request to a Response, against a store (store.server.ts). The
 * route (src/routes/api/account.v1.$.ts) only hands requests over; the tests call `handle` the
 * same way.
 *
 * In order, for every request: the operation exists, it is a POST, nothing in the address, from
 * Ulune's own pages, JSON within its size, exactly the fields the operation takes (input.server.ts),
 * within the rate limits; then the store and the secret are needed (503 without them); then the
 * session, where the operation needs one. Every failure is a status and {"error": code}, one code
 * for every way a sign-in can fail. Nothing about a request is logged or kept but what the
 * protocol stores.
 */

/** An error answer, thrown from anywhere inside an operation. */
class Fail extends Error {
  readonly code: ErrorCode;
  readonly retryAfter: number | undefined;
  constructor(code: ErrorCode, retryAfter?: number) {
    super(code);
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

const HEADERS = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };

function answer(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...HEADERS, ...extra } });
}

export function failure(code: ErrorCode, retryAfter?: number): Response {
  const extra: Record<string, string> = {};
  if (retryAfter) extra["Retry-After"] = String(retryAfter);
  if (code === "method") extra.Allow = "POST";
  return answer({ error: code }, ERRORS[code], extra);
}

export type AccountConfig = {
  /** Null: accounts are not set up here (production without a database), every valid request is 503. */
  store: AccountStore | null;
  /** The server's secret (ACCOUNT_SESSION_SECRET): null is the same as no store. */
  secret: Uint8Array | null;
  /** The pages allowed to use passkeys with the account (their origins). */
  origins: readonly string[];
  /** The clock (the tests move it). */
  now?: () => number;
  /** Other rate limits (the tests'); `false` turns them off. */
  rules?: Partial<Record<RuleName, Rule>> | false;
  /** Other quotas and caps (the tests'). */
  limits?: Partial<{ records: number; bytes: number; tombstones: number; devices: number; passkeys: number; newAccountsPerDay: number }>;
  /** The cron secret for the daily clean-up (CRON_SECRET): without it the clean-up never runs. */
  cronSecret?: string | null;
};

export type AccountService = {
  /** One request to POST /api/account/v1/<op>. */
  handle(op: string, request: Request): Promise<Response>;
  /** The daily clean-up's request (GET /api/account/cleanup, from Vercel's scheduler). */
  cleanupRequest(request: Request): Promise<Response>;
  /** The daily clean-up itself (section 9). */
  cleanup(): Promise<CleanupResult>;
};

const SESSION_OPS = new Set<Operation>([
  "account/status",
  "account/delete",
  "ways/list",
  "ways/begin",
  "ways/add",
  "ways/remove",
  "devices/list",
  "devices/rename",
  "devices/remove",
  "records/put",
  "records/changes",
  "link/give",
]);
/** A session if one is sent (signing in again, or a device link opened or joined by the giver). */
const OPTIONAL_SESSION_OPS = new Set<Operation>(["passkey/finish", "passphrase/sign-in", "recovery/sign-in", "link/open", "link/join"]);
const SIGN_IN_OPS = new Set<Operation>(["passkey/finish", "passphrase/sign-in", "recovery/sign-in", "session/renew", "link/take"]);
const CREATE_OPS = new Set<Operation>(["account/begin", "account/create"]);
const LINK_OPS = new Set<Operation>(["link/open", "link/join"]);

/** The address a request came from, as Vercel's edge sets it (it overwrites what a client sends). */
function addressOf(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

/** The body as text, or null past `limit` bytes (whatever Content-Length said). */
async function readBody(request: Request, limit: number): Promise<string | null> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel().catch(() => {});
      return null;
    }
    parts.push(value);
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(concat(...parts));
}

async function importDeviceKey(spki: Uint8Array): Promise<CryptoKey> {
  try {
    return await crypto.subtle.importKey("spki", own(spki), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  } catch {
    throw new Fail("bad-request");
  }
}

async function checkEpk(epk: Uint8Array): Promise<void> {
  try {
    await crypto.subtle.importKey("raw", own(epk), { name: "ECDH", namedCurve: "P-256" }, false, []);
  } catch {
    throw new Fail("bad-request");
  }
}

/** What a device key signs (keys.ts, deviceMessage): a context, a zero byte, the token. */
function deviceMessage(context: "renew" | "link-take", tokenBytes: Uint8Array): Uint8Array<ArrayBuffer> {
  return concat(utf8(`ulune/account/v1/${context}`), new Uint8Array([0]), tokenBytes);
}

async function deviceSigned(spki: Uint8Array, context: "renew" | "link-take", tokenBytes: Uint8Array, signature: Uint8Array): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey("spki", own(spki), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
    return await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, own(signature), deviceMessage(context, tokenBytes));
  } catch {
    return false;
  }
}

export function accountService(config: AccountConfig): AccountService {
  const now = config.now ?? (() => Date.now());
  const today = () => dayOf(now());
  const limits = { ...LIMITS, ...config.limits };
  const limiter = config.rules === false ? null : new RateLimiter(now, config.rules ?? {});
  const secrets: Secrets | null = config.secret && config.secret.byteLength >= 32 ? deriveSecrets(config.secret) : null;
  const origins = config.origins;

  const limit = (rule: RuleName, key: string) => {
    const wait = limiter?.take(rule, key) ?? 0;
    if (wait) throw new Fail("slow-down", wait);
  };
  const blockedFailures = (key: string) => {
    const wait = limiter?.blocked("failures", key) ?? 0;
    if (wait) throw new Fail("slow-down", wait);
  };
  /** A sign-in that failed, for whatever reason: counted against its account or lookup, and the one answer, "denied". */
  function failed(key: string): never {
    limiter?.take("failures", key);
    throw new Fail("denied");
  }

  /** The page's RP id: its origin's host name when it is one of Ulune's, otherwise the first one's. */
  const rpIdFor = (request: Request) => {
    const origin = request.headers.get("origin");
    return rpIdOf(origin && origins.includes(origin) ? origin : origins[0]);
  };

  /** The session a request carries: null without an Authorization header; denied when it is not a live session of a device still in its account. */
  async function sessionOf(store: AccountStore, request: Request): Promise<Session | null> {
    const header = request.headers.get("authorization");
    if (!header) return null;
    const match = /^Bearer ([A-Za-z0-9_-]{20,200})$/.exec(header);
    const session = match && secrets ? readSession(secrets, match[1], now()) : null;
    if (!session || !(await store.touch(session.account, session.device, today()))) throw new Fail("denied");
    return session;
  }

  function issue(account: Uint8Array, device: Uint8Array, fresh: boolean) {
    return { token: issueSession(secrets!, account, device, now(), fresh), ttl: TTL.session, freshFor: fresh ? TTL.fresh : 0 };
  }

  /** A new device for `account` (its key checked), joined to it; its id. */
  async function joinDevice(store: AccountStore, account: Uint8Array, key: Uint8Array): Promise<Uint8Array> {
    await importDeviceKey(key);
    const row: DeviceRow = { account, id: randomBytes(16), publicKey: key, name: null, createdDay: today(), seenDay: today() };
    await store.addDevice(row, limits.devices);
    return row.id;
  }

  /** The device a sign-in ends on: the session's own (signing in again), or a new one. */
  async function signInDevice(store: AccountStore, session: Session | null, account: Uint8Array, device: { key: Uint8Array } | undefined): Promise<Uint8Array> {
    if (session) {
      if (!sameBytes(session.account, account)) throw new Fail("denied");
      return session.device;
    }
    const joined = await joinDevice(store, account, device!.key);
    // Signing in is using the account: its last-seen day moves too (the two-year rule, decision A3).
    await store.touch(account, joined, today());
    return joined;
  }

  function signInAnswer(account: Uint8Array, device: Uint8Array, way: WayRow) {
    return {
      account: b64u(account),
      device: b64u(device),
      ...issue(account, device, true),
      way: { id: b64u(way.id), kind: way.kind, wrap: b64u(way.wrap) },
    };
  }

  /** A passkey registration checked against the challenge it must carry, as a way-in row. */
  async function passkeyWay(account: Uint8Array, challenge: Uint8Array, input: Input<"account/create">["passkey"] & object): Promise<WayRow> {
    let reg;
    try {
      reg = await verifyRegistration({
        clientDataJSON: input.credential.clientDataJSON,
        attestationObject: input.credential.attestationObject,
        origins,
      });
    } catch (err) {
      if (err instanceof WebAuthnError) throw new Fail("denied");
      throw err;
    }
    if (!sameBytes(reg.challenge, challenge) || !sameBytes(reg.credentialId, input.credential.id)) throw new Fail("denied");
    return {
      account,
      id: randomBytes(16),
      kind: "passkey",
      lookup: reg.credentialId,
      publicKey: reg.publicKey,
      alg: reg.alg,
      counter: reg.counter,
      clientSalt: null,
      argonM: null,
      argonT: null,
      argonP: null,
      serverSalt: null,
      authHash: null,
      wrap: input.wrap,
      createdDay: today(),
      usedDay: null,
    };
  }

  async function secretWay(
    account: Uint8Array,
    kind: "passphrase" | "recovery",
    input: { authKey: Uint8Array; wrap: Uint8Array; lookup?: Uint8Array; salt?: Uint8Array; m?: number; t?: number; p?: number },
  ): Promise<WayRow> {
    const serverSalt = randomBytes(16);
    return {
      account,
      id: randomBytes(16),
      kind,
      lookup: kind === "recovery" ? input.lookup! : null,
      publicKey: null,
      alg: null,
      counter: null,
      clientSalt: kind === "passphrase" ? input.salt! : null,
      argonM: kind === "passphrase" ? input.m! : null,
      argonT: kind === "passphrase" ? input.t! : null,
      argonP: kind === "passphrase" ? input.p! : null,
      serverSalt,
      authHash: new Uint8Array(await scryptHash(input.authKey, serverSalt)),
      wrap: input.wrap,
      createdDay: today(),
      usedDay: null,
    };
  }

  /** A link token's id, or gone. */
  function linkOf(token: Uint8Array): Uint8Array {
    const link = readChallenge(secrets!, PURPOSE.link, token, now());
    if (!link) throw new Fail("gone");
    return link.nonce;
  }

  type Ctx<O extends Operation> = { store: AccountStore; request: Request; input: Input<O>; session: Session | null };
  type Handlers = { [O in Operation]: (ctx: Ctx<O>) => Promise<unknown> };

  const handlers: Handlers = {
    async "account/begin"({ request }) {
      const account = randomBytes(16);
      const { token } = issueChallenge(secrets!, PURPOSE.create, now(), TTL.create, [account]);
      return { account: b64u(account), challenge: token, rpId: rpIdFor(request), ttl: TTL.create };
    },

    async "account/create"({ store, input }) {
      const challenge = readChallenge(secrets!, PURPOSE.create, input.challenge, now(), 16);
      if (!challenge || !sameBytes(challenge.bound, input.account)) throw new Fail("denied");
      if ((await store.accountsCreatedOn(today())) >= limits.newAccountsPerDay) {
        throw new Fail("unavailable", Math.max(60, 86_400 - Math.floor((now() % 86_400_000) / 1000)));
      }
      await importDeviceKey(input.device.key);
      const ways: WayRow[] = [];
      if (input.passkey) ways.push(await passkeyWay(input.account, input.challenge, input.passkey));
      if (input.passphrase) ways.push(await secretWay(input.account, "passphrase", input.passphrase));
      ways.push(await secretWay(input.account, "recovery", input.recovery));
      if (!(await store.spendNonce(challenge.nonce, today()))) throw new Fail("denied");
      const device: DeviceRow = { account: input.account, id: randomBytes(16), publicKey: input.device.key, name: null, createdDay: today(), seenDay: today() };
      const made = await store.createAccount({ id: input.account, day: today(), quotaBytes: limits.bytes, quotaRecords: limits.records }, ways, device);
      if (made !== "ok") throw new Fail("conflict");
      return {
        account: b64u(input.account),
        device: b64u(device.id),
        ...issue(input.account, device.id, true),
        ways: ways.map((w) => ({ id: b64u(w.id), kind: w.kind })),
      };
    },

    async "account/status"({ store, session }) {
      const a = await store.getAccount(session!.account);
      if (!a) throw new Fail("denied");
      return {
        account: b64u(a.id),
        created: a.createdDay,
        seen: a.seenDay,
        latest: a.seq,
        usage: { bytes: a.bytes, records: a.records },
        quota: { bytes: a.quotaBytes, records: a.quotaRecords },
      };
    },

    async "account/delete"({ store, session }) {
      if (!isFresh(session!, now())) throw new Fail("fresh-sign-in");
      await store.deleteAccount(session!.account);
      return { deleted: true };
    },

    async "passkey/begin"({ request }) {
      const { token } = issueChallenge(secrets!, PURPOSE.signIn, now(), TTL.challenge);
      return { challenge: token, rpId: rpIdFor(request), ttl: TTL.challenge };
    },

    async "passkey/finish"({ store, input, session }) {
      if (!session && !input.device) throw new Fail("bad-request");
      const credential = input.credential;
      const way = await store.findWay("passkey", credential.id);
      const failKey = `passkey:${b64u(credential.id)}`;
      blockedFailures(failKey);
      if (!way || !way.publicKey || way.alg === null) failed(failKey);
      let result;
      try {
        result = await verifyAssertion({
          clientDataJSON: credential.clientDataJSON,
          authenticatorData: credential.authenticatorData,
          signature: credential.signature,
          origins,
          publicKey: way!.publicKey!,
          alg: way!.alg as CoseAlg,
          storedCounter: way!.counter ?? 0,
        });
      } catch (err) {
        if (err instanceof WebAuthnError) failed(failKey);
        throw err;
      }
      const challenge = readChallenge(secrets!, PURPOSE.signIn, result!.challenge, now());
      if (!challenge) failed(failKey);
      if (credential.userHandle && !sameBytes(credential.userHandle, way!.account)) failed(failKey);
      if (session && !sameBytes(session.account, way!.account)) failed(failKey);
      if (!(await store.spendNonce(challenge!.nonce, today()))) failed(failKey);
      if (!(await store.usedWay(way!.account, way!.id, today(), result!.counter))) failed(failKey);
      const device = await signInDevice(store, session, way!.account, input.device);
      return signInAnswer(way!.account, device, way!);
    },

    async "passphrase/params"({ store, input }) {
      const way = (await store.listWays(input.account)).find((w) => w.kind === "passphrase");
      if (way?.clientSalt && way.argonM && way.argonT && way.argonP) {
        return { salt: b64u(way.clientSalt), m: way.argonM, t: way.argonT, p: way.argonP };
      }
      // An account it does not know, or one without a passphrase: a salt made up the same way each time.
      return { salt: b64u(standIn(secrets!, "passphrase-salt", input.account)), ...ARGON_DEFAULT };
    },

    async "passphrase/sign-in"({ store, input, session }) {
      if (!session && !input.device) throw new Fail("bad-request");
      const failKey = `account:${b64u(input.account)}`;
      blockedFailures(failKey);
      const way = (await store.listWays(input.account)).find((w) => w.kind === "passphrase");
      // The same work whether the account exists or not.
      const hash = await scryptHash(input.authKey, way?.serverSalt ?? standIn(secrets!, "scrypt-salt", input.account));
      if (!way?.authHash || !sameSecret(hash, way.authHash)) failed(failKey);
      if (session && !sameBytes(session.account, way!.account)) failed(failKey);
      await store.usedWay(way!.account, way!.id, today());
      const device = await signInDevice(store, session, way!.account, input.device);
      return signInAnswer(way!.account, device, way!);
    },

    async "recovery/sign-in"({ store, input, session }) {
      if (!session && !input.device) throw new Fail("bad-request");
      const failKey = `recovery:${b64u(input.lookup)}`;
      blockedFailures(failKey);
      const way = await store.findWay("recovery", input.lookup);
      const hash = await scryptHash(input.authKey, way?.serverSalt ?? standIn(secrets!, "scrypt-salt", input.lookup));
      if (!way?.authHash || !sameSecret(hash, way.authHash)) failed(failKey);
      if (session && !sameBytes(session.account, way!.account)) failed(failKey);
      await store.usedWay(way!.account, way!.id, today());
      const device = await signInDevice(store, session, way!.account, input.device);
      return signInAnswer(way!.account, device, way!);
    },

    async "session/begin"({ input }) {
      // Nothing is looked up: the same answer for any account and device, and nothing stored until it is used.
      const { token } = issueChallenge(secrets!, PURPOSE.renew, now(), TTL.challenge, [input.account, input.device]);
      return { challenge: token, ttl: TTL.challenge };
    },

    async "session/renew"({ store, input }) {
      const challenge = readChallenge(secrets!, PURPOSE.renew, input.challenge, now(), 32);
      if (!challenge || !sameBytes(challenge.bound, concat(input.account, input.device))) throw new Fail("denied");
      const device = await store.getDevice(input.account, input.device);
      if (!device || !(await deviceSigned(device.publicKey, "renew", input.challenge, input.signature))) throw new Fail("denied");
      if (!(await store.spendNonce(challenge.nonce, today()))) throw new Fail("denied");
      if (!(await store.touch(input.account, input.device, today()))) throw new Fail("denied");
      const { token, ttl } = issue(input.account, input.device, false);
      return { token, ttl };
    },

    async "ways/list"({ store, session }) {
      const ways = await store.listWays(session!.account);
      return {
        ways: ways.map((w) => ({
          id: b64u(w.id),
          kind: w.kind,
          created: w.createdDay,
          used: w.usedDay,
          ...(w.kind === "passkey" && w.lookup ? { credential: b64u(w.lookup) } : {}),
        })),
      };
    },

    async "ways/begin"({ store, request, session }) {
      const { token } = issueChallenge(secrets!, PURPOSE.register, now(), TTL.challenge, [session!.account]);
      const exclude = (await store.listWays(session!.account)).flatMap((w) => (w.kind === "passkey" && w.lookup ? [b64u(w.lookup)] : []));
      return { challenge: token, rpId: rpIdFor(request), ttl: TTL.challenge, exclude };
    },

    async "ways/add"({ store, input, session }) {
      if (!isFresh(session!, now())) throw new Fail("fresh-sign-in");
      const account = session!.account;
      let way: WayRow;
      let nonce: Uint8Array | null = null;
      if (input.passkey) {
        const challenge = readChallenge(secrets!, PURPOSE.register, input.challenge!, now(), 16);
        if (!challenge || !sameBytes(challenge.bound, account)) throw new Fail("denied");
        way = await passkeyWay(account, input.challenge!, input.passkey);
        nonce = challenge.nonce;
      } else if (input.passphrase) {
        way = await secretWay(account, "passphrase", input.passphrase);
      } else {
        way = await secretWay(account, "recovery", input.recovery!);
      }
      if (nonce && !(await store.spendNonce(nonce, today()))) throw new Fail("denied");
      const added = await store.addWay(way, limits.passkeys);
      if (added === "limit") throw new Fail("limit");
      if (added === "taken") throw new Fail("conflict");
      if (added === "missing") throw new Fail("denied");
      return { way: { id: b64u(way.id), kind: way.kind as WayKind } };
    },

    async "ways/remove"({ store, input, session }) {
      if (!isFresh(session!, now())) throw new Fail("fresh-sign-in");
      const removed = await store.removeWay(session!.account, input.way);
      if (removed === "last") throw new Fail("last-way-in");
      return {};
    },

    async "devices/list"({ store, session }) {
      const devices = await store.listDevices(session!.account);
      return {
        devices: devices.map((d) => ({
          id: b64u(d.id),
          name: d.name ? b64u(d.name) : null,
          created: d.createdDay,
          seen: d.seenDay,
          current: sameBytes(d.id, session!.device),
        })),
      };
    },

    async "devices/rename"({ store, input, session }) {
      if (!(await store.renameDevice(session!.account, input.device, input.name))) throw new Fail("conflict");
      return {};
    },

    async "devices/remove"({ store, input, session }) {
      // Signing this device out needs nothing more; removing another needs a fresh sign-in.
      if (!sameBytes(input.device, session!.device) && !isFresh(session!, now())) throw new Fail("fresh-sign-in");
      await store.removeDevice(session!.account, input.device);
      return {};
    },

    async "records/put"({ store, input, session }) {
      limit("accountWrite", b64u(session!.account));
      const puts = input.puts.map((p) => ({ rid: p.rid, base: p.base, blob: p.blob ?? null }));
      const result = await store.putRecords(session!.account, puts, today(), limits.tombstones);
      if (result === "quota") throw new Fail("quota");
      if (result === "missing") throw new Fail("denied");
      return {
        applied: result.applied.map((a) => ({ rid: b64u(a.rid), version: a.version })),
        conflicts: result.conflicts.map((c) => ({
          rid: b64u(c.rid),
          version: c.version,
          ...(c.version > 0 && c.deleted ? { deleted: true } : {}),
          ...(c.blob ? { blob: b64u(c.blob) } : {}),
        })),
      };
    },

    async "records/changes"({ store, input, session }) {
      limit("accountRead", b64u(session!.account));
      const page = await store.changes(session!.account, input.cursor, input.limit ?? LIMITS.pageDefault, LIMITS.pageBytes);
      if (!page) throw new Fail("denied");
      if (page.reset) return { changes: [], cursor: 0, more: true, reset: true };
      return {
        changes: page.rows.map((r) => (r.deleted || !r.blob ? { rid: b64u(r.rid), version: r.version, deleted: true } : { rid: b64u(r.rid), version: r.version, blob: b64u(r.blob) })),
        cursor: page.rows.length ? page.rows[page.rows.length - 1].version : input.cursor,
        more: page.more,
      };
    },

    async "link/open"({ store, input, session }) {
      await checkEpk(input.epk);
      const { token, nonce } = issueChallenge(secrets!, PURPOSE.link, now(), TTL.link);
      if (session) {
        if (input.device) throw new Fail("bad-request");
        await store.openLink({ id: nonce, day: today(), opener: "giver", account: session.account, giverEpk: input.epk, takerEpk: null, takerKey: null, sealed: null, device: null });
      } else {
        if (!input.device) throw new Fail("bad-request");
        await importDeviceKey(input.device.key);
        await store.openLink({ id: nonce, day: today(), opener: "taker", account: null, giverEpk: null, takerEpk: input.epk, takerKey: input.device.key, sealed: null, device: null });
      }
      return { link: token, ttl: TTL.link };
    },

    async "link/join"({ store, input, session }) {
      const id = linkOf(input.link);
      const row = await store.getLink(id);
      if (!row) throw new Fail("gone");
      await checkEpk(input.epk);
      if (row.opener === "giver") {
        // The giver opened it: the new device joins, signed in nowhere, with its device key.
        if (session) throw new Fail("conflict");
        if (!input.device) throw new Fail("bad-request");
        await importDeviceKey(input.device.key);
        const joined = await store.joinLink(id, { takerEpk: input.epk, takerKey: input.device.key });
        if (!joined?.giverEpk) throw new Fail("conflict");
        return { peer: b64u(joined.giverEpk) };
      }
      // The new device opened it: a signed-in device joins as the giver.
      if (!session) throw new Fail("denied");
      if (input.device) throw new Fail("bad-request");
      const joined = await store.joinLink(id, { giverEpk: input.epk, account: session.account });
      if (!joined?.takerEpk) throw new Fail("conflict");
      return { peer: b64u(joined.takerEpk) };
    },

    async "link/state"({ store, input }) {
      const row = await store.getLink(linkOf(input.link));
      if (!row) throw new Fail("gone");
      return {
        state: row.sealed ? "given" : row.giverEpk && row.takerEpk ? "joined" : "open",
        ...(row.giverEpk ? { giver: b64u(row.giverEpk) } : {}),
        ...(row.takerEpk ? { taker: b64u(row.takerEpk) } : {}),
      };
    },

    async "link/give"({ store, input, session }) {
      const id = linkOf(input.link);
      const device: DeviceRow = { account: session!.account, id: randomBytes(16), publicKey: new Uint8Array(0), name: null, createdDay: today(), seenDay: today() };
      if (!(await store.giveLink(id, session!.account, input.sealed, device, limits.devices))) {
        if (!(await store.getLink(id))) throw new Fail("gone");
        throw new Fail("conflict");
      }
      return { device: b64u(device.id) };
    },

    async "link/take"({ store, input }) {
      const id = linkOf(input.link);
      const row = await store.getLink(id);
      if (!row) throw new Fail("gone");
      if (!row.takerKey || !(await deviceSigned(row.takerKey, "link-take", input.link, input.signature))) throw new Fail("denied");
      if (!row.sealed) throw new Fail("conflict");
      const taken = await store.takeLink(id);
      if (!taken?.account || !taken.device || !taken.sealed) throw new Fail("gone");
      if (!(await store.touch(taken.account, taken.device, today()))) throw new Fail("gone");
      const { token, ttl } = issue(taken.account, taken.device, false);
      return { account: b64u(taken.account), device: b64u(taken.device), sealed: b64u(taken.sealed), token, ttl };
    },

    async "link/close"({ store, input }) {
      await store.closeLink(linkOf(input.link));
      return {};
    },
  };

  async function run(op: Operation, request: Request): Promise<Response> {
    if (request.method !== "POST") return failure("method");
    const url = new URL(request.url);
    if (url.search) return failure("bad-request");
    const site = request.headers.get("sec-fetch-site");
    if (site && site !== "same-origin") return failure("cross-site");
    const address = addressKey(addressOf(request));
    limit("ip", address);
    if (!/^application\/json(;|$)/i.test(request.headers.get("content-type") ?? "")) return failure("bad-request");
    const max = bodyLimit(op);
    if (Number(request.headers.get("content-length") ?? 0) > max) return failure("too-large");
    let text: string | null;
    try {
      text = await readBody(request, max);
    } catch {
      return failure("bad-request");
    }
    if (text === null) return failure("too-large");
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      return failure("bad-request");
    }
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return failure("bad-request");
    const parsed = SCHEMAS[op].safeParse(raw);
    if (!parsed.success) return failure("bad-request");
    if (SIGN_IN_OPS.has(op)) limit("ipSignIn", address);
    if (CREATE_OPS.has(op)) limit("ipCreate", address);
    if (LINK_OPS.has(op)) limit("ipLink", address);
    const store = config.store;
    if (!store || !secrets) return failure("unavailable", 3600);
    let session: Session | null = null;
    if (SESSION_OPS.has(op)) {
      session = await sessionOf(store, request);
      if (!session) throw new Fail("denied");
    } else if (OPTIONAL_SESSION_OPS.has(op)) {
      session = await sessionOf(store, request);
    }
    if (op === "account/status") limit("accountRead", b64u(session!.account));
    const handler = handlers[op] as (ctx: Ctx<Operation>) => Promise<unknown>;
    return answer(await handler({ store, request, input: parsed.data as Input<Operation>, session }));
  }

  async function cleanup(): Promise<CleanupResult> {
    if (!config.store) throw new StoreUnavailable("no store");
    return await config.store.cleanup(today(), KEEP_DAYS);
  }

  return {
    async handle(op, request) {
      if (!(OPERATIONS as readonly string[]).includes(op)) return failure("not-found");
      try {
        return await run(op as Operation, request);
      } catch (err) {
        if (err instanceof Fail) return failure(err.code, err.code === "unavailable" ? (err.retryAfter ?? 60) : err.retryAfter);
        // The store failed (or something unforeseen): its kind only, never a value.
        console.error(`[ulune:account] ${err instanceof StoreUnavailable ? err.message : err instanceof Error ? err.name : "error"}`);
        return failure("unavailable", 60);
      }
    },

    async cleanupRequest(request) {
      if (request.method !== "GET") return failure("method");
      const expected = config.cronSecret;
      if (!expected || !config.store) return failure("unavailable", 3600);
      const given = request.headers.get("authorization") ?? "";
      const digest = async (text: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", utf8(text)));
      if (!sameSecret(await digest(given), await digest(`Bearer ${expected}`))) return failure("denied");
      try {
        return answer(await cleanup());
      } catch (err) {
        console.error(`[ulune:account] cleanup ${err instanceof StoreUnavailable ? err.message : err instanceof Error ? err.name : "error"}`);
        return failure("unavailable", 3600);
      }
    },

    cleanup,
  };
}

/** The operation an address names (after /api/account/v1/), or "" for none. */
export function operationOf(url: string): string {
  const path = new URL(url).pathname;
  return path.startsWith(API_BASE) ? path.slice(API_BASE.length) : "";
}
