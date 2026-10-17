import { Suspense, useSyncExternalStore } from "react";
import { lazyNamed } from "@/lib/lazy-component";

/*
 * Development only: the switch of the Compare foundation's harness
 * (scope-harness.tsx; share and compare plan, feature 2). The workspace mounts
 * this under import.meta.env.DEV, so a build carries none of it. Off unless
 * asked for: `?__scope=ab` in the address Ulune opens with, or
 * `window.__uluneScopeHarness(true)` from the console or a test (the charts in
 * memory stay; false hides it again). Its code loads only once it is on.
 */

let on = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("__scope") === "ab";
const subs = new Set<() => void>();

function setOn(next: boolean) {
  if (next === on) return;
  on = next;
  for (const fn of subs) fn();
}

function subscribe(fn: () => void) {
  subs.add(fn);
  return () => {
    subs.delete(fn);
  };
}

if (typeof window !== "undefined") {
  (window as unknown as { __uluneScopeHarness?: (next: boolean) => void }).__uluneScopeHarness = (next) => setOn(Boolean(next));
}

const ScopeHarness = lazyNamed(() => import("@/studio/dev/scope-harness"), "ScopeHarness");

export function DevScopeHarness() {
  const shown = useSyncExternalStore(
    subscribe,
    () => on,
    () => false,
  );
  if (!shown) return null;
  return (
    <Suspense fallback={null}>
      <ScopeHarness onClose={() => setOn(false)} />
    </Suspense>
  );
}
