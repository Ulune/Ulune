import type { NatalChart } from "@/lib/chart/types";
import { useI18n } from "@/lib/i18n/locale";
import type { TablePartId } from "@/lib/i18n/table-ui";
import { NatalTable } from "@/studio/tables/natal-table";
import { astroNowPart, type AstroNowTable } from "@/studio/tables/pair-now-astro-part";

/** A composite has no moment or place of its own: no Chart part, and its dignities and stars are left to the birth charts. */
const COMPOSITE_PARTS: TablePartId[] = ["points", "houses", "aspects", "grid", "balance"];

/**
 * The Composite table (part 52 of the launch plan): the chart of the
 * relationship, built from the midpoints of the two charts, read with the
 * birth chart's own parts: Points, Houses, Aspects, Grid and Balance; then
 * "You two, now", today's contacts of the sky with it (share and compare
 * plan, feature 5e).
 */
export function CompositeTable({
  chart,
  selectedId,
  onSelect,
  davison = false,
  now = null,
}: {
  chart: NatalChart;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** The Davison chart is a real moment and place: every part of a birth chart holds on it (review 3 Oct, P6). */
  davison?: boolean;
  /** Today's contacts of the sky with the chart shown (its lines until cast). */
  now?: AstroNowTable | null;
}) {
  const { locale } = useI18n();
  const extra = now ? [astroNowPart(now, locale, selectedId, onSelect)] : [];
  return davison ? (
    <NatalTable chart={chart} selectedId={selectedId} onSelect={onSelect} name="davison" testId="composite-table" extra={extra} />
  ) : (
    <NatalTable chart={chart} selectedId={selectedId} onSelect={onSelect} parts={COMPOSITE_PARTS} name="composite" testId="composite-table" extra={extra} />
  );
}
