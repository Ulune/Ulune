/**
 * What the calculations on the device show the reader (on-device plan, step 5): the engine's
 * one-time download while it is under way, and the question asked when this device can't
 * calculate. The "calculate" door (door.ts) sets them; the engine's notices
 * (components/engine/engine-ui.ts, loaded when one shows) draw them and give the answer back.
 */

/** The reader's answer when this device can't calculate. */
export type ServerAnswer = "once" | "always" | "cancel";

export type EngineNotice = {
  /** The engine's files on their way (bytes arrived and expected), or null. */
  progress: { loaded: number; total: number } | null;
  /** This device can't calculate: why (an "E:engine.…" code), and where the answer goes. */
  question: { why: string; answer: (answer: ServerAnswer) => void } | null;
};

let state: EngineNotice = { progress: null, question: null };
const listeners = new Set<() => void>();

export function engineNotice(): EngineNotice {
  return state;
}

export function setEngineNotice(patch: Partial<EngineNotice>): void {
  state = { ...state, ...patch };
  for (const fn of listeners) fn();
}

export function onEngineNotice(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
