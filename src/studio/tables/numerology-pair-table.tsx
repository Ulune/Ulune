import { NP_REL_REF, NP_YEAR_REF, digitLine, npDigitRef, npPairRef, pairLabel, type PairContext } from "@/lib/chart/interpret-numerology-pair";
import type { PairRow } from "@/lib/chart/numerology-pair";
import { deFr } from "@/lib/chinese/both";
import { numerologyPairCsv, numerologyPairTextParts } from "@/lib/chart/numerology-pair-table";
import { stepsText, wholeText, type NumerologyValue } from "@/lib/chart/numerology-reduce";
import type { NumPairPack } from "@/lib/content/packs";
import { partRows } from "@/lib/csv";
import { npWord } from "@/lib/i18n/catalog/numerology-pair-words";
import { useI18n } from "@/lib/i18n/locale";
import { numerologyCoreLabel, numerologyPageText as p } from "@/lib/i18n/numerology-ui";
import { DataTable } from "@/studio/tables/DataTable";
import { TableActions, TablePage, type TablePart } from "@/studio/tables/TablePage";

/**
 * Numerology's Relationship as a table (share and compare plan, feature 5c): the six numbers side by
 * side, the ten pairs with how the two tend to work together, the relationship number and the shared
 * digits, the two of you this year; Copy and CSV for the whole and for each part. Each row opens its
 * reading. The numerology table's former "Compare" (numerology-table.tsx) is this page now.
 */
