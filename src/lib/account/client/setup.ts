import { b64u, fromB64u, randomBytes } from "../encoding";
import {
  linkQr,
  linkSecrets,
  newDeviceKey,
  newLinkKey,
  openDeviceName,
  openLinkPayload,
  openRecord,
  passkeyKek,
  passphraseSecrets,
  readLinkQr,
  recoveryKek,
  recoverySecrets,
  sealDeviceName,
  sealLinkPayload,
  signWithDevice,
  unwrapDataKey,
  wrapAad,
  wrapDataKey,
} from "../keys";
import {
  ARGON_DEFAULT,
  type BeginAnswer,
  type ChangesAnswer,
  type CreateAnswer,
  type DeviceRowOut,
  type LinkState,
  type SignInAnswer,
  type TakeAnswer,
  type WayRowOut,
} from "../protocol";
import { newRecoveryCode, parseRecoveryCode } from "@/lib/space/crypto";
import { loadSpaceRuntime } from "@/lib/space/load";
import { SYNC_RECORD } from "@/lib/space/records";
import type { WayIn } from "@/lib/space/vault";
import { AccountFailure, AccountSession, fetchTransport, type Issued } from "./api";
import { contentHash, newSyncState, type SyncState } from "./engine";
import { syncKeyBytes, syncKeysFrom } from "./keyring";
import { SPACE_WAYS, keepsBase, kindOf, syncs, waysUsable } from "./merge";
import { ACCOUNT_PRF_SALT, type MadePasskey, type ReadPasskey } from "./passkeys";
import { runningSync } from "./runner";
import type { SpaceWays } from "./space-local";

/*
 * The synced account set up from the device (share and compare plan, feature 4;
 * docs/sync-protocol.md, sections 4, 7, 8 and 9): an account made with a new private space or for
 * one already here; a new device signed in by a passkey, the account id and the passphrase, the
 * recovery code, or a QR code from a device already signed in (both screens show the six digits
 * to compare); the account's ways in kept in step with the space's; devices listed (their names
 * sealed), named and removed; the account deleted. The space's own side is lib/space/runtime.ts.
 *
 * The data key's bytes are needed only here, once per operation (making the account's wraps,
 * giving the key to a new device), from a way in given again; they are wiped after.
 */

const transport = fetchTransport();

/** A way in to the account, as the server answers it begun (account/begin, passkey/begin, ways/begin). */
export type Begun = BeginAnswer & { account?: string; exclude?: string[] };

/** Fetched before a passkey's window opens, which must open straight from the reader's click. */
export async function beginAccount(): Promise<Begun & { account: string }> {
  return (await transport("account/begin", {})) as Begun & { account: string };
}

export async function beginPasskeySignIn(): Promise<Begun> {
  return (await transport("passkey/begin", {})) as Begun;
}

/** A new passkey for the account this device syncs with (ways/begin: the challenge and the passkeys it has). */
export async function beginAddPasskey(): Promise<Begun & { account: string }> {
  const r = need();
  const begun = await r.session.call<Begun>("ways/begin", {});
  return { ...begun, account: r.account };
}

function need() {
  const r = runningSync();
  if (!r) throw new Error("not-syncing");
  return r;
}

/** This device as the reader's list shows it: its kind and browser, nothing more ("Mac · Safari"). */
export function deviceLabel(): string {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  const os = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua) || (/Macintosh/.test(ua) && typeof navigator !== "undefined" && navigator.maxTouchPoints > 1)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Macintosh|Mac OS X/.test(ua)
          ? "Mac"
          : /Windows/.test(ua)
            ? "Windows"
            : /CrOS/.test(ua)
              ? "Chromebook"
              : /Linux/.test(ua)
                ? "Linux"
                : "";
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /OPR\//.test(ua) ? "Opera" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "";
  return [os, browser].filter(Boolean).join(" · ") || "Ulune";
}

async function passphraseWay(rawKey: Uint8Array, account: string, passphrase: string) {
  const salt = randomBytes(16);
  const { authKey, kek } = await passphraseSecrets(passphrase, account, salt);
  return { salt: b64u(salt), ...ARGON_DEFAULT, authKey: b64u(authKey), wrap: b64u(await wrapDataKey(rawKey, kek, wrapAad(account, "passphrase"))) };
}

