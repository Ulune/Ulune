import { b64u, fromB64u, randomBytes } from "../encoding";
import type { AssertionIn } from "../protocol";

/*
 * Passkeys for the synced account (share and compare plan, feature 4; docs/sync-protocol.md, 4.2):
 * made with the server's challenge, so the server can check them later, for the account's id as
 * the user, required to be discoverable (a new device signs in without knowing the account), and
 * asked for their PRF secret with the protocol's one fixed salt. The same secret wraps the space's
 * data key on this device (lib/space/vault.ts, with that salt as the passkey's) and the account's
 * copy on the server (keys.ts, passkeyKek): one passkey opens both, on every device its password
 * manager reaches. The secret never leaves the device.
 *
 * As with the space's own passkeys, the system's window is asked for straight from the click that
 * wants it: the challenge is fetched before (setup.ts), never awaited in between.
 */

/** SHA-256("ulune/account/v1/prf"), the protocol's fixed PRF salt (keys.ts, prfSalt; checked by the tests). */
export const ACCOUNT_PRF_SALT = "D7Ze0J5tA8XpCVGRDtqRJkVFEwv1hkZvdVIr9e2O6hE";

type PrfResults = { prf?: { enabled?: boolean; results?: { first?: BufferSource } } };

function bytesOf(source: BufferSource): Uint8Array<ArrayBuffer> {
  return source instanceof ArrayBuffer
    ? new Uint8Array(source.slice(0))
    : new Uint8Array(source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength) as ArrayBuffer);
}

/*
 * The space's passkey refusals, label and clean-up, as lib/space/passkey.ts has them, written again here
 * rather than imported: the sheet tells the refusals apart by their names, and that file stays in the
 * sheet's own download instead of becoming one more file the sheet's list (on "/") names.
 */
type Refused = "PasskeyCancelled" | "PasskeyExists" | "PasskeyNoPrf";
const REFUSED: Record<Refused, string> = { PasskeyCancelled: "passkey-cancelled", PasskeyExists: "passkey-exists", PasskeyNoPrf: "passkey-no-prf" };

function refused(name: Refused): Error {
  const err = new Error(REFUSED[name]);
  err.name = name;
  return err;
}

/** What the passkey managers show for Ulune's passkeys: nothing about the reader. */
const PASSKEY_LABEL = "Ulune private space";

/** A passkey just made that opens nothing: the browser is told to forget it, where it can. */
function forgetUnusedPasskey(credId: string): void {
  const pkc = PublicKeyCredential as unknown as { signalUnknownCredential?: (o: { rpId: string; credentialId: string }) => Promise<void> };
  try {
    void pkc.signalUnknownCredential?.({ rpId: window.location.hostname, credentialId: credId })?.catch(() => {});
  } catch {
    /* not offered here */
  }
}

function refusal(err: unknown): unknown {
  if (err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "AbortError")) return refused("PasskeyCancelled");
  if (err instanceof DOMException && err.name === "InvalidStateError") return refused("PasskeyExists");
  if (err instanceof DOMException && err.name === "NotSupportedError") return refused("PasskeyNoPrf");
  return err;
}

const salt = () => fromB64u(ACCOUNT_PRF_SALT)!;

/** A passkey just made for the account: what the server checks, and its secret for this device. */
export type MadePasskey = {
  credential: { id: string; clientDataJSON: string; attestationObject: string };
  credId: string;
  prf: Uint8Array<ArrayBuffer>;
};

/**
 * Make a passkey for the account (`challenge` and `rpId` from account/begin or ways/begin; `exclude`:
 * the account's passkeys already, which an authenticator holding one refuses to repeat) and read its
 * secret: at once where the authenticator gives it, otherwise with a second touch.
 */
