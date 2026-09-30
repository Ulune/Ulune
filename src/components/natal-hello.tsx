import { ChevronRight } from "lucide-react";
import type { ElementId, ModalityId, NatalChart, Placement } from "@/lib/chart/types";
import { CLASSIC_BODIES, SIGN_IDS, SIGN_META } from "@/lib/chart/constants";
import { isRough, signHolds } from "@/lib/chart/unknown-time";
import { CONFIG_LABEL } from "@/lib/chart/overlay-filter";
import { planetPaint } from "@/lib/look";
import { useLookShape } from "@/lib/look-provider";
import { helloCells, NATAL_HELLO, type HelloCellId } from "@/lib/i18n/natal-hello";
import {
  aspectLinkPhrase,
  bodyLabel,
  elementName,
  houseName,
  modalityName,
  signName,
} from "@/lib/i18n/astro";
import { useI18n } from "@/lib/i18n/locale";
import { cn, formatArc } from "@/lib/utils";
import { previewProps } from "@/lib/depth/preview-bus";
import { useChartHoverId } from "@/lib/depth/use-chart-hover";
import { PlanetGlyph, SignGlyph } from "./glyphs";

const SELECT_ID: Record<HelloCellId, string> = {
  sun: "planet:sun",
  moon: "planet:moon",
  ascendant: "angle:ascendant",
};

const TEST_ID: Record<HelloCellId, string> = {
  sun: "natal-hello-sun",
  moon: "natal-hello-moon",
  ascendant: "natal-hello-asc",
};

const ELEMENTS: ElementId[] = ["fire", "earth", "air", "water"];
const MODALITIES: ModalityId[] = ["cardinal", "fixed", "mutable"];

function refFor(id: string) {
  return id === "ascendant" || id === "midheaven" || id === "descendant" || id === "ic" ? `angle:${id}` : `planet:${id}`;
}

/** `uncertain`: hangs on a birth time that is unknown (marked ~ and dimmed, as in the table). */
type Highlight = { key: string; label: string; value: string; ref?: string; uncertain?: boolean };

/** "~" before what hangs on an unknown birth time. */
function mark(on: boolean): string {
  return on ? "~" : "";
}

/**
 * "At a glance": the big three with their real placements, the chart's
 * element and modality balance, and the few facts worth reading first —
 * chart ruler, tightest aspect, dominant pattern, stelliums, retrogrades.
 * Every line opens its reading.
 */