async function recoveryWay(rawKey: Uint8Array, account: string, code: string) {
  const rec = await recoverySecrets(code);
  return { lookup: b64u(rec.lookup), authKey: b64u(rec.authKey), wrap: b64u(await wrapDataKey(rawKey, await recoveryKek(code, account), wrapAad(account, "recovery"))) };
}

async function passkeyWay(rawKey: Uint8Array, account: string, made: MadePasskey) {
  const kek = await passkeyKek(made.prf, account, made.credId);
  return { credential: made.credential, wrap: b64u(await wrapDataKey(rawKey, kek, wrapAad(account, "passkey", made.credId))) };
}

type Made = { session: AccountSession; state: SyncState; deviceKey: CryptoKey };

/**
 * An account for the data key: the passphrase (as the space's) and a passkey, when given, and
 * always the recovery code (the space's too); this device's key; the account's state for the space.
 */
async function createAccountFor(rawKey: Uint8Array, ways: { passphrase?: string; passkey?: MadePasskey; code: string; begun?: Begun & { account: string } }): Promise<Made> {
  const begun = ways.begun ?? (await beginAccount());
  const account = begun.account;
  const device = await newDeviceKey();
  const body: Record<string, unknown> = { account, challenge: begun.challenge, device: { key: b64u(device.publicKey) } };
  if (ways.passphrase) body.passphrase = await passphraseWay(rawKey, account, ways.passphrase);
  if (ways.passkey) body.passkey = await passkeyWay(rawKey, account, ways.passkey);
  body.recovery = await recoveryWay(rawKey, account, ways.code);
  const made = (await transport("account/create", body)) as CreateAnswer;
  const session = new AccountSession(transport, { account, device: made.device }, device.privateKey);
  session.adopt(made);
  return { session, state: newSyncState(account, made.device, await syncKeyBytes(rawKey, account)), deviceKey: device.privateKey };
}

/** This device names itself in the account (sealed: the server sees 128 bytes). Best effort. */
async function nameDevice(session: AccountSession, state: SyncState): Promise<void> {
  if (!state.keys) return;
  try {
    const keys = await syncKeysFrom(state.account, state.keys);
    const label = deviceLabel();
    const sealed = await sealDeviceName(keys, session.device, label);
    await session.call("devices/rename", { device: session.device, name: b64u(sealed) });
    state.name = label;
  } catch {
    /* named another time */
  }
}

/* ------------------------------------------------------------ an account made on this device */

export type Created = { code: string; account: string | null };

/**
 * A new private space that syncs (the sheet's "On this device and my other devices"): the space is
 * made first, so a reader offline or a server down still has it, on this device only; then the
 * account, with the same passphrase or passkey and the same recovery code.
 */
export async function createSyncedSpace(opts: { passphrase?: string; passkey?: MadePasskey; begun?: Begun & { account: string }; shared: boolean }): Promise<Created> {
  const runtime = await loadSpaceRuntime();
  const first = opts.passphrase ? { passphrase: opts.passphrase } : { passkey: { credId: opts.passkey!.credId, prf: opts.passkey!.prf, prfSalt: ACCOUNT_PRF_SALT } };
  const seed = opts.passkey && opts.begun ? { id: b64u(randomBytes(16)), passkeyUser: opts.begun.account } : undefined;
  const { recoveryCode, rawKey } = await runtime.createSpaceWithKey(first, seed, opts.shared);
  try {
    const made = await createAccountFor(rawKey, { passphrase: opts.passphrase, passkey: opts.passkey, code: recoveryCode, begun: opts.passkey ? opts.begun : undefined });
    await nameDevice(made.session, made.state);
    await runtime.attachAccount(made.state, made.deviceKey);
    return { code: recoveryCode, account: made.state.account };
  } catch {
    return { code: recoveryCode, account: null };
  } finally {
    rawKey.fill(0);
  }
}

/**
 * Sync turned on for the space open here (Settings): the data key from a way in given again; a new
 * recovery code for the space and the account (the old one stops working); the passphrase, when
 * given, the account's too; a new passkey for the account, when made, the space's too.
 */
