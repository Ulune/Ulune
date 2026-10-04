import type { NatalChart } from "@/lib/chart/types";
import type { TablePartId } from "@/lib/i18n/table-ui";
import { NatalTable } from "@/studio/tables/natal-table";

/** A composite has no moment or place of its own: no Chart part, and its dignities and stars are left to the birth charts. */
const COMPOSITE_PARTS: TablePartId[] = ["points", "houses", "aspects", "grid", "balance"];

/**
 * The Composite table (part 52 of the launch plan): the chart of the
 * relationship, built from the midpoints of the two charts, read with the
 * birth chart's own parts: Points, Houses, Aspects, Grid and Balance.
 */
export function CompositeTable({
  chart,
  selectedId,
  onSelect,
  davison = false,
}: {
  chart: NatalChart;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** The Davison chart is a real moment and place: every part of a birth chart holds on it (review 3 Oct, P6). */
  davison?: boolean;
}) {
  return davison ? (
    <NatalTable chart={chart} selectedId={selectedId} onSelect={onSelect} name="davison" testId="composite-table" />
  ) : (
    <NatalTable chart={chart} selectedId={selectedId} onSelect={onSelect} parts={COMPOSITE_PARTS} name="composite" testId="composite-table" />
  );
}
