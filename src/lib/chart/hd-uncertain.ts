/**
 * Without a birth time a bodygraph is cast at noon, but the Moon crosses a
 * gate about every ten hours and the Design moment moves with the birth
 * time: what is shown may be another gate, line, channel or even type at
 * another hour of that day. The day is cast every hour (calculate.server.ts)
 * and compared here with the noon chart.
 */
import { hdCrossGates, hdCrossOf } from "./hd-cross";
import { hdActId } from "./hd-rows";
import { HD_BODY_IDS, type HdUncertain, type HumanDesignChart } from "./human-design";

const KEYS = ["type", "strategy", "authority", "profile", "definition"] as const;
const PROFILE_ORDER = ["1/3", "1/4", "2/4", "2/5", "3/5", "3/6", "4/6", "4/1", "5/1", "5/2", "6/2", "6/3"];

export function hdUncertainOf(main: HumanDesignChart, others: readonly HumanDesignChart[], spanMinutes: number): HdUncertain {
  const rows = new Set<string>();
  const keys = new Set<string>();
  const channels = new Set<string>();
  const at = (c: HumanDesignChart, layer: "personality" | "design", body: string) => {
    const r = c.activations.find((a) => a.layer === layer && a.body === body);
    return r ? `${r.gate}.${r.line}` : "";
  };
  const crossOf = (c: HumanDesignChart) => {
    const x = hdCrossOf(c);
    return x ? `${hdCrossGates(x)} ${x.angle ?? ""}` : "";
  };
  const mainChannels = new Set(main.definedChannels.map((c) => c.id));
  const mainCross = crossOf(main);
  for (const other of others) {
    for (const layer of ["personality", "design"] as const) {
      for (const body of HD_BODY_IDS) if (at(other, layer, body) !== at(main, layer, body)) rows.add(hdActId(layer, body));
    }
    for (const key of KEYS) if (other[key] !== main[key]) keys.add(key);
    if (crossOf(other) !== mainCross) keys.add("cross");
    const otherChannels = new Set(other.definedChannels.map((c) => c.id));
    for (const id of new Set([...mainChannels, ...otherChannels])) {
      if (mainChannels.has(id) !== otherChannels.has(id)) channels.add(id);
    }
  }
  const order = (list: Set<string>, all: readonly string[]) => all.filter((x) => list.has(x));
  // The profiles of the day in the order the Sun brings them (1/3 → 1/4 → 2/4 …), the noon one first.
  const otherProfiles = [...new Set(others.map((o) => o.profile))].filter((p) => p !== main.profile && p !== "—");
  otherProfiles.sort((a, b) => PROFILE_ORDER.indexOf(a) - PROFILE_ORDER.indexOf(b));
  return {
    spanMinutes,
    rows: [...rows],
    keys: order(keys, [...KEYS, "cross"]),
    channels: [...channels].sort(),
    profiles: [main.profile, ...otherProfiles],
  };
}
