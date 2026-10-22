import { hdCrossGates, hdCrossOf } from "@/lib/chart/hd-cross";
import { hdCrossName } from "@/lib/chart/hd-cross-names";
import { valueOfCore } from "@/lib/chart/numerology";
import { wholeText } from "@/lib/chart/numerology-reduce";
import { previewProps } from "@/lib/depth/preview-bus";
import { hdAuthorityLabel, hdDefinitionLabel, hdFactLabel, hdStrategyLabel, hdTypeLabel } from "@/lib/i18n/hd-ui";
import { useI18n } from "@/lib/i18n/locale";
import { numerologyCoreLabel } from "@/lib/i18n/numerology-ui";
import { cn } from "@/lib/utils";
import { useModeData } from "@/studio/modes/data";
import { useScoped } from "@/studio/scope";
import { WHEEL_CORES } from "@/studio/compare/shared-numerology";

/*
 * A figure's summary in a pane too small to read it (share and compare plan,
 * idea B8; small.ts says which pages and from what size): what its page puts
 * first, as a short table, each row choosing its element as the figure does
 * (and in the other charts, with linked selection). Human Design: the five
 * keys and the cross, as the cards above the bodygraph name them (from the
 * files those take theirs from: hd-keys.ts is the page's own, chinese-ids.ts
 * says why). Numerology: the six core numbers the wheel draws. Its own
 * download, fetched when a pane first needs it.
 */

type Row = { id: string; label: string; value: string };

function useRows(page: "design" | "numerology"): Row[] | null {
  const { locale } = useI18n();
  const design = useModeData("design");
  const numerology = useModeData("numerology");
  if (page === "design") {
    const hd = design?.hd;
    if (!hd) return null;
    const cross = hdCrossOf(hd);
    const rows: Row[] = [
      { id: "hello:type", label: hdFactLabel(locale, "type"), value: hdTypeLabel(locale, hd.type) },
      { id: "hello:strategy", label: hdFactLabel(locale, "strategy"), value: hdStrategyLabel(locale, hd.strategy) },
      { id: "hello:authority", label: hdFactLabel(locale, "authority"), value: hdAuthorityLabel(locale, hd.authority) },
      { id: "hello:profile", label: hdFactLabel(locale, "profile"), value: hd.profile },
      { id: "hello:definition", label: hdFactLabel(locale, "definition"), value: hdDefinitionLabel(locale, hd.definition) },
    ];
    if (cross) rows.push({ id: "hello:cross", label: hdFactLabel(locale, "cross"), value: hdCrossName(cross, locale) ?? hdCrossGates(cross) });
    return rows;
  }
  const numbers = numerology?.numbers;
  if (!numbers || numbers.lifePath.number == null) return null;
  return WHEEL_CORES.map((id) => ({ id: `core:${id}`, label: numerologyCoreLabel(locale, id), value: wholeText(valueOfCore(numbers, id)) }));
}

export function SmallSummary({ page, testId }: { page: "design" | "numerology"; testId: string }) {
  const rows = useRows(page);
  const selectedId = useScoped((s) => s.selectedId);
  const pick = useScoped((s) => s.pick);
  if (!rows) return null;
  return (
    <table className="ob-compare-summary" data-testid={testId}>
      <tbody>
        {rows.map((r) => {
          const on = selectedId === r.id;
          return (
            <tr key={r.id} data-selected={on ? "1" : undefined} className={cn(on && "is-on")}>
              <th scope="row">
                <button type="button" className="ob-compare-summary-pick" aria-pressed={on} data-testid={`${testId}-${r.id.replace(":", "-")}`} onClick={() => pick(r.id)} {...previewProps(r.id)}>
                  {r.label}
                </button>
              </th>
              <td>{r.value}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