export function NatalGlance({
  chart,
  selectedId,
  onSelect,
}: {
  chart: NatalChart;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { locale, t } = useI18n();
  const chartHover = useChartHoverId();
  const look = useLookShape();
  const sun = chart.planets.find((p) => p.id === "sun");
  const moon = chart.planets.find((p) => p.id === "moon");
  const asc = chart.angles.ascendant;
  const placeOf: Record<HelloCellId, Placement | null> = {
    sun: sun ?? null,
    moon: moon ?? null,
    ascendant: asc ?? null,
  };
  const pat = chart.patterns;
  // Without a birth time: the houses, the Ascendant and what follows from them
  // hang on the time, and a quick body's place too (unknown-time.ts).
  const unknown = chart.meta.timeUnknown === true;
  const signsSure = !unknown || CLASSIC_BODIES.every((id) => {
    const p = chart.planets.find((b) => b.id === id);
    return !p || signHolds(chart, p);
  });

  const highlights: Highlight[] = [];
  const ruler = chart.planets.find((p) => p.id === pat.chartRuler);
  if (ruler) {
    highlights.push({
      key: "ruler",
      label: t("glanceRuler"),
      value: `${bodyLabel(ruler.id, locale)} · ${signName(ruler.sign, locale)} · ${houseName(ruler.house, locale)}`,
      ref: `planet:${ruler.id}`,
      // The chart ruler rules the rising sign.
      uncertain: unknown,
    });
  }
  if (pat.tightest) {
    const tt = pat.tightest;
    const link = chart.aspects.find(
      (a) => a.type === tt.type && ((a.a === tt.a && a.b === tt.b) || (a.a === tt.b && a.b === tt.a)),
    );
    highlights.push({
      key: "tightest",
      label: t("glanceTightest"),
      value: `${aspectLinkPhrase(tt.a, tt.type, tt.b, locale)} · ${formatArc(tt.orb)}`,
      ref: link ? `aspect:${link.id}` : undefined,
      // At another hour the angles perfect other aspects.
      uncertain: unknown,
    });
  }
  if (pat.dominant) {
    const d = pat.dominant;
    highlights.push({
      key: "pattern",
      label: t("glancePattern"),
      value: `${CONFIG_LABEL[d.type][locale === "fr" ? "fr" : "en"]} · ${d.members.map((m) => bodyLabel(m, locale)).join(", ")}`,
      ref: d.apex ? refFor(d.apex) : undefined,
      uncertain: unknown,
    });
  }
  for (const st of pat.stelliums.slice(0, 2)) {
    const houseN = /^House (\d+)$/.exec(st.place)?.[1];
    const sign = SIGN_IDS.find((s) => SIGN_META[s].name === st.place);
    highlights.push({
      key: `stellium-${st.place}`,
      label: t("glanceStellium"),
      value: `${houseN ? houseName(Number(houseN), locale) : sign ? signName(sign, locale) : st.place} · ${st.members.map((m) => bodyLabel(m, locale)).join(", ")}`,
      ref: houseN ? `house:${houseN}` : sign ? `sign:${sign}` : undefined,
      uncertain:
        unknown &&
        (houseN != null ||
          !st.members.every((id) => {
            const p = chart.planets.find((b) => b.id === id);
            return !p || signHolds(chart, p);
          })),
    });
  }
  if (pat.retrogrades.length) {
    highlights.push({
      key: "retro",
      label: t("glanceRetro"),
      value: pat.retrogrades.map((r) => bodyLabel(r, locale)).join(", "),
      ref: refFor(pat.retrogrades[0]),
    });
  }

  // One scale for both rows, so that three bodies draw the same bar in each.
  const balanceMax = Math.max(1, ...ELEMENTS.map((e) => pat.elementCounts[e] ?? 0), ...MODALITIES.map((m) => pat.modalityCounts[m] ?? 0));

  return (
    <section
      data-testid="chart-snapshot"
      data-natal-hello=""
      data-hello-id={NATAL_HELLO.id}
      data-ascendant={asc ? `${asc.formatted} ${signName(asc.sign, locale)}` : undefined}
      className="ob-glance"
      aria-labelledby="ob-glance-h"
    >
      <h2 id="ob-glance-h" className="ob-glance-h">
        {t("glanceTitle")}
      </h2>
      <div className="ob-glance-three ulune-hello">
        {helloCells(locale).map((cell) => {
          const selectId = SELECT_ID[cell.id];
          const active = selectedId === selectId;
          const place = placeOf[cell.id];
          const color = place
            ? planetPaint(cell.id === "ascendant" ? "ascendant" : cell.id, place.sign, look.planets)
            : "var(--color-fg-muted)";
          return (
            <button
              key={cell.id}
              type="button"
              data-testid={TEST_ID[cell.id]}
              data-hello-cell={cell.id}
              onClick={() => onSelect(selectId)}
            {...previewProps(selectId)}
            data-previewed={chartHover === selectId ? "1" : undefined}
              aria-pressed={active}
              aria-label={`${cell.label}${place ? `, ${mark(isRough(chart, place))}${place.formatted} ${signName(place.sign, locale)}` : ""}. ${cell.sentence}`}
              className={cn("ob-glance-cell", active && "is-on")}
            >
              <span className="ob-glance-glyph" style={{ color }} aria-hidden>
                <PlanetGlyph id={cell.id === "ascendant" ? "ascendant" : cell.id} size={18} />
              </span>
              <span className="ob-glance-text">
                <span className="ob-glance-line">
                  <span data-hello-title className="ulune-hello-title ob-glance-title">
                    {cell.label}
                  </span>
                  {place ? (
                    <span className="ob-glance-place">
                      <span className="ob-glance-sign" aria-hidden>
                        <SignGlyph id={place.sign} size={13} />
                      </span>
                      <span className={cn(isRough(chart, place) && "ulune-uncertain")} data-testid={`${TEST_ID[cell.id]}-place`}>
                        {mark(isRough(chart, place))}
                        {place.formatted} {signName(place.sign, locale)}
                      </span>
                      <span className={cn("ob-glance-house", unknown && "ulune-uncertain")}>
                        {" "}
                        · {mark(unknown)}
                        {houseName(place.house, locale)}
                      </span>
                    </span>
                  ) : null}
                </span>
                <span data-hello-copy className="ob-glance-copy">
                  {cell.sentence}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="ob-glance-balance">
        <BalanceRow
          uncertain={!signsSure}
          title={`${mark(!signsSure)}${t("glanceElements")}`}
          items={ELEMENTS.map((e) => ({
            id: e,
            label: elementName(e, locale),
            n: pat.elementCounts[e] ?? 0,
            color: `var(--el-${e})`,
          }))}
          max={balanceMax}
        />
        <BalanceRow
          uncertain={!signsSure}
          title={`${mark(!signsSure)}${t("glanceModes")}`}
          items={MODALITIES.map((m) => ({
            id: m,
            label: modalityName(m, locale),
            n: pat.modalityCounts[m] ?? 0,
            color: "var(--color-fg-muted)",
          }))}
          max={balanceMax}
        />
      </div>

      {highlights.length ? (
        <ul className="ob-glance-list" data-testid="glance-highlights">
          {highlights.map((h) => (
            <li key={h.key}>
              <button
                type="button"
                className="ob-rc-row"
                data-ref={h.ref}
                disabled={!h.ref}
                onClick={() => h.ref && onSelect(h.ref)}
                {...previewProps(h.ref)}
                data-previewed={h.ref && chartHover === h.ref ? "1" : undefined}
              >
                <span className="ob-rc-row-main ob-glance-hl">
                  <span className="ob-glance-hl-k">{h.label}</span>
                  <span className={cn("ob-rc-row-label", h.uncertain && "ulune-uncertain")} data-uncertain={h.uncertain ? "1" : undefined}>
                    {mark(h.uncertain === true)}
                    {h.value}
                  </span>
                </span>
                <ChevronRight className="ob-rc-row-go size-4" strokeWidth={1.75} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="ob-glance-hint">{t("glanceHint")}</p>
    </section>
  );
}

function BalanceRow({
  title,
  items,
  max,
  uncertain = false,
}: {
  title: string;
  items: { id: string; label: string; n: number; color: string }[];
  max: number;
  /** A body counted here may change sign in the day (no birth time). */
  uncertain?: boolean;
}) {
  const total = items.reduce((s, i) => s + i.n, 0);
  return (
    <div className={cn("ob-bal", uncertain && "ulune-uncertain")} role="group" aria-label={title}>
      <p className="ob-rc-h">{title}</p>
      <ul className="ob-bal-rows">
        {items.map((i) => (
          <li key={i.id} className="ob-bal-row" aria-label={`${i.label}: ${i.n}/${total}`}>
            <span className="ob-bal-label">{i.label}</span>
            <span className="ob-bal-track" aria-hidden>
              <span className="ob-bal-fill" style={{ width: `${(i.n / max) * 100}%`, background: i.color }} />
            </span>
            <span className="ob-bal-n">{i.n}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Older name, kept for callers. */
export const NatalHello = NatalGlance;
