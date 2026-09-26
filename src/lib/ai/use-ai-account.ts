import { useMemo } from "react";
import { create } from "zustand";
import type { AiProvider } from "./providers";

/*
 * The reader's AI keys, held in this browser only; Ulune's server never
 * stores them. While just looking they live in this tab's memory and go when
 * it closes. In a private space they are kept in it, encrypted (lib/space),
 * which installs itself as `keeper` while it is open.
 */

export type AiKeys = {
  keys: Partial<Record<AiProvider, string>>;
  active: AiProvider | null;
};

type Keeper = (next: AiKeys) => void;

let keeper: Keeper | null = null;

type AiKeyStore = AiKeys & { kept: "tab" | "space" };

const useAiKeyStore = create<AiKeyStore>(() => ({ keys: {}, active: null, kept: "tab" }));

function commit(next: AiKeys): AiKeys {
  useAiKeyStore.setState({ keys: next.keys, active: next.active });
  keeper?.(next);
  return next;
}

function current(): AiKeys {
  const { keys, active } = useAiKeyStore.getState();
  return { keys, active };
}

/** The private space opened: its keys, merged with any typed in this tab, are kept there from now on. */
export function keepAiKeysIn(save: Keeper, stored: AiKeys | null): AiKeys {
  keeper = save;
  const here = current();
  const keys = { ...(stored?.keys ?? {}), ...here.keys };
  const active = here.active ?? stored?.active ?? null;
  useAiKeyStore.setState({ kept: "space" });
  const merged = { keys, active: active && keys[active] ? active : firstProvider(keys) };
  // Keys typed before signing in move into the space.
  if (Object.keys(here.keys).length) return commit(merged);
  useAiKeyStore.setState({ keys: merged.keys, active: merged.active });
  return merged;
}

/** The private space locked: its keys leave memory with it. */
export function forgetAiKeys(): void {
  keeper = null;
  useAiKeyStore.setState({ keys: {}, active: null, kept: "tab" });
}

function firstProvider(keys: AiKeys["keys"]): AiProvider | null {
  return (Object.keys(keys) as AiProvider[]).find((id) => Boolean(keys[id])) ?? null;
}

function last4Of(key: string): string {
  return key.trim().slice(-4).padStart(4, "•");
}

/** The key and provider to use now, or null. */
export function aiAccountNow(): { provider: AiProvider; apiKey: string } | null {
  const { keys, active } = useAiKeyStore.getState();
  const apiKey = active ? keys[active] : undefined;
  return active && apiKey ? { provider: active, apiKey } : null;
}

async function saveKey(provider: AiProvider, key: string): Promise<AiKeys> {
  const trimmed = key.trim();
  if (trimmed.length < 12) throw new Error("invalid-key");
  const now = current();
  return commit({ keys: { ...now.keys, [provider]: trimmed }, active: provider });
}

async function removeKey(provider: AiProvider): Promise<AiKeys> {
  const now = current();
  const keys = { ...now.keys };
  delete keys[provider];
  return commit({ keys, active: now.active === provider ? firstProvider(keys) : now.active });
}

async function useProvider(provider: AiProvider): Promise<AiKeys> {
  const now = current();
  if (!now.keys[provider]) throw new Error("no-key");
  return commit({ keys: now.keys, active: provider });
}

export function useAiAccount() {
  const keys = useAiKeyStore((s) => s.keys);
  const active = useAiKeyStore((s) => s.active);
  const kept = useAiKeyStore((s) => s.kept);
  return useMemo(
    () => ({
      keys: (Object.keys(keys) as AiProvider[])
        .filter((id) => Boolean(keys[id]))
        .map((provider) => ({ provider, last4: last4Of(keys[provider] ?? "") })),
      active,
      ready: Boolean(active && keys[active]),
      /** Where the keys are kept: this tab's memory, or the private space. */
      kept,
      saveKey,
      removeKey,
      useProvider,
    }),
    [keys, active, kept],
  );
}
