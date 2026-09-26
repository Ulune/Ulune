import { useLayoutEffect, useRef } from "react";
import { caretAfterMaskedDigits } from "@/lib/chart/parse-birth";
import { Input } from "./ui/input";

type Props = Omit<React.ComponentProps<"input">, "value" | "onChange"> & {
  value: string;
  mask: (raw: string, prev: string, deleting?: boolean) => string;
  onTyped: (next: string) => void;
};

export function MaskedInput({ value, mask, onTyped, ...props }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const caretRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const el = inputRef.current;
    const pos = caretRef.current;
    if (!el || pos == null) return;
    el.setSelectionRange(pos, pos);
    caretRef.current = null;
  }, [value]);

  return (
    <Input
      {...props}
      ref={inputRef}
      value={value}
      onChange={(e) => {
        const el = e.currentTarget;
        const raw = el.value;
        const inputType = "inputType" in e.nativeEvent ? String(e.nativeEvent.inputType ?? "") : "";
        const deleting = inputType.startsWith("delete");
        const next = mask(raw, value, deleting);
        const digitsBefore = raw.slice(0, el.selectionStart ?? raw.length).replace(/\D/g, "").length;
        const caret = caretAfterMaskedDigits(next, digitsBefore, !deleting);
        caretRef.current = caret;
        if (next === value) {
          el.setSelectionRange(caret, caret);
          caretRef.current = null;
          return;
        }
        onTyped(next);
      }}
    />
  );
}
