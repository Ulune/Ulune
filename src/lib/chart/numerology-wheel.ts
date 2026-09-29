/*
 * The numerology wheel's geometry (part 60 of the launch plan): the nine
 * numbers as sectors of a band, the name's letters on their numbers (vowels
 * on the inner track, consonants on the outer one), the core numbers as discs
 * in their sectors, the Life Path in the centre and the personal year outside
 * the band. SVG units, centred on 0, 0; 1 sits at the top and the numbers run
 * clockwise, 40° each.
 */
import type { NameLetter } from "./numerology-name";

export const WHEEL = {
  /** Half the side of the square the wheel is drawn in. */
  half: 244,
  rOut: 206,
  rIn: 166,
  rNumber: 186,
  rConsonant: 153,
  rVowel: 132,
  rDiscA: 101,
  rDiscB: 69,
  disc: 15,
  rCentre: 44,
  rYear: 227,
  year: 13,
  rTickIn: 210,
  rTickOut: 220,
  letter: 13,
} as const;

/** Degrees each sector's letters may spread over (of its 40°). */
const LETTER_SPREAD = 32;
/** Room a letter wants along its track (units). */
const LETTER_STEP = 11;
/** Below this, the letters of a crowded sector get smaller. */
const LETTER_TIGHT = 9;

/** Where a number sits: 1 at the top, clockwise (degrees, 0 = right, y down). */
export function sectorAngle(n: number): number {
  return -90 + (n - 1) * 40;
}

export function polar(r: number, deg: number): { x: number; y: number } {
  const a = (deg * Math.PI) / 180;
  return { x: r * Math.cos(a), y: r * Math.sin(a) };
}

const f = (n: number) => Math.round(n * 100) / 100;

/** A ring's piece between two radii and two angles (degrees, clockwise). */
export function ringPath(r0: number, r1: number, a0: number, a1: number): string {
  const p0 = polar(r1, a0);
  const p1 = polar(r1, a1);
  const p2 = polar(r0, a1);
  const p3 = polar(r0, a0);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M${f(p0.x)} ${f(p0.y)}A${r1} ${r1} 0 ${large} 1 ${f(p1.x)} ${f(p1.y)}L${f(p2.x)} ${f(p2.y)}A${r0} ${r0} 0 ${large} 0 ${f(p3.x)} ${f(p3.y)}Z`;
}

/** A number's sector of the band, with a small gap either side. */
export function sectorPath(n: number, gap = 0.8, r0: number = WHEEL.rIn, r1: number = WHEEL.rOut): string {
  const a = sectorAngle(n);
  return ringPath(r0, r1, a - 20 + gap, a + 20 - gap);
}

export type LetterMark = { letter: NameLetter; x: number; y: number; size: number };

/**
 * Each letter on its number: vowels on the inner track, consonants on the
 * outer one, in the order they come in the name. A crowded sector sets its
 * letters closer and smaller rather than running into the next.
 */
export function placeLetters(letters: readonly NameLetter[]): LetterMark[] {
  const groups = new Map<string, NameLetter[]>();
  for (const l of letters) {
    const key = `${l.value}${l.vowel ? "v" : "c"}`;
    const list = groups.get(key) ?? [];
    list.push(l);
    groups.set(key, list);
  }
  const out: LetterMark[] = [];
  for (const list of groups.values()) {
    const first = list[0]!;
    const r = first.vowel ? WHEEL.rVowel : WHEEL.rConsonant;
    const room = (LETTER_SPREAD * Math.PI * r) / 180;
    const step = Math.min(LETTER_STEP, room / list.length);
    const size = step >= LETTER_TIGHT ? WHEEL.letter : Math.max(7, (WHEEL.letter * step) / LETTER_TIGHT);
    const stepDeg = (step / r) * (180 / Math.PI);
    const mid = sectorAngle(first.value);
    list.forEach((letter, i) => {
      const p = polar(r, mid + (i - (list.length - 1) / 2) * stepDeg);
      out.push({ letter, x: f(p.x), y: f(p.y), size: f(size) });
    });
  }
  return out.sort((a, b) => a.letter.index - b.letter.index);
}

export type DiscMark<T> = { item: T; x: number; y: number };

/**
 * Offsets (degrees) for the discs a number holds: one row by the letters, a
 * second nearer the centre when there are three or more (all six can share a
 * number: all 9s).
 */
const DISC_ROWS: Record<number, [number[], number[]]> = {
  1: [[0], []],
  2: [[-9.5, 9.5], []],
  3: [[-9.5, 9.5], [0]],
  4: [[-9.5, 9.5], [-13, 13]],
  5: [[-18, 0, 18], [-13, 13]],
  6: [[-18, 0, 18], [-26, 0, 26]],
};

/** The core numbers' discs in their sectors, in the order given. */
export function placeDiscs<T>(items: readonly { digit: number; item: T }[]): DiscMark<T>[] {
  const byDigit = new Map<number, T[]>();
  for (const { digit, item } of items) {
    const list = byDigit.get(digit) ?? [];
    list.push(item);
    byDigit.set(digit, list);
  }
  const out: DiscMark<T>[] = [];
  for (const [digit, list] of byDigit) {
    const [a, b] = DISC_ROWS[Math.min(list.length, 6)]!;
    const mid = sectorAngle(digit);
    list.forEach((item, i) => {
      const inA = i < a.length;
      const p = polar(inA ? WHEEL.rDiscA : WHEEL.rDiscB, mid + (inA ? a[i]! : (b[i - a.length] ?? 0)));
      out.push({ item, x: f(p.x), y: f(p.y) });
    });
  }
  return out;
}
