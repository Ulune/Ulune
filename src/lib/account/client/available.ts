/*
 * Whether the synced account's server is set up here (the 2.0 fixes, item 4; docs/sync-protocol.md,
 * section 15). Until the owner creates the database and its secrets, production answers every
 * account operation 503 "unavailable": what offers the account (the private space's choice when it is
 * made, Settings' sync part, a new device signing in) asks first, so it can say "not available yet"
 * instead of offering what would fail.
 *
 * Asked once a visit, lazily, by those parts alone (no page asks it by itself), with the account's
 * lightest operation: passkey/begin, an empty body, a challenge made from the server's secret with no
 * database behind it, nothing about the reader. A clear answer is kept for the visit, in this page's
 * memory only: set up (a challenge), or not (503 "unavailable" for an hour, or no account route at
 * all). Offline, or an answer that says neither (a passing trouble, too many tries), counts as set up
 * for now and is asked again next time: the steps then say the server can't be reached, as before.
 *
 * Small and free of the account's own code, so the sheet, Settings and the device link can hold it
 * without downloading the protocol; scripts/account-client.test.mjs keeps PROBE on the protocol's
 * address.
 */

/** The operation asked: API_BASE (../protocol.ts) + "passkey/begin". */
export const PROBE = "/api/account/v1/passkey/begin";

let known: boolean | null = null;
let asking: Promise<boolean> | null = null;

/** What is known already: true (set up), false (not set up), or null (not asked yet, or no clear answer). */
export const accountKnown = (): boolean | null => known;

/** The answer for this visit: asked at most once at a time, and kept once it is clear. */
export function accountAvailable(ask: typeof fetch = (...a) => fetch(...a)): Promise<boolean> {
  if (known !== null) return Promise.resolve(known);
  if (!asking) {
    asking = probe(ask).then((clear) => {
      asking = null;
      if (clear !== null) known = clear;
      return clear ?? true;
    });
  }
  return asking;
}

/** The server's answer to the probe: true, false, or null when it says neither. */
async function probe(ask: typeof fetch): Promise<boolean | null> {
  let res: Response;
  try {
    res = await ask(PROBE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
      credentials: "omit",
      cache: "no-store",
      referrerPolicy: "no-referrer",
    });
  } catch {
    return null;
  }
  if (res.ok) return true;
  // No account route at all.
  if (res.status === 404) return false;
  if (res.status !== 503) return null;
  // Not set up: "unavailable", to ask again in an hour (service.server.ts); a passing trouble says a minute.
  const wait = Number(res.headers.get("Retry-After"));
  const said = await res.json().then(
    (body: unknown) => (body as { error?: unknown } | null)?.error,
    () => null,
  );
  return said === "unavailable" && !(wait > 0 && wait < 3600) ? false : null;
}

/** For the tests: forget the answer. */
export function forgetAccountAnswer(): void {
  known = null;
  asking = null;
}
