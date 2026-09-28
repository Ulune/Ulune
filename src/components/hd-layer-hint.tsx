import { useEffect, useRef, useState } from "react";
import type { HdView } from "@/lib/chart/human-design";
import { hdGraphText } from "@/lib/i18n/hd-ui";
import { useI18n } from "@/lib/i18n/locale";

const KEY = "ulune.hint.hdlayer.v1";
/** How long the line stays before it goes by itself (ms). */
const SHOW_MS = 7000;

function seenLayers(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return ["personality", "design", "both"];
  }
}

function remember(view: HdView) {
  try {
    const list = new Set(seenLayers());
    list.add(view);
    window.localStorage.setItem(KEY, JSON.stringify([...list]));
  } catch {
    /* private mode: the line just comes back next time */
  }
}

const LINE = { personality: "layerPersonality", design: "layerDesign", both: "layerBoth" } as const;

/**
 * The layer switch explains itself: the first time each layer is chosen, one
 * line over the chart says what it shows (Design in red, the body, about three
 * months before birth; Personality in ink, the mind, at birth). It goes by
 * itself or when closed; what was seen is kept in this browser only.
 */
export function HdLayerHint({ view }: { view: HdView }) {
  const { locale } = useI18n();
  const [shown, setShown] = useState<HdView | null>(null);
  const last = useRef(view);
  useEffect(() => {
    // Not on arrival: only when the switch is used.
    if (last.current === view) return;
    last.current = view;
    if (seenLayers().includes(view)) {
      setShown(null);
      return;
    }
    remember(view);
    setShown(view);
    const timer = window.setTimeout(() => setShown(null), SHOW_MS);
    return () => window.clearTimeout(timer);
  }, [view]);
  if (!shown) return null;
  return (
    <div className="ulune-wheel-hint" role="status" data-testid="hd-layer-hint">
      <span>{hdGraphText(locale, LINE[shown])}</span>
      <button type="button" className="ulune-wheel-hint-close" aria-label={hdGraphText(locale, "close")} onClick={() => setShown(null)}>
        <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
          <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
