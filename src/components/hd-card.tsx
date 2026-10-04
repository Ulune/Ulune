import { hdHeroOf, hdSay } from "@/lib/chart/hd-focus";
import { parseHdActId } from "@/lib/chart/hd-rows";
import type { HdView, HumanDesignChart } from "@/lib/chart/human-design";
import { useI18n } from "@/lib/i18n/locale";
import { useStudioStore } from "@/studio/store";
import { PickCard } from "./pick-card";
import { useHdNames } from "./use-hd-names";

/** On a phone, a piece chosen on the chart: one line and a button that opens its reading (pick-card.tsx). */
export function HdCard({ chart, view }: { chart: HumanDesignChart; view: HdView }) {
  const { locale } = useI18n();
  const names = useHdNames(locale);
  const selectedId = useStudioStore((s) => s.selectedId);
  const hero =
    selectedId && /^(gate|channel|center|act):/.test(selectedId)
      ? hdHeroOf(selectedId, chart)
      : null;
  // A row of the columns is named by its body first.
  const sayId = hero && selectedId && parseHdActId(selectedId) ? selectedId : hero;
  return <PickCard testId="hd-card" text={hero ? hdSay(chart, view, sayId ?? hero, locale, names) : null} />;
}
