import { useEffect, useState, type CSSProperties } from "react";
import { lookHasGlyph, primaryLookFace } from "@/lib/chart/glyph-coverage";
import { glyphShift } from "@/lib/chart/glyph-ink";
import { GLYPH_SVG } from "@/lib/chart/glyph-svg";
import { cssVar, textInk, useTextInkVersion } from "@/lib/chart/text-ink";
import {
  DEFAULT_GLYPH_FAMILY,
  mappedGlyph,
  unicodeGlyphText,
  type GlyphFamily,
} from "@/lib/chart/glyphs";
import { PAIRING_FONTS } from "@/lib/look";
import { useLookShape } from "@/lib/look-provider";

const FAMILY_FACE: Record<GlyphFamily, string> = {
  noto: "Noto Sans Symbols",
  astronomicon: "Ulune Classic",
  "starfont-sans": "StarFont Sans",
  "starfont-serif": "StarFont Serif",
};
import type { BodyId, SignId } from "@/lib/chart/types";

const parsedSvg = new Map<string, { viewBox: string; inner: string }>();

function parseSvg(raw: string): { viewBox: string; inner: string } {
  const hit = parsedSvg.get(raw);
  if (hit) return hit;
  const parsed = {
    viewBox: raw.match(/viewBox="([^"]+)"/)?.[1] ?? "0 0 24 24",
    inner: raw
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/^[\s\S]*?<svg[^>]*>/i, "")
      .replace(/<\/svg>[\s\S]*$/i, ""),
  };
  parsedSvg.set(raw, parsed);
  return parsed;
}

function PathMark({
  id,
  raw,
  size,
  className,
  style,
}: {
  id: string;
  raw: string;
  size: number;
  className?: string;
  style?: CSSProperties;
}) {
  const { viewBox, inner } = parseSvg(raw);
  // Its ink centred in its box (glyph-ink.ts), not its drawing's box.
  const shift = glyphShift(id);
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      data-glyph={id}
      data-paint="svg"
      className={`ulune-glyph block shrink-0 ${className ?? ""}`}
      style={style}
      overflow="visible"
      aria-hidden="true"
    >
      <g transform={shift ? `translate(${shift.dx} ${shift.dy})` : undefined} dangerouslySetInnerHTML={{ __html: inner }} />
    </svg>
  );
}

function UnicodeMark({
  id,
  text,
  face,
  size,
  className,
  style,
}: {
  id: string;
  text: string;
  face: string;
  size: number;
  className?: string;
  style?: CSSProperties;
}) {
  // Its ink centred in the box, once the face is in (text-ink.ts); the em
  // box until then.
  useTextInkVersion();
  const fontSize = text.replace(/\uFE0E/g, "").length > 1 ? 13 : 20;
  const ink = textInk(`"${face}"`, 400, text);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      data-glyph={id}
      data-paint="font"
      data-glyph-face={face}
      className={`ulune-glyph block shrink-0 ${className ?? ""}`}
      style={style}
      overflow="visible"
      aria-hidden="true"
    >
      <text
        className="ulune-glyph-mark"
        x={ink ? (12 + ink.dx * fontSize).toFixed(3) : "12"}
        y={ink ? (12 + ink.dy * fontSize).toFixed(3) : "12"}
        textAnchor="middle"
        dominantBaseline={ink ? undefined : "central"}
        fill="currentColor"
        fontSize={fontSize}
        style={{ fontFamily: `"${face}"` }}
      >
        {text}
      </text>
    </svg>
  );
}

function UnknownMark({
  id,
  size,
  className,
  style,
}: {
  id: string;
  size: number;
  className?: string;
  style?: CSSProperties;
}) {
  const label = id.replace(/[^a-z0-9]/gi, "").slice(0, 2).toUpperCase() || "?";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      data-glyph={id}
      data-paint="unknown"
      className={`ulune-glyph block shrink-0 ${className ?? ""}`}
      style={style}
      overflow="visible"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <text
        x="12"
        y="12"
        textAnchor="middle"
        dominantBaseline="central"
        fill="currentColor"
        fontSize={8}
        fontWeight={600}
        style={{ fontFamily: "ui-monospace, monospace" }}
      >
        {label}
      </text>
    </svg>
  );
}

/**
 * Look face when it actually inks the mark; SVG path otherwise. First paint
 * is SVG so SSR / unloaded fonts never tofu, then measurement may promote
 * to the pairing’s sans.
 */
export function Glyph({
  id,
  size = 18,
  className,
}: {
  id: string;
  size?: number;
  className?: string;
}) {
  // The shape of the Look only: a colour change never re-renders a glyph.
  const look = useLookShape();
  const family: GlyphFamily = look.glyphFamily ?? DEFAULT_GLYPH_FAMILY;
  const lookFace = primaryLookFace(PAIRING_FONTS[look.pairing].sans);
  const mapped = mappedGlyph(id, family);
  const uni = unicodeGlyphText(id);
  const raw = GLYPH_SVG[id];
  const [lookOwns, setLookOwns] = useState(false);

  useEffect(() => {
    if (family !== "noto" || !uni) {
      setLookOwns(false);
      return;
    }
    let live = true;
    const probe = uni.replace(/\uFE0E/g, "");
    void (async () => {
      try {
        await document.fonts.load(`64px "${lookFace}"`);
        await document.fonts.ready;
      } catch {
        /* still measure whatever is live */
      }
      if (!live) return;
      setLookOwns(lookHasGlyph(lookFace, probe));
    })();
    return () => {
      live = false;
    };
  }, [family, lookFace, uni]);

  const houseMatch = /^house-(\d{1,2})$/.exec(id);
  if (houseMatch) {
    return <HouseNumGlyph n={Number(houseMatch[1])} size={size} className={className} />;
  }

  const flipped = id === "descendant" || id === "ic";
  const style: CSSProperties | undefined = flipped
    ? { transform: "rotate(180deg)" }
    : undefined;

  if (mapped) {
    return (
      <UnicodeMark
        id={id}
        text={mapped}
        face={FAMILY_FACE[family]}
        size={size}
        className={className}
        style={style}
      />
    );
  }

  if (family === "noto" && uni && lookOwns) {
    return (
      <UnicodeMark
        id={id}
        text={uni}
        face={lookFace}
        size={size}
        className={className}
        style={style}
      />
    );
  }

  if (raw) {
    return <PathMark id={id} raw={raw} size={size} className={className} style={style} />;
  }

  if (uni) {
    return (
      <UnicodeMark
        id={id}
        text={uni}
        face={family === "noto" ? lookFace : FAMILY_FACE[family]}
        size={size}
        className={className}
        style={style}
      />
    );
  }

  return <UnknownMark id={id} size={size} className={className} style={style} />;
}

