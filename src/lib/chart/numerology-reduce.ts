/*
 * Numerology's arithmetic (part 59 of the launch plan): adding digits and
 * reducing a total, keeping the steps. Every number Ulune shows comes with
 * the totals it passed through (1990 → 19 → 10 → 1), so the reading can show
 * its working and a karmic debt (13, 14, 16, 19) is never thrown away.
 * The rules are Hans Decoz's (World Numerology), the most used modern school.
 */

/** The master numbers: kept whole where the rule says so. */
export const MASTERS = [11, 22, 33] as const;
/** The Birthday keeps 11 and 22 only (the 11th, the 22nd, the 29th). */
export const DAY_MASTERS = [11, 22] as const;
/** Nothing kept: challenges, balance and the yearly cycles reduce to 1–9. */
export const NO_MASTERS = [] as const;

export const KARMIC_DEBTS = [13, 14, 16, 19] as const;
export type KarmicDebt = (typeof KARMIC_DEBTS)[number];

export function digitSum(n: number): number {
  let s = 0;
  let x = Math.abs(Math.trunc(n));
  while (x > 0) {
    s += x % 10;
    x = Math.floor(x / 10);
  }
  return s;
}

/** Always 1–9 (0 stays 0). 11 → 2, 22 → 4, 33 → 6. */
export function digitalRoot(n: number): number {
  const x = Math.abs(Math.trunc(n));
  return x === 0 ? 0 : 1 + ((x - 1) % 9);
}

/**
 * The totals from `n` down to one digit or a kept master: 1990 → [1990, 19, 10, 1].
 * The first entry is `n` itself, the last the reduced number.
 */
export function reduceChain(n: number, keep: readonly number[] = MASTERS): number[] {
  let x = Math.abs(Math.trunc(n));
  const chain = [x];
  while (x > 9 && !keep.includes(x)) {
    x = digitSum(x);
    chain.push(x);
  }
  return chain;
}

export function reduceWith(n: number, keep: readonly number[] = MASTERS): number {
  const chain = reduceChain(n, keep);
  return chain[chain.length - 1]!;
}

/** Reduce by summing digits; keep 11, 22, 33 unreduced. */
export function reduceKeepMasters(n: number): number {
  return reduceWith(n, MASTERS);
}

/** Birthday: keep 11 and 22 (a day that reduces to them too, the 29th). Not 33. */
export function reduceBirthday(day: number): number {
  return reduceWith(day, DAY_MASTERS);
}

/**
 * A karmic debt: 13, 14, 16 or 19 as a total before the last step (the
 * chain's last entry is the number itself, never a debt).
 */
export function debtIn(chain: readonly number[]): KarmicDebt | null {
  for (let i = 0; i < chain.length - 1; i += 1) {
    const x = chain[i]!;
    if ((KARMIC_DEBTS as readonly number[]).includes(x)) return x as KarmicDebt;
  }
  return null;
}

export function isMaster(n: number | null | undefined): boolean {
  return n === 11 || n === 22 || n === 33;
}

/** One thing added into a number: a month, a day, a year, a name. */
export type NumerologyTerm = {
  /** "month", "day", "year", or the name ("Camille"). */
  key: string;
  /** What was added before reducing (1990; a name's letters, 28). */
  raw: number;
  /** raw → … → value */
  chain: number[];
  value: number;
};

export type NumerologyValue = {
  /** Master-aware value (11/22/33 kept where the rule keeps them). Null when it cannot be worked out. */
  number: number | null;
  /** Always the 1–9 digital root. Null when the number is. */
  digit: number | null;
  /** What was added, each with its own steps. */
  terms?: NumerologyTerm[];
  /** The total of the terms → … → number. */
  chain?: number[];
  /** 13, 14, 16 or 19 on the way to the number. */
  debt?: KarmicDebt | null;
  /** For a gap (a challenge, a bridge): the two numbers it lies between. */
  gap?: [number, number];
};

export function present(n: number): NumerologyValue {
  return { number: n, digit: digitalRoot(n) };
}

export function absent(): NumerologyValue {
  return { number: null, digit: null };
}

/**
 * The gap between two numbers, each reduced to 1–9 first (a challenge, a
 * bridge): 0 to 8. A master counts as its digit here (11 as 2).
 */
export function gapOf(a: number, b: number): NumerologyValue {
  const x = digitalRoot(a);
  const y = digitalRoot(b);
  const n = Math.abs(x - y);
  return { number: n, digit: n, gap: [x, y] };
}

/**
 * Terms added, then the total reduced. With a single term its own steps are
 * the total's (a one-word name: 49 → 13 → 4 keeps its 13).
 */
export function fromTerms(terms: NumerologyTerm[], keep: readonly number[] = MASTERS, withDebt = true): NumerologyValue {
  if (!terms.length) return absent();
  const chain = terms.length === 1 ? terms[0]!.chain : reduceChain(terms.reduce((s, t) => s + t.value, 0), keep);
  const number = chain[chain.length - 1]!;
  return { number, digit: digitalRoot(number), terms, chain, debt: withDebt ? debtIn(chain) : null };
}

export function term(key: string, raw: number, keep: readonly number[] = MASTERS): NumerologyTerm {
  const chain = reduceChain(raw, keep);
  return { key, raw, chain, value: chain[chain.length - 1]! };
}

/** "13 → 4", "1990 → 19 → 10 → 1", "7". */
export function chainText(chain: readonly number[] | undefined): string {
  return chain && chain.length ? chain.join(" → ") : "";
}
