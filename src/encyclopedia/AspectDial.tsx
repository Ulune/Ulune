import { useId, useState } from "react";
import { tr } from "./words";
import type { Lang } from "./types";

/*
 * An aspect's figure as a dial (encyclopedia plan, part 19: "the aspect
 * figure lets the reader drag the angle through the orb"): the same drawing
 * as the still one (scripts/encyclopedia/figures.mjs), the second point moved
 * by a slider, which the keyboard and screen readers use as any other; the
 * words under it say whether it is still within Ulune's orb.
 */

const C = 120;
const R = 88;
const TOP = 270;
const FAMILY: Record<number, string> = { 0: "conj", 60: "soft", 120: "soft", 90: "hard", 180: "hard" };

const at = (r: number, lon: number): [number, number] => {
  const t = ((180 + lon) * Math.PI) / 180;
  return [C + r * Math.cos(t), C - r * Math.sin(t)];
};
const f = (x: number) => Math.round(x * 100) / 100;

function band(r0: number, r1: number, a: number, b: number): string {
  const [x1, y1] = at(r1, a);
  const [x2, y2] = at(r1, b);
  const [x3, y3] = at(r0, b);
  const [x4, y4] = at(r0, a);
  return `M${f(x1)} ${f(y1)}A${r1} ${r1} 0 0 0 ${f(x2)} ${f(y2)}L${f(x3)} ${f(y3)}A${r0} ${r0} 0 0 1 ${f(x4)} ${f(y4)}Z`;
}

/** 2°30′ */
function arc(d: number): string {
  const total = Math.round(Math.abs(d) * 60);
  return `${Math.floor(total / 60)}°${String(total % 60).padStart(2, "0")}′`;
}

export function AspectDial({ angle, orb, lang }: { angle: number; orb: number; lang: Lang }) {
  const [sep, setSep] = useState(angle);
  const id = useId();
  const min = Math.max(0, angle - orb - 4);
  const max = Math.min(180, angle + orb + 4);
  const a = TOP - angle / 2;
  const off = sep - angle;
  const inOrb = Math.abs(off) <= orb + 1e-9;
  const [ax, ay] = at(R, a);
  const [bx, by] = at(R, a + sep);
  const family = FAMILY[angle] ?? "minor";
  // As the still figure: the number inside the chord, clear of it (figures.mjs, labelRadius).
  const [lx, ly] = at(Math.max(18, R * Math.cos(((sep / 2) * Math.PI) / 180) - 16), a + sep / 2);
  const status = off === 0 ? tr(lang, "encDialExact") : tr(lang, inOrb ? "encDialIn" : "encDialOut", { d: arc(off) });
  return (
    <div className="ob-enc-dial" data-testid="enc-dial" data-in-orb={inOrb ? "" : undefined}>
      <div className="ob-enc-figure-panel" style={{ width: 240 }}>
        <svg viewBox="0 0 240 240" width="240" height="240" className="f-svg" role="img" aria-label={tr(lang, "encDialFigure", { angle, orb: String(orb).replace(".", lang === "fr" ? "," : ".") })} aria-describedby={`${id}-s`}>
          <circle cx={C} cy={C} r={R} className="f-line" />
          <path d={band(R - 7, R + 7, a + angle - orb, a + angle + orb)} className="f-orb" />
          {sep > 0 ? <line x1={f(ax)} y1={f(ay)} x2={f(bx)} y2={f(by)} className={inOrb ? `f-asp f-asp-${family}` : "f-asp f-asp-off"} /> : null}
          <line x1={C} y1={C} x2={f(ax)} y2={f(ay)} className="f-ray" />
          <line x1={C} y1={C} x2={f(bx)} y2={f(by)} className="f-ray" />
          {sep > 0 ? (
            <text x={f(lx)} y={f(angle === 180 && Math.abs(off) < 4 ? ly - 12 : ly)} className="f-small f-on">
              {`${Math.round(sep * 4) / 4}°`.replace(".", lang === "fr" ? "," : ".")}
            </text>
          ) : null}
          <circle cx={f(ax)} cy={f(ay)} r="5.5" className="f-dot" />
          <circle cx={f(bx)} cy={f(by)} r="6.5" className="f-dot f-handle" />
        </svg>
      </div>
      <label className="ob-enc-dial-control">
        <span className="ob-enc-dial-label">{tr(lang, "encDialLabel")}</span>
        <input
          type="range"
          min={min}
          max={max}
          step={0.25}
          value={sep}
          onChange={(e) => setSep(Number(e.target.value))}
          aria-valuetext={`${Math.round(sep * 4) / 4}°, ${status}`}
          data-testid="enc-dial-range"
        />
      </label>
      <p id={`${id}-s`} className="ob-enc-dial-status" aria-live="polite" data-testid="enc-dial-status">
        {status}
      </p>
    </div>
  );
}