export async function turnOnSync(way: WayIn, opts: { passphrase?: string; passkey?: MadePasskey; begun?: Begun & { account: string } }): Promise<{ code: string; account: string }> {
  const runtime = await loadSpaceRuntime();
  const vault = runtime.currentVault();
  if (!vault) throw new Error("space-locked");
  if (!opts.passphrase && !opts.passkey) throw new Error("no-way-in");
  const rawKey = await vault.rawKey(way);
  try {
    const code = newRecoveryCode();
    const made = await createAccountFor(rawKey, { passphrase: opts.passphrase, passkey: opts.passkey, code, begun: opts.passkey ? opts.begun : undefined });
    try {
      await vault.newRecoveryCode(way, code);
      if (opts.passkey) await vault.addPasskey(way, { credId: opts.passkey.credId, prf: opts.passkey.prf, prfSalt: ACCOUNT_PRF_SALT });
      if (opts.passphrase && !vault.meta.wraps.some((w) => w.kind === "passphrase")) await vault.setPassphrase(way, opts.passphrase);
      runtime.spaceChanged();
    } catch (err) {
      // The space could not take the account's ways in: the account goes again, nothing changed here.
      await made.session.callFresh("account/delete", { confirm: "delete-everything" }).catch(() => {});
      throw err;
    }
    await nameDevice(made.session, made.state);
    await runtime.attachAccount(made.state, made.deviceKey);
    return { code, account: made.state.account };
  } finally {
    rawKey.fill(0);
  }
}

/* ------------------------------------------------------------ a new device */

export type Joined = { charts: number };

type SignedIn = { session: AccountSession; rawKey: Uint8Array<ArrayBuffer>; deviceKey: CryptoKey };

/**
 * The space made on this device from the account's copy, once a way in gave the data key: every
 * record read and opened, the space's ways in from "space/ways" (its id, the same passphrase,
 * passkeys and recovery code), each record sealed here, the engine's state as of now. A space
 * already open here joins it: its charts, groups, notes, homes and bookmarks are added (they sync
 * from then on). Without the other device's ways in yet ("not-ready"), nothing is made.
 */
async function buildFromAccount(signed: SignedIn, shared: boolean): Promise<Joined> {
  const { session } = signed;
  const account = session.account;
  try {
    const keyBytes = await syncKeyBytes(signed.rawKey, account);
    const keys = await syncKeysFrom(account, keyBytes);
    const records = new Map<string, { value: unknown; v: number; t: number }>();
    let cursor = 0;
    for (let page = 0; page < 10_000; page += 1) {
      const answer = await session.call<ChangesAnswer>("records/changes", { cursor, limit: 200 });
      if (answer.reset) {
        cursor = 0;
        records.clear();
        continue;
      }
      for (const c of answer.changes) {
        const blob = c.blob ? fromB64u(c.blob) : null;
        if (!blob) continue;
        try {
          const envelope = await openRecord(keys, c.rid, blob);
          if (syncs(envelope.n)) records.set(envelope.n, { value: envelope.v, v: c.version, t: envelope.t });
        } catch {
          /* not one this key opens: left out */
        }
      }
      cursor = answer.cursor;
      if (!answer.more) break;
    }
    const ways = records.get(SPACE_WAYS)?.value as SpaceWays | undefined;
    if (!ways || typeof ways.id !== "string" || !Array.isArray(ways.wraps) || !waysUsable(ways.wraps as unknown as Record<string, unknown>[])) throw new Error("not-ready");
    const state = newSyncState(account, session.device, keyBytes);
    state.cursor = cursor;
    for (const [name, r] of records) {
      state.known[name] = { v: r.v, fp: "", h: await contentHash(r.value), t: r.t };
      if (keepsBase(kindOf(name))) state.bases[name] = r.value;
    }
    state.known[SPACE_WAYS] = { ...state.known[SPACE_WAYS]!, fp: `w.${await contentHash({ id: ways.id, passkeyUser: ways.passkeyUser, wraps: ways.wraps })}` };
    const runtime = await loadSpaceRuntime();
    // This device's own space, when one is open here: read before it is replaced, joined after.
    const before = runtime.currentVault() ? await runtime.readAllRecords() : null;
    await nameDevice(session, state);
    await runtime.adoptSyncedSpace({
      rawKey: signed.rawKey,
      ways: { id: ways.id, passkeyUser: ways.passkeyUser, wraps: ways.wraps },
      records: [...records].filter(([name]) => name !== SPACE_WAYS).map(([name, r]) => [name, r.value] as const),
      state,
      deviceKey: signed.deviceKey,
      shared,
    });
    let charts = 0;
    const vault = runtime.currentVault();
    if (before && vault) charts = await runtime.importRecords(vault, before);
    return { charts };
  } finally {
    signed.rawKey.fill(0);
  }
}

