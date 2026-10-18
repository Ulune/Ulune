import type { HumanDesignChart } from "@/lib/chart/human-design";
import type { StudioPage } from "@/studio/url";

/*
 * Linked selection (share and compare plan, feature 2, decision C2): what a
 * choice in one of Compare's charts chooses in the other. The same element,
 * by its id, where both charts have it: the Sun is planet:sun in both, a gate
 * gate:34, a numerology position core:lifepath, a BaZi pillar bz:stem:day, a
 * Feng Shui direction fs:yang:dir:se. Pure, no browser: the view calls it and
 * so do the unit tests (scripts/compare.test.mjs).
 *
 * Two kinds of ids need a word:
 *   - a count's own (Feng Shui's Kua and directions, BaZi's luck pillars): the
 *     other chart may show only its own count (its birth options); the same
 *     place in that count is the same element;
 *   - what a chart has or has not (a gate with a planet in it, a channel
 *     defined, an aspect): readable everywhere on the bodygraph, but "not in
 *     B's chart" when B lacks it; the reading panel says so under B's heading.
 */

export type Who = "a" | "b";
export const other = (who: Who): Who => (who === "a" ? "b" : "a");

/** The yin or yang counts a chart shows: its own when its birth gives one, else both. */
export function countsOf(count: unknown): ("yang" | "yin")[] {
  return count === "yang" || count === "yin" ? [count] : ["yang", "yin"];
}

/**
 * The id that stands for `id` in the other chart: itself, but for a count's
 * own id when the other chart does not show that count (its only count then).
 */
export function linkedId(id: string, counts: readonly ("yang" | "yin")[]): string {
  const m = /^(fs:|bz:luck:)(yang|yin)(:.*)?$/.exec(id);
  if (!m || counts.includes(m[2] as "yang" | "yin")) return id;
  const to = counts[0];
  return to ? `${m[1]}${to}${m[3] ?? ""}` : id;
}

/** A Human Design id the chart lacks: a gate no planet stands in, a channel it does not define. */
export function hdLacks(id: string, hd: HumanDesignChart | null | undefined): boolean {
  if (!hd) return false;
  const gate = /^gate:(\d+)$/.exec(id);
  if (gate) return !hd.activations.some((a) => a.gate === Number(gate[1]));
  // Channels are named by their two gates, "channel:34–20" (lib/chart/human-design.ts, HD_CHANNELS).
  if (id.startsWith("channel:")) return !hd.definedChannels.some((c) => `channel:${c.id}` === id);
  return false;
}

/**
 * What the reading panel shows for one chart of a linked choice: its reading
 * ("read"), a quiet stand-in while its text or its data is on its way
 * ("wait"), or one line saying the chart lacks it ("lacks").
 */
export function linkedState(opts: {
  page: StudioPage;
  /** The id asked of this chart. */
  id: string;
  /** This chart's reading now (its id says which element it reads). */
  readingId: string | null;
  /** Its text and data are still on their way. */
  pending: boolean;
  hd?: HumanDesignChart | null;
}): "read" | "wait" | "lacks" {
  if (opts.page === "design" && hdLacks(opts.id, opts.hd)) return "lacks";
  if (opts.readingId === opts.id) return "read";
  return opts.pending ? "wait" : "lacks";
}
