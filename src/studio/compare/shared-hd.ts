import { hdCrossGates, hdCrossOf } from "@/lib/chart/hd-cross";
import { hdCrossName } from "@/lib/chart/hd-cross-names";
import type { HumanDesignChart } from "@/lib/chart/human-design";
import { hdAuthorityLabel, hdDefinitionLabel, hdFactLabel, hdTypeLabel } from "@/lib/i18n/hd-ui";
import type { StudioPage } from "@/studio/url";
import { both, type SharedItem, type SharedSay, type SharedSide } from "@/studio/compare/shared";

/*
 * What two bodygraphs share, in Human Design (idea B9; shared.ts): the same
 * type, authority, profile, definition or cross (the strategy goes with the
 * type), then the channels both define and the gates both have a planet in.
 * The keys as the cards above the chart give them (hd-keys.ts, hdKeyRows; the
 * cross by its name, as under its card), from the files those take theirs
 * from: hd-keys.ts itself is the page's (chinese-ids.ts says why it stays so).
 */

const hdOf = (side: SharedSide): HumanDesignChart | null => (side.data as { hd?: HumanDesignChart | null } | undefined)?.hd ?? null;

type Key = "type" | "authority" | "profile" | "definition" | "cross";

/** The cross by its name ("Right Angle Cross of Eden 1"), else its gates ("38/39 | 48/21"). */
function crossOf(hd: HumanDesignChart, locale: "en" | "fr"): string | null {
  const cross = hdCrossOf(hd);
  return cross ? (hdCrossName(cross, locale) ?? hdCrossGates(cross)) : null;
}

function keyValues(hd: HumanDesignChart, locale: "en" | "fr"): [Key, string | null][] {
  return [
    ["type", hdTypeLabel(locale, hd.type)],
    ["authority", hdAuthorityLabel(locale, hd.authority)],
    ["profile", hd.profile],
    ["definition", hdDefinitionLabel(locale, hd.definition)],
    ["cross", crossOf(hd, locale)],
  ];
}

export function sharedItems(_page: StudioPage, a: SharedSide, b: SharedSide, locale: "en" | "fr", say: SharedSay): SharedItem[] {
  const ha = hdOf(a);
  const hb = hdOf(b);
  if (!ha || !hb) return [];
  const out: SharedItem[] = [];
  // Without a birth time a key could differ at another hour of that day: not said to be shared.
  const sure = (hd: HumanDesignChart, key: Key) => !hd.uncertain?.keys.includes(key);
  const valuesB = new Map(keyValues(hb, locale));
  for (const [key, value] of keyValues(ha, locale)) {
    if (value == null || value !== valuesB.get(key) || !sure(ha, key) || !sure(hb, key)) continue;
    out.push(both(`hd-${key}`, say("cmpKey", { label: hdFactLabel(locale, key), value }), `hello:${key}`));
  }
  const channelsB = new Set(hb.definedChannels.map((c) => c.id));
  for (const c of ha.definedChannels) if (channelsB.has(c.id)) out.push(both(`hd-ch-${c.id}`, say("cmpChannel", { id: c.id }), `channel:${c.id}`));
  const gatesB = new Set(hb.activations.map((x) => x.gate));
  const gates = [...new Set(ha.activations.map((x) => x.gate))].filter((g) => gatesB.has(g)).sort((x, y) => x - y);
  for (const g of gates) out.push(both(`hd-gate-${g}`, say("cmpGate", { n: g }), `gate:${g}`));
  return out;
}