/** The account id as typed or pasted (account-id.ts): base32 as shown, or base64url; and as it is shown. */
export { formatAccountId, readAccountId } from "./account-id";

/** A new device signs in with the account id and the passphrase. A wrong pair: AccountFailure "denied". */
export async function joinWithPassphrase(account: string, passphrase: string, shared: boolean): Promise<Joined> {
  const params = (await transport("passphrase/params", { account })) as { salt: string; m: number; t: number; p: number };
  const salt = fromB64u(params.salt);
  if (!salt) throw new AccountFailure("bad-request");
  const { authKey, kek } = await passphraseSecrets(passphrase, account, salt, { m: params.m, t: params.t, p: params.p });
  const device = await newDeviceKey();
  const answer = (await transport("passphrase/sign-in", { account, authKey: b64u(authKey), device: { key: b64u(device.publicKey) } })) as SignInAnswer;
  const rawKey = await unwrapDataKey(fromB64u(answer.way.wrap)!, kek, wrapAad(account, "passphrase"));
  return await buildFromAccount(signedIn(answer, device.privateKey, rawKey), shared);
}

/** A new device signs in with the recovery code alone. */
export async function joinWithRecovery(typed: string, shared: boolean): Promise<Joined> {
  const code = parseRecoveryCode(typed);
  if (!code) throw new AccountFailure("denied", 401);
  const rec = await recoverySecrets(code);
  const device = await newDeviceKey();
  const answer = (await transport("recovery/sign-in", { lookup: b64u(rec.lookup), authKey: b64u(rec.authKey), device: { key: b64u(device.publicKey) } })) as SignInAnswer;
  const rawKey = await unwrapDataKey(fromB64u(answer.way.wrap)!, await recoveryKek(code, answer.account), wrapAad(answer.account, "recovery"));
  return await buildFromAccount(signedIn(answer, device.privateKey, rawKey), shared);
}

/** A new device signs in with a passkey the reader's password manager brought (read from the click, passkeys.ts). */
export async function joinWithPasskey(read: ReadPasskey, shared: boolean): Promise<Joined> {
  const device = await newDeviceKey();
  const answer = (await transport("passkey/finish", { credential: read.assertion, device: { key: b64u(device.publicKey) } })) as SignInAnswer;
  const kek = await passkeyKek(read.prf, answer.account, read.credId);
  const rawKey = await unwrapDataKey(fromB64u(answer.way.wrap)!, kek, wrapAad(answer.account, "passkey", read.credId));
  return await buildFromAccount(signedIn(answer, device.privateKey, rawKey), shared);
}

function signedIn(answer: SignInAnswer, deviceKey: CryptoKey, rawKey: Uint8Array<ArrayBuffer>): SignedIn {
  const session = new AccountSession(transport, { account: answer.account, device: answer.device }, deviceKey);
  session.adopt(answer);
  return { session, rawKey, deviceKey };
}

/* ------------------------------------------------------------ adding a device by QR code (section 8) */

/** What a QR code of Ulune's carries: the address of its /link page, the link and the opener's key after "#". */
export function linkAddress(text: string): string {
  return `${window.location.origin}/link#${text}`;
}

/** The QR text out of a scanned code or a pasted address; null when it is not one. */
export function linkText(scanned: string): string | null {
  const text = scanned.trim();
  const fragment = text.includes("#") ? text.slice(text.indexOf("#") + 1) : text;
  return readLinkQr(fragment) ? fragment : null;
}

/** One side of a device link while it is under way. */
export type LinkSide = {
  role: "giver" | "taker";
  link: string;
  /** The QR text this side shows (when it opened the link). */
  text: string | null;
  privateKey: CryptoKey;
  epk: Uint8Array<ArrayBuffer>;
  /** The other side's key, once known. */
  peer: Uint8Array<ArrayBuffer> | null;
  /** The taker's own device key (a new device). */
  device: { privateKey: CryptoKey; publicKey: Uint8Array<ArrayBuffer> } | null;
  code: string | null;
  key: CryptoKey | null;
  /** When the link ends (ms). */
  ends: number;
};

