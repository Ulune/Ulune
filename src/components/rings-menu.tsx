import { Check, ChevronDown } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnchoredPopover } from "@/components/anchored-popover";
import { useI18n } from "@/lib/i18n/locale";
import { useRingsSlot } from "@/studio/stage/stage-slots";
import "./rings-menu.css";

export type RingsOption<T extends string> = { value: T; label: string; line: string };

/** A key pressed on the page itself, not into a field, a menu or a dialog. */
function pageOwnsKeys(): boolean {
  const at = document.activeElement;
  if (at && at.closest("input, textarea, select, [contenteditable=true], [role=slider]"))
    return false;
  return !document.querySelector("[role=dialog], [role=menu]");
}

/**
 * Which rings a two-ring chart draws, as one compact button showing the
 * current choice (UI plan, part 93): its menu names each choice and says what
 * it draws, keys 1 to n choose without opening it. It sits in the stage's
 * toolbar (the rings slot) when there is one.
 */
export function RingsMenu<T extends string>({
  value,
  onChange,
  options,
  testId,
  ariaLabel,
}: {
  value: T;
  onChange: (next: T) => void;
  options: readonly RingsOption<T>[];
  testId: string;
  ariaLabel: string;
}) {
  const { t } = useI18n();
  const slot = useRingsSlot();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const current = options.find((o) => o.value === value) ?? options[0];

  // 1 to n choose a ring without the menu (as the desktop programs' number keys).
  const choose = useRef(onChange);
  choose.current = onChange;
  const list = useRef(options);
  list.current = options;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1 || n > list.current.length || !pageOwnsKeys()) return;
      e.preventDefault();
      choose.current(list.current[n - 1].value);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const body = (
    <div className="ulune-rings" data-testid={testId}>
      <button
        ref={ref}
        type="button"
        className="ulune-rings-btn"
        data-testid={`${testId}-button`}
        data-value={value}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${ariaLabel}: ${current.label}`}
        title={current.line}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="ulune-rings-label">{current.label}</span>
        <ChevronDown className="ulune-rings-caret" strokeWidth={1.75} aria-hidden />
      </button>
      <AnchoredPopover
        open={open}
        anchorRef={ref}
        onClose={close}
        role="menu"
        aria-label={ariaLabel}
        hideLabel={t("spaceClose")}
        align="end"
        width={288}
        testId={`${testId}-menu`}
      >
        <div className="ob-menu">
          {options.map((o, i) => {
            const on = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                role="menuitemradio"
                aria-checked={on}
                className="ob-menu-item ulune-rings-item"
                data-testid={`${testId}-${o.value}`}
                data-autofocus={on || undefined}
                onClick={() => {
                  onChange(o.value);
                  close();
                }}
              >
                <Check
                  className="ulune-rings-check"
                  strokeWidth={2}
                  aria-hidden
                  style={{ visibility: on ? "visible" : "hidden" }}
                />
                <span className="ulune-rings-words">
                  <span className="ulune-rings-name">{o.label}</span>
                  <span className="ulune-rings-line">{o.line}</span>
                </span>
                <kbd className="ulune-rings-key" aria-hidden>
                  {i + 1}
                </kbd>
              </button>
            );
          })}
        </div>
      </AnchoredPopover>
    </div>
  );
  return slot ? createPortal(body, slot) : body;
}
