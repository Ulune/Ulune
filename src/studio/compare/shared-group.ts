import type { Who } from "@/studio/compare/linked";
import type { SharedItem } from "@/studio/compare/shared";

/*
 * What three or four people share (share and compare plan, idea B8, with
 * B9's lists): worked out pair by pair by each language's own code
 * (shared-*.ts), then gathered element by element. An element is the same
 * when its key and its words are (the words carry its value: "Pluto in
 * Scorpio", "Kua 1", "Life Path 13/4"), so each pair's sameness joins into
 * the group of everyone who has it, each with their own id. Only what all of
 * them share is said to be shared; what most of them do (more than half, not
 * all) is listed apart, with its count. Pure, no browser.
 */

export type GroupItem = {
  key: string;
  label: string;
  /** The element in each chart that has it. */
  ids: Partial<Record<Who, string>>;
  /** How many of them have it. */
  count: number;
};

export type PairShared = { x: Who; y: Who; items: readonly SharedItem[] };

export function groupShared(people: readonly Who[], pairs: readonly PairShared[]): { all: GroupItem[]; most: GroupItem[] } {
  const groups = new Map<string, GroupItem>();
  for (const { x, y, items } of pairs) {
    for (const it of items) {
      const at = `${it.key}\u0000${it.label}`;
      const g = groups.get(at) ?? { key: it.key, label: it.label, ids: {}, count: 0 };
      g.ids[x] ??= it.ids.a;
      g.ids[y] ??= it.ids.b;
      g.count = people.filter((w) => g.ids[w] != null).length;
      groups.set(at, g);
    }
  }
  const n = people.length;
  const list = [...groups.values()];
  return {
    all: list.filter((g) => g.count === n),
    // More than half of them, the most shared first (in the order found otherwise).
    most: list.filter((g) => g.count < n && g.count * 2 > n).sort((p, q) => q.count - p.count),
  };
}

/** Every pair of the people, each once, in the panes' order (A with B, A with C… C with D). */
export function pairsOf(people: readonly Who[]): [Who, Who][] {
  const out: [Who, Who][] = [];
  people.forEach((x, i) => people.slice(i + 1).forEach((y) => out.push([x, y])));
  return out;
}