/** The signed-in device shows a QR code for the new one to scan. */
export async function openLinkAsGiver(): Promise<LinkSide> {
  const r = need();
  const mine = await newLinkKey();
  const open = await r.session.call<{ link: string; ttl: number }>("link/open", { epk: b64u(mine.epk) });
  return { role: "giver", link: open.link, text: linkQr(open.link, mine.epk), privateKey: mine.privateKey, epk: mine.epk, peer: null, device: null, code: null, key: null, ends: Date.now() + open.ttl * 1000 };
}

/** The new device shows a QR code for the signed-in one to scan. */
export async function openLinkAsTaker(): Promise<LinkSide> {
  const mine = await newLinkKey();
  const device = await newDeviceKey();
  const open = (await transport("link/open", { epk: b64u(mine.epk), device: { key: b64u(device.publicKey) } })) as { link: string; ttl: number };
  return { role: "taker", link: open.link, text: linkQr(open.link, mine.epk), privateKey: mine.privateKey, epk: mine.epk, peer: null, device, code: null, key: null, ends: Date.now() + open.ttl * 1000 };
}

async function withCode(side: LinkSide, peer: Uint8Array<ArrayBuffer>): Promise<LinkSide> {
  const [giverEpk, takerEpk] = side.role === "giver" ? [side.epk, peer] : [peer, side.epk];
  const { code, key } = await linkSecrets(side.privateKey, peer, side.link, giverEpk, takerEpk);
  return { ...side, peer, code, key };
}

/** A scanned code (or a link opened here) joined: the signed-in device as the giver, or this new one as the taker. */
export async function joinLink(text: string, role: "giver" | "taker"): Promise<LinkSide> {
  const qr = readLinkQr(text);
  if (!qr) throw new AccountFailure("gone", 410);
  const mine = await newLinkKey();
  let answer: { peer: string };
  let device: LinkSide["device"] = null;
  if (role === "giver") {
    answer = await need().session.call<{ peer: string }>("link/join", { link: qr.link, epk: b64u(mine.epk) });
  } else {
    device = await newDeviceKey();
    answer = (await transport("link/join", { link: qr.link, epk: b64u(mine.epk), device: { key: b64u(device.publicKey) } })) as { peer: string };
  }
  // The opener's key as the server has it must be the one in the code: otherwise someone is in between.
  if (answer.peer !== b64u(qr.epk)) throw new Error("link-mismatch");
  const side: LinkSide = { role, link: qr.link, text: null, privateKey: mine.privateKey, epk: mine.epk, peer: null, device, code: null, key: null, ends: Date.now() + 10 * 60_000 };
  return await withCode(side, qr.epk);
}

/** Where the link is (open, joined, given); the opener learns the other side's key, and with it the code. */
export async function linkProgress(side: LinkSide): Promise<{ state: LinkState["state"]; side: LinkSide }> {
  const state = (await transport("link/state", { link: side.link })) as LinkState;
  if (!side.code) {
    const other = side.role === "giver" ? state.taker : state.giver;
    const peer = other ? fromB64u(other) : null;
    if (peer) return { state: state.state, side: await withCode(side, peer) };
  }
  return { state: state.state, side };
}

/**
 * The giver, after its reader said the codes match (and gave a way in again): the account and the
 * data key, sealed for the new device with the link's key. The server adds the new device.
 */
export async function giveLink(side: LinkSide, way: WayIn): Promise<void> {
  const r = need();
  if (!side.key) throw new Error("no-code");
  const rawKey = await r.vault.rawKey(way);
  try {
    const sealed = await sealLinkPayload(side.key, side.link, { v: 1, account: r.account, key: b64u(rawKey) });
    await r.session.call("link/give", { link: side.link, sealed: b64u(sealed) });
  } finally {
    rawKey.fill(0);
  }
}

