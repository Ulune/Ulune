/** The wheel's current pin, readable outside React renders of the wheel (the count strip follows it). */
export type SelectionStore = {
  get: () => string | null;
  set: (id: string | null) => void;
  subscribe: (fn: () => void) => () => void;
};

export function createSelectionStore(init: string | null): SelectionStore {
  let value = init;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set: (id) => {
      if (id === value) return;
      value = id;
      for (const fn of listeners) fn();
    },
    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
