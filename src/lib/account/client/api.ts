import { API_BASE, ERRORS, type ErrorCode, type Operation } from "../protocol";
import { signWithDevice } from "../keys";

/*
 * The synced account's calls from the device (share and compare plan, feature 4;
 * docs/sync-protocol.md, sections 2, 4.5 and 11): every operation is a POST of JSON to Ulune's own
 * address, nothing in the address, no cookie, nothing cached. A session's token stays in this
 * page's memory only; it lasts an hour and is renewed with the device's own key, which never
 * leaves the browser. Every failure comes back as an AccountFailure with the protocol's code, or
 * "network" when the server could not be reached (the device is offline, or the server is down):
 * nothing waits on it, the engine tries again later.
 */

export class AccountFailure extends Error {
  readonly code: ErrorCode | "network";
  readonly status: number;
  /** Seconds to wait, when the server said (429, 503). */
  readonly retryAfter: number | null;
  constructor(code: ErrorCode | "network", status = 0, retryAfter: number | null = null) {
    super(code);
    this.name = "AccountFailure";
    this.code = code;
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

/** One operation: its answer, or an AccountFailure. `token`: the session, when the operation takes one. */
export type Transport = (op: Operation, body: unknown, token?: string | null) => Promise<unknown>;

/** The browser's transport: fetch, with a time limit (a minute for records, which can be large). */
export function fetchTransport(): Transport {
  return async (op, body, token) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), op.startsWith("records/") ? 60_000 : 30_000);
    let res: Response;
    try {
      res = await fetch(`${API_BASE}${op}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body),
        credentials: "omit",
        cache: "no-store",
        referrerPolicy: "no-referrer",
        signal: ctrl.signal,
      });
    } catch {
      throw new AccountFailure("network");
    } finally {
      clearTimeout(timer);
    }
    let text = "";
    try {
      text = await res.text();
    } catch {
      throw new AccountFailure("network", res.status);
    }
    if (res.ok) {
      try {
        return JSON.parse(text) as unknown;
      } catch {
        throw new AccountFailure("unavailable", res.status);
      }
    }
    let code: ErrorCode = "unavailable";
    try {
      const said = (JSON.parse(text) as { error?: unknown }).error;
      if (typeof said === "string" && said in ERRORS) code = said as ErrorCode;
    } catch {
      /* not the server's answer (a proxy, a page): unavailable */
    }
    const wait = Number(res.headers.get("Retry-After"));
    throw new AccountFailure(code, res.status, Number.isFinite(wait) && wait > 0 ? wait : null);
  };
}

/** A sign-in's or a renewal's answer, as far as the session needs it. */
export type Issued = { token: string; ttl: number; freshFor?: number };

/**
 * A device's session with the account: its token in memory, renewed when it nears its end (or when
 * the server refused it) by signing the server's challenge with the device key.
 */
export class AccountSession {
  readonly transport: Transport;
  account: string;
  device: string;
  private deviceKey: CryptoKey;
  private token: string | null = null;
  private until = 0;
  private freshUntil = 0;
  private renewing: Promise<string> | null = null;
  private readonly now: () => number;

  constructor(transport: Transport, ids: { account: string; device: string }, deviceKey: CryptoKey, now: () => number = () => Date.now()) {
    this.transport = transport;
    this.account = ids.account;
    this.device = ids.device;
    this.deviceKey = deviceKey;
    this.now = now;
  }

  /** A token just issued (an account made, a sign-in, a renewal). */
  adopt(issued: Issued): void {
    const at = this.now();
    this.token = issued.token;
    this.until = at + issued.ttl * 1000;
    this.freshUntil = at + (issued.freshFor ?? 0) * 1000;
  }

  /** This device again, after signing in as a new one (it had been removed). */
  rejoin(device: string, deviceKey: CryptoKey, issued: Issued): void {
    this.device = device;
    this.deviceKey = deviceKey;
    this.adopt(issued);
  }

  /** Whether the token in hand is a fresh sign-in's, for a little while yet. */
  isFresh(): boolean {
    return Boolean(this.token) && this.freshUntil - this.now() > 15_000;
  }

  /** The token, renewed first when there is none or it ends within a minute. */
  async bearer(): Promise<string> {
    if (this.token && this.until - this.now() > 60_000) return this.token;
    return await this.renew();
  }

  /** A new token, signed for with the device key (one renewal at a time). */
  renew(): Promise<string> {
    this.renewing ??= (async () => {
      try {
        const begin = (await this.transport("session/begin", { account: this.account, device: this.device })) as { challenge: string };
        const signature = await signWithDevice(this.deviceKey, "renew", begin.challenge);
        const issued = (await this.transport("session/renew", { account: this.account, device: this.device, challenge: begin.challenge, signature })) as Issued;
        this.adopt({ token: issued.token, ttl: issued.ttl });
        return issued.token;
      } finally {
        this.renewing = null;
      }
    })();
    return this.renewing;
  }

  /** An operation with the session; a token the server refused is renewed once. */
  async call<T>(op: Operation, body: unknown): Promise<T> {
    const token = await this.bearer();
    try {
      return (await this.transport(op, body, token)) as T;
    } catch (err) {
      if (!(err instanceof AccountFailure) || err.code !== "denied") throw err;
      this.token = null;
      return (await this.transport(op, body, await this.renew())) as T;
    }
  }

  /** An operation that needs a fresh sign-in (changing the ways in, removing a device, deleting): never renewed. */
  async callFresh<T>(op: Operation, body: unknown): Promise<T> {
    if (!this.token || !this.isFresh()) throw new AccountFailure("fresh-sign-in", 403);
    return (await this.transport(op, body, this.token)) as T;
  }

  /** The token as it is now (signing in again sends it, so the same device is signed in again). */
  current(): string | null {
    return this.token && this.until > this.now() ? this.token : null;
  }

  forget(): void {
    this.token = null;
    this.until = 0;
    this.freshUntil = 0;
  }
}