/** The new device, after its reader said the codes match: the sealed key taken, and the space made here. */
export async function takeLink(side: LinkSide, shared: boolean): Promise<Joined> {
  if (!side.key || !side.device) throw new Error("no-code");
  const signature = await signWithDevice(side.device.privateKey, "link-take", side.link);
  const taken = (await transport("link/take", { link: side.link, signature })) as TakeAnswer;
  const payload = await openLinkPayload(side.key, side.link, fromB64u(taken.sealed)!).catch(() => null);
  if (!payload || payload.account !== taken.account) throw new Error("link-mismatch");
  const rawKey = fromB64u(payload.key);
  if (!rawKey || rawKey.byteLength !== 32) throw new Error("link-mismatch");
  const session = new AccountSession(transport, { account: taken.account, device: taken.device }, side.device.privateKey);
  session.adopt({ token: taken.token, ttl: taken.ttl });
  return await buildFromAccount({ session, rawKey, deviceKey: side.device.privateKey }, shared);
}

/** A link given up (either side): the mailbox goes. */
export async function closeLink(side: LinkSide | null): Promise<void> {
  if (!side) return;
  await transport("link/close", { link: side.link }).catch(() => {});
}

/* ------------------------------------------------------------ signing in again, fresh */

/** A way in given again, as the account checks it (a passkey's answer to the account's challenge). */
export type AccountWay = WayIn | { read: ReadPasskey };

/**
 * The same device signed in again with a way in, for what needs a fresh sign-in (changing the ways
 * in, removing a device, deleting the account). A way the account does not know: "denied".
 */
export async function signInFresh(way: AccountWay): Promise<void> {
  const r = need();
  const token = await r.session.bearer();
  let issued: Issued;
  if ("passphrase" in way) {
    const params = (await transport("passphrase/params", { account: r.account })) as { salt: string; m: number; t: number; p: number };
    const { authKey } = await passphraseSecrets(way.passphrase, r.account, fromB64u(params.salt)!, { m: params.m, t: params.t, p: params.p });
    issued = (await transport("passphrase/sign-in", { account: r.account, authKey: b64u(authKey) }, token)) as SignInAnswer;
  } else if ("recovery" in way) {
    const code = parseRecoveryCode(way.recovery);
    if (!code) throw new AccountFailure("denied", 401);
    const rec = await recoverySecrets(code);
    issued = (await transport("recovery/sign-in", { lookup: b64u(rec.lookup), authKey: b64u(rec.authKey) }, token)) as SignInAnswer;
  } else if ("read" in way) {
    issued = (await transport("passkey/finish", { credential: way.read.assertion }, token)) as SignInAnswer;
  } else {
    throw new AccountFailure("denied", 401);
  }
  r.session.adopt(issued);
}

/**
 * This device again, after it was removed from the account (sync paused): a new device of the same
 * account, signed in with a way in; the space and its state stay as they are, and sync goes on.
 */
export async function signInAgain(way: AccountWay): Promise<void> {
  const runtime = await loadSpaceRuntime();
  const vault = runtime.currentVault();
  if (!vault) throw new Error("space-locked");
  const state = await vault.get<SyncState>(SYNC_RECORD);
  if (!state) throw new Error("not-syncing");
  const device = await newDeviceKey();
  const key = { key: b64u(device.publicKey) };
  let answer: SignInAnswer;
  if ("passphrase" in way) {
    const params = (await transport("passphrase/params", { account: state.account })) as { salt: string; m: number; t: number; p: number };
    const { authKey } = await passphraseSecrets(way.passphrase, state.account, fromB64u(params.salt)!, { m: params.m, t: params.t, p: params.p });
    answer = (await transport("passphrase/sign-in", { account: state.account, authKey: b64u(authKey), device: key })) as SignInAnswer;
  } else if ("recovery" in way) {
    const code = parseRecoveryCode(way.recovery);
    if (!code) throw new AccountFailure("denied", 401);
    const rec = await recoverySecrets(code);
    answer = (await transport("recovery/sign-in", { lookup: b64u(rec.lookup), authKey: b64u(rec.authKey), device: key })) as SignInAnswer;
  } else if ("read" in way) {
    answer = (await transport("passkey/finish", { credential: way.read.assertion, device: key })) as SignInAnswer;
  } else {
    throw new AccountFailure("denied", 401);
  }
  if (answer.account !== state.account) throw new AccountFailure("denied", 401);
  const next: SyncState = { ...state, device: answer.device };
  const session = new AccountSession(transport, { account: answer.account, device: answer.device }, device.privateKey);
  session.adopt(answer);
  await nameDevice(session, next);
  await runtime.attachAccount(next, device.privateKey);
}

