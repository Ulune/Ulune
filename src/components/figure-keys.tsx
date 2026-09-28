import { useId, useRef, useState, type KeyboardEvent } from "react";

export type FigurePart = { id: string; label: string; kind: string };

/**
 * A figure for the keyboard and screen readers (the bodygraph; the wheel has
 * its own, wheel-keys.tsx): one stop in the Tab order and a list of every
 * part by name. The arrows walk it (the part lights up on the figure), Page
 * Up and Page Down jump to the next kind, a letter jumps to a name, Enter
 * chooses and says so. The picture stays an image with a name.
 */
export function FigureKeys({
  parts,
  selectedId,
  label,
  hint,
  said,
  onPoint,
  onPick,
  testId,
}: {
  /** In walking order (the kinds grouped). */
  parts: FigurePart[];
  selectedId: string | null;
  label: string;
  hint: string;
  /** What Enter says: chosen or let go, with the part's name. */
  said: (opened: boolean, name: string) => string;
  /** The part reached (lit on the figure), or null when the list is left. */
  onPoint: (id: string | null) => void;
  onPick: (id: string) => void;
  testId: string;
}) {
  const uid = useId();
  const [at, setAt] = useState(0);
  const [saying, setSaying] = useState("");
  const typed = useRef({ text: "", time: 0 });

  const go = (i: number) => {
    if (!parts.length) return;
    const n = ((i % parts.length) + parts.length) % parts.length;
    setAt(n);
    onPoint(parts[n].id);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || !parts.length) return;
    let handled = true;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") go(at + 1);
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") go(at - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(parts.length - 1);
    else if (e.key === "PageDown") {
      const kind = parts[at]?.kind;
      const next = parts.findIndex((p, i) => i > at && p.kind !== kind);
      go(next < 0 ? 0 : next);
    } else if (e.key === "PageUp") {
      const kind = parts[at]?.kind;
      let i = at;
      while (i > 0 && parts[i - 1].kind === kind) i -= 1;
      if (i === at) {
        const before = parts[(i - 1 + parts.length) % parts.length].kind;
        i = (i - 1 + parts.length) % parts.length;
        while (i > 0 && parts[i - 1].kind === before) i -= 1;
      }
      go(i);
    } else if (e.key === "Enter" || e.key === " ") {
      const part = parts[at];
      if (part) {
        const closing = part.id === selectedId;
        onPick(part.id);
        setSaying(said(!closing, part.label));
      }
    } else if (e.key.length === 1 && /\S/.test(e.key)) {
      const now = Date.now();
      const text = (now - typed.current.time < 700 ? typed.current.text : "") + e.key.toLowerCase();
      typed.current = { text, time: now };
      const from = text.length === 1 ? at + 1 : at;
      for (let k = 0; k < parts.length; k += 1) {
        const i = (from + k) % parts.length;
        if (parts[i].label.toLowerCase().startsWith(text)) {
          go(i);
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
    <div className="ulune-figure-keys">
      <div
        role="listbox"
        tabIndex={0}
        data-testid={testId}
        aria-label={label}
        aria-describedby={`${uid}-hint`}
        aria-activedescendant={parts.length ? `${uid}-${at}` : undefined}
        className="ulune-figure-keys-list"
        onFocus={() => {
          const chosen = selectedId ? parts.findIndex((p) => p.id === selectedId) : -1;
          go(chosen >= 0 ? chosen : Math.min(at, Math.max(0, parts.length - 1)));
        }}
        onBlur={() => onPoint(null)}
        onKeyDown={onKeyDown}
      >
        {parts.map((p, i) => (
          <div key={p.id} id={`${uid}-${i}`} role="option" aria-selected={p.id === selectedId}>
            {p.label}
          </div>
        ))}
      </div>
      <p id={`${uid}-hint`} hidden>
        {hint}
      </p>
      <p className="sr-only" aria-live="polite" data-testid={`${testId}-said`}>
        {saying}
      </p>
    </div>
  );
}
