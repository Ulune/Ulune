import { z } from "zod";
import { fromB64u } from "./encoding";
import { ARGON_RANGE, BUCKETS, DEVICE_NAME_BYTES, ID_BYTES, LIMITS, SIZES, isBucket, type Operation } from "./protocol";

/*
 * What each operation of the synced account accepts (docs/sync-protocol.md, section 5; share and
 * compare plan, feature 4), checked before anything else, as lib/chart/server-input.ts does for the
 * calculations: exactly the listed fields, every text of bounded length, every byte string the
 * canonical base64url of the right number of bytes, every number an integer in its range, every
 * blob a bucket's size, every batch within its limits. Anything else is "bad-request", the same for
 * every operation. Parsed values come out as bytes.
 */

type Bytes = Uint8Array<ArrayBuffer>;

/** Base64url of `min` to `max` bytes, as bytes. */
function bytes(min: number, max = min) {
  return z
    .string()
    .max(Math.ceil((max * 4) / 3) + 2)
    .transform((text, ctx): Bytes => {
      const out = fromB64u(text);
      if (!out || out.byteLength < min || out.byteLength > max) {
        ctx.addIssue({ code: "custom", message: "bytes" });
        return z.NEVER;
      }
      return out;
    });
}

const id = bytes(ID_BYTES);
const int = (min: number, max: number) => z.number().int().min(min).max(max);
/** A token the server made (session challenges, device links): its own checks follow. */
const token = bytes(20, 128);
const device = z.strictObject({ key: bytes(64, 128) });
const wrap = bytes(SIZES.wrap.min, SIZES.wrap.max);

const passkeyIn = z.strictObject({
  credential: z.strictObject({
    id: bytes(1, SIZES.credentialId),
    clientDataJSON: bytes(20, 2048),
    attestationObject: bytes(37, 16_384),
  }),
  wrap,
});

const passphraseIn = z.strictObject({
  salt: bytes(SIZES.salt),
  m: int(...ARGON_RANGE.m),
  t: int(...ARGON_RANGE.t),
  p: int(...ARGON_RANGE.p),
  authKey: bytes(SIZES.authKey),
  wrap,
});

const recoveryIn = z.strictObject({ lookup: bytes(SIZES.lookup), authKey: bytes(SIZES.authKey), wrap });

const assertionIn = z.strictObject({
  id: bytes(1, SIZES.credentialId),
  clientDataJSON: bytes(20, 2048),
  authenticatorData: bytes(37, 4096),
  signature: bytes(8, 1024),
  userHandle: bytes(1, 64).optional(),
});

const putIn = z
  .strictObject({
    rid: id,
    base: int(0, Number.MAX_SAFE_INTEGER),
    blob: bytes(BUCKETS[0], BUCKETS[BUCKETS.length - 1]).optional(),
    deleted: z.literal(true).optional(),
  })
  // A blob or a deletion, never both; a blob exactly a bucket's size (sealed and padded on the device).
  .refine((p) => (p.blob ? !p.deleted && isBucket(p.blob.byteLength) : p.deleted === true));

const empty = z.strictObject({});

export const SCHEMAS = {
  "account/begin": empty,
  "account/create": z
    .strictObject({
      account: id,
      challenge: token,
      device,
      passkey: passkeyIn.optional(),
      passphrase: passphraseIn.optional(),
      recovery: recoveryIn,
    })
    .refine((v) => v.passkey || v.passphrase),
  "account/status": empty,
  "account/delete": z.strictObject({ confirm: z.literal("delete-everything") }),
  "passkey/begin": empty,
  "passkey/finish": z.strictObject({ credential: assertionIn, device: device.optional() }),
  "passphrase/params": z.strictObject({ account: id }),
  "passphrase/sign-in": z.strictObject({ account: id, authKey: bytes(SIZES.authKey), device: device.optional() }),
  "recovery/sign-in": z.strictObject({ lookup: bytes(SIZES.lookup), authKey: bytes(SIZES.authKey), device: device.optional() }),
  "session/begin": z.strictObject({ account: id, device: id }),
  "session/renew": z.strictObject({ account: id, device: id, challenge: token, signature: bytes(SIZES.signature) }),
  "ways/list": empty,
  "ways/begin": empty,
  "ways/add": z
    .strictObject({ challenge: token.optional(), passkey: passkeyIn.optional(), passphrase: passphraseIn.optional(), recovery: recoveryIn.optional() })
    // Exactly one way in; a challenge with a passkey, and only then.
    .refine((v) => [v.passkey, v.passphrase, v.recovery].filter(Boolean).length === 1 && Boolean(v.challenge) === Boolean(v.passkey)),
  "ways/remove": z.strictObject({ way: id }),
  "devices/list": empty,
  "devices/rename": z.strictObject({ device: id, name: bytes(DEVICE_NAME_BYTES) }),
  "devices/remove": z.strictObject({ device: id }),
  "records/put": z
    .strictObject({ puts: z.array(putIn).min(1).max(LIMITS.batchPuts) })
    // One put per record, and at most 640 KiB of blobs.
    .refine((v) => new Set(v.puts.map((p) => p.rid.join(","))).size === v.puts.length)
    .refine((v) => v.puts.reduce((sum, p) => sum + (p.blob?.byteLength ?? 0), 0) <= LIMITS.batchBytes),
  "records/changes": z.strictObject({ cursor: int(0, Number.MAX_SAFE_INTEGER), limit: int(1, LIMITS.pageRecords).optional() }),
  "link/open": z.strictObject({ epk: bytes(SIZES.epk), device: device.optional() }),
  "link/join": z.strictObject({ link: token, epk: bytes(SIZES.epk), device: device.optional() }),
  "link/state": z.strictObject({ link: token }),
  "link/give": z.strictObject({ link: token, sealed: bytes(SIZES.linkSealed.min, SIZES.linkSealed.max) }),
  "link/take": z.strictObject({ link: token, signature: bytes(SIZES.signature) }),
  "link/close": z.strictObject({ link: token }),
} satisfies Record<Operation, z.ZodType>;

export type Input<O extends Operation> = z.output<(typeof SCHEMAS)[O]>;

/** The largest body each operation takes. */
export function bodyLimit(op: Operation): number {
  return op === "records/put" ? LIMITS.putBody : LIMITS.body;
}