/* ------------------------------------------------------------ the ways in, in step with the space's */

async function wayOf(kind: WayRowOut["kind"], credential?: string): Promise<string | null> {
  const r = need();
  const { ways } = await r.session.call<{ ways: WayRowOut[] }>("ways/list", {});
  return ways.find((w) => w.kind === kind && (credential === undefined || w.credential === credential))?.id ?? null;
}

/** The space's new passphrase, the account's too (after a fresh sign-in; the data key from the way given). */
export async function accountSetPassphrase(way: WayIn, passphrase: string): Promise<void> {
  const r = need();
  const rawKey = await r.vault.rawKey(way);
  try {
    await r.session.callFresh("ways/add", { passphrase: await passphraseWay(rawKey, r.account, passphrase) });
  } finally {
    rawKey.fill(0);
  }
}

/** The space's new recovery code, the account's too. */
export async function accountSetCode(way: WayIn, code: string): Promise<void> {
  const r = need();
  const rawKey = await r.vault.rawKey(way);
  try {
    await r.session.callFresh("ways/add", { recovery: await recoveryWay(rawKey, r.account, code) });
  } finally {
    rawKey.fill(0);
  }
}

/** A passkey made for the account (with ways/begin's challenge), added to it. */
export async function accountAddPasskey(way: WayIn, made: MadePasskey, begun: Begun): Promise<void> {
  const r = need();
  const rawKey = await r.vault.rawKey(way);
  try {
    await r.session.callFresh("ways/add", { challenge: begun.challenge, passkey: await passkeyWay(rawKey, r.account, made) });
  } finally {
    rawKey.fill(0);
  }
}

export async function accountRemovePassphrase(): Promise<void> {
  const id = await wayOf("passphrase");
  if (id) await need().session.callFresh("ways/remove", { way: id });
}

/** A passkey of the space's removed from the account too, when the account has it. */
export async function accountRemovePasskey(credId: string): Promise<void> {
  const id = await wayOf("passkey", credId);
  if (id) await need().session.callFresh("ways/remove", { way: id });
}

/** The account's passkeys (their credential ids): those that sign a new device in. */
export async function accountPasskeys(): Promise<string[]> {
  const { ways } = await need().session.call<{ ways: WayRowOut[] }>("ways/list", {});
  return ways.flatMap((w) => (w.kind === "passkey" && w.credential ? [w.credential] : []));
}

/* ------------------------------------------------------------ devices and the account */

export type DeviceRow = { id: string; name: string | null; created: number; seen: number; current: boolean };

/** The account's devices, their names opened here (a name this key does not open shows as none). */
export async function listDevices(): Promise<DeviceRow[]> {
  const r = need();
  const { devices } = await r.session.call<{ devices: DeviceRowOut[] }>("devices/list", {});
  const out: DeviceRow[] = [];
  for (const d of devices) {
    let name: string | null = null;
    const sealed = d.name ? fromB64u(d.name) : null;
    if (sealed) name = await openDeviceName(r.keys, d.id, sealed).catch(() => null);
    out.push({ id: d.id, name, created: d.created, seen: d.seen, current: d.current });
  }
  return out.sort((a, b) => Number(b.current) - Number(a.current) || b.seen - a.seen);
}

/** Another device removed (after a fresh sign-in): its sessions end at once. */
export async function removeDevice(id: string): Promise<void> {
  await need().session.callFresh("devices/remove", { device: id });
}

/**
 * The account deleted (after a fresh sign-in): everything on the server goes at once; this device
 * stops syncing and keeps its space, unless the reader asked to erase it too.
 */
export async function deleteAccount(erase: boolean): Promise<void> {
  await need().session.callFresh("account/delete", { confirm: "delete-everything" });
  const runtime = await loadSpaceRuntime();
  await runtime.detachAccount();
  if (erase) await runtime.eraseSpace();
}

/** This device stops syncing (the account is gone, or the reader chose to): the space stays here. */
export async function leaveAccount(): Promise<void> {
  const r = runningSync();
  if (r) await r.session.call("devices/remove", { device: r.session.device }).catch(() => {});
  const runtime = await loadSpaceRuntime();
  await runtime.detachAccount();
}

/** For tests and the Settings page: the account id this device syncs with. */
export function accountId(): string | null {
  return runningSync()?.account ?? null;
}
