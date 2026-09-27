import { LoadingLines } from "@/components/loading-lines";
import { NumerologyPanel } from "@/components/numerology-panel";
import { numerologyCoreLabel, numerologyNoNatal, numerologySystemLabel } from "@/lib/i18n/numerology-ui";
import { valueOfCore, type NumerologyCoreId } from "@/lib/chart/numerology";
import { useI18n } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import { useModeData } from "@/studio/modes/data";
import { useNumerology } from "@/studio/modes/hooks/useNumerology";
import { MODE_META } from "@/studio/modes/meta";
import type { ModeDef, ModeRuntime } from "@/studio/modes/types";
import { useWheelView } from "@/studio/modes/wheel-view";
import { useStudioStore } from "@/studio/store";
import { useEffect, useMemo, useState } from "react";
import { useDepthPrefs } from "@/lib/depth/prefs";
import { onChartPreview, previewProps } from "@/lib/depth/preview-bus";
import "@/studio/modes/styles/num.css";

export type NumerologyState = ReturnType<typeof useNumerology>;

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
const TILES: NumerologyCoreId[] = ["lifepath", "expression", "soulurge", "personality", "birthday"];

function NumerologyFigure() {
  const { locale } = useI18n();
  const w = useWheelView();
  const numerology = useModeData("numerology");
  const depth = useDepthPrefs();
  const [hotDigit, setHotDigit] = useState<number | null>(null);
  const numbers = numerology?.numbers ?? null;
  // Panels (Hello cells, tables, the reading) preview a core or a number here.
  useEffect(
    () =>
      onChartPreview((id) => {
        if (!id || !numbers) return setHotDigit(null);
        if (id.startsWith("number:")) return setHotDigit(Number(id.slice(7)) || null);
        if (id.startsWith("core:")) {
          const core = id.slice(5) as NumerologyCoreId;
          const v = valueOfCore(numbers, core);
          return setHotDigit(v?.digit ?? null);
        }
        setHotDigit(null);
      }),
    [numbers],
  );
  if (!numbers || numbers.lifePath.number == null || numbers.lifePath.digit == null) return null;
  const lifePath = numbers.lifePath.number;
  const lifeDigit = numbers.lifePath.digit;
  const coreId = "core:lifepath";
  const coreActive = w.selectedId === coreId;
  const hot = hotDigit;
  // Every core number on the ring, not the Life Path alone: each digit says
  // which of the five fall on it ("Soul Urge · Personality"), with the
  // number itself when it is a master or a larger one ("Life Path 11").
  const coresOn = new Map<number, string[]>();
  for (const id of TILES) {
    const v = valueOfCore(numbers, id);
    if (v.digit == null || v.number == null) continue;
    const label = numerologyCoreLabel(locale, id);
    const list = coresOn.get(v.digit) ?? [];
    list.push(v.number !== v.digit ? `${label} ${v.number}` : label);
    coresOn.set(v.digit, list);
  }

  return (
    <div
      className="ulune-num-stage flex h-full min-h-0 w-full flex-col items-center justify-center"
      data-depth={depth.lift ? "on" : "off"}
    >
      <div className="ulune-num-ring" data-testid="numerology-ring">
        <svg viewBox="0 0 100 100" className="ulune-num-svg" aria-hidden>
          <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="0.35" opacity="0.28" />
          <circle cx="50" cy="50" r="34" fill="none" stroke="currentColor" strokeWidth="0.35" opacity="0.18" />
          {DIGITS.map((n) => {
            const a = ((n - 1) / 9) * 2 * Math.PI - Math.PI / 2;
            const x1 = 50 + Math.cos(a) * 43.5;
            const y1 = 50 + Math.sin(a) * 43.5;
            const x2 = 50 + Math.cos(a) * 46.5;
            const y2 = 50 + Math.sin(a) * 46.5;
            return (
              <line
                key={n}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="currentColor"
                strokeWidth={n === lifeDigit ? 1.1 : 0.45}
                opacity={n === lifeDigit ? 0.85 : 0.3}
              />
            );
          })}
        </svg>
        {DIGITS.map((n) => {
          const a = ((n - 1) / 9) * 2 * Math.PI - Math.PI / 2;
          const x = 50 + Math.cos(a) * 38;
          const y = 50 + Math.sin(a) * 38;
          const active = w.selectedId === `number:${n}` || (coreActive && n === lifeDigit);
          const life = n === lifeDigit;
          const cores = coresOn.get(n);
          return (
            <button
              key={n}
              type="button"
              data-testid={`numerology-digit-${n}`}
              data-life={life ? "1" : undefined}
              data-core={cores ? "1" : undefined}
              data-hot={hot === n ? "1" : undefined}
              aria-pressed={active}
              aria-label={cores ? `${n}: ${cores.join(", ")}` : `${n}`}
              onClick={() => w.pick(`number:${n}`)}
              {...previewProps(`number:${n}`)}
              className={cn("ulune-num-digit", active && "is-active", life && "is-life", cores && "is-core")}
              style={{ left: `${x}%`, top: `${y}%`, ["--enter" as string]: n - 1 }}
            >
              {n}
              {cores ? (
                <span className="ulune-num-digit-cores" data-below={y > 50 ? "1" : undefined} aria-hidden>
                  {cores.join(" · ")}
                </span>
              ) : null}
            </button>
          );
        })}
        <button
          type="button"
          data-testid="numerology-core"
          aria-pressed={coreActive}
          aria-label={`${numerologyCoreLabel(locale, "lifepath")} ${lifePath}`}
          onClick={() => w.pick(coreId)}
          className={cn("ulune-num-core", coreActive && "is-active")}
        >
          {lifePath}
        </button>
      </div>
      <div className="ulune-num-tiles" role="group" aria-label={numerologySystemLabel(locale)}>
        {TILES.map((id) => {
          const value = valueOfCore(numbers, id);
          const on = w.selectedId === `core:${id}`;
          return (
            <button
              key={id}
              type="button"
              data-testid={`numerology-tile-${id}`}
              aria-pressed={on}
              disabled={value.number == null}
              onClick={() => w.pick(`core:${id}`)}
              onPointerEnter={() => setHotDigit(value.digit ?? null)}
              onPointerLeave={() => setHotDigit(null)}
              onFocus={() => setHotDigit(value.digit ?? null)}
              onBlur={() => setHotDigit(null)}
              className={cn("ulune-num-tile", on && "is-on")}
            >
              <span className="ulune-num-tile-n">{value.number ?? "—"}</span>
              <span className="ulune-num-tile-k">{numerologyCoreLabel(locale, id)}</span>
            </button>
          );
        })}
      </div>
      <p data-testid="numerology-system" className="ulune-num-system">
        {numerologySystemLabel(locale)}
      </p>
    </div>
  );
}

/** The Life Path reading opens by default (useNumerology); until its text has come, a quiet stand-in. */
function NumerologyHelloEmpty() {
  return <LoadingLines lines={4} />;
}


function NumerologyData() {
  return <NumerologyPanel />;
}


function useNumerologyRuntime(): ModeRuntime<NumerologyState> {
  const numerology = useNumerology();
  return useMemo(() => ({ data: numerology, reading: numerology.reading }), [numerology]);
}

export const numerologyMode: ModeDef = {
  ...MODE_META.numerology,
  emptyText: numerologyNoNatal,
  Figure: NumerologyFigure,
  HelloEmpty: NumerologyHelloEmpty,
  Data: NumerologyData,
  useRuntime: useNumerologyRuntime,
};
