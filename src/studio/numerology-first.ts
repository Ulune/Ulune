import { useSyncExternalStore } from "react";

/*
 * The numerology page's first read (part 63): five steps for a newcomer, shown
 * in the side panel before anything is chosen, until they are done or
 * skipped. That it is done is a hint kept in this browser only (like the
 * wheel's hint), nothing about the chart; the step reached is kept for this
 * tab, so opening a reading and coming back returns to it.
 */

const KEY = "ulune.hint.numfirst.v1";

let done: boolean | null = null;
let step = 0;
const listeners = new Set<() => void>();

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function emit() {
  for (const fn of listeners) fn();
}

function isDone(): boolean {
  if (done == null) {
    try {
      done = window.localStorage.getItem(KEY) === "1";
    } catch {
      // No storage (a private window, blocked site data): shown once per tab.
      done = false;
    }
  }
  return done;
}

/** The first read is over (done or skipped): the Life Path's reading opens from now on. */
export function endNumerologyFirstRead() {
  done = true;
  step = 0;
  try {
    window.localStorage.setItem(KEY, "1");
  } catch {
    /* kept for this tab only */
  }
  emit();
}

export function setNumerologyFirstStep(next: number) {
  if (next === step) return;
  step = next;
  emit();
}

/** Whether the first read still shows (nothing chosen, not done). The server never shows it. */
export function useNumerologyFirstPending(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => !isDone(),
    () => false,
  );
}

export function useNumerologyFirstStep(): number {
  return useSyncExternalStore(
    subscribe,
    () => step,
    () => 0,
  );
}
