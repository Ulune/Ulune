import { AspectGlyph, PlanetGlyph } from "@/components/glyphs";
import { ASPECT_COLOR } from "@/lib/chart/constants";
import type { SkyAspect } from "@/lib/chart/sky-events";

/*
 * "You two, now" on astrology's Relationship pages (share and compare plan,
 * feature 5e): a contact's mark, the moving planet, the aspect in its colour
 * and the relationship chart's point, in a row. The Calendar's PairIcon draws
 * the same, but with the Calendar's style sheet; this one carries its own
 * three lines of layout, so neither the side panel nor the table waits for a
 * sheet of the Calendar's (or adds one to a page's load).
 */
export function NowPairIcon({ a, type, b, size = 14 }: { a: string; type: SkyAspect; b: string; size?: number }) {
  return (
    <span aria-hidden style={{ display: "inline-flex", alignItems: "center", gap: 2, whiteSpace: "nowrap" }}>
      <PlanetGlyph id={a} size={size} />
      <span style={{ color: ASPECT_COLOR[type], display: "inline-flex" }}>
        <AspectGlyph id={type} size={Math.round(size * 0.8)} />
      </span>
      <PlanetGlyph id={b} size={size} />
    </span>
  );
}
