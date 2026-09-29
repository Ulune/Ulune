import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import { formatEuropeanDate, maskEuropeanDate } from "@/lib/chart/parse-birth";
import { lazyNamed, prefetch } from "@/lib/lazy-component";
import { AnchoredPopover } from "./anchored-popover";
import { LoadingLines } from "./loading-lines";
import { MaskedInput } from "./masked-input";

// The calendar (react-day-picker, date-fns, its styles) is its own download.
const loadCalendar = () => import("./birth-calendar");
const BirthCalendar = lazyNamed(loadCalendar, "BirthCalendar");
const calendarAhead = () => prefetch(loadCalendar);

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function fromField(raw: string): Date | undefined {
  const euro = formatEuropeanDate(raw);
  const m = euro.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return undefined;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
}

function toField(day: Date): string {
  return `${pad(day.getDate())}/${pad(day.getMonth() + 1)}/${day.getFullYear()}`;
}

export function BirthDateField({
  id,
  name,
  value,
  placeholder,
  calendarLabel,
  locale,
  testId,
  invalid,
  describedBy,
  onTyped,
  onBlur,
}: {
  id: string;
  name: string;
  value: string;
  placeholder: string;
  calendarLabel: string;
  locale: "en" | "fr";
  testId?: string;
  /** Marked invalid, and described by the message that says why. */
  invalid?: boolean;
  describedBy?: string;
  onTyped: (next: string) => void;
  onBlur: () => void;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selected = fromField(value);
  const selectedKey = selected?.getTime();
  const [month, setMonth] = useState<Date>(selected ?? new Date());

  useEffect(() => {
    if (selectedKey == null) return;
    setMonth(new Date(selectedKey));
  }, [selectedKey]);

  return (
    <div className="relative min-w-0">
      <div className="flex min-w-0 items-stretch">
        <MaskedInput
          id={id}
          name={name}
          data-testid={testId ?? id}
          type="text"
          inputMode="numeric"
          required
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder={placeholder}
          enterKeyHint="next"
          value={value}
          mask={maskEuropeanDate}
          className="min-w-0 flex-1"
          // Only while the calendar is there to point at (the button says it opens).
          aria-controls={open ? `${id}-calendar-pop` : undefined}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onTyped={onTyped}
          onBlur={onBlur}
        />
        <button
          ref={triggerRef}
          type="button"
          data-testid={`${id}-calendar`}
          aria-label={calendarLabel}
          aria-expanded={open}
          aria-haspopup="dialog"
          className="grid h-11 w-11 shrink-0 place-items-center text-fg-muted hover:text-fg"
          onPointerEnter={calendarAhead}
          onFocus={calendarAhead}
          onClick={() => {
            setMonth(selected ?? month);
            setOpen((cur) => !cur);
          }}
        >
          <CalendarDays className="size-4" />
        </button>
      </div>
      <AnchoredPopover
        open={open}
        anchorRef={triggerRef}
        onClose={close}
        id={`${id}-calendar-pop`}
        testId={`${id}-calendar-pop`}
        role="dialog"
        aria-label={calendarLabel}
        hideLabel={calendarLabel}
        align="end"
        width={21 * 16}
      >
        <div className="rounded-md border border-border bg-bg-elevated p-[var(--space-3)] shadow-lg">
          <Suspense fallback={<LoadingLines lines={5} />}>
            <BirthCalendar
              locale={locale}
              month={month}
              onMonthChange={setMonth}
              selected={selected}
              onPick={(day) => {
                onTyped(toField(day));
                setOpen(false);
              }}
            />
          </Suspense>
        </div>
      </AnchoredPopover>
    </div>
  );
}