export function PlanetGlyph({
  id,
  size = 18,
  className,
}: {
  id: BodyId | string;
  size?: number;
  className?: string;
}) {
  return <Glyph id={id} size={size} className={className} />;
}

export function SignGlyph({
  id,
  size = 16,
  className,
}: {
  id: SignId;
  size?: number;
  className?: string;
}) {
  return <Glyph id={id} size={size} className={className} />;
}

export function AspectGlyph({
  id,
  size = 18,
  className,
}: {
  id: string;
  size?: number;
  className?: string;
}) {
  return <Glyph id={id} size={size} className={className} />;
}

/**
 * Where a mark reads as centred, when that is not the middle of its ink:
 * a triangle's is its centroid (its box's middle sits high in it, and a line
 * through it looked off).
 */
const MARK_CENTRE: Record<string, readonly [number, number]> = { trine: [12, 13.93] };

/**
 * Path mark whose ink is centred on (0,0) — for aspect marks on the wheel's
 * lines. With `cut`, a copy of the mark drawn first in the face it stands on
 * (styles.css, .ulune-mark-cut: filled, and stroked wider) parts the lines
 * under it in the mark's own shape.
 */
export function CenteredAspectGlyph({ id, size, cut = false }: { id: string; size: number; cut?: boolean }) {
  const raw = GLYPH_SVG[id];
  if (!raw) return <AspectGlyph id={id} size={size} />;
  const { viewBox, inner } = parseSvg(raw);
  const centre = MARK_CENTRE[id];
  const shift = centre ? { dx: 12 - centre[0], dy: 12 - centre[1] } : glyphShift(id);
  return (
    <svg
      x={-size / 2}
      y={-size / 2}
      width={size}
      height={size}
      viewBox={viewBox}
      overflow="visible"
      aria-hidden="true"
      className="ulune-glyph"
    >
      {cut ? (
        <g className="ulune-mark-cut" transform={shift ? `translate(${shift.dx} ${shift.dy})` : undefined} dangerouslySetInnerHTML={{ __html: inner }} />
      ) : null}
      <g transform={shift ? `translate(${shift.dx} ${shift.dy})` : undefined} dangerouslySetInnerHTML={{ __html: inner }} />
    </svg>
  );
}

export function RetrogradeMark({ size = 12, className }: { size?: number; className?: string }) {
  return <Glyph id="retrograde" size={size} className={className} />;
}

/** The house numbers' face (styles.css `--font-mono`), for measuring them before the page says. */
export const MONO_STACK = '"IBM Plex Mono", ui-monospace, monospace';

export function HouseNumGlyph({
  n,
  size = 14,
  className,
}: {
  n: number;
  size?: number;
  className?: string;
}) {
  const id = Number.isFinite(n) ? Math.round(n) : 0;
  const label = id >= 1 && id <= 12 ? String(id) : String(id || "");
  // The digits' ink centred in the box (text-ink.ts); by eye until the font is in.
  useTextInkVersion();
  const fontSize = label.length > 1 ? 11 : 15;
  const ink = textInk(cssVar("--font-mono", MONO_STACK), 600, label);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      data-glyph={`house-${label}`}
      data-paint="num"
      className={`ulune-glyph ulune-house-num block shrink-0 ${className ?? ""}`}
      overflow="visible"
      aria-hidden="true"
    >
      <text
        className="ulune-house-num-mark"
        x={ink ? (12 + ink.dx * fontSize).toFixed(3) : "12"}
        y={ink ? (12 + ink.dy * fontSize).toFixed(3) : "13"}
        textAnchor="middle"
        dominantBaseline={ink ? undefined : "central"}
        fill="currentColor"
        fontSize={fontSize}
        fontWeight={600}
        style={{ fontFamily: "var(--font-mono), 'IBM Plex Mono', ui-monospace, monospace" }}
      >
        {label}
      </text>
    </svg>
  );
}

export function StarGlyph({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={`block shrink-0 ${className ?? ""}`}
      overflow="visible"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M8 1.1 9.4 5.4H14l-3.6 2.6 1.4 4.3L8 10.1 4.2 12.3l1.4-4.3L2 5.4h4.6z"
      />
    </svg>
  );
}

export function MidpointGlyph({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={`block shrink-0 ${className ?? ""}`}
      overflow="visible"
      aria-hidden="true"
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        d="M8 2.2 13.6 8 8 13.8 2.4 8z"
      />
      <circle cx="8" cy="8" r="1.15" fill="currentColor" />
    </svg>
  );
}
