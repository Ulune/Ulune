import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SegmentOption<T extends string> = {
  value: T;
  testId: string;
  label?: string;
  icon?: ReactNode;
  ariaLabel?: string;
  title?: string;
};

type Props<T extends string> = {
  value: T;
  options: SegmentOption<T>[];
  onChange: (next: T) => void;
  ariaLabel: string;
  vtName?: string;
};

export function SegmentedToggle<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  vtName,
}: Props<T>) {
  const index = Math.max(
    0,
    options.findIndex((opt) => opt.value === value),
  );
  const count = options.length || 1;

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="ulune-seg relative isolate overflow-hidden"
      style={{
        ["--ulune-seg-i" as string]: String(index),
        ["--ulune-seg-n" as string]: String(count),
        viewTransitionName: vtName,
      }}
    >
      {/* The pill carries a copy of the labels in its own colour, held still
          while it slides: a label changes colour where the pill's edge passes. */}
      <span className="ulune-seg-pill" aria-hidden="true">
        <span className="ulune-seg-ink">
          {options.map((opt) => (
            <span key={opt.value} className="ulune-seg-ink-cell">
              {opt.icon ?? opt.label}
            </span>
          ))}
        </span>
      </span>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            data-testid={opt.testId}
            aria-pressed={active}
            aria-label={opt.ariaLabel}
            title={opt.title}
            onClick={() => {
              if (opt.value !== value) onChange(opt.value);
            }}
            className={cn(
              "ulune-seg-btn relative z-[1] flex h-11 min-w-11 items-center justify-center px-3",
              active ? "is-on" : undefined,
            )}
          >
            {opt.icon ?? opt.label}
          </button>
        );
      })}
    </div>
  );
}
