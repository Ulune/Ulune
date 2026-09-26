import { chartDisplayName } from "@/lib/chart/library";
import { compositeAddSecond, compositePairLabel } from "@/lib/i18n/composite-ui";
import { useI18n } from "@/lib/i18n/locale";
import { synastryAddSecond, synastryPairLabel } from "@/lib/i18n/synastry-ui";
import { useModeData } from "@/studio/modes/data";
import { useStudioStore } from "@/studio/store";

/** The two people of a pair mode (synastry or composite), above the figure. */
export function PairSelects({ mode }: { mode: "synastry" | "composite" }) {
  const { locale, t } = useI18n();
  const pair = useModeData(mode);
  const addingPartnerFor = useStudioStore((s) => s.pair.addingPartnerFor);
  if (!pair) return null;
  const partnerBirth = addingPartnerFor === mode;
  const prefix = mode;
  const pairLabel = mode === "composite" ? compositePairLabel : synastryPairLabel;
  const addLabel = mode === "composite" ? compositeAddSecond(locale) : synastryAddSecond(locale);
  return (
    <div className={`ulune-${mode}-pair-bar min-w-0 flex-1`}>
      <label className={`ulune-${mode}-pair-slot`}>
        <span className="sr-only">{pairLabel(locale, "a")}</span>
        <select
          data-testid={`${prefix}-person-a`}
          value={pair.aId ?? ""}
          onChange={(e) => {
            if (e.target.value) pair.selectA(e.target.value);
          }}
          disabled={!pair.rows.length}
          className={`ulune-${mode}-select`}
        >
          {pair.rows.map((row) => (
            <option key={row.id} value={row.id} disabled={row.id === pair.resolvedBId}>
              {chartDisplayName(row.input, t("untitled"))}
            </option>
          ))}
        </select>
      </label>
      <span className={`ulune-${mode}-pair-rule`} aria-hidden>
        ·
      </span>
      {pair.others.length ? (
        <label className={`ulune-${mode}-pair-slot`}>
          <span className="sr-only">{pairLabel(locale, "b")}</span>
          <select
            data-testid={`${prefix}-person-b`}
            value={pair.resolvedBId ?? ""}
            onChange={(e) => pair.selectB(e.target.value)}
            className={`ulune-${mode}-select`}
          >
            <option value="">{t("noPartner")}</option>
            {pair.others.map((row) => (
              <option key={row.id} value={row.id}>
                {chartDisplayName(row.input, t("untitled"))}
              </option>
            ))}
          </select>
        </label>
      ) : partnerBirth ? null : (
        <button
          type="button"
          data-testid={`${prefix}-add-second`}
          onClick={pair.addSecond}
          className={`ulune-${mode}-add`}
        >
          {addLabel}
        </button>
      )}
    </div>
  );
}