export async function makeAccountPasskey(begin: { challenge: string; rpId: string }, account: string, exclude: readonly string[] = []): Promise<MadePasskey> {
  const userId = fromB64u(account);
  const challenge = fromB64u(begin.challenge);
  if (!userId || !challenge) throw new Error("bad-begin");
  let made: PublicKeyCredential | null;
  try {
    made = (await navigator.credentials.create({
      publicKey: {
        rp: { id: begin.rpId, name: "Ulune" },
        user: { id: userId, name: PASSKEY_LABEL, displayName: PASSKEY_LABEL },
        challenge,
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -8 },
          { type: "public-key", alg: -257 },
        ],
        authenticatorSelection: { residentKey: "required", userVerification: "required" },
        attestation: "none",
        excludeCredentials: exclude.flatMap((id) => {
          const bytes = fromB64u(id);
          return bytes ? [{ type: "public-key" as const, id: bytes }] : [];
        }),
        timeout: 120_000,
        extensions: { prf: { eval: { first: salt() } } } as AuthenticationExtensionsClientInputs,
      },
    })) as PublicKeyCredential | null;
  } catch (err) {
    throw refusal(err);
  }
  if (!made) throw refused("PasskeyCancelled");
  const credId = b64u(new Uint8Array(made.rawId));
  const response = made.response as AuthenticatorAttestationResponse;
  const credential = {
    id: credId,
    clientDataJSON: b64u(new Uint8Array(response.clientDataJSON)),
    attestationObject: b64u(new Uint8Array(response.attestationObject)),
  };
  const ext = (made.getClientExtensionResults() as PrfResults).prf;
  if (ext?.enabled === false) {
    forgetUnusedPasskey(credId);
    throw refused("PasskeyNoPrf");
  }
  const first = ext?.results?.first;
  if (first) return { credential, credId, prf: bytesOf(first) };
  try {
    // A second touch, for the secret alone: the server takes no part, any challenge does.
    const read = await getAccountPasskey(b64u(randomBytes(32)), begin.rpId, [credId]);
    return { credential, credId, prf: read.prf };
  } catch (err) {
    forgetUnusedPasskey(credId);
    throw err;
  }
}

/** A passkey's answer to a challenge: what the server checks (passkey/finish), and its secret for the fixed salt. */
export type ReadPasskey = { assertion: AssertionIn; credId: string; prf: Uint8Array<ArrayBuffer> };

/**
 * Ask for one of the reader's passkeys (`allow` empty: any of theirs for Ulune, as on a new device)
 * to sign the server's challenge and give its secret; `salts` gives a passkey made for the space
 * alone its own salt (lib/space/passkey.ts), so the same touch also opens the space here.
 */
export async function getAccountPasskey(
  challenge: string,
  rpId: string,
  allow: readonly string[] = [],
  salts: Readonly<Record<string, string>> = {},
): Promise<ReadPasskey> {
  const bytes = fromB64u(challenge);
  if (!bytes) throw new Error("bad-challenge");
  const byCredential: Record<string, { first: BufferSource }> = {};
  for (const id of allow) byCredential[id] = { first: fromB64u(salts[id] ?? ACCOUNT_PRF_SALT)! };
  let assertion: PublicKeyCredential | null;
  try {
    assertion = (await navigator.credentials.get({
      publicKey: {
        challenge: bytes,
        rpId,
        userVerification: "required",
        timeout: 120_000,
        allowCredentials: allow.flatMap((id) => {
          const raw = fromB64u(id);
          return raw ? [{ type: "public-key" as const, id: raw }] : [];
        }),
        extensions: {
          prf: allow.length ? { eval: { first: salt() }, evalByCredential: byCredential } : { eval: { first: salt() } },
        } as AuthenticationExtensionsClientInputs,
      },
    })) as PublicKeyCredential | null;
  } catch (err) {
    throw refusal(err);
  }
  if (!assertion) throw refused("PasskeyCancelled");
  const first = (assertion.getClientExtensionResults() as PrfResults).prf?.results?.first;
  if (!first) throw refused("PasskeyNoPrf");
  const response = assertion.response as AuthenticatorAssertionResponse;
  const credId = b64u(new Uint8Array(assertion.rawId));
  const handle = response.userHandle && response.userHandle.byteLength ? b64u(new Uint8Array(response.userHandle)) : undefined;
  return {
    credId,
    prf: bytesOf(first),
    assertion: {
      id: credId,
      clientDataJSON: b64u(new Uint8Array(response.clientDataJSON)),
      authenticatorData: b64u(new Uint8Array(response.authenticatorData)),
      signature: b64u(new Uint8Array(response.signature)),
      ...(handle ? { userHandle: handle } : {}),
    },
  };
}