export function NumerologyPairTable({ ctx, pack, selectedId, onSelect }: { ctx: PairContext; pack: NumPairPack | null; selectedId: string | null; onSelect: (id: string) => void }) {
  const { locale, t } = useI18n();
  const { pair, names } = ctx;
  const whole = (v: NumerologyValue) => (v.number == null ? "—" : wholeText(v));
  const dynamic = (r: PairRow) => {
    const x = pack?.pairTogether(r, locale) ?? null;
    return x ? (x.split(/(?<=[.!?])\s/)[0] ?? x) : null;
  };
  const text = () => numerologyPairTextParts(ctx, locale, dynamic);
  const partText = (id: string) => () => text().find((x) => x.id === id)?.lines.join("\n") ?? "";
  const csvOf = (kinds: string[]) => () => partRows(numerologyPairCsv(ctx), kinds);
  const pick = (id: string, label: string) => (
    <button type="button" className="ulune-row-pick" aria-pressed={selectedId === id} onClick={() => onSelect(id)}>
      {label}
    </button>
  );
  const gap = (r: Pick<PairRow, "gap" | "same">) => (r.gap ? (r.same ? npWord(locale, "npSame") : String(r.gap.number ?? 0)) : "—");
  const parts: TablePart[] = [
    {
      id: "side",
      label: npWord(locale, "npPartSide"),
      hint: npWord(locale, "npPartSideHint"),
      copyText: partText("side"),
      table: csvOf(["core"]),
      children: (
        <DataTable stickyFirst={false} className="ulune-num-compare">
          <thead>
            <tr>
              <th data-col="number">{p(locale, "col_number")}</th>
              <th data-col="a">{names.a}</th>
              <th data-col="b">{names.b}</th>
              <th data-col="gap">{p(locale, "col_gap")}</th>
            </tr>
          </thead>
          <tbody data-testid="numerology-pair-table-side">
            {pair.cores.map((c) => {
              const ref = npPairRef(c.id);
              return (
                <tr key={c.id} data-testid={`numerology-pair-side-${c.id}`} data-selected={selectedId === ref ? "1" : undefined}>
                  <td data-col="number">{pick(ref, numerologyCoreLabel(locale, c.id))}</td>
                  <td data-col="a" className="font-mono tabular-nums">
                    {whole(c.a)}
                  </td>
                  <td data-col="b" className="font-mono tabular-nums">
                    {whole(c.b)}
                  </td>
                  <td data-col="gap" className="font-mono tabular-nums">
                    {gap({ gap: c.gap, same: c.a.number != null && c.a.number === c.b.number })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      ),
    },
    {
      id: "pairs",
      label: npWord(locale, "npPartPairs"),
      hint: npWord(locale, "npPartPairsHint"),
      copyText: partText("pairs"),
      table: csvOf(["dyn"]),
      children: (
        <DataTable stickyFirst={false} className="ulune-num-compare ulune-np-tbl">
          <thead>
            <tr>
              <th data-col="pair">{npWord(locale, "npColPair")}</th>
              <th data-col="a">{names.a}</th>
              <th data-col="b">{names.b}</th>
              <th data-col="dynamic">{npWord(locale, "npColDynamic")}</th>
            </tr>
          </thead>
          <tbody>
            {pair.rows.map((r) => {
              const ref = npPairRef(r.id);
              return (
                <tr key={r.id} data-testid={`numerology-pair-dyn-${r.id}`} data-selected={selectedId === ref ? "1" : undefined}>
                  <td data-col="pair">{pick(ref, pairLabel(r, names, locale))}</td>
                  <td data-col="a" className="font-mono tabular-nums">
                    {whole(r.a.value)}
                  </td>
                  <td data-col="b" className="font-mono tabular-nums">
                    {whole(r.b.value)}
                  </td>
                  <td data-col="dynamic">{r.text ? (dynamic(r) ?? "…") : npWord(locale, "npWait", { name: r.a.value.number == null ? names.a : names.b, deName: deFr(r.a.value.number == null ? names.a : names.b) })}</td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      ),
    },
    {
      id: "shared",
      label: npWord(locale, "npPartShared"),
      hint: npWord(locale, "npPartSharedHint"),
      copyText: partText("shared"),
      table: csvOf(["pair", "digit"]),
      children: (
        <DataTable stickyFirst={false} className="ulune-num-compare ulune-np-tbl">
          <tbody>
            <tr data-testid="numerology-pair-row-rel" data-selected={selectedId === NP_REL_REF ? "1" : undefined}>
              <th scope="row">{pick(NP_REL_REF, npWord(locale, "npRelHead"))}</th>
              <td className="font-mono tabular-nums">{whole(pair.relationship)}</td>
              <td>{npWord(locale, "npRelSteps", { steps: stepsText(pair.relationship) })}</td>
            </tr>
            {pair.shared.length ? (
              pair.shared.map((s) => (
                <tr key={s.digit} data-testid={`numerology-pair-row-digit-${s.digit}`} data-selected={selectedId === npDigitRef(s.digit) ? "1" : undefined}>
                  <th scope="row">{pick(npDigitRef(s.digit), `${npWord(locale, "npColDigit")} ${s.digit}`)}</th>
                  <td className="font-mono tabular-nums">{s.digit}</td>
                  <td>{digitLine(s, names, locale)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <th scope="row">{npWord(locale, "npSharedHead")}</th>
                <td>—</td>
                <td>{npWord(locale, "npSharedNone")}</td>
              </tr>
            )}
          </tbody>
        </DataTable>
      ),
    },
    {
      id: "now",
      label: npWord(locale, "npPartNow"),
      hint: npWord(locale, "npPartNowHint"),
      copyText: partText("now"),
      table: csvOf(["year"]),
      children: (
        <DataTable stickyFirst={false} className="ulune-num-compare ulune-np-tbl">
          <thead>
            <tr>
              <th>{p(locale, "col_year")}</th>
              <th>{names.a}</th>
              <th>{names.b}</th>
              <th>{npWord(locale, "npYearTogether")}</th>
            </tr>
          </thead>
          <tbody>
            <tr data-testid="numerology-pair-row-year" data-selected={selectedId === NP_YEAR_REF ? "1" : undefined}>
              <td>{pick(NP_YEAR_REF, String(pair.year.year))}</td>
              <td className="font-mono tabular-nums">{whole(pair.year.a)}</td>
              <td className="font-mono tabular-nums">{whole(pair.year.b)}</td>
              <td className="font-mono tabular-nums">{stepsText(pair.year.together)}</td>
            </tr>
          </tbody>
        </DataTable>
      ),
    },
  ];
  const file = npWord(locale, "npFile", { a: names.a, b: names.b });
  return (
    <div data-testid="numerology-pair-table" data-chart-pick data-selected={selectedId ?? ""} className="min-w-0">
      <TablePage name="numerology-pair" label={t("tableSections")} parts={parts} fileStem={file} actions={<TableActions text={() => text().map((x) => x.lines.join("\n")).join("\n\n")} csv={() => numerologyPairCsv(ctx)} fileName={file} />} />
    </div>
  );
}
