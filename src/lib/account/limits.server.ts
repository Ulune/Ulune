/*
 * The synced account's rate limits (docs/sync-protocol.md, section 10; share and compare plan,
 * feature 4): fixed windows counted in this instance's memory, by a hashed address
 * (tokens.server.ts, addressKey) or by account, and never written anywhere. On Vercel every
 * function instance counts on its own and forgets when it stops, so this is best effort; the
 * Vercel Firewall's rules (the protocol, section 10) are the real limit. Past `maxKeys` counters,
 * the expired ones go, then all of them: the limiter never grows without end, and fails open.
 */

export type Rule = { limit: number; windowMs: number };

export const RULES = {
  /** Any operation, per address. */
  ip: { limit: 240, windowMs: 60_000 },
  /** Signing in (passkey, passphrase, recovery code, session renewal, taking a device link), per address. */
  ipSignIn: { limit: 30, windowMs: 5 * 60_000 },
  /** Creating an account, per address. */
  ipCreate: { limit: 20, windowMs: 60 * 60_000 },
  /** Opening or joining a device link, per address. */
  ipLink: { limit: 30, windowMs: 10 * 60_000 },
  /** Failed sign-ins, per account or recovery lookup. */
  failures: { limit: 10, windowMs: 15 * 60_000 },
  /** Writing records, per account. */
  accountWrite: { limit: 120, windowMs: 60_000 },
  /** Reading changes or the account's status, per account. */
  accountRead: { limit: 240, windowMs: 60_000 },
} as const satisfies Record<string, Rule>;

export type RuleName = keyof typeof RULES;

export class RateLimiter {
  private readonly counts = new Map<string, { start: number; n: number }>();
  private readonly rules: Record<RuleName, Rule>;
  private readonly now: () => number;
  private readonly maxKeys: number;

  constructor(now: () => number, rules: Partial<Record<RuleName, Rule>> = {}, maxKeys = 50_000) {
    this.now = now;
    this.rules = { ...RULES, ...rules };
    this.maxKeys = maxKeys;
  }

  private slot(rule: RuleName, key: string): { start: number; n: number } {
    const id = `${rule}:${key}`;
    const now = this.now();
    let hit = this.counts.get(id);
    if (!hit || now - hit.start >= this.rules[rule].windowMs) {
      if (this.counts.size >= this.maxKeys) this.prune(now);
      hit = { start: now, n: 0 };
      this.counts.set(id, hit);
    }
    return hit;
  }

  private wait(rule: RuleName, hit: { start: number }): number {
    return Math.max(1, Math.ceil((hit.start + this.rules[rule].windowMs - this.now()) / 1000));
  }

  /** Count one; 0 when it is allowed, otherwise the seconds until the window ends. */
  take(rule: RuleName, key: string): number {
    const hit = this.slot(rule, key);
    hit.n += 1;
    return hit.n <= this.rules[rule].limit ? 0 : this.wait(rule, hit);
  }

  /** Whether the limit is already reached, without counting (failed sign-ins: checked first, counted when they fail). */
  blocked(rule: RuleName, key: string): number {
    const hit = this.slot(rule, key);
    return hit.n < this.rules[rule].limit ? 0 : this.wait(rule, hit);
  }

  private prune(now: number): void {
    for (const [id, hit] of this.counts) {
      const rule = id.slice(0, id.indexOf(":")) as RuleName;
      if (now - hit.start >= (this.rules[rule]?.windowMs ?? 0)) this.counts.delete(id);
    }
    if (this.counts.size >= this.maxKeys) this.counts.clear();
  }

  /** How many counters are held (the tests check that it stays bounded). */
  get size(): number {
    return this.counts.size;
  }
}
