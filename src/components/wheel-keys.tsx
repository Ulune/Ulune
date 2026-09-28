import { useId, useRef, useState, useSyncExternalStore, type KeyboardEvent, type RefObject } from "react";
import type { SelectionStore } from "@/lib/chart/selection-store";
import { useI18n } from "@/lib/i18n/locale";

type Part = { id: string; label: string; kind: string; orb: number };

/** The order the arrows walk the wheel in: the bodies first, then what joins them, then where they stand. */
const KIND_ORDER = ["planet", "angle", "transit", "aspect", "reception", "mp", "star", "house", "sign", "decan-cell"];

function kindRank(kind: string): number {
  const i = KIND_ORDER.indexOf(kind);
  return i < 0 ? KIND_ORDER.length : i;
}

/**
 * Everything on the wheel that opens a reading, as drawn now (the aspects
 * the filters leave, the bodies shown), with the name its picture carries.
 */
function partsOf(svg: SVGSVGElement | null): Part[] {
  if (!svg) return [];
  const seen = new Set<string>();
  const out: Part[] = [];
  for (const el of svg.querySelectorAll<SVGElement>("[data-hl][tabindex]")) {
    const id = el.getAttribute("data-hl");
    if (!id || seen.has(id)) continue;
    if (el.getClientRects().length === 0) continue;
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") continue;
    const title = el.querySelector(":scope > title")?.textContent ?? "";
    const label = (el.getAttribute("aria-label") || title).replace(/\s+/g, " ").trim();
    if (!label) continue;
    seen.add(id);
    const kind = el.getAttribute("data-kind") ?? (el.hasAttribute("data-aspect") ? "aspect" : "");
    const orb = Number(el.getAttribute("data-orb"));
    out.push({ id, label, kind, orb: Number.isFinite(orb) ? orb : 0 });
  }
  // By kind, the tightest aspects first; otherwise the drawing's own order (a stable sort).
  return out.sort((a, b) => kindRank(a.kind) - kindRank(b.kind) || (a.kind === "aspect" ? a.orb - b.orb : 0));
}

/**
 * The wheel for the keyboard and for screen readers: one stop in the Tab
 * order, a list of every part of the chart by name. The arrows walk it (the
 * part lights up on the wheel, and in 3D turns to the front), Page Up and
 * Page Down jump to the next kind (bodies, aspects, houses, signs), a letter
 * jumps to a name, Enter opens the reading and says so. The picture itself
 * stays an image with a name; the Table view is its text version.
 */
export function WheelKeys({
  svgRef,
  selection,
  onPoint,
  onPick,
}: {
  svgRef: RefObject<SVGSVGElement | null>;
  /** The wheel's pin (a store, so a pick does not re-render the whole wheel). */
  selection: SelectionStore;
  /** The part reached (lit on the wheel), or null when the list is left. */
  onPoint: (id: string | null, el: Element | null, label: string) => void;
  onPick: (id: string) => void;
}) {
  const { t } = useI18n();
  const uid = useId();
  const selectedId = useSyncExternalStore(selection.subscribe, selection.get, selection.get);
  const [parts, setParts] = useState<Part[]>([]);
  const [at, setAt] = useState(0);
  const [said, setSaid] = useState("");
  const typed = useRef({ text: "", time: 0 });

  const elementOf = (id: string): Element | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    for (const el of svg.querySelectorAll("[data-hl][tabindex]")) {
      if (el.getAttribute("data-hl") === id) return el;
    }
    return null;
  };

  const go = (list: Part[], i: number) => {
    if (!list.length) return;
    const n = ((i % list.length) + list.length) % list.length;
    setAt(n);
    const part = list[n];
    onPoint(part.id, elementOf(part.id), part.label);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // Shift and the arrows turn the 3D view; Escape, + and − belong to the chart.
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const list = parts;
    if (!list.length) return;
    let handled = true;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") go(list, at + 1);
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") go(list, at - 1);
    else if (e.key === "Home") go(list, 0);
    else if (e.key === "End") go(list, list.length - 1);
    else if (e.key === "PageDown" || e.key === "PageUp") {
      const kind = list[at]?.kind;
      if (e.key === "PageDown") {
        const next = list.findIndex((p, i) => i > at && p.kind !== kind);
        go(list, next < 0 ? 0 : next);
      } else {
        // The start of this kind, or of the one before it.
        let i = at;
        while (i > 0 && list[i - 1].kind === kind) i -= 1;
        if (i === at) {
          const before = list[(i - 1 + list.length) % list.length].kind;
          i = (i - 1 + list.length) % list.length;
          while (i > 0 && list[i - 1].kind === before) i -= 1;
        }
        go(list, i);
      }
    } else if (e.key === "Enter" || e.key === " ") {
      const part = list[at];
      if (part) {
        const closing = part.id === selectedId;
        onPick(part.id);
        setSaid(t(closing ? "wheelKeysClosed" : "wheelKeysOpened", { name: part.label }));
      }
    } else if (e.key.length === 1 && /\S/.test(e.key)) {
      // Type-ahead: the next part whose name starts with what was typed.
      const now = Date.now();
      const text = (now - typed.current.time < 700 ? typed.current.text : "") + e.key.toLowerCase();
      typed.current = { text, time: now };
      const from = text.length === 1 ? at + 1 : at;
      for (let k = 0; k < list.length; k += 1) {
        const i = (from + k) % list.length;
        if (list[i].label.toLowerCase().startsWith(text)) {
          go(list, i);
          break;
        }
      }
    } else handled = false;
    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <div className="ulune-wheel-keys">
      <div
        role="listbox"
        tabIndex={0}
        data-testid="wheel-keys"
        aria-label={t("wheelKeysLabel")}
        aria-describedby={`${uid}-hint`}
        aria-activedescendant={parts.length ? `${uid}-${at}` : undefined}
        className="ulune-wheel-keys-list"
        onFocus={() => {
          const list = partsOf(svgRef.current);
          setParts(list);
          const chosen = selectedId ? list.findIndex((p) => p.id === selectedId) : -1;
          go(list, chosen >= 0 ? chosen : Math.min(at, Math.max(0, list.length - 1)));
        }}
        onBlur={() => onPoint(null, null, "")}
        onKeyDown={onKeyDown}
      >
        {parts.map((p, i) => (
          <div key={p.id} id={`${uid}-${i}`} role="option" aria-selected={p.id === selectedId}>
            {p.label}
          </div>
        ))}
      </div>
      <p id={`${uid}-hint`} hidden>
        {t("wheelKeysHint")}
      </p>
      <p className="sr-only" aria-live="polite" data-testid="wheel-keys-said">
        {said}
      </p>
    </div>
  );
}
