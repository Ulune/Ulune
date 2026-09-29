/*
 * The birth grid (part 59 of the launch plan): the birth date's digits placed
 * on a square of nine, zeros set aside. A full line of three is an arrow, an
 * empty one an arrow of what is missing (David A. Phillips, The Complete Book
 * of Numerology). Phillips puts 3-6-9 on top; the Chinese Lo Shu square lays
 * the same digits out as 4-9-2 / 3-5-7 / 8-1-6, which gives other lines.
 * The arrows' names differ from book to book, so Ulune names a line by its
 * digits and says what it stands for in the reading.
 */
import type { BirthDate } from "./numerology-cycles";

export const GRID_LAYOUTS = ["phillips", "loshu"] as const;
export type GridLayoutId = (typeof GRID_LAYOUTS)[number];

/** Each layout's three rows, top to bottom. */
export const GRID_CELLS: Readonly<Record<GridLayoutId, readonly (readonly [number, number, number])[]>> = {
  phillips: [
    [3, 6, 9],
    [2, 5, 8],
    [1, 4, 7],
  ],
  loshu: [
    [4, 9, 2],
    [3, 5, 7],
    [8, 1, 6],
  ],
};

export type GridLineKind = "row" | "column" | "diagonal";

type LineDef = { id: string; digits: readonly [number, number, number]; kind: GridLineKind };

/**
 * The eight lines of each layout, named as each tradition names them:
 * Phillips by the digits in order (1-5-9), the Lo Shu as read on the square
 * (9-5-1).
 */
export const GRID_LINES: Readonly<Record<GridLayoutId, readonly LineDef[]>> = {
  phillips: [
    { id: "3-6-9", digits: [3, 6, 9], kind: "row" },
    { id: "2-5-8", digits: [2, 5, 8], kind: "row" },
    { id: "1-4-7", digits: [1, 4, 7], kind: "row" },
    { id: "1-2-3", digits: [1, 2, 3], kind: "column" },
    { id: "4-5-6", digits: [4, 5, 6], kind: "column" },
    { id: "7-8-9", digits: [7, 8, 9], kind: "column" },
    { id: "1-5-9", digits: [1, 5, 9], kind: "diagonal" },
    { id: "3-5-7", digits: [3, 5, 7], kind: "diagonal" },
  ],
  loshu: [
    { id: "4-9-2", digits: [4, 9, 2], kind: "row" },
    { id: "3-5-7", digits: [3, 5, 7], kind: "row" },
    { id: "8-1-6", digits: [8, 1, 6], kind: "row" },
    { id: "4-3-8", digits: [4, 3, 8], kind: "column" },
    { id: "9-5-1", digits: [9, 5, 1], kind: "column" },
    { id: "2-7-6", digits: [2, 7, 6], kind: "column" },
    { id: "4-5-6", digits: [4, 5, 6], kind: "diagonal" },
    { id: "2-5-8", digits: [2, 5, 8], kind: "diagonal" },
  ],
};

/** A line is full (an arrow), empty (an arrow of what is missing) or neither. */
export type GridLineState = "full" | "empty" | "partial";

export type GridLine = LineDef & {
  state: GridLineState;
  /** How many of its three digits the date holds. */
  present: number;
};

export type BirthGrid = {
  /** The date's digits, zeros aside, smallest first (15 June 1990: 1 1 5 6 9 9). */
  digits: number[];
  /** How many times each digit 1–9 appears (index 0 unused). */
  counts: number[];
  /** The digits 1–9 the date lacks. */
  missing: number[];
  lines: Record<GridLayoutId, GridLine[]>;
};

export function birthGrid(b: BirthDate): BirthGrid {
  const digits = `${b.day}${b.month}${b.year}`
    .split("")
    .map(Number)
    .filter((d) => d > 0)
    .sort((x, y) => x - y);
  const counts = Array.from({ length: 10 }, () => 0);
  for (const d of digits) counts[d] = (counts[d] ?? 0) + 1;
  const missing = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => counts[d] === 0);
  const linesOf = (layout: GridLayoutId): GridLine[] =>
    GRID_LINES[layout].map((line) => {
      const present = line.digits.filter((d) => (counts[d] ?? 0) > 0).length;
      return { ...line, present, state: present === 3 ? "full" : present === 0 ? "empty" : "partial" };
    });
  return { digits, counts, missing, lines: { phillips: linesOf("phillips"), loshu: linesOf("loshu") } };
}
