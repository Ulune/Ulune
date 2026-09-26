import { b64u, fromB64u, randomBytes } from "./crypto";

/*
 * Passkeys as a way into the private space (WebAuthn's PRF extension). A
 * passkey hashes a salt Ulune gives it into a secret only it can produce; the
 * secret wraps the space's data key (lib/space/crypto.ts, passkeyKek). The
 * passkey itself never leaves the phone, the computer or the keychain that
 * holds it, and Ulune's server takes no part: nothing is registered anywhere,
 * no signature is checked. What unlocks is the secret.
 */

/** The authenticator made the passkey but can't give it a PRF secret here. */
export class PasskeyNoPrf extends Error {
  constructor() {
    super("passkey-no-prf");
    this.name = "PasskeyNoPrf";
  }
}

/** The reader closed the system's passkey window, or it timed out. */
export class PasskeyCancelled extends Error {
  constructor() {
    super("passkey-cancelled");
    this.name = "PasskeyCancelled";
  }
}

/** The authenticator already holds one of this space's passkeys. */
export class PasskeyExists extends Error {
  constructor() {
    super("passkey-exists");
    this.name = "PasskeyExists";
  }
}

/** What the passkey managers show for Ulune's passkeys: nothing about the reader. */
export const PASSKEY_LABEL = "Ulune private space";

type PrfResults = { prf?: { enabled?: boolean; results?: { first?: BufferSource } } };

function bytesOf(source: BufferSource): Uint8Array {
  return source instanceof ArrayBuffer
    ? new Uint8Array(source.slice(0))
    : new Uint8Array(source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength));
}

function cancelled(err: unknown): boolean {
  return err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "AbortError");
}

/** The system's refusals, as the sheet words them. */
function refusal(err: unknown): unknown {
  if (cancelled(err)) return new PasskeyCancelled();
  if (err instanceof DOMException && err.name === "InvalidStateError") return new PasskeyExists();
  if (err instanceof DOMException && err.name === "NotSupportedError") return new PasskeyNoPrf();
  return err;
}

/**
 * A passkey just made that opens nothing (no secret, or the reader stopped
 * before it was read): the password manager is told it is unknown here, where
 * the browser can say so, so it doesn't stay in the reader's list.
 */
export function forgetUnusedPasskey(credId: string): void {
  const pkc = PublicKeyCredential as unknown as {
    signalUnknownCredential?: (o: { rpId: string; credentialId: string }) => Promise<void>;
  };
  try {
    void pkc.signalUnknownCredential?.({ rpId: window.location.hostname, credentialId: credId })?.catch(() => {});
  } catch {
    /* not offered here */
  }
}

export type PasskeyRef = { credId: string; prfSalt: string };
export type PasskeySecretRead = { credId: string; prf: Uint8Array };

/** Ask one of these passkeys for its secret (the system shows its own window). */
export async function readPasskey(passkeys: readonly PasskeyRef[]): Promise<PasskeySecretRead> {
  let assertion: PublicKeyCredential | null;
  try {
    assertion = (await navigator.credentials.get({
      publicKey: {
        challenge: randomBytes(32),
        allowCredentials: passkeys.map((p) => ({ type: "public-key" as const, id: fromB64u(p.credId) })),
        userVerification: "required",
        timeout: 120_000,
        extensions: {
          prf: {
            evalByCredential: Object.fromEntries(passkeys.map((p) => [p.credId, { first: fromB64u(p.prfSalt) }])),
          },
        } as AuthenticationExtensionsClientInputs,
      },
    })) as PublicKeyCredential | null;
  } catch (err) {
    throw refusal(err);
  }
  if (!assertion) throw new PasskeyCancelled();
  const first = (assertion.getClientExtensionResults() as PrfResults).prf?.results?.first;
  if (!first) throw new PasskeyNoPrf();
  return { credId: b64u(new Uint8Array(assertion.rawId)), prf: bytesOf(first) };
}

/**
 * Make a passkey for the space (`userId`: the space's passkey user, the same
 * for all its passkeys; `existing`: its passkeys already, which an
 * authenticator holding one refuses to duplicate) and read its secret: at
 * once where the authenticator gives it while making it, otherwise with a
 * second touch.
 */
export async function makePasskey(
  userId: string,
  existing: readonly string[] = [],
): Promise<PasskeySecretRead & { prfSalt: string }> {
  const salt = randomBytes(32);
  let made: PublicKeyCredential | null;
  try {
    made = (await navigator.credentials.create({
      publicKey: {
        rp: { name: "Ulune" },
        user: { id: fromB64u(userId), name: PASSKEY_LABEL, displayName: PASSKEY_LABEL },
        challenge: randomBytes(32),
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 },
        ],
        authenticatorSelection: { residentKey: "preferred", userVerification: "required" },
        excludeCredentials: existing.map((id) => ({ type: "public-key" as const, id: fromB64u(id) })),
        timeout: 120_000,
        extensions: { prf: { eval: { first: salt } } } as AuthenticationExtensionsClientInputs,
      },
    })) as PublicKeyCredential | null;
  } catch (err) {
    throw refusal(err);
  }
  if (!made) throw new PasskeyCancelled();
  const credId = b64u(new Uint8Array(made.rawId));
  const prfSalt = b64u(salt);
  const ext = (made.getClientExtensionResults() as PrfResults).prf;
  if (ext?.enabled === false) {
    forgetUnusedPasskey(credId);
    throw new PasskeyNoPrf();
  }
  const first = ext?.results?.first;
  if (first) return { credId, prf: bytesOf(first), prfSalt };
  try {
    const read = await readPasskey([{ credId, prfSalt }]);
    return { ...read, prfSalt };
  } catch (err) {
    forgetUnusedPasskey(credId);
    throw err;
  }
}
