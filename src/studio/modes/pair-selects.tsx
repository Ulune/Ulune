import { chartDisplayName } from "@/lib/chart/library";
import { compositeAddSecond, compositePairLabel } from "@/lib/i18n/composite-ui";
import { useI18n } from "@/lib/i18n/locale";
import { synastryAddSecond, synastryPairLabel } from "@/lib/i18n/synastry-ui";
import { useModeData } from "@/studio/modes/data";
import { useStudioStore } from "@/studio/store";
import { toast } from "@/lib/toast";
import { ArrowLeftRight } from "lucide-react";

/** The B list's last choice: a new person, from right here (review 3 Oct, P4). */
const ADD = "__add__";

/** What the two lists need of a pair page: its charts, who is A and B, and how to change them. */
export type PairPick = {
  rows: { id: string; input: Parameters<typeof chartDisplayName>[0] }[];
  aId: string | null;
  resolvedBId: string | null;
  others: { id: string; input: Parameters<typeof chartDisplayName>[0] }[];
  selectA: (id: string) => void;
  selectB: (id: string) => void;
  addSecond: () => void;
  swap: () => void;
};

/**
 * The two people of a pair page, above the figure: synastry's and the
 * composite's (their own data), or another page's (Chinese astrology's Pair,
 * part 11) that hands its own `pair` and `prefix`, in synastry's style.
 */
export function PairSelects({ mode, pair: given, prefix: givenPrefix, page }: { mode: "synastry" | "composite"; pair?: PairPick | null; prefix?: string; page?: string }) {
  const { locale, t } = useI18n();
  const fromMode = useModeData(mode);
  const pair: PairPick | null | undefined = given !== undefined ? given : fromMode;
  const addingPartnerFor = useStudioStore((s) => s.pair.addingPartnerFor);
  if (!pair) return null;
  const partnerBirth = addingPartnerFor === (page ?? mode);
  const prefix = givenPrefix ?? mode;
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
            const id = e.target.value;
            if (!id) return;
            pair.selectA(id);
            // A is the chart shown everywhere: say so, once it changes from here.
            const row = pair.rows.find((r) => r.id === id);
            if (row) toast(t("pairAEverywhere", { name: chartDisplayName(row.input, t("untitled")) }));
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
      {pair.resolvedBId ? (
        <button
          type="button"
          className={`ulune-pair-swap ulune-${mode}-pair-rule`}
          data-testid={`${prefix}-swap`}
          aria-label={t("pairSwap")}
          title={t("pairSwap")}
          onClick={pair.swap}
        >
          <ArrowLeftRight className="size-4" aria-hidden />
        </button>
      ) : (
        <span className={`ulune-${mode}-pair-rule`} aria-hidden>
          ·
        </span>
      )}
      {pair.others.length ? (
        <label className={`ulune-${mode}-pair-slot`}>
          <span className="sr-only">{pairLabel(locale, "b")}</span>
          <select
            data-testid={`${prefix}-person-b`}
            value={pair.resolvedBId ?? ""}
            onChange={(e) => (e.target.value === ADD ? pair.addSecond() : pair.selectB(e.target.value))}
            className={`ulune-${mode}-select`}
          >
            <option value="">{t("noPartner")}</option>
            {pair.others.map((row) => (
              <option key={row.id} value={row.id}>
                {chartDisplayName(row.input, t("untitled"))}
              </option>
            ))}
            <option value={ADD}>{t("pairAddSomeone")}</option>
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
