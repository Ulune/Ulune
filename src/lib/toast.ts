import { useSyncExternalStore } from "react";

export type Toast = { id: number; text: string; tone: "ok" | "error"; leaving?: boolean };
/** A toast's exit (shell.css): it fades and sinks before it goes. */
const TOAST_EXIT_MS = 150;

let items: Toast[] = [];
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Show a short status message in the shared, announced status region (`ms`: how long, for one that matters more). */
export function toast(text: string, tone: Toast["tone"] = "ok", ms?: number) {
  const id = ++seq;
  items = [...items.slice(-2), { id, text, tone }];
  emit();
  if (typeof window !== "undefined") {
    window.setTimeout(
      () => {
        items = items.map((t) => (t.id === id ? { ...t, leaving: true } : t));
        emit();
        window.setTimeout(() => {
          items = items.filter((t) => t.id !== id);
          emit();
        }, TOAST_EXIT_MS);
      },
      ms ?? (tone === "error" ? 5200 : 2400),
    );
  }
}

export function useToasts(): Toast[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => items,
    () => items,
  );
}
